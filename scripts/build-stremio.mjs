// Builds a static Stremio addon from the community database (the community/ folder) into addon/.
// GitHub Pages serves it, so the addon address is  <your site>/addon/manifest.json
//   node scripts/build-stremio.mjs      (run by the GitHub Action after a change is merged)
//
// - Seasons named "Season N" and "Specials" become seasons N and 0 of the show.
// - Any other named season (like Shorts) becomes its own Stremio series, e.g. "Helluva Boss: Shorts".
// - Episode thumbnails: the episode's own image, else the TMDB still the website already fetched, else the YouTube thumbnail.
// - IMDb mode: put  "stremioImdb": true  in a show's file and the show uses its IMDb id (ids like tt1234567:1:2), so other stream
//   addons you have installed (for example Torrentio) can answer next to the YouTube stream this addon gives.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const write = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1) + "\n"); };
const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const normBase = (t) => String(t || "").replace(/\(.*?\)/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const web = (u) => (/^https:\/\//.test(u || "") ? u : undefined);       // Stremio needs full https links
const [owner = "", repo = ""] = (process.env.GITHUB_REPOSITORY || "").split("/");
const root = (process.env.SITE_URL || (owner ? `https://${owner.toLowerCase()}.github.io${repo.toLowerCase() === owner.toLowerCase() + ".github.io" ? "" : "/" + repo}` : "")).replace(/\/$/, "");
if (!root) console.warn("Set SITE_URL (or run in GitHub Actions) so addon/index.html can show the install link.");
const PREFIX = "mysite-";                                    // ids from this addon start with this (or with an IMDb id in IMDb mode)
const iso = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? `${d}T00:00:00.000Z` : undefined);
const load = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"))) : []);
const byTitle = (a, b) => a.title.localeCompare(b.title);
const shows = load("community/shows").sort(byTitle), movies = load("community/movies").sort(byTitle);
const site = existsSync("data/metadata.json") ? JSON.parse(readFileSync("data/metadata.json", "utf8")) : {};
const mine = (d, kind) => site[kind]?.[d.id] || {};              // the website's own TMDB/TVDB/YouTube data for the same title
const ytStream = (id) => ({ streams: id ? [{ ytId: id, name: "YouTube", title: "Official upload" }] : [] });
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

const ytFor = (d, e, i, num) => {                             // the episode's YouTube id: from its file, else from the site's own data
  if (e.youtube) return e.youtube;
  const links = mine(d, "shows").ytLinks || {};
  return links[normBase(e.title)] || (num && links[`s${num}e${i + 1}`]) || "";
};
const stillFor = (d, e, i, num) => {                          // a TMDB still the website already has (same name, else same season and number)
  const eps = mine(d, "shows").episodes || [];
  const hit = eps.find((x) => normBase(x.title) === normBase(e.title)) || (num ? eps.find((x) => x.season === Number(num) && x.number === i + 1) : null);
  return web(hit?.image);
};

// ---- Work out every Stremio series: each show, plus one extra series per named season (like Shorts) ----
const items = [];
for (const d of shows) {
  const imdbMode = !!(d.stremioImdb && d.ids?.imdb);
  const showPoster = web(d.images?.poster) || web(mine(d, "shows").poster);
  const main = { id: imdbMode ? d.ids.imdb : PREFIX + d.id, name: d.title, d, imdbMode, poster: showPoster, backdrop: web(d.images?.backdrop) || web(mine(d, "shows").backdrop), seasons: [] };
  items.push(main);
  for (const s of d.seasons || []) {
    const num = /^Season (\d+)$/i.exec(s.name)?.[1], special = /^specials$/i.test(s.name);
    if (num || special) main.seasons.push({ n: special ? 0 : Number(num), num, special, s });
    else items.push({ id: `${PREFIX}${d.id}-${slug(s.name)}`, name: `${d.title}: ${s.name}`, d, imdbMode: false, description: `${s.name} from ${d.title}.`,
      poster: web(s.poster) || web(mine(d, "shows").seasonPosters?.[0]) || showPoster, backdrop: main.backdrop, seasons: [{ n: 1, num: null, named: true, s }] });
  }
}
const preview = (it) => ({
  id: it.id, type: "series", name: it.name, poster: it.poster, posterShape: "poster", description: it.description || it.d.description || undefined,
  releaseInfo: it.d.year ? `${it.d.year}-` : undefined, genres: it.d.genres?.length ? it.d.genres : undefined,
});

rmSync("addon", { recursive: true, force: true });
let episodes = 0, withVideo = 0, undated = 0, withThumb = 0;
for (const it of items) {
  const videos = [];
  for (const { n, num, special, s } of it.seasons) {
    const seen = new Map();
    (s.episodes || []).forEach((e, i) => {
      const released = iso(e.date);
      if (!released) { undated++; return; }                   // Stremio needs a date for every episode
      const t = slug(e.title), c = (seen.get(t) || 0) + 1;
      seen.set(t, c);
      const dup = c > 1 ? "-" + c : "";
      const vid = num ? (it.imdbMode ? `${it.id}:${n}:${i + 1}` : `${it.id}-s${n}e${i + 1}`)
        : special ? (it.imdbMode ? `${it.id}:0:${i + 1}` : `${it.id}-specials-${t}${dup}`) : `${it.id}-${t}${dup}`;
      const yt = ytFor(it.d, e, i, num);
      const thumbnail = web(e.image) || stillFor(it.d, e, i, num) || (yt ? ytThumb(yt) : undefined);
      videos.push({ id: vid, title: e.title, season: n, episode: i + 1, released, overview: e.overview || undefined, thumbnail });
      write(`addon/stream/series/${vid}.json`, ytStream(yt));
      episodes++;
      if (yt) withVideo++;
      if (thumbnail) withThumb++;
    });
  }
  videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
  write(`addon/meta/series/${it.id}.json`, { meta: { ...preview(it), background: it.backdrop, videos, behaviorHints: { hasScheduledVideos: true } } });
}
const movieMeta = (d) => ({ id: d.stremioImdb && d.ids?.imdb ? d.ids.imdb : PREFIX + d.id, type: "movie", name: d.title, poster: web(d.images?.poster) || web(mine(d, "movies").poster),
  posterShape: "poster", description: d.description || undefined, releaseInfo: d.year ? String(d.year) : undefined, genres: d.genres?.length ? d.genres : undefined });
for (const d of movies) {
  const m = movieMeta(d);
  write(`addon/meta/movie/${m.id}.json`, { meta: { ...m, background: web(d.images?.backdrop) || web(mine(d, "movies").backdrop) } });
  write(`addon/stream/movie/${m.id}.json`, ytStream(d.youtube));
}

const catalogs = [];
if (items.length) { catalogs.push({ type: "series", id: PREFIX + "shows", name: "Community shows" }); write(`addon/catalog/series/${PREFIX}shows.json`, { metas: items.map(preview) }); }
if (movies.length) { catalogs.push({ type: "movie", id: PREFIX + "movies", name: "Community movies" }); write(`addon/catalog/movie/${PREFIX}movies.json`, { metas: movies.map(movieMeta) }); }

const imdbIds = [...items.filter((it) => it.imdbMode).map((it) => it.id), ...movies.filter((d) => d.stremioImdb && d.ids?.imdb).map((d) => d.ids.imdb)];
const name = process.env.ADDON_NAME || "Community Metadata";
write("addon/manifest.json", {
  id: `community.${slug(owner || "site")}.database`, version: "1.0.0", name,
  description: "Show and movie details from a community-written database, with official YouTube links where known.",
  logo: items.map((it) => it.poster).find(Boolean),
  resources: ["catalog", "meta", "stream"], types: [...(items.length ? ["series"] : []), ...(movies.length ? ["movie"] : [])],
  idPrefixes: [PREFIX, ...imdbIds], catalogs, behaviorHints: { configurable: false },
});
const manifestUrl = root ? `${root}/addon/manifest.json` : "";
write("addon/index.html", `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)} for Stremio</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#101a33;color:#eaf0ff;font:1.05rem/1.6 system-ui,sans-serif}main{max-width:34rem;padding:2rem}
a.b{display:inline-block;margin:.5rem 0;padding:.6rem 1.4rem;color:#101010;font-weight:700;text-decoration:none;background:#ffc247;border-radius:99px}code{display:block;padding:.6rem .8rem;overflow:auto;background:#182446;border-radius:8px}</style></head>
<body><main><h1>${esc(name)}</h1><p>${items.length} series and ${movies.length} movie(s) with their episodes, dates and official YouTube links.</p>
${manifestUrl ? `<p><a class="b" href="stremio://${esc(manifestUrl.replace(/^https?:\/\//, ""))}">Install in Stremio</a></p><p>Or add this address in Stremio under Addons:</p><code>${esc(manifestUrl)}</code>` : "<p>Install link unavailable (the site address is unknown).</p>"}
<p><small>Built ${new Date().toISOString().slice(0, 10)}</small></p></main></body></html>
`);
console.log(`Stremio addon: ${items.length} series, ${movies.length} movie(s), ${episodes} episode(s): ${withThumb} with a thumbnail, ${withVideo} with a YouTube video${undated ? `, ${undated} skipped for having no date` : ""}.`);
if (imdbIds.length) console.log("IMDb mode for:", imdbIds.join(", "));
if (manifestUrl) console.log("Install address:", manifestUrl);
