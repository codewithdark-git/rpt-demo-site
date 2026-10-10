import { pipeline } from "./viz.js";
const el = document.getElementById("v-pipeline");
if (el) pipeline(el, [
  { title: "Research\nquestion", detail: "Can RPT characteristics identify elevated fraud risk earlier than audit and internal-control signals?" },
  { title: "Public SEC\nfilings", detail: "10-K, DEF 14A, XBRL company facts, 8-K items, 10-K/A from EDGAR" },
  { title: "Case and\ncontrol matching", detail: "31 case firms; up to five matched firms each by industry and size; five-year window" },
  { title: "Eight RPT\ncharacteristics", detail: "Amounts, incompleteness, vagueness, board non-independence, CEO duality, coded with evidence" },
  { title: "Rank-based\nrisk score", detail: "Rank 0–1 across firm-years, mean within layer, mean of layers × 10" },
  { title: "Five hypothesis\ntests", detail: "Conditional logit within matched sets; Holm; firm-clustered errors; Model A vs B" },
  { title: "Findings and\nlimitations", detail: "Associations before public disclosure, with uncertainty and the checks still outstanding" },
]);
