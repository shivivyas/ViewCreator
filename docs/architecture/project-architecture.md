# ViewCreator Knowledge Base

> Comprehensive project architecture document. Auto-generated from codebase analysis.
> Last updated: 2026-07-04

See `/memories/repo/project_analysis.md` for the full knowledge base.

## TL;DR Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    viewcreator-ui                        │
│  Next.js 16 (port 3000)                                 │
│                                                         │
│  Pages: / → Landing                                    │
│         /generate → AI Studio                          │
│         /generate/edit → Image Editor with Undo/Redo   │
│         /templates → Marketplace with Upload + Voting  │
│                                                         │
│  Services → api-client.ts → fetch() → Express API       │
│  State → Redux (imageEditor slice only)                 │
│  Auth → Clerk (proxy.ts → Clerk middleware)             │
├─────────────────────────────────────────────────────────┤
│                    viewcreator-api                       │
│  Express (port 3001)                                    │
│                                                         │
│  Routes:                                                │
│    GET  /api/templates            → List + paginate     │
│    POST /api/templates/upload     → S3 + DB persist     │
│    DELETE /api/templates/:id      → Owner-only delete   │
│    POST /api/templates/:id/vote   → Toggle upvote       │
│    POST /api/generate             → Gemini image gen    │
│    POST /api/generate/video       → Gemini video gen    │
│                                                         │
│  Auth: Clerk → ensureUserSynced() → auto-create in DB   │
│  AI: GoogleGenAI (gemini-3.1-flash-image)               │
│  Storage: AWS S3 (@aws-sdk/client-s3)                   │
├─────────────────────────────────────────────────────────┤
│                  viewcreator-database                    │
│  PostgreSQL via supabase                      │
│                                                         │
│  Tables: users, templates, template_upvotes             │
│  Repos: TemplateRepository, UserRepository, VoteRepo    │
│  Migrate: schema.sql → query()                          │
│  Seed: Demo user + 4 templates (idempotent)             │
└─────────────────────────────────────────────────────────┘
```

## Quick Reference

| Command | Location | Purpose |
|---------|----------|---------|
| `npm run dev` | Root | Starts UI (port 3000) + API (port 3001) + DB |
| `npm run dev` | `viewcreator-api/` | Start Express API server |
| `npm run dev` | `viewcreator-ui/` | Start Next.js dev server |
| `npx tsx src/migrate.ts` | `viewcreator-database/` | Run database migrations |
| `npx tsx src/seed.ts` | `viewcreator-database/` | Seed demo data |

## Key Files

| File | Purpose |
|------|---------|
| `viewcreator-ui/src/proxy.ts` | Next.js 16 auth proxy (was middleware.ts) |
| `viewcreator-ui/src/services/base/api-client.ts` | Unified fetch wrapper with auth token injection |
| `viewcreator-api/src/index.ts` | All API routes in one file |
| `viewcreator-database/src/schema.sql` | Full DDL with indexes and triggers |
| `viewcreator-database/src/repositories/vote-repository.ts` | Upvote toggling with LEFT JOIN counts |

## Database Connection

Uses `pg.Pool` with config from env vars. Falls back to `DATABASE_URL` if set.
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s
- Debug logging via `DEBUG_DB=true` or `NODE_ENV=development`
