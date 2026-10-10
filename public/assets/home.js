import { $, esc, t, fmt, header, footer, catalog, coverHTML, bookUrl, bookName, lastRead, removeLast, clearLast, api, SECTIONS, secTitle, secDesc, sectionUrl, sectionBooks, hitHTML } from "./common.js";

header("home");
footer();
$("#h1").innerHTML = `${esc(t("hero1"))} <span>${esc(t("hero2"))}</span>`;
$("#q").placeholder = t("searchAll");
$("#sb").textContent = t("search");
$("#shint").textContent = t("searchHint");
$("#ld").textContent = t("loading");

const cat = await catalog().catch(() => null);
if (!cat) $("#ld").textContent = t("error");
else {
  $("#sub").textContent = t("heroTag");
  $("#stats").innerHTML = [t("booksN", { n: fmt(cat.count) }), t("pagesN", { n: fmt(cat.pages) }), t("secN", { n: fmt(cat.sections.length + 1) })].map((x) => `<span>${esc(x)}</span>`).join("");
  renderResume();
  renderSections();
}

// «Davam et»: bölmə kartlarından fərqli, yığcam bir sıra (çiplər); yalnız oxunan kitab varsa görünür
function renderResume() {
  const items = Object.entries(lastRead()).filter(([id]) => cat.byId.has(id)).sort((a, b) => b[1].at - a[1].at).slice(0, 3);
  const box = $("#resume");
  if (!items.length) return (box.innerHTML = "");
  const chips = items
    .map(([id, v]) => {
      const b = cat.byId.get(id);
      const title = String(b.ar || "").split(" - ")[0];
      return `<span class="rchip"><a href="${bookUrl(b, v.p)}"><bdi class="rt" lang="ar" dir="rtl">${esc(title)}</bdi><span class="rp">${esc(t("lastRead", { p: fmt(v.p), n: fmt(b.pages) }))}</span></a><button type="button" class="rx" data-id="${esc(id)}" aria-label="${esc(t("removeOne"))}" title="${esc(t("removeOne"))}">×</button></span>`;
    })
    .join("");
  box.innerHTML = `<div class="rhead"><span class="rh">${esc(t("resume"))}</span><button type="button" class="rclear">${esc(t("clearAll"))}</button></div><div class="rchips">${chips}</div>`;
}
$("#resume").addEventListener("click", (e) => {
  const x = e.target.closest(".rx");
  if (x) { removeLast(x.dataset.id); return renderResume(); }
  if (e.target.closest(".rclear")) { clearLast(); renderResume(); }
});

// 4 böyük bölmə kartı
function renderSections() {
  $("#sections").innerHTML = cat.sections
    .map((s) => {
      const all = sectionBooks(s);
      const mj = all.find((b) => b.id === "majmu");
      const books = all.filter((b) => b !== mj);
      const count = mj ? t("itCount", { a: fmt(books.length), b: fmt(mj.volumes) }) : t("booksN", { n: fmt(books.length) });
      const fan = books.slice(0, 3).map((b, i) => `<div class="fan f${i}">${coverHTML(b, "mini")}</div>`).join("");
      const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${SECTIONS[s.id].icon}"/></svg>`;
      return `<a class="seccard" data-s="${s.id}" href="${sectionUrl(s.id)}"><div class="fanbox">${fan}</div><div class="sbody"><div class="sic">${icon}</div><h2>${esc(secTitle(s.id))}</h2><p>${esc(secDesc(s.id))}</p><div class="sfoot"><span class="scount">${esc(count)}</span><span class="cta" aria-label="${esc(t("goSection"))}">${esc(t("goSection"))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></div></div></a>`;
    })
    .join("");
  $("#sections").insertAdjacentHTML("afterbegin", quranCard());
}

// Quran kartı: digər bölmə kartları ilə eyni komponent, ilk yerdə; qızılı vurğu və real mushaf fotosu (assets/img/CREDITS.txt)
function quranCard() {
  const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6Zm0 0v13"/></svg>`;
  const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`;
  return `<a class="seccard" data-s="quran" href="/quran"><div class="fanbox qphoto"><img src="/assets/img/mushaf.webp" width="600" height="504" alt="${esc(t("sec_quran"))}" decoding="async"></div><div class="sbody"><div class="sic">${icon}</div><h2>${esc(t("sec_quran"))}</h2><p>${esc(t("desc_quran"))}</p><div class="sfoot"><span class="scount">${esc(t("surasN", { n: fmt(114) }))}</span><span class="cta" aria-label="${esc(t("goSection"))}">${esc(t("goSection"))}${arrow}</span></div></div></a>`;
}

// bütün kitabxanada axtarış
$("#sf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  const box = $("#results");
  if (!q) return box.classList.add("hidden");
  box.classList.remove("hidden");
  box.innerHTML = `<p class="muted">${esc(t("loading"))}</p>`;
  try {
    const r = await api("/api/search?q=" + encodeURIComponent(q));
    if (!r.total && !(r.books || []).length) {
      box.innerHTML = `<h2>${esc(t("results"))}</h2><p class="muted">${esc(t("noResults"))}</p>`;
      return;
    }
    const via = r.expanded && r.expanded.length && !/[\u0621-\u064A]/.test(q) ? `<p class="via muted">${esc(t("searchedAs"))}: <span class="ar">${r.expanded.slice(0, 4).map(esc).join(" · ")}</span>${r.corrected ? ` <span>(${esc(r.corrected)})</span>` : ""}</p>` : "";
    const books = (r.books || []).filter((x) => cat.byId.has(x.book));
    const bookRow = books.length ? `<div class="res-sec"><h4>${esc(t("booksFound"))}</h4><div class="bookhits">${books.map((x) => { const b = cat.byId.get(x.book); return `<a class="bookhit" href="${bookUrl(b)}">${coverHTML(b, "mini")}<span><b class="ar">${esc(b.ar)}</b><small>${esc(bookName(b))}</small></span></a>`; }).join("")}</div></div>` : "";
    box.innerHTML =
      `<h2>${esc(t("results"))} <small class="muted">${esc(t("resultsN", { n: fmt(r.total) }))}</small></h2>` + via + bookRow +
      r.sections
        .filter((s) => s.total)
        .map((s) => `<div class="res-sec"><h4>${esc(secTitle(s.id))} · ${esc(t("resultsN", { n: fmt(s.total) }))}</h4>${s.results.map((h) => hitHTML(h, cat, q)).join("")}</div>`)
        .join("");
  } catch {
    box.innerHTML = `<p class="muted">${esc(t("error"))}</p>`;
  }
});
const q0 = new URLSearchParams(location.search).get("q");
if (q0) {
  $("#q").value = q0;
  $("#sf").requestSubmit();
}
