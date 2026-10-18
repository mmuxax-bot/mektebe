import { $, esc, t, fmt, pick, header, footer, catalog, api, secTitle, secDesc, sectionBooks, bookCard } from "./common.js";

header("home");
footer();
let id = decodeURIComponent((location.pathname.match(/^\/bolme\/([^/?#]+)/) || [])[1] || new URLSearchParams(location.search).get("s") || "");
// köhnə /bolme/majmu linki İbn Teymiyyə bölməsinə keçir
if (id === "majmu") {
  history.replaceState(null, "", "/bolme/ibn-taymiyyah#majmu");
  id = "ibn-taymiyyah";
}
$("#ld").textContent = t("loading");
$("#filter").placeholder = t("filter");

const cat = await catalog().catch(() => null);
const sec = cat && cat.sections.find((s) => s.id === id);
if (!sec) {
  $("#ld").textContent = t("error");
  throw new Error("section");
}
document.title = `${secTitle(id)} — Nibras Library`;
const all = sectionBooks(sec);
const mj = all.find((b) => b.id === "majmu");
const books = all.filter((b) => b !== mj);
$("#crumbs").innerHTML = `<a href="/">${esc(t("library"))}</a><span>›</span><b>${esc(secTitle(id))}</b>`;
$("#title").textContent = secTitle(id);
$("#desc").textContent = `${secDesc(id)} · ${mj ? t("itCount", { a: fmt(books.length), b: fmt(mj.volumes) }) : t("booksN", { n: fmt(books.length) })}`;

// Nəhv: ölüm ilinə görə üç dövr (dövr daxilində məlumatdakı sıra qorunur; ili məlum olmayan kitab əvvəlkinin dövründə qalır)
function nahwGroups(list) {
  const names = t("eras").split("|");
  const era = (d) => (d <= 500 ? 0 : d <= 900 ? 1 : 2);
  const out = names.map((n) => ({ title: n, books: [] }));
  let last = 0;
  for (const b of list) {
    const e = b.death ? era(b.death) : last;
    out[e].books.push(b);
    last = e;
  }
  return out.filter((g) => g.books.length);
}
const groups =
  id === "ibn-taymiyyah"
    ? sec.groups.filter((g) => g.stage).map((g) => ({ title: `${t("stage")[g.stage - 1]} — ${pick(g.title)}`, books: g.books }))
    : id === "nahw"
      ? nahwGroups(books)
      : [{ title: "", books }];

$("#shelf").innerHTML = groups
  .map((g) => `<section class="group">${g.title ? `<h3>${esc(g.title)} <small>${esc(t("booksN", { n: fmt(g.books.length) }))}</small></h3>` : ""}<div class="grid">${g.books.map(bookCard).join("")}</div></section>`)
  .join("");

// Məcmuul-fətava: kitabların ən başında ayrıca vurğulanmış blok; üz qabığı və düymə yeni səhifəni (/fatawa/) açır, cildlər birbaşa açılır
if (mj) {
  $("#shelf").insertAdjacentHTML(
    "afterbegin",
    `<section class="group feature" id="majmu"><div class="fhead">${bookCard(mj)}<div class="ftext"><h3><a href="/fatawa/">${esc(secTitle("majmu"))}</a> <small>${esc(t("volsN", { n: fmt(mj.volumes) }))}</small></h3><p class="muted">${esc(t("majmuNote"))}</p><a class="btn sm" href="/fatawa/">${esc(t("majmuOpen"))}</a></div></div><div class="vols" id="vols"></div></section>`,
  );
  api("/api/toc?book=majmu")
    .then((r) => {
      $("#vols").innerHTML = r.volumes.map((v) => `<a class="vtile" href="/fatawa/#/v/${v.v}"><span class="vn">${fmt(v.v)}</span><span class="vt ar">${esc(v.t)}</span></a>`).join("");
      if (location.hash === "#majmu") $("#majmu").scrollIntoView();
    })
    .catch(() => {});
}

$("#filter").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".book").forEach((a) => a.classList.toggle("hidden", q ? !a.dataset.f.includes(q) : false));
  document.querySelectorAll(".vtile").forEach((a) => a.classList.toggle("hidden", q ? !(a.textContent + " " + mj?.ar + " " + secTitle("majmu")).toLowerCase().includes(q) : false));
  document.querySelectorAll(".group").forEach((g) => g.classList.toggle("hidden", !!q && !g.querySelector(".book:not(.hidden), .vtile:not(.hidden)")));
});
