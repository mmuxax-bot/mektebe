import { t, lang, LANGS, pick } from "./i18n.js";
export { t, lang, pick };

document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

export const $ = (s, el = document) => el.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const fmt = (n) => (lang === "ar" ? Number(n).toLocaleString("ar-EG") : lang === "en" ? Number(n).toLocaleString("en-US") : Number(n).toLocaleString("en-US").replace(/,/g, " "));

export async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
let _cat = null;
export function catalog() {
  if (!_cat) _cat = api("/api/books").then((c) => {
    const byId = new Map();
    for (const s of c.sections) for (const g of s.groups) for (const b of g.books) byId.set(b.id, { ...b, section: g.id === "majmu" ? "majmu" : s.id });
    c.byId = byId;
    return c;
  });
  return _cat;
}

export function header(active) {
  const el = document.createElement("header");
  el.className = "top";
  el.innerHTML = `
    <a class="brand" href="/"><img src="/favicon.svg" alt=""><span>Nibras Library</span><small>· ${esc(t("library"))}</small></a>
    <nav class="nav">
      <a href="/" class="home ${active === "home" ? "on" : ""}">${esc(t("library"))}</a>
      <a href="https://nibrascode.com/ai" class="ai">Nibras AI</a>
      <a href="https://nibrascode.com" class="site">nibrascode.com</a>
      <select class="lang" aria-label="Language">${LANGS.map(([k, l]) => `<option value="${k}" ${k === lang ? "selected" : ""}>${l}</option>`).join("")}</select>
    </nav>`;
  el.querySelector(".lang").addEventListener("change", (e) => {
    localStorage.setItem("nl:lang", e.target.value);
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    location.href = u.toString();
  });
  document.body.prepend(el);
  return el;
}
export function footer() {
  const f = document.createElement("footer");
  f.className = "foot";
  f.innerHTML = `<span dir="ltr">© Nibras Code 2026</span> · <a href="https://nibrascode.com">nibrascode.com</a>`;
  // CC BY 4.0 müəllif qeydi (yalnız foto olan ana səhifədə)
  if (document.querySelector("main.home")) f.insertAdjacentHTML("beforeend", `<small class="credit" dir="ltr">Quran photo: <a href="https://commons.wikimedia.org/wiki/File:Qur%27an_and_Rehal.jpg" target="_blank" rel="noopener">sayyed shahab-o-din vajedi</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> (cropped)</small>`);
  document.body.append(f);
}

// ---------- örtük (üz qabığı): ərəbcə ad, müəllif, səhifə sayı
const HUE = { "ibn-taymiyyah": [200, 165], nahw: [350, 20], hadith: [140, 110], majmu: [222, 222] };
function hueOf(b) {
  const [a, z] = HUE[b.section] || [220, 220];
  let h = 0;
  for (const c of b.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return a + ((h % 1000) / 1000) * (z - a);
}
export const countLabel = (b) => (b.kind === "hd" ? t("hadithN", { n: fmt(b.pages) }) : t("pagesN", { n: fmt(b.pages) }));
export function coverHTML(b, cls = "") {
  const title = String(b.ar || "").split(" - ")[0];
  const fs = title.length > 60 ? 14 : title.length > 40 ? 16 : title.length > 22 ? 18 : title.length > 12 ? 21 : 25;
  return `<div class="cover ${cls}" style="--h:${hueOf(b).toFixed(0)};--fs:${fs}px"><div class="ct">${esc(title)}</div><div class="ca">${esc(b.author)}</div><div class="cp">${esc(countLabel(b))}</div></div>`;
}
export const bookName = (b) => (lang === "ar" ? b.ar : pick(b.name) || b.ar);
export const bookUrl = (b, p) => `/kitab/${encodeURIComponent(b.id)}${p ? "?p=" + p : ""}`;

// ---------- son oxunan səhifələr (localStorage)
const KEY = "nl:last";
export function lastRead() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveLast(id, p) {
  const all = lastRead();
  all[id] = { p, at: Date.now() };
  const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)));
}

export function removeLast(id) {
  const all = lastRead();
  delete all[id];
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function clearLast() {
  localStorage.removeItem(KEY);
}

// snippet + hl -> HTML
export function markHTML(s, hl = []) {
  let out = "";
  let i = 0;
  for (const [a, z] of hl) {
    if (a < i) continue;
    out += esc(s.slice(i, a)) + "<mark>" + esc(s.slice(a, z)) + "</mark>";
    i = z;
  }
  return out + esc(s.slice(i));
}
export function toast(msg) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 2200);
}

// ---------- bölmələr (ana səhifə kartları və /bolme/<id> səhifələri)
export const SECTIONS = {
  "ibn-taymiyyah": { k: "it", icon: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" },
  nahw: { k: "nahw", icon: "M4 19V5m0 0h9a4 4 0 0 1 0 8H4m0 0h10a3 3 0 0 1 0 6H4" },
  hadith: { k: "hadith", icon: "M7 4h12v13a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2v-2h12v2M7 4a2 2 0 0 0-2 2v10M10 8h6M10 12h6" },
  majmu: { k: "majmu", icon: "M4 5h4v14H4zM10 5h4v14h-4zM16 6l3.5-1 3 13.5-3.5 1z" },
};
export const secTitle = (id) => t("sec_" + (SECTIONS[id] || {}).k);
export const secDesc = (id) => t("desc_" + (SECTIONS[id] || {}).k);
export const sectionUrl = (id) => `/bolme/${encodeURIComponent(id)}`;
export const sectionBooks = (s) => s.groups.flatMap((g) => g.books);
export const bookSub = (b) => [b.death ? t("death", { y: fmt(b.death) }) : "", b.volumes > 1 ? t("volsN", { n: fmt(b.volumes) }) : "", countLabel(b)].filter(Boolean).join(" · ");
export const bookCard = (b) =>
  `<a class="book" href="${bookUrl(b)}" data-f="${esc((b.ar + " " + Object.values(b.name || {}).join(" ") + " " + b.author).toLowerCase())}">${coverHTML(b)}<div class="meta"><div class="nm">${esc(bookName(b))}</div><div class="sub">${esc(bookSub(b))}</div></div></a>`;
export function hitHTML(h, cat, q) {
  const b = cat.byId.get(h.book);
  const url = h.url || `${bookUrl(b, h.p)}&q=${encodeURIComponent(q)}`;
  return `<div class="hit"><a class="h1" href="${esc(url)}"><b>${esc(b.ar)}</b><span>${esc(h.ref)}${h.title ? " · " + esc(h.title) : ""}</span></a><a class="s" href="${esc(url)}">${markHTML(h.s, h.hl)}</a><a class="openb sm" href="${esc(url)}">${esc(t("openInBook"))} →</a></div>`;
}
