import pytest
from fastapi import HTTPException

from app.core.ratelimit import RateLimiter
from app.services import chat_engine, dataset_store, llm

ORIGIN = {"Origin": "http://localhost:3000"}


# ---- uploads & datasets ---------------------------------------------------------------------------
def test_upload_validation(client):
    assert client.post("/api/upload", files={"file": ("x.exe", b"abc")}).status_code == 400
    assert client.post("/api/upload", files={"file": ("e.csv", b"")}).status_code == 400
    r = client.post("/api/upload", files={"file": ("e.csv", b"a,b\n,\n")})
    assert r.status_code == 422 and "usable" in r.json()["detail"]
    r = client.post("/api/upload", files={"file": ("evil.sql", b"ATTACH DATABASE 'x.db' AS x;")})
    assert r.status_code == 422


def test_sql_dump_upload(client):
    sql = b"CREATE TABLE t(a INTEGER, b TEXT); INSERT INTO t VALUES (1,'x'),(2,'y');"
    r = client.post("/api/upload", files={"file": ("d.sql", sql)})
    assert r.status_code == 200 and r.json()["rows"] == 2


def test_dataset_endpoints(client, dataset_id):
    d = client.get(f"/api/datasets/{dataset_id}").json()
    assert d["rows"] == 30 and any(c["name"] == "order_date_month" for c in d["profile"])
    assert len(client.get(f"/api/datasets/{dataset_id}/preview?limit=5").json()["rows"]) == 5
    assert client.get("/api/datasets/nope").status_code == 404


def test_validation_errors_are_friendly_and_do_not_echo_secrets(client):
    r = client.post(
        "/api/connectors/import",
        json={"type": "postgres", "username": "u", "password": "SuperSecret!", "table": "t"},
    )
    assert r.status_code == 422
    assert "SuperSecret" not in r.text and "host" in r.json()["detail"]


def test_connector_rejects_non_select(client):
    r = client.post(
        "/api/connectors/import",
        json={"type": "postgres", "host": "127.0.0.1", "database": "d", "username": "u", "password": "p", "query": "DROP TABLE x"},
    )
    assert r.status_code == 502 and "SELECT" in r.json()["detail"]


# ---- CORS & unexpected errors ---------------------------------------------------------------------
def test_cors_preflight_and_headers(client):
    r = client.options(
        "/api/upload", headers={**ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"}
    )
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_unexpected_error_returns_json_with_cors(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr(dataset_store, "list_records", boom)
    r = client.get("/api/datasets", headers=ORIGIN)
    assert r.status_code == 500
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "secret internal detail" not in r.text and r.json()["detail"]


# ---- rate limiter ---------------------------------------------------------------------------------
def test_rate_limiter_blocks_then_recovers(monkeypatch):
    rl = RateLimiter(limit=2, window_s=60)
    rl.check("a"); rl.check("a")
    with pytest.raises(HTTPException) as e:
        rl.check("a")
    assert e.value.status_code == 429 and "Retry-After" in e.value.headers
    rl.check("b")  # other clients unaffected
    import time as _t
    real = _t.monotonic
    monkeypatch.setattr("app.core.ratelimit.time.monotonic", lambda: real() + 61)
    rl.check("a")


# ---- chat flow (LLM faked) ------------------------------------------------------------------------
def test_chat_without_api_key_is_a_clear_503(client, dataset_id):
    r = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "hi"})
    assert r.status_code == 503 and "GEMINI_API_KEY" in r.json()["detail"]


def test_chat_unknown_dataset_404(client):
    assert client.post("/api/chat", json={"dataset_id": "nope", "message": "hi"}).status_code == 404


def test_chat_full_flow_with_fake_llm(client, dataset_id, monkeypatch):
    def fake_json(prompt, *, system=None):
        if "prepare data for a chart" in (system or ""):
            return {
                "chart_type": "pie", "title": "Revenue by Region", "x_label": "Region", "y_label": "Revenue",
                "code": "result = df.groupby('region', as_index=False)['revenue'].sum().rename(columns={'region':'Region','revenue':'Revenue'})",
            }
        return {"answerable": True, "approach": "sum by region",
                "code": "result = df.groupby('region')['revenue'].sum().round(2)"}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "North leads on revenue.")

    r = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "Revenue by region?"}).json()
    assert r["kind"] == "answer" and r["offer_visualization"] and r["message"].endswith(chat_engine.VIZ_QUESTION)
    assert r["table"]["columns"] == ["region", "revenue"]

    c = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "yes please", "conversation_id": r["conversation_id"]}).json()
    assert c["kind"] == "chart" and c["chart"]["chart_type"] == "pie" and len(c["chart"]["data"]) == 3
    assert c["chart"]["x_key"] == "Region" and c["chart"]["y_keys"] == ["Revenue"]


def test_chat_decline_and_unanswerable(client, dataset_id, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda *a, **k: {"answerable": True, "code": "result = df['units'].sum()"})
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "Total units is 90.")
    r = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "total units"}).json()
    n = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "no thanks", "conversation_id": r["conversation_id"]}).json()
    assert n["kind"] == "message" and not n["offer_visualization"]

    monkeypatch.setattr(llm, "generate_json", lambda *a, **k: {"answerable": False, "reply": "No such column."})
    u = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "revenue by planet"}).json()
    assert u["kind"] == "message" and u["message"] == "No such column."


def test_chat_self_repairs_bad_code_then_gives_up_gracefully(client, dataset_id, monkeypatch):
    calls = []

    def flaky(prompt, *, system=None):
        calls.append(prompt)
        return {"answerable": True, "code": "result = df['missing'].sum()" if len(calls) == 1 else "result = df['units'].sum()"}

    monkeypatch.setattr(llm, "generate_json", flaky)
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "ok")
    assert client.post("/api/chat", json={"dataset_id": dataset_id, "message": "sum units"}).json()["kind"] == "answer"
    assert "KeyError" in calls[1]  # the error was fed back to the model

    monkeypatch.setattr(llm, "generate_json", lambda *a, **k: {"answerable": True, "code": "import os\nresult = 1"})
    r = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "try evil"})
    assert r.status_code == 200 and r.json()["kind"] == "error" and not r.json()["offer_visualization"]


@pytest.mark.parametrize(
    "text,expected",
    [("yes", "yes"), ("Yes please!", "yes"), ("sure", "yes"), ("yes, as a line chart", "yes"), ("show me a pie chart", "yes"),
     ("no", "no"), ("No thanks", "no"), ("nope", "no"),
     ("What is the average revenue per product?", "new"), ("show revenue by region", "new")],
)
def test_reply_classification(text, expected):
    assert chat_engine.classify_reply(text) == expected


def test_llm_malformed_json_is_llmerror(monkeypatch):
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "not json {")
    with pytest.raises(llm.LLMError):
        llm.generate_json("x")
