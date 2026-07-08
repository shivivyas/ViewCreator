# ViewCreator — Production Launch Roadmap

**Created**: 2026-07-08
**Status**: 🟡 Planned (not started)
**Owner**: TBD

---

## Architecture Overview

```
Browser
  │
  ├── Next.js :3000 (Clerk SSR, Dodo Checkout)
  │       │
  │       └── Express API :3001 → Supabase Postgres + AWS S3
  │
  └── Dodo Payments → Webhooks → Next.js → Express (idempotent)
```

---

## Recommended Hosting: AWS

**Rationale**: The project already uses AWS S3 for asset storage. Keeping everything on AWS avoids cross-cloud complexity.

| Option | Cost/Mo | Complexity | Best For |
|--------|---------|------------|----------|
| **Lightsail** (single container) | ~$10-40 | Low | Launch — one container runs both Next.js + Express |
| **ECS Fargate** | ~$30-60 | Medium | Scaling — separate services, auto-scaling |
| **EC2** | ~$15-50 | Medium | Full control, cheapest at low scale |

**Recommendation**: Start with Lightsail, migrate to Fargate when needed.

---

## Phase 0: 🔴 Emergency Security Patches

*Estimated: 1-2 days. Do these first — active production risks.*

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 0.1 | **Restrict CORS** | `viewcreator-api/src/index.ts` | Change `cors()` → `cors({ origin: 'https://yourdomain.com' })` |
| 0.2 | **Rotate ADMIN_API_KEY** | Env var | Change from default `dev-admin-key` to strong random value |
| 0.3 | **Add auth to webhook-event endpoint** | `viewcreator-api/src/routes/payments.ts` | Internal-auth middleware (shared secret between Next.js → Express) |
| 0.4 | **Create .env.example** | Project root | Document all 18+ env vars with descriptions |

### Why These
- **CORS**: Without origin restriction, any website can make API calls on behalf of your users
- **ADMIN_API_KEY**: Default `dev-admin-key` is guessable — admin endpoints expose payment data
- **Webhook auth**: Anyone can POST fake payment events (grant credits, create subscriptions)
- **Env docs**: No onboarding without it; easy to misconfigure prod

---

## Phase 1: 🟡 Service Isolation — Dev vs. Prod

*Estimated: 2-3 days. Separate instances for every service.*

### 1.1 PostgreSQL / Supabase

| Instance | Action | Details |
|----------|--------|---------|
| **Dev** | Keep current project | Existing `DATABASE_URL` |
| **Prod** | Create new Supabase project | Smallest paid tier (~$25/mo), separate `DATABASE_URL` |

**Steps**:
1. Create new Supabase project in Supabase dashboard
2. Note the new connection string
3. Run `npm run db:migrate` pointing at prod URL
4. Store prod `DATABASE_URL` in secrets manager / CI/CD secrets

### 1.2 Clerk — Production Mode

| Instance | Action | Details |
|----------|--------|---------|
| **Dev** | Keep dev instance | Test emails, dev keys |
| **Prod** | Create production instance | Real emails, real domain, prod keys |

**Steps**:
1. In Clerk dashboard → create new "Production" instance
2. Configure production domain
3. Get `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Set up production redirect URLs

### 1.3 Dodo Payments — Live Mode

| Instance | Action | Details |
|----------|--------|---------|
| **Dev** | Keep test mode | Test API keys |
| **Prod** | Switch to live mode | Live API keys, live webhook URLs |

**Steps**:
1. Get live `DODO_PAYMENTS_API_KEY` from Dodo dashboard
2. Set `DODO_PAYMENTS_ENVIRONMENT=live`
3. Create live pricing plans (product IDs)
4. Configure webhook URLs → `https://yourdomain.com/api/dodo/webhook`
5. Update `DODO_PAYMENTS_RETURN_URL` and `DODO_PAYMENTS_WEBHOOK_KEY`

### 1.4 AWS S3 — Separate Buckets

| Instance | Action | Details |
|----------|--------|---------|
| **Dev** | Keep current bucket | Existing `AWS_S3_BUCKET` |
| **Prod** | Create new prod bucket | New bucket + CloudFront distribution |

**Prod bucket requirements**:
- [ ] Block all public access
- [ ] Enable versioning
- [ ] Add lifecycle policy (e.g., expire objects > 90 days)
- [ ] Attach CloudFront distribution for asset serving
- [ ] Create separate IAM user/role for prod
- [ ] Use **presigned URLs** instead of public URLs

---

## Phase 2: 🟡 Infrastructure & Hosting

*Estimated: 3-5 days. Containers, CI/CD, IaC, domain.*

### 2.1 Containerization

**`viewcreator-ui/Dockerfile`**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
```

**`viewcreator-api/Dockerfile`**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Alternative — single container for launch**: One Dockerfile that starts both services via a process manager (or just runs Next.js and proxies to Express).

### 2.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
  deploy:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Push to ECR
        run: ...
      - name: Deploy to ECS/Lightsail
        run: ...
```

**Minimum CI gates**: lint → type-check → build → deploy

### 2.3 Infrastructure as Code

**Recommendation**: AWS CDK (TypeScript-native, your team already knows TS)

Define:
- VPC (or use default)
- ECS Fargate service(s) or Lightsail instance
- S3 bucket (prod)
- CloudFront distribution
- IAM roles and policies
- Secrets (SSM Parameter Store or Secrets Manager)

**Alternative**: Terraform if multi-cloud is a future concern.

### 2.4 Domain + SSL

- [ ] Purchase or use existing domain
- [ ] Route53 for DNS (or Cloudflare)
- [ ] ACM (AWS Certificate Manager) for SSL/TLS certificate
- [ ] Point domain to ALB or CloudFront

---

## Phase 3: 🟡 Production Hardening

*Estimated: 2-3 days. Security, monitoring, reliability.*

| # | Task | Priority | Details |
|---|------|----------|---------|
| 3.1 | **Presigned S3 URLs** | High | Replace public S3 URLs with `getSignedUrl()` — assets shouldn't be publicly accessible forever |
| 3.2 | **Distributed rate limiting** | Medium | Migrate `express-rate-limit` (in-memory) to **Redis-backed** (ElastiCache or Upstash) for multi-instance support |
| 3.3 | **Structured logging** | Medium | Replace `console.log/error` with **Pino** or **Winston** — JSON output, log levels, request IDs |
| 3.4 | **Error tracking** | Medium | Add **Sentry** or **Datadog** — catch production errors before users report them |
| 3.5 | **Health check improvement** | Low | Make `/health` verify DB connectivity + S3 access |
| 3.6 | **DB connection pool tuning** | Medium | Prod pool: `max: 20`, `idleTimeoutMillis: 60000` |
| 3.7 | **Payload size limits** | Low | Restrict `/api/generate` and `/api/templates/upload` limits more tightly |

---

## Phase 4: 🟢 Testing & Quality

*Estimated: 1-2 days.*

| # | Task | Details |
|---|-------|---------|
| 4.1 | **E2E smoke tests in CI** | Run the Playwright test canary against prod-like environment before deploy |
| 4.2 | **Load test generation** | Use Artillery or k6 — ensure Gemini + S3 + Dodo flow handles concurrent users |
| 4.3 | **Credit system audit** | Verify atomicity under concurrency (`SELECT ... FOR UPDATE` pattern under load) |
| 4.4 | **Webhook replay test** | Simulate duplicate Dodo webhooks — verify idempotency holds |
| 4.5 | **Failover test** | Kill the API server — does the frontend degrade gracefully? |

---

## Phase 5: 🟢 Launch Readiness

*Estimated: 1-2 days.*

| # | Task | Details |
|---|-------|---------|
| 5.1 | **Database backup** | Configure automated daily backups on Supabase (or pg_dump cron) |
| 5.2 | **Uptime monitoring** | **Checkly** or **Better Uptime** — monitor `/health` endpoint + synthetic user flows |
| 5.3 | **Alerting** | Set up alerts for: 5xx errors spike, payment webhook failures, Gemini API errors, credit exhaustion |
| 5.4 | **Runbook** | Document: how to rollback a deploy, restore a DB backup, restart services, handle Dodo webhook failures |
| 5.5 | **DNS propagation** | Set TTL low (60s) for launch day, increase to 300s after stable |
| 5.6 | **Dry-run deploy** | Full end-to-end deployment to a staging environment |
| 5.7 | **Analytics** | Add basic analytics (Plausible, PostHog, or similar) to track signups, generations, conversions |

---

## Phase 6: 🔵 Post-Launch Hygiene

| # | Task | When |
|---|------|------|
| 6.1 | **Enable S3 access logging** | Week 1 |
| 6.2 | **Set up cost alerts** | Week 1 — AWS Budget + Gemini API cost monitoring |
| 6.3 | **Review CloudFront caching** | Week 1 — optimize cache hit ratio for static assets |
| 6.4 | **Add Sentry performance tracing** | Week 2 |
| 6.5 | **GDPR/privacy compliance** | Before paid users — document data handling, add privacy policy |
| 6.6 | **Credit expiration cron** | Week 2 — expire unused credits after N days |

---

## Estimated Costs (Monthly)

| Service | Tier | Cost/mo |
|---------|------|---------|
| Supabase Postgres (prod) | Small paid | ~$25 |
| Supabase Postgres (dev) | Free | $0 |
| AWS ECS Fargate / Lightsail | Small | ~$30-50 |
| AWS S3 (assets) | Low storage | ~$5-10 |
| AWS CloudFront (CDN) | Low traffic | ~$5-10 |
| Clerk (production) | Free (10K MAU) | $0 |
| Dodo Payments | 2% + $0.50/txn | Variable |
| Gemini API | Pay-as-you-go | Variable |
| Uptime monitoring | Free tier | $0 |
| Sentry | Free tier | $0 |
| **Baseline** | | **~$65-85/mo** |

---

## Quick Reference: Hosting Comparison

| Platform | Monthly Cost | Setup Time | Scaling | Best For |
|----------|-------------|------------|---------|----------|
| **AWS Lightsail** | $10-40 | 1 day | Manual resize | Launch |
| **AWS ECS Fargate** | $30-60 | 2-3 days | Auto-scaling | Growth |
| **Railway** | $20-50 | 1 hour | Auto-scaling | Fastest setup |
| **Render** | $15-50 | 1 hour | Auto-scaling | Simple |
| **Fly.io** | $20-60 | 1 day | Per-region | Global users |
| **GCP Cloud Run** | $30-80 | 2 days | Auto-scaling | If already on GCP |

---

## Pre-Launch Checklist

### Security
- [ ] CORS restricted to production domain
- [ ] `ADMIN_API_KEY` rotated from default
- [ ] Webhook endpoint has internal auth
- [ ] No secrets in code (all via env vars or secrets manager)
- [ ] S3 bucket blocks public access (CloudFront + presigned URLs instead)
- [ ] Database SSL enforced

### Infrastructure
- [ ] Dockerfiles created for both services
- [ ] CI/CD pipeline configured (lint → type-check → build → deploy)
- [ ] Infrastructure-as-code defined (at minimum: S3, compute, networking)
- [ ] Domain configured with SSL
- [ ] DNS propagated

### Services
- [ ] Supabase prod project created + migrations applied
- [ ] Clerk production instance created + keys stored
- [ ] Dodo Payments live mode configured + webhook URLs set
- [ ] S3 prod bucket created with proper policies

### Monitoring
- [ ] Uptime monitoring active
- [ ] Error tracking (Sentry) configured
- [ ] Database automated backups enabled
- [ ] Cost alerts set up
- [ ] Runbook documented

### Testing
- [ ] E2E smoke tests passing in CI
- [ ] Load test completed (no regressions)
- [ ] Credit system verified under concurrency
- [ ] Webhook idempotency verified
- [ ] Dry-run deploy completed

---

## Appendix: Environment Variables Inventory

All 18+ env vars currently used in the codebase. This should be the basis for `.env.example`.

| Variable | Used In | Purpose | Required |
|----------|---------|---------|----------|
| `PORT` | viewcreator-api | Express server port | No (default: 3001) |
| `DATABASE_URL` | viewcreator-database | PostgreSQL connection string | **Yes** |
| `DB_SSL` | viewcreator-database | Force SSL for DB | No |
| `DB_MAX_CONNECTIONS` | viewcreator-database | PG pool size | No (default: 10) |
| `NODE_ENV` | viewcreator-database | Dev mode features | No |
| `DEBUG_DB` | viewcreator-database | Verbose query logging | No |
| `GEMINI_NANO_BANANA_API_KEY` | viewcreator-api | Google Gemini AI | **Yes** |
| `AWS_REGION` | viewcreator-api | S3 region | No (default: us-east-1) |
| `AWS_ACCESS_KEY_ID` | viewcreator-api | S3 credentials | **Yes** |
| `AWS_SECRET_ACCESS_KEY` | viewcreator-api | S3 credentials | **Yes** |
| `AWS_S3_BUCKET` | viewcreator-api | S3 bucket name | **Yes** |
| `CLERK_SECRET_KEY` | viewcreator-api + UI | Clerk admin key | **Yes** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | viewcreator-ui | Clerk frontend key | **Yes** |
| `CLERK_SIGN_IN_URL` | viewcreator-ui | Custom sign-in path | No |
| `CLERK_SIGN_UP_URL` | viewcreator-ui | Custom sign-up path | No |
| `DODO_PAYMENTS_API_KEY` | viewcreator-api + UI | Dodo Payments auth | **Yes** |
| `DODO_PAYMENTS_ENVIRONMENT` | viewcreator-api + UI | test vs live | **Yes** |
| `DODO_PAYMENTS_RETURN_URL` | viewcreator-api + UI | Post-checkout redirect | No (default: localhost) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | viewcreator-api + UI | Svix webhook verification | **Yes** |
| `ADMIN_API_KEY` | viewcreator-api | Admin endpoints auth | **Yes** (must be rotated) |
| `NEXT_PUBLIC_API_URL` | viewcreator-ui | Express API base URL | No (default: localhost:3001) |
