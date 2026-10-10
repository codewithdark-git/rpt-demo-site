import { forest, bars, dataTable, C, fmt } from "./viz.js";
const $ = (id) => document.getElementById(id);
const fmtP = (p) => p === null || p === undefined ? "—" : (p < 0.001 ? "< 0.001" : p.toFixed(3));
const LAYER = { L1_SCORE: "financial", L2_SCORE: "disclosure", L3_SCORE: "governance" };
async function main() {
  const R = await fetch("data/results.json", { cache: "no-cache" }).then((r) => r.json());
  forest($("v-se"), R.h1_h3.flatMap((r) => [
    { label: `${r.hypothesis} · ${LAYER[r.layer_score]} — model-based`, sub: `p ${fmtP(r.p_unadjusted)}`, or: r.odds_ratio_per_sd, lo: r.or_ci_low, hi: r.or_ci_high, color: C[r.layer_score.slice(0, 2)] },
    { label: `${r.hypothesis} · ${LAYER[r.layer_score]} — firm-clustered`, sub: `p ${fmtP(r.p_firm_cluster)}`, or: r.odds_ratio_per_sd, lo: r.or_ci_low_firm_cluster, hi: r.or_ci_high_firm_cluster, color: C.ink2 },
  ]), { rowH: 36, labelWidth: 300 });
  bars($("v-holm"), R.h1_h3.map((r) => ({ label: `${r.hypothesis} · ${LAYER[r.layer_score]}`, values: [
    { v: r.p_unadjusted, color: C.accent, name: "unadjusted p (model-based)" }, { v: r.p_holm, color: C.accent, name: "Holm p (model-based)", hatch: true },
    { v: r.p_firm_cluster, color: C.ink2, name: "unadjusted p (firm-clustered)" }, { v: r.p_holm_firm_cluster, color: C.ink2, name: "Holm p (firm-clustered)", hatch: true }] })),
    { max: 1, ticks: [0, 0.05, 0.25, 0.5, 1], fmt: (v) => v.toFixed(3), labelWidth: 170, barH: 9, axisTitle: "p-value (0.05 marked)", legend: [{ name: "model-based", color: C.accent }, { name: "Holm (lighter)", color: C.accent, hatch: true }, { name: "firm-clustered", color: C.ink2 }] });
  $("t-holm").appendChild(dataTable(["hypothesis", "p_unadjusted", "p_holm", "p_firm_cluster", "p_holm_firm_cluster", "supported_design_rule", "supported_firm_cluster"], R.h1_h3));
  forest($("v-samples"), R.samples.flatMap((s) => ["H1", "H2", "H3"].map((h) => ({ label: `${h} · ${s.name}`, sub: `${s.sets} sets · p ${fmtP(s[h].p)} / firm-clustered ${fmtP(s[h].pc)}`, or: s[h].or, lo: s[h].lo, hi: s[h].hi, color: C[h === "H1" ? "L1" : h === "H2" ? "L2" : "L3"] }))), { rowH: 36, labelWidth: 330 });
  const h5 = R.h5;
  bars($("v-thr"), [
    { label: `AI rule at 5 % rate (threshold ${fmt(h5.ai_threshold_5pct_far)})`, values: [{ v: h5.cases_flagged_ai_5pct, color: C.L3, name: "cases flagged" }] },
    { label: `AI rule at ${(h5.trad_far * 100).toFixed(1)} % rate (threshold ${fmt(h5.ai_threshold_equal_far)})`, values: [{ v: h5.cases_flagged_ai_equal_far, color: C.L3, name: "cases flagged" }] },
    { label: `${h5.trad_rule_equal_far} (${(h5.trad_far * 100).toFixed(1)} % rate)`, values: [{ v: h5.cases_flagged_trad_equal_far, color: C.matched, name: "cases flagged" }] },
    { label: "Either rule (union)", values: [{ v: h5.cases_flagged_union, color: C.ink2, name: "cases flagged" }] },
  ], { max: h5.cases, ticks: [0, 10, 20, 31], fmt: (v) => String(Math.round(v)), labelWidth: 300, barH: 16, axisTitle: `cases of ${h5.cases}` });
  forest($("v-h2"), R.h2_variants.map((r) => ({ label: r.layer_score, sub: `${r.variant.slice(0, 70)} · ${r.n_firm_years} firm-years, ${r.n_matched_sets} sets · p ${fmtP(r.p_unadjusted)}`, or: r.odds_ratio_per_sd, lo: r.or_ci_low, hi: r.or_ci_high, color: C[r.layer_code || "L2"] })), { rowH: 40, labelWidth: 300 });
  bars($("v-m1"), R.m1.filter((r) => r.layer !== "TRAD").map((r) => ({ label: r.characteristic, values: [
    { v: r.coverage_fraud_firm_years, color: C.case, name: "case firm-years" }, { v: r.coverage_matched_firm_years, color: C.matched, name: "matched firm-years" }] })),
    { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "case firm-years", color: C.case }, { name: "matched firm-years", color: C.matched }], labelWidth: 110, axisTitle: "share of firm-years with the characteristic observed" });
  $("t-rules").appendChild(dataTable(["rule", "value"], R.scoring_rules));
  bars($("v-power"), [1.5, 1.65, 2.0].map((orr) => ({ label: `odds ratio ${orr} per SD`, values: R.power.filter((p) => p.odds_ratio_per_sd === orr).map((p) => ({ v: p.power, color: p.matched_sets === 21 ? C.matched : p.matched_sets === 30 ? C.accent : C.L2, name: `${p.matched_sets} sets` })) })),
    { max: 1, ticks: [0, 0.5, 0.8, 1], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "21 sets", color: C.matched }, { name: "30 sets", color: C.accent }, { name: "40 sets", color: C.L2 }], labelWidth: 170, axisTitle: "simulated power" });
  forest($("v-oof"), R.exploratory.oof.map((r) => ({ label: r.model, sub: "leave-one-set-out AUC, 2,000 set-bootstrap resamples", or: r.oof_auc, lo: r.oof_auc_ci_low, hi: r.oof_auc_ci_high, color: C.accent })), { linear: true, min: 0.4, max: 1, ticks: [0.5, 0.75, 1], ref: 0.5, rowH: 40, labelWidth: 200, axisTitle: "AUC (0.5 = chance)" });
  bars($("v-cases"), R.exploratory.per_case.map((r) => ({ label: r.case_id, values: [{ v: r.case_max, color: r.flag_years > 0 ? C.case : C.matched, name: "highest out-of-fold score" }] })), { max: 1, ticks: [0, 0.5, 1], fmt: (v) => v.toFixed(2), labelWidth: 150, barH: 9, axisTitle: "highest out-of-fold ensemble score (red: above threshold)" });
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the robustness data (" + e.message + ")."; b.hidden = false; } });
