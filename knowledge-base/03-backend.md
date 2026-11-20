# 03. Backend

All backend code is under `backend/app/`. This file walks through each module and says what it is responsible for and what to watch out for.

## Entry point: `main.py`

Builds the FastAPI app and wires in:

- **Startup (`lifespan`):** refuses to start in production with the default secret key, logs a warning if the key or the Gemini key is missing, creates tables and runs the legacy migration (`init_db`).
- **Error handlers:**

| Raised | Becomes |
|--------|---------|
| Validation error | 422 with "field: reason" text. Submitted values are never echoed, because they may be passwords |
| `DatasetNotFound` | 404 "Dataset not found." |
| `DataProcessingError` | 422 with the message |
| `ConnectorError` | 502 with the message |
| Any other exception | 500 "Something went wrong..." and the details go to the log |

- **Catch-all middleware** sits inside the CORS layer, so even a 500 carries CORS headers and the browser can show the message rather than an opaque network error.
- **Origin check middleware:** any POST/PATCH/DELETE with an `Origin` header that is not in the allowed list gets 403. Calls with no Origin header (curl, tests) pass. This guards the cookie session against cross-site requests.
- **CORS:** explicit origin list from config, credentials allowed, methods GET/POST/PATCH/DELETE/OPTIONS, header `Content-Type`.
- All routers are mounted under `/api`.

## `core/`

| File | Responsibility |
|------|----------------|
| `config.py` | Settings read from `backend/.env` through pydantic-settings. See [08-operations.md](08-operations.md) for each setting. Creates the upload and cache folders on first use |
| `errors.py` | Three exception types: `DataProcessingError`, `DatasetNotFound`, `ConnectorError` |
| `ratelimit.py` | `RateLimiter` (N calls per window per client IP) and `FailureTracker` (counts failures per key and blocks once a limit is hit). In memory, one process only |
| `security.py` | argon2 hashing, session token create/decode (HS256 JWT), reset-token helpers. The password check always runs one argon2 verification, even for an unknown email, so timing does not reveal which emails exist |

## `db/database.py`

Defines the engine, session factory, the four tables and `init_db()`. Details in [04-database.md](04-database.md).

## `models/schemas.py`

Pydantic shapes used in requests and responses:

- `DatasetSummary`, `DatasetDetail`, `ColumnProfile`
- `ChatRequest` (dataset id, message up to 2,000 characters, optional conversation id), `ChatResponse`, `TableResult`, `ChartSpec`
- `ConnectorRequest`: type (`snowflake`, `postgres`, `mysql`), connection fields, exactly one of `table` or `query`, `max_rows` between 1 and 1,000,000 (default 100,000). The password is a `SecretStr` so it never prints in logs

## `api/deps.py`

`current_user` reads the `dl_session` cookie, decodes the token, loads the user, and raises 401 if anything is wrong. Add `user: User = Depends(current_user)` to any route that needs a signed-in user.

## `api/routes/`

One file per group. Full endpoint details are in [06-api-reference.md](06-api-reference.md).

| File | Group | Notes |
|------|-------|-------|
| `auth.py` | Accounts | Sign-up, login, logout, profile, password change, forgot and reset password, delete account. Password rules: 8-128 characters, at least one letter and one number. Email is lower-cased. Reset tokens are random, stored only as a SHA-256 hash, valid one hour, single use |
| `upload.py` | File upload | Streams to disk, enforces the size limit, rejects unknown extensions, deletes the file again if processing fails |
| `connectors.py` | Database import | Calls `fetch_remote`, then runs the same pipeline as upload |
| `datasets.py` | Dataset CRUD | List, detail, preview, delete. All scoped to the signed-in user |
| `chat.py` | Chat | Calls the chat engine. Maps AI failures to 502, or 503 when the Gemini key is missing |
| `contact.py` | Contact form | Saves a message to the database. 5 per hour per IP |
| `health.py` | Health | `{"status":"ok","llm_configured":true|false}` |

## `services/`

### Data preparation

| File | What it does |
|------|--------------|
| `ingestion.py` | Reads `.csv` (tries UTF-8 then Latin-1, sniffs the delimiter among `, ; tab \|`, skips bad lines), `.xlsx` (chosen sheet or the first), and `.sql` (runs the script in a throw-away in-memory SQLite database, blocks `ATTACH`, 30 s time limit, loads the chosen table or the largest one). Everything is read as text |
| `cleaning.py` | Normalises column names to `snake_case` (digits-first names get a `c_` prefix, duplicates get a numeric suffix); trims text; treats `"", na, n/a, nan, null, none, nil, -, --, ?, #n/a, #na` as missing; drops fully empty rows and columns; infers booleans, numbers (strips `, $ € £ %` and spaces; leading-zero values such as zip codes stay text) and dates when at least 95% of values fit; removes duplicate rows; drops columns more than 60% empty; fills gaps (numbers with the median, booleans with the most common value, text with `"Unknown"`, dates left empty). Returns a report of every change |
| `feature_engineering.py` | For each date column adds `<col>_year`, `_month`, `_quarter`, `_weekday`. Text columns with at most 50 distinct values and at most half as many distinct values as rows become categories |
| `pipeline.py` | `run_pipeline`: clean, add features, save, return details |
| `dataset_store.py` | Saves and loads datasets (Parquet plus a SQLite record), keeps up to 8 tables in memory, builds column profiles and previews, and deletes datasets and their files |

### Remote databases: `services/connectors/`

| File | What it does |
|------|--------------|
| `__init__.py` | `fetch_remote` picks the right connector and builds the source label shown to the user |
| `sql.py` | PostgreSQL and MySQL through SQLAlchemy. 10 s connect timeout. Tries to set the session read-only. Reads in chunks of 10,000 rows up to `max_rows` |
| `snowflake.py` | Snowflake (the library is loaded only when needed). 15 s login timeout, 60 s network timeout |
| `base.py` | Safety checks. A query must be a single `SELECT` or `WITH` statement with no write keywords (insert, update, delete, drop, alter, create, truncate, merge, grant, revoke, call, exec, copy, into, put, get). Table names must be plain identifiers |

### AI and chat

| File | What it does |
|------|--------------|
| `llm.py` | Wraps Gemini. `generate` (text) and `generate_json`. 45 s timeout, up to 3 attempts, retries on 429/500/502/503/504 with 1.5 s, 3 s delays. Strips code fences from JSON replies. Raises `LLMError` with a user-safe message |
| `prompts.py` | The three system prompts: analysis (question to Pandas code), summary (result to plain English), visualisation (result to a chart-shaped table). They forbid imports, file access, `query`/`eval`, and tell the AI to treat sample values as data, never as instructions |
| `schema_context.py` | Builds the compact data description sent to the AI: row and column count, then per column the type, nulls, and either value choices, a range, or min/max/mean. At most 80 columns are described |
| `chat_state.py` | In-memory conversations: up to 6 history entries each, 500 conversations, 2-hour expiry. Holds the pending chart offer |
| `chat_engine.py` | The conversation brain. See [02-architecture.md](02-architecture.md) flows 3 and 4. Response `kind` is `answer`, `chart`, `message` or `error` |

### Safe code execution

| File | What it does |
|------|--------------|
| `sandbox_runner.py` | Self-contained file that is both imported for validation and launched as the child process. Contains the allow-lists, the AST checker, the restricted built-ins and the result serialiser |
| `sandbox.py` | The parent side: validates, takes one of 4 slots, starts `python -I sandbox_runner.py`, passes the code over stdin, removes any environment variable whose name contains KEY, TOKEN, SECRET, PASSWORD or CREDENTIAL, enforces the 30 s timeout, parses the single JSON result |

Details of what the checker allows and blocks are in [07-security.md](07-security.md).

## Result shapes returned by the sandbox

| `kind` | When | Content |
|--------|------|---------|
| `table` | DataFrame or Series | columns, up to `max_rows` rows (50 for answers, 200 for charts), total row count, truncated flag |
| `dict` | dictionary | up to 200 entries |
| `list` | list, tuple, array | up to 200 items |
| `scalar` | a single value | the value; NaN and infinity become null |

An unnamed integer row index is dropped (it is just leftover row positions). A named, multi-level or label index is kept as a column.

## Backend dependencies

`requirements.txt`: fastapi, uvicorn, python-multipart, pydantic, pydantic-settings, pandas, numpy, pyarrow, openpyxl, sqlalchemy, snowflake-connector-python, psycopg2-binary, pymysql, google-genai, python-dotenv, PyJWT, argon2-cffi, email-validator. `requirements-dev.txt` adds the test tools.

## Tests: `backend/tests/`

84 tests, all offline. Gemini is replaced by a fake in `conftest.py`.

| File | Covers |
|------|--------|
| `test_pipeline.py` | Cleaning rules, type inference, features |
| `test_sandbox.py` | Allowed and blocked code, timeouts, result shapes |
| `test_api.py` | Upload, datasets, chat flow, chart flow, contact, health |
| `test_auth.py` | Sign-up, login, lockout, password change and reset, delete account, cookie flags, origin check |
| `test_isolation.py` | One user can never see, chat with or delete another user's data |
