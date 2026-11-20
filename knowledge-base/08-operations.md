# 08. Operations

## Requirements

- Python 3.11 or newer (the code uses modern type syntax) and pip
- Node.js 18 or newer and npm
- A Google Gemini API key

## Quick start on Windows

From the project root run `./start-dev.ps1`. It creates the backend virtual environment and installs dependencies if needed, copies `.env.example` to `.env` if there is no `.env`, installs frontend packages if needed, and opens two windows:

- Backend: http://localhost:8000 (docs at /docs)
- Frontend: http://localhost:3000

Then open `backend/.env`, set `GEMINI_API_KEY`, and restart the backend.

## Manual start

```
# backend
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev
```

## Backend settings (`backend/.env`)

| Setting | Default | Meaning |
|---------|---------|---------|
| `APP_ENV` | `development` | `development` shows the reset link in the API response; `production` enables the secure cookie and refuses the default secret |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed website addresses |
| `DATABASE_URL` | SQLite file in `backend/data/` | Any SQLAlchemy URL |
| `UPLOAD_DIR` | `backend/data/uploads` | Where originals are saved |
| `CACHE_DIR` | `backend/data/cache` | Where Parquet files are saved |
| `MAX_UPLOAD_MB` | `100` | Upload limit |
| `GEMINI_API_KEY` | empty | Without it, chat returns 503 |
| `LLM_MODEL` | `gemini-3.5-flash` | Gemini model name. Model names get retired; if chat starts failing with "not found", list available models and update this |
| `SECRET_KEY` | empty (uses an insecure default) | Signs session cookies. Required in production |
| `FRONTEND_URL` | `http://localhost:3000` | Used to build reset links |

The session length (7 days) is `session_days` in `core/config.py`.

## Frontend settings

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` (see [05-frontend.md](05-frontend.md)). They are baked in at build time.

## Running the tests

```
cd backend
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m pytest -q
```

All 84 tests run without internet or a Gemini key. Frontend checks: `npx tsc --noEmit` and `npm run build` inside `frontend/`.

## Production build

```
cd frontend
npm run build
npm start
```

Run the API with uvicorn without `--reload`, behind a reverse proxy that provides HTTPS. Set the environment variables listed above. Use a single worker unless you move rate limits, conversation state and the dataset cache to shared storage.

## Logs

The API logs to the console with timestamps. Unexpected errors are logged with a stack trace under `app`. Password reset links appear in the log in non-production environments.

## Routine tasks

| Task | How |
|------|-----|
| Read contact messages | Query the `contact_messages` table in `backend/data/metadata.db` |
| Back up | Copy the whole `backend/data/` folder while the API is stopped or idle |
| Remove a user's data | They can delete their own account in Settings; or delete rows and files by hand using the dataset id |
| Rotate the Gemini key | Edit `.env`, restart the API |
| Change prices | Edit `frontend/src/lib/pricing.ts`, rebuild the frontend |
| Change the AI model | Set `LLM_MODEL`, restart the API |

## Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| Chat says the AI key is not set (503) | `GEMINI_API_KEY` missing in `backend/.env`; restart the API |
| Chat says the AI service is busy (502) | Gemini returned 429 or 5xx after 3 tries; wait and retry |
| Chat error mentions a missing or retired model | Update `LLM_MODEL` |
| Browser says "Cannot reach the server" | API not running, wrong `NEXT_PUBLIC_API_URL`, or port 8000 blocked |
| Sign-in works but the next page says signed out | Browser address is not in `CORS_ORIGINS`; the cookie needs matching origins. Use `localhost` or `127.0.0.1` consistently |
| Port 8000 already in use, or old behaviour after a code change | A stale server process is still running (common on Windows after closing a terminal). Stop all `python`/`uvicorn` processes and restart |
| Frontend pages return 500 or 404 after rebuilding | Stale `.next` folder; stop the server, delete `frontend/.next`, rebuild, restart |
| Upload fails with 422 | The file could not be read or had no usable rows; the message says why |
| Analysis times out | Question needed too heavy a computation; ask for something narrower |
| Slow first question on a big file | The table is being loaded from Parquet; later questions are faster |
