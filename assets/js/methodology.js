import { pipeline } from "./viz.js";
const steps = [
  { title: "Public SEC\nfilings", detail: "10-K, DEF 14A, XBRL, 8-K items, 10-K/A from EDGAR" },
  { title: "Filing and evidence\nextraction", detail: "Sections located by heading; every coded value keeps its sentence" },
  { title: "Eight RPT\ncharacteristics", detail: "Four amounts, incompleteness, vagueness, board non-independence, CEO duality" },
  { title: "Rank-based score\nconstruction", detail: "Rank 0–1 → layer mean → 10 × mean of layers" },
  { title: "Matched case/control\ncomparison", detail: "Conditional logit within matched sets; firm-clustered errors" },
  { title: "Five hypothesis\ntests", detail: "H1–H3 layers; H4 by year; H5 against the traditional index" },
  { title: "Multiple-testing\ncorrection", detail: "Holm step-down across H1–H3; unadjusted values beside" },
  { title: "Interpretation and\nlimitations", detail: "Associations before public disclosure; M2 pending" },
];
const el = document.getElementById("v-method");
pipeline(el, steps);
const explains = document.querySelectorAll("#steps-explain details");
el.querySelectorAll(".pipe-step").forEach((g, i) => {
  const open = () => { explains.forEach((d, k) => { d.open = k === i; }); explains[i].scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  g.addEventListener("click", open);
  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { open(); e.preventDefault(); } });
});
