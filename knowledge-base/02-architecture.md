# 02. Architecture

## The big picture

```
 Browser (Next.js app on :3000)
    |  fetch with cookie, JSON or multipart
    v
 FastAPI (on :8000, all routes under /api)
    |-- auth, contact, datasets  --> SQLite (metadata.db)
    |-- upload / connectors      --> cleaning --> Parquet file + SQLite record
    |-- chat                     --> Gemini (HTTPS)  and  sandbox subprocess --> Parquet file
```

There are two servers during development: the website on port 3000 and the API on port 8000. The browser talks to the API directly, and CORS is configured to allow that with cookies.

## Flow 1: sign-up and session

1. The user submits the sign-up form. The API checks the email format and password rules, hashes the password with argon2, and saves a `users` row.
2. The API replies with the user and sets a cookie named `dl_session`. It holds a signed token that expires after 7 days. The cookie is httpOnly, so page scripts cannot read it.
3. On every page load the frontend calls `GET /api/auth/me`. A 200 means signed in, a 401 means signed out.
4. Each protected API call reads the cookie, verifies the token, and loads the user (see `api/deps.py`).

## Flow 2: bringing data in

1. **Upload:** the file is streamed to `data/uploads/<random id>.<ext>`. The size is checked while writing, so an oversized file is rejected without filling the disk. The client's file name is never used on disk.
2. **Import:** for Snowflake, PostgreSQL and MySQL the query runs once with the supplied credentials and the rows come back as a table.
3. **Read:** `ingestion.py` turns the file into a raw Pandas table, with every column read as text so nothing is guessed too early.
4. **Clean:** `cleaning.py` fixes names, trims text, treats placeholders like `N/A` as missing, infers numbers, dates and booleans, removes duplicates, drops columns that are mostly empty, and fills gaps.
5. **Add features:** `feature_engineering.py` adds year, month, quarter and weekday columns for every date column, and marks low-variety text columns as categories.
6. **Store:** the cleaned table is written to `data/cache/<id>.parquet`. A row in `datasets` records the owner, name, size and a JSON block with the column profile and the cleaning report.
7. **Reply:** the API returns the dataset details, including a 10-row preview and a report of what was changed.

## Flow 3: asking a question

```
User message
  -> chat route (rate limit, must be signed in)
  -> chat_engine.handle_message
       is a chart offer waiting?
         yes + user said yes  -> build chart (flow 4)
         user said no         -> acknowledge
         anything else        -> treat as a new question
       new question:
         1. describe the data (columns, types, value hints) for the AI
         2. Gemini returns JSON: { answerable, code, approach, reply }
         3. check the code (AST allow-list)
         4. run it in an isolated child process against the Parquet file
         5. if it fails, send the error back to Gemini (up to 3 attempts in total)
         6. Gemini turns the numeric result into 2-5 plain sentences
         7. reply = text + table + "Would you like to see a visualization for this?"
```

Key points:

- The AI sees a **description** of the data (column names, types, min/max/mean, a few sample values), not the rows. The result of the computation is sent back to it for the written summary, truncated to 6,000 characters.
- Because the AI input depends on the number of columns and not the number of rows, big files do not make questions more expensive.
- If Gemini is busy (HTTP 429 or 5xx), the call is retried with a short delay. If it still fails the user sees a clear message.
- Conversation memory is kept in the server's memory for 2 hours, keyed by user and dataset.

## Flow 4: the chart

When the last answer is waiting for a chart reply and the user says yes (or names a chart type), the engine asks Gemini for new code that shapes the result into a table whose first column is the x axis and the remaining columns are numbers. The same check-and-run steps apply. The engine then picks the chart type (bar, line, pie, area or scatter), trims to at most 200 points, and returns a chart specification. The browser draws it.

Reply recognition is rule-based (`classify_reply`): short replies starting with words like "yes", "sure", "please", or mentioning "chart", "bar" or "pie", count as yes. Replies like "no", "not now" count as no. Everything else is treated as a new question.

## Concurrency and limits

| Mechanism | Value | Where |
|-----------|-------|-------|
| Sandbox timeout | 30 seconds | `services/sandbox.py` |
| Concurrent sandbox processes | 4; waits up to 20 s for a slot | `services/sandbox.py` |
| Gemini call timeout | 45 seconds, 3 attempts | `services/llm.py` |
| Datasets held in memory | 8 (least recently used leave first) | `services/dataset_store.py` |
| Conversations held in memory | 500, 2 hours idle | `services/chat_state.py` |
| Chat rate limit | 30 per minute per IP | `routes/chat.py` |

## Design decisions worth knowing

- **Parquet beside SQLite.** Metadata is small and relational, so it lives in SQLite. The cleaned data is large and column-shaped, so it lives in Parquet, which loads fast and is compact.
- **Code generation, not direct answers.** The AI writes Pandas code and the server computes the numbers. That keeps figures exact and lets the user inspect "How this was computed".
- **A separate process for execution.** Generated code runs in `python -I` with restricted built-ins and no secrets in its environment, so a bad program can crash only itself.
- **No stored database credentials.** Imports use credentials once, then discard them.
