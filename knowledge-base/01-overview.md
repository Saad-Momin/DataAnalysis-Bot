# 01. Overview

## What Dataloom is

A business user has a spreadsheet, a CSV, a SQL dump or a database table and wants answers without writing code. Dataloom lets them:

1. **Bring data in** by uploading a file or connecting a database.
2. **Have it cleaned automatically**: tidy column names, correct types, removed duplicates, filled gaps.
3. **Ask questions in English**, such as "Which region has the highest revenue?".
4. **Get an answer** in a few sentences plus a table, and a chart if they say yes to the offer.

It is built to be sold as a subscription (SaaS). Everything is free during the open beta, and prices are published on the site for when billing starts (see [10-pricing-and-costs.md](10-pricing-and-costs.md)).

## Who uses it

| Role | What they do |
|------|--------------|
| Visitor | Reads the marketing pages, pricing and docs; sends a contact message |
| User | Signs up, uploads data, chats, manages their account |
| Operator (you) | Runs the servers, holds the Gemini key, reads contact messages from the database |

There is no admin screen. Operators work directly with the database and logs.

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| API | FastAPI (Python) | Served by uvicorn |
| Data | Pandas 3.x, NumPy, PyArrow | Cleaning, analysis, Parquet files |
| Database | SQLAlchemy 2 on SQLite | Users, reset tokens, contact messages, dataset records |
| AI | Google Gemini via `google-genai` | Model `gemini-3.5-flash`, set in config |
| Passwords | argon2-cffi | Hashed, never stored in plain text |
| Sessions | PyJWT | Signed token in an httpOnly cookie |
| Imports | openpyxl, psycopg2, PyMySQL, snowflake-connector | Excel, PostgreSQL, MySQL, Snowflake |
| Frontend | Next.js 14 (App Router), React 18, TypeScript | |
| Styling | Tailwind CSS 3 | Dark mode follows the system setting |
| Charts | Recharts | Bar, line, pie (donut), area, scatter |
| Tests | pytest | 84 tests, no network needed |

## Folder layout

```
backend/
  app/
    main.py              app setup: error handlers, CORS, origin check, routers
    core/                config, errors, rate limiting, password and token helpers
    db/database.py       tables (SQLAlchemy models) and startup migration
    models/schemas.py    request and response shapes (Pydantic)
    api/
      deps.py            "who is the signed-in user?" dependency
      routes/            one file per endpoint group
    services/            the real work: cleaning, AI, sandbox, storage, connectors
  data/
    uploads/             the original files users uploaded
    cache/               the cleaned data, one Parquet file per dataset
    metadata.db          the SQLite database
  tests/                 automated tests
  requirements.txt       runtime dependencies
  requirements-dev.txt   test dependencies
  .env / .env.example    configuration (the real .env is not committed)

frontend/
  src/
    app/                 pages, grouped by route group
      (marketing)/       public pages
      (auth)/            sign-up, login, password reset
      (app)/             the signed-in workspace and settings
    components/          reusable pieces (chat, charts, forms, site header)
    lib/                 API client, auth state, pricing data, chart colours
  public/sample-sales.csv   the sample dataset offered to new users
```

## Public pages and app pages

| Route | Purpose |
|-------|---------|
| `/` | Home: pitch, product preview, pricing summary |
| `/features`, `/how-it-works` | What it does and how |
| `/pricing` | Plans, cost by file size, how questions are counted |
| `/security`, `/about`, `/faq`, `/docs` | Trust and help content |
| `/contact` | Contact form (saved to the database) |
| `/privacy`, `/terms` | Draft legal pages |
| `/signup`, `/login`, `/forgot-password`, `/reset-password` | Account pages |
| `/app` | The workspace: datasets, upload, chat |
| `/app/settings` | Profile, password, delete account |
| `/sitemap.xml`, `/robots.txt` | Search engine files |

## Supported inputs

- **Files:** `.csv`, `.xlsx`, `.sql` (a SQLite-style SQL script). Maximum 100 MB per upload. Old `.xls` is not supported.
- **Databases:** PostgreSQL, MySQL (including Amazon RDS), and Snowflake. Up to 1,000,000 rows per import, default 100,000. Credentials are used once and not stored.

## What a user can ask

Anything answerable from the table: totals, averages, rankings, trends over time, comparisons, counts, filters. Follow-up questions work because the last three exchanges are remembered. Questions the data cannot answer get a polite explanation instead of a guess.
