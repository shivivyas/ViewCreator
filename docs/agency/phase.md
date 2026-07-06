# Phase: 2 — Active Development (Continuous Loop)

**Status**: 🟢 Active
**Started**: 2026-07-05
**Updated**: 2026-07-05

## Work Model

This project operates as a continuous loop per feature:

```
Feature Request
  → Requirements (grill/spec)
  → Development (Builder)
  → Code Review (Reviewer)
  → Retrospective & Learning Capture
  → Loop to next feature
```

## FirstMate Integration

This project now uses **firstmate** (vendored at `firstmate/`) as the agent orchestration layer.
- The Director role is merged with the First Mate role
- All specialist agents are firstmate crewmates
- Session start: `bin/fm-session-start.sh`
- Crewmate dispatch: `bin/fm-spawn.sh`
- Supervision: `bin/fm-watch-arm.sh`
- See `AGENTS.md` (project root) for full integration guide

## Current Feature Cycle

**Feature**: Pure credit payment system — single product "100 credits for $9"
**Step**: Requirements complete. Ready for Development.
**Started**: 2026-07-05

### Scope
1. Strip subscription plans from seed data (Monthly + Annual removed)
2. Update seed script with Dodo product ID (`pdt_0NiWo2CjaeJBzhplGXxWT`)
3. Add credit balance badge to site header
4. Add "insufficient credits" modal on generate page with inline Dodo checkout
5. Wire payment webhook → credit grant flow
6. Ensure idempotent generation + atomic credit deduction
7. Update pricing page for single product
8. Guest gate on generate page (Clerk modal → check credits → generate)

## Progress

| Step | Status | Completed |
|------|--------|-----------|
| Requirements (grill) | ✅ | 2026-07-05 |
| FirstMate Integration | ✅ | 2026-07-05 |
| Test Architecture Design & Implementation | ✅ | 2026-07-06 |
| Deduction API Implementation | ✅ | 2026-07-06 |
| Admin Grant Endpoint | ✅ | 2026-07-06 |
| Clerk-Authenticated E2E Tests | ✅ | 2026-07-06 |
| Development (credit badge, gate modal) | ✅ | Already existed |
| Code Review | ❌ | — |
| Retrospective | ❌ | — |
