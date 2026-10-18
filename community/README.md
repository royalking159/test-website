# Community metadata database

One JSON file per title. Anyone can suggest a new title or a fix through a GitHub pull request; the owner reviews it,
and once it is merged a GitHub Action checks it and rebuilds `data/community-index.json` for the website.

```
community/
  shows/helluva-boss.json     one file per TV show (the file name must match the "id" inside)
  movies/arrival.json         one file per movie
  _template-show.json         copy this to start a new show (files starting with _ are ignored)
```

## How to add or fix a title (no coding needed)
1. On GitHub, open the `community/shows` folder (or `community/movies`).
2. Click **Add file > Create new file**. To fix an existing title, open its file and click the pencil instead.
3. Name it like `my-show.json` and paste in `_template-show.json`, then fill it in.
4. Click **Commit changes > Propose changes**. GitHub opens a pull request. A green tick means it passed the automatic check.

## Rules
- **Write descriptions in your own words.** Facts (titles, air dates, episode order, IDs) are fine to enter.
  Do not copy text from TMDB, TVDB, IMDb, Wikipedia or other sites, and do not paste their data in bulk.
- Images are links only (`https://...`), and only to pictures you are allowed to link to.
- No HTML (`<` or `>`) in any text.

## Fields
`id`, `type` ("show" or "movie"), `title` are required. Everything else is optional: `year`, `description`,
`genres`, `ids` (`tmdb`, `tvdb`, `imdb`), `images` (`poster`, `backdrop`), `links`, `contributors`.
Shows also have `seasons`, each with a `name` and `episodes` (`title`, and optionally `date`, `overview`, `image`, `youtube`).
A season can also have a `poster` (an https link). Episode thumbnails: give an episode an `image`, or leave it out and the site and the Stremio addon
use the TMDB still the website already fetched, then the YouTube thumbnail if the episode has a `youtube` id.
The metadata Action fills in missing `youtube` ids for you (`node scripts/community.mjs fill`).

## Where the data is used
- **Website:** the Movies/Shows page and each title's page read these files (library.js tweaks win over the database, the database wins over TMDB/TVDB data). Titles that only exist in `data/library.js` still show.
- **Stremio addon:** built from the same files by `scripts/build-stremio.mjs`.

## Status
- [x] Data format, checker and index builder (`scripts/community.mjs`), GitHub Action, template, Helluva Boss as the first entry
- [x] "Database" section on the website: list, search, title pages, "Suggest an edit" and "Add a title" buttons (add `"database"` to `sections` in `data/config.js`)
- [x] Stremio addon built from these files (`scripts/build-stremio.mjs` writes the `addon/` folder; see below)
- [x] TMDB and TVDB credit lines on the site's About page (`tmdbLogo` in `data/config.js` is optional)

## Stremio addon
After a change is merged, the Action rebuilds the `addon/` folder. It is served by GitHub Pages, so the addon address is
`https://<your-name>.github.io/<repo>/addon/manifest.json`. In Stremio open **Addons** and add that address
(or open `.../addon/` in a browser and tap **Install in Stremio**). It lists every title with its episodes and dates,
and episodes that have a `youtube` id get an official YouTube stream.
Stremio only knows season numbers, so "Specials" becomes season 0, and any other named season (like Shorts) becomes its own series, for example "Helluva Boss: Shorts".
Episodes without a `date` are left out of the addon.
