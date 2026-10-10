import { buildSelector } from "./selector.js";
import { h, renderHeader, renderStage1, renderStage2, renderStage3, renderCompare } from "./render.js";

const content = document.getElementById("content");
const banner = document.getElementById("banner");
const stepper = document.getElementById("stepper");
let G = null, INDEX = null, selector = null, current = null;
const cache = new Map();

function fail(msg) { banner.textContent = msg; banner.hidden = false; }
async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const j = await r.json();
  cache.set(path, j);
  return j;
}

function observeStages() {
  if (!("IntersectionObserver" in window)) return;
  const links = stepper.querySelectorAll("a");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); });
  }, { rootMargin: "-20% 0px -70% 0px" });
  content.querySelectorAll(".stage[id]").forEach((s) => obs.observe(s));
}

function renderCompany(co, fy) {
  content.textContent = "";
  content.appendChild(renderHeader(co, G));
  const tabs = h("div", { class: "yeartabs", role: "tablist" });
  const body = h("div");
  const show = (i) => {
    body.textContent = "";
    const y = co.years[i];
    tabs.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-selected", i === j ? "true" : "false"));
    body.appendChild(renderStage1(co, y, G));
    body.appendChild(renderStage2(co, y, G));
    body.appendChild(renderStage3(co, y, G));
    const cmp = h("section", { class: "stage", id: "stage-4" });
    cmp.appendChild(h("h2", {}, [h("span", { class: "step", text: "4" }), "Compare with a firm of the same matched set"]));
    const sel = h("select", { "aria-label": "Compare with" });
    sel.appendChild(h("option", { value: "", text: "choose a firm of the set…" }));
    for (const f of co.set.firms) if (f.cik !== co.cik) sel.appendChild(h("option", { value: f.cik, text: `${f.name} (${f.role === "case" ? "observed case" : "matched"})` }));
    const target = h("div");
    sel.addEventListener("change", async () => {
      target.textContent = "";
      if (!sel.value) return;
      target.appendChild(h("p", { class: "muted small", text: "Loading…" }));
      try {
        const other = await getJSON(`data/companies/${sel.value}.json`);
        target.textContent = "";
        target.appendChild(renderCompare(co, y, other, G));
      } catch (e) { target.textContent = ""; target.appendChild(h("p", { class: "bad", text: "Could not load the comparison firm (" + e.message + ")." })); }
    });
    cmp.appendChild(h("p", { class: "small muted", text: "Same fiscal year, same event time: the eight characteristic ranks, the layer scores and the AI risk score side by side. A difference is a relative position within this sample, not a judgement about either firm." }));
    cmp.appendChild(sel);
    cmp.appendChild(target);
    body.appendChild(cmp);
    const url = new URL(location.href);
    url.searchParams.set("cik", co.cik); url.searchParams.set("fy", y.fiscal_year);
    history.replaceState(null, "", url);
    observeStages();
  };
  co.years.forEach((y, i) => {
    const b = h("button", { type: "button", role: "tab", class: y.label === 1 ? "fraud" : "", text: `FY${y.fiscal_year} (t${y.event_time})` });
    b.addEventListener("click", () => show(i));
    tabs.appendChild(b);
  });
  content.appendChild(tabs);
  content.appendChild(body);
  let idx = co.years.findIndex((y) => String(y.fiscal_year) === String(fy));
  if (idx < 0) idx = co.years.length - 1;
  show(idx);
  stepper.hidden = false;
  const pr = h("button", { type: "button", class: "btn", text: "Print this firm-year" });
  pr.addEventListener("click", () => window.print());
  content.appendChild(h("p", { class: "noprint", style: "margin-top:1rem" }, [pr]));
}

async function select(cik, fy) {
  try {
    content.textContent = "";
    content.appendChild(h("p", { class: "muted", text: "Loading the firm's data…" }));
    const co = await getJSON(`data/companies/${cik}.json`);
    current = co;
    if (selector) selector.select(cik);
    renderCompany(co, fy);
    window.scrollTo({ top: 0 });
  } catch (e) { fail(`Could not load the company file (${e.message}).`); }
}

(async function init() {
  if (location.protocol === "file:") { fail("This page loads its data with fetch(), which browsers block for file:// addresses. Open the published site, or serve the folder locally with: python -m http.server 8080"); return; }
  try { [G, INDEX] = await Promise.all([getJSON("data/global.json"), getJSON("data/index.json")]); }
  catch (e) { fail(`Could not load the site data (${e.message}).`); return; }
  selector = buildSelector(document.getElementById("sets"), INDEX, (cik) => select(cik));
  const params = new URLSearchParams(location.search);
  if (params.get("cik")) select(params.get("cik").padStart(10, "0"), params.get("fy"));
})();
