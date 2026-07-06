# API Enhancements: Gemini 3.1 Flash Image Integration

## Overview
The AI Studio has been enhanced with the latest Gemini 3.1 Flash Image (Nano Banana 2) capabilities from the official Google Gemini API reference. These enhancements provide professional-grade image generation with advanced control over output quality, composition, and thinking depth.

---

## New Features & Capabilities

### 1. **Resolution Control (Image Size)**
Generate images at different resolutions based on your quality and performance needs.

**Available Options:**
- **512 (0.5K)**: Fast generation, compact file size (~100-150KB)
  - Best for: Quick previews, thumbnails, social media icons
  - Token cost: Lowest
  - Latency: Fastest (~5-10s)

- **1K (Default)**: Balanced quality and performance (1024×1024 native)
  - Best for: Standard web use, social media posts, e-commerce
  - Token cost: Standard
  - Latency: ~10-15s

- **2K**: High-quality output (2048×2048 native)
  - Best for: Print-ready graphics, high-resolution marketing assets, product photography
  - Token cost: Higher (approximately 2x)
  - Latency: ~20-30s

- **4K**: Maximum quality output (4096×4096 native)
  - Best for: Ultra-high-fidelity assets, professional print, large-format displays
  - Token cost: Highest (approximately 4x)
  - Latency: ~30-40s

**API Structure:**
```typescript
responseFormat: {
  image: {
    aspectRatio: "16:9",
    imageSize: "2K" // or "512", "1K", "4K"
  }
}
```

---

### 2. **Extended Aspect Ratio Support**
11 aspect ratio options now available for any composition need:

**Standard Ratios (Existing):**
- **1:1** - Square (Instagram posts, LinkedIn profiles)
- **4:5** - Mobile portrait (Instagram ads, mobile app marketing)
- **9:16** - Mobile story (TikTok, Instagram Reels, YouTube Shorts)
- **16:9** - Widescreen (YouTube, presentations, web banners)
- **2:3** - Pinterest (tall vertical designs, Pinterest pins)

**New Extended Ratios:**
- **3:2** - Classic landscape (presentations, print, photo gallery)
- **4:3** - Standard screen (traditional monitor ratio, institutional content)
- **3:4** - Portrait variant (vertical photography, portrait orientation)
- **5:4** - Classic monitor (older display standard, balanced frames)
- **1:4** - Ultra-tall (vertical banners, narrow columns, story strips)
- **4:1** - Ultra-wide (panoramic, extreme horizontal banners)

**API Configuration:**
```typescript
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image",
  contents: prompt,
  config: {
    responseFormat: {
      image: {
        aspectRatio: "3:2" // Any of the 11 supported ratios
      }
    }
  }
});
```

---

### 3. **Thinking Level Control (Quality vs Speed Trade-off)**
Balance image quality and reasoning depth against generation latency.

**Thinking Levels:**

**Minimal (Fast - Default)**
- **Thinking depth**: Basic composition planning
- **Latency**: 10-15 seconds
- **Best for**: Quick iterations, batch generation, time-sensitive workflows
- **Quality**: Good to very good
- **Use case**: Marketing iterations, social media content, rapid prototyping

**High (Deep Reasoning)**
- **Thinking depth**: Complex multi-step reasoning, detailed composition refinement
- **Latency**: 30-45 seconds (approx. 2-3x longer)
- **Best for**: Complex prompts, professional asset production, precision requirements
- **Quality**: Excellent to exceptional
- **Use case**: Professional marketing assets, detailed instructions, intricate compositions

**Implementation:**
```typescript
config: {
  thinkingConfig: {
    thinkingLevel: "high", // or "minimal"
    includeThoughts: false  // Set true to see reasoning process
  }
}
```

**Important:** Thinking tokens are billed regardless of the visibility setting. The model's reasoning always occurs; `includeThoughts` only controls whether you see the interim images.

---

### 4. **Multiple Reference Images (Up to 3)**
Provide multiple reference images for better compositional control and object consistency.

**Capabilities:**
- Upload up to **3 reference images** simultaneously
- Mix different visual references for blended aesthetics
- Maintain character consistency across references
- Combine style references with object references
- Visual UI shows thumbnails of all uploaded references

**Use Cases:**
1. **Product Mockup**: Reference image of a product → Wear it on a model reference
2. **Character Consistency**: Maintain the same person's appearance across variations
3. **Style Blending**: Combine two different artistic styles in one image
4. **Scene Composition**: Reference multiple elements for a cohesive scene

**API Structure:**
```typescript
const contents = [
  { text: prompt },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageData1
    }
  },
  {
    inlineData: {
      mimeType: "image/png",
      data: base64ImageData2
    }
  },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageData3
    }
  }
];
```

---

## Enhanced Workflow

### Complete Generation Request Flow

**Example 1: Professional Product Shot (High Quality)**
```
Prompt: "Create a luxury product photograph of a ceramic coffee mug"
Style: Luxury
Aspect Ratio: 4:5 (mobile-friendly)
Image Size: 2K (high-quality print-ready)
Thinking Level: High (professional assets)
References: Brand logo + packaging design
Quality: Premium
Count: 2 images
```

**Example 2: Social Media Content (Fast Iteration)**
```
Prompt: "Modern minimalist workspace setup"
Style: Modern
Aspect Ratio: 1:1 (square Instagram post)
Image Size: 1K (standard web)
Thinking Level: Minimal (quick preview)
References: Brand color palette
Quality: Standard
Count: 4 images (A/B testing variants)
```

**Example 3: Complex Professional Asset (Deep Reasoning)**
```
Prompt: "Create a 3-panel comic in noir style with high-contrast inks"
Style: Dark
Aspect Ratio: 16:9 (widescreen)
Image Size: 4K (print or high-res display)
Thinking Level: High (complex composition)
References: Character reference + art style guide
Quality: Premium
Count: 1 image (precision craft)
```

---

## Configuration Examples

### API Request with All New Features
```typescript
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image",
  contents: [
    { text: "Your detailed prompt here" },
    { inlineData: { mimeType: "image/jpeg", data: ref1 } },
    { inlineData: { mimeType: "image/png", data: ref2 } }
  ],
  config: {
    responseModalities: ["IMAGE"],
    responseFormat: {
      image: {
        aspectRatio: "16:9",
        imageSize: "2K"
      }
    },
    thinkingConfig: {
      thinkingLevel: "high",
      includeThoughts: false
    }
  }
});
```

---

## Performance & Token Usage

| Feature | Token Impact | Latency |
|---------|-------------|---------|
| Base generation (1K) | 1x | ~10-15s |
| +2K resolution | ~2x | +10-15s |
| +4K resolution | ~4x | +20-25s |
| +High thinking | ~1.5x | +15-30s |
| +Reference image | +0.2x per image | +2-3s per image |
| +Multiple outputs | Linear | (proportional to count) |

---

## Best Practices

### Resolution Selection
- **Web/Social**: 1K (balanced)
- **Marketing Assets**: 2K (versatile, printable)
- **Print/Large Format**: 4K (maximum quality)
- **Rapid Iteration**: 512 (fast feedback)

### Thinking Level Selection
- **Production**: Use "high" for complex requirements
- **Brainstorming**: Use "minimal" for speed
- **Hybrid**: Generate multiple low-quality previews (minimal), then refine winner (high)

### Reference Images
- **Quantity**: Start with 1-2, add 3rd only if needed
- **Quality**: Use clear, well-lit reference images
- **Relevance**: Ensure references relate directly to prompt

### Aspect Ratio Strategy
1. Know target platform first
2. Consider viewing context (mobile vs desktop)
3. Test multiple ratios for flexibility
4. Pin successful ratios for brand consistency

---

## Limitations & Notes

1. **Thinking process**: Always occurs regardless of settings; token cost applies either way
2. **Image count**: Model may not always generate exact count requested (mitigated with parallel requests)
3. **Character consistency**: Best with 1-2 character references; scales to 3+ for object references
4. **People in Image Search**: Grounding with Google Image Search cannot search for real-world people

---

## What's Coming (Gemini Roadmap)

- **Video-to-Image**: Generate from YouTube URLs or local video files
- **Google Search Grounding**: Real-time data integration (weather, news, stock charts)
- **Batch API**: High-volume generation with 24h turnaround
- **Enhanced Character Consistency**: Up to 5 character references

---

## API Reference Documentation
This implementation follows the official Google Gemini API reference: https://ai.google.dev/gemini-api/docs/image-generation

All parameter structures and configurations are aligned with Gemini 3.1 Flash Image model specifications as of June 2026.
