// Chart primitives (inline SVG, no dependencies). Each takes a container element and plain data.
const NS = "http://www.w3.org/2000/svg";
export const C = { ink: "#17222B", ink2: "#5B6B78", line: "#D7DEE4", grid: "#EDF1F4", accent: "#2B5F8C", case: "#B42318", matched: "#8A9BA8",
  thr: "#D08C1E", L1: "#B5731A", L2: "#1E8A6E", L3: "#6B4FBB", ok: "#1E8A6E", bad: "#B42318", paper: "#FAFBFC" };

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  return e;
}
function svg(container, W, H, label) {
  container.textContent = "";
  const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label || "chart", class: "viz" });
  container.appendChild(s);
  return s;
}
const txt = (s, x, y, t, o = {}) => s.appendChild(el("text", { x, y, "font-size": o.size || 11, fill: o.fill || C.ink2, "text-anchor": o.anchor || "start", "font-weight": o.weight || 400, "dominant-baseline": o.base || "auto" }, t));
const tip = (node, t) => { node.appendChild(el("title", {}, t)); return node; };
const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : Number(v).toFixed(d);

/** Forest plot of odds ratios on a log axis. rows: [{label, sub, or, lo, hi, or2, lo2, hi2, status}] */
export function forest(container, rows, opts = {}) {
  const W = 720, rowH = opts.rowH || 44, L = opts.labelWidth || 250, R = 110, T = 30, B = 30;
  const H = T + rows.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "odds ratios");
  const vals = rows.flatMap((r) => [r.lo, r.hi, r.lo2, r.hi2, r.or, r.or2]).filter((v) => Number.isFinite(v) && (opts.linear || v > 0));
  const linear = !!opts.linear;
  const lo = linear ? (opts.min ?? Math.min(...vals)) : Math.min(0.5, ...vals) * 0.9;
  const hi = linear ? (opts.max ?? Math.max(...vals)) : Math.max(2, ...vals) * 1.1;
  const x = linear ? (v) => L + (v - lo) / (hi - lo) * (W - L - R) : (v) => L + (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (W - L - R);
  const ticks = linear ? (opts.ticks || [lo, (lo + hi) / 2, hi]) : [0.25, 0.5, 1, 2, 4, 8].filter((v) => v >= lo && v <= hi);
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
    const draw = (o, l, h, col, dy, lab) => {
      if (!(o > 0)) return;
      if (l > 0 && h > 0) s.appendChild(el("line", { x1: x(l), y1: y + dy, x2: x(Math.min(h, hi)), y2: y + dy, stroke: col, "stroke-width": 2, "stroke-linecap": "round" }));
      tip(s.appendChild(el("circle", { cx: x(o), cy: y + dy, r: 5, fill: col })), `${lab}: ${fmt(o)} [${fmt(l)}, ${fmt(h)}]`);
    };
    draw(r.or, r.lo, r.hi, r.color || C.accent, r.or2 ? -6 : 0, "model-based");
    if (r.or2) draw(r.or2, r.lo2, r.hi2, C.ink2, 6, "firm-clustered");
    if (r.status) {
      const col = r.status === "supported" ? C.ok : r.status === "opposite" ? C.bad : C.ink2;
      txt(s, W - R + 10, y + 4, r.status, { fill: col, size: 11, weight: 600 });
    }
  });
  if (rows.some((r) => r.or2)) {
    s.appendChild(el("circle", { cx: W - R + 12, cy: 14, r: 4, fill: C.accent })); txt(s, W - R + 20, 18, "model-based", { size: 10 });
    s.appendChild(el("circle", { cx: W - R + 12, cy: 28, r: 4, fill: C.ink2 })); txt(s, W - R + 20, 32, "firm-clustered", { size: 10 });
  }
}

/** Grouped horizontal bars. rows: [{label, values: [{v, color, name}]}], opts.max */
export function bars(container, rows, opts = {}) {
  const W = 720, L = opts.labelWidth || 200, R = 60, T = opts.legend ? 26 : 10, B = 24;
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
  rows.forEach((r, i) => {
    const y0 = T + i * rowH + 5;
    txt(s, 0, y0 + (rowH - 10) / 2 + 4, r.label, { fill: C.ink, size: 11.5 });
    r.values.forEach((v, j) => {
      const y = y0 + j * (bh + gap);
      tip(s.appendChild(el("rect", { x: L, y, width: Math.max(0, x(v.v || 0) - L), height: bh, fill: v.color || C.accent, rx: 2 })), `${r.label} — ${v.name || ""}: ${opts.fmt ? opts.fmt(v.v) : fmt(v.v, 3)}`);
      txt(s, x(v.v || 0) + 4, y + bh - 1, opts.fmt ? opts.fmt(v.v) : fmt(v.v, 2), { size: 10 });
    });
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(el("rect", { x: L + k * 150, y: 6, width: 10, height: 10, fill: lg.color, rx: 2 })); txt(s, L + k * 150 + 14, 15, lg.name, { size: 10 }); });
}

/** Small-multiple lines by event time. panels: [{title, series: [{name, x, y, color, width, dashed}], marks:[{x, label}]}] */
export function smallMultiples(container, panels, opts = {}) {
  const pw = 230, ph = 170, cols = Math.min(3, panels.length), W = cols * pw, rows = Math.ceil(panels.length / cols), H = rows * ph;
  const s = svg(container, W, H, opts.ariaLabel || "small multiples");
  const yMin = opts.yMin ?? Math.min(...panels.flatMap((p) => p.series.flatMap((q) => q.y.filter((v) => v !== null))));
  const yMax = opts.yMax ?? Math.max(...panels.flatMap((p) => p.series.flatMap((q) => q.y.filter((v) => v !== null))));
  panels.forEach((p, i) => {
    const ox = (i % cols) * pw + 36, oy = Math.floor(i / cols) * ph + 24, w = pw - 50, h = ph - 54;
    const xs = p.series[0].x;
    const sx = (v) => ox + (v - xs[0]) / (xs[xs.length - 1] - xs[0]) * w, sy = (v) => oy + (1 - (v - yMin) / (yMax - yMin)) * h;
    txt(s, ox, oy - 8, p.title, { fill: p.color || C.ink, size: 12, weight: 600 });
    s.appendChild(el("line", { x1: ox, y1: oy + h, x2: ox + w, y2: oy + h, stroke: C.line }));
    s.appendChild(el("line", { x1: ox, y1: oy, x2: ox, y2: oy + h, stroke: C.line }));
    xs.forEach((v) => txt(s, sx(v), oy + h + 14, String(v), { anchor: "middle", size: 10 }));
    [yMin, (yMin + yMax) / 2, yMax].forEach((v) => txt(s, ox - 4, sy(v) + 3, fmt(v, 2), { anchor: "end", size: 9 }));
    for (const q of p.series) {
      let d = "", pen = false;
      q.x.forEach((xv, k) => { const yv = q.y[k]; if (yv === null || yv === undefined) { pen = false; return; } d += (pen ? " L" : " M") + sx(xv).toFixed(1) + " " + sy(yv).toFixed(1); pen = true; });
      s.appendChild(el("path", { d, fill: "none", stroke: q.color, "stroke-width": q.width || 2, "stroke-dasharray": q.dashed ? "4 3" : null }));
      q.x.forEach((xv, k) => { const yv = q.y[k]; if (yv !== null && yv !== undefined) tip(s.appendChild(el("circle", { cx: sx(xv), cy: sy(yv), r: 3, fill: q.color })), `${q.name}, t${xv}: ${fmt(yv, 3)}`); });
    }
    for (const m of p.marks || []) { txt(s, sx(m.x), oy + 10, m.label, { anchor: "middle", size: 10, fill: C.ok, weight: 700 }); }
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(el("line", { x1: 40 + k * 160, y1: H - 6, x2: 60 + k * 160, y2: H - 6, stroke: lg.color, "stroke-width": 2, "stroke-dasharray": lg.dashed ? "4 3" : null })); txt(s, 66 + k * 160, H - 2, lg.name, { size: 10 }); });
}

/** Dot strip of a distribution by group. groups: [{name, values, color}], opts.thresholds:[{v,label}] */
export function dotStrip(container, groups, opts = {}) {
  const W = 760, rowH = 70, L = 130, R = 20, T = 28, B = 30;
  const H = T + groups.length * rowH + B;
  const s = svg(container, W, H, opts.ariaLabel || "distribution");
  const all = groups.flatMap((g) => g.values);
  const min = opts.min ?? Math.min(...all), max = opts.max ?? Math.max(...all);
  const x = (v) => L + (v - min) / (max - min) * (W - L - R);
  for (const t of opts.ticks || [min, (min + max) / 2, max]) { s.appendChild(el("line", { x1: x(t), y1: T - 4, x2: x(t), y2: H - B + 4, stroke: C.grid })); txt(s, x(t), H - B + 16, fmt(t, 1), { anchor: "middle", size: 10 }); }
  txt(s, L, 12, opts.axisTitle || "", { size: 10 });
  groups.forEach((g, i) => {
    const yc = T + i * rowH + rowH / 2;
    txt(s, 0, yc - 2, g.name, { fill: C.ink, size: 12, weight: 600 });
    txt(s, 0, yc + 12, `${g.values.length} firm-years`, { size: 10 });
    // beeswarm-ish: jitter by bin occupancy
    const bins = {};
    for (const v of [...g.values].sort((a, b) => a - b)) {
      const key = Math.round(x(v) / 3);
      const k = (bins[key] = (bins[key] || 0) + 1);
      const dy = ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 3.2) % (rowH / 2 - 6);
      s.appendChild(el("circle", { cx: x(v), cy: yc + dy, r: 1.9, fill: g.color, "fill-opacity": 0.6 }));
    }
    const med = [...g.values].sort((a, b) => a - b)[Math.floor(g.values.length / 2)];
    tip(s.appendChild(el("line", { x1: x(med), y1: yc - rowH / 2 + 6, x2: x(med), y2: yc + rowH / 2 - 6, stroke: g.color, "stroke-width": 2.5 })), `${g.name} median ${fmt(med, 2)}`);
  });
  for (const t of opts.thresholds || []) {
    s.appendChild(el("line", { x1: x(t.v), y1: T - 10, x2: x(t.v), y2: H - B, stroke: C.thr, "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
    txt(s, x(t.v) + 4, T - 12, t.label, { size: 10, fill: C.thr, weight: 600 });
  }
}

/** Correlation tiles. m: {labels:[], values:[[]]} */
export function tiles(container, m, opts = {}) {
  const n = m.labels.length, cell = 70, L = 150, T = 36;
  const W = L + n * cell + 10, H = T + n * cell + 10;
  const s = svg(container, W, H, opts.ariaLabel || "matrix");
  m.labels.forEach((lab, j) => txt(s, L + j * cell + cell / 2, T - 10, lab, { anchor: "middle", size: 11, fill: C.ink }));
  m.values.forEach((row, i) => {
    txt(s, L - 8, T + i * cell + cell / 2 + 4, m.labels[i], { anchor: "end", size: 11, fill: C.ink });
    row.forEach((v, j) => {
      const a = Math.min(1, Math.abs(v));
      const fill = i === j ? C.grid : (v >= 0 ? `rgba(43,95,140,${0.15 + 0.85 * a})` : `rgba(180,35,24,${0.15 + 0.85 * a})`);
      tip(s.appendChild(el("rect", { x: L + j * cell + 2, y: T + i * cell + 2, width: cell - 4, height: cell - 4, fill, rx: 4 })), `${m.labels[i]} × ${m.labels[j]}: ${fmt(v, 3)}`);
      txt(s, L + j * cell + cell / 2, T + i * cell + cell / 2 + 4, fmt(v, 2), { anchor: "middle", size: 11, fill: i === j ? C.ink2 : (a > 0.5 ? "#fff" : C.ink) });
    });
  });
}

/** Funnel / flow of counts. steps: [{label, n, note, color}] */
export function funnel(container, steps, opts = {}) {
  const W = 720, rowH = 46, L = 260, T = 10;
  const H = T + steps.length * rowH + 10;
  const s = svg(container, W, H, opts.ariaLabel || "funnel");
  const max = Math.max(...steps.map((st) => st.n));
  steps.forEach((st, i) => {
    const y = T + i * rowH, w = (st.n / max) * (W - L - 70);
    txt(s, 0, y + 20, st.label, { fill: C.ink, size: 12, weight: 600 });
    if (st.note) txt(s, 0, y + 34, st.note, { size: 10 });
    tip(s.appendChild(el("rect", { x: L, y: y + 8, width: Math.max(2, w), height: 24, fill: st.color || C.accent, rx: 3 })), `${st.label}: ${st.n}`);
    txt(s, L + w + 8, y + 25, String(st.n), { fill: C.ink, size: 13, weight: 700 });
  });
}

/** Timeline dots: items [{label, year, color, note}] */
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
    tip(s.appendChild(el("circle", { cx: x(it.year), cy, r: 6.5, fill: it.color || C.case })), `${it.label} — ${it.year}${it.note ? " · " + it.note : ""}`);
  });
  if (opts.legend) opts.legend.forEach((lg, k) => { s.appendChild(el("circle", { cx: L + 8 + k * 180, cy: 12, r: 5, fill: lg.color })); txt(s, L + 18 + k * 180, 16, lg.name, { size: 10 }); });
}

/** Histogram: values[], bins */
export function histogram(container, values, opts = {}) {
  const W = 720, H = 200, L = 40, R = 16, T = 16, B = 34;
  const s = svg(container, W, H, opts.ariaLabel || "histogram");
  const min = opts.min ?? Math.min(...values), max = opts.max ?? Math.max(...values), nb = opts.bins || 12;
  const counts = new Array(nb).fill(0);
  values.forEach((v) => counts[Math.min(nb - 1, Math.floor((v - min) / (max - min) * nb))]++);
  const cmax = Math.max(...counts);
  const bw = (W - L - R) / nb;
  counts.forEach((c, i) => {
    const h = (c / cmax) * (H - T - B);
    tip(s.appendChild(el("rect", { x: L + i * bw + 1, y: H - B - h, width: bw - 2, height: h, fill: opts.color || C.accent, rx: 2 })), `${fmt(min + i * (max - min) / nb, 2)}–${fmt(min + (i + 1) * (max - min) / nb, 2)}: ${c}`);
    if (c) txt(s, L + i * bw + bw / 2, H - B - h - 3, String(c), { anchor: "middle", size: 9 });
  });
  s.appendChild(el("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: C.line }));
  for (let i = 0; i <= nb; i += Math.ceil(nb / 6)) txt(s, L + i * bw, H - B + 14, fmt(min + i * (max - min) / nb, 1), { anchor: "middle", size: 10 });
  txt(s, W / 2, H - 2, opts.xLabel || "", { anchor: "middle", size: 10 });
  for (const m of opts.marks || []) { const xx = L + (m.v - min) / (max - min) * (W - L - R); s.appendChild(el("line", { x1: xx, y1: T, x2: xx, y2: H - B, stroke: C.thr, "stroke-dasharray": "5 4" })); txt(s, xx + 3, T + 10, m.label, { size: 10, fill: C.thr }); }
}

/** Dot plot by case: items [{label, x, color, note}], x on an integer axis (event time). */
export function dotRows(container, items, opts = {}) {
  const W = 720, L = 220, R = 20, T = 24, rowH = 16;
  const H = T + items.length * rowH + 24;
  const s = svg(container, W, H, opts.ariaLabel || "dot plot");
  const xs = opts.xs || [-5, -4, -3, -2, -1];
  const x = (v) => L + (xs.indexOf(v)) / (xs.length - 1) * (W - L - R);
  xs.forEach((v) => { s.appendChild(el("line", { x1: x(v), y1: T - 6, x2: x(v), y2: H - 18, stroke: C.grid })); txt(s, x(v), H - 4, `t${v}`, { anchor: "middle", size: 10 }); });
  txt(s, L, 10, opts.axisTitle || "", { size: 10 });
  items.forEach((it, i) => {
    const y = T + i * rowH + 8;
    txt(s, 0, y + 4, it.label, { fill: C.ink, size: 10.5 });
    if (it.x === null || it.x === undefined) txt(s, W - R, y + 4, "never", { anchor: "end", size: 10, fill: C.ink2 });
    else tip(s.appendChild(el("circle", { cx: x(it.x), cy: y, r: 5, fill: it.color || C.case })), `${it.label}: first separated at t${it.x}${it.note ? " · " + it.note : ""}`);
  });
}
