"""Snowflake connector (snowflake-connector-python, imported lazily)."""
import pandas as pd

from app.core.errors import ConnectorError
from app.models.schemas import ConnectorRequest
from app.services.connectors.base import validate_identifier, validate_readonly_query


def fetch_snowflake(req: ConnectorRequest) -> pd.DataFrame:
    try:
        import snowflake.connector
    except ImportError as e:
        raise ConnectorError("snowflake-connector-python is not installed on the server.") from e

    if req.table:
        parts = [validate_identifier(p, "table") for p in req.table.split(".")]
        if len(parts) > 3:
            raise ConnectorError("Table name must be [[database.]schema.]table.")
        sql = f"SELECT * FROM {'.'.join(parts)} LIMIT {int(req.max_rows)}"
    else:
        sql = validate_readonly_query(req.query or "")

    kwargs = {
        "account": req.account,
        "user": req.username,
        "password": req.password.get_secret_value() if req.password else None,
        "login_timeout": 15,
        "network_timeout": 60,
    }
    for k in ("warehouse", "database", "role"):
        if getattr(req, k):
            kwargs[k] = getattr(req, k)
    if req.db_schema:
        kwargs["schema"] = req.db_schema

    try:
        conn = snowflake.connector.connect(**kwargs)
    except Exception as e:
        raise ConnectorError(f"Snowflake login failed: {type(e).__name__}") from None

    try:
        cur = conn.cursor()
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchmany(req.max_rows)
    except Exception as e:
        raise ConnectorError(f"Snowflake query failed: {str(e).splitlines()[0][:300]}") from None
    finally:
        conn.close()

    if not rows:
        raise ConnectorError("The query returned no rows.")
    return pd.DataFrame(rows, columns=cols)
