# ViewCreator Test Canary — Behavioral Test Plan

> Generated from grilling session (2026-07-06).
> Covers all behavioral decisions for a comprehensive E2E test suite.

---

## Phase 1: Templates Domain

### Templates — Guest Experience

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| T1.1 | Guest browses all templates on `/templates` | Guest | Template list |
| T1.2 | Guest sees upload button in header/nav | Guest | None |
| T1.3 | Guest clicks upload → Clerk sign-up modal opens | Guest | None |
| T1.4 | Guest clicks upvote → Clerk sign-up modal opens | Guest | None |
| T1.5 | Guest clicks "Use Template" → Clerk sign-up modal opens | Guest | None |
| T1.6 | Guest opens template detail modal — full preview visible | Guest | Template list |
| T1.7 | Guest sees Generate button in detail modal but gated | Guest | Template list |
| T1.8 | Guest clicks Generate in modal → Clerk sign-up modal opens | Guest | Template list |

### Templates — Signed-in Experience

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| T2.1 | Signed-in user browses templates | Auth | Template list |
| T2.2 | Signed-in user opens detail modal | Auth | Template list |
| T2.3 | Signed-in user generates from modal — full flow | Auth | Template list, Balance, Generate API |
| T2.4 | Signed-in user uploads template (free, no credit cost) | Auth | Balance, Upload API |
| T2.5 | Upload flow: guest clicks upload → sign-up → auto-resumes with staged file | Auth-after-guest | Upload API |
| T2.6 | User votes (upvote) — toggle behavior | Auth | Vote API |
| T2.7 | User votes (downvote) — remove upvote | Auth | Vote API |
| T2.8 | User deletes own template | Auth | Delete API |
| T2.9 | User cannot delete another user's template | Auth | Template list (no delete button) |
| T2.10 | Search filters templates by title/description/tags | Guest | Template list |
| T2.11 | Category filter works | Guest | Template list |
| T2.12 | Sort options (newest, popular, A–Z, Z–A) | Guest | Template list |
| T2.13 | URL reflects search/filter/sort state (`?category=&sort=&q=`) | Guest | Template list |
| T2.14 | Empty state: no templates match search | Guest | Empty list |
| T2.15 | Empty state: no templates at all | Guest | Empty list |
| T2.16 | Invalid template ID in URL shows error state | Auth | Template list (empty) |

### Templates — Upload Details

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| T3.1 | Upload image template (PNG, JPEG) | Auth | Upload API |
| T3.2 | Upload video template (MP4) | Auth | Upload API |
| T3.3 | Upload with title, description, tags | Auth | Upload API |
| T3.4 | Upload as public vs private | Auth | Upload API |
| T3.5 | Upload file size limit — image under 10MB accepted | Auth | Upload API |
| T3.6 | Upload file size limit — image over 10MB rejected | Auth | Upload API |
| T3.7 | Upload file size limit — video under 100MB accepted | Auth | Upload API |
| T3.8 | Upload file size limit — video over 100MB rejected | Auth | Upload API |
| T3.9 | Drag-and-drop file upload | Auth | Upload API |
| T3.10 | Cancel upload mid-process | Auth | Upload API |

---

## Phase 2: Generate Domain

### Generate Page — Gate & Access

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G1.1 | Guest lands on `/generate` — sees form UI | Guest | Plans, Templates |
| G1.2 | Guest sees disabled "Sign in to generate" button | Guest | Plans, Templates |
| G1.3 | Guest clicks disabled button → Clerk sign-up modal | Guest | Plans, Templates |
| G1.4 | Signed-in user with 0 credits sees form — gate triggers on Generate | Auth | Balance (0), Plans |
| G1.5 | Signed-in user with 0 credits — credit gate modal shows purchase CTA | Auth | Balance (0), Plans |
| G1.6 | Signed-in user with sufficient credits — Generate proceeds | Auth | Balance (10), Plans |

### Generate Page — Form & Prefill

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G2.1 | `/generate?templateId=X` pre-fills form from template config | Auth | Templates, Template detail |
| G2.2 | Invalid template ID shows friendly error | Auth | Templates (empty) |
| G2.3 | Form validation: empty prompt disables Generate | Auth | None |
| G2.4 | Form validation: prompt with whitespace only | Auth | None |
| G2.5 | Media type toggle: Image → Video switches form fields | Auth | Plans |
| G2.6 | Number of images selector (2 / 4) | Auth | Plans |
| G2.7 | Aspect ratio selector (1:1, 4:5, 9:16, 16:9) | Auth | Plans |

### Generate Page — Credit Deduction

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G3.1 | Generating 2 images deducts 2 credits | Auth | Balance (10), Generate API |
| G3.2 | Generating 4 images deducts 4 credits | Auth | Balance (10), Generate API |
| G3.3 | Generating with exact balance (e.g., 2 credits for 2 images) succeeds | Auth | Balance (2), Generate API |
| G3.4 | Generating with 1 credit for 2 images shows insufficient credit gate | Auth | Balance (1), Plans |
| G3.5 | Generate button disables during generation | Auth | Balance (10), Slow Generate API |
| G3.6 | Header badge updates after generation (API response sync) | Auth | Balance (10), Generate API (returns balance_after) |

### Generate Page — Results

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G4.1 | Generation completes — results appear in history panel | Auth | Balance, Generate API |
| G4.2 | User can download individual generated image | Auth | Balance, Generate API |
| G4.3 | User clicks "Continue to Workspace" → navigates to `/generate/edit` | Auth | Balance, Generate API |
| G4.4 | User can regenerate with modified prompt | Auth | Balance, Generate API |
| G4.5 | Generation fails — error displayed with retry button | Auth | Balance, Generate API (fail) |

### Generate Page — Video

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G5.1 | Generate video with prompt + settings | Auth | Balance, Video Generate API |
| G5.2 | Video generation deducts correct credits | Auth | Balance, Video Generate API |
| G5.3 | Video results display in history panel | Auth | Balance, Video Generate API |

### Generate Page — Post-Purchase Resume

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| G6.1 | User hits credit gate mid-generation → buys → auto-resumes generation | Auth | Balance (0→updated), Plans, Generate API |
| G6.2 | `pending_generate` sessionStorage preserved across payment redirect | Auth | Balance, Plans, Generate API |
| G6.3 | Post-purchase: brief "Credits confirmed! Resuming..." overlay shown | Auth | Balance, Plans, Generate API |

---

## Phase 3: Edit / Workspace Domain

### Edit Page — `/generate/edit`

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| E1.1 | Edit page loads with generated images from Redux state | Auth | Image URLs |
| E1.2 | User can re-prompt and re-generate from an existing image | Auth | Balance, Generate API |
| E1.3 | User can download individual image | Auth | None |
| E1.4 | User can download all images (export) | Auth | None |
| E1.5 | User sees complete change history on the right panel | Auth | History data |
| E1.6 | Color adjustments on image | Auth | Edit API |
| E1.7 | Crop adjustments on image | Auth | Edit API |
| E1.8 | Guest redirected to sign-up on `/generate/edit` | Guest | None |

---

## Phase 4: Navigation & Auth Domain

### Navigation

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| N1.1 | Guest nav: Logo, Templates, Features, How It Works, Platforms, Pricing, Sign In, Sign Up | Guest | None |
| N1.2 | Signed-in nav: Logo, Templates, AI Studio, My Creations, Pricing, Credit Badge, UserButton | Auth | Balance |
| N1.3 | Guest signs in from `/generate` → returns to `/generate` with state preserved | Auth-after-guest | Plans, Templates |
| N1.4 | Guest signs in from `/templates` → returns to `/templates` | Auth-after-guest | Templates |
| N1.5 | Deep link: `/generate?templateId=X` works correctly | Auth | Templates |

### Auth Guards

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| A1.1 | `/generate/edit` redirects guest to sign-up | Guest | None |
| A1.2 | Generate API call without auth returns 401 | Guest | None |
| A1.3 | Balance API call without auth returns 401 | Guest | None |
| A1.4 | Upload API call without auth returns 401 | Guest | None |
| A1.5 | Vote API call without auth returns 401 | Guest | None |

### Deep Linking Post-Auth

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| A2.1 | Clerk sign-up from `/generate` → redirect back to `/generate` with form state | Auth-after-guest | Plans, Templates |
| A2.2 | Clerk sign-up from `/templates` → redirect back to `/templates` | Auth-after-guest | Templates |
| A2.3 | Clerk sign-up from `/pricing` → redirect back to `/pricing` | Auth-after-guest | Plans |

---

## Phase 5: Pricing & Purchase Domain

### Pricing Page

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| P1.1 | Guest sees pricing page with credit packs | Guest | Plans |
| P1.2 | Guest sees "Sign up to buy" button on credit cards | Guest | Plans |
| P1.3 | Guest sees "Get started" CTA in footer | Guest | Plans |
| P1.4 | Signed-in user sees "Buy more credits" on credit cards | Auth | Plans, Balance |
| P1.5 | Signed-in user sees current balance on pricing page | Auth | Plans, Balance |
| P1.6 | Pricing FAQ section renders | Guest | Plans |
| P1.7 | Pricing bottom CTA section renders | Guest | Plans |

### Purchase Flow

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| P2.1 | User clicks Buy → Dodo checkout opens in same tab | Auth | Plans |
| P2.2 | Post-purchase redirect returns to origin page (pricing/generate/templates) | Auth | Plans, Confirm Purchase |
| P2.3 | Post-purchase: credits granted and header badge updates | Auth | Plans, Confirm Purchase, Balance |
| P2.4 | Purchase from credit gate mid-generation → returns to `/generate` with auto-resume | Auth | Plans, Confirm Purchase, Balance, Generate API |
| P2.5 | Purchase from credit gate on templates → returns to `/templates` with upload state restored | Auth | Plans, Confirm Purchase, Balance |
| P2.6 | Idempotency: same idempotency key doesn't double-grant | Auth | Plans, Confirm Purchase |
| P2.7 | Cancel purchase (no checkout=success) → no credits granted | Auth | Plans |

---

## Phase 6: Error & Edge Case Domain

### API Errors

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| X1.1 | API server down — global banner "Backend unavailable — retrying..." | Guest | None (API unreachable) |
| X1.2 | Templates API fails — inline error in templates section + retry | Guest | Templates API (500) |
| X1.3 | Generation API fails — inline error + retry button | Auth | Balance, Generate API (500) |
| X1.4 | Balance API fails — credit badge shows fallback | Auth | Balance API (500) |
| X1.5 | Plans API fails — pricing page shows fallback | Guest | Plans API (500) |

### Timeouts & Rate Limiting

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| X2.1 | Generation takes >45s — timeout warning shown with "keep waiting or cancel" | Auth | Balance, Slow Generate API |
| X2.2 | User cancels timed-out generation — button re-enabled, no credits lost | Auth | Balance, Slow Generate API |
| X2.3 | Rapid Generate clicks — button disabled after first click (debounce) | Auth | Balance, Generate API |
| X2.4 | API returns 429 — user sees rate limit message | Auth | Balance, Generate API (429) |
| X2.5 | Network offline mid-generation — error shown with retry | Auth | Balance, Generate API (offline) |

### Rate Limiting (UI + API)

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| X3.1 | Generate button disables temporarily after submission | Auth | Balance, Generate API |
| X3.2 | API returns 429 on rapid requests | Auth | Balance (success), Generate API (429) |

---

## Phase 7: Header & Credit Badge Domain

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| H1.1 | Guest sees Sign In / Sign Up buttons in header | Guest | None |
| H1.2 | Guest does NOT see credit badge in header | Guest | None |
| H1.3 | Signed-in user with 0 credits sees "0 credits — Buy" badge | Auth | Balance (0) |
| H1.4 | Signed-in user with 100 credits sees "100 credits" badge | Auth | Balance (100) |
| H1.5 | Credit badge updates after generation (from API response) | Auth | Balance (10), Generate API |
| H1.6 | Credit badge updates after purchase (from API response) | Auth | Balance (0→100) |
| H1.7 | Credit badge click → navigates to `/pricing` | Auth | Balance (100) |

---

## Phase 8: Admin & API Domain

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| M1.1 | Admin payment status endpoint returns healthy | Admin key | None |
| M1.2 | Admin payment status returns 401 without key | None | None |
| M1.3 | Admin payment status returns 401 with wrong key | Wrong key | None |
| M1.4 | Admin webhook events endpoint returns paginated results | Admin key | None |
| M1.5 | Public plans endpoint returns credit packs + subscriptions | None | None |
| M1.6 | Public health endpoint returns healthy | None | None |
| M1.7 | Deduct endpoint: standard deduction (1 credit) | Admin key | None |
| M1.8 | Deduct endpoint: premium deduction (2 credits) | Admin key | None |
| M1.9 | Deduct endpoint: insufficient credits → 402 | Admin key | None |
| M1.10 | Deduct endpoint: 0 credits → 400 | Admin key | None |
| M1.11 | Deduct endpoint: negative credits → 400 | Admin key | None |
| M1.12 | Deduct endpoint: idempotency (same key same result) | Admin key | None |
| M1.13 | Deduct endpoint: no admin key → 401 | None | None |

---

## Phase 9: Mobile / Responsive Domain

| Test | Description | Auth | Mocks |
|------|-------------|------|-------|
| R1.1 | Templates page renders on mobile viewport (375px) | Guest | Template list |
| R1.2 | Generate page renders on mobile viewport | Guest | Plans, Templates |
| R1.3 | Pricing page renders on mobile viewport | Guest | Plans |
| R1.4 | Header nav collapses to hamburger menu on mobile | Guest | None |
| R1.5 | History panel stacks below form on mobile | Guest | None |

---

## Implementation Notes

### Mock Strategy
- **Guest tests** (`chromium` project): Use `setupPersona(page, "GUEST")` from helpers
- **Signed-in tests** (`chromium-auth` project): Use Clerk Backend API to create real users + `clerk.signIn()`
- **API contract tests**: Direct `request` calls to Express API (no UI needed)
- **Error/edge case tests**: Use `page.route()` to intercept and return error responses

### File Organization
```
tests/
  templates.spec.ts         → Phase 1 (T1.1–T3.10)
  generate-gate.spec.ts     → Phase 2 gates (G1.1–G1.6) — extend existing
  generate-form.spec.ts     → Phase 2 form (G2.1–G2.7)
  generate-credits.spec.ts  → Phase 2 credits (G3.1–G3.6)
  generate-results.spec.ts  → Phase 2 results (G4.1–G4.5, G5.1–G5.3, G6.1–G6.3)
  edit-workspace.spec.ts    → Phase 3 (E1.1–E1.8)
  navigation.spec.ts        → Phase 4 (N1.1–N1.5, A1.1–A2.3)
  pricing.spec.ts           → Phase 5 pricing (P1.1–P1.7) — extend existing
  purchase-flow.spec.ts     → Phase 5 purchase (P2.1–P2.7)
  errors-edge-cases.spec.ts → Phase 6 (X1.1–X3.2)
  header-badge.spec.ts      → Phase 7 (H1.1–H1.7) — extend existing
  admin-api.spec.ts         → Phase 8 (M1.1–M1.13) — extend existing
  mobile.spec.ts            → Phase 9 (R1.1–R1.5)
```

### Priority

| Priority | Phase | Rationale |
|----------|-------|-----------|
| **P0** | Phase 2 (Generate) | Core product loop — highest user impact |
| **P0** | Phase 1 (Templates) | Second core loop — template → generate |
| **P1** | Phase 5 (Pricing/Purchase) | Revenue-critical |
| **P1** | Phase 4 (Navigation/Auth) | Affects all flows |
| **P2** | Phase 3 (Edit) | Important but refinement-focused |
| **P2** | Phase 6 (Errors) | Edge cases — important for robustness |
| **P3** | Phase 7 (Header) | Mostly covered in existing tests |
| **P3** | Phase 8 (Admin/API) | Already mostly covered |
| **P3** | Phase 9 (Mobile) | Polish — lowest priority |

### Reminders (Future Sessions)
1. **R1** — History panel pagination for 500+ creations (Q8d)
2. **R2** — Marketing-focused landing page brainstorm
3. **R3** — Remove Premium quality tier from codebase (only Standard, 1 credit/image)
4. **R4** — Remove upload credit cost (upload should be free)
