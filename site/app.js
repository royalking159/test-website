// Sidebar, page router and every page. Content is drawn into <main id="view">.
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isWeb = (u) => /^https?:/.test(u || "");
// Names shown in the sidebar and as page titles. Change them in config.js:  sectionNames: { projects: "..." }
const NAMES = { projects: "Projects/Study tools", movies: "Movies/Shows", ...(SITE.sectionNames || {}) };
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
// ---- Community database titles (community/*.json) are loaded at start and merged with library.js and metadata.json ----
let DBFULL = {};
const fromCommunity = (d) => {                               // a community file -> the shape the site already uses
  const episodes = [], extra = {}, seasonPosters = {}, seasonCovers = {}, seasonTrailers = {};
  for (const s of d.seasons || []) {
    const n = /^Season (\d+)$/i.exec(s.name)?.[1];
    const list = (s.episodes || []).map((e, i) => ({ title: e.title, number: i + 1, date: e.date, overview: e.overview, image: e.image, youtube: e.youtube }));
    if (n) { list.forEach((e) => episodes.push({ ...e, season: Number(n) })); if (s.poster) seasonPosters[n] = s.poster; if (s.trailer) seasonTrailers[n] = s.trailer; }
    else if (/^specials$/i.test(s.name)) { list.forEach((e) => episodes.push({ ...e, season: 0 })); if (s.poster) seasonPosters[0] = s.poster; }
    else { extra[s.name] = list; if (s.poster) seasonCovers[s.name] = s.poster; }   // named seasons like Shorts
  }
  return { type: d.type === "movie" ? "movie" : "show", title: d.title, year: d.year, overview: d.description, genres: d.genres,
    poster: d.images?.poster, backdrop: d.images?.backdrop, cast: d.cast, directors: d.directors, trailer: d.trailer, episodes, extra, seasonPosters, seasonCovers, seasonTrailers };
};
// An episode with no picture of its own gets the TMDB still the site already fetched (same name, else same season and number).
const fillStills = (eps, md) => {
  const known = md.episodes || [];
  return eps.map((e) => {
    const t = normBase(e.title);
    const hit = known.find((x) => normBase(x.title) === t) || (e.season > 0 ? known.find((x) => x.season === e.season && x.number === e.number) : null);
    return hit ? { ...e, image: e.image || hit.image, overview: e.overview || hit.overview, date: e.date || hit.date } : e;   // only what is missing
  });
};
const library = () => {
  const used = new Set();
  const make = (e, d) => {
    const id = e.id || slug(e.title || d.title);
    const type = e.type || (d?.type === "movie" ? "movie" : "show");
    const md = (type === "show" ? META.shows : META.movies)[id] || {};
    const c = d ? fromCommunity(d) : {};
    const m = { ...md, ...defined(c), ...defined(e), id, type };       // library.js tweaks > database > TMDB/TVDB data
    if (d) {                                                            // the database decides the episodes and seasons
      m.episodes = fillStills(c.episodes, md);
      const have = new Set(c.episodes.map((x) => x.season)), skip = (t) => normBase(t).length < 4 || /^episode\d+$/.test(normBase(t));   // TBA / "Episode 4" placeholders
      for (const x of md.episodes || [])                                // a numbered season the database doesn't list comes from TMDB
        if (x.season > 0 && !have.has(x.season) && !skip(x.title)) m.episodes.push({ title: x.title, number: x.number, season: x.season, date: x.date, overview: x.overview, image: x.image });
      m.seasonTrailers = { ...(md.seasonTrailers || {}), ...c.seasonTrailers };
      m.extra = { ...(e.extra || {}), ...Object.fromEntries(Object.entries(c.extra).map(([k, v]) => [k, fillStills(v, md)])) };
      m.seasonPosters = { ...(md.seasonPosters || {}), ...c.seasonPosters };
      m.seasonCovers = { ...c.seasonCovers, ...(e.seasonCovers || {}) };
    }
    if (e.description) m.overview = e.description;                      // "description" is a friendlier name for "overview"
    used.add(id);
    return m;
  };
  const list = LIBRARY.map((e) => make(e, DBFULL[e.id || slug(e.title)]));
  for (const d of Object.values(DBFULL)) if (!used.has(d.id)) list.push(make({}, d));   // titles that only exist in the database
  return list.filter((m) => !m.hidden).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));   // file order, unless you set `order`
};

// Where an episode's play icon goes: its own `url`, else the show's `watchUrl`, else `watchUrl` in config.js.
// A template can use {show} {title} {season} {episode} {name} {date}.
// Names are compared ignoring capitals, punctuation and anything in (brackets). The metadata Action uses the same rule.
const normBase = (t) => String(t || "").replace(/\(.*?\)/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const watchUrl = (m, e, key, i) => {
  // Order: the episode's own url, a YouTube video the Action found, episodeLinks, the show's watchUrl, then config.js.
  const found = m.ytLinks || {};
  const yt = found[normBase(e.orig || e.title)] || (e.season > 0 && e.number ? found[`s${e.season}e${e.number}`] : "");
  const tpl = e.url || e.youtube || (yt && `https://www.youtube.com/watch?v=${yt}`) || (m.episodeLinks?.[key] || [])[i - 1] || m.watchUrl || SITE.watchUrl;
  if (!tpl) return "";
  const season = key === "Specials" ? 0 : /^Season \d+$/.test(key) ? Number(key.slice(7)) : key;
  const vals = { show: m.id, title: m.title, season, episode: i, name: e.title || "", date: e.date || "" };
  const url = tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vals[k] ?? ""));
  return /^[\w-]{11}$/.test(url) ? `https://www.youtube.com/watch?v=${url}` : url;     // a bare YouTube id works too
};

// ---- In-site player ----
// Google Drive, YouTube and direct video links (.mp4 etc.) play inside the site. Anything else opens as a normal link.
// Turn this off with  playInSite: false  in config.js.
const embedOf = (url) => {
  if (SITE.playInSite === false) return null;
  const drive = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
  if (drive) return { kind: "iframe", src: `https://drive.google.com/file/d/${drive[1]}/preview` };
  const yt = (String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/) || [])[1];
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1` };
  if (/\.(mp4|webm|m4v|ogv|mov)(\?|#|$)/i.test(url)) return { kind: "video", src: url };
  return null;
};
let player;
const ensurePlayer = () => {
  if (player) return player;
  const title = $("strong"), sub = $("small"), frame = $("div", { class: "pl-frame" });
  const loading = $("div", { class: "pl-loading" }, $("span", { class: "spin" }));
  const btn = (act, label) => $("button", { type: "button", class: "pl-btn", "data-act": act, "aria-label": label, title: label });
  const prevBtn = btn("prev", "Previous episode"), nextBtn = btn("next", "Next episode"), closeBtn = btn("close", "Close player");
  const ext = $("a", { class: "pl-btn", "data-act": "ext", target: "_blank", rel: "noopener noreferrer", "aria-label": "Open in a new tab", title: "Open in a new tab" });
  const foot = $("a", { target: "_blank", rel: "noopener noreferrer" }, "open it in a new tab");
  const dlg = $("dialog", { class: "player", "aria-label": "Video player" },
    $("div", { class: "pl-head" }, $("div", { class: "pl-titles" }, title, sub), $("div", { class: "pl-actions" }, prevBtn, nextBtn, ext, closeBtn)),
    $("div", { class: "pl-stage" }, loading, frame),
    $("p", { class: "pl-foot" }, "Video not playing? You can ", foot, "."));
  const go = (dir) => { const n = player.info?.[dir]?.(); if (n && embedOf(n.url)) showInPlayer(n); };
  prevBtn.onclick = () => go("prev");
  nextBtn.onclick = () => go("next");
  closeBtn.onclick = () => dlg.close();
  dlg.addEventListener("close", () => { frame.replaceChildren(); document.documentElement.classList.remove("lock"); });   // removing the frame stops playback
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go("next"); else if (e.key === "ArrowLeft") go("prev"); });
  document.body.append(dlg);
  return (player = { dlg, frame, loading, title, sub, ext, foot, prevBtn, nextBtn, info: null });
};
const showInPlayer = (info) => {
  const p = ensurePlayer(), em = embedOf(info.url), nxt = info.next?.(), prv = info.prev?.();
  p.info = info;
  p.title.textContent = info.title;
  p.sub.textContent = info.sub || "";
  p.ext.href = p.foot.href = info.url;
  p.nextBtn.hidden = !(nxt && embedOf(nxt.url));
  p.prevBtn.hidden = !(prv && embedOf(prv.url));
  p.loading.hidden = false;
  let media;
  if (em.kind === "video") {
    media = $("video", { src: em.src });
    Object.assign(media, { controls: true, autoplay: true, playsInline: true });
    media.addEventListener("loadeddata", () => { p.loading.hidden = true; });
  } else {
    media = $("iframe", { src: em.src, title: info.title, referrerpolicy: "strict-origin-when-cross-origin", allow: "autoplay; fullscreen; picture-in-picture; encrypted-media" });
    media.allowFullscreen = true;
    media.addEventListener("load", () => { p.loading.hidden = true; });
  }
  p.frame.replaceChildren(media);
  if (!p.dlg.open) { document.documentElement.classList.add("lock"); p.dlg.showModal(); }
};
// Make a link open the player when it can; otherwise it stays a normal link.
const wire = (a, info) => {
  a.onclick = (ev) => { if (embedOf(info.url)) { ev.preventDefault(); showInPlayer(info); } };
  return a;
};
const playLink = (info, label) => wire($("a", { class: "play", href: info.url, target: isWeb(info.url) ? "_blank" : "", rel: "noopener noreferrer", "aria-label": label }), info);

// A "Play trailer" button. set(id, sub) shows it for a YouTube id and hides it when there is none.
const trailerBtn = (title) => {
  const el = $("button", { type: "button", class: "btn trailer" }, "Play trailer");
  el.hidden = true;
  let url = "", sub = "";
  el.onclick = () => (embedOf(url) ? showInPlayer({ url, title: `${title} (trailer)`, sub }) : window.open(url, "_blank", "noopener"));
  return { el, set: (id, s = "") => { url = id ? `https://www.youtube.com/watch?v=${id}` : ""; sub = s; el.hidden = !url; } };
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
  for (const e of m.episodes || []) add(e.season === 0 ? "Specials" : `Season ${e.season}`, { ...e, orig: e.title });
  for (const [k, v] of Object.entries(m.extra || {})) by[k] = v.map((e) => ({ ...e, orig: e.title }));
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

  const coverOf = (k, depth = 0) => {                         // a season's big poster (your own, else TMDB's, else the show's)
    const c = (m.seasonCovers || {})[k];
    if (c && by[c] && depth < 3) return coverOf(c, depth + 1);   // seasonCovers: { Shorts: "Specials" } = use that season's poster
    return c || (m.seasonPosters || {})[sNum(k)] || m.poster;
  };
  const rank = (k) => (k === "Specials" ? 2 : /^Season \d+$/.test(k) ? 0 : 1);
  const num = (k) => Number(k.replace(/\D/g, "")) || 0;
  let keys = Object.keys(by).filter((k) => by[k].length).sort((a, b) => rank(a) - rank(b) || (rank(a) ? 0 : num(a) - num(b)));
  if (m.seasonOrder) { const want = m.seasonOrder.map(label); keys = [...want.filter((k) => keys.includes(k)), ...keys.filter((k) => !want.includes(k))]; }
  return Object.fromEntries(keys.map((k) => [(m.seasonNames || {})[k] || k, { key: k, eps: by[k], cover: coverOf(k), trailer: (m.seasonTrailers || {})[sNum(k)] }]));
}

function showPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("p", {}, "That show isn't in your library."), $("a", { href: "#/movies" }, `Back to ${labelOf("movies")}`));
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
  // What the player needs to know about one episode (nothing when it has no play link)
  const infoFor = (S, j, name) => {
    const e = S.eps[j];
    if (!e) return null;
    const url = watchUrl(m, e, S.key, j + 1);
    return url && { url, title: e.title || `Episode ${j + 1}`, sub: `${m.title} · ${name} · Episode ${j + 1}`, next: () => infoFor(S, j + 1, name), prev: () => infoFor(S, j - 1, name) };
  };
  const row = (e, i, key, n) => {
    const thumb = () => $("div", { class: "thumb" }, String(i));
    const info = infoFor(seasons[n], i - 1, n);
    return $("li", { style: `--i:${Math.min(i, 12)}` }, $("div", { class: "ep" },
      $("div", { class: "tw" }, e.image ? img(e.image, "", thumb) : thumb(), e.image && $("span", { class: "num" }, String(i))),
      $("div", { class: "grow" }, $("strong", {}, e.title || "TBA"), e.date && $("small", {}, fmt(e.date)),
        e.overview && expandable(e.overview, "ov", 2)),
      info && playLink(info, `Play ${e.title || "episode " + i}`)));
  };
  const draw = (n) => {
    at = names.indexOf(n);
    cur.textContent = n;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === at)));
    prev.disabled = at === 0;
    next.disabled = at === names.length - 1;
    list.replaceChildren(...seasons[n].eps.map((e, i) => row(e, i + 1, seasons[n].key, n)));
    setCover(seasons[n].cover);
    tr.set(seasons[n].trailer || m.trailer, n);
    fit();
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
  const tr = trailerBtn(m.title);                             // plays the season's trailer, else the show's
  const figure = $("figure", { class: "poster" });             // the big picture on the left; changes with the season
  const paintCover = (u) => figure.replaceChildren(u
    ? img(u, m.title, () => (m.poster && u !== m.poster ? img(m.poster, m.title, blank, { loading: "eager" }) : blank()), { loading: "eager" })
    : blank());
  const setCover = (u) => { setBackdrop(u); paintCover(u); };
  setCover(m.poster);
  tr.set(m.trailer);
  const el = $("div", { class: "show" },
    $("aside", {}, figure, $("h1", {}, m.title),
      metaLine(m) && $("p", { class: "meta" }, metaLine(m)), ratingLine(m), tr.el,
      m.overview && expandable(m.overview, "sdesc", 5),
      m.directors?.length && $("p", { class: "credit" }, `Created by ${m.directors.join(", ")}`),
      m.cast?.length && $("p", { class: "credit" }, `Starring ${m.cast.join(", ")}`)),
    $("div", {}, names.length
      ? [bar, list]
      : $("p", { class: "empty" }, "No episodes yet. They appear after the metadata update runs.")));
  if (names.length) draw(names[0]);
  return $("div", { class: "show-page" },
    $("a", { class: "btn back", href: "#/movies" }, `← Back to ${labelOf("movies")}`), el);
}

function moviePage(id) {
  const m = library().find((x) => x.type !== "show" && x.id === id);
  if (!m) return page("Not found", $("a", { href: "#/movies" }, `Back to ${labelOf("movies")}`));
  const blank = () => $("div", { class: "noposter" }, m.title);
  const url = watchUrl(m, m, "", 1);
  const tr = trailerBtn(m.title);
  tr.set(m.trailer);
  const meta = [m.year, m.runtime && `${m.runtime} min`, m.genres?.length && m.genres.join(", ")].filter(Boolean).join(" · ");
  return $("div", {}, $("a", { class: "btn back", href: "#/movies" }, `← Back to ${labelOf("movies")}`),
    $("div", { class: "show" },
      $("aside", {}, $("figure", { class: "poster" }, m.poster ? img(m.poster, m.title, blank, { loading: "eager" }) : blank())),
      $("div", {}, $("h1", { class: "title mtitle" }, m.title), meta && $("p", { class: "meta" }, meta), ratingLine(m),
        m.overview && $("p", { class: "lead" }, m.overview), m.note && $("p", {}, m.note),
        tr.el, url && wire($("a", { class: "btn", href: url, target: isWeb(url) ? "_blank" : "", rel: "noopener noreferrer" }, "Play"), { url, title: m.title, sub: String(m.year || "") }))));
}

// site/#/check/<show>: every episode name exactly as stored, and what the site shows after your library.js changes.
function checkPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("a", { href: "#/movies" }, `Back to ${labelOf("movies")}`));
  const raw = {};
  for (const e of m.episodes || []) (raw[e.season === 0 ? "Specials" : `Season ${e.season}`] ||= []).push(e.title);
  const block = (k, titles) => [`\\n${k} (${titles.length})`, ...titles.map((t) => "  " + (t || "TBA"))];
  const shown = seasonsOf(m);
  const lines = ["NAMES AS THE DATABASES LIST THEM", ...Object.entries(raw).flatMap(([k, t]) => block(k, t)),
    "\\n\\nWHAT THE SITE SHOWS", ...Object.entries(shown).flatMap(([k, s]) => block(k, s.eps.map((e) => e.title)))];
  return page("data check", $("pre", { class: "check" }, lines.join("\\n")));
}

// A dropdown where you can tick several options. The ticked ones show as chips with an x to remove them.
const multiSelect = (label, options, picked, onChange) => {
  const chips = $("div", { class: "tagchips" });
  const text = $("span", { class: "dd-label" }, label);
  const btn = $("button", { type: "button", class: "dd-btn", "aria-haspopup": "listbox", "aria-expanded": "false" }, text, $("span", { class: "chev" }));
  const opts = options.map((o) => $("li", { role: "option", tabindex: "-1", "data-o": o }, $("span", {}, o), $("span", { class: "tick" })));
  const menu = $("ul", { class: "dd-menu", role: "listbox", "aria-multiselectable": "true", "aria-label": label }, opts);
  menu.hidden = true;
  const dd = $("div", { class: "dd tagdd" }, btn, menu);
  const clear = $("button", { type: "button", class: "tagclear" }, "Clear all");
  const paint = () => {
    text.textContent = picked.size ? `${label} (${picked.size})` : label;
    opts.forEach((li) => li.setAttribute("aria-selected", String(picked.has(li.dataset.o))));
    chips.replaceChildren(...[...picked].map((t) => {
      const x = $("button", { type: "button", class: "tagx", "aria-label": `Remove tag ${t}` }, t, $("span", { "aria-hidden": "true" }, "✕"));
      x.onclick = () => { picked.delete(t); paint(); onChange(); };
      return x;
    }), picked.size > 1 ? clear : null);
  };
  const toggle = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) opts[0].focus();
  };
  btn.onclick = () => toggle(menu.hidden);
  clear.onclick = () => { picked.clear(); paint(); onChange(); };
  menu.onclick = (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    picked.has(li.dataset.o) ? picked.delete(li.dataset.o) : picked.add(li.dataset.o);
    paint(); onChange(); li.focus();
  };
  menu.onkeydown = (e) => {
    const i = opts.indexOf(document.activeElement);
    const go = (j) => { e.preventDefault(); opts[Math.max(0, Math.min(opts.length - 1, j))].focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
    else if (e.key === "Escape" || e.key === "Tab") { toggle(false); btn.focus(); }
  };
  const outside = (e) => { if (!dd.isConnected) removeEventListener("click", outside); else if (!dd.contains(e.target)) toggle(false); };
  addEventListener("click", outside);
  paint();
  return { dd, chips };
};

// ---------------- "Add a title" form: builds the database file for you ----------------
function dbAdd() {
  const yid = (v) => { v = String(v || "").trim(); return /^[\w-]{11}$/.test(v) ? v : (v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1] || ""; };
  const input = (ph, attrs = {}) => $("input", { type: "text", placeholder: ph, ...attrs });
  const field = (label, el, hint) => $("label", { class: "field" }, $("span", {}, label), el, hint && $("small", {}, hint));
  const kind = $("select", {}, $("option", { value: "show" }, "TV show"), $("option", { value: "movie" }, "Movie"));
  const title = input("Helluva Boss"), year = input("2020", { inputmode: "numeric" }), genres = input("Animation, Comedy");
  const desc = $("textarea", { rows: "4", placeholder: "A short summary in your own words" });
  const tmdb = input("289892", { inputmode: "numeric" }), imdb = input("tt10691770"), tvdb = input("(optional)", { inputmode: "numeric" });
  const poster = input("https://..."), trailer = input("YouTube link or id"), who = input("your GitHub name");
  const seasons = $("div", { class: "seasonsform" });
  const addSeason = (name = "") => {
    const nm = input("Season 1", { value: name });
    const eps = $("textarea", { rows: "5", placeholder: "One episode per line:\nTitle | 2024-05-31 | short summary | YouTube link or id\n(only the title is needed)" });
    const rm = $("button", { type: "button", class: "btn" }, "Remove season");
    const box = $("div", { class: "seasonbox" }, field("Season name", nm), field("Episodes", eps), rm);
    Object.assign(box, { nm, eps });
    rm.onclick = () => { box.remove(); update(); };
    box.addEventListener("input", update);
    seasons.append(box);
    return box;
  };
  const addBtn = $("button", { type: "button", class: "btn" }, "Add a season");
  addBtn.onclick = () => { addSeason(); update(); };
  const seasonsWrap = $("div", {}, $("h2", {}, "Seasons and episodes"), seasons, addBtn);
  const out = $("pre", { class: "jsonout" }), problems = $("ul", { class: "problems" });
  const copy = $("button", { type: "button", class: "btn primary" }, "Copy file contents");
  const open = $("a", { class: "btn", target: "_blank", rel: "noopener noreferrer" }, "Open on GitHub");
  let json = "";
  function update() {
    const bad = [], t = title.value.trim(), isShow = kind.value === "show";
    const id = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const o = { id, type: kind.value, title: t };
    if (!t) bad.push("Add a title.");
    if (year.value.trim()) { if (/^\d{4}$/.test(year.value.trim())) o.year = Number(year.value); else bad.push("The year should be 4 digits."); }
    if (desc.value.trim()) o.description = desc.value.trim().replace(/\s+/g, " ");
    const g = genres.value.split(",").map((x) => x.trim()).filter(Boolean);
    if (g.length) o.genres = g;
    const ids = {};
    if (/^\d+$/.test(tmdb.value.trim())) ids.tmdb = Number(tmdb.value);
    if (/^tt\d+$/.test(imdb.value.trim())) ids.imdb = imdb.value.trim(); else if (imdb.value.trim()) bad.push("IMDb ids look like tt1234567.");
    if (/^\d+$/.test(tvdb.value.trim())) ids.tvdb = Number(tvdb.value);
    if (Object.keys(ids).length) o.ids = ids;
    if (poster.value.trim()) { if (/^https:\/\//.test(poster.value.trim())) o.images = { poster: poster.value.trim() }; else bad.push("The poster link must start with https://"); }
    if (trailer.value.trim()) { if (yid(trailer.value)) o.trailer = yid(trailer.value); else bad.push("That trailer doesn't look like a YouTube link."); }
    seasonsWrap.hidden = !isShow;
    if (isShow) {
      o.seasons = [...seasons.children].map((b) => ({ name: b.nm.value.trim() || "Season", episodes: b.eps.value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [et, date, sum, yt] = l.split("|").map((x) => x.trim());
        const e = { title: et };
        if (date) { if (/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = date; else bad.push(`"${et}": dates look like 2024-05-31.`); }
        if (sum) e.overview = sum;
        if (yt) { if (yid(yt)) e.youtube = yid(yt); else bad.push(`"${et}": that YouTube link isn't valid.`); }
        return e;
      }) }));
    }
    if (who.value.trim()) o.contributors = [who.value.trim()];
    json = JSON.stringify(o, null, 2) + "\n";
    if (/[<>]/.test(json.replace(/\\n/g, ""))) bad.push("Please leave out < and > characters.");
    out.textContent = json;
    problems.replaceChildren(...bad.map((b) => $("li", {}, b)));
    open.href = ghLink(`new/main/community/${isShow ? "shows" : "movies"}`, `?filename=${id || "my-title"}.json&value=${encodeURIComponent(json)}`) || "#";
    open.hidden = !repoInfo();
  }
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(json); copy.textContent = "Copied!"; } catch { copy.textContent = "Select the text below and copy it"; }
    setTimeout(() => (copy.textContent = "Copy file contents"), 2200);
  };
  [kind, title, year, genres, desc, tmdb, imdb, tvdb, poster, trailer, who].forEach((el) => el.addEventListener("input", update));
  addSeason("Season 1");
  update();
  return page("Add a title",
    $("p", { class: "lead" }, "Fill this in and the file is built for you. Write the description in your own words (not copied from another site)."),
    $("div", { class: "addform" },
      field("Type", kind), field("Title", title), $("div", { class: "row2" }, field("Year", year), field("Genres", genres, "Separate with commas")),
      field("Description", desc), $("div", { class: "row2" }, field("TMDB id", tmdb), field("IMDb id", imdb)),
      $("div", { class: "row2" }, field("TVDB id", tvdb), field("Poster link", poster, "An https:// link")),
      field("Trailer", trailer, "A YouTube link or the 11-character id"), field("Your GitHub name", who, "So you get the credit"),
      seasonsWrap, $("h2", {}, "The file"), problems, out,
      $("div", { class: "actions" }, copy, open),
      $("p", { class: "credit" }, "On GitHub, paste (Ctrl+V) over the contents if the editor looks wrong, then choose Commit changes, then Propose changes. The owner reviews it before it goes live.")));
}

// ---------------- Community database (files in community/, index in data/community-index.json) ----------------
let COMMUNITY;
const loadCommunity = () => (COMMUNITY ||= fetch("../data/community-index.json").then((r) => (r.ok ? r.json() : { titles: [] })).catch(() => ({ titles: [] })));
const loadCommunityFull = async () => {                      // fetches each community title file once at start
  const { titles = [] } = await loadCommunity();
  await Promise.all(titles.map(async (t) => {
    const d = await fetch(`../community/${t.type === "movie" ? "movies" : "shows"}/${encodeURIComponent(t.id)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) DBFULL[t.id] = d;
  }));
};
const repoInfo = () => {                                     // "owner/name" of the GitHub repo, worked out from the site address (or SITE.repo)
  if (SITE.repo) return SITE.repo;
  if (!location.hostname.endsWith(".github.io")) return "";
  const owner = location.hostname.split(".")[0], first = location.pathname.split("/")[1] || "";
  return `${owner}/${first && first !== "site" ? first : owner + ".github.io"}`;
};
const ghLink = (path, query = "") => (repoInfo() ? `https://github.com/${repoInfo()}/${path}${query}` : "");
const extLink = (href, text, cls) => href && $("a", { class: cls, href, target: "_blank", rel: "noopener noreferrer" }, text);
const DB_TEMPLATE = JSON.stringify({ id: "my-show", type: "show", title: "My Show", year: 2020, description: "Write a short summary in your own words.",
  genres: ["Genre"], ids: {}, seasons: [{ name: "Season 1", episodes: [{ title: "Episode title", date: "2020-01-31" }] }], contributors: ["your-github-name"] }, null, 2);

const dbTile = (t, i = 0) => {
  const blank = () => $("div", { class: "noposter" }, t.title);
  const pic = $("div", { class: "pic" }, t.poster ? img(t.poster, t.title, blank) : blank());
  return $("figure", { class: "poster", style: `--i:${Math.min(i, 12)}` },
    $("a", { href: `#/db/${t.id}`, "aria-label": t.title }, pic),
    $("figcaption", {}, $("strong", {}, t.title), ` ${t.year || ""}`,
      $("small", {}, t.type === "show" ? `${t.episodes} episodes` : "Movie"), t.genres?.length && $("small", {}, t.genres.slice(0, 2).join(", "))));
};

function dbList() {
  const search = $("input", { type: "search", class: "search", placeholder: "Search titles and genres...", "aria-label": "Search the database" });
  const bar = $("div", { class: "seg" });
  const grid = $("div", { class: "posters" }), note = $("p", { class: "empty" }, "Loading...");
  let titles = [], kind = "All";
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const list = titles.filter((t) => (kind === "All" || t.type === kind) && (!q || `${t.title} ${(t.genres || []).join(" ")} ${t.description || ""}`.toLowerCase().includes(q)));
    grid.replaceChildren(...list.map(dbTile));
    note.textContent = titles.length ? "No titles match." : "Nothing here yet.";
    note.hidden = list.length > 0;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === kind)));
  };
  [["All", "All"], ["show", "Shows"], ["movie", "Movies"]].forEach(([k, t]) => bar.append($("button", { type: "button", "data-k": k }, t)));
  bar.onclick = (e) => { if (e.target.dataset.k) { kind = e.target.dataset.k; draw(); } };
  search.oninput = draw;
  loadCommunity().then((d) => { titles = d.titles || []; draw(); });
  return page(labelOf("database"),
    $("p", { class: "lead" }, "Community-written details for shows and movies. Anyone can add or fix a title on GitHub."),
    $("div", { class: "dbtools" }, search, bar, $("a", { class: "btn", href: "#/add" }, "Add a title")),
    grid, note);
}

function dbView(d, dir) {
  const blank = () => $("div", { class: "noposter" }, d.title);
  const poster = d.images?.poster || (META.shows?.[d.id] || {}).poster;               // the site's own data fills gaps
  const tr = trailerBtn(d.title);
  tr.set(d.trailer || (META.shows?.[d.id] || {}).trailer);
  const yl = (META.shows?.[d.id] || {}).ytLinks || {};
  const ytOf = (e, s, j) => e.youtube || yl[normBase(e.title)] || (/^Season (\d+)$/i.test(s.name) ? yl[`s${/^Season (\d+)$/i.exec(s.name)[1]}e${j + 1}`] : "");
  const ids = d.ids || {}, tv = d.type === "movie" ? "movie" : "tv", tvdb = d.type === "movie" ? "movie" : "series";
  const chips = [
    ids.tmdb && extLink(`https://www.themoviedb.org/${tv}/${ids.tmdb}`, "TMDB"),
    ids.imdb && extLink(`https://www.imdb.com/title/${ids.imdb}/`, "IMDb"),
    ids.tvdb && extLink(`https://thetvdb.com/dereferrer/${tvdb}/${ids.tvdb}`, "TVDB"),
    ...(d.links || []).map((l) => extLink(l.url, l.name)),
  ];
  const meta = [d.year, (d.genres || []).join(", ")].filter(Boolean).join(" · ");
  const seasons = (d.seasons || []).map((s, si) => {
    const eps = s.episodes || [];
    const infos = eps.map((e, j) => ytOf(e, s, j) && { url: `https://www.youtube.com/watch?v=${ytOf(e, s, j)}`, title: e.title, sub: `${d.title} · ${s.name} · Episode ${j + 1}` });
    infos.forEach((inf, j) => { if (inf) { inf.next = () => infos[j + 1] || null; inf.prev = () => infos[j - 1] || null; } });
    const det = $("details", { class: "dbseason" }, $("summary", {}, `${s.name} (${eps.length})`),
      $("ol", { class: "dbeps" }, eps.map((e, j) => $("li", {},
        $("span", { class: "dbn" }, String(j + 1)),
        $("div", { class: "grow" }, $("strong", {}, e.title), e.date && $("small", {}, fmt(e.date)), e.overview && expandable(e.overview, "ov", 2)),
        infos[j] && playLink(infos[j], `Play ${e.title}`)))));
    det.open = si === 0;
    return det;
  });
  return $("div", { class: "show-page" },
    $("a", { class: "btn back", href: "#/database" }, `← Back to ${labelOf("database")}`),
    $("div", { class: "show" },
      $("aside", {}, $("figure", { class: "poster" }, poster ? img(poster, d.title, blank, { loading: "eager" }) : blank()),
        $("h1", {}, d.title), meta && $("p", { class: "meta" }, meta), $("div", { class: "idlinks" }, chips), tr.el,
        d.description && expandable(d.description, "sdesc", 5),
        d.directors?.length && $("p", { class: "credit" }, `Created by ${d.directors.join(", ")}`),
        d.cast?.length && $("p", { class: "credit" }, `Starring ${d.cast.join(", ")}`),
        extLink(ghLink(`edit/main/community/${dir}/${d.id}.json`), "Suggest an edit", "btn"),
        d.contributors?.length && $("p", { class: "credit" }, `Added by ${d.contributors.join(", ")}`)),
      $("div", {}, seasons.length ? seasons : $("p", { class: "empty" }, "No episodes listed yet."))));
}

function dbDetail(id) {
  const host = $("div", {}, $("p", { class: "empty" }, "Loading..."));
  const missing = (msg) => host.replaceChildren($("a", { class: "btn back", href: "#/database" }, `← Back to ${labelOf("database")}`), $("p", {}, msg));
  loadCommunity().then(async ({ titles = [] }) => {
    const t = titles.find((x) => x.id === id);
    if (!t) return missing("That title isn't in the database yet.");
    const dir = t.type === "movie" ? "movies" : "shows";
    const d = await fetch(`../community/${dir}/${encodeURIComponent(id)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!d) return missing("Couldn't load that title.");
    host.replaceChildren(dbView(d, dir));
    fit();
    requestAnimationFrame(fit);
  });
  return host;
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
    const group = (name, items) => {
      if (!items?.length) return null;
      const cards = items.map((p) => ({ tags: p.tags || [], el: card(p) }));
      const all = [...new Set(items.flatMap((p) => p.tags || []))].sort((a, b) => a.localeCompare(b));
      const picked = new Set();
      const none = $("p", { class: "empty" }, "Nothing matches those tags.");
      none.hidden = true;
      const filter = all.length ? multiSelect("Filter by tag", all, picked, () => {      // shows items that have any picked tag
        let shown = 0;
        for (const c of cards) { const ok = !picked.size || c.tags.some((t) => picked.has(t)); c.el.hidden = !ok; if (ok) shown++; }
        none.hidden = shown > 0;
      }) : null;
      return $("section", { class: "group" },
        $("div", { class: "grouphead" }, $("h2", {}, name), filter && filter.dd), filter && filter.chips, none,
        $("div", { class: "cards" }, cards.map((c) => c.el)));
    };
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

  database: () => dbList(),

  about: () => page(labelOf("about"), $("p", { class: "lead" }, SITE.about),
    $("section", { class: "credits" }, $("h2", {}, "Credits"),
      SITE.tmdbLogo && $("img", { src: SITE.tmdbLogo, alt: "TMDB", class: "tmdb-logo" }),
      $("p", {}, "This product uses the TMDB API but is not endorsed or certified by ",
        $("a", { href: "https://www.themoviedb.org", target: "_blank", rel: "noopener noreferrer" }, "TMDB"), "."),
      $("p", {}, "Some metadata is provided by ", $("a", { href: "https://thetvdb.com", target: "_blank", rel: "noopener noreferrer" }, "TheTVDB"), "."))),
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
  side.inert = (small.matches || document.documentElement.dataset.sidehide === "on") && !open;
  if (open) side.querySelector("a").focus();
};
menuBtn.onclick = () => setMenu(!open);
scrim.onclick = () => setMenu(false);
side.addEventListener("click", (e) => e.target.closest("a, button") && setMenu(false));
small.addEventListener("change", () => setMenu(false));
document.addEventListener("settingschange", () => setMenu(false));       // e.g. the "Hide sidebar" setting was switched
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
  else if (pg === "add") { node = dbAdd(); active = "database"; label = "Add a title"; }
  else if (pg === "db") { node = dbDetail(arg); active = "database"; label = "Database"; }
  else if (pg === "check") { node = checkPage(arg); label = "Data check"; }
  else if (pg === "show" || pg === "movie") {
    node = pg === "show" ? showPage(arg) : moviePage(arg); active = "movies";
    label = (library().find((m) => m.id === arg) || {}).title || "Show";
  } else if (SITE.sections.includes(pg) && P[pg]) {
    node = P[pg](); active = pg; label = labelOf(pg);
  } else { node = page("Not found", $("a", { href: "#/" }, "Back home")); label = "Not found"; }
  view.replaceChildren(node);
  fit();
  requestAnimationFrame(fit);
  mark(active);
  document.title = label ? `${label} - ${SITE.name}` : SITE.name;
}
addEventListener("hashchange", () => { render(); scrollTo(0, 0); view.focus({ preventScroll: true }); });

addEventListener("resize", fit);
document.fonts?.ready.then(fit);
Promise.all([fetch("../data/metadata.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})), loadCommunityFull().catch(() => {})])
  .then(([j]) => {
    META = { movies: j.movies || {}, shows: j.shows || {} };
    document.querySelector(".settings-body").append($("p", { class: "status" }, j.updated
      ? `Posters and episodes last updated ${fmt(j.updated)}.`
      : "Posters and episodes haven't been fetched yet. On GitHub: open Actions, choose Update movie metadata, then Run workflow."));
    render();
  });
