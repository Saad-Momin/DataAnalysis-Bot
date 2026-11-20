# 09. Known gaps and roadmap

What exists today is a working product. These are the things it does not do yet, listed so no one assumes otherwise.

## Must do before charging customers

| Gap | Why it matters | Suggested work |
|-----|----------------|----------------|
| Billing | Prices are shown but nothing charges anyone | Add Stripe subscriptions, plans and webhooks |
| Plan limits not enforced | The pricing page promises questions per month, file sizes per plan and dataset counts. Only the 100 MB upload limit and rate limits exist | Store a plan on each user; count questions; enforce file size and dataset count per plan |
| No email sending | Password reset links are not delivered outside development | Add an email provider and send reset emails |
| Legal pages are drafts | Privacy policy and terms are placeholders | Have a lawyer review |
| Placeholder support email | `support@dataloom.example` in `lib/brand.ts` | Replace with a real mailbox |

## Reliability and scale

| Gap | Effect | Suggested work |
|-----|--------|----------------|
| One process only | Rate limits, conversation memory and the dataset cache live in memory. They reset on restart and are not shared across servers | Move to Redis; keep one worker until then |
| In-memory dataset cache holds 8 tables | A few large tables can use a lot of RAM (loading a file uses about 12 times its CSV size at peak) | Lower the cache size, or load on demand only |
| Sandbox has no memory cap on Windows | A heavy question could exhaust memory | Memory limit and no network in a container on Linux |
| SQLite and local files | Fine for one server, not for several | PostgreSQL for metadata, object storage for files |
| Sessions cannot be revoked | A password change does not end other sessions | Add a session version to users and check it |
| No admin screen | Contact messages and users are read from the database | Small admin area or a database tool |

## Measurement

| Gap | Suggested work |
|-----|----------------|
| Gemini token use is not logged | Log input, output and thinking tokens per question to measure the real cost per question (the cost model currently estimates thinking tokens) |
| No usage analytics or error monitoring | Add basic metrics and an error tracker |

## Product ideas not started

- Share a dataset or a chart with teammates
- Save and re-run questions; dashboards
- Scheduled refresh for database imports
- Export results and charts
- Excel `.xls` support (currently `.xlsx` only)
- Teams and roles

## Behaviour to be aware of

- Chart replies are recognised by simple rules. An unusual way of saying yes may be treated as a new question.
- Missing numbers are filled with the median and missing text with "Unknown". This keeps analysis working but can bias results; the cleaning report shows what was filled.
- Only the last three exchanges are used as context for follow-ups.
- Gemini can be temporarily busy; the app retries and then asks the user to try again.
- Live chat against Gemini was not re-run during the last build because of throttling. Offline tests cover the chat logic with a fake AI.
