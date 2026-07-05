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
