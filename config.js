// EDIT THIS FILE to customise your site. No other file needs to change.
const SITE = {
  name: "Your Name",
  tagline: "I build small things and watch too many films.",
  about: "Write a few lines about yourself here.",

  // Colours are any CSS colour. Fonts are any name from fonts.google.com.
  theme: {
    bg: "#101a33",
    surface: "#182446",
    text: "#eaf0ff",
    muted: "#9aa8cf",
    accent: "#ffc247",
    headingFont: "Bricolage Grotesque",
    bodyFont: "Instrument Sans",
  },

  // Order of sections on the page. Remove one to hide it.
  sections: ["projects", "movies", "about"],

  // Links in the footer.
  links: [
    { label: "GitHub", url: "https://github.com/yourname" },
    { label: "Email", url: "mailto:you@example.com" },
  ],

  // Links to other sites, shown in the top menu and opened in a new tab.
  // Add one line per site: { label: "Text shown", url: "https://..." }
  navLinks: [
    { label: "My blog", url: "https://example.com" },
  ],

  projects: [
    {
      title: "Project one",
      description: "One or two sentences on what it does and why you made it.",
      tags: ["JavaScript", "Web"],
      url: "https://example.com",       // live link (optional)
      repo: "https://github.com/yourname/project-one", // source link (optional)
    },
    {
      title: "Project two",
      description: "Another thing you built.",
      tags: ["Python"],
      repo: "https://github.com/yourname/project-two",
    },
  ],

  // rating is 1-5. status can be any word (e.g. "watched", "watchlist");
  // filter buttons are made from the statuses you use.
  // poster: a URL, or a file path like "posters/arrival.jpg". Leave "" for a title tile.
  // url: optional. Clicking the poster opens it. A full https:// link opens in a new tab;
  //   a page on your own site (like show.html?show=helluva-boss) opens in the same tab.
  // imdb: optional IMDb id (the tt1234567 part of a movie's IMDb address). A GitHub Action then fills in
  //   poster, genres and ratings from TVDB and MDBList. Anything you type yourself here wins over fetched data.
  // The two tiles below open the show pages built from shows.js.
  movies: [
    { title: "Helluva Boss", year: 2020, status: "shows", poster: "", url: "show.html?show=helluva-boss", note: "Series" },
    { title: "Hazbin Hotel", year: 2024, status: "shows", poster: "", url: "show.html?show=hazbin-hotel", note: "Series" },
  ],
};
