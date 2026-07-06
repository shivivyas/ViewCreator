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
