# ViewCreator Behavioral Specification

> Auto-generated from grilling session (2026-07-06 / 2026-07-07).
> This is the SINGLE SOURCE OF TRUTH for how the app should behave.
> When writing tests or implementing features, consult this document first.
>
> **⚠️ Living document** — This file grows with the project. Whenever a new behavioral
> decision is made, an edge case is discovered, or existing behavior changes, update
> this spec immediately. Staying curious about behavior is a core practice.

---

## 1. Templates Domain

### 1.1 Guest Experience

| Behavior | Decision |
|----------|----------|
| Browse templates | ✅ Unrestricted — guests see full gallery |
| Open template card | ✅ Full preview, metadata, prompt section visible |
| See Generate button in modal | ✅ Visible but click triggers sign-up modal |
| Click "Use Template" on card | ❌ Redirects to Clerk sign-up modal |
| Click Upload button | ❌ Opens Clerk sign-up modal |
| Click Upvote | ❌ Opens Clerk sign-up modal |
| Search/filter/sort | ✅ Full access to all filtering controls |
| URL reflects filter state | ✅ Best practice: `?category=&sort=&q=` synced |

### 1.2 Signed-In Experience

| Behavior | Decision |
|----------|----------|
| Browse templates | ✅ Full unrestricted access |
| Open template card | ✅ Full access to detail modal |
| Generate from modal | ✅ Primary flow — fill prompt → generate → see results → download or continue to workspace |
| Upload template | ✅ Free (no credit cost) — **needs code fix: currently has credit gate** |
| Upload auto-resume | ✅ Guest clicks upload → sign-up → returns with file still staged |
| Voting | ✅ Toggle: click once = +1, click again = remove |
| Delete own template | ✅ Owner can delete own templates (public or private) |
| Delete others' templates | ❌ Cannot — delete button only appears for owner |
| Admin delete | ✅ Admin-level delete capability needed |

### 1.3 Upload Specifications

| Property | Value |
|----------|-------|
| Credit cost | **0 credits** (FREE) |
| File types | Images (PNG, JPEG) + Videos (MP4) |
| Image size limit | 10MB |
| Video size limit | 100MB |
| Visibility | Public or private ("My Uploads") |
| Fields | Title (required), Description, Tags, File |

---

## 2. Generate Domain

### 2.1 Access Control

| User State | Gate Location | Behavior |
|------------|---------------|----------|
| Guest | Page render + Generate button | Form visible; "Sign in to generate" button is disabled/aria-disabled; clicking opens Clerk sign-up |
| Signed-in, 0 credits | Generate button click | Credit gate modal appears: "Buy Credits" heading + purchase CTA |
| Signed-in, sufficient credits | — | Generation proceeds normally |
| Rule | Anything consuming credits | **Must be auth-guarded** — applies to generate API, any Gemini API call |

### 2.2 Credit Cost Model

| Parameter | Value |
|-----------|-------|
| Cost per image | **1 credit** |
| Quality tier | **Standard only** — NO Premium tier exists in the system |
| Multi-image cost | Number of images × 1 credit (e.g., 4 images = 4 credits) |
| Video cost | Defined in `calculateVideoCost()` |

### 2.3 Form Behavior

| Behavior | Decision |
|----------|----------|
| Prefill from `?templateId=X` | ✅ Form pre-fills: style preset, aspect ratio, recommended prompt from template config |
| Invalid/unknown templateId | ✅ Good error experience — show friendly message, fall back to default |
| Empty prompt | ✅ Generate button disabled |
| Generate button during loading | ✅ Disabled + shows "Generating..." + spinner |
| Media type toggle | Image ↔ Video switches form fields (video shows duration slider) |
| Aspect ratio buttons | 1:1 (Post), 4:5 (Portrait), 9:16 (Story), 16:9 (Landscape) |
| Number of images | 2 ideas or 4 ideas |
| Form stays visible after generation | ✅ Form remains editable for tweaking + regenerate |

### 2.4 Results Display

| Behavior | Decision |
|----------|----------|
| Where results appear | In the history panel (right column) — latest result at top |
| Download individual image | ✅ Download button per image |
| Export all images | ✅ Export/download-all option |
| "Continue to Workspace" | ✅ Navigates to `/generate/edit` with state in Redux |
| Regenerate | ✅ User can modify prompt and regenerate |
| Generation error | ✅ Inline error with retry button |
| Empty results (0 images) | ✅ Message: "No images were generated. Try a different prompt." |

### 2.5 Post-Purchase Resume

| Behavior | Decision |
|----------|----------|
| Generate hits credit gate | Form state saved to `sessionStorage` as `pending_generate` |
| User buys credits | Redirected to Dodo checkout (same tab) |
| User returns | `?checkout=success` param triggers restore |
| Form restoration | ✅ Form fields restored from `pending_generate` |
| Auto-trigger generation | ✅ "Credits confirmed! Resuming generation..." overlay (1-2s), then auto-generate |
| Safety | Brief overlay shown so user can see what's happening |

---

## 3. Edit / Workspace Domain

### 3.1 `/generate/edit` Behavior

| Behavior | Decision |
|----------|----------|
| Auth guard | ✅ Guest redirected to sign-up (proxy.ts guard) |
| Image preview | ✅ Large preview of selected image |
| Re-prompt & regenerate | ✅ User can enter new prompt and regenerate from existing image |
| Color adjustments | ✅ Available |
| Crop adjustments | ✅ Available |
| Download individual | ✅ |
| Export all | ✅ |
| Change history | ✅ Side panel shows complete change history of the asset |

---

## 4. Navigation Domain

### 4.1 Header Navigation

#### Guest
```
[V] ViewCreator  |  Templates  Features  How It Works  Platforms  Pricing  |  Sign In  Sign Up
```

#### Signed-In
```
[V] ViewCreator  |  Templates  AI Studio  My Creations  Pricing  |  [⚡ 100 credits 💳]  [👤]
```

### 4.2 Route Guards

| Route | Guest Behavior | Signed-In Behavior |
|-------|---------------|-------------------|
| `/` | Landing page — full access | Same landing page (no user-specific content) |
| `/templates` | Full browse | Full access + upload/vote/use |
| `/generate` | **Redirected to Clerk sign-in page** (route-level guard) | Full access — form visible, Generate deducts credits |
| `/generate/edit` | Redirected to sign-up (proxy.ts) | Full access |
| `/pricing` | Full access, "Sign up to buy" CTAs | "Buy more credits" CTAs + balance display |

### 4.3 Deep Link Returns

| Sign-up Origin | Return Destination |
|---------------|-------------------|
| `/generate` (via gate) | Back to `/generate` with form state preserved |
| `/templates` (via upload/vote) | Back to `/templates` |
| `/pricing` (via "Sign up to buy") | Back to `/pricing` |

---

## 5. Pricing & Purchase Domain

### 5.1 Pricing Page

| Element | Guest | Signed-In |
|---------|-------|-----------|
| Heading | "Pay once. Create forever." | Same |
| Credit pack cards | ✅ Visible with features | Same |
| CTA on cards | "Sign up to buy" | "Buy more credits" |
| Bottom CTA | "Get started" | Same |
| FAQ section | ✅ Visible | Same |
| Balance display | ❌ Not shown | ✅ Current credit balance shown |

### 5.2 Checkout Flow

| Behavior | Decision |
|----------|----------|
| Checkout opens in | **Same tab** (standard professional pattern) |
| Return URL | **Dynamic** — returns to the page where purchase was initiated |
| Credit grant | Via `POST /api/payments/confirm-purchase` with idempotency key |
| Post-purchase redirect param | `?checkout=success` |
| Header badge update | ✅ From API response (`balance_after` in confirm-purchase response) |
| Auto-resume generation | ✅ With "Credits confirmed!" overlay |

### 5.3 Idempotency

| Behavior | Decision |
|----------|----------|
| Same idempotency key | Does NOT double-grant credits |
| `pending_idempotency_key` | Stored in sessionStorage, cleared after grant |
| Confirmation endpoint | Returns `{ granted, already_granted }` |

---

## 6. Error & Edge Case Domain

### 6.1 API Failures

| Scenario | Behavior |
|----------|----------|
| Complete API outage (all calls fail) | Global banner: "Backend temporarily unavailable — retrying..." |
| Specific endpoint failure | Inline error in affected section + retry button |
| `GET /api/templates` fails | Toast: "Failed to fetch templates from the server." |
| `POST /api/generate` fails | Inline error in results area + retry button |
| `GET /api/payments/balance` fails | Credit badge shows fallback (no crash) |
| `GET /api/payments/plans` fails | Pricing page renders without crash (graceful degradation) |

### 6.2 Timeouts

| Scenario | Behavior |
|----------|----------|
| Generation >45s | Timeout warning: "This is taking longer than expected. Keep waiting or cancel." |
| User dismisses warning | Generation continues in background; if succeeds, show notification |
| User cancels | Button re-enabled, no credits lost (if not yet deducted) |

### 6.3 Rate Limiting

| Scenario | Behavior |
|----------|----------|
| Rapid Generate clicks | Button disabled after first click (prevents double-submit) |
| API returns 429 | Error surfaced to user with appropriate message |
| Solution | **Both** UI debounce + API rate limiting |

### 6.4 Network Offline

| Scenario | Behavior |
|----------|----------|
| Internet lost mid-generation | Error shown with retry button |
| Form state recovery | User must retry — state is not auto-recovered on reconnect |

---

## 7. Header & Credit Badge Domain

### 7.1 Credit Badge States

| User State | Badge Display |
|------------|--------------|
| Guest | Sign In / Sign Up buttons — no credit badge |
| Signed-in, 0 credits | "⚡ 0 credits — Buy" (amber style, links to /pricing) |
| Signed-in, has credits | "⚡ 100 credits 💳" (amber style, links to /pricing) |
| Badge update mechanism | **API response sync** — generate/purchase endpoints return `{ balance_after }`, header updates synchronously |

### 7.2 Badge Click Behavior

| Current | Target |
|---------|--------|
| Links to `/pricing` | Links to `/pricing` ✅ (dropdown with balance breakdown + "Buy more" is future) |

### 7.3 Header Polling

| Mechanism | Details |
|-----------|---------|
| Initial fetch | On mount (if signed-in) |
| Interval | Every 10s |
| `payment-updated` event | Instant refresh on generate/purchase |
| Visibility change | Refresh when tab becomes visible |

---

## 8. Creations Domain

### 8.1 Persistence

| Behavior | Decision |
|----------|----------|
| What gets persisted | Every successful generation (image or video) |
| Auth requirement | Generation requires auth — no guest creations |
| Storage | Database-backed (`user_creations` table) + S3 URLs |
| On-mount loading | Merged into history panel (deduped by creationId) |

### 8.2 User Actions on Creations

| Action | Allowed? |
|--------|----------|
| Delete own creation | ✅ Yes |
| Rename | ✅ Yes |
| Organize into folders/collections | ✅ Yes |
| View change history | ✅ Side panel in edit workspace |

### 8.3 History Panel

| Behavior | Decision |
|----------|----------|
| Load behavior | To be determined (pagination? all?) — **REMINDER: revisit for 500+ creations** |

---

## 9. Mobile / Responsive Domain

| Behavior | Decision |
|----------|----------|
| Templates page | ✅ Renders on 375px viewport |
| Generate page | ✅ Renders on mobile — form + history stack vertically |
| Pricing page | ✅ Renders on mobile |
| Header nav | Collapses to hamburger menu on mobile |
| Priority | P3 — lowest priority, polish after core flows |

---

## 10. Architectural Decisions & Known Gaps

### Known Code Fixes Needed

| Issue | Priority | File(s) |
|-------|----------|---------|
| Remove "Premium" quality tier from codebase (only Standard, 1 credit/image) | High | UI components, types, API routes, shared package |
| Credit gate modal text may need updating | Medium | Credit gate modal component |
| Guest "Sign in to generate" button aria-disabled | Medium | Generate form component |

### Architecture Notes

- **Test architecture**: Hybrid — mock-based contract tests for guest/API + real Clerk auth for signed-in flows
- **Auth**: Clerk (email + password) — Backend API for test user creation
- **Payments**: Dodo Payments (pure credit model, no subscriptions)
- **Credit tracking**: Admin API + `deduct_credits()` SQL function + idempotency via `webhook_events` table
- **AI**: Google Gemini 3.1 Flash Image generation
