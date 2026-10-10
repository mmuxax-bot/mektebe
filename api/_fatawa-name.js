// «Məcmuu əl-Fətava» kitab adının müxtəlif yazılışları (səhv yazılış, transliterasiya). _fatawa.js və ayə/surə/təfsir idarəçiləri üçün ortaq:
// bu adlar «Fatihə» kimi surə adlarına bənzədilməsin deyə həmin idarəçilər belə mesajlarda null qaytarır.
const fold = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "");
const AR_MARKS = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
// ilk söz: macmu, macmuuk, mecmuu, mejmu, majmu, majmoo, mecmua ...; sonra isteğe bağlı əl/al, sonra fet…/fat… (fetava, fatawa, fetvalar)
export const BOOK_LAT = /\bm[aeo][cj]+m[uo]+\w*[\s-]*(?:(?:el|al|ul|l|ed|as|an)[\s-]*)?(?:fet|fat|fit)\w*/;
export const BOOK_RU = /(?:маджму|меджму|маджмуъ|маджмуа)[а-яё]*[\s-]*(?:аль|ал|ль)?[\s-]*(?:фатав|фетав|фатва)[а-яё]*/i;
export const BOOK_AR = /مجموع(?:ه|ة)?\s+(?:ال)?فتاو[يىا]|مجموع(?:ه|ة)?\s+(?:ال)?فتوى/;
const BARE_PLURAL = /^(?:fetava|fatawa|fatawah|fetawa|fatava|fetvalar|fatwas|fatwaa|fetavalar|fatawalar)$/;

/** Mesaj kitabın adını çəkirmi? (tək «fetava/fatawa» sözü də, ≤3 sözlük mesajda) */
export function namesFatawaBook(message) {
  const raw = String(message || "").trim();
  if (!raw || raw.length > 300) return false;
  const plain = raw.replace(AR_MARKS, "");
  const n = plain.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  const f = fold(raw);
  if (BOOK_LAT.test(f) || BOOK_RU.test(raw)) return true;
  if (/مجموع(?:ه)?\s+(?:ال)?فتاو[يا]/.test(n) || BOOK_AR.test(plain)) return true;
  const toks = f.split(/[^a-z0-9]+/).filter(Boolean);
  // «Fetava», «Fetava 19», «fatawa 5» (nömrə kitab adından sonra surə/ayə deyil): ≤3 sözlük mesajda tək «fətavalar» sözü
  if (toks.length <= 3 && toks.some((t) => BARE_PLURAL.test(t))) return true;
  const words = n.split(/[^\u0621-\u064A0-9]+/).filter(Boolean);
  if (words.length && words.length <= 3 && words.some((w) => /^(?:ال)?فتاوي$/.test(w)) && !/[a-z]/i.test(raw)) return true;
  const ru = raw.toLowerCase().split(/[^а-яё0-9]+/).filter(Boolean);
  return ru.length > 0 && ru.length <= 3 && ru.some((w) => /^(?:фатавы|фетавы|фатава|фетава)$/.test(w)) && !/[a-z]/i.test(raw);
}
