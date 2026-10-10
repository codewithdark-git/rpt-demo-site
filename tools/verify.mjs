// node tools/verify.mjs  (run from the site root): recompute every firm-year with assets/js/compute.js and compare.
import { readFileSync, readdirSync } from "node:fs";
import { designScore, logit, aiFlag } from "../assets/js/compute.js";
const G = JSON.parse(readFileSync("data/global.json", "utf8"));
let n = 0, maxAI = 0, maxP = 0, flagMismatch = 0, layerMax = 0;
for (const f of readdirSync("data/companies")) {
  const co = JSON.parse(readFileSync("data/companies/" + f, "utf8"));
  for (const y of co.years) {
    const values = {}; for (const c of G.characteristics) values[c.code] = y.characteristics[c.code].value;
    const ds = designScore(G.characteristics, values);
    const rec = y.design_recorded;
    if ((ds.AI_SCORE === null) !== (rec.AI_SCORE === null)) maxAI = 1; else if (ds.AI_SCORE !== null) maxAI = Math.max(maxAI, Math.abs(ds.AI_SCORE - rec.AI_SCORE));
    for (const L of ["L1", "L2", "L3"]) { const a = ds.layer[L], b = rec[L + "_SCORE"]; if ((a === null) !== (b === null)) layerMax = 1; else if (a !== null) layerMax = Math.max(layerMax, Math.abs(a - b)); }
    if (aiFlag(ds.AI_SCORE, G.ai_flag.thr_5pct_far) !== rec.AI_FLAG_5) flagMismatch++;
    const lg = logit(G.logit, y.features);
    maxP = Math.max(maxP, Math.abs(lg.prob - y.logit_recorded.prob_full_fit));
    n++;
  }
}
console.log(`firm-years ${n}; max |ΔAI_SCORE| ${maxAI.toExponential(2)}; max |Δlayer| ${layerMax.toExponential(2)}; flag mismatches ${flagMismatch}; max |Δlogit prob| ${maxP.toExponential(2)}`);
process.exit(maxAI < 1e-9 && layerMax < 1e-9 && flagMismatch === 0 && maxP < 1e-7 ? 0 : 1);
