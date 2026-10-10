import { buildSelector } from "./selector.js";
import { h, renderHeader, renderStage1, renderStage2, renderStage3 } from "./render.js";

const content = document.getElementById("content");
const banner = document.getElementById("banner");
let G = null, INDEX = null, selector = null, current = null;

function fail(msg) { banner.textContent = msg; banner.hidden = false; }

async function getJSON(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
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
    const url = new URL(location.href);
    url.searchParams.set("cik", co.cik); url.searchParams.set("fy", y.fiscal_year);
    history.replaceState(null, "", url);
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
  const pr = h("button", { type: "button", class: "btn", text: "Print this firm-year" });
  pr.addEventListener("click", () => window.print());
  content.appendChild(h("p", { class: "noprint", style: "margin-top:1rem" }, [pr]));
}

async function select(cik, fy) {
  try {
    content.textContent = "";
    content.appendChild(h("p", { class: "muted", text: "Loading…" }));
    const co = await getJSON(`data/companies/${cik}.json`);
    current = co;
    if (selector) selector.select(cik);
    renderCompany(co, fy);
    window.scrollTo({ top: 0 });
  } catch (e) {
    fail(`Could not load the company file (${e.message}).`);
  }
}

(async function init() {
  if (location.protocol === "file:") {
    fail("This page loads its data with fetch(), which browsers block for file:// addresses. Open the published site, or serve the folder locally with: python -m http.server 8080");
    return;
  }
  try {
    [G, INDEX] = await Promise.all([getJSON("data/global.json"), getJSON("data/index.json")]);
  } catch (e) { fail(`Could not load the site data (${e.message}).`); return; }
  selector = buildSelector(document.getElementById("sets"), INDEX, (cik) => select(cik));
  const params = new URLSearchParams(location.search);
  if (params.get("cik")) select(params.get("cik").padStart(10, "0"), params.get("fy"));
})();
