import json
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest

from app.core import security
from app.core.config import DEFAULT_SECRET_KEY, Settings
from app.db.database import ContactMessage, PasswordResetToken, SessionLocal, User
from app.services import chat_state, dataset_store
from conftest import PASSWORD, new_email, signup

ORIGIN = {"Origin": "http://localhost:3000"}


# ---- signup / login / logout / me -----------------------------------------------------------------
def test_signup_login_me_logout(anon):
    email = new_email()
    r = signup(anon, email.upper(), name="  Ada  ")
    assert r.status_code == 201
    u = r.json()
    assert set(u) == {"id", "email", "name", "created_at"} and u["email"] == email and u["name"] == "Ada"
    assert "password" not in r.text and "hash" not in r.text
    assert anon.get("/api/auth/me").json() == u

    assert anon.post("/api/auth/logout").status_code == 204
    assert anon.get("/api/auth/me").status_code == 401

    r = anon.post("/api/auth/login", json={"email": email.upper(), "password": PASSWORD})
    assert r.status_code == 200 and r.json()["id"] == u["id"]
    assert anon.get("/api/auth/me").status_code == 200


def test_me_requires_auth_and_rejects_garbage_cookie(anon):
    assert anon.get("/api/auth/me").status_code == 401
    anon.cookies.set("dl_session", "not-a-jwt")
    assert anon.get("/api/auth/me").status_code == 401


def test_duplicate_email_and_wrong_password(anon):
    email = new_email()
    assert signup(anon, email).status_code == 201
    r = signup(anon, email.upper())
    assert r.status_code == 409 and r.json()["detail"] == "An account with this email already exists."
    bad = anon.post("/api/auth/login", json={"email": email, "password": "Wrong1234"})
    ghost = anon.post("/api/auth/login", json={"email": "ghost@example.com", "password": "Wrong1234"})
    assert bad.status_code == ghost.status_code == 401
    assert bad.json() == ghost.json() == {"detail": "Incorrect email or password."}


def test_login_lockout_per_email_then_429(anon):
    email = new_email()
    signup(anon, email)
    for _ in range(5):
        assert anon.post("/api/auth/login", json={"email": email, "password": "Wrong1234"}).status_code == 401
    r = anon.post("/api/auth/login", json={"email": email, "password": PASSWORD})  # even the right one is blocked
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_login_per_ip_limit(anon):
    codes = [anon.post("/api/auth/login", json={"email": f"x{i}@example.com", "password": "Wrong1234"}).status_code for i in range(11)]
    assert codes[:10] == [401] * 10 and codes[10] == 429


def test_signup_per_ip_limit(anon):
    codes = [signup(anon).status_code for _ in range(6)]
    assert codes == [201] * 5 + [429]


@pytest.mark.parametrize("pw", ["short1", "alllettersonly", "123456789", "a1" * 65])
def test_password_policy(anon, pw):
    r = signup(anon, password=pw)
    assert r.status_code == 422 and pw not in r.text


def test_signup_validation(anon):
    assert anon.post("/api/auth/signup", json={"name": "", "email": new_email(), "password": PASSWORD}).status_code == 422
    assert anon.post("/api/auth/signup", json={"name": "A", "email": "nope", "password": PASSWORD}).status_code == 422


def test_cookie_flags(anon):
    r = signup(anon)
    sc = r.headers["set-cookie"].lower()
    assert "dl_session=" in sc and "httponly" in sc and "samesite=lax" in sc and "max-age=604800" in sc and "secure" not in sc
    out = anon.post("/api/auth/logout").headers["set-cookie"].lower()
    assert "dl_session=" in out and ("max-age=0" in out or "expires=" in out)


def test_secure_cookie_and_secret_policy_in_production():
    prod = Settings(app_env="production", secret_key="x" * 40)
    assert prod.cookie_secure
    prod.validate_for_startup()
    with pytest.raises(RuntimeError):
        Settings(app_env="production", secret_key="").validate_for_startup()
    with pytest.raises(RuntimeError):
        Settings(app_env="production", secret_key=DEFAULT_SECRET_KEY).validate_for_startup()
    Settings(app_env="development", secret_key="").validate_for_startup()  # dev only warns


def test_password_is_hashed_and_session_token_roundtrip():
    h = security.hash_password(PASSWORD)
    assert h != PASSWORD and h.startswith("$argon2") and security.verify_password(PASSWORD, h)
    assert not security.verify_password("nope", h) and not security.verify_password(PASSWORD, None)
    assert security.decode_session_token(security.create_session_token("abc")) == "abc"
    assert security.decode_session_token("garbage") is None


# ---- profile / change password --------------------------------------------------------------------
def test_update_profile(client):
    r = client.patch("/api/auth/me", json={"name": "New Name"})
    assert r.status_code == 200 and r.json()["name"] == "New Name" and r.json()["email"] == client.user["email"]
    assert client.patch("/api/auth/me", json={"name": " "}).status_code == 422


def test_change_password(client, anon):
    assert client.post("/api/auth/change-password", json={"current_password": "Nope12345", "new_password": "Brand-new-1"}).status_code == 400
    assert client.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "weak"}).status_code == 422
    assert client.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "Brand-new-1"}).status_code == 204
    email = client.user["email"]
    assert anon.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401
    assert anon.post("/api/auth/login", json={"email": email, "password": "Brand-new-1"}).status_code == 200


def test_auth_required_for_profile_routes(anon):
    assert anon.patch("/api/auth/me", json={"name": "x"}).status_code == 401
    assert anon.post("/api/auth/change-password", json={"current_password": "a", "new_password": "Abcdefg1"}).status_code == 401
    assert anon.request("DELETE", "/api/auth/me", json={"password": "a"}).status_code == 401


# ---- forgot / reset -------------------------------------------------------------------------------
def _token_from(resp) -> str:
    return parse_qs(urlparse(resp.json()["dev_reset_url"]).query)["token"][0]


def test_forgot_password_does_not_enumerate(anon):
    email = new_email()
    signup(anon, email)
    known = anon.post("/api/auth/forgot-password", json={"email": email})
    unknown = anon.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json()["message"] == unknown.json()["message"]
    assert known.json()["dev_reset_url"].startswith("http://localhost:3000/reset-password?token=")


def test_forgot_password_hides_url_outside_development(anon, monkeypatch):
    from app.core.config import get_settings

    email = new_email()
    signup(anon, email)
    monkeypatch.setattr(get_settings(), "app_env", "staging")
    r = anon.post("/api/auth/forgot-password", json={"email": email})
    assert r.status_code == 200 and set(r.json()) == {"message"}


def test_reset_flow_single_use_and_hashed(anon):
    email = new_email()
    signup(anon, email)
    token = _token_from(anon.post("/api/auth/forgot-password", json={"email": email}))
    with SessionLocal() as s:
        assert all(t.token_hash != token and token not in t.token_hash for t in s.query(PasswordResetToken).all())
    assert anon.post("/api/auth/reset-password", json={"token": token, "password": "weak"}).status_code == 422
    assert anon.post("/api/auth/reset-password", json={"token": token, "password": "Fresh-pass-9"}).status_code == 204
    assert anon.post("/api/auth/reset-password", json={"token": token, "password": "Another-pass-9"}).status_code == 400
    assert anon.post("/api/auth/login", json={"email": email, "password": "Fresh-pass-9"}).status_code == 200
    assert anon.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401


def test_reset_rejects_bad_and_expired_tokens(anon):
    email = new_email()
    signup(anon, email)
    assert anon.post("/api/auth/reset-password", json={"token": "bogus", "password": "Fresh-pass-9"}).status_code == 400
    token = _token_from(anon.post("/api/auth/forgot-password", json={"email": email}))
    with SessionLocal() as s:
        t = s.query(PasswordResetToken).filter_by(token_hash=security.hash_reset_token(token)).one()
        t.expires_at = t.expires_at - timedelta(hours=2)
        s.commit()
    r = anon.post("/api/auth/reset-password", json={"token": token, "password": "Fresh-pass-9"})
    assert r.status_code == 400 and "expired" in r.json()["detail"]


def test_new_forgot_request_invalidates_previous_token(anon):
    email = new_email()
    signup(anon, email)
    t1 = _token_from(anon.post("/api/auth/forgot-password", json={"email": email}))
    t2 = _token_from(anon.post("/api/auth/forgot-password", json={"email": email}))
    assert anon.post("/api/auth/reset-password", json={"token": t1, "password": "Fresh-pass-9"}).status_code == 400
    assert anon.post("/api/auth/reset-password", json={"token": t2, "password": "Fresh-pass-9"}).status_code == 204


def test_forgot_password_rate_limit(anon):
    codes = [anon.post("/api/auth/forgot-password", json={"email": f"g{i}@example.com"}).status_code for i in range(6)]
    assert codes == [200] * 5 + [429]


# ---- delete account -------------------------------------------------------------------------------
def test_delete_account_cascade(client, anon, dataset_id):
    parquet = dataset_store.parquet_path(dataset_id)
    raw = Path(json.loads(dataset_store.get_record(dataset_id).meta_json)["raw_file"])
    assert parquet.exists() and raw.exists()
    conv = chat_state.get_or_create(None, dataset_id, client.user["id"])
    assert client.request("DELETE", "/api/auth/me", json={"password": "Wrong12345"}).status_code == 400
    assert client.get("/api/auth/me").status_code == 200  # wrong password deletes nothing

    r = client.request("DELETE", "/api/auth/me", json={"password": PASSWORD})
    assert r.status_code == 204 and "dl_session=" in r.headers["set-cookie"]
    assert not parquet.exists() and not raw.exists()
    assert dataset_id not in dataset_store._cache and conv.id not in chat_state._store
    with SessionLocal() as s:
        assert s.get(User, client.user["id"]) is None
    assert client.get("/api/auth/me").status_code == 401
    assert anon.post("/api/auth/login", json={"email": client.user["email"], "password": PASSWORD}).status_code == 401


def test_delete_account_leaves_other_users_alone(client, other_client, dataset_id):
    other_ds = other_client.post("/api/upload", files={"file": ("o.csv", b"a,b\n1,2\n3,4\n")}).json()["id"]
    client.request("DELETE", "/api/auth/me", json={"password": PASSWORD})
    assert other_client.get(f"/api/datasets/{other_ds}").status_code == 200


# ---- Origin check / CORS --------------------------------------------------------------------------
def test_origin_check_blocks_foreign_origin_on_state_changing_requests(client):
    evil = {"Origin": "http://evil.example"}
    assert client.post("/api/auth/logout", headers=evil).status_code == 403
    assert client.patch("/api/auth/me", json={"name": "x"}, headers=evil).status_code == 403
    assert client.request("DELETE", "/api/auth/me", json={"password": PASSWORD}, headers=evil).status_code == 403
    assert client.get("/api/auth/me").status_code == 200  # nothing happened
    assert client.post("/api/auth/logout", headers=ORIGIN).status_code == 204  # allowed origin
    assert client.post("/api/auth/logout").status_code == 204  # no Origin header (curl/tests)


def test_cors_allows_credentials_and_errors_carry_cors(anon):
    pre = anon.options("/api/auth/me", headers={**ORIGIN, "Access-Control-Request-Method": "PATCH"})
    assert pre.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert pre.headers["access-control-allow-credentials"] == "true" and "PATCH" in pre.headers["access-control-allow-methods"]
    r = anon.get("/api/auth/me", headers=ORIGIN)  # 401
    assert r.status_code == 401 and r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert r.headers["access-control-allow-credentials"] == "true"
    for _ in range(11):
        r = anon.post("/api/auth/login", json={"email": "a@example.com", "password": "x"}, headers=ORIGIN)
    assert r.status_code == 429 and r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in anon.get("/api/health", headers={"Origin": "http://evil.example"}).headers


def test_health_is_public(anon):
    assert anon.get("/api/health").status_code == 200


# ---- contact --------------------------------------------------------------------------------------
def test_contact_endpoint(anon):
    body = {"name": "Grace", "email": "grace@example.com", "message": "Hello there"}
    r = anon.post("/api/contact", json=body)
    assert r.status_code == 201 and r.json()["message"]
    with SessionLocal() as s:
        assert s.query(ContactMessage).filter_by(email="grace@example.com").count() >= 1
    assert anon.post("/api/contact", json={**body, "message": "x" * 5001}).status_code == 422
    assert anon.post("/api/contact", json={**body, "email": "bad"}).status_code == 422
    assert anon.post("/api/contact", json={**body, "name": ""}).status_code == 422


def test_contact_rate_limit(anon):
    body = {"name": "G", "email": "g@example.com", "message": "hi"}
    codes = [anon.post("/api/contact", json=body).status_code for _ in range(6)]
    assert codes == [201] * 5 + [429]
