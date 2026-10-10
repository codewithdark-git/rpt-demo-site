// Company selector grouped by matched set, with search and keyboard navigation.
export function buildSelector(root, index, onSelect) {
  const search = document.getElementById("search");
  const state = { selected: null, buttons: [] };

  function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function render(filter) {
    root.textContent = "";
    state.buttons = [];
    const q = (filter || "").trim().toLowerCase();
    for (const set of index.sets) {
      const firms = set.firms.filter((f) => !q || f.name.toLowerCase().includes(q) || f.cik.includes(q) || set.case_name.toLowerCase().includes(q) || set.cluster_id.toLowerCase().includes(q));
      if (!firms.length) continue;
      const box = h("div", "set");
      const head = h("div", "set-head");
      head.appendChild(h("span", "", set.case_name));
      head.appendChild(h("span", "badge " + (set.stratum === "core" ? "core" : "disc"), set.stratum === "core" ? "misstatement/misappropriation" : "disclosure-only"));
      box.appendChild(head);
      for (const f of firms) {
        const b = h("button", "firm");
        b.type = "button";
        b.dataset.cik = f.cik;
        const dot = h("span", "dot " + (f.ai_flag_any ? "flag" : "none"));
        b.appendChild(dot);
        b.appendChild(h("span", "", f.name));
        b.appendChild(h("span", "badge " + f.role, f.role === "case" ? "case" : "matched"));
        if (state.selected === f.cik) b.classList.add("selected");
        b.addEventListener("click", () => select(f.cik));
        box.appendChild(b);
        state.buttons.push(b);
      }
      root.appendChild(box);
    }
    if (!root.children.length) root.appendChild(h("p", "small muted", "No firm matches."));
  }

  function select(cik) {
    state.selected = cik;
    state.buttons.forEach((b) => b.classList.toggle("selected", b.dataset.cik === cik));
    onSelect(cik);
  }

  if (search) {
    search.addEventListener("input", () => render(search.value));
    search.addEventListener("keydown", (e) => { if (e.key === "Enter" && state.buttons.length) select(state.buttons[0].dataset.cik); });
  }
  root.addEventListener("keydown", (e) => {
    const i = state.buttons.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" && state.buttons[i + 1]) { state.buttons[i + 1].focus(); e.preventDefault(); }
    if (e.key === "ArrowUp" && state.buttons[i - 1]) { state.buttons[i - 1].focus(); e.preventDefault(); }
  });
  render("");
  return { select: (cik) => { state.selected = cik; state.buttons.forEach((b) => b.classList.toggle("selected", b.dataset.cik === cik)); } };
}
