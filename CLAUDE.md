# freightclasscalculators.com

Astro SSG micro-tool: LTL freight classification, density and shipping-cost
calculators.

## Development

```
npm install
npm run dev
npm test        # freight-math boundary tests — must stay green
npm run build
```

## Deployment (Cloudflare Workers static assets)

```
npx astro build
npx wrangler deploy
```

Config in `wrangler.jsonc`. Docs: https://docs.astro.build/en/guides/deploy/cloudflare/

## Non-negotiables

- Astro static, no SPA framework
- Tailwind v4 via `@import "tailwindcss";` — never generate `tailwind.config.js`
- Vanilla ES6 for interactivity
- Zero external API calls; all math client-side
- No NMFC item numbers or classification tables anywhere on the site
- Every hardcoded industry figure carries an "as of" source comment

## Design & UI reviews

Follow `design.md`. Every UI change is expected to comply with the Vercel
Web Interface Guidelines — the fetch-latest skill lives at
`.agents/skills/web-design-guidelines/`. Invoke it before shipping UI:

```
Review src/pages/*.astro against Vercel web-design-guidelines
```

## Documentation

- Astro: https://docs.astro.build
- Tailwind v4: https://tailwindcss.com/docs
- Cloudflare deploy: https://docs.astro.build/en/guides/deploy/cloudflare/

See `PROJECT.md` for build order and acceptance criteria.
