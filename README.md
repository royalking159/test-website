# My website

Visitors who open `index.html` are sent straight to the site in `site/`.

## Folders

| Path | What it is |
|---|---|
| `index.html` | Landing page. Redirects to `site/` automatically. |
| `site/` | The website itself (page, styles, scripts). You rarely need to edit this. |
| `data/config.js` | Your name, tagline, theme defaults, projects and home page buttons. |
| `data/library.js` | Your movies and shows. Only a title is needed. |
| `data/metadata.json` | Posters, episode names, dates and pictures. Filled in automatically. |
| `data/posters/` | Optional: your own poster images (use them as `poster: "posters/name.jpg"`). |
| `scripts/fetch-metadata.mjs` | Fetches posters and episode info from TMDB, TVDB and MDBList. |
| `.github/workflows/metadata.yml` | Runs that script on GitHub. |

## Posters and episode info

1. Get a free API key from TMDB (themoviedb.org, in your account's API settings). A TVDB key works too.
2. In the repo: Settings > Secrets and variables > Actions > New repository secret. Add `TMDB_API_KEY`
   (and optionally `TVDB_API_KEY`, `TVDB_PIN`, `MDBLIST_API_KEY`).
3. Open the Actions tab, pick "Update movie metadata" and click Run workflow.
