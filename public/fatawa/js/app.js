// Məcmuul-fətava: müstəqil bölmə (qovluq başqa yerə və ya tətbiqə köçürülə bilər). Marşrutlar hash ilə:
//   #/            yalnız 35 cild (kitab üz qabıqları); axtarış — başlıqdakı lupa, ayarlar — dişli çarx
//   #/settings    ayarlar: dil, şrift ölçüsü, görünüş, ərəb şrifti, hərəkələr, davam et, cild/səhifə keçidi, kitab haqqında
//   #/privacy     məxfilik siyasəti (müstəqil nüsxə: privacy.html)
//   #/v/3         3-cü cildin mündəricatı
//   #/s?q=…&v=3   axtarış (v: yalnız həmin cild)
//   #/p/1234?q=…  oxucu (1-dən başlayan ardıcıl səhifə; q: vurğulanan sözlər)
//   #/j/3/10      3-cü cild, 10-cu səhifə (çap nömrəsi) -> oxucu
import { t, fmt, arNum, lang, LANGS } from "./i18n.js";
import { PRIVACY, EMAIL } from "./privacy-text.js";
import { meta, page, prefetch, volToc, resolve } from "./data.js";
import { tokens, tokenSpans } from "./tok.js";

document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const app = $("#app");
const CFG = window.FATAWA_CONFIG || {}; // {libraryUrl, aiUrl} — tətbiqdə gizlədilə bilər
const LIB = CFG.libraryUrl ?? "/";
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const ref = (p) => "ج " + arNum(p.vol) + "، " + (p.ap ? "ملحق " : "") + "ص " + arNum(p.page);

// ---------------------------------------------------------------- ayarlar (localStorage)
const SET = {
  theme: store.get("ft:theme", "dark"), // dark | light | sepia
  font: store.get("ft:font", "amiri"), // amiri | naskh
  tashkil: store.get("ft:tashkil", true),
};
function applySettings() {
  const h = document.documentElement;
  h.dataset.theme = SET.theme;
  h.dataset.font = SET.font;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", SET.theme === "light" ? "#f6f7fb" : SET.theme === "sepia" ? "#efe4c9" : "#05060c");
}
applySettings();
// hərəkələri gizlətmək (yalnız göstərişdə; mətnin özü dəyişmir)
const TASH = /[\u064B-\u0652\u0670]/g;
const shown = (html) => (SET.tashkil ? html : html.replace(TASH, ""));

// ---------------------------------------------------------------- başlıq / altlıq
function chrome() {
  const top = document.createElement("header");
  top.className = "top";
  top.innerHTML = `<a class="brand" href="#/"><span class="logo" aria-hidden="true">${ICON.book}</span><span class="ar">${esc(t("home"))}</span></a>
    <nav class="nav"><a class="hbtn hidden" id="hCont" href="#/" title="${esc(t("contRead"))}" aria-label="${esc(t("contRead"))}">${ICON.bookmark}</a>
    <button class="hbtn" id="hSearch" type="button" title="${esc(t("search"))}" aria-label="${esc(t("search"))}">${ICON.search}</button>
    <a class="hbtn" id="hSet" href="#/settings" title="${esc(t("settings"))}" aria-label="${esc(t("settings"))}">${ICON.gear}</a></nav>`;
  document.body.prepend(top);
  $("#hSearch").onclick = () => openSearch();
  const f = document.createElement("footer");
  f.className = "foot";
  f.innerHTML = `<span dir="ltr">© Nibras Code 2026</span>`;
  document.body.append(f);
}
// başlıqdakı «davam et» nişanı: yalnız oxunan səhifə varsa
function updCont() {
  const last = store.get("ft:last", null);
  const el = $("#hCont");
  if (!el) return;
  el.classList.toggle("hidden", !(last && last.p) || document.body.classList.contains("reading"));
  if (last && last.p) el.href = "#/p/" + last.p;
}
const sv = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const SIC = {
  book: sv(`<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>`),
  jump: sv(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  palette: sv(`<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>`),
  sun: sv(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  size: sv(`<path d="M4 18 9 6l5 12M5.8 14h6.4M15 18l3-7 3 7M16 16h4"/>`),
  font: sv(`<path d="M5 19c3 0 4-3 5-7s2-7 5-7M7 11h8M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>`),
  tashkil: sv(`<path d="M4 17h16M7 9l4-2M13 7l4-2M9 21h.01M15 21h.01"/>`),
  globe: sv(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`),
  link: sv(`<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`),
  info: sv(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`),
  mail: sv(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>`),
  shield: sv(`<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>`),
  spark: sv(`<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>`),
  chev: sv(`<path d="m6 9 6 6 6-6"/>`),
};
const LNAME = { ar: "العربية", az: "Azərbaycanca", en: "English", tr: "Türkçe", ru: "Русский" };
const ICON = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3.5-1 3 13.5-3.5 1z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  toc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
};
function crumbs(list) {
  $("#crumbs").innerHTML = list.map(([href, label], i) => (i === list.length - 1 ? `<b>${esc(label)}</b>` : `<a href="${esc(href)}">${esc(label)}</a><span>›</span>`)).join("");
  $("#crumbs").hidden = false;
}
const baseCrumbs = () => [...(LIB ? [[LIB, t("library")], [LIB.replace(/\/$/, "") + "/bolme/ibn-taymiyyah", t("it")]] : []), ["#/", t("home")]];

// ---------------------------------------------------------------- marşrut
function route() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = h.split("?");
  const q = new URLSearchParams(qs || "");
  const parts = path.split("/").filter(Boolean);
  document.body.classList.toggle("reading", parts[0] === "p");
  document.body.classList.toggle("is-home", !parts.length);
  document.body.classList.toggle("is-set", parts[0] === "settings" || parts[0] === "privacy");
  closeSearch(true);
  window.scrollTo(0, 0);
  updCont();
  if (parts[0] === "settings") return viewSettings();
  if (parts[0] === "privacy") return viewPrivacy();
  if (parts[0] === "v") return viewVolume(Number(parts[1]));
  if (parts[0] === "s") return viewSearch(q.get("q") || "", Number(q.get("v")) || 0);
  if (parts[0] === "p") return viewReader(Number(parts[1]) || 1, q.get("q") || "", q.get("i") === "1");
  if (parts[0] === "j") return jumpTo(parts[1], parts[2]);
  return viewHome();
}
addEventListener("hashchange", route);
const loading = () => (app.innerHTML = `<p class="muted pad">${esc(t("loading"))}</p>`);
const failed = () => {
  app.innerHTML = `<div class="pad"><p class="muted">${esc(t("error"))}</p><button class="btn ghost sm" id="retry" type="button">↻ ${esc(t("retry"))}</button></div>`;
  $("#retry").onclick = () => route();
};

async function jumpTo(v, pg) {
  const d = await resolve(v, pg).catch(() => null);
  if (d == null) return (location.hash = "#/"), toast(t("noPage"));
  location.replace("#/p/" + (d + 1));
}

// ---------------------------------------------------------------- ana səhifə
function searchForm(q = "", vol = 0, vols = []) {
  return `<form class="sform" id="sform"><div class="sbox">${ICON.search}<input id="sq" type="search" dir="rtl" lang="ar" enterkeyhint="search" autocomplete="off" placeholder="${esc(t("searchPh"))}" value="${esc(q)}"></div>
    ${vols.length ? `<select id="sv" aria-label="${esc(t("inVol"))}"><option value="0">${esc(t("allVols"))}</option>${vols.map((v) => `<option value="${v.n}" ${v.n === vol ? "selected" : ""}>${esc(t("vol"))} ${fmt(v.n)}</option>`).join("")}</select>` : ""}
    <button class="btn" type="submit">${esc(t("search"))}</button></form>`;
}
function bindSearch() {
  const f = $("#sform");
  if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault();
    const q = $("#sq").value.trim();
    const v = $("#sv") ? Number($("#sv").value) : 0;
    if (!q) return;
    location.hash = "#/s?q=" + encodeURIComponent(q) + (v ? "&v=" + v : "");
  };
}
function jumpForm(vols, cur = 1) {
  return `<form class="jform" id="jform"><label>${esc(t("vol"))}<select id="jv">${vols.map((v) => `<option value="${v.n}" ${v.n === cur ? "selected" : ""}>${fmt(v.n)} — ${esc(v.title)}</option>`).join("")}</select></label>
    <label>${esc(t("page"))}<input id="jp" type="number" min="1" inputmode="numeric" placeholder="١"></label><button class="btn ghost" type="submit">${esc(t("go"))}</button></form>`;
}
function bindJump() {
  const f = $("#jform");
  if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault();
    const v = Number($("#jv").value);
    const p = Number($("#jp").value) || 1;
    location.hash = `#/j/${v}/${p}`;
  };
}
async function viewHome() {
  document.title = `${t("title")} — Nibras Library`;
  $("#crumbs").hidden = true;
  loading();
  let m;
  try { m = await meta(); } catch { return failed(); }
  const heads = await Promise.all(m.vols.map((v) => volToc(v.n).then((x) => x.length)));
  // hər cild ayrıca kitab: ortaq dəri üz qabığı (img/cover.webp: çərçivə, «مجموع الفتاوى», «شيخ الإسلام ابن تيمية»), üstündə cild nömrəsi və mövzusu
  const tile = (v, i) => {
    const [a, b] = v.title.split(/:\s*/);
    const len = a.length;
    return `<a class="vbook" href="#/v/${v.n}" title="الجزء ${arNum(v.n)}: ${esc(v.title)}"><div class="bk"><div class="vcover" style="--fs:${len > 16 ? 0.86 : len > 11 ? 0.95 : 1.05}"><span class="vnum"><b>${arNum(v.n)}</b></span><span class="vtt"><span class="gold">${esc(a)}</span>${b ? `<small class="gold">${esc(b)}</small>` : ""}</span></div></div><div class="vmeta">${esc(t("pagesN", { n: fmt(v.count) }))} · ${esc(t("headsN", { n: fmt(heads[i]) }))}</div></a>`;
  };
  app.innerHTML = `<h1 class="sr">${esc(t("title"))}</h1><section class="volumes"><div class="shelf">${m.vols.map((v, i) => tile(v, i)).join("")}</div></section>`;
}

// ---------------------------------------------------------------- axtarış paneli (başlıqdakı lupa)
const EXAMPLES = ["التوسل", "لا تشد الرحال", "الصبر على البلاء", "طلاق الثلاث", "زيارة القبور", "الأسماء والصفات"];
let ovOpen = false;
async function openSearch() {
  if (ovOpen) return;
  ovOpen = true;
  const m = await meta().catch(() => ({ vols: [] }));
  const cur = (location.hash.match(/^#\/(?:v|p)\/(\d+)/) || [])[1];
  const curVol = location.hash.startsWith("#/v/") ? Number(cur) : location.hash.startsWith("#/p/") && m.pv ? m.pv[Number(cur) - 1] : 0;
  const ov = document.createElement("div");
  ov.className = "sov";
  ov.id = "sov";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.innerHTML = `<div class="sovin"><div class="sovhd"><h2>${esc(t("searchTitle"))}</h2><button class="hbtn" id="sovx" type="button" aria-label="${esc(t("close"))}">${ICON.x}</button></div>
    <form class="sform" id="ovf"><div class="sbox">${ICON.search}<input id="ovq" type="search" dir="rtl" lang="ar" enterkeyhint="search" autocomplete="off" placeholder="${esc(t("searchPh"))}"></div><button class="btn" type="submit">${esc(t("search"))}</button></form>
    <label class="ovvol">${esc(t("searchIn"))}<select id="ovv"><option value="0">${esc(t("allVols"))}</option>${m.vols.map((v) => `<option value="${v.n}" ${v.n === curVol ? "selected" : ""}>${esc(t("vol"))} ${fmt(v.n)} — ${esc(v.title)}</option>`).join("")}</select></label>
    <p class="ovex muted">${esc(t("ex"))}</p><div class="ovchips">${EXAMPLES.map((x) => `<button type="button" class="chip ar" data-q="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`;
  document.body.append(ov);
  document.body.classList.add("ov-open");
  history.pushState({ ov: 1 }, "", location.href);
  const go = (q) => {
    q = q.trim();
    if (!q) return;
    const v = Number($("#ovv").value);
    // panelin tarix qeydi nəticə səhifəsi ilə əvəz olunur: «geri» əvvəlki səhifəyə qayıdır
    closeSearch(true);
    history.replaceState(null, "", "#/s?q=" + encodeURIComponent(q) + (v ? "&v=" + v : ""));
    route();
  };
  $("#ovf").onsubmit = (e) => (e.preventDefault(), go($("#ovq").value));
  ov.querySelectorAll(".ovchips .chip").forEach((c) => (c.onclick = () => go(c.dataset.q)));
  $("#sovx").onclick = () => history.back();
  ov.onclick = (e) => { if (e.target === ov) history.back(); };
  setTimeout(() => $("#ovq")?.focus(), 30);
}
function closeSearch(silent) {
  const ov = $("#sov");
  if (!ov) return (ovOpen = false);
  ov.remove();
  document.body.classList.remove("ov-open");
  ovOpen = false;
  void silent;
}
addEventListener("popstate", () => ovOpen && closeSearch());
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ovOpen) history.back();
  else if (e.key === "/" && !ovOpen && !e.target.closest("input, select, textarea")) (e.preventDefault(), openSearch());
});

// ---------------------------------------------------------------- ayarlar
async function viewSettings() {
  document.title = `${t("settings")} — ${t("title")}`;
  crumbs([...baseCrumbs(), ["", t("settings")]]);
  let m;
  try { m = await meta(); } catch { return failed(); }
  const last = store.get("ft:last", null);
  const lastP = last && last.p ? await page(last.p - 1).catch(() => null) : null;
  const seg = (name, opts, cur) => `<div class="seg" role="radiogroup" data-name="${name}">${opts.map(([v, l, sw]) => `<button type="button" role="radio" aria-checked="${String(v) === String(cur)}" class="${String(v) === String(cur) ? "on" : ""}" data-v="${v}">${sw ? `<i class="sw sw-${v}"></i>` : ""}${esc(l)}</button>`).join("")}</div>`;
  const row = (icon, title, body, cls = "") => `<div class="srow ${cls}"><div class="slabel"><span class="sic">${SIC[icon]}</span><span>${esc(title)}</span></div><div class="sctl">${body}</div></div>`;
  const card = (icon, title, rows) => `<section class="scard"><h2><span class="sic big">${SIC[icon]}</span>${esc(title)}</h2>${rows}</section>`;
  const lastVol = lastP ? lastP.vol : 1;
  app.innerHTML = `<div class="settings"><header class="shead"><span class="sic hero">${ICON.gear}</span><div><h1>${esc(t("settings"))}</h1><p class="muted ar">مجموع الفتاوى</p></div></header>
    ${card("book", t("contRead"), `${lastP ? `<a class="cont" href="#/p/${last.p}"><span class="cref ar">${esc(ref(lastP))}</span><span class="ctt ar">${esc(lastP.title || lastP.volTitle)}</span><span class="carr" aria-hidden="true">‹</span></a>` : `<div class="srow"><p class="muted">${esc(t("noLast"))}</p><a class="btn ghost sm" href="#/p/1?i=1">${esc(t("start"))}</a></div>`}
      <div class="sub"><div class="slabel"><span class="sic">${SIC.jump}</span><span>${esc(t("jumpTitle"))}</span></div>${jumpForm(m.vols, lastVol)}</div>`)}
    ${card("palette", t("theme"), `
      <div class="pvwrap"><div class="pvpaper" id="pvp"><div class="pvh ar"><span>توحيد الألوهية</span><span>ج ١، ص ١</span></div><p class="ar" id="pv">${shown(esc(t("preview")))}</p></div></div>
      ${row("sun", t("theme"), seg("theme", [["dark", t("thDark"), 1], ["light", t("thLight"), 1], ["sepia", t("thSepia"), 1]], SET.theme))}
      ${row("size", t("fontSize"), `<div class="fsrow"><button type="button" class="rbtn" id="sfd" aria-label="${esc(t("fontDown"))}">A−</button><input type="range" id="sfr" min="15" max="34" step="1" value="${fsz}" aria-label="${esc(t("fontSize"))}"><button type="button" class="rbtn" id="sfu" aria-label="${esc(t("fontUp"))}">A+</button><b id="sfv">${fmt(fsz)}</b></div>`)}
      ${row("font", t("arFont"), seg("font", [["amiri", t("fAmiri")], ["naskh", t("fNaskh")]], SET.font))}
      ${row("tashkil", t("tashkil"), `<label class="switch"><input type="checkbox" id="tk" ${SET.tashkil ? "checked" : ""}><span class="track"><span class="knob"></span></span><span class="swl" id="tkl">${esc(SET.tashkil ? t("tkShow") : t("tkHide"))}</span></label>`)}`)}
    ${card("globe", t("language"), `<details class="lpick" id="lpick"><summary><span class="lcur"><b>${esc(LNAME[lang])}</b><small class="muted">${esc(t("chooseLang"))}</small></span><span class="lchev">${SIC.chev}</span></summary>
      <div class="lopts" role="radiogroup" aria-label="${esc(t("language"))}">${["ar", "az", "en", "tr", "ru"].map((k) => `<button type="button" role="radio" aria-checked="${k === lang}" class="lopt${k === lang ? " on" : ""}" data-l="${k}" lang="${k}"><span>${esc(LNAME[k])}</span><i class="lck" aria-hidden="true"></i></button>`).join("")}</div></details>`)}
    ${LIB || CFG.aiUrl !== null ? card("link", t("links"), `<div class="links">${LIB ? `<a class="lnk" href="${esc(LIB)}">${esc(t("library"))}</a>` : ""}${CFG.aiUrl !== null ? `<a class="lnk" href="${esc(CFG.aiUrl || "/ai")}">Library AI</a>` : ""}${CFG.siteLink === false ? "" : `<a class="lnk" href="https://nibrascode.com">nibrascode.com</a>`}</div>`) : ""}
    ${card("info", t("about"), `<div class="about"><p class="ar big gold">مجموع الفتاوى</p><p>${esc(t("aboutAuthor"))}</p><p>${esc(t("aboutComp"))}</p><p>${esc(t("aboutEd"))}</p><p class="muted">${esc(t("textNote"))}</p><p class="ainote"><span class="sic">${SIC.spark}</span><span>${esc(t("aiNote"))}</span></p><a class="lnk priv" href="#/privacy"><span class="sic">${SIC.shield}</span>${esc(t("privacy"))}</a></div>`)}
    ${card("mail", t("contact"), `<p class="muted">${esc(t("contactTxt"))}</p><a class="mailto" dir="ltr" href="mailto:${EMAIL}?subject=${encodeURIComponent("مجموع الفتاوى — Majmu' al-Fatawa")}"><span class="sic">${SIC.mail}</span>${EMAIL}</a>`)}
    <footer class="ver"><span class="gold">V1.0.0</span><span dir="ltr">© Nibras Code 2026</span></footer>
  </div>`;
  bindJump();
  const fsUpd = () => {
    $("#sfv").textContent = fmt(fsz);
    $("#sfr").value = fsz;
    $("#pv").style.fontSize = fsz + "px";
    document.documentElement.style.setProperty("--rfs", fsz + "px");
    store.set("ft:fs", fsz);
  };
  $("#pv").style.fontSize = fsz + "px";
  $("#sfd").onclick = () => ((fsz = Math.max(15, fsz - 1)), fsUpd());
  $("#sfu").onclick = () => ((fsz = Math.min(34, fsz + 1)), fsUpd());
  $("#sfr").oninput = (e) => ((fsz = Number(e.target.value)), fsUpd());
  $("#tk").onchange = (e) => {
    SET.tashkil = e.target.checked;
    store.set("ft:tashkil", SET.tashkil);
    $("#tkl").textContent = t(SET.tashkil ? "tkShow" : "tkHide");
    $("#pv").innerHTML = shown(esc(t("preview")));
  };
  app.querySelectorAll(".lopt").forEach((b) => (b.onclick = () => {
    if (b.dataset.l === lang) return ($("#lpick").open = false);
    try { localStorage.setItem("nl:lang", b.dataset.l); } catch {}
    location.reload();
  }));
  app.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => {
    const bt = e.target.closest("button");
    if (!bt) return;
    g.querySelectorAll("button").forEach((x) => (x.classList.toggle("on", x === bt), x.setAttribute("aria-checked", String(x === bt))));
    const v = bt.dataset.v;
    const n = g.dataset.name;
    if (n === "lang") {
      try { localStorage.setItem("nl:lang", v); } catch {}
      return location.reload();
    }
    if (n === "theme") SET.theme = v, store.set("ft:theme", v);
    if (n === "font") SET.font = v, store.set("ft:font", v);
    applySettings();
  }));
}

// ---------------------------------------------------------------- məxfilik siyasəti
function viewPrivacy() {
  const P = PRIVACY[lang] || PRIVACY.ar;
  document.title = `${P.title} — ${t("title")}`;
  crumbs([...baseCrumbs(), ["#/settings", t("settings")], ["", P.title]]);
  app.innerHTML = `<div class="settings privacy"><header class="shead"><span class="sic hero">${SIC.shield}</span><div><h1>${esc(P.title)}</h1><p class="muted">${esc(P.app)}</p></div></header>
    <section class="scard"><p class="pmeta"><span>${esc(P.eff)}</span><span>${esc(P.dev)}</span></p><p>${esc(P.intro)}</p></section>
    ${P.s.map(([h, b], i) => `<section class="scard psec"><h2><span class="pnum">${fmt(i + 1)}</span>${esc(h)}</h2><p>${esc(b)}</p></section>`).join("")}
    <section class="scard"><h2><span class="sic big">${SIC.mail}</span>${esc(t("contact"))}</h2><p class="muted">${esc(P.contact)}</p><a class="mailto" dir="ltr" href="mailto:${EMAIL}">${SIC.mail}${EMAIL}</a></section>
    <footer class="ver"><span class="gold">V1.0.0</span><span dir="ltr">© Nibras Code 2026</span></footer></div>`;
}

// ---------------------------------------------------------------- cild
async function viewVolume(n) {
  loading();
  let m, items;
  try {
    m = await meta();
    items = await volToc(n);
  } catch { return failed(); }
  const v = m.vols.find((x) => x.n === n);
  if (!v) return (location.hash = "#/");
  document.title = `الجزء ${arNum(n)}: ${v.title} — ${t("title")}`;
  crumbs([...baseCrumbs(), ["#/v/" + n, `${t("vol")} ${fmt(n)}`]]);
  const kinds = ["q", "f", "b", "t"].filter((k) => items.some((x) => x.k === k));
  const prev = m.vols.find((x) => x.n === n - 1);
  const next = m.vols.find((x) => x.n === n + 1);
  app.innerHTML = `
    <section class="vhead">
      <div class="vbig">${fmt(n)}</div>
      <div><p class="muted kicker">${esc(t("vol"))} ${fmt(n)} / ${fmt(m.vols.length)}</p><h1 class="ar">الجزء ${arNum(n)}: ${esc(v.title)}</h1>
      <div class="stats"><span>${esc(t("pagesN", { n: fmt(v.count) }))}</span><span>${esc(t("headsN", { n: fmt(items.length) }))}</span></div>
      <div class="acts"><a class="btn" href="#/p/${v.first + 1}?i=1">${esc(t("readVol"))}</a>
        ${prev ? `<a class="btn ghost sm" href="#/v/${prev.n}">→ ${esc(t("prevVol"))}</a>` : ""}${next ? `<a class="btn ghost sm" href="#/v/${next.n}">${esc(t("nextVol"))} ←</a>` : ""}</div></div>
    </section>
    <section class="tocbox">
      <div class="tocbar"><input id="tf" type="search" dir="rtl" placeholder="${esc(t("tocFilter"))}"><div class="chips">${["all", ...kinds].map((k) => `<button type="button" class="chip ${k === "all" ? "on" : ""}" data-k="${k}">${esc(t(k === "all" ? "kAll" : "k" + k))} <small>${fmt(k === "all" ? items.length : items.filter((x) => x.k === k).length)}</small></button>`).join("")}</div></div>
      <ol class="toc" id="toc">${items.map((x) => `<li class="k-${x.k}" data-k="${x.k}"><a href="#/p/${x.d + 1}"><span class="tk" aria-hidden="true"></span><span class="tt ar">${esc(x.t)}</span><span class="tp">${x.ap ? esc(t("appendix")) + " " : ""}ص ${arNum(x.pg)}</span></a></li>`).join("")}</ol>
    </section>`;
  let kind = "all";
  const apply = () => {
    const q = $("#tf").value.trim();
    document.querySelectorAll("#toc li").forEach((li) => li.classList.toggle("hidden", (kind !== "all" && li.dataset.k !== kind) || (!!q && !li.textContent.includes(q))));
  };
  $("#tf").oninput = apply;
  document.querySelectorAll(".chip").forEach((c) => (c.onclick = () => {
    kind = c.dataset.k;
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c));
    apply();
  }));
}

// ---------------------------------------------------------------- axtarış (Web Worker)
let worker = null;
let seq = 0;
const waits = new Map();
function ask(msg) {
  if (!worker) {
    worker = new Worker(new URL("./search-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const w = waits.get(e.data.id);
      if (!w) return;
      waits.delete(e.data.id);
      e.data.ok ? w.res(e.data.r) : w.rej(new Error(e.data.err));
    };
    worker.onerror = () => { for (const w of waits.values()) w.rej(new Error("worker")); waits.clear(); worker = null; };
  }
  const id = ++seq;
  return new Promise((res, rej) => (waits.set(id, { res, rej }), worker.postMessage({ id, ...msg })));
}
const SNIP = 120;
function snippet(text, set) {
  const hits = tokenSpans(text).filter((s) => set.has(s.t));
  if (!hits.length) return esc(text.slice(0, SNIP * 2).replace(/\n/g, " ")) + "…";
  const c = hits[0];
  let a = Math.max(0, c.start - SNIP);
  let z = Math.min(text.length, c.end + SNIP * 1.4);
  while (a > 0 && !/\s/.test(text[a - 1])) a--;
  while (z < text.length && !/\s/.test(text[z])) z++;
  let o = "";
  let i = a;
  for (const h of hits) {
    if (h.start < i || h.end > z) continue;
    o += esc(text.slice(i, h.start)) + "<mark>" + esc(text.slice(h.start, h.end)) + "</mark>";
    i = h.end;
  }
  o += esc(text.slice(i, z));
  return (a > 0 ? "… " : "") + o.replace(/\n/g, " ") + (z < text.length ? " …" : "");
}
async function viewSearch(q, vol) {
  document.title = `${q} — ${t("title")}`;
  crumbs([...baseCrumbs(), ["", t("searchTitle")]]);
  let m;
  try { m = await meta(); } catch { return failed(); }
  app.innerHTML = `<section class="tools one"><div class="tcard"><h2>${esc(t("searchTitle"))}</h2>${searchForm(q, vol, m.vols)}</div></section><section class="results" id="res"></section>`;
  bindSearch();
  const box = $("#res");
  if (!/[\u0621-\u064A]{2,}/.test(q)) return (box.innerHTML = `<p class="muted pad">${esc(t(q ? "arOnly" : "short"))}</p>`);
  box.innerHTML = `<p class="muted pad">${esc(t("loadingIdx"))}</p>`;
  let r;
  try { r = await ask({ q, vol }); } catch { return (box.innerHTML = `<p class="muted pad">${esc(t("error"))}</p>`); }
  if (!r.list.length) return (box.innerHTML = `<p class="muted pad">${esc(t("noResults"))}</p>`);
  const set = new Set(r.terms);
  box.innerHTML = `<p class="rcount">${esc(t("resultsN", { n: fmt(r.total) }))}${r.exact ? ` <span class="muted">· ${esc(t("exactN", { n: fmt(r.exact) }))}</span>` : ""}</p><div id="hits"></div>`;
  let off = 0;
  const more = async () => {
    $("#moreb")?.remove();
    const slice = r.list.slice(off, off + 20);
    off += slice.length;
    const pages = await Promise.all(slice.map((d) => page(d)));
    const hits = $("#hits");
    if (!hits || !hits.isConnected || !box.isConnected) return; // istifadəçi artıq başqa səhifəyə keçib
    hits.insertAdjacentHTML("beforeend", pages.map((p) => `<a class="hit" href="#/p/${p.d + 1}?q=${encodeURIComponent(q)}"><div class="h1"><b>${esc(ref(p))}</b><span>${esc(p.title)}</span></div><div class="s ar">${shown(snippet(p.text, set))}</div><div class="vt muted">${esc(p.volTitle)}</div></a>`).join(""));
    if (off < r.list.length) $("#hits").insertAdjacentHTML("afterend", `<button class="btn ghost moreb" id="moreb">${esc(t("more"))}</button>`), ($("#moreb").onclick = more);
  };
  await more();
}

// ---------------------------------------------------------------- oxucu
let fsz = store.get("ft:fs", 21);
document.documentElement.style.setProperty("--rfs", fsz + "px");
const FN_SEP = /^\s*[_ـ\-–—]{5,}\s*$/;
const N_BASM = /^بسم الله الرحمن الرحيم/;
const plain = (s) => s.replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا");
function textHTML(p, set) {
  let s = p.text;
  if (set && set.size) {
    const sp = tokenSpans(s).filter((x) => set.has(x.t));
    let o = "";
    let i = 0;
    for (const x of sp) {
      if (x.start < i) continue;
      o += s.slice(i, x.start) + "\u0001" + s.slice(x.start, x.end) + "\u0002";
      i = x.end;
    }
    s = o + s.slice(i);
  }
  const main = [];
  const notes = [];
  let fn = false;
  let lead = p.volStart; // cildin ilk sətirləri (الجزء … / كتاب … / بسم الله …) çapdakı kimi başlıq
  for (const l of s.split("\n")) {
    if (FN_SEP.test(l)) { fn = true; lead = false; continue; }
    if (!l.trim()) continue;
    const h = esc(l).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
    const pl = plain(l.replace(/[\u0001\u0002]/g, "")).trim();
    if (lead && /^(الجزء|الجزء)/.test(pl)) { main.push(`<div class="fr-juz">${h}</div>`); continue; }
    if (lead && /^كتاب/.test(pl) && pl.length < 80) { main.push(`<div class="fr-kitab">${h}</div>`); continue; }
    if (N_BASM.test(pl) && pl.length < 30) { main.push(`<div class="fr-basm">${h}</div>`); continue; }
    lead = false;
    (fn ? notes : main).push(`<p>${h}</p>`);
  }
  return main.join("") + (notes.length ? `<div class="fn">${notes.join("")}</div>` : "");
}
// ---- girişlər: hər cildin əvvəlində Nibras Code müqəddiməsi (virtual səhifə, mətn məlumatına toxunmur)
const INTRO = [
  ["h", "مقدمة نِبراس كود"],
  ["s", "حول كتاب مجموع الفتاوى لشيخ الإسلام ابن تيمية رحمه الله"],
  ["p", "الحمد لله رب العالمين، والصلاة والسلام على نبينا محمد، وعلى آله وصحبه أجمعين، أما بعد:"],
  ["p", "فإن العلم الشرعي من أجلِّ ما تُبذل فيه الأوقات، ومن أعظم ما تُصرف فيه الجهود؛ إذ به يعرف العبد دينه، ويعبد ربَّه على بصيرة، ويميّز بين الحق والباطل، والهدى والضلال."],
  ["p", "وإن كتاب «مجموع الفتاوى» لشيخ الإسلام أحمد بن عبد الحليم بن عبد السلام ابن تيمية رحمه الله من المصنفات العلمية النفيسة التي جمعت طائفة واسعة من بحوثه ورسائله وفتاواه في أبواب متعددة من الدين، متناولةً مسائل الاعتقاد والعبادة والعلم والسلوك وغيرها من المسائل التي يحتاج إليها طالب العلم والباحث."],
  ["p", "وانطلاقًا من أهمية تيسير الوصول إلى العلم النافع، يأتي هذا التطبيق الذي أُعدَّ بعون الله وتوفيقه، وبجهدٍ تقنيٍّ يهدف إلى إتاحة هذا الكتاب المبارك في صورة رقمية ميسَّرة، تساعد القارئ على تصفح مجلداته، والرجوع إلى مباحثه، والاستفادة من محتواه بسهولة ويسر."],
  ["p", "وقد جُعل هذا العمل خدمةً للكتاب وقُرَّائه، ووسيلةً لتقريب الوصول إلى مادته العلمية، لا بديلًا عن الرجوع إلى النسخ المعتمدة، ولا عن التلقي عن أهل العلم الراسخين. كما ينبغي لطالب العلم أن يتحرّى الدقة في النقل، وأن يراعي سياق الكلام وموضعه، وألا ينسب إلى المؤلف ما لم يثبت عنه."],
  ["p", "ونؤكد أن الفتاوى والمسائل الواردة في هذا الكتاب تُقرأ في سياقها العلمي، مع مراعاة أصول الاستدلال، وملابسات المسائل، وما يحتاج إليه فهمها من علم باللغة والشرع وأقوال أهل العلم."],
  ["p", "ونسأل الله تعالى أن يجعل هذا العمل خالصًا لوجهه الكريم، نافعًا لعباده، وأن يبارك في الجهود المبذولة لخدمة العلم الشرعي، وأن يرحم شيخ الإسلام ابن تيمية، ويجزيه عن الإسلام والمسلمين خير الجزاء، وأن يرزقنا العلم النافع والعمل الصالح."],
  ["p", "وما توفيقنا إلا بالله، عليه توكلنا وإليه أنبنا."],
  ["g", "نِبراس كود | Nibras Code"],
];
const introHTML = () => `<div class="intro"><div class="fr-basm">بسم الله الرحمن الرحيم</div>${INTRO.map(([k, x]) => (k === "h" ? `<h2 class="in-h">${esc(x)}</h2>` : k === "s" ? `<h3 class="in-s">${esc(x)}</h3>` : k === "g" ? `<p class="in-g">${esc(x)}</p>` : `<p>${esc(x)}</p>`)).join("")}</div>`;
// ---- ayə səhifə sərhədində: əsas mətndə açıq qalan «{» növbəti səhifədən «}»-ə qədər tamamlanır; növbəti səhifənin başındakı qalıq solğun göstərilir
const splitMain = (s) => { const L = s.split("\n"); const i = L.findIndex((l) => FN_SEP.test(l)); return i < 0 ? [s, ""] : [L.slice(0, i).join("\n"), "\n" + L.slice(i).join("\n")]; };
const openAyah = (s) => { const a = s.lastIndexOf("{"); return a >= 0 && s.indexOf("}", a) < 0; };
function headCarry(s) { // səhifənin başında «}» ilə bitən ayə qalığı (əvvəlində «{» yoxdursa)
  const c = s.indexOf("}"); if (c < 0 || c > 1200) return null;
  const o = s.indexOf("{"); if (o >= 0 && o < c) return null;
  const frag = s.slice(0, c + 1); return frag.includes("\n") ? null : frag;
}
function withCarry(p, prev, next) {
  let [main, notes] = splitMain(p.text);
  if (prev && prev.vol === p.vol && openAyah(splitMain(prev.text)[0])) { const f = headCarry(main); if (f) main = "\u0003" + f + "\u0004" + main.slice(f.length); }
  if (next && next.vol === p.vol && openAyah(main)) { const f = headCarry(splitMain(next.text)[0]); if (f) main = main.replace(/\s+$/, "") + " \u0005" + f + "\u0006"; }
  return { ...p, text: main + notes };
}
const carryTags = (h) => h.replace(/\u0003/g, '<span class="ay-was" title="تتمة الآية من الصفحة السابقة">… ').replace(/\u0004/g, "</span>").replace(/\u0005/g, '<span class="ay-cont" title="تتمة الآية من الصفحة التالية">').replace(/\u0006/g, "</span>");
// ---- vərəqlər: hər cild = [giriş, səhifələr…]; s → {intro: cild} və ya {d}
const slotOf = (m, d) => d + m.pv[d]; // cild n əvvəlində n giriş səhifəsi var
function slotInfo(m, s) {
  for (const v of m.vols) { const st = v.first + v.n - 1; if (s === st) return { intro: v.n, vs: st }; if (s > st && s <= st + v.count) return { d: s - v.n, vs: st }; }
  return null;
}
const slotHash = (m, s, hq) => { const x = slotInfo(m, s); if (!x) return null; const q = hq ? "q=" + encodeURIComponent(hq) : ""; return x.intro ? `#/p/${m.vols[x.intro - 1].first + 1}?i=1${q ? "&" + q : ""}` : `#/p/${x.d + 1}${q ? "?" + q : ""}`; };
const spreadMode = () => innerWidth >= 640 && (innerWidth > innerHeight || innerWidth >= 740);
async function pageHTML(m, s, set, noPrev, noNext) {
  const x = slotInfo(m, s);
  if (!x) return `<article class="paper blank"></article>`;
  if (x.intro) { const v = m.vols[x.intro - 1]; return `<article class="paper"><div class="phead"><span class="rh ar">${esc(v.title)}</span><span class="rf ar">الجزء ${arNum(v.n)}</span></div><div class="pbody ar">${shown(introHTML())}</div><div class="pfoot"></div></article>`; }
  let [p, pr, nx] = await Promise.all([page(x.d), page(x.d - 1).catch(() => null), page(x.d + 1).catch(() => null)]);
  p = withCarry(p, noPrev ? null : pr, noNext ? null : nx);
  let foot = arNum(p.page);
  const lm = p.ap && /^\((\S{1,3})\)\n/.exec(p.text);
  if (lm) (foot = `(${lm[1]})`), (p = { ...p, text: p.text.slice(lm[0].length) });
  const body = carryTags((p.startTitle ? `<div class="bab">${esc(p.startTitle)}</div>` : "") + (textHTML(p, set) || `<p class="muted">—</p>`));
  return `<article class="paper"><div class="phead"><span class="rh ar">${esc(p.title)}</span><span class="rf ar">${esc(ref(p))}</span></div><div class="pbody ar">${shown(body)}</div><div class="pfoot">${foot}</div></article>`;
}
const applyPaper = () => { const v = store.get("ft:paper", "white"); if (v === "white") delete document.documentElement.dataset.paper; else document.documentElement.dataset.paper = v; };
applyPaper();
let readerSeq = 0;
let lastSlot = -1;
async function viewReader(P, hq, isIntro) {
  const my = ++readerSeq;
  const stale = () => my !== readerSeq || !location.hash.startsWith("#/p/");
  let m;
  try { m = await meta(); } catch { return failed(); }
  if (stale()) return;
  P = Math.min(Math.max(1, P), m.N);
  const set = hq ? new Set(tokens(hq)) : null;
  const S = m.N + m.vols.length;
  let s = slotOf(m, P - 1) - (isIntro && m.vols[m.pv[P - 1] - 1].first === P - 1 ? 1 : 0);
  const spread = spreadMode();
  const info = slotInfo(m, s);
  if (spread) s = info.vs + ((s - info.vs) & ~1); // cütlər cildin girişindən başlayır: sağda giriş/tək, solda növbəti
  const step = spread ? 2 : 1;
  $("#crumbs").hidden = true;
  app.innerHTML = `<div class="rbar"><a class="ibtn" href="#/v/${m.pv[P - 1]}" id="rback" aria-label="${esc(t("toc"))}">${ICON.toc}<span class="lbl">${esc(t("toc"))}</span></a>
      <div class="rttl"><b class="ar" id="rvol"></b><span class="ar" id="rhead"></span></div>
      <div class="pcol" role="group" aria-label="لون الصفحة"><button class="pc pc-w" data-p="white" title="أبيض" aria-label="أبيض"></button><button class="pc pc-d" data-p="dark" title="ليلي" aria-label="ليلي"></button><button class="pc pc-s" data-p="sepia" title="سيبيا" aria-label="سيبيا"></button></div>
      <button class="ibtn" id="fdown" title="${esc(t("fontDown"))}">A−</button><button class="ibtn" id="fup" title="${esc(t("fontUp"))}">A+</button></div>
    <div class="book ${spread ? "spread" : "single"}" id="paper"></div>
    <nav class="rnav" dir="ltr"><button class="btn ghost" id="bNext">← ${esc(t("next"))}</button>
      <form class="rjump" id="rj" dir="rtl"><select id="rjv" aria-label="${esc(t("vol"))}">${m.vols.map((v) => `<option value="${v.n}">${esc(t("vol"))} ${fmt(v.n)}</option>`).join("")}</select><input id="rjp" type="number" min="1" inputmode="numeric" aria-label="${esc(t("page"))}"><button class="btn ghost sm" type="submit">${esc(t("go"))}</button></form>
      <button class="btn ghost" id="bPrev">${esc(t("prev"))} →</button></nav>`;
  const applyFs = () => document.documentElement.style.setProperty("--rfs", fsz + "px");
  applyFs();
  const markPc = () => app.querySelectorAll(".pc").forEach((b) => b.classList.toggle("on", b.dataset.p === (store.get("ft:paper", "white"))));
  app.querySelectorAll(".pc").forEach((b) => (b.onclick = () => { store.set("ft:paper", b.dataset.p); applyPaper(); markPc(); }));
  markPc();
  $("#fup").onclick = () => ((fsz = Math.min(34, fsz + 1)), applyFs(), store.set("ft:fs", fsz));
  $("#fdown").onclick = () => ((fsz = Math.max(15, fsz - 1)), applyFs(), store.set("ft:fs", fsz));
  const go = (k) => {
    let n = s + k * step;
    if (spread && k < 0) { const pi = slotInfo(m, s - 1); if (pi) n = pi.vs + ((s - 1 - pi.vs) & ~1); }
    if (n >= 0 && n < S) { const h = slotHash(m, n, hq); if (h) location.hash = h; }
  };
  $("#bNext").onclick = () => go(1);
  $("#bPrev").onclick = () => go(-1);
  $("#bNext").disabled = s + step >= S;
  $("#bPrev").disabled = s <= 0;
  onkey = (e) => {
    if (e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowLeft") go(1);
    else if (e.key === "ArrowRight") go(-1);
  };
  prefetch(P);
  const slots = spread ? [s, s + 1] : [s];
  const second = spread ? slotInfo(m, s + 1) : null;
  if (second && second.vs !== info.vs) slots[1] = -1; // cild sonu: sol səhifə boş
  let html;
  try { html = await Promise.all(slots.map((x, i) => (x < 0 ? `<article class="paper blank"></article>` : pageHTML(m, x, set, spread && i === 1, spread && i === 0 && slots[1] >= 0)))); } catch { return stale() ? undefined : failed(); }
  if (stale()) return;
  const dir = lastSlot < 0 || lastSlot === s ? "" : s > lastSlot ? "turn-next" : "turn-prev";
  lastSlot = s;
  const book = $("#paper");
  book.innerHTML = html.join("");
  if (dir) book.classList.add(dir);
  const fi = slotInfo(m, s);
  const d0 = fi.intro ? m.vols[fi.intro - 1].first : fi.d;
  const p = await page(d0);
  document.title = `${fi.intro ? "مقدمة نبراس كود — " : ref(p) + " — "}${t("title")}`;
  $("#rvol").textContent = `الجزء ${arNum(p.vol)}: ${p.volTitle}`;
  $("#rhead").textContent = fi.intro ? "مقدمة نِبراس كود" : p.title !== p.volTitle ? p.title : "";
  $("#rback").href = "#/v/" + p.vol;
  $("#rjv").value = p.vol;
  $("#rjp").value = fi.intro || p.ap ? "" : p.page;
  store.set("ft:last", { p: d0 + 1, at: Date.now() });
  $("#rj").onsubmit = (e) => { e.preventDefault(); location.hash = `#/j/${$("#rjv").value}/${Number($("#rjp").value) || 1}`; };
  const mk = $("#paper mark");
  if (mk) mk.scrollIntoView({ block: "center" });
  prefetch(P + 8); prefetch(P - 2); prefetch(P - 10);
}
let rsT = 0, rsMode = null;
addEventListener("resize", () => { clearTimeout(rsT); rsT = setTimeout(() => { if (document.body.classList.contains("reading") && rsMode !== null && rsMode !== spreadMode()) route(); rsMode = spreadMode(); }, 200); });
rsMode = spreadMode();
let onkey = null;
addEventListener("keydown", (e) => document.body.classList.contains("reading") && onkey && onkey(e));
let tx = null;
addEventListener("touchstart", (e) => (tx = document.body.classList.contains("reading") && e.touches.length === 1 && e.target.closest("#paper") ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null), { passive: true });
addEventListener("touchend", (e) => {
  if (!tx) return;
  const dx = e.changedTouches[0].clientX - tx.x;
  const dy = e.changedTouches[0].clientY - tx.y;
  if (Math.abs(dx) > 60 && Math.abs(dy) < Math.abs(dx) * 0.5 && Date.now() - tx.t < 700) $(dx > 0 ? "#bNext" : "#bPrev")?.click();
  tx = null;
});

function toast(msg) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 2400);
}

chrome();
route();
// ---- daxili ərəbcə sual analizi (xarici AI yoxdur)
const Q_LEAD = /^(?:\s*(?:ما|ماذا|من|هل|كيف|لماذا|لم|متى|أين|اين|أي|اي|كم)\s+)?(?:(?:هو|هي|حكم|قول|رأي|راي|مذهب|موقف|كلام|تعريف|معنى|معني|الدليل على|دليل|حقيقة|بيان|فضل|صفة|شروط|شرط)\s+)?(?:(?:شيخ الإسلام|شيخ الاسلام|ابن تيمية|ابن تيميه|الشيخ|المؤلف)\s+)?(?:(?:في|فى|عن|على|من)\s+)?/;
const STOP = new Set(["ما","ماذا","من","هل","كيف","لماذا","لم","متى","اين","أين","اي","أي","كم","هو","هي","في","فى","عن","على","الى","إلى","او","أو","ثم","قد","ان","إن","أن","كان","يكون","هذا","هذه","ذلك","تلك","التي","الذي","الذين","مع","بين","عند","كل","بعض","غير","شيخ","الإسلام","الاسلام","ابن","تيمية","تيميه","قول","رأي","حكم","يقول","قال","يجوز","يصح","الشيخ","المسألة","مسألة","مسالة","بالنسبة"]);
const SYN = { // tez-tez işlənən fiqh/əqidə terminləri: əlavə axtarış variantları
  "الصلاة": ["الصلوات"], "الوضوء": ["الطهارة"], "الصيام": ["الصوم"], "الصوم": ["الصيام"], "الزكاة": ["الصدقة"], "الحج": ["المناسك"],
  "التوسل": ["الوسيلة"], "الاستغاثة": ["الاستعانة"], "البدعة": ["البدع","المحدثات"], "الشرك": ["الإشراك"], "التوحيد": ["الإلهية","الألوهية"],
  "الصفات": ["صفات الله","الأسماء والصفات"], "الاستواء": ["العرش"], "القدر": ["القضاء"], "الإيمان": ["الإسلام"], "الكفر": ["التكفير"],
  "الربا": ["المعاملات"], "الطلاق": ["الطلاق الثلاث"], "الغناء": ["السماع"], "السماع": ["الغناء"], "القبور": ["زيارة القبور"], "الزيارة": ["زيارة القبور"],
  "الصوفية": ["التصوف"], "الجهاد": ["القتال"], "الخوارج": ["الحرورية"], "الرافضة": ["الشيعة"], "الشفاعة": ["الشفاعة"], "الولاية": ["الأولياء","أولياء الله"],
};
function analyzeQ(raw) {
  let q = raw.replace(/[؟?!.،,:؛]/g, " ").replace(/\s+/g, " ").trim();
  const quoted = (raw.match(/["«“]([^"»”]{2,})["»”]/) || [])[1];
  if (quoted) return { main: quoted.trim(), alts: [], phrase: true };
  q = q.replace(Q_LEAD, "");
  const words = q.split(" ").filter((w) => w && !STOP.has(w) && !STOP.has(w.replace(/^ال/, "")));
  const main = (words.length ? words : q.split(" ")).join(" ");
  const alts = [];
  for (const w of words) { const s = SYN[w] || SYN["ال" + w]; if (s) for (const x of s) alts.push(main.replace(w, x)); }
  return { main, alts: alts.slice(0, 3), phrase: false };
}
// cavab: ən uyğun parçalardan seçilmiş cümlələr (yalnız kitab mətni) + cild/səhifə
function bestSentences(text, set, n = 2) {
  const main = text.split(/\n\s*[_ـ\-–—]{5,}\s*\n/)[0];
  const parts = main.split(/(?<=[.؟!؛:])\s+|\n+/).filter((s) => s.trim().length > 25);
  const sc = parts.map((s, i) => { const tk = tokens(s); let h = 0; const seen = new Set(); for (const x of tk) if (set.has(x) && !seen.has(x)) (seen.add(x), h++); return [i, h + Math.min(tk.length, 60) / 600]; });
  sc.sort((a, b) => b[1] - a[1]);
  if (!sc.length || sc[0][1] < 1) return "";
  const i = sc[0][0];
  let s = parts[i];
  if (n > 1 && parts[i + 1] && s.length < 220) s += " " + parts[i + 1];
  return s.length > 520 ? s.slice(0, 520).replace(/\s\S*$/, "") + " …" : s;
}
const hl = (s, set) => { let o = "", i = 0; for (const h of tokenSpans(s)) if (set.has(h.t)) (o += esc(s.slice(i, h.start)) + "<mark>" + esc(s.slice(h.start, h.end)) + "</mark>", (i = h.end)); return o + esc(s.slice(i)); };
// ---------------------------------------------------------------- kitab daxili AI köməkçi (yalnız ərəbcə)
function aiFab() {
  if ($("#aifab")) return;
  document.body.insertAdjacentHTML("beforeend", `<button class="aifab" id="aifab" type="button" aria-label="المساعد الذكي" title="المساعد الذكي — البحث في المجلدات الخمسة والثلاثين"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/><path d="M11 7.5v7M7.5 11h7" stroke-width="1.5"/></svg></button>
  <div class="aip" id="aip" hidden dir="rtl" lang="ar" role="dialog" aria-label="المساعد الذكي"><div class="aip-in">
    <div class="aip-h"><b>المساعد الذكي — مجموع الفتاوى</b><button class="ibtn" id="aix" type="button" aria-label="إغلاق">✕</button></div>
    <form id="aif" class="aip-f"><input id="aiq" type="search" dir="rtl" lang="ar" autocomplete="off" enterkeyhint="search" placeholder="اكتب سؤالك أو كلمات البحث بالعربية… (ضع العبارة بين علامتي تنصيص للبحث الحرفي)">
      <select id="aiv" aria-label="المجلد"><option value="0">كل المجلدات</option></select><button class="btn" type="submit">ابحث</button></form>
    <div id="aio" class="aip-o"><p class="muted">ابحث في المجلدات الخمسة والثلاثين: تُطبَّع الحركات والهمزات والتاء المربوطة والألف المقصورة، ويُصحَّح الخطأ الإملائي اليسير.</p></div>
  </div></div>`);
  const P = $("#aip");
  meta().then((m) => ($("#aiv").innerHTML += m.vols.map((v) => `<option value="${v.n}">المجلد ${arNum(v.n)}</option>`).join(""))).catch(() => {});
  $("#aifab").onclick = () => { P.hidden = false; ask({ warm: 1 }).catch(() => {}); setTimeout(() => $("#aiq").focus(), 50); };
  $("#aix").onclick = () => (P.hidden = true);
  P.onclick = (e) => { if (e.target === P) P.hidden = true; if (e.target.closest("a.hit")) P.hidden = true; };
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !P.hidden) P.hidden = true; });
  $("#aif").onsubmit = async (e) => {
    e.preventDefault();
    const q = $("#aiq").value.trim(), vol = Number($("#aiv").value) || 0, o = $("#aio");
    if (!/[\u0621-\u064A]{2,}/.test(q)) return (o.innerHTML = `<p class="muted">اكتب بالعربية من فضلك.</p>`);
    o.innerHTML = `<p class="muted">جارٍ البحث…</p>`;
    let r;
    const A = analyzeQ(q);
    try {
      r = await ask({ q: A.main, vol });
      if (r.list.length < 3) for (const alt of A.alts) { const r2 = await ask({ q: alt, vol }); if (r2.list.length > r.list.length) r = r2; }
      if (!r.list.length && A.main.split(" ").length > 2) r = await ask({ q: A.main.split(" ").slice(0, 2).join(" "), vol });
    } catch { return (o.innerHTML = `<p class="muted">تعذّر البحث، حاول مرة أخرى.</p>`); }
    if (!r.list.length) return (o.innerHTML = `<p class="muted">لم أجد نتائج؛ جرّب كلمات أخرى أو صيغة أقصر.</p>`);
    const set = new Set(r.terms);
    const top = await Promise.all(r.list.slice(0, 20).map((d) => page(d)));
    const fx = r.fixed && r.fixed.length ? `<p class="muted">صُحّح: ${r.fixed.map(([a, b]) => `${esc(a)} ← ${esc(b)}`).join("، ")}</p>` : "";
    o.innerHTML = `${fx}<div class="aians" id="aians"><button class="btn ghost sm" id="aiask" type="button" hidden>✦</button></div>
      <p class="rcount">${arNum(r.total)} نتيجة${r.exact ? ` · ${arNum(r.exact)} مطابقة تامة` : ""}</p>
      ${top.map((p) => `<a class="hit" href="#/p/${p.d + 1}?q=${encodeURIComponent(A.main)}"><div class="h1"><b>${esc(ref(p))}</b><span>${esc(p.title)}</span></div><div class="s ar">${shown(snippet(p.text, set))}</div></a>`).join("")}`;
    $("#aiask").onclick = () => {
      const picks = [];
      for (const p of top) { if (picks.length >= 3) break; const t = bestSentences(p.text, set); if (t) picks.push([p, t]); }
      $("#aians").innerHTML = picks.length ? `<div class="aitext"><p><b>أقرب ما وجدتُه في الكتاب لسؤالك «${esc(q)}»:</b></p>${picks.map(([p, t2]) => `<p>«${shown(hl(t2, set))}» <a href="#/p/${p.d + 1}?q=${encodeURIComponent(A.main)}" class="cite">(${esc(ref(p))})</a></p>`).join("")}</div><p class="muted small">النصوص منقولة حرفيًّا من الكتاب ومرتبة حسب قربها من السؤال؛ افتح الصفحة لقراءة السياق كاملًا.</p>` : `<p class="muted">لم أجد مقطعًا صريحًا؛ راجع النتائج أدناه.</p>`;
    };
    $("#aiask").click();
  };
}
aiFab();

window.__fatawa = { ask }; // sınaq üçün
