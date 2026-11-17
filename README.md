# The Community Archives

A static website for GitHub Pages: a library of shows and films, a community-written database (the TCDB), projects and study tools, and a Stremio addon built from the same data.
Current version: see `VERSION`. What changed in each version: `CHANGELOG.txt` and the `changelog` folder.

## What is in the folder
- `index.html` sends visitors to `site/`.
- `site/` the website itself (`index.html`, `app.js`, `theme.js`, `style.css`).
- `data/config.js` your name, text, links, projects and the version. `data/library.js` your shows and films and their options.
- `data/metadata.json` and `data/community-index.json` are written by the GitHub Actions. Do not edit them by hand.
- `community/` the TCDB: one JSON file per title (see `community/README.md`).
- `scripts/` the scripts the Actions run. `.github/workflows/` the two Actions.
- `addon/` the Stremio addon. It is created by the first Update movie metadata run (it is not in the download because its file names contain colons, which Windows cannot unzip). Install page: `<your site>/addon/`, or use the buttons on the TCDB page.

## Updating the site
1. Upload the new files to the repository (commit to `main`).
2. Open Actions, choose Update movie metadata, then Run workflow. It refreshes posters and episodes and rebuilds the TCDB index and the Stremio addon (run it once after a fresh upload to create `addon/`).

Updates after a full release should not include `data/metadata.json`, so the data the Action fetched is not overwritten.

## Secrets (Settings, Secrets and variables, Actions)
`TMDB_API_KEY` (needed), and optionally `TVDB_API_KEY`, `TVDB_PIN`, `MDBLIST_API_KEY` and `YOUTUBE_API_KEY`.
