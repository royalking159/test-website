// Sidebar, page router and every page. Content is drawn into <main id="view">.
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isWeb = (u) => /^https?:/.test(u || "");
const fmt = (d) => /^\d{4}-\d{2}-\d{2}/.test(d || "")
  ? new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
  : d;
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
// A local image path like "posters/arrival.jpg" is looked up inside the data/ folder.
const asset = (u) => (u && !/^(https?:|data:|\/|\.\.)/.test(u) ? "../data/" + u : u);
// An <img> that swaps to a fallback if the image is missing or fails to load.
const img = (src, alt, fallback, attrs = {}) => {
  const el = $("img", { src: asset(src), alt, loading: "lazy", ...attrs });
  el.onerror = () => el.replaceWith(fallback());
  return el;
};

// Library = what you wrote in library.js, filled in with fetched metadata.json. Your own values win.
let META = { movies: {}, shows: {} };
const library = () => LIBRARY.map((e) => {
  const id = e.id || slug(e.title);
  const md = (e.type === "show" ? META.shows : META.movies)[id] || {};
  return { ...md, ...defined(e), id };
});

const page = (title, ...kids) => $("section", { class: "page" }, $("h1", { class: "title" }, title), ...kids);
const stars = (n) => $("span", { class: "stars", "aria-label": `${n} out of 5` }, "★".repeat(n) + "☆".repeat(5 - n));

const tile = (m) => {
  const href = m.type === "show" ? `#/show/${m.id}` : m.url;
  const blank = () => $("div", { class: "noposter" }, m.title);
  const pic = m.poster ? img(m.poster, m.title, blank) : blank();
  return $("figure", { class: "poster" },
    href ? $("a", { href, target: isWeb(href) ? "_blank" : "", rel: "noopener noreferrer", "aria-label": m.title }, pic) : pic,
    $("figcaption", {}, $("strong", {}, m.title), ` ${m.year || ""}`,
      m.rating && stars(m.rating),
      m.genres?.length && $("small", {}, m.genres.slice(0, 2).join(", ")),
      m.ratings?.imdb && $("small", {}, `IMDb ${m.ratings.imdb}`),
      m.note && $("small", {}, m.note)));
};

// Group a show's episodes into seasons: fetched episodes, then your `moves`, then your `extra` seasons.
function seasonsOf(m) {
  const by = {}, touched = new Set();
  const label = (k) => (/^S\d+$/.test(k) ? "Season " + k.slice(1) : k);
  const add = (k, e) => (by[k] ||= []).push(e);
  for (const e of m.episodes || []) add(e.season === 0 ? "Specials" : `Season ${e.season}`, e);
  for (const [title, to] of Object.entries(m.moves || {})) {
    for (const k of Object.keys(by)) {
      const i = by[k].findIndex((e) => e.title === title);
      if (i >= 0) { add(label(to), by[k].splice(i, 1)[0]); touched.add(label(to)); break; }
    }
  }
  touched.forEach((k) => by[k].sort((a, b) => (a.date || "9").localeCompare(b.date || "9")));
  Object.assign(by, m.extra || {});
  for (const eps of Object.values(by)) for (const e of eps) { const c = (m.images || {})[e.title]; if (c) e.image = c; }
  const rank = (k) => (k === "Specials" ? 2 : /^Season \d+$/.test(k) ? 0 : 1);
  const num = (k) => Number(k.replace(/\D/g, "")) || 0;
  return Object.fromEntries(Object.keys(by).filter((k) => by[k].length)
    .sort((a, b) => rank(a) - rank(b) || (rank(a) ? 0 : num(a) - num(b))).map((k) => [k, by[k]]));
}

function showPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("p", {}, "That show isn't in your library."), $("a", { href: "#/movies" }, "Back to movies"));
  const seasons = seasonsOf(m), names = Object.keys(seasons);
  const select = $("select", { "aria-label": "Season" }, names.map((n) => $("option", { value: n }, n)));
  const prev = $("button", { type: "button", "aria-label": "Previous season" }, "‹");
  const next = $("button", { type: "button", "aria-label": "Next season" }, "›");
  const list = $("ol", { class: "episodes" });
  const row = (e, i) => {
    const thumb = () => $("div", { class: "thumb" }, String(i));
    const inner = [
      e.image ? img(e.image, "", thumb) : thumb(),
      $("div", {}, $("strong", {}, `${i}. ${e.title || "TBA"}`), e.date && $("small", {}, fmt(e.date)),
        e.overview && $("p", { class: "ov" }, e.overview)),
    ];
    return $("li", {}, e.url
      ? $("a", { class: "ep", href: e.url, target: "_blank", rel: "noopener noreferrer" }, inner)
      : $("div", { class: "ep" }, inner));
  };
  const draw = (n) => {
    const at = names.indexOf(n);
    select.value = n;
    prev.disabled = at === 0;
    next.disabled = at === names.length - 1;
    list.replaceChildren(...seasons[n].map((e, i) => row(e, i + 1)));
  };
  prev.onclick = () => draw(names[names.indexOf(select.value) - 1]);
  next.onclick = () => draw(names[names.indexOf(select.value) + 1]);
  select.onchange = () => draw(select.value);
  const blank = () => $("div", { class: "noposter" }, m.title);
  const cover = m.poster ? img(m.poster, m.title, blank, { loading: "eager" }) : blank();
  const el = $("div", { class: "show" },
    $("aside", {}, $("figure", { class: "poster" }, cover), $("h1", {}, m.title), m.overview && $("p", {}, m.overview)),
    $("div", {}, names.length
      ? [$("div", { class: "seasonbar" }, prev, select, next), list]
      : $("p", { class: "empty" }, "No episodes yet. They appear after the metadata update runs.")));
  if (names.length) draw(names[0]);
  return $("div", {}, $("a", { class: "btn back", href: "#/movies" }, "← Back to movies"), el);
}

const P = {
  home: () => $("section", { class: "hero" },
    $("h1", {}, SITE.tagline),
    SITE.intro && $("p", { class: "lead" }, SITE.intro),
    $("div", { class: "actions" }, (SITE.links || []).map((l) =>
      $("a", { class: "btn", href: l.url, target: isWeb(l.url) ? "_blank" : "", rel: "noopener noreferrer" }, l.label)))),

  projects: () => page("projects", ...SITE.projects.map((p) =>
    $("article", { class: "project" },
      $("h3", {}, p.url ? $("a", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, p.title) : p.title),
      $("p", {}, p.description),
      $("ul", { class: "tags" }, (p.tags || []).map((t) => $("li", {}, t))),
      p.repo && $("a", { class: "src", href: p.repo, target: "_blank", rel: "noopener noreferrer" }, "Source code")))),

  movies: () => {
    const all = library();
    const kind = (m) => (m.type === "show" ? "Shows" : "Movies");
    const bar = $("div", { class: "seg" }), grid = $("div", { class: "posters" });
    const draw = (f) => {
      grid.replaceChildren(...all.filter((m) => f === "All" || kind(m) === f).map(tile));
      bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
    };
    ["All", ...new Set(all.map(kind))].forEach((f) => bar.append($("button", { type: "button", "data-f": f }, f)));
    bar.onclick = (e) => e.target.dataset.f && draw(e.target.dataset.f);
    const el = page("movies", $("div", { class: "filmstrip" }), bar, grid);
    draw("All");
    return el;
  },

  about: () => page("about", $("p", { class: "lead" }, SITE.about)),
};

// ---- Sidebar ----
const side = $("aside", { class: "sidebar", id: "sidebar" },
  $("a", { class: "brand", href: "#/" }, SITE.name),
  $("nav", { "aria-label": "Main" },
    [["home", "Home", "#/"], ...SITE.sections.map((s) => [s, s, `#/${s}`])]
      .map(([k, t, h]) => $("a", { href: h, "data-s": k }, t))),
  $("button", { type: "button", class: "settings-btn" }, "Settings"));
side.querySelector(".settings-btn").onclick = openSettings;

const menuBtn = $("button", { class: "menu-btn", type: "button", "aria-controls": "sidebar" });
const scrim = $("div", { class: "scrim" });
document.body.append(menuBtn, scrim, side);
document.body.classList.add("has-side");

const small = matchMedia("(max-width: 800px)");            // on a phone the sidebar slides in
let open = false;
const setMenu = (v) => {
  open = v;
  document.body.classList.toggle("menu-open", open);
  menuBtn.textContent = open ? "✕" : "☰";
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuBtn.setAttribute("aria-expanded", String(open));
  side.inert = small.matches && !open;
  if (open) side.querySelector("a").focus();
};
menuBtn.onclick = () => setMenu(!open);
scrim.onclick = () => setMenu(false);
side.addEventListener("click", (e) => e.target.closest("a, button") && setMenu(false));
small.addEventListener("change", () => setMenu(false));
addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { setMenu(false); menuBtn.focus(); } });
setMenu(false);

// ---- Router: #/ home, #/projects, #/movies, #/about, #/show/<id> ----
const view = document.getElementById("view");
const links = [...side.querySelectorAll("a[data-s]")];
const mark = (k) => links.forEach((a) => (a.dataset.s === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));

function render() {
  const [pg, arg] = location.hash.replace(/^#\/?/, "").split("/");
  let node, active = "", label = "";
  if (!pg) { node = P.home(); active = "home"; }
  else if (pg === "show") {
    node = showPage(arg); active = "movies";
    label = (library().find((m) => m.id === arg) || {}).title || "Show";
  } else if (SITE.sections.includes(pg) && P[pg]) {
    node = P[pg](); active = pg; label = pg[0].toUpperCase() + pg.slice(1);
  } else { node = page("Not found", $("a", { href: "#/" }, "Back home")); label = "Not found"; }
  view.replaceChildren(node);
  mark(active);
  document.title = label ? `${label} - ${SITE.name}` : SITE.name;
}
addEventListener("hashchange", () => { render(); scrollTo(0, 0); view.focus({ preventScroll: true }); });

fetch("../data/metadata.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  .then((j) => {
    META = { movies: j.movies || {}, shows: j.shows || {} };
    document.querySelector(".panel").append($("p", { class: "status" }, j.updated
      ? `Posters and episodes last updated ${fmt(j.updated)}.`
      : "Posters and episodes haven't been fetched yet (placeholder data)."));
    render();
  });
