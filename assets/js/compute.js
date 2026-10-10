// Pure computation shared by the browser and tools/verify.mjs. No DOM access.
// Reproduces scripts/design_tests_v2.py (rank_scores, attribution) and the fitted sklearn pipeline
// (SimpleImputer(median) -> StandardScaler -> LogisticRegression) from the exported parameters.

export const LAYERS = ["L1", "L2", "L3"];

/** count of elements < v (lo) and <= v (hi) in a sorted numeric array, by binary search */
function bounds(sorted, v) {
  let a = 0, b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] < v) a = m + 1; else b = m; }
  const lo = a;
  b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] <= v) a = m + 1; else b = m; }
  return { lo, hi: a };
}

/** pandas Series.rank(pct=True) with method="average": (lo + 1 + hi) / (2 n) */
export function rankPct(sorted, v) {
  if (v === null || v === undefined || Number.isNaN(v) || !sorted || sorted.length === 0) return null;
  const { lo, hi } = bounds(sorted, v);
  const n = sorted.length;
  return { lo, hi, n, rank: (lo + 1 + hi) / (2 * n) };
}

/**
 * Design steps 3-5 and the A1 division for one firm-year.
 * chars: [{code, layer, sorted_values}], values: {code: number|null}
 */
export function designScore(chars, values) {
  const ranks = {};
  const perLayer = { L1: [], L2: [], L3: [] };
  for (const c of chars) {
    const r = rankPct(c.sorted_values, values[c.code]);
    ranks[c.code] = r;
    if (r) perLayer[c.layer].push({ code: c.code, rank: r.rank });
  }
  const layer = {}, nObs = {};
  for (const L of LAYERS) {
    const xs = perLayer[L];
    nObs[L] = xs.length;
    layer[L] = xs.length ? xs.reduce((s, x) => s + x.rank, 0) / xs.length : null;
  }
  const present = LAYERS.filter((L) => layer[L] !== null);
  const nLayers = present.length;
  const ai = nLayers ? 10 * present.reduce((s, L) => s + layer[L], 0) / nLayers : null;
  const shares = {};
  let largest = null, best = -1;
  for (const L of LAYERS) {
    const contrib = layer[L] === null ? 0 : 10 * layer[L] / nLayers;
    shares[L] = ai ? contrib / ai : 0;
    if (shares[L] > best) { best = shares[L]; largest = L; }
    for (const x of perLayer[L]) shares[x.code] = ai ? (10 * x.rank / (nObs[L] * nLayers)) / ai : 0;
  }
  const charShares = chars.map((c) => [c.code, shares[c.code] || 0]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  const named = charShares.length ? "mainly " + charShares.slice(0, 2).map(([c]) => c).join(" and ") : "no characteristic observed";
  return { ranks, layer, nObs, nLayers, AI_SCORE: ai, shares, largestLayer: ai ? largest : null, namedEvidence: named };
}

export function aiFlag(ai, threshold) {
  return ai === null || ai === undefined ? false : ai >= threshold;
}

/**
 * Fitted logistic regression. p = {features[], imputer_median[], scaler_mean[], scaler_scale[], coef[], intercept}
 * features: {name: number|null}
 */
export function logit(p, features) {
  const rows = [];
  let linear = p.intercept;
  for (let i = 0; i < p.features.length; i++) {
    const name = p.features[i];
    const raw = features[name];
    const missing = raw === null || raw === undefined || Number.isNaN(raw);
    const imputed = missing ? p.imputer_median[i] : raw;
    const z = (imputed - p.scaler_mean[i]) / p.scaler_scale[i];
    const contrib = p.coef[i] * z;
    linear += contrib;
    rows.push({ feature: name, raw: missing ? null : raw, imputed, missing, z, coef: p.coef[i], contrib });
  }
  const prob = 1 / (1 + Math.exp(-linear));
  return { rows, linear, prob, flagged: prob >= p.threshold };
}

export function topContrib(rows, k = 8) {
  return [...rows].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib)).slice(0, k);
}

export function approxEqual(a, b, tol = 1e-9) {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}
