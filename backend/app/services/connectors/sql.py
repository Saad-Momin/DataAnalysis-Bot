"""Postgres / MySQL (incl. AWS RDS) connector via SQLAlchemy."""
import pandas as pd
import sqlalchemy as sa
from sqlalchemy.engine import URL

from app.core.errors import ConnectorError
from app.models.schemas import ConnectorRequest
from app.services.connectors.base import validate_identifier, validate_readonly_query

DRIVERS = {"postgres": "postgresql+psycopg2", "mysql": "mysql+pymysql"}
DEFAULT_PORTS = {"postgres": 5432, "mysql": 3306}
CHUNK = 10_000


def fetch_sql(req: ConnectorRequest) -> pd.DataFrame:
    url = URL.create(
        DRIVERS[req.type],
        username=req.username,
        password=req.password.get_secret_value() if req.password else None,
        host=req.host,
        port=req.port or DEFAULT_PORTS[req.type],
        database=req.database,
    )
    connect_args = {"connect_timeout": 10}
    engine = sa.create_engine(url, connect_args=connect_args, pool_pre_ping=False)

    if req.table:
        validate_identifier(req.table, "table")
        schema = validate_identifier(req.db_schema, "schema") if req.db_schema else None
        stmt = sa.select(sa.literal_column("*")).select_from(sa.table(req.table, schema=schema)).limit(req.max_rows)
    else:
        stmt = sa.text(validate_readonly_query(req.query or ""))

    try:
        with engine.connect() as conn:
            try:
                ro = "SET TRANSACTION READ ONLY" if req.type == "postgres" else "SET SESSION TRANSACTION READ ONLY"
                conn.execute(sa.text(ro))
            except Exception:
                pass  # best effort; query is already validated as read-only
            frames, total = [], 0
            for chunk in pd.read_sql_query(stmt, conn, chunksize=CHUNK):
                frames.append(chunk)
                total += len(chunk)
                if total >= req.max_rows:
                    break
            conn.rollback()
    except ConnectorError:
        raise
    except Exception as e:
        # Do not echo the full driver message blindly; it may contain connection details.
        raise ConnectorError(f"Could not fetch from {req.type}: {type(e).__name__}: {_short(e)}") from None
    finally:
        engine.dispose()

    if not frames:
        raise ConnectorError("The query returned no rows.")
    return pd.concat(frames, ignore_index=True).head(req.max_rows)


def _short(e: Exception) -> str:
    return str(getattr(e, "orig", e)).splitlines()[0][:300]
