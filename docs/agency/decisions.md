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

### Decided By
{{agency-grill / agency-spec / agency-handoff / agency-review / agency-retro / client}}

### Reopens?
{{Yes — if future conditions might change this / No — this is settled}}
-->
