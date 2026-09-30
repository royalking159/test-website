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
};
const T = SITE.theme;
CHOICES.headingFonts = [...new Set([T.headingFont, ...CHOICES.headingFonts])];
CHOICES.bodyFonts = [...new Set([T.bodyFont, ...CHOICES.bodyFonts])];

const DEFAULTS = { mode: T.defaultMode || "dark", accent: "", bg: "", headingFont: T.headingFont, bodyFont: T.bodyFont, size: "m", side: "left" };
const KEY = "site-settings";
let S = { ...DEFAULTS };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
const allowed = { mode: ["dark", "light", "auto"], size: ["s", "m", "l"], side: ["left", "right"], headingFont: CHOICES.headingFonts, bodyFont: CHOICES.bodyFonts };
for (const [k, list] of Object.entries(allowed)) if (!list.includes(S[k])) S[k] = DEFAULTS[k];
for (const k of ["accent", "bg"]) if (S[k] && !/^#[0-9a-f]{6}$/i.test(S[k])) S[k] = "";
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const lum = (hex) => {                                       // how bright a colour is (0 = black, 1 = white)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const palette = () => {
  const mode = S.mode === "auto" ? (prefersDark.matches ? "dark" : "light") : S.mode;
  const p = { ...T[mode] };
  if (S.accent) p.accent = S.accent;
  if (S.bg) { p.bg = S.bg; p.text = lum(S.bg) > 0.4 ? "#141b2d" : "#eef2ff"; }   // keep text readable on any background
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
  document.body.classList.toggle("side-right", S.side === "right");
};
prefersDark.addEventListener("change", () => S.mode === "auto" && apply());

// ---- Settings dialog ----
const dlg = $("dialog", { class: "settings", "aria-labelledby": "settings-title" });
const group = (label, ...ctl) => $("fieldset", {}, $("legend", {}, label), ...ctl);
const seg = (k, opts) => $("div", { class: "seg" }, opts.map(([v, t]) => $("button", { type: "button", "data-k": k, "data-v": v }, t)));
const select = (k, list, label) => {
  const s = $("select", { "data-select": k, "aria-label": label }, list.map((f) => $("option", { value: f }, f)));
  s.onchange = () => set(k, s.value);
  return s;
};
const accentIn = $("input", { type: "color", "aria-label": "Custom accent colour" });
const bgIn = $("input", { type: "color", "aria-label": "Custom background colour" });
accentIn.oninput = () => set("accent", accentIn.value);
bgIn.oninput = () => set("bg", bgIn.value);
const swatch = (c) => $("button", { type: "button", class: "swatch", "data-k": "accent", "data-v": c, style: `background:${c}`, "aria-label": `Accent ${c}` });
const reset = $("button", { type: "button", class: "btn" }, "Reset all");
const done = $("button", { type: "button", class: "btn" }, "Done");

function set(k, v) { S[k] = v; save(); apply(); sync(); }
function sync() {
  dlg.querySelectorAll("[data-k]").forEach((b) =>
    b.setAttribute("aria-pressed", String(String(S[b.dataset.k]).toLowerCase() === (b.dataset.v ?? "").toLowerCase())));
  dlg.querySelectorAll("select[data-select]").forEach((s) => (s.value = S[s.dataset.select]));
  const p = palette();
  accentIn.value = p.accent;
  bgIn.value = p.bg;
}
reset.onclick = () => { S = { ...DEFAULTS }; try { localStorage.removeItem(KEY); } catch {} apply(); sync(); };
done.onclick = () => dlg.close();
dlg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (b) set(b.dataset.k, b.dataset.v ?? "");
  if (e.target === dlg) dlg.close();                          // click on the dark backdrop
});
dlg.append($("div", { class: "panel" },
  $("h2", { id: "settings-title" }, "Settings"),
  group("Mode", seg("mode", [["dark", "Dark"], ["light", "Light"], ["auto", "Auto"]])),
  group("Accent colour", $("div", { class: "swatches" }, CHOICES.accents.map(swatch), accentIn,
    $("button", { type: "button", class: "btn", "data-k": "accent" }, "Default"))),
  group("Background colour", $("div", { class: "swatches" }, bgIn,
    $("button", { type: "button", class: "btn", "data-k": "bg" }, "Default"))),
  group("Heading font", select("headingFont", CHOICES.headingFonts, "Heading font")),
  group("Body font", select("bodyFont", CHOICES.bodyFonts, "Body font")),
  group("Text size", seg("size", [["s", "Small"], ["m", "Medium"], ["l", "Large"]])),
  group("Sidebar position (on desktop)", seg("side", [["left", "Left"], ["right", "Right"]])),
  $("div", { class: "actions" }, reset, done)));
document.body.append(dlg);

const openSettings = () => { sync(); dlg.showModal(); };
apply();
sync();
