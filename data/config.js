// ============================================================================
// SITE SETTINGS. Edit this file to customise the site.
// (Your movies and shows live in library.js, not here.)
// ============================================================================
const SITE = {
  name: "Your Name",
  tagline: "I build small things and watch too many films.",
  intro: "A few words for the front page.",
  about: "Write a few lines about yourself here.",

  // Defaults for the look. Colours must be 6-digit hex like "#ffc247".
  // Visitors can change all of this themselves in Settings (bottom of the sidebar).
  theme: {
    defaultMode: "dark",                                            // "dark", "light" or "auto" (follow the device)
    dark:  { bg: "#101a33", text: "#eaf0ff", accent: "#ffc247" },
    light: { bg: "#f4f6fb", text: "#141b2d", accent: "#b45309" },
    headingFont: "Bricolage Grotesque",                             // any Google Font that has weights 400 and 700
    bodyFont: "Instrument Sans",
  },

  // The pages in the sidebar, in order. Choose from "projects", "movies", "about". Home is always first.
  sections: ["projects", "movies", "about"],

  // Optional: rename a page. This changes both its sidebar label and its page title.
  sectionNames: { projects: "Projects/Study tools" },

  // Where each episode's play icon goes when a show has no watchUrl of its own ("" = no icon).
  // The link can contain {show} {title} {season} {episode} {name} {date}, which are filled in per episode.
  // Example: "https://example.com/watch?show={show}&s={season}&e={episode}"
  watchUrl: "",

  // Buttons on the home page. The first one is highlighted.
  links: [
    { label: "GitHub", url: "https://github.com/yourname" },
    { label: "Email", url: "mailto:you@example.com" },
  ],

  // ---------- PROJECTS ----------
  // One block per project. Only `title` is required.
  //   {
  //     title: "My project",
  //     description: "What it does, in a sentence or two.",
  //     tags: ["JavaScript", "Web"],                              // small labels under the description
  //     url: "https://example.com",                               // makes the title a link to the live project
  //     repo: "https://github.com/yourname/my-project",           // adds a "Source code" link
  //   },
  projects: [
    {
      title: "Project one",
      description: "One or two sentences on what it does and why you made it.",
      tags: ["JavaScript", "Web"],
      url: "https://example.com",
      repo: "https://github.com/yourname/project-one",
    },
    {
      title: "Project two",
      description: "Another thing you built.",
      tags: ["Python"],
      repo: "https://github.com/yourname/project-two",
    },
  ],

  // ---------- STUDY TOOLS ----------
  // Same format as projects. They appear under a divider on the same page, in their own "Study tools" section.
  // Delete everything between the brackets (leave `studyTools: [],`) to hide the section.
  studyTools: [
    {
      title: "Flashcards",
      description: "Spaced-repetition cards for revision.",
      tags: ["Study"],
      url: "https://example.com/flashcards",
    },
    {
      title: "Study timer",
      description: "A simple focus timer with breaks.",
      tags: ["Productivity"],
      url: "https://example.com/timer",
    },
  ],
};
