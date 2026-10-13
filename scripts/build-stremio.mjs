// Builds a static Stremio addon from the community database directly into the root.
// Uses IMDb IDs so Torrentio can recognize and match streams.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const write = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 1) + "\n"); };
const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const [owner = "", repo = ""] = (process.env.GITHUB_REPOSITORY || "").split("/");
const root = (process.env.SITE_URL || (owner ? `https://${owner.toLowerCase()}.github.io${repo.toLowerCase() === owner.toLowerCase() + ".github.io" ? "" : "/" + repo}` : "")).replace(/\/$/, "");
if (!root) console.warn("Set SITE_URL (or run in GitHub Actions) so index.html can show the install link.");

const iso = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? `${d}T00:00:00.000Z` : undefined);
const load = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"))) : []);
const byTitle = (a, b) => a.title.localeCompare(b.title);
const shows = load("community/shows").sort(byTitle), movies = load("community/movies").sort(byTitle);

const preview = (d, type) => {
  const showId = d.ids?.imdb || d.id;
  return {
    id: showId, type, name: d.title, poster: d.images?.poster || undefined, posterShape: "poster",
    description: d.description || undefined, releaseInfo: d.year ? String(d.year) + (type === "series" ? "-" : "") : undefined,
    genres: d.genres?.length ? d.genres : undefined,
  };
};
const ytStream = (id) => ({ streams: id ? [{ ytId: id, name: "YouTube", title: "Official upload" }] : [] });

// Clean old generated root files and folders
rmSync("catalog", { recursive: true, force: true });
rmSync("meta", { recursive: true, force: true });
rmSync("stream", { recursive: true, force: true });
rmSync("manifest.json", { force: true });
rmSync("index.html", { force: true });

let episodes = 0, withVideo = 0, undated = 0;

for (const d of shows) {
  const showId = d.ids?.imdb || d.id;
  const id = showId, videos = [];
  let extra = 0;
  for (const s of d.seasons || []) {
    const num = /^Season (\d+)$/i.exec(s.name)?.[1];
    const n = num ? Number(num) : s.name.toLowerCase() === "specials" ? 0 : 100 + extra++;
    const seen = new Map();
    (s.episodes || []).forEach((e, i) => {
      const released = iso(e.date);
      if (!released) { undated++; return; }
      const t = slug(e.title), c = (seen.get(t) || 0) + 1;
      seen.set(t, c);
      const vid = num ? `${id}-s${n}e${i + 1}` : `${id}-${slug(s.name)}-${t}${c > 1 ? "-" + c : ""}`;
      videos.push({ id: vid, title: e.title, season: n, episode: i + 1, released, thumbnail: e.image || undefined, overview: e.overview || undefined });
      write(`stream/series/${vid}.json`, ytStream(e.youtube));
      episodes++;
      if (e.youtube) withVideo++;
    });
  }
  videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
  write(`meta/series/${id}.json`, { meta: { ...preview(d, "series"), background: d.images?.backdrop || undefined, videos, behaviorHints: { hasScheduledVideos: true } } });
}
for (const d of movies) {
  const movieId = d.ids?.imdb || d.id;
  write(`meta/movie/${movieId}.json`, { meta: { ...preview(d, "movie"), background: d.images?.backdrop || undefined } });
  write(`stream/movie/${movieId}.json`, ytStream(d.youtube));
}

const catalogs = [];
if (shows.length) { catalogs.push({ type: "series", id: "community-shows", name: "Community shows" }); write(`catalog/series/community-shows.json`, { metas: shows.map((d) => preview(d, "series")) }); }
if (movies.length) { catalogs.push({ type: "movie", id: "community-movies", name: "Community movies" }); write(`catalog/movie/community-movies.json`, { metas: movies.map((d) => preview(d, "movie")) }); }

const name = process.env.ADDON_NAME || "Community Metadata";
write("manifest.json", {
  id: `community.${slug(owner || "site")}.database`, version: "1.0.0", name,
  description: "Show and movie details from a community-written database, with official YouTube links where known.",
  logo: shows.find((d) => d.images?.poster)?.images.poster || undefined,
  resources: ["catalog", "meta", "stream"], types: [...(shows.length ? ["series"] : []), ...(movies.length ? ["movie"] : [])],
  idPrefixes: ["tt"], catalogs, behaviorHints: { configurable: false },
});
const manifestUrl = root ? `${root}/manifest.json` : "";
write("index.html", `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)} for Stremio</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#101a33;color:#eaf0ff;font:1.05rem/1.6 system-ui,sans-serif}main{max-width:34rem;padding:2rem}
a.b{display:inline-block;margin:.5rem 0;padding:.6rem 1.4rem;color:#101010;font-weight:700;text-decoration:none;background:#ffc247;border-radius:99px}code{display:block;padding:.6rem .8rem;overflow:auto;background:#182446;border-radius:8px}</style></head>
<body><main><h1>${esc(name)}</h1><p>${shows.length} show(s) and ${movies.length} movie(s) with their episodes, dates and official YouTube links.</p>
${manifestUrl ? `<p><a class="b" href="stremio://${esc(manifestUrl.replace(/^https?:\/\//, ""))}">Install in Stremio</a></p><p>Or add this address in Stremio under Addons:</p><code>${esc(manifestUrl)}</code>` : "<p>Install link unavailable (the site address is unknown).</p>"}
<p><small>Built ${new Date().toISOString().slice(0, 10)}</small></p></main></body></html>
`);
console.log(`Stremio addon: ${shows.length} show(s), ${movies.length} movie(s), ${episodes} episode(s) (${withVideo} with a YouTube video${undated ? `, ${undated} skipped for having no date` : ""}).`);
if (manifestUrl) console.log("Install address:", manifestUrl);
