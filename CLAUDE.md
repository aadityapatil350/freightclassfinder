# freightclassfinder.com

Astro SSG micro-tool: LTL freight classification, density and shipping-cost calculators.

## Development

```
npm install
npm run dev
npm test        # freight-math boundary tests — must stay green
npm run build
```

## Non-negotiables

- Astro static, no SPA framework
- Tailwind v4 via `@import "tailwindcss";` — never generate `tailwind.config.js`
- Vanilla ES6 for interactivity
- Zero external API calls; all math client-side
- No NMFC item numbers or classification tables anywhere on the site
- Every hardcoded industry figure carries an "as of" source comment

## Documentation

- Astro: https://docs.astro.build
- Tailwind v4: https://tailwindcss.com/docs

See `PROJECT.md` for build order and acceptance criteria and `design.md` for UI rules.
