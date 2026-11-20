# 11. Glossary

| Term | Meaning |
|------|---------|
| API | The backend's set of web addresses the website calls |
| App Router | Next.js way of building pages from folders |
| AST | Abstract syntax tree; the parsed shape of code, used to check it before running |
| argon2 | A password hashing method designed to be slow for attackers |
| Cache (Parquet) | The cleaned copy of a dataset in `data/cache/` |
| Categorical column | A text column with few distinct values, stored compactly |
| Cleaning report | The list of changes made while cleaning a dataset |
| Conversation | Short-term memory of the last few questions and answers for one user and dataset |
| Connector | Code that imports data from Snowflake, PostgreSQL or MySQL |
| CORS | Browser rule about which websites may call the API; configured with an allow-list |
| CSRF | An attack where another website makes the browser send a request with the user's cookie; blocked by the origin check |
| DataFrame | Pandas' table object |
| Dataset | One uploaded or imported table, owned by one user |
| Dataloom | The product name (in `lib/brand.ts`) |
| Gemini | Google's AI model that writes the analysis code and summaries |
| httpOnly cookie | A cookie that page scripts cannot read |
| JWT | A signed token; here it carries the user id and an expiry |
| LRU | Least recently used; the rule for which cached tables to drop first |
| Pandas | Python library for working with tables |
| Parquet | A compact, fast file format for tables |
| Pending visualization | The chart offer waiting for the user's yes or no |
| Profile | Per-column summary: type, empty count, distinct count, sample values |
| Prompt injection | Text inside data that tries to give the AI instructions; the prompts tell the AI to ignore it |
| Rate limit | A cap on how many requests a client may make in a time window |
| Sandbox | The locked-down child process that runs AI-written code |
| SQLAlchemy | Python library for talking to databases |
| SQLite | A small database stored in one file |
| Thinking tokens | Hidden reasoning text the AI model generates, billed as output |
| Token | A small piece of text counted for AI billing |
| Tailwind | Utility-class CSS framework |
| Recharts | React charting library |
