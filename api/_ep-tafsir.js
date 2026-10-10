// GET /api/tafsir?book=<muyassar|saadi|ibnkathir>&s=<surə>&a=<ayə> — ayənin təfsiri, ərəbcə orijinalda, dəyişdirilmədən (api/_tafsir.js məlumatı)
import { BOOKS, segments } from "./_tafsir.js";
import { AYAS } from "./_quran/quran.js";
import { send, query, LONG } from "./_lib/http.js";

const NAME = { muyassar: "التفسير الميسر", saadi: "تفسير السعدي", ibnkathir: "تفسير ابن كثير" };
const SRC = { muyassar: "QuranEnc.com", saadi: "QuranEnc.com", ibnkathir: "spa5k/tafsir_api (Quran.com / QUL)" };

export default async function handler(req, res) {
  const q = query(req);
  const book = String(q.book || "");
  const s = Number(q.s), a = Number(q.a);
  if (!BOOKS.includes(book)) return send(res, 404, { error: "tafsir_not_found" });
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1 || a > AYAS[s - 1].length) return send(res, 404, { error: "ayah_not_found" });
  try {
    const segs = (await segments(book, s, a, a)).map(({ from, to, text, gap }) => ({ from, to, text: text || "", ...(gap ? { gap: true } : {}) }));
    send(res, 200, { book, name: NAME[book], source: SRC[book], s, a, segs }, { cache: LONG });
  } catch {
    send(res, 500, { error: "server_error" });
  }
}
