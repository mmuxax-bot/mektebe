// /quran/<n> — surənin oxunuşu: Tanzil ərəbcə mətni sözbəsöz, ayə nömrələri, «Mənaca tərcümə» (QuranEnc) seçimi və hər ayə üçün «Təfsir».
// Quran mətni heç bir tərcümə xidmətinə göndərilmir; azərbaycanca mənalar yalnız /api/quran-dan (mövcud məlumat) gəlir.
import { $, esc, t, fmt, lang, header, footer, api } from "./common.js?v=e5c0v3r";

header("home");
footer();
const n = Number((location.pathname.match(/^\/quran\/(\d+)/) || [])[1] || new URLSearchParams(location.search).get("s"));
$("#ld").textContent = t("loading");
const TR_KEY = "nl:qtr";
let showTr = localStorage.getItem(TR_KEY) === "1";
const arNum = (x) => Number(x).toLocaleString("ar-EG", { useGrouping: false });
const BOOKS = [
  ["muyassar", "التفسير الميسر"],
  ["saadi", "تفسير السعدي"],
  ["ibnkathir", "تفسير ابن كثير"],
];

const d = await api("/api/quran?s=" + n).catch(() => null);
if (!d) {
  $("#ld").textContent = t("error");
  throw new Error("sura");
}
const secName = ["en", "tr", "ru"].includes(lang) ? d[lang] : d.az;
document.title = `${d.ar} — ${t("quran")} — Nibras Library`;
$("#crumbs").innerHTML = `<a href="/">${esc(t("library"))}</a><span>›</span><a href="/quran">${esc(t("quran"))}</a><span>›</span><b>${esc(secName)}</b>`;

// Üst panel: «Mənaca tərcümə» açarı həmişə bu adla (azərbaycanca məna tərcüməsi; Quranın özü deyil)
$("#qbar").innerHTML = `<label class="trtoggle"><input type="checkbox" id="tr" ${showTr ? "checked" : ""}><span class="sw"></span><span>Mənaca tərcümə</span></label><span class="muted qhint">${esc(t("tafsirHint"))}</span>`;
$("#tr").addEventListener("change", (e) => {
  showTr = e.target.checked;
  localStorage.setItem(TR_KEY, showTr ? "1" : "0");
  render();
});

const marker = (a) => `<button class="an" type="button" data-a="${a}" aria-label="${esc(t("tafsir"))} ${a}">${arNum(a)}</button>`;
function render() {
  const head = `<header class="sh"><div class="shframe"><span class="shside">${esc(t("ayahsN", { n: fmt(d.ayahs) }))}</span><h1 class="ar">سورة ${esc(d.ar)}</h1><span class="shside">${esc(secName)} · ${fmt(d.n)}</span></div></header>`;
  const bism = d.bismillah ? `<div class="bism ar">${esc(d.bismillah)}</div>` : "";
  let body;
  if (!showTr) {
    body = `<div class="qtext ar" lang="ar">${d.ayat.map((x) => `<span class="ay" id="a${x.a}">${esc(x.ar)}</span> ${marker(x.a)} `).join("")}</div>`;
  } else {
    body =
      `<p class="trnote"><b>Mənaca tərcümə</b> — ${esc(d.trNote)}${d.source.tr ? ` <span class="muted">(${esc(d.source.tr)})</span>` : ""}</p>` +
      d.ayat
        .map(
          (x) =>
            `<section class="ayrow" id="a${x.a}"><div class="qtext ar" lang="ar"><span class="ay">${esc(x.ar)}</span> ${marker(x.a)}</div>${
              x.az ? `<div class="tr" lang="az" dir="ltr"><span class="trl">Mənaca tərcümə</span>${esc(x.az)}</div>` : ""
            }<div class="ayact"><button class="btn ghost sm tbtn" type="button" data-a="${x.a}">${esc(t("tafsir"))}</button></div></section>`,
        )
        .join("");
  }
  $("#mushaf").innerHTML = head + bism + body + `<p class="qsrc">${esc("Tanzil (tanzil.net)")}</p>`;
  $("#mushaf").classList.toggle("withtr", showTr);
  document.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => openTafsir(Number(b.dataset.a))));
}
render();
if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ block: "center" });

$("#snav").innerHTML = [
  n > 1 ? `<a class="btn ghost" href="/quran/${n - 1}">${esc(t("prevSura"))}</a>` : "<span></span>",
  `<a class="btn ghost" href="/quran">${esc(t("quran"))}</a>`,
  n < 114 ? `<a class="btn ghost" href="/quran/${n + 1}">${esc(t("nextSura"))}</a>` : "<span></span>",
].join("");

// ---------- təfsir paneli: Müyəssər / Sədi / İbn Kəsir, ərəbcə, sözbəsöz
let cur = { a: 1, book: localStorage.getItem("nl:tbook") || "muyassar" };
$("#ttabs").innerHTML = BOOKS.map(([k, nm]) => `<button type="button" class="ttab ar" data-b="${k}">${nm}</button>`).join("");
document.querySelectorAll(".ttab").forEach((b) => b.addEventListener("click", () => loadTafsir(cur.a, b.dataset.b)));
const close = () => {
  $("#tsheet").classList.remove("open");
  $("#tshade").classList.remove("open");
  $("#tsheet").setAttribute("aria-hidden", "true");
};
$("#tclose").onclick = close;
$("#tshade").onclick = close;
addEventListener("keydown", (e) => e.key === "Escape" && close());
function openTafsir(a) {
  $("#tsheet").classList.add("open");
  $("#tshade").classList.add("open");
  $("#tsheet").setAttribute("aria-hidden", "false");
  loadTafsir(a, cur.book);
}
async function loadTafsir(a, book) {
  cur = { a, book };
  localStorage.setItem("nl:tbook", book);
  document.querySelectorAll(".ttab").forEach((b) => b.classList.toggle("on", b.dataset.b === book));
  $("#tref").innerHTML = `<span class="ar">سورة ${esc(d.ar)} · ${esc(t("ayah"))} ${fmt(a)}</span><div class="tay ar">${esc(d.ayat[a - 1].ar)} ﴿${arNum(a)}﴾</div>`;
  $("#tbody").textContent = t("loading");
  $("#tsrc").textContent = "";
  try {
    const r = await api(`/api/tafsir?book=${book}&s=${n}&a=${a}`);
    if (cur.a !== a || cur.book !== book) return;
    const seg = r.segs.find((x) => !x.gap && x.text);
    if (!seg) $("#tbody").innerHTML = `<p class="muted">${esc(t("tafsirNone"))}</p>`;
    else {
      const cover = seg.to > seg.from ? `<p class="muted tcov">${esc(t("tafsirCover", { a: fmt(seg.from), b: fmt(seg.to) }))}</p>` : "";
      $("#tbody").innerHTML = cover + seg.text.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("");
    }
    $("#tsrc").textContent = `${r.name} · ${r.source} · ${t("tafsirVerbatim")}`;
    $("#tbody").scrollTop = 0;
  } catch {
    $("#tbody").textContent = t("error");
  }
}
