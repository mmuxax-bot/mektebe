// «Məcmuu əl-Fətava» (İbn Teymiyyə) axtarışı: AI-yə getmədən, yalnız Şamilə (7289, ط. مجمع الملك فهد) mətnindən sözbəsöz çıxarış.
//   Məlumat: api/_fatawa/index.js (lüğət + token-id ardıcıllığı + səhifə meta), api/_fatawa/books/f_<n>.js (səhifə mətni, tənbəl yüklənir). Quraşdırma: node scripts/build-fatawa.mjs.
//   Tetikleyicilər: «فتاوى ابن تيمية …», «مجموع الفتاوى …», «Məcmuu əl-Fətava …», «İbn Teymiyyə fətvası …», «ibn taymiyyah fatwa …»; cild/səhifə: «مجموع الفتاوى المجلد 3 صفحة 10», «Məcmuu əl-Fətava 3/10».
//   Sıralama: BM25 (hədis ilə eyni normallaşdırma), tam ifadə uyğunluğu birinci, sonra sözlər yaxın, sonra qalanı; başlıq sözləri azacıq üstünlük verir.
//   Cavab: səhifə mətninin uyğun hissəsi sözbəsöz (uzun olarsa «...» ilə kəsilir) + mənbə sətri. Heç bir tərcümə/xülasə/uydurma mətn yoxdur. Davam: «davam»/«daha çox» (::ctx:: fatawa … gizli sətir).
import { brotliDecompressSync } from "node:zlib";
import { detectLang, foldLat } from "./_ayah.js";
import { isLexicalQuestion } from "./_lugha.js";
import { norm, tokens, tokenSpans } from "./_hadith/tok.js";
import { topicAlts, matchTopics } from "./_fatawa/topicmatch.js";
import { LOADERS, SHARD } from "./_fatawa/loaders.js";
import { namesFatawaBook } from "./_fatawa-name.js";
import { sentenceStart, sentenceEnd } from "./_excerpt.js";

export const PAGE = 5; // bir mesajda göstərilən nəticə sayı
export const MAX_RANK = 500; // siyahıda saxlanan ən yaxşı nəticə sayı
const EXCERPT = 1100; // bu qədər simvoldan uzun səhifə mətni kəsilir
const FULL_MAX = 1400; // bundan qısa səhifə tam göstərilir
const PAGE_LOOKUP_MAX = 3800; // cild/səhifə sorğusunda maksimum uzunluq
const COMMON_DF = 0.08; // bu paydan çox səhifədə olan söz «ümumi» sayılır (əhatə şərtində sayılmır)
const WINDOW = 30;
const K1 = 1.2;
const B = 0.75;

// ---------------------------------------------------------------- indeks (tənbəl)
let _idx = null;
async function loadIndex() {
  if (!_idx) {
    _idx = import("./_fatawa/index.js").then((m) => {
      const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
      const hl = blob.readUInt32LE(0);
      const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
      const vocab = head.vocab.split("\n");
      const V = vocab.length;
      const vmap = new Map();
      for (let i = 0; i < V; i++) vmap.set(vocab[i], i);
      const N = head.N;
      const dstart = new Int32Array(N + 1);
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
      // tərs indeks (CSR)
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
      let sum = 0;
      for (let d = 0; d < N; d++) sum += dstart[d + 1] - dstart[d];
      const byPage = new Map(); // "cild:səhifə" -> sənəd (hərfli əlavə səhifələr daxil deyil)
      for (let d = 0; d < N; d++) if (!head.pa[d]) byPage.set(head.pv[d] + ":" + head.pp[d], d);
      return { N, shard: head.shard || SHARD, vols: head.vols, titles: head.titles, pv: head.pv, pp: head.pp, pt: head.pt, pa: head.pa, vocab, vmap, dstart, tok, post: cnt, docs, avgdl: sum / N, byPage, titleToks: new Map() };
    });
  }
  return _idx;
}
export const __loadIndex = loadIndex;

const _shards = new Map();
async function loadShard(s) {
  if (!_shards.has(s)) {
    if (_shards.size >= 12) _shards.delete(_shards.keys().next().value);
    _shards.set(s, LOADERS[s]().then((m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"))));
  }
  return _shards.get(s);
}
/** Səhifə: {d, vol, page, ap, title, volTitle, text} */
export async function getPage(idx, d) {
  const sh = await loadShard(Math.floor(d / idx.shard));
  const v = idx.vols.find((x) => x.n === idx.pv[d]);
  return { d, vol: idx.pv[d], page: idx.pp[d], ap: !!idx.pa[d], title: idx.titles[idx.pt[d]], volTitle: v ? v.title : "", text: sh[d % idx.shard] };
}

// ---------------------------------------------------------------- axtarış (BM25 + ifadə)
const postings = (idx, t) => idx.docs.subarray(idx.post[t], idx.post[t + 1]);
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
function titleTokens(idx, tid) {
  let s = idx.titleToks.get(tid);
  if (!s) {
    s = new Set(tokens(idx.titles[tid]));
    idx.titleToks.set(tid, s);
  }
  return s;
}

const _cache = new Map();
/**
 * @param {string} phrase ərəbcə söz/ifadə
 * @returns {Promise<{terms:string[], list:number[], exact:number, total:number}>}
 *   list: göstəriləcək səhifə sənəd-id-ləri (ən çox MAX_RANK), total: uyğun gələn bütün səhifələrin sayı
 */
export async function searchFatawa(phrase) {
  const ck = tokens(phrase).join(" ");
  if (_cache.has(ck)) return _cache.get(ck);
  const r = await searchRaw(phrase);
  if (_cache.size >= 30) _cache.delete(_cache.keys().next().value);
  _cache.set(ck, r);
  return r;
}
async function searchRaw(phrase) {
  const idx = await loadIndex();
  const terms = tokens(phrase);
  const out = { terms, list: [], exact: 0, total: 0 };
  if (!terms.length) return out;
  let ids = terms.map((t) => idx.vmap.get(t));
  const unknown = ids.filter((x) => x == null).length;
  if (unknown && (terms.length < 5 || unknown * 2 >= terms.length)) return out; // tapılmayan söz: qısa sorğuda nəticə yoxdur; uzun sorğuda atılır
  const phraseOk = unknown === 0;
  ids = ids.filter((x) => x != null);
  const uniq = [...new Set(ids)];
  const df = (t) => idx.post[t + 1] - idx.post[t];
  let content = uniq.filter((t) => df(t) / idx.N <= COMMON_DF);
  if (!content.length) content = uniq;
  const k = content.length;
  const minCov = k <= 3 ? k : Math.ceil(k * 0.75); // qısa sorğuda bütün (ümumi olmayan) sözlər, uzun sorğuda ~3/4
  const cov = new Uint8Array(idx.N);
  for (const t of content) for (const d of postings(idx, t)) cov[d]++;
  const cand = [];
  for (let d = 0; d < idx.N; d++) if (cov[d] >= minCov) cand.push(d);
  out.total = cand.length;
  if (!cand.length) return out;
  const qpos = new Map(uniq.map((t, i) => [t, i]));
  const idf = uniq.map((t) => Math.log(1 + (idx.N - df(t) + 0.5) / (df(t) + 0.5)));
  const scored = [];
  for (const d of cand) {
    const tf = new Float64Array(uniq.length);
    const a = idx.dstart[d];
    const b = idx.dstart[d + 1];
    for (let i = a; i < b; i++) {
      const q = qpos.get(idx.tok[i]);
      if (q !== undefined) tf[q]++;
    }
    const dl = b - a;
    let score = 0;
    const tt = titleTokens(idx, idx.pt[d]);
    for (let q = 0; q < uniq.length; q++) {
      if (tf[q]) score += idf[q] * ((tf[q] * (K1 + 1)) / (tf[q] + K1 * (1 - B + (B * dl) / idx.avgdl)));
      if (tt.has(idx.vocab[uniq[q]])) score += idf[q] * 0.6;
    }
    let tier = 2;
    if (uniq.length === 1) tier = 0;
    else if (phraseOk && ids.length >= 2 && hasPhrase(idx, d, ids)) tier = 0;
    else if (content.every((t) => tf[qpos.get(t)] > 0) && near(idx, d, content)) tier = 1;
    scored.push([d, tier, score]);
  }
  scored.sort((x, y) => x[1] - y[1] || y[2] - x[2] || x[0] - y[0]);
  out.exact = uniq.length === 1 ? 0 : scored.filter((x) => x[1] === 0).length;
  out.list = scored.slice(0, MAX_RANK).map((x) => x[0]);
  return out;
}

// ---------------------------------------------------------------- mənbə sətirləri / kəsmə
const AR_DIG = /[٠-٩]/g;
const asciiDigits = (s) => String(s).replace(AR_DIG, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
const ED = "ترقيم ط. مجمع الملك فهد لطباعة المصحف الشريف، 1425هـ";
export function sourceLines(p) {
  const pg = p.ap ? `ص (${p.page})` : `ص ${p.page}`;
  const l1 = `ابن تيمية، مجموع الفتاوى، المجلد ${p.vol}، ${pg} (${ED})`;
  const bits = [];
  if (p.volTitle) bits.push(`موضوع المجلد: ${p.volTitle}`);
  if (p.title) bits.push(`العنوان: ${p.title}`);
  return bits.length ? [l1, bits.join(" — ")] : [l1];
}

/** Səhifə mətnini uyğunluq yerinin ətrafında sözbəsöz kəsir. termSet: stem tokenlər; phraseToks: sıralı ifadə (varsa onun yeri üstün tutulur) */
export function excerpt(text, termSet, phraseToks, max = EXCERPT, full = FULL_MAX) {
  if (text.length <= full) return { text, cut: false };
  let anchor = 0;
  if (termSet && termSet.size) {
    const sp = tokenSpans(text);
    let found = -1;
    if (phraseToks && phraseToks.length >= 2) {
      outer: for (let i = 0; i + phraseToks.length <= sp.length; i++) {
        for (let j = 0; j < phraseToks.length; j++) if (sp[i + j].t !== phraseToks[j]) continue outer;
        found = sp[i].start;
        break;
      }
    }
    if (found < 0) {
      const ms = sp.filter((x) => termSet.has(x.t));
      let best = -1;
      let bestAt = 0;
      for (let i = 0; i < ms.length; i++) {
        const seen = new Set();
        let n = 0;
        for (let j = i; j < ms.length && ms[j].start < ms[i].start + max * 0.8; j++) {
          seen.add(ms[j].t);
          n++;
        }
        const sc = seen.size * 1000 + n;
        if (sc > best) {
          best = sc;
          bestAt = ms[i].start;
        }
      }
      found = ms.length ? bestAt : 0;
    }
    anchor = found;
  }
  // başlanğıc: uyğunluq yerini əhatə edən cümlənin (paraqrafın) əvvəli; çox uzaqdırsa vergül/söz sərhədi
  const a = sentenceStart(text, anchor, 600);
  let b = Math.min(text.length, a + max);
  if (text.length - b < 120) b = text.length;
  else b = sentenceEnd(text, b, { minPos: a + Math.floor(max * 0.6), maxFwd: 200 });
  return { text: (a > 0 ? "« ... » " : "") + text.slice(a, b).trim() + (b < text.length ? " « ... »" : ""), cut: a > 0 || b < text.length };
}

// ---------------------------------------------------------------- mətnlər (qısa çərçivə; mətnin özü tərcümə olunmur)
const T = {
  az: {
    found: (n) => `${n} nəticə tapıldı.`,
    none: (q) => `«${q}» üzrə Məcmuu əl-Fətavada nəticə tapılmadı. Başqa ərəbcə söz və ya ifadə yaz.`,
    noVol: (max) => `Məcmuu əl-Fətavada belə cild yoxdur (cild: 1–${max}).`,
    noPage: (v, a, b) => `${v}-ci cilddə belə səhifə tapılmadı (səhifələr: ${a}–${b}).`,
    usage: `«Məcmuu əl-Fətava» — İbn Teymiyyənin (ö. 728h) fətvaları, 35 cild (İbn Qasimin tərtibi). Mətn sözbəsöz göstərilir, AI yoxdur.
Necə axtarmaq olar:
• Mövzu: «İbn Teymiyyə fətvası: الاستغاثة» və ya sadəcə «təvəssül caizdirmi», «faiz haramdır?»
• Ərəbcə ifadə: «مجموع الفتاوى التوسل بالنبي»
• Cild/səhifə: «مجموع الفتاوى المجلد 3 صفحة 10» və ya «Məcmuu əl-Fətava 3/10»`,
    cut: "(mətn qısaldılıb)",
    more: (a, b, n) => `Daha çox göstər (${a}–${b} / ${n})`,
    moreQ: "davam",
    sl: "Daha çox nəticə var:",
    ended: "Başqa nəticə qalmayıb. Yeni axtarış üçün söz və ya ifadə yaz.",
  },
  tr: {
    found: (n) => `${n} sonuç bulundu.`,
    none: (q) => `«${q}» için Mecmûu'l-Fetâvâ'da sonuç bulunamadı. Başka bir Arapça kelime veya ifade yazın.`,
    noVol: (max) => `Mecmûu'l-Fetâvâ'da böyle bir cilt yok (ciltler: 1–${max}).`,
    noPage: (v, a, b) => `${v}. ciltte böyle bir sayfa yok (sayfalar: ${a}–${b}).`,
    usage: `«Mecmûu'l-Fetâvâ» — İbn Teymiyye'nin (ö. 728h) fetvaları, 35 cilt (İbn Kasım derlemesi). Metin kelimesi kelimesine gösterilir, yapay zeka yoktur.
Nasıl aranır:
• Konu: «İbn Teymiyye fetvası: الاستغاثة» veya sadece «tevessül caiz mi», «faiz haram mı?»
• Arapça ifade: «مجموع الفتاوى التوسل بالنبي»
• Cilt/sayfa: «مجموع الفتاوى المجلد 3 صفحة 10» veya «Mecmûu'l-Fetâvâ 3/10»`,
    cut: "(metin kısaltıldı)",
    more: (a, b, n) => `Daha fazla göster (${a}–${b} / ${n})`,
    moreQ: "devam",
    sl: "Daha fazla sonuç var:",
    ended: "Başka sonuç kalmadı. Yeni arama için kelime veya ifade yazın.",
  },
  en: {
    found: (n) => `${n} results found.`,
    none: (q) => `No results for «${q}» in Majmu' al-Fatawa. Try another Arabic word or phrase.`,
    noVol: (max) => `No such volume in Majmu' al-Fatawa (volumes: 1–${max}).`,
    noPage: (v, a, b) => `No such page in volume ${v} (pages: ${a}–${b}).`,
    usage: `Majmu' al-Fatawa — the fatwas of Ibn Taymiyyah (d. 728 AH), 35 volumes (compiled by Ibn Qasim). Text is shown verbatim, no AI.
How to search:
• Topic: «Ibn Taymiyyah fatwa: الاستغاثة», or just «is tawassul permissible», «is riba haram?»
• Arabic phrase: «مجموع الفتاوى التوسل بالنبي»
• Volume/page: «مجموع الفتاوى المجلد 3 صفحة 10» or «Majmu' al-Fatawa 3/10»`,
    cut: "(text shortened)",
    more: (a, b, n) => `Show more (${a}–${b} of ${n})`,
    moreQ: "more",
    sl: "More results available:",
    ended: "No more results. Write another word or phrase to search again.",
  },
  ru: {
    found: (n) => `Найдено результатов: ${n}.`,
    none: (q) => `По запросу «${q}» в «Маджму аль-фатава» ничего не найдено. Напишите другое арабское слово или фразу.`,
    noVol: (max) => `В «Маджму аль-фатава» нет такого тома (тома: 1–${max}).`,
    noPage: (v, a, b) => `В томе ${v} нет такой страницы (страницы: ${a}–${b}).`,
    usage: `«Маджму аль-фатава» — фетвы Ибн Таймии (ум. 728 г.х.), 35 томов (составил Ибн Касим). Текст показывается дословно, без ИИ.
Как искать:
• Тема: «фетва Ибн Таймии: الاستغاثة» или просто «тавассуль разрешён ли», «риба харам?»
• Арабская фраза: «مجموع الفتاوى التوسل بالنبي»
• Том/страница: «مجموع الفتاوى المجلد 3 صفحة 10» или «Маджму аль-фатава 3/10»`,
    cut: "(текст сокращён)",
    more: (a, b, n) => `Показать ещё (${a}–${b} из ${n})`,
    moreQ: "дальше",
    sl: "Есть ещё результаты:",
    ended: "Других результатов нет. Напишите другое слово или фразу для нового поиска.",
  },
  ar: {
    found: (n) => `تم العثور على ${n} نتيجة.`,
    none: (q) => `لا توجد نتائج لـ «${q}» في مجموع الفتاوى. جرّب كلمة أو عبارة أخرى.`,
    noVol: (max) => `لا يوجد هذا المجلد في مجموع الفتاوى (المجلدات: 1–${max}).`,
    noPage: (v, a, b) => `لا توجد هذه الصفحة في المجلد ${v} (الصفحات: ${a}–${b}).`,
    usage: `«مجموع الفتاوى» — فتاوى ابن تيمية (ت 728هـ)، 35 مجلدًا (جمع ابن قاسم). يُعرض النص حرفيًا دون ذكاء اصطناعي.
طرق البحث:
• موضوع: «فتاوى ابن تيمية الاستغاثة» أو «ما حكم التوسل»
• عبارة: «مجموع الفتاوى التوسل بالنبي»
• مجلد/صفحة: «مجموع الفتاوى المجلد 3 صفحة 10»`,
    cut: "(النص مختصر)",
    more: (a, b, n) => `عرض المزيد (${a}–${b} من ${n})`,
    moreQ: "تابع",
    sl: "هناك المزيد من النتائج:",
    ended: "لا توجد نتائج أخرى. اكتب كلمة أو عبارة جديدة للبحث.",
  },
};
const tx = (lang) => T[lang] || T.az;
function toLang(m) {
  const raw = String(m || "");
  const l = detectLang(raw);
  if (T[l] && l !== "az") return l;
  if (l === "ar" || /[\u0600-\u06FF]/.test(raw)) {
    // ərəb yazısı + latın: latın hissə çoxdursa o dil
    const lat = (raw.match(/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/g) || []).length;
    if (!lat) return "ar";
  }
  const f = foldLat(raw);
  if (/[əƏ]/.test(raw)) return "az";
  if (/\b(?:taymiyy?ah?|fatwas?|fatawa|opinion|view|what|says?|said|ruling|results?|volume|page)\b/.test(f)) return "en";
  if (/\b(?:fetvasi|fetvalari|fetvalar|hakkinda|diyor|gorus|gorusu|mecmuu?l|mecmuu'?l|cilt|sayfa|nedir|hukmu|midir|mudur|nasil)\b/.test(f)) return "tr";
  return "az";
}

// ---------------------------------------------------------------- sorğunun aşkarlanması
const MARKS = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
const NAME_AR = /ابن\s*تيمي[ةه]|ابن‌تيمي[ةه]|تيمي[ةه]/;
const NAME_LAT = /\bibn\s*-?\s*(?:te[iy]m[iy]+[a-z]*|ta[iy]m[iy]+[a-z]*|ta[iy]mi[a-z]*|tejm[a-z]*|temi[a-z]*)\b|\b(?:teymiyy?[a-z]*|taymiyy?[a-z]*)\b/;
const NAME_RU = /ибн\s*-?\s*(?:тайми|теймий|таймий)[а-яё]*|таймий[а-яё]*/i;
const BOOK_AR = /مجموع(?:ه)?\s+(?:ال)?فتاوي|مجموع(?:ه)?\s+فتاوي|مجموع\s+ال?فتاوا/;
const BOOK_LAT = /\b(?:mecmu|majmu|majmuu|mecmuu|mecmua|majmua|mecmuat|majmuat)\w*[\s-]*(?:(?:el|al|ul|ül|l|ed|as|an)[\s-]*)?(?:fet|fat)\w*/;
const BOOK_RU = /(?:маджму|меджму|маджмуъ|маджмуа)[а-яё]*[\s-]*(?:аль|ал|ль)?[\s-]*(?:фатав|фетав|фатва)[а-яё]*/i;
const FATWA_AR = /فتاوي|فتوي|فتاوا|فتوا/;
const FATWA_LAT = /\b(?:fet(?:va|eva|wa|ava)\w*|fatw\w*|fatawa\w*|fetvalar\w*|fetwa\w*)\b/;
const FATWA_RU = /фетв[а-яё]*|фатв[а-яё]*|фатав[а-яё]*/i;
const INTENT_AR = /(?:^|\s)(?:رايه|راي|اراء|آراء|قوله|قول|يقول|قال|ماذا\s+قال|ما\s+قال|حكم|موقف|موقفه|مذهب|مذهبه|كلام|كلامه)(?=\s|$)/;
const INTENT_LAT = /\b(?:haqqinda|haqqında|hakkinda|haqda|barede\w*|baresinde\w*|about|fikr\w*|rey\w*|gorus\w*|nə?\s*deyir|ne\s*deyir|ne\s*diyor|ne\s*der|deyib|demisdir|demis|dedi|opinion|view|views|say|says|said|ruling|stance|position|mevqe\w*|mövqe\w*|hokm\w*|hükm\w*|hukm\w*|kanaat\w*)\b/;
const INTENT_RU = /мнени[а-яё]*|говорит|сказал|считает|позици[а-яё]*|взгляд[а-яё]*|что\s+говорит/i;
const BIO_AR = /من\s+هو|ترجمه|سيره|حياته|ولد|وفاته/;
const BIO_LAT = /\b(?:kimdir|kimdi|who\s+is|who\s+was|biograph\w*|biyograf\w*|hayati|heyati|həyatı|doğum|dogum|born|died|vəfat|vefat)\b/;
const BIO_RU = /кто\s+так|биограф[а-яё]*|жизнь/i;
const QURAN_AR = /آي[ةه]|ايه|ايات|آيات|سور[ةه]|تفسير|تفاسير|﴿|﴾|\d\s*[:：]\s*\d/;
const QURAN_LAT = /\b(ay[eə]t?\w*|ayah|ayat|sur[eə]\w*|surah|tef?sir\w*|tafsir\w*|verse|verses)\b/i;
const QURAN_RU = /аят|сура|тафсир/i;
const LEX_AR = /(?:^|\s)(?:معنى|معني|يعني|تعريف|مرادف|المقصود|المراد)(?=\s|$)/;
const NAHW_AR = /اعراب|إعراب|أعرب|اعرب|النحو|نحو\s|الصرف|التصريف|قواعد/;
const AR_RUN = /[\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640][\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s]*/g;
const LEAD_AR = new Set(["عن", "في", "حول", "بشان", "بخصوص", "عند", "ما", "ماذا", "قال", "راي", "رايه", "قول", "قوله", "يقول", "حكم", "موقف", "موقفه", "مذهب", "مذهبه", "كلام", "كلامه", "من", "لي", "اريد", "اعطني", "اذكر", "ابحث", "بحث", "عنه", "هو", "هي", "ورد", "على", "الى"]);

const wasBook = (s, raw) => BOOK_AR.test(norm(s)) || BOOK_LAT.test(foldLat(raw)) || BOOK_RU.test(raw) || namesFatawaBook(raw);

/** Mesajdan sorğu: {mode:'q', phrase} | {mode:'p', vol, page|null} | {mode:'usage'} | null */
export function parseFatawaQuery(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 300) return null;
  const plain = raw.replace(MARKS, "");
  const nplain = norm(plain);
  const f = foldLat(asciiDigits(raw));
  const book = wasBook(plain, raw);
  const name = NAME_AR.test(nplain) || NAME_LAT.test(f) || NAME_RU.test(raw);
  const fatwa = FATWA_AR.test(nplain) || FATWA_LAT.test(f) || FATWA_RU.test(raw);
  const intent = INTENT_AR.test(nplain) || INTENT_LAT.test(f) || INTENT_RU.test(raw);
  if (!(book || (name && (fatwa || intent)))) return null;
  if (!book) {
    if (BIO_AR.test(nplain) || BIO_LAT.test(f) || BIO_RU.test(raw)) return null;
    if (QURAN_AR.test(plain) || QURAN_LAT.test(raw) || QURAN_LAT.test(f) || QURAN_RU.test(raw)) return null;
    if (NAHW_AR.test(plain)) return null;
    if (isLexicalQuestion(raw) || LEX_AR.test(plain)) return null;
  }
  // ---- cild / səhifə
  const ar = asciiDigits(nplain);
  const lat = f;
  const ru = asciiDigits(raw.toLowerCase());
  let vol = null;
  let page = null;
  let m;
  // «10-cu cild 5-ci səhifə», «10. cilt 5. sayfa»: say sözdən əvvəl
  const ORD = "\\s*(?:-?\\s*(?:cu|ci|ncu|nci|inci|uncu|unci|ıncı|üncü|th|st|nd|rd)\\b|\\.)\\s*"; // sıra şəkilçisi mütləqdir
  const preVol = new RegExp("(?<![\\d/:])(\\d{1,2})" + ORD + "(?:cild\\w*|cilt\\w*|volume|vol\\b|jild\\w*)").exec(f);
  const prePage = new RegExp("(?<![\\d/:])(\\d{1,4})" + ORD + "(?:sehife\\w*|sayfa\\w*|page\\b|pg\\b)").exec(f);
  if ((m = /(?:^|\s)(?:المجلد|مجلد|الجز|جز|ج)\s*[:.]?\s*(\d{1,2})(?!\d)/.exec(ar)) || (m = /\b(?:cild\w*|cilt\w*|volume|vol|jild|juz|cuz|c|v)\.?\s*[:.]?\s*(\d{1,2})(?!\d)/.exec(lat)) || (m = /(?:том|т)\.?\s*(\d{1,2})(?!\d)/.exec(ru))) vol = Number(m[1]);
  if ((m = /(?:^|\s)(?:صفحه|الصفحه|ص)\s*[:.]?\s*(\d{1,4})(?!\d)/.exec(ar)) || (m = /\b(?:sehife\w*|sayfa\w*|page|pg|pp|p|s|ss)\.?\s*[:.]?\s*(\d{1,4})(?!\d)/.exec(lat)) || (m = /(?:страница|стр|с)\.?\s*(\d{1,4})(?!\d)/.exec(ru))) page = Number(m[1]);
  if (preVol) vol = Number(preVol[1]);
  if (prePage) page = Number(prePage[1]);
  if (vol == null && page == null && (m = /(?<![\d/:])(\d{1,2})\s*[/:]\s*(\d{1,4})(?![\d/:])/.exec(asciiDigits(plain)))) {
    vol = Number(m[1]);
    page = Number(m[2]);
  }
  if (vol != null) return { mode: "p", vol, page };
  if (page != null) return { mode: "usage" };
  // ---- sorğu mətni
  const alts = extractAlts(raw);
  if (!alts.length) return { mode: "usage" };
  return { mode: "q", phrase: alts[0], alts };
}

/** Mesajdan ərəbcə axtarış ifadələri: dırnaqdakı/ərəbcə mətn (kitab/müəllif/fətva sözləri atılır), yoxsa mövzu lüğəti */
function extractAlts(raw, { natural = false } = {}) {
  let phrase = "";
  const qm = raw.match(/[«"“„'‘]([^«»"“”„'‘’]{2,200})[»"”“’']/);
  if (qm && /[\u0621-\u064A]/.test(qm[1])) phrase = qm[1];
  if (!phrase) {
    const runs = raw.match(AR_RUN) || [];
    phrase = runs.map((r) => r.trim()).filter((r) => /[\u0621-\u064A]{2}/.test(r)).join(" ");
  }
  if (phrase) {
    phrase = phrase
      .replace(/(?:ال)?[مم]جموع(?:ه|ة)?\s+(?:ال)?فتاو[ىيا]/g, " ")
      .replace(/(?:ال)?شيخ\s+(?:ال)?[اإأ]سلام/g, " ")
      .replace(/ابن\s*تيمي[ةه]/g, " ")
      .replace(/تيمي[ةه]/g, " ")
      .replace(/(?:ال)?فتاو[ىيا]|(?:ال)?فتو[ىيا]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const ws = phrase.split(/\s+/).filter(Boolean);
    while (ws.length && (LEAD_AR.has(norm(ws[0])) || (natural && RULING_AR_WORDS.has(norm(ws[0]))))) ws.shift();
    while (ws.length && (LEAD_AR.has(norm(ws[ws.length - 1])) || (natural && RULING_AR_WORDS.has(norm(ws[ws.length - 1]))))) ws.pop();
    phrase = ws.join(" ");
  }
  if (phrase && tokens(phrase).length) return natural ? [phrase, ...topicAlts(raw).alts] : [phrase];
  return topicAlts(raw).alts;
}

const STOP = new Set(("it its to be i you we they he she do does did can could may must should shall will would from at by with my your our his her their this that these those there for if or as so not no any someone one people muslim muslims islam islamic " +
  "in on of an a and the is are was were am what which how who why when where about than then also too very much more some such " +
  "mi mu mı mü bir her hem ki da de ya ise ama ve və ile ucun icin kimse birisi birinin edir etmek etmək olur olar olarmi nedir nə ne neler necə nece nasil " +
  "ли не то на по с у к за из для как можно нужно есть быть ислам исламе мусульманину мусульманин это что такое а и в о об").split(" "));

// ---- tbii sual (kitab/müəllif adı olmadan): «namaz qılmayanın hökmü nədir», «faiz haramdır?», «ما حكم الربا»
const RULING_AR_WORDS = new Set(["هل", "ما", "حكم", "حكمه", "حكمها", "الحكم", "يجوز", "جايز", "جائز", "يحرم", "يحل", "حرام", "حلال", "مكروه", "واجب", "لا", "في", "عن", "من", "هو", "هي", "ماهو", "ماهي", "شرعا", "الشرع", "الاسلام", "الاسلام"]);
const RULING_AR = /(?:^|\s)(?:حكم|حكمه|الحكم|يجوز|جايز|جائز|يحرم|يحل|حرام|حلال|مكروه|واجب)(?=\s|$)/;
const RULING_LAT = /\b(?:hokm\w*|hukm\w*|caiz\w*|haram\w*|halal\w*|helal\w*|mekruh\w*|makruh\w*|vacib\w*|vacip\w*|wajib\w*|farz\w*|gunah\w*|yasak\w*|yasaq\w*|qadagan\w*|icaze\w*|mubah\w*|mesru\w*|olarmi|olurmu|olarmı|ruling\w*|permissible|permitted|allowed|lawful|unlawful|forbidden|prohibited|obligatory|mandatory|sinful|islamda|islamin|islama gore|islam ne diyor|islamic (?:view|position|perspective)|according to islam|view of islam|what does islam say|is it (?:a )?sin|is it ok|is it okay|can i|may i|should i)\b/;
const RULING_RU = /(?:хукм|решени|положени|разреш|запрещ|дозвол|допустим|позволен|харам|халял|халяль|макрух|обязательн|грех|греш|можно ли|разрешено ли|что говорит ислам|в исламе|по исламу)/i;

/** Kitab/müəllif adı olmadan, hökm sualı: «hökmü / caizdirmi / haramdır / ruling / حكم …» + tanınan mövzu (və ya yalnız mövzu sözü). Digər idarəçilər əvvəl cavab verir. */
export function parseNaturalQuery(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 250) return null;
  const plain = raw.replace(MARKS, "");
  const nplain = norm(plain);
  const f = foldLat(raw);
  if (QURAN_AR.test(plain) || QURAN_LAT.test(raw) || QURAN_LAT.test(f) || QURAN_RU.test(raw)) return null;
  if (NAHW_AR.test(plain) || LEX_AR.test(plain) || isLexicalQuestion(raw)) return null;
  if (BIO_AR.test(nplain) || BIO_LAT.test(f) || BIO_RU.test(raw)) return null;
  if (/[\u0621-\u064A]{2}/.test(raw)) {
    // ərəbcə: hökm sözü və ən azı bir mənalı söz
    if (!RULING_AR.test(nplain) && !RULING_AR.test(plain)) return null;
    const alts = extractAlts(raw, { natural: true });
    return alts.length ? { mode: "q", phrase: alts[0], alts, natural: true } : null;
  }
  const cue = RULING_LAT.test(f) || RULING_RU.test(raw) || FATWA_LAT.test(f) || FATWA_RU.test(raw);
  const t = topicAlts(raw);
  if (!t.alts.length) return null;
  if (!cue && !t.bare) return null;
  // mövzu sözündən başqa «yad» məzmun sözləri çoxdursa (məs. «namazda saqqız çeynəmək caizdirmi»), sual dəqiq mövzudan kənardır: AI-yə qalır
  if (!t.bare) {
    const m = matchTopics(raw);
    let extra = 0;
    m.tokens.forEach((tk, i) => {
      if (m.used[i] || STOP.has(tk) || RULING_LAT.test(tk) || RULING_RU.test(tk) || FATWA_LAT.test(tk) || /^(?:haqqinda|hakkinda|haqda|barede|baresinde|about)$/.test(tk)) return;
      extra++;
    });
    if (extra > 1) return null;
  }
  return { mode: "q", phrase: t.alts[0], alts: t.alts, natural: true };
}

// ---------------------------------------------------------------- cavab
const b64u = (s) => Buffer.from(s, "utf8").toString("base64url");
const unb64u = (s) => Buffer.from(s, "base64url").toString("utf8");
const CTX_RE = /^::ctx:: fatawa (q|p) (\d+) (\w+) (\S+)$/m;

function block(p, i, n, termSet, phraseToks, lang, lookup) {
  const ex = lookup ? excerpt(p.text, termSet, null, PAGE_LOOKUP_MAX, PAGE_LOOKUP_MAX) : excerpt(p.text, termSet, phraseToks);
  const lines = [`::tafsir fatawa::`, `::tl:: ${n > 1 ? i + "/" + n + " · " : ""}ابن تيمية · المجلد ${p.vol} · ${p.ap ? "ص (" + p.page + ")" : "ص " + p.page}`];
  for (const ln of ex.text.split("\n")) if (ln.trim()) lines.push(ln);
  if (ex.cut) lines.push("::tv:: " + tx(lang).cut);
  for (const s of sourceLines(p)) lines.push("::src:: " + s);
  lines.push("::/tafsir::");
  return lines.join("\n");
}

async function render({ mode, key, ids, offset, total, lang, head }) {
  const idx = await loadIndex();
  const t = tx(lang);
  const slice = ids.slice(offset, offset + PAGE);
  const q = mode === "q" ? tokens(key) : [];
  const termSet = new Set(q);
  const out = [];
  if (head) out.push(head);
  for (let i = 0; i < slice.length; i++) {
    const p = await getPage(idx, slice[i]);
    out.push(block(p, offset + i + 1, total, termSet, q, lang, mode === "p"));
  }
  const b = offset + slice.length;
  if (b < ids.length) {
    const nb = Math.min(ids.length, b + PAGE);
    out.push(`::sug::\n::sl:: ${t.sl}\n::sb:: ${t.more(b + 1, nb, total)} | ${t.moreQ}\n::/sug::`);
  }
  out.push(`::ctx:: fatawa ${mode} ${b} ${lang} ${b64u(key)}`);
  return out.join("\n\n").replace(/\n\n(::sug::|::ctx::)/g, "\n$1");
}

async function runQuery(phrase, lang, alts, natural) {
  const t = tx(lang);
  const list = alts && alts.length ? alts : [phrase];
  for (const ph of list) {
    const r = await searchFatawa(ph);
    if (!r.list.length) continue;
    const q = ph.replace(/\s+/g, " ").trim();
    return render({ mode: "q", key: q, ids: r.list, offset: 0, total: r.total, lang, head: t.found(r.total) });
  }
  return natural ? null : t.none(phrase.replace(/\s+/g, " ").trim());
}

async function runPage(vol, page, lang) {
  const idx = await loadIndex();
  const t = tx(lang);
  const v = idx.vols.find((x) => x.n === vol);
  if (!v) return t.noVol(idx.vols[idx.vols.length - 1].n);
  let pg = page;
  if (pg == null) {
    // yalnız cild: cildin ilk səhifəsi
    const d0 = v.first;
    return render({ mode: "p", key: `${vol}:${idx.pp[d0]}`, ids: [d0], offset: 0, total: 1, lang, head: "" });
  }
  const d = idx.byPage.get(vol + ":" + pg);
  if (d == null) {
    let mn = Infinity;
    for (let i = v.first; i < v.first + v.count; i++) if (!idx.pa[i] && idx.pp[i] < mn) mn = idx.pp[i];
    return t.noPage(vol, mn, v.maxPage);
  }
  return render({ mode: "p", key: `${vol}:${pg}`, ids: [d], offset: 0, total: 1, lang, head: "" });
}

const MORE_RE = /^\s*(?:daha\s+(?:cox|çox|fazla)(?:\s+(?:goster|göstər|göster))?|goster|göstər|show\s+more|more|next|ещ[её]|больше|المزيد|أكثر|اكثر)\s*[.!?]?\s*$/i;
async function moreReply(hist) {
  const list = Array.isArray(hist) ? hist : [];
  let last = null;
  for (let i = list.length - 1; i >= 0; i--) if (list[i] && list[i].role === "assistant") { last = list[i]; break; }
  if (!last) return null;
  const m = CTX_RE.exec(String(last.text || ""));
  if (!m || m[1] !== "q") return null;
  const offset = Number(m[2]);
  const lang = T[m[3]] ? m[3] : "az";
  const key = unb64u(m[4]);
  const r = await searchFatawa(key);
  if (offset >= r.list.length) return tx(lang).ended;
  return render({ mode: "q", key, ids: r.list, offset, total: r.total, lang, head: "" });
}

/** Açıq «Məcmuu əl-Fətava» / «İbn Teymiyyə fətvası» sorğusu və ya «davam» (əvvəlki cavab bu idisə). Digər suallarda null. */
export async function fatawaReply(message, hist) {
  try {
    const { isContinue } = await import("./_next.js");
    if (isContinue(message) || MORE_RE.test(String(message || ""))) {
      const r = await moreReply(hist);
      if (r) return r;
    }
  } catch {
    /* davam tapılmadı */
  }
  const q = parseFatawaQuery(message);
  if (!q) return null;
  const lang = toLang(message);
  if (q.mode === "usage") return tx(lang).usage;
  if (q.mode === "p") return runPage(q.vol, q.page, lang);
  return runQuery(q.phrase, lang, q.alts, false);
}

/** Kitab adı olmadan təbii hökm sualı («faiz haramdır?», «mövlud», «ما حكم الربا»). Uyğun nəticə yoxdursa null (başqa idarəçilər/AI davam edir). */
export async function fatawaNaturalReply(message) {
  try {
    const q = parseNaturalQuery(message);
    if (!q) return null;
    return await runQuery(q.phrase, toLang(message), q.alts, true);
  } catch {
    return null;
  }
}
