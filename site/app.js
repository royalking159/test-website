// Sidebar, page router and every page. Content is drawn into <main id="view">.
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isWeb = (u) => /^https?:/.test(u || "");
// Names shown in the sidebar and as page titles. Change them in config.js:  sectionNames: { projects: "..." }
const NAMES = { projects: "Projects/Study tools", ...(SITE.sectionNames || {}) };
const labelOf = (s) => NAMES[s] || s[0].toUpperCase() + s.slice(1);
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
  const m = { ...md, ...defined(e), id };
  if (e.description) m.overview = e.description;              // "description" is a friendlier name for "overview"
  return m;
}).filter((m) => !m.hidden).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));   // file order, unless you set `order`

// Where an episode's play icon goes: its own `url`, else the show's `watchUrl`, else `watchUrl` in config.js.
// A template can use {show} {title} {season} {episode} {name} {date}.
const watchUrl = (m, e, key, i) => {
  const tpl = e.url || m.watchUrl || SITE.watchUrl;
  if (!tpl) return "";
  const season = key === "Specials" ? 0 : /^Season \d+$/.test(key) ? Number(key.slice(7)) : key;
  const vals = { show: m.id, title: m.title, season, episode: i, name: e.title || "", date: e.date || "" };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vals[k] ?? ""));
};

// A description that shows a few lines, with a "Show more" button when it is longer than that.
const expandable = (text, cls, lines) => {
  const p = $("p", { class: `clamp ${cls}`, style: `--lines:${lines}` }, text);
  const btn = $("button", { type: "button", class: "more", "aria-expanded": "false" }, "Show more");
  btn.hidden = true;                                          // fit() reveals it only when the text is really cut off
  btn.onclick = () => {
    const open = p.classList.toggle("open");
    btn.textContent = open ? "Show less" : "Show more";
    btn.setAttribute("aria-expanded", String(open));
  };
  return $("div", { class: "clampbox" }, p, btn);
};
const fit = () => document.querySelectorAll(".clampbox").forEach((b) => {
  const [p, btn] = b.children;
  if (!p.classList.contains("open")) btn.hidden = !(p.scrollHeight > p.clientHeight + 6);   // a little slack so text that fits never gets a button
});
const metaLine = (m) => [m.year, m.runtime && `${m.runtime} min`, m.genres?.length && m.genres.join(", ")].filter(Boolean).join(" · ");
const ratingLine = (m) => [m.rating && stars(m.rating),
  m.score && $("small", {}, `TMDB ${m.score} / 10`)];

const page = (title, ...kids) => $("section", { class: "page" }, $("h1", { class: "title" }, title), ...kids);
const stars = (n) => $("span", { class: "stars", "aria-label": `${n} out of 5` }, "★".repeat(n) + "☆".repeat(5 - n));

const tile = (m, i = 0) => {
  const href = `#/${m.type === "show" ? "show" : "movie"}/${m.id}`;
  const blank = () => $("div", { class: "noposter" }, m.title);
  const pic = $("div", { class: "pic" }, m.poster ? img(m.poster, m.title, blank) : blank(), m.score && $("span", { class: "chip" }, `★ ${m.score}`));
  return $("figure", { class: "poster", style: `--i:${Math.min(i, 12)}` },
    href ? $("a", { href, target: isWeb(href) ? "_blank" : "", rel: "noopener noreferrer", "aria-label": m.title }, pic) : pic,
    $("figcaption", {}, $("strong", {}, m.title), ` ${m.year || ""}`,
      m.rating && stars(m.rating),
      m.genres?.length && $("small", {}, m.genres.slice(0, 2).join(", ")),
      m.note && $("small", {}, m.note)));
};

// Group a show's episodes into seasons: fetched episodes, then your moves / edits / images / extra seasons and season settings.
function seasonsOf(m) {
  const by = {}, touched = new Set();
  const label = (k) => (/^S\d+$/.test(k) ? "Season " + k.slice(1) : k);
  const add = (k, e) => (by[k] ||= []).push(e);
  for (const e of m.episodes || []) add(e.season === 0 ? "Specials" : `Season ${e.season}`, { ...e });
  for (const [k, v] of Object.entries(m.extra || {})) by[k] = v.map((e) => ({ ...e }));
  // Anything you list in an `extra` season (like Shorts) is removed from the fetched Specials, so it isn't shown twice.
  const norm = (t) => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  // Names match ignoring capitals, punctuation and quote styles, and also when one name contains the other.
  const near = (a, b) => !!a && !!b && (a === b || (a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))));
  const extraNorms = Object.values(m.extra || {}).flat().map((e) => norm(e.title));
  if (by.Specials && !("Specials" in (m.extra || {}))) by.Specials = by.Specials.filter((e) => !extraNorms.some((x) => near(x, norm(e.title))));

  const edits = {};                                           // your changes to single episodes, by their original name
  const merge = (src, wrap) => { for (const [t, v] of Object.entries(src || {})) edits[norm(t)] = { ...edits[norm(t)], ...wrap(v) }; };
  merge(m.moves, (s) => ({ season: s }));
  merge(m.images, (i) => ({ image: i }));
  merge(m.edits, (o) => o);
  for (const k of Object.keys(by)) {
    for (const e of [...by[k]]) {
      const o = edits[norm(e.title)];
      if (!o) continue;
      const { season, hidden, ...rest } = o;
      Object.assign(e, defined(rest));
      if (hidden) by[k].splice(by[k].indexOf(e), 1);
      else if (season && label(season) !== k) { by[k].splice(by[k].indexOf(e), 1); add(label(season), e); touched.add(label(season)); }
    }
  }
  touched.forEach((k) => by[k].sort((a, b) => (a.date || "9").localeCompare(b.date || "9")));
  for (const [season, order] of Object.entries(m.episodeOrder || {})) {
    const k = label(season);
    if (!by[k]) continue;
    const rank = (e) => { const i = order.findIndex((t) => norm(t) === norm(e.title)); return i < 0 ? order.length : i; };
    by[k] = by[k].map((e, i) => [e, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([e]) => e);
  }

  // Hand-added episodes (like Shorts): borrow the picture of a fetched episode with the same name,
  // else use a YouTube thumbnail when the episode has  youtube: "VIDEO_ID"  or a YouTube link as its url.
  const yt = (u) => (String(u || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/) || [])[1]
    || (/^[\w-]{11}$/.test(u || "") ? u : "");
  for (const eps of Object.values(by)) for (const e of eps) {
    const k = (m.episodes || []).find((x) => near(norm(x.title), norm(e.title)));
    if (k) { e.image ||= k.image; e.overview ||= k.overview; }
    const id = yt(e.youtube) || yt(e.url);
    if (!e.image && id) e.image = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  }

  // Episodes with no picture borrow one: your seasonImages, else the show's backdrop, season poster or poster.
  const sNum = (k) => (k === "Specials" ? 0 : /^Season \d+$/.test(k) ? Number(k.slice(7)) : null);
  const fallback = (k) => (m.seasonImages || {})[k] || m.backdrop || (m.seasonPosters || {})[sNum(k)] || m.poster;
  for (const [k, eps] of Object.entries(by)) for (const e of eps) e.image ||= fallback(k);

  const rank = (k) => (k === "Specials" ? 2 : /^Season \d+$/.test(k) ? 0 : 1);
  const num = (k) => Number(k.replace(/\D/g, "")) || 0;
  let keys = Object.keys(by).filter((k) => by[k].length).sort((a, b) => rank(a) - rank(b) || (rank(a) ? 0 : num(a) - num(b)));
  if (m.seasonOrder) { const want = m.seasonOrder.map(label); keys = [...want.filter((k) => keys.includes(k)), ...keys.filter((k) => !want.includes(k))]; }
  return Object.fromEntries(keys.map((k) => [(m.seasonNames || {})[k] || k, { key: k, eps: by[k], cover: (m.seasonCovers || {})[k] || (m.seasonPosters || {})[sNum(k)] || m.poster }]));
}

function showPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("p", {}, "That show isn't in your library."), $("a", { href: "#/movies" }, "Back to movies"));
  const seasons = seasonsOf(m), names = Object.keys(seasons);
  // Season picker: previous button, dropdown, next button
  const cur = $("span", { class: "dd-label" });
  const ddBtn = $("button", { type: "button", class: "dd-btn", "aria-haspopup": "listbox", "aria-expanded": "false" }, cur, $("span", { class: "chev" }));
  const opts = names.map((n) => $("li", { role: "option", tabindex: "-1", "data-n": n }, $("span", {}, n),
    $("small", {}, `${seasons[n].eps.length} ${seasons[n].eps.length === 1 ? "episode" : "episodes"}`)));
  const menu = $("ul", { class: "dd-menu", role: "listbox", "aria-label": "Seasons" }, opts);
  menu.hidden = true;
  const prev = $("button", { type: "button", class: "arrow", "aria-label": "Previous season" }, "‹");
  const next = $("button", { type: "button", class: "arrow", "aria-label": "Next season" }, "›");
  const dd = $("div", { class: "dd" }, ddBtn, menu);
  const bar = $("div", { class: "seasonpick" }, prev, dd, next);
  let at = 0;
  const toggle = (open) => {
    menu.hidden = !open;
    ddBtn.setAttribute("aria-expanded", String(open));
    if (open) opts[at].focus();
  };
  const list = $("ol", { class: "episodes" });
  const row = (e, i, key) => {
    const thumb = () => $("div", { class: "thumb" }, String(i));
    const url = watchUrl(m, e, key, i);
    return $("li", { style: `--i:${Math.min(i, 12)}` }, $("div", { class: "ep" },
      $("div", { class: "tw" }, e.image ? img(e.image, "", thumb) : thumb(), e.image && $("span", { class: "num" }, String(i))),
      $("div", { class: "grow" }, $("strong", {}, e.title || "TBA"), e.date && $("small", {}, fmt(e.date)),
        e.overview && expandable(e.overview, "ov", 2)),
      url && $("a", { class: "play", href: url, target: isWeb(url) ? "_blank" : "", rel: "noopener noreferrer", "aria-label": `Play ${e.title || "episode " + i}` })));
  };
  const draw = (n) => {
    at = names.indexOf(n);
    cur.textContent = n;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === at)));
    prev.disabled = at === 0;
    next.disabled = at === names.length - 1;
    list.replaceChildren(...seasons[n].eps.map((e, i) => row(e, i + 1, seasons[n].key)));
    setCover(seasons[n].cover);
    requestAnimationFrame(fit);
  };
  ddBtn.onclick = () => toggle(menu.hidden);
  prev.onclick = () => draw(names[at - 1]);
  next.onclick = () => draw(names[at + 1]);
  menu.onclick = (e) => { const li = e.target.closest("li"); if (li) { draw(li.dataset.n); toggle(false); ddBtn.focus(); } };
  menu.onkeydown = (e) => {
    const i = opts.indexOf(document.activeElement);
    const go = (j) => { e.preventDefault(); opts[Math.max(0, Math.min(opts.length - 1, j))].focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(opts.length - 1);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
    else if (e.key === "Escape" || e.key === "Tab") { toggle(false); ddBtn.focus(); }
  };
  const outside = (e) => { if (!dd.isConnected) removeEventListener("click", outside); else if (!dd.contains(e.target)) toggle(false); };
  addEventListener("click", outside);
  const blank = () => $("div", { class: "noposter" }, m.title);
  // Big blurred background that follows the season poster. It sits on <body> (fixed) so it fills the whole window.
  const bd = $("img", {});
  bd.alt = "";
  const bdwrap = $("div", { class: "bdwrap", "aria-hidden": "true" }, bd);
  document.body.append(bdwrap);
  bd.onerror = () => { bdwrap.hidden = true; };
  const setBackdrop = (u) => {
    const s = asset(u || m.poster || m.backdrop);
    bdwrap.hidden = !s;
    if (!s) return;
    bd.style.opacity = "0";
    bd.onload = () => { bd.style.opacity = ""; };
    bd.src = s;
  };
  const figure = $("figure", { class: "poster" });             // the big picture on the left; changes with the season
  const paintCover = (u) => figure.replaceChildren(u
    ? img(u, m.title, () => (m.poster && u !== m.poster ? img(m.poster, m.title, blank, { loading: "eager" }) : blank()), { loading: "eager" })
    : blank());
  const setCover = (u) => { setBackdrop(u); paintCover(u); };
  setCover(m.poster);
  const el = $("div", { class: "show" },
    $("aside", {}, figure, $("h1", {}, m.title),
      metaLine(m) && $("p", { class: "meta" }, metaLine(m)), ratingLine(m),
      m.overview && expandable(m.overview, "sdesc", 5)),
    $("div", {}, names.length
      ? [bar, list]
      : $("p", { class: "empty" }, "No episodes yet. They appear after the metadata update runs.")));
  if (names.length) draw(names[0]);
  return $("div", { class: "show-page" },
    $("a", { class: "btn back", href: "#/movies" }, "← Back to movies"), el);
}

function moviePage(id) {
  const m = library().find((x) => x.type !== "show" && x.id === id);
  if (!m) return page("Not found", $("a", { href: "#/movies" }, "Back to movies"));
  const blank = () => $("div", { class: "noposter" }, m.title);
  const url = watchUrl(m, m, "", 1);
  const meta = [m.year, m.runtime && `${m.runtime} min`, m.genres?.length && m.genres.join(", ")].filter(Boolean).join(" · ");
  return $("div", {}, $("a", { class: "btn back", href: "#/movies" }, "← Back to movies"),
    $("div", { class: "show" },
      $("aside", {}, $("figure", { class: "poster" }, m.poster ? img(m.poster, m.title, blank, { loading: "eager" }) : blank())),
      $("div", {}, $("h1", { class: "title mtitle" }, m.title), meta && $("p", { class: "meta" }, meta), ratingLine(m),
        m.overview && $("p", { class: "lead" }, m.overview), m.note && $("p", {}, m.note),
        url && $("a", { class: "btn", href: url, target: isWeb(url) ? "_blank" : "", rel: "noopener noreferrer" }, "Play"))));
}

// site/#/check/<show>: every episode name exactly as stored, and what the site shows after your library.js changes.
function checkPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("a", { href: "#/movies" }, "Back to movies"));
  const raw = {};
  for (const e of m.episodes || []) (raw[e.season === 0 ? "Specials" : `Season ${e.season}`] ||= []).push(e.title);
  const block = (k, titles) => [`\\n${k} (${titles.length})`, ...titles.map((t) => "  " + (t || "TBA"))];
  const shown = seasonsOf(m);
  const lines = ["NAMES AS THE DATABASES LIST THEM", ...Object.entries(raw).flatMap(([k, t]) => block(k, t)),
    "\\n\\nWHAT THE SITE SHOWS", ...Object.entries(shown).flatMap(([k, s]) => block(k, s.eps.map((e) => e.title)))];
  return page("data check", $("pre", { class: "check" }, lines.join("\\n")));
}

const featured = () => {
  const items = library().slice(0, 8);
  if (!items.length) return null;
  return $("section", { class: "featured" },
    $("div", { class: "rowhead" }, $("h2", {}, "From the library"), $("a", { href: "#/movies" }, "See all")),
    $("div", { class: "posters strip" }, items.map(tile)));
};

const P = {
  home: () => $("div", {}, $("section", { class: "hero" },
    $("h1", {}, SITE.tagline),
    SITE.intro && $("p", { class: "lead" }, SITE.intro),
    $("div", { class: "actions" }, (SITE.links || []).map((l) =>
      $("a", { class: "btn", href: l.url, target: isWeb(l.url) ? "_blank" : "", rel: "noopener noreferrer" }, l.label)))),
    featured()),

  projects: () => {
    const card = (p) => $("article", { class: "project" },
      $("h3", {}, p.url ? $("a", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, p.title) : p.title),
      $("p", {}, p.description),
      $("ul", { class: "tags" }, (p.tags || []).map((t) => $("li", {}, t))),
      p.repo && $("a", { class: "src", href: p.repo, target: "_blank", rel: "noopener noreferrer" }, "Source code"));
    const group = (name, items) => items?.length && $("section", { class: "group" }, $("h2", {}, name), $("div", { class: "cards" }, items.map(card)));
    return page(labelOf("projects"), group("Projects", SITE.projects),
      SITE.studyTools?.length && $("hr", { class: "divider" }), group("Study tools", SITE.studyTools));
  },

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
    const el = page(labelOf("movies"), $("div", { class: "filmstrip" }), bar, grid);
    draw("All");
    return el;
  },

  about: () => page(labelOf("about"), $("p", { class: "lead" }, SITE.about)),
};

// ---- Sidebar ----
const side = $("aside", { class: "sidebar", id: "sidebar" },
  $("a", { class: "brand", href: "#/" }, SITE.name),
  $("nav", { "aria-label": "Main" },
    [["home", "Home", "#/"], ...SITE.sections.map((s) => [s, labelOf(s), `#/${s}`])]
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
  document.querySelectorAll(".bdwrap").forEach((n) => n.remove());   // the show page adds its own background layer
  const [pg, arg] = location.hash.replace(/^#\/?/, "").split("/");
  let node, active = "", label = "";
  if (!pg) { node = P.home(); active = "home"; }
  else if (pg === "check") { node = checkPage(arg); label = "Data check"; }
  else if (pg === "show" || pg === "movie") {
    node = pg === "show" ? showPage(arg) : moviePage(arg); active = "movies";
    label = (library().find((m) => m.id === arg) || {}).title || "Show";
  } else if (SITE.sections.includes(pg) && P[pg]) {
    node = P[pg](); active = pg; label = labelOf(pg);
  } else { node = page("Not found", $("a", { href: "#/" }, "Back home")); label = "Not found"; }
  view.replaceChildren(node);
  requestAnimationFrame(fit);
  mark(active);
  document.title = label ? `${label} - ${SITE.name}` : SITE.name;
}
addEventListener("hashchange", () => { render(); scrollTo(0, 0); view.focus({ preventScroll: true }); });

addEventListener("resize", fit);
document.fonts?.ready.then(fit);
fetch("../data/metadata.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  .then((j) => {
    META = { movies: j.movies || {}, shows: j.shows || {} };
    document.querySelector(".panel").append($("p", { class: "status" }, j.updated
      ? `Posters and episodes last updated ${fmt(j.updated)}.`
      : "Posters and episodes haven't been fetched yet (placeholder data)."));
    render();
  });
