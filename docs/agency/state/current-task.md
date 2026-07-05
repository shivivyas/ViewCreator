# Current Task

**Agent**: Builder
**Skill**: N/A — full feature implementation
**Started**: 2026-07-05
**Step Detail**: Implement pure credit payment system — single product "100 credits for $9". Strip subscriptions, wire credit purchase flow, add generate gate with modal, add header credit badge, update seed data.

## Scope (from requirements alignment)

1. Strip Monthly + Annual subscription plans from seed data
2. Update seed script with Dodo product ID `pdt_0NiWo2CjaeJBzhplGXxWT`
3. Add credit balance badge to site header (becomes "Buy Credits" at 0)
4. Add "insufficient credits" modal on generate page with inline Dodo checkout
5. Wire Dodo webhook → credit grant flow (already partially exists)
6. Ensure idempotent generation + atomic credit deduction (already exists)
7. Update pricing page for single product
8. Guest gate on generate page (Clerk modal → check credits → generate)

## See decisions.md for full rationale

- <!-- Things that need answers before continuing -->

## Next Micro-Step

<!-- The very next thing to do when resuming -->
