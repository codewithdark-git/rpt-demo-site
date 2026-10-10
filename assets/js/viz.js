// Chart primitives (inline SVG, no dependencies). Semantic colours live here and in site.css.
const NS = "http://www.w3.org/2000/svg";
export const C = { ink: "#17222B", ink2: "#5B6B78", line: "#D7DEE4", grid: "#EDF1F4", accent: "#2B5F8C", teal: "#1E8A6E", case: "#B42318", matched: "#5B6B78",
  thr: "#D08C1E", L1: "#B5731A", L2: "#1E8A6E", L3: "#6B4FBB", ok: "#1E8A6E", bad: "#B42318", paper: "#FFFFFF", sig: "#1E8A6E", nsig: "#9AA8B4" };

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  return e;
}
function svg(container, W, H, label) {
  container.textContent = "";
  const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label || "chart", class: "viz" });
  if (label) s.appendChild(el("title", {}, label));
  container.appendChild(s);
  return s;
}
const txt = (s, x, y, t, o = {}) => s.appendChild(el("text", { x, y, "font-size": o.size || 11, fill: o.fill || C.ink2, "text-anchor": o.anchor || "start", "font-weight": o.weight || 400, "font-style": o.italic ? "italic" : null }, t));
const tip = (node, t) => { node.appendChild(el("title", {}, t)); return node; };
export const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : Number(v).toFixed(d);
const quantile = (sorted, q) => { const pos = (sorted.length - 1) * q, b = Math.floor(pos), r = pos - b; return sorted[b + 1] !== undefined ? sorted[b] + r * (sorted[b + 1] - sorted[b]) : sorted[b]; };

/** Forest plot. rows: [{label, sub, or, lo, hi, or2, lo2, hi2, status, color}] ; opts: {linear, min, max, ticks, ref, axisTitle, rowH, labelWidth} */
export function forest(container, rows, opts = {}) {
  const W = 760, rowH = opts.rowH || 44, L = opts.labelWidth || 250, R = 120, T = 30, B = 30;
  const H = T + rows.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "point estimates with 95 % intervals");
  const vals = rows.flatMap((r) => [r.lo, r.hi, r.lo2, r.hi2, r.or, r.or2]).filter((v) => Number.isFinite(v) && (opts.linear || v > 0));
  const linear = !!opts.linear;
  const lo = linear ? (opts.min ?? Math.min(...vals)) : Math.min(0.5, ...vals) * 0.9;
  const hi = linear ? (opts.max ?? Math.max(...vals)) : Math.min(Math.max(2, ...vals) * 1.1, 64);
  const x = linear ? (v) => L + (v - lo) / (hi - lo) * (W - L - R) : (v) => L + (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (W - L - R);
  const ticks = linear ? (opts.ticks || [lo, (lo + hi) / 2, hi]) : [0.25, 0.5, 1, 2, 4, 8, 16, 32].filter((v) => v >= lo && v <= hi);
  const ref = opts.ref ?? (linear ? null : 1);
  for (const t of ticks) {
    s.appendChild(el("line", { x1: x(t), y1: T - 6, x2: x(t), y2: H - B + 4, stroke: t === ref ? C.ink2 : C.grid, "stroke-width": t === ref ? 1.2 : 1 }));
    txt(s, x(t), H - B + 16, linear ? fmt(t, 2) : String(t), { anchor: "middle", size: 10 });
  }
  if (ref !== null && !ticks.includes(ref)) s.appendChild(el("line", { x1: x(ref), y1: T - 6, x2: x(ref), y2: H - B + 4, stroke: C.ink2, "stroke-width": 1.2, "stroke-dasharray": "4 3" }));
  txt(s, L, 12, opts.axisTitle || "odds ratio per standard deviation (log scale); 1 = no difference", { size: 10 });
  rows.forEach((r, i) => {
    const y = T + i * rowH + rowH / 2;
    txt(s, 0, y - 4, r.label, { fill: C.ink, size: 12, weight: 600 });
    if (r.sub) txt(s, 0, y + 11, r.sub, { size: 10 });
    const draw = (o, l, h, col, dy, lab, shape) => {
      if (!Number.isFinite(o)) return;
      const cl = Math.max(l, lo), ch = Math.min(h, hi);
      if (Number.isFinite(l) && Number.isFinite(h)) s.appendChild(el("line", { x1: x(cl), y1: y + dy, x2: x(ch), y2: y + dy, stroke: col, "stroke-width": 2, "stroke-linecap": "round" }));
      const node = shape === "square" ? el("rect", { x: x(o) - 4.5, y: y + dy - 4.5, width: 9, height: 9, fill: col }) : el("circle", { cx: x(o), cy: y + dy, r: 5, fill: col });
      tip(s.appendChild(node), `${r.label} — ${lab}: ${fmt(o)} [${fmt(l)}, ${fmt(h)}]`);
    };
    draw(r.or, r.lo, r.hi, r.color || C.accent, Number.isFinite(r.or2) ? -6 : 0, "model-based", "circle");
    if (Number.isFinite(r.or2)) draw(r.or2, r.lo2, r.hi2, C.ink2, 6, "firm-clustered", "square");
    if (r.status) {
      const col = r.status === "supported" ? C.ok : r.status === "opposite" ? C.bad : C.ink2;
      txt(s, W - R + 10, y + 4, r.status, { fill: col, size: 11, weight: 600 });
    }
  });
  if (rows.some((r) => Number.isFinite(r.or2))) {
    s.appendChild(el("circle", { cx: W - R + 12, cy: 14, r: 4, fill: C.accent })); txt(s, W - R + 20, 18, "model-based (circle)", { size: 10 });
    s.appendChild(el("rect", { x: W - R + 8, y: 24, width: 8, height: 8, fill: C.ink2 })); txt(s, W - R + 20, 32, "firm-clustered (square)", { size: 10 });
  }
}

/** Grouped horizontal bars. rows: [{label, values:[{v, color, name, hatch}]}] */
export function bars(container, rows, opts = {}) {
  const W = 760, L = opts.labelWidth || 200, R = 70, T = opts.legend ? 26 : 10, B = 24;
  const n = Math.max(1, rows[0] ? rows[0].values.length : 1), bh = opts.barH || 10, gap = 4;
  const rowH = n * (bh + gap) + 10;
  const H = T + rows.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "bar chart");
  const max = opts.max || Math.max(...rows.flatMap((r) => r.values.map((v) => v.v || 0)), 0.0001);
  const x = (v) => L + (v / max) * (W - L - R);
  for (const t of opts.ticks || [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)) {
    s.appendChild(el("line", { x1: x(t), y1: T, x2: x(t), y2: H - B, stroke: C.grid }));
    txt(s, x(t), H - B + 14, opts.fmt ? opts.fmt(t) : fmt(t, 2), { anchor: "middle", size: 10 });
  }
  if (opts.axisTitle) txt(s, W - R, H - 2, opts.axisTitle, { anchor: "end", size: 10 });
  rows.forEach((r, i) => {
    const y0 = T + i * rowH + 5;
    txt(s, 0, y0 + (rowH - 10) / 2 + 4, r.label, { fill: C.ink, size: 11.5 });
    r.values.forEach((v, j) => {
      const y = y0 + j * (bh + gap);
      tip(s.appendChild(el("rect", { x: L, y, width: Math.max(0, x(v.v || 0) - L), height: bh, fill: v.color || C.accent, rx: 1.5, "fill-opacity": v.hatch ? 0.45 : 1 })), `${r.label} — ${v.name || ""}: ${opts.fmt ? opts.fmt(v.v) : fmt(v.v, 3)}`);
      txt(s, x(v.v || 0) + 4, y + bh - 1, opts.fmt ? opts.fmt(v.v) : fmt(v.v, 2), { size: 10 });
    });
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(el("rect", { x: L + k * 170, y: 6, width: 10, height: 10, fill: lg.color, rx: 2, "fill-opacity": lg.hatch ? 0.45 : 1 })); txt(s, L + k * 170 + 14, 15, lg.name, { size: 10 }); });
}

/** Small multiples of lines by event time. panels: [{title, color, series:[{name,x,y,color,dashed}], marks:[{x,label}]}] */
export function smallMultiples(container, panels, opts = {}) {
  const pw = 250, ph = 180, cols = Math.min(3, panels.length), W = cols * pw, rows = Math.ceil(panels.length / cols), H = rows * ph + (opts.legend ? 16 : 0);
  const s = svg(container, W, H, opts.ariaLabel || "small multiples by event time");
  const allY = panels.flatMap((p) => p.series.flatMap((q) => q.y.filter((v) => v !== null)));
  const yMin = opts.yMin ?? Math.min(...allY), yMax = opts.yMax ?? Math.max(...allY);
  panels.forEach((p, i) => {
    const ox = (i % cols) * pw + 40, oy = Math.floor(i / cols) * ph + 26, w = pw - 56, h = ph - 60;
    const xs = p.series[0].x;
    const sx = (v) => ox + (v - xs[0]) / (xs[xs.length - 1] - xs[0]) * w, sy = (v) => oy + (1 - (v - yMin) / (yMax - yMin)) * h;
    txt(s, ox, oy - 10, p.title, { fill: p.color || C.ink, size: 12, weight: 600 });
    s.appendChild(el("line", { x1: ox, y1: oy + h, x2: ox + w, y2: oy + h, stroke: C.line }));
    s.appendChild(el("line", { x1: ox, y1: oy, x2: ox, y2: oy + h, stroke: C.line }));
    xs.forEach((v) => txt(s, sx(v), oy + h + 14, "t" + v, { anchor: "middle", size: 10 }));
    txt(s, ox + w / 2, oy + h + 27, "years before revelation", { anchor: "middle", size: 9 });
    [yMin, (yMin + yMax) / 2, yMax].forEach((v) => txt(s, ox - 4, sy(v) + 3, fmt(v, 2), { anchor: "end", size: 9 }));
    for (const q of p.series) {
      let d = "", pen = false;
      q.x.forEach((xv, k) => { const yv = q.y[k]; if (yv === null || yv === undefined) { pen = false; return; } d += (pen ? " L" : " M") + sx(xv).toFixed(1) + " " + sy(yv).toFixed(1); pen = true; });
      s.appendChild(el("path", { d, fill: "none", stroke: q.color, "stroke-width": q.width || 2, "stroke-dasharray": q.dashed ? "4 3" : null }));
      q.x.forEach((xv, k) => { const yv = q.y[k]; if (yv !== null && yv !== undefined) tip(s.appendChild(q.dashed ? el("rect", { x: sx(xv) - 3, y: sy(yv) - 3, width: 6, height: 6, fill: q.color }) : el("circle", { cx: sx(xv), cy: sy(yv), r: 3, fill: q.color })), `${q.name}, t${xv}: ${fmt(yv, 3)}`); });
    }
    for (const m of p.marks || []) txt(s, sx(m.x), oy + 8, m.label, { anchor: "middle", size: 10, fill: C.sig, weight: 700 });
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(el("line", { x1: 40 + k * 200, y1: H - 6, x2: 60 + k * 200, y2: H - 6, stroke: lg.color, "stroke-width": 2, "stroke-dasharray": lg.dashed ? "4 3" : null })); txt(s, 66 + k * 200, H - 2, lg.name, { size: 10 }); });
}

/** Dot strip by group with jitter. groups: [{name, values, color}] */
export function dotStrip(container, groups, opts = {}) {
  const W = 760, rowH = 74, L = 140, R = 20, T = 28, B = 30;
  const H = T + groups.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "distribution of values by group");
  const all = groups.flatMap((g) => g.values);
  const min = opts.min ?? Math.min(...all), max = opts.max ?? Math.max(...all);
  const x = (v) => L + (v - min) / (max - min) * (W - L - R);
  for (const t of opts.ticks || [min, (min + max) / 2, max]) { s.appendChild(el("line", { x1: x(t), y1: T - 4, x2: x(t), y2: H - B + 4, stroke: C.grid })); txt(s, x(t), H - B + 16, fmt(t, 1), { anchor: "middle", size: 10 }); }
  txt(s, L, 12, opts.axisTitle || "", { size: 10 });
  groups.forEach((g, i) => {
    const yc = T + i * rowH + rowH / 2;
    txt(s, 0, yc - 2, g.name, { fill: C.ink, size: 12, weight: 600 });
    txt(s, 0, yc + 12, `${g.values.length} firm-years`, { size: 10 });
    const bins = {};
    for (const v of [...g.values].sort((a, b) => a - b)) {
      const key = Math.round(x(v) / 3);
      const k = (bins[key] = (bins[key] || 0) + 1);
      const dy = ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 3.0) % (rowH / 2 - 6);
      s.appendChild(el("circle", { cx: x(v), cy: yc + dy, r: 1.9, fill: g.color, "fill-opacity": 0.6 }));
    }
    const srt = [...g.values].sort((a, b) => a - b);
    const med = quantile(srt, 0.5);
    tip(s.appendChild(el("line", { x1: x(med), y1: yc - rowH / 2 + 6, x2: x(med), y2: yc + rowH / 2 - 6, stroke: g.color, "stroke-width": 2.5 })), `${g.name} median ${fmt(med, 2)}`);
  });
  for (const t of opts.thresholds || []) {
    s.appendChild(el("line", { x1: x(t.v), y1: T - 10, x2: x(t.v), y2: H - B, stroke: C.thr, "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
    txt(s, x(t.v) + 4, T - 12, t.label, { size: 10, fill: C.thr, weight: 600 });
  }
}

/** Overlaid histograms (step outlines + translucent fill). groups: [{name, values, color}] */
export function histOverlay(container, groups, opts = {}) {
  const W = 760, H = 240, L = 44, R = 16, T = 20, B = 40, nb = opts.bins || 20;
  const s = svg(container, W, H, opts.ariaLabel || "overlaid histograms");
  const min = opts.min ?? Math.min(...groups.flatMap((g) => g.values)), max = opts.max ?? Math.max(...groups.flatMap((g) => g.values));
  const bw = (W - L - R) / nb;
  const dens = groups.map((g) => { const c = new Array(nb).fill(0); g.values.forEach((v) => c[Math.min(nb - 1, Math.floor((v - min) / (max - min) * nb))]++); return c.map((k) => k / g.values.length); });
  const dmax = Math.max(...dens.flat());
  const y = (d) => H - B - (d / dmax) * (H - T - B);
  for (const f of [0, 0.5, 1]) { s.appendChild(el("line", { x1: L, y1: y(f * dmax), x2: W - R, y2: y(f * dmax), stroke: C.grid })); txt(s, L - 4, y(f * dmax) + 3, Math.round(f * dmax * 100) + " %", { anchor: "end", size: 9 }); }
  groups.forEach((g, gi) => {
    let d = `M ${L} ${y(0)}`;
    dens[gi].forEach((v, i) => { d += ` L ${L + i * bw} ${y(v)} L ${L + (i + 1) * bw} ${y(v)}`; });
    d += ` L ${W - R} ${y(0)} Z`;
    s.appendChild(el("path", { d, fill: g.color, "fill-opacity": 0.18, stroke: g.color, "stroke-width": 1.8 }));
    dens[gi].forEach((v, i) => tip(s.appendChild(el("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" })), `${g.name}: ${fmt(min + i * (max - min) / nb, 1)}–${fmt(min + (i + 1) * (max - min) / nb, 1)}: ${(v * 100).toFixed(1)} % of firm-years`));
  });
  s.appendChild(el("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: C.line }));
  for (const t of opts.ticks || [min, (min + max) / 2, max]) txt(s, L + (t - min) / (max - min) * (W - L - R), H - B + 14, fmt(t, 1), { anchor: "middle", size: 10 });
  txt(s, (L + W - R) / 2, H - 2, opts.xLabel || "", { anchor: "middle", size: 10 });
  for (const t of opts.thresholds || []) { const xx = L + (t.v - min) / (max - min) * (W - L - R); s.appendChild(el("line", { x1: xx, y1: T, x2: xx, y2: H - B, stroke: C.thr, "stroke-dasharray": "5 4", "stroke-width": 1.5 })); txt(s, xx + 4, T + 10, t.label, { size: 10, fill: C.thr, weight: 600 }); }
  groups.forEach((g, k) => { s.appendChild(el("rect", { x: W - R - 230 + k * 120, y: T, width: 10, height: 10, fill: g.color, "fill-opacity": 0.5, stroke: g.color })); txt(s, W - R - 216 + k * 120, T + 9, `${g.name} (${g.values.length})`, { size: 10 }); });
}

/** Horizontal box plots. groups: [{name, values, color}] */
export function boxPlot(container, groups, opts = {}) {
  const W = 760, rowH = 52, L = 140, R = 20, T = 24, B = 30;
  const H = T + groups.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "box plots");
  const all = groups.flatMap((g) => g.values);
  const min = opts.min ?? Math.min(...all), max = opts.max ?? Math.max(...all);
  const x = (v) => L + (v - min) / (max - min) * (W - L - R);
  for (const t of opts.ticks || [min, (min + max) / 2, max]) { s.appendChild(el("line", { x1: x(t), y1: T - 4, x2: x(t), y2: H - B + 4, stroke: C.grid })); txt(s, x(t), H - B + 16, fmt(t, 1), { anchor: "middle", size: 10 }); }
  txt(s, L, 12, opts.axisTitle || "", { size: 10 });
  groups.forEach((g, i) => {
    const yc = T + i * rowH + rowH / 2, srt = [...g.values].sort((a, b) => a - b);
    const q1 = quantile(srt, 0.25), q2 = quantile(srt, 0.5), q3 = quantile(srt, 0.75), iqr = q3 - q1;
    const wl = Math.max(srt[0], q1 - 1.5 * iqr), wh = Math.min(srt[srt.length - 1], q3 + 1.5 * iqr);
    txt(s, 0, yc + 4, `${g.name} (n = ${g.values.length})`, { fill: C.ink, size: 12, weight: 600 });
    s.appendChild(el("line", { x1: x(wl), y1: yc, x2: x(q1), y2: yc, stroke: g.color, "stroke-width": 1.5 }));
    s.appendChild(el("line", { x1: x(q3), y1: yc, x2: x(wh), y2: yc, stroke: g.color, "stroke-width": 1.5 }));
    tip(s.appendChild(el("rect", { x: x(q1), y: yc - 12, width: Math.max(1, x(q3) - x(q1)), height: 24, fill: g.color, "fill-opacity": 0.25, stroke: g.color, "stroke-width": 1.5 })), `${g.name}: median ${fmt(q2)}, interquartile ${fmt(q1)}–${fmt(q3)}, whiskers ${fmt(wl)}–${fmt(wh)}`);
    s.appendChild(el("line", { x1: x(q2), y1: yc - 12, x2: x(q2), y2: yc + 12, stroke: g.color, "stroke-width": 2.5 }));
    srt.filter((v) => v < wl || v > wh).forEach((v) => s.appendChild(el("circle", { cx: x(v), cy: yc, r: 2.2, fill: g.color, "fill-opacity": 0.7 })));
    txt(s, x(q2), yc - 16, fmt(q2, 2), { anchor: "middle", size: 10, fill: g.color, weight: 600 });
  });
  for (const t of opts.thresholds || []) { s.appendChild(el("line", { x1: x(t.v), y1: T - 10, x2: x(t.v), y2: H - B, stroke: C.thr, "stroke-width": 1.5, "stroke-dasharray": "5 4" })); txt(s, x(t.v) + 4, T - 12, t.label, { size: 10, fill: C.thr, weight: 600 }); }
}

/** Correlation / small matrix tiles. m: {labels, values} */
export function tiles(container, m, opts = {}) {
  const n = m.labels.length, cell = 72, L = 150, T = 36;
  const W = L + n * cell + 10, H = T + n * cell + 10;
  const s = svg(container, W, H, opts.ariaLabel || "correlation matrix");
  m.labels.forEach((lab, j) => txt(s, L + j * cell + cell / 2, T - 10, lab, { anchor: "middle", size: 11, fill: C.ink }));
  m.values.forEach((row, i) => {
    txt(s, L - 8, T + i * cell + cell / 2 + 4, m.labels[i], { anchor: "end", size: 11, fill: C.ink });
    row.forEach((v, j) => {
      const a = Math.min(1, Math.abs(v));
      const fill = i === j ? C.grid : (v >= 0 ? `rgba(43,95,140,${0.12 + 0.88 * a})` : `rgba(180,35,24,${0.12 + 0.88 * a})`);
      tip(s.appendChild(el("rect", { x: L + j * cell + 2, y: T + i * cell + 2, width: cell - 4, height: cell - 4, fill, rx: 3 })), `${m.labels[i]} × ${m.labels[j]}: ${fmt(v, 3)}`);
      txt(s, L + j * cell + cell / 2, T + i * cell + cell / 2 + 4, fmt(v, 2), { anchor: "middle", size: 11, fill: i === j ? C.ink2 : (a > 0.5 ? "#fff" : C.ink) });
    });
  });
}

/** Heatmap. rows: [{label, values:[number|null], sub}], cols: [string]; opts.min/max, colorFor */
export function heatmap(container, rows, cols, opts = {}) {
  const cell = opts.cell || 44, L = opts.labelWidth || 220, T = 60, R = 10;
  const W = L + cols.length * cell + R, H = T + rows.length * (opts.rowH || 20) + 10, rh = opts.rowH || 20;
  const s = svg(container, W, H, opts.ariaLabel || "heatmap");
  const min = opts.min ?? 0, max = opts.max ?? 1;
  cols.forEach((c, j) => { const t = txt(s, L + j * cell + cell / 2, T - 8, c, { anchor: "end", size: 10, fill: C.ink }); t.setAttribute("transform", `rotate(-40 ${L + j * cell + cell / 2} ${T - 8})`); });
  rows.forEach((r, i) => {
    const y = T + i * rh;
    txt(s, 0, y + rh - 6, r.label, { fill: r.color || C.ink, size: 10.5, weight: r.bold ? 600 : 400 });
    r.values.forEach((v, j) => {
      if (v === null || v === undefined) { s.appendChild(el("rect", { x: L + j * cell + 1, y: y + 1, width: cell - 2, height: rh - 2, fill: "none", stroke: C.grid })); return; }
      const a = Math.max(0, Math.min(1, (v - min) / (max - min)));
      tip(s.appendChild(el("rect", { x: L + j * cell + 1, y: y + 1, width: cell - 2, height: rh - 2, fill: `rgba(43,95,140,${0.06 + 0.9 * a})`, rx: 2 })), `${r.label} · ${cols[j]}: ${fmt(v, 3)}`);
      txt(s, L + j * cell + cell / 2, y + rh - 6, fmt(v, 2), { anchor: "middle", size: 9, fill: a > 0.55 ? "#fff" : C.ink });
    });
  });
}

/** Funnel of counts. steps: [{label, n, note, color}] */
export function funnel(container, steps, opts = {}) {
  const W = 760, rowH = 46, L = 300, T = 10;
  const H = T + steps.length * rowH + 10;
  const s = svg(container, W, H, opts.ariaLabel || "sample funnel");
  const max = Math.max(...steps.map((st) => st.n));
  steps.forEach((st, i) => {
    const y = T + i * rowH, w = (st.n / max) * (W - L - 70);
    txt(s, 0, y + 20, st.label, { fill: C.ink, size: 12, weight: 600 });
    if (st.note) txt(s, 0, y + 34, st.note, { size: 10 });
    tip(s.appendChild(el("rect", { x: L, y: y + 8, width: Math.max(2, w), height: 24, fill: st.color || C.accent, rx: 2 })), `${st.label}: ${st.n}`);
    txt(s, L + w + 8, y + 25, String(st.n), { fill: C.ink, size: 13, weight: 700 });
  });
}

/** Timeline dots: items [{label, year, color, note, shape}] */
export function timeline(container, items, opts = {}) {
  const W = 760, L = 20, R = 20, T = 30, rowH = 18;
  const years = items.map((i) => i.year);
  const y0 = (opts.yearMin ?? Math.min(...years)) - 0.5, y1 = (opts.yearMax ?? Math.max(...years)) + 0.5;
  const x = (v) => L + (v - y0) / (y1 - y0) * (W - L - R);
  const byYear = {};
  items.forEach((it) => { (byYear[it.year] = byYear[it.year] || []).push(it); });
  const maxStack = Math.max(...Object.values(byYear).map((a) => a.length));
  const H = T + maxStack * rowH + 30;
  const s = svg(container, W, H, opts.ariaLabel || "timeline");
  for (let yr = Math.ceil(y0); yr <= y1; yr++) { s.appendChild(el("line", { x1: x(yr), y1: T - 6, x2: x(yr), y2: H - 24, stroke: C.grid })); if (yr % 2 === 0) txt(s, x(yr), H - 8, String(yr), { anchor: "middle", size: 10 }); }
  for (const yr in byYear) byYear[yr].forEach((it, k) => {
    const cy = H - 30 - k * rowH;
    const node = it.shape === "square" ? el("rect", { x: x(it.year) - 6, y: cy - 6, width: 12, height: 12, fill: it.color || C.case }) : el("circle", { cx: x(it.year), cy, r: 6.5, fill: it.color || C.case });
    tip(s.appendChild(node), `${it.label} — ${it.year}${it.note ? " · " + it.note : ""}`);
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(lg.shape === "square" ? el("rect", { x: L + 3 + k * 230, y: 7, width: 10, height: 10, fill: lg.color }) : el("circle", { cx: L + 8 + k * 230, cy: 12, r: 5, fill: lg.color })); txt(s, L + 18 + k * 230, 16, lg.name, { size: 10 }); });
}

/** Histogram of one series. */
export function histogram(container, values, opts = {}) {
  const W = 760, H = 210, L = 40, R = 16, T = 16, B = 40;
  const s = svg(container, W, H, opts.ariaLabel || "histogram");
  const min = opts.min ?? Math.min(...values), max = opts.max ?? Math.max(...values), nb = opts.bins || 12;
  const counts = new Array(nb).fill(0);
  let beyond = 0;
  values.forEach((v) => { if (v > max) { beyond++; return; } counts[Math.min(nb - 1, Math.floor((v - min) / (max - min) * nb))]++; });
  const cmax = Math.max(...counts);
  const bw = (W - L - R) / nb;
  counts.forEach((c, i) => {
    const h = (c / cmax) * (H - T - B);
    tip(s.appendChild(el("rect", { x: L + i * bw + 1, y: H - B - h, width: bw - 2, height: h, fill: opts.color || C.accent, rx: 1.5 })), `${fmt(min + i * (max - min) / nb, 2)}–${fmt(min + (i + 1) * (max - min) / nb, 2)}: ${c}`);
    if (c) txt(s, L + i * bw + bw / 2, H - B - h - 3, String(c), { anchor: "middle", size: 9 });
  });
  s.appendChild(el("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: C.line }));
  for (let i = 0; i <= nb; i += Math.ceil(nb / 6)) txt(s, L + i * bw, H - B + 14, fmt(min + i * (max - min) / nb, 1), { anchor: "middle", size: 10 });
  txt(s, W / 2, H - 2, (opts.xLabel || "") + (beyond ? ` · ${beyond} beyond ${fmt(max, 0)} not shown` : ""), { anchor: "middle", size: 10 });
  for (const m of opts.marks || []) { const xx = L + (m.v - min) / (max - min) * (W - L - R); s.appendChild(el("line", { x1: xx, y1: T, x2: xx, y2: H - B, stroke: C.thr, "stroke-dasharray": "5 4" })); txt(s, xx + 3, T + 10, m.label, { size: 10, fill: C.thr }); }
}

/** Dot rows on an event-time axis: items [{label, x, color, note}] */
export function dotRows(container, items, opts = {}) {
  const W = 760, L = 230, R = 70, T = 24, rowH = 16;
  const H = T + items.length * rowH + 24;
  const s = svg(container, W, H, opts.ariaLabel || "dot plot by case");
  const xs = opts.xs || [-5, -4, -3, -2, -1];
  const x = (v) => L + (xs.indexOf(v)) / (xs.length - 1) * (W - L - R);
  xs.forEach((v) => { s.appendChild(el("line", { x1: x(v), y1: T - 6, x2: x(v), y2: H - 18, stroke: C.grid })); txt(s, x(v), H - 4, `t${v}`, { anchor: "middle", size: 10 }); });
  txt(s, L, 10, opts.axisTitle || "", { size: 10 });
  items.forEach((it, i) => {
    const y = T + i * rowH + 8;
    txt(s, 0, y + 4, it.label, { fill: C.ink, size: 10.5 });
    if (it.x === null || it.x === undefined) txt(s, W - R + 10, y + 4, "never", { size: 10, fill: C.ink2 });
    else tip(s.appendChild(el("circle", { cx: x(it.x), cy: y, r: 5, fill: it.color || C.case })), `${it.label}: first separated at t${it.x}${it.note ? " · " + it.note : ""}`);
  });
}

/** Simple vertical pipeline diagram. steps: [{title, detail}] */
export function pipeline(container, steps, opts = {}) {
  const W = 760, bw = 150, bh = 64, gap = 22, perRow = 4;
  const rows = Math.ceil(steps.length / perRow), H = rows * (bh + 48) + 10;
  const s = svg(container, W, H, opts.ariaLabel || "analysis pipeline");
  steps.forEach((st, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    const x = 10 + c * (bw + gap), y = 10 + r * (bh + 48);
    const g = el("g", { class: "pipe-step", tabindex: 0, role: "button", "aria-label": `${st.title}: ${st.detail}` });
    g.appendChild(el("rect", { x, y, width: bw, height: bh, rx: 6, fill: "#fff", stroke: C.accent, "stroke-width": 1.4 }));
    const lines = String(st.title).split("\n");
    lines.forEach((ln, k) => txt(g, x + bw / 2, y + 26 + k * 15 - (lines.length - 1) * 7, ln, { anchor: "middle", size: 11.5, fill: C.ink, weight: 600 }));
    txt(g, x + bw / 2, y + bh - 10, `step ${i + 1}`, { anchor: "middle", size: 9 });
    g.appendChild(el("title", {}, st.detail));
    s.appendChild(g);
    if (i < steps.length - 1) {
      if (c < perRow - 1) s.appendChild(el("path", { d: `M ${x + bw} ${y + bh / 2} L ${x + bw + gap - 4} ${y + bh / 2}`, stroke: C.ink2, "stroke-width": 1.5, "marker-end": "url(#arr)" }));
      else s.appendChild(el("path", { d: `M ${x + bw / 2} ${y + bh} L ${x + bw / 2} ${y + bh + 14} L ${10 + bw / 2} ${y + bh + 14} L ${10 + bw / 2} ${y + bh + 48 - 4}`, fill: "none", stroke: C.ink2, "stroke-width": 1.5, "marker-end": "url(#arr)" }));
    }
  });
  const defs = el("defs"); const m = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  m.appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: C.ink2 })); defs.appendChild(m); s.insertBefore(defs, s.firstChild);
}

/** Build an HTML data table from column names and rows (for the expandable table under each chart). */
export function dataTable(cols, rows, digits = 3) {
  const t = document.createElement("table");
  t.className = "datatable";
  const thead = document.createElement("thead"), tr = document.createElement("tr");
  cols.forEach((c) => { const th = document.createElement("th"); th.textContent = c; tr.appendChild(th); });
  thead.appendChild(tr); t.appendChild(thead);
  const tb = document.createElement("tbody");
  rows.forEach((r) => { const trr = document.createElement("tr"); cols.forEach((c) => { const td = document.createElement("td"); const v = r[c]; td.textContent = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(digits)) : (v === null || v === undefined ? "—" : String(v)); if (typeof v === "number") td.className = "num"; trr.appendChild(td); }); tb.appendChild(trr); });
  t.appendChild(tb);
  return t;
}
