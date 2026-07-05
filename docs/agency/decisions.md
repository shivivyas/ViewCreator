# Decision Log

## 2026-07-04: Three-package architecture

### Context
The project needed clear separation between frontend, API, and database logic.

### Decision
Split into three packages: `viewcreator-ui` (Next.js), `viewcreator-api` (Express), `viewcreator-database` (PostgreSQL).

### Rationale
Clean separation of concerns. API could be scaled independently. Database logic reusable across packages. Next.js 16 handles frontend routes, Express handles backend API.

---

## 2026-07-04: Dodo Payments for subscription management

### Context
Need a payment provider that supports subscription billing, credit packs, and customer portal.

### Decision
Use Dodo Payments as the payment gateway.

### Rationale
Supports both subscription and one-time credit purchases. Provides webhook-based subscription lifecycle management. Customer portal enables self-service cancellation.

---

## 2026-07-04: Clerk for authentication (modal mode)

### Context
Need authentication that integrates with both Next.js frontend and Express backend.

### Decision
Use Clerk with modal-mode sign-up/sign-in, syncing users to the database via middleware.

### Rationale
Clerk handles the full auth flow (OAuth, magic links, email/password) without building custom auth. Modal mode keeps users on the same page. Express middleware (`@clerk/express`) secures API routes.

---

## 2026-07-05: Continuous development loop (no fixed phases)

### Context
The project is actively developed with features being added incrementally. Strict Phase 1→2→3 doesn't fit.

### Decision
Use a continuous loop per feature: Requirements → Development → Review → Retro → Next feature.

### Rationale
Matches how the project actually operates. Each feature gets its own mini-cycle. Knowledge is captured per-feature rather than per-phase.

---

## 2026-07-05: Pure credit system (no subscriptions)

### Context
Simplifying the payment model to a single product for launch.

### Decision
Remove all subscription plans. Only one product: "100 credits for $9" (Dodo product ID: `pdt_0NiWo2CjaeJBzhplGXxWT`).

### Rationale
Fewer moving parts. No subscription lifecycle (renewals, cancellations, dunning). Simpler to debug. Can always add subscriptions later.

### Alternatives Considered
- Monthly subscription ($29/mo unlimited) — Rejected because it adds complexity (billing cycles, cancellation management, abuse potential)
- Two-product model (credits + subscription) — Rejected for same reason; keep it simple for now

---

## 2026-07-05: Three-entry-point credit purchase UX

### Context
Users need frictionless paths to buy credits at the moment of need.

### Decision
Three entry points for buying credits:
1. **`/pricing` page** — Marketing/info page showing "100 credits — $9"
2. **Header badge** — Shows current balance; becomes "Buy Credits" CTA at zero
3. **Generate modal** — Inline modal on generate page when insufficient credits, opens Dodo checkout, resumes generation after purchase

### Rationale
Meet users at their point of need. The header is always visible. The modal catches them at the moment of intent. The pricing page is for discovery.

---

## 2026-07-05: Credit costs (default — extensible later)

### Context
Need per-action credit costs that can be model-driven in the future.

### Decision
| Action | Cost |
|--------|------|
| Standard image generation | 1 credit |
| Premium image generation | 2 credits |
| Video generation | 5 credits |
| AI edit | 1 credit |

### Rationale
Simple starting point. The cost system is configurable by design (`CREDIT_COSTS` constant) so it can become model-priced later without rewriting the engine.

### Decided By
{{agency-grill / agency-spec / agency-handoff / agency-review / agency-retro / client}}

### Reopens?
{{Yes — if future conditions might change this / No — this is settled}}
-->
