// YOUR MOVIES AND SHOWS. Only `title` is needed.
// Posters, year, genres, episode names, air dates and episode pictures are fetched from TMDB / TVDB / MDBList
// (by the GitHub Action running scripts/fetch-metadata.mjs) and saved in data/metadata.json.
// Anything you type here wins over the fetched data.
//
// Optional on any entry:  type: "show" or "movie"      year: 2020 (helps the lookup pick the right match)
//                         imdb: "tt1234567"   tmdb: 12345   tvdb: 12345   (exact ids, if the title lookup guesses wrong)
//                         poster: "https://..." or "posters/arrival.jpg" (a file in data/posters/) - replaces the fetched poster
//                         rating: 1-5   note: "text"   url: "link opened by a movie's poster"
// Optional on shows:      moves: { "Episode name": "S1" }     put an episode in another season ("S1", "Specials"...)
//                         extra: { Shorts: [ { title, date: "YYYY-MM-DD", image: "..." } ] }   seasons the databases don't have
//                         images: { "Episode name": "https://..." }     your own picture for an episode
const LIBRARY = [
  {
    type: "show",
    title: "Helluva Boss",
    moves: { "Queen Bee": "S1" },
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
