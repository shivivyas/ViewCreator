# ViewCreator — Project Architecture

> Last updated: 2026-07-06
> See also: `docs/product/PRD.md` (vision), `docs/agency/decisions.md` (why), `docs/development/gemini-features.md` (AI generation)

## TL;DR Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    viewcreator-ui                             │
│  Next.js 16.2.9 (port 3000)                                  │
│                                                              │
│  Pages: / → Landing                                         │
│         /generate → AI Studio (image/video gen)             │
│         /generate/edit → Image Editor (undo/redo)            │
│         /templates → Marketplace (upload + voting)           │
│         /pricing → Credit purchase                           │
│         /sign-up → Clerk sign-up page                        │
│                                                              │
│  Services → api-client.ts → fetch() → Express API            │
│  State → Redux (imageEditor slice only)                      │
│  Auth → Clerk (proxy.ts → Clerk middleware)                  │
│  UI → TailwindCSS v4 + shadcn/ui                             │
├──────────────────────────────────────────────────────────────┤
│                    viewcreator-api                            │
│  Express (port 3001)                                         │
│                                                              │
│  Routes:                                                     │
│    GET  /health                                               │
│    GET  /api/templates             → List + paginate         │
│    POST /api/templates/upload      → S3 + DB persist         │
│    DELETE /api/templates/:id        → Owner-only delete       │
│    POST /api/templates/:id/vote     → Toggle upvote           │
│    POST /api/generate              → Gemini image gen        │
│    POST /api/generate/video        → Gemini video gen        │
│    GET  /api/generations           → User creation history   │
│    DELETE /api/generations/:id      → Delete creation         │
│    DELETE /api/generations          → Clear all creations     │
│    PUT  /api/generations/:id/images → Update creation images │
│    POST /api/payments/deduct       → Deduct credits (admin)  │
│    POST /api/admin/payments/grant  → Grant credits (admin)   │
│    GET  /api/payments/balance      → User balance            │
│                                                              │
│  Auth: Clerk → ensureUserSynced() → auto-create in DB       │
│  AI: GoogleGenAI (gemini-3.1-flash-image)                    │
│  Storage: AWS S3 (generations + templates)                   │
│  Payments: Dodo Payments (credit purchase, webhooks)         │
├──────────────────────────────────────────────────────────────┤
│                  viewcreator-database                         │
│  PostgreSQL via Supabase                                     │
│                                                              │
│  Tables (10):                                                │
│    users, templates, template_upvotes                         │
│    subscription_plans, user_credits, credit_transactions      │
│    user_subscriptions, webhook_events                         │
│    user_creations                                            │
│  Functions: deduct_credits(), update_timestamp()             │
│  Repos: Template, User, Vote, Credit, Webhook, Creation      │
│  Migrate: schema.sql → query()                               │
│  Seed: Demo user + templates + plans (idempotent)            │
└──────────────────────────────────────────────────────────────┘
```

## Payment Flow (Pure Credit Model)

```
User clicks "Buy Credits"
  → Dodo Payments checkout session (server-side via SDK)
  → User completes payment on Dodo
  → Dodo webhook → /api/dodo/webhook (Svix-verified, idempotent)
  → INSERT user_credits (ON CONFLICT upsert)
  → INSERT credit_transactions (audit trail)
  → Header CreditBadge updates via API response sync

On generate:
  → Pre-flight: GET /api/payments/balance
  → Insufficient? Credit gate modal → Buy Credits CTA
  → Sufficient? Generate → deduct credits → return { balance_after }
```

## Database Schema (Current)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Synced from Clerk on first API call |
| `templates` | Viral social media templates (S3 + JSONB config) |
| `template_upvotes` | Many-to-many upvotes, unique (template_id, user_id) |

### Credit System
| Table | Purpose |
|-------|---------|
| `subscription_plans` | Credit pack definitions (seeded from Dodo catalog) |
| `user_credits` | Current balance + lifetime credits, unique per user |
| `credit_transactions` | Full audit trail (purchase, usage, refund, grant) |
| `user_subscriptions` | Subscription lifecycle (from Dodo webhooks) |
| `webhook_events` | Idempotency tracking for all webhooks |

### Content
| Table | Purpose |
|-------|---------|
| `user_creations` | Generated images/videos with all params, S3 URLs, metadata |

### Functions
| Function | Purpose |
|----------|---------|
| `update_timestamp()` | Auto-maintain `updated_at` on all tables |
| `deduct_credits()` | Atomic deduction with row-locking + idempotency |

## Quick Reference

| Command | Location | Purpose |
|---------|----------|---------|
| `npm run dev` | `viewcreator-ui/` | Start Next.js (port 3000) |
| `npm run dev` | `viewcreator-api/` | Start Express (port 3001) |
| `npx tsx src/migrate.ts` | `viewcreator-database/` | Run schema.sql (wipes + recreates) |
| `npx tsx src/seed.ts` | `viewcreator-database/` | Seed demo data |
| `npx tsc` | `viewcreator-database/` | Compile DB package (must do before API) |
| `npm test` | `viewcreator-test-canary/` | Run Playwright E2E tests |

## Key Files

| File | Purpose |
|------|---------|
| `viewcreator-ui/src/proxy.ts` | Next.js 16 auth proxy (Clerk middleware) |
| `viewcreator-ui/src/services/base/api-client.ts` | Unified fetch wrapper with auth token injection |
| `viewcreator-ui/src/components/generate/` | AI Studio components (form, history, credit gate) |
| `viewcreator-api/src/index.ts` | All API routes in one file |
| `viewcreator-api/src/routes/payments.ts` | Credit deduction + balance endpoints |
| `viewcreator-api/src/routes/admin.ts` | Admin credit grant endpoint |
| `viewcreator-database/src/schema.sql` | Full DDL (10 tables, 2 functions, indexes, triggers) |
| `viewcreator-database/src/repositories/` | 6 typed repositories |
| `viewcreator-test-canary/tests/` | 7 test specs, 39 tests, 2 Playwright projects |

## Database Connection

Uses `pg.Pool` → Supabase Postgres via `DATABASE_URL`.
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s
- Debug: `DEBUG_DB=true`
