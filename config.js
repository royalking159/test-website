// EDIT THIS FILE to customise your site. No other file needs to change.
const SITE = {
  name: "Website name",
  tagline: "Short Tagline",
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
    { label: "Test URL", url: "https://example.com" },
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
  // url: optional. Clicking the poster opens this page in a new tab (e.g. its Letterboxd or IMDb page).
  movies: [
    { title: "Movie 1", year: 9999, rating: 5, status: "watched", poster: "", url: "https://letterboxd.com/film/arrival-2016/", note: "" },
    { title: "Movie 2", year: 9999, rating: 5, status: "watched", poster: "", url: "https://letterboxd.com/film/arrival-2016/", note: "" },
  ],
};
