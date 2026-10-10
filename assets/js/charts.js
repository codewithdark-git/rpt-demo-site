// Small inline-SVG charts; no dependencies.
const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Line chart by event time. series: [{label, x:[], y:[], color, width, highlight}], opts: {thresholds:[{y,label}], yLabel, yMin, yMax}
 */
export function lineChart(container, series, opts = {}) {
  container.textContent = "";
  const W = 640, H = 260, L = 48, R = 16, T = 18, B = 36;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.ariaLabel || "line chart" });
  const xs = [...new Set(series.flatMap((s) => s.x))].sort((a, b) => a - b);
  if (!xs.length) { container.appendChild(svg); return; }
  const ys = series.flatMap((s) => s.y).filter((v) => v !== null && v !== undefined).concat((opts.thresholds || []).map((t) => t.y));
  let yMin = opts.yMin !== undefined ? opts.yMin : Math.min(...ys), yMax = opts.yMax !== undefined ? opts.yMax : Math.max(...ys);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = (yMax - yMin) * 0.06; yMin -= pad; yMax += pad;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const sx = (x) => L + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B);
  // axes
  svg.appendChild(el("line", { x1: L, y1: T, x2: L, y2: H - B, stroke: "#9aa5b1" }));
  svg.appendChild(el("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: "#9aa5b1" }));
  for (const x of xs) {
    svg.appendChild(el("text", { x: sx(x), y: H - B + 16, "text-anchor": "middle", "font-size": 11, fill: "#52606d" }, (x > 0 ? "+" : "") + x));
  }
  svg.appendChild(el("text", { x: (L + W - R) / 2, y: H - 4, "text-anchor": "middle", "font-size": 11, fill: "#52606d" }, "years before revelation (event time)"));
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + (i / ticks) * (yMax - yMin);
    svg.appendChild(el("line", { x1: L, y1: sy(v), x2: W - R, y2: sy(v), stroke: "#e9eef4" }));
    svg.appendChild(el("text", { x: L - 6, y: sy(v) + 4, "text-anchor": "end", "font-size": 10, fill: "#52606d" }, v.toFixed(opts.digits ?? 2)));
  }
  if (opts.yLabel) svg.appendChild(el("text", { x: 12, y: T + 10, "font-size": 11, fill: "#52606d" }, opts.yLabel));
  for (const t of opts.thresholds || []) {
    svg.appendChild(el("line", { x1: L, y1: sy(t.y), x2: W - R, y2: sy(t.y), stroke: "#b26a00", "stroke-dasharray": "5 4" }));
    svg.appendChild(el("text", { x: W - R, y: sy(t.y) - 4, "text-anchor": "end", "font-size": 10, fill: "#b26a00" }, t.label));
  }
  const ordered = [...series].sort((a, b) => (a.highlight ? 1 : 0) - (b.highlight ? 1 : 0));
  for (const s of ordered) {
    let d = "", pen = false;
    s.x.forEach((x, i) => {
      const y = s.y[i];
      if (y === null || y === undefined) { pen = false; return; }
      d += (pen ? " L" : " M") + sx(x).toFixed(1) + " " + sy(y).toFixed(1);
      pen = true;
    });
    if (d) svg.appendChild(el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || (s.highlight ? 2.5 : 1.2), opacity: s.highlight ? 1 : 0.8 }));
    s.x.forEach((x, i) => {
      const y = s.y[i];
      if (y === null || y === undefined) return;
      const c = el("circle", { cx: sx(x), cy: sy(y), r: s.highlight ? 3.5 : 2, fill: s.color });
      c.appendChild(el("title", {}, `${s.label}, t${x}: ${y.toFixed(3)}`));
      svg.appendChild(c);
    });
  }
  container.appendChild(svg);
}

/** Horizontal bars for signed contributions: rows [{label, value}] */
export function barChart(container, rows, opts = {}) {
  container.textContent = "";
  const W = 640, rowH = 20, L = 220, R = 60, T = 8;
  const H = T + rows.length * rowH + 8;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.ariaLabel || "bar chart" });
  const maxAbs = Math.max(0.001, ...rows.map((r) => Math.abs(r.value)));
  const mid = L + (W - L - R) / 2, half = (W - L - R) / 2;
  svg.appendChild(el("line", { x1: mid, y1: T, x2: mid, y2: H - 8, stroke: "#9aa5b1" }));
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const w = Math.abs(r.value) / maxAbs * half;
    const x = r.value >= 0 ? mid : mid - w;
    svg.appendChild(el("rect", { x, y: y + 3, width: w, height: rowH - 6, fill: r.value >= 0 ? "#b3261e" : "#2f7d6f", opacity: 0.85 }));
    svg.appendChild(el("text", { x: L - 6, y: y + rowH - 6, "text-anchor": "end", "font-size": 11, fill: "#1f2933" }, r.label));
    svg.appendChild(el("text", { x: r.value >= 0 ? mid + w + 4 : mid - w - 4, y: y + rowH - 6, "text-anchor": r.value >= 0 ? "start" : "end", "font-size": 10, fill: "#52606d" }, r.value.toFixed(3)));
  });
  container.appendChild(svg);
}
