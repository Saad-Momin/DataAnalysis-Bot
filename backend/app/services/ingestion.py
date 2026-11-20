"""Read uploaded files (.csv, .xlsx, .sql) into raw DataFrames."""
import csv
import sqlite3
import time
from pathlib import Path

import pandas as pd

from app.core.errors import DataProcessingError

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".sql"}
SQL_TIME_LIMIT_S = 30


def read_file(path: Path, ext: str, *, sheet: str | None = None, table: str | None = None) -> pd.DataFrame:
    try:
        if ext == ".csv":
            return _read_csv(path)
        if ext == ".xlsx":
            return _read_excel(path, sheet)
        if ext == ".sql":
            return _read_sql_script(path, table)
    except DataProcessingError:
        raise
    except Exception as e:  # pandas / openpyxl / sqlite parse failures
        raise DataProcessingError(f"Could not read the file: {e}") from e
    raise DataProcessingError(f"Unsupported file type '{ext}'.")


def _read_csv(path: Path) -> pd.DataFrame:
    for enc in ("utf-8-sig", "latin-1"):
        try:
            with open(path, "r", encoding=enc, newline="") as f:
                sample = f.read(65536)
            try:
                delim = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
            except csv.Error:
                delim = ","
            # Read everything as text; type inference happens in the cleaning step.
            return pd.read_csv(path, sep=delim, encoding=enc, dtype=str, on_bad_lines="skip")
        except UnicodeDecodeError:
            continue
    raise DataProcessingError("Could not decode the CSV file (tried UTF-8 and Latin-1).")


def _read_excel(path: Path, sheet: str | None) -> pd.DataFrame:
    with pd.ExcelFile(path, engine="openpyxl") as xl:
        if sheet and sheet not in xl.sheet_names:
            raise DataProcessingError(f"Sheet '{sheet}' not found. Available: {', '.join(xl.sheet_names)}")
        return xl.parse(sheet or xl.sheet_names[0])


def _read_sql_script(path: Path, table: str | None) -> pd.DataFrame:
    """Run a SQL dump in an isolated in-memory SQLite DB and load one table."""
    try:
        script = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        script = path.read_text(encoding="latin-1")

    def authorizer(action, *_):
        # No ATTACH (would allow touching files on disk).
        return sqlite3.SQLITE_DENY if action == sqlite3.SQLITE_ATTACH else sqlite3.SQLITE_OK

    conn = sqlite3.connect(":memory:")
    try:
        conn.set_authorizer(authorizer)
        deadline = time.monotonic() + SQL_TIME_LIMIT_S
        conn.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 10_000)
        try:
            conn.executescript(script)
        except sqlite3.Error as e:
            raise DataProcessingError(f"SQL script failed (SQLite dialect expected): {e}") from e
        conn.set_progress_handler(None, 0)

        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        if not tables:
            raise DataProcessingError("The SQL script did not create any tables.")
        if table:
            if table not in tables:
                raise DataProcessingError(f"Table '{table}' not found. Available: {', '.join(tables)}")
            chosen = table
        else:
            chosen = max(tables, key=lambda t: conn.execute(f'SELECT COUNT(*) FROM "{t.replace(chr(34), chr(34) * 2)}"').fetchone()[0])
        safe = chosen.replace('"', '""')
        return pd.read_sql_query(f'SELECT * FROM "{safe}"', conn)
    finally:
        conn.close()
