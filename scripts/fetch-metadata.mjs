// Fetches posters, episode info and other metadata for everything in data/library.js and saves it to data/metadata.json.
// Sources (uses whichever you have keys for): TMDB (posters, episode pictures), TVDB (shows + episodes), MDBList (movie ratings).
// Run by GitHub Actions, or locally from the repo root:  node scripts/fetch-metadata.mjs   (Node 18+)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LIBRARY = new Function(readFileSync("data/library.js", "utf8") + "; return LIBRARY;")();
const env = (k) => (process.env[k] || "").trim();             // trims stray spaces/newlines from pasted secrets
const TVDB_API_KEY = env("TVDB_API_KEY"), TVDB_PIN = env("TVDB_PIN"), TMDB_API_KEY = env("TMDB_API_KEY"), MDBLIST_API_KEY = env("MDBLIST_API_KEY");
console.log("Keys found:", [["TMDB", TMDB_API_KEY], ["TVDB", TVDB_API_KEY], ["MDBList", MDBLIST_API_KEY]].filter(([, v]) => v).map(([n]) => n).join(", ") || "none");
if (!TVDB_API_KEY && !TMDB_API_KEY && !MDBLIST_API_KEY) {
  console.error("No API keys found. Add TMDB_API_KEY (easiest) and/or TVDB_API_KEY as repository secrets. See README.md.");
  process.exit(1);
}
const out = existsSync("data/metadata.json") ? JSON.parse(readFileSync("data/metadata.json", "utf8")) : {};
out.movies ??= {};
out.shows ??= {};

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const abs = (u) => (u && !u.startsWith("http") ? "https://artworks.thetvdb.com" + u : u);
async function get(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} from ${url.replace(/(api_?key)=[^&]+/, "$1=***")}`);
  return r.json();
}
// Copy non-empty values into e. With keep=true, only fill gaps.
const put = (e, o, keep) => {
  for (const [k, v] of Object.entries(o))
    if (v != null && v !== "" && !(keep && e[k] != null)) e[k] = v;
};

// ---- TVDB ----
let headers;
if (TVDB_API_KEY) {
  try {
    const { data } = await get("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: TVDB_API_KEY, pin: TVDB_PIN || undefined }),
    });
    headers = { Authorization: `Bearer ${data.token}` };
  } catch (err) { console.warn("TVDB login failed:", err.message); }
}
const tvdb = (path) => get("https://api4.thetvdb.com/v4" + path, { headers });
async function tvdbId(e, kind) {                              // your `tvdb` id, else IMDb id, else title search
  if (e.tvdb) return e.tvdb;
  if (e.imdb) {
    try {
      const r = await tvdb(`/search/remoteid/${e.imdb}`);
      const hit = r.data?.find((x) => x[kind]);
      if (hit) return hit[kind].id;
    } catch {}                                                // fall back to a title search
  }
  const r = await tvdb(`/search?query=${encodeURIComponent(e.title)}&type=${kind === "series" ? "series" : "movie"}`);
  return r.data?.[0]?.tvdb_id;
}

// ---- TMDB (a v3 key, or the long "read access token") ----
const bearer = !!TMDB_API_KEY && TMDB_API_KEY.length > 40;
const tmdb = (path, q = "") =>
  get(`https://api.themoviedb.org/3${path}?${bearer ? "" : `api_key=${TMDB_API_KEY}&`}${q}`,
    bearer ? { headers: { Authorization: `Bearer ${TMDB_API_KEY}` } } : undefined);
const tImg = (p, size) => (p ? `https://image.tmdb.org/t/p/${size}${p}` : undefined);
async function tmdbId(e, kind) {                              // kind: "tv" or "movie"
  if (e.tmdb) return e.tmdb;
  if (e.imdb) {
    try {
      const r = await tmdb(`/find/${e.imdb}`, "external_source=imdb_id");
      const hit = r[kind + "_results"]?.[0];
      if (hit) return hit.id;
    } catch {}                                                // fall back to a title search
  }
  const yr = e.year ? `&${kind === "tv" ? "first_air_date_year" : "year"}=${e.year}` : "";
  const r = await tmdb(`/search/${kind}`, `query=${encodeURIComponent(e.title)}${yr}`);
  return r.results?.[0]?.id;
}

for (const e of LIBRARY) {
  const id = e.id || slug(e.title);

  if (e.type === "show") {
    const md = (out.shows[id] ??= {});
    let eps = [], tmdbEps = [];

    if (headers) {
      try {
        const tid = await tvdbId(e, "series");
        const info = (await tvdb(`/series/${tid}/extended?short=true`)).data;
        put(md, { title: info.name, year: info.year, poster: abs(info.image), overview: info.overview, genres: (info.genres || []).map((g) => g.name) });
        for (let page = 0; ; page++) {
          const r = await tvdb(`/series/${tid}/episodes/default?page=${page}`);
          eps.push(...(r.data?.episodes || []));
          if (!r.links?.next) break;
        }
        eps = eps.map((x) => ({ title: x.name, season: x.seasonNumber, number: x.number, date: x.aired, image: abs(x.image), overview: x.overview }));
      } catch (err) { console.warn("TVDB show:", e.title, err.message); }
    }

    if (TMDB_API_KEY) {
      try {
        const tid = await tmdbId(e, "tv");
        const info = await tmdb(`/tv/${tid}`);
        put(md, {
          title: info.name, year: (info.first_air_date || "").slice(0, 4), poster: tImg(info.poster_path, "w500"),
          backdrop: tImg(info.backdrop_path, "w780"), overview: info.overview, genres: (info.genres || []).map((g) => g.name),
        }, true);
        if (info.vote_average) md.score = Math.round(info.vote_average * 10) / 10;   // TMDB rating out of 10
        for (const s of info.seasons || []) {
          const r = await tmdb(`/tv/${tid}/season/${s.season_number}`);
          if (r.poster_path) (md.seasonPosters ??= {})[s.season_number] = tImg(r.poster_path, "w342");
          tmdbEps.push(...(r.episodes || []).map((x) => ({
            title: x.name, season: s.season_number, number: x.episode_number, date: x.air_date,
            image: tImg(x.still_path, "w300"), overview: x.overview,
          })));
        }
      } catch (err) { console.warn("TMDB show:", e.title, err.message); }
    }

    if (!eps.length) eps = tmdbEps;                           // no TVDB episodes: use TMDB's
    else {                                                    // otherwise TMDB only fills missing pictures and summaries
      const byTitle = new Map(tmdbEps.map((x) => [(x.title || "").toLowerCase(), x]));
      const byNum = new Map(tmdbEps.map((x) => [`${x.season}:${x.number}`, x]));
      for (const x of eps) {
        const t = byTitle.get((x.title || "").toLowerCase()) || byNum.get(`${x.season}:${x.number}`);
        if (t) { x.image ||= t.image; x.overview ||= t.overview; }
      }
    }
    if (eps.length) {
      md.episodes = eps.sort((a, b) => a.season - b.season || a.number - b.number);
      delete md.seed;
    }
    const from = (u) => ((u || "").includes("thetvdb.com") ? "TVDB" : (u || "").includes("themoviedb.org") ? "TMDB" : "other");
    console.log("show", e.title, "->", eps.length, "episodes,", eps.filter((x) => x.image).length, "with pictures,", md.poster ? `poster OK (${from(md.poster)})` : "NO POSTER");
    continue;
  }

  const md = (out.movies[id] ??= {});
  if (MDBLIST_API_KEY && e.imdb) {
    try {
      const d = await get(`https://api.mdblist.com/imdb/movie/${e.imdb}?apikey=${MDBLIST_API_KEY}`);
      put(md, {
        title: d.title, year: d.year, overview: d.description, poster: d.poster, runtime: d.runtime,
        genres: (d.genres || []).map((g) => g.title || g),
        ratings: Object.fromEntries((d.ratings || []).filter((r) => r.value != null).map((r) => [r.source, r.value])),
      });
    } catch (err) { console.warn("MDBList:", e.title, err.message); }
  }
  if (TMDB_API_KEY) {
    try {
      const info = await tmdb(`/movie/${await tmdbId(e, "movie")}`);
      put(md, {
        title: info.title, year: (info.release_date || "").slice(0, 4), poster: tImg(info.poster_path, "w500"),
        overview: info.overview, runtime: info.runtime, genres: (info.genres || []).map((g) => g.name),
      }, true);
      if (info.vote_average) md.score = Math.round(info.vote_average * 10) / 10;
    } catch (err) { console.warn("TMDB movie:", e.title, err.message); }
  }
  if (headers) {
    try {
      const info = (await tvdb(`/movies/${await tvdbId(e, "movie")}/extended?short=true`)).data;
      put(md, { title: info.name, year: info.year, poster: abs(info.image), overview: info.overview, runtime: info.runtime }, true);
    } catch (err) { console.warn("TVDB movie:", e.title, err.message); }
  }
  console.log("movie", e.title, "->", md.poster ? "poster OK" : "NO POSTER");
}

out.updated = new Date().toISOString();
writeFileSync("data/metadata.json", JSON.stringify(out, null, 1) + "\n");
const posters = [...Object.values(out.shows), ...Object.values(out.movies)].filter((x) => x.poster).length;
if (!posters) {                                               // make the GitHub run turn red instead of silently doing nothing
  console.error("No posters were found. Check the warnings above - usually a wrong or missing API key.");
  process.exitCode = 1;
}
