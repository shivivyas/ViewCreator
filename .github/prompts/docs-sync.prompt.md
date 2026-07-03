---
description: "Trigger a full documentation audit and sync. Scans the codebase for public APIs, types, routes, and components, then compares against existing docs. Flags stale, missing, or incorrect documentation and updates the knowledge base."
---

# /docs-sync — Documentation Audit & Knowledge Base Sync

Triggers the Communicator (with Analyst support) to:

1. **Scan the codebase** for all public interfaces:
   - API routes and their request/response shapes
   - Exported types and interfaces
   - Component props and their signatures
   - Database schema (tables, columns, indexes, triggers)
   - Environment variables and configuration points
   - Service functions and their parameters

2. **Compare against existing docs**:
   - `docs/knowledge-base/` — is the architecture doc accurate?
   - `docs/learnings/` — are recent learnings captured?
   - `README.md` — does the project overview still match?
   - `PRD.md` — does the product vision still hold?
   - `AGENTS.md` — does the project context need updates?

3. **Produce a report**:
   - ✅ **Up-to-date** — docs that match the code
   - ⚠️ **Stale** — docs that need updating (with specific diffs)
   - ❌ **Missing** — public APIs with no documentation
   - 📝 **Debt** — documentation quality issues (vague descriptions, missing examples)

4. **Apply fixes** (with confirmation):
   - Update stale docs
   - Fill missing documentation
   - Log new learnings
   - Update the knowledge base

Run this when: the project structure has changed significantly, before a release, after merging a large PR, or anytime you suspect docs are out of sync.
