// Tiny element builder: $("tag", {attrs}, ...children)
const $ = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === "") continue;
    k === "class" ? (el.className = v) : el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(Boolean));
  return el;
};

// Theme: colours and fonts from config.js
const T = SITE.theme;
const root = document.documentElement.style;
for (const k of ["bg", "surface", "text", "muted", "accent"]) root.setProperty("--" + k, T[k]);
root.setProperty("--head", `"${T.headingFont}", system-ui, sans-serif`);
root.setProperty("--body", `"${T.bodyFont}", system-ui, sans-serif`);
const fams = [T.headingFont, T.bodyFont]
  .map((f) => "family=" + f.replace(/ /g, "+") + ":wght@400;700")
  .join("&");
document.head.append($("link", { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?${fams}&display=swap` }));
document.title = SITE.name;

const section = (key, kids) => $("section", { id: key }, $("h2", {}, key), ...kids);

const builders = {
  projects: () =>
    section("projects", SITE.projects.map((p) =>
      $("article", { class: "project" },
        $("h3", {}, p.url ? $("a", { href: p.url }, p.title) : p.title),
        $("p", {}, p.description),
        $("ul", { class: "tags" }, (p.tags || []).map((t) => $("li", {}, t))),
        p.repo && $("a", { href: p.repo, class: "src" }, "Source code")
      )
    )),

  movies: () => {
    const bar = $("div", { class: "filters" });
    const grid = $("div", { class: "posters" });
    const draw = (status) => {
      grid.replaceChildren(...SITE.movies
        .filter((m) => status === "All" || m.status === status)
        .map((m) =>
          $("figure", { class: "poster" },
            m.poster
              ? $("img", { src: m.poster, alt: m.title, loading: "lazy" })
              : $("div", { class: "noposter" }, m.title),
            $("figcaption", {},
              $("strong", {}, m.title), ` ${m.year || ""}`,
              m.rating && $("span", { class: "stars", "aria-label": `${m.rating} out of 5` },
                "★".repeat(m.rating) + "☆".repeat(5 - m.rating)),
              m.note && $("small", {}, m.note)
            )
          )));
      bar.querySelectorAll("button").forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.s === status));
    };
    ["All", ...new Set(SITE.movies.map((m) => m.status).filter(Boolean))].forEach((s) =>
      bar.append($("button", { type: "button", "data-s": s }, s)));
    bar.onclick = (e) => e.target.dataset.s && draw(e.target.dataset.s);
    const el = section("movies", [bar, grid]);
    draw("All");
    return el;
  },

  about: () => section("about", [$("p", { class: "about" }, SITE.about)]),
};

document.getElementById("app").append(
  $("header", {},
    $("a", { class: "brand", href: "#" }, SITE.name),
    $("nav", {}, SITE.sections.map((s) => $("a", { href: "#" + s }, s)))),
  $("div", { class: "hero" }, $("h1", {}, SITE.tagline)),
  $("main", {}, SITE.sections.map((s) => builders[s] && builders[s]())),
  $("footer", {}, SITE.links.map((l) => $("a", { href: l.url }, l.label)))
);
