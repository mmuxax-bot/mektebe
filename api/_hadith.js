// Hədis axtarışı (Kütübü-sittə): AI-yə getmədən, yalnız Şamilədən yüklənmiş 6 kitabdan sözbəsöz çıxarış.
//   Məlumat: api/_hadith/index.js (lüğət + token-id ardıcıllığı), api/_hadith/books/h<id>_<n>.js (300 hədislik hissələr, tənbəl yüklənir). Quraşdırma: node scripts/build-hadith.mjs.
//   Tetikleyicilər: «hədis axtar: …», «حديث …», «hadith about …», «хадис …»; nömrə: «صحيح البخاري 1», «Buxari 1 hədis». Ərəbcə uzun cümlə tam uyğun gələndə də (hadithBare).
//   Sıralama: tam ifadə uyğunluğu, sonra bütün sözlər (yaxın), kitab sırası (Buxari, Müslim, Sünənlər) və nömrə. Hədis heç vaxt tərcümə/yazılmır: yalnız verilənlər bazasından sözbəsöz.
//   Hökm yalnız verilənlərdən (Arnaut/Albani) göstərilir; yoxdursa «غير مذكور في هذه النشرة». Davam: «davam»/«daha çox» (::ctx:: hadith … gizli sətir).
import { brotliDecompressSync } from "node:zlib";
import { detectLang, foldLat } from "./_ayah.js";
import { isLexicalQuestion } from "./_lugha.js";
import { norm, stem, tokens, tokenSpans } from "./_hadith/tok.js";
import { LOADERS, SHARD } from "./_hadith/loaders.js";
import { sentenceStart, sentenceEnd } from "./_excerpt.js";
import { topicAlts } from "./_fatawa/topicmatch.js";

export const PAGE = 5; // bir mesajda göstərilən hədis sayı
export const MAX_LIST = 800; // bundan çox uyğunluq: siyahı verilmir, dəqiqləşdirmə istənir
const MAX_CHARS = 1700; // bundan uzun hədis kəsilir
const COMMON_DF = 0.08; // bu paydan çox hədisdə olan söz «ümumi» sayılır (AND rejimində atılır)
const WINDOW = 30; // bütün sözlər bu token pəncərəsində olmalıdır (ifadə tam deyilsə)

// ---------------------------------------------------------------- indeks (tənbəl)
let _idx = null;
async function loadIndex() {
  if (!_idx) {
    _idx = import("./_hadith/index.js").then((m) => {
      const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
      const hl = blob.readUInt32LE(0);
      const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
      const vocab = head.vocab.split("\n");
      const V = vocab.length;
      const vmap = new Map();
      for (let i = 0; i < V; i++) vmap.set(vocab[i], i);
      const N = head.N;
      const dstart = new Int32Array(N + 1);
      // token sayını bilmək üçün əvvəl bir keçid
      let p = 4 + hl;
      const first = p;
      let total = 0;
      for (let d = 0; d < N; d++) {
        let n = 0;
        let mul = 1;
        let b;
        do {
          b = blob[p++];
          n += (b & 127) * mul;
          mul *= 128;
        } while (b & 128);
        dstart[d] = total;
        total += n;
        for (let i = 0; i < n; i++) while (blob[p++] & 128);
      }
      dstart[N] = total;
      const tok = new Int32Array(total);
      p = first;
      let w = 0;
      for (let d = 0; d < N; d++) {
        let n = 0;
        let mul = 1;
        let b;
        do {
          b = blob[p++];
          n += (b & 127) * mul;
          mul *= 128;
        } while (b & 128);
        for (let i = 0; i < n; i++) {
          let v = 0;
          let m2 = 1;
          do {
            b = blob[p++];
            v += (b & 127) * m2;
            m2 *= 128;
          } while (b & 128);
          tok[w++] = v;
        }
      }
      // tərs indeks (CSR): hər söz üçün unikal hədis id-ləri (artan)
      const cnt = new Int32Array(V + 1);
      const seen = new Int32Array(V).fill(-1);
      for (let d = 0; d < N; d++) for (let i = dstart[d]; i < dstart[d + 1]; i++) {
        const t = tok[i];
        if (seen[t] !== d) {
          seen[t] = d;
          cnt[t + 1]++;
        }
      }
      for (let t = 0; t < V; t++) cnt[t + 1] += cnt[t];
      const docs = new Int32Array(cnt[V]);
      const fill = cnt.slice(0, V);
      seen.fill(-1);
      for (let d = 0; d < N; d++) for (let i = dstart[d]; i < dstart[d + 1]; i++) {
        const t = tok[i];
        if (seen[t] !== d) {
          seen[t] = d;
          docs[fill[t]++] = d;
        }
      }
      return { N, books: head.books, vocab, vmap, dstart, tok, post: cnt, docs };
    });
  }
  return _idx;
}
export const __loadIndex = loadIndex;

const _shards = new Map();
async function loadShard(bid, s) {
  const k = bid + ":" + s;
  if (!_shards.has(k)) {
    _shards.set(
      k,
      LOADERS[bid][s]().then((m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"))),
    );
  }
  return _shards.get(k);
}
function locate(idx, g) {
  let lo = 0;
  let hi = idx.books.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (idx.books[mid].start <= g) lo = mid;
    else hi = mid - 1;
  }
  return { book: idx.books[lo], local: g - idx.books[lo].start };
}
/** Hədis sətri: {id, book, kitab, bab, no, noInt, grading, text} */
export async function getHadith(idx, g) {
  const { book, local } = locate(idx, g);
  const shard = await loadShard(book.id, Math.floor(local / SHARD));
  const r = shard[local % SHARD];
  return { id: g, bookId: book.id, kitab: r[0], bab: r[1], no: r[2], noInt: r[3], grading: r[4], text: r[5], src: r[6] || "" };
}

// ---------------------------------------------------------------- axtarış
function postings(idx, t) {
  return idx.docs.subarray(idx.post[t], idx.post[t + 1]);
}
function intersect(lists) {
  lists = lists.slice().sort((a, b) => a.length - b.length);
  let cur = Array.from(lists[0]);
  for (let i = 1; i < lists.length && cur.length; i++) {
    const o = lists[i];
    const next = [];
    let j = 0;
    for (const d of cur) {
      while (j < o.length && o[j] < d) j++;
      if (j < o.length && o[j] === d) next.push(d);
    }
    cur = next;
  }
  return cur;
}
function hasPhrase(idx, d, ids) {
  const a = idx.dstart[d];
  const b = idx.dstart[d + 1] - ids.length;
  const tk = idx.tok;
  outer: for (let i = a; i <= b; i++) {
    if (tk[i] !== ids[0]) continue;
    for (let j = 1; j < ids.length; j++) if (tk[i + j] !== ids[j]) continue outer;
    return true;
  }
  return false;
}
// bütün (set) sözlər WINDOW token pəncərəsində?
function near(idx, d, set) {
  const k = set.length;
  if (k <= 1) return true;
  const pos = new Map(set.map((t) => [t, -1e9]));
  const a = idx.dstart[d];
  const b = idx.dstart[d + 1];
  for (let i = a; i < b; i++) {
    const t = idx.tok[i];
    if (!pos.has(t)) continue;
    pos.set(t, i);
    let mn = i;
    for (const v of pos.values()) if (v < mn) mn = v;
    if (mn >= 0 && i - mn < Math.max(WINDOW, k * 4)) return true;
  }
  return false;
}

/**
 * @param {string} phrase ərəbcə söz/ifadə
 * @returns {Promise<{terms:string[], ids:number[], list:number[], exact:number, unknown:string[]}>}
 *   list: göstəriləcək hədis id-ləri (tam ifadə birinci, sonra yaxın bütün sözlər), hər qrup kitab/nömrə sırası ilə
 */
export async function searchHadith(phrase) {
  const idx = await loadIndex();
  const terms = tokens(phrase);
  const out = { terms, ids: [], list: [], exact: 0, unknown: [] };
  if (!terms.length) return out;
  const ids = terms.map((t) => idx.vmap.get(t));
  out.unknown = terms.filter((t, i) => ids[i] == null);
  if (out.unknown.length) return out;
  out.ids = ids;
  const uniq = [...new Set(ids)];
  let must = uniq.filter((t) => postings(idx, t).length / idx.N <= COMMON_DF);
  if (!must.length) must = uniq;
  const cand = intersect(must.map((t) => postings(idx, t)));
  if (terms.length === 1) {
    out.list = cand;
    out.exact = cand.length;
    return out;
  }
  const exact = [];
  const rest = [];
  for (const d of cand) {
    if (hasPhrase(idx, d, ids)) exact.push(d);
    else if (near(idx, d, uniq)) rest.push(d);
  }
  out.exact = exact.length;
  out.list = exact.concat(rest);
  return out;
}

// ---------------------------------------------------------------- mənbə / hökm sətirləri
export const BOOK_META = {
  735: { author: "البخاري", title: "صحيح البخاري", ed: "ت البغا" },
  1727: { author: "مسلم", title: "صحيح مسلم", ed: "ت عبد الباقي" },
  117359: { author: "أبو داود", title: "سنن أبي داود", ed: "ت الأرنؤوط", grader: "شعيب الأرنؤوط ومحمد كامل قره بللي (في الحاشية)" },
  1363: { author: "الترمذي", title: "سنن الترمذي", ed: "ط الرسالة", grader: "شعيب الأرنؤوط وآخرون، محققو ط الرسالة (في الحاشية)" },
  1339: { author: "النسائي", title: "سنن النسائي (المجتبى)", ed: "ط الرسالة", grader: "محققو ط الرسالة، عرقسوسي والخن وآخرون (في الحاشية)" },
  1194: { author: "ابن ماجه", title: "سنن ابن ماجه", ed: "ت هادي", grader: "الألباني غالبًا / عصام موسى هادي" },
};
const NO_GRADE = "الحكم: غير مذكور في هذه النشرة";
const AR_DIG = /[٠-٩]/g;
const asciiDigits = (s) => String(s).replace(AR_DIG, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
const clean1 = (s) => String(s || "").replace(/\s+/g, " ").replace(/[\s.:،]+$/, "").trim();

export function sourceLine(h) {
  const m = BOOK_META[h.bookId];
  let k = clean1(h.kitab);
  if (k && !/كتاب|كِتَاب|كِتاب|أبواب|أَبْوَاب|ابواب|أَبْوَابِ|أَبْوَاب/.test(k)) k = "كتاب " + k;
  let b = clean1(h.bab);
  if (b && norm(b).split(" ")[0] !== "باب" && !/^باب/.test(norm(b))) b = "باب " + b;
  // h.src: نص مكمَّل من نشرة أخرى (الصفوف التي سقط نصها من الشاملة) — يُذكر صراحةً
  return [m.author, m.title, k, b, "رقم " + asciiDigits(h.no)].filter(Boolean).join("، ") + ` (${m.ed}${h.src ? " — " + h.src : ""})`;
}
export function gradeLine(h) {
  const m = BOOK_META[h.bookId];
  if (h.bookId === "735") return "الحكم: صحيح — أخرجه البخاري في «صحيحه»";
  if (h.bookId === "1727") return /مقدمة/.test(norm(h.kitab)) ? NO_GRADE + " (من مقدمة صحيح مسلم)" : "الحكم: صحيح — أخرجه مسلم في «صحيحه»";
  const g = clean1(h.grading);
  return g ? `الحكم: ${g} — ${m.grader}` : NO_GRADE;
}

// uzun hədisi (mətn) uyğunluq yerinin ətrafında kəsir
export function excerpt(text, termSet) {
  if (text.length <= MAX_CHARS) return { text, cut: false };
  let pos = 0;
  if (termSet && termSet.size) {
    const sp = tokenSpans(text).find((x) => termSet.has(x.t));
    if (sp) pos = sp.start;
  }
  let a = pos > 1000 ? sentenceStart(text, pos, 600) : 0;
  let b = Math.min(text.length, a + MAX_CHARS);
  if (b < text.length) b = sentenceEnd(text, b, { minPos: a + Math.floor(MAX_CHARS * 0.6), maxFwd: 400 });
  return { text: (a > 0 ? "« ... » " : "") + text.slice(a, b).trim() + (b < text.length ? " « ... »" : ""), cut: true };
}

// ---------------------------------------------------------------- mətnlər (yalnız ümumi çərçivə; hədis özü tərcümə olunmur)
const T = {
  az: {
    found: (q, n) => `«${q}» üzrə Kütübü-sittədə ${n} hədis tapıldı.`,
    foundNum: (q, n) => `${q}: ${n} hədis.`,
    range: (a, b, n) => `${a}–${b} / ${n} göstərilir.`,
    exactNote: (x) => `İfadəni tam saxlayan: ${x}.`,
    broad: (q, n) => `«${q}» üçün ${n} hədis tapıldı. Bu, çox geniş axtarışdır, hamısını siyahılamıram. Daha dəqiq ifadə yaz (2-3 ərəbcə söz).`,
    broadExact: (x) => `Yalnız ifadəni tam saxlayan ${x} hədis göstərilir.`,
    none: (q) => `«${q}» üzrə Kütübü-sittədə (Buxari, Müslim, Əbu Davud, Tirmizi, Nəsai, İbn Macə) hədis tapılmadı. Başqa ərəbcə söz və ya ifadə yaz.`,
    noNum: (b, max) => `${b} kitabında belə nömrə tapılmadı (ən böyük nömrə: ${max}).`,
    usage: "Hədis axtarmaq üçün ərəbcə söz və ya ifadə yaz, məsələn: «hədis axtar: إنما الأعمال بالنيات» və ya «hədis niyyət haqqında». Nömrə ilə də olar: «Buxari 1».",
    cut: "(mətn qısaldılıb)",
    more: (a, b, n) => `Daha çox göstər (${a}–${b} / ${n})`,
    moreQ: "davam",
    sl: "Daha çox hədis var:",
    ended: "Başqa hədis qalmayıb. Yeni axtarış üçün söz və ya ifadə yaz.",
  },
  tr: {
    found: (q, n) => `«${q}» için Kütüb-i Sitte'de ${n} hadis bulundu.`,
    foundNum: (q, n) => `${q}: ${n} hadis.`,
    range: (a, b, n) => `${a}–${b} / ${n} gösteriliyor.`,
    exactNote: (x) => `İfadeyi tam içeren: ${x}.`,
    broad: (q, n) => `«${q}» için ${n} hadis bulundu. Bu çok geniş bir arama, hepsini listelemiyorum. Daha belirgin bir ifade yazın (2-3 Arapça kelime).`,
    broadExact: (x) => `Yalnızca ifadeyi tam içeren ${x} hadis gösteriliyor.`,
    none: (q) => `«${q}» için Kütüb-i Sitte'de (Buhârî, Müslim, Ebû Dâvûd, Tirmizî, Nesâî, İbn Mâce) hadis bulunamadı. Başka bir Arapça kelime veya ifade yazın.`,
    noNum: (b, max) => `${b} kitabında böyle bir numara yok (en büyük numara: ${max}).`,
    usage: "Hadis aramak için Arapça bir kelime veya ifade yazın, örneğin: «hadis ara: إنما الأعمال بالنيات» ya da «hadis niyet hakkında». Numara ile de olur: «Buhari 1».",
    cut: "(metin kısaltıldı)",
    more: (a, b, n) => `Daha fazla göster (${a}–${b} / ${n})`,
    moreQ: "devam",
    sl: "Daha fazla hadis var:",
    ended: "Başka hadis kalmadı. Yeni arama için kelime veya ifade yazın.",
  },
  en: {
    found: (q, n) => `${n} hadith(s) found in the Six Books for «${q}».`,
    foundNum: (q, n) => `${q}: ${n} hadith(s).`,
    range: (a, b, n) => `Showing ${a}–${b} of ${n}.`,
    exactNote: (x) => `Containing the exact phrase: ${x}.`,
    broad: (q, n) => `${n} hadiths match «${q}». That is too broad to list. Please write a more specific phrase (2-3 Arabic words).`,
    broadExact: (x) => `Only the ${x} hadiths containing the exact phrase are shown.`,
    none: (q) => `No hadith found for «${q}» in the Six Books (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah). Try another Arabic word or phrase.`,
    noNum: (b, max) => `No such number in ${b} (highest number: ${max}).`,
    usage: "To search hadith, write an Arabic word or phrase, e.g. «hadith search: إنما الأعمال بالنيات» or «hadith about intention». You can also look up by number: «Bukhari 1».",
    cut: "(text shortened)",
    more: (a, b, n) => `Show more (${a}–${b} of ${n})`,
    moreQ: "more",
    sl: "More hadith available:",
    ended: "No more hadith. Write another word or phrase to search again.",
  },
  ru: {
    found: (q, n) => `По запросу «${q}» в Кутуб ас-Ситта найдено хадисов: ${n}.`,
    foundNum: (q, n) => `${q}: хадисов ${n}.`,
    range: (a, b, n) => `Показаны ${a}–${b} из ${n}.`,
    exactNote: (x) => `С точной фразой: ${x}.`,
    broad: (q, n) => `По запросу «${q}» найдено хадисов: ${n}. Это слишком широкий поиск. Напишите более точную фразу (2-3 арабских слова).`,
    broadExact: (x) => `Показаны только ${x} хадисов с точной фразой.`,
    none: (q) => `По запросу «${q}» в Кутуб ас-Ситта (Бухари, Муслим, Абу Дауд, Тирмизи, Насаи, Ибн Маджа) хадисов не найдено. Напишите другое арабское слово или фразу.`,
    noNum: (b, max) => `В книге ${b} нет такого номера (наибольший номер: ${max}).`,
    usage: "Для поиска хадисов напишите арабское слово или фразу, например: «хадис поиск: إنما الأعمال بالنيات» или «хадис о намерении». Можно и по номеру: «Бухари 1».",
    cut: "(текст сокращён)",
    more: (a, b, n) => `Показать ещё (${a}–${b} из ${n})`,
    moreQ: "дальше",
    sl: "Есть ещё хадисы:",
    ended: "Других хадисов нет. Напишите другое слово или фразу для нового поиска.",
  },
  ar: {
    found: (q, n) => `تم العثور على ${n} حديثًا في الكتب الستة عن «${q}».`,
    foundNum: (q, n) => `${q}: ${n} حديثًا.`,
    range: (a, b, n) => `المعروض ${a}–${b} من ${n}.`,
    exactNote: (x) => `المطابق للعبارة تمامًا: ${x}.`,
    broad: (q, n) => `يوجد ${n} حديثًا لـ «${q}». هذا بحث واسع جدًا. اكتب عبارة أدق (كلمتان أو ثلاث).`,
    broadExact: (x) => `المعروض هو ${x} حديثًا تطابق العبارة تمامًا فقط.`,
    none: (q) => `لم يُعثر على حديث لـ «${q}» في الكتب الستة. جرّب كلمة أو عبارة أخرى.`,
    noNum: (b, max) => `لا يوجد هذا الرقم في ${b} (أكبر رقم: ${max}).`,
    usage: "للبحث في الأحاديث اكتب كلمة أو عبارة، مثل: «حديث إنما الأعمال بالنيات». ويمكن البحث بالرقم: «صحيح البخاري 1».",
    cut: "(النص مختصر)",
    more: (a, b, n) => `عرض المزيد (${a}–${b} من ${n})`,
    moreQ: "تابع",
    sl: "هناك المزيد من الأحاديث:",
    ended: "لا توجد أحاديث أخرى. اكتب كلمة أو عبارة جديدة للبحث.",
  },
};
const tx = (lang) => T[lang] || T.az;
const toLang = (m) => {
  const l = detectLang(m);
  return T[l] ? l : "az";
}

// ---------------------------------------------------------------- sorğunun aşkarlanması
const NUM_FILLER = new Set(["hedis", "hadis", "hadith", "hadees", "hadiths", "hadisi", "hedisi", "nomresi", "nomre", "numarasi", "numara", "no", "nr", "number", "num", "n", "#", "№", "numarali", "nomreli", "nomrelisi", "رقم", "حديث", "الحديث", "حديثا", "хадис", "номер", "no.", "nu"]);
const BOOK_RE = [
  ["735", /(?:sehih\s+|sahih\s+|sahihi\s+)?(?:(?:el|al)[- ]?)?(?:buxari|bukhari|bukari|buhari|buhari)\b|(?:صحيح\s+)?(?:ال)?بخاري|(?:сахих\s+)?бухари/],
  ["1727", /(?:sehih\s+|sahih\s+|sahihi\s+)?(?:(?:el|al)[- ]?)?muslim\b|(?:صحيح\s+)?مسلم|(?:сахих\s+)?муслим/],
  ["117359", /(?:sunen\s+|sunan\s+|sunni\s+)?(?:ebu|abu|ebi|abi)\s*(?:davud|dawud|dawood|davut|daud|dawood)\b|(?:سنن\s+)?(?:[اأإ]بي|[اأإ]بو)\s+داود|(?:сунан\s+)?абу\s+дауд/],
  ["1363", /(?:sunen\s+|sunan\s+|cami\s+|jami\s+)?(?:(?:et|at|el|al)[- ]?)?(?:tirmizi|tirmidhi|tirmidzi|termizi|tirmiziy)\b|(?:سنن\s+|جامع\s+)?(?:ال)?ترمذي|(?:джами\s+)?тирмизи/],
  ["1339", /(?:sunen\s+|sunan\s+)?(?:(?:en|an|el|al)[- ]?)?(?:nesai|nasai|nesei|nesaiy)\b|(?:سنن\s+)?(?:ال)?نسائي|(?:сунан\s+)?насаи/],
  ["1194", /(?:sunen\s+|sunan\s+)?ibn\s*(?:mace|majah|maja|maca|macah)\b|(?:سنن\s+)?ابن\s+ماجه?|(?:сунан\s+)?ибн\s+маджа/],
];
const BOOK_MAX = { 735: 7123, 1727: 3033, 117359: 5274, 1363: 4300, 1339: 5758, 1194: 4341 };
const BOOK_NAME_AR = { 735: "صحيح البخاري", 1727: "صحيح مسلم", 117359: "سنن أبي داود", 1363: "جامع الترمذي", 1339: "سنن النسائي", 1194: "سنن ابن ماجه" };
const BOOK_NAME = { 735: "Səhih əl-Buxari", 1727: "Səhih Müslim", 117359: "Sünən Əbu Davud", 1363: "Camiu't-Tirmizi", 1339: "Sünən ən-Nəsai", 1194: "Sünən İbn Macə" };

/** «Buxari 1», «صحيح البخاري 1», «Müslim 8 hədis» -> {book, num} yoxsa null. Yalnız kitab adı + nömrə (+ hədis/nömrə sözü). */
export function parseNumberQuery(message) {
  const raw0 = String(message || "").trim();
  if (!raw0 || raw0.length > 80) return null;
  const raw = asciiDigits(raw0.replace(/[\u064B-\u065F\u0670\u0640]/g, ""));
  const f = foldLat(raw).replace(/[:,.;!?]+/g, " ").replace(/\s+/g, " ").trim();
  const ar = raw.replace(/[:,.;!?،؟]+/g, " ").replace(/\s+/g, " ").trim();
  for (const [id, re] of BOOK_RE) {
    for (const s of [f, ar]) {
      const m = re.exec(s);
      if (!m) continue;
      const rest = (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length)).trim();
      const toks = rest.split(/\s+/).filter(Boolean);
      const nums = toks.filter((t) => /^\d{1,5}$/.test(t));
      if (nums.length !== 1) continue;
      const others = toks.filter((t) => !/^\d{1,5}$/.test(t));
      if (!others.every((t) => NUM_FILLER.has(t) || NUM_FILLER.has(norm(t)))) continue;
      return { book: id, num: Number(nums[0]) };
    }
  }
  return null;
}

const QURAN_AR = /آي[ةه]|ايه|ايات|آيات|سور[ةه]|قرآن|القرآن|قران|تفسير|تفاسير|﴿|﴾|\d\s*[:：]\s*\d/;
const QURAN_LAT = /\b(ay[eə]t?\w*|ayah|ayat|sur[eə]\w*|surah|quran\w*|qur'?an|kur'?an\w*|koran|tef?sir\w*|tafsir\w*|verse|verses|bəqərə|beqere|bakara)\b/i;
const QURAN_RU = /аят|сура|коран|тафсир/i;
const LEX_AR = /(?:^|\s)(?:معنى|معني|يعني|تعريف|مرادف|المقصود|المراد)(?=\s|$)/;
const NAHW_AR = /اعراب|إعراب|أعرب|اعرب|النحو|نحو\s|الصرف|التصريف|قواعد/;
const CUE_AR = /(?:^|\s)(?:ال)?(?:حديث|احاديث|أحاديث)(?=\s|$|[:؟?،,])/;
const CUE_LAT = /\b(?:h[əe]dis\w*|hadis\w*|hadith\w*|hadees\w*)\b/i;
const CUE_RU = /хадис\w*/i;
const SEARCH_VERB = /\b(?:axtar\w*|tap\b|tapin|tapa\b|goster\w*|göstər\w*|ara\b|arama|bul\b|search\w*|find|show|look|ищи\w*|найд\w*|поиск\w*|покаж\w*)|ابحث|بحث|أريد|اريد|اعطني|أعطني|اذكر/i;
const AR_RUN = /[\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640][\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s]*/g;
const LEAD_AR = new Set(["عن", "في", "حول", "بشان", "بخصوص", "عند", "حديث", "الحديث", "احاديث", "ابحث", "بحث", "عنه", "ما", "ماورد", "ورد", "اريد", "اعطني", "اذكر", "لي", "عن", "في", "من"]);

// qısa mövzu lüğəti (sabit cədvəl, AI deyil): latın/kiril sözü -> ərəbcə axtarış sözü
export const TOPICS = [
  [["niyyet", "niyyat", "niyet", "intention", "намерен", "ният", "ниет"], "النية"],
  [["sabr", "sabir", "patience", "терпен", "сабр"], "الصبر"],
  [["namaz", "salah", "salat", "prayer", "молитв", "намаз", "салят"], "الصلاة"],
  [["oruc", "siyam", "fasting", "ураз", "пост", "orucu"], "الصيام"],
  [["zekat", "zakat", "закят", "закят"], "الزكاة"],
  [["hecc", "hac", "hajj", "haj", "хадж"], "الحج"],
  [["iman", "faith", "иман", "вера"], "الإيمان"],
  [["ixlas", "ihlas", "ikhlas", "sincerity", "ихлас", "искренн"], "الإخلاص"],
  [["sidq", "dogruluq", "dogruluk", "durustluk", "truthful", "honest", "правдив", "сидк"], "الصدق"],
  [["yalan", "yalanci", "lying", "lie", "ложь", "лжи", "ложн"], "الكذب"],
  [["tevekkul", "tawakkul", "reliance", "тавакуль"], "التوكل"],
  [["tovbe", "tevbe", "tawba", "repentance", "покаяни", "тауба"], "التوبة"],
  [["dua", "duaa", "supplication", "дуа", "мольб"], "الدعاء"],
  [["sedeqe", "sadaka", "sadaqa", "charity", "садака"], "الصدقة"],
  [["cennet", "jannah", "janna", "paradise", "рай", "джаннат"], "الجنة"],
  [["cehennem", "jahannam", "hellfire", "джаханнам"], "النار"],
  [["olum", "death", "смерть", "смерт"], "الموت"],
  [["nikah", "evlilik", "marriage", "брак"], "النكاح"],
  [["exlaq", "ahlak", "akhlaq", "morals", "character", "нрав", "ахлак"], "الخلق"],
  [["valideyn", "ata-ana", "ataana", "ebeveyn", "parents", "родител", "walidayn"], "الوالدين"],
  [["qonsu", "komsu", "neighbor", "neighbour", "сосед"], "الجار"],
  [["ilim", "knowledge", "знани"], "العلم"],
  [["kibir", "qurur", "pride", "arrogance", "гордын", "высокомер"], "الكبر"],
  [["heya", "haya", "modesty", "стыдлив"], "الحياء"],
  [["qezeb", "ofke", "anger", "гнев"], "الغضب"],
  [["rehmet", "merhamet", "mercy", "милосерд"], "الرحمة"],
  [["zulm", "zulum", "oppression", "угнетен", "притеснен"], "الظلم"],
  [["qeybet", "gıybet", "giybet", "backbiting", "сплетн"], "الغيبة"],
  [["abdest", "wudu", "ablution", "омовен", "тахарат"], "الوضوء"],
  [["qebir", "kabir", "grave", "могил"], "القبر"],
  [["yetim", "orphan", "сирот"], "اليتيم"],
  [["sefaet", "sefaat", "shafaa", "intercession", "заступнич"], "الشفاعة"],
  [["haset", "heset", "envy", "зависть"], "الحسد"],
  [["rusvet", "rusvet", "bribe", "взятк"], "الرشوة"],
  [["riba", "faiz", "usury", "ростовщич"], "الربا"],
  [["zina", "zinaa", "adultery", "прелюбод"], "الزنا"],
  [["xemr", "hamr", "alcohol", "wine", "içki", "icki", "вино", "алкогол"], "الخمر"],
  [["cihad", "jihad", "джихад"], "الجهاد"],
  [["qiyamet", "kiyamet", "resurrection", "судный", "киям"], "القيامة"],
  [["emanet", "emanet", "trust", "amanah", "аманат"], "الأمانة"],
  [["edalet", "adalet", "justice", "справедлив"], "العدل"],
  [["comertlik", "cömertlik", "sexavet", "generosity", "щедрост"], "الكرم"],
  [["qonaq", "misafir", "guest", "гост"], "الضيف"],
];
// yalnız hədis axtarışı üçün əlavə mövzular (fətva lüğətinə qoşulmur: «salam» kimi ümumi sözlər orada təbii sual sayılmasın)
export const TOPICS_EXTRA = [
  [["ana", "anne", "anaya", "anani", "anam", "mother", "мать", "матер"], "أمك"],
  [["ata", "baba", "father", "отец", "отца"], "الوالد"],
  [["qohum", "akraba", "sile", "sileyi", "relatives", "kinship", "родствен"], "الرحم"],
  [["usaq", "cocuk", "ovlad", "evlat", "children", "дети", "детей"], "الولد"],
  [["qadin", "kadin", "arvad", "women", "женщин"], "النساء"],
  [["elm", "ilm", "alim", "scholar", "учен"], "العلم"],
  [["quran", "kuran", "qurani", "koran", "коран"], "القرآن"],
  [["zikr", "dhikr", "зикр"], "الذكر"],
  [["salavat", "salavat", "salawat", "салават"], "الصلاة على النبي"],
  [["sukur", "sukr", "shukr", "gratitude", "благодар"], "الشكر"],
  [["tebessum", "gulus", "smile", "улыб"], "تبسمك"],
  [["salam", "selam", "greeting", "салям", "приветств"], "السلام"],
  [["hicab", "tesettur", "hijab", "хиджаб"], "الحجاب"],
  [["ticaret", "alver", "trade", "торгов"], "البيع"],
  [["borc", "debt", "долг"], "الدين"],
  [["xestelik", "hastalik", "xeste", "sickness", "illness", "болезн"], "المريض"],
  [["cenaze", "janaza", "funeral", "похорон"], "الجنازة"],
  [["mescid", "mescit", "masjid", "mosque", "мечет"], "المسجد"],
  [["cume", "cuma", "jumuah", "jumma", "friday", "пятниц", "джума"], "الجمعة"],
  [["sunnet", "sunnah", "сунн"], "السنة"],
  [["bidet", "bidat", "bidah", "innovation", "нововвед"], "بدعة"],
  [["sirk", "shirk", "ширк"], "الشرك"],
  [["tovhid", "tevhid", "tawhid", "таухид"], "التوحيد"],
  [["dil", "lisan", "tongue", "язык"], "اللسان"],
  [["yuxu", "ruya", "dream", "сон"], "الرؤيا"],
  [["deccal", "dajjal", "даджжал"], "الدجال"],
  [["mehdi", "mahdi", "махди"], "المهدي"],
  [["isa", "jesus", "иса"], "عيسى ابن مريم"],
  [["mələk", "melek", "angel", "ангел"], "الملائكة"],
  [["seytan", "shaytan", "satan", "шайтан"], "الشيطان"],
  [["cin", "jinn", "джинн"], "الجن"],
  [["sehr", "sihr", "sihir", "magic", "колдов"], "السحر"],
  [["dunya", "world", "мир"], "الدنيا"],
  [["axiret", "ahiret", "akhirah", "hereafter", "ахира"], "الآخرة"],
  [["sedaqet", "dostluq", "dost", "friend", "друг"], "الخليل"],
  [["temizlik", "taharet", "tahara", "purity", "чистот"], "الطهور"],
  [["qusl", "gusul", "ghusl", "гусль"], "الغسل"],
  [["teyemmum", "tayammum", "таяммум"], "التيمم"],
  [["ezan", "azan", "adhan", "азан"], "الأذان"],
  [["sehur", "suhur", "sahur", "сухур"], "السحور"],
  [["iftar", "ифтар"], "الفطر"],
  [["qurban", "kurban", "udhiyah", "курбан"], "الأضحية"],
  [["umre", "umra", "umrah", "умра"], "العمرة"],
  [["itaet", "obedience", "повинов"], "الطاعة"],
  [["hakim", "emir", "ruler", "правител"], "الأمير"],
  [["sexavet", "comerd"], "الجود"],
  [["paxilliq", "cimrilik", "xesislik", "stinginess", "скуп"], "البخل"],
  [["oğurluq", "ogurluq", "hirsizlik", "theft", "краж"], "السرقة"],
  [["qetl", "oldurmek", "murder", "killing", "убийств"], "القتل"],
  [["şəhid", "sehid", "shahid", "martyr", "шахид"], "الشهيد"],
  [["heyvan", "hayvan", "animal", "животн"], "البهائم"],
  [["it", "kopek", "dog", "собак"], "الكلب"],
  [["pisik", "kedi", "cat", "кошк"], "الهرة"],
  [["yemek", "food", "eating", "еда"], "الطعام"],
  [["su", "water", "вода"], "الماء"],
  [["paltar", "elbise", "geyim", "clothes", "одежд"], "الثوب"],
  [["qizil", "altin", "gold", "золот"], "الذهب"],
  [["ipek", "ipək", "silk", "шелк"], "الحرير"],
  [["saqqal", "sakal", "beard", "бород"], "اللحى"],
  [["misvak", "miswak", "мисвак"], "السواك"],
];
// çoxsözlü mövzular (tək sözdən əvvəl yoxlanır): ardıcıl söz prefiksləri -> ərəbcə ifadə
export const TOPIC_PHRASES = [
  [["namaz terk", "namazi terk", "namazı tərk", "namaz qilmayan", "namaz kilmayan", "terk namaz", "abandon prayer", "leaving prayer", "оставлен намаз"], "ترك الصلاة"],
  [["ana haqq", "ana hakk", "anaya hormet", "anaya yaxsiliq", "rights of mother"], "أمك"],
  [["valideyn haqq", "ata ana haqq", "ataya anaya", "valideyne yaxsiliq", "valideyne hormet", "ebeveyn hakk", "kindness to parents", "birr al walidayn"], "بر الوالدين"],
  [["valideyne asi", "valideyne qarsi", "anaya asi", "disobedience to parents", "uquq"], "عقوق الوالدين"],
  [["qohumluq elaqe", "qohumlarla elaqe", "sile rehm", "sileyi rehm", "silat rahim", "akraba ziyaret"], "الرحم"],
  [["əməllər niyyət", "emeller niyyet", "ameller niyet", "deeds intention", "actions intention"], "إنما الأعمال بالنيات"],
  [["gece namaz", "tehecud", "teheccud", "tahajjud", "qiyamul leyl", "night prayer"], "قيام الليل"],
  [["cemaat namaz", "cemaatle namaz", "camaat namaz", "congregational prayer", "jamaah prayer"], "صلاة الجماعة"],
  [["cume namaz", "cuma namaz", "friday prayer", "jumuah prayer"], "الجمعة"],
  [["bayram namaz", "eid prayer"], "العيدين"],
  [["oruc fezilet", "orucun fezilet", "virtue of fasting"], "الصيام جنة"],
  [["quran oxu", "quran oxumaq", "kuran okumak", "reciting quran", "quranin fezilet", "quran fezilet"], "القرآن"],
  [["dilini qoru", "dilin qorunmasi", "dil qoru", "guarding tongue"], "اللسان"],
  [["xos soz", "gozel soz", "yaxsi soz", "good word"], "الكلمة الطيبة"],
  [["elm oyren", "elm talib", "seeking knowledge", "ilim ogren"], "طلب العلم"],
  [["qiyamet elamet", "kiyamet alamet", "signs of the hour", "qiyametin elamet"], "أشراط الساعة"],
  [["qebir ezab", "kabir azab", "punishment of grave"], "عذاب القبر"],
  [["qonsu haqq", "komsu hakk", "rights of neighbour", "rights of neighbor"], "الجار"],
  [["yetime baxmaq", "yetim baxan", "caring for orphan"], "كافل اليتيم"],
  [["insanlara yaxsiliq", "xalqa yaxsiliq", "helping people"], "أحب الناس إلى الله"],
  [["guzgu", "aynaya bax"], "المرآة"],
];
function phraseTopic(message) {
  const toks = foldLat(message).split(/[^a-z\u0400-\u04FF]+/).filter(Boolean);
  for (const [keys, ar] of TOPIC_PHRASES) {
    for (const k0 of keys) {
      const kw = foldLat(k0).split(/\s+/).filter(Boolean);
      for (let i = 0; i + kw.length <= toks.length; i++) {
        let ok = true;
        for (let j = 0; j < kw.length; j++) {
          const t = toks[i + j];
          const k = kw[j];
          if (!(t === k || (k.length >= 3 && t.startsWith(k)))) { ok = false; break; }
        }
        if (ok) return ar;
      }
    }
  }
  return null;
}
function topicTerms(message) {
  const f = foldLat(message);
  const toks = f.split(/[^a-z\u0400-\u04FF-]+/).filter((t) => t.length >= 3);
  const found = [];
  for (const [keys, ar] of [...TOPICS, ...TOPICS_EXTRA]) {
    if (toks.some((t) => keys.some((k0) => { const k = foldLat(k0); return t === k || (k.length >= 4 && t.startsWith(k)); }))) found.push(ar);
  }
  return found.slice(0, 2);
}

/** Mesajdan hədis sorğusunu çıxarır: {mode:'q', phrase} | {mode:'n', book, num} | {mode:'usage'} | null */
export function parseHadithQuery(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 300) return null;
  const nq = parseNumberQuery(raw);
  if (nq) return { mode: "n", book: nq.book, num: nq.num };
  const plain = raw.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  const cue = CUE_AR.test(norm(plain).replace(/احاديث/, "احاديث")) || CUE_AR.test(plain) || CUE_LAT.test(foldLat(raw)) || CUE_RU.test(raw);
  if (!cue) return null;
  if (QURAN_AR.test(plain) || QURAN_LAT.test(raw) || QURAN_LAT.test(foldLat(raw)) || QURAN_RU.test(raw)) return null;
  if (NAHW_AR.test(plain)) return null;
  if (isLexicalQuestion(raw) || LEX_AR.test(plain)) return null;
  // dırnaq içi mətn
  let phrase = "";
  const qm = raw.match(/[«"“„'‘]([^«»"“”„'‘’]{2,200})[»"”“’']/);
  if (qm && /[\u0621-\u064A]/.test(qm[1])) phrase = qm[1];
  if (!phrase) {
    const runs = raw.match(AR_RUN) || [];
    const joined = runs.map((r) => r.trim()).filter((r) => /[\u0621-\u064A]{2}/.test(r)).join(" ");
    phrase = joined;
  }
  if (phrase) {
    // baş tərəfdəki «حديث», «عن», «في» kimi sözlər atılır
    const ws = phrase.split(/\s+/).filter(Boolean);
    while (ws.length && LEAD_AR.has(norm(ws[0]))) ws.shift();
    // sondakı «حديث» və s. də
    while (ws.length > 1 && /^(?:حديث|الحديث|احاديث)$/.test(norm(ws[ws.length - 1]))) ws.pop();
    phrase = ws.join(" ");
  }
  let alts = null;
  if (!phrase || !tokens(phrase).length) {
    const ph = phraseTopic(raw);
    const tp = topicTerms(raw);
    const list = [];
    if (ph) list.push(ph);
    if (tp.length >= 2) list.push(tp.join(" "));
    list.push(...tp);
    try {
      list.push(...topicAlts(raw).alts.flatMap((a) => a.split("/").map((x) => x.trim())));
    } catch {
      /* lüğət yüklənmədi */
    }
    alts = [...new Set(list.filter(Boolean))];
    if (alts.length) phrase = alts[0];
  }
  if (!phrase) {
    // axtarış fel sözü var, amma ifadə yoxdur: qısa istifadə qeydi; ümumi sual («hədis nədir») -> null
    const f = foldLat(raw);
    return SEARCH_VERB.test(f) || SEARCH_VERB.test(raw) ? { mode: "usage" } : null;
  }
  return alts && alts.length > 1 ? { mode: "q", phrase, alts } : { mode: "q", phrase };
}

/** Cümləvi (yalnız ərəbcə) uzun mesaj: hədisin dəqiq ifadəsi ola bilər */
export function parseBareArabic(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (raw.length < 12 || raw.length > 220) return null;
  if (/[؟?]/.test(raw) || /\d/.test(raw.replace(/[\u064B-\u065F]/g, ""))) return null;
  const ar = (raw.match(/[\u0621-\u064A]/g) || []).length;
  const other = (raw.match(/[A-Za-z\u0400-\u04FFƏəĞğİıÖöŞşÜüÇç]/g) || []).length;
  if (ar < 10 || other > 0) return null;
  if (QURAN_AR.test(raw) || NAHW_AR.test(raw)) return null;
  if (tokens(raw).length < 3) return null;
  return { mode: "q", phrase: raw, bare: true };
}

// ---------------------------------------------------------------- cavab
const b64u = (s) => Buffer.from(s, "utf8").toString("base64url");
const unb64u = (s) => Buffer.from(s, "base64url").toString("utf8");
const CTX_RE = /^::ctx:: hadith (q|n) (\d+) (\w+) (\S+)$/m;

function block(h, i, n, termSet, lang) {
  const m = BOOK_META[h.bookId];
  const ex = excerpt(h.text, termSet);
  const lines = [`::tafsir hadith::`, `::tl:: ${i}/${n} · ${m.author} · رقم ${asciiDigits(h.no)}`];
  for (const ln of ex.text.split("\n")) if (ln.trim()) lines.push(ln);
  if (ex.cut) lines.push("::tv:: " + tx(lang).cut);
  lines.push("::src:: " + sourceLine(h), "::src:: " + gradeLine(h), "::/tafsir::");
  return lines.join("\n");
}

async function render({ mode, key, ids, offset, total, exact, lang, head }) {
  const idx = await loadIndex();
  const t = tx(lang);
  const slice = ids.slice(offset, offset + PAGE);
  const termSet = new Set(mode === "q" ? tokens(key) : []);
  const out = [];
  if (head) out.push(head);
  const a = offset + 1;
  const b = offset + slice.length;
  out.push(t.range(a, b, total));
  for (let i = 0; i < slice.length; i++) {
    const h = await getHadith(idx, slice[i]);
    out.push(block(h, offset + i + 1, total, termSet, lang));
  }
  if (b < total) {
    const nb = Math.min(total, b + PAGE);
    out.push(`::sug::\n::sl:: ${t.sl}\n::sb:: ${t.more(b + 1, nb, total)} | ${t.moreQ}\n::/sug::`);
  }
  out.push(`::ctx:: hadith ${mode} ${b} ${lang} ${b64u(key)}`);
  return out.join("\n\n").replace(/\n\n(::sug::|::ctx::)/g, "\n$1");
}

async function runQuery(phrase, lang, { bare = false } = {}) {
  const t = tx(lang);
  const r = await searchHadith(phrase);
  const q = phrase.replace(/\s+/g, " ").trim();
  let list = r.list;
  let head = t.found(q, list.length);
  if (!list.length) return bare ? null : t.none(q);
  if (bare && !(r.terms.length >= 3 && r.exact > 0)) return null;
  if (bare) {
    list = list.slice(0, r.exact);
    head = t.found(q, list.length);
  }
  if (list.length > MAX_LIST) {
    if (r.terms.length >= 2 && r.exact > 0 && r.exact <= MAX_LIST) {
      list = list.slice(0, r.exact);
      head = t.found(q, list.length) + " " + t.broadExact(list.length);
    } else return t.broad(q, list.length);
  } else if (r.terms.length >= 2 && r.exact > 0 && r.exact < list.length) head += " " + t.exactNote(r.exact);
  return render({ mode: "q", key: q, ids: list, offset: 0, total: list.length, exact: r.exact, lang, head });
}

async function numberIds(book, num) {
  const idx = await loadIndex();
  const b = idx.books.find((x) => x.id === book);
  const ids = [];
  // hədis nömrəsi artan olduğuna görə tam keçid (hissə-hissə): yalnız lazım olan hissələr yüklənir
  for (let s = 0; s < b.shards; s++) {
    const sh = await loadShard(book, s);
    for (let i = 0; i < sh.length; i++) if (sh[i][3] === num) ids.push(b.start + s * SHARD + i);
    if (sh.length && sh[sh.length - 1][3] > num + 40 && ids.length) break;
  }
  return ids;
}

async function runNumber(book, num, lang) {
  const t = tx(lang);
  const ids = await numberIds(book, num);
  if (!ids.length) return t.noNum(BOOK_NAME[book], BOOK_MAX[book]);
  const q = `${lang === "ar" ? BOOK_NAME_AR[book] : BOOK_NAME[book]} ${num}`;
  return render({ mode: "n", key: `${book}:${num}`, ids, offset: 0, total: ids.length, exact: ids.length, lang, head: t.foundNum(q, ids.length) });
}

const MORE_RE = /^\s*(?:daha\s+(?:cox|çox|fazla)(?:\s+(?:goster|göstər|göster))?|goster|göstər|show\s+more|more(?:\s+hadiths?)?|next|ещ[её](?:\s+хадис\w*)?|больше|المزيد|أكثر|اكثر)\s*[.!?]?\s*$/i;
async function moreReply(message, hist) {
  const list = Array.isArray(hist) ? hist : [];
  let last = null;
  for (let i = list.length - 1; i >= 0; i--) if (list[i] && list[i].role === "assistant") { last = list[i]; break; }
  if (!last) return null;
  const m = CTX_RE.exec(String(last.text || ""));
  if (!m) return null;
  const mode = m[1];
  const offset = Number(m[2]);
  const lang = T[m[3]] ? m[3] : "az";
  const key = unb64u(m[4]);
  const t = tx(lang);
  const idx = await loadIndex();
  let ids;
  let exact = 0;
  let total;
  if (mode === "n") {
    const [book, num] = key.split(":");
    ids = await numberIds(book, Number(num));
    total = ids.length;
  } else {
    const r = await searchHadith(key);
    ids = r.list;
    exact = r.exact;
    if (ids.length > MAX_LIST) ids = r.terms.length >= 2 && r.exact > 0 && r.exact <= MAX_LIST ? ids.slice(0, r.exact) : [];
    total = ids.length;
  }
  void idx;
  if (offset >= total) return t.ended;
  return render({ mode, key, ids, offset, total, exact, lang, head: "" });
}

/** Açıq hədis sorğusu (cue/nömrə) və ya «davam» (əvvəlki cavab hədis idisə). Digər suallarda null. */
export async function hadithReply(message, hist) {
  try {
    const { isContinue } = await import("./_next.js");
    if (isContinue(message) || MORE_RE.test(String(message || ""))) {
      const r = await moreReply(message, hist);
      if (r) return r;
    }
  } catch {
    /* davam tapılmadı */
  }
  const q = parseHadithQuery(message);
  if (!q) return null;
  const lang = toLang(message);
  if (q.mode === "usage") return tx(lang).usage;
  if (q.mode === "n") return runNumber(q.book, q.num, lang);
  if (q.alts) {
    // mövzu lüğətindən bir neçə variant: nəticəsi olan və çox geniş olmayan ilk variant
    let fallback = null;
    for (const ph of q.alts) {
      const r = await searchHadith(ph);
      if (!r.list.length) continue;
      if (r.list.length <= MAX_LIST || (r.terms.length >= 2 && r.exact > 0 && r.exact <= MAX_LIST)) return runQuery(ph, lang);
      if (!fallback) fallback = ph;
    }
    return runQuery(fallback || q.phrase, lang);
  }
  return runQuery(q.phrase, lang);
}

/** Ərəbcə uzun cümlə hədisin dəqiq ifadəsidirsə (≥3 söz, tam uyğunluq) onu qaytarır; əks halda null (adi söhbətə düşür). */
export async function hadithBare(message) {
  const q = parseBareArabic(message);
  if (!q) return null;
  return runQuery(q.phrase, "ar", { bare: true });
}
