# AI Agent Organization — Intent Spec

## Outcome
A two-tier AI agent organization: Director at user-level, 5 specialist agents at user-level, project amendments in `AGENTS.md`.

## User
Sid (solo developer, full-stack, product-oriented). The Director shapes how Copilot behaves across all projects. The 5 agents are invoked on-demand for specific cognitive modes.

## Why Now
Current Copilot behavior needs guardrails — engineering culture, delegation rules, clear agent boundaries. Building this before more complex features prevents accumulating technical and behavioral debt.

## Architecture
- **Flat organization**: Director + 5 specialist agents. Director is the routing layer.
- **All delegation flows through Director**. Agents never delegate to each other.
- **Crisp boundaries**: Each agent has one cognitive mode, no domain splits.

## Files Created

### User-Level (`~/Library/Application Support/Code/User/prompts/`)

| File | Type | Purpose |
|------|------|---------|
| `director.instructions.md` | Instructions (always-on) | Engineering constitution — culture, org, delegation |
| `analyst.agent.md` | Custom Agent | Explore, debug, trace, find root causes |
| `architect.agent.md` | Custom Agent | Design, plan, define interfaces, trade-offs |
| `builder.agent.md` | Custom Agent | Implement, fix bugs, refactor |
| `reviewer.agent.md` | Custom Agent | Review, test, audit security & performance |
| `communicator.agent.md` | Custom Agent | Docs, specs, PRDs, commit messages |

### Project-Level (ViewCreator)

| File | Purpose |
|------|---------|
| `AGENTS.md` | Next.js rules + Codebase Memory MCP + project-specific conventions |
| `.github/copilot-instructions.md` | Simplified to reference AGENTS.md |

## Success Criteria
- [ ] Director constitution is loaded in every Copilot session
- [ ] All 5 specialist agents appear in the agent picker
- [ ] Subagents can be invoked by the Director
- [ ] AGENTS.md contains accurate ViewCreator project context

## Out of Scope
- Domain-split agents (Frontend Builder, DB Builder, etc.) — evolve later if needed
- MCP server configuration
- Skills re-organization

## Addendum: Continuous Learning System (added 2026-07-04)

Every agent's workflow now includes a "Capture the learning" final step. The Director constitution includes:
- **Culture value #8**: Continuous Learning — encode every lesson into the system
- **Learning Capture Protocol**: Distill → Classify (systemic/pattern/one-off) → Encode → Close the loop
- **Learning log**: `docs/learnings/` — persistent, version-controlled repository of lessons

## Open Questions
- How to trigger subagent invocation from the Director agent's context
- Whether agent descriptions need refinement for better matching
