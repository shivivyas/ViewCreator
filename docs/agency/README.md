# Agency Knowledge Base — ViewCreator

This is the agency's persistent memory for this project. Every agent reads this on start to understand context and writes back on completion.

## Project

**ViewCreator** — An AI-powered marketing content operating system that enables marketers, founders, agencies, and creators to go from **Inspiration → Branded Creative → Publication** in minutes.

## Client

Personal project (the user `sid6641@gmail.com`)

## Current Phase

**Phase**: 2 — Active Development (continuous loop)
**Status**: 🟢 Active
See `phase.md` for details.

## Key Files

| File | Purpose |
|------|---------|
| `phase.md` | Current phase, step, status (overwritten on transitions) |
| `decisions.md` | Key decisions with rationale (append-only) |
| `session-log.md` | Chronological session journal (append-only) |
| `project-learnings.md` | Project-specific patterns and gotchas (append-only) |
| `state/current-task.md` | Active task state for resume (overwritten per session) |
| `state/context.md` | Current session context/metadata (overwritten per session) |

## Existing Project Documentation

| File | What it contains |
|------|-----------------|
| `PRD.md` | Full product requirements document |
| `IMPLEMENTATION_SUMMARY.md` | API enhancement implementation notes |
| `UI_STYLE_DESIGN_SYSTEM.md` | Tailwind + shadcn/ui design system |
| `ENHANCED_FEATURES_QUICK_REFERENCE.md` | Feature reference for AI generation |
| `API_ENHANCEMENTS_GUIDE.md` | API usage guide |
| `AGENTS.md` | Project-level agent definitions & conventions |

## Project Structure

```
viewcreator-ui/          → Next.js 16 frontend + API routes (port 3000)
viewcreator-api/         → Express standalone API server (port 3001)
viewcreator-database/    → PostgreSQL database package
viewcreator-test-canary/ → Playwright E2E test canary
```

## Quick Stats

- Sessions: 1
- Decisions: 3
- Project Learnings: 0

---

*Created by `agency-import` on 2026-07-05*
