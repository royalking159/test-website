// YOUR MOVIES AND SHOWS. Only `title` is needed. The order in this file is the order on the Movies page.
// Posters, year, genres, description, episode names, dates and pictures are fetched from TMDB / TVDB / MDBList
// (by the GitHub Action running scripts/fetch-metadata.mjs) and saved in data/metadata.json.
// ANYTHING you write here replaces the fetched value.
//
// On any movie or show:
//   title: "New name"         poster: "https://..." or "posters/x.jpg" (a file in data/posters/)
//   description: "Text"       year: 2020    genres: ["Comedy"]    rating: 1-5 (your stars)    note: "Short note"
//   score: 8.5 (replaces the fetched TMDB score)
//   order: 1 (lower shows first)     hidden: true (hide it)     type: "show" or "movie"
//   imdb: "tt1234567"   tmdb: 123   tvdb: 123   exact ids, if the title lookup picks the wrong one
//   (Posters, season posters and episode pictures come from TMDB first, then TVDB. Set `poster` to pin any picture you like.)
//   url: "https://..." (a movie's play link)     watchUrl: "https://site/{show}/{season}/{episode}" (see Play icons)
// On shows:
//   edits: { "Original episode name": { title, image, overview, date, url, season: "S1", hidden: true } }
//   moves: { "Episode name": "S1" }    images: { "Episode name": "https://..." }    (short forms of edits)
//   extra: { Shorts: [ { title, date: "YYYY-MM-DD", image, overview, url } ] }    seasons the databases don't have
//          (anything listed in an extra season is automatically removed from the fetched Specials)
//   seasonOrder: ["Season 1", "Shorts", "Season 2"]     seasonNames: { "Specials": "Extras" }
//   seasonImages: { "Specials": "https://..." }    a picture for episodes in that season that have none
//   seasonCovers: { "Shorts": "https://..." }    the big poster shown on the left when that season is selected
//   episodeOrder: { Specials: ["Pilot", "Mission: Zero"] }    these episodes first; the rest keep their order
//   Not sure of an episode's exact name? Open  site/#/check/helluva-boss  to see every name as the databases list it.
//   Any episode can have  youtube: "VIDEO_ID"  (or a YouTube link as its url) to use that video's thumbnail.
// Play icons: each episode's play icon goes to its own `url`, else the show's `watchUrl`, else `watchUrl` in config.js.
//   A watchUrl can use {show} {title} {season} {episode} {name} {date} (season 0 = Specials). No URL = no icon.
const LIBRARY = [
  {
    type: "show",
    title: "Helluva Boss",
    // watchUrl: "https://example.com/watch/{show}/{season}/{episode}",
    moves: { "Queen Bee": "S1" },
    // Specials: Pilot and Mission: Zero first, then everything else in its normal order.
    episodeOrder: { Specials: ["Pilot", "Mission: Zero"] },
    // The two not-yet-released shorts that TMDB lists as just "Mission:" go into Shorts as well.
    edits: { "Mission:": { title: "Mission: (coming soon)", season: "Shorts" } },
    extra: {
      Shorts: [
        { title: "Hell's Belles", date: "2024-04-26" },
        { title: "Mission: Antarctica", date: "2024-07-31" },
        { title: "Mission: Weeaboo-Boo", date: "2024-08-31" },
        { title: "Mission: Chupacabras", date: "2024-09-29" },
        { title: "Mission: Orphan Time", date: "2025-06-28" },
        { title: "Mission: Bad Drivezo", date: "2025-08-02" },
        { title: "Mission: Whacked Off", date: "2025-09-06" },
        { title: "Mission: Big Boss", date: "2026-02-07" },
        { title: "Mission: Bigfoot", date: "2026-03-07" },
        { title: "Mission: It's Chaz Funeral", date: "2026-04-01" },
        { title: "Barbie's Bad Day", date: "2026-04-25" },
        { title: "IMP Training Video", date: "2026-06-13" },
        { title: "Mission: Book Report", date: "2026-07-11" }
      ],
    },
  },
  { type: "show", title: "Hazbin Hotel" },
  // { type: "movie", title: "Arrival", imdb: "tt2543164", rating: 5, note: "Rewatch every year" },
];
