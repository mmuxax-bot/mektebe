import { t, lang, LANGS, pick } from "./i18n.js?v=rtl2pg1";
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
    for (const s of c.sections) for (const g of s.groups) for (const b of g.books) { b.section = g.id === "majmu" ? "majmu" : s.id; byId.set(b.id, b); }
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
      <a href="/ai" class="ai">Library AI</a>
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
  f.innerHTML = `<span dir="ltr">© Nibras Code 2026</span> · <a href="/about">${esc(t("about"))}</a> · <a href="https://nibrascode.com">nibrascode.com</a>`;
  document.body.append(f);
}

// ---------- örtük (üz qabığı): Məcmuul-fətava cildləri ilə eyni üslub; ərəbcə ad, müəllif, Nibras Code medalyonu, «NibrasCode.com»
// bölmə rəngi CSS-də (.cover[data-s]); Məcmuul-fətava İbn Teymiyyə bölməsinin rəngindədir
export const countLabel = (b) => (b.kind === "hd" ? t("hadithN", { n: fmt(b.pages) }) : t("pagesN", { n: fmt(b.pages) }));
const EMBLEM = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 20c7-3 13.5-2 19 2.4v26.4c-5.5-4-12-5-19-2.4z" fill="currentColor"/><path d="M52 20c-7-3-13.5-2-19 2.4v26.4c5.5-4 12-5 19-2.4z" fill="currentColor" opacity=".72"/><path d="M32 7l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="currentColor"/></svg>`;
// ---------- Mushaf üz qabığı (Quran kartı): kitab üz qabıqları ailəsindən, daha zərif — tünd firuzəyi-qara dəri, qızılı şəmsə, «القرآن الكريم»
export function quranCoverHTML(cls = "") {
  return `<div class="cover qcover ${cls}" data-s="mushaf" role="img" aria-label="القرآن الكريم — NibrasCode.com"><svg class="qsvg" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="qg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0bd"/><stop offset=".45" stop-color="#e2bd62"/><stop offset=".7" stop-color="#a97b2c"/><stop offset="1" stop-color="#f0d68b"/></linearGradient><radialGradient id="qgd"><stop offset="0" stop-color="#f3d98c"/><stop offset="1" stop-color="#a97b2c"/></radialGradient></defs><rect x="11" y="11" width="160" height="278" rx="2" fill="none" stroke="url(#qg)" stroke-width="1"/><g transform="translate(91 44)"><circle r="13" fill="var(--qc2)" stroke="url(#qg)" stroke-width="1"/><circle r="15.5" fill="none" stroke="url(#qg)" stroke-width=".5" opacity=".7"/><g transform="translate(-9 -10) scale(.28)" fill="url(#qg)"><path d="M12 20c7-3 13.5-2 19 2.4v26.4c-5.5-4-12-5-19-2.4z"/><path d="M52 20c-7-3-13.5-2-19 2.4v26.4c5.5-4 12-5 19-2.4z" opacity=".75"/><path d="M32 7l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/></g></g><polygon points="91.0,86.0 101.1,99.0 115.5,90.9 119.9,106.8 136.3,104.7 134.2,121.1 150.1,125.5 142.0,139.9 155.0,150.0 142.0,160.1 150.1,174.5 134.2,178.9 136.3,195.3 119.9,193.2 115.5,209.1 101.1,201.0 91.0,214.0 80.9,201.0 66.5,209.1 62.1,193.2 45.7,195.3 47.8,178.9 31.9,174.5 40.0,160.1 27.0,150.0 40.0,139.9 31.9,125.5 47.8,121.1 45.7,104.7 62.1,106.8 66.5,90.9 80.9,99.0" fill="url(#qgd)" opacity=".1"/><polygon points="91.0,86.0 101.1,99.0 115.5,90.9 119.9,106.8 136.3,104.7 134.2,121.1 150.1,125.5 142.0,139.9 155.0,150.0 142.0,160.1 150.1,174.5 134.2,178.9 136.3,195.3 119.9,193.2 115.5,209.1 101.1,201.0 91.0,214.0 80.9,201.0 66.5,209.1 62.1,193.2 45.7,195.3 47.8,178.9 31.9,174.5 40.0,160.1 27.0,150.0 40.0,139.9 31.9,125.5 47.8,121.1 45.7,104.7 62.1,106.8 66.5,90.9 80.9,99.0" fill="none" stroke="url(#qg)" stroke-width="1.3"/><circle cx="91" cy="150" r="49" fill="var(--qc2)" stroke="url(#qg)" stroke-width="1"/><polygon points="91.0,108.0 103.2,120.4 120.7,120.3 120.6,137.8 133.0,150.0 120.6,162.2 120.7,179.7 103.2,179.6 91.0,192.0 78.8,179.6 61.3,179.7 61.4,162.2 49.0,150.0 61.4,137.8 61.3,120.3 78.8,120.4" fill="none" stroke="url(#qg)" stroke-width=".6" opacity=".55"/><text x="91" y="146" text-anchor="middle" font-family="Amiri, 'Noto Naskh Arabic', serif" font-weight="700" font-size="25" fill="url(#qg)" direction="rtl">القرآن</text><text x="91" y="172" text-anchor="middle" font-family="Amiri, 'Noto Naskh Arabic', serif" font-weight="700" font-size="21" fill="url(#qg)" direction="rtl">الكريم</text><path d="M61 238h24M97 238h24" stroke="url(#qg)" stroke-width=".7"/><path d="M91 233l5 5-5 5-5-5z" fill="url(#qg)"/><text x="91" y="276" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="9.5" letter-spacing=".6" fill="#d9bd75" direction="ltr">NibrasCode.com</text></svg></div>`;
}
export function coverHTML(b, cls = "") {
  const title = String(b.ar || "").split(" - ")[0];
  // başlıq uzunluğuna görə avtomatik ölçü (ən uzun söz də nəzərə alınır) — 3 sətrə sığsın
  const n = title.length, w = Math.max(...title.split(/\s+/).map((x) => x.length), 1);
  const k = Math.min(n > 48 ? 0.66 : n > 34 ? 0.76 : n > 22 ? 0.86 : n > 12 ? 1 : 1.12, w > 9 ? 0.8 : w > 7 ? 0.92 : 1.12);
  const sec = b.section === "majmu" ? "ibn-taymiyyah" : b.section || "";
  return `<div class="cover ${cls}" data-s="${esc(sec)}" style="--k:${k}"><i class="cfr"></i><span class="cem" title="Nibras Code">${EMBLEM}</span><div class="cbd"><div class="ct">${esc(title)}</div>${b.author ? `<div class="ca">${esc(b.author)}</div>` : ""}</div><div class="cbr">NibrasCode.com</div></div>`;
}
export const bookName = (b) => (lang === "ar" ? b.ar : pick(b.name) || b.ar);
// Məcmuul-fətava öz müstəqil səhifəsində açılır (/fatawa/); səhifə nömrəsi eynidir (1-dən ardıcıl)
export const bookUrl = (b, p) => (b.id === "majmu" ? `/fatawa/${p ? "#/p/" + p : ""}` : `/kitab/${encodeURIComponent(b.id)}${p ? "?p=" + p : ""}`);

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
  const url = h.url || `${bookUrl(b, h.p)}${b.id === "majmu" ? "?" : "&"}q=${encodeURIComponent(q)}`;
  return `<div class="hit"><a class="h1" href="${esc(url)}"><b>${esc(b.ar)}</b><span>${esc(h.ref)}${h.title ? " · " + esc(h.title) : ""}</span></a><a class="s" href="${esc(url)}">${markHTML(h.s, h.hl)}</a><a class="openb sm" href="${esc(url)}">${esc(t("openInBook"))} →</a></div>`;
}
