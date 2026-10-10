import { funnel, bars, timeline, histogram, dataTable, C } from "./viz.js";
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}, text) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (text !== undefined) e.textContent = text; return e; };

function matchingDiagram(container) {
  container.textContent = "";
  const s = el("svg", { viewBox: "0 0 760 190", role: "img", class: "viz" });
  s.appendChild(el("title", {}, "Matching diagram: one case firm and its five matched firms selected by industry and size"));
  const txt = (x, y, t, o = {}) => s.appendChild(el("text", { x, y, "font-size": o.size || 11, fill: o.fill || C.ink2, "text-anchor": o.anchor || "start", "font-weight": o.weight || 400 }, t));
  // pool box
  s.appendChild(el("rect", { x: 10, y: 30, width: 300, height: 130, rx: 6, fill: "#fff", stroke: C.line }));
  txt(20, 50, "Same industry (four-digit SIC) pool", { fill: C.ink, weight: 600 });
  txt(20, 66, "10-K in every window year · no enforcement match · XBRL assets", { size: 9.5 });
  const rng = [0.1, 0.22, 0.35, 0.41, 0.5, 0.58, 0.63, 0.7, 0.78, 0.86, 0.93, 0.27, 0.46, 0.75];
  rng.forEach((f, i) => s.appendChild(el("circle", { cx: 30 + f * 260, cy: 100 + ((i % 3) - 1) * 18, r: 5, fill: i % 4 === 0 ? C.accent : C.matched, "fill-opacity": 0.6 })));
  txt(20, 150, "size axis: log total assets in the year before revelation →", { size: 9.5 });
  // case
  s.appendChild(el("circle", { cx: 420, cy: 95, r: 14, fill: C.case }));
  txt(420, 128, "case firm", { anchor: "middle", fill: C.case, weight: 600 });
  txt(420, 142, "assets A at year r−1", { anchor: "middle", size: 9.5 });
  // arrows to five nearest
  [0.25, 0.3, 0.37, 0.33, 0.42].forEach((f, i) => {
    const y = 40 + i * 28;
    s.appendChild(el("circle", { cx: 600, cy: y, r: 7, fill: C.accent }));
    s.appendChild(el("line", { x1: 434, y1: 95, x2: 591, y2: y, stroke: C.line }));
    txt(614, y + 4, `matched firm ${i + 1} · |ln A − ln A_case| smallest`, { size: 9.5 });
  });
  txt(560, 182, "five nearest in size, each used once across cases", { anchor: "middle", size: 10, fill: C.ink });
  container.appendChild(s);
}

function windowDiagram(container) {
  container.textContent = "";
  const s = el("svg", { viewBox: "0 0 760 150", role: "img", class: "viz" });
  s.appendChild(el("title", {}, "Observation window: five fiscal years before the revelation year, with the misconduct period overlapping"));
  const txt = (x, y, t, o = {}) => s.appendChild(el("text", { x, y, "font-size": o.size || 11, fill: o.fill || C.ink2, "text-anchor": o.anchor || "middle", "font-weight": o.weight || 400 }, t));
  const x0 = 60, w = 90;
  ["t−5", "t−4", "t−3", "t−2", "t−1"].forEach((lab, i) => {
    s.appendChild(el("rect", { x: x0 + i * w, y: 50, width: w - 6, height: 34, rx: 4, fill: C.accent, "fill-opacity": 0.15, stroke: C.accent }));
    txt(x0 + i * w + (w - 6) / 2, 72, lab + " · 10-K + DEF 14A", { size: 10, fill: C.ink });
  });
  s.appendChild(el("rect", { x: x0 + 5 * w, y: 50, width: w - 6, height: 34, rx: 4, fill: C.case, "fill-opacity": 0.15, stroke: C.case }));
  txt(x0 + 5 * w + (w - 6) / 2, 72, "revelation year", { size: 10, fill: C.case, weight: 600 });
  txt(x0 + 5 * w + (w - 6) / 2, 100, "first public event (8-K, 10-Q, report, SEC action)", { size: 9.5, fill: C.case });
  s.appendChild(el("rect", { x: x0 + 1.5 * w, y: 20, width: 4.2 * w, height: 12, rx: 3, fill: C.thr, "fill-opacity": 0.5 }));
  txt(x0 + 3.6 * w, 16, "misconduct period named in the enforcement document (varies by case; usually overlaps the window)", { size: 9.5, fill: C.thr });
  txt(x0 + 2.5 * w, 128, "analysed firm-years: FRAUD = 1 for the case firm, 0 for its matched firms, in these five years only", { size: 10, fill: C.ink });
  container.appendChild(s);
}

async function main() {
  const S = (await fetch("data/results.json", { cache: "no-cache" }).then((r) => r.json())).screening;
  funnel($("v-funnel"), S.funnel.map((s) => ({ ...s, color: s.color === "case" ? C.case : s.color === "disc" ? C.L3 : s.color === "out" ? C.matched : C.accent })));
  $("t-funnel").appendChild(dataTable(["label", "n", "note"], S.funnel));
  bars($("v-sources"), S.sources.map((r) => ({ label: r.source, values: [{ v: r.n, color: C.ink2, name: "candidates" }] })), { max: Math.max(...S.sources.map((r) => r.n)), ticks: [0, 20, 40], fmt: (v) => String(Math.round(v)), labelWidth: 280, barH: 16, axisTitle: "candidate firms" });
  matchingDiagram($("v-matching"));
  histogram($("v-gap"), S.match.gaps, { min: 0, max: 4, bins: 16, xLabel: "gap in log total assets between matched firm and case (0.69 = a factor of two)", marks: [{ v: 0.69, label: "×2" }] });
  bars($("v-sic"), S.match.sic_levels.map((r) => ({ label: r.label, values: [{ v: r.n, color: C.accent, name: "matched firms" }] })), { max: Math.max(...S.match.sic_levels.map((r) => r.n)), ticks: [0, 50, 100, 150], fmt: (v) => String(Math.round(v)), labelWidth: 220, barH: 16, axisTitle: "matched firms" });
  windowDiagram($("v-window"));
  timeline($("v-timeline"), S.cases.map((c) => ({ label: c.name, year: c.year, color: c.stratum === "core" ? C.case : C.L3, shape: c.stratum === "core" ? "circle" : "square", note: c.d1_class + ", " + c.confidence + " confidence" })), { yearMin: 2009, yearMax: 2025, legend: [{ name: "misstatement / misappropriation (circle)", color: C.case }, { name: "disclosure-only (square)", color: C.L3, shape: "square" }] });
  bars($("v-conf"), S.confidence.map((c) => ({ label: c.level + " confidence", values: [{ v: c.n, color: c.level === "high" ? C.L2 : c.level === "medium" ? C.thr : C.case, name: "cases" }] })), { max: 16, ticks: [0, 5, 10, 15], fmt: (v) => String(Math.round(v)), labelWidth: 160, barH: 16, axisTitle: "cases" });
  $("t-cases").appendChild(dataTable(["name", "cik", "revelation_date", "stratum", "d1_class", "confidence"], S.cases));
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the sample data (" + e.message + ")."; b.hidden = false; } });
