// public/fatawa/privacy.html — müstəqil məxfilik siyasəti (Google Play üçün URL). Mənbə: public/fatawa/js/privacy-text.js
// İşlətmək: node scripts/build-fatawa-privacy.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PRIVACY, EMAIL } = await import(pathToFileURL(path.join(root, "public/fatawa/js/privacy-text.js")).href);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAME = { ar: "العربية", az: "Azərbaycanca", en: "English", tr: "Türkçe", ru: "Русский" };
const ORDER = ["ar", "az", "en", "tr", "ru"];
const sec = (k) => {
  const P = PRIVACY[k];
  const rtl = k === "ar";
  return `<section id="${k}" lang="${k}" dir="${rtl ? "rtl" : "ltr"}" class="${rtl ? "ar" : ""}">
<h1>${esc(P.title)}</h1>
<p class="app">${esc(P.app)}</p>
<p class="meta"><span>${esc(P.eff)}</span><span>${esc(P.dev)}</span></p>
<p>${esc(P.intro)}</p>
<ol>${P.s.map(([h, b]) => `<li><h2>${esc(h)}</h2><p>${esc(b)}</p></li>`).join("")}</ol>
<p class="contact">${esc(P.contact)} <a href="mailto:${EMAIL}" dir="ltr">${EMAIL}</a></p>
<p class="top"><a href="#top">↑</a></p>
</section>`;
};
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>سياسة الخصوصية — مجموع الفتاوى · Privacy Policy — Majmu' al-Fatawa</title>
<meta name="description" content="Privacy Policy of the Majmu' al-Fatawa app by Nibras Code: works offline, collects no personal data, no accounts, no ads, analytics or trackers.">
<meta name="theme-color" content="#16302a">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<style>
@font-face { font-family: "Amiri"; src: url("fonts/amiri-ar-400.woff2") format("woff2"); font-display: swap; }
:root { --bg: #0b1512; --card: #10201b; --line: rgba(212, 175, 95, 0.22); --text: #e9eee9; --muted: #9fb0a8; --gold: #d4af5f; --gold2: #e9cf8a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15.5px/1.75 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif; }
.wrap { max-width: 760px; margin: 0 auto; padding: 18px 16px 40px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.brand { font-family: "Amiri", serif; font-size: 24px; color: var(--gold2); text-decoration: none; }
nav { display: flex; flex-wrap: wrap; gap: 6px; }
nav a { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); color: var(--text); text-decoration: none; font-size: 14px; }
nav a:hover { border-color: var(--gold); color: var(--gold2); }
section { margin-top: 22px; padding: 20px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); }
section.ar { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 19px; }
h1 { margin: 0; font-size: 1.5em; color: var(--gold2); }
h2 { margin: 0 0 2px; font-size: 1.05em; }
.app { margin: 2px 0 8px; color: var(--muted); }
.meta { display: flex; flex-wrap: wrap; gap: 4px 18px; color: var(--gold); font-weight: 600; font-size: .92em; }
ol { padding-inline-start: 1.3em; }
li { margin: 12px 0; }
li::marker { color: var(--gold); font-weight: 700; }
section.ar ol { list-style: arabic-indic; }
li p { margin: 0; }
a { color: var(--gold2); }
.contact a { font-family: system-ui, sans-serif; font-weight: 600; }
.top { text-align: end; margin: 0; }
footer { margin-top: 28px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<div class="wrap" id="top">
<header><a class="brand" href="./">مجموع الفتاوى</a><nav aria-label="Language">${ORDER.map((k) => `<a href="#${k}" lang="${k}">${NAME[k]}</a>`).join("")}</nav></header>
${ORDER.map(sec).join("\n")}
<footer><div>V1.0.0</div><div dir="ltr">© Nibras Code 2026 · <a href="mailto:${EMAIL}">${EMAIL}</a></div></footer>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(root, "public/fatawa/privacy.html"), html);
console.log("privacy.html", html.length, "bayt");
