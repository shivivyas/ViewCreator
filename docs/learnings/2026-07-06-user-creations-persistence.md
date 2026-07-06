## 2026-07-06: User Creations Persistence — S3 Fallback, Schema Pitfalls, Config Cleanup

### What Happened
Designed and implemented a database-backed user creations persistence layer so generated images and videos survive login/logout. Three bugs were encountered and fixed during implementation: an `s3Urls.length > 0` guard that silently skipped DB writes when S3 wasn't configured, a `VARCHAR(1024)` column that rejected base64 data URIs, and a `dotenv` loading order that could pick up a local Postgres URL instead of the Supabase URL.

### Root Cause
Three independent bugs:
1. **Guard clause** (`if (s3Urls.length > 0)`) prevented creation records from being saved when S3 uploads failed — which was always, since `AWS_S3_BUCKET` was empty.
2. **Column type** `VARCHAR(1024)` on `thumbnail_url` was too short for base64 data URIs (can be 50k+ chars).
3. **dotenv loading order** in `db.ts` loaded parent `.env` (with local Postgres URL) before the package `.env` (with Supabase URL), and since `dotenv.config()` doesn't override by default, the wrong database was connected.

### Learnings (4)

#### 1. Data URI Fallback Pattern for S3-Dependent Persistence
**What**: When storing generated media, always save the creation record regardless of whether S3 upload succeeds. Use data URIs as a fallback — they work in `<img>` tags and survive page loads, just at higher storage cost. The pattern: `const urlsForDb = s3Urls.length > 0 ? s3Urls : imageUrls;` then always call `CreationRepository.create()`.
**Lesson**: Never gate a DB write behind an external service call that can fail. The generation credits are already deducted — failing to persist the creation is a data loss bug, not a graceful degradation. Best-effort external calls with reliable DB fallback.
**Trigger**: Any endpoint that generates media and stores it. Apply the same pattern to videos, edited images, etc.

#### 2. `VARCHAR(n)` Rejects Base64 Data URIs
**What**: PostgreSQL's `VARCHAR(1024)` throws `value too long for type character varying(1024)` (code `22001`) when inserting a base64 data URI. A single 1K webp image as a data URI is typically 50k–200k characters.
**Lesson**: Any column that might hold a data URI must be `TEXT`, not `VARCHAR(n)`. This applies to `thumbnail_url`, `s3_urls` (stored as JSONB but individual values are fine), and any future column storing image references that could be data URIs.
**Trigger**: If the error `value too long for type character varying(1024)` appears, the column type needs to be changed to `TEXT` and the migration re-run.

#### 3. `dotenv.config()` Default Does Not Override Existing Variables
**What**: `dotenv.config()` without `{ override: true }` silently skips env vars that are already set. When loading multiple `.env` files, the **first** file sets the variable, and subsequent files cannot change it. This means package-level `.env` files won't override root-level `.env` files if loaded in the wrong order.
**Lesson**: When building a monorepo with per-package `.env` files, either (a) load the package-level `.env` first, parent/root `.env` second, or (b) use `{ override: true }` on the package-level load, or (c) prefer a single `DATABASE_URL` env var with no fallback defaults. Option (c) is simplest — remove all fallback defaults and fail fast if `DATABASE_URL` is missing, so the connection is always explicit.
**Trigger**: If the API connects to a different database than expected, check `dotenv.config()` call order and whether `override` is needed.

#### 4. Migration Wipes Data — Seed Must Follow
**What**: The `schema.sql` file uses `DROP TABLE IF EXISTS ... CASCADE` on every table before recreating it. This means every migration run wipes all data, requiring a seed to follow. This is by design (schema.sql is the source of truth), but it's easy to forget the seed step.
**Lesson**: Always document in the migration script or README that `db:seed` must be run after `db:migrate`. Consider making `db:migrate` automatically call `db:seed` via a `postmigrate` script, or splitting idempotent `CREATE TABLE IF NOT EXISTS` additions (like `user_creations`) into separate migration files that don't drop existing data.
**One-off**: The data-loss cost of re-seeding is low (demo users + templates + plans), so this is acceptable. If production data existed, this pattern would be catastrophic.

#### 5. Node-Postgres IPv6 `EHOSTUNREACH` with Supabase
**What**: Intermittent `EHOSTUNREACH` errors when connecting to Supabase from macOS. Node's DNS resolves Supabase's hostname to both IPv4 and IPv6 addresses. The IPv6 route sometimes fails (`read EHOSTUNREACH`), causing pool connections to error out. The pool recovers on retry, but each failure logs a noisy error and delays a request.
**Lesson**: Add `family: 4` to the `PoolConfig` to force the `pg` driver to connect via IPv4 only. This is a well-known macOS + Supabase issue and the fix is one line. The error signature is `connect EHOSTUNREACH <ipv6-address>:5432` or `read EHOSTUNREACH` on idle clients.
**Trigger**: If `EHOSTUNREACH` errors appear in logs with an IPv6 address (`2406:...`), add `family: 4` to the pool config.

### Applied To
- `viewcreator-api/src/index.ts` — Removed `s3Urls.length > 0` guard, added data URI fallback + ✅/⚠️/❌ logging
- `viewcreator-database/src/schema.sql` — Changed `thumbnail_url` from `VARCHAR(1024)` to `TEXT`
- `viewcreator-database/src/db.ts` — Simplified to only use `DATABASE_URL`, removed local Postgres fallback defaults, added `family: 4` for IPv4-only Supabase connections
- `.env` (root) — Removed local Postgres `DATABASE_URL`, `DB_USER`, `DB_PASSWORD`, etc.
