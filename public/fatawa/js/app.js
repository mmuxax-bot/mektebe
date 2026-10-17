// Məcmuul-fətava: müstəqil bölmə (qovluq başqa yerə və ya tətbiqə köçürülə bilər). Marşrutlar hash ilə:
//   #/            yalnız 35 cild (kitab üz qabıqları); axtarış — başlıqdakı lupa, ayarlar — dişli çarx
//   #/settings    ayarlar: dil, şrift ölçüsü, görünüş, ərəb şrifti, hərəkələr, davam et, cild/səhifə keçidi, kitab haqqında
//   #/v/3         3-cü cildin mündəricatı
//   #/s?q=…&v=3   axtarış (v: yalnız həmin cild)
//   #/p/1234?q=…  oxucu (1-dən başlayan ardıcıl səhifə; q: vurğulanan sözlər)
//   #/j/3/10      3-cü cild, 10-cu səhifə (çap nömrəsi) -> oxucu
import { t, fmt, arNum, lang, LANGS } from "./i18n.js";
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
};
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
  document.body.classList.toggle("is-set", parts[0] === "settings");
  closeSearch(true);
  window.scrollTo(0, 0);
  updCont();
  if (parts[0] === "settings") return viewSettings();
  if (parts[0] === "v") return viewVolume(Number(parts[1]));
  if (parts[0] === "s") return viewSearch(q.get("q") || "", Number(q.get("v")) || 0);
  if (parts[0] === "p") return viewReader(Number(parts[1]) || 1, q.get("q") || "");
  if (parts[0] === "j") return jumpTo(parts[1], parts[2]);
  return viewHome();
}
addEventListener("hashchange", route);
const loading = () => (app.innerHTML = `<p class="muted pad">${esc(t("loading"))}</p>`);
const failed = () => (app.innerHTML = `<p class="muted pad">${esc(t("error"))}</p>`);

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
    ${card("book", t("contRead"), `${lastP ? `<a class="cont" href="#/p/${last.p}"><span class="cref ar">${esc(ref(lastP))}</span><span class="ctt ar">${esc(lastP.title || lastP.volTitle)}</span><span class="carr" aria-hidden="true">‹</span></a>` : `<div class="srow"><p class="muted">${esc(t("noLast"))}</p><a class="btn ghost sm" href="#/p/1">${esc(t("start"))}</a></div>`}
      <div class="sub"><div class="slabel"><span class="sic">${SIC.jump}</span><span>${esc(t("jumpTitle"))}</span></div>${jumpForm(m.vols, lastVol)}</div>`)}
    ${card("palette", t("theme"), `
      <div class="pvwrap"><div class="pvpaper" id="pvp"><div class="pvh ar"><span>توحيد الألوهية</span><span>ج ١، ص ١</span></div><p class="ar" id="pv">${shown(esc(t("preview")))}</p></div></div>
      ${row("sun", t("theme"), seg("theme", [["dark", t("thDark"), 1], ["light", t("thLight"), 1], ["sepia", t("thSepia"), 1]], SET.theme))}
      ${row("size", t("fontSize"), `<div class="fsrow"><button type="button" class="rbtn" id="sfd" aria-label="${esc(t("fontDown"))}">A−</button><input type="range" id="sfr" min="15" max="34" step="1" value="${fsz}" aria-label="${esc(t("fontSize"))}"><button type="button" class="rbtn" id="sfu" aria-label="${esc(t("fontUp"))}">A+</button><b id="sfv">${fmt(fsz)}</b></div>`)}
      ${row("font", t("arFont"), seg("font", [["amiri", t("fAmiri")], ["naskh", t("fNaskh")]], SET.font))}
      ${row("tashkil", t("tashkil"), `<label class="switch"><input type="checkbox" id="tk" ${SET.tashkil ? "checked" : ""}><span class="track"><span class="knob"></span></span><span class="swl" id="tkl">${esc(SET.tashkil ? t("tkShow") : t("tkHide"))}</span></label>`)}`)}
    ${card("globe", t("language"), seg("lang", LANGS.map(([k]) => [k, { ar: "العربية", az: "Azərbaycanca", en: "English", tr: "Türkçe", ru: "Русский" }[k]]), lang))}
    ${LIB || CFG.aiUrl !== null ? card("link", t("links"), `<div class="links">${LIB ? `<a class="lnk" href="${esc(LIB)}">${esc(t("library"))}</a>` : ""}${CFG.aiUrl !== null ? `<a class="lnk" href="${esc(CFG.aiUrl || "/ai")}">Library AI</a>` : ""}${CFG.siteLink === false ? "" : `<a class="lnk" href="https://nibrascode.com">nibrascode.com</a>`}</div>`) : ""}
    ${card("info", t("about"), `<div class="about"><p class="ar big gold">مجموع الفتاوى</p><p>${esc(t("aboutAuthor"))}</p><p>${esc(t("aboutComp"))}</p><p>${esc(t("aboutEd"))}</p><p class="muted">${esc(t("textNote"))}</p></div>`)}
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
      <div class="acts"><a class="btn" href="#/p/${v.first + 1}">${esc(t("readVol"))}</a>
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
async function viewReader(P, hq) {
  let m;
  try { m = await meta(); } catch { return failed(); }
  P = Math.min(Math.max(1, P), m.N);
  const set = hq ? new Set(tokens(hq)) : null;
  $("#crumbs").hidden = true;
  app.innerHTML = `<div class="rbar"><a class="ibtn" href="#/v/${m.pv[P - 1]}" id="rback" aria-label="${esc(t("toc"))}">${ICON.toc}<span class="lbl">${esc(t("toc"))}</span></a>
      <div class="rttl"><b class="ar" id="rvol"></b><span class="ar" id="rhead"></span></div>
      <button class="ibtn" id="fdown" title="${esc(t("fontDown"))}">A−</button><button class="ibtn" id="fup" title="${esc(t("fontUp"))}">A+</button></div>
    <article class="paper" id="paper"><div class="phead"><span class="rh ar" id="ph"></span><span class="rf ar" id="pr"></span></div><div class="pbody ar" id="pb"></div><div class="pfoot" id="pf"></div></article>
    <nav class="rnav" dir="ltr"><button class="btn ghost" id="bNext">← ${esc(t("next"))}</button>
      <form class="rjump" id="rj" dir="rtl"><select id="rjv" aria-label="${esc(t("vol"))}">${m.vols.map((v) => `<option value="${v.n}">${esc(t("vol"))} ${fmt(v.n)}</option>`).join("")}</select><input id="rjp" type="number" min="1" inputmode="numeric" aria-label="${esc(t("page"))}"><button class="btn ghost sm" type="submit">${esc(t("go"))}</button></form>
      <button class="btn ghost" id="bPrev">${esc(t("prev"))} →</button></nav>`;
  const applyFs = () => document.documentElement.style.setProperty("--rfs", fsz + "px");
  applyFs();
  $("#fup").onclick = () => ((fsz = Math.min(34, fsz + 1)), applyFs(), store.set("ft:fs", fsz));
  $("#fdown").onclick = () => ((fsz = Math.max(15, fsz - 1)), applyFs(), store.set("ft:fs", fsz));
  let p;
  try { p = await page(P - 1); } catch { return failed(); }
  document.title = `${ref(p)} — ${t("title")}`;
  $("#rvol").textContent = `الجزء ${arNum(p.vol)}: ${p.volTitle}`;
  $("#rhead").textContent = p.title !== p.volTitle ? p.title : "";
  $("#rback").href = "#/v/" + p.vol;
  $("#ph").textContent = p.title;
  $("#pr").textContent = ref(p);
  $("#pb").innerHTML = shown((p.startTitle ? `<div class="bab">${esc(p.startTitle)}</div>` : "") + (textHTML(p, set) || `<p class="muted">—</p>`));
  $("#pf").textContent = arNum(p.page);
  $("#rjv").value = p.vol;
  $("#rjp").value = p.ap ? "" : p.page;
  store.set("ft:last", { p: P, at: Date.now() });
  const go = (k) => {
    const n = P + k;
    if (n >= 1 && n <= m.N) location.hash = "#/p/" + n + (hq ? "?q=" + encodeURIComponent(hq) : "");
  };
  // ərəb kitabı: növbəti səhifə soldadır
  $("#bNext").onclick = () => go(1);
  $("#bPrev").onclick = () => go(-1);
  $("#bNext").disabled = P >= m.N;
  $("#bPrev").disabled = P <= 1;
  $("#rj").onsubmit = (e) => {
    e.preventDefault();
    location.hash = `#/j/${$("#rjv").value}/${Number($("#rjp").value) || 1}`;
  };
  onkey = (e) => {
    if (e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowLeft") go(1);
    else if (e.key === "ArrowRight") go(-1);
  };
  const mk = $("#pb mark");
  if (mk) mk.scrollIntoView({ block: "center" });
  prefetch(P);
  prefetch(P - 2);
}
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
window.__fatawa = { ask }; // sınaq üçün
