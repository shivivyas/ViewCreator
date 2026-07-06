# ViewCreator Design System

A minimal, modern design system for an AI-powered social content generation platform. Built with Tailwind CSS v4 and shadcn/ui.

---

## Design Philosophy

Every component follows three principles:

- **Subtle** — nothing shouts. Borders sit at 50% opacity (`border-border/50`), shadows land softly (`shadow-lg hover:shadow-lg hover:shadow-primary/5`), backgrounds blur gently (`bg-background/80 backdrop-blur-lg`).
- **Reactive** — interactive elements whisper back. Cards scale on hover, buttons pulse on load, images zoom on interaction. Feedback is immediate but never aggressive. `duration-200` and `duration-300` transitions throughout.
- **Spacious** — generous whitespace and consistent padding (`px-4 sm:px-6 lg:px-8`) give content room to breathe. Max-width containers (`max-w-7xl`, `max-w-6xl`) prevent line-length fatigue.

---

## Layout System

### Page structure

```
SiteHeader (sticky, z-50, border-b, backdrop-blur-md)
├── brand logo + nav links
└── auth buttons / user menu

Page Content (flex-1)
├── Sticky sub-header (z-10, backdrop-blur-lg, border-b)
│   ├── title icon + heading
│   └── actions: search, sort, upload
├── Category / filter bar (horizontal scroll)
└── Content grid (responsive columns)

SiteFooter
```

### Containers

| Context | Class | Max width |
|---------|-------|-----------|
| Landing page | `mx-auto max-w-6xl px-6` | 1152px |
| App pages (templates, generate) | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` | 1280px |
| Sticky header | `w-full` with inner `mx-auto max-w-7xl` | 1280px |

### Responsive breakpoints

| Alias | Width | Used for |
|-------|-------|----------|
| `sm` | 640px | `sm:grid-cols-3`, horizontal layouts |
| `md` | 768px | `md:grid-cols-2`, sidebar splits |
| `lg` | 1024px | `lg:grid-cols-4`, desktop nav |
| `xl` | 1280px | `xl:grid-cols-5`, wide grids |

### Grid patterns

```css
/* Template gallery — density-first */
grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4

/* Feature cards — balanced */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4

/* Generated image output */
grid-cols-1 sm:grid-cols-2 gap-4
```

---

## Color System

Full oklch palette defined in `globals.css`. All component colors are semantic — never use raw hex.

### Token reference

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page, modal backgrounds |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Body text, headings |
| `card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Card, modal surfaces |
| `primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Buttons, active states |
| `muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Subtle backgrounds, disabled states |
| `muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary text, placeholders |
| `border` | `oklch(0.922 0 0)` | `.border/50` is default | Borders, dividers, strokes |
| `destructive` | `oklch(0.577 0.245 27.325)` | — | Delete actions, destructive buttons |

### Border convention

Every bordered element uses **50% opacity** by default to keep the UI airy:

```tsx
border border-border/50        // default state
hover:border-border             // full opacity on hover
dark:border-border/50           // consistent in dark mode
```

### Overlay gradients

```css
/* Template card bottom fade */
bg-gradient-to-t from-black/70 via-black/20 to-transparent

/* Landing page hero glow */
bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%)]
dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]
```

---

## Typography

**Primary font:** Geist (loaded via `next/font/google` as `--font-sans`)
**Mono font:** Geist Mono (loaded as `--font-geist-mono`)

### Scale

| Level | Class | Size/weight | Usage |
|-------|-------|-------------|-------|
| Display | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` | 36→48→60px | Hero headlines |
| H1 | `text-3xl sm:text-4xl font-semibold tracking-tight` | 30→36px | Section headers |
| H2 | `text-2xl font-bold` | 24px | Detail view titles |
| H3 | `text-lg font-semibold` | 18px | Card titles, modal headers |
| Body | `text-sm` | 14px | Default body, descriptions |
| Caption | `text-xs` | 12px | Tags, metadata, tooltips |
| Micro | `text-[10px]` | 10px | Badges, small labels |

### Line clamping

```tsx
line-clamp-1    // single-line truncation (card titles)
line-clamp-2    // two-line truncation (descriptions)
text-pretty     // prevent orphaned words (hero copy)
text-balance    // balanced headline wrapping
```

---

## Spacing & Sizing

### Vertical rhythm

| Context | Padding |
|---------|---------|
| Page sections | `py-20` |
| Hero area | `py-20 sm:py-28` |
| Grid areas | `pb-8` |
| Cards inside grid | `px-3 py-2.5` (footer) |
| Modal forms | `p-5 space-y-5` |

### Component heights

| Element | Height |
|---------|--------|
| Site header | `h-16` |
| App sticky header | `h-16` |
| Buttons (default) | `h-9` / `h-10` |
| Inputs | `h-9` |
| Small buttons | `h-7` / `h-8` |
| Category pills | `py-1.5` |

### Icon sizing

```tsx
size-3    // 12px — upvote thumbs, inline indicators
size-3.5  // 14px — small action icons
size-4    // 16px — default icon size
size-5    // 20px — section headers, feature icons
size-7    // 28px — empty state
size-8    // 32px — spinner, loading
size-12   // 48px — large empty state icons
```

---

## Border Radius System

Defined in `globals.css` using the `--radius` token (default: `0.625rem` / 10px).

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `calc(var(--radius) * 0.6)` | Small badges (3.75px) |
| `rounded-md` | `calc(var(--radius) * 0.8)` | Default interactive elements (5px) |
| `rounded-lg` | `var(--radius)` | Cards, inputs (6.25px) |
| `rounded-xl` | `calc(var(--radius) * 1.4)` | Modals, buttons, upload dropzone (8.75px) |
| `rounded-2xl` | `calc(var(--radius) * 1.8)` | Template cards, detail modals (11.25px) |
| `rounded-full` | `9999px` | Pills, category chips, icon buttons |

### Radius by component

| Component | Class |
|-----------|-------|
| Template cards | `rounded-2xl` |
| Modal containers | `rounded-2xl` |
| Input fields | `rounded-xl` |
| Buttons (standard) | `rounded-xl` |
| Search input | `rounded-xl` |
| Upload dropzone | `rounded-xl` |
| Action icon buttons | `rounded-full` |
| Category filter pills | `rounded-full` |
| Avatar | `rounded-lg` |

---

## Component Library

### Sticky sub-header

Used on app pages (templates, etc.) with a backdrop blur and bottom border. Contains the page title, search, sort, and primary action.

```tsx
<div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex items-center gap-4 h-16">
      {/* title icon */}
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="size-4 text-primary" />
      </div>
      <h1 className="text-lg font-semibold">Page Title</h1>
      {/* search, sort, action button */}
    </div>
  </div>
</div>
```

### Category pills

A horizontally scrollable row of filter chips. Active pill fills the foreground; inactive pills sit in `bg-muted`.

```tsx
<div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
  <button className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200
    {/* active */}
    bg-foreground text-background shadow-sm
    {/* inactive */}
    bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground
  ">
    Category
  </button>
</div>
```

### Template cards

Full-bleed image cards with overlay text, hover actions, and a slim footer. Designed for browsing density.

```
┌──────────────────┐
│                   │
│   [image]         │ ← aspect-[4/5], object-cover
│                   │
│   Title           │ ← gradient overlay bottom
│   Description     │
│          ┌──────┐ │
│          │ Use  │ │ ← opacity-0, shows on hover
│          └──────┘ │
├───────────────────┤
│ 👍 12    tag  tag │ ← px-3 py-2.5 footer
└───────────────────┘
```

```tsx
// Key classes
rounded-2xl overflow-hidden bg-card
border border-border/50 hover:border-border
hover:shadow-lg hover:shadow-primary/5
transition-all duration-300

// Image area
relative aspect-[4/5] bg-muted overflow-hidden

// Image itself
absolute inset-0 w-full h-full object-cover
transition-transform duration-500 group-hover:scale-105

// Bottom overlay
absolute inset-x-0 bottom-0
bg-gradient-to-t from-black/70 via-black/20 to-transparent
p-4 pt-12

// Title & description
text-sm font-semibold text-white line-clamp-1
text-xs text-white/70 line-clamp-1
drop-shadow-sm

// Hover action overlay
absolute inset-0 flex items-center justify-center
opacity-0 group-hover:opacity-100 transition-all duration-200
bg-black/30

// Hover button
variant="secondary" size="sm"
className="shadow-lg backdrop-blur-md bg-white/90 text-black hover:bg-white"
```

### Upvote button

A subtle toggle pill in the card footer. Active state uses `bg-primary/10` with filled icon.

```tsx
<Button variant="ghost" size="sm"
  className={`h-7 gap-1 px-2 text-xs rounded-full ${
    active
      ? "bg-primary/10 text-primary hover:bg-primary/15"
      : "text-muted-foreground hover:text-foreground"
  }`}
>
  <ThumbsUp className={`size-3 ${active ? "fill-current" : ""}`} />
  <span className="tabular-nums font-medium">{count}</span>
</Button>
```

### Modals

Overlays use a `bg-black/50 backdrop-blur-sm` backdrop with a centered `rounded-2xl` container.

| Modal type | Width | Structure |
|------------|-------|-----------|
| Upload | `max-w-lg` | Header (title + description + close) → Form body → Submit |
| Detail (template view) | `max-w-3xl` | 55% image + 45% info panel, `flex-col md:flex-row` |
| Delete confirmation | `max-w-sm` | Destructive icon → Title → Body text → Cancel + Delete |

```tsx
// Template detail modal — side-by-side layout
<div className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl
                border border-border/50 overflow-hidden
                flex flex-col md:flex-row max-h-[85vh]
                animate-in zoom-in-95 duration-200">
  {/* Image: 55% */}
  <div className="md:w-[55%] bg-muted/30 flex items-center justify-center p-5
                  border-b md:border-b-0 md:border-r border-border/50">
    <img className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl" />
  </div>
  {/* Info: 45% */}
  <div className="md:w-[45%] p-6 flex flex-col">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex flex-wrap gap-1.5">{/* tags */}</div>
      <Button variant="ghost" size="icon" onClick={close} className="h-8 w-8 rounded-full" />
    </div>
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{description}</p>
    <div className="mt-auto pt-5 border-t border-border/50">{/* actions */}</div>
  </div>
</div>
```

### Sort dropdown

Uses shadcn `Select` with a minimal trigger style.

```tsx
<Select value={sortOption} onValueChange={setSortOption}>
  <SelectTrigger className="w-36 h-9 text-sm rounded-xl bg-muted/40 border-border/50">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {options.map(opt => (
      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Upload dropzone

A dashed-border area that transitions to solid on hover/drag. Shows either an empty state (icon + text) or a preview with overlay remove button.

```tsx
<div className="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden
                {empty ? 'p-6' : 'p-1'}
                {isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-border bg-muted/20'}">
  {/* empty state */}
  <div className="flex flex-col items-center justify-center py-4 text-center">
    <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-3">
      <Plus className="size-5 text-muted-foreground" />
    </div>
    <span className="text-sm font-medium text-foreground">Choose an image or video</span>
    <span className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</span>
  </div>
  {/* or: preview with overlay close button */}
</div>
```

### Empty state

Centered vertical layout with icon container, message, and optional action.

```tsx
<div className="flex flex-col items-center justify-center py-24 text-center">
  <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
    <Icon className="size-7 text-muted-foreground" />
  </div>
  <p className="text-base font-medium text-foreground">Message</p>
  <p className="text-sm text-muted-foreground mt-1 max-w-sm">Subtext</p>
</div>
```

### Search input

Icon-left input with clear button on value. The search icon sits absolute-left; input has `pl-9` padding.

```tsx
<div className="relative w-full max-w-xs">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
  <Input placeholder="Search..."
    className="pl-9 h-9 text-sm bg-muted/40 border-border/50 focus-visible:bg-background rounded-xl" />
  {value && (
    <Button variant="ghost" size="icon"
      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
      onClick={clear}>
      <X className="size-3.5" />
    </Button>
  )}
</div>
```

---

## Motion & Interaction Design

### Transition tokens

```css
/* Hover transitions */
transition-all duration-200    /* buttons, links, pills */
transition-all duration-300    /* cards, modals */
transition-transform duration-500  /* image zoom on hover */
transition-opacity duration-200    /* overlay reveals */
```

### State patterns

| Interaction | Pattern |
|-------------|---------|
| Card hover | Image `scale-105`, card `shadow-lg hover:shadow-primary/5`, border `border-border/50` → `border-border` |
| Hover overlay | `opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200` |
| Image zoom | `transition-transform duration-500 group-hover:scale-105` |
| Modal entrance | `animate-in zoom-in-95 duration-200` (via `tw-animate-css`) |
| Spinner | `animate-spin` on `Loader2` icon |
| Sticky header blur | `bg-background/80 backdrop-blur-lg` |

### Loading states

- **Page load:** Centered `Loader2` spinner, `size-7` for inline, `size-8` for full-page
- **Button loading:** `Loader2 size-4 mr-2 animate-spin` prepended to button text
- **Skeleton:** Not yet implemented — use spinner for now

---

## AI Studio — Image Generation Styles

Each style applies a distinct visual treatment to generated images. Passed as the `style` parameter to the `/api/generate` endpoint.

### Style reference

| Style | Best for | Visual effect |
|-------|----------|---------------|
| **Product Photo** | SaaS dashboards, tech products, UI mockups | Clean, professional shots with high clarity |
| **Corporate** | Annual reports, professional services, B2B | Formal, polished, conservative aesthetic |
| **Minimal** | Modern startups, minimalist brands | Clean compositions with negative space |
| **Modern** | Gen-Z brands, social campaigns, trendy products | Bold colors, dynamic compositions |
| **Luxury** | Premium brands, high-ticket services | Rich colors, sophisticated layouts |
| **Dark** | Gaming, fintech, dark mode UIs | Dark backgrounds with accent colors |

### Quick selection guide

- **Tech/SaaS products** → Product Photo or Modern
- **Enterprise/B2B** → Corporate or Product Photo
- **Startup/Trendy** → Modern or Minimal
- **Premium/Luxury** → Luxury
- **Dark mode / Tech** → Dark
- **Simplicity** → Minimal

---

## Aspect Ratio Reference

Used for both image generation output and layout decisions.

| Ratio | Name | Best for | Example size |
|-------|------|----------|-------------|
| `1:1` | Square | Instagram feed, LinkedIn, product thumbnails | 1080×1080 |
| `4:5` | Vertical Portrait | Instagram ads, mobile ad units | 1080×1350 |
| `9:16` | Full Mobile Story | TikTok, Reels, YouTube Shorts | 1080×1920 |
| `16:9` | Wide Landscape | YouTube, web banners, presentations | 1920×1080 |
| `2:3` | Pinterest Pin | Pinterest, tall vertical content | 1000×1500 |

### Platform → Ratio mapping

| Platform | Recommended ratio |
|----------|------------------|
| Instagram feed | 1:1 |
| Instagram Reels | 9:16 |
| LinkedIn feed | 1:1 |
| Twitter / X | 16:9 |
| TikTok | 9:16 |
| YouTube thumbnails | 16:9 |
| Pinterest pins | 2:3 |
| Facebook ads | 4:5 |

---

## Best Practices

### Do

- Use `border-border/50` on every bordered element — full opacity borders look heavy.
- Keep sticky headers consistent: `bg-background/80 backdrop-blur-lg border-b border-border/50`.
- Right-align actions in headers: `flex-1` spacer → search → sort → primary button.
- Use `rounded-2xl` for cards and modals, `rounded-xl` for inputs and buttons.
- Stack empty states vertically with a `size-16 rounded-2xl` icon container.
- Use `tabular-nums` on numbers in tight layouts (upvote counts, stats).

### Don't

- Don't use raw sidebar layouts — prefer horizontal filter bars.
- Don't stack multiple borders (card border + card-header border + card-footer border). Full-bleed images remove one layer entirely.
- Don't use full-opacity borders (`border-border` without `/50`) unless hovered.
- Don't hardcode colors — always use semantic tokens (`bg-muted`, `text-muted-foreground`, etc.).
- Don't forget `shrink-0` on flex children that shouldn't collapse (icons, badges).

