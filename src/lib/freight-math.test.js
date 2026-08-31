// Tiny hand-rolled test runner — no dependency on any test framework.
// Run: `npm test`  (aka `node src/lib/freight-math.test.js`)
//
// Every density breakpoint is tested from BOTH sides of the boundary.
// A single failure exits non-zero so CI (or the build script) can catch it.

import {
  volumeFt3, density, classFromDensity,
  measuredDimensions, computeLine, computeShipment,
  breakpointAnalysis, consolidationOpportunities,
  dimensionalWeight, billableWeight,
  fuelSurchargePct, fuelSurchargeAmount, costPerMile,
  palletLoad, linearFeet,
  cmToIn, inToCm, kgToLb, lbToKg,
} from './freight-math.js';
import { DENSITY_BUCKETS } from '../data/density-classes.js';

let passed = 0, failed = 0;
const fails = [];

function eq(actual, expected, label) {
  const ok = Object.is(actual, expected)
    || (typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) < 1e-6);
  if (ok) { passed++; return; }
  failed++;
  fails.push(`FAIL: ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
}
function approx(actual, expected, tol, label) {
  const ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; return; }
  failed++;
  fails.push(`FAIL: ${label}\n  expected: ${expected} ±${tol}\n  actual:   ${actual}`);
}
function throws(fn, label) {
  try { fn(); failed++; fails.push(`FAIL: ${label} (did not throw)`); }
  catch (_e) { passed++; }
}

// ─── Boundary tests: every breakpoint, both sides ─────────────────────────
for (const b of DENSITY_BUCKETS) {
  if (b.lo > 0) {
    // Just below lo → falls into the previous (higher-class) bucket.
    const belowExpected = DENSITY_BUCKETS.find((x) => b.lo - 1e-9 >= x.lo && b.lo - 1e-9 < x.hi).cls;
    eq(classFromDensity(b.lo - 1e-9), belowExpected, `boundary ${b.cls}: just below lo=${b.lo}`);
    // Exactly at lo → this bucket.
    eq(classFromDensity(b.lo), b.cls, `boundary ${b.cls}: exactly lo=${b.lo}`);
  }
  if (isFinite(b.hi)) {
    // Just below hi → still this bucket.
    eq(classFromDensity(b.hi - 1e-9), b.cls, `boundary ${b.cls}: just below hi=${b.hi}`);
    // Exactly at hi → next bucket up (lower class).
    const nextExpected = DENSITY_BUCKETS.find((x) => b.hi >= x.lo && b.hi < x.hi).cls;
    eq(classFromDensity(b.hi), nextExpected, `boundary ${b.cls}: exactly hi=${b.hi}`);
  }
}

// ─── Worked example from the spec ────────────────────────────────────────
// 40×48×48 at 425 lb → 53.33 ft³, 7.97 lb/ft³
{
  const v = volumeFt3(40, 48, 48);
  approx(v, 53.333, 0.01, 'worked example volume');
  const d = density(425, v);
  approx(d, 7.97, 0.02, 'worked example density');
  eq(classFromDensity(d), 125, 'worked example class');
}

// ─── Zero, negative, non-numeric rejected ────────────────────────────────
throws(() => volumeFt3(0, 1, 1), 'volume rejects zero');
throws(() => volumeFt3(-1, 1, 1), 'volume rejects negative');
throws(() => density(1, 0), 'density rejects zero volume');
throws(() => classFromDensity(0), 'class rejects zero density');
throws(() => classFromDensity(NaN), 'class rejects NaN');

// ─── Unit conversions round-trip ─────────────────────────────────────────
approx(cmToIn(inToCm(10)), 10, 1e-9, 'cm↔in round trip');
approx(kgToLb(lbToKg(10)), 10, 1e-9, 'kg↔lb round trip');

// ─── Pallet-aware dims ───────────────────────────────────────────────────
{
  // 40×40 box on 48×40 pallet → measured 48×40, height += deck.
  const m = measuredDimensions({ itemL: 40, itemW: 40, itemH: 30, palletized: true, palletL: 48, palletW: 40, palletDeckH: 6 });
  eq(m.l, 48, 'pallet bumps L');
  eq(m.w, 40, 'pallet keeps W');
  eq(m.h, 36, 'pallet adds deck to H');
}
{
  // Overhang beats pallet.
  const m = measuredDimensions({ itemL: 50, itemW: 40, itemH: 30, palletized: true, palletL: 48, palletW: 40, palletDeckH: 6, overhangL: 2 });
  eq(m.l, 52, 'overhang beats pallet L');
}

// ─── Aggregate density is total wt ÷ total vol, NOT mean of densities ────
{
  const s = computeShipment([
    { qty: 1, unitWeight: 100, itemL: 12, itemW: 12, itemH: 12 }, // 1 ft³, 100 lb/ft³
    { qty: 1, unitWeight: 10,  itemL: 24, itemW: 24, itemH: 24 }, // 8 ft³, 1.25 lb/ft³
  ]);
  // mean of per-line densities = (100 + 1.25) / 2 = 50.625
  // aggregate = 110 / 9 = 12.222
  approx(s.aggregateDensity, 110 / 9, 1e-6, 'aggregate ≠ mean of densities');
  eq(s.aggregateClass, 85, 'aggregate class'); // 12.22 in [12, 13.5)
}

// ─── Breakpoint optimizer: feed output back, verify class ────────────────
{
  const line = computeLine({ qty: 1, unitWeight: 425, itemL: 40, itemW: 48, itemH: 48 }); // class 125
  const bp = breakpointAnalysis(line);
  eq(bp.cheaperClass, 110, 'next cheaper class');
  // Add exactly the required weight → new density hits target lo → new class = target.
  const newWeight = bp.targets.cheaper.weight.requiredWeight;
  const newDensity = newWeight / line.lineVolume;
  eq(classFromDensity(newDensity), 110, 'optimizer weight lever lands in target');
  // Height reduction lever should also work.
  const newH = line.dims.h - bp.targets.cheaper.height.delta;
  const newVol = volumeFt3(line.dims.l, line.dims.w, newH);
  const newDens = density(line.lineWeight, newVol);
  eq(classFromDensity(newDens), 110, 'optimizer height lever lands in target');
}

// ─── Consolidation surfaces a real saving ────────────────────────────────
{
  // Two footprint-matching lines of different densities. Combined density lands
  // in a cheaper class than the worse (higher) of the two.
  //   A: 48×40×20, 20 lb → 22.22 ft³, 0.9 lb/ft³ → class 500
  //   B: 48×40×30, 40 lb → 33.33 ft³, 1.2 lb/ft³ → class 300
  //   Combined: 48×40×50, 60 lb → 55.56 ft³, 1.08 lb/ft³ → class 400 (< 500)
  const s = computeShipment([
    { qty: 1, unitWeight: 20, itemL: 48, itemW: 40, itemH: 20 },
    { qty: 1, unitWeight: 40, itemL: 48, itemW: 40, itemH: 30 },
  ]);
  const opps = consolidationOpportunities(s);
  eq(opps.length, 1, 'consolidation opportunity found');
  // Never proposes a stack above default 96in.
  const s2 = computeShipment([
    { qty: 1, unitWeight: 40, itemL: 48, itemW: 40, itemH: 50 },
    { qty: 1, unitWeight: 40, itemL: 48, itemW: 40, itemH: 50 },
  ]);
  eq(consolidationOpportunities(s2).length, 0, 'no consolidation when combined height > max');
}

// ─── Dimensional & billable weight ───────────────────────────────────────
approx(dimensionalWeight(12, 12, 12, 139), 1728 / 139, 1e-9, 'dim weight');
eq(billableWeight(5, 12.4), 12.4, 'billable takes max');
eq(billableWeight(20, 12.4), 20, 'billable takes max other side');

// ─── Fuel surcharge ──────────────────────────────────────────────────────
approx(fuelSurchargePct(2.20, 1.20, 0.05, 1), 20, 1e-9, 'fuel surcharge 20% at $1 above base');
eq(fuelSurchargePct(1.10, 1.20, 0.05, 1), 0, 'no surcharge when below base');
approx(fuelSurchargeAmount(1000, 25), 250, 1e-9, 'fuel surcharge amount');

// ─── Cost per mile ───────────────────────────────────────────────────────
approx(costPerMile(1000, 500, 1000), 1.5, 1e-9, 'cpm basic');
throws(() => costPerMile(0, 0, 0), 'cpm rejects zero miles');

// ─── Pallet load picks better orientation ────────────────────────────────
{
  const r = palletLoad({ palletL: 48, palletW: 40, palletMaxH: 96, palletDeckH: 6, boxL: 10, boxW: 8, boxH: 10 });
  // Orientation A: floor(48/10)*floor(40/8) = 4*5 = 20
  // Orientation B: floor(48/8)*floor(40/10) = 6*4 = 24 → wins
  eq(r.perLayer, 24, 'pallet picks better orientation');
  eq(r.layers, 9, 'pallet layers');
  eq(r.total, 216, 'pallet total boxes');
}

// ─── Linear feet sanity ──────────────────────────────────────────────────
{
  const s = computeShipment([
    { qty: 2, unitWeight: 200, itemL: 48, itemW: 40, itemH: 48 },
  ]);
  const lf = linearFeet(s);
  // Trailer 96in wide, each pallet 40in wide → 2 across per row → 2 pallets = 1 row × 48in = 48in = 4ft
  eq(lf, 4, 'linear feet 2 pallets side by side');
}

// ─── Report ──────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\n' + fails.join('\n\n'));
  process.exit(1);
}
