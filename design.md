# Design guidelines — freightclassfinder.com

Audience: freight brokers, warehouse staff, small e-commerce operators. It should look
like a working tool, not a marketing landing page.

## Principles

- **Clean and functional.** No gradients, no glassmorphism, no decorative blobs, no hero
  images. Everything on the page earns its space.
- **Type-first.** System font stack. Clear hierarchy. Large numeric results.
- **Dense but readable.** Logistics people scan; they don't scroll for delight.
- **Dark mode from day one.** Persisted in `localStorage`, blocking inline script in
  `<head>` to prevent flash. Toggle in header.

## Palette

Neutral slates + a single blue accent. Colours defined as CSS variables in
`src/styles/global.css`. Never inline hex codes in components.

## Layout

- Max content width: `5xl` (64rem) for pages with tables; `3xl` for editorial.
- 44px minimum touch targets on all interactive elements.
- Ad slot heights reserved to prevent CLS (`min-h-[90px]` leaderboard,
  `min-h-[250px]` rectangle).

## Data tables

- Sticky header row on tables > 8 rows.
- Numeric columns right-aligned, monospace-tabular numerals.
- No zebra striping on short tables (≤6 rows). Zebra on longer.

## Result surfaces

- Primary number: 2xl+ weight bold, accent colour.
- Formula echo below the result in mono font, muted colour.
- Every result is accompanied by units. Never present a bare number.
