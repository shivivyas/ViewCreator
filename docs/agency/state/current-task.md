# Current Task

**Agent**: Director (First Mate)
**Status**: ✅ Complete — Payment system E2E tested and deduction API implemented

## What Was Done

### Test Infrastructure
- 34 E2E tests across 7 spec files — all passing
- Hybrid architecture: mock API contract tests + real Clerk-authenticated tests
- Clerk Backend API integration for real session injection
- Two-project Playwright config: `chromium` (contract) + `chromium-auth` (auth tests)

### API Implementation
- `POST /api/payments/deduct` — Atomic deduction with idempotency key, admin auth
- `POST /api/admin/payments/grant-credits` — Admin credit grant for testing
- `deductWithIdempotency()` — Repository method using row-level locking
- `deduct_credits()` — PostgreSQL function in schema.sql

### UI (already existed)
- CreditBadge inline component in site-header.tsx
- Credit gate modal in generate/page.tsx
- Dodo checkout flow with post-purchase credit grant

## Next

Ready for next feature request or backlog item.
