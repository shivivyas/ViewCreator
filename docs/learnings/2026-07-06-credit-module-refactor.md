## 2026-07-06 — Credit Module Refactor & Template Upload Credit Gate

### What was done
- Created `viewcreator-shared` package with `CREDIT_COSTS` constants, calculation helpers (`calculateGenerationCost`, `calculateVideoCost`, `calculateTemplateUploadCost`), and shared types.
- Extracted credit business logic from middleware into `viewcreator-api/src/services/credit-service.ts` (`checkCredits`, `deductCredits`).
- Made `viewcreator-api/src/middleware/credit-guard.ts` a thin re-export wrapper.
- Added credit check + deduction to the `POST /api/templates/upload` endpoint (costs 1 credit).
- Updated `viewcreator-ui/src/app/generate/page.tsx` to use shared calculator instead of inline math.
- Added full credit gate modal to the template upload flow with purchase buttons, sessionStorage resume, and post-purchase redirect handling.

### Key architectural decisions
1. **Check → Operate → Deduct** pattern for all credit-gated operations.
2. **Shared package** (`viewcreator-shared`) as the single source of truth for credit costs — no more inline `1 * Math.min(...)` in UI code.
3. **Workspace dependency declarations** — both API and UI explicitly depend on `viewcreator-shared`.
4. **Atomic deduction** via `CreditRepository.checkAndDeductAtomic` with row-level locking prevents race conditions.
5. **Subscription bypass** — users with active subscriptions skip all credit checks/deductions.
6. **SessionStorage resume** — upload form state saved before Dodo redirect, auto-restored on return.

### Files created
- viewcreator-shared/ (6 files)
- viewcreator-api/src/services/credit-service.ts

### Files modified
- package.json (added workspace)
- viewcreator-api/src/middleware/credit-guard.ts (thin wrapper)
- viewcreator-api/src/index.ts (3 endpoints updated)
- viewcreator-ui/src/app/generate/page.tsx (shared calculator)
- viewcreator-ui/src/app/templates/page.tsx (credit gate + purchase flow)
- viewcreator-api/package.json, viewcreator-ui/package.json (workspace deps)

### Open concerns (pre-existing)
- No compensation if deduction fails after successful operation (race window is tiny with atomic deduct).
- No test coverage for new template upload credit gate.
- Template upload counts against credits but doesn't use Gemini API — strictly operational cost.
