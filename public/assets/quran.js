// /quran — 114 surənin siyahısı (ərəbcə ad, azərbaycanca ad, ayə sayı). Mənbə: Tanzil (daxili məlumat).
import { $, esc, t, fmt, lang, header, footer, api } from "./common.js?v=aigold1";

header("home");
footer();
$("#ld").textContent = t("loading");
$("#filter").placeholder = t("suraFilter");
$("#crumbs").innerHTML = `<a href="/">${esc(t("library"))}</a><span>›</span><b>${esc(t("quran"))}</b>`;
$("#title").textContent = t("sec_quran");
document.title = `${t("quran")} — Nibras Library`;
const secName = (s) => (["en", "tr", "ru"].includes(lang) ? s[lang] : s.az);

const d = await api("/api/quran").catch(() => null);
if (!d) $("#ld").textContent = t("error");
else {
  $("#desc").textContent = `${t("surasN", { n: fmt(d.suras.length) })} · ${t("ayahsN", { n: fmt(d.suras.reduce((a, s) => a + s.ayahs, 0)) })}`;
  $("#list").innerHTML = d.suras
    .map(
      (s) =>
        `<a class="sura" href="/quran/${s.n}" data-f="${esc([s.n, s.ar, s.az, s.en, s.tr, s.ru].join(" ").toLowerCase())}"><span class="sn">${fmt(s.n)}</span><span class="snm"><b class="ar">${esc(s.ar)}</b><small>${esc(secName(s))}</small></span><span class="sc">${esc(t("ayahsN", { n: fmt(s.ayahs) }))}</span></a>`,
    )
    .join("");
}
$("#filter").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".sura").forEach((a) => a.classList.toggle("hidden", !!q && !a.dataset.f.includes(q)));
});
