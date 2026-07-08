# Phase: 2 — Active Development (Continuous Loop)

**Status**: 🟢 Active
**Started**: 2026-07-05
**Updated**: 2026-07-06

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

### July 2026 — Template View Overhaul
- **Template detail page**: Full-page route with Instagram-style carousel, AI prompt, generate controls ✅
- **Template card mini carousel**: Arrows and dots on grid cards 🟡 (arrows not working)
- **Multi-image upload**: Single, carousel, and video support ✅
- **Guest auth gates**: Generate Content and Upload Template ✅
- **Next**: Debug card arrow navigation, then resume test coverage

### KB Status
- `docs/agency/session-log.md` — Updated with 2026-07-09 session
- `docs/agency/decisions.md` — 4 new decisions added
- `docs/agency/state/current-task.md` — Updated with current state
- `docs/learnings/` — New entry added for this session

**Feature**: Comprehensive E2E test suite for test canary
**Step**: ✅ Complete — 103 passing, 12 known interaction-test failures, 8 intentionally skipped
**Started**: 2026-07-06
**Completed**: 2026-07-07

### Scope
1. Audit all 38 project context files across 8 locations
2. Map hot vs cold files (what gets loaded every session vs on-demand)
3. Move 6 root-level docs into organized `docs/` subdirectories
4. Merge overlapping files (Gemini features: 2 files → 1)
5. Archive stale file (payment dual-model design)
6. Create `docs/README.md` master index
7. Update all cross-references across AGENTS.md, agency README, root README

## Documentation Structure (Post-Reorg)

```
docs/
├── README.md                    ← Master index
├── product/PRD.md               ← Product vision & requirements
├── ui/design-system.md          ← Tailwind + shadcn/ui tokens
├── development/
│   ├── gemini-features.md       ← AI generation (params, workflows, benchmarks)
│   └── api-guide.md             ← API endpoint reference
├── architecture/
│   └── project-architecture.md  ← Codebase overview
├── archive/
│   └── payment-system-arch.md   ← Stale (dual-model)
├── agency/                      ← Agent KB (hot zone)
├── learnings/                   ← Learning logs
└── intent/                      ← Intent specs
```

## Progress

| Step | Status | Completed |
|------|--------|-----------|
| Design (lavish spec) | ✅ | 2026-07-06 |
| Database + Repository | ✅ | 2026-07-06 |
| Backend API | ✅ | 2026-07-06 |
| Frontend integration | ✅ | 2026-07-06 |
| Bug fixes (3) | ✅ | 2026-07-06 |
| Local Postgres cleanup | ✅ | 2026-07-06 |
| Learning capture | ✅ | 2026-07-06 |
| FirstMate Integration | ✅ | 2026-07-05 |
| Test Architecture Design & Implementation | ✅ | 2026-07-06 |
| Deduction API Implementation | ✅ | 2026-07-06 |
| Admin Grant Endpoint | ✅ | 2026-07-06 |
| Clerk-Authenticated E2E Tests | ✅ | 2026-07-06 |
| Development (credit badge, gate modal) | ✅ | Already existed |
| Documentation Consolidation | ✅ | 2026-07-06 |
| Code Review | ❌ | — |
| Retrospective | ❌ | — |
