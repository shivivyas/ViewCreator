# Gemini 3.1 Flash Image — AI Generation Features

> ViewCreator's AI Studio uses **Gemini 3.1 Flash Image (Nano Banana 2)** for text-to-image and video generation.
> All parameter structures follow the official [Google Gemini API reference](https://ai.google.dev/gemini-api/docs/image-generation) (June 2026).

---

## Configuration Overview

The generation request supports these parameters:

```typescript
{
  prompt,           // Text prompt
  style,            // Visual style preset
  aspectRatio,      // 1 of 11 ratios
  numberOfImages,   // 1–4 images per generation
  quality,          // "standard" | "premium"
  imageSize,        // 512 | 1K | 2K | 4K
  thinkingLevel,    // "minimal" (Fast) | "high" (Deep)
  referenceImages   // Array of up to 3 base64 data URIs
}
```

### What Changed (from the original v1 endpoint)

| Before | After |
|--------|-------|
| `referenceImage` (single) | `referenceImages[]` (up to 3) |
| No resolution control | `imageSize`: 512, 1K, 2K, 4K |
| No thinking control | `thinkingLevel`: minimal, high |
| 5 aspect ratios | 11 aspect ratios |

Backward compatibility is maintained — all new parameters have sensible defaults matching the old behavior.

---

## Features

### 1. Resolution Control (`imageSize`)

| Size | Native Resolution | Token Cost | Latency | Best For |
|------|-------------------|-----------|---------|----------|
| **512** | ~512×512 | 1× | 5–10s | Previews, thumbnails, icons |
| **1K** (default) | ~1024×1024 | 1× | 10–15s | Web, social media, e-commerce |
| **2K** | ~2048×2048 | ~2× | 20–30s | Marketing assets, print preparation |
| **4K** | ~4096×4096 | ~4× | 30–40s | High-res print, large-format displays |

```typescript
// API: responseFormat.image.imageSize
config: {
  responseFormat: {
    image: {
      aspectRatio: "16:9",
      imageSize: "2K"
    }
  }
}
```

### 2. Extended Aspect Ratios (11 total)

**Original (5):** 1:1, 4:5, 9:16, 16:9, 2:3
**New (6):** 3:2, 4:3, 3:4, 5:4, 1:4, 4:1

| Ratio | Platform / Use |
|-------|---------------|
| 1:1 | Instagram posts, LinkedIn profiles |
| 4:5 | Instagram ads, mobile app marketing |
| 9:16 | TikTok, Reels, YouTube Shorts |
| 16:9 | YouTube thumbnails, presentations |
| 2:3 | Pinterest pins |
| 3:2 | Classic landscape, print |
| 4:3 | Standard screen, institutional |
| 3:4 | Portrait orientation |
| 5:4 | Balanced frames |
| 1:4 | Ultra-tall banners |
| 4:1 | Ultra-wide banners |

### 3. Thinking Level (`thinkingLevel`)

| Level | Latency | Token Cost | Best For |
|-------|---------|-----------|----------|
| **minimal** (default, "Fast") | 10–15s | 1× | Quick iterations, social, brainstorming |
| **high** ("Deep") | 30–45s | ~1.5× | Complex prompts, professional assets, precision |

```typescript
config: {
  thinkingConfig: {
    thinkingLevel: "high",
    includeThoughts: false  // Set true to see reasoning process
  }
}
```

> **Note:** Thinking always occurs regardless of visibility. `includeThoughts` only controls whether interim images are returned.

### 4. Multiple Reference Images (up to 3)

```typescript
contents: [
  { text: "Your prompt" },
  { inlineData: { mimeType: "image/jpeg", data: ref1 } },
  { inlineData: { mimeType: "image/png", data: ref2 } },
  { inlineData: { mimeType: "image/jpeg", data: ref3 } }
]
```

**Use cases:** Style blending, character consistency, object reference, scene composition.
**Token overhead:** ~0.2× per reference image.

---

## UI Controls

All controls live in the **Parameters panel** on `/generate`:

| Control | Type | Location |
|---------|------|----------|
| Resolution | 4-button selector (512 / 1K / 2K / 4K) | Parameters → Resolution |
| References | Upload zone (shows count, max 3) | Parameters → References |
| Thinking | Fast ↔ Deep toggle | Parameters → Thinking |
| Aspect Ratio | 11-ratio grid with tooltips | Parameters → Aspect Ratio |
| Quality | Standard ↔ Premium toggle | Parameters → Quality |
| Image Count | 1–4 selector | Parameters → Count |

---

## Recommended Workflows

### Fast Social Media
```
Thinking: Fast  ·  Resolution: 1K  ·  Ratio: 1:1  ·  Images: 4  ·  Quality: Off
Result: 4 images in ~20–30s
```

### Professional Marketing
```
Thinking: Deep  ·  Resolution: 2K  ·  Ratio: 4:5  ·  Images: 2  ·  Quality: Premium  ·  Refs: brand assets
Result: 2 high-quality images in ~40–50s
```

### Print-Ready Masterpiece
```
Thinking: Deep  ·  Resolution: 4K  ·  Ratio: match print  ·  Images: 1  ·  Quality: Premium  ·  Refs: style guides
Result: 1 exceptional image in ~50–60s
```

---

## Token Usage

```
Base tokens × Resolution multiplier × Thinking multiplier × (1 + 0.2 × referenceCount)
```

| Example | Base | Resolution | Thinking | Refs | ≈Cost |
|---------|------|-----------|----------|------|-------|
| 1K default | 1 | ×1 | ×1 | 0 | 1 unit |
| 2K + deep thinking | 1 | ×2 | ×1.5 | 0 | 3 units |
| 4K + deep + 3 refs | 1 | ×4 | ×1.5 | ×1.6 | ~9.6 units |

---

## Performance Benchmarks

| Scenario | Latency |
|----------|---------|
| Fast: 1K, minimal, 4 images | ~15–20s |
| Standard: 2K, minimal, 2 images | ~20–30s |
| Quality: 2K, deep, 2 images | ~40–50s |
| Premium: 4K, deep, 1 image | ~50–60s |

---

## Tips

1. **References first** — Upload reference images before generating
2. **Iterate fast, finalize deep** — Generate 4 at 1K Fast, then refine best at 2K+ Deep
3. **Quality toggle** adds ~50 words to the prompt automatically — use "Premium" for final output
4. **Aspect ratio** — Choose based on target platform, not visual preference
5. **4K is worth it only for final, print-bound assets**

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Too slow / timeout | Lower resolution, use Fast thinking |
| Quality not as expected | Toggle Premium + use Deep thinking |
| Wrong aspect ratio | Try Deep thinking for better composition |
| References not applied | Ensure uploaded before generating |
| Character inconsistency | Use 1–2 clear reference images, avoid 3+ for people |

---

## Model Info

- **Current:** Gemini 3.1 Flash Image (Nano Banana 2) — June 2026
- **Capabilities:** Text, images, videos (input) → high-fidelity outputs
- **Alternates:** Gemini 3 Pro Image (complex reasoning), Gemini 2.5 Flash Image (speed-optimized, older)

---

## Files Involved

| File | Role |
|------|------|
| `viewcreator-ui/src/app/api/generate/route.ts` | API route — handles `imageSize`, `thinkingLevel`, `referenceImages[]` |
| `viewcreator-ui/src/app/generate/page.tsx` | UI — resolution selector, thinking toggle, multi-reference upload |
| `viewcreator-ui/src/types/index.ts` | TypeScript types for generation parameters |

> **Implementation completed:** June 22, 2026. Backward compatible. Full TypeScript compliance. ✅
