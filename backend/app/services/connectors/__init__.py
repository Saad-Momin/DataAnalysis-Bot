import pandas as pd

from app.core.errors import ConnectorError
from app.models.schemas import ConnectorRequest


def fetch_remote(req: ConnectorRequest) -> tuple[pd.DataFrame, str, str]:
    """Return (raw dataframe, default dataset name, source label). Credentials never leave this call."""
    if req.type == "snowflake":
        from app.services.connectors.snowflake import fetch_snowflake

        df = fetch_snowflake(req)
        source = f"snowflake:{req.account}/{req.database or '-'}"
    elif req.type in ("postgres", "mysql"):
        from app.services.connectors.sql import fetch_sql

        df = fetch_sql(req)
        source = f"{req.type}:{req.host}/{req.database}"
    else:
        raise ConnectorError(f"Unsupported connector '{req.type}'.")
    name = req.name or req.table or "query_result"
    return df, name, source
