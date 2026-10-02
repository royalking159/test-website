// ============================================================================
// YOUR MOVIES AND SHOWS
// ============================================================================
// Each item below is one movie or show. Only `title` is needed: the poster, year, genres, description,
// episode names, dates and pictures are fetched from TMDB / TVDB / MDBList by the GitHub Action
// (scripts/fetch-metadata.mjs) and saved in data/metadata.json.
// ANYTHING YOU WRITE HERE REPLACES the fetched value. The order here is the order on the Movies page.
//
// ---------------------------------------------------------------------------
// EXAMPLE: A SHOW WITH EVERYTHING FILLED IN (copy it, delete the lines you don't need)
// ---------------------------------------------------------------------------
//   {
//     type: "show",
//     title: "My Show",                                  // required. Also used to look the show up
//     year: 2021,                                        // helps the lookup pick the right show
//     poster: "https://example.com/poster.jpg",          // your own poster. Or "posters/my-show.jpg" for a file in data/posters/
//     description: "Replaces the fetched description.",
//     genres: ["Comedy", "Animation"],
//     rating: 4,                                         // your own stars, 1 to 5
//     note: "Rewatching in spring",
//     order: 1,                                          // lower numbers go first (otherwise: the order in this file)
//     hidden: true,                                      // hides it without deleting it
//     tmdb: 12345, tvdb: 67890, imdb: "tt1234567",       // exact ids, only if the title lookup picks the wrong show
//
//     // ----- Play links (the small play icon on each episode) -----
//     watchUrl: "https://example.com/watch/{show}/s{season}e{episode}",   // one pattern for every episode (see below)
//
//     // ----- Changes to single episodes: use the episode's ORIGINAL name -----
//     edits: {
//       "Pilot": { title: "Pilot (extended)", overview: "New description", image: "https://example.com/pic.jpg",
//                  date: "2020-01-31", url: "https://example.com/watch/pilot" },   // url = this episode's own play link
//       "Boring Episode": { hidden: true },                                       // hide an episode
//       "Bonus Clip": { season: "Shorts" },                                       // move it to another season ("S1", "Specials", "Shorts"...)
//     },
//     moves: { "Queen Bee": "S1" },                      // short way to move an episode
//     images: { "Pilot": "https://example.com/pic.jpg" },// short way to set an episode's picture
//
//     // ----- A season the databases don't have (like Shorts) -----
//     extra: {
//       Shorts: [
//         { title: "A short", date: "2024-05-01" },
//         { title: "Another short", date: "2024-06-01", youtube: "VIDEO_ID" },       // YouTube thumbnail becomes its picture
//         { title: "A third", date: "2024-07-01", url: "https://example.com/third" },// own play link
//       ],
//     },
//
//     // ----- Seasons -----
//     seasonOrder: ["Season 1", "Shorts", "Season 2"],   // listed seasons first, the rest after
//     seasonNames: { Specials: "Extras" },               // rename a season
//     seasonCovers: { Shorts: "https://example.com/shorts.jpg" },   // big poster + background when that season is selected
//     seasonImages: { Specials: "https://example.com/special.jpg" },// picture for episodes in that season that have none
//     episodeOrder: { Specials: ["Pilot", "Movie Night"] },         // these first, the rest keep their order
//   },
//
// ---------------------------------------------------------------------------
// EXAMPLE: A MOVIE
// ---------------------------------------------------------------------------
//   {
//     type: "movie",
//     title: "Arrival",
//     year: 2016,
//     rating: 5,                                         // your stars
//     note: "Rewatch every year",
//     url: "https://example.com/watch/arrival",          // the Play button on the movie's page
//   },
//
// ---------------------------------------------------------------------------
// HOW TO ADD PLAY LINKS (URLs): pick whichever is easiest
// ---------------------------------------------------------------------------
//   1. One pattern for a whole show:      watchUrl: "https://example.com/watch/{show}/s{season}e{episode}"
//   2. One pattern for the whole site:    put  watchUrl  in config.js
//   3. One link for a single episode:     edits: { "Episode name": { url: "https://..." } }
//   4. A movie's Play button:             url: "https://..."
//   These are filled in for every episode:  {show} = the show's id (like "my-show")   {title} = show title
//   {season} = season number (0 for Specials)   {episode} = the number in the list   {name} = episode title   {date} = air date
//   Longest wins: an episode's own url, else the show's watchUrl, else the one in config.js. No link = no play icon.
//
// NOT SURE OF AN EPISODE'S EXACT NAME?  Open  site/#/check/helluva-boss  (use your show's id) to see every name
// exactly as the databases list it, next to what the site shows.
const LIBRARY = [
  {
    type: "show",
    title: "Helluva Boss",
    // watchUrl: "https://example.com/watch/{show}/{season}/{episode}",   // remove the // and set your own link pattern
    moves: { "Queen Bee": "S1" },                                          // Queen Bee goes into Season 1
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

  // To add a movie, remove the // in front of the next line:
  // { type: "movie", title: "Arrival", rating: 5, note: "Rewatch every year" },
];
