// Global sidebar menu. Load this LAST on every page (after that page's own script).
// It is built from config.js: `sections` become the menu, `navLinks` are added below them.
// It reuses the $ helper that script.js and show.js define.
(() => {
  const onShow = !!document.querySelector(".show");          // true on show.html
  const home = onShow ? "index.html" : "";

  const side = $("aside", { class: "sidebar", id: "sidebar" },
    $("a", { class: "brand", href: onShow ? "index.html" : "#" }, SITE.name),
    $("nav", { "aria-label": "Main" },
      SITE.sections.map((s) => $("a", { href: `${home}#${s}`, "data-s": s }, s)),
      (SITE.navLinks || []).length && $("hr"),
      (SITE.navLinks || []).map((l) =>
        $("a", { class: "ext", href: l.url, target: "_blank", rel: "noopener noreferrer" }, l.label))));

  const btn = $("button", { class: "menu-btn", type: "button", "aria-controls": "sidebar" });
  const scrim = $("div", { class: "scrim" });
  document.body.append(btn, scrim, side);
  document.body.classList.add("has-side");

  // Phone: the menu slides in from the left.
  const small = matchMedia("(max-width: 800px)");
  let open = false;
  const set = (v) => {
    open = v;
    document.body.classList.toggle("menu-open", open);
    btn.textContent = open ? "✕" : "☰";
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    btn.setAttribute("aria-expanded", String(open));
    side.inert = small.matches && !open;                      // keep it out of tab order while hidden
    if (open) side.querySelector("a").focus();
  };
  btn.onclick = () => set(!open);
  scrim.onclick = () => set(false);
  side.onclick = (e) => e.target.closest("a") && set(false);
  small.addEventListener("change", () => set(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { set(false); btn.focus(); } });
  set(false);

  // Highlight the current section.
  const links = [...side.querySelectorAll("a[data-s]")];
  const mark = (s) => links.forEach((a) =>
    a.dataset.s === s ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"));
  if (onShow) {
    mark("movies");                                           // shows live in the Movies section
  } else {
    const spy = () => {
      let cur = "";
      for (const s of SITE.sections) {
        const n = document.getElementById(s);
        if (n && n.getBoundingClientRect().top <= innerHeight * 0.35) cur = s;
      }
      // At the very bottom, the last section may never reach the line, so count it as current.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
        cur = [...SITE.sections].reverse().find((s) => document.getElementById(s)) || cur;
      }
      mark(cur);
    };
    addEventListener("scroll", spy, { passive: true });
    addEventListener("resize", spy);
    spy();
  }
})();
