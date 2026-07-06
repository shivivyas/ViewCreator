## 2026-07-06: Behavioral Specification via Lavish + Clerk UI Sign-In Testing

### What Happened
Designed a full behavioral test specification for the credit payment system using the **lavish-axi** interactive HTML artifact workflow, then solidified the tests and discovered key patterns for testing Clerk-authenticated apps with Playwright.

### Root Cause
The credit payment system had 24 ambiguous behavioral decisions (gate timing, modal text, badge behavior, race conditions) that needed the captain's explicit sign-off before tests could be written. Existing tests were also stale (subscription model → credit model) and couldn't test signed-in behavior because Clerk's `useUser()` requires real auth state.

### Learnings (6)

#### 1. Lavish Artifact Workflow for Spec Battles
**What**: Used `lavish-axi` to create an interactive HTML artifact (`behavioral-test-spec.html`) with 24 decision cards across 4 personas + edge cases. The captain picked answers using radio buttons, queued them, and sent feedback.
**Lesson**: Lavish is the right tool for pre-implementation spec battles. The workflow: (a) create `.lavish/<name>.html` with decision cards, (b) `npx -y lavish-axi .lavish/<name>.html` to open, (c) `npx -y lavish-axi poll .lavish/<name>.html` to long-poll for feedback, (d) `--agent-reply "..."` to respond in-editor, (e) iterate until all decisions are locked. The input playbook (radio buttons + queue + submit) is the right pattern for collecting structured decisions.
**Pattern**: For any multi-option design decision involving the captain: use Lavish with the input playbook pattern. Never list options in chat — the artifact makes tradeoffs visible and lets the captain annotate specific choices.
**Applied To**: `.lavish/behavioral-test-spec.html` — The artifact itself is the template

#### 2. Clerk Testing: Use `@clerk/testing` UI Sign-In, Not Cookie Injection
**What**: The first approach injected Clerk session cookies (`__session`, `__clerk_db_jwt`, `__client_uat`) directly into the browser context. While this passed the server-side `auth.protect()` middleware, the **client-side** Clerk React SDK (`useUser().isSignedIn`) often stayed `null` because Clerk's hydration depends on more than just cookie values (it validates the session asynchronously with Clerk's backend).
**Lesson**: Cookie injection is unreliable for client-side Clerk state. The correct approach is:
1. Create user via Clerk Backend API: `POST https://api.clerk.com/v1/users`
2. Call `setupClerkTestingToken({ page })` to bypass bot detection
3. Navigate to the app
4. Sign in via `clerk.signIn({ page, emailAddress })` — this uses a ticket-based token internally
5. Wait via `clerk.loaded({ page })` for full hydration

**Pattern**: Clerk Playwright test helper template — see `tests/clerk-auth.spec.ts` in the canary for the `signInUser()` function.
**Applied To**: `viewcreator-test-canary/tests/clerk-auth.spec.ts` — The `signInUser()` helper
**Trigger**: Q3, Q16, Q17 tests kept failing because `useUser().isSignedIn` was always null after cookie injection

#### 3. Codebase Exploration Must Precede Spec Decisions
**What**: Several Lavish decisions didn't match the actual app behavior. Q2 (guest sees disabled button) assumed guests reach the generate page, but `proxy.ts` uses `auth.protect()` which redirects guests before they even load the page. Q4 (modal text "Buy Credits") assumed different modal text than what actually renders. Q10/Q7 (cost indicators, grayed options) assumed quality toggles exist that don't.
**Lesson**: Spec battles must be preceded by codebase exploration. When the captain says "battle me on behaviors," first explore the actual codebase to find existing patterns, then frame the decisions around what needs to CHANGE vs what already exists.
**Pattern**: Before a Lavish spec session: (a) run the app and inspect the actual UI, (b) read the relevant component source files, (c) identify which decisions are "already implemented" vs "need change" vs "new feature." Present only the open questions.
**Applied To**: This learning entry (systemic — applies to all future spec sessions)

#### 4. Hybrid Test Architecture for Clerk Apps — Final Form
**What**: The test suite evolved through three iterations: (a) all mock API, (b) mock API + cookie injection, (c) mock API + `@clerk/testing` UI sign-in. The final architecture has three tiers.
**Lesson**: The definitive architecture:
- **Tier 1 — Contract tests** (`--project=chromium`): Mock `page.route` for `/api/payments/*`. Test public page rendering, API shapes. No Clerk needed. Fast (~2s/test).
- **Tier 2 — Clerk-authenticated UI tests** (`--project=chromium-auth`): Use `@clerk/testing` to sign in via Clerk UI. Test signed-in behaviors (credit gate, header badge, pricing CTA). Slow (~10s/test due to Clerk UI flow).
- **Tier 3 — API-only tests**: Direct HTTP calls with admin keys. Test backend logic (deduction, idempotency, auth guards). Fast (~0.5s/test).

**Pattern**: Never mix tiers. Contract tests use `describe("... — Contract Tests (mock API)")`. Clerk tests use `describe("Clerk: ...")`. API tests use direct `request` fixtures.
**Applied To**: `viewcreator-test-canary/playwright.config.ts` — Two project definitions
**Trigger**: 19/26 tests failed because they couldn't test Clerk-gated UI behavior

#### 5. Mock Balance Must Be Set Up BEFORE Navigation for CreditBadge Rendering
**What**: The `CreditBadge` component fetches `/api/payments/balance` on mount. If the mock route is set up AFTER the page navigates to `/pricing`, the first fetch goes to the real Express server (returns 401), `paymentStatus` stays `null`, and the CreditBadge never renders. The 10-second polling interval would eventually pick up the mock, but tests timed out before then.
**Lesson**: `page.route()` handlers must be registered BEFORE the navigation that triggers the fetch. The flow is: set up mocks → `page.goto()` → wait for data. Never navigate first and mock after.
**Pattern**: In test helpers that sign in AND set up mocks, the final step is always `page.goto("/pricing")` AFTER all mocks are registered. This ensures the first fetch hits the mock, not the real API.
**Applied To**: `tests/clerk-auth.spec.ts` — `signInUser()` helper, step 8

#### 6. Pricing Page Has Different CTAs for Signed-In vs Guest
**What**: The pricing page (`pricing/page.tsx`) already checks `isSignedIn` to render different CTAs: guests see `<SignUpButton>` wrapped "Sign up to buy", signed-in users see a direct "Buy 100 Credits" button. But no current balance is shown for signed-in users (Q11 target: "Buy more credits" + balance).
**Lesson**: The billing UI already has conditional rendering based on auth state. Adding balance display requires: (a) fetching balance in the pricing page component, (b) rendering "Buy more credits — You have X credits" instead of just "Buy 100 Credits".
**Applied To**: This learning entry (pattern for future pricing page work)

### Applied To
- `docs/learnings/README.md` — Updated index
- `docs/learnings/2026-07-06-behavioral-spec-via-lavish-and-clerk-testing.md` — This entry
- `docs/agency/project-learnings.md` — Updated with behavioral spec via Lavish pattern
- `docs/agency/session-log.md` — Updated through conversation summary

### Trigger
Captain requested end-to-end behavioral testing of the credit payment system. The 17 behavioral questions revealed gaps between assumed behavior and actual implementation, and the Clerk auth testing challenge required three iterations to solve.
