# 07. Security

## Accounts and sessions

- Passwords are hashed with argon2. Rules: 8-128 characters, at least one letter and one number.
- Login does one hash check even for unknown emails, so response time does not reveal which emails are registered. The error text is the same for a wrong email and a wrong password.
- A successful login sets the `dl_session` cookie: a signed token (HS256) that expires after 7 days. The cookie is `httpOnly` (page scripts cannot read it) and `SameSite=Lax`. In production it also gets the `Secure` flag, so it only travels over HTTPS.
- Logging out clears the cookie. Sessions are stateless, so a stolen token stays valid until it expires. Changing the password does not end other sessions (see known gaps).
- Lockout: 5 failed attempts per email in 15 minutes returns 429. Password confirmations for change-password and delete-account are limited the same way, per user.
- The app refuses to start in production with the default secret key.

## Password reset

- A random token is created and only its SHA-256 hash is stored. It expires in one hour and works once.
- Requesting a new one deletes earlier unused tokens.
- The answer to "forgot password" is identical whether or not the email exists.
- No email is sent yet. In development the link is returned in the response and written to the log. In any other environment it is not shown anywhere, so resets will not work until an email service is added.

## Cross-site request protection

- CORS allows only the listed origins, never `*`, and allows credentials.
- A middleware refuses POST, PATCH and DELETE requests whose `Origin` header is not in that list.
- The `next` address after login must be a same-site path (`safeNext`).

## Data isolation

- Every dataset has an `owner_id`. Every read, preview, chat and delete checks it. Another user's dataset looks like a missing one (404).
- Chat conversations are keyed by user and dataset, so a conversation id cannot be used across users.
- Deleting an account removes the user's datasets and files.

## The code sandbox

The AI writes Pandas code, so the code is treated as untrusted. There are four layers.

**1. Static check (before anything runs).** The code is parsed into a syntax tree and rejected if it:

- is empty, longer than 6,000 characters, or does not assign to a variable called `result`
- contains imports, function or class definitions, `with`, `try`, `raise`, `del`, `global`, `yield`, `await`
- uses names such as `open`, `exec`, `eval`, `compile`, `getattr`, `setattr`, `globals`, `locals`, `vars`, `input`, `type`, `dir`, `object`, `super`, or anything starting with an underscore
- uses `pd` or `np` as a plain value (only `pd.<name>` and `np.<name>` from a fixed allow-list are permitted, so paths such as `pd.io...` are closed)
- calls blocked methods such as `eval`, `query`, `format`, `plot`, `style`, `load`, `open`, `save`, any `read_*`, or any `to_*` other than the conversion helpers

**2. Isolated process.** The code runs in a separate Python started with `-I` (isolated mode: no user site folder, no environment-controlled paths). The parent removes any environment variable whose name contains KEY, TOKEN, SECRET, PASSWORD or CREDENTIAL, so the Gemini key is not available to it.

**3. Restricted built-ins.** Only a short list of safe functions is available (`len`, `range`, `min`, `max`, `sum`, `abs`, `round`, `sorted`, `list`, `dict`, `set`, `tuple`, `str`, `int`, `float`, `bool`, `enumerate`, `zip`, `map`, `filter`, `any`, `all`, `isinstance`, `reversed`, `divmod`, `pow`, `slice`, `frozenset`). The code is re-checked inside the child.

**4. Limits.** 30-second wall-clock timeout, at most 4 children at once (others wait up to 20 seconds, then get a "busy" message), result size capped (50 rows for answers, 200 for charts), crash or out-of-memory reported as a clean error.

The AI prompts add a fifth, softer layer: they say sample values in the data description are data and must never be treated as instructions (a defence against prompt injection through cell contents).

**Not covered:** the sandbox has no memory cap on Windows. On Linux, add a memory limit to the child (cgroup or `resource`) and ideally run it in a container with no network.

## Database imports

- Credentials are used for one fetch and never stored or logged (`SecretStr`).
- Only a single `SELECT` or `WITH` statement is accepted; write keywords are rejected.
- The database session is set read-only where supported. Connection timeouts apply.
- Table and schema names must be plain identifiers.
- Error messages are trimmed so driver output with connection details is not passed through.

## File handling

- Allowed types: `.csv`, `.xlsx`, `.sql`.
- Files are saved under a random id, never the client's file name.
- Size is checked while streaming; the partial file is deleted on any failure.
- `.sql` scripts run in a throw-away in-memory SQLite database with `ATTACH` blocked and a 30-second limit.

## Rate limits (per client IP unless noted)

| Action | Limit |
|--------|-------|
| Sign-up | 5 per hour |
| Login | 10 per minute, plus 5 failures per email per 15 minutes |
| Forgot password | 5 per hour |
| Contact form | 5 per hour |
| Upload | 20 per minute |
| Database import | 10 per minute |
| Chat | 30 per minute |

Limits are held in the server's memory, so they reset on restart and are not shared across several servers.

## Secrets and configuration

- `backend/.env` holds the Gemini key and the signing secret. It is excluded from version control. `.env.example` has no real values.
- If a key was ever pasted somewhere shared, rotate it.
- Generate the signing secret with: `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- Validation errors never echo submitted values, and the code never logs passwords or tokens.

## Production checklist

1. Set `APP_ENV=production`, a long random `SECRET_KEY`, the real `FRONTEND_URL` and `CORS_ORIGINS`.
2. Serve both sites over HTTPS (required for the secure cookie).
3. Add an email service for password resets.
4. Add a memory cap and network block around the sandbox.
5. Move rate limits and conversation state to a shared store (such as Redis) if running more than one server.
6. Have a lawyer review the privacy policy and terms, which are drafts.
