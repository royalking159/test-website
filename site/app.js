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
const tmdbText = () => SITE.descriptionSource !== "database";   // descriptionSource in config.js: "tmdb" (default) or "database"
const fromCommunity = (d) => {                               // a community file -> the shape the site already uses
  const episodes = [], extra = {}, seasonPosters = {}, seasonCovers = {}, seasonTrailers = {};
  for (const s of d.seasons || []) {
    const n = /^Season (\d+)$/i.exec(s.name)?.[1];
    const list = (s.episodes || []).map((e, i) => ({ title: e.title, number: i + 1, date: e.date, overview: e.overview, image: e.image, youtube: e.youtube, watch: e.watch }));
    if (n) { list.forEach((e) => episodes.push({ ...e, season: Number(n) })); if (s.poster) seasonPosters[n] = s.poster; if (s.trailer) seasonTrailers[n] = s.trailer; }
    else if (/^specials$/i.test(s.name)) { list.forEach((e) => episodes.push({ ...e, season: 0 })); if (s.poster) seasonPosters[0] = s.poster; }
    else { extra[s.name] = list; if (s.poster) seasonCovers[s.name] = s.poster; }   // named seasons like Shorts
  }
  return { type: d.type === "movie" ? "movie" : "show", title: d.title, year: d.year, overview: d.description, genres: d.genres,
    poster: d.images?.poster, backdrop: d.images?.backdrop, cast: d.cast, directors: d.directors, logo: d.images?.logo, trailer: d.trailer, watch: d.watch, watchLink: d.watch?.[0]?.url, episodes, extra, seasonPosters, seasonCovers, seasonTrailers };
};
// An episode with no picture of its own gets the TMDB still the site already fetched (same name, else same season and number).
const fillStills = (eps, md) => {
  const known = md.episodes || [];
  return eps.map((e) => {
    const t = normBase(e.title);
    const hit = known.find((x) => normBase(x.title) === t) || (e.season > 0 ? known.find((x) => x.season === e.season && x.number === e.number) : null);
    return hit ? { ...e, image: e.image || hit.image, overview: tmdbText() ? (hit.overview || e.overview) : (e.overview || hit.overview), date: e.date || hit.date } : e;   // only what is missing
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
      const seenAll = new Set([...c.episodes, ...Object.values(c.extra).flat()].map((x) => normBase(x.title)));      // other TMDB specials (music videos, clips...)
      for (const x of md.episodes || [])
        if (x.season === 0 && !skip(x.title) && normBase(x.title) !== "mission" && !seenAll.has(normBase(x.title)))
          m.episodes.push({ title: x.title, number: x.number, season: 0, date: x.date, overview: x.overview, image: x.image });
      m.extra = { ...(e.extra || {}), ...Object.fromEntries(Object.entries(c.extra).map(([k, v]) => [k, fillStills(v, md)])) };
      m.seasonPosters = { ...(md.seasonPosters || {}), ...c.seasonPosters };
      m.seasonCovers = { ...c.seasonCovers, ...(e.seasonCovers || {}) };
    }
    if (tmdbText() && md.overview) m.overview = md.overview;           // the show's TMDB description first
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
  const tpl = e.url || e.youtube || (yt && `https://www.youtube.com/watch?v=${yt}`) || e.watch?.[0]?.url || (m.episodeLinks?.[key] || [])[i - 1] || m.watchUrl || m.watchLink || SITE.watchUrl;
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
  const btn = (act, label) => $("button", { type: "button", class: "btn small", "data-act": act }, label);
  const prevBtn = btn("prev", "Previous"), nextBtn = btn("next", "Next"), closeBtn = btn("close", "Close");
  const ext = $("a", { class: "btn small", "data-act": "ext", target: "_blank", rel: "noopener noreferrer" }, "Open");
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

// ---------------- Icons, your own likes and watched marks, backdrop art ----------------
const ICON = {
  left: '<polyline points="15 18 9 12 15 6"/>', right: '<polyline points="9 18 15 12 9 6"/>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2.2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  up: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
  down: '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.7a2 2 0 0 0-2 1.7l-1.4 9a2 2 0 0 0 2 2.3zm7-13h2.7A2.3 2.3 0 0 1 22 4v7a2.3 2.3 0 0 1-2.3 2H17"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.7z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
};
const icon = (name) => {
  const el = document.createElement("span");
  el.className = "ic";
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ""}</svg>`;
  return el;
};
const toast = (text) => {
  const t = $("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
};
// Likes, favourites, "my list" and watched marks live only in this browser.
const USER = (() => {
  let d = {};
  try { d = JSON.parse(localStorage.getItem("site-user") || "{}"); } catch { d = {}; }
  const list = (k) => (d[k] ||= {});
  const save = () => { try { localStorage.setItem("site-user", JSON.stringify(d)); } catch { /* storage unavailable */ } };
  return {
    has: (k, id) => !!list(k)[id],
    set(k, id, on) { if (on) list(k)[id] = 1; else delete list(k)[id]; save(); },
    toggle(k, id, opposite) { const on = !this.has(k, id); if (on && opposite) delete list(opposite)[id]; this.set(k, id, on); return on; },
  };
})();
// Big art behind a title page: wide artwork as it is, a poster blurred.
const backdropLayer = () => {
  const el = $("div", { class: "bd", "aria-hidden": "true" });
  return { el, set(url) {
    el.replaceChildren();
    if (!url) return;
    const im = $("img", { src: asset(url), alt: "", decoding: "async" });
    im.onload = () => el.classList.toggle("soft", im.naturalHeight > im.naturalWidth * 1.1);
    im.onerror = () => el.replaceChildren();
    el.append(im);
  } };
};
const byTitle = (a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base", numeric: true });

// Every place an episode (or film) can be watched: a YouTube video, official links from the database, then your own links.
const streamName = (url) => {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (/youtube\.com|youtu\.be|youtube-nocookie/.test(h)) return ["YouTube", "yt"];
    if (/primevideo|amazon\./.test(h)) return ["Prime Video", "prime"];
    if (/drive\.google/.test(h)) return ["Google Drive", "drive"];
    return [h, "other"];
  } catch { return ["Link", "other"]; }
};
function streamsFor(m, e, key, i) {
  const out = [], seen = new Set();
  const add = (url, name, desc) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    const [auto, kind] = streamName(url);
    out.push({ url, kind, name: name || auto, desc });
  };
  const found = m.ytLinks || {};
  const yt = e.youtube || found[normBase(e.orig || e.title)] || (e.season > 0 && e.number ? found[`s${e.season}e${e.number}`] : "");
  if (/^[\w-]{11}$/.test(yt || "")) add(`https://www.youtube.com/watch?v=${yt}`, "YouTube", "Official upload");
  (e.watch || []).forEach((w) => add(w.url, w.name, `Watch on ${w.name || "the official site"}`));
  const any = watchUrl(m, e, key, i);
  if (any) add(any, "", out.length ? "Show page" : "Link");
  return out;
}

// A "Play trailer" button. set(id, sub) shows it for a YouTube id and hides it when there is none.
const trailerBtn = (title) => {
  const el = $("button", { type: "button", class: "ab trailer" }, icon("film"), $("span", {}, "Trailer"));
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

const page = (title, ...kids) => $("section", { class: "page" }, $("h1", { class: "title" }, title), ...kids);
const stars = (n) => $("span", { class: "stars", "aria-label": `${n} out of 5` }, "★".repeat(n) + "☆".repeat(5 - n));

const tile = (m) => {
  const blank = () => $("div", { class: "noposter" }, m.title);
  const eps = m.type === "show" ? (m.episodes?.length || 0) + Object.values(m.extra || {}).reduce((n, l) => n + l.length, 0) : 0;
  return $("figure", { class: "poster" },
    $("a", { href: `#/${m.type === "show" ? "show" : "movie"}/${m.id}`, "aria-label": m.title }, $("div", { class: "pic" }, m.poster ? img(m.poster, m.title, blank) : blank())),
    $("figcaption", {}, $("strong", {}, m.title),
      $("small", {}, [m.year, m.type === "show" ? (eps ? `${eps} episodes` : "Series") : "Film"].filter(Boolean).join(", ")),
      m.rating && stars(m.rating), m.note && $("small", {}, m.note)));
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

// ---------------- Title page, laid out like Stremio: info on the left, episodes or streams on the right ----------------
function detailView(m, S, ctx) {
  const names = S ? Object.keys(S) : [];
  const uid = (ctx.base === "database" ? "db:" : "") + m.id;
  const wid = (key, i) => `${uid}|${key}|${i}`;
  const bd = backdropLayer();
  const panel = $("aside", { class: "panel", "aria-label": S ? "Episodes" : "Streams" });
  let at = 0, paintList = () => {}, listView = null;

  // ---- left: title, facts, chips, summary, action bar ----
  const heading = $("h1", { class: "title" }, m.logo ? img(m.logo, m.title, () => document.createTextNode(m.title), { class: "logo", loading: "eager" }) : m.title);
  const meta = $("div", { class: "metarow" }, m.runtime ? $("span", {}, `${m.runtime}min`) : null,
    m.year ? $("span", {}, m.type === "show" ? `${m.year}–` : String(m.year)) : null,
    m.score ? $("span", { class: "score" }, String(m.score), $("b", { class: "badge" }, "TMDB")) : null);
  const link = (k, v) => `#/${ctx.base}?${k}=${encodeURIComponent(v)}`;
  const chips = (label, list, key) => (list?.length
    ? $("section", { class: "chipsec" }, $("h2", {}, label), $("div", { class: "chiprow" }, list.map((v) => $("a", { class: "chip", href: link(key, v) }, v)))) : null);
  const tr = trailerBtn(m.title);
  tr.set(m.trailer);
  const ab = (name, label, on) => { const b = $("button", { type: "button", class: "ab", "aria-label": label, title: label }, icon(name)); b.onclick = on; return b; };
  const likeB = ab("up", "Like", () => { USER.toggle("liked", uid, "disliked"); syncAll(); });
  const dislikeB = ab("down", "Dislike", () => { USER.toggle("disliked", uid, "liked"); syncAll(); });
  const loveB = ab("heart", "Add to favourites", () => { USER.toggle("loved", uid); syncAll(); });
  const libB = ab("bookmark", "Add to my list", () => { USER.toggle("library", uid); syncAll(); });
  const watchB = ab("eye", S ? "Mark this season as watched" : "Mark as watched", () => {
    if (!S) USER.toggle("watched", wid("film", 0));
    else {
      const sx = S[names[at]], all = sx.eps.every((_, i) => USER.has("watched", wid(sx.key, i)));
      sx.eps.forEach((_, i) => USER.set("watched", wid(sx.key, i), !all));
      paintList();
    }
    syncAll();
  });
  const shareB = ab("share", "Share", async () => {
    try { if (navigator.share) await navigator.share({ title: m.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast("Link copied"); } } catch { /* cancelled */ }
  });
  const syncAll = () => {
    [[likeB, "liked"], [dislikeB, "disliked"], [loveB, "loved"], [libB, "library"]].forEach(([b, k]) => b.setAttribute("aria-pressed", String(USER.has(k, uid))));
    const sx = S && S[names[at]];
    watchB.setAttribute("aria-pressed", String(S ? !!sx && sx.eps.length > 0 && sx.eps.every((_, i) => USER.has("watched", wid(sx.key, i))) : USER.has("watched", wid("film", 0))));
  };
  const bar = $("div", { class: "actionbar" }, tr.el, $("div", { class: "abgroup" }, libB, watchB), $("div", { class: "abgroup" }, likeB, dislikeB, loveB), $("div", { class: "abgroup" }, shareB));
  const info = $("div", { class: "info" },
    $("a", { class: "roundbtn", href: ctx.back[0], "aria-label": `Back to ${ctx.back[1]}`, title: `Back to ${ctx.back[1]}` }, icon("left")),
    heading, meta, chips("Genres", m.genres, "genre"), chips("Cast", m.cast, "cast"), chips("Directed by", m.directors, "q"),
    m.overview ? $("section", { class: "chipsec" }, $("h2", {}, "Summary"), expandable(m.overview, "sdesc", 5)) : null, bar);

  // ---- right: the streams for one episode (or the film) ----
  const streamPane = ({ e, title, kicker, key, i, id, back, image }) => {
    const sub = [m.title, kicker].filter(Boolean).join(", ");
    const mark = $("button", { type: "button", class: "btn small" });
    const syncMark = () => { mark.textContent = USER.has("watched", id) ? "Watched (tap to undo)" : "Mark as watched"; };
    mark.onclick = () => { USER.toggle("watched", id); syncMark(); syncAll(); };
    syncMark();
    const rows = ctx.streams(e, key, i).map((st) => {
      const inSite = !!embedOf(st.url);
      const a = $("a", { class: "stream", href: st.url, target: inSite ? "" : "_blank", rel: "noopener noreferrer" },
        $("span", { class: `sbadge ${st.kind}` }, st.name[0].toUpperCase()),
        $("span", { class: "sgrow" }, $("strong", {}, st.name), $("small", {}, st.desc)), icon(inSite ? "play" : "external"));
      a.onclick = (ev) => { USER.set("watched", id, true); syncMark(); syncAll(); if (inSite) { ev.preventDefault(); showInPlayer({ url: st.url, title, sub }); } };
      return a;
    });
    const top = $("div", { class: "top" });
    if (back) { const bb = $("button", { type: "button", class: "roundbtn", "aria-label": "Back to episodes" }, icon("left")); bb.onclick = back; top.append(bb); }
    top.append($("strong", {}, "Streams"));
    return $("div", { class: "sp" }, top,
      $("div", { class: "epcard" }, image ? $("div", { class: "tw" }, img(image, "", () => $("div", { class: "thumb" }))) : null,
        $("h3", {}, title), kicker || e.date ? $("small", {}, [kicker, e.date ? fmt(e.date) : ""].filter(Boolean).join(", ")) : null, e.overview ? $("p", {}, e.overview) : null),
      $("h4", {}, "Available streams"), ...(rows.length ? rows : [$("p", { class: "empty" }, "No streams yet. Add a YouTube id or a watch link to this title in the database.")]), mark);
  };

  // ---- right: seasons and episodes ----
  if (S && names.length) {
    const cur = $("span", { class: "dd-label" });
    const ddBtn = $("button", { type: "button", class: "dd-btn", "aria-haspopup": "listbox", "aria-expanded": "false" }, cur, $("span", { class: "chev" }));
    const opts = names.map((n) => $("li", { role: "option", tabindex: "-1", "data-n": n }, $("span", {}, n), $("small", {}, `${S[n].eps.length} ${S[n].eps.length === 1 ? "episode" : "episodes"}`)));
    const menu = $("ul", { class: "dd-menu", role: "listbox", "aria-label": "Seasons" }, opts);
    menu.hidden = true;
    const prev = $("button", { type: "button", class: "arrow", "aria-label": "Previous season" }, icon("left"), $("span", {}, "Prev"));
    const next = $("button", { type: "button", class: "arrow", "aria-label": "Next season" }, $("span", {}, "Next"), icon("right"));
    const dd = $("div", { class: "dd" }, ddBtn, menu), art = $("div", { class: "seasonart" });
    const search = $("input", { type: "search", class: "search", placeholder: "search videos", "aria-label": "Search episodes" });
    const list = $("ol", { class: "eplist" }), none = $("p", { class: "empty" }, "No episodes match.");
    none.hidden = true;
    const toggle = (open) => { menu.hidden = !open; ddBtn.setAttribute("aria-expanded", String(open)); if (open) opts[at].focus(); };
    const open = (n, i) => {
      const sx = S[n], e = sx.eps[i];
      panel.replaceChildren(streamPane({ e, title: `${i + 1}. ${e.title || "TBA"}`, kicker: n, key: sx.key, i, id: wid(sx.key, i), image: e.image,
        back: () => { panel.replaceChildren(listView); paintList(); } }));
    };
    paintList = () => {
      const n = names[at], sx = S[n], ql = search.value.trim().toLowerCase();
      const rows = sx.eps.map((e, i) => [e, i]).filter(([e]) => !ql || `${e.title} ${e.overview || ""}`.toLowerCase().includes(ql));
      list.replaceChildren(...rows.map(([e, i]) => {
        const thumb = () => $("div", { class: "thumb" });
        const b = $("button", { type: "button", class: "ep" },
          $("div", { class: "tw" }, e.image ? img(e.image, "", thumb) : thumb()),
          $("div", { class: "grow" }, $("strong", {}, `${i + 1}. ${e.title || "TBA"}`), $("small", {}, e.date ? fmt(e.date) : "")),
          USER.has("watched", wid(sx.key, i)) ? $("span", { class: "watched" }, icon("eye"), "Watched") : null);
        b.onclick = () => open(n, i);
        return $("li", {}, b);
      }));
      none.hidden = rows.length > 0;
    };
    const draw = (n) => {
      at = names.indexOf(n);
      cur.textContent = n;
      opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === at)));
      prev.disabled = at === 0;
      next.disabled = at === names.length - 1;
      art.replaceChildren(...(S[n].cover ? [img(S[n].cover, n, () => document.createTextNode(""))] : []));
      bd.set(m.backdrop || S[n].cover || m.poster);
      tr.set(S[n].trailer || m.trailer);
      paintList();
      syncAll();
    };
    ddBtn.onclick = () => toggle(menu.hidden);
    prev.onclick = () => draw(names[at - 1]);
    next.onclick = () => draw(names[at + 1]);
    search.oninput = paintList;
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
    listView = $("div", { class: "pv" }, $("div", { class: "seasonpick" }, art, prev, dd, next), $("div", { class: "psearch" }, search, icon("search")), list, none);
    panel.replaceChildren(listView);
    draw(names[0]);
  } else if (S) {
    panel.replaceChildren($("p", { class: "empty" }, "No episodes yet. They appear after the metadata update runs."));
    bd.set(m.backdrop || m.poster);
    syncAll();
  } else {
    bd.set(m.backdrop || m.poster);
    panel.replaceChildren(streamPane({ e: m, title: m.title, kicker: m.year ? String(m.year) : "", key: "", i: 1, id: wid("film", 0), back: null, image: m.backdrop || m.poster }));
    syncAll();
  }
  return $("div", { class: "detail" }, bd.el, $("div", { class: "detail-main" }, info, panel));
}

function showPage(id) {
  const m = library().find((x) => x.type === "show" && x.id === id);
  if (!m) return page("Not found", $("p", {}, "That show isn't in your library."), $("a", { href: "#/movies" }, `Back to ${labelOf("movies")}`));
  return detailView(m, seasonsOf(m), { back: ["#/movies", labelOf("movies")], base: "movies", streams: (e, key, i) => streamsFor(m, e, key, i + 1) });
}

function moviePage(id) {
  const m = library().find((x) => x.type !== "show" && x.id === id);
  if (!m) return page("Not found", $("a", { href: "#/movies" }, `Back to ${labelOf("movies")}`));
  return detailView(m, null, { back: ["#/movies", labelOf("movies")], base: "movies", streams: () => streamsFor(m, m, "", 1) });
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
    }), ...(picked.size > 1 ? [clear] : []));
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

// ---------------- Add or edit a title: builds the database file for you ----------------
function dbEditor(id) {
  const host = $("div", {}, $("p", { class: "empty" }, "Loading..."));
  if (!id) { host.replaceChildren(editorView(null)); return host; }
  loadCommunity().then(async ({ titles = [] }) => {
    const t = titles.find((x) => x.id === id);
    const d = DBFULL[id] || (t && await fetch(`../community/${t.type === "movie" ? "movies" : "shows"}/${encodeURIComponent(id)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    host.replaceChildren(d ? editorView(JSON.parse(JSON.stringify(d))) : $("div", {}, $("a", { class: "btn back", href: "#/database" }, "← Back"), $("p", {}, "That title isn't in the database yet.")));
  });
  return host;
}

function editorView(base) {
  const editing = !!base;
  const yid = (v) => { v = String(v || "").trim(); return /^[\w-]{11}$/.test(v) ? v : (v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1] || ""; };
  const input = (ph, attrs = {}) => $("input", { type: "text", placeholder: ph, ...attrs });
  const field = (label, el, hint) => $("label", { class: "field" }, $("span", {}, label), el, hint && $("small", {}, hint));
  const val = (el, v) => { el.value = v ?? ""; return el; };
  const kind = $("select", {}, $("option", { value: "show" }, "TV show"), $("option", { value: "movie" }, "Movie"));
  kind.value = base?.type || "show";
  kind.disabled = editing;
  const title = val(input("Helluva Boss"), base?.title), year = val(input("2020", { inputmode: "numeric" }), base?.year);
  const genres = val(input("Animation, Comedy"), (base?.genres || []).join(", "));
  const desc = $("textarea", { rows: "4", placeholder: "A short summary in your own words" });
  desc.value = base?.description || "";
  const tmdb = val(input("289892", { inputmode: "numeric" }), base?.ids?.tmdb), imdb = val(input("tt10691770"), base?.ids?.imdb);
  const tvdb = val(input("(optional)", { inputmode: "numeric" }), base?.ids?.tvdb), poster = val(input("https://..."), base?.images?.poster);
  const trailer = val(input("YouTube link or id"), base?.trailer), who = input("your GitHub name");

  const seasons = $("div", { class: "seasonsform" });
  const renumber = (box) => {
    [...box.list.children].forEach((r, i) => { r.num.textContent = i + 1; });
    const n = box.list.children.length;
    box.sum.textContent = `${box.nm.value.trim() || "Season"} (${n} episode${n === 1 ? "" : "s"})`;
  };
  const mini = (label, text) => $("button", { type: "button", class: "mini", "aria-label": label, title: label }, text);
  const addEp = (box, src = {}) => {
    const t = input("Episode title", { class: "ep-t", value: src.title || "" });
    const d = $("input", { type: "date", class: "ep-d", "aria-label": "Air date" });
    d.value = /^\d{4}-\d{2}-\d{2}$/.test(src.date || "") ? src.date : "";
    const y = val(input("YouTube link or id", { class: "ep-y" }), src.youtube);
    const s = $("textarea", { rows: "2", placeholder: "Short summary in your own words (optional)" });
    s.value = src.overview || "";
    const num = $("span", { class: "epn" });
    const up = mini("Move up", "↑"), down = mini("Move down", "↓"), del = mini("Remove episode", "✕");
    const row = $("div", { class: "eprow" }, num, t, d, y, $("div", { class: "epbtns" }, up, down, del), s);
    Object.assign(row, { num, src, t, d, y, s });
    up.onclick = () => { const p = row.previousElementSibling; if (p) row.parentNode.insertBefore(row, p); renumber(box); update(); };
    down.onclick = () => { const n = row.nextElementSibling; if (n) row.parentNode.insertBefore(n, row); renumber(box); update(); };
    del.onclick = () => { row.remove(); renumber(box); update(); };
    box.list.append(row);
    renumber(box);
    return row;
  };
  const addSeason = (src = {}, name = src.name || "") => {
    const nm = input("Season 1", { value: name }), sum = $("summary"), list = $("div", { class: "eplist" });
    const bulk = $("textarea", { rows: "3", placeholder: "Paste episode titles here, one per line" });
    const bulkBtn = $("button", { type: "button", class: "btn" }, "Add these titles"), addBtn = $("button", { type: "button", class: "btn" }, "Add an episode");
    const upS = mini("Move season up", "↑"), downS = mini("Move season down", "↓"), rmS = mini("Remove season", "✕");
    const box = $("details", { class: "seasonbox" }, sum,
      $("div", { class: "seasonhead" }, field("Season name", nm, "For example Season 1, Specials or Shorts"), $("div", { class: "epbtns" }, upS, downS, rmS)),
      list, $("div", { class: "actions" }, addBtn),
      $("details", { class: "bulk" }, $("summary", {}, "Paste a list of titles"), bulk, bulkBtn));
    box.open = true;
    Object.assign(box, { src, nm, sum, list });
    (src.episodes || []).forEach((e) => addEp(box, e));
    if (!(src.episodes || []).length) addEp(box);
    nm.addEventListener("input", () => renumber(box));
    addBtn.onclick = () => { addEp(box).t.focus(); update(); };
    bulkBtn.onclick = () => { bulk.value.split("\n").map((x) => x.trim()).filter(Boolean).forEach((x) => addEp(box, { title: x })); bulk.value = ""; update(); };
    upS.onclick = () => { const p = box.previousElementSibling; if (p) seasons.insertBefore(box, p); update(); };
    downS.onclick = () => { const n = box.nextElementSibling; if (n) seasons.insertBefore(n, box); update(); };
    rmS.onclick = () => { box.remove(); update(); };
    box.addEventListener("input", update);
    seasons.append(box);
    renumber(box);
    return box;
  };
  const nextSeason = () => {
    const nums = [...seasons.children].map((b) => /^Season (\d+)$/i.exec(b.nm.value.trim())?.[1]).filter(Boolean).map(Number);
    return `Season ${(nums.length ? Math.max(...nums) : 0) + 1}`;
  };
  const quick = (label, name) => { const b = $("button", { type: "button", class: "btn" }, label); b.onclick = () => { addSeason({}, typeof name === "function" ? name() : name); update(); }; return b; };
  const seasonsWrap = $("div", {}, $("h2", {}, "Seasons and episodes"), seasons,
    $("div", { class: "actions" }, quick("+ Season", nextSeason), quick("+ Specials", "Specials"), quick("+ Shorts", "Shorts")));

  const out = $("pre", { class: "jsonout" }), problems = $("ul", { class: "problems" });
  const copy = $("button", { type: "button", class: "btn primary" }, "Copy file contents");
  const open = $("a", { class: "btn", target: "_blank", rel: "noopener noreferrer" }, editing ? "Open the file on GitHub" : "Open on GitHub");
  let json = "";
  function update() {
    const bad = [], isShow = kind.value === "show", t = title.value.trim();
    const o = base ? JSON.parse(JSON.stringify(base)) : {};
    const put = (k, v) => { if (v === "" || v == null) delete o[k]; else o[k] = v; };
    o.id = base ? base.id : t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    o.type = kind.value;
    o.title = t;
    if (!t) bad.push("Add a title.");
    const yr = year.value.trim();
    if (yr && !/^\d{4}$/.test(yr)) bad.push("The year should be 4 digits.");
    put("year", /^\d{4}$/.test(yr) ? Number(yr) : "");
    put("description", desc.value.trim().replace(/\s+/g, " "));
    const g = genres.value.split(",").map((x) => x.trim()).filter(Boolean);
    if (g.length) o.genres = g; else delete o.genres;
    const ids = { ...(o.ids || {}) };
    for (const [k, el, re] of [["tmdb", tmdb, /^\d+$/], ["tvdb", tvdb, /^\d+$/], ["imdb", imdb, /^tt\d+$/]]) {
      const v = el.value.trim();
      if (!v) delete ids[k]; else if (re.test(v)) ids[k] = k === "imdb" ? v : Number(v);
      else bad.push(k === "imdb" ? "IMDb ids look like tt1234567." : `The ${k.toUpperCase()} id should be a number.`);
    }
    if (Object.keys(ids).length) o.ids = ids; else delete o.ids;
    const pv = poster.value.trim(), images = { ...(o.images || {}) };
    if (pv && !/^https:\/\//.test(pv)) bad.push("The poster link must start with https://");
    if (/^https:\/\//.test(pv)) images.poster = pv; else delete images.poster;
    if (Object.keys(images).length) o.images = images; else delete o.images;
    if (trailer.value.trim() && !yid(trailer.value)) bad.push("That trailer doesn't look like a YouTube link.");
    put("trailer", yid(trailer.value));
    seasonsWrap.hidden = !isShow;
    if (isShow) {
      o.seasons = [...seasons.children].map((box) => ({ ...box.src, name: box.nm.value.trim() || "Season",
        episodes: [...box.list.children].map((row) => {
          const e = { ...row.src, title: row.t.value.trim() };
          if (row.d.value) e.date = row.d.value; else delete e.date;
          const sv = row.s.value.trim().replace(/\s+/g, " ");
          if (sv) e.overview = sv; else delete e.overview;
          const yv = row.y.value.trim();
          if (yv && yid(yv)) e.youtube = yid(yv); else delete e.youtube;
          if (yv && !yid(yv)) bad.push(`"${e.title}": that YouTube link isn't valid.`);
          return e;
        }).filter((e) => e.title) }));
    } else delete o.seasons;
    const people = new Set(o.contributors || []);
    if (who.value.trim()) people.add(who.value.trim());
    if (people.size) o.contributors = [...people]; else delete o.contributors;
    json = JSON.stringify(o, null, 2) + "\n";
    if (/[<>]/.test(JSON.stringify(o))) bad.push("Please leave out < and > characters.");
    out.textContent = json;
    problems.replaceChildren(...bad.map((b) => $("li", {}, b)));
    const dir = isShow ? "shows" : "movies";
    open.href = (editing ? ghLink(`edit/main/community/${dir}/${o.id}.json`) : ghLink(`new/main/community/${dir}`, `?filename=${o.id || "my-title"}.json&value=${encodeURIComponent(json)}`)) || "#";
    open.hidden = !repoInfo();
  }
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(json); copy.textContent = "Copied!"; } catch { copy.textContent = "Select the text below and copy it"; }
    setTimeout(() => (copy.textContent = "Copy file contents"), 2200);
  };
  [kind, title, year, genres, desc, tmdb, imdb, tvdb, poster, trailer, who].forEach((el) => el.addEventListener("input", update));
  if (base?.seasons?.length) base.seasons.forEach((s) => addSeason(s)); else if ((base?.type || "show") === "show") addSeason({}, "Season 1");
  update();
  return page(editing ? `Edit ${base.title}` : "Add a title",
    $("p", { class: "lead" }, editing ? "Change anything below. Your changes are checked as you type, then you send them to the owner for review." : "Fill this in and the file is built for you. Write the description in your own words (not copied from another site)."),
    $("div", { class: "addform" },
      field("Type", kind), field("Title", title), $("div", { class: "row2" }, field("Year", year), field("Genres", genres, "Separate with commas")),
      field("Description", desc), $("div", { class: "row2" }, field("TMDB id", tmdb), field("IMDb id", imdb)),
      $("div", { class: "row2" }, field("TVDB id", tvdb), field("Poster link", poster, "An https:// link")),
      field("Trailer", trailer, "A YouTube link or the 11-character id"), field("Your GitHub name", who, "So you get the credit"),
      seasonsWrap, $("h2", {}, "The file"), problems, out,
      $("div", { class: "actions" }, copy, open),
      $("p", { class: "credit" }, editing
        ? "Tap Copy, then Open the file on GitHub, tap the pencil, select everything and paste, then choose Commit changes and Propose changes. The owner reviews it before it goes live."
        : "On GitHub, paste over the contents if the editor looks wrong, then choose Commit changes and Propose changes. The owner reviews it before it goes live.")));
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

const dbTile = (t) => {
  const blank = () => $("div", { class: "noposter" }, t.title);
  return $("figure", { class: "poster" },
    $("a", { href: `#/db/${t.id}`, "aria-label": t.title }, $("div", { class: "pic" }, t.poster ? img(t.poster, t.title, blank) : blank())),
    $("figcaption", {}, $("strong", {}, t.title),
      $("small", {}, [t.year, t.type === "show" ? `${t.episodes} episodes` : "Film"].filter(Boolean).join(", ")),
      t.genres?.length && $("small", {}, t.genres.slice(0, 2).join(", "))));
};

function dbList(qs) {
  const state = { kind: "All", q: qs?.get("q") || "", genre: qs?.get("genre") || "", cast: qs?.get("cast") || "" };
  const search = $("input", { type: "search", class: "search", placeholder: "Search titles, genres and cast", "aria-label": "Search the database", value: state.q });
  const bar = $("div", { class: "seg" }), chips = $("div", { class: "tagchips" });
  const grid = $("div", { class: "posters" }), note = $("p", { class: "empty" }, "Loading...");
  let titles = [];
  const has = (list, v) => (list || []).some((x) => String(x).toLowerCase() === v.toLowerCase());
  const draw = () => {
    const ql = state.q.trim().toLowerCase();
    const list = titles.filter((t) => (state.kind === "All" || (state.kind === "Movies") === (t.type !== "show"))
      && (!state.genre || has(t.genres, state.genre)) && (!state.cast || has(t.cast, state.cast))
      && (!ql || `${t.title} ${(t.genres || []).join(" ")} ${(t.cast || []).join(" ")} ${(t.directors || []).join(" ")} ${t.description || ""}`.toLowerCase().includes(ql)));
    grid.replaceChildren(...list.map(dbTile));
    note.textContent = titles.length ? "No titles match." : "Nothing here yet.";
    note.hidden = list.length > 0;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === state.kind)));
    chips.replaceChildren(...[["genre", "Genre", state.genre], ["cast", "Cast", state.cast]].filter(([, , v]) => v)
      .map(([k, l, v]) => { const c = $("button", { type: "button", class: "chip" }, `${l}: ${v}`, icon("x")); c.onclick = () => { state[k] = ""; draw(); }; return c; }));
  };
  [["All", "All"], ["Movies", "Movies"], ["Shows", "Shows"]].forEach(([k, t]) => bar.append($("button", { type: "button", "data-k": k }, t)));
  bar.onclick = (e) => { const b = e.target.closest("button"); if (b) { state.kind = b.dataset.k; draw(); } };
  search.oninput = () => { state.q = search.value; draw(); };
  loadCommunity().then((d) => { titles = (d.titles || []).slice().sort(byTitle); draw(); });
  return page(labelOf("database"),
    $("p", { class: "lead" }, "Community-written details for shows and movies. Anyone can add or fix a title on GitHub."),
    $("div", { class: "dbtools" }, search, bar, $("a", { class: "btn", href: "#/add" }, "Add a title")), chips, grid, note);
}

function dbView(d) {
  const meta = META.shows?.[d.id] || {};                                                   // the site's own data fills gaps
  const yl = meta.ytLinks || {};
  const m2 = { id: d.id, title: d.title, type: d.type === "movie" ? "movie" : "show", year: d.year, overview: d.description, genres: d.genres, cast: d.cast, directors: d.directors,
    poster: d.images?.poster || meta.poster, backdrop: d.images?.backdrop || meta.backdrop, logo: d.images?.logo || meta.logo, trailer: d.trailer || meta.trailer,
    runtime: meta.runtime, score: meta.score, ytLinks: yl, watchLink: d.watch?.[0]?.url };
  let S = null;
  if (m2.type === "show") {
    S = {};
    for (const s of d.seasons || []) {
      const n = /^Season (\d+)$/i.exec(s.name)?.[1];
      S[s.name] = { key: s.name, cover: s.poster || m2.poster, eps: (s.episodes || []).map((e, j) => {
        const id = e.youtube || yl[normBase(e.title)] || (n ? yl[`s${n}e${j + 1}`] : "");
        return { ...e, orig: e.title, season: n ? Number(n) : 0, number: j + 1, image: e.image || (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "") || m2.backdrop || m2.poster };
      }) };
    }
  }
  return detailView(m2, S, { back: ["#/database", labelOf("database")], base: "database",
    streams: (e, key, i) => streamsFor(m2, m2.type === "movie" ? { youtube: d.youtube, watch: d.watch, url: d.url, title: d.title } : e, key, i + 1) });
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
    $("div", { class: "rowhead" }, $("h2", {}, "Library"), $("a", { href: "#/movies" }, "See all")),
    $("div", { class: "posters strip" }, items.map(tile)));
};

const P = {
  home: () => $("div", {}, $("section", { class: "hero" },
    $("h1", {}, SITE.tagline),
    $("div", { class: "hero-side" }, SITE.intro && $("p", { class: "lead" }, SITE.intro),
      (SITE.links || []).length > 0 && $("ul", { class: "hlinks" }, SITE.links.map((l) =>
        $("li", {}, $("a", { href: l.url, target: isWeb(l.url) ? "_blank" : "", rel: "noopener noreferrer" }, l.label)))))),
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

  movies: (qs) => {
    const all = library().slice().sort(byTitle);
    const state = { kind: "All", q: qs?.get("q") || "", genre: qs?.get("genre") || "", cast: qs?.get("cast") || "" };
    const search = $("input", { type: "search", class: "search", placeholder: "Search titles, genres and cast", "aria-label": "Search", value: state.q });
    const bar = $("div", { class: "seg" }), chips = $("div", { class: "tagchips" });
    const grid = $("div", { class: "posters" }), none = $("p", { class: "empty" }, "Nothing matches that.");
    const has = (list, v) => (list || []).some((x) => String(x).toLowerCase() === v.toLowerCase());
    const draw = () => {
      const ql = state.q.trim().toLowerCase();
      const list = all.filter((m) => (state.kind === "All" || (state.kind === "Movies") === (m.type !== "show"))
        && (!state.genre || has(m.genres, state.genre)) && (!state.cast || has(m.cast, state.cast))
        && (!ql || `${m.title} ${(m.genres || []).join(" ")} ${(m.cast || []).join(" ")} ${(m.directors || []).join(" ")}`.toLowerCase().includes(ql)));
      grid.replaceChildren(...list.map(tile));
      none.hidden = list.length > 0;
      bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === state.kind)));
      chips.replaceChildren(...[["genre", "Genre", state.genre], ["cast", "Cast", state.cast]].filter(([, , v]) => v)
        .map(([k, l, v]) => { const c = $("button", { type: "button", class: "chip" }, `${l}: ${v}`, icon("x")); c.onclick = () => { state[k] = ""; draw(); }; return c; }));
    };
    [["All", "All"], ["Movies", "Movies"], ["Shows", "Shows"]].forEach(([k, t]) => bar.append($("button", { type: "button", "data-k": k }, t)));
    bar.onclick = (e) => { const b = e.target.closest("button"); if (b) { state.kind = b.dataset.k; draw(); } };
    search.oninput = () => { state.q = search.value; draw(); };
    const el = page(labelOf("movies"), $("div", { class: "dbtools" }, search, bar), chips, grid, none);
    draw();
    return el;
  },

  database: (qs) => dbList(qs),

  about: () => page(labelOf("about"), $("p", { class: "lead" }, SITE.about),
    $("section", { class: "credits" }, $("h2", {}, "Credits"),
      SITE.tmdbLogo && $("img", { src: SITE.tmdbLogo, alt: "TMDB", class: "tmdb-logo" }),
      $("p", {}, "This product uses the TMDB API but is not endorsed or certified by ",
        $("a", { href: "https://www.themoviedb.org", target: "_blank", rel: "noopener noreferrer" }, "TMDB"), "."),
      $("p", {}, "Some metadata is provided by ", $("a", { href: "https://thetvdb.com", target: "_blank", rel: "noopener noreferrer" }, "TheTVDB"), "."))),
};

// ---- Sidebar ----
const NAVICON = { home: "home", projects: "folder", movies: "film", database: "database", about: "info" };
const side = $("aside", { class: "sidebar", id: "sidebar" },
  $("a", { class: "brand", href: "#/", title: SITE.name, "aria-label": SITE.name }, ((SITE.name || "?").trim()[0] || "?").toUpperCase()),
  $("nav", { "aria-label": "Main" },
    [["home", "Home", "#/"], ...SITE.sections.map((s) => [s, labelOf(s), `#/${s}`])]
      .map(([k, t, h]) => $("a", { href: h, "data-s": k }, icon(NAVICON[k] || "folder"), $("span", {}, t)))),
  $("button", { type: "button", class: "settings-btn" }, icon("sliders"), $("span", {}, "Settings")));
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
  menuBtn.textContent = open ? "Close" : "Menu";
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
  const [path, qstr = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [pg, arg] = path.split("/");
  const query = new URLSearchParams(qstr);
  let node, active = "", label = "";
  if (!pg) { node = P.home(); active = "home"; }
  else if (pg === "add") { node = dbEditor(); active = "database"; label = "Add a title"; }
  else if (pg === "edit") { node = dbEditor(arg); active = "database"; label = "Edit a title"; }
  else if (pg === "db") { node = dbDetail(arg); active = "database"; label = "Database"; }
  else if (pg === "check") { node = checkPage(arg); label = "Data check"; }
  else if (pg === "show" || pg === "movie") {
    node = pg === "show" ? showPage(arg) : moviePage(arg); active = "movies";
    label = (library().find((m) => m.id === arg) || {}).title || "Show";
  } else if (SITE.sections.includes(pg) && P[pg]) {
    node = P[pg](query); active = pg; label = labelOf(pg);
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
