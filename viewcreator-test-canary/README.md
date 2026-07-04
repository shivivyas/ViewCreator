# ViewCreator Test Canary

**Independent E2E test harness + dashboard for the ViewCreator payment system.**

This is a **plug** — it lives completely outside the main application and connects to a running ViewCreator instance. No coupling to app internals.

## Architecture

```
viewcreator-test-canary/        ← Standalone package (no app deps)
├── dashboard/
│   ├── index.html             ← Dark-themed HTML dashboard
│   └── serve.mjs              ← Static server (port 4400)
├── tests/
│   ├── helpers.ts             ← Personas + API mock utilities
│   ├── pricing.spec.ts        ← Pricing page tests
│   ├── header-status.spec.ts  ← Header plan badge tests
│   └── admin-api.spec.ts      ← Admin API + health tests
├── playwright.config.ts       ← Playwright config
├── package.json               ← Only @playwright/test as dep
└── test-results/              ← Generated at runtime
    └── report.json            ← Consumed by dashboard
```

## Quick Start

```bash
# 1. Install deps (one time)
cd viewcreator-test-canary
npm install

# 2. Start the app (separate terminals)
cd ../viewcreator-ui  && npm run dev   # port 3000
cd ../viewcreator-api && npm run dev   # port 3001

# 3. Run the canary
npm test              # just the tests
npm run dashboard     # just the dashboard
npm run canary        # tests + dashboard
```

## Dashboard

After tests complete, the dashboard is served at **http://localhost:4400**.

Features:
- 📊 Summary cards (total / passed / failed / skipped)
- 📈 Progress bar with proportional segments
- 🔍 Filters (All / ✅ Passed / ❌ Failed / ⏭️ Skipped)
- 📸 Screenshot lightbox for every test
- 🎬 Video playback with download fallback
- 🌙 Dark theme matching ViewCreator design

## Requirements

- Node.js 22+
- ViewCreator dev servers running on ports 3000 and 3001
- No other dependencies — Playwright manages its own browsers

## Test Personas

| Persona | Balance | Subscription | What It Tests |
|---------|---------|-------------|---------------|
| GUEST | — | — | Public pricing page |
| FREE | 0 credits | none | Upgrade CTA visibility |
| CREDIT_USER | 420 credits | none | Credit count badge |
| SUBSCRIBER | 70 credits | active Monthly | Unlimited badge, Manage Billing |
| PAST_DUE | 70 credits | past_due | Red alert badge, Update payment |
