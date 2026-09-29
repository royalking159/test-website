// Fetches poster, genres and ratings for every movie in config.js that has an `imdb` id,
// and saves them to metadata.json. Run by GitHub Actions (or locally: node fetch-metadata.mjs, Node 18+).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SITE = new Function(readFileSync("config.js", "utf8") + "; return SITE;")();
const { TVDB_API_KEY, TVDB_PIN, MDBLIST_API_KEY } = process.env;
const out = existsSync("metadata.json") ? JSON.parse(readFileSync("metadata.json", "utf8")) : {};

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

let tvdb;
if (TVDB_API_KEY) {
  try {
    const { data } = await get("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: TVDB_API_KEY, pin: TVDB_PIN || undefined }),
    });
    tvdb = { Authorization: `Bearer ${data.token}` };
  } catch (err) { console.warn("TVDB login failed:", err.message); }
}

for (const m of SITE.movies.filter((m) => m.imdb)) {
  const e = (out[m.imdb] ??= {});

  if (MDBLIST_API_KEY) {
    try {
      const d = await get(`https://api.mdblist.com/imdb/movie/${m.imdb}?apikey=${MDBLIST_API_KEY}`);
      put(e, {
        title: d.title, year: d.year, overview: d.description, poster: d.poster, runtime: d.runtime,
        genres: (d.genres || []).map((g) => g.title || g),
        ratings: Object.fromEntries((d.ratings || []).filter((r) => r.value != null).map((r) => [r.source, r.value])),
      });
    } catch (err) { console.warn("MDBList:", m.imdb, err.message); }
  }

  if (tvdb) {
    try {
      const found = await get(`https://api4.thetvdb.com/v4/search/remoteid/${m.imdb}`, { headers: tvdb });
      const hit = found.data?.find((x) => x.movie)?.movie;
      if (hit) put(e, { title: hit.name, year: hit.year, poster: hit.image }, true);
    } catch (err) { console.warn("TVDB:", m.imdb, err.message); }
  }
  console.log(m.imdb, Object.keys(e).join(", ") || "(nothing found)");
}

writeFileSync("metadata.json", JSON.stringify(out, null, 2));
