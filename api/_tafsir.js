// Quran təfsirləri (daxili məlumat, AI-siz): Müyəssər, Sədi (QuranEnc.com), İbn Kəsir (ərəbcə, spa5k/tafsir_api).
// Təfsir mətni ərəbcə orijinalda, DƏYİŞDİRİLMƏDƏN verilir; Azərbaycancaya tərcümə UYDURULMUR.
// Cavab: ayə blokunu (ərəbcə + az mənası, api/_ayah.js) ::tafsir:: bloku izləyir. Uzun təfsir hissələrə bölünür («hissə 2»).
import { namesFatawaBook } from "./_fatawa-name.js";
import { LOADERS } from "./_tafsir/loaders.js";
import { ayahLookup, ayahReply, buildBlock, detectLang, digitsAscii, foldLat, AYAH_COUNT } from "./_ayah.js";
import { SURAS } from "./_quran/suras.js";
import { SURA_NAMES_AR } from "./_quran/quran.js";

export const BOOKS = ["muyassar", "saadi", "ibnkathir"];
export const PAGE_CHARS = { muyassar: 3500, saadi: 3500, ibnkathir: 4500 }; // bir cavabda təfsir mətninin təxmini ən çox simvolu (kitab üzrə)
const MAX_SEGS = 8; // bir cavabdakı ən çox ayə/bölmə
const MAX_AYAH_SHOWN = 8;

const LABEL = {
  az: { muyassar: "Təfsir əl-Müyəssər (ərəbcə)", saadi: "Təfsir əs-Sədi (ərəbcə)", ibnkathir: "Təfsir İbn Kəsir (ərəbcə)" },
  tr: { muyassar: "Tefsîr el-Müyesser (Arapça)", saadi: "Tefsîr es-Sa‘dî (Arapça)", ibnkathir: "Tefsîr İbn Kesîr (Arapça)" },
  en: { muyassar: "Tafsir al-Muyassar (Arabic)", saadi: "Tafsir as-Sa'di (Arabic)", ibnkathir: "Tafsir Ibn Kathir (Arabic)" },
  ru: { muyassar: "Тафсир аль-Муяссар (на арабском)", saadi: "Тафсир ас-Саади (на арабском)", ibnkathir: "Тафсир Ибн Касир (на арабском)" },
  ar: { muyassar: "التفسير الميسر", saadi: "تفسير السعدي", ibnkathir: "تفسير ابن كثير" },
};
// Mənbə sətri (ad linki UI-də QuranEnc.com / spa5k üzərindən qurulur)
const SRC = {
  az: { source: "Mənbə", muyassar: "QuranEnc.com · التفسير الميسر", saadi: "QuranEnc.com · تيسير الكريم الرحمن في تفسير كلام المنان — عبد الرحمن بن ناصر السعدي", ibnkathir: "spa5k/tafsir_api (Quran.com / QUL) · تفسير القرآن العظيم — ابن كثير" },
  tr: { source: "Kaynak" },
  en: { source: "Source" },
  ru: { source: "Источник" },
  ar: { source: "المصدر" },
};
/** «Davamı» təklifi düymə kimi (::sug::): etiket «Davamı: <sorğu>», basanda həmin sorğu göndərilir. */
const contChip = (word, q) => `::sug::\n::sb:: ${word}: ${q} | ${q}\n::/sug::`;
const T = {
  az: {
    part: "hissə",
    nofree: "Təfsir ərəbcə orijinalda verilir; Azərbaycancaya tərcümə edilməyib.",
    more: (q) => contChip("Davamı", q),
    others: (list) => `Digər təfsirlər: ${list}.`,
    none: (what) => `Bu təfsirdə ${what} üçün ayrıca şərh yoxdur.`,
    intro: "Nibras AI-də 3 ərəb təfsiri daxili məlumatdan göstərilir (AI olmadan, mətn dəyişdirilmədən):",
    ask: (ex) => `Ayə və ya surə yaz, məsələn: ${ex}`,
    desc: { muyassar: "qısa və aydın məna izahı", saadi: "Təysirul-Kərimir-Rəhman (Əbdürrəhman ibn Nasir əs-Sədi)", ibnkathir: "Təfsirul-Quranil-Azim (Hafiz ibn Kəsir) — geniş, rəvayətlərlə" },
    lead: { muyassar: "Müyəssər təfsiri", saadi: "Sədi təfsiri", ibnkathir: "İbn Kəsir təfsiri" },
  },
  tr: {
    part: "bölüm",
    nofree: "Tefsir Arapça aslıyla verilir; Türkçeye çevrilmemiştir.",
    more: (q) => contChip("Devamı", q),
    others: (list) => `Diğer tefsirler: ${list}.`,
    none: (what) => `Bu tefsirde ${what} için ayrı bir açıklama yoktur.`,
    intro: "Nibras AI'de 3 Arapça tefsir iç veriden gösterilir (yapay zekâ olmadan, metin değiştirilmeden):",
    ask: (ex) => `Âyet veya sure yaz, örneğin: ${ex}`,
    desc: { muyassar: "kısa ve anlaşılır meal açıklaması", saadi: "Teysîru'l-Kerîmi'r-Rahmân (Abdurrahman b. Nâsır es-Sa‘dî)", ibnkathir: "Tefsîru'l-Kur'âni'l-Azîm (İbn Kesîr) — geniş, rivayetli" },
    lead: { muyassar: "Müyesser tefsiri", saadi: "Sa‘dî tefsiri", ibnkathir: "İbn Kesîr tefsiri" },
  },
  en: {
    part: "part",
    nofree: "The tafsir is given in its original Arabic; it has not been translated.",
    more: (q) => contChip("Continue", q),
    others: (list) => `Other tafsirs: ${list}.`,
    none: (what) => `This tafsir has no separate commentary for ${what}.`,
    intro: "Nibras AI shows 3 Arabic tafsirs from built-in data (no AI, text unchanged):",
    ask: (ex) => `Write a verse or surah, for example: ${ex}`,
    desc: { muyassar: "short, clear explanation of the meanings", saadi: "Taysir al-Karim al-Rahman (Abd al-Rahman ibn Nasir as-Sa'di)", ibnkathir: "Tafsir al-Qur'an al-Azim (Hafiz Ibn Kathir) — extensive, with narrations" },
    lead: { muyassar: "Muyassar tafsir", saadi: "Sa'di tafsir", ibnkathir: "Ibn Kathir tafsir" },
  },
  ru: {
    part: "часть",
    nofree: "Тафсир приводится на арабском в оригинале; перевод не делался.",
    more: (q) => contChip("Продолжение", q),
    others: (list) => `Другие тафсиры: ${list}.`,
    none: (what) => `В этом тафсире нет отдельного толкования для ${what}.`,
    intro: "В Nibras AI доступны 3 арабских тафсира из встроенных данных (без ИИ, текст без изменений):",
    ask: (ex) => `Напишите аят или суру, например: ${ex}`,
    desc: { muyassar: "краткое и ясное разъяснение смыслов", saadi: "Тайсир аль-Карим ар-Рахман (Абд ар-Рахман ибн Насир ас-Саади)", ibnkathir: "Тафсир аль-Куръан аль-Азым (аль-Хафиз Ибн Касир) — подробный, с передачами" },
    lead: { muyassar: "тафсир Муяссар", saadi: "тафсир ас-Саади", ibnkathir: "тафсир Ибн Касир" },
  },
  ar: {
    part: "الجزء",
    nofree: "التفسير بنصه العربي الأصلي دون تغيير.",
    more: (q) => contChip("المتابعة", q),
    others: (list) => `تفاسير أخرى: ${list}.`,
    none: (what) => `لا يوجد في هذا التفسير شرح مستقل لـ${what}.`,
    intro: "يعرض Nibras AI ثلاثة تفاسير عربية من بيانات داخلية (دون ذكاء اصطناعي ودون تغيير النص):",
    ask: (ex) => `اكتب آية أو سورة، مثل: ${ex}`,
    desc: { muyassar: "شرح موجز وميسّر للمعاني", saadi: "تيسير الكريم الرحمن (عبد الرحمن بن ناصر السعدي)", ibnkathir: "تفسير القرآن العظيم (الحافظ ابن كثير) — موسّع بالآثار" },
    lead: { muyassar: "التفسير الميسر", saadi: "تفسير السعدي", ibnkathir: "تفسير ابن كثير" },
  },
};
const toAr = (n) => String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)]);
const AR_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const arNorm = (t) => String(t).replace(AR_MARKS, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");

// ------------------------------------------------------------------ niyyət: təfsir sözü, kitab, hissə
const TAF_LAT = /^(?:tefsir|tafsir|tafseer|tafsiir|tafsirs?|tefsirler|tefsiri|tafsiri)\w*$/;
const TAF_RU = /^(?:тафсир|толкован)\w*$/i;
const TAF_AR = /^(?:تفسير|تفاسير|التفسير|والتفسير)$/;
const BOOK_MUY = /^m[uoy]{0,2}[yae]{1,2}s{1,2}[ae]r\w*$/;
const BOOK_SAADI = /^(?:sa+di|sedi|seedi|sa3di|saidi|saeedi|sa'?di)\w*$/;
const BOOK_KATHIR = /^(?:k[ae]s[iy]?r|k[ae]th[iy]?r|katir|kasyr)\w*$/;
const IBN = new Set(["ibn", "ibni", "ibnu", "ebn", "ibnul", "abn", "ибн"]);
const ARTICLE = new Set(["as", "es", "al", "el", "ul", "us", "ас", "аль", "ал", "əs", "əl"]);
const FILLER = new Set(["nedir", "nedi", "ne", "nece", "necedir", "izah", "izahi", "izahini", "et", "ele", "eyle", "ver", "mene", "bize", "goster", "yaz", "soyle", "danis", "aciqla", "haqqinda", "hakkinda", "about", "of", "the", "please", "give", "me", "show", "what", "is", "tell", "explain", "for", "and", "ve", "ile", "und", "ayetinin", "ayesinin", "kitabi", "kitab", "book", "by", "in", "from", "mi", "мне", "дай", "покажи", "объясни", "про", "о", "по"]);
const FILLER_AR = new Set(["لي", "اعطني", "اعطيني", "اعرض", "اكتب", "ما", "هو", "هي", "ماهو", "ماهي", "عن", "من", "في", "لل", "ل", "فضلك", "رجاء", "لو", "سمحت", "ارجو", "اريد", "ابغي", "ابي", "اود", "هات", "ارني", "اشرح", "وضح", "بين", "المعني", "معني", "كلام", "الله", "تعالي", "عز", "وجل", "لماذا", "كيف", "ماذا", "هل", "يا", "اخي", "الكريم", "القران", "قران", "القرآن", "قرآن"]);

/** @returns {null | {book:string|null, hasTafsir:boolean, stripped:string, part:number, lang:string}} */
export function parseTafsirQuery(message) {
  // gizli idarə simvolları (RLM/LRM/ZWNJ...) silinir; ərəb durğu işarələri (، ؛ ؟) boşluğa çevrilir; «تفسيرالبقرة» kimi yapışıq yazı ayrılır
  const raw0 = digitsAscii(String(message || ""))
    .normalize("NFC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/[\u060c\u061b\u061e\u061f\u066a-\u066d\u06d4]/g, " ")
    .replace(/(^|\s)((?:ال)?تفسير)(?=\p{Script=Arabic})/gu, "$1$2 ");
  if (!raw0.trim() || raw0.length > 200) return null;
  // «hissə 2», «part 2», «2-ci hissə», «الجزء 2»: təfsir mətninin hissə nömrəsi (ayə nömrəsi sayılmasın)
  let part = 1;
  let raw = raw0;
  const partWords = "hiss[əeé]\\w*|part|bölüm|bolum|kısım|kisim|часть|части|الجزء|جزء|القسم|قسم";
  raw = raw.replace(new RegExp(`(?:${partWords})\\s*[:#№-]?\\s*(\\d{1,4})(?!\\s*[:：]\\d)`, "giu"), (m, n) => ((part = Number(n)), " "));
  raw = raw.replace(new RegExp(`(\\d{1,4})\\s*(?:-?\\s*(?:ci|cü|cı|cu|inci|nci|ncu|uncu|й|-й))?\\s*(?:${partWords})(?![\\p{L}])`, "giu"), (m, n) => ((part = Number(n)), " "));
  if (part < 1 || part > 9999) part = 1;

  const re = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+|[\p{L}\p{M}'’‘ʻʼʿ`´]+|\d+/gu;
  const toks = [...raw.matchAll(re)].map((m) => ({ raw: m[0], idx: m.index, end: m.index + m[0].length, ar: /[\u0600-\u06FF\u0750-\u077F]/.test(m[0]) }));
  for (const t of toks) t.f = t.ar ? arNorm(t.raw) : foldLat(t.raw);
  let hasTafsir = false;
  let book = null;
  const drop = new Set();
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/^\d+$/.test(t.raw)) continue;
    if (t.ar ? TAF_AR.test(t.f) : TAF_LAT.test(t.f) || TAF_RU.test(t.raw)) {
      hasTafsir = true;
      drop.add(i);
      continue;
    }
    let found = null;
    let span = [i];
    if (t.ar) {
      const nxt = toks[i + 1];
      if (/^(?:ابن|بن)$/.test(t.f) && nxt && /^كثير$/.test(nxt.f)) (found = "ibnkathir"), (span = [i, i + 1]);
      else if (/^(?:ال)?ميسر$/.test(t.f)) found = "muyassar";
      else if (/^(?:ال)?سعدي$/.test(t.f)) found = "saadi";
    } else if (IBN.has(t.f) && toks[i + 1] && !toks[i + 1].ar && BOOK_KATHIR.test(toks[i + 1].f)) (found = "ibnkathir"), (span = [i, i + 1]);
    else if (BOOK_KATHIR.test(t.f) && !/^(?:kesirli|kesim)/.test(t.f)) found = "ibnkathir";
    else if (BOOK_MUY.test(t.f)) found = "muyassar";
    else if (BOOK_SAADI.test(t.f)) found = "saadi";
    if (found) {
      if (!book) book = found;
      for (const k of span) drop.add(k);
      // əvvəlki tərif (as-/əs-/ас-)
      const p = toks[i - 1];
      if (p && !p.ar && ARTICLE.has(p.f) && drop.size) drop.add(i - 1);
    }
  }
  // «شرح البقرة 17» / «معنى الآية 17 من سورة البقرة»: ayə nömrəsi/«آية» sözü varsa təfsir sorğusudur («سورة الشرح» surə adıdır — toxunulmur)
  if (!hasTafsir) {
    const hasRef = toks.some((t) => /^\d+$/.test(t.raw) || (t.ar && /^(?:ال)?(?:ايه|ايات)$/.test(t.f)));
    if (hasRef) {
      toks.forEach((t, i) => {
        if (t.ar && /^(?:شرح|معني|معاني|تاويل|تفصيل)$/.test(t.f) && !(toks[i - 1] && /^سوره$/.test(toks[i - 1].f))) {
          hasTafsir = true;
          drop.add(i);
        }
      });
    }
  }
  if (!hasTafsir) return null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/^\d+$/.test(t.raw)) continue;
    if (t.ar ? FILLER_AR.has(t.f) : FILLER.has(t.f)) drop.add(i);
  }
  let out = "";
  let last = 0;
  toks.forEach((t, i) => {
    if (!drop.has(i)) return;
    out += raw.slice(last, t.idx) + " ";
    last = t.end;
  });
  out += raw.slice(last);
  return { book, hasTafsir, stripped: out.replace(/\s+/g, " ").replace(/^[\s\-–—]+|[\s\-–—]+$/g, ""), part, lang: detectLang(raw0) };
}

// ------------------------------------------------------------------ məlumat və səhifələmə
const CACHE = new Map();
async function loadSura(book, s) {
  const key = book + s;
  if (!CACHE.has(key)) {
    if (CACHE.size > 6) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key, LOADERS[book][s - 1]().then((m) => m.default));
  }
  return CACHE.get(key);
}
/** Seqmentlər: [{from, to, text, intro?}] — sorğu aralığına [a1,a2] düşənlər, sıra ilə */
export async function segments(book, s, a1, a2, whole = false) {
  const data = await loadSura(book, s);
  const out = [];
  if (book === "saadi") {
    if (whole && a1 === 1 && data.i) out.push({ from: 0, to: 0, text: data.i, intro: true });
    // Sədi blokları ayə aralığıdır: blok ilk əhatə etdiyi ayədə bir dəfə verilir; heç bir blokun əhatə etmədiyi ayə «gap»dır
    const seen = new Set();
    for (let a = a1; a <= a2; a++) {
      const blk = data.b.find(([f, t]) => f <= a && a <= t);
      if (!blk) out.push({ from: a, to: a, text: "", gap: true });
      else if (!seen.has(blk)) {
        seen.add(blk);
        out.push({ from: blk[0], to: blk[1], text: blk[2] });
      }
    }
  } else {
    for (let a = a1; a <= a2; a++) out.push(data[a - 1] ? { from: a, to: a, text: data[a - 1] } : { from: a, to: a, text: "", gap: true });
  }
  return out;
}
// uzun mətni abzas/cümlə sərhədlərində ≤ cap hissələrə böl
export function chunkText(text, cap = 3500) {
  const out = [];
  for (const para of String(text).split(/\n+/)) {
    if (!para.trim()) continue;
    if (para.length <= cap) {
      out.push(para);
      continue;
    }
    let cur = "";
    for (const sent of para.split(/(?<=[.!؟?؛۔:\]])\s+/)) {
      if (sent.length > cap) {
        if (cur) (out.push(cur), (cur = ""));
        for (let i = 0; i < sent.length; ) {
          let end = Math.min(sent.length, i + cap);
          if (end < sent.length) {
            const sp = sent.lastIndexOf(" ", end);
            if (sp > i + cap * 0.5) end = sp;
          }
          out.push(sent.slice(i, end).trim());
          i = end;
        }
        continue;
      }
      if (cur && cur.length + 1 + sent.length > cap) (out.push(cur), (cur = ""));
      cur = cur ? cur + " " + sent : sent;
    }
    if (cur) out.push(cur);
  }
  return out;
}
// seqmentləri səhifələrə böl: səhifə = [{seg, text, first}]
export function paginate(segs, cap = 3500) {
  const pages = [];
  let page = [];
  let size = 0;
  const flush = () => {
    if (page.length) pages.push(page);
    page = [];
    size = 0;
  };
  for (const seg of segs) {
    if (seg.gap) {
      const segsOnPage = new Set(page.map((p) => p.seg)).size + 1;
      if (page.length && segsOnPage > MAX_SEGS) flush();
      page.push({ seg, text: "", first: true });
      continue;
    }
    const chunks = chunkText(seg.text, cap);
    chunks.forEach((c, ci) => {
      const newSeg = ci === 0;
      const segsOnPage = new Set(page.map((p) => p.seg)).size + (page.some((p) => p.seg === seg) ? 0 : 1);
      if (page.length && (size + c.length > cap || segsOnPage > MAX_SEGS)) flush();
      page.push({ seg, text: c, first: newSeg });
      size += c.length;
    });
  }
  flush();
  return pages;
}

// «17-ci ayə Bəqərə», «الآية 17 من سورة البقرة» kimi sıralar: ayə nömrəsini sona keçir («Bəqərə 17»)
export function numberLast(t) {
  const s = String(t);
  if (/\d\s*[:：]\s*\d/.test(s)) return s;
  const m = s.match(/(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?(?![\d:])/);
  if (!m) return s;
  const rest = (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length).replace(/^\s*[-.]?\s*(?:ci|cü|cı|cu|inci|nci|ncu|uncu|th|st|nd|rd|й|ый|ий|-?го)(?![\p{L}])/iu, "")).replace(/\s+/g, " ").trim();
  return `${rest} ${m[1]}${m[2] ? "-" + m[2] : ""}`.trim();
}
/** Ayə/surə istinadını tap. Təfsir sözü güclü siqnaldır: ad tək tanınmasa «surah» işarəsi və nömrə sırası dəyişdirilmiş variantlar da yoxlanılır («Nur 35», «tafsir Nisa 1»). */
export function resolveRef(stripped) {
  const nl = numberLast(stripped);
  const wantsAyah = /\d/.test(stripped) && !/\d\s*[:：]\s*\d/.test(stripped);
  let fallback = null;
  for (const c of [stripped, "surah " + stripped, nl, "surah " + nl]) {
    const r = ayahLookup(c + " yaz");
    if (!r) continue;
    // nömrə yazılıbsa, nömrəni ayə kimi oxuyan nəticə üstünlük alır («الآية 4 سورة الفاتحة» surə 4/bütün surə kimi oxunmasın)
    if (!wantsAyah || r.reps.every((x) => !x.whole)) return r;
    fallback = fallback || r;
  }
  return fallback;
}

// ------------------------------------------------------------------ cavabın qurulması
function bookQuery(lang, book, s, a1, a2) {
  const ref = a2 && a2 !== a1 ? `${s}:${a1}-${a2}` : `${s}:${a1}`;
  return lang === "ar" ? `${LABEL.ar[book]} ${ref}` : `${T[lang].lead[book]} ${ref}`;
}
function srcLine(lang, book) {
  const l = SRC[lang].source;
  const body = SRC.az[book];
  return `::src:: ${l}: ${body}`;
}
function verseTag(seg) {
  if (seg.intro) return "";
  return seg.from === seg.to ? `(${seg.from})` : `(${seg.from}–${seg.to})`;
}
function infoReply(lang, book) {
  const t = T[lang];
  const ex = (b) => `«${bookQuery(lang, b, 2, 255, 255).replace("2:255", "2:255")}»`;
  const lines = [t.intro];
  const list = book ? [book] : BOOKS;
  for (const b of list) lines.push(`• ${LABEL[lang][b]} — ${t.desc[b]}`);
  lines.push(t.ask(list.map(ex).join(", ")));
  lines.push("::note:: " + t.nofree);
  return lines.join("\n");
}


// ------------------------------------------------------------------ təfsir təklifi (təfsir istənilmədən ayə/surə cavabından sonra)
const CHIP = {
  az: { muyassar: "Müyəssər", saadi: "Sədi", ibnkathir: "İbn Kəsir" },
  tr: { muyassar: "Müyesser", saadi: "Sa‘dî", ibnkathir: "İbn Kesîr" },
  en: { muyassar: "Muyassar", saadi: "As-Sa'di", ibnkathir: "Ibn Kathir" },
  ru: { muyassar: "Муяссар", saadi: "Ас-Саади", ibnkathir: "Ибн Касир" },
  ar: { muyassar: "الميسر", saadi: "السعدي", ibnkathir: "ابن كثير" },
};
const SUG_LEAD = {
  az: { one: "Bu ayənin təfsiri (ərəbcə):", many: "Bu ayələrin təfsiri (ərəbcə):", first: "Bu surənin ilk ayələrinin təfsiri (ərəbcə):" },
  tr: { one: "Bu âyetin tefsiri (Arapça):", many: "Bu âyetlerin tefsiri (Arapça):", first: "Bu surenin ilk âyetlerinin tefsiri (Arapça):" },
  en: { one: "Tafsir of this verse (Arabic):", many: "Tafsir of these verses (Arabic):", first: "Tafsir of the first verses of this surah (Arabic):" },
  ru: { one: "Тафсир этого аята (на арабском):", many: "Тафсир этих аятов (на арабском):", first: "Тафсир первых аятов этой суры (на арабском):" },
  ar: { one: "تفسير هذه الآية:", many: "تفسير هذه الآيات:", first: "تفسير الآيات الأولى من هذه السورة:" },
};
export const SUG_MAX = MAX_SEGS; // təklif olunan sorğu bir səhifəyə sığan ayə sayını əhatə edir
function sugName(lang, s) {
  if (lang === "ar") return SURA_NAMES_AR[s - 1];
  const n = SURAS[s - 1];
  return lang === "tr" ? n.tr : lang === "en" ? n.en : lang === "ru" ? n.ru : n.az;
}
/** Hazır sorğu mətni: «Müyəssər təfsiri Mülk 1-8». Ad tanınmazsa rəqəmli forma («… 67:1-8») işləyir. */
export function suggestQuery(lang, book, s, lo, hi) {
  const range = hi > lo ? `${lo}-${hi}` : `${lo}`;
  const lead = lang === "ar" ? LABEL.ar[book] : T[lang].lead[book];
  const named = `${lead} ${sugName(lang, s)} ${range}`;
  const p = parseTafsirQuery(named);
  const r = p && p.book === book && p.stripped ? resolveRef(p.stripped) : null;
  if (r && r.reps.length === 1 && r.reps[0].s === s && r.reps[0].a1 === lo && r.reps[0].a2 === hi && !r.reps[0].bad) return named;
  return `${lead} ${s}:${range}`;
}
/** Ayə/surə cavabının sonuna ::sug:: bloku əlavə edir (təfsir cavablarına və ayə bloku olmayanlara yox). */
export function withTafsirSuggest(reply, message, forceLang) {
  const text = String(reply || "");
  if (/^::sug::\n::sl::/m.test(text) || /^::tafsir /m.test(text)) return text; // «Davamı» düyməsi (::sl:: yoxdur) təfsir təkliflərinə mane olmur
  const m = text.match(/^::ayah (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?::$/m);
  if (!m) return text;
  const s = Number(m[1]);
  const a1 = Number(m[2]);
  const a2 = m[3] ? Number(m[3]) : a1;
  if (s < 1 || s > 114 || a1 < 1 || a2 < a1 || a2 > AYAH_COUNT[s - 1]) return text;
  const lang = forceLang || detectLang(message);
  const hi = Math.min(a2, a1 + SUG_MAX - 1);
  const kind = hi < a2 ? "first" : hi > a1 ? "many" : "one";
  const lines = ["::sug::", `::sl:: ${SUG_LEAD[lang][kind]}`];
  for (const b of BOOKS) lines.push(`::sb:: ${CHIP[lang][b]} | ${suggestQuery(lang, b, s, a1, hi)}`);
  lines.push("::/sug::");
  // gizli kontekst: sonuncu göstərilən ayə (növbəti ayə üçün); UI və AI tarixçəsi onu göstərmir/göndərmir
  const hdrs = [...text.matchAll(/^::ayah (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?::$/gm)];
  const lh = hdrs[hdrs.length - 1];
  const ctx = `::ctx:: ${lh[1]}:${lh[2]}-${lh[3] || lh[2]} - 1/1 ${lang}`;
  return text.replace(/\s+$/, "") + "\n\n" + ctx + "\n\n" + lines.join("\n");
}

/** @returns {Promise<string|null>} */
export async function tafsirReply(message, forceLang) {
  if (namesFatawaBook(message)) return null; // «Məcmuu əl-Fətava» adı surə adına (Fatihə) bənzədilməsin
  const q = parseTafsirQuery(message);
  if (!q) return null;
  const lang = forceLang && T[forceLang] ? forceLang : q.lang;
  const look = q.stripped ? resolveRef(q.stripped) : null;
  if (!look) {
    // Ayə/surə tapılmadı: kitab adı yazılıbsa (və ya yalnız «təfsir») kitabları göstər; «təfsir elmi nədir» kimi ümumi suallar başqasına qalır
    const rest = q.stripped.replace(/[^\p{L}\p{M}\d]/gu, "");
    return q.book || !rest ? infoReply(lang, q.book) : null;
  }
  if (look.reps.some((r) => r.bad)) return ayahReply(q.stripped + " yaz") || ayahReply("surah " + q.stripped + " yaz") || ayahReply(numberLast(q.stripped) + " yaz");
  const book = q.book || "muyassar";
  const L = LABEL[lang] || LABEL.az;
  const tt = T[lang] || T.az;
  const out = [];
  let ctxInfo = null;
  // yalnız ilk istinad üçün tam səhifə; çoxlu istinadda (Muavvizeteyn) hər biri üçün birinci səhifə
  const multiRef = look.reps.length > 1;
  for (const rep of look.reps) {
    const { s } = rep;
    let { a1, a2 } = rep;
    const segs = await segments(book, s, a1, a2, rep.whole);
    if (!segs.length) {
      out.push(tt.none(`${s}:${a1}${a2 !== a1 ? "–" + a2 : ""}`));
      continue;
    }
    const pages = paginate(segs, PAGE_CHARS[book]);
    const total = pages.length;
    const pno = multiRef ? 1 : Math.min(Math.max(1, q.part), total);
    const page = pages[pno - 1];
    if (!multiRef) ctxInfo = { s, a1, a2, pno, total };
    // Növbələşmə: hər ayə (və ya Sədi bloku) üçün əvvəl ayə bloku, sonra onun təfsiri; bir səhifədə ən çox MAX_SEGS bölmə
    const label = L[book] + (total > 1 ? ` — ${tt.part} ${lang === "ar" ? toAr(pno) + "/" + toAr(total) : pno + "/" + total}` : "");
    const groups = [];
    for (const piece of page) {
      const g = groups[groups.length - 1];
      if (g && g.seg === piece.seg) g.pieces.push(piece);
      else groups.push({ seg: piece.seg, pieces: [piece] });
    }
    groups.forEach((g, gi) => {
      const { seg } = g;
      const lo = Math.max(a1, seg.from);
      const hi = Math.min(a2, seg.to);
      if (seg.gap) {
        out.push(buildBlock({ s, a1: seg.from, a2: seg.from, lang }));
        out.push("::note:: " + tt.none(`${s}:${seg.from}`));
        return;
      }
      if (!seg.intro && g.pieces[0].first) out.push(buildBlock({ s, a1: lo, a2: Math.min(hi, lo + MAX_AYAH_SHOWN - 1), lang }));
      const tag = verseTag(seg);
      const showTag = tag && (seg.from !== seg.to || !g.pieces[0].first);
      const body = g.pieces.map((p) => p.text);
      const last = gi === groups.length - 1;
      out.push([`::tafsir ${book}::`, `::tl:: ${gi === 0 ? label : L[book]}`, ...(showTag ? [`::tv:: ${tag}`] : []), ...body, ...(last ? [srcLine(lang, book)] : []), "::/tafsir::"].join("\n"));
    });
    if (total > pno) {
      const lo = a1;
      out.push(tt.more(`${bookQuery(lang, book, s, lo, a2)} ${tt.part} ${lang === "ar" ? toAr(pno + 1) : pno + 1}`));
    }
  }
  const others = BOOKS.filter((b) => b !== book);
  out.push("::note:: " + tt.nofree);
  if (ctxInfo) out.push(`::ctx:: ${ctxInfo.s}:${ctxInfo.a1}-${ctxInfo.a2} ${book} ${ctxInfo.pno}/${ctxInfo.total} ${lang}`); // gizli: «növbəti ayə» üçün (UI və AI tarixçəsində göstərilmir)
  // Digər təfsirlər: klikləmə düymələri (::sug::); düymə eyni ayə/aralıq üçün həmin təfsirin birinci hissəsini sorğulayır (AI-siz, mənbə kitabdır).
  // Sıra BOOKS sırasıdır (Müyəssər, Sədi, İbn Kəsir): heç bir təfsirə üstünlük verilmir.
  const chipRef = (b) => (multiRef || !ctxInfo ? `${tt.lead[b] && lang !== "ar" ? tt.lead[b] : LABEL.ar[b]} ${q.stripped}`.replace(/\s+/g, " ").trim() : bookQuery(lang, b, ctxInfo.s, ctxInfo.a1, ctxInfo.a2));
  const sugLines = ["::sug::", `::sl:: ${tt.others("").replace(/\s*\.$/, "")}`];
  for (const b of others) sugLines.push(`::sb:: ${L[b]} | ${chipRef(b)}`);
  sugLines.push("::/sug::");
  out.push(sugLines.join("\n"));
  return out.join("\n\n").replace(/\n\n(::sug::|::ctx::)/g, "\n$1");
}
/** «Davam» üçün hazır sorğu: hissə qalıbsa eyni təfsirin növbəti hissəsi, yoxsa eyni kitabla növbəti ayə. */
export function continuationQuery(lang, book, s, a1, a2, pno, total) {
  if (pno < total) return `${bookQuery(lang, book, s, a1, a2)} ${T[lang].part} ${lang === "ar" ? toAr(pno + 1) : pno + 1}`;
  return null;
}
export { AYAH_COUNT, bookQuery };
