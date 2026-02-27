# Editorial Design Spec — Dossier Lab Redesign

## Reference Mockup
Open `design-explorations/direction-c-editorial.html` in a browser to see the exact visual target. Toggle light/dark mode with the button in the navbar. All exact color values, font sizes, and spacing are defined inline in that file's `<style>` block.

---

## Design Direction Summary

**Bold & Editorial** — inspired by newspaper/magazine design with strong typographic hierarchy, dramatic whitespace, and high-contrast structural elements. The design uses a monochrome palette with 4 tiers of gray for nuanced visual hierarchy, thick rule dividers as primary structural separators, and a serif display font reserved for hero-level headings only.

### Key Principles
1. **Serif for display, sans for everything else** — Instrument Serif is used only at large sizes (page headings, sidebar brand). All body content, source titles, labels, and UI elements use Inter Tight.
2. **Rules over boxes** — sections are separated by horizontal dividers (thick 3px for primary sections, thin 1px for secondary). Cards are replaced by bordered surface containers only where interaction is needed (search, capture form).
3. **4-tier text hierarchy** — primary (headings, titles), secondary (section labels, body), tertiary (metadata, nav items), quaternary (dates, placeholders, decorative numbers). Each tier is clearly distinct.
4. **Warm-tinted neutrals** — grays have a slight warm undertone (ending in warm hex digits like `f3`, `f6`, `e5`) rather than pure neutral gray. This adds subtle warmth without introducing color.
5. **Surface layering** — sidebar, navbar, input fields, and content area each sit on subtly different gray tones to create depth without shadows.

---

## Typography

### Fonts to Load
Replace Geist with two new fonts in `app/layout.tsx`:

| Role | Font | Google Fonts Import | CSS Variable |
|------|------|-------------------|-------------|
| Display (headings) | Instrument Serif | `Instrument_Serif` | `--font-display` |
| Body (everything else) | Inter Tight | `Inter_Tight` | `--font-sans` |
| Monospace (code) | Keep Geist Mono | `Geist_Mono` | `--font-mono` |

### Usage Rules
- **Instrument Serif** (`font-display`): Page-level `<h1>`/`<h2>` headings only (e.g., "Your Knowledge, Organized."), sidebar brand name "Dossier", source row numbers (italic). Never used for body text, source titles, or labels.
- **Inter Tight** (`font-sans`): Everything else — navigation, buttons, source titles, metadata, form labels, badges, section labels.

### Type Scale (from mockup)
| Element | Font | Size | Weight | Letter-spacing | Notes |
|---------|------|------|--------|---------------|-------|
| Page heading | Display | 3.5rem | 400 | -0.03em | Instrument Serif |
| Overline label | Body | 0.6rem | 700 | 0.25em | Uppercase |
| Subtitle | Body | 1rem | 400 | — | tertiary color |
| Section label | Body | 0.65rem | 700 | 0.2em | Uppercase, e.g., "CAPTURE", "RECENT SOURCES" |
| Nav items | Body | 0.78rem | 600 | 0.08em | Uppercase |
| Source title | Body | 0.92rem | 600 | -0.01em | Primary color, truncate with ellipsis |
| Source meta | Body | 0.72rem | 400 | 0.01em | Tertiary color |
| Source date | Body | 0.7rem | 500 | 0.02em | Quaternary color |
| Badge/type label | Body | 0.58rem | 700 | 0.14em | Uppercase, badge bg |
| Button text | Body | 0.68rem | 700 | 0.15em | Uppercase |
| Search input | Body | 1rem | 400 | — | |
| Capture input | Body | 0.92rem | 400 | — | |

---

## Color Tokens

Replace the existing OKLch tokens in `app/globals.css`. The new palette uses hex values with warm undertones. Convert to OKLch if you want to stay consistent with the existing format, but hex is fine for Tailwind v4.

### Light Theme (`:root`)

```
/* Backgrounds — layered surfaces */
--background:        #ffffff    /* Main content area */
--sidebar:           #f6f5f3    /* Sidebar surface — warm off-white */
--navbar:            #fafaf9    /* Navbar surface — barely tinted */
--card:              #f8f7f6    /* Surface containers (capture form, etc.) */
--card-hover:        #f2f1ef    /* Surface hover state */
--input:             #f4f3f1    /* Input field backgrounds */
--input-focus:       #ffffff    /* Input focus state */
--badge:             #eeedeb    /* Badge/tag backgrounds */
--row-hover:         #f9f8f7    /* Table/list row hover */

/* Borders — 3 tiers */
--border-heavy:      #1a1a1a    /* Structural thick rules, sidebar border */
--border:            #d4d3d0    /* Standard borders, thin rules */
--border-light:      #e9e8e5    /* Subtle borders, row separators */

/* Text — 4 tiers */
--foreground:        #0a0a0a    /* Primary: headings, titles, active nav */
--secondary-fg:      #4a4a4a    /* Secondary: section labels, body text */
--muted-foreground:  #8a8a87    /* Tertiary: metadata, inactive nav, type badges */
--quaternary-fg:     #b5b4b0    /* Quaternary: dates, placeholders, row numbers */

/* Inverse */
--primary:           #0a0a0a    /* Button backgrounds */
--primary-foreground:#ffffff    /* Button text */
```

### Dark Theme (`.dark`)

```
/* Backgrounds — layered surfaces */
--background:        #0a0a0a    /* NOT pure black — very dark gray */
--sidebar:           #050505    /* Slightly darker than bg */
--navbar:            #0e0e0e    /* Slightly lighter than bg */
--card:              #111110    /* Surface containers */
--card-hover:        #1a1a18    /* Surface hover */
--input:             #151514    /* Input backgrounds */
--input-focus:       #1c1c1a    /* Input focus */
--badge:             #1e1e1c    /* Badge backgrounds */
--row-hover:         #121211    /* Row hover */

/* Borders */
--border-heavy:      #e8e8e8    /* Structural (not pure white) */
--border:            #2a2a28    /* Standard */
--border-light:      #1e1e1c    /* Subtle */

/* Text */
--foreground:        #f0f0ee    /* Primary (not pure white — warmer) */
--secondary-fg:      #a0a09c    /* Secondary */
--muted-foreground:  #6a6a66    /* Tertiary */
--quaternary-fg:     #444440    /* Quaternary */

/* Inverse */
--primary:           #f0f0ee    /* Button backgrounds */
--primary-foreground:#0a0a0a    /* Button text */
```

### New Token Notes
- **`--quaternary-fg`** is new — doesn't exist in current shadcn setup. Add it to `:root` and `.dark`. Use it for dates, row numbers, placeholders, inactive tabs.
- **`--border-heavy`** is new — used for the sidebar right border (3px) and section thick rules. Map to a Tailwind utility like `border-heavy`.
- **`--border-light`** is new — used for row separators and subtle container borders.
- **Surface tokens** (`--navbar`, `--badge`, `--row-hover`, etc.) are new. Consider whether to add all as CSS variables or just use inline Tailwind arbitrary values.

---

## Structural Changes

### Border Radius
The editorial design uses **no border-radius** on primary UI elements (search bar, capture form, buttons, badges). This is a significant departure from the current 10px base radius. Set:
```
--radius: 0px;
```
Or selectively remove rounding on key components. The sidebar brand logo and user avatar can keep subtle rounding if desired.

### Dividers
Replace shadcn `<Separator>` usage with styled `<hr>` elements:
- **Thick rule** (3px, `border-heavy` color): Between page heading and content, above source list
- **Thin rule** (1px, `border` color): Between sections (search → capture → sources)

### Sidebar
- Width stays at `w-64` (256px) — close to mockup's 240px
- Border-right changes from `border-r` (1px) to `border-r-[3px] border-heavy` (thick structural border)
- Background: `bg-sidebar` (new warm off-white / dark surface)
- Nav items: uppercase, letterspaced, separated by light borders (not background highlight)
- Active state: `text-foreground` (bold text, no background fill). Current `bg-primary text-primary-foreground` pill is removed.
- Brand: inline SVG logo + "Dossier" in Instrument Serif + "LAB" as uppercase micro-label

### Navbar
- Height: `h-[52px]` (slightly shorter than current `h-14`/56px)
- Background: `bg-navbar` (subtle tint, not transparent)
- Content: uppercase letterspaced breadcrumb on left, theme toggle button on right
- Theme toggle: bordered button with uppercase label ("DARK"/"LIGHT"), not icon-only

### Content Area
- Max width: ~920px (`max-w-[920px]`)
- Padding: `px-12 py-16` (48px horizontal, 60px top)
- No card wrappers around sections — use rules to separate

---

## Component-by-Component Changes

### Search Bar
- **Before**: shadcn `<Card>` with `<Input>` inside
- **After**: Borderless container with filled background (`bg-input`), 1px border, search button flush-right with `bg-primary`. No border-radius.

### Capture Tabs
- **Before**: shadcn `<Tabs>` with default styling
- **After**: Uppercase pill buttons with border. Active tab gets `bg-badge` fill + `border-medium`. Inactive tabs are transparent with quaternary text.

### Capture Form
- **Before**: Inside a `<Card>`, standard input + button layout
- **After**: Single bordered surface container (`bg-surface`). Label + input stacked inside, capture button flush-right edge-to-edge. No border-radius.

### Source List (Recent Sources)
- **Before**: Inside a `<Card>`, list of source rows
- **After**: Card-less. Section header is an uppercase micro-label with thick rule below. Source rows are a CSS grid:
  ```
  grid-template-columns: 32px 72px 1fr auto
  ```
  - Column 1: Italic Instrument Serif number (01, 02, ...) in quaternary color
  - Column 2: Uppercase type badge with `bg-badge` fill
  - Column 3: Source title (Inter Tight 600) + meta line (tertiary)
  - Column 4: Date in quaternary color
  - Row hover: `bg-row-hover` background
  - Row separator: 1px `border-light`, last row gets `border-medium`

### Buttons
- **Before**: shadcn `<Button>` with rounded corners
- **After**: No border-radius. Uppercase letterspaced text (0.68rem, weight 700, 0.15em spacing). `bg-primary text-primary-foreground`. Hover: `opacity-85`.

---

## Implementation Sequence

### Phase 1: Theme Tokens & Typography
1. Update `app/layout.tsx` — replace Geist with Instrument Serif + Inter Tight imports
2. Update `app/globals.css` — replace all color tokens (both `:root` and `.dark`), add new tokens (`--quaternary-fg`, `--border-heavy`, `--border-light`, surface tokens), update `--radius` to `0px`, update `--font-sans` and add `--font-display`
3. Verify: app should look different but not broken at this point

### Phase 2: Layout Shell
4. Update `app/(main)/layout.tsx` — sidebar thick border, background tokens, navbar background
5. Update `components/layout/sidebar.tsx` — brand with inline SVG logo + Instrument Serif title, uppercase nav items with letterspaced styling, remove active background pill, add border separators between items
6. Update `components/layout/navbar.tsx` — uppercase breadcrumb, styled theme toggle button, adjust height

### Phase 3: Dashboard Page
7. Update `app/(main)/dashboard/page.tsx` — page heading with Instrument Serif, overline label, subtitle
8. Restyle search bar — filled container, flush button
9. Restyle capture tabs — uppercase bordered pills
10. Restyle capture form — surface container, flush layout
11. Restyle recent sources — remove card wrapper, add thick rule header, CSS grid rows with numbers/badges

### Phase 4: Polish & Remaining Pages
12. Apply consistent typography and spacing to other pages (Knowledge Base, Q&A, Settings, etc.)
13. Ensure all shadcn components pick up new tokens correctly (dialogs, dropdowns, toasts)
14. Test light/dark mode toggle across all pages
15. Mobile responsive check — sidebar drawer, stacked layouts

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `app/layout.tsx` | Font imports (Instrument Serif, Inter Tight) |
| `app/globals.css` | All color tokens, new tokens, radius, font vars |
| `app/(main)/layout.tsx` | Sidebar border, bg tokens, padding |
| `components/layout/sidebar.tsx` | Logo SVG, brand layout, nav styling, active state |
| `components/layout/navbar.tsx` | Height, bg, breadcrumb, theme toggle restyle |
| `app/(main)/dashboard/page.tsx` | Heading hierarchy, section structure, source list grid |
| Various shadcn components | Will mostly inherit from token changes automatically |

---

## What NOT to Change
- **Functionality** — all features stay the same, this is purely visual
- **Component library** — keep using shadcn/ui, just restyle via tokens
- **Responsive breakpoints** — keep existing `lg:` mobile/desktop split
- **Dark mode mechanism** — keep `next-themes` with class-based toggle
- **Icon library** — keep Lucide React
