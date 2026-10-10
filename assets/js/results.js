import { forest, bars, smallMultiples, dotStrip, tiles, dotRows, C } from "./viz.js";

const $ = (id) => document.getElementById(id);
const fmtP = (p) => p === null || p === undefined ? "" : (p < 0.001 ? "< 0.001" : "= " + p.toFixed(3));
const status = (r) => r.coef_per_sd < 0 ? "opposite" : (r.supported_firm_cluster ? "supported" : (r.supported_design_rule ? "model-based only" : "not supported"));

function text(id, t) { const e = $(id); if (e) e.textContent = t; }

async function main() {
  const R = await fetch("data/results.json", { cache: "no-cache" }).then((r) => r.json());
  // hero strip
  if ($("v-strip")) dotStrip($("v-strip"), [
    { name: "Fraud firm-years", values: R.ai_scores.fraud, color: C.case },
    { name: "Matched firm-years", values: R.ai_scores.matched, color: C.matched },
  ], { min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10], thresholds: [{ v: R.thr5, label: "5 % matched-firm rate" }], axisTitle: "AI risk score (design, 0–10)" });

  // M1 coverage
  if ($("v-m1")) bars($("v-m1"), R.m1.filter((r) => r.layer !== "TRAD").map((r) => ({ label: r.characteristic, values: [
    { v: r.coverage_fraud_firm_years, color: C.case, name: "fraud firm-years" }, { v: r.coverage_matched_firm_years, color: C.matched, name: "matched firm-years" }] })),
    { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "fraud firm-years", color: C.case }, { name: "matched firm-years", color: C.matched }], labelWidth: 110 });
  // M3
  if ($("v-m3")) tiles($("v-m3"), R.m3);
  // H1-H3 forest
  if ($("v-h13")) forest($("v-h13"), R.h1_h3.map((r) => ({ label: `${r.hypothesis} · ${r.layer_name}`, sub: `${r.n_firm_years} firm-years, ${r.n_firms} firms, ${r.n_matched_sets} sets · p ${fmtP(r.p_unadjusted)} / firm-clustered ${fmtP(r.p_firm_cluster)}`,
    or: r.odds_ratio_per_sd, lo: r.or_ci_low, hi: r.or_ci_high, or2: r.odds_ratio_per_sd, lo2: r.or_ci_low_firm_cluster, hi2: r.or_ci_high_firm_cluster, color: C[r.layer_score.slice(0, 2)], status: status(r) })), { rowH: 52, labelWidth: 300 });
  // H2 re-runs + single characteristics
  if ($("v-h2")) forest($("v-h2"), R.h2_variants.map((r) => ({ label: r.layer_score, sub: `${r.variant} · ${r.n_firm_years} firm-years, ${r.n_matched_sets} sets · p ${fmtP(r.p_unadjusted)}`, or: r.odds_ratio_per_sd, lo: r.or_ci_low, hi: r.or_ci_high, color: C[(r.layer_code || "L2")] })), { rowH: 40, labelWidth: 300 });
  // H4 small multiples
  if ($("v-h4")) {
    const layers = ["L1_SCORE", "L2_SCORE", "L3_SCORE"], names = { L1_SCORE: "Financial", L2_SCORE: "Disclosure", L3_SCORE: "Governance" };
    smallMultiples($("v-h4"), layers.map((L) => {
      const rows = R.h4.filter((r) => r.layer_score === L).sort((a, b) => a.event_year - b.event_year);
      return { title: names[L], color: C[L.slice(0, 2)], series: [
        { name: "fraud firms", x: rows.map((r) => r.event_year), y: rows.map((r) => r.mean_fraud), color: C.case },
        { name: "matched firms", x: rows.map((r) => r.event_year), y: rows.map((r) => r.mean_matched), color: C.matched, dashed: true }],
        marks: rows.filter((r) => r.significant_as_predicted_cond).map((r) => ({ x: r.event_year, label: "p<.05" })) };
    }), { yMin: 0.3, yMax: 0.75, legend: [{ name: "fraud firms (mean layer score)", color: C.case }, { name: "matched firms", color: C.matched, dashed: true }] });
  }
  // H5 AUC bars
  if ($("v-h5")) bars($("v-h5"), [
    { label: "Traditional index alone", values: [{ v: R.h5.auc_trad_index_alone, color: C.matched, name: "AUC" }] },
    { label: "Model A: traditional + controls", values: [{ v: R.h5.loso_auc_model_A, color: C.ink2, name: "AUC" }] },
    { label: "Model B: Model A + AI risk score", values: [{ v: R.h5.loso_auc_model_B, color: C.accent, name: "AUC" }] },
    { label: "AI risk score alone", values: [{ v: R.h5.auc_ai_score_alone, color: C.L3, name: "AUC" }] },
  ], { max: 1, ticks: [0, 0.5, 1], fmt: (v) => v.toFixed(2), labelWidth: 230, barH: 16 });
  if ($("v-h5timing")) bars($("v-h5timing"), [
    { label: "AI rule flags the case (5 % rate)", values: [{ v: R.h5.cases_flagged_ai_5pct, color: C.L3, name: "cases" }] },
    { label: "AI rule flags (equal false-alarm rate)", values: [{ v: R.h5.cases_flagged_ai_equal_far, color: C.L3, name: "cases" }] },
    { label: "Traditional rule flags (same rate)", values: [{ v: R.h5.cases_flagged_trad_equal_far, color: C.matched, name: "cases" }] },
    { label: "Neither rule flags", values: [{ v: R.h5.cases_flagged_by_neither_equal_far, color: C.line, name: "cases" }] },
  ], { max: R.h5.cases, ticks: [0, Math.round(R.h5.cases / 2), R.h5.cases], fmt: (v) => String(Math.round(v)), labelWidth: 230, barH: 16 });
  // lead time by case
  if ($("v-lead")) dotRows($("v-lead"), R.lead.map((r) => ({ label: r.case_name, x: r.first_year, color: r.stratum === "core" ? C.case : C.L3, note: r.stratum })), { axisTitle: "earliest window year in which the AI risk score separated the case from its matched firms (5 % rate)" });
  // P1
  if ($("v-p1")) bars($("v-p1"), R.p1.map((r) => ({ label: `${r.form_group} (${r.n} cases)`, values: [
    { v: r.lending, color: C.L1, name: "lending" }, { v: r.sales, color: C.L2, name: "sales" }, { v: r.purchases, color: C.L3, name: "purchases" }] })),
    { max: 1, ticks: [0, 0.5, 1], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "lending", color: C.L1 }, { name: "sales", color: C.L2 }, { name: "purchases", color: C.L3 }], labelWidth: 170 });
  // A1 shares
  if ($("v-a1")) bars($("v-a1"), R.a1.map((r) => ({ label: r.code, values: [{ v: r.all, color: C.matched, name: "all firm-years" }, { v: r.fraud, color: C.case, name: "fraud firm-years" }] })),
    { max: 0.6, ticks: [0, 0.2, 0.4, 0.6], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "all firm-years", color: C.matched }, { name: "fraud firm-years", color: C.case }], labelWidth: 110 });
  // power
  if ($("v-power")) bars($("v-power"), [1.5, 1.65, 2.0].map((orr) => ({ label: `odds ratio ${orr} per SD`, values: R.power.filter((p) => p.odds_ratio_per_sd === orr).map((p) => ({ v: p.power, color: p.matched_sets === 21 ? C.matched : p.matched_sets === 30 ? C.accent : C.L2, name: `${p.matched_sets} sets` })) })),
    { max: 1, ticks: [0, 0.5, 0.8, 1], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "21 sets", color: C.matched }, { name: "30 sets", color: C.accent }, { name: "40 sets", color: C.L2 }], labelWidth: 170 });
  // sample sensitivity
  if ($("v-samples")) forest($("v-samples"), R.samples.flatMap((s) => ["H1", "H2", "H3"].map((h) => ({ label: `${h} · ${s.name}`, sub: `${s.sets} sets · p ${fmtP(s[h].p)} / firm-clustered ${fmtP(s[h].pc)}`, or: s[h].or, lo: s[h].lo, hi: s[h].hi, color: C[h === "H1" ? "L1" : h === "H2" ? "L2" : "L3"] }))), { rowH: 36, labelWidth: 330 });
  // exploratory
  if ($("v-oof")) forest($("v-oof"), R.exploratory.oof.map((r) => ({ label: r.model, sub: "leave-one-matched-set-out AUC, 2,000 set-bootstrap resamples", or: r.oof_auc, lo: r.oof_auc_ci_low, hi: r.oof_auc_ci_high, color: C.accent })), { linear: true, min: 0.4, max: 1, ticks: [0.5, 0.75, 1], ref: 0.5, rowH: 40, labelWidth: 200, axisTitle: "AUC (0.5 = chance)" });
  if ($("v-cases")) bars($("v-cases"), R.exploratory.per_case.map((r) => ({ label: r.case_id, values: [{ v: r.case_max, color: r.flag_years > 0 ? C.case : C.matched, name: "highest out-of-fold score" }] })), { max: 1, ticks: [0, 0.5, 1], fmt: (v) => v.toFixed(2), labelWidth: 150, barH: 9 });
  // status chips on home
  for (const r of R.h1_h3) text("chip-" + r.hypothesis, status(r));
  text("chip-H4", R.h4_rule_met.length ? "met for " + R.h4_rule_met.join(", ") : "not met");
  text("chip-H5", "not supported");
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the results data (" + e.message + ")."; b.hidden = false; } });
