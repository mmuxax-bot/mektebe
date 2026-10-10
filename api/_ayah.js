// Nibras AI: Quran ayələri yalnız daxili Tanzil məlumatından göstərilir (api/_quran/quran.js), süni intellekt modelindən yox.
//  (a) ayahReply(message): «Ayətül-Kürsi», «Bəqərə 255», «2:255», «İxlas surəsi», «سورة الفاتحة» kimi sorğulara AI-siz cavab.
//  (b) finalizeAi(reply, message): AI cavabındakı ərəbcə ayə mətnini Tanzil mətni ilə əvəz edir, [[ayah:2:255]] işarələrini açır,
//      təsdiqlənməyən ﴿…﴾ mətnini xəbərdarlıqla qeyd edir.
// Çıxış formatı (səhifə bunu təhlükəsiz render edir; HTML yoxdur):
//   ::ayah 2:255::            (təsdiqlənməyən üçün ::ayah warn::, birdən çox yer üçün ::ayah::)
//   <ərəbcə mətn, hər sətir bir ayə>
//   ::tr:: Mənaca tərcümə (Azərbaycan dili):   (yalnız dil «az» olanda, tam ayələr üçün; ardınca tərcümə sətirləri; QuranEnc azeri_musayev)
//   ::src:: ﴿ Bəqərə surəsi, 255-ci ayə ﴾ · Mənbə: Tanzil
//   ::/ayah::
//   ::note:: Quran başqa dillərə yalnız mənaca tərcümə oluna bilər; ...   (blokdan sonra, cavabda bir dəfə)
import { namesFatawaBook } from "./_fatawa-name.js";
import { AYAS, BISMILLAH, SURA_NAMES_AR } from "./_quran/quran.js";
import { SURAS } from "./_quran/suras.js";
import { AZ } from "./_quran/az.js";

export const AYAH_COUNT = AYAS.map((a) => a.length);
export const MAX_SURA_AYAS = 15; // uzun surədə ilk N ayə
export const FULL_SURA_LIMIT = 20; // bu qədər ayəyə qədər bütün surə göstərilir
export const MAX_RANGE = 30; // bir sorğuda ən çox ayə

// ---------------------------------------------------------------- normallaşdırma
const AR_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF\u0610-\u061A\u200c\u200d\u200e\u200f]/g;
const AR_LETTER = /[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\u0750-\u077F\u08A0-\u08C9]/;
const AR_LETTERS_G = /[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\u0750-\u077F\u08A0-\u08C9]/g;

export function digitsAscii(text) {
  return String(text || "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

// Ərəbcə söz açarı: hərəkələr, tətvil, alef/ya/ta-marbuta variantları, hamza və bütün alef atılır (yazılış fərqlərinə qarşı davamlı)
export function arKey(word) {
  return String(word || "")
    .replace(AR_MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/[ىیي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ڪک]/g, "ك")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ا/g, "")
    .replace(/[^\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\u0750-\u077F\u08A0-\u08C9]/g, "");
}
// Surə adı üçün: alef saxlanır (ال ayırmaq üçün)
function arName(text) {
  return String(text || "")
    .replace(AR_MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/[ىیي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ڪک]/g, "ك")
    .replace(/[ؤئء]/g, "")
    .replace(/[^\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\u0750-\u077F\u08A0-\u08C9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
function arNameKey(tokens) {
  let j = tokens.join("");
  if (j.startsWith("ال") && j.length > 3) j = j.slice(2);
  return j;
}

const CYR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "c", ш: "s", щ: "s", ъ: "", ь: "", ы: "i", э: "e", ю: "yu", я: "ya", ґ: "g", ә: "a", ө: "o", ү: "u", ұ: "u", қ: "k", ғ: "g", һ: "h", ң: "n" };

// Latın yazılış üçün yüngül qatlama (açıq sözlər üçün)
export function foldLat(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "")
    .replace(/[\u0400-\u04FF]/g, (c) => CYR[c] ?? c);
}

// Surə adı "skeleti": yazılış fərqləri (q/k, x/h, sh/ş, ə/a, ö/u, e/a, ...) birləşir.
export function skel(text) {
  let s = foldLat(text)
    .replace(/sh/g, "s")
    .replace(/ch/g, "c")
    .replace(/gh/g, "g")
    .replace(/kh/g, "h")
    .replace(/dh/g, "z")
    .replace(/th/g, "s")
    .replace(/zh/g, "c")
    .replace(/[^a-z]/g, "")
    .replace(/q/g, "k")
    .replace(/x/g, "h")
    .replace(/w/g, "v")
    .replace(/j/g, "c")
    .replace(/[eoiuy]/g, (c) => (c === "y" ? "y" : "a"))
    .replace(/(.)\1+/g, "$1");
  s = s.replace(/(a)h$/, "$1");
  return s.replace(/(.)\1+/g, "$1");
}

// ---------------------------------------------------------------- surə adları indeksi
const ARTICLES = new Set(["al", "an", "ar", "as", "ash", "at", "ad", "az", "adh", "ath", "el", "en", "er", "es", "et", "ed", "ez", "ul", "un", "ur", "us", "ut", "uz", "ül", "ün", "ür", "üs", "ət", "əl", "ən", "ər", "əs", "əş", "əd", "əz", "аль", "ан", "ар", "ас", "аш", "ат", "ад", "аз"]);
// Adi söz/ad ola bilən surələr: yalnız «surə/ayə» sözü və ya «2:255» ilə tanınır, tək sözlə yox
const COMMON = new Set([4, 34, 42, 5, 7, 9, 10, 13, 17, 20, 22, 25, 32, 55, 68, 73, 11, 12, 14, 19, 23, 24, 30, 31, 38, 40, 47, 48, 50, 52, 62, 65, 66, 67, 71, 72, 76, 87, 89, 90, 91, 92, 93, 95, 96, 97, 99, 103, 105, 111, 114]);

const NAME_MAP = new Map(); // skeleton -> Set(n)
const WEAK_MAP = new Map();
function addName(map, text, n) {
  const k = skel(text);
  if (k.length < 2 || k === "sara") return; // «surə/sura» (Şura ilə eyni skelet) cue sözüdür
  if (!map.has(k)) map.set(k, new Set());
  map.get(k).add(n);
}
for (const s of SURAS) {
  for (const nm of [s.az, s.tr, s.en, s.ru]) {
    addName(NAME_MAP, nm, s.n);
    const parts = foldLat(nm).split(/[\s\-]+/).filter(Boolean);
    if (parts.length > 1 && ARTICLES.has(parts[0])) addName(NAME_MAP, parts.slice(1).join(""), s.n);
  }
  for (const ex of s.extra) {
    const weak = ex.startsWith("~");
    const t = weak ? ex.slice(1) : ex;
    if (/[\u0600-\u06FF]/.test(t)) continue;
    const map = weak ? WEAK_MAP : NAME_MAP;
    addName(map, t, s.n);
    const parts = foldLat(t).split(/[\s\-]+/).filter(Boolean);
    if (parts.length > 1 && ARTICLES.has(parts[0])) addName(map, parts.slice(1).join(""), s.n);
  }
}
// Dəqiq yazılış xəritəsi (yüngül qatlama): «cue» (surə/ayə sözü, 2:255) olmadan yalnız bunlar tanınır
const EXACT_MAP = new Map();
const WEAK_EXACT = new Map();
function exactKey(t) {
  return foldLat(t).replace(/[^a-z]/g, "");
}
const CUE_KEYS = new Set(["sura", "sure", "surah", "ayah", "aya", "aye"]);
function addExact(map, text, n) {
  const k = exactKey(text);
  if (k.length < 3 || CUE_KEYS.has(k)) return;
  if (!map.has(k)) map.set(k, new Set());
  map.get(k).add(n);
}
for (const s of SURAS) {
  for (const nm of [s.az, s.tr, s.en, s.ru, ...s.extra]) {
    const weak = nm.startsWith("~");
    const t = weak ? nm.slice(1) : nm;
    if (/[\u0600-\u06FF]/.test(t)) continue;
    const map = weak ? WEAK_EXACT : EXACT_MAP;
    addExact(map, t, s.n);
    const parts = foldLat(t).split(/[\s\-]+/).filter(Boolean);
    if (s.n !== 3 && parts.length > 1 && ARTICLES.has(parts[0])) addExact(map, parts.slice(1).join(""), s.n); // «İmran» tək özü ad kimi qəbul olunmur
  }
}
const AR_NAME_MAP = new Map();
const AR_EXTRA = {
  1: ["فاتحه الكتاب", "ام الكتاب", "السبع المثاني"], 3: ["ال عمران", "عمران"], 9: ["براءه", "التوبه"], 17: ["بني اسرائيل", "الاسراء"], 20: ["طه"], 36: ["يس", "ياسين"],
  40: ["المومن", "غافر"], 41: ["فصلت", "حم السجده"], 50: ["ق"], 67: ["تبارك", "الملك"], 76: ["الدهر", "الانسان"], 78: ["عم", "النبا"], 94: ["الشرح", "الم نشرح"], 96: ["اقرا", "العلق"],
  108: ["الكوثر"], 109: ["الكافرون"], 110: ["النصر", "اذا جاء نصر الله"], 111: ["المسد", "اللهب", "تبت"], 112: ["الاخلاص", "قل هو الله احد"], 113: ["الفلق"], 114: ["الناس"], 93: ["الضحي"], 107: ["الماعون"],
};
SURA_NAMES_AR.forEach((nm, i) => {
  const n = i + 1;
  const add = (t) => {
    const k = arNameKey(arName(t));
    if (!k) return;
    if (!AR_NAME_MAP.has(k)) AR_NAME_MAP.set(k, new Set());
    AR_NAME_MAP.get(k).add(n);
  };
  add(nm);
  for (const e of AR_EXTRA[n] || []) add(e);
});

// Köməkçi: tək və ya çoxlu n-qram açarından surə tapmaq
const SUFFIXES = ["sini", "ini", "ni", "si", "nin", "in", "ye", "ya", "dan", "den", "da", "de", "la", "le", "ler", "lar"];
function skelVariants(parts) {
  const out = [skel(parts.join(""))];
  const last = parts[parts.length - 1] || "";
  for (const suf of SUFFIXES) {
    if (last.endsWith(suf) && last.length - suf.length >= 3) out.push(skel(parts.slice(0, -1).join("") + last.slice(0, last.length - suf.length)));
  }
  return out;
}
function exactVariants(parts, loose) {
  const out = [exactKey(parts.join(""))];
  const last = parts[parts.length - 1] || "";
  if (loose) for (const suf of SUFFIXES) if (last.endsWith(suf) && last.length - suf.length >= 3) out.push(exactKey(parts.slice(0, -1).join("") + last.slice(0, last.length - suf.length)));
  return out;
}
// loose=false: yalnız dəqiq yazılış (tək söz «sabah», «heç», «bunu» kimi adi sözlərə düşməsin); loose=true: skelet (yazılış fərqləri)
function lookupLat(tokens, i, loose = true, maxN = 4) {
  for (let len = Math.min(maxN, tokens.length - i); len >= 1; len--) {
    const slice = tokens.slice(i, i + len);
    if (len > 1 && slice.length && !slice.every((t) => /^[a-z]+$/.test(t))) continue;
    const cands = [slice];
    if (len > 1 && ARTICLES.has(slice[0])) cands.push(slice.slice(1));
    for (const c of cands) {
      for (const k of exactVariants(c, loose)) {
        if (EXACT_MAP.has(k)) return { len, ns: [...EXACT_MAP.get(k)], weak: false };
        if (WEAK_EXACT.has(k)) return { len, ns: [...WEAK_EXACT.get(k)], weak: true };
      }
    }
    if (!loose) continue;
    for (const c of cands) {
      for (const k of skelVariants(c)) {
        if (k.length < 4) continue;
        if (NAME_MAP.has(k)) return { len, ns: [...NAME_MAP.get(k)], weak: false };
        if (WEAK_MAP.has(k)) return { len, ns: [...WEAK_MAP.get(k)], weak: true };
      }
    }
  }
  return null;
}
function lookupAr(tokens, i, maxN = 4) {
  for (let len = Math.min(maxN, tokens.length - i); len >= 1; len--) {
    const k = arNameKey(tokens.slice(i, i + len));
    if (AR_NAME_MAP.has(k)) return { len, ns: [...AR_NAME_MAP.get(k)], weak: false };
  }
  return null;
}


// ---------------------------------------------------------------- yazı səhvlərinə dözümlü surə adı axtarışı
// Ərəbcə «boş» açar: bütün alef atılır, təkrar hərflər birləşir, əvvəlki «ال» (alefin təkrarı daxil) ayrılır: «االكهف» = «الكهف» = «كهف».
function arLoose(k) {
  return String(k || "").replace(/^ا+ل+(?=.)/, "").replace(/ا+/g, "").replace(/(.)\1+/g, "$1");
}
// «yüngül» açar (cue olmadan): yalnız təkrar alef/ال və təkrar hərflər; alef atılmır («صفات» ≠ «الصافات»)
function arLight(k) {
  return String(k || "").replace(/^ا+ل+(?=.)/, "").replace(/(.)\1+/g, "$1");
}
const AR_LOOSE_MAP = new Map(); // boş açar -> Set(n)
const AR_LIGHT_MAP = new Map();
function addArLoose(text, n) {
  const base = arNameKey(arName(text));
  for (const [map, k] of [[AR_LOOSE_MAP, arLoose(base)], [AR_LIGHT_MAP, arLight(base)]]) {
    if (k.length < 2) continue;
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(n);
  }
}
SURA_NAMES_AR.forEach((nm, i) => {
  addArLoose(nm, i + 1);
  for (const e of AR_EXTRA[i + 1] || []) addArLoose(e, i + 1);
});
// Damerau-Levenshtein (bitişik yerdəyişmə 1 sayılır); limiti aşanda erkən çıxır
function editDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}
const fuzzyMax = (len, strong) => (len >= 9 ? 2 : len >= 5 || (strong && len >= 4) ? 1 : 0);
/** Xəritədə açarla bərabər (edit=false) və ya ən çox max məsafədə tək-yeganə surəni tapır; birdən çox namizəd varsa null. */
function nearest(map, key, max) {
  if (map.has(key)) {
    const ns = [...map.get(key)];
    return ns.length === 1 ? ns[0] : null;
  }
  if (!max) return null;
  // namizədlər: n -> ən yaxın məsafə. Qəbul: ən yaxın tək-yeganə surə, başqa surə ona yaxın (məsafə+0) deyil
  const dist = new Map();
  for (const [k, ns] of map) {
    const dd = editDist(key, k, max);
    if (dd > max) continue;
    for (const n of ns) if (!(dist.get(n) <= dd)) dist.set(n, dd);
  }
  if (!dist.size) return null;
  const best = Math.min(...dist.values());
  const top = [...dist].filter(([, dd]) => dd === best);
  return top.length === 1 ? top[0][0] : null;
}
/** Ərəbcə: əvvəl boş açar (yazılış fərqləri), sonra (fuzzy=true olduqda) məsafə 1-2. Hər dəfə yalnız tək-yeganə surə. */
function lookupArFuzzy(tokens, cue, maxN = 4) {
  const blk = tokens.findIndex((t) => NOT_SURA_AR.has(arLight(t)) || NOT_SURA_AR.has(t));
  if (blk >= 0) tokens = tokens.slice(0, blk);
  for (let len = Math.min(maxN, tokens.length); len >= 1; len--) {
    const base = arNameKey(tokens.slice(0, len));
    const key = cue ? arLoose(base) : arLight(base);
    if (key.length < 2) continue;
    const n = nearest(cue ? AR_LOOSE_MAP : AR_LIGHT_MAP, key, cue ? fuzzyMax(key.length, true) : 0);
    if (n) return { len, ns: [n], weak: false };
  }
  return null;
}
/** Latın: skelet açarı üzrə məsafə 1-2 (yalnız cue olduqda çağırılır). */
// Surə adı olmayan, lakin yazılış baxımından surə adlarına yaxın gündəlik/sayt sözləri (fuzzy uyğunlaşdırmadan çıxarılır):
// fetava→Fatihə, hədis→Hədid, namaza→Hümazə, zəkat→Zariyat, salat→Saffat, angel→Ənfal, buxari→Bəqərə …
const NOT_SURA_LAT = new Set(
  `fetava fatawa fatava fatawah fetawa fetavalar fatawalar fetva fatwa fetvalar fatwas fatwaa fetvo fatvo fatvalar fetvasi
   hadis hadith hadiths hadits hadisler hedis hadisi hadisin hadisleri
   namaz namaza namazi namazin namazlar zakat zekat zekati zekata salat salavat salawat selat salatu
   angel angels melek melekler buxari bukhari bukari buhari muslim muslimin tirmizi tirmidhi nesai nasai
   kitab kitabi kitablar kitap kitaplar book books tefsir tafsir tefsiri tafseer tefsirler nahv nahw nehv sarf serf lugha luga lugat lugati
   fiqh fikih fikhi fiqhi akida akide aqida aqeedah tevhid tawhid sunnet sunnah sunna bidet bidah
   sual sorgu cavab soru cevap question answer ruling rulings volume page cild cilt sehife sayfa
   islam islom iman imam alim alimler elm ilm dua zikr dhikr rehmet rahmet tovbe tevbe tawba
   macmu majmu mecmu mejmu macmuu macmuk mecmua teymiyye taymiyyah taymiyya ibni`
    .split(/\s+/)
    .filter(Boolean),
);
const NOT_SURA_CYR = new Set("фатва фетва фатвы фетвы фатавы фетавы хадис хадисы хадиса тафсир намаз закят закят салават ангел ангелы книга книги вопрос ответ сунна ислам иман дуа зикр".split(" "));
const NOT_SURA_AR = new Set("فتاوي فتوي الفتاوي الفتوي حديث الحديث احاديث كتاب الكتاب تفسير التفسير نحو الصلاه صلاه زكاه الزكاه سنه السنه عقيده فقه لغه".split(" "));
function lookupLatFuzzy(tokens, strong, maxN = 4) {
  if (tokens.some((t) => NOT_SURA_LAT.has(t) || NOT_SURA_CYR.has(t))) tokens = tokens.slice(0, Math.max(0, tokens.findIndex((t) => NOT_SURA_LAT.has(t) || NOT_SURA_CYR.has(t))));
  for (let len = Math.min(maxN, tokens.length); len >= 1; len--) {
    const slice = tokens.slice(0, len);
    if (len > 1 && !slice.every((t) => /^[a-z]+$/.test(t))) continue;
    const cands = [slice];
    if (len > 1 && ARTICLES.has(slice[0])) cands.push(slice.slice(1));
    for (const c of cands) {
      for (const k of skelVariants(c)) {
        if (k.length < 4) continue;
        const n = nearest(NAME_MAP, k, fuzzyMax(k.length, strong));
        if (n) return { len, ns: [n], weak: false };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- dil və yazılar
export function detectLang(text) {
  const t = String(text || "");
  if (AR_LETTERS_G.test(t) && (t.match(AR_LETTERS_G) || []).length > 3) {
    AR_LETTERS_G.lastIndex = 0;
    // Latın hərfləri çoxdursa ərəb mətni sitatdır
    const lat = (t.match(/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/g) || []).length;
    const ar = (t.match(AR_LETTERS_G) || []).length;
    if (ar >= lat) return "ar";
  }
  AR_LETTERS_G.lastIndex = 0;
  if (/[\u0400-\u04FF]/.test(t)) return "ru";
  if (/[əƏ]/.test(t)) return "az";
  const q = foldLat(t);
  if (/\b(verse|verses|surah|chapter|please|show|write|give|read|the|quran|of)\b/.test(q)) return "en";
  if (/\b(sure|suresi|ayet|ayeti|goster|yazar misin|oku|lutfen|bakara|merhaba|kuran)\b/.test(q) && /[ıİğĞşŞçÇöÖüÜ]/.test(t)) return "tr";
  if (/\b(suresi|ayeti|goster|lutfen|kuran|kuranda)\b/.test(q)) return "tr";
  return "az";
}

function ordAz(n) {
  const d = n % 10;
  let s;
  if (d === 0) {
    const t = Math.floor(n / 10) % 10;
    s = n % 100 === 0 ? "cü" : { 1: "cu", 2: "ci", 3: "cu", 4: "cı", 5: "ci", 6: "cı", 7: "ci", 8: "ci", 9: "cı" }[t];
  } else s = { 1: "ci", 2: "ci", 3: "cü", 4: "cü", 5: "ci", 6: "cı", 7: "ci", 8: "ci", 9: "cu" }[d];
  return `${n}-${s}`;
}
function toArDigits(n) {
  return String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)]);
}

const L = {
  az: { source: "Mənbə", warn: "⚠ Bu mətn Qurandakı ayə kimi təsdiqlənmədi" },
  ar: { source: "المصدر", warn: "⚠ لم يتم التحقق من هذا النص كآية من القرآن" },
  en: { source: "Source", warn: "⚠ This text could not be verified as a Quran verse" },
  tr: { source: "Kaynak", warn: "⚠ Bu metin Kur'an'daki âyet olarak doğrulanamadı" },
  ru: { source: "Источник", warn: "⚠ Этот текст не подтверждён как аят Корана" },
};
function suraName(n, lang) {
  const s = SURAS[n - 1];
  if (lang === "ar") return "سورة " + SURA_NAMES_AR[n - 1];
  if (lang === "en") return "Surah " + s.en;
  if (lang === "tr") return s.tr + " suresi";
  if (lang === "ru") return "Сура " + s.ru;
  return s.az + " surəsi";
}
// ﴿ Bəqərə surəsi, 255-ci ayə ﴾
export function refLabel(lang, s, a1, a2, partial) {
  const name = suraName(s, lang);
  let part;
  const range = a2 && a2 !== a1;
  if (lang === "ar") part = range ? `الآيات ${toArDigits(a1)}–${toArDigits(a2)}` : `الآية ${toArDigits(a1)}`;
  else if (lang === "en") part = range ? `verses ${a1}–${a2}` : `verse ${a1}`;
  else if (lang === "tr") part = range ? `${a1}–${a2}. âyetler` : `${a1}. âyet`;
  else if (lang === "ru") part = range ? `аяты ${a1}–${a2}` : `аят ${a1}`;
  else part = range ? `${a1}–${ordAz(a2)} ayələr` : `${ordAz(a1)} ayə`;
  if (partial) {
    const pw = { ar: "(جزء من الآية)", en: "(part of the verse)", tr: "(âyetin bir kısmı)", ru: "(часть аята)", az: "(ayənin bir hissəsi)" }[lang] || "";
    part += " " + pw;
  }
  return `﴿ ${name}${lang === "ar" || lang === "en" || lang === "ru" ? "، " : ", "}${part} ﴾`.replace("،", lang === "ar" ? "،" : ",");
}
// ---- Azərbaycanca mənaca tərcümə (QuranEnc, azeri_musayev). Yalnız dil «az» olanda göstərilir.
export const TR_LABEL = "Mənaca tərcümə (Azərbaycan dili):";
export const TR_NOTE = "Quran başqa dillərə yalnız mənaca tərcümə oluna bilər; tərcümə ayənin bütün mənasını tam ifadə etməyə bilər.";
// [n] haşiyə işarələri göstərilmir; sətir keçidləri boşluğa çevrilir (mətn başqa cəhətdən dəyişmir)
export function azText(s, a) {
  const raw = AZ[s - 1] && AZ[s - 1][a - 1];
  if (!raw) return "";
  return raw.replace(/\s*\[\d+\]/g, "").replace(/\s*\n\s*/g, " ").trim();
}
function srcLine(lang, label, withTr = false) {
  return `::src:: ${label} · ${L[lang].source}: Tanzil` + (withTr && lang === "az" ? " · Tərcümə: QuranEnc.com" : "");
}
function addTrNote(text, lang) {
  if (lang !== "az" || !/^::tr::/m.test(text) || text.includes("::note:: " + TR_NOTE)) return text;
  return text.replace(/\s+$/, "") + "\n\n::note:: " + TR_NOTE;
}

// ---------------------------------------------------------------- blok qurucu
// items: [{s, a, text}] ; lead: bismillah (nömrəsiz) və s.
function ayaLine(a, text, numbered) {
  return numbered ? `${text} ﴿${toArDigits(a)}﴾` : text;
}
export function buildBlock({ s, a1, a2, lang = "az", bismillah = false, partialText = null, ambiguous = null }) {
  const lines = [];
  const multi = a2 > a1;
  if (bismillah && BISMILLAH[s - 1] && !(s === 1)) lines.push(BISMILLAH[s - 1]);
  if (partialText != null) {
    lines.push(partialText);
  } else {
    for (let a = a1; a <= a2; a++) lines.push(ayaLine(a, AYAS[s - 1][a - 1], multi));
  }
  const label = ambiguous ? ambiguous : refLabel(lang, s, a1, a2, partialText != null);
  const head = ambiguous ? "::ayah::" : `::ayah ${s}:${a1}${multi ? "-" + a2 : ""}::`;
  // Azərbaycan dilində: ərəbcə ayənin altında mənaca tərcümə (tam ayələr üçün; hissə/çoxmənalı bloklarda yox)
  const tr = [];
  if (lang === "az" && partialText == null && !ambiguous) {
    if (bismillah && BISMILLAH[s - 1] && s !== 1) tr.push(azText(1, 1));
    for (let a = a1; a <= a2; a++) {
      const t = azText(s, a);
      if (t) tr.push(multi ? `(${a}) ${t}` : t);
    }
    if (tr.length) tr.unshift(`::tr:: ${TR_LABEL}`);
  }
  return [head, ...lines, ...tr, srcLine(lang, label, tr.length > 0), "::/ayah::"].join("\n");
}
export function warnBlock(text, lang = "az") {
  return ["::ayah warn::", String(text).replace(/\s*\n\s*/g, " ").trim(), `::src:: ${L[lang].warn}`, "::/ayah::"].join("\n");
}

// ---------------------------------------------------------------- (a) birbaşa axtarış
const SURA_W = /^sur(?:e|a|ah)(?:s?i|n?in|ni|ler|lar|leri|lerin|lerini|den|dan|de|da|ye|ya|nun|n)*$/;
const AYAH_W = /^(?:aye|ayet|ayat|ayah|aya|verse)(?:s?i|n?in|ni|ler|lar|leri|lerin|lerini|den|dan|de|da|ye|ya|nun|n|si)*$/;
const AYAH_EN = new Set(["verse", "verses", "ayah", "ayat", "ayahs"]);
const FILLERS = new Set(
  (
    "yaz yazin yazar yazarmisan yazarmisiniz yazarsan goster gosterin gostermek goster ver verin verirsen verersen oxu oxuyun oxuya oxuyarsan tap tapin getir gonder at paylas lazimdir lazim istiyirem isteyirem istiyirik isterem istiyorum isterdim " +
      "mene bene bize bizim menim zehmet olmasa lutfen lutfen xais xahis edirem rica ederim ederem " +
      "erebce ereb erebcesi erebcesini erebceye arapca arapcasi arabic arabcasi metn metni metnini metnin tam tamini butun butunu bütün full whole " +
      "quran qurani quranda quranin kerim kerimde kuran kuranda kurani " +
      "ilk ilkin ilk-ilk first the of from in me us a an i want need can you please show write give read send text with and ve ile ve və hem bir bu " +
      "ci cu cı cü inci uncu nci ncu nc uncı th st nd rd " +
      "ayeni ayeleri ayelerini ayelerin ayesi ayesini ayesinin " +
      "mi mu mı mü misən musan " +
      "покажи напиши дай прочитай пожалуйста текст на арабском полностью коран в из и сура сурa " +
      "ay salam salamlar selam merhaba hello hi yaza yazaq yaza bilersen bilirsen bilersiniz bilerseniz bilirsiniz mumkundur mumkun olar ola biler zehmet xahis"
  ).split(/\s+/),
);
const AR_FILLERS = new Set(["اكتب", "اعطني", "اقرا", "اقرأ", "اريد", "ارني", "اعرض", "من", "في", "فى", "سوره", "ايه", "اية", "الايه", "آيه", "ايات", "الايات", "نص", "كامل", "كامله", "لي", "رجاء", "فضلك", "القران", "القرآن", "قران", "الكريم", "اعطيني", "هات", "عرض", "سورة", "آية", "الآية", "الآيات", "ال", "ثم", "و"].map((x) => arName(x).join("")));
// Sual/izah/tərcümə kimi sözlər: bunlar ayəni göstərmək yox, mənanı soruşmaqdır -> mövcud cavab zəncirinə (lüğət, hazır, AI) qalır
const BLOCK_PREFIX = [
  "mena", "izah", "serh", "tefsir", "tercum", "soz", "kelme", "luget", "meaning", "mean", "translat", "tafs", "explain", "word", "interpret", "vocab", "glossar", "why", "neden", "nicin", "niye", "nece", "nedir", "nezaman", "nazil", "sebeb",
  "hokm", "fezilet", "fayda", "haqqinda", "haqda", "barede", "hakkinda", "about", "virtue", "rule", "ruling", "halal", "haram", "kimdir", "hansi", "kac", "neyi", "kak", "cto", "pocemu", "smisl", "znacen", "perevod", "tolkovan", "slov", "zacem", "kogda", "kto",
];
const BLOCK_EXACT = new Set(["ne", "kim", "nedi", "nec", "how", "what", "who", "when", "is", "are", "does", "do", "kimin", "vaxt", "zaman"]);
function isBlocked(foldedTokens) {
  return foldedTokens.some((t) => t && (BLOCK_EXACT.has(t) || BLOCK_PREFIX.some((p) => t.startsWith(p))));
}
const BLOCK_AR = /(معني|معاني|تفسير|شرح|كلمات|كلمه|ترجم|لماذا|ما هي|ما هو|ماذا|كيف|متي|حكم|فضل|سبب نزول|اعراب|كم عدد)/;

function tokenizeMsg(raw) {
  const text = digitsAscii(raw).normalize("NFC");
  const out = [];
  const re = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[\p{L}\p{M}'’]+|\d+/gu;
  let m;
  while ((m = re.exec(text))) out.push({ raw: m[0], idx: m.index, end: m.index + m[0].length });
  return out;
}

const NAMED = [
  { id: "kursi", ranges: [[2, 255, 255]], names: ["ayetul kursi", "ayetulkursi", "ayetel kursi", "ayatul kursi", "ayat al kursi", "ayat alkursi", "kursi ayesi", "kursu ayesi", "ayeti kursi", "ayat ul kursi", "throne verse", "verse of the throne", "ayatu l kursi", "ayat el kursi", "ayetul-kursi", "аят аль курси", "аят курси", "аятул курси", "ayeti kürsi", "kursi ayeti", "kürsü ayəsi"], ar: ["ايه الكرسي", "اية الكرسي"] },
  { id: "amenerrasul", ranges: [[2, 285, 286]], names: ["amenerresul", "amenerrasul", "amenerresulu", "amenerrasulu", "amana rrasulu", "amanar rasul", "amanar-rasul", "amenerresulu ayesi", "amenerrasulu ayesi", "amenerresul ayeleri", "amene rresulu", "amenerresulu ayeleri", "amanarrasulu", "amenerresulu ayet", "ameneresulu", "amənər rəsul"], ar: ["امن الرسول", "ايتا امن الرسول"] },
  { id: "nur", ranges: [[24, 35, 35]], names: ["ayetun nur", "ayatun nur", "ayat an nur", "nur ayesi", "ayetul nur", "ayetun-nur", "ayatun-nur", "ayetunnur", "verse of light", "light verse", "nur ayeti"], ar: ["ايه النور", "اية النور"] },
  { id: "deyn", ranges: [[2, 282, 282]], names: ["ayetud deyn", "ayetud-deyn", "ayatud dayn", "ayat ad dayn", "deyn ayesi", "dayn ayesi", "ayetud dayn", "ayetuddeyn", "ayatud-dayn", "ayatuddayn", "verse of debt", "debt verse"], ar: ["ايه الدين", "اية الدين"] },
  { id: "muavvizeteyn", ranges: [[113, 1, 99], [114, 1, 99]], names: ["muavvizeteyn", "muavvizatayn", "muavvizeten", "muavvizetan", "muavvizat", "muavvizeteyn surelerini", "mu'awwidhatayn", "muawwidhatayn", "мавваззатайн", "муаввизатейн"], ar: ["المعوذتين", "المعوذتان"] },
  { id: "ucqul", ranges: [[112, 1, 99], [113, 1, 99], [114, 1, 99]], names: ["uc qul", "uc qul surelerini", "uc qul sureleri", "three quls", "uc kul", "uc kul sureleri", "üç qul", "üç qul surələri"], ar: ["ثلاث قل", "القلاقل"] },
];
const NAMED_MAP = new Map();
for (const n of NAMED) {
  for (const nm of n.names) NAMED_MAP.set(skel(nm), n);
  for (const nm of n.ar || []) NAMED_MAP.set("ar:" + arNameKey(arName(nm)), n);
}

const MSG_LIMIT = 16; // sözlə ölçülən qısa sorğu

/**
 * @returns {null | {kind:'ref', reply:string}}
 */
export function ayahLookup(message, forceLang) {
  const raw = String(message || "").trim();
  if (!raw || raw.length > 160) return null;
  const toks = tokenizeMsg(raw);
  if (!toks.length || toks.length > MSG_LIMIT) return null;
  const lang = forceLang || detectLang(raw);
  const folded = toks.map((t) => (AR_LETTER.test(t.raw) ? "" : foldLat(t.raw)));
  if (isBlocked(folded)) return null; // «nədir», «neçə», «mənası», «fəziləti» ... ayəni göstərmək yox, sual/izahdır
  const arJoined = toks.filter((t) => AR_LETTER.test(t.raw)).map((t) => arName(t.raw).join("")).join(" ");
  if (arJoined && BLOCK_AR.test(arJoined.replace(/(^| )(سوره )?(ال)?شرح(?= |$)(?!.* شرح)/, " "))) return null; // «سورة الشرح» surə adıdır, «شرح» izahdır

  // 1) «2:255», «2:255-257», «2 : 255»
  const text = digitsAscii(raw);
  const colon = text.match(/(?:^|[^\d\w])(\d{1,3})\s*[:：]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?(?![\d])/);
  let refs = []; // [{s, a1, a2, whole}]
  let used = new Set();
  const markUsed = (i) => used.add(i);
  const suraCue = (i) => i >= 0 && i < toks.length && (SURA_W.test(folded[i]) || /^(سوره|سورة)$/.test(arName(toks[i].raw).join("")) || /^(сура|суру|суры|суре|сурa)$/.test(toks[i].raw.toLowerCase()));
  const ayahCue = (i) => i >= 0 && i < toks.length && (AYAH_W.test(folded[i]) || AYAH_EN.has(folded[i]) || /^(ايه|اية|الايه|الاية|آيه|آية|الآية|الآيات|ايات|آيات)$/.test(arName(toks[i].raw).join("")) || /^(аят|аята|аяты|аяте|аят)$/.test(toks[i].raw.toLowerCase()));
  const hasSuraWord = toks.some((_, i) => suraCue(i));
  const hasAyahWord = toks.some((_, i) => ayahCue(i));
  const ACTION = new Set(["yaz", "yazin", "yazar", "goster", "gosterin", "oxu", "oxuyun", "metn", "metni", "metnini", "erebce", "ereb", "erebcesi", "write", "show", "read", "text", "arabic", "arapca", "yazarmisan", "напиши", "покажи", "прочитай", "текст"]);
  const action = toks.some((t, i) => (AR_LETTER.test(t.raw) ? /^(اكتب|اقرا|اعرض|نص|ارني)$/.test(arName(t.raw).join("")) : ACTION.has(folded[i])));
  let namedHit = null;

  // 2) adlı ayələr
  for (let i = 0; i < toks.length && !namedHit; i++) {
    for (let len = Math.min(4, toks.length - i); len >= 1; len--) {
      const sl = toks.slice(i, i + len);
      if (sl.some((t) => /^\d+$/.test(t.raw))) continue;
      let hit = null;
      if (sl.every((t) => AR_LETTER.test(t.raw))) hit = NAMED_MAP.get("ar:" + arNameKey(sl.map((t) => arName(t.raw).join(""))));
      else if (sl.every((t) => !AR_LETTER.test(t.raw))) {
        for (const k of skelVariants(sl.map((t) => foldLat(t.raw)))) {
          hit = NAMED_MAP.get(k);
          if (hit) break;
        }
      }
      if (hit) {
        namedHit = { named: hit, i, len };
        for (let k = i; k < i + len; k++) markUsed(k);
        break;
      }
    }
  }

  const reps = [];
  if (namedHit) {
    for (const [s, a1, a2] of namedHit.named.ranges) {
      const max = AYAH_COUNT[s - 1];
      reps.push({ s, a1: Math.min(a1, max), a2: Math.min(a2, max), whole: a2 === 99 });
    }
  } else if (colon) {
    const s = Number(colon[1]);
    const a1 = Number(colon[2]);
    const a2 = colon[3] ? Number(colon[3]) : a1;
    if (s < 1 || s > 114) return null;
    // vaxt/başqa kontekst: yalnız ayə/surə sözü və ya qısa sorğu
    const hasQuranWord = toks.some((t, i) => /^(quran|kuran|koran|коран)/.test(folded[i]) || /^(القرآن|قرآن|القران|قران)$/.test(t.raw));
    if (!hasSuraWord && !hasAyahWord && !hasQuranWord) {
      // «saat 10:30» kimi hallar: açıq Quran işarəsi yoxdursa yalnız istinadın özü (və «yaz» kimi sözlər) qəbul olunur
      const stray = toks.some((t, i) => !/^\d+$/.test(t.raw) && !(AR_LETTER.test(t.raw) ? AR_FILLERS.has(arName(t.raw).join("")) : FILLERS.has(folded[i])));
      if (stray) return null;
    }
    reps.push({ s, a1, a2, whole: false, bad: a1 < 1 || a2 < a1 || a2 > AYAH_COUNT[s - 1] });
    toks.forEach((t, i) => {
      if (/^\d+$/.test(t.raw) && t.idx >= colon.index && t.end <= colon.index + colon[0].length) markUsed(i);
    });
  } else {
    // 3) surə adları
    const looseOk = hasSuraWord || hasAyahWord || action;
    // məsafə-əsaslı (fuzzy) axtarış: «surə/ayə» sözü olduqda və ya qısa «ad + nömrə» sorğusunda
    const fuzzyOk = hasSuraWord || hasAyahWord || (toks.length <= 3 && toks.some((t) => /^\d+$/.test(t.raw)));
    const found = [];
    for (let i = 0; i < toks.length; i++) {
      if (/^\d+$/.test(toks[i].raw)) continue;
      const isAr = AR_LETTER.test(toks[i].raw);
      let hit = null;
      if (isAr) {
        const arToks = [];
        for (let k = i; k < toks.length && AR_LETTER.test(toks[k].raw); k++) arToks.push(arName(toks[k].raw).join(""));
        const mArr = lookupAr(arToks, 0);
        if (mArr) hit = mArr;
        else if (!suraCue(i) && !ayahCue(i) && !AR_FILLERS.has(arToks[0])) {
          // yazı səhvi: təkrar hərf/alef, ال-siz/artıq ال, hamza-ya variantları həmişə; məsafə 1-2 yalnız «surə/ayə» sözü və ya nömrə ilə
          const stop = arToks.findIndex((t, k) => k > 0 && (/^(سوره|ايه|اية|الايه|الاية)$/.test(t) || AR_FILLERS.has(t)));
          const sub = stop > 0 ? arToks.slice(0, stop) : arToks;
          hit = lookupArFuzzy(sub, hasSuraWord || hasAyahWord);
        }
      } else {
        const latToks = [];
        for (let k = i; k < toks.length && !AR_LETTER.test(toks[k].raw) && !/^\d+$/.test(toks[k].raw); k++) latToks.push(folded[k]);
        // «Şura» (42) skeleti «surə» cue sözü ilə eynidir: yalnız ş/sh/ш yazılışı ilə tanınır
        if (/^(şura|şûra|şûrâ|şurâ|shura|шура)$/i.test(toks[i].raw)) hit = { len: 1, ns: [42], weak: false };
        else if (suraCue(i)) hit = null; // «surə/сура/surah» işarə sözüdür, ad deyil («сура Ан-Ниса» «sura an» kimi səhv ada düşməsin)
        else {
          hit = lookupLat(latToks, 0, looseOk);
          if (!hit && fuzzyOk && !FILLERS.has(folded[i]) && !SURA_W.test(folded[i]) && !AYAH_W.test(folded[i])) {
            const stop = latToks.findIndex((t, k) => k > 0 && (FILLERS.has(t) || SURA_W.test(t) || AYAH_W.test(t)));
            hit = lookupLatFuzzy(stop > 0 ? latToks.slice(0, stop) : latToks, hasSuraWord);
          }
        }
      }
      if (hit && hit.ns.length) {
        found.push({ i, len: hit.len, ns: hit.ns, weak: hit.weak, isAr });
        i += hit.len - 1;
      }
    }
    // «112-ci surə», «surə 112»
    const ordSuras = [];
    toks.forEach((t, i) => {
      if (/^\d+$/.test(t.raw)) {
        let j = i + 1;
        while (j < toks.length && /^(ci|cu|cı|cü|inci|uncu|nci|ncu|й|ый|ий|th|st|nd|rd|nc)$/i.test(toks[j].raw)) j++;
        const prevCue = i > 0 && suraCue(i - 1);
        const nextCue = suraCue(j);
        // «surə 112» yalnız ad tapılmayanda sayılır; «Nisa surəsi 1-ci ayə»-də 1 ayə nömrəsidir
        if (nextCue || (prevCue && !found.length && !(ayahCue(j)))) ordSuras.push({ i, j: nextCue ? j : i - 1, n: Number(t.raw) });
      }
    });
    // ən çox bir (və ya qeyri-ərəb ardıcıllığında bir neçə) surə
    const named = found.filter((f) => f.ns.length === 1);
    if (!named.length && !ordSuras.length) return null;
    if (named.length > 3) return null;
    const distinct = [...new Set(named.map((f) => f.ns[0]))];
    const sNumbers = ordSuras.filter((o) => o.n >= 1 && o.n <= 114);
    let targets = [];
    if (sNumbers.length && !named.length) {
      targets = [...new Set(sNumbers.map((o) => o.n))];
      sNumbers.forEach((o) => {
        markUsed(o.i);
        markUsed(o.j);
      });
    } else {
      targets = distinct;
      named.forEach((f) => {
        for (let k = f.i; k < f.i + f.len; k++) markUsed(k);
      });
      sNumbers.forEach((o) => {
        markUsed(o.i);
        markUsed(o.j);
      });
    }
    if (!targets.length || targets.length > 3) return null;
    // ayə nömrələri
    const nums = [];
    toks.forEach((t, i) => {
      if (!/^\d+$/.test(t.raw) || used.has(i)) return;
      nums.push({ i, v: Number(t.raw) });
    });
    // ordinal şəkilçisini filler say
    nums.forEach((n) => {
      let j = n.i + 1;
      while (j < toks.length && /^(ci|cu|cı|cü|inci|uncu|nci|ncu|й|ый|ий|th|st|nd|rd|nc)$/i.test(toks[j].raw)) markUsed(j++);
    });
    let a1 = null,
      a2 = null;
    if (nums.length) {
      // aralıq: «255-257», «255 257», «255 – 257» və ya «255 ilə 257»
      a1 = nums[0].v;
      a2 = nums.length > 1 ? nums[1].v : a1;
      if (nums.length > 2) return null;
      nums.forEach((n) => markUsed(n.i));
      if (targets.length > 1) return null;
    }
    // zəif ad və adi söz (COMMON) üçün əlavə şərt
    const strongSignal = hasSuraWord || hasAyahWord;
    const anyWeak = named.some((f) => f.weak);
    const anyCommon = targets.some((n) => COMMON.has(n));
    const unknownCount = (() => {
      let c = 0;
      toks.forEach((t, i) => {
        if (used.has(i)) return;
        if (AR_LETTER.test(t.raw)) {
          const k = arName(t.raw).join("");
          if (!AR_FILLERS.has(k) && !/^(سوره|ايه|الايه)$/.test(k)) c++;
          return;
        }
        const f = folded[i];
        if (FILLERS.has(f) || SURA_W.test(f) || AYAH_W.test(f)) return;
        c++;
      });
      return c;
    })();
    if (unknownCount > (strongSignal ? 3 : 2)) return null;
    if (anyWeak && !hasSuraWord) return null;
    const bare = toks.length - [...used].length <= 0 && !strongSignal && a1 === null; // yalnız ad
    if (anyCommon && !strongSignal) return null;
    if (a1 === null && !strongSignal && bare && toks.length > 2 && !named.some((f) => f.len >= 2 && !ARTICLES.has(folded[f.i]))) return null;
    for (const s of targets) {
      const max = AYAH_COUNT[s - 1];
      if (a1 === null) reps.push({ s, a1: 1, a2: max, whole: true });
      else reps.push({ s, a1, a2, whole: false, bad: a1 < 1 || a2 < a1 || a2 > max });
    }
    // ərəb tək söz: «الإخلاص», «سورة الفاتحة»: cavab verilir (yuxarıdakı common qaydaları ilə)
  }

  if (!reps.length) return null;
  // Qalan tanınmamış sözlər çoxdursa (adlı ayə və 2:255 üçün də) soruşmaq ehtimalı: rədd
  if (namedHit || colon) {
    let c = 0;
    toks.forEach((t, i) => {
      if (used.has(i)) return;
      if (/^\d+$/.test(t.raw)) return;
      if (AR_LETTER.test(t.raw)) {
        const k = arName(t.raw).join("");
        if (!AR_FILLERS.has(k)) c++;
        return;
      }
      const f = folded[i];
      if (FILLERS.has(f) || SURA_W.test(f) || AYAH_W.test(f)) return;
      c++;
    });
    if (c > 2) return null;
  }
  return { reps, lang };
}

function limitNote(lang, s, total, shown, kind) {
  const nm = SURAS[s - 1];
  const next = (name) => `${name} ${shown + 1}-${Math.min(total, shown + 15)}`;
  // «Davamı» təklifi düymə kimi (::sug::): basanda həmin aralıq sorğusu göndərilir
  const chip = (word, q) => `\n::sug::\n::sb:: ${word}: ${q} | ${q}\n::/sug::`;
  if (lang === "ar") return kind === "range" ? `هذا النطاق طويل، عُرضت أول ${toArDigits(shown)} آية. اكتب نطاقًا أصغر.` : `السورة طويلة (${toArDigits(total)} آية)، عُرضت أول ${toArDigits(shown)} آية فقط.` + chip("المتابعة", next(SURA_NAMES_AR[s - 1]));
  if (lang === "en") return kind === "range" ? `This range is long; the first ${shown} verses are shown. Please specify a smaller range.` : `This surah is long (${total} verses); only the first ${shown} are shown.` + chip("Continue", next(nm.en));
  if (lang === "tr") return kind === "range" ? `Bu aralık uzun; ilk ${shown} âyet gösterildi. Daha dar bir aralık yazın.` : `Bu sure uzun (${total} âyet); yalnız ilk ${shown} âyet gösterildi.` + chip("Devamı", next(nm.tr));
  if (lang === "ru") return kind === "range" ? `Диапазон длинный; показаны первые ${shown} аятов. Укажите диапазон поменьше.` : `Сура длинная (${total} аятов); показаны только первые ${shown}.` + chip("Продолжение", next(nm.ru));
  return kind === "range" ? `Aralıq uzundur: ilk ${shown} ayə göstərildi. Daha kiçik aralıq yaz.` : `Surə uzundur (${total} ayə): yalnız ilk ${shown} ayə göstərildi.` + chip("Davamı", next(nm.az));
}
function badRefNote(lang, s, a1, a2) {
  const total = AYAH_COUNT[s - 1];
  const asked = a2 && a2 !== a1 ? `${a1}–${a2}` : String(a1);
  if (lang === "ar") return `${suraName(s, "ar")} فيها ${toArDigits(total)} آية فقط. الآية ${toArDigits(asked.replace("–", "-"))} غير موجودة.`;
  if (lang === "en") return `${suraName(s, "en")} has only ${total} verses. Verse ${asked} does not exist.`;
  if (lang === "tr") return `${suraName(s, "tr")} yalnız ${total} âyettir. ${asked}. âyet yoktur.`;
  if (lang === "ru") return `В суре ${SURAS[s - 1].ru} только ${total} аятов. Аята ${asked} нет.`;
  return `${suraName(s, "az")}ndə yalnız ${total} ayə var. ${asked} nömrəli ayə yoxdur.`.replace(/surəsinə?ndə/, "surəsində");
}

export function ayahReply(message, forceLang) {
  if (namesFatawaBook(message)) return null; // «Məcmuu əl-Fətava» adı surə adına (Fatihə) bənzədilməsin
  const r = ayahLookup(message, forceLang);
  if (!r) return null;
  const { reps, lang } = r;
  const out = [];
  for (const rep of reps) {
    const total = AYAH_COUNT[rep.s - 1];
    if (rep.bad) {
      out.push(badRefNote(lang, rep.s, rep.a1, rep.a2));
      continue;
    }
    let { a1, a2 } = rep;
    let note = null;
    if (rep.whole) {
      if (total > FULL_SURA_LIMIT) {
        a2 = MAX_SURA_AYAS;
        note = limitNote(lang, rep.s, total, MAX_SURA_AYAS, "sura");
      }
      out.push(buildBlock({ s: rep.s, a1, a2, lang, bismillah: true }));
    } else {
      if (a2 - a1 + 1 > MAX_RANGE) {
        a2 = a1 + MAX_RANGE - 1;
        note = limitNote(lang, rep.s, total, MAX_RANGE, "range");
      }
      out.push(buildBlock({ s: rep.s, a1, a2, lang }));
    }
    if (note) out.push(note);
  }
  return addTrNote(out.join("\n\n"), lang);
}

// ======================================================================== (b) AI cavabının işlənməsi
// ---- ayə indeksi (ilk istifadədə qurulur)
let IDX = null;
function buildIndex() {
  if (IDX) return IDX;
  const flat = []; // {s, a, words:[orijinal söz (dayanma işarəsi ilə)], keys:[açar]}
  const sBase = [];
  for (let s = 1; s <= 114; s++) {
    sBase[s - 1] = flat.length;
    for (let a = 1; a <= AYAH_COUNT[s - 1]; a++) {
      const parts = AYAS[s - 1][a - 1].split(" ");
      const words = [];
      const keys = [];
      for (const w of parts) {
        const k = arKey(w);
        if (!k) {
          // dayanma/səcdə işarəsi: əvvəlki sözə qoşulur
          if (words.length) words[words.length - 1] += " " + w;
          continue;
        }
        words.push(w);
        keys.push(k);
      }
      flat.push({ s, a, words, keys });
    }
  }
  const post = new Map();
  flat.forEach((e, i) => {
    for (const k of new Set(e.keys)) {
      if (!post.has(k)) post.set(k, []);
      post.get(k).push(i);
    }
  });
  IDX = { flat, sBase, post };
  return IDX;
}
export function flatIndex(s, a) {
  return buildIndex().sBase[s - 1] + a - 1;
}

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function wcost(a, b) {
  if (a === b) return 0;
  const d = lev(a, b) / Math.max(a.length, b.length);
  return Math.min(1, d * 1.2);
}

const WIN_AYAHS = 8;
// span açarlarını (K) ayələrin ardıcıl sözlərinə uyğunlaşdırır. Qaytarır ən yaxşı pəncərələr.
function align(K) {
  const { flat, post } = buildIndex();
  const m = K.length;
  // 1) dəqiq ardıcıl uyğunluq (tək ayə daxilində): ən nadir sözün siyahısı üzrə
  {
    let rare = null;
    for (const k of new Set(K)) {
      const p = post.get(k);
      if (!p) {
        rare = null;
        break;
      }
      if (!rare || p.length < rare.length) rare = p;
    }
    if (rare) {
      const exact = [];
      for (const i of rare) {
        const keys = flat[i].keys;
        for (let st = 0; st + m <= keys.length; st++) {
          let ok = true;
          for (let j = 0; j < m; j++)
            if (keys[st + j] !== K[j]) {
              ok = false;
              break;
            }
          if (ok) exact.push({ score: 1, cost: 0, from: { ai: i, wi: st }, to: { ai: i, wi: st + m - 1 }, winLen: m });
        }
      }
      if (exact.length) return exact;
    }
  }
  const votes = new Map();
  for (const k of new Set(K)) {
    const p = post.get(k);
    if (!p) continue;
    const w = Math.log(flat.length / p.length) + 0.05; // idf: nadir söz daha çox səs verir, ümumi söz də sayılır
    for (const i of p) votes.set(i, (votes.get(i) || 0) + w);
  }
  if (!votes.size) return [];
  const cand = [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
  const starts = new Set();
  for (const [i] of cand) {
    starts.add(i);
    // əvvəlki ayələr də başlanğıc ola bilər (aralıq 2-3 ayəni əhatə edir)
    for (let b = 1; b <= 3; b++) if (i - b >= 0 && flat[i - b].s === flat[i].s) starts.add(i - b);
  }
  const results = [];
  for (const st of starts) {
    const seq = []; // {key, ai (flat index), wi}
    for (let d = 0; d < WIN_AYAHS && st + d < flat.length && flat[st + d].s === flat[st].s; d++) {
      const e = flat[st + d];
      e.keys.forEach((k, wi) => seq.push({ k, ai: st + d, wi }));
      if (seq.length > m * 2 + 40) break;
    }
    const n = seq.length;
    // yarı-qlobal: span tam, pəncərə sərbəst başlanğıc/son
    let prev = new Array(n + 1).fill(0);
    let prevStart = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = new Array(n + 1);
      const curStart = new Array(n + 1);
      cur[0] = i;
      curStart[0] = 0;
      for (let j = 1; j <= n; j++) {
        const sub = prev[j - 1] + wcost(K[i - 1], seq[j - 1].k);
        const del = prev[j] + 1; // span sözü ayədə yoxdur
        const ins = cur[j - 1] + 1; // ayədə artıq söz
        let best = sub;
        let bs = prevStart[j - 1];
        if (del < best) {
          best = del;
          bs = prevStart[j];
        }
        if (ins < best) {
          best = ins;
          bs = curStart[j - 1];
        }
        cur[j] = best;
        curStart[j] = bs;
      }
      prev = cur;
      prevStart = curStart;
    }
    let bj = 0;
    for (let j = 1; j <= n; j++) if (prev[j] < prev[bj] || bj === 0) bj = j;
    if (bj === 0) continue;
    const startIdx = prevStart[bj];
    const winLen = bj - startIdx;
    if (winLen <= 0) continue;
    const score = 1 - prev[bj] / Math.max(m, winLen);
    results.push({ score, cost: prev[bj], from: seq[startIdx], to: seq[bj - 1], winLen });
  }
  if (!results.length) return [];
  results.sort((a, b) => b.score - a.score);
  // eyni pəncərəni təkrarlamamaq
  const seen = new Set();
  const uniq = [];
  for (const r of results) {
    const key = r.from.ai + ":" + r.from.wi + "-" + r.to.ai + ":" + r.to.wi;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }
  return uniq;
}

function windowToRef(r) {
  const { flat } = buildIndex();
  const a = flat[r.from.ai];
  const b = flat[r.to.ai];
  const startsAyah = r.from.wi === 0;
  const endsAyah = r.to.wi === b.keys.length - 1;
  return { s: a.s, a1: a.a, a2: b.a, w1: r.from.wi, w2: r.to.wi, startsAyah, endsAyah, whole: startsAyah && endsAyah, score: r.score };
}

/**
 * Ərəbcə mətni (söz siyahısı) data ilə uyğunlaşdırır.
 * opts.strict: yalnız tam ayə/ayələr (başlanğıc və son ayə sərhədinə düşməlidir)
 * opts.hint: {s, a1, a2} – yaxınlıqdakı istinad
 */
export function matchArabic(text, opts = {}) {
  const words = String(text || "")
    .split(/\s+/)
    .map((w) => arKey(w))
    .filter(Boolean);
  const m = words.length;
  const minWords = opts.minWords ?? 3;
  if (m < minWords) return null;
  const minScore = opts.minScore ?? 0.85;
  const res = align(words);
  if (!res.length) return null;
  const top = res[0];
  if (top.score < minScore) return null;
  let matches = res.filter((r) => r.score >= top.score - 0.0001);
  let refs = matches.map(windowToRef);
  if (opts.hint) {
    const h = opts.hint;
    const hit = refs.filter((r) => r.s === h.s && r.a1 <= (h.a2 || h.a1) && r.a2 >= h.a1);
    if (hit.length) refs = hit;
    else {
      // istinad göstərilib, amma mətn başqa yerdədir: ən yaxşı nəticə qalır
    }
  }
  if (opts.strict) refs = refs.filter((r) => r.startsAyah || r.w1 <= 1).filter((r) => r.endsAyah || buildIndex().flat[flatIndex(r.s, r.a2)].keys.length - 1 - r.w2 <= 1);
  if (!refs.length) return null;
  return { refs, score: top.score, exact: top.cost === 0 };
}

// exact mətni qur: tam ayələr üçün data-dakı olduğu kimi, hissə üçün sözləri olduğu kimi birləşdir
function renderRef(ref, lang) {
  const { flat } = buildIndex();
  const multi = ref.a2 > ref.a1;
  if (ref.whole || (ref.startsAyah && ref.endsAyah)) return buildBlock({ s: ref.s, a1: ref.a1, a2: ref.a2, lang });
  // hissə: tam ayə qısadırsa (≤ 14 söz) və pəncərə ayənin böyük hissəsidirsə tam ayəni ver
  const first = flat[flatIndex(ref.s, ref.a1)];
  if (!multi && first.words.length <= 14 && (ref.w2 - ref.w1 + 1) / first.words.length >= 0.7) return buildBlock({ s: ref.s, a1: ref.a1, a2: ref.a2, lang });
  const lines = [];
  for (let a = ref.a1; a <= ref.a2; a++) {
    const e = flat[flatIndex(ref.s, a)];
    const from = a === ref.a1 ? ref.w1 : 0;
    const to = a === ref.a2 ? ref.w2 : e.words.length - 1;
    let t = e.words.slice(from, to + 1).join(" ");
    if (a === ref.a1 && from > 0) t = "… " + t;
    if (a === ref.a2 && to < e.words.length - 1) t = t + " …";
    lines.push(multi ? ayaLine(a, t, true) : t);
  }
  const label = refLabel(lang, ref.s, ref.a1, ref.a2, true);
  return [`::ayah ${ref.s}:${ref.a1}${multi ? "-" + ref.a2 : ""}::`, ...lines, srcLine(lang, label), "::/ayah::"].join("\n");
}
function renderAmbiguous(refs, lang) {
  const { flat } = buildIndex();
  const r = refs[0];
  const uniq = [];
  const seen = new Set();
  for (const x of refs) {
    const k = x.s + ":" + x.a1 + (x.a2 > x.a1 ? "-" + x.a2 : "");
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(x);
    }
  }
  if (uniq.length === 1) return renderRef(uniq[0], lang);
  // eyni mətn bir neçə yerdə gəlir: mətn birinci uyğunluqdan, mənbə bütün yerlər
  const e0 = flat[flatIndex(r.s, r.a1)];
  const text = e0.words.slice(r.w1, r.w2 + 1).join(" ");
  const nameFor = (n) => (lang === "ar" ? SURA_NAMES_AR[n - 1] : SURAS[n - 1][lang] || SURAS[n - 1].az);
  const names = uniq.slice(0, 4).map((x) => `${nameFor(x.s)} ${x.a1}${x.a2 > x.a1 ? "–" + x.a2 : ""}`);
  const more = uniq.length > 4 ? " …" : "";
  const prefix = { az: "Quranda bir neçə yerdə gəlir", ar: "ورد في أكثر من موضع", en: "Appears in several places", tr: "Birden fazla yerde geçer", ru: "Встречается в нескольких местах" }[lang];
  const label = `﴿ ${prefix}: ${names.join("; ")}${more} ﴾`;
  const lead = (r.w1 > 0 ? "… " : "") + text + (r.w2 < e0.words.length - 1 ? " …" : "");
  return ["::ayah::", r.startsAyah && r.endsAyah ? e0.words.join(" ") : lead, srcLine(lang, label), "::/ayah::"].join("\n");
}

// ---- AI cavabı üzərində əməliyyatlar

function arabicRatio(text) {
  const letters = String(text).match(/\p{L}/gu) || [];
  if (!letters.length) return 0;
  const ar = String(text).match(AR_LETTERS_G) || [];
  AR_LETTERS_G.lastIndex = 0;
  return ar.length / letters.length;
}

// Mötərizə içindəki mətn istinaddırmı? Qaytarır {s, a1, a2} və ya null
export function parseRefText(t) {
  const text = digitsAscii(t).trim();
  if (!text || text.length > 70 || !/\d/.test(text)) return null;
  let m = text.match(/(\d{1,3})\s*[:：]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 114) return { s: Number(m[1]), a1: Number(m[2]), a2: m[3] ? Number(m[3]) : Number(m[2]), named: false };
  const toks = tokenizeMsg(text);
  const folded = toks.map((x) => (AR_LETTER.test(x.raw) ? "" : foldLat(x.raw)));
  let sura = null;
  for (let i = 0; i < toks.length && !sura; i++) {
    if (/^\d+$/.test(toks[i].raw)) continue;
    if (AR_LETTER.test(toks[i].raw)) {
      const arT = [];
      for (let k = i; k < toks.length && AR_LETTER.test(toks[k].raw); k++) arT.push(arName(toks[k].raw).join(""));
      const h = lookupAr(arT, 0);
      if (h && h.ns.length === 1) sura = h.ns[0];
    } else {
      const lt = [];
      for (let k = i; k < toks.length && !AR_LETTER.test(toks[k].raw) && !/^\d+$/.test(toks[k].raw); k++) lt.push(folded[k]);
      const h = lookupLat(lt, 0, true);
      if (h && h.ns.length === 1) sura = h.ns[0];
    }
  }
  if (!sura) return null;
  const nums = toks.filter((x) => /^\d+$/.test(x.raw)).map((x) => Number(x.raw));
  if (!nums.length) return null;
  return { s: sura, a1: nums[0], a2: nums[1] && nums[1] >= nums[0] ? nums[1] : nums[0], named: true };
}

function validHint(h) {
  return h && h.s >= 1 && h.s <= 114 && h.a1 >= 1 && h.a2 <= AYAH_COUNT[h.s - 1] && h.a2 >= h.a1 ? h : null;
}

// «Quran» cavabından əvvəl AI-nin saxta işarələrini təmizlə
export function stripAyahMarkup(text) {
  return String(text || "")
    .replace(/^[ \t]*::\/?ayah[^\n]*::[ \t]*$/gim, "")
    .replace(/^[ \t]*::src::[^\n]*$/gim, "")
    .replace(/^[ \t]*::(?:tr|note|ar|tl|tv|sl|sb|ctx|game)::[^\n]*$/gim, "")
    .replace(/^[ \t]*::\/?sug::[ \t]*$/gim, "")
    .replace(/^[ \t]*::\/?tafsir[^\n]*::[ \t]*$/gim, "")
    .replace(/^[ \t]*::\/?notice::[ \t]*$/gim, "")
    .replace(/::\/?ayah[^:\n]*::/gi, "")
    .replace(/::src::/gi, "");
}
// AI-yə göndərilən tarixçədə hazır ayə bloklarını qısa işarə ilə əvəz et (model onları təkrar yazmasın, işarə yazsın)
export function compactHistory(text) {
  // ilk dini cavabın bildiriş bloku modelə göndərilmir
  const out = String(text || "").replace(/::notice::[\s\S]*?::\/notice::/g, "").replace(/::tafsir [a-z]+::[\s\S]*?::\/tafsir::/g, "[[tafsir]]").replace(/::sug::[\s\S]*?::\/sug::/g, "").replace(/^::game:: ([a-z0-9-]+)[^\n]*\n+```[\s\S]*?```/gm, "[[game:$1]]").replace(/::ayah(?: (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?)?::[\s\S]*?::\/ayah::/g, (m, s, a, b) => (s ? `[[ayah:${s}:${a}${b ? "-" + b : ""}]]` : "[[ayah]]"));
  return stripAyahMarkup(out).replace(/\n{3,}/g, "\n\n").trim();
}

export const AYAH_PROMPT =
  "Quran ayəsinin ərəbcə mətnini heç vaxt özün yazma, yadda saxladığın mətni də yazma. Ayə göstərmək lazım olsa, yalnız [[ayah:2:255]] və ya [[ayah:2:255-257]] formatında işarə yaz (surə nömrəsi:ayə nömrəsi). " +
  "Server işarəni dəqiq Tanzil mətni ilə əvəz edəcək. Ayənin nömrəsini dəqiq bilmirsənsə, işarə yazma, ayənin ərəbcə mətnini də uydurma. Ərəbcə mətni ﴿ ﴾ içində özün yazma. " +
  "Ayə mövzusunda «ayə», «surə» sözlərindən istifadə et.";

/**
 * AI cavabını emal edir: işarələri açır, ərəbcə ayə mətnini Tanzil mətni ilə əvəz edir, təsdiqlənməyən ﴿…﴾ mətnini qeyd edir.
 * @param {string} reply AI cavabı
 * @param {string} message istifadəçi mesajı (dil üçün)
 */
// İstifadəçi ayə/surə/Quran barədə soruşub? Yalnız belə olanda (və ya cavabda istinad olanda) istinadsız ərəbcə mətn ayə blokuna çevrilir.
const ASKS_AYAH = /(?:آي[ةه]|ايه|آيات|ايات|سور[ةه]|قرآن|القرآن|قران|تفسير|﴿|﴾|\d\s*[:：]\s*\d)|\b(?:ay[eə]\w*|ayah|ayat|sur[eə]\w*|surah|quran\w*|kur'?an\w*|kuran\w*|tef?sir\w*|təfsir\w*|tafsir\w*|verse|verses)\b|аят|сура|коран|тафсир/i;
export function asksAyah(message) {
  const m = String(message || "");
  return ASKS_AYAH.test(m) || ASKS_AYAH.test(foldLat(m));
}

/**
 * opts.noBlocks: ayə blokları qadağandır (məs. söz mənası sualı): [[ayah:..]] işarələri və ərəbcə sitatlar bloka çevrilmir.
 * Ərəbcə mətn yalnız aşağıdakı hallarda ayə blokuna çevrilir: [[ayah:S:A]] işarəsi, ﴿…﴾ sitatı, (surə + nömrə) istinadı,
 * və ya istifadəçi özü ayə/surə/Quran soruşubdursa. Sözlərə görə uyğunlaşdırma ilə istinadsız, soruşulmamış ayə əlavə olunmur.
 */
export function finalizeAi(reply, message = "", opts = {}) {
  const noBlocks = !!opts.noBlocks;
  const asked = !noBlocks && asksAyah(message);
  let text = stripAyahMarkup(String(reply || "")).replace(/[\u0001-\u0003]/g, "");
  if (!text.trim()) return text;
  let lang = detectLang(message);
  if (!message) lang = detectLang(text.replace(/[\u0600-\u06FF]+/g, " "));
  // kod bloklarını toxunulmaz saxla
  const holders = [];
  const hold = (s) => {
    holders.push(s);
    return `\u0001${holders.length - 1}\u0002`;
  };
  text = text.replace(/```[\s\S]*?```|`[^`\n]*`/g, (m) => hold(m));

  // 1) [[ayah:S:A(-B)]] işarələri
  if (noBlocks) {
    // söz mənası cavabında Quran sitatı olmur: işarələr və ﴿ … ﴾ mətnləri silinir
    text = text.replace(/\[\[\s*ayah[^\]\n]*\]\]/gi, "").replace(/[﴿﴾]([^﴿﴾]{0,4000})[﴿﴾]/g, (m, inner) => (/[\u0600-\u06FF]/.test(inner) && !/^[\d٠-٩۰-۹\s.,:;()-]+$/.test(inner.trim()) ? "" : m)).replace(/[ \t]+([.,;:،])/g, "$1");
  }
  text = text.replace(/\[\[\s*ayah\s*:\s*(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*\]\]/gi, (m, s, a, b) => {
    const S = Number(s);
    const A1 = Number(a);
    const A2 = b ? Number(b) : A1;
    if (S < 1 || S > 114 || A1 < 1 || A2 < A1 || A2 > AYAH_COUNT[S - 1]) return "";
    let a2 = A2;
    let note = "";
    if (a2 - A1 + 1 > MAX_RANGE) {
      a2 = A1 + MAX_RANGE - 1;
      note = "\n\n" + limitNote(lang, S, AYAH_COUNT[S - 1], MAX_RANGE, "range");
    }
    return hold("\n\n" + buildBlock({ s: S, a1: A1, a2, lang }) + note + "\n\n");
  });
  text = text.replace(/\[\[\s*ayah[^\]\n]*\]\]/gi, ""); // yanlış işarələr silinir

  // 2) ﴿ … ﴾ (yaxud tərs sıra ﴾ … ﴿), ardınca gələn «(Bəqərə: 255)» istinadı ilə birlikdə
  if (!noBlocks) text = text.replace(/([﴿﴾])([^﴿﴾]{1,4000})([﴿﴾])([ \t]*[\(\[（][^\)\]）\n]{1,70}[\)\]）])?/g, (m, o, inner, c, refPart) => {
    const body = inner.trim();
    const tail = refPart || "";
    if (!body) return m;
    if (/^[\d٠-٩۰-۹\s.,:;()-]+$/.test(body)) return m; // ayə nömrəsi işarəsi
    if (arabicRatio(body) < 0.5) return m; // ərəb olmayan mətn
    const refInfo = tail ? parseRefText(tail.replace(/^[ \t]*[\(\[（]|[\)\]）]$/g, "")) : null;
    const hint = validHint(refInfo);
    const nWords = body.split(/\s+/).filter((w) => arKey(w)).length;
    if (nWords < 3) return m; // 1-2 söz: toxunulmur
    const mr = matchArabic(body, { hint, minWords: 3, minScore: 0.85 });
    const keepTail = tail && !refInfo ? tail : ""; // istinad olmayan mötərizə qalır
    if (!mr) return hold("\n\n" + warnBlock(body, lang) + "\n\n") + keepTail;
    return hold("\n\n" + (mr.refs.length > 1 && !hint ? renderAmbiguous(mr.refs, lang) : renderRef(mr.refs[0], lang)) + "\n\n") + keepTail;
  });

  // 3) « … » ərəbcə sitat: yalnız data ilə uyğundursa əvəz et
  if (asked) text = text.replace(/«([^«»]{8,3000})»/g, (m, inner) => {
    const body = inner.trim();
    if (arabicRatio(body) < 0.8) return m;
    const mr = matchArabic(body, { minWords: 4, minScore: 0.9, strict: true });
    if (!mr) return m;
    return hold("\n\n" + (mr.refs.length > 1 ? renderAmbiguous(mr.refs, lang) : renderRef(mr.refs[0], lang)) + "\n\n");
  });

  // 4) mötərizəsiz ərəbcə hissələr: yalnız bütöv ayə kimi yaxın uyğunluq və ən azı 4 söz
  text = text.replace(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s،؛۝۞]{10,})([ \t]*[\(\[（][^\)\]）\n]{1,70}[\)\]）])?/g, (m, run, refPart) => {
    const body = run.trim();
    if (body.split(/\s+/).filter((w) => arKey(w)).length < 4) return m;
    const tail = refPart || "";
    const refInfo = tail ? parseRefText(tail.replace(/^[ \t]*[\(\[（]|[\)\]）]$/g, "")) : null;
    const hint = validHint(refInfo);
    if (noBlocks) {
      // söz mənası cavabı: Quran mətni (bütöv ayə) göstərilmir, silinir
      const nb = matchArabic(body, { minWords: 4, minScore: 0.9, strict: true });
      return nb && nb.refs.every((r) => r.whole) ? "" : m;
    }
    if (!hint && !asked) return m; // istinad yoxdur və istifadəçi ayə soruşmayıb: söz uyğunluğuna görə ayə əlavə olunmur
    const mr = matchArabic(body, { hint, minWords: 4, minScore: 0.9, strict: true });
    if (!mr || !mr.refs.every((r) => r.whole)) return m;
    const lead = run.match(/^\s*/)[0];
    const keepTail = tail && !refInfo ? tail : "";
    return lead + hold("\n\n" + (mr.refs.length > 1 && !hint ? renderAmbiguous(mr.refs, lang) : renderRef(mr.refs[0], lang)) + "\n\n") + keepTail;
  });
  // ayə nömrəsi işarəsi bloka qoşulmuş qalıqları sil: «block ﴿٢﴾»
  text = text.replace(/(\u0002)[ \t]*﴿[\d٠-٩۰-۹]{1,3}﴾/g, "$1");

  // yer tutanları geri qaytar (iç-içə ola bilər)
  for (let pass = 0; pass < 3; pass++) text = text.replace(/\u0001(\d+)\u0002/g, (m, i) => holders[Number(i)]);
  text = text.replace(/(::\/ayah::)\n*[ \t]*[.,;:،؛]+[ \t]*(?=\S)/g, "$1\n\n");
  text = text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
  return addTrNote(text, lang);
}
