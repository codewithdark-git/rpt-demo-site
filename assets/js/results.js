import { forest, bars, smallMultiples, dotStrip, histOverlay, boxPlot, heatmap, dataTable, C, fmt } from "./viz.js";

const $ = (id) => document.getElementById(id);
const fmtP = (p) => p === null || p === undefined ? "—" : (p < 0.001 ? "< 0.001" : p.toFixed(3));
const status = (r) => r.coef_per_sd < 0 ? "opposite" : (r.supported_design_rule ? "supported" : "not supported");
const LAYER = { L1_SCORE: "financial", L2_SCORE: "disclosure", L3_SCORE: "governance" };
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

function distributions(FY, R) {
  const yearSel = $("f-year"), scoreSel = $("f-score"), strSel = $("f-stratum");
  if (!yearSel) return;
  const draw = () => {
    const yr = yearSel.value, sc = scoreSel.value, st = strSel.value;
    const rows = FY.filter((r) => (yr === "all" || String(r.event_time) === yr) && (st === "all" || r.role !== "case" || r.stratum === st) && r[sc] !== null);
    const fraud = rows.filter((r) => r.label === 1).map((r) => r[sc]), matched = rows.filter((r) => r.label === 0).map((r) => r[sc]);
    const max = sc === "AI_SCORE" ? 10 : 1, ticks = sc === "AI_SCORE" ? [0, 2, 4, 6, 8, 10] : [0, 0.25, 0.5, 0.75, 1];
    const thr = sc === "AI_SCORE" ? [{ v: R.thr5, label: "5 % matched-firm rate" }] : [];
    const groups = [{ name: "Case firm-years", values: fraud, color: C.case }, { name: "Matched firm-years", values: matched, color: C.matched }];
    histOverlay($("v-hist"), groups, { min: 0, max, ticks, bins: 20, thresholds: thr, xLabel: scoreSel.options[scoreSel.selectedIndex].text, ariaLabel: "overlaid histograms of the score by group" });
    boxPlot($("v-box"), groups, { min: 0, max, ticks, thresholds: thr, axisTitle: "box: interquartile range; line: median; whiskers: 1.5 × IQR" });
    dotStrip($("v-strip"), groups, { min: 0, max, ticks, thresholds: thr, axisTitle: "every firm-year" });
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
    const above = sc === "AI_SCORE" ? ` ${fraud.filter((v) => v >= R.thr5).length} case firm-years and ${matched.filter((v) => v >= R.thr5).length} matched firm-years lie above the threshold.` : "";
    $("dist-note").textContent = `${fraud.length} case and ${matched.length} matched firm-years shown; medians ${fmt(med(fraud))} and ${fmt(med(matched))}.${above}`;
  };
  [yearSel, scoreSel, strSel].forEach((s) => s.addEventListener("change", draw));
  draw();
}

function dashboard(R) {
  const d = $("dash");
  if (!d) return;
  const cards = R.h1_h3.map((r) => ({
    id: r.hypothesis, title: { H1: "Financial exposure", H2: "Disclosure incompleteness and vagueness", H3: "Weak governance" }[r.hypothesis],
    q: { H1: "Is related-party financial exposure higher in case firm-years?", H2: "Are case firms' RPT disclosures less complete and vaguer?", H3: "Is governance weaker in case firms?" }[r.hypothesis],
    predicted: "higher in case firms (odds ratio > 1)", observed: r.coef_per_sd > 0 ? "higher in case firms" : "lower in case firms",
    effect: `OR ${fmt(r.odds_ratio_per_sd)} per SD`, ci: `95 % CI ${fmt(r.or_ci_low)}–${fmt(r.or_ci_high)} (model-based); ${fmt(r.or_ci_low_firm_cluster)}–${fmt(r.or_ci_high_firm_cluster)} (firm-clustered)`,
    p: `one-sided firm-clustered p ${fmtP(r.p_one_sided_firm_cluster)}, Holm ${fmtP(r.p_holm_one_sided_firm_cluster)} (decision); two-sided ${fmtP(r.p_firm_cluster)}, Holm ${fmtP(r.p_holm_firm_cluster)}; model-based ${fmtP(r.p_unadjusted)} (reference)`,
    n: `${r.n_firm_years} firm-years · ${r.n_firms} firms · ${r.n_matched_sets} sets`, status: status(r),
    read: { H1: r.supported_design_rule ? "Measured as the fiscal-year total of related-party lending, payables, sales and purchases (note first, then XBRL tags, then Item 13), zero when the firm reports no transaction of that type. Case firms have higher scaled exposure than their matched firms, and the difference meets the decision rule (one-sided, firm-clustered, Holm-adjusted). With two-sided tests it would not." : "Case firms have higher scaled exposure than their matched firms, but the difference does not meet the decision rule.",
            H2: "Opposite direction on the measure as designed, which counts an item as stated if it appears anywhere in the note: longer notes about more transactions score as more complete. Measured per transaction, case and matched firms disclose alike, and vagueness does not differ. The prediction of less complete, vaguer disclosure is not supported on either measure.",
            H3: r.supported_design_rule ? "Carried by CEO duality. Meets the decision rule (one-sided, firm-clustered, Holm-adjusted); with two-sided tests it would not. Board independence is observed for few firm-years and runs slightly the other way." : "Carried by CEO duality; does not meet the decision rule." }[r.hypothesis],
  }));
  const h5 = R.h5;
  cards.push({ id: "H4", title: "Differences in earlier years", q: "Are the H1–H3 differences present before the final window year?", predicted: "a significant year before t−1", observed: R.h4_rule_met.length ? "met for " + R.h4_rule_met.join(", ") : "no layer significant before t−1",
    effect: "no year passes after Holm adjustment", ci: "see the per-year intervals below", p: "fifteen year-by-layer tests, firm-clustered and Holm-adjusted", n: "informative sets vary by year", status: R.h4_rule_met.length ? "supported" : "not supported",
    read: "The governance gap is present throughout the window and does not grow towards disclosure; no year passes the decision rule, one-sided or two-sided. An exploratory trend test finds no widening of the gap (see the exploratory section below)." });
  cards.push({ id: "H5", title: "Added value over audit signals", q: "Does the AI risk score add to the traditional index, in strength or timing?", predicted: "AI_SCORE significant in Model B; higher out-of-set AUC; earlier flags",
    observed: `Model B AUC ${fmt(h5.loso_auc_model_B)} vs Model A ${fmt(h5.loso_auc_model_A)}; traditional index alone ${fmt(h5.auc_trad_index_alone)}`, effect: `coefficient ${fmt(h5.AI_SCORE_coef_per_sd_model_B_pooled)} per SD`, ci: `OR ${h5.AI_SCORE_or_ci_pooled}`,
    p: `one-sided firm-clustered p ${fmtP(h5.AI_SCORE_coef_per_sd_model_B_pooled > 0 ? h5.AI_SCORE_p_model_B_pooled_firm_cluster / 2 : 1 - h5.AI_SCORE_p_model_B_pooled_firm_cluster / 2)} (decision); two-sided ${fmtP(h5.AI_SCORE_p_model_B_pooled_firm_cluster)}`, n: `${h5.n_firm_years} firm-years · ${h5.n_matched_sets} sets`, status: "not supported",
    read: `At an equal false-alarm rate the AI rule flags ${h5.cases_flagged_ai_equal_far} of ${h5.cases} cases, the traditional rule ${h5.cases_flagged_trad_equal_far}; ${h5.cases_flagged_by_neither_equal_far} are flagged by neither. In an exploratory re-run with the learned score in place of the rank-averaged score, the score adds to the audit signals in strength (2 of 5 criteria; see the exploratory section below).` });
  d.textContent = "";
  for (const c of cards) {
    const card = h("div", "dcard " + c.status.replace(/ /g, "-"));
    const head = h("div", "dhead");
    head.appendChild(h("span", "hid", c.id)); head.appendChild(h("h3", "", c.title)); head.appendChild(h("span", "status", c.status));
    card.appendChild(head);
    const dl = h("dl");
    for (const [k, v] of [["Question", c.q], ["Predicted", c.predicted], ["Observed", c.observed], ["Effect", c.effect], ["Uncertainty", c.ci], ["p-values", c.p], ["Sample", c.n]]) { dl.appendChild(h("dt", "", k)); dl.appendChild(h("dd", "", v)); }
    card.appendChild(dl);
    card.appendChild(h("p", "read", c.read));
    d.appendChild(card);
  }
}

async function main() {
  const R = await fetch("data/results.json", { cache: "no-cache" }).then((r) => r.json());
  let FY = null;
  if ($("f-year") || $("v-strip")) FY = await fetch("data/firm_years.json", { cache: "no-cache" }).then((r) => r.json());
  // home strip
  if ($("v-strip") && !$("f-year")) dotStrip($("v-strip"), [
    { name: "Case firm-years", values: R.ai_scores.fraud, color: C.case }, { name: "Matched firm-years", values: R.ai_scores.matched, color: C.matched },
  ], { min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10], thresholds: [{ v: R.thr5, label: "5 % matched-firm rate" }], axisTitle: "risk score (0–10)" });
  if ($("f-year")) distributions(FY, R);
  dashboard(R);
  if ($("v-h13")) {
    forest($("v-h13"), R.h1_h3.map((r) => ({ label: `${r.hypothesis} · ${LAYER[r.layer_score]}`, sub: `${r.n_firm_years} firm-years, ${r.n_firms} firms, ${r.n_matched_sets} sets · p ${fmtP(r.p_unadjusted)} / firm-clustered ${fmtP(r.p_firm_cluster)}`,
      or: r.odds_ratio_per_sd, lo: r.or_ci_low, hi: r.or_ci_high, or2: r.odds_ratio_per_sd, lo2: r.or_ci_low_firm_cluster, hi2: r.or_ci_high_firm_cluster, color: C[r.layer_score.slice(0, 2)], status: status(r) })), { rowH: 52, labelWidth: 300 });
    $("t-h13").appendChild(dataTable(["hypothesis", "layer_score", "n_firm_years", "n_firms", "n_matched_sets", "odds_ratio_per_sd", "or_ci_low", "or_ci_high", "p_unadjusted", "p_holm", "p_firm_cluster", "p_holm_firm_cluster"], R.h1_h3));
  }
  if ($("v-h4")) {
    const layers = ["L1_SCORE", "L2_SCORE", "L3_SCORE"], names = { L1_SCORE: "Financial", L2_SCORE: "Disclosure", L3_SCORE: "Governance" };
    smallMultiples($("v-h4"), layers.map((L) => {
      const rows = R.h4.filter((r) => r.layer_score === L).sort((a, b) => a.event_year - b.event_year);
      return { title: names[L], color: C[L.slice(0, 2)], series: [
        { name: "case firms", x: rows.map((r) => r.event_year), y: rows.map((r) => r.mean_fraud), color: C.case },
        { name: "matched firms", x: rows.map((r) => r.event_year), y: rows.map((r) => r.mean_matched), color: C.matched, dashed: true }],
        marks: rows.filter((r) => r.significant_as_predicted_cond).map((r) => ({ x: r.event_year, label: "p<.05" })) };
    }), { yMin: 0.3, yMax: 0.75, legend: [{ name: "case firms (mean layer score, circles)", color: C.case }, { name: "matched firms (squares)", color: C.matched, dashed: true }] });
    const rowsF = R.h4.filter((r) => Number.isFinite(r.cond_or_ci_low)).sort((a, b) => a.layer_score.localeCompare(b.layer_score) || a.event_year - b.event_year);
    forest($("v-h4f"), rowsF.map((r) => ({ label: `${names[r.layer_score]} · t${r.event_year}`, sub: `${r.n_firm_years} firm-years, ${r.n_matched_sets} sets · p ${fmtP(r.cond_p)}`, or: r.cond_or_per_sd, lo: r.cond_or_ci_low, hi: r.cond_or_ci_high, color: C[r.layer_score.slice(0, 2)], status: r.significant_as_predicted_cond ? "p < 0.05" : "" })), { rowH: 30, labelWidth: 230, axisTitle: "odds ratio per SD in that year (log scale, truncated at 64); 1 = no difference" });
    $("t-h4").appendChild(dataTable(["event_year", "layer_score", "n_firm_years", "n_matched_sets", "mean_fraud", "mean_matched", "cond_or_per_sd", "cond_or_ci_low", "cond_or_ci_high", "cond_p", "cond_p_firm_cluster", "mannwhitney_p_greater"], R.h4));
  }
  if ($("v-h5")) {
    bars($("v-h5"), [
      { label: "Traditional index alone", values: [{ v: R.h5.auc_trad_index_alone, color: C.matched, name: "AUC" }] },
      { label: "Model A: traditional + controls", values: [{ v: R.h5.loso_auc_model_A, color: C.ink2, name: "AUC" }] },
      { label: "Model B: Model A + AI risk score", values: [{ v: R.h5.loso_auc_model_B, color: C.accent, name: "AUC" }] },
      { label: "AI risk score alone", values: [{ v: R.h5.auc_ai_score_alone, color: C.L3, name: "AUC" }] },
    ], { max: 1, ticks: [0, 0.5, 1], fmt: (v) => v.toFixed(2), labelWidth: 230, barH: 16, axisTitle: "out-of-set AUC" });
    bars($("v-h5timing"), [
      { label: "AI rule flags the case (5 % rate)", values: [{ v: R.h5.cases_flagged_ai_5pct, color: C.L3, name: "cases" }] },
      { label: "AI rule flags (equal false-alarm rate)", values: [{ v: R.h5.cases_flagged_ai_equal_far, color: C.L3, name: "cases" }] },
      { label: "Traditional rule flags (same rate)", values: [{ v: R.h5.cases_flagged_trad_equal_far, color: C.matched, name: "cases" }] },
      { label: "Neither rule flags", values: [{ v: R.h5.cases_flagged_by_neither_equal_far, color: C.line, name: "cases" }] },
    ], { max: R.h5.cases, ticks: [0, Math.round(R.h5.cases / 2), R.h5.cases], fmt: (v) => String(Math.round(v)), labelWidth: 230, barH: 16, axisTitle: `cases of ${R.h5.cases}` });
  }
  if ($("v-heat")) {
    heatmap($("v-heat"), R.heatmap.rows.map((r) => ({ label: r.label, values: r.values, bold: r.bold, color: r.stratum === "matched" ? C.ink2 : (r.stratum === "core" ? C.case : C.L3) })), R.heatmap.cols, { labelWidth: 230, cell: 52, rowH: 19 });
    $("t-heat").appendChild(dataTable(["label", ...R.heatmap.cols], R.heatmap.rows.map((r) => ({ label: r.label, ...Object.fromEntries(R.heatmap.cols.map((c, i) => [c, r.values[i]])) }))));
    bars($("v-a1"), R.a1.map((r) => ({ label: r.code, values: [{ v: r.all, color: C.matched, name: "all firm-years" }, { v: r.fraud, color: C.case, name: "case firm-years" }] })),
      { max: 0.6, ticks: [0, 0.2, 0.4, 0.6], fmt: (v) => Math.round(v * 100) + " %", legend: [{ name: "all firm-years", color: C.matched }, { name: "case firm-years", color: C.case }], labelWidth: 110, axisTitle: "mean share of the risk score" });
  }
  if ($("v-samples")) forest($("v-samples"), R.samples.filter((q) => !/three-report/.test(q.name)).flatMap((q) => ["H1", "H2", "H3"].map((hh) => ({ label: `${hh} · ${q.name}`, sub: `${q.sets} sets · p ${fmtP(q[hh].p)} / firm-clustered ${fmtP(q[hh].pc)}`, or: q[hh].or, lo: q[hh].lo, hi: q[hh].hi, color: C[hh === "H1" ? "L1" : hh === "H2" ? "L2" : "L3"] }))), { rowH: 36, labelWidth: 330 });
  for (const r of R.h1_h3) { const e = $("chip-" + r.hypothesis); if (e) e.textContent = status(r); }
  if ($("chip-H4")) $("chip-H4").textContent = R.h4_rule_met.length ? "met for " + R.h4_rule_met.join(", ") : "not met";
  if ($("chip-H5")) $("chip-H5").textContent = "not supported";
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the results data (" + e.message + ")."; b.hidden = false; } });
