import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, chat, connectors, contact, datasets, health, upload
from app.core.config import DEFAULT_SECRET_KEY, get_settings
from app.core.errors import ConnectorError, DatasetNotFound, DataProcessingError
from app.db.database import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_for_startup()
    if settings.secret_key == DEFAULT_SECRET_KEY:
        log.warning("SECRET_KEY is not set; using an insecure development default. Set it in backend/.env.")
    init_db()
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY is not set; chat will return 503 until it is added to backend/.env")
    yield


app = FastAPI(title="AI Data Analytics API", version="1.0.0", lifespan=lifespan)


# --- error handling -------------------------------------------------------------------------------
def _err(status: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail})


@app.exception_handler(RequestValidationError)
async def on_validation_error(_: Request, exc: RequestValidationError):
    # Never echo submitted values (may contain passwords); report only where and why.
    parts = []
    for e in exc.errors():
        loc = ".".join(str(x) for x in e.get("loc", ()) if x not in ("body", "query", "form"))
        msg = str(e.get("msg", "invalid")).removeprefix("Value error, ")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return _err(422, "; ".join(parts)[:500] or "Invalid request.")


@app.exception_handler(DatasetNotFound)
async def on_not_found(_: Request, __: DatasetNotFound):
    return _err(404, "Dataset not found.")


@app.exception_handler(DataProcessingError)
async def on_data_error(_: Request, exc: DataProcessingError):
    return _err(422, str(exc))


@app.exception_handler(ConnectorError)
async def on_connector_error(_: Request, exc: ConnectorError):
    return _err(502, str(exc))


# Added BEFORE CORSMiddleware so it sits inside it: unexpected 500s then still carry CORS headers and
# the browser can show the message instead of an opaque network error.
@app.middleware("http")
async def catch_unexpected(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return _err(500, "Something went wrong on the server. Please try again.")


@app.middleware("http")
async def check_origin(request: Request, call_next):
    """CSRF defence for the cookie session: a state-changing request from a foreign Origin is refused.
    Requests without an Origin header (curl, tests, server-to-server) are allowed."""
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin is not None and origin.rstrip("/") not in settings.cors_origin_list:
            return _err(403, "Request origin is not allowed.")
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,  # httpOnly session cookie; origins are an explicit list, never "*"
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)

for r in (health.router, auth.router, contact.router, upload.router, connectors.router, datasets.router, chat.router):
    app.include_router(r, prefix="/api")
