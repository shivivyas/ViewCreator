# AI Studio - Enhanced Features Quick Reference

## New Controls in the UI

### Resolution Selector
**Location:** Parameters panel → "Resolution" section
**Options:** 512 | 1K | 2K | 4K

- **512**: Smallest/fastest (~0.5K pixels)
- **1K**: Default balanced quality *(recommended for most)*
- **2K**: Double resolution, better detail
- **4K**: Maximum quality, largest file size

*Token cost increases with resolution (512=1x, 1K=1x, 2K=2x, 4K=4x)*

---

### Reference Images (Multiple)
**Location:** Parameters panel → "References" section
**Capacity:** Up to 3 images

- Click upload zone to add images
- Display count shows current/max (e.g., "1/3")
- Hover over any reference to remove
- "Clear all" button removes all references at once
- Multiple files can be selected at once

**Use for:**
- Brand logo/color palette consistency
- Character appearance reference
- Style/artistic direction
- Scene composition elements

---

### Thinking Level Toggle
**Location:** Parameters panel → "Thinking" section
**Toggle:** Fast ↔ Deep

- **Fast**: Minimal reasoning, quick generation (~10-15s)
  - Good for: Rapid iterations, social media, brainstorming
  - Lower latency, standard token cost
  
- **Deep**: Complex reasoning, refined composition (~30-45s)
  - Good for: Professional assets, complex instructions, detailed work
  - Higher latency, ~1.5x token cost

---

### Extended Aspect Ratios
**Location:** Parameters panel → "Aspect Ratio" section
**Available:** 11 ratios total

**Hover any ratio button to see:**
- Recommended use cases
- Platform optimization (Instagram, TikTok, etc.)
- Typical output dimensions

**Common selections:**
- Social media: 1:1 (square)
- Mobile ads: 4:5 (portrait)
- Desktop: 16:9 (landscape)
- Pinterest: 2:3 (tall)
- New options: 1:4, 4:1, 3:2, 3:4, 4:3, 5:4

---

## Recommended Workflows

### Workflow 1: Fast Social Media Content
1. Set **Thinking**: Fast
2. Set **Resolution**: 1K
3. Set **Aspect Ratio**: 1:1 (Instagram)
4. Set **Images**: 4 (test variations)
5. Toggle **Quality**: Off (Standard)
6. Result: 4 images in ~20-30 seconds

### Workflow 2: Professional Marketing Assets
1. Set **Thinking**: Deep
2. Set **Resolution**: 2K
3. Set **Aspect Ratio**: 4:5 (mobile-friendly)
4. Set **Images**: 2 (curated options)
5. Upload **References**: Brand guidelines
6. Toggle **Quality**: On (Premium)
7. Result: 2 high-quality images in ~40-50 seconds

### Workflow 3: Print-Ready Masterpiece
1. Set **Thinking**: Deep
2. Set **Resolution**: 4K
3. Set **Aspect Ratio**: Match your print size
4. Set **Images**: 1 (precision craft)
5. Upload **References**: Multiple style/composition guides
6. Toggle **Quality**: On (Premium)
7. Enhance **Prompt**: Add "ultra-detailed, masterpiece, professional"
8. Result: 1 exceptional image in ~50-60 seconds

---

## Parameter Combinations Guide

### ✅ Recommended Combinations

| Goal | Resolution | Thinking | Quality | Images |
|------|-----------|----------|---------|--------|
| Quick preview | 1K | Fast | Off | 4 |
| Social media | 1K | Fast | Off | 2-4 |
| Web assets | 2K | Fast | On | 1-2 |
| Marketing | 2K | Deep | On | 1-2 |
| Print/Display | 4K | Deep | On | 1 |
| Icon/Thumbnail | 512 | Fast | Off | 4+ |

---

## Understanding Token Usage

**Token billing formula:**
```
Base tokens × Resolution multiplier × Thinking multiplier × Reference count
```

**Examples:**
- 1K default generation: 1 base unit
- 2K with high thinking + 2 refs: ~3 units
- 4K with high thinking + 3 refs: ~6 units

*Think/reference overheads compound multiplicatively, not additively*

---

## Tips for Best Results

1. **References First**: Upload references before generating if using them
2. **Aspect Ratio Matters**: Choose based on where image will be used
3. **Quality Toggle**: "Premium" adds ~50 words to prompt automatically
4. **Thinking Level**: Use "Fast" for iteration, "Deep" for final asset
5. **Resolution vs Time**: 4K adds ~25-30s, worth it only for final output
6. **Multiple Images**: Generate 4 at 1K quickly, then refine best at 4K with Deep thinking

---

## Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Submit form (if input focused)
- **ESC**: Clear error message (if displayed)

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Too many generations queued | Use fewer images per generation |
| Quality not as expected | Toggle "Premium" + use "Deep" thinking |
| Wrong aspect ratio output | Verify ratio selected, try Deep thinking |
| References not applied | Ensure uploaded before generating |
| Slow generation | Try lower resolution (1K instead of 2K) |
| Generation timeout | Use Fast thinking + lower resolution |

---

## Model Information

**Current Model:** Gemini 3.1 Flash Image (Nano Banana 2)
- Launch: June 2026
- Capabilities: Text, images, videos (input), high-fidelity outputs
- Token efficiency: Optimized for developer/production use
- Quality tier: Advanced reasoning with thinking process

**Alternative Models Available:**
- Gemini 3 Pro Image (Nano Banana Pro) - More complex reasoning
- Gemini 2.5 Flash Image (Nano Banana) - Speed-optimized, older generation

