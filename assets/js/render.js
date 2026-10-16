// DOM rendering of the three stages for one firm-year. All filing text is inserted with textContent.
import { designScore, aiFlag, approxEqual, LAYERS } from "./compute.js";
import { lineChart } from "./charts.js";

const LAYER_NAME = { L1: "Layer 1 — financial (conflict of interest)", L2: "Layer 2 — disclosure (information asymmetry)", L3: "Layer 3 — governance (weak monitoring)" };
const LAYER_COLOR = { L1: "#c8781a", L2: "#2f7d6f", L3: "#5a4fcf" };

export function h(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(add); return; }
    e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  add(children);
  return e;
}
const fmt = (v, d = 3) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : (typeof v === "number" ? v.toFixed(d) : String(v));
const fmtMoney = (v) => (v === null || v === undefined) ? "—" : Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(2) + " bn" : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + " m" : v.toLocaleString();
const flag01 = (v) => v === null || v === undefined ? "not observed" : (Number(v) === 1 ? "1 (yes)" : Number(v) === 0 ? "0 (no)" : fmt(v));
const check = (rec, comp, tol = 1e-9) => h("span", { class: "check " + (approxEqual(rec, comp, tol) ? "ok" : "bad"), text: approxEqual(rec, comp, tol) ? "✓ = recorded" : `✗ recorded ${fmt(rec, 6)}` });
const link = (href, text) => h("a", { href, target: "_blank", rel: "noopener", text });
const evid = (t) => t ? h("div", { class: "evidence", text: t }) : h("span", { class: "muted small", text: "no passage" });
const table = (head, rows, numCols = []) => {
  const t = h("table");
  t.appendChild(h("thead", {}, h("tr", {}, head.map((x, i) => h("th", { class: numCols.includes(i) ? "num" : "", text: x })))));
  t.appendChild(h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c, i) => h("td", { class: numCols.includes(i) ? "num" : "" }, c))))));
  return h("div", { class: "table-wrap" }, t);
};

export function renderHeader(co, G) {
  const isCase = co.role === "case";
  const wrap = h("div");
  wrap.appendChild(h("h2", { style: "border:0;margin-top:0" }, [co.name + " ", h("span", { class: "badge " + co.role, text: isCase ? "observed case firm" : "matched firm" }), " ", h("span", { class: "badge " + (co.stratum === "core" ? "core" : "disc"), text: co.stratum === "core" ? "misstatement / misappropriation" : "disclosure-only" })]));
  const dl = h("dl", { class: "kv" });
  const add = (k, v) => { dl.appendChild(h("dt", { text: k })); dl.appendChild(h("dd", {}, v)); };
  add("CIK / EDGAR name", [h("span", { class: "mono", text: co.cik }), " · " + co.edgar_name + " · ", link(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${co.cik}&type=10-K`, "EDGAR filings")]);
  add("Industry", `${co.sic} — ${co.sic_description || ""}`);
  add("Matched set", `${co.set.case_name} (${co.set.firms.length} firms: the case and ${co.set.firms.length - 1} matched)`);
  if (isCase && co.case) {
    add("Form of fraud (D1)", co.case.d1_class);
    add("Revelation (D2)", `${co.case.revelation_date} (${co.case.confidence} confidence) — ${co.case.revelation_source}`);
    add("Enforcement", `${co.case.aaer_numbers || "see companies document"}; misconduct FY${co.case.misconduct_fy[0]}–${co.case.misconduct_fy[1]}`);
  } else if (co.matched_case) {
    add("Matched to", `${co.matched_case.case_name} (revealed ${co.matched_case.revelation_date}); this firm had no SEC accounting enforcement`);
  }
  add("Window", `FY${co.years[0].fiscal_year}–FY${co.years[co.years.length - 1].fiscal_year} (event time −${co.years.length}…−1); FRAUD = ${isCase ? 1 : 0} in every window year`);
  wrap.appendChild(dl);
  return wrap;
}

export function renderStage1(co, y, G) {
  const s = h("section", { class: "stage", id: "stage-1" });
  s.appendChild(h("h2", {}, [h("span", { class: "step", text: "1" }), `Data processing — FY${y.fiscal_year} (event time ${y.event_time})`]));
  const f = y.filings;
  const rows = [];
  if (f.tenk) rows.push(["Annual report", f.tenk.form, f.tenk.filing_date, h("span", { class: "mono", text: f.tenk.accession }), link(f.tenk.url, "open on EDGAR")]);
  if (f.def14a) rows.push(["Proxy statement", "DEF 14A", f.def14a.filing_date, h("span", { class: "mono", text: f.def14a.accession }), link(f.def14a.url, "open on EDGAR")]);
  else rows.push(["Proxy statement", "DEF 14A", "—", "none linked for this fiscal year", ""]);
  for (const e of f.eightk || []) rows.push(["8-K with Item 4.01 / 4.02", "8-K", e.filing_date || "", h("span", { class: "mono", text: e.accession }), link(e.url, "open on EDGAR")]);
  for (const e of f.tenka || []) rows.push(["Amended annual report", "10-K/A", e.filing_date || "", h("span", { class: "mono", text: e.accession }), link(e.url, "open on EDGAR")]);
  s.appendChild(h("h3", { text: "Filings used" }));
  s.appendChild(table(["Document", "Form", "Filed", "Accession", ""], rows));
  s.appendChild(h("p", { class: "small muted", text: "Downloaded from the SEC EDGAR Archives (https://www.sec.gov/Archives/edgar/data/<CIK>/<accession>/) with the filing list from the submissions API; XBRL values from the company-facts API; 8-K item codes from the submissions API; every 10-K/A read for restatement language." }));
  s.appendChild(h("h3", { text: "Sections extracted" }));
  const secRows = [];
  const names = { item13: "Item 13 — Certain relationships and related transactions", rpt_disclosure: "Related-party text used (Item 13 body, or the DEF 14A related-party section when Item 13 is incorporated by reference)", rp_note: "Related-party note to the financial statements", item9a: "Item 9A — Controls and procedures", proxy_rpt: "DEF 14A related-party section (every-year proxy fetch)" };
  for (const key of ["rpt_disclosure", "rp_note", "item13", "item9a", "proxy_rpt"]) {
    const sec = y.sections[key];
    if (!sec) continue;
    const det = h("details");
    det.appendChild(h("summary", { text: `${names[key]} — ${sec.status}${sec.words ? ", " + sec.words + " words" : ""}${sec.truncated ? " (first " + sec.excerpt.length + " characters shown)" : ""}` }));
    det.appendChild(h("pre", { class: "excerpt", text: sec.excerpt || "(not available)" }));
    secRows.push(det);
  }
  secRows.forEach((d) => s.appendChild(d));
  s.appendChild(h("p", { class: "small" }, [h("b", { text: "Source of the related-party text for this firm-year: " }), y.rpt_text_source, ". Texts shorter than 40 words are treated as missing, never as zero. Item 13 is incorporated by reference to the proxy statement in most 10-Ks, so the DEF 14A section is the usual source."]));
  return s;
}

export function renderStage2(co, y, G) {
  const s = h("section", { class: "stage", id: "stage-2" });
  s.appendChild(h("h2", {}, [h("span", { class: "step", text: "2" }), "Variable derivation"]));
  const c = y.coded, x = y.xbrl || {};
  const xv = (k) => x[k] ? [fmtMoney(x[k].value), " ", h("span", { class: "small muted", text: x[k].tag ? `us-gaap:${x[k].tag} · ${x[k].accession || ""}` : "no XBRL value" })] : "—";
  // eight characteristics
  s.appendChild(h("h3", { text: "The eight design characteristics" }));
  const rp = c.rp_note || {};
  const amt = (code) => rp[code] && rp[code].amount !== null ? [`$${fmtMoney(rp[code].amount)}`, evid(rp[code].evidence)] : h("span", { class: "muted", text: "no amount stated (left missing, never zero)" });
  const chRows = [
    ["RP_LEND", "loans, advances and receivables due from related parties ÷ total assets", amt("RP_LEND"), xv("total_assets"), fmt(y.characteristics.RP_LEND.value, 4)],
    ["RP_PAY", "loans, notes and amounts due to related parties ÷ total assets", amt("RP_PAY"), xv("total_assets"), fmt(y.characteristics.RP_PAY.value, 4)],
    ["RP_SALES", "revenue from related parties ÷ total revenue", amt("RP_SALES"), xv("revenue"), fmt(y.characteristics.RP_SALES.value, 4)],
    ["RP_PURCH", "purchases, fees, rent and services paid to related parties ÷ total assets", amt("RP_PURCH"), xv("total_assets"), fmt(y.characteristics.RP_PURCH.value, 4)],
  ];
  s.appendChild(table(["Code", "Formula", "Numerator (fiscal-year total of the flow, with its sentence or XBRL tag)", "Denominator", "Value"], chRows, [4]));
  const items = ["counterparty_named", "amount_stated", "terms_stated", "purpose_stated"];
  const n = items.reduce((a, k) => a + (Number(rp[k]) || 0), 0);
  s.appendChild(h("p", { class: "small" }, [h("b", { text: "RP_INCOMP " }), "= (4 − items stated) ÷ 4. Items on the related-party text: ", items.map((k) => `${k} = ${flag01(rp[k])}`).join("; "), rp.no_transactions_stated ? "; the text states that there were no related-party transactions (scored on that text: see §3.7.1)" : "", ". ", h("span", { class: "eq", text: `(4 − ${n}) / 4 = ${fmt(y.characteristics.RP_INCOMP.value, 3)}` }), y.characteristics.RP_INCOMP.value === null ? " — no related-party text, so the characteristic is missing" : ""]));
  const lx = y.lexicon || {};
  const vg = lx.vagueness || {};
  s.appendChild(h("p", { class: "small" }, [h("b", { text: "RP_VAGUE " }), "= (uncertainty + weak-modal words) ÷ total words of the related-party text (Loughran–McDonald lists). ", h("span", { class: "eq", text: `vagueness = ${fmt(y.characteristics.RP_VAGUE.value, 4)}` }), vg.high_risk_terms && vg.high_risk_terms.length ? ` Matched terms: ${vg.high_risk_terms.slice(0, 12).join(", ")}.` : "", lx.words ? ` Words: ${lx.words}; Fog index ${fmt(lx.fog, 1)}.` : ""]));
  const gv = c.governance || {};
  s.appendChild(table(["Code", "Formula", "Coded value", "Evidence (DEF 14A)"], [
    ["BRD_NONIND", "1 − (independent directors ÷ board size)", [fmt(y.characteristics.BRD_NONIND.value, 3), gv.board_indep !== null && gv.board_indep !== undefined ? ` (independent share ${fmt(gv.board_indep, 3)})` : " — board count not stated in the proxy"], evid(gv.board_indep_evidence)],
    ["DUAL", "1 if the chief executive also chairs the board", flag01(gv.ceo_duality), evid(gv.ceo_duality_evidence)],
  ]));
  // traditional and controls
  s.appendChild(h("h3", { text: "Traditional signals (the reactive benchmark) and controls" }));
  const ic = c.icfr || {}, au = c.audit_opinion || {}, tk = c.restatement_10ka || {}, ek = c.eightk || {};
  const d = y.design_recorded;
  s.appendChild(table(["Signal", "Definition", "Value", "Evidence"], [
    ["ICFR_MW", "material weakness reported in Item 9A", flag01(d.ICFR_MW), h("span", { class: "small muted", text: ic.icfr_text_available ? `Item 9A text available; ICFR not effective = ${flag01(ic.icfr_not_effective)}; material-weakness count ${fmt(ic.mw_count, 0)}` : "Item 9A text not available" })],
    ["AUD_OPIN", "modified (qualified, adverse, disclaimer) or going-concern opinion", flag01(d.AUD_OPIN), evid(gv.going_concern_evidence || au.modified_opinion_evidence || (au.audit_report_found ? "audit report found; no modified or going-concern language" : ""))],
    ["AUD_CHG", "8-K Item 4.01 filed in the fiscal year", flag01(d.AUD_CHG), h("span", { class: "small muted", text: ek.accessions ? `8-K accessions: ${ek.accessions}` : (gv.auditor_name ? `signing auditor: ${gv.auditor_name}` : "") })],
    ["RESTATE", "8-K Item 4.02, or a 10-K/A that restates the financial statements", flag01(d.RESTATE), evid(tk.evidence || (ek.restatement_8k ? "8-K Item 4.02 on file" : ""))],
    ["TRAD_INDEX", "ICFR_MW + AUD_OPIN + AUD_CHG + RESTATE", fmt(d.TRAD_INDEX, 0), ""],
  ]));
  s.appendChild(table(["Control", "Formula", "Value", "XBRL inputs"], [
    ["LEV", "total liabilities ÷ total assets, bounded to [0, 3]", fmt(y.features.leverage, 4), [xv("total_liabilities"), " / ", xv("total_assets")]],
    ["ROA", "net income ÷ total assets, bounded to [−1, 1]", fmt(y.features.roa, 4), [xv("net_income"), " / ", xv("total_assets")]],
    ["ln_assets", "natural log of total assets", fmt(y.features.ln_assets, 4), xv("total_assets")],
    ["listing_age", "years since the first annual report on EDGAR", fmt(y.features.listing_age, 0), "filing manifest"],
  ]));
  return s;
}

export function renderStage3(co, y, G) {
  const s = h("section", { class: "stage", id: "stage-3" });
  s.appendChild(h("h2", {}, [h("span", { class: "step", text: "3" }), "How the values enter the score"]));
  // (a) design score
  s.appendChild(h("h3", { text: "(a) The risk score — recomputed live" }));
  s.appendChild(h("p", { class: "small muted", text: `Step 3: each characteristic is ranked 0–1 against all ${G.sample.window_firm_years} analysed window firm-years (average ranks for ties: rank = (below + 1 + at-or-below) ÷ (2 n)). Step 4: ranks averaged within layer over the characteristics observed. Step 5: AI_SCORE = 10 × mean of the layer scores that exist.` }));
  const values = {};
  for (const ch of G.characteristics) values[ch.code] = y.characteristics[ch.code].value;
  const ds = designScore(G.characteristics, values);
  const rows = G.characteristics.map((ch) => {
    const r = ds.ranks[ch.code];
    return [h("span", { class: "badge " + ch.layer.toLowerCase(), text: ch.layer }), ch.code, fmt(values[ch.code], 4), r ? `${r.lo} below, ${r.hi} at or below, of ${r.n}` : "not observed", r ? fmt(r.rank, 4) : "—", r ? check(y.characteristics[ch.code].rank_recorded, r.rank) : ""];
  });
  s.appendChild(table(["Layer", "Characteristic", "Value", "Position in the ranked population", "Rank 0–1", ""], rows, [2, 4]));
  const d = y.design_recorded;
  const lrows = LAYERS.map((L) => [h("span", { style: `color:${LAYER_COLOR[L]};font-weight:600`, text: LAYER_NAME[L] }), `${ds.nObs[L]} of ${G.characteristics.filter((c) => c.layer === L).length} characteristics observed`, fmt(ds.layer[L], 4), check(d[`${L}_SCORE`], ds.layer[L])]);
  s.appendChild(table(["Layer", "Inputs", "Layer score (mean rank)", ""], lrows, [2]));
  const thr = G.ai_flag.thr_5pct_far;
  s.appendChild(h("p", {}, [h("span", { class: "eq", text: `score = 10 × mean(${LAYERS.filter((L) => ds.layer[L] !== null).map((L) => fmt(ds.layer[L], 4)).join(", ") || "no layer"}) = ${fmt(ds.AI_SCORE, 4)}` }), " ", check(d.AI_SCORE, ds.AI_SCORE), " · threshold at the 5 % matched-firm rate = ", h("b", { text: fmt(thr, 3) }), " → ", h("b", { class: aiFlag(ds.AI_SCORE, thr) ? "bad" : "ok", text: aiFlag(ds.AI_SCORE, thr) ? "flagged" : "not flagged" }), " ", check(d.AI_FLAG_5 ? 1 : 0, aiFlag(ds.AI_SCORE, thr) ? 1 : 0, 0)]));
  if (ds.AI_SCORE !== null) s.appendChild(h("p", { class: "small" }, [h("b", { text: "A1 traceability — share of the score by layer and characteristic: " }), LAYERS.map((L) => `${L} ${(100 * ds.shares[L]).toFixed(0)} %`).join(", "), "; named evidence: ", h("i", { text: ds.namedEvidence }), " ", check(d.named_evidence === ds.namedEvidence ? 1 : 0, 1, 0)]));
  else s.appendChild(h("p", { class: "small muted", text: "No characteristic is observed for this firm-year, so it has no AI risk score (the design leaves it blank; nothing is imputed)." }));
  s.appendChild(h("p", { class: "small muted", text: "'Flagged' means the score is above the matched-firm 95th percentile, a threshold fixed by construction; it is a comparison within the sample, not an accuracy claim." }));

  // (c) set chart
  s.appendChild(h("h3", { text: "(b) This firm against its matched set" }));
  const ser = co.set.series;
  const mk = (key, label) => co.set.firms.map((f) => ({ label: f.name, x: ser[f.cik].event_time, y: ser[f.cik][key], color: f.cik === co.cik ? (co.role === "case" ? "#b3261e" : "#1f5f8b") : "#9aa5b1", highlight: f.cik === co.cik }));
  const c1 = h("div", { class: "chart" });
  lineChart(c1, mk("ai_score"), { thresholds: [{ y: thr, label: "5 % matched-firm rate" }], yLabel: "risk score (0–10)", ariaLabel: "AI risk score by event time" });
  s.appendChild(c1);
  s.appendChild(h("div", { class: "legend" }, [h("span", {}, [h("span", { class: "swatch", style: "background:#b3261e" }), "selected firm (case)"]), h("span", {}, [h("span", { class: "swatch", style: "background:#1f5f8b" }), "selected firm (matched)"]), h("span", {}, [h("span", { class: "swatch", style: "background:#9aa5b1" }), "other firms of the set"])]));
  return s;
}


/** Stage 4: side-by-side comparison of two firms of the same set in the same fiscal year. */
export function renderCompare(co, y, other, G) {
  const oy = other.years.find((q) => q.fiscal_year === y.fiscal_year) || other.years.find((q) => q.event_time === y.event_time);
  if (!oy) return h("p", { class: "muted small", text: "The other firm has no analysed firm-year for this fiscal year." });
  const rows = [];
  const vA = {}, vB = {};
  for (const c of G.characteristics) { vA[c.code] = y.characteristics[c.code].value; vB[c.code] = oy.characteristics[c.code].value; }
  const dA = designScore(G.characteristics, vA), dB = designScore(G.characteristics, vB);
  for (const c of G.characteristics) {
    const ra = dA.ranks[c.code], rb = dB.ranks[c.code];
    rows.push([h("span", { class: "badge " + c.layer.toLowerCase(), text: c.layer }), c.code, fmt(vA[c.code], 4), ra ? fmt(ra.rank, 3) : "not observed", fmt(vB[c.code], 4), rb ? fmt(rb.rank, 3) : "not observed"]);
  }
  for (const L of LAYERS) rows.push(["", LAYER_NAME[L], "", fmt(dA.layer[L], 3), "", fmt(dB.layer[L], 3)]);
  rows.push(["", "AI risk score", "", fmt(dA.AI_SCORE, 3) + (aiFlag(dA.AI_SCORE, G.ai_flag.thr_5pct_far) ? " ▲" : ""), "", fmt(dB.AI_SCORE, 3) + (aiFlag(dB.AI_SCORE, G.ai_flag.thr_5pct_far) ? " ▲" : "")]);
  rows.push(["", "traditional index", "", fmt(y.design_recorded.TRAD_INDEX, 0), "", fmt(oy.design_recorded.TRAD_INDEX, 0)]);
  const wrap = h("div");
  wrap.appendChild(h("p", { class: "small" }, [h("b", { text: co.name }), ` (${co.role === "case" ? "observed case" : "matched"}) against `, h("b", { text: other.name }), ` (${other.role === "case" ? "observed case" : "matched"}), FY${y.fiscal_year} / FY${oy.fiscal_year}, event time ${y.event_time} / ${oy.event_time}. ▲ marks a score above the 5 % matched-firm threshold.`]));
  wrap.appendChild(table(["Layer", "Characteristic", co.name + " value", "rank", other.name + " value", "rank"], rows, [2, 3, 4, 5]));
  return wrap;
}
