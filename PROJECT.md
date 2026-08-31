# PROJECT — freightclassfinder.com

Site 2 in the micro-tool network. See `BUILD-freightclassfinder.md` and
`ADVANCED-CALCULATOR-SPEC.md` in the source docs for the full brief.

## Status

Initial scaffold complete: engine + all 15 routes.

## Build order (per spec §13)

1. [x] Astro + Tailwind v4 + sitemap scaffold
2. [x] `freight-math.js` + boundary tests
3. [ ] R1/R2 research pass — verify density breakpoints against a second published source
4. [x] `/` freight class calculator with multi-line + pallet-aware dims
5. [x] `/nmfc-codes-explained` (honest explainer, no lookup)
6. [x] Legal pages + `_headers` + `robots.txt`
7. [x] `/dimensional-weight-calculator`, `/pallet-calculator`
8. [x] `/freight-density-calculator`, `/fuel-surcharge-calculator`,
       `/freight-rate-calculator`, `/cost-per-mile-calculator`
9. [x] Tier 2 explainers
10. [ ] Full build verification, then deploy

## Follow-ups before launch

- R1: cite second independent source for density breakpoints in `data/density-classes.js`
- R3: date-stamp carrier dim divisors and note re-verification cadence
- R6: verify §6 competitor gap (multi-item + breakpoint) still holds at launch
- Real favicon + og-image assets
- AdSense — wait 30–60 days post-launch per §12

## Acceptance criteria — see spec §14 and advanced spec §Acceptance criteria
