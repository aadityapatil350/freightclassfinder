// freight-math.js — pure, dependency-free freight math.
//
// Design principles:
//  - Every function is pure. No DOM access, no globals.
//  - Every function accepts explicit numeric inputs and returns explicit numbers.
//  - Invalid inputs (negative, NaN, zero where a divisor is required) throw
//    early with a specific message. The UI catches and surfaces them.
//  - Bounds are [lo, hi): lower inclusive, upper exclusive. This is the only
//    convention used across the module; boundary tests assert both sides.

import { DENSITY_BUCKETS, CLASSES_ASC } from '../data/density-classes.js';

// ─── Unit conversions ─────────────────────────────────────────────────────
export const IN_PER_CM   = 0.3937007874;
export const LB_PER_KG   = 2.2046226218;
export const FT3_PER_M3  = 35.3146667215;
export const KG_M3_PER_LB_FT3 = 16.0184633739;

export const cmToIn = (cm) => cm * IN_PER_CM;
export const inToCm = (inch) => inch / IN_PER_CM;
export const kgToLb = (kg) => kg * LB_PER_KG;
export const lbToKg = (lb) => lb / LB_PER_KG;

// ─── Core density ─────────────────────────────────────────────────────────
export function volumeFt3(lengthIn, widthIn, heightIn) {
  requirePositive(lengthIn, 'length');
  requirePositive(widthIn, 'width');
  requirePositive(heightIn, 'height');
  return (lengthIn * widthIn * heightIn) / 1728;
}

export function density(weightLb, volFt3) {
  requirePositive(weightLb, 'weight');
  requirePositive(volFt3, 'volume');
  return weightLb / volFt3;
}

// Map density (lb/ft³) → freight class. Boundary rule: [lo, hi).
// A density exactly on the upper edge of a bucket falls into the NEXT bucket.
export function classFromDensity(d) {
  requirePositive(d, 'density');
  for (const b of DENSITY_BUCKETS) {
    if (d >= b.lo && d < b.hi) return b.cls;
  }
  // Should be unreachable because top bucket has hi = Infinity.
  return 50;
}

// ─── Pallet-aware line measurement ────────────────────────────────────────
// A line item can be either loose (its own dims) or palletized. When palletized:
//   measured_l = max(itemL + overhangL, palletL)
//   measured_w = max(itemW + overhangW, palletW)
//   measured_h = itemH + palletDeckH
// Carriers measure the outermost extremes — the pallet footprint plus overhang.
export function measuredDimensions(line) {
  const { itemL, itemW, itemH, palletized, palletL = 0, palletW = 0, palletDeckH = 0, overhangL = 0, overhangW = 0 } = line;
  requirePositive(itemL, 'itemL');
  requirePositive(itemW, 'itemW');
  requirePositive(itemH, 'itemH');
  if (!palletized) {
    return { l: itemL, w: itemW, h: itemH, palletBumped: false };
  }
  requireNonNeg(palletL, 'palletL');
  requireNonNeg(palletW, 'palletW');
  requireNonNeg(palletDeckH, 'palletDeckH');
  const l = Math.max(itemL + overhangL, palletL);
  const w = Math.max(itemW + overhangW, palletW);
  const h = itemH + palletDeckH;
  const palletBumped = l > itemL + overhangL - 1e-9 && palletL > itemL + overhangL
                    || w > itemW + overhangW - 1e-9 && palletW > itemW + overhangW;
  return { l, w, h, palletBumped };
}

// ─── Per-line and shipment computation ────────────────────────────────────
export function computeLine(line) {
  const qty = Number(line.qty ?? 1);
  requirePositive(qty, 'qty');
  const unitWeight = Number(line.unitWeight);
  requirePositive(unitWeight, 'unitWeight');
  const dims = measuredDimensions(line);
  const perUnitVolume = volumeFt3(dims.l, dims.w, dims.h);
  const lineVolume = qty * perUnitVolume;
  const lineWeight = qty * unitWeight;
  const lineDensity = density(lineWeight, lineVolume);
  const lineClass = classFromDensity(lineDensity);
  return { dims, perUnitVolume, lineVolume, lineWeight, lineDensity, lineClass };
}

export function computeShipment(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('At least one shipment line is required.');
  }
  const perLine = lines.map(computeLine);
  const totalWeight = perLine.reduce((s, p) => s + p.lineWeight, 0);
  const totalVolume = perLine.reduce((s, p) => s + p.lineVolume, 0);
  // Aggregate density is total weight ÷ total volume — NOT the mean of densities.
  const aggregateDensity = totalWeight / totalVolume;
  const aggregateClass = classFromDensity(aggregateDensity);
  return { perLine, totalWeight, totalVolume, aggregateDensity, aggregateClass };
}

// ─── Breakpoint optimizer ─────────────────────────────────────────────────
// For a target class T (cheaper than current), return the smallest single-lever
// change that lands the line inside T's density range.
// Levers: add weight; reduce length; reduce width; reduce height.
// Also returns the downward risk: how close is the line to falling into a
// MORE expensive class if it loses a bit of weight or gains a bit of volume?
export function breakpointAnalysis(computedLine) {
  const { lineWeight, lineVolume, lineDensity, lineClass, dims } = computedLine;
  const idx = CLASSES_ASC.indexOf(lineClass);
  const cheaperClass = idx > 0 ? CLASSES_ASC[idx - 1] : null; // lower number = cheaper
  const pricierClass = idx < CLASSES_ASC.length - 1 ? CLASSES_ASC[idx + 1] : null;

  const bucketOf = (c) => DENSITY_BUCKETS.find((b) => b.cls === c);
  const currentBucket = bucketOf(lineClass);

  const targets = { cheaper: null, pricier: null };

  if (cheaperClass !== null) {
    const cheaperBucket = bucketOf(cheaperClass);
    targets.cheaper = leversToReachDensity(dims, lineWeight, lineVolume, cheaperBucket.lo, 'up');
    targets.cheaper.targetClass = cheaperClass;
  }

  if (pricierClass !== null) {
    // Distance to falling *into* the pricier bucket. Pricier bucket has hi = currentBucket.lo.
    // We want to know how much we can lose (weight) or gain (volume) before crossing.
    const marginDown = leversToReachDensity(dims, lineWeight, lineVolume, currentBucket.lo, 'down');
    marginDown.targetClass = pricierClass;
    targets.pricier = marginDown;
  }

  return {
    lineDensity,
    lineClass,
    cheaperClass,
    pricierClass,
    currentBucket,
    targets,
  };
}

// Compute the four levers to reach a given density boundary.
//   direction 'up'  : need to INCREASE density (add weight, or shrink dims)
//   direction 'down': at what change would density DROP below currentBucket.lo
function leversToReachDensity(dims, weight, volume, targetDensity, direction) {
  // Required new weight to hit targetDensity holding volume constant.
  const requiredWeight = targetDensity * volume;
  const weightDelta = requiredWeight - weight; // positive = must add; negative = would need to lose

  // For dimension reductions: hold weight constant, find required volume, then required dim.
  // requiredVolFt3 = weight / targetDensity
  const requiredVolFt3 = weight / targetDensity;
  const requiredVolIn3 = requiredVolFt3 * 1728;

  const dimLever = (which) => {
    const other1 = which === 'l' ? dims.w : which === 'w' ? dims.l : dims.l;
    const other2 = which === 'l' ? dims.h : which === 'w' ? dims.h : dims.w;
    const newDim = requiredVolIn3 / (other1 * other2);
    const delta = dims[which] - newDim; // positive = must reduce; negative = would need to add
    return { newDim, delta };
  };

  return {
    direction,
    targetDensity,
    weight: { requiredWeight, delta: weightDelta },
    length: dimLever('l'),
    width:  dimLever('w'),
    height: dimLever('h'),
  };
}

// ─── Consolidation check ──────────────────────────────────────────────────
// For every pair of lines whose footprints match closely enough to stack,
// return combos that would land in a cheaper class than the min of the pair.
// maxStackHeightIn defaults to 96in (typical LTL max palletized height, R8).
export function consolidationOpportunities(shipment, opts = {}) {
  const maxHeight = opts.maxStackHeightIn ?? 96;
  const footprintTolerance = opts.footprintToleranceIn ?? 2;
  const results = [];
  const p = shipment.perLine;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const a = p[i], b = p[j];
      const footprintMatch =
        Math.abs(a.dims.l - b.dims.l) <= footprintTolerance &&
        Math.abs(a.dims.w - b.dims.w) <= footprintTolerance;
      if (!footprintMatch) continue;
      const combinedH = a.dims.h + b.dims.h;
      if (combinedH > maxHeight) continue;
      const combinedVol = ((Math.max(a.dims.l, b.dims.l) * Math.max(a.dims.w, b.dims.w) * combinedH) / 1728);
      const combinedWt = a.lineWeight + b.lineWeight;
      const combinedDensity = combinedWt / combinedVol;
      const combinedClass = classFromDensity(combinedDensity);
      const worse = Math.max(a.lineClass, b.lineClass);
      if (combinedClass < worse) {
        results.push({
          aIndex: i, bIndex: j,
          combinedH, combinedDensity, combinedClass,
          savingsVs: worse,
        });
      }
    }
  }
  return results;
}

// ─── Dimensional weight ───────────────────────────────────────────────────
export function dimensionalWeight(lengthIn, widthIn, heightIn, divisor) {
  requirePositive(lengthIn, 'length');
  requirePositive(widthIn, 'width');
  requirePositive(heightIn, 'height');
  requirePositive(divisor, 'divisor');
  return (lengthIn * widthIn * heightIn) / divisor;
}
export function billableWeight(actualLb, dimLb) {
  return Math.max(actualLb, dimLb);
}

// ─── Fuel surcharge ───────────────────────────────────────────────────────
// Classic escalator: pct_per_increment applied for each `increment` above `base`.
// e.g. base $1.20, increment $0.05, pctPerIncrement 1% → at $2.20, surcharge = 20%.
export function fuelSurchargePct(doePrice, basePrice, incrementUsd, pctPerIncrement) {
  requireNonNeg(doePrice, 'doePrice');
  requireNonNeg(basePrice, 'basePrice');
  requirePositive(incrementUsd, 'increment');
  requireNonNeg(pctPerIncrement, 'pctPerIncrement');
  if (doePrice <= basePrice) return 0;
  const steps = (doePrice - basePrice) / incrementUsd;
  return steps * pctPerIncrement;
}
export function fuelSurchargeAmount(lineHaulUsd, surchargePct) {
  return lineHaulUsd * surchargePct / 100;
}

// ─── Cost per mile ────────────────────────────────────────────────────────
export function costPerMile(fixed, variable, totalMiles) {
  requireNonNeg(fixed, 'fixed');
  requireNonNeg(variable, 'variable');
  requirePositive(totalMiles, 'totalMiles');
  return (fixed + variable) / totalMiles;
}

// ─── Pallet loading (single-box orientation search) ───────────────────────
// Given a pallet footprint, a box footprint and heights, try both 0°/90° orientations
// and return whichever fits more units.
export function palletLoad({ palletL, palletW, palletMaxH, palletDeckH = 6, boxL, boxW, boxH }) {
  requirePositive(palletL, 'palletL');
  requirePositive(palletW, 'palletW');
  requirePositive(palletMaxH, 'palletMaxH');
  requirePositive(boxL, 'boxL');
  requirePositive(boxW, 'boxW');
  requirePositive(boxH, 'boxH');
  const usableH = palletMaxH - palletDeckH;
  if (usableH < boxH) return { perLayer: 0, layers: 0, total: 0, orientation: 'none' };
  const layers = Math.floor(usableH / boxH);
  const perLayerA = Math.floor(palletL / boxL) * Math.floor(palletW / boxW);
  const perLayerB = Math.floor(palletL / boxW) * Math.floor(palletW / boxL);
  const orientation = perLayerA >= perLayerB ? 'lengthwise' : 'rotated';
  const perLayer = Math.max(perLayerA, perLayerB);
  return { perLayer, layers, total: perLayer * layers, orientation };
}

// ─── Linear feet (LTL trailer floor space) ────────────────────────────────
// Standard trailer is 96in inside width. For each line, compute linear inches
// occupied assuming lines are placed side-by-side down the trailer floor.
export function linearFeet(shipment, opts = {}) {
  const trailerWidthIn = opts.trailerWidthIn ?? 96;
  let inches = 0;
  for (const p of shipment.perLine) {
    const across = Math.max(1, Math.floor(trailerWidthIn / p.dims.w));
    // qty is baked into perLine via lineVolume; recover it by dividing lineWeight/unitWeight.
    // Simplify: floor-space per unit is dims.l × dims.w; the number of units is
    // lineVolume × 1728 / (dims.l × dims.w × dims.h).
    const units = Math.round((p.lineVolume * 1728) / (p.dims.l * p.dims.w * p.dims.h));
    const rows = Math.ceil(units / across);
    inches += rows * p.dims.l;
  }
  return inches / 12;
}

// ─── Guards ───────────────────────────────────────────────────────────────
function requirePositive(v, name) {
  if (typeof v !== 'number' || !isFinite(v) || v <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}
function requireNonNeg(v, name) {
  if (typeof v !== 'number' || !isFinite(v) || v < 0) {
    throw new Error(`${name} must be zero or greater.`);
  }
}
