// Məcmuul-fətava: müstəqil bölmə (qovluq başqa yerə və ya tətbiqə köçürülə bilər). Marşrutlar hash ilə:
//   #/            cildlər, axtarış, cild/səhifə keçidi
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

// ---------------------------------------------------------------- başlıq / altlıq
function chrome() {
  const top = document.createElement("header");
  top.className = "top";
  top.innerHTML = `<a class="brand" href="#/"><span class="logo" aria-hidden="true">${ICON.book}</span><span>${esc(t("home"))}</span></a>
    <nav class="nav">${LIB ? `<a href="${esc(LIB)}" class="lib">${esc(t("library"))}</a>` : ""}${CFG.aiUrl !== null ? `<a href="${esc(CFG.aiUrl || "/ai")}" class="ai">Library AI</a>` : ""}
    <select class="lang" aria-label="Language">${LANGS.map(([k, l]) => `<option value="${k}" ${k === lang ? "selected" : ""}>${l}</option>`).join("")}</select></nav>`;
  top.querySelector(".lang").onchange = (e) => {
    try { localStorage.setItem("nl:lang", e.target.value); } catch {}
    location.reload();
  };
  document.body.prepend(top);
  const f = document.createElement("footer");
  f.className = "foot";
  f.innerHTML = `<span dir="ltr">© Nibras Code 2026</span>${CFG.siteLink === false ? "" : ` · <a href="https://nibrascode.com">nibrascode.com</a>`}`;
  document.body.append(f);
}
const ICON = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3.5-1 3 13.5-3.5 1z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  toc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
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
  window.scrollTo(0, 0);
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
  crumbs(baseCrumbs());
  loading();
  let m;
  try { m = await meta(); } catch { return failed(); }
  const heads = await Promise.all(m.vols.map((v) => volToc(v.n).then((x) => x.length)));
  const totalHeads = heads.reduce((a, b) => a + b, 0);
  const last = store.get("ft:last", null);
  const lastP = last && last.p ? await page(last.p - 1).catch(() => null) : null;
  // hər cild ayrıca kitab: ortaq dəri üz qabığı (img/cover.webp: çərçivə, «مجموع الفتاوى», «شيخ الإسلام ابن تيمية»), üstündə cild nömrəsi və mövzusu
  const tile = (v, i) => {
    const [a, b] = v.title.split(/:\s*/);
    const len = a.length;
    return `<a class="vbook" href="#/v/${v.n}" title="الجزء ${arNum(v.n)}: ${esc(v.title)}"><div class="bk"><div class="vcover" style="--fs:${len > 16 ? 0.86 : len > 11 ? 0.95 : 1.05}"><span class="vnum"><b>${arNum(v.n)}</b></span><span class="vtt"><span class="gold">${esc(a)}</span>${b ? `<small class="gold">${esc(b)}</small>` : ""}</span></div></div><div class="vmeta">${esc(t("pagesN", { n: fmt(v.count) }))} · ${esc(t("headsN", { n: fmt(heads[i]) }))}</div></a>`;
  };
  app.innerHTML = `
    <section class="fhero">
      <div class="fcover" aria-hidden="true"><div class="ct">مجموع الفتاوى</div><div class="ca">شيخ الإسلام ابن تيمية</div><div class="cp">٣٥</div></div>
      <div class="ftext">
        <h1 class="ar">مجموع الفتاوى</h1>
        ${lang !== "ar" ? `<p class="tr">${esc(t("title"))}</p>` : ""}
        <p class="by">${esc(t("by"))}</p>
        <p class="muted">${esc(t("compiled"))}</p>
        <p class="muted sm">${esc(t("edition"))}</p>
        <div class="stats"><span>${esc(t("volsN", { n: fmt(m.vols.length) }))}</span><span>${esc(t("pagesN", { n: fmt(m.N) }))}</span><span>${esc(t("headsN", { n: fmt(totalHeads) }))}</span></div>
        <div class="acts"><a class="btn" href="#/p/1">${esc(t("start"))}</a>${lastP ? `<a class="btn ghost" href="#/p/${last.p}">${esc(t("resume", { r: ref(lastP) }))}</a>` : ""}</div>
      </div>
    </section>
    <section class="tools">
      <div class="tcard"><h2>${esc(t("searchTitle"))}</h2>${searchForm("", 0, [])}
        <p class="ex muted">${esc(t("ex"))} ${["التوسل", "لا تشد الرحال", "الصبر على البلاء", "طلاق الثلاث"].map((x) => `<a href="#/s?q=${encodeURIComponent(x)}" class="ar">${x}</a>`).join(" · ")}</p></div>
      <div class="tcard"><h2>${esc(t("jumpTitle"))}</h2>${jumpForm(m.vols, 1)}</div>
    </section>
    <section class="volumes"><h2>${esc(t("volumes"))}</h2>
      <div class="shelf">${m.vols.map((v, i) => tile(v, i)).join("")}</div>
      <p class="note muted">${esc(t("indexVols"))}</p>
    </section>`;
  bindSearch();
  bindJump();
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
    <section class="tools one"><div class="tcard">${searchForm("", n, m.vols)}</div></section>
    <section class="tocbox">
      <div class="tocbar"><input id="tf" type="search" dir="rtl" placeholder="${esc(t("tocFilter"))}"><div class="chips">${["all", ...kinds].map((k) => `<button type="button" class="chip ${k === "all" ? "on" : ""}" data-k="${k}">${esc(t(k === "all" ? "kAll" : "k" + k))} <small>${fmt(k === "all" ? items.length : items.filter((x) => x.k === k).length)}</small></button>`).join("")}</div></div>
      <ol class="toc" id="toc">${items.map((x) => `<li class="k-${x.k}" data-k="${x.k}"><a href="#/p/${x.d + 1}"><span class="tk" aria-hidden="true"></span><span class="tt ar">${esc(x.t)}</span><span class="tp">${x.ap ? esc(t("appendix")) + " " : ""}ص ${arNum(x.pg)}</span></a></li>`).join("")}</ol>
    </section>`;
  bindSearch();
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
    $("#hits").insertAdjacentHTML("beforeend", pages.map((p) => `<a class="hit" href="#/p/${p.d + 1}?q=${encodeURIComponent(q)}"><div class="h1"><b>${esc(ref(p))}</b><span>${esc(p.title)}</span></div><div class="s ar">${snippet(p.text, set)}</div><div class="vt muted">${esc(p.volTitle)}</div></a>`).join(""));
    if (off < r.list.length) $("#hits").insertAdjacentHTML("afterend", `<button class="btn ghost moreb" id="moreb">${esc(t("more"))}</button>`), ($("#moreb").onclick = more);
  };
  await more();
}

// ---------------------------------------------------------------- oxucu
let fsz = store.get("ft:fs", 21);
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
  $("#pb").innerHTML = (p.startTitle ? `<div class="bab">${esc(p.startTitle)}</div>` : "") + (textHTML(p, set) || `<p class="muted">—</p>`);
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
