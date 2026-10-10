// GET /api/quran            — 114 surə: nömrə, ərəbcə və azərbaycanca ad, ayə sayı
// GET /api/quran?s=<1..114> — surənin ayələri: Tanzil (Osmani yazı) ərəbcə mətn sözbəsöz + «Mənaca tərcümə» (QuranEnc, azeri_musayev)
// Quran mətni heç bir tərcümə xidmətinə göndərilmir; azərbaycanca mənalar yalnız mövcud daxili məlumatdan gəlir.
import { AYAS, BISMILLAH, SURA_NAMES_AR, SOURCE } from "./_quran/quran.js";
import { SURAS } from "./_quran/suras.js";
import { AZ_SOURCE } from "./_quran/az.js";
import { azText, TR_NOTE } from "./_ayah.js";
import { send, query, LONG } from "./_lib/http.js";

const meta = (n) => ({ n, ar: SURA_NAMES_AR[n - 1], az: SURAS[n - 1].az, en: SURAS[n - 1].en, tr: SURAS[n - 1].tr, ru: SURAS[n - 1].ru, ayahs: AYAS[n - 1].length });

export default function handler(req, res) {
  const q = query(req);
  if (q.s == null || q.s === "") return send(res, 200, { suras: SURAS.map((_, i) => meta(i + 1)), source: "Tanzil" }, { cache: LONG });
  const n = Number(q.s);
  if (!Number.isInteger(n) || n < 1 || n > 114) return send(res, 404, { error: "sura_not_found" });
  send(
    res,
    200,
    {
      ...meta(n),
      bismillah: n !== 1 && n !== 9 ? BISMILLAH[n - 1] || "" : "",
      ayat: AYAS[n - 1].map((ar, i) => ({ a: i + 1, ar, az: azText(n, i + 1) })),
      trLabel: "Mənaca tərcümə",
      trNote: TR_NOTE,
      source: { text: "Tanzil", tr: AZ_SOURCE && AZ_SOURCE.name, trUrl: AZ_SOURCE && AZ_SOURCE.url, tanzil: typeof SOURCE === "object" ? SOURCE : undefined },
    },
    { cache: LONG },
  );
}
