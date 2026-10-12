// Community metadata database: checks the files in community/ and builds data/community-index.json for the site.
//   node scripts/community.mjs validate    check every file (also runs on pull requests)
//   node scripts/community.mjs build       check, then write data/community-index.json
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

const DIRS = { show: "community/shows", movie: "community/movies" };
const errors = [];
const titles = [];
const seen = new Map();
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const isStr = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max && !/[<>]/.test(v);
const optStr = (v, max) => v == null || v === "" || isStr(v, max);
const isUrl = (v) => typeof v === "string" && /^https:\/\/[^\s<>"]+$/.test(v) && v.length <= 500;
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function check(file, d, type) {
  const name = file.split("/").pop().replace(/\.json$/, "");
  if (typeof d !== "object" || !d || Array.isArray(d)) return err(file, "must be a JSON object");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.id || "")) err(file, 'id must be lowercase letters, numbers and dashes, like "my-show"');
  else if (d.id !== name) err(file, `id "${d.id}" must match the file name "${name}.json"`);
  if (d.type !== type) err(file, `type must be "${type}" (this file is in the ${type}s folder)`);
  if (!isStr(d.title, 120)) err(file, "title is required (max 120 characters, no < or >)");
  if (!optStr(d.description, 1500)) err(file, "description must be text, max 1500 characters, no < or >");
  if (d.year != null && !(Number.isInteger(d.year) && d.year >= 1880 && d.year <= new Date().getFullYear() + 5)) err(file, "year must be a 4-digit number");
  if (d.genres != null && !(Array.isArray(d.genres) && d.genres.length <= 12 && d.genres.every((g) => isStr(g, 40)))) err(file, "genres must be a list of short words");
  const ids = d.ids || {};
  if (ids.tmdb != null && !Number.isInteger(ids.tmdb)) err(file, "ids.tmdb must be a number");
  if (ids.tvdb != null && !Number.isInteger(ids.tvdb)) err(file, "ids.tvdb must be a number");
  if (ids.imdb != null && !/^tt\d+$/.test(ids.imdb)) err(file, 'ids.imdb must look like "tt1234567"');
  for (const k of ["poster", "backdrop"]) if (d.images?.[k] && !isUrl(d.images[k])) err(file, `images.${k} must be a link starting with https://`);
  (d.links || []).forEach((l, i) => { if (!isStr(l?.name, 80) || !isUrl(l?.url)) err(file, `links[${i}] needs a name and an https:// url`); });
  if (d.contributors != null && !(Array.isArray(d.contributors) && d.contributors.every((c) => isStr(c, 60)))) err(file, "contributors must be a list of names");
  if (d.youtube && !/^[\w-]{11}$/.test(d.youtube)) err(file, "youtube must be an 11-character YouTube video id");
  if (type !== "show") return;
  if (!Array.isArray(d.seasons)) return err(file, "seasons must be a list");
  d.seasons.forEach((s, i) => {
    const at = `seasons[${i}]`;
    if (!isStr(s?.name, 60)) err(file, `${at}.name is required`);
    if (!Array.isArray(s?.episodes)) return err(file, `${at}.episodes must be a list`);
    s.episodes.forEach((e, j) => {
      const ep = `${at}.episodes[${j}]`;
      if (!isStr(e?.title, 160)) err(file, `${ep}.title is required`);
      if (e?.date && !isDate(e.date)) err(file, `${ep}.date must look like 2024-05-31`);
      if (!optStr(e?.overview, 800)) err(file, `${ep}.overview must be text, max 800 characters`);
      if (e?.image && !isUrl(e.image)) err(file, `${ep}.image must start with https://`);
      if (e?.youtube && !/^[\w-]{11}$/.test(e.youtube)) err(file, `${ep}.youtube must be an 11-character YouTube video id`);
    });
  });
}

for (const [type, dir] of Object.entries(DIRS)) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
    const file = `${dir}/${f}`;
    if (statSync(file).size > 300_000) { err(file, "file is bigger than 300 KB"); continue; }
    let d;
    try { d = JSON.parse(readFileSync(file, "utf8")); } catch (e) { err(file, "is not valid JSON: " + e.message); continue; }
    check(file, d, type);
    if (seen.has(d?.id)) err(file, `id "${d.id}" is already used by ${seen.get(d.id)}`); else seen.set(d?.id, file);
    const eps = (d.seasons || []).reduce((n, s) => n + (s.episodes?.length || 0), 0);
    titles.push({ id: d.id, type, title: d.title, year: d.year, description: (d.description || "").slice(0, 240), genres: d.genres || [],
      poster: d.images?.poster || "", ids: d.ids || {}, seasons: (d.seasons || []).length, episodes: eps });
  }
}

if (errors.length) {
  console.error(`Found ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`OK: ${titles.length} title(s) checked.`);
if (process.argv[2] === "build") {
  titles.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync("data/community-index.json", JSON.stringify({ built: new Date().toISOString(), count: titles.length, titles }, null, 1) + "\n");
  console.log("Wrote data/community-index.json");
}
