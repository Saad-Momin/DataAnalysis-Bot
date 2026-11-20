class DataProcessingError(Exception):
    """Bad or unusable input data / request (maps to HTTP 422)."""


class DatasetNotFound(Exception):
    """Unknown dataset id (maps to HTTP 404)."""


class ConnectorError(Exception):
    """Remote database connection or fetch failure (maps to HTTP 502/400)."""
