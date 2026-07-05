<!-- BEGIN:firstmate-integration -->
# FirstMate Agent Orchestration

This project uses **firstmate** for agent orchestration — it's vendored at `firstmate/`. The firstmate framework provides the operational layer: session management, worktree isolation, crewmate spawning, supervision, PR lifecycle, and backlog tracking.

## How It Works

```
Captain (User)
  └── First Mate / Director (this agent)
        ├── Analyst Agent      → Scout tasks: investigate, trace, find root causes
        ├── Architect Agent    → Scout tasks: design, plan, define interfaces
        ├── Builder Agent      → Ship tasks: implement, build, fix, refactor
        ├── Reviewer Agent     → Scout tasks: review code, audit, write tests
        └── Communicator Agent → Ship/scout: docs, specs, PRs, commit messages
```

### Key Operations

| Operation | Command |
|-----------|---------|
| **Session start** | `bin/fm-session-start.sh` — context digest, fleet state, wake queue |
| **Spawn crewmate** | `bin/fm-spawn.sh <id> projects/<repo>` — isolated worktree + agent |
| **Scaffold brief** | `bin/fm-brief.sh <id> <repo>` — writes `data/<id>/brief.md` |
| **Arm watcher** | `bin/fm-watch-arm.sh` — zero-token supervision |
| **Teardown** | `bin/fm-teardown.sh <id>` — clean up finished tasks |
| **Self-update** | `/updatefirstmate` — pull latest firstmate + re-read |

### FirstMate Directory Layout

```
firstmate/
  AGENTS.md            → FirstMate operating manual (CLAUDE.md symlinks to it)
  bin/                 → Helper scripts (spawn, brief, watch, teardown, etc.)
  .agents/skills/      → FirstMate internal skills (harness-adapters, afk, stow, etc.)
  data/                → Fleet records (backlog, projects, learnings)
  state/               → Runtime signals (task meta, status, watcher state)
  projects/            → Cloned repos (READ-ONLY — only crewmates edit via worktrees)
  config/              → Local config (crew harness, dispatch profiles, backend)
```

### FirstMate Skills Reference

Load these at the indicated trigger points:
- `harness-adapters` — Before spawning or recovering any crewmate
- `stuck-crewmate-recovery` — On stale wake, looping pane, or failed steer
- `secondmate-provisioning` — Before creating/seeding/retiring a persistent secondmate
- `afk` — When captain goes away (`/afk`), daemon takes over supervision
- `stow` — On `/stow`, sweep session for uncaptured knowledge

### Worktree Isolation

Every crewmate works in an **isolated git worktree** — never the primary checkout. The First Mate reads the project to understand it; crewmates change it. This prevents parallel work collisions.

---

## Secondmate Architecture (Optional)

For persistent domain supervisors (e.g., a "database admin" secondmate that always runs), each secondmate gets its own isolated `FM_HOME` with its own projects, backlog, and session lock. Route work by scope via `data/secondmates.md`.

---

## When FirstMate Is Absent

If the `firstmate/` directory is not present, fall back to the standard agency workflow (Director → specialist agents, no worktree isolation, manual KB reads).
<!-- END:firstmate-integration -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-constitution -->
# ViewCreator — Project-Level Agent Organization

This file is the **project-level** layer in a two-tier agent organization. It amends the user-level Director constitution with ViewCreator-specific context, agents, and conventions.

**User-level Director constitution**: `{{VSCODE_USER_PROMPTS_FOLDER}}/director.instructions.md`
**User-level specialist agents**: `{{VSCODE_USER_PROMPTS_FOLDER}}/*.agent.md`

---

## Project Overview

ViewCreator is an AI-powered marketing content operating system. It enables marketers, founders, agencies, and creators to go from **Inspiration → Branded Creative → Publication** in minutes.

### Core Principles (from PRD)
- **AI First** — Users should rarely need manual editing
- **Intent > Controls** — Users express goals, system translates to operations
- **Fastest Path To Publish** — Every feature reduces time to first publish

---

## Tech Stack

- **Framework**: Next.js 16.2.9 (breaking changes — see Next.js rule above)
- **UI**: React 19.2.4, TailwindCSS, shadcn/ui
- **State**: Redux Toolkit (minimal usage — image editor slice only)
- **API**: Next.js API routes (`/api/*`) + Express standalone API (`viewcreator-api/`)
- **Database**: PostgreSQL via separate `viewcreator-database/` package
- **Auth**: Supabase (see skill in `.agents/skills/supabase/`)
- **AI**: Google Gemini API for image generation and editing

---

## Project Structure

```
viewcreator-ui/          → Next.js frontend + API routes (port 3000)
  src/
    app/                 → Pages (landing, generate, generate/edit, templates)
    components/          → UI components (landing, editor, templates, shared)
    services/            → API client & service layer
    store/               → Redux store + slices
    types/               → TypeScript type definitions
    proxy.ts             → Next.js 16 proxy (replaces middleware.ts)

viewcreator-api/         → Standalone Express API server
  src/index.ts           → Server entry point (port 3001)

viewcreator-database/    → Database package
  src/
    db.ts                → DB connection
    schema.sql           → Database schema
    migrate.ts           → Migration runner
    seed.ts              → Seed data
    repositories/        → Data access layer (template, user, vote)
```

---

## Codebase Memory MCP (MANDATORY)

**Use Codebase Memory MCP graph tools FIRST — before reading files or making code changes.**

```json
// Step 0 — discover project names
mcp_codebase-memo_list_projects()

// Step 1 — get architecture overview
mcp_codebase-memo_get_architecture({ "project": "<display_name>" })
```

### Workflow
1. Call `list_projects` to discover the correct project name
2. Call `get_architecture(project)` to understand structure
3. Use `search_graph` to find relevant symbols, `trace_call_path` for call chains
4. Use `get_code_snippet` to read specific implementations
5. Only use `read_file` when you need exact raw content to edit

---

## Project-Specific Conventions

### Naming
- Files: `kebab-case` (e.g., `template-detail-modal.tsx`)
- Components: PascalCase
- Functions/variables: camelCase
- Types/interfaces: PascalCase, prefixed with `I` for interfaces

### Testing
- Write tests before code (TDD)
- For bugs: write a failing test first, then fix (Prove-It pattern)
- Test hierarchy: unit > integration > e2e
- Run `npm test` after every change

### Code Quality
- Review across: correctness, readability, architecture, security, performance
- Every PR must pass: lint, type check, tests, build
- No secrets in code or version control

### Implementation
- Build in small, verifiable increments
- Each increment: implement → test → verify → commit
- Never mix formatting changes with behavior changes

### Boundaries
- **Always**: Run tests, validate input, surface assumptions
- **Ask first**: Schema changes, new deps, CI/config changes
- **Never**: Commit secrets, remove failing tests, skip verification, guess framework APIs

---

## Project-Level Agent Definitions

These agents extend the user-level specialist agents with ViewCreator-specific context.

### Builder (ViewCreator Edition)
When implementing code for ViewCreator:
- **Next.js routes** go in `viewcreator-ui/src/app/`
- **UI components** go in `viewcreator-ui/src/components/` matching their domain subfolder
- **API routes** use the `viewcreator-api/` Express server (not embedded in Next.js)
- **Database changes** must go through the `viewcreator-database/` package with a migration
- **shadcn/ui components** are preferred over custom-styled elements
- Refer to `UI_STYLE_DOCUMENTATION.md` and `ENHANCED_FEATURES_QUICK_REFERENCE.md` for UI patterns

### Reviewer (ViewCreator Edition)
When reviewing ViewCreator code, additionally check:
- Are all API changes reflected in the corresponding types?
- Do UI changes match the existing design system (TailwindCSS + shadcn/ui)?
- Are database migrations reversible?
- Are environment variables documented in `.env.example`?

---

## Skills Reference

Project skills are in `.github/skills/` and `.agents/skills/`. Key ones:
- `supabase/` — Supabase Auth, Database, CLI usage
- `frontend-ui-engineering/` — Production-quality UI patterns
- `debugging-and-error-recovery/` — Systematic debugging
- `incremental-implementation/` — Small-verifiable-increment workflow
- `interview-me/` — Intent extraction before building
- `spec-driven-development/` — Specs before code
- `doubt-driven-development/` — Adversarial review of decisions
- `source-driven-development/` — Official docs over guessing
