// Builds show.html?show=<id> from shows.js, using the same theme as the home page.
const $ = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === "") continue;
    k === "class" ? (el.className = v) : el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(Boolean));
  return el;
};

const T = SITE.theme;
const root = document.documentElement.style;
for (const k of ["bg", "surface", "text", "muted", "accent"]) root.setProperty("--" + k, T[k]);
root.setProperty("--head", `"${T.headingFont}", system-ui, sans-serif`);
root.setProperty("--body", `"${T.bodyFont}", system-ui, sans-serif`);
const fams = [T.headingFont, T.bodyFont].map((f) => "family=" + f.replace(/ /g, "+") + ":wght@400;700").join("&");
document.head.append($("link", { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?${fams}&display=swap` }));

const id = new URLSearchParams(location.search).get("show");
const show = SHOWS[id];
const app = document.getElementById("app");
const header = $("header", {},
  $("a", { class: "brand", href: "index.html" }, SITE.name),
  $("nav", {}, $("a", { href: "index.html#movies" }, "movies")));

if (!show) {
  app.append(header, $("section", {}, $("h2", {}, "Show not found"), $("p", {}, "Pick one from the movies page.")));
} else {
  document.title = `${show.title} - ${SITE.name}`;
  const names = Object.keys(show.seasons);
  const label = (n) => n.replace(/^S(\d+)$/, "Season $1");
  // The cover comes from shows.js, or from the poster on the matching movie tile in config.js.
  const tile = SITE.movies.find((m) => (m.url || "").includes("show=" + id));
  const cover = show.poster || (tile && tile.poster);

  const select = $("select", { "aria-label": "Season" }, names.map((n) => $("option", { value: n }, label(n))));
  const prev = $("button", { type: "button", "aria-label": "Previous season" }, "‹");
  const next = $("button", { type: "button", "aria-label": "Next season" }, "›");
  const list = $("ol", { class: "episodes" });

  const row = (e, i) => {
    const inner = [
      e.thumb ? $("img", { src: e.thumb, alt: "", loading: "lazy" }) : $("div", { class: "thumb" }, String(i)),
      $("div", {}, $("strong", {}, `${i}. ${e.title}`), e.date && $("small", {}, e.date)),
    ];
    return $("li", {}, e.url
      ? $("a", { class: "ep", href: e.url, target: "_blank", rel: "noopener noreferrer" }, inner)
      : $("div", { class: "ep" }, inner));
  };

  const draw = (n) => {
    const eps = show.seasons[n];
    const at = names.indexOf(n);
    select.value = n;
    prev.disabled = at === 0;
    next.disabled = at === names.length - 1;
    try { history.replaceState(null, "", "#" + encodeURIComponent(n)); } catch {}
    list.replaceChildren(...(eps.length
      ? eps.map((e, i) => row(e, i + 1))
      : [$("li", { class: "empty" }, "No episodes yet.")]));
  };

  prev.onclick = () => draw(names[names.indexOf(select.value) - 1]);
  next.onclick = () => draw(names[names.indexOf(select.value) + 1]);
  select.onchange = () => draw(select.value);

  app.append(header, $("main", { class: "show" },
    $("aside", {},
      $("figure", { class: "poster" },
        cover ? $("img", { src: cover, alt: show.title }) : $("div", { class: "noposter" }, show.title)),
      $("h1", {}, show.title),
      $("p", {}, show.description)),
    $("div", {}, $("div", { class: "seasonbar" }, prev, select, next), list)));

  const wanted = decodeURIComponent(location.hash.slice(1));
  draw(names.includes(wanted) ? wanted : names[0]);
}
