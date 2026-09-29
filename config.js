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
  movies: [
    { title: "Arrival", year: 2016, rating: 5, status: "watched", poster: "", note: "" },
    { title: "Spirited Away", year: 2001, rating: 5, status: "watched", poster: "", note: "Rewatch every year" },
    { title: "Parasite", year: 2019, rating: 4, status: "watched", poster: "", note: "" },
    { title: "Paris, Texas", year: 1984, status: "watchlist", poster: "", note: "" },
    { title: "Aftersun", year: 2022, status: "watchlist", poster: "", note: "" },
  ],
};
