# Learning Log

This directory is the organization's collective memory. Every bug fixed, design decision made, and performance insight gained is captured here so we never pay tuition twice.

## How It Works

1. **Every investigation or implementation** ends with a learning capture step (see Director constitution — Learning Capture Protocol)
2. **The Director classifies** each learning as Systemic, Pattern, or One-off
3. **Systemic learnings** update the relevant `.agent.md` or `.instructions.md` file directly
4. **Patterns** get logged here with a timestamp for future reference
5. **One-offs** get logged briefly, no systemic change

## Entry Template

```markdown
## YYYY-MM-DD: [Short Title]

### What Happened
[One paragraph description of the bug, issue, or discovery]

### Root Cause
[One-line summary]

### Lesson
[The pattern or rule that applies broadly]

### Applied To
[Which file(s) were updated — agent definitions, instructions, conventions. Or "None — logged for awareness"]

### Trigger
[What symptom led to this discovery, so future agents know when to apply this lesson]
```

## Index

| Date | Title | Type | Applied To |
|------|-------|------|------------|
| 2026-07-04 | Dodo Payments Integration — Full Payment System | Systemic + Pattern | Multiple files (see learning doc) |
| 2026-07-04 | Agent Organization Foundation | Systemic | Director constitution, agent files |
| 2026-07-06 | Behavioral Spec via Lavish + Clerk Testing | Systemic + Pattern | Test files, Lavish artifact, KB |
| 2026-07-07 | Gemini Template Analysis — model selection & thinking tokens | Pattern | `analyze.ts` |
| 2026-07-09 | State Ownership Leftovers After Refactor | Systemic | `page.tsx`, `history-panel.tsx` |
