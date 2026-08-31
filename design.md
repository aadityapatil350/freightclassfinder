# Design guidelines — freightclasscalculators.com

Serious, tool-first UI for logistics professionals. Reference the Vercel
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
on every UI task — the skill at `.agents/skills/web-design-guidelines/` fetches
the latest rules.

## Aesthetic

Geist-inspired: near-black on off-white in light mode, warm-white on true-black
in dark mode. Single accent blue (`#0070f3`). Hairline 1px borders, no heavy
shadows, no gradients on surfaces. Grid background reserved for the hero.

## Type

- **System font**: Geist (loaded from Google Fonts, `display=swap`), fallback
  to the system UI stack.
- **Monospace**: Geist Mono for formulas, code blocks, and terminal-style
  displays. Never for body copy.
- **Numerals**: `font-variant-numeric: tabular-nums` on every numeric cell —
  the `.tabular` and `.num` utilities apply it. Numbers in tables, results,
  and inputs must be tabular.
- **Wrapping**: `text-wrap: balance` on h1–h4, `text-wrap: pretty` on paragraphs.

## Colour

Defined as CSS variables in `src/styles/global.css`. Components must never
hardcode hex values — always `var(--color-*)`. Both themes share the same
variable names; only the values change.

## Spacing & layout

- Max content width: `6xl` (72rem) for tables, `3xl` (48rem) for editorial.
- Hero sections use a subtle 32×32 grid background pattern.
- Cards: `border: 1px solid var(--color-border)`, `border-radius: 12px`, no
  shadow. Add shadow only on elevation change (never at rest).
- 36–44px minimum touch targets on interactive elements per Vercel guidelines.

## Interactive states

- Every interactive element has a `:hover` state that increases contrast.
- Focus visible via `:focus-visible` (2px accent ring with 2px bg offset).
  Never `outline: none` without a replacement.
- Buttons: three variants — `.btn-primary` (dark on light), `.btn-secondary`
  (bordered), `.btn-ghost` (transparent).

## Accessibility non-negotiables

- Skip link on every page (rendered in `BaseLayout`).
- Icon-only buttons carry `aria-label`.
- Every input has an associated `<label>` or `aria-label`.
- Semantic HTML — `<button>` for actions, `<a>` for navigation.
- Respect `prefers-reduced-motion` — global override in `global.css`.
- `color-scheme` on `<html>` matches the current theme.
- `<meta name="theme-color">` updated on theme toggle so browser chrome
  matches the page background.

## Data tables

- Sticky header on tables > 8 rows.
- Numeric columns right-aligned with `.num` (applies `tabular-nums` and
  right alignment).
- Header cells: uppercase 11px with wide tracking, muted colour.
- Hover row: `bg-[var(--color-bg-subtle)]`.

## Result surfaces

- Primary metric: 2xl semibold, `text-[var(--color-text)]`, tabular numerals.
- Small label above: 11px uppercase, wide letter-spacing, subtle colour.
- Formula / secondary detail: 13px muted, mono font when a formula.
- Every number carries its unit — no bare figures.

## Animation

- Transitions on `transform` and `opacity` only. Never `transition: all`.
- Duration 100–150ms for micro-interactions.
- Colours transition on 100–200ms.
- All animations must be interruptible.
