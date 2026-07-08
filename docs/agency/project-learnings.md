# Project Learnings

<!-- Append-only. Project-specific patterns, gotchas, and insights. -->

<!-- Template:
## {{DATE}}: {{Pattern Name}}

### Context
{{When does this pattern apply}}

### The Pattern
{{What to do — or not do}}

### Evidence
{{Why this pattern holds — 1-2 sentences}}

### Applied By
{{Which agent/skill should follow this}}
-->

## 2026-07-05: FirstMate agent orchestration integration

### Context
When working in this project, the Director role is merged with the First Mate role. FirstMate is vendored at `firstmate/`.

### The Pattern
- Run `bin/fm-session-start.sh` at session start instead of manually reading KB files
- Spawn crewmates via `bin/fm-spawn.sh` into isolated worktrees
- Keep the watcher armed via `bin/fm-watch-arm.sh` while tasks are in flight
- Crewmate briefs live at `data/<id>/brief.md`
- Status reporting goes to `data/<id>.status` (sparse — only actionable changes)
- Ship tasks: branch `fm/<id>`, commit, push, PR
- Scout tasks: write report to `data/<id>/report.md`, no PR

### Evidence
Firstmate is configured and vendored; the agent definition files have all been updated to follow this pattern.

### Applied By
Director (First Mate), all specialist crewmate agents

---

## 2026-07-08: Production security — fail closed, not open

### Context
Three security gaps found during production audit: CORS all origins, ADMIN_API_KEY with dev fallback, webhook endpoint with no auth.

### The Pattern
- `cors()` with no config is an instant vulnerability — always specify `origin`
- Admin keys must never have a dev fallback — `fails closed` means `process.env.KEY` must be set or the operation errors
- Every endpoint needs auth — even webhooks with signature verification get internal-key auth as defense in depth
- Single root `.env` prevents config drift between packages

### Evidence
All three issues were found during audit and fixed in commit `ed21525`.

### Applied By
Reviewer (production audit), Builder (when adding new endpoints or env vars)

## 2026-07-09: Overlays with `absolute inset-0` must use `pointer-events-none`

### Context
Positioned overlays (`absolute inset-0 z-20`) that fade in on hover block clicks to interactive elements beneath them even when invisible (`opacity-0`). This broke the template card's carousel arrows and delete buttons.

### The Pattern
Always add `pointer-events-none` by default and `group-hover:pointer-events-auto` to overlays that are conditionally visible:

```tsx
<div className="absolute inset-0 ... opacity-0 group-hover:opacity-100 
                pointer-events-none group-hover:pointer-events-auto">
```

Also guard card-level `onClick` handlers with `if (e.target.closest('button')) return;` so button clicks never trigger card navigation.

### Evidence
The "Use Template" overlay on every template card was intercepting all clicks. Adding `pointer-events-none` fixed the carousel arrows, delete buttons, and save buttons.

### Applied By
Builder (when creating hover overlays), Reviewer (when reviewing z-index stacking)

## 2026-07-09: Guest gates before API calls, not after

### Context
Clerk's `requireAuth()` middleware returns a 302 redirect (not 401) for unauthenticated requests. The frontend `fetch` follows the redirect and gets a 404, causing a confusing "Not Found" error.

### The Pattern
Check `isSignedIn` on the client side before making authenticated API calls. Use `openSignUp()` from `useClerk()` to show the sign-up modal:

```tsx
if (!isSignedIn) {
  openSignUp();
  return;
}
```

### Evidence
Upload and Generate Content were returning "Not Found" for guests. Adding the guest gate showed a clean sign-up modal instead.

### Applied By
Builder (when adding any auth-gated action)

## 2026-07-09: Multi-image upload via `config.asset_urls`

### Context
Templates needed multiple images (carousel) without a database schema migration.

### The Pattern
Store the primary URL in `s3_link` and additional URLs in `config.asset_urls` (JSON array in the existing JSONB column). The frontend reads `[s3_link, ...(config?.asset_urls || [])]` for the carousel.

### Evidence
Works with existing single-image templates (no asset_urls = no carousel). No migration needed. Backward compatible.

### Applied By
API (upload route), Frontend (carousel component)

## 2026-07-06: Hybrid test architecture (mock API + real Clerk auth)

### Context
When testing credit payment flows, mock-based persona tests can't simulate Clerk's auth state. The generate page and header use `useUser()` from Clerk which requires a real JWT.

### The Pattern
**Tier 1 — Mock API contract tests**: Test API endpoints and UI rendering with mocked data. Labeled `— Contract Tests (mock API)` in their describe blocks. Good for: pricing page content, header rendering, API response shapes, 404/401 handling.

**Tier 2 — Clerk-authenticated tests**: Use Clerk Backend API to create real test users and inject session cookies. Labeled `clerk-auth.spec.ts`. Good for: signed-in UI behavior, generate page gate, credit badge visibility.

**Tier 3 — API-only tests**: Direct HTTP calls with admin keys. No Clerk needed. Good for: credit deduction, admin endpoints, idempotency.

### Evidence
- Cookie injection (`addCookies`) passes server-side `auth.protect()` but often leaves client-side `useUser().isSignedIn` as `null` because Clerk's React SDK validates sessions asynchronously
- The reliable approach uses `@clerk/testing`: `setupClerkTestingToken({ page })` → navigate → `clerk.signIn({ page, emailAddress })` → `clerk.loaded({ page })`
- Clerk Backend API (`POST /v1/users`) creates the test user, and `clerk.signIn()` handles the UI sign-in flow using a ticket-based token, properly hydrating Clerk's React state
- Contract tests (`--project=chromium`) use `page.route()` mocks and don't need Clerk — fast (~2s/test)
- Clerk-auth tests (`--project=chromium-auth`) use `@clerk/testing` — slower (~10s/test due to Clerk UI flow) but fully reliable for signed-in state
- `setupClerkTestingToken` intercepts Clerk Frontend API requests to bypass bot detection — required for headless
- The `+clerk_test` email pattern with OTP code `424242` bypasses email verification in dev mode

### Applied By
Director (First Mate), Builder (test creation), Reviewer (test verification)

---

## 2026-07-07: Gemini model discovery & structured output from vision

### Context
When calling Gemini for image→text analysis, model names are version-specific and thinking tokens can silently truncate output.

### The Pattern
1. Always list available models via `GET /v1beta/models?key=...` REST API before guessing names
2. Disable `thinkingConfig` for structured JSON output tasks: `{ includeThoughts: false }`
3. Set `maxOutputTokens` generously (8192) even for small expected output — thinking tokens consume budget silently
4. Keep analysis endpoints separate from generation — no credit system involvement

### Evidence
Multiple 404 errors on `gemini-3.1-flash`, `gemini-2.0-flash`, `gemini-2.5-flash`. `gemini-3.5-flash` works. With thinking enabled, 984 output tokens were consumed by thoughts → only 19 chars of actual JSON returned.

### Applied By
Builder (any agent creating Gemini-powered features)

## 2026-07-06: Documentation structure & agent context optimization

### Context
Project documentation was fragmented across 8 locations — root-level .md files, docs/knowledge-base/, docs/architecture/, docs/agency/, docs/learnings/. Agents either loaded 11 mandated files every session or had to guess which file held what information. 4 separate files described the project architecture with varying degrees of accuracy.

### The Pattern
- **docs/README.md** is the master index — one file that maps everything. Every agent session starts by reading `docs/README.md` to find relevant docs.
- **Root stays minimal**: only `AGENTS.md`, `CLAUDE.md`, `README.md`. Everything else lives under `docs/`.
- **Organize by domain**: `product/` (PRD), `ui/` (design system), `development/` (guides), `architecture/` (overview), `archive/` (stale).
- **Hot zone preserved**: `docs/agency/` and `docs/learnings/` are the session-read hot zone — never reorganized without captain approval.
- **Merge, don't split**: when overlapping files cover the same topic, merge them into one canonical reference. Two Gemini docs → one `gemini-features.md`.
- **Archive, don't delete**: stale files go to `docs/archive/` with a note explaining why.

### Evidence
Root went from 7 .md files to 3. All cross-references verified. No information lost — 2 files merged, 1 archived, remainder organized.

### Applied By
Director (First Mate). All agents should use `docs/README.md` as their first read when exploring documentation.

---

## 2026-07-06: Credit deduction endpoint design

### Context
The `POST /api/payments/deduct` endpoint follows the existing admin auth pattern.

### The Pattern
- Auth: `x-admin-key` header (same pattern as admin routes)
- Target user: `x-user-id` header
- Body: `{ amount, description?, idempotency_key? }`
- Returns 200: `{ deducted, balance_after }`
- Returns 402: `{ error: "Insufficient credits", credits_balance: N, required: amount }`
- Idempotency: stored in `webhook_events` table using `idempotency_key` as `event_id`
- Atomic: `SELECT ... FOR UPDATE` row-level locking prevents race conditions
- Audit trail: `credit_transactions` row with type `'usage'` and negative amount

### Evidence
All 8 deduction tests pass. The `deductWithIdempotency()` method in `credit-repository.ts` reuses the existing `webhook_events` table for idempotency tracking.

### Applied By
Builder (implementation), Reviewer (test verification)

---

## 2026-07-08: Codebase simplification patterns

### Context
When refactoring a Next.js + Express monorepo for clarity and maintainability.

### The Pattern
1. **Dead re-export wrappers** — If a file only re-exports from another file with an alias, delete it and update the 1-2 imports. The "backward compat" argument doesn't hold in a codebase that has no consuming packages.
2. **Rate limiter factory** — When rate limiters differ only in `max` and label, extract a factory. This eliminates 100% of the copy-paste.
3. **Dynamic import → static** — Dynamic `await import()` inside route handlers is a premature optimization for server code. The module is loaded at startup anyway. Use top-level static imports instead.
4. **History item factory** — When the same 15-field object is constructed in 4 places with slight variations, extract a factory. The factory encodes the variation logic once.
5. **Post-purchase flow → hook** — Any useEffect that orchestrates a multi-step flow (detect URL param → API call → poll → callback) should be a hook. The page provides callbacks for the parts that touch its state; the hook owns the orchestration.
6. **Dependency bucket audit** — Every time you add a dependency, ask: "Is this imported at runtime?" If yes, it goes in `dependencies`, not `devDependencies`. Run `grep -r "from 'package'" src/` to verify.
7. **Workspace protocol** — In npm workspaces, use `file:` protocol for local deps, not `workspace:*`. The latter is pnpm-specific and causes issues with corporate proxy tools.

### Evidence
All 7 patterns applied in one session. Both packages type-check clean. 21% reduction in the largest page file.

### Applied By
Builder (any agent refactoring the codebase)

---

## 2026-07-06: Behavioral spec battles via Lavish interactive artifacts

### Context
When the captain needs to make behavioral decisions before implementation (gate timing, modal text, badge behavior, race condition handling), listing options in chat is inefficient and doesn't allow per-card annotation.

### The Pattern
Use lavish-axi to create an interactive HTML artifact with decision cards:
1. Create `.lavish/<topic>.html` with persona cards + decision forms (radio buttons/checkboxes/text inputs)
2. Follow the **input playbook**: native controls for reversible selection, per-question Queue buttons that call `window.lavish.queuePrompt()`, and a final Send button that batches all queued answers
3. Run `npx -y lavish-axi .lavish/<topic>.html` to open
4. Run `npx -y lavish-axi poll .lavish/<topic>.html` to long-poll for feedback
5. Apply decisions to the artifact, then poll with `--agent-reply "summary"` to show results in-editor
6. Iterate until all decisions are locked, then translate into tests

### Evidence
24 behavioral questions across 4 personas + edge cases were resolved in 3 poll cycles. The artifact is reusable as a test reference document. Pattern from the `lavish` skill's input playbook.

### Applied By
Director, Builder (test implementation), Communicator (spec documentation)  
Relevant skill: `.agents/skills/lavish/SKILL.md`
