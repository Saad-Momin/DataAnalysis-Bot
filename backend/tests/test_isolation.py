import json

from app.services import chat_state, dataset_store, llm

CSV2 = b"a,b\n1,2\n3,4\n"


def test_every_dataset_and_chat_route_requires_auth(anon, dataset_id):
    assert anon.post("/api/upload", files={"file": ("x.csv", CSV2)}).status_code == 401
    assert anon.get("/api/datasets").status_code == 401
    assert anon.get(f"/api/datasets/{dataset_id}").status_code == 401
    assert anon.get(f"/api/datasets/{dataset_id}/preview").status_code == 401
    assert anon.delete(f"/api/datasets/{dataset_id}").status_code == 401
    assert anon.post("/api/chat", json={"dataset_id": dataset_id, "message": "hi"}).status_code == 401
    body = {"type": "postgres", "host": "h", "database": "d", "username": "u", "password": "p", "table": "t"}
    assert anon.post("/api/connectors/import", json=body).status_code == 401


def test_other_users_datasets_are_404(client, other_client, dataset_id):
    assert other_client.get("/api/datasets").json() == []
    assert [d["id"] for d in client.get("/api/datasets").json()] == [dataset_id]
    for r in (
        other_client.get(f"/api/datasets/{dataset_id}"),
        other_client.get(f"/api/datasets/{dataset_id}/preview"),
        other_client.delete(f"/api/datasets/{dataset_id}"),
        other_client.post("/api/chat", json={"dataset_id": dataset_id, "message": "hi"}),
    ):
        assert r.status_code == 404, r.text
        assert r.json()["detail"] == "Dataset not found."
    assert client.get(f"/api/datasets/{dataset_id}").status_code == 200  # owner unaffected, nothing deleted


def test_cache_does_not_leak_across_users(client, other_client, dataset_id):
    assert dataset_id in dataset_store._cache  # warm in-memory cache must not bypass the owner check
    assert other_client.get(f"/api/datasets/{dataset_id}/preview").status_code == 404


def test_upload_is_owned_by_uploader(client):
    d = client.post("/api/upload", files={"file": ("x.csv", CSV2)}).json()
    assert dataset_store.get_record(d["id"]).owner_id == client.user["id"]


def test_conversation_cannot_be_hijacked(client, other_client, dataset_id, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda *a, **k: {"answerable": True, "code": "result = df['units'].sum()"})
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "ok")
    cid = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "total units"}).json()["conversation_id"]
    theirs_ds = other_client.post("/api/upload", files={"file": ("sales.csv", b"units\n1\n2\n")}).json()["id"]
    r = other_client.post("/api/chat", json={"dataset_id": theirs_ds, "message": "x", "conversation_id": cid})
    assert r.status_code == 200 and r.json()["conversation_id"] != cid
    assert chat_state._store[cid].user_id == client.user["id"]
    # conversations are keyed by user even when the dataset id matches
    assert chat_state.get_or_create(cid, dataset_id, "someone-else").id != cid


def test_deleting_dataset_removes_files_and_conversations(client, dataset_id, monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda *a, **k: {"answerable": True, "code": "result = df['units'].sum()"})
    monkeypatch.setattr(llm, "generate", lambda *a, **k: "ok")
    cid = client.post("/api/chat", json={"dataset_id": dataset_id, "message": "total"}).json()["conversation_id"]
    path = dataset_store.parquet_path(dataset_id)
    assert path.exists()
    assert client.delete(f"/api/datasets/{dataset_id}").status_code == 204
    assert not path.exists() and cid not in chat_state._store and dataset_id not in dataset_store._cache
    assert client.get(f"/api/datasets/{dataset_id}").status_code == 404


def test_legacy_migration_adds_owner_and_drops_ownerless_rows(tmp_path):
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.orm import sessionmaker

    import app.db.database as db

    eng = create_engine(f"sqlite:///{(tmp_path / 'old.db').as_posix()}")
    with eng.begin() as c:
        c.execute(
            text(
                "CREATE TABLE datasets (id VARCHAR(32) PRIMARY KEY, name VARCHAR(255), source VARCHAR(255), "
                "rows INTEGER, n_columns INTEGER, created_at DATETIME, meta_json TEXT)"
            )
        )
        c.execute(
            text("INSERT INTO datasets VALUES ('legacy1','n','s',1,1,'2024-01-01', :m)"),
            {"m": json.dumps({"raw_file": str(tmp_path / "missing.csv")})},
        )
    old_engine, old_session = db.engine, db.SessionLocal
    db.engine, db.SessionLocal = eng, sessionmaker(bind=eng, expire_on_commit=False)
    try:
        db.init_db()
        assert "owner_id" in {c["name"] for c in inspect(eng).get_columns("datasets")}
        with eng.connect() as c:
            assert c.execute(text("SELECT count(*) FROM datasets")).scalar() == 0
        db.init_db()  # idempotent
    finally:
        db.engine, db.SessionLocal = old_engine, old_session
