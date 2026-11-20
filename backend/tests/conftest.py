import os
import sys
import tempfile
from pathlib import Path

# Must run before the app is imported: isolate storage and make sure no real LLM call can happen.
_tmp = Path(tempfile.mkdtemp(prefix="dab-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'meta.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ["CACHE_DIR"] = str(_tmp / "cache")
os.environ["GEMINI_API_KEY"] = ""
os.environ["APP_ENV"] = "development"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ["FRONTEND_URL"] = "http://localhost:3000"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.ratelimit import reset_all  # noqa: E402
from app.main import app  # noqa: E402

CSV = (
    "Order Date,Region,Units,Revenue\n"
    + "\n".join(
        f"2024-0{1 + i % 3}-1{i % 9},{['North', 'South', 'East'][i % 3]},{1 + i % 5},{100 + i * 7.5}" for i in range(30)
    )
    + "\n"
)


PASSWORD = "Sup3rSecret!"
_counter = {"n": 0}


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    reset_all()  # limiter state is process-global; every test starts clean
    yield
    reset_all()


def new_email() -> str:
    _counter["n"] += 1
    return f"user{_counter['n']}@example.com"


def signup(c: TestClient, email: str | None = None, name: str = "Test User", password: str = PASSWORD):
    return c.post("/api/auth/signup", json={"name": name, "email": email or new_email(), "password": password})


@pytest.fixture()
def anon():
    """Unauthenticated client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client():
    """Client signed in as a fresh user (cookie kept in the client)."""
    with TestClient(app) as c:
        r = signup(c)
        assert r.status_code == 201, r.text
        c.user = r.json()
        yield c


@pytest.fixture()
def other_client():
    """A second, independent signed-in user."""
    with TestClient(app) as c:
        assert signup(c).status_code == 201
        yield c


@pytest.fixture()
def dataset_id(client):
    r = client.post("/api/upload", files={"file": ("sales.csv", CSV.encode())})
    assert r.status_code == 200, r.text
    return r.json()["id"]
