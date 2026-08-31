// Density-to-freight-class breakpoints (lb/ft³ → NMFC-style density class).
//
// This is the standard density-based classification scale used across US LTL
// carriers. Densities map to classes 50 (densest, cheapest) through 500 (least
// dense, most expensive). Higher density → lower class → lower rate.
//
// Ranges are [lo, hi): lower bound inclusive, upper bound exclusive.
// The topmost bucket (class 50) has no upper bound; the bottom bucket
// (class 500) has no lower bound.
//
// Sources — as of 2026-08-31:
//   - FreightCenter density scale (public, non-copyrighted): freightcenter.com/glossary/density-scale
//   - Freightquote density guide: freightquote.com/how-to-ship-freight/freight-class
//   - Saia density calculator (breakpoints displayed on tool page): saia.com/tools-and-resources
// R1: verify against ≥1 further independent carrier source before launch and
// note any disagreement in a comment beside the bucket in question.
//
// The class list itself (18 buckets) is the NMFTA-published density scale.
// It is a formula, not a copyrighted table; NMFC item numbers (commodity codes)
// are NEVER represented anywhere in this project.

export const DENSITY_BUCKETS = [
  { cls: 500, lo: 0,    hi: 1    },
  { cls: 400, lo: 1,    hi: 2    },
  { cls: 300, lo: 2,    hi: 3    },
  { cls: 250, lo: 3,    hi: 4    },
  { cls: 200, lo: 4,    hi: 5    },
  { cls: 175, lo: 5,    hi: 6    },
  { cls: 150, lo: 6,    hi: 7    },
  { cls: 125, lo: 7,    hi: 8    },
  { cls: 110, lo: 8,    hi: 9    },
  { cls: 100, lo: 9,    hi: 10.5 },
  { cls: 92.5,lo: 10.5, hi: 12   },
  { cls: 85,  lo: 12,   hi: 13.5 },
  { cls: 77.5,lo: 13.5, hi: 15   },
  { cls: 70,  lo: 15,   hi: 22.5 },
  { cls: 65,  lo: 22.5, hi: 30   },
  { cls: 60,  lo: 30,   hi: 35   },
  { cls: 55,  lo: 35,   hi: 50   },
  { cls: 50,  lo: 50,   hi: Infinity },
];

// Ordered by class number ascending — useful for scale rendering.
export const CLASSES_ASC = [50, 55, 60, 65, 70, 77.5, 85, 92.5, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];

// Ordered cheapest-to-most-expensive (class ascending == cheapest first).
// "Next cheaper" = lower class number = higher density bucket.
export function bucketFor(cls) {
  return DENSITY_BUCKETS.find((b) => b.cls === cls);
}

// Standard pallet presets. Deck heights are typical; user can override.
// Verify in R5 before pinning as authoritative.
export const PALLET_PRESETS = [
  { key: 'gma-48x40', label: '48×40 GMA (US standard)', l: 48, w: 40, deck: 6, unit: 'in' },
  { key: '42x42',     label: '42×42',                    l: 42, w: 42, deck: 6, unit: 'in' },
  { key: '48x48',     label: '48×48 (drum)',             l: 48, w: 48, deck: 6, unit: 'in' },
  { key: 'euro',      label: 'Euro EUR-1 (1200×800mm)',  l: 47.24, w: 31.5, deck: 5.7, unit: 'in' },
  { key: 'custom',    label: 'Custom',                   l: 0,  w: 0,  deck: 0, unit: 'in' },
];

// Parcel-carrier dim divisors (in³ per lb, US domestic unless noted).
// As of 2026-08-31 — verify annually (R3). No affiliation implied.
export const DIM_DIVISORS = [
  { key: 'fedex-domestic', label: 'FedEx — domestic',      divisor: 139 },
  { key: 'fedex-intl',     label: 'FedEx — international', divisor: 139 },
  { key: 'ups-domestic',   label: 'UPS — domestic',        divisor: 139 },
  { key: 'ups-intl',       label: 'UPS — international',   divisor: 139 },
  { key: 'usps',           label: 'USPS Priority',         divisor: 166 },
  { key: 'dhl-domestic',   label: 'DHL — domestic',        divisor: 139 },
  { key: 'dhl-intl',       label: 'DHL — international',   divisor: 139 },
  { key: 'custom',         label: 'Custom',                divisor: 139 },
];
