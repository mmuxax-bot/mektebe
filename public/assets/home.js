import { $, esc, t, fmt, header, footer, catalog, coverHTML, bookUrl, lastRead, api, SECTIONS, secTitle, secDesc, sectionUrl, sectionBooks, hitHTML } from "./common.js";

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
  $("#stats").innerHTML = [t("booksN", { n: fmt(cat.count) }), t("pagesN", { n: fmt(cat.pages) }), t("secN", { n: fmt(cat.sections.length) })].map((x) => `<span>${esc(x)}</span>`).join("");
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
    if (!r.total) {
      box.innerHTML = `<h2>${esc(t("results"))}</h2><p class="muted">${esc(t("noResults"))}</p>`;
      return;
    }
    box.innerHTML =
      `<h2>${esc(t("results"))} <small class="muted">${esc(t("resultsN", { n: fmt(r.total) }))}</small></h2>` +
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
