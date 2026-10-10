// Ərəb qrammatikası (nəhv/sərf): AI-yə getmədən, yalnız Şamilədən yüklənmiş 74 kitabdan sözbəsöz çıxarış.
//   Məlumat: api/_nahw/index.js (axtarış indeksi) və api/_nahw/books/b<id>.js (kitab mətni, tənbəl yüklənir). Quraşdırma: node scripts/build-nahw.mjs.
//   Sıralama: BM25 (başlıq + mətn) + ifadə yaxınlığı + müəllif əmsalı (api/_nahw/config.js). Süzgəc: api/_nahw/guard.js (sələfə zidd təvil göstərilmir).
// Cavab mətni kitabdan sözbəsöz kəsilir (~1200 simvol), altında kitab/müəllif/cild/səhifə. Azərbaycanca çərçivə qısa və ümumidir.
import { brotliDecompressSync } from "node:zlib";
import { key } from "./_lugha.js";
import { detectLang } from "./_ayah.js";
import { tokens, tokenSpans, stemTok } from "./_nahw/tok.js";
import { PHRASES, UNIQUE_SINGLE, AMBIG_SINGLE, PARTICLES, PARTICLE_EXPAND, LAT_TERMS, LAT_CUE } from "./_nahw/terms.js";
import { AUTHOR_BOOST, DIDACTIC, DIDACTIC_BOOST, ADVANCED_RE, MAX_RESULTS, EXCERPT_CHARS, MIN_COVERAGE } from "./_nahw/config.js";
import { LOADERS } from "./_nahw/loaders.js";
import { checkExcerpt, isLanQuery, gkey } from "./_nahw/guard.js";
import { sentenceStart, sentenceEnd } from "./_excerpt.js";

const AR_LETTER = /[\u0621-\u064A\u0671-\u06D3]/;
const MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u0610-\u061A\u200c-\u200f]/g;
const PREFILTER = 60; // BM25-dən sonra mətni yüklənib yenidən sıralanan səhifə sayı

// ---------------------------------------------------------------- indeks (tənbəl)
let _idx = null;
function readVarint(buf, pos) {
  let n = 0;
  let mul = 1;
  let b;
  do {
    b = buf[pos.p++];
    n += (b & 127) * mul;
    mul *= 128;
  } while (b & 128);
  return n;
}
async function loadIndex() {
  if (!_idx) {
    _idx = import("./_nahw/index.js").then((m) => {
      const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
      const hl = blob.readUInt32LE(0);
      const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
      const dlOff = 4 + hl;
      const dl = new Uint16Array(head.N);
      for (let i = 0; i < head.N; i++) dl[i] = blob.readUInt16LE(dlOff + i * 2);
      const toks = head.tokens.split("\n");
      const map = new Map();
      const pos = { p: dlOff + head.N * 2 };
      for (let i = 0; i < toks.length; i++) {
        const len = readVarint(blob, pos);
        map.set(toks[i], pos.p);
        pos.p += len;
      }
      let sum = 0;
      for (let i = 0; i < head.N; i++) sum += dl[i];
      return { N: head.N, books: head.books, dl, avgdl: sum / head.N, map, blob };
    });
  }
  return _idx;
}
export const __loadIndex = loadIndex;

/** Tokenin postinqləri: {bdf, pages:Int32Array, tf:Uint8Array, title:Uint8Array} və ya null */
function postings(idx, tok) {
  const off = idx.map.get(tok);
  if (off == null) return null;
  const pos = { p: off };
  const bdf = readVarint(idx.blob, pos);
  const n = readVarint(idx.blob, pos);
  const pages = new Int32Array(n);
  const tf = new Uint8Array(n);
  const title = new Uint8Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    prev += readVarint(idx.blob, pos);
    pages[i] = prev;
    const c = readVarint(idx.blob, pos);
    tf[i] = c >> 1;
    title[i] = c & 1;
  }
  return { bdf, pages, tf, title };
}

// ---------------------------------------------------------------- kitablar (tənbəl)
const _books = new Map();
async function loadBook(id) {
  if (!_books.has(id)) {
    _books.set(
      id,
      LOADERS[id]().then((m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"))),
    );
  }
  return _books.get(id);
}
function locate(idx, g) {
  // g -> {book, local}
  let lo = 0;
  let hi = idx.books.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (idx.books[mid].start <= g) lo = mid;
    else hi = mid - 1;
  }
  return { bi: lo, local: g - idx.books[lo].start };
}

// ---------------------------------------------------------------- sorğunun aşkarlanması
const QURAN_AR = /آي[ةه]|ايه|ايات|آيات|سور[ةه]|قرآن|القرآن|قران|تفسير|تفاسير|﴿|﴾|\d\s*[:：]\s*\d/;
const QURAN_LAT = /\b(ay[eə]t?\w*|ayah|ayat|sur[eə]\w*|surah|quran\w*|qur'?an|kur'?an\w*|koran|tef?sir\w*|tafsir\w*|verse|verses|bəqərə|beqere|bakara|hadis\w*|hədis\w*|hadith)\b/i;
const QURAN_RU = /аят|сура|коран|тафсир|хадис/i;
const STRONG_AR = /(?:^|\s)(?:ال)?(?:اعراب|اعرب|اعربوا)(?:\s|$|ه|ها)|(?:علم\s+|قواعد\s+|في\s+|ال)نحو(?:ي|يه)?(?:\s|$)|النحو|النحويين|النحاه|الصرف|التصريف|علم\s+الصرف|ميزان\s+صرفي|قواعد\s+(?:اللغه\s+)?العربيه|الاجروميه|الفيه\s+ابن\s+مالك|قطر\s+الندي/;
const FRAME_AR = /^(?:ما|ماذا|ماهو|ماهي|هل|كيف|لماذا|لم|متي|اين|اشرح|شرح|عرف|تعريف|اذكر|بين|وضح|اريد|اعطني|ما\s+هو|ما\s+هي|ما\s+حكم|ما\s+الفرق|الفرق|انواع|اقسام|علامات|شروط|امثله|مثال|حكم|اعراب)(?:\s|$)/;
const PARTICLE_CUE = /معني|تفيد|تعني|عمل|اعراب|دلاله|وظيفه|ماذا\s+(?:تفيد|تعني)|في\s+النحو|استعمال|حكم/;
const STOP_RAW = (["ما", "ماذا", "هو", "هي", "هل", "كيف", "لماذا", "متي", "اين", "في", "من", "عن", "على", "الي", "الى", "لي", "لنا", "اشرح", "شرح", "عرف", "تعريف", "اذكر", "بين", "وضح", "معني", "تعني", "تفيد", "نحو", "النحو", "نحوي", "اريد", "اعطني", "ارجو", "لو", "سمحت", "فضلا", "هذا", "هذه", "ذلك", "يا", "اخي", "عند", "بعض", "كلمه", "كلمة", "حرف", "بالتفصيل", "باختصار", "مع", "امثله", "مثال", "الاعراب", "اعراب", "ماهو", "ماهي", "ونحو", "قواعد", "علم", "حكم", "احكام", "انواع", "اقسام", "علامات", "علامه", "شروط", "الفرق", "الفرق", "تعريفه", "مفهوم", "يعرب", "تعرب", "اعرابه", "اعرابها", "العربيه", "العربية", "عربي", "اللغه", "اللغة", "ب", "او", "و", "إعراب", "الإعراب", "أعرب", "اعرب"]);
const STOP_Q = new Set(STOP_RAW.flatMap((x) => [x, stemTok(key(x)), key(x).replace(/ء/g, "ا"), stemTok(key(x).replace(/ء/g, "ا"))]));

// «نحو nədir», «sərf nədir» kimi ümumi suallar üçün axtarış sözləri (tərif səhifələri)
const GENERIC_NAHW = "نحو قصد اصطلاحا";
const GENERIC_SARF = "التصريف بنية الكلمة";

const fold = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "");

const PH = PHRASES.map((p) => ({ p, toks: tokens(p) }));
const UNI = new Set(UNIQUE_SINGLE.flatMap((x) => tokens(x)));
const AMB = new Set(AMBIG_SINGLE.flatMap((x) => tokens(x)));
const PARTS = new Map(PARTICLES.map((p) => [key(p).replace(/ء/g, "ا"), p]));

function seqIndex(hay, needle) {
  if (!needle.length) return -1;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}
const hasSeq = (hay, needle) => seqIndex(hay, needle) >= 0;

/** Mesaj -> {terms:[token], lang, lan, particle} yoxsa null. Qrammatika sualı deyilsə null. */
export function parseNahwQuery(message) {
  const raw = String(message || "").replace(MARKS, " ").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 200) return null;
  if (QURAN_AR.test(raw) || QURAN_LAT.test(raw) || QURAN_RU.test(raw)) return null;
  // salamlaşma: «كيف الحال»، «كيف حالك» qrammatika sualı deyil
  if (/^\s*(?:كيف|كيفك|شو|ما)\s+(?:ال)?حال(?:ك|كم|ه)?\s*[؟?!.]*\s*$/.test(raw.replace(/[أإآ]/g, "ا"))) return null;
  const arN = (raw.match(/[\u0621-\u064A]/g) || []).length;
  const latN = (raw.match(/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/g) || []).length + (raw.match(/[\u0400-\u04FF]/g) || []).length;
  const lang = detectLang(message);
  let terms = null;
  let particle = null;
  let lan = false;

  if (arN > 0 && arN >= latN) {
    const g = gkey(raw);
    const gt = g.split(/[^\u0621-\u064A]+/).filter(Boolean);
    if (gt.length > 14) return null;
    const stems = tokens(raw);
    const frame = FRAME_AR.test(g);
    const strong = STRONG_AR.test(g);
    const phrase = PH.some((x) => hasSeq(stems, x.toks));
    const unique = stems.some((t) => UNI.has(t));
    // hərf sualı: «ما معنى لن في النحو»، «لن ماذا تفيد»
    const nonStop = gt.filter((t) => !STOP_Q.has(t));
    const parts = nonStop.filter((t) => PARTS.has(t));
    const partCue = PARTICLE_CUE.test(g);
    const partQ = parts.length > 0 && partCue && nonStop.length <= 4 && nonStop.every((t) => PARTS.has(t) || PARTICLE_CUE.test(t) || /^(?:تفيد|تعني|معني|عمل|اعراب|دلاله)$/.test(t) || STRONG_AR.test(t));
    const contentN = stems.filter((t) => !STOP_Q.has(t)).length;
    const ok = strong || phrase || (unique && contentN <= 1) || partQ;
    if (!ok) return null;
    // sərf: tək «صرف» kimi fərqli mənalı söz yalnız «الصرف»/«علم» ilə qəbul olunur (STRONG_AR)
    if (partQ && parts.length) particle = PARTS.get(parts[0]);
    lan = partQ ? parts.includes("لن") : isLanQuery(raw) && (partCue || strong || frame);
    terms = stems.filter((t) => !STOP_Q.has(t));
    if (!terms.length) terms = stems.filter((t) => !STOP_Q.has(t) || /عراب/.test(t));
    if (!terms.length) terms = /صرف|تصريف/.test(g) ? tokens(GENERIC_SARF) : /نحو/.test(g) ? tokens(GENERIC_NAHW) : [];
    if (particle) {
      const exp = PARTICLE_EXPAND[particle] || [];
      terms = [...new Set([...terms.filter((t) => !PARTS.has(t) || t === key(particle).replace(/ء/g, "ا")), ...exp.flatMap((x) => tokens(x))])];
    }
  } else {
    // --- latın/kiril yazılı sual
    const f = fold(raw);
    const cue = LAT_CUE.test(f) || LAT_CUE.test(raw);
    const hits = LAT_TERMS.filter((x) => x.re.test(f));
    const arRuns = gkey(raw).match(/[\u0621-\u064A]+/g) || [];
    const latLan = /(?:^|\s)(?:ərəbcə|erebce|arapça|arapca|ərəb\s+dilində)\s+l[eə]n(?:\s|$|[?.!])|\bl[eə]n\s+h[eə]rfi?\b/i.test(raw);
    if (latLan) {
      terms = [];
    } else if (cue && arRuns.length === 1 && PARTS.has(arRuns[0]) && !hits.length) {
      // «Ərəb dilində لن nə bildirir nəhv»: latın sual + tək ərəb hərfi
      particle = PARTS.get(arRuns[0]);
      lan = arRuns[0] === "لن";
      terms = [key(particle).replace(/ء/g, "ا"), ...(PARTICLE_EXPAND[particle] || []).flatMap((x) => tokens(x))];
    } else if (!hits.length) {
      // «ərəb qrammatikası», «nəhv nədir»: ümumi sual
      const gen = /nehv|nahv|nahiv|nahw|нахв/.test(f) ? GENERIC_NAHW : /sarf|serf|tasrif|сарф/.test(f) ? GENERIC_SARF : /qram+at|gram+at|grammar|dilbilgisi|грамматик/.test(f) && /arab|erab|ereb|араб/.test(f) ? GENERIC_NAHW : null;
      if (!gen || !cue) return null;
      terms = tokens(gen);
    } else {
      const uniq = hits.some((h) => h.uniq);
      if (!uniq && !cue) return null;
      const arq = hits.slice(0, 3).map((h) => h.ar).join(" ");
      terms = tokens(arq);
      if (/(?:^|\s)لن(?:\s|$)/.test(arq)) lan = true;
    }
    // Latın yazılışda «lan/len» hərfi: «ərəbcə lən nədir»
    if (latLan) {
      terms = tokens("لن النفي الاستقبال تأبيد");
      lan = true;
      particle = "لن";
    }
  }
  terms = [...new Set(terms)].filter((t) => t.length > 1);
  if (!terms.length) return null;
  return { terms, lang, lan, particle, advanced: ADVANCED_RE.test(raw), query: raw };
}

// ---------------------------------------------------------------- axtarış və sıralama
const TITLE_STOP = new Set(["باب", "فصل", "ذكر", "مسالة", "مسءله", "بيان", "الكلام", "على", "في", "من", "ما", "ءن"]);
const K1 = 1.2;
const B = 0.75;
const TITLE_W = 2.2;

function idfOf(N, df) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

async function searchPages(q) {
  const idx = await loadIndex();
  const score = new Map(); // g -> {s, hit:Set}
  const used = [];
  for (const t of q.terms) {
    let p = postings(idx, t);
    let tk = t;
    if (!p && /^[وفبلك]/.test(t) && t.length >= 4) {
      p = postings(idx, t.slice(1));
      tk = t.slice(1);
    }
    if (!p) continue;
    used.push(tk);
    const idf = idfOf(idx.N, Math.max(p.bdf, 1));
    // başlıq idf-i: başlıq postinqlərinin sayı
    let tdf = 0;
    for (let i = 0; i < p.pages.length; i++) tdf += p.title[i];
    const tidf = idfOf(idx.N, Math.max(tdf, 1));
    for (let i = 0; i < p.pages.length; i++) {
      const g = p.pages[i];
      let s = 0;
      if (p.tf[i]) {
        const dl = idx.dl[g] || 1;
        const tf = p.tf[i];
        s += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / idx.avgdl)));
      }
      if (p.title[i]) s += TITLE_W * tidf;
      let e = score.get(g);
      if (!e) score.set(g, (e = { g, s: 0, hit: new Set() }));
      e.s += s;
      e.hit.add(tk);
    }
  }
  return { idx, score, used };
}

/** Səhifə mətnində pəncərə seçir: sorğu sözlərinin ən sıx olduğu ~EXCERPT_CHARS aralıq. */
export function bestWindow(text, termSet, maxChars = EXCERPT_CHARS, anchor = null) {
  const spans = tokenSpans(text);
  if (!text) return { text: "", start: 0, end: 0, density: 0 };
  if (anchor == null && text.length <= maxChars + 200) return { text: text.trim(), start: 0, end: text.length, density: 0, full: true };
  const hits = [];
  spans.forEach((s, i) => {
    if (termSet.has(s.t)) hits.push(i);
  });
  let best = { score: -1, a: 0 };
  let j = 0;
  for (let i = 0; i < hits.length; i++) {
    const startPos = spans[hits[i]].start;
    while (j < hits.length && spans[hits[j]].end - startPos <= maxChars * 0.8) j++;
    const distinct = new Set();
    for (let k = i; k < j; k++) distinct.add(spans[hits[k]].t);
    const sc = distinct.size * 4 + (j - i);
    if (sc > best.score) best = { score: sc, a: startPos };
  }
  let start = hits.length ? best.a : 0;
  if (anchor != null) start = anchor;
  // başlanğıc: uyğunluq yerini əhatə edən cümlənin/paraqrafın əvvəli (anchor = bölmə başlığı, olduğu kimi qalır)
  if (anchor == null) start = sentenceStart(text, start, 600);
  start = Math.max(0, start);
  let end = Math.min(text.length, start + maxChars);
  if (end < text.length) end = sentenceEnd(text, end, { minPos: start + Math.floor(maxChars * 0.6), maxFwd: 300 });
  let out = text.slice(start, end).trim();
  if (start > 0 && anchor == null) out = "... " + out;
  if (end < text.length) out = out + " ...";
  return { text: out, start, end, density: best.score };
}

const cleanTitle = (t) => String(t || "").replace(/\s+-\s+(?:ت|معها|ضمن|مع)\s.*$/, "").replace(/\s*=\s*.*$/, "").replace(/\s*-\s*ضمن\s.*$/, "").trim();
const cleanAuthor = (a) => String(a || "").replace(/\s*\(.*$/, "").trim();

function bookWeight(id, q) {
  let w = AUTHOR_BOOST[id] || 1;
  if (!q.advanced && DIDACTIC.has(id)) w *= DIDACTIC_BOOST;
  return w;
}

export async function searchNahw(q) {
  const { idx, score, used } = await searchPages(q);
  if (!used.length) return [];
  const need = Math.max(1, Math.ceil(q.terms.length * MIN_COVERAGE));
  const arr = [];
  for (const e of score.values()) {
    const { bi } = locate(idx, e.g);
    const cov = e.hit.size / Math.max(1, q.terms.length);
    arr.push({ ...e, bi, pre: e.s * Math.pow(cov, 1.5) * bookWeight(idx.books[bi].id, q) });
  }
  arr.sort((a, b) => b.pre - a.pre);
  const cands = arr.filter((e) => e.hit.size >= Math.min(need, used.length)).slice(0, PREFILTER);
  const termSet = new Set(used);
  const qSeq = used.length > 1 ? q.terms.filter((t) => termSet.has(t)) : q.terms;
  const out = [];
  // kitab mətnlərini yüklə (paralel)
  const ids = [...new Set(cands.map((c) => idx.books[c.bi].id))];
  await Promise.all(ids.map((id) => loadBook(id)));
  for (const c of cands) {
    const meta = idx.books[c.bi];
    const data = await loadBook(meta.id);
    const { local } = locate(idx, c.g);
    const pg = data.p[local];
    if (!pg) continue;
    const text = pg[3];
    const ts = tokenSpans(text);
    const seq = ts.map((s) => s.t);
    let boost = 1;
    let anchor = null;
    // ifadə (ardıcıl) uyğunluğu və yaxınlıq
    if (qSeq.length > 1) {
      if (hasSeq(seq, qSeq)) boost *= 2.2;
      else {
        // bütün terminlər 12 tokenlik pəncərədə
        const pos = [];
        seq.forEach((t, i) => {
          if (termSet.has(t)) pos.push(i);
        });
        let ok = false;
        for (let i = 0; i < pos.length && !ok; i++) {
          const win = new Set();
          for (let k = i; k < pos.length && pos[k] - pos[i] <= 12; k++) win.add(seq[pos[k]]);
          if (win.size >= used.length) ok = true;
        }
        if (ok) boost *= 1.5;
      }
    }
    // başlıq: bölmənin adı sorğunun özüdürsə (məs. «باب الفاعل») və bu bölmənin ilk səhifəsidirsə, güclü üstünlük
    {
      const tt = tokens(data.t[pg[2]] || "").filter((t) => !TITLE_STOP.has(t));
      const first = local === 0 || data.p[local - 1][2] !== pg[2];
      const exact = tt.length && tt.every((t) => termSet.has(t) || q.terms.includes(t));
      const contains = !exact && tt.length && used.every((t) => tt.includes(t));
      if (exact) boost *= first ? 8 : 2;
      else if (contains) boost *= first ? 3 : 1.5;
      if ((exact || contains) && first) {
        // bölmənin başlığı səhifədədirsə, çıxarış başlıqdan başlayır
        const full = tokens(data.t[pg[2]]);
        const stripped = full.filter((t, i) => !(i === 0 && (t === "باب" || t === "فصل")));
        // başlıq sətir əvvəlində olan yer üstündür (əvvəlki bölmənin mətnindəki təsadüfi söz yox)
        const findHeading = (needle) => {
          let first = -1;
          for (let from = 0; from < seq.length; ) {
            const rel = seqIndex(seq.slice(from), needle);
            if (rel < 0) break;
            const i = from + rel;
            if (first < 0) first = i;
            const before = text.slice(Math.max(0, ts[i].start - 6), ts[i].start);
            if (i === 0 || /(?:^|\n)[\s\[\](){}«»*#\d.\-–—]*$/.test(before)) return i;
            from = i + 1;
          }
          return first;
        };
        let at = findHeading(full);
        if (at < 0) at = findHeading(stripped);
        anchor = at > 0 && ts[at] ? ts[at].start : 0;
        while (anchor > 0 && "[({«\"'".includes(text[anchor - 1])) anchor--;
        // başlıq sətrinin əvvəlinə qayıt
        if (anchor > 0) {
          const nl = text.lastIndexOf("\n", anchor);
          anchor = nl >= 0 && anchor - nl < 80 ? nl + 1 : anchor;
        }
      }
    }
    // hərf sualı: hərfin özü səhifədə (tək söz kimi) olmalıdır
    if (q.particle) {
      const pk = key(q.particle).replace(/ء/g, "ا");
      const raws = key(text).replace(/ء/g, "ا").split(/[^\u0621-\u064A]+/);
      const cnt = raws.filter((t) => t === pk).length;
      if (!cnt) continue;
      boost *= 1 + Math.min(cnt, 12) * 0.12;
    }
    const win = bestWindow(text, termSet, EXCERPT_CHARS, anchor);
    if (q.particle) {
      // hərf adı pəncərədə olmalıdır
      const wk = gkey(win.text).split(/[^\u0621-\u064A]+/);
      if (!wk.includes(key(q.particle).replace(/ء/g, "ا"))) continue;
    }
    const chk = checkExcerpt(win.text);
    if (!chk.ok) continue;
    if (q.lan && chk.refutation) boost *= 3;
    // «لن» sualı: neytral olmayan, mövzuya aid pəncərə (nəfy/istiqbal sözü) tələb olunur
    if (q.lan) {
      const wk = gkey(win.text);
      if (!/(?:^|\s)لن(?:\s|$)/.test(wk) || !/(?:النفي|نفي|الاستقبال|ينصب|ينصبه|تنصب)/.test(wk)) continue;
    }
    out.push({
      book: meta,
      page: pg[0],
      part: pg[1],
      title: data.t[pg[2]] || "",
      text: win.text,
      full: !!win.full,
      score: c.pre * boost,
      refutation: chk.refutation,
    });
  }
  out.sort((a, b) => b.score - a.score);
  // eyni kitabdan təkrar yox (əvvəl müxtəlif kitablar), sonra boş yer qalsa eyni kitabdan
  const picked = [];
  const seenBooks = new Set();
  for (const r of out) {
    if (picked.length >= MAX_RESULTS) break;
    if (seenBooks.has(r.book.id)) continue;
    seenBooks.add(r.book.id);
    picked.push(r);
  }
  if (q.lan) {
    // رد olan çıxarış mütləq birinci
    picked.sort((a, b) => Number(b.refutation) - Number(a.refutation) || b.score - a.score);
  }
  return picked;
}

// ---------------------------------------------------------------- cavab
const T = {
  az: { lead: "Ərəb nəhv/sərf kitablarından sözbəsöz çıxarışlar (suala ən uyğun səhifələr):", note: "Çıxarışlar kitabdan olduğu kimi götürülüb; tam mətn göstərilən səhifələrdədir." },
  tr: { lead: "Arapça nahiv/sarf kitaplarından aynen alıntılar (soruya en uygun sayfalar):", note: "Alıntılar kitaptan olduğu gibi alınmıştır; tam metin belirtilen sayfalardadır." },
  en: { lead: "Verbatim excerpts from Arabic nahw/sarf books (the pages that best match the question):", note: "Excerpts are quoted verbatim; the full text is on the cited pages." },
  ru: { lead: "Дословные выдержки из книг по арабскому наху/сарфу (наиболее подходящие страницы):", note: "Выдержки приведены без изменений; полный текст — на указанных страницах." },
  ar: { lead: "مقتطفات حرفية من كتب النحو والصرف (أنسب الصفحات للسؤال):", note: "المقتطفات منقولة من الكتب كما هي؛ والنص الكامل في الصفحات المذكورة." },
};
function srcLine(r) {
  const vol = /^\d+$/.test(String(r.part)) ? `ج ${r.part}، ` : "";
  return `${cleanAuthor(r.book.author)}، ${cleanTitle(r.book.title)}، ${vol}ص ${r.page}`;
}
export function formatNahw(results, q) {
  const t = T[q.lang] || T.az;
  const out = [t.lead];
  for (const r of results) {
    out.push(["::tafsir nahw::", `::tl:: ${cleanAuthor(r.book.author)} — ${cleanTitle(r.book.title)}`, ...r.text.split("\n").filter((l) => l.trim()), `::src:: ${srcLine(r)}`, "::/tafsir::"].join("\n"));
  }
  if (results.some((r) => !r.full)) out.push("::note:: " + t.note);
  return out.join("\n");
}

/** Əsas giriş: qrammatika sualı üçün cavab, yoxsa null (adi davranış). AI çağırılmır. */
export async function nahwReply(message) {
  const q = parseNahwQuery(message);
  if (!q) return null;
  let res = await searchNahw(q);
  // ümumi «nəhv/sərf nədir» sualı: yalnız tərif səhifəsi (zəif uyğunluqlar göstərilmir)
  if (q.terms.join(" ") === tokens(GENERIC_NAHW).join(" ") || q.terms.join(" ") === tokens(GENERIC_SARF).join(" ")) res = res.filter((r) => r.score >= 20).slice(0, 2);
  if (!res.length) return null;
  return formatNahw(res, q);
}
