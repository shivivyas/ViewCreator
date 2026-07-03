## 2026-07-04: Agent Organization Foundation

### What Happened
Designed and implemented a two-tier AI agent organization: Director-level constitution (user-level, always-on) + 5 cognitive-mode specialist agents (Analyst, Architect, Builder, Reviewer, Communicator) + ViewCreator project-level amendments in AGENTS.md. Also added a Continuous Learning system to encode every lesson back into the agent definitions.

### Root Cause
No formal structure existed for guiding AI behavior. Every session started from zero context — no culture, no delegation rules, no project awareness. This led to inconsistent behavior, missed learnings, and re-explaining preferences every session.

### Lesson
Agent customization files (`.agent.md`, `.instructions.md`) are the right mechanism for shaping AI behavior. A flat org with crisp cognitive-mode boundaries (not domain boundaries) is the right structure for a solo full-stack developer. Learning capture must be built into every agent's workflow — it can't be an afterthought.

### Applied To
- `director.instructions.md` — Added principle #8 (Continuous Learning) + Learning Capture Protocol section
- All 5 `*.agent.md` files — Added "Capture the learning" step to each approach
- `AGENTS.md` — Added ViewCreator project constitution
- `.github/copilot-instructions.md` — Simplified to reference AGENTS.md
- `docs/learnings/README.md` — Created learning log infrastructure
- `docs/intent/ai-agent-organization.md` — Created intent spec

### Trigger
User explicitly asked for a system where every bug fix and discovery improves the organization permanently.
