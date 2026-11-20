# 04. Database and storage

Dataloom stores things in three places. Knowing which is which makes backups, deletion and scaling much easier.

| Place | Holds | Format |
|-------|-------|--------|
| `backend/data/metadata.db` | Accounts, reset tokens, contact messages, dataset records | SQLite |
| `backend/data/uploads/` | The original file a user uploaded | `<dataset id>.csv`, `.xlsx` or `.sql` |
| `backend/data/cache/` | The cleaned, analysis-ready data | `<dataset id>.parquet` |

Database imports (Snowflake, PostgreSQL, MySQL) have no original file, only a Parquet file.

The database location can be changed with `DATABASE_URL`. The code accepts any SQLAlchemy URL, and the SQLite-only connection option is applied only for SQLite. See the note on PostgreSQL in [09-known-gaps.md](09-known-gaps.md).

## Tables

Defined in `backend/app/db/database.py`. Tables are created automatically at startup.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | string(32), primary key | Random hex |
| `email` | string(320), unique, indexed | Stored lower-case |
| `name` | string(100) | Display name |
| `password_hash` | string(255) | argon2 hash, never the password |
| `created_at` | datetime | UTC |

### `password_reset_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer, primary key | Auto |
| `user_id` | string(32), foreign key to `users.id`, indexed | |
| `token_hash` | string(64), unique, indexed | SHA-256 of the token. The token itself is never stored |
| `expires_at` | datetime | Created plus one hour |
| `used_at` | datetime, nullable | Set when used. A used token cannot be used again |
| `created_at` | datetime | |

Requesting a new reset deletes the user's earlier unused tokens.

### `contact_messages`

| Column | Type |
|--------|------|
| `id` | integer, primary key |
| `name` | string(100) |
| `email` | string(320) |
| `message` | text (up to 5,000 characters accepted by the API) |
| `created_at` | datetime |

There is no screen to read these yet. Query the table directly, for example: `SELECT name, email, message, created_at FROM contact_messages ORDER BY created_at DESC;`

### `datasets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | string(32), primary key | Random hex, also the file name stem |
| `name` | string(255) | File name without extension, or the connector name |
| `source` | string(255) | `file:<original name>`, `snowflake:<account>/<db>`, or `postgres:<host>/<db>` |
| `rows` | integer | Row count after cleaning |
| `n_columns` | integer | Column count after cleaning |
| `created_at` | datetime | |
| `owner_id` | string(32), foreign key to `users.id`, indexed | Every dataset has an owner |
| `meta_json` | text | JSON, see below |

`meta_json` holds:

```json
{
  "profile": [ {"name": "...", "dtype": "...", "null_count": 0, "unique_count": 0, "sample": []} ],
  "cleaning_report": { "rows_before": 0, "rows_after": 0, "duplicates_removed": 0,
                       "inferred_types": {}, "dropped_columns_mostly_missing": [],
                       "missing_filled": {} },
  "feature_report": { "date_features": {}, "categorical_columns": {} },
  "raw_file": "path of the uploaded original, or null"
}
```

## Relationships

```
users 1 --- * datasets
users 1 --- * password_reset_tokens
contact_messages   (standalone, no user link)
```

## Startup migration

`_migrate_legacy()` runs at every start. Early versions had no accounts. If it finds a `datasets` table without `owner_id`, it adds the column and index, then deletes every dataset with no owner, together with its files. This means pre-account test data is removed. If a file is locked or already gone, startup continues.

## Dataset lifecycle

1. **Created** by upload or import: original file saved (uploads only), Parquet written, record inserted, table placed in the in-memory cache.
2. **Used** by chat: the sandbox child process reads the Parquet file directly. The parent process keeps up to 8 tables in memory for previews and descriptions, dropping the least recently used.
3. **Deleted** by the user, or when the account is deleted: the record, the Parquet file, the original upload, the in-memory copy and any chat history for it are all removed. Missing or locked files do not block the deletion.

## Ownership rule

Every read goes through `get_record(dataset_id, owner_id)`. If the dataset belongs to someone else it behaves exactly as if it does not exist (404), so a user cannot even confirm that another user's id exists. `test_isolation.py` checks this for listing, reading, previewing, chatting and deleting.

## Account deletion

`DELETE /api/auth/me` (with the password) removes in this order: all of the user's datasets and files, their chat conversations, their reset tokens, then the user row. The cookie is cleared.

## Backups and growth

- Back up the whole `backend/data/` folder together. The database and the files refer to each other by id.
- Disk use per dataset is about 1.2 times the original file size (original plus Parquet).
- For several servers or heavy use, move metadata to PostgreSQL and files to object storage (see [09-known-gaps.md](09-known-gaps.md)).
