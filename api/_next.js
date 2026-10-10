// «Növbəti ayə»: ayə (və ya ayə + təfsir) cavabından sonra «ثم», «davam», «sonra», «next», «дальше» və s. yazılanda
// son göstərilən ayədən sonrakı ayə verilir (AI-siz). Son istinad söhbət tarixçəsindəki köməkçi mesajdan alınır:
// cavabın sonunda gizli «::ctx:: s:a1-a2 kitab hissə/cəmi dil» sətri var (UI göstərmir, AI tarixçəsinə düşmür).
import { ayahReply, foldLat, AYAH_COUNT } from "./_ayah.js";
import { tafsirReply, withTafsirSuggest, bookQuery, BOOKS } from "./_tafsir.js";

const AR_MARKS = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
function norm(tok) {
  const t = tok.toLowerCase();
  if (/[\u0600-\u06FF]/.test(t)) {
    return t.replace(AR_MARKS, "").replace(/[آأإٱ]/g, "ا").replace(/[ىی]/g, "ي").replace(/ة/g, "ه");
  }
  if (/[\u0400-\u04FF]/.test(t)) return t.replace(/ё/g, "е");
  return foldLat(t);
}
const set = (arr) => new Set(arr.map(norm));
const CUES = set([
  // ərəbcə
  "ثم", "التالي", "التالية", "تابع", "أكمل", "اكمل", "استمر", "بعده", "بعدها", "التالى",
  // azərbaycanca
  "sonra", "davam", "növbəti", "irəli", "sonrakı",
  // türkçe
  "devam", "sonraki", "ileri",
  // english
  "next", "continue", "more",
  // русский
  "дальше", "далее", "следующий", "следующая", "следующее", "следующую", "продолжай", "продолжи", "продолжить",
]);
const FILLERS = set([
  "ayə", "ayəni", "ayet", "ayeti", "ayah", "verse", "ayat", "ayahs", "verses", "aye", "et", "edin", "ver", "göstər", "goster", "göstərin", "please", "pls", "zəhmət", "olmasa", "lütfən", "lutfen", "bir", "the", "one", "go", "on",
  "اية", "آية", "ايه", "الاية", "الآية", "الايه", "لو", "سمحت", "من", "فضلك", "الى", "يا", "ارجوك",
  "аят", "аята", "пожалуйста", "еще", "ещё",
]);
// ərəb/kiril/latın tək tokenlər üçün: bütün tokenlər cue və ya filler olmalı, ən azı biri cue
function isContinue(message) {
  const raw = String(message || "").trim();
  if (!raw || raw.length > 60) return false;
  const toks = [...raw.matchAll(/[\p{L}\p{M}]+/gu)].map((m) => norm(m[0]));
  if (!toks.length || toks.length > 5) return false;
  return toks.some((t) => CUES.has(t)) && toks.every((t) => CUES.has(t) || FILLERS.has(t));
}

function parseCtx(text) {
  const t = String(text || "");
  const m = [...t.matchAll(/^::ctx:: (\d{1,3}):(\d{1,3})-(\d{1,3}) (\S+) (\d+)\/(\d+) (\w+)$/gm)].pop();
  if (m) return { s: +m[1], a1: +m[2], a2: +m[3], book: BOOKS.includes(m[4]) ? m[4] : null, pno: +m[5], total: +m[6], lang: m[7] };
  // köhnə mesajlar (ctx yoxdur): sonuncu ayə başlığı + sonuncu təfsir bloku
  const hs = [...t.matchAll(/^::ayah (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?::$/gm)];
  if (!hs.length) return null;
  const h = hs[hs.length - 1];
  const bk = [...t.matchAll(/^::tafsir (\w+)::$/gm)].pop();
  const lang = /::tr:: Mənaca tərcümə \(Azərbaycan/.test(t) ? "az" : /[\u0600-\u06FF]/.test(t.replace(/::[^\n]*|[\u0600-\u06FF]+\s*/g, "")) ? "ar" : "az";
  return { s: +h[1], a1: +h[2], a2: +(h[3] || h[2]), book: bk && BOOKS.includes(bk[1]) ? bk[1] : null, pno: 1, total: 1, lang };
}

const END = {
  az: "Bu, Quranın son ayəsi idi (Nas surəsi, 6-cı ayə). Başqa ayə üçün yaz, məsələn «Bəqərə 255».",
  tr: "Bu, Kur'an'ın son âyetiydi (Nâs suresi, 6. âyet). Başka bir âyet için yazın, örneğin «Bakara 255».",
  en: "That was the last verse of the Quran (Surah An-Nas, verse 6). For another verse, write e.g. «Baqarah 255».",
  ru: "Это был последний аят Корана (сура Ан-Нас, аят 6). Для другого аята напишите, например, «Бакара 255».",
  ar: "كانت هذه آخر آية في القرآن (سورة الناس، الآية ٦). لآية أخرى اكتب مثلًا «البقرة 255».",
};

/** @param {string} message @param {Array<{role:string,text:string}>} history müştərinin göndərdiyi xam tarixçə */
export async function nextReply(message, history) {
  if (!isContinue(message)) return null;
  const list = Array.isArray(history) ? history : [];
  let last = null;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].role === "assistant") {
      last = list[i];
      break;
    }
  }
  if (!last) return null;
  const ctx = parseCtx(last.text);
  if (!ctx) return null;
  const lang = ["az", "tr", "en", "ru", "ar"].includes(ctx.lang) ? ctx.lang : "az";
  // təfsirin növbəti hissəsi qalıbsa — o hissə
  if (ctx.book && ctx.pno < ctx.total) {
    const part = lang === "ar" ? String(ctx.pno + 1).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[c]) : ctx.pno + 1;
    const partWord = { az: "hissə", tr: "kısım", en: "part", ru: "часть", ar: "الجزء" }[lang];
    return tafsirReply(`${bookQuery(lang, ctx.book, ctx.s, ctx.a1, ctx.a2)} ${partWord} ${part}`, lang);
  }
  // növbəti ayə (surənin sonunda növbəti surənin 1-ci ayəsi; 114:6-dan sonra dayan)
  let s = ctx.s;
  let a = ctx.a2 + 1;
  if (a > AYAH_COUNT[s - 1]) {
    s += 1;
    a = 1;
  }
  if (s > 114) return END[lang];
  if (ctx.book) return tafsirReply(bookQuery(lang, ctx.book, s, a, a), lang);
  const r = ayahReply(`${s}:${a}`, lang);
  return r ? withTafsirSuggest(r, message, lang) : null;
}
export { isContinue };
