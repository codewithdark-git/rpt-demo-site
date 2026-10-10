import { funnel, bars, timeline, histogram, C } from "./viz.js";
const $ = (id) => document.getElementById(id);
async function main() {
  const S = (await fetch("data/results.json", { cache: "no-cache" }).then((r) => r.json())).screening;
  funnel($("v-funnel"), S.funnel.map((s) => ({ ...s, color: s.color === "case" ? C.case : s.color === "disc" ? C.L3 : s.color === "out" ? C.matched : C.accent })));
  bars($("v-conf"), S.confidence.map((c) => ({ label: c.level + " confidence", values: [{ v: c.n, color: c.level === "high" ? C.L2 : c.level === "medium" ? C.thr : C.case, name: "cases" }] })), { max: Math.max(...S.confidence.map((c) => c.n)), ticks: [0, 5, 10, 15], fmt: (v) => String(Math.round(v)), labelWidth: 150, barH: 16 });
  timeline($("v-timeline"), S.cases.map((c) => ({ label: c.name, year: c.year, color: c.stratum === "core" ? C.case : C.L3, note: c.d1_class })), { yearMin: 2009, yearMax: 2025, legend: [{ name: "misstatement / misappropriation", color: C.case }, { name: "disclosure-only", color: C.L3 }] });
  histogram($("v-gap"), S.match.gaps, { min: 0, max: 4, bins: 16, xLabel: "gap in log total assets between matched firm and case (0.69 = a factor of two); 3 sets beyond 4 not shown", marks: [{ v: 0.69, label: "×2" }] });
  bars($("v-sic"), S.match.sic_levels.map((r) => ({ label: r.label, values: [{ v: r.n, color: C.accent, name: "matched firms" }] })), { max: Math.max(...S.match.sic_levels.map((r) => r.n)), ticks: [0, 50, 100, 150], fmt: (v) => String(Math.round(v)), labelWidth: 200, barH: 16 });
  bars($("v-sources"), S.sources.map((r) => ({ label: r.source, values: [{ v: r.n, color: C.ink2, name: "candidates" }] })), { max: Math.max(...S.sources.map((r) => r.n)), ticks: [0, 20, 40], fmt: (v) => String(Math.round(v)), labelWidth: 260, barH: 16 });
}
main().catch((e) => { const b = $("banner"); if (b) { b.textContent = "Could not load the screening data (" + e.message + ")."; b.hidden = false; } });
