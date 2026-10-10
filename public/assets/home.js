import { $, esc, t, fmt, header, footer, catalog, coverHTML, bookUrl, bookName, lastRead, api, SECTIONS, secTitle, secDesc, sectionUrl, sectionBooks, hitHTML } from "./common.js";

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

// «Davam et»: yalnız oxunan kitab varsa görünür
function renderResume() {
  const items = Object.entries(lastRead()).filter(([id]) => cat.byId.has(id)).sort((a, b) => b[1].at - a[1].at).slice(0, 3);
  $("#resume").innerHTML = items
    .map(([id, v]) => {
      const b = cat.byId.get(id);
      return `<a class="resume-card" href="${bookUrl(b, v.p)}">${coverHTML(b, "mini")}<div><span>${esc(t("resumeTitle"))}</span><b>${esc(b.ar)}</b><span>${esc(t("lastRead", { p: fmt(v.p), n: fmt(b.pages) }))}</span></div><span class="btn sm">${esc(t("resume"))}</span></a>`;
    })
    .join("");
}

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
  $("#qfeat").innerHTML = quranCard();
}

// Quran: bölmələrin üstündə tam enli, mushaf üslublu əsas kart (kitab kataloqundan ayrı: /quran)
function quranCard() {
  const pills = [t("surasN", { n: fmt(114) }), t("qAyahs", { n: fmt(6236) }), t("qTafsirs", { n: fmt(3) })].map((x) => `<span>${esc(x)}</span>`).join("");
  const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`;
  return `<a class="qfeat" href="/quran"><div class="qmus" aria-hidden="true"><div class="qpage"><span class="qorn"></span><b lang="ar" dir="rtl">القرآن الكريم</b><span class="qorn"></span></div></div><div class="qbody"><h2>${esc(t("sec_quran"))}</h2><p>${esc(t("desc_quran"))}</p><div class="qpills">${pills}</div><span class="cta qcta">${esc(t("goSection"))}${arrow}</span></div></a>`;
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
