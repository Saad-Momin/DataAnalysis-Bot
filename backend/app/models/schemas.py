from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample: list[Any]


class DatasetSummary(BaseModel):
    id: str
    name: str
    source: str
    rows: int
    columns: int
    created_at: datetime


class DatasetDetail(DatasetSummary):
    profile: list[ColumnProfile]
    cleaning_report: dict[str, Any]
    feature_report: dict[str, Any]
    preview: list[dict[str, Any]]


class ChatRequest(BaseModel):
    dataset_id: str = Field(..., min_length=1, max_length=64)
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = Field(None, max_length=64)


class TableResult(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    truncated: bool


class ChartSpec(BaseModel):
    chart_type: Literal["bar", "line", "pie", "area", "scatter"]
    title: str
    x_key: str
    y_keys: list[str]
    x_label: str
    y_label: str
    data: list[dict[str, Any]]
    truncated: bool = False


class ChatResponse(BaseModel):
    conversation_id: str
    kind: Literal["answer", "chart", "message", "error"]
    message: str
    table: TableResult | None = None
    chart: ChartSpec | None = None
    offer_visualization: bool = False
    code: str | None = None


class ConnectorRequest(BaseModel):
    """Credentials are used for a single fetch and are never stored or logged."""

    model_config = ConfigDict(populate_by_name=True)

    type: Literal["snowflake", "postgres", "mysql"]
    name: str | None = Field(None, max_length=120, description="Display name for the dataset")

    # postgres / mysql (AWS RDS etc.)
    host: str | None = None
    port: int | None = Field(None, ge=1, le=65535)

    # shared
    database: str | None = None
    username: str | None = None
    password: SecretStr | None = None
    db_schema: str | None = Field(None, alias="schema")

    # snowflake
    account: str | None = None
    warehouse: str | None = None
    role: str | None = None

    # what to fetch: exactly one of table / query
    table: str | None = None
    query: str | None = None
    max_rows: int = Field(100_000, ge=1, le=1_000_000)

    @model_validator(mode="after")
    def _check(self) -> "ConnectorRequest":
        if bool(self.table) == bool(self.query):
            raise ValueError("Provide exactly one of 'table' or 'query'.")
        if not self.username or self.password is None:
            raise ValueError("'username' and 'password' are required.")
        if self.type == "snowflake":
            if not self.account:
                raise ValueError("'account' is required for Snowflake.")
        elif not self.host or not self.database:
            raise ValueError("'host' and 'database' are required.")
        return self
