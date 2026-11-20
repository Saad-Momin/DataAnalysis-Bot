# 05. Frontend

The website is a Next.js 14 app (App Router) in `frontend/`. It serves both the public marketing site and the signed-in workspace.

Stack: Next.js 14.2, React 18, TypeScript (strict), Tailwind CSS 3, Recharts 2. The only runtime dependencies are `next`, `react`, `react-dom` and `recharts`.

## Route groups

Folders in parentheses group pages that share a layout without changing the web address.

```
src/app/
  layout.tsx                 root: wraps everything in <AuthProvider>
  (marketing)/               public pages with the site header and footer
  (auth)/                    sign-up, login, forgot and reset password
  (app)/                     signed-in area, guarded
    app/page.tsx             the workspace at /app
    app/settings/page.tsx    account settings at /app/settings
  error.tsx, not-found.tsx   friendly error and 404 pages
  sitemap.ts, robots.ts      search engine files
  icon.svg, globals.css
```

## How sign-in works in the browser

- `lib/auth.tsx` provides `AuthProvider` and the `useAuth()` hook: `user`, `loading`, `login`, `signup`, `logout`, `refresh`, `setUser`.
- On first load it calls `GET /auth/me`. While that runs, `loading` is true. A failure of any kind is treated as signed out and does not crash the page.
- `(app)/layout.tsx` is the guard. A signed-out visitor is sent to `/login?next=<page they wanted>`. While loading, it shows a skeleton instead of flashing the login page.
- The sign-in token lives in an httpOnly cookie, so the frontend never sees or stores it. Every API call uses `credentials: "include"`.
- `components/app/SessionWatcher.tsx` wraps `window.fetch` while the app is open. A 401 from any data endpoint (not the `/auth/*` ones) means the session ended, so it re-checks auth and the guard redirects to login with an "expired" notice.
- `components/app/session.ts` records whether a sign-out was deliberate (logout, delete account) or an expiry, so the right message appears.
- `components/auth/safeNext.ts` makes sure the `next` address after login is a same-site path. It rejects `//`, backslashes and control characters, preventing open redirects.

## API client: `lib/api.ts`

- Base address from `NEXT_PUBLIC_API_URL`, default `http://localhost:8000/api`.
- One `request()` helper adds the cookie, a timeout (60 s default; 180 s for uploads and imports; 150 s for chat) and turns failures into an `ApiError` with a readable message and the status code.
- It understands both error shapes the backend returns (a string or a list of field errors).
- `api.*` has one method per endpoint (see [06-api-reference.md](06-api-reference.md)).
- `lib/types.ts` holds the TypeScript shapes that mirror the backend's response models.

## The workspace: `/app`

`app/(app)/app/page.tsx` holds the main screen.

- **Left sidebar:** the user's datasets (name, rows, columns), a "New dataset" button, and a delete button per dataset.
- **Main area, no dataset selected:** a welcome panel with a sample-data button for new users, and two tabs: *Upload a file* and *Connect a database*.
- **Main area, dataset selected:** `DatasetPanel` (summary, column profile, preview, cleaning report) above the `Chat`.
- The last opened dataset id is remembered in `localStorage` (key `dab:lastDataset`) and reopened on return. If storage is blocked, nothing breaks. A 404 clears the memory.

### Components

| Component | Job |
|-----------|-----|
| `UploadPanel` | Drag-and-drop or choose a file; checks the extension (`.csv`, `.xlsx`, `.sql`); optional Excel sheet or SQL table name |
| `ConnectorForm` | Form for Snowflake, PostgreSQL and MySQL. Choose a table or write a read-only query. Credentials go only in the request |
| `DatasetPanel` | Shows rows and columns, the cleaning report, per-column profile and a preview table |
| `DataTable` | Sortable-looking, scrollable table with a "show more" control; used for answers, previews and the chart's table view |
| `Chat` | The conversation. Suggested starter questions built from the dataset's columns; message list; typing indicator; "How this was computed" (shows the code); "Try again" on errors |
| `ChartView` | Draws a chart specification (see below) |
| `app/SampleDataButton` | Fetches `/sample-sales.csv` from `public/` and uploads it |
| `app/UserMenu` | Account menu in the header with settings and sign out |
| `app/SettingsPanels`, `app/DeleteAccountModal` | Profile name, change password, delete account (asks for the password) |
| `auth/*` | `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm`, and shared fields (`TextField`, `PasswordRequirements`, `SubmitButton`, `FormMessage`) |
| `Logo` | The Dataloom mark and name |

### Chat behaviour

- Sending a message adds it to the list and calls `POST /chat` with the dataset id, the text and the conversation id the server gave earlier.
- When the answer offers a chart, buttons appear: *Yes, show chart*, *Bar*, *Line*, *Pie*, *No thanks*. They simply send a message such as "Yes, as a bar chart". Only the latest offer stays clickable.
- Errors become a red message with *Try again*, which resends the same text.
- Each question can take 10 to 20 seconds, and the interface says so while waiting.

### Charts: `ChartView.tsx`

- Takes the spec from the server (`chart_type`, `title`, `x_key`, `y_keys`, labels, `data`).
- Types: bar, line, area, scatter, and pie drawn as a donut. A scatter with a non-numeric x axis falls back to bar.
- Pie charts show at most 8 slices and fold the rest into "Other".
- Every chart has a **Chart / Table** switch so the numbers are readable without the picture.
- Two or more series get a legend. Pie charts always list their slices with percentages.
- Animation is turned off so marks always appear immediately.
- Colours come from `lib/palette.ts` (eight categorical colours in fixed order, one set for light mode and one for dark). The set was checked for colour-blind separation. Colours are assigned by series position and are not cycled; the surface, grid and text colours come from `lib/viz.ts` and follow the system light or dark setting.

## Marketing site

`components/marketing/` holds the building blocks:

| File | Content |
|------|---------|
| `ui.tsx` | Shared pieces: `PageHero`, `Section`, `Badge`, `ButtonLink`, `Check` |
| `SiteHeader.tsx`, `SiteFooter.tsx` | Navigation and footer, with a signed-in-aware call to action |
| `ProductMock.tsx` | Static picture of the product used on the home page |
| `ContactForm.tsx` | Posts to `/contact` |
| `FaqList.tsx`, `faq-data.ts` | The question list, reused on the FAQ and pricing pages |

### Single sources of truth

- `lib/brand.ts`: product name, tagline, description and support email (currently a placeholder, `support@dataloom.example`).
- `lib/pricing.ts`: the three plans, the size table, and the helpers `usd` and `perQuestion`. The pricing page, home page teaser, docs and FAQ read from here, so the numbers cannot disagree. Change prices here only.
- `components/marketing/faq-data.ts`: FAQ text.

### Content rules followed

- No claims the product cannot back up. For example, only `.xlsx` is listed because the backend does not read `.xls`.
- Pages that show the price say that everything is free during the beta.
- The site shows prices and limits only. Profit and cost figures are in the internal PDF, never on the site.

## Styling

- Tailwind utility classes, no component library.
- Dark mode follows the operating system setting (`prefers-color-scheme`).
- Accessibility basics: a skip-to-content link, labelled forms, `aria-live` regions for status messages, table captions and `scope` attributes, and visible focus.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Where the browser sends API calls |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base address for page metadata and the sitemap |

Both are read at build time. Set them before `npm run build` for production.

## Commands

```
cd frontend
npm install
npm run dev       # development server on port 3000
npm run build     # production build (also type-checks)
npm start         # serve the production build
npx tsc --noEmit  # type check only
```

## Gotchas learned while building

- If you rebuild while the dev or production server is running, delete `.next` first and restart. A stale `.next` under a running server produces 500 and 404 errors.
- A file marked `"use client"` cannot export plain constants for server components to import. That is why chart colours live in `lib/palette.ts`, which has no such marker.
- Do not define a component inside another component (it remounts on each keystroke and the field loses focus). The connector form's field component lives outside for this reason.
