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

---

## Frontend Architecture (`viewcreator-ui/src/`)

> Last updated: 2026-07-09
> ~68 source files, ~8,700 lines, 0 compile errors, 3 external data flows

### Directory Map

```
src/
├── app/                        Next.js App Router pages
├── components/                 UI components by domain
│   ├── ui/                     shadcn/ui primitives (17 files)
│   ├── layout/                 Site header
│   ├── landing/                Marketing page + footer
│   ├── shared/                 Credit gate modal
│   ├── generate/               GenerateForm + HistoryPanel
│   ├── editor/                 EditorHeader/Sidebar/Canvas/Timeline
│   └── templates/              TemplateViewPage, TemplateGenerationPanel,
│                               UploadTemplateModal
├── hooks/                      useCreditGate, usePostPurchaseResume
├── lib/                        cn(), cycleIndex(), safeToken(), webhookVerifier
├── services/                   API layer (base client + 4 service modules)
├── store/                      Redux (imageEditor slice only)
├── types/                      All TypeScript interfaces
└── proxy.ts                    Next.js 16 proxy (routes /api/* to Express)
```

### Page-by-Page Breakdown

| Route | File | Lines | What It Does |
|-------|------|-------|-------------|
| `/` | `app/page.tsx` | ~10 | Imports `<LandingPage>` |
| `/generate` | `app/generate/page.tsx` | 580 | AI Studio — media type toggle, credit gate, post-purchase resume, URL template selection, persisted history. Passes 11 props to `<GenerateForm>`. |
| `/generate/edit` | `app/generate/edit/page.tsx` | 474 | Image editor — crop state, adjustments, AI edit, edit history timeline, unsaved-changes guard. |
| `/templates` | `app/templates/page.tsx` | 560 | Template marketplace — `<TemplateCard>` grid with mini carousel (arrows+dots), search, sort, categories, save/vote/delete. |
| `/templates/:id` | `app/templates/[id]/page.tsx` | ~10 | Async server component — renders `<TemplateViewPage>`. |
| `/pricing` | `app/pricing/page.tsx` | 246 | Dodo Payments pricing table. |
| `/payments/history` | `app/payments/history/page.tsx` | 139 | Transaction history table. |

### Component Architecture

**Three major component groups, each with a clear data flow:**

#### 1. Generate Flow (`/generate`)

```
GenerateImagePageContent (page state: mediaType, credit gate, resume)
  ├── GenerateForm          Owns prompt/aspectRatio/count/size/references
  │   via useReducer.       Props: templates, loading, error, mediaType,
  │                         onSubmit(formData), loadKey/loadValues
  ├── HistoryPanel          Read-only display of Redux history items.
  │                         Callbacks: loadSettings, regenerate, selectImage
  └── CreditGateModal       Buy credits modal (shared with templates)
```

Key: `GenerateForm` was refactored in July 2026 to own its state internally. The page no longer manages 13 form-specific state variables.

#### 2. Template View (`/templates/:id`)

```
TemplateViewPage (data layer: fetch template + related + AI analysis)
  ├── Carousel (inline)     Instagram-style image carousel with arrows/dots.
  │                         Falls back to related templates if < 2 own images.
  ├── AI Prompt Section     Editable prompt textarea or displayed analysis.
  └── TemplateGenerationPanel
      (owns: prompt, aspectRatio, numberOfImages, modal state:
       idle→generating→results→error, step timer, download, workspace routing)
```

Key: The generation concern was extracted into its own component in July 2026. The view page dropped from 825 to 548 lines.

#### 3. Editor (`/generate/edit`)

```
EditImagePage (page state: crop, adjustments, edit history timeline)
  ├── EditorHeader          Back, title, save status, download
  ├── EditorCanvas          Image display + pointer-based crop overlay
  ├── EditorSidebar         Adjustments sliders + AI edit input + crop controls
  └── EditorTimeline        Edit history with thumbnails, undo/redo
```

#### 4. Templates Marketplace (`/templates`)

```
TemplatesPage (state: search, sort, categories, saved filter)
  ├── Search + Sort Bar
  ├── Category Pills (All, My Saves, + dynamic tags)
  ├── TemplateCard Grid (inline component, ~180 lines)
  │   - Mini carousel (arrows + dots for multi-image templates)
  │   - Save / Upvote / Delete buttons
  │   - "Use Template" hover overlay
  ├── UploadTemplateModal   Owns all upload state (title, tags, files, drag-drop)
  └── ConfirmDialog         Delete confirmation
```

Key: The upload modal was extracted into its own component in July 2026. The page dropped from 982 to 560 lines.

### Data Flow

```
User Action → Page Component → Service Function → api-client.ts
                                                     │
                                                     ├── fetch() → Express API (port 3001)
                                                     │              → DB / S3 / Gemini
                                                     │
                                                     └── fetch() → Next.js API route (/api/dodo/*)
                                                                    → Dodo Payments SDK
```

**Auth flow:** Clerk → `getToken()` → `safeToken()` helper → Bearer header → Express middleware (`clerkClient.verifyToken`)

**Credit check flow:**
```
Generate → useCreditGate.checkCredits(cost)
  → GET /api/payments/balance
  → Insufficient? show modal → Dodo checkout → webhook → poll → retry
  → Sufficient? generate → POST /api/generate → deduct credits
```

### State Management

| Layer | Technology | What It Stores |
|-------|-----------|----------------|
| **Redux** | RTK (1 slice) | Image editor state: URLs, selection, prompt, style, adjustments, crop, history |
| **React state** | useState / useReducer | Everything else — form state, modals, loading, errors |
| **URL params** | next/navigation | `?templateId=`, `?checkout=success` |
| **sessionStorage** | Raw API | Pending generation params for post-purchase resume |

Redux is used minimally — only the image editor slice, which needs to persist across page navigations. Everything else is local component state.

### API Layer

```
services/
├── base/api-client.ts    request<T>(endpoint, { method, body, token })
│                         → Adds Content-Type + Authorization
│                         → Parses JSON, throws typed errors
│                         → Prepends NEXT_PUBLIC_API_URL (localhost:3001)
├── api/template-service.ts    CRUD + vote + save + categories
├── api/generation-service.ts  generate + edit + video + user creations
├── api/analysis-service.ts    analyzeTemplate (free, no credit cost)
└── api/payment-service.ts     plans + balance + checkout + transactions
```

All 17 API functions follow the same pattern: `request<ResponseType>(endpoint, options)`. Consistent, predictable.

### Key Files Reference

| File | Purpose |
|------|---------|
| `proxy.ts` | Routes `/api/*` to Express, except `/api/dodo/*` (Next.js API routes) |
| `lib/helpers.ts` | `cycleIndex()` for carousels, `safeToken()` for Clerk auth |
| `hooks/use-credit-gate.ts` | Credit checking + purchase flow encapsulation |
| `hooks/use-post-purchase-resume.ts` | Post-checkout credit polling + re-generation |
| `components/generate/generate-form.tsx` | Form with useReducer, owns its state, 11 props |
| `components/templates/template-view-page.tsx` | Template detail: data + carousel + layout |
| `components/templates/template-generation-panel.tsx` | Generation concern: modal states, results, workspace |
| `components/templates/upload-template-modal.tsx` | Upload form with multi-image drag-drop |
| `components/shared/credit-gate-modal.tsx` | Buy credits modal (reusable) |
| `store/slices/image-editor-slice.ts` | Single Redux slice, 6 reducers |
