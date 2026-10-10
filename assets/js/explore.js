import { heatmap, C, fmt } from "./viz.js";
const $ = (id) => document.getElementById(id);
const COLS = [
  { k: "name", label: "Firm", type: "text" }, { k: "role", label: "Group", type: "text" }, { k: "case_name", label: "Matched set", type: "text" },
  { k: "fiscal_year", label: "FY", type: "int" }, { k: "event_time", label: "t", type: "int" },
  { k: "rank_RP_LEND", label: "lend", type: "num" }, { k: "rank_RP_PAY", label: "pay", type: "num" }, { k: "rank_RP_SALES", label: "sales", type: "num" }, { k: "rank_RP_PURCH", label: "purch", type: "num" },
  { k: "rank_RP_INCOMP", label: "incomp", type: "num" }, { k: "rank_RP_VAGUE", label: "vague", type: "num" }, { k: "rank_BRD_NONIND", label: "board", type: "num" }, { k: "rank_DUAL", label: "dual", type: "num" },
  { k: "L1_SCORE", label: "L1", type: "num" }, { k: "L2_SCORE", label: "L2", type: "num" }, { k: "L3_SCORE", label: "L3", type: "num" }, { k: "AI_SCORE", label: "AI score", type: "num" },
  { k: "AI_FLAG_5", label: "flag", type: "flag" }, { k: "TRAD_INDEX", label: "trad", type: "int" }, { k: "ensemble_oof", label: "ensemble (expl.)", type: "num" },
];
let FY = [], view = [], sortKey = "AI_SCORE", sortDir = -1, page = 0, selected = new Set();
const ranges = {};
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

function applyFilters() {
  const q = $("x-search").value.trim().toLowerCase(), role = $("x-role").value, yr = $("x-year").value, fl = $("x-flag").value;
  view = FY.filter((r) => (!q || r.name.toLowerCase().includes(q) || r.case_name.toLowerCase().includes(q) || r.cik.includes(q)) && (role === "all" || r.role === role) && (yr === "all" || String(r.event_time) === yr) && (fl === "all" || String(r.AI_FLAG_5 ? 1 : 0) === fl));
  view.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; return (x < y ? -1 : x > y ? 1 : 0) * sortDir; });
  page = 0;
  render();
}
function shade(k, v) {
  if (v === null || v === undefined) return "";
  const r = ranges[k]; if (!r || r.max === r.min) return "";
  const a = (v - r.min) / (r.max - r.min);
  return `background: rgba(43,95,140,${(0.05 + 0.4 * a).toFixed(3)})`;
}
function render() {
  const per = Number($("x-page").value), start = page * per, rows = view.slice(start, start + per);
  const body = $("x-body"); body.textContent = "";
  for (const r of rows) {
    const tr = h("tr", r.role === "case" ? "case" : "");
    tr.tabIndex = 0;
    const key = r.cik + ":" + r.fiscal_year;
    if (selected.has(key)) tr.classList.add("selected");
    for (const c of COLS) {
      const v = r[c.k];
      const td = h("td", c.type === "text" ? "" : "num");
      if (c.type === "flag") td.textContent = v ? "●" : "";
      else if (c.type === "int") td.textContent = v === null || v === undefined ? "" : String(Math.round(v));
      else if (c.type === "num") { td.textContent = v === null || v === undefined ? "" : fmt(v, c.k === "AI_SCORE" ? 2 : 2); td.setAttribute("style", shade(c.k, v)); }
      else td.textContent = c.k === "role" ? (v === "case" ? "observed case" : "matched") : v;
      tr.appendChild(td);
    }
    const open = () => { selected.has(key) ? selected.delete(key) : selected.add(key); tr.classList.toggle("selected"); detail(r); };
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { open(); e.preventDefault(); } });
    body.appendChild(tr);
  }
  $("x-count").textContent = `${view.length} firm-years match · ${selected.size} selected`;
  $("x-pos").textContent = `${view.length ? start + 1 : 0}–${Math.min(view.length, start + per)} of ${view.length}`;
  $("x-prev").disabled = page === 0; $("x-next").disabled = start + per >= view.length;
}
function detail(r) {
  const d = $("x-detail"); d.hidden = false; d.textContent = "";
  d.appendChild(h("h3", "", `${r.name} · FY${r.fiscal_year} (t${r.event_time}) · ${r.role === "case" ? "observed case firm" : "matched comparison firm"} of ${r.case_name}`));
  const dl = h("dl", "kv");
  const add = (k, v) => { dl.appendChild(h("dt", "", k)); dl.appendChild(h("dd", "", v)); };
  add("AI risk score", `${fmt(r.AI_SCORE)} ${r.AI_FLAG_5 ? "(above the 5 % matched-firm threshold)" : "(below threshold)"} · layers L1 ${fmt(r.L1_SCORE)}, L2 ${fmt(r.L2_SCORE)}, L3 ${fmt(r.L3_SCORE)}`);
  add("Named evidence (A1)", r.named_evidence || "—");
  add("Traditional signals", `index ${r.TRAD_INDEX}: material weakness ${r.ICFR_MW}, audit opinion ${r.AUD_OPIN}, auditor change ${r.AUD_CHG}, restatement ${r.RESTATE}`);
  add("Exploratory out-of-fold", r.ensemble_oof === null ? "no score (set added after the fit)" : `ensemble ${fmt(r.ensemble_oof)}, logit ${fmt(r.logit_oof)}`);
  d.appendChild(dl);
  const a = h("a", "btn", "Open the filings, evidence and live recomputation for this firm-year");
  a.href = `run.html?cik=${r.cik}&fy=${r.fiscal_year}`;
  d.appendChild(a);
}
function exportCSV() {
  const rows = FY.filter((r) => selected.has(r.cik + ":" + r.fiscal_year));
  if (!rows.length) { alert("Select rows first (click a row)."); return; }
  const cols = Object.keys(rows[0]);
  const esc = (v) => v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "selected_firm_years.csv"; a.click();
}
function setHeat(setId) {
  const rows = FY.filter((r) => r.cluster_id === setId);
  const firms = [...new Set(rows.map((r) => r.cik))].sort((a, b) => (rows.find((r) => r.cik === a).role === "case" ? -1 : 1) - (rows.find((r) => r.cik === b).role === "case" ? -1 : 1));
  const years = [-5, -4, -3, -2, -1];
  heatmap($("v-setheat"), firms.map((cik) => { const f = rows.find((r) => r.cik === cik); return { label: f.name + (f.role === "case" ? " (case)" : ""), bold: f.role === "case", color: f.role === "case" ? C.case : C.ink, values: years.map((t) => { const r = rows.find((x) => x.cik === cik && x.event_time === t); return r ? r.AI_SCORE : null; }) }; }), years.map((t) => "t" + t), { min: 0, max: 10, labelWidth: 260, cell: 60, rowH: 22 });
}
async function main() {
  FY = await fetch("data/firm_years.json", { cache: "no-cache" }).then((r) => r.json());
  for (const c of COLS) if (c.type === "num") { const vals = FY.map((r) => r[c.k]).filter((v) => v !== null && v !== undefined); ranges[c.k] = { min: Math.min(...vals), max: Math.max(...vals) }; }
  const head = $("x-head");
  for (const c of COLS) {
    const th = h("th", c.type === "text" ? "" : "num"); const b = h("button", "sort", c.label); b.type = "button";
    b.addEventListener("click", () => { if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.type === "text" ? 1 : -1; } head.querySelectorAll("button").forEach((x) => x.removeAttribute("aria-sort")); b.setAttribute("aria-sort", sortDir > 0 ? "ascending" : "descending"); applyFilters(); });
    th.appendChild(b); head.appendChild(th);
  }
  ["x-search", "x-role", "x-year", "x-flag", "x-page"].forEach((id) => $(id).addEventListener("input", applyFilters));
  $("x-prev").addEventListener("click", () => { page--; render(); }); $("x-next").addEventListener("click", () => { page++; render(); });
  $("x-export").addEventListener("click", exportCSV);
  applyFilters();
  const sets = [...new Map(FY.filter((r) => r.role === "case").map((r) => [r.cluster_id, r.case_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const sel = $("x-set");
  for (const [id, name] of sets) { const o = document.createElement("option"); o.value = id; o.textContent = name; sel.appendChild(o); }
  sel.addEventListener("change", () => setHeat(sel.value));
  setHeat(sets[0][0]);
  const years = [-5, -4, -3, -2, -1];
  heatmap($("v-pivot"), sets.map(([id, name]) => ({ label: name, color: C.ink, values: years.map((t) => { const r = FY.find((x) => x.cluster_id === id && x.role === "case" && x.event_time === t); return r ? r.AI_SCORE : null; }) })), years.map((t) => "t" + t), { min: 0, max: 10, labelWidth: 230, cell: 60, rowH: 19 });
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the firm-year data (" + e.message + ")."; b.hidden = false; } });
