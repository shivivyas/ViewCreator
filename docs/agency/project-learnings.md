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

## 2026-07-06: Hybrid test architecture (mock API + real Clerk auth)

### Context
When testing credit payment flows, mock-based persona tests can't simulate Clerk's auth state. The generate page and header use `useUser()` from Clerk which requires a real JWT.

### The Pattern
**Tier 1 — Mock API contract tests**: Test API endpoints and UI rendering with mocked data. Labeled `— Contract Tests (mock API)` in their describe blocks. Good for: pricing page content, header rendering, API response shapes, 404/401 handling.

**Tier 2 — Clerk-authenticated tests**: Use Clerk Backend API to create real test users and inject session cookies. Labeled `clerk-auth.spec.ts`. Good for: signed-in UI behavior, generate page gate, credit badge visibility.

**Tier 3 — API-only tests**: Direct HTTP calls with admin keys. No Clerk needed. Good for: credit deduction, admin endpoints, idempotency.

### Evidence
- Clerk's UI sign-up modal requires trusted browser events — doesn't work in headless Playwright
- Clerk Backend API (`POST /v1/users`, `POST /v1/sessions`, `POST /v1/sessions/:id/tokens`) creates real sessions
- Session cookies (`__session`, `__clerk_db_jwt`, `__client_uat`) make `useUser()` return real signed-in state
- The `+clerk_test` email pattern with OTP code `424242` bypasses email verification in dev mode

### Applied By
Director (First Mate), Builder (test creation), Reviewer (test verification)

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
