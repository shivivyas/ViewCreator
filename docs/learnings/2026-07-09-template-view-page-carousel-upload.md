## 2026-07-08/09: Production Security Hardening + Template View Overhaul

### What Happened
A multi-sprint push across 7 commits covering:

**Production Security (Commits ed21525, b351dee, 42de565, 51cfd89):**
- Full production readiness audit — 12 critical/moderate gaps found
- CORS restricted from wildcard to `CORS_ORIGIN` env var
- `ADMIN_API_KEY` removed dev fallback (`dev-admin-key`) — fails closed
- Webhook endpoint (`/api/payments/webhook-event`) secured with `requireInternalAuth` + `x-internal-key` header
- `.env.example` created as single source of truth (20 vars)
- Root `.env` consolidation (was split across 3 packages)
- PostgreSQL SSL made env-driven (`DB_SSL`), removed Supabase hostname sniffing
- Production launch roadmap with 6-phase plan documented
- AWS hosting decision (Lightsail → ECS Fargate)
- Template modal crop persistence fix (was missing Redux history entry)

**Template View Overhaul (Commit aecc525):**
- Full-page `/templates/[id]` route replacing modal overlay
- Instagram-style carousel with dots, arrows, numbered badges
- Mini carousel on template grid cards with arrows and dots
- Multi-image upload (single, carousel set, video)
- Guest auth gates for Generate Content and Upload Template

### Root Causes (of issues found)
1. **Card arrows not working** — The "Use Template" overlay (`absolute inset-0 z-20 opacity-0`) intercepts all pointer events even when invisible. Fix: `pointer-events-none group-hover:pointer-events-auto`.
2. **Upload 404 error** — Clerk's `requireAuth()` returns 302 redirect (not 401). `fetch` follows the redirect and gets a 404. Fix: client-side guest gate before API call.
3. **`ChevronLeft is not defined`** — Turbopack HMR fails to properly bundle newly added imports. Fix: full page reload.
4. **Template modal crop not persisting** — `handleOpenWorkspace` never created a Redux history entry or set `activeHistoryItemId`. Fix: build history item + dispatch + set activeHistoryItemId.
5. **CORS all origins** — `cors()` with no config allows any site to call the API.
6. **Webhook endpoint unauthenticated** — No auth on `/api/payments/webhook-event`.

### Lessons

#### Security
- `cors()` with no config is an instant vulnerability — always restrict to known origins
- `ADMIN_API_KEY` must never have a dev fallback — fail closed, not open
- Webhook endpoints need internal auth even if Svix-verified (defense in depth)
- `.env.example` is a living document — update it when adding env vars
- PostgreSQL SSL should be env-driven, not auto-detected from hostname

#### Frontend Architecture
- `absolute inset-0` overlays with `z-20` block clicks even when `opacity-0` — always add `pointer-events-none` when invisible
- Clerk's `requireAuth()` redirects (302) not 401 — always gate auth-sensitive actions client-side
- Turbopack HMR can fail on new imports — a hard refresh is the reliable fix
- Store additional template image URLs in `config.asset_urls` to avoid schema migrations
- `setPreviewImages((prev) => [...prev, ...newImages])` functional updater ensures correct state when appending in async file readers
- Template detail to editor flow needs activeHistoryItemId set for crop persistence

#### Environment Management
- Single root `.env` prevents drift between packages
- `dotenv.config({ path: '../.env' })` from each package loads the root
- Both `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are needed (Clerk Express middleware)
- Restart servers after any `.env` change

### Applied To
- `viewcreator-api/src/index.ts` — CORS restricted
- `viewcreator-api/src/middleware/validate.ts` — Updated upload schema
- `viewcreator-api/src/routes/templates.ts` — Added GET /:id, multi-image upload
- `viewcreator-api/src/routes/payments.ts` — ADMIN_API_KEY fails closed + requireInternalAuth
- `viewcreator-api/src/routes/admin.ts` — ADMIN_API_KEY fails closed
- `viewcreator-ui/src/app/templates/page.tsx` — pointer-events-none, mini carousel, guest gate
- `viewcreator-ui/src/components/templates/template-view-page.tsx` — NEW full page
- `viewcreator-ui/src/app/templates/[id]/page.tsx` — NEW route
- `viewcreator-ui/src/services/api/template-service.ts` — getTemplate(), multi-image params
- `viewcreator-ui/src/types/index.ts` — asset_urls in config
- `viewcreator-ui/next.config.ts` — S3 remote image patterns
- `.env.example` — 20 vars documented
- `docs/operations/dev-to-prod-playbook.md` — NEW
- `docs/operations/production-launch-roadmap.md` — NEW

### Trigger
Production readiness audit + user feedback on template UX.
