import { $, esc, t, lang, fmt, catalog, api, saveLast, lastRead, markHTML, toast, bookName } from "./common.js?v=e5c0v3r";

const id = decodeURIComponent((location.pathname.match(/^\/kitab\/([^/?#]+)/) || [])[1] || new URLSearchParams(location.search).get("b") || "");
const qs = new URLSearchParams(location.search);
const hlQuery = qs.get("q") || "";
let FLIP_MS = 620;
// köhnə /kitab/majmu linkləri yeni Məcmuul-fətava səhifəsinə keçir (səhifə nömrəsi eynidir)
if (id === "majmu") {
  const p = parseInt(qs.get("p"), 10);
  location.replace(`/fatawa/${p > 0 ? `#/p/${p}${hlQuery ? "?q=" + encodeURIComponent(hlQuery) : ""}` : ""}`);
  throw new Error("redirect");
}

$("#homeLbl").textContent = t("library");
$("#tocLbl").textContent = t("toc");
$("#searchLbl").textContent = t("searchBook");
$("#bNext").textContent = "← " + t("next");
$("#bPrev").textContent = t("prev") + " →";
$("#pgLbl").textContent = t("page");
$("#goBtn").textContent = t("go");
$("#tToc").textContent = t("toc");
$("#tSearch").textContent = t("searchBook");
$("#tf").placeholder = t("tocFilter");
$("#bq").placeholder = t("searchHint");
$("#bsgo").textContent = t("search");
$("#fup").title = t("fontUp");
$("#fdown").title = t("fontDown");

const cat = await catalog().catch(() => null);
const b = cat && cat.byId.get(id);
if (!b) {
  $("#ttl").textContent = t("error");
  throw new Error("book");
}
document.title = `${b.ar} — Nibras Library`;
$("#ttl").innerHTML = `${esc(b.ar)}`;
$("#ttl").title = bookName(b);
// hədis kitabı: çap / nömrələmə qeydi (başlığın altında kiçik sətir)
if (b.edNote) {
  const e = $("#edn");
  e.textContent = b.edNote[lang] || b.edNote.az;
  e.dir = lang === "ar" ? "rtl" : "ltr";
  e.hidden = false;
}
$("#ptot").textContent = "/ " + fmt(b.pages);
$("#pin").max = b.pages;

// ---------------------------------------------------------------- şrift
let fsz = Number(localStorage.getItem("nl:fs")) || 21;
const applyFs = () => {
  document.documentElement.style.setProperty("--rfs", fsz + "px");
  document.querySelectorAll(".pbody").forEach((b) => b._upd && b._upd());
};
applyFs();
$("#fup").onclick = () => ((fsz = Math.min(32, fsz + 1)), applyFs(), localStorage.setItem("nl:fs", fsz));
$("#fdown").onclick = () => ((fsz = Math.max(15, fsz - 1)), applyFs(), localStorage.setItem("nl:fs", fsz));

// ---------------------------------------------------------------- səhifə məlumatı
const cache = new Map();
function load(p) {
  if (p < 1 || p > b.pages) return Promise.resolve(null);
  const k = p;
  if (!cache.has(k)) {
    const u = `/api/page?book=${encodeURIComponent(b.id)}&p=${p}` + (hlQuery ? "&q=" + encodeURIComponent(hlQuery) : "");
    cache.set(k, api(u).catch((e) => (cache.delete(k), Promise.reject(e))));
    if (cache.size > 40) cache.delete(cache.keys().next().value);
  }
  return cache.get(k);
}

const FN_SEP = /^\s*[_ـ\-–—]{5,}\s*$/;
function textHTML(text, hl) {
  // vurğu üçün işarələr: mətn sözbəsöz qalır
  let s = String(text || "");
  if (hl && hl.length) {
    let o = "";
    let i = 0;
    for (const [a, z] of hl) {
      if (a < i) continue;
      o += s.slice(i, a) + "\u0001" + s.slice(a, z) + "\u0002";
      i = z;
    }
    s = o + s.slice(i);
  }
  const lines = s.split("\n");
  let fn = false;
  const main = [];
  const notes = [];
  for (const l of lines) {
    if (FN_SEP.test(l)) {
      fn = true;
      continue;
    }
    if (!l.trim()) continue;
    const h = esc(l).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
    (fn ? notes : main).push(`<p>${h}</p>`);
  }
  return main.join("") + (notes.length ? `<div class="fn">${notes.join("")}</div>` : "");
}
function pageHTML(d) {
  if (!d) return `<div class="phead"></div><div class="pwrap"><div class="pbody"><div class="pin"></div></div></div><div class="pfoot"></div>`;
  const head = `<div class="phead"><span class="rh">${esc(d.title || b.ar)}</span><span class="rf">${esc(d.ref || "")}</span></div>`;
  let body = "";
  if (b.kind === "hd") {
    // çapdakı kimi: besmələ / kitab / bab başlığı / tərcümə mətni, sonra hədis
    const fr = d.front || [];
    body += fr.map((x) => (x.k === "basmala" ? `<div class="fr-basm">${esc(x.t)}</div>` : x.k === "kitab" ? `<div class="fr-kitab">${esc(x.t)}</div>` : x.k === "bab" ? `<div class="bab">${esc(x.t)}</div>` : `<p class="fr-text">${esc(x.t)}</p>`)).join("");
    if (fr.some((x) => x.k === "text")) body += `<div class="fr-end"></div>`;
    body += (d.head || []).map((x) => `<div class="bab">${esc(x)}</div>`).join("");
    body += textHTML(d.text, d.hl);
    body += `<div class="grade">${esc(d.foot[0] || "")}</div><div class="src">${esc(d.foot[1] || "")}</div>`;
  } else {
    // Məcmuul-fətava: yeni fətva/fəsil başlayan səhifədə başlıq (mətn dəyişmir)
    if (d.startTitle) body += `<div class="bab">${esc(d.startTitle)}</div>`;
    body += textHTML(d.text, d.hl) || `<p class="muted">—</p>`;
  }
  return `${head}<div class="pwrap"><div class="pbody"><div class="pin">${body}</div></div><div class="ptrack"><i></i></div><div class="pmore"><button type="button" tabindex="-1">↓ ${esc(t("moreBelow"))}</button></div></div><div class="pfoot">${d.p}</div>`;
}
function paint(el, d) {
  el.classList.toggle("blank", !d);
  el.innerHTML = pageHTML(d);
  watch(el);
}
// Uzun səhifə kağızın içində sürüşür: sağ/sol kənarda göstərici, altda «Davamı aşağıda». Çevriləndə yuxarıdan başlayır (yeni DOM).
const ro = new ResizeObserver((es) => es.forEach((e) => e.target._upd && e.target._upd()));
function watch(el) {
  const body = el.querySelector(".pbody");
  if (!body) return;
  const thumb = el.querySelector(".ptrack i");
  const upd = () => {
    const sh = body.scrollHeight;
    const ch = body.clientHeight;
    const long = sh > ch + 2;
    el.classList.toggle("long", long);
    el.classList.toggle("more-below", long && body.scrollTop + ch < sh - 6);
    if (long && thumb) {
      const h = Math.max(12, (ch / sh) * 100);
      thumb.style.height = h + "%";
      thumb.style.top = (body.scrollTop / (sh - ch)) * (100 - h) + "%";
    }
  };
  body._upd = upd;
  body.addEventListener("scroll", upd, { passive: true });
  const mb = el.querySelector(".pmore button");
  if (mb) mb.onclick = () => body.scrollBy({ top: body.clientHeight * 0.85, behavior: "smooth" });
  ro.observe(body);
  if (body.firstElementChild) {
    body.firstElementChild._upd = upd; // şrift yüklənəndə / ölçü dəyişəndə mətn hündürlüyü dəyişir
    ro.observe(body.firstElementChild);
  }
  upd();
  if (document.fonts) document.fonts.ready.then(upd);
}
// Boşluq / PageDown / ↓: əvvəl səhifənin özü sürüşür, sonu görünəndə növbəti səhifə
function scrollOrTurn(dir) {
  const bodies = [$("#pr .pbody"), spread ? $("#pl .pbody") : null].filter(Boolean);
  if (dir < 0) bodies.reverse();
  for (const bd of bodies) {
    const atEnd = dir > 0 ? bd.scrollTop + bd.clientHeight >= bd.scrollHeight - 6 : bd.scrollTop <= 2;
    if (!atEnd) return bd.scrollBy({ top: dir * bd.clientHeight * 0.85, behavior: reduce ? "auto" : "smooth" });
  }
  go(dir);
}

// ---------------------------------------------------------------- vəziyyət
let spread = innerWidth >= 900;
const align = (p) => (spread ? p - ((p - 1) % 2) : p);
let start = Number(qs.get("p")) || (lastRead()[b.id] || {}).p || b.start || 1;
let cur = align(Math.min(Math.max(1, start), b.pages));
let busy = false;
const step = () => (spread ? 2 : 1);
const bookEl = $("#book");

function layout() {
  bookEl.classList.toggle("spread", spread);
  bookEl.classList.toggle("single", !spread);
}
async function show(p) {
  cur = align(Math.min(Math.max(1, p), b.pages));
  const [r, l] = await Promise.all([load(cur), spread ? load(cur + 1) : null]).catch(() => [null, null]);
  paint($("#pr"), r);
  if (spread) paint($("#pl"), l);
  if (!r) toast(t("error"));
  if (hlQuery) for (const el of [$("#pr"), spread ? $("#pl") : null]) {
    const mk = el && el.querySelector(".pbody mark");
    if (mk) el.querySelector(".pbody").scrollTop = Math.max(0, mk.offsetTop - 60);
  }
  after();
}
function after() {
  $("#pin").value = cur;
  const u = new URL(location.href);
  u.searchParams.set("p", cur);
  history.replaceState(null, "", u);
  saveLast(b.id, cur);
  $("#bNext").disabled = $("#eNext").disabled = cur + step() > b.pages;
  $("#bPrev").disabled = $("#ePrev").disabled = cur <= 1;
  for (let k = 1; k <= 3; k++) load(cur + step() + k - 1), load(cur - k);
  markToc();
}

// ---------------------------------------------------------------- vərəq çevirmə (CSS 3D)
function flipper(side, frontD, backD) {
  const f = document.createElement("div");
  f.className = "flip";
  const w = spread ? "50%" : "100%";
  Object.assign(f.style, { width: w, [side]: "0" });
  f.style.transformOrigin = side === "left" ? "right center" : "left center";
  if (!spread) f.style.transformOrigin = "right center";
  const cls = (s) => (spread ? (s === "left" ? "leaf l" : "leaf r") : "leaf r");
  const backSide = side === "left" ? "right" : "left";
  f.innerHTML = `<div class="face front"><div class="${cls(side)}" style="height:100%"><div class="page"></div></div></div><div class="face back"><div class="${cls(backSide)}" style="height:100%"><div class="page"></div></div></div><div class="shade"></div>`;
  paint(f.querySelector(".front .page"), frontD);
  paint(f.querySelector(".back .page"), backD);
  if (!spread && !backD) f.querySelector(".back .page").classList.add("blank");
  bookEl.append(f);
  return f;
}
function animate(f, from, to) {
  return new Promise((res) => {
    const a = f.animate([{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }], { duration: FLIP_MS, easing: "cubic-bezier(.45,.05,.35,1)" });
    const sh = f.querySelector(".shade");
    sh.animate([{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: FLIP_MS });
    a.onfinish = () => res();
    a.oncancel = () => res();
  });
}
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function go(dir) {
  if (busy) return;
  const target = cur + dir * step();
  if (target < 1 || target > b.pages) return;
  busy = true;
  try {
    if (reduce) return await show(target);
    if (spread) {
      const [n1, n2] = await Promise.all([load(target), load(target + 1)]);
      if (dir > 0) {
        // sol vərəq (cur+1) sağa çevrilir; arxasında yeni sağ səhifə (target)
        const old = await load(cur + 1);
        paint($("#pl"), n2);
        const f = flipper("left", old, n1);
        await animate(f, 0, 180);
        paint($("#pr"), n1);
        f.remove();
      } else {
        const old = await load(cur);
        paint($("#pr"), n1);
        const f = flipper("right", old, n2);
        await animate(f, 0, -180);
        paint($("#pl"), n2);
        f.remove();
      }
    } else {
      const n = await load(target);
      const old = await load(cur);
      if (dir > 0) {
        paint($("#pr"), n);
        const f = flipper("left", old, null);
        await animate(f, 0, 180);
        f.remove();
      } else {
        const f = flipper("left", n, null);
        await animate(f, 180, 0);
        paint($("#pr"), n);
        f.remove();
      }
    }
    cur = target;
    after();
  } catch {
    toast(t("error"));
  } finally {
    busy = false;
  }
}
async function jump(p) {
  closeDrawer();
  if (busy) return;
  busy = true;
  try {
    await show(p);
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------- idarə: düymələr, ox düymələri, sürüşdürmə
// Ərəb kitabı sağdan sola: növbəti səhifə soldadır (← / sağa sürüşdür)
$("#bNext").onclick = $("#eNext").onclick = () => go(1);
$("#bPrev").onclick = $("#ePrev").onclick = () => go(-1);
$("#jump").onsubmit = (e) => {
  e.preventDefault();
  const p = Number($("#pin").value);
  if (p >= 1 && p <= b.pages) jump(p);
};
addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "ArrowLeft") go(1);
  else if (e.key === "ArrowRight") go(-1);
  else if (e.key === " " || e.key === "PageDown" || e.key === "ArrowDown") (e.preventDefault(), scrollOrTurn(1));
  else if (e.key === "PageUp" || e.key === "ArrowUp") (e.preventDefault(), scrollOrTurn(-1));
  else if (e.key === "Escape") closeDrawer();
});
let tx = null;
const stage = $("#stage");
stage.addEventListener("touchstart", (e) => (tx = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null), { passive: true });
stage.addEventListener("touchend", (e) => {
  if (!tx) return;
  const dx = e.changedTouches[0].clientX - tx.x;
  const dy = e.changedTouches[0].clientY - tx.y;
  if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.6 && Date.now() - tx.t < 800) go(dx > 0 ? 1 : -1);
  tx = null;
});
addEventListener("resize", () => {
  const s = innerWidth >= 900;
  if (s !== spread) {
    spread = s;
    layout();
    show(cur);
  }
});

// ---------------------------------------------------------------- yan panel: mündəricat və axtarış
const drawer = $("#drawer");
function openDrawer(tab) {
  drawer.classList.add("open");
  $("#scrim").classList.remove("hidden");
  setTab(tab);
}
function closeDrawer() {
  drawer.classList.remove("open");
  $("#scrim").classList.add("hidden");
}
function setTab(tab) {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
  $("#paneToc").classList.toggle("hidden", tab !== "toc");
  $("#paneSearch").classList.toggle("hidden", tab !== "search");
  if (tab === "toc") loadToc();
  else setTimeout(() => $("#bq").focus(), 50);
}
$("#btoc").onclick = () => openDrawer("toc");
$("#bsearch").onclick = () => openDrawer("search");
$("#dclose").onclick = closeDrawer;
$("#scrim").onclick = closeDrawer;
document.querySelectorAll(".tab").forEach((x) => (x.onclick = () => setTab(x.dataset.tab)));

let tocLoaded = false;
// Məcmuul-fətava başlıqlarında çap səhifəsi (ص) göstərilir
const item = (x, cls = "") => `<div class="titem ${cls}${x.k ? " k-" + x.k : ""}" data-p="${x.p}"><span>${esc(x.t)}</span><span class="pn">${x.pg != null ? "ص " + fmt(x.pg) : fmt(x.p)}</span></div>`;
async function loadToc() {
  if (tocLoaded) return markToc(true);
  tocLoaded = true;
  const list = $("#tocList");
  list.innerHTML = `<p class="dnote">${esc(t("loading"))}</p>`;
  try {
    const r = await api("/api/toc?book=" + encodeURIComponent(b.id));
    if (r.kind === "volumes") {
      list.innerHTML = `<p class="dnote">${esc(t("volumes"))}</p>` + r.volumes.map((v) => `<div class="titem vol" data-vol="${v.v}" data-p="${v.p}"><span>الجزء ${esc(v.v)}: ${esc(v.t)}</span><span class="pn">${fmt(v.p)}</span></div><div class="vsub" data-of="${v.v}"></div>`).join("");
    } else if (!r.items.length) {
      list.innerHTML = `<p class="dnote">${esc(t("noToc"))}</p>`;
    } else {
      let lastV = null;
      list.innerHTML = r.items
        .map((x) => {
          let pre = "";
          if (x.v != null && x.v !== lastV && b.volumes > 1) pre = `<div class="titem vol" data-p="${x.p}"><span>${x.v === 0 ? "المقدمة" : "الجزء " + x.v}</span><span class="pn"></span></div>`;
          lastV = x.v;
          return pre + item(x, b.volumes > 1 ? "sub" : "");
        })
        .join("");
    }
    markToc(true);
  } catch {
    tocLoaded = false;
    list.innerHTML = `<p class="dnote">${esc(t("error"))}</p>`;
  }
}
$("#tocList").addEventListener("click", async (e) => {
  const it = e.target.closest(".titem");
  if (!it) return;
  if (it.dataset.vol) {
    const box = $(`.vsub[data-of="${it.dataset.vol}"]`);
    if (box.innerHTML) return (box.innerHTML = "");
    box.innerHTML = `<p class="dnote">${esc(t("loading"))}</p>`;
    const r = await api(`/api/toc?book=${encodeURIComponent(b.id)}&vol=${it.dataset.vol}`).catch(() => null);
    box.innerHTML = r ? item({ t: t("startReading"), p: Number(it.dataset.p) }, "sub") + r.items.map((x) => item(x, "sub")).join("") : `<p class="dnote">${esc(t("error"))}</p>`;
    return;
  }
  jump(Number(it.dataset.p));
});
$("#tf").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  document.querySelectorAll("#tocList .titem").forEach((x) => x.classList.toggle("hidden", !!q && !x.textContent.includes(q)));
});
function markToc(scroll) {
  const items = [...document.querySelectorAll("#tocList .titem:not(.vol)")];
  let best = null;
  for (const x of items) {
    x.classList.remove("cur");
    if (Number(x.dataset.p) <= cur + (spread ? 1 : 0)) best = x;
  }
  if (best) {
    best.classList.add("cur");
    if (scroll) best.scrollIntoView({ block: "center" });
  }
}

let sq = "";
let soff = 0;
$("#bsf").onsubmit = (e) => {
  e.preventDefault();
  sq = $("#bq").value.trim();
  soff = 0;
  $("#sList").innerHTML = "";
  if (sq.length < 2) return ($("#sList").innerHTML = `<p class="dnote">${esc(t("searchShort"))}</p>`);
  runSearch();
};
async function runSearch() {
  const list = $("#sList");
  list.querySelector(".moreb")?.remove();
  const ld = document.createElement("p");
  ld.className = "dnote";
  ld.textContent = t("loading");
  list.append(ld);
  try {
    const r = await api(`/api/search?book=${encodeURIComponent(b.id)}&q=${encodeURIComponent(sq)}&offset=${soff}&limit=20`);
    ld.remove();
    if (!soff) list.innerHTML = `<p class="dnote">${esc(r.total ? t("resultsN", { n: fmt(r.total) }) : t("noResults"))}</p>`;
    list.insertAdjacentHTML("beforeend", r.results.map((h) => `<a class="hit" href="${esc(h.url || "#")}" data-p="${h.p}" data-via="${esc(r.via || "")}"><div class="h1"><b>${esc(h.ref)}</b><span>${esc(h.title || "")}</span></div><div class="s">${markHTML(h.s, h.hl)}</div></a>`).join(""));
    soff += r.results.length;
    if (soff < r.total) list.insertAdjacentHTML("beforeend", `<button class="btn ghost sm moreb">${esc(t("more"))}</button>`);
  } catch {
    ld.textContent = t("error");
  }
}
$("#sList").addEventListener("click", (e) => {
  if (e.target.closest(".moreb")) return runSearch();
  const h = e.target.closest(".hit");
  if (!h) return;
  // latın sorğu ərəbcə ifadəyə çevrilibsə, vurğulama üçün səhifə həmin ifadə ilə açılır
  if (h.dataset.via && h.dataset.via !== hlQuery && h.getAttribute("href") !== "#") return;
  e.preventDefault();
  jump(Number(h.dataset.p));
});
if (hlQuery) $("#bq").value = hlQuery;

layout();
await show(cur);
// #toc / #search ilə panel açılır (link paylaşmaq üçün)
if (location.hash === "#toc") openDrawer("toc");
else if (location.hash === "#search") {
  openDrawer("search");
  if (hlQuery) $("#bsf").requestSubmit();
}
window.__reader = { go, jump, scrollOrTurn, setFlipMs: (ms) => (FLIP_MS = ms) }; // sınaq üçün
