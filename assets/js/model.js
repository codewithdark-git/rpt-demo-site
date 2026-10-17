const fmt = (v, d = 3) => (v === null || v === undefined || v === "" ? "–" : (typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v)));
function table(id, rows, cols, labels) {
  const t = document.getElementById(id); if (!t) return;
  if (!rows || !rows.length) { t.innerHTML = "<tr><td class='muted'>not available for this run</td></tr>"; return; }
  cols = cols || Object.keys(rows[0]); labels = labels || cols;
  t.innerHTML = "<thead><tr>" + labels.map(l => `<th>${l}</th>`).join("") + "</tr></thead><tbody>" +
    rows.map(r => "<tr>" + cols.map(c => `<td>${fmt(r[c])}</td>`).join("") + "</tr>").join("") + "</tbody>";
}
const D = await (await fetch("data/model_runs.json")).json();
const M = D.model;
document.getElementById("spec-text").textContent =
  `An ensemble of three learners (penalised logistic regression, random forest, gradient-boosted trees) on ${M.n_features} inputs in five groups, fitted on the matched panel and validated ${M.validation}. The alert threshold ${fmt(M.threshold)} is the score at a ${(M.target_fpr*100).toFixed(0)} % false-alarm rate among matched firm-years. The pre-registered battery evaluates the three design layers (L1 financial, L2 disclosure, L3 governance) and the AI score with conditional logit within matched sets, firm-clustered and score-bootstrap errors, Holm across H1–H3.`;
table("spec-table", M.fold_auc, ["model", "mean", "std", "count"], ["learner", "mean held-out AUC", "sd across folds", "folds"]);
table("features-table", Object.entries(M.feature_groups).map(([g, f]) => ({group: g, n: f.length, inputs: f.join(", ")})), ["group", "n", "inputs"], ["input group", "n", "inputs"]);
const runSel = document.getElementById("run-select"), formSel = document.getElementById("form-select");
D.runs.forEach(r => { const o = document.createElement("option"); o.value = r.key; o.textContent = r.label; runSel.appendChild(o); });
function render() {
  const run = D.runs.find(r => r.key === runSel.value) || D.runs[0];
  const forms = run.by_form.map(b => b.form);
  const prev = formSel.value;
  formSel.innerHTML = ""; run.by_form.forEach(b => { const o = document.createElement("option"); o.value = b.form; o.textContent = `${b.label} (${b.sets} sets)`; formSel.appendChild(o); });
  formSel.value = forms.includes(prev) ? prev : "all";
  const bf = run.by_form.find(b => b.form === formSel.value);
  const all = formSel.value === "all";
  document.getElementById("selection-note").textContent = all
    ? `Full battery output of ${run.label} (commit ${run.commit}).`
    : `Subset of the matched sets whose case is a ${bf.label.toLowerCase()} case, re-estimated from the run's firm-year scores (conditional logit with leverage and ROA where available, no bootstrap, no Holm). Fewer sets means wider intervals.`;
  const s = run.sample[0] || {};
  const rows = all ? run.h1_h3 : bf.tests;
  const chip = (h, r) => { const ok = r && r.odds_ratio_per_sd !== null; const p = r ? (all ? (r.p_holm_one_sided_firm_cluster ?? r.p_holm_firm_cluster) : (r.p_firm_cluster === null || r.p_firm_cluster === undefined ? null : (r.odds_ratio_per_sd > 1 ? r.p_firm_cluster / 2 : 1 - r.p_firm_cluster / 2))) : null;
    const dir = r && r.odds_ratio_per_sd !== null && r.odds_ratio_per_sd > 1; const sig = p !== null && p < 0.05;
    return `<a class="chip ${sig && dir ? "ok" : (!dir && ok ? "warn" : "")}" href="#h13"><span>${h} ${({H1:"financial",H2:"disclosure",H3:"governance"})[h]}</span><b>${ok ? `OR ${fmt(r.odds_ratio_per_sd,2)} · p ${fmt(p,3)}${sig && dir ? " · supported" : (!dir ? " · opposite direction, not supported" : " · not supported")}` : "–"}</b></a>`; };
  const h4met = run.h4.filter(r => String(r.design_rule_met_firm_cluster) === "True" || r.design_rule_met_firm_cluster === true).map(r => r.layer_score.replace("_SCORE",""));
  const h5n = run.h5_rules.filter(r => r.met).length;
  document.getElementById("model-chips").innerHTML = ["H1","H2","H3"].map(h => chip(h, rows.find(r => r.hypothesis === h))).join("") +
    `<a class="chip ${h4met.length ? "ok" : ""}" href="#h45"><span>H4 earlier years</span><b>${h4met.length ? h4met.join(", ") + " before the final year" : "no layer before the final year"}</b></a>` +
    `<a class="chip ${h5n ? "ok" : ""}" href="#h45"><span>H5 adds to audit signals</span><b>${h5n} of ${run.h5_rules.length} criteria met</b></a>`;
  const ab = run.model_ab[0] || {}, ext = run.external[0] || {}, lr = run.learned[0] || {};
  document.getElementById("glance-metrics").innerHTML = [["AUC, traditional signals (Model A)", fmt(ab.loso_auc_model_A,2)], ["AUC, + AI score (Model B)", fmt(ab.loso_auc_model_B,2)], ["AUC, learned score", fmt(lr.loso_auc_pooled,2)], ["AUC on the external set", fmt(ext.auc_ai_score_pooled,2)]]
    .map(([k, v]) => `<div><dt>${v}</dt><dd>${k}</dd></div>`).join("");
  document.getElementById("sample-metrics").innerHTML = [["matched sets", bf.sets], ["firm-years", bf.firm_years], ["case firm-years", bf.fraud_firm_years], ["cases in run", s.cases], ["matched firms in run", s.matched_firms]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${fmt(v)}</dd></div>`).join("");
  if (all) {
    table("h13-table", run.h1_h3, ["hypothesis", "layer_score", "n_informative_sets", "odds_ratio_per_sd", "or_ci_low_firm_cluster", "or_ci_high_firm_cluster", "p_firm_cluster", "p_scoreboot", "p_holm_firm_cluster", "p_one_sided_firm_cluster", "p_holm_one_sided_firm_cluster", "supported_design_rule", "direction_as_predicted"],
      ["H", "layer", "informative sets", "OR per SD", "CI low", "CI high", "p two-sided (firm-clustered)", "p (score bootstrap)", "Holm two-sided", "p one-sided", "Holm one-sided (decision)", "supported", "direction as predicted"]);
    const sig = run.h1_h3.filter(r => r.supported_design_rule === 1 || r.supported_design_rule === true || String(r.supported_design_rule) === "True").map(r => r.hypothesis);
    document.getElementById("h13-text").textContent = sig.length ? `Supported under the decision rule (one-sided, firm-clustered, Holm across H1–H3; adopted 17 Oct 2026): ${sig.join(", ")}. Two-sided Holm values are in the table for reference.` : "No hypothesis survives the Holm correction in this run. " + run.h1_h3.map(r => `${r.hypothesis}: OR ${fmt(r.odds_ratio_per_sd,2)} per SD, p ${fmt(r.p_firm_cluster,3)}${r.direction_as_predicted === "False" || r.direction_as_predicted === false ? " (opposite direction)" : ""}`).join("; ") + ".";
    table("within-table", run.within_set, ["score", "set_years", "share", "wilson_low", "wilson_high", "chance_share"], ["score", "set-years", "case ranked first", "Wilson low", "Wilson high", "chance"]);
  } else {
    table("h13-table", bf.tests, ["hypothesis", "description", "n_sets_used", "odds_ratio_per_sd", "ci_low", "ci_high", "p_firm_cluster", "p_model", "error"], ["H", "layer", "sets used", "OR per SD", "CI low", "CI high", "p (firm-clustered)", "p (model)", "note"]);
    document.getElementById("h13-text").textContent = `Re-estimated on the ${bf.sets} ${bf.label.toLowerCase()} sets only.`;
    table("within-table", bf.within_set, ["score", "set_years", "share", "wilson_low", "wilson_high", "chance_share"], ["score", "set-years", "case ranked first", "Wilson low", "Wilson high", "chance"]);
  }
  const ws = (all ? run.within_set : bf.within_set).find(r => r.score === "AI_SCORE"), tr = (all ? run.within_set : bf.within_set).find(r => r.score === "TRAD_INDEX");
  document.getElementById("within-text").textContent = ws ? `The AI score ranks the case firm above all its matched firms in ${(ws.share*100).toFixed(0)} % of set-years (chance ${(ws.chance_share*100).toFixed(0)} %)${tr ? `; the traditional red-flag index in ${(tr.share*100).toFixed(0)} %` : ""}.` : "";
  table("h4-table", run.h4, ["layer_score", "design_rule_met_firm_cluster", "years_significant"], ["layer", "significant before the final year", "years"]);
  table("h5-table", run.h5_rules, ["criterion", "met"], ["H5 criterion", "met"]);
  table("ab-table", run.model_ab, ["loso_auc_model_A", "loso_auc_model_B", "auc_gain_B_minus_A", "auc_gain_ci_low", "auc_gain_ci_high", "cases_flagged_ai_equal_far", "cases_flagged_trad_equal_far", "cases_ai_earlier_equal_far", "cases_trad_earlier_equal_far"],
    ["AUC Model A (traditional)", "AUC Model B (+ AI score)", "gain", "gain CI low", "gain CI high", "cases flagged AI", "cases flagged traditional", "AI earlier", "traditional earlier"]);
  document.getElementById("h45-text").textContent = `${run.h5_rules.filter(r => r.met).length} of ${run.h5_rules.length} pre-registered H5 criteria met. These tables are for the whole run; the form selection does not re-estimate them.`;
  table("learned-table", run.learned, ["loso_auc_pooled", "within_set_share_case_above_all", "within_set_wilson_low", "within_set_wilson_high", "lambda_full_sample"], ["learned score AUC (leave-one-set-out)", "case ranked first", "Wilson low", "Wilson high", "penalty"]);
  table("placebo-table", run.placebo, ["hypothesis", "real_coef_per_sd", "placebo_mean", "placebo_sd", "share_placebo_at_or_beyond_real", "reps"], ["H", "real coefficient", "placebo mean", "placebo sd", "share of placebos at or beyond", "reps"]);
  table("external-table", run.external, ["cases", "sets", "firm_years", "auc_ai_score_pooled", "auc_trad_index_pooled", "auc_learned_pooled", "within_set_ai_share", "within_set_trad_share"], ["cases", "sets", "firm-years", "AUC AI score", "AUC traditional", "AUC learned", "AI ranked first", "traditional ranked first"]);
  table("power-table", run.power, ["hypothesis", "informative_sets_observed", "odds_ratio_per_sd", "power", "mde_or_per_sd_80pct_power"], ["H", "informative sets", "OR per SD", "power", "MDE at 80 %"]);
  document.getElementById("checks-text").textContent = "The learned score is an L2-penalised conditional logit on the eight characteristics, fitted leave-one-set-out. Placebo: pseudo-cases drawn among the matched firms. External: nine cases not used for any decision. Power: simulated with the observed number of informative sets.";
  table("sources-table", run.value_sources);
  table("coverage-table", run.coverage, ["characteristic", "layer", "coverage_all", "coverage_fraud_firm_years", "coverage_matched_firm_years"], ["characteristic", "layer", "coverage", "case firm-years", "matched firm-years"]);
  document.getElementById("inputs-text").textContent = "Amounts come from XBRL related-party tags where the firm tagged them, otherwise from the rule coder reading the note; the coder version differs between runs.";
}
runSel.addEventListener("change", render); formSel.addEventListener("change", render); render();
