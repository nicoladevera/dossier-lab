# Dossier AI Icon Assets

Production icon assets for the D Monogram (Variant A — Circuit Traces).

## Quick Reference

| Use Case | File | Notes |
|---|---|---|
| In-app (sidebar, headers) | `standalone/icon-adaptive.svg` | Uses `currentColor`, auto light/dark |
| Browser favicon | `favicon/favicon.svg` | Uses `currentColor`, auto light/dark |
| PWA manifest (192px) | `app-icon/app-icon-192-dark-bg.svg` | White on black |
| PWA manifest (512px) | `app-icon/app-icon-dark-bg.svg` | White on black |
| App store listing | `app-icon/app-icon-dark-bg.svg` | 512px, white on black |
| Social/OG image | `app-icon/app-icon-dark-bg.svg` | Works well at any size |

## Directory Structure

```
production/
├── standalone/          Transparent background, for embedding in UI
├── app-icon/            Rounded background, for app stores & PWA
└── favicon/             Browser tab icons
```

## Standalone Icons

Transparent background. Use these when the icon sits inside your own UI (sidebar brand, page headers, loading screens).

**Adaptive (recommended for most in-app use):**
- `icon-adaptive.svg` — Uses `currentColor` so it inherits the parent element's text color. Works in both light and dark mode without swapping files.

**Size-optimized variants** — The icon progressively simplifies detail at smaller sizes while always keeping horizontal data lines visible:

| File | Target Size | Detail Level |
|---|---|---|
| `icon-light.svg` / `icon-dark.svg` | 96px+ | Full: 4 circuit traces, right-angle bends, terminal nodes, diagonal connection |
| `icon-64-light.svg` / `icon-64-dark.svg` | 64px | Full: 4 traces with heavier strokes |
| `icon-48-light.svg` / `icon-48-dark.svg` | 48px | Reduced: 3 traces with bends and nodes |
| `icon-32-light.svg` / `icon-32-dark.svg` | 32px | Minimal: 2 horizontal data lines with nodes |
| `icon-16-light.svg` / `icon-16-dark.svg` | 16px | Ultra-minimal: 1 horizontal data line |

`-light` = black icon (for light backgrounds). `-dark` = white icon (for dark backgrounds).

**When to use size-optimized vs adaptive:** SVGs scale freely, so `icon-adaptive.svg` works at any size. The size-optimized files exist because fine details (thin traces, small nodes) become illegible below certain pixel sizes. If you're rendering at a fixed known size, use the matching optimized file for the sharpest result. If the size is dynamic or large (64px+), the adaptive version is fine.

## App Icons

Include a rounded background (22% corner radius). Use these anywhere the icon needs to stand alone without surrounding UI — app stores, PWA install prompts, home screen shortcuts.

| File | Dimensions | Treatment |
|---|---|---|
| `app-icon-dark-bg.svg` | 512x512 | White icon on `#111111` background |
| `app-icon-light-bg.svg` | 512x512 | Black icon on `#ffffff` background (subtle border) |
| `app-icon-192-dark-bg.svg` | 192x192 | White icon on `#111111` — slightly heavier strokes |
| `app-icon-192-light-bg.svg` | 192x192 | Black icon on `#ffffff` — slightly heavier strokes |

The dark background version is the primary brand treatment.

## Favicons

Optimized for browser tabs (renders at ~16px). Uses the 32px detail level (2 data lines) for readability at tiny sizes.

| File | Notes |
|---|---|
| `favicon.svg` | Uses `currentColor` — auto adapts to browser theme |
| `favicon-light.svg` | Black, for light browser chrome |
| `favicon-dark.svg` | White, for dark browser chrome |

To use the adaptive favicon with theme support in `<head>`:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

To serve separate light/dark favicons:

```html
<link rel="icon" href="/favicon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)">
```

## Design Specifications

- **Colors:** `#111111` (light mode) / `#f0f0f0` (dark mode) / `#ffffff` (on dark backgrounds)
- **Stroke style:** Square joins, butt caps (default SVG)
- **Grid:** 96x96 viewBox, icon content spans roughly 24–84 on both axes
- **App icon corner radius:** 22% of width (112px on 512, 42px on 192)

## Generating PNGs

If you need rasterized versions (e.g. for `favicon.ico` or app store uploads), convert from the SVGs:

```bash
# Requires Inkscape, librsvg, or similar
# Example with rsvg-convert:
rsvg-convert -w 512 -h 512 app-icon/app-icon-dark-bg.svg > app-icon-512.png
rsvg-convert -w 192 -h 192 app-icon/app-icon-192-dark-bg.svg > app-icon-192.png
rsvg-convert -w 32 -h 32 favicon/favicon-light.svg > favicon-32.png
```
