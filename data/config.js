// EDIT THIS FILE to customise your site. Movies and shows live in library.js.
const SITE = {
  name: "Test Site",
  tagline: "I build small things and watch too many films.",
  intro: "A few words for the front page.",
  about: "Write a few lines about yourself here.",

  // Defaults for the theme. Colours must be 6-digit hex. Visitors can change all of it in Settings.
  theme: {
    defaultMode: "dark",                                            // "dark", "light" or "auto" (follow the device)
    dark:  { bg: "#101a33", text: "#eaf0ff", accent: "#ffc247" },
    light: { bg: "#f4f6fb", text: "#141b2d", accent: "#b45309" },
    headingFont: "Bricolage Grotesque",                             // any Google Font that has 400 and 700
    bodyFont: "Instrument Sans",
  },

  // Pages in the sidebar, in order. Choose from "projects", "movies", "about". Home is always first.
  sections: ["projects", "movies", "about"],

  // Buttons on the home page.
  links: [
    { label: "GitHub", url: "https://github.com/yourname" },
    { label: "Email", url: "mailto:you@example.com" },
  ],

  projects: [
    {
      title: "Project one",
      description: "One or two sentences on what it does and why you made it.",
      tags: ["JavaScript", "Web"],
      url: "https://example.com",                                   // live link (optional)
      repo: "https://github.com/yourname/project-one",              // source link (optional)
    },
    {
      title: "Project two",
      description: "Another thing you built.",
      tags: ["Python"],
      repo: "https://github.com/yourname/project-two",
    },
  ],
};
