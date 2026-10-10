// Theme + Settings. Defaults come from config.js; each visitor's choices are saved in their own browser.
const $ = (tag, attrs = {}, ...kids) => {                    // tiny element builder used by every script
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === "") continue;
    k === "class" ? (el.className = v) : el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(Boolean));
  return el;
};

// The choices offered in Settings. Edit these lists to change what people can pick.
const CHOICES = {
  accents: ["#ffc247", "#ff6b6b", "#4cc9f0", "#7bd88f", "#c77dff", "#f78fb3"],
  headingFonts: ["Bricolage Grotesque", "Space Grotesk", "Outfit", "Sora", "Playfair Display", "Fraunces"],
  bodyFonts: ["Instrument Sans", "Inter", "DM Sans", "Work Sans", "IBM Plex Sans", "Lora"],
  // Ready-made looks: one tap sets the background and accent together. "Default" uses config.js.
  presets: [
    { name: "Default" },
    { name: "Ember", bg: "#1b0f12", accent: "#ff6b4a" },
    { name: "Forest", bg: "#0e1a14", accent: "#7bd88f" },
    { name: "Ocean", bg: "#07161f", accent: "#4cc9f0" },
    { name: "Plum", bg: "#16101f", accent: "#c77dff" },
    { name: "Mono", bg: "#141414", accent: "#ffffff" },
    { name: "Snow", bg: "#f4f6fb", accent: "#2563eb" },
  ],
};
const T = SITE.theme;
CHOICES.headingFonts = [...new Set([T.headingFont, ...CHOICES.headingFonts])];
CHOICES.bodyFonts = [...new Set([T.bodyFont, ...CHOICES.bodyFonts])];

const DEFAULTS = { mode: T.defaultMode || "dark", accent: "", bg: "", headingFont: T.headingFont, bodyFont: T.bodyFont,
  size: "m", side: "left", cards: "m", motion: "full", glow: "on", sidehide: "off" };
const KEY = "site-settings";
let S = { ...DEFAULTS };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
const allowed = { mode: ["dark", "light", "auto"], size: ["s", "m", "l"], side: ["left", "right"], cards: ["s", "m", "l"],
  motion: ["full", "reduced"], glow: ["on", "off"], sidehide: ["on", "off"], headingFont: CHOICES.headingFonts, bodyFont: CHOICES.bodyFonts };
for (const [k, list] of Object.entries(allowed)) if (!list.includes(S[k])) S[k] = DEFAULTS[k];
for (const k of ["accent", "bg"]) if (S[k] && !/^#[0-9a-f]{6}$/i.test(S[k])) S[k] = "";
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const lum = (hex) => {                                       // how bright a colour is (0 = black, 1 = white)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const textFor = (bg) => (lum(bg) > 0.4 ? "#141b2d" : "#eef2ff");
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const palette = () => {
  const mode = S.mode === "auto" ? (prefersDark.matches ? "dark" : "light") : S.mode;
  const p = { ...T[mode] };
  if (S.accent) p.accent = S.accent;
  if (S.bg) { p.bg = S.bg; p.text = textFor(S.bg); }          // keep text readable on any background
  return p;
};

const fontLink = $("link", { rel: "stylesheet" });
document.head.append(fontLink);
const apply = () => {
  const p = palette(), r = document.documentElement;
  for (const k of ["bg", "text", "accent"]) r.style.setProperty("--" + k, p[k]);
  r.style.setProperty("--on-accent", lum(p.accent) > 0.45 ? "#101010" : "#ffffff");
  r.style.colorScheme = lum(p.bg) > 0.4 ? "light" : "dark";
  r.style.setProperty("--head", `"${S.headingFont}", system-ui, sans-serif`);
  r.style.setProperty("--body", `"${S.bodyFont}", system-ui, sans-serif`);
  fontLink.href = "https://fonts.googleapis.com/css2?" +
    [...new Set([S.headingFont, S.bodyFont])].map((f) => "family=" + f.replace(/ /g, "+") + ":wght@400;700").join("&") + "&display=swap";
  r.style.fontSize = { s: "90%", m: "100%", l: "115%" }[S.size];
  Object.assign(r.dataset, { cards: S.cards, motion: S.motion, glow: S.glow, sidehide: S.sidehide });
  document.dispatchEvent(new Event("settingschange"));
  document.body.classList.toggle("side-right", S.side === "right");
};
prefersDark.addEventListener("change", () => S.mode === "auto" && apply());

// ---------------- Settings dialog ----------------
const ico = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`)}")`;
const ICONS = {
  dark: ico("<path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/>"),
  light: ico("<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>"),
  auto: ico("<circle cx='12' cy='12' r='9'/><path d='M12 3v18'/>"),
};
const dlg = $("dialog", { class: "settings", "aria-labelledby": "settings-title" });
const card = (title, ...kids) => $("section", { class: "s-card" }, $("h3", {}, title), ...kids);
const row = (label, hint, ctl, inline) => $("div", { class: inline ? "s-row inline" : "s-row" },
  $("div", { class: "s-label" }, $("strong", {}, label), hint && $("small", {}, hint)), ctl);
const seg = (k, opts) => $("div", { class: "sseg", role: "group" }, opts.map(([v, t]) =>
  $("button", { type: "button", "data-k": k, "data-v": v }, ICONS[v] && k === "mode" ? $("span", { class: "ico", style: `--icon:${ICONS[v]}` }) : null, t)));
const select = (k, list, label) => {
  const s = $("select", { "data-select": k, "aria-label": label }, list.map((f) => $("option", { value: f }, f)));
  s.onchange = () => set(k, s.value);
  return s;
};
const sw = (k, on, off, label) => $("button", { type: "button", class: "switch", role: "switch", "data-sw": k, "data-on": on, "data-off": off, "aria-label": label }, $("span"));
const accentIn = $("input", { type: "color", "aria-label": "Custom accent colour" });
const bgIn = $("input", { type: "color", "aria-label": "Custom background colour" });
accentIn.oninput = () => set("accent", accentIn.value);
bgIn.oninput = () => set("bg", bgIn.value);
const swatch = (c) => $("button", { type: "button", class: "swatch", "data-k": "accent", "data-v": c, style: `background:${c}`, "aria-label": `Accent ${c}` });
const preset = (p) => {
  const bg = p.bg || T.dark.bg, ac = p.accent || T.dark.accent;
  return $("button", { type: "button", class: "preset", "data-preset": p.name },
    $("span", { class: "pv", style: `background:${bg}` }, $("i", { style: `background:${ac}` }), $("b", { style: `background:${textFor(bg)}` })), p.name);
};
const closeBtn = $("button", { type: "button", class: "btn", "aria-label": "Close settings" }, "✕");
const reset = $("button", { type: "button", class: "btn" }, "Reset all");
const done = $("button", { type: "button", class: "btn" }, "Done");

function set(k, v) { S[k] = v; save(); apply(); sync(); }
function sync() {
  const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
  dlg.querySelectorAll("[data-k]").forEach((b) => b.setAttribute("aria-pressed", String(same(S[b.dataset.k], b.dataset.v))));
  dlg.querySelectorAll("[data-sw]").forEach((b) => b.setAttribute("aria-checked", String(S[b.dataset.sw] === b.dataset.on)));
  dlg.querySelectorAll("select[data-select]").forEach((s) => (s.value = S[s.dataset.select]));
  dlg.querySelectorAll("[data-preset]").forEach((b) => {
    const p = CHOICES.presets.find((x) => x.name === b.dataset.preset);
    b.setAttribute("aria-pressed", String(p.bg ? same(S.bg, p.bg) && same(S.accent, p.accent) : !S.bg && !S.accent));
  });
  const p = palette();
  accentIn.value = p.accent;
  bgIn.value = p.bg;
}
reset.onclick = () => { S = { ...DEFAULTS }; try { localStorage.removeItem(KEY); } catch {} apply(); sync(); };
done.onclick = closeBtn.onclick = () => dlg.close();
dlg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]"), sb = e.target.closest("button[data-sw]"), pb = e.target.closest("[data-preset]");
  if (b) set(b.dataset.k, b.dataset.v ?? "");
  if (sb) set(sb.dataset.sw, S[sb.dataset.sw] === sb.dataset.on ? sb.dataset.off : sb.dataset.on);
  if (pb) { const p = CHOICES.presets.find((x) => x.name === pb.dataset.preset); S.bg = p.bg || ""; S.accent = p.accent || ""; save(); apply(); sync(); }
  if (e.target === dlg) dlg.close();                          // click on the dark backdrop
});
dlg.append($("div", { class: "panel" },
  $("header", { class: "s-head" }, $("h2", { id: "settings-title" }, "Settings"), closeBtn),
  $("div", { class: "settings-body" },
    card("Appearance",
      row("Mode", "Light, dark, or follow your device", seg("mode", [["dark", "Dark"], ["light", "Light"], ["auto", "Auto"]])),
      row("Theme", "One tap changes the background and accent together", $("div", { class: "presets" }, CHOICES.presets.map(preset)))),
    card("Colours",
      row("Accent colour", "Buttons, highlights and links", $("div", { class: "swatches" }, CHOICES.accents.map(swatch), accentIn,
        $("button", { type: "button", class: "btn", "data-k": "accent" }, "Default"))),
      row("Background colour", "Text colour adjusts itself to stay readable", $("div", { class: "swatches" }, bgIn,
        $("button", { type: "button", class: "btn", "data-k": "bg" }, "Default")))),
    card("Text",
      $("p", { class: "fontprev" }, $("strong", {}, "Heading sample"), $("span", {}, "Body text sample: the quick brown fox jumps over the lazy dog.")),
      row("Heading font", null, select("headingFont", CHOICES.headingFonts, "Heading font")),
      row("Body font", null, select("bodyFont", CHOICES.bodyFonts, "Body font")),
      row("Text size", null, seg("size", [["s", "Small"], ["m", "Medium"], ["l", "Large"]]))),
    card("Layout",
      row("Poster size", "How big the movie and show cards are", seg("cards", [["s", "Small"], ["m", "Medium"], ["l", "Large"]])),
      row("Sidebar position", "On desktop", seg("side", [["left", "Left"], ["right", "Right"]])),
      row("Hide the sidebar", "Desktop only: a small button in the top-left corner opens it", sw("sidehide", "on", "off", "Hide the sidebar"), true)),
    card("Effects",
      row("Background glow", "Soft colour behind the pages and show posters", sw("glow", "on", "off", "Background glow"), true),
      row("Reduce motion", "Turn off animations", sw("motion", "reduced", "full", "Reduce motion"), true))),
  $("footer", { class: "s-foot" }, reset, done)));
document.body.append(dlg);

const openSettings = () => { sync(); dlg.showModal(); };
apply();
sync();
