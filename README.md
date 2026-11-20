# Dataloom - AI Data Analytics

Upload CSV/Excel/SQL (or connect Snowflake / Postgres / MySQL), get it auto-cleaned with Pandas, then chat with
your data in plain English. Answers come as text first; say "yes" to the visualization offer to get a chart.

## Product overview
Marketing site (`/`, `/features`, `/how-it-works`, `/pricing`, `/security`, `/about`, `/contact`, `/docs`, `/faq`, `/privacy`, `/terms`),
accounts (`/signup`, `/login`, `/forgot-password`, `/reset-password`) and the workspace (`/app`, `/app/settings`).
Each account sees only its own datasets. The plan, route map and API contract are in [PRODUCT_PLAN.md](PRODUCT_PLAN.md).

## Quick start (Windows)

```powershell
.\start-dev.ps1
```
It sets up the backend venv and frontend dependencies on first run, then opens both servers. Add your Gemini key to
`backend\.env` (`GEMINI_API_KEY=...`) and restart the backend. App: http://localhost:3000 · API docs: http://localhost:8000/docs

Manual run:
```
cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
copy .env.example .env      # then add GEMINI_API_KEY
uvicorn app.main:app --reload

cd frontend && npm install && npm run dev
```

## How it works
1. **Ingest** – `POST /api/upload` (.csv/.xlsx/.sql) or `POST /api/connectors/import` (credentials used once, never stored).
2. **Clean + engineer** – Pandas: normalise names, infer types, drop duplicates, fill missing values, add date parts,
   encode categoricals. Result cached as Parquet (`backend/data/cache`) + SQLite metadata.
3. **Ask** – `POST /api/chat`. Gemini writes Pandas code, which is validated (AST allow-list) and run in an isolated
   subprocess with a timeout. The answer is explained in text, followed by "Would you like to see a visualization for this?".
4. **Visualize** – reply "yes" (optionally "as a pie chart"); the backend reshapes the data and returns chart JSON
   that the frontend renders with Recharts.

## Configuration (`backend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | – | required for chat |
| `LLM_MODEL` | `gemini-3.5-flash` | any Gemini model your key can use |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | comma-separated allowed origins |
| `MAX_UPLOAD_MB` | `100` | upload size limit |

Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api`) in `frontend/.env.local`.

## Tests
```
cd backend && pip install -r requirements-dev.txt && pytest
```
Covers cleaning, the code sandbox (including escape attempts), upload/connector validation, CORS, error handling,
rate limiting and the full chat flow with a faked LLM (no network calls).

## Before you launch (not done yet)
- **Email**: there is no email provider. Password-reset links are only logged (and shown on the page when `APP_ENV=development`).
  Wire a provider (Resend/SES/Postmark) into `POST /api/auth/forgot-password`.
- **Billing**: pricing page describes an open beta; Pro/Team are waitlist-only. No payments exist.
- **Secrets/HTTPS**: set `APP_ENV=production`, a long random `SECRET_KEY`, `CORS_ORIGINS` and `FRONTEND_URL` to your real origins,
  and serve over HTTPS (the session cookie becomes `Secure`). Front end and API must share a registrable domain (cookie is `SameSite=Lax`).
- **Legal**: `/privacy` and `/terms` are drafts - have counsel review; replace the placeholder `support@dataloom.example` in `src/lib/brand.ts`
  and set `NEXT_PUBLIC_SITE_URL` (used by sitemap/OpenGraph).
- **Scale-out**: rate limits, login lockouts and chat conversations are in-memory (single process); move to Redis/DB for multiple workers.
  SQLite -> Postgres for production. Sessions are not revoked on password change.
- **Sandbox**: generated code runs in an isolated subprocess (AST allow-list, 30 s timeout, secrets stripped, max 4 concurrent) but with
  no memory cap on Windows - run in containers with CPU/memory limits.
- **Data sharing**: dataset schema, column names, a few sample values and aggregated results are sent to Google Gemini to answer questions.

## Layout
- `backend/app/api/routes` – HTTP endpoints · `services` – ingestion, cleaning, connectors, sandbox, chat engine
- `backend/data` – uploads and Parquet cache · `backend/tests` – pytest suite
- `frontend/src` – Next.js app, components (Chat, ChartView, UploadPanel, ConnectorForm), API client
