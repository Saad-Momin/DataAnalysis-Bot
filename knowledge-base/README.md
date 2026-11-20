# Dataloom Knowledge Base

Dataloom is a web app where a signed-in user uploads a data file (or connects a database), the app cleans the data automatically, and the user then asks questions in plain English. Answers come back as text, a table and, on request, a chart.

This folder explains the whole project: what each part does, how the parts connect, and where to look when you change something. It describes the code as it is today. Where something is planned but not built, it says so (see [09-known-gaps.md](09-known-gaps.md)).

**PDF version with screenshots:** [Dataloom-Knowledge-Base.pdf](Dataloom-Knowledge-Base.pdf) contains all of the chapters below plus screenshots of the public site and the signed-in app. The original screenshot images are in the [screenshots](screenshots) folder.

## Read in this order

| # | File | What it covers |
|---|------|----------------|
| 01 | [01-overview.md](01-overview.md) | The product, the users, the tech stack and the folder layout |
| 02 | [02-architecture.md](02-architecture.md) | How a request travels through the system; the upload and chat flows |
| 03 | [03-backend.md](03-backend.md) | Every backend module, in plain terms |
| 04 | [04-database.md](04-database.md) | The tables, the files on disk, the cache, and how data is deleted |
| 05 | [05-frontend.md](05-frontend.md) | Pages, components, state, charts and styling |
| 06 | [06-api-reference.md](06-api-reference.md) | Every endpoint with inputs, outputs and error codes |
| 07 | [07-security.md](07-security.md) | Accounts, sessions, the code sandbox and the other safeguards |
| 08 | [08-operations.md](08-operations.md) | Setup, configuration, running, testing and troubleshooting |
| 09 | [09-known-gaps.md](09-known-gaps.md) | What is not built yet and what to do before launch |
| 10 | [10-pricing-and-costs.md](10-pricing-and-costs.md) | Plans, how the prices were derived, and the cost model |
| 11 | [11-glossary.md](11-glossary.md) | Short definitions of terms used in the code and docs |

## One-minute summary

- **Backend:** Python, FastAPI. Cleans data with Pandas, stores it as Parquet, keeps accounts and dataset records in SQLite.
- **AI:** Google Gemini writes Pandas code for each question. The code is checked, then run in a locked-down child process. The AI never sees the full data, only a short description of its columns.
- **Frontend:** Next.js 14, TypeScript, Tailwind, Recharts. Has public marketing pages, sign-up and login pages, and the signed-in workspace.
- **Accounts:** email and password, a session cookie, and every dataset belongs to exactly one user.
- **Tests:** 84 automated backend tests that run offline with a fake AI.

## Where things live

```
DataAnalysis Bot/
  backend/          Python API (FastAPI)
  frontend/         Next.js website and app
  knowledge-base/   this documentation
  start-dev.ps1     starts both servers on Windows
  README.md         quick start
  PRODUCT_PLAN.md   original product and page plan (if present)
  Dataloom-Costing.pdf   internal costing document
```

## Keeping this folder accurate

The facts most likely to drift are the endpoint list, the table columns, the plan prices and the sandbox allow-list. Each is defined in one place in the code, noted at the top of its section. When you change one of those, update the matching file here in the same change.
