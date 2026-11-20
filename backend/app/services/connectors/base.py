import re

from app.core.errors import ConnectorError

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|merge|grant|revoke|call|exec|execute|copy|into|put|get)\b",
    re.IGNORECASE,
)
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")


def validate_readonly_query(query: str) -> str:
    """Conservative guard: a single SELECT/WITH statement only. DB-level read-only is applied too."""
    q = query.strip().rstrip(";").strip()
    if not q:
        raise ConnectorError("Query is empty.")
    if ";" in q:
        raise ConnectorError("Only a single statement is allowed.")
    if not re.match(r"(?is)^(select|with)\b", q):
        raise ConnectorError("Only SELECT queries are allowed.")
    if _FORBIDDEN.search(q):
        raise ConnectorError("Query contains a disallowed keyword; only read-only SELECTs are allowed.")
    return q


def validate_identifier(value: str, what: str) -> str:
    if not IDENT.match(value):
        raise ConnectorError(f"Invalid {what} name: {value!r}.")
    return value
