import { $, esc, t, fmt, pick, lang, header, footer, catalog, coverHTML, bookName, bookUrl, lastRead, api, markHTML, countLabel } from "./common.js";

header("home");
footer();
$("#h1").innerHTML = `${esc(t("hero1"))} <span>${esc(t("hero2"))}</span>`;
$("#q").placeholder = t("searchAll");
$("#sb").textContent = t("search");
$("#filter").placeholder = t("filter");
$("#ld").textContent = t("loading");

const LIMIT = 12;
const sub = (b) => [b.death ? t("death", { y: fmt(b.death) }) : "", b.volumes > 1 ? t("volsN", { n: fmt(b.volumes) }) : "", countLabel(b)].filter(Boolean).join(" · ");
const card = (b) => `<a class="book" href="${bookUrl(b)}" data-f="${esc((b.ar + " " + Object.values(b.name || {}).join(" ") + " " + b.author).toLowerCase())}">${coverHTML(b)}<div class="meta"><div class="nm">${esc(bookName(b))}</div><div class="sub">${esc(sub(b))}</div></div></a>`;

const cat = await catalog().catch(() => null);
if (!cat) {
  $("#ld").textContent = t("error");
} else {
  $("#sub").textContent = t("heroSub", { books: fmt(cat.count), pages: fmt(cat.pages) });
  renderResume(cat);
  renderShelves(cat);
}

function renderResume(cat) {
  const items = Object.entries(lastRead()).filter(([id]) => cat.byId.has(id)).sort((a, b) => b[1].at - a[1].at).slice(0, 4);
  $("#resume").innerHTML = items
    .map(([id, v]) => {
      const b = cat.byId.get(id);
      return `<a class="resume-card" href="${bookUrl(b, v.p)}">${coverHTML(b, "mini")}<div><span>${esc(t("resumeTitle"))}</span><b>${esc(b.ar)}</b><span>${esc(t("lastRead", { p: fmt(v.p), n: fmt(b.pages) }))}</span></div><span class="btn sm">${esc(t("resume"))}</span></a>`;
    })
    .join("");
}

function renderShelves(cat) {
  const html = cat.sections
    .map((s) => {
      const n = s.groups.reduce((a, g) => a + g.books.length, 0);
      const groups = s.groups
        .map((g) => {
          const h = g.stage ? `<h3>${esc(t("stage")[g.stage - 1])} — ${esc(pick(g.title))}</h3>` : "";
          const many = g.books.length > LIMIT + 2;
          return `<div class="group">${h}<div class="grid" data-many="${many ? 1 : 0}">${g.books.map(card).join("")}</div>${many ? `<div class="more-row"><button class="btn ghost sm" data-more="${g.books.length}">${esc(t("showAll", { n: g.books.length }))}</button></div>` : ""}</div>`;
        })
        .join("");
      return `<section class="section" id="s-${s.id}"><h2>${esc(pick(s.title))} <small>${esc(t("booksN", { n: fmt(n) }))}</small></h2>${groups}</section>`;
    })
    .join("");
  $("#shelves").innerHTML = html;
  for (const grid of document.querySelectorAll('.grid[data-many="1"]')) collapse(grid, true);
  document.querySelectorAll("[data-more]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const grid = btn.closest(".group").querySelector(".grid");
      const open = grid.dataset.open === "1";
      collapse(grid, open);
      btn.textContent = open ? t("showAll", { n: btn.dataset.more }) : t("showLess");
    }),
  );
}
function collapse(grid, yes) {
  grid.dataset.open = yes ? "0" : "1";
  [...grid.children].forEach((c, i) => c.classList.toggle("hidden", yes && i >= LIMIT));
}

$("#filter").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".book").forEach((a) => a.classList.toggle("hidden", q ? !a.dataset.f.includes(q) : false));
  if (!q) document.querySelectorAll('.grid[data-many="1"]').forEach((g) => collapse(g, g.dataset.open !== "1"));
  document.querySelectorAll(".more-row").forEach((r) => r.classList.toggle("hidden", !!q));
  document.querySelectorAll(".section").forEach((s) => s.classList.toggle("hidden", q && !s.querySelector(".book:not(.hidden)")));
});

// ---------- bütün kitabxanada axtarış
$("#sf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  const box = $("#results");
  if (!q) return box.classList.add("hidden");
  box.classList.remove("hidden");
  box.innerHTML = `<p class="muted">${esc(t("loading"))}</p>`;
  try {
    const [r, cat] = await Promise.all([api("/api/search?q=" + encodeURIComponent(q)), catalog()]);
    const secTitle = new Map(cat.sections.map((s) => [s.id, pick(s.title)]));
    if (!r.total) {
      box.innerHTML = `<h2>${esc(t("results"))}</h2><p class="muted">${esc(t("noResults"))}</p>`;
      return;
    }
    box.innerHTML =
      `<h2>${esc(t("results"))} <small class="muted">${esc(t("resultsN", { n: fmt(r.total) }))}</small></h2>` +
      r.sections
        .filter((s) => s.total)
        .map((s) => `<div class="res-sec"><h4>${esc(secTitle.get(s.id))} · ${esc(t("resultsN", { n: fmt(s.total) }))}</h4>${s.results.map((h) => hitHTML(h, cat, q)).join("")}</div>`)
        .join("");
  } catch {
    box.innerHTML = `<p class="muted">${esc(t("error"))}</p>`;
  }
});
function hitHTML(h, cat, q) {
  const b = cat.byId.get(h.book);
  return `<a class="hit" href="${bookUrl(b, h.p)}&q=${encodeURIComponent(q)}"><div class="h1"><b>${esc(b.ar)}</b><span>${esc(h.ref)}${h.title ? " · " + esc(h.title) : ""}</span></div><div class="s">${markHTML(h.s, h.hl)}</div></a>`;
}

// ?q=... ilə açılanda axtarış dərhal işləyir (paylaşılan link)
const q0 = new URLSearchParams(location.search).get("q");
if (q0) {
  $("#q").value = q0;
  $("#sf").requestSubmit();
}
