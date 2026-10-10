// Nibras Library: nibrascode/code api/_next.js-dən yalnız «davam» aşkarlayıcısı (isContinue) götürülüb, kod eynidir.
// Ayə/təfsir davamı (nextReply) kitabxanaya aid deyil, ona görə _tafsir.js bura gətirilmir.
import { foldLat } from "./_ayah.js";

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

export { isContinue };
