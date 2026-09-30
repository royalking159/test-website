// Fetches metadata for everything in library.js and saves it to metadata.json.
// Shows: TVDB (name, year, poster, overview, genres and every episode with air date + image).
// Movies: MDBList (poster, year, genres, ratings), with TVDB filling any gaps.
// Run by GitHub Actions (or locally: node fetch-metadata.mjs, Node 18+). Needs TVDB_API_KEY and/or MDBLIST_API_KEY.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LIBRARY = new Function(readFileSync("library.js", "utf8") + "; return LIBRARY;")();
const { TVDB_API_KEY, TVDB_PIN, MDBLIST_API_KEY } = process.env;
const out = existsSync("metadata.json") ? JSON.parse(readFileSync("metadata.json", "utf8")) : {};
out.movies ??= {};
out.shows ??= {};

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const abs = (u) => (u && !u.startsWith("http") ? "https://artworks.thetvdb.com" + u : u);
async function get(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} from ${url.replace(/apikey=[^&]+/, "apikey=***")}`);
  return r.json();
}
// Copy non-empty values into e. With keep=true, only fill gaps.
const put = (e, o, keep) => {
  for (const [k, v] of Object.entries(o))
    if (v != null && v !== "" && !(keep && e[k] != null)) e[k] = v;
};

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

// Find the TVDB id: your `tvdb` field, else IMDb id, else a search by title.
async function findId(e, kind) {
  if (e.tvdb) return e.tvdb;
  if (e.imdb) {
    const r = await tvdb(`/search/remoteid/${e.imdb}`);
    const hit = r.data?.find((x) => x[kind]);
    if (hit) return hit[kind].id;
  }
  const r = await tvdb(`/search?query=${encodeURIComponent(e.title)}&type=${kind === "series" ? "series" : "movie"}`);
  return r.data?.[0]?.tvdb_id;
}

for (const e of LIBRARY) {
  const id = e.id || slug(e.title);

  if (e.type === "show") {
    const md = (out.shows[id] ??= {});
    if (!headers) { console.warn("No TVDB key, skipping show:", e.title); continue; }
    try {
      const tid = await findId(e, "series");
      const info = (await tvdb(`/series/${tid}/extended?short=true`)).data;
      put(md, {
        title: info.name, year: info.year, poster: abs(info.image), overview: info.overview,
        genres: (info.genres || []).map((g) => g.name),
      });
      const eps = [];
      for (let page = 0; ; page++) {
        const r = await tvdb(`/series/${tid}/episodes/default?page=${page}`);
        eps.push(...(r.data?.episodes || []));
        if (!r.links?.next) break;
      }
      if (eps.length) {
        md.episodes = eps
          .map((x) => ({ title: x.name, season: x.seasonNumber, number: x.number, date: x.aired, image: abs(x.image), overview: x.overview }))
          .sort((a, b) => a.season - b.season || a.number - b.number);
        delete md.seed;
      }
      console.log("show", e.title, "->", eps.length, "episodes");
    } catch (err) { console.warn("TVDB show:", e.title, err.message); }
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
  if (headers) {
    try {
      const tid = await findId(e, "movie");
      const info = (await tvdb(`/movies/${tid}/extended?short=true`)).data;
      put(md, { title: info.name, year: info.year, poster: abs(info.image), overview: info.overview, runtime: info.runtime }, true);
    } catch (err) { console.warn("TVDB movie:", e.title, err.message); }
  }
  console.log("movie", e.title, "->", Object.keys(md).join(", ") || "(nothing found)");
}

writeFileSync("metadata.json", JSON.stringify(out, null, 1) + "\n");
