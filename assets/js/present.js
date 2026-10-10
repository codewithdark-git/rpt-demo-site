// Reading-progress bar and optional presentation mode (one section at a time, prev/next, arrow keys).
const bar = document.getElementById("progress-bar");
function progress() {
  if (!bar) return;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + "%";
}
document.addEventListener("scroll", progress, { passive: true });
progress();

const toggle = document.getElementById("present-toggle");
const controls = document.getElementById("present-controls");
const slides = Array.from(document.querySelectorAll("[data-slide]"));
let active = false, idx = 0;

function show(i) {
  idx = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, k) => s.classList.toggle("slide-hidden", k !== idx));
  const pos = document.getElementById("present-pos");
  if (pos) pos.textContent = `${idx + 1} / ${slides.length} · ${slides[idx].getAttribute("data-slide") || ""}`;
  window.scrollTo({ top: 0, behavior: "auto" });
  slides[idx].setAttribute("tabindex", "-1");
  slides[idx].focus({ preventScroll: true });
}
function enter() {
  if (!slides.length) return;
  active = true;
  document.body.classList.add("presenting");
  controls.hidden = false;
  toggle.setAttribute("aria-pressed", "true");
  const hash = location.hash.slice(1);
  const start = slides.findIndex((s) => s.id === hash);
  show(start >= 0 ? start : 0);
}
function exit() {
  active = false;
  document.body.classList.remove("presenting");
  controls.hidden = true;
  toggle.setAttribute("aria-pressed", "false");
  slides.forEach((s) => s.classList.remove("slide-hidden"));
}
if (toggle) {
  if (!slides.length) toggle.hidden = true;
  toggle.addEventListener("click", () => (active ? exit() : enter()));
  document.getElementById("present-prev").addEventListener("click", () => show(idx - 1));
  document.getElementById("present-next").addEventListener("click", () => show(idx + 1));
  document.getElementById("present-exit").addEventListener("click", exit);
  document.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key === "p" || e.key === "P") { active ? exit() : enter(); e.preventDefault(); }
    if (!active) return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { show(idx + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { show(idx - 1); e.preventDefault(); }
    if (e.key === "Escape") exit();
  });
}
