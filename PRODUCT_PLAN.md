# Dataloom - Productization Plan

Product: **Dataloom** - "Ask your data anything." Upload CSV/Excel/SQL or connect Snowflake/Postgres/MySQL, we clean it
automatically, then you chat with it in plain English and get charts on request.
Today the repo is a working single-user app (`backend/` FastAPI, `frontend/` Next.js 14 App Router + Tailwind 3 + Recharts).
This plan turns it into a multi-user product with a marketing site, real accounts and per-user data isolation.

## 1. Information architecture (routes)

| Group | Route | Purpose | Owner |
|---|---|---|---|
| marketing | `/` | Landing page | C |
| marketing | `/features`, `/how-it-works`, `/pricing`, `/security`, `/about`, `/contact`, `/docs`, `/faq` | Product info | C |
| marketing | `/privacy`, `/terms` | Legal (draft templates) | C |
| marketing | `not-found.tsx`, `sitemap.ts`, `robots.ts` | Polish/SEO | C |
| auth | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Accounts | B |
| app | `/app` | Workspace (datasets + chat + charts) - today's `page.tsx`, moved | B |
| app | `/app/settings` | Profile, password, delete account | B |

Route groups: `src/app/(marketing)`, `src/app/(auth)`, `src/app/(app)`. The root `layout.tsx` already wraps everything in
`AuthProvider` (see `src/lib/auth.tsx`).

## 2. Ownership (agents edit ONLY their files - no overlaps)

- **Agent A - Backend auth & isolation**: everything under `backend/` (app code, tests, requirements, `.env.example`).
- **Agent B - Frontend auth + app**: `src/app/(auth)/**`, `src/app/(app)/**`, `src/components/auth/**`, `src/components/app/**`,
  `public/sample-sales.csv`. May move/split the existing workspace components (Chat, ChartView, DataTable, UploadPanel,
  ConnectorForm, DatasetPanel) but must keep them working.
- **Agent C - Marketing site**: `src/app/(marketing)/**`, `src/components/marketing/**`, `src/app/sitemap.ts`, `src/app/robots.ts`,
  `src/app/not-found.tsx`.
- **Shared foundation (already written by the lead, do not rewrite; small additive fixes allowed if you tell the lead):**
  `src/lib/brand.ts`, `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/auth.tsx`, `src/components/Logo.tsx`,
  `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`.

Rules for everyone: do NOT run `next build` (agents share one `.next` folder - the lead runs the final build); use
`npx tsc --noEmit` from `frontend/` to check types. Do not start long-running servers. Do not ask the user questions - make
sensible decisions and note them in your final report. Do not commit secrets. Keep code simple and consistent with the repo.

## 3. Backend contract (Agent A implements, B/C consume via `src/lib/api.ts`)

Session = JWT in an **httpOnly cookie** named `dl_session` (SameSite=Lax, `Secure` when `APP_ENV=production`, 7 days).
CORS: `allow_credentials=True` with the explicit origin list (never `*`). Add an Origin check on state-changing requests:
if an `Origin` header is present and not in `CORS_ORIGINS` -> 403.

User JSON: `{id, email, name, created_at}`. Emails are lower-cased + unique. Passwords: >= 8 chars, <= 128, at least one letter and
one digit; hashed with argon2 (or bcrypt). Never log or return hashes/tokens.

| Endpoint | Behaviour |
|---|---|
| `POST /api/auth/signup` `{name,email,password}` | 201, sets cookie, returns user. 409 `"An account with this email already exists."` |
| `POST /api/auth/login` `{email,password}` | 200 + cookie + user. 401 `"Incorrect email or password."` (same message for unknown email; constant-ish time) |
| `POST /api/auth/logout` | 204, clears cookie |
| `GET /api/auth/me` | user or 401 |
| `PATCH /api/auth/me` `{name}` | updated user |
| `POST /api/auth/change-password` `{current_password,new_password}` | 204; 400 if current wrong |
| `POST /api/auth/forgot-password` `{email}` | ALWAYS 200 `{message}` (no account enumeration). Creates a single-use token (store only a hash, 1h expiry). No email provider yet: log the reset link at INFO and, ONLY when `APP_ENV=development`, also return `dev_reset_url` in the JSON. Link format: `{FRONTEND_URL}/reset-password?token=...` |
| `POST /api/auth/reset-password` `{token,password}` | 204 and invalidates the token (and logs the user out of nothing else); 400 on bad/expired/used token |
| `DELETE /api/auth/me` `{password}` | 204; deletes the user, all their datasets (rows, parquet, raw files), clears cookie |
| `POST /api/contact` `{name,email,message}` | 201 `{message}`; stored in a `contact_messages` table; rate-limited (5/hour/IP); message <= 5000 chars; no auth |

Rate limits: login 10/min/IP and 5 failures/15min per email (then 429 with Retry-After), signup 5/hour/IP, forgot-password 5/hour/IP.
Config: `SECRET_KEY` (JWT signing; dev default allowed with a startup warning, refuse to start if `APP_ENV=production` and default),
`FRONTEND_URL` (default `http://localhost:3000`), `COOKIE_SECURE` derived from env. Add all to `.env.example`.

**Data isolation**: `DatasetRecord.owner_id` (FK users.id, indexed). Every dataset route, upload, connector import and chat call
requires auth (`401` otherwise) and only sees the caller's datasets (`404` for others' ids - never 403). Chat conversations are keyed
by user as well. `/api/health` stays public. Add a tiny migration step on startup (if the `owner_id` column is missing on an existing
SQLite file, `ALTER TABLE ... ADD COLUMN`; legacy ownerless rows are deleted).

Tests (pytest, no network): signup/login/logout/me, duplicate email, wrong password, lockout, password policy, forgot/reset flow,
cookie flags, Origin check, cross-user isolation on every dataset/chat route, delete-account cascade, contact endpoint. Update the
existing tests/conftest so they authenticate (e.g. a `client` fixture that signs up a user). All 47 existing tests must still pass
(adapted) and the suite must stay offline.

## 4. Frontend contracts

`src/lib/api.ts` already exposes (cookie auth via `credentials: "include"`): `api.me/signup/login/logout/forgotPassword/resetPassword/
updateProfile/changePassword/deleteAccount/contact` plus the existing dataset/chat calls. `useAuth()` from `src/lib/auth.tsx` returns
`{ user, loading, login, signup, logout, refresh, setUser }`. A 401 from any call means "session ended".

**Agent B** deliverables
- `/login`, `/signup` (name, email, password with live requirements hint, terms/privacy consent checkbox linking to `/terms` `/privacy`),
  `/forgot-password` (in dev show the returned `dev_reset_url` as a clickable "Dev only" box), `/reset-password?token=`.
  Shared split-screen `(auth)/layout.tsx` (form left, brand panel with 3 value bullets right; collapses on mobile). Inline field errors,
  disabled+spinner submit, `aria-live` error region, autofocus, correct `autoComplete` attrs, show/hide password toggle.
- Redirect rules: logged-in users visiting auth pages -> `/app`. Unauthenticated users visiting `/app*` -> `/login?next=<path>`.
  After login go to `next` ONLY if it is a same-site relative path (starts with `/`, not `//`, no scheme) else `/app`.
- `(app)/layout.tsx`: guard + app header (Logo -> `/app`, "Docs" link to `/docs`, user menu with name/email, Settings, Log out;
  keyboard accessible). Show a skeleton while `loading`.
- `/app`: today's workspace (move `src/app/page.tsx` logic; already placed at `src/app/(app)/app/page.tsx`). Improve first-run: a welcome
  state with a **"Try with sample data"** button that loads `public/sample-sales.csv` through `api.uploadFile`, plus the existing upload/connect
  tabs. If any API call returns 401, call `refresh()`/redirect to login with a "Your session expired" notice.
- `/app/settings`: profile (edit name, email read-only), change password, "Danger zone" delete account (type-your-password modal), and a
  "Your data" note explaining datasets are private to the account and deleted with it.
- `public/sample-sales.csv`: ~200 rows realistic sales data (order_date, region, product, units, revenue) generated deterministically.

**Agent C** deliverables - see section 5 for content rules. Shared marketing layout: skip-link, sticky `SiteHeader` (Logo, links
Features / How it works / Pricing / Security / Docs, and on the right: if `useAuth().user` then "Open app" else "Log in" + "Get started"),
mobile menu (accessible disclosure), `SiteFooter` (4 link columns, copyright, "Built with care for data people" style line - no fake claims).
Each page exports `metadata` (title/description/openGraph). Respect dark mode (`dark:` classes, system preference), mobile-first, high contrast,
visible focus rings, semantic landmarks, one `<h1>` per page.

## 5. Marketing content rules (accuracy matters - this is a real product)

- **No fabricated social proof**: no customer logos, testimonials, user counts, ratings, or "trusted by". No fake benchmark numbers.
- **No unearned compliance claims**: do NOT claim SOC 2, ISO, HIPAA, GDPR certification, SSO, or on-prem. State plainly what exists.
- Product visuals must be built in HTML/CSS/SVG (no stock photos) and be labelled "Illustrative example" where they show sample data.
- **Pricing**: the product is in **open beta**. Show: *Beta (Free)* - everything included, limits listed honestly (100 MB uploads, rate limits,
  datasets private to your account); *Pro* and *Team* as **planned** tiers (no prices, no checkout) with "Join the waitlist" -> `/contact`.
  A note that billing is not enabled yet.
- **Security page facts** (only these are true today): AI-written Pandas code is validated by an AST allow-list and run in an isolated
  subprocess with a 30 s timeout, restricted built-ins and secrets removed from its environment; database credentials are used for a single
  import and never stored; remote imports allow only read-only single SELECT/WITH statements; each account only sees its own datasets;
  passwords are hashed; sessions use httpOnly cookies; rate limiting; deleting a dataset or account removes its files. **Be upfront about
  limits**: dataset *schema, column names, a few sample values and the aggregated query results* are sent to Google's Gemini API to write
  and explain answers (raw full tables are not sent); no SOC 2/SSO yet; Windows/dev sandbox has no memory cap (do not mention OS - say
  "run in containers with resource limits when self-hosting"). Link to `/privacy`.
- **Privacy/Terms**: reasonable draft templates (data we collect: account info, uploaded datasets, usage logs; processors: Google Gemini;
  retention; deletion; contact). Put a visible banner "Draft - have legal counsel review before launch." Use the contact page for requests.
- **Docs** (`/docs`, single long page with sticky in-page nav on desktop): Getting started, Supported files, Connecting a database
  (Snowflake/Postgres/MySQL fields incl. RDS host example, read-only note), What cleaning does (list exactly: normalize names, trim,
  null tokens, type inference for numbers/booleans/dates, duplicates, fill missing - median/"Unknown", >60% missing columns dropped,
  date parts year/month/quarter/weekday, categorical encoding), Asking good questions (examples), Charts (bar/line/pie/area/scatter; say "yes" or
  "yes as a pie chart"), Limits & troubleshooting (rate limits, 429/503 meanings, slow responses 10-20 s, 100 MB, 1M rows max connector).
- **FAQ** (`/faq`): 10+ honest Q&As using `<details>` accordions (what files, is my data used for training - say we send limited data to
  Gemini per their API terms and do not train our own models; can I delete; accuracy caveats - verify important numbers using
  "How this was computed"; supported databases; pricing; self-hosting; limits).
- Tone: clear, concrete, no hype words ("revolutionary", "AI-powered magic"). Short sentences.

## 6. Done criteria
- `pytest` green; `npx tsc --noEmit` clean; the lead runs `next build` + browser smoke tests at the end.
- Every marketing/auth/app route renders, is responsive at 390 px, works in dark mode, and has no placeholder lorem ipsum.
