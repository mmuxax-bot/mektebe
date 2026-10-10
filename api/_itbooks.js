// İbn Teymiyyə kitabları (Şamilə): AI-siz kitab bələdçisi, oxu (səhifə-səhifə), mətn axtarışı (BM25 + ifadə) və mərhələli tövsiyə siyahısı.
//   Məlumat: api/_itbooks/index.js (lüğət + token-id + səhifə meta), api/_itbooks/books/b_<n>.js (səhifə mətni, tənbəl), api/_itbooks/avail.js (mövcud kitablar; node scripts/build-itbooks.mjs).
//   Kitab siyahısı/adları/mərhələlər: api/_itbooks/registry.js (28 kitab, 4 mərhələ). Yeni mərhələ = məlumat əlavə edib quruculuğu işə salmaq; kod dəyişmir.
//   Tetikleyicilər: kitab adı («العبودية كتاب», «Əl-Vasitiyyə», «Rəf'ul-ləm»), «<kitab adı> ص 12», «<kitab adı> الصبر» (kitab daxilində axtarış), «كتب ابن تيمية الصبر» (bütün kitablarda),
//   tövsiyə («kitab məsləhət et», «İbn Teymiyyənin hansı kitablarını oxuyum», «where to start with Ibn Taymiyyah», «посоветуй книги», «كتب تنصح بها»), «növbəti mərhələ».
//   Cavab: sözbəsöz mətn (tərcümə/xülasə/uydurma yoxdur) + mənbə sətri (kitab, müəllif, səhifə, nəşr). Davam: «davam»/«daha çox» (::ctx:: itbooks … gizli sətir).
import { brotliDecompressSync } from "node:zlib";
import { detectLang, foldLat } from "./_ayah.js";
import { isLexicalQuestion } from "./_lugha.js";
import { norm, tokens } from "./_hadith/tok.js";
import { topicAlts } from "./_fatawa/topicmatch.js";
import { excerpt } from "./_fatawa.js";
import { LOADERS, SHARD } from "./_itbooks/loaders.js";
import { AVAIL } from "./_itbooks/avail.js";
import { BOOKS, STAGES, MAJMU, bookName, bookDesc, bySlug } from "./_itbooks/registry.js";

export const PAGE = 5;
export const MAX_RANK = 500;
const PAGE_MAX = 3800; // səhifə oxuma rejimində maksimum uzunluq
const COMMON_DF = 0.08;
const WINDOW = 30;
const K1 = 1.2;
const B = 0.75;
const TOC_MAX = 14;

/** kitab mövcuddurmu (məlumatı build olunub) */
export const isAvailable = (slug) => !!AVAIL[slug];

// ---------------------------------------------------------------- indeks (tənbəl)
let _idx = null;
async function loadIndex() {
  if (!_idx) {
    _idx = import("./_itbooks/index.js").then((m) => {
      const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
      const hl = blob.readUInt32LE(0);
      const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
      const vocab = head.vocab.split("\n");
      const V = vocab.length;
      const vmap = new Map();
      for (let i = 0; i < V; i++) vmap.set(vocab[i], i);
      const N = head.N;
      const rd = (st) => {
        let v = 0;
        let mul = 1;
        let b;
        do {
          b = blob[st.p++];
          v += (b & 127) * mul;
          mul *= 128;
        } while (b & 128);
        return v;
      };
      const dstart = new Int32Array(N + 1);
      const st = { p: 4 + hl };
      const first = st.p;
      let total = 0;
      for (let d = 0; d < N; d++) {
        const n = rd(st);
        dstart[d] = total;
        total += n;
        for (let i = 0; i < n; i++) rd(st);
      }
      dstart[N] = total;
      const tok = new Int32Array(total);
      st.p = first;
      let w = 0;
      for (let d = 0; d < N; d++) {
        const n = rd(st);
        for (let i = 0; i < n; i++) tok[w++] = rd(st);
      }
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
      const byPage = new Map(); // "kitab:cild:səhifə" -> sənəd
      for (let d = 0; d < N; d++) {
        const k = head.pb[d] + ":" + head.pv[d] + ":" + head.pp[d];
        if (!byPage.has(k)) byPage.set(k, d);
      }
      const bookIdx = new Map(head.books.map((b, i) => [b.slug, i]));
      return { N, shard: head.shard || SHARD, books: head.books, bookIdx, titles: head.titles, pb: head.pb, pv: head.pv, pp: head.pp, pt: head.pt, vocab, vmap, dstart, tok, post: cnt, docs, avgdl: sum / N, byPage, titleToks: new Map() };
    });
  }
  return _idx;
}
export const __loadIndex = loadIndex;

const _shards = new Map();
async function loadShard(s) {
  if (!_shards.has(s)) {
    if (_shards.size >= 8) _shards.delete(_shards.keys().next().value);
    _shards.set(s, LOADERS[s]().then((m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"))));
  }
  return _shards.get(s);
}
/** Səhifə: {d, slug, vol, page, title, text, ed} */
export async function getPage(idx, d) {
  const sh = await loadShard(Math.floor(d / idx.shard));
  const bk = idx.books[idx.pb[d]];
  return { d, slug: bk.slug, vol: idx.pv[d], page: idx.pp[d], title: idx.titles[idx.pt[d]], text: sh[d % idx.shard], ed: bk.ed };
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
 * @param {string|null} scope kitab slug-ı (yalnız o kitabda) və ya null (bütün kitablarda)
 * @returns {Promise<{terms:string[], list:number[], exact:number, total:number}>}
 */
export async function searchBooks(phrase, scope = null) {
  const ck = (scope || "*") + "|" + tokens(phrase).join(" ");
  if (_cache.has(ck)) return _cache.get(ck);
  const r = await searchRaw(phrase, scope);
  if (_cache.size >= 30) _cache.delete(_cache.keys().next().value);
  _cache.set(ck, r);
  return r;
}
async function searchRaw(phrase, scope) {
  const idx = await loadIndex();
  const terms = tokens(phrase);
  const out = { terms, list: [], exact: 0, total: 0 };
  if (!terms.length) return out;
  let bi = -1;
  if (scope) {
    bi = idx.bookIdx.has(scope) ? idx.bookIdx.get(scope) : -2;
    if (bi === -2) return out;
  }
  let ids = terms.map((t) => idx.vmap.get(t));
  const unknown = ids.filter((x) => x == null).length;
  if (unknown && (terms.length < 5 || unknown * 2 >= terms.length)) return out;
  const phraseOk = unknown === 0;
  ids = ids.filter((x) => x != null);
  const uniq = [...new Set(ids)];
  const df = (t) => idx.post[t + 1] - idx.post[t];
  let content = uniq.filter((t) => df(t) / idx.N <= COMMON_DF);
  if (!content.length) content = uniq;
  const k = content.length;
  const minCov = k <= 3 ? k : Math.ceil(k * 0.75);
  const cov = new Uint8Array(idx.N);
  for (const t of content) for (const d of postings(idx, t)) cov[d]++;
  const cand = [];
  for (let d = 0; d < idx.N; d++) if (cov[d] >= minCov && (bi < 0 || idx.pb[d] === bi)) cand.push(d);
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

// ---------------------------------------------------------------- mənbə sətirləri
const bk = (slug) => bySlug(slug);
const volLabel = (v) => (v === 0 ? "المقدمة، " : v > 1 ? "ج " + v + "، " : "");
const pgLabel = (p) => `${volLabel(p.vol)}ص ${p.page}`;
export function sourceLines(p) {
  const b = bk(p.slug);
  const l1 = `ابن تيمية، ${b ? b.ar : p.slug}، ${pgLabel(p)}${p.ed ? " (" + p.ed + ")" : ""}`;
  return p.title ? [l1, "العنوان: " + p.title] : [l1];
}

// ---------------------------------------------------------------- mətnlər
const SHORT_Q = { az: "İbn Teymiyyənin kitablarını məsləhət et", tr: "İbn Teymiyye'nin kitaplarını tavsiye et", en: "Recommend Ibn Taymiyyah's books", ru: "Посоветуй книги Ибн Таймии", ar: "كتب ابن تيمية تنصح بها" };
const AZORD = { 1: "ci", 2: "ci", 3: "cü", 4: "cü" };
const NEXT_Q = { az: "Növbəti mərhələ", tr: "Sonraki aşama", en: "Next stage", ru: "Следующий этап", ar: "المرحلة التالية" };
const T = {
  az: {
    found: (n, name) => `${n} nəticə tapıldı${name ? " (" + name + ")" : ""}.`,
    none: (q, name) => `«${q}» üzrə ${name || "İbn Teymiyyənin kitablarında"} nəticə tapılmadı. Başqa ərəbcə söz və ya ifadə yaz.`,
    noPage: (name, a, b) => `${name} kitabında belə səhifə yoxdur (səhifələr: ${a}–${b}).`,
    cut: "(mətn qısaldılıb)",
    more: (a, b, n) => `Daha çox göstər (${a}–${b} / ${n})`,
    moreQ: "davam",
    sl: "Daha çox nəticə var:",
    ended: "Başqa nəticə qalmayıb. Yeni axtarış üçün söz və ya ifadə yaz.",
    ovHead: (name, ar, st, stt, pages) => `${name} (${ar}) — İbn Teymiyyə (ö. 728h). ${st}-${AZORD[st]} mərhələ: ${stt}. ${pages} səhifə.`,
    ovSearch: (ar) => `Kitabda axtarmaq üçün ərəbcə söz yaz: «${ar} الصبر». Səhifəni açmaq üçün: «${ar} ص 5».`,
    toc: "الفهرس:",
    start: (p) => `Oxumağa başla (səh. ${p})`,
    prev: (p) => `Əvvəlki səhifə (${p})`,
    next: (p) => `Növbəti səhifə (${p})`,
    list: "Tövsiyə siyahısı",
    lastPage: "Bu kitabın son səhifəsidir.",
    soonBook: (name, st) => `«${name}» — ${st}-${AZORD[st]} mərhələ kitabıdır, tezliklə əlavə olunacaq. Hazırda açıq olan kitabları görmək üçün «kitab məsləhət et» yaz.`,
    recHead: "İbn Teymiyyənin kitablarını addım-addım, asandan çətinə oxumaq məsləhətdir. 4 mərhələ var; Məcmuu əl-Fətava bütün mərhələlərdə yoldaş mənbədir.",
    recStage: (s, t, a, b) => `${s}-${AZORD[s]} mərhələ — ${t} (${a}–${b})`,
    soon: "tezliklə",
    avail: "açıqdır",
    recPick: "Açmaq üçün seç:",
    recMajmu: "Yoldaş mənbə: Məcmuu əl-Fətava (35 cild) — hər mərhələdə mövzu axtarışı və müraciət üçün.",
    recFoot: "Əvvəlcə 1-ci mərhələni bitir, sonra növbəti mərhələyə keç.",
    stageHead: (s, t) => `${s}-${AZORD[s]} mərhələ — ${t}`,
    lastStage: "Bu sonuncu (4-cü) mərhələdir. Başqa mərhələni görmək üçün «2-ci mərhələ» və ya «kitab məsləhət et» yaz.",
    majmu: "Məcmuu əl-Fətava",
  },
  tr: {
    found: (n, name) => `${n} sonuç bulundu${name ? " (" + name + ")" : ""}.`,
    none: (q, name) => `«${q}» için ${name || "İbn Teymiyye'nin kitaplarında"} sonuç bulunamadı. Başka bir Arapça kelime veya ifade yazın.`,
    noPage: (name, a, b) => `${name} kitabında böyle bir sayfa yok (sayfalar: ${a}–${b}).`,
    cut: "(metin kısaltıldı)",
    more: (a, b, n) => `Daha fazla göster (${a}–${b} / ${n})`,
    moreQ: "devam",
    sl: "Daha fazla sonuç var:",
    ended: "Başka sonuç kalmadı. Yeni arama için kelime veya ifade yazın.",
    ovHead: (name, ar, st, stt, pages) => `${name} (${ar}) — İbn Teymiyye (ö. 728h). ${st}. aşama: ${stt}. ${pages} sayfa.`,
    ovSearch: (ar) => `Kitapta aramak için Arapça kelime yazın: «${ar} الصبر». Sayfa açmak için: «${ar} ص 5».`,
    toc: "الفهرس:",
    start: (p) => `Okumaya başla (s. ${p})`,
    prev: (p) => `Önceki sayfa (${p})`,
    next: (p) => `Sonraki sayfa (${p})`,
    list: "Tavsiye listesi",
    lastPage: "Bu kitabın son sayfası.",
    soonBook: (name, st) => `«${name}» ${st}. aşama kitabıdır, yakında eklenecek. Açık kitapları görmek için «kitap tavsiye et» yazın.`,
    recHead: "İbn Teymiyye'nin kitaplarını adım adım, kolaydan zora okumanız önerilir. 4 aşama var; Mecmûu'l-Fetâvâ tüm aşamalarda yoldaş kaynaktır.",
    recStage: (s, t, a, b) => `${s}. aşama — ${t} (${a}–${b})`,
    soon: "yakında",
    avail: "açık",
    recPick: "Açmak için seçin:",
    recMajmu: "Yoldaş kaynak: Mecmûu'l-Fetâvâ (35 cilt) — her aşamada konu araması ve başvuru için.",
    recFoot: "Önce 1. aşamayı bitirin, sonra sonraki aşamaya geçin.",
    stageHead: (s, t) => `${s}. aşama — ${t}`,
    lastStage: "Bu son (4.) aşama. Başka aşama için «2. aşama» veya «kitap tavsiye et» yazın.",
    majmu: "Mecmûu'l-Fetâvâ",
  },
  en: {
    found: (n, name) => `${n} results found${name ? " (" + name + ")" : ""}.`,
    none: (q, name) => `No results for «${q}» in ${name || "Ibn Taymiyyah's books"}. Try another Arabic word or phrase.`,
    noPage: (name, a, b) => `No such page in ${name} (pages: ${a}–${b}).`,
    cut: "(text shortened)",
    more: (a, b, n) => `Show more (${a}–${b} of ${n})`,
    moreQ: "more",
    sl: "More results available:",
    ended: "No more results. Write another word or phrase to search again.",
    ovHead: (name, ar, st, stt, pages) => `${name} (${ar}) — Ibn Taymiyyah (d. 728 AH). Stage ${st}: ${stt}. ${pages} pages.`,
    ovSearch: (ar) => `To search inside the book write an Arabic word: «${ar} الصبر». To open a page: «${ar} ص 5».`,
    toc: "الفهرس:",
    start: (p) => `Start reading (p. ${p})`,
    prev: (p) => `Previous page (${p})`,
    next: (p) => `Next page (${p})`,
    list: "Reading list",
    lastPage: "This is the last page of the book.",
    soonBook: (name, st) => `«${name}» is a Stage ${st} book and will be added soon. Write «recommend books» to see the books open now.`,
    recHead: "Read Ibn Taymiyyah's books step by step, from easiest to hardest. There are 4 stages; Majmu' al-Fatawa is the companion source throughout all stages.",
    recStage: (s, t, a, b) => `Stage ${s} — ${t} (${a}–${b})`,
    soon: "coming soon",
    avail: "available",
    recPick: "Tap to open:",
    recMajmu: "Companion source: Majmu' al-Fatawa (35 volumes) — for topic search and reference at every stage.",
    recFoot: "Finish Stage 1 first, then move on to the next stage.",
    stageHead: (s, t) => `Stage ${s} — ${t}`,
    lastStage: "This is the last (4th) stage. Write «Stage 2» or «recommend books» to see another one.",
    majmu: "Majmu' al-Fatawa",
  },
  ru: {
    found: (n, name) => `Найдено результатов: ${n}${name ? " (" + name + ")" : ""}.`,
    none: (q, name) => `По запросу «${q}» в ${name || "книгах Ибн Таймии"} ничего не найдено. Напишите другое арабское слово или фразу.`,
    noPage: (name, a, b) => `В книге ${name} нет такой страницы (страницы: ${a}–${b}).`,
    cut: "(текст сокращён)",
    more: (a, b, n) => `Показать ещё (${a}–${b} из ${n})`,
    moreQ: "дальше",
    sl: "Есть ещё результаты:",
    ended: "Других результатов нет. Напишите другое слово или фразу для нового поиска.",
    ovHead: (name, ar, st, stt, pages) => `${name} (${ar}) — Ибн Таймия (ум. 728 г.х.). Этап ${st}: ${stt}. Страниц: ${pages}.`,
    ovSearch: (ar) => `Для поиска по книге напишите арабское слово: «${ar} الصبر». Чтобы открыть страницу: «${ar} ص 5».`,
    toc: "الفهرس:",
    start: (p) => `Начать чтение (стр. ${p})`,
    prev: (p) => `Предыдущая страница (${p})`,
    next: (p) => `Следующая страница (${p})`,
    list: "Список для чтения",
    lastPage: "Это последняя страница книги.",
    soonBook: (name, st) => `«${name}» — книга ${st}-го этапа, будет добавлена скоро. Напишите «посоветуй книги», чтобы увидеть доступные книги.`,
    recHead: "Читайте книги Ибн Таймии шаг за шагом, от простого к сложному. Всего 4 этапа; «Маджму аль-фатава» — спутник на всех этапах.",
    recStage: (s, t, a, b) => `Этап ${s} — ${t} (${a}–${b})`,
    soon: "скоро",
    avail: "доступно",
    recPick: "Нажмите, чтобы открыть:",
    recMajmu: "Спутник: «Маджму аль-фатава» (35 томов) — для поиска по темам и справки на каждом этапе.",
    recFoot: "Сначала завершите 1-й этап, затем переходите к следующему.",
    stageHead: (s, t) => `Этап ${s} — ${t}`,
    lastStage: "Это последний (4-й) этап. Напишите «Этап 2» или «посоветуй книги», чтобы увидеть другой.",
    majmu: "Маджму аль-фатава",
  },
  ar: {
    found: (n, name) => `تم العثور على ${n} نتيجة${name ? " (" + name + ")" : ""}.`,
    none: (q, name) => `لا توجد نتائج لـ «${q}» في ${name || "كتب ابن تيمية"}. جرّب كلمة أو عبارة أخرى.`,
    noPage: (name, a, b) => `لا توجد هذه الصفحة في ${name} (الصفحات: ${a}–${b}).`,
    cut: "(النص مختصر)",
    more: (a, b, n) => `عرض المزيد (${a}–${b} من ${n})`,
    moreQ: "تابع",
    sl: "هناك المزيد من النتائج:",
    ended: "لا توجد نتائج أخرى. اكتب كلمة أو عبارة جديدة للبحث.",
    ovHead: (name, ar, st, stt, pages) => `${name} — ابن تيمية (ت 728هـ). المرحلة ${st}: ${stt}. ${pages} صفحة.`,
    ovSearch: (ar) => `للبحث داخل الكتاب اكتب كلمة: «${ar} الصبر». ولفتح صفحة: «${ar} ص 5».`,
    toc: "الفهرس:",
    start: (p) => `ابدأ القراءة (ص ${p})`,
    prev: (p) => `الصفحة السابقة (${p})`,
    next: (p) => `الصفحة التالية (${p})`,
    list: "قائمة الكتب",
    lastPage: "هذه آخر صفحة في الكتاب.",
    soonBook: (name, st) => `«${name}» من كتب المرحلة ${st} وستضاف قريبًا. اكتب «كتب تنصح بها» لرؤية الكتب المتاحة.`,
    recHead: "يُنصح بقراءة كتب ابن تيمية بالتدرج من الأسهل إلى الأصعب، في 4 مراحل، ومجموع الفتاوى رفيق لك في جميع المراحل.",
    recStage: (s, t, a, b) => `المرحلة ${s} — ${t} (${a}–${b})`,
    soon: "قريبًا",
    avail: "متاح",
    recPick: "اضغط للفتح:",
    recMajmu: "المرجع المرافق: مجموع الفتاوى (35 مجلدًا) — للبحث في المسائل والرجوع إليه في كل مرحلة.",
    recFoot: "أتمّ المرحلة الأولى أولًا ثم انتقل إلى التالية.",
    stageHead: (s, t) => `المرحلة ${s} — ${t}`,
    lastStage: "هذه آخر مرحلة (الرابعة). اكتب «المرحلة 2» أو «كتب تنصح بها» لعرض غيرها.",
    majmu: "مجموع الفتاوى",
  },
};
const tx = (l) => T[l] || T.az;

// ---------------------------------------------------------------- açarlar / tanıma
const CYR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "c", ш: "s", щ: "s", ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a" };
const ART = new Set(["el", "al", "ul", "ol", "ar", "ad", "as", "at", "an", "ed", "es", "et", "er", "ez", "ash", "ath", "wa", "va", "ve", "wal", "val", "vel", "bi", "fi", "fil", "fil", "fi'l", "li", "ila", "ile", "ela", "ala", "ale", "on", "of", "the", "ve", "ва", "аль", "ал"]);
const KITAB = new Set(["kitap", "kitabi", "kitaplari", "kitablari", "kitab", "kitabi", "kitabul", "kitabu", "kitabi", "kitabin", "book", "risalesi", "risale", "risalə", "risala", "risalah", "китаб", "книга", "книгу", "книги"]);
function latToks(s) {
  let f = foldLat(s).replace(/[а-яё]/g, (c) => CYR[c] ?? c);
  f = f.replace(/[’'`´ʻʼ‘ʿʾ]/g, "");
  return f.replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}
function tkey(t) {
  return t
    .replace(/kh|gh|sh|ch|th|dh/g, (m) => ({ kh: "h", gh: "g", sh: "s", ch: "c", th: "t", dh: "d" })[m])
    .replace(/[hx]/g, "")
    .replace(/w/g, "v")
    .replace(/q/g, "k")
    .replace(/y/g, "i")
    .replace(/c/g, "j")
    .replace(/e/g, "a")
    .replace(/o/g, "u")
    .replace(/(.)\1+/g, "$1")
    // yapışıq artikl şəkilçisi: «iqtidaus», «siratil», «sarimul» → «iqtida», «sirat», «sarim» (hər iki tərəfdə eyni tətbiq olunur)
    .replace(/^(.{4,}?)[ui][sltdrnz]$/, "$1");
}
/** latın/kiril mətn -> açar tokenlər [{k, i}] (artikl və «kitab» sözləri atılır; i = orijinal token indeksi) */
function latKeyed(s) {
  const out = [];
  latToks(s).forEach((t, i) => {
    if (ART.has(t) || KITAB.has(t)) return;
    const k = tkey(t);
    if (k) out.push({ k, i });
  });
  return out;
}
const AR_SPLIT = /[^\u0621-\u064A]+/;
const arToks = (s) => norm(s).split(AR_SPLIT).filter(Boolean);
const arKey = (t) => (t.length > 3 && t.startsWith("ال") ? t.slice(2) : t.length > 3 && /^[ولب]ال/.test(t) ? t.slice(3) : t);
function arKeyed(s) {
  const out = [];
  arToks(s).forEach((t, i) => {
    if (t === "كتاب" || t === "الكتاب" || t === "رساله" || t === "كتب") return;
    out.push({ k: arKey(t), i });
  });
  return out;
}

// alias açarları (bir dəfə hesablanır): {slug, key, ar}
const ALIASES = [];
for (const b of BOOKS) {
  const names = [...Object.values(b.names), b.ar, ...(b.alias || [])];
  const seen = new Set();
  for (const nm of names) {
    for (const part of String(nm).split(/\s*\(/)) {
      const s = part.replace(/\)/g, "").trim();
      if (!s) continue;
      const isAr = /[\u0621-\u064A]/.test(s);
      const ks = isAr ? arKeyed(s) : latKeyed(s);
      const key = ks.map((x) => x.k).join("");
      if (key.length < 3 || seen.has((isAr ? "a" : "l") + key)) continue;
      seen.add((isAr ? "a" : "l") + key);
      ALIASES.push({ slug: b.slug, key, ar: isAr, words: ks.length });
    }
  }
}
const ALIAS_MAP = new Map();
for (const a of ALIASES) {
  const k = (a.ar ? "a:" : "l:") + a.key;
  if (!ALIAS_MAP.has(k)) ALIAS_MAP.set(k, []);
  ALIAS_MAP.get(k).push(a);
}
/** mesajda kitab adı: ən uzun uyğunluq. Qaytarır {slug, used:Set(token indeksləri), ar:bool} | null */
function findBook(raw) {
  let best = null;
  for (const isAr of [false, true]) {
    const ks = isAr ? arKeyed(raw) : latKeyed(raw);
    for (let i = 0; i < ks.length; i++) {
      let key = "";
      for (let j = i; j < Math.min(ks.length, i + 8); j++) {
        key += ks[j].k;
        const hit = ALIAS_MAP.get((isAr ? "a:" : "l:") + key);
        if (hit && (!best || key.length > best.len)) best = { slug: hit[0].slug, len: key.length, words: j - i + 1, used: new Set(ks.slice(i, j + 1).map((x) => x.i)), ar: isAr };
      }
    }
  }
  return best;
}

const MARKS = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
const NAME_AR = /ابن\s*تيمي[ةه]|تيمي[ةه]/;
const NAME_LAT = /\bibn\s*-?\s*(?:te[iy]m[iy]+[a-z]*|ta[iy]m[iy]+[a-z]*|tejm[a-z]*|temi[a-z]*)\b|\b(?:teymiyy?[a-z]*|taymiyy?[a-z]*)\b/;
const NAME_RU = /ибн\s*-?\s*(?:тайми|теймий|таймий)[а-яё]*|таймий[а-яё]*/i;
const hasName = (raw, plain, f) => NAME_AR.test(norm(plain)) || NAME_LAT.test(f) || NAME_RU.test(raw);
const NAME_TOK = /^(?:ibn|taimiia?|taimiiah|teimiia?|teimiie|ibni|taymiyyah?|teymiyye\w*|taymiyya\w*|teymiyyenin|taymiyyah\w*|nin|nun|in|un|ibnu)$/;
const FILL = new Set(["haqqinda", "hakkinda", "about", "mene", "mana", "bana", "goster", "ver", "yaz", "show", "open", "ac", "get", "me", "the", "a", "of", "by", "in", "on", "is", "are", "ne", "nedir", "nece", "nedi", "mi", "mu", "de", "da", "ve", "ile", "ucun", "icin", "haqda", "barede", "oxu", "oku", "read", "lutfen", "please", "zehmet", "olmasa", "o", "bu", "bir", "ibn", "teymiyyenin", "teymiyyenin", "o", "о", "об", "про", "покажи", "дай", "mene"]);
const BOOKCUE_LAT = /\b(?:kita[bp]\w*|book\w*|risal\w*|rasail|treatise\w*)\b/;
const BOOKCUE_RU = /книг\w*|трактат\w*|рисал\w*/i;
const BOOKCUE_AR = /(?:^|\s)(?:كتاب|الكتاب|كتب|رساله|الرساله|رسائل)(?=\s|$)/;
const asciiDigits = (s) => String(s).replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
const LEAD_AR = new Set(["كتاب", "الكتاب", "كتب", "رساله", "الرساله", "رسائل", "ابن", "لابن", "تيميه", "ابن‌تيميه", "شيخ", "الاسلام", "لشيخ", "في", "عن", "من", "ص", "صفحه", "الصفحه", "ج", "جزء", "الجزء", "مجلد", "المجلد", "هل", "ما", "ماذا", "قال", "حول", "عند", "كلام", "قول", "يقول", "لي", "اريد", "اعطني", "اذكر", "ابحث", "بحث", "اقرا", "على", "الى", "هذا", "هذه", "داخل", "فيه", "فيها", "عنه"]);
const LEAD_NORM = new Set([...LEAD_AR].map((x) => norm(x)));

function langOf(message, hist) {
  const raw = String(message || "");
  const l = detectLang(raw);
  if (l === "ar") {
    const lat = (raw.match(/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/g) || []).length;
    if (lat < 3) {
      const c = lastCtx(hist);
      if (c && c.lang) return c.lang;
      return "ar";
    }
  }
  if (T[l] && l !== "az") return l;
  const f = foldLat(raw);
  if (/[əƏ]/.test(raw)) return "az";
  if (/\b(?:recommend|suggest|which|where|start|books?|stage|next|read|reading|please|show|page|about|what)\b/.test(f)) return "en";
  // ı/ş/ğ azərbaycanca da var — türkcəni yalnız türkcə sözlərdən tanı
  if (/\b(?:tavsiye|hangi|kitap\w*|okuyayim|okumali|asama|sonraki|sayfa|nedir|yakinda|okuma|eser\w*|hakkinda)\b/.test(f)) return "tr";
  return "az";
}

function lastCtx(hist) {
  const list = Array.isArray(hist) ? hist : [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (!list[i] || list[i].role !== "assistant") continue;
    const t = String(list[i].text || "");
    const m = /^::ctx:: itbooks (rec|b) (\d) (\w+)$/m.exec(t);
    if (m) return { kind: m[1], stage: Number(m[2]), lang: T[m[3]] ? m[3] : null };
    const q = /^::ctx:: itbooks q (\d+) (\w+) (\S+)$/m.exec(t);
    if (q) return { kind: "q", offset: Number(q[1]), lang: T[q[2]] ? q[2] : null, key: q[3] };
    return null; // son köməkçi mesaj bu modula aid deyil
  }
  return null;
}

// ---------------------------------------------------------------- tövsiyə tanıma
const GEN_EXCL_LAT = /\b(?:nehv|nahv|sarf|serf|grammar\w*|gramer\w*|hedis\w*|hadis\w*|hadith\w*|tefsir\w*|tafsir\w*|fiqh\w*|fikih\w*|fəqih\w*|quran\w*|kuran\w*|kur'?an\w*|lugat\w*|luget\w*|dictionar\w*|usaq\w*|cocuk\w*|children\w*|kid\w*|kod\w*|code\w*|python\w*|javascript\w*|html|proqram\w*|program\w*|oyun\w*|game\w*|roman\w*|novel\w*|sir\w*|poem\w*|riyaziyyat\w*|math\w*|fizika|physics|kimya|chemistry|biologiya|biology|psixolog\w*|psycholog\w*|tarix\w*|tarih\w*|history|siyer|sira|biograph\w*|biyograf\w*|elm\w*|science|business|biznes|marketing|dil\w*|language\w*|english|ingilis\w*|turk\w*|rus\w*|bible|incil|tovrat|tora|falsefe\w*|philosoph\w*)\b/;
const GEN_EXCL_RU = /грамматик|хадис|тафсир|коран|фикх|словар|детск|код|программ|игр|роман|стих|математик|физик|истори|биограф|философ|английск|язык/i;
const GEN_EXCL_AR = /نحو|صرف|اعراب|حديث|احاديث|تفسير|قران|فقه|معجم|لغه|اطفال|برمجه|روايه|شعر|رياضيات|تاريخ|سيره|فلسفه|انجليزي/;
const REC_LAT = [
  /\bkita[bp]\w*\b.*\b(?:mesle?h[ae]t|tovsiy\w*|tavsiye|tosiye|oner\w*|recommend\w*)/,
  /\b(?:mesle?h[ae]t|tovsiy\w*|tavsiye|oner\w*)\b.*\bkita[bp]/,
  /\b(?:hansi|hangi)\s+(?:\w+\s+)?kita[bp]\w*\s*(?:\w+\s+)?(?:oxu\w*|oku\w*)/,
  /\b(?:hansi|hangi)\s+kita[bp]\w*/,
  /\bkita[bp]\w*\s+(?:oxu\w*|oku\w*)\b.*\b(?:hansi|hangi|nece|nasil)/,
  /\b(?:recommend\w*|suggest\w*)\b.*\b(?:books?|reading|read)\b/,
  /\b(?:books?|reading)\b.*\b(?:recommend\w*|suggest\w*)/,
  /\b(?:which|what)\s+(?:\w+\s+)?books?\b/,
  /\bwhat\s+(?:should|can|do)\s+i\s+read\b/,
  /\bwhere\s+(?:should\s+i|do\s+i|to|can\s+i)\s+(?:start|begin)\b/,
  /\b(?:nedən|neden|nereden|haradan|harada)\s+(?:başla\w*|basla\w*)/,
  /\bne\s+oku\w*\b/,
  /\bnə\s+oxu\w*\b/,
];
const REC_RU = [/(?:посоветуй|порекомендуй|рекомендуй|рекомендуете|посоветуете|подскажи)\w*.*книг/i, /книг\w*.*(?:посоветуй|порекомендуй|рекоменд)/i, /какие\s+(?:\w+\s+)?книги/i, /что\s+(?:почитать|читать)/i, /с\s+чего\s+начать/i, /какую\s+книгу/i];
const REC_AR = [/(?:انصح|تنصح|ننصح|رشح|ترشح|اقترح|توصي|اوصي|وصي|تنصحني)\S*.*(?:كتب|كتاب|اقرا)/, /(?:كتب|كتاب)\S*.*(?:تنصح|انصح|ترشح|اقترح|توصي|للقراءه)/, /(?:اي|ايه|ما|ماهي|ماهو)\s+(?:ال)?(?:كتب|كتاب)\S*.*(?:اقرا|اقرأ|تقرا|تنصح|ابدا)/, /ماذا\s+اقرا/, /بماذا\s+ابدا/, /من\s+اين\s+ابدا/];
const NEXT_RE = /(?:^|\s)(?:novbeti|sonraki|sonrakı|next|следующ\w*|التالي\w*|التاليه|الثاني\w*|ikinci)(?:\s|$)/;
const STAGE_WORD = /(?:merhele|marhale|asama|stage|level|этап|ступен\w*|مرحله|مراحل)/;

/** Mesajdan tövsiyə sorğusu: {kind:'rec', stage:null|1-4} | {kind:'next'} | null */
export function parseRecQuery(message, hist) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 200) return null;
  const plain = raw.replace(MARKS, "");
  const nplain = norm(plain);
  const f = foldLat(asciiDigits(raw));
  const name = hasName(raw, plain, f);
  const ctx = lastCtx(hist);
  const inRec = !!(ctx && (ctx.kind === "rec" || ctx.kind === "b"));
  // ---- mərhələ: «növbəti mərhələ», «3-cü mərhələ», «stage 2»
  const ar = asciiDigits(nplain);
  const hasStage = STAGE_WORD.test(f) || STAGE_WORD.test(raw.toLowerCase()) || STAGE_WORD.test(ar);
  // tək «3-cü mərhələ» / «növbəti mərhələ» / «stage 2» (saytda başqa mərhələli siyahı yoxdur)
  const bareStage = hasStage && raw.length <= 30 && raw.split(" ").length <= 3 && /^(?:\d\s*[-.]?\s*\S*\s*\S+|\S+\s*\d|\S+\s+\S+)$/.test(raw) && (/\d/.test(raw) || NEXT_RE.test(" " + f + " ") || /(?:novbeti|sonraki|next|следующ|التال)/.test(f + " " + raw.toLowerCase() + " " + ar));
  if (hasStage && (inRec || name || bareStage) && raw.length <= 80) {
    const mm = /(\d)\s*[-.]?\s*(?:ci|cu|cü|cı|inci|nci|üncü|uncu|ncu|st|nd|rd|th|й|-?я|-?й|ه)?\s*(?:merhele|marhale|asama|stage|level|этап|ступен|مرحل)/.exec(f + " " + ar) || /(?:merhele|marhale|asama|stage|level|этап|مرحل\w*)\s*(\d)/.exec(f + " " + ar) || /(?:stage|этап|مرحل\w*)\s*(\d)/i.exec(ar);
    if (mm && +mm[1] >= 1 && +mm[1] <= 4) return { kind: "rec", stage: +mm[1] };
    if (NEXT_RE.test(" " + f + " ") || NEXT_RE.test(" " + ar + " ") || /(?:novbeti|sonraki|next)/.test(f) || /следующ/.test(raw.toLowerCase()) || /التال/.test(ar)) return { kind: "next" };
  }
  const bookWord = BOOKCUE_LAT.test(f) || BOOKCUE_RU.test(raw) || BOOKCUE_AR.test(nplain);
  const hasAr = /[\u0621-\u064A]{2}/.test(raw);
  const recCue = REC_LAT.some((r) => r.test(f)) || REC_RU.some((r) => r.test(raw)) || (hasAr && REC_AR.some((r) => r.test(nplain)));
  if (name) {
    if (!bookWord && !recCue) return null;
    if (recCue) return { kind: "rec", stage: null };
    // «İbn Teymiyyənin kitabları» yalnız (qısa) → siyahı; ərəbcə axtarış sözü varsa axtarışdır
    const content = latKeyed(f).filter((x) => !/^(ibn|taimiia?|taimi\w*|teimi\w*|ai|in|ain|din|in)$/.test(x.k));
    const words = f.replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ").split(/\s+/).filter(Boolean).length;
    if (!hasAr && words <= 4 && bookWord) return { kind: "rec", stage: null };
    if (hasAr && words <= 4 && content.length <= 3 && !/[\u0621-\u064A]{2}/.test(raw.replace(NAME_AR, "").replace(/كتب|كتاب|رسائل|ابن|لابن|\s/g, ""))) return { kind: "rec", stage: null };
    return null;
  }
  // ümumi sorğu: başqa mövzu sözü (nəhv, hədis, təfsir, ...) olmamalıdır
  if (!recCue || raw.length > 100) return null;
  if (GEN_EXCL_LAT.test(f) || GEN_EXCL_RU.test(raw) || (hasAr && GEN_EXCL_AR.test(nplain))) return null;
  if (/[\u0621-\u064A]{2}/.test(raw) && !recCue) return null;
  return { kind: "rec", stage: null };
}

// ---------------------------------------------------------------- kitab sorğusu
/** Mesajdan kitab sorğusu: {mode:'book'|'page'|'search'|'all', slug?, vol?, page?, phrase?, alts?} | null */
export function parseBookQuery(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 300) return null;
  const plain = raw.replace(MARKS, "");
  const nplain = norm(plain);
  const f = foldLat(asciiDigits(raw));
  const name = hasName(raw, plain, f);
  const bookWord = BOOKCUE_LAT.test(f) || BOOKCUE_RU.test(raw) || BOOKCUE_AR.test(nplain);
  const fb = findBook(raw);
  if (fb) {
    const b = bySlug(fb.slug);
    const lex = isLexicalQuestion(raw) || /(?:^|\s)(?:معنى|معني|يعني|تعريف|مرادف)(?=\s|$)/.test(nplain);
    if (lex) return null;
    const words = (fb.ar ? arToks(raw) : latToks(raw)).length - fb.used.size;
    if (b.needCue && !(bookWord || (name && words <= 5) || (!fb.ar && fb.words >= 2))) return null;
    // sətir/ayə istinadı olan və kitab adı olmayan uzun suallar buraxılır
    if (!bookWord && !name && words > 6) return null;
    // ---- səhifə
    const ar = asciiDigits(nplain);
    let vol = null;
    let page = null;
    let m;
    if ((m = /(?:^|\s)(?:المجلد|مجلد|الجز|جز|ج)\s*[:.]?\s*(\d{1,2})(?!\d)/.exec(ar)) || (m = /\b(?:cild\w*|cilt\w*|volume|vol|jild|juz|cuz)\.?\s*[:.]?\s*(\d{1,2})(?!\d)/.exec(f)) || (m = /(?:том|т)\.?\s*(\d{1,2})(?!\d)/.exec(raw.toLowerCase()))) vol = Number(m[1]);
    if ((m = /(?:^|\s)(?:صفحه|الصفحه|ص)\s*[:.]?\s*(\d{1,4})(?!\d)/.exec(ar)) || (m = /\b(?:sehife\w*|sayfa\w*|page|pg|pp|p|s|ss)\.?\s*[:.]?\s*(\d{1,4})(?!\d)/.exec(f)) || (m = /(?:страница|стр|с)\.?\s*(\d{1,4})(?!\d)/.exec(raw.toLowerCase()))) page = Number(m[1]);
    if (page != null) return { mode: "page", slug: b.slug, vol: vol ?? 1, page };
    // ---- kitab daxilində axtarış (ərəbcə qalıq sözlər və ya latın mövzu)
    const toks = arToks(raw);
    const used = fb.ar ? fb.used : new Set();
    const resid = [];
    const rawWords = norm(raw).split(AR_SPLIT).filter(Boolean);
    // used indeksləri arToks ilə eyni sıradadır (hamısı Ərəb token): kitab/rəsalə sözləri də saydığımız indeks içindədir
    rawWords.forEach((w, i) => {
      if (fb.ar && used.has(i)) return;
      if (LEAD_NORM.has(w) || LEAD_NORM.has(arKey(w))) return;
      resid.push(w);
    });
    if (resid.length && /[\u0621-\u064A]{2}/.test(raw)) {
      // alias sözlərinin özü qalıqa düşməsin: «kitab»/«rəsalə» sözləri keyed-də atılır, onlar LEAD-dədir
      const phrase = resid.join(" ");
      if (tokens(phrase).length) return { mode: "search", slug: b.slug, phrase, alts: [phrase] };
    }
    if (!/[\u0621-\u064A]{2}/.test(raw)) {
      // latın/kiril: kitab adı və kömək sözlərindən başqa söz (mövzu) varsa kitab daxilində mövzu axtarışı
      const left = latToks(raw).filter((t, i) => !fb.used.has(i) && !ART.has(t) && !KITAB.has(t) && !FILL.has(t) && !NAME_TOK.test(t));
      if (left.length) {
        const ta = topicAlts(raw);
        if (ta.alts.length) return { mode: "search", slug: b.slug, phrase: ta.alts[0], alts: ta.alts };
      }
    }
    void toks;
    return { mode: "book", slug: b.slug };
  }
  // ---- bütün kitablarda axtarış: «كتب ابن تيمية …», «İbn Teymiyyənin kitablarında …»
  if (name && bookWord) {
    const hasAr = /[\u0621-\u064A]{2}/.test(raw);
    let alts = [];
    if (hasAr) {
      const qm = raw.match(/[«"“„'‘]([^«»"“”„'‘’]{2,200})[»"”“’']/);
      let words = qm && /[\u0621-\u064A]/.test(qm[1]) ? norm(qm[1]).split(AR_SPLIT).filter(Boolean) : norm(raw.replace(NAME_AR, " ")).split(AR_SPLIT).filter(Boolean);
      words = words.filter((w) => !LEAD_NORM.has(w) && !LEAD_NORM.has(arKey(w)) && !/^ل?(?:ال)?(?:كتب|كتاب|رسائل|ابن|تيمي[ةه])$/.test(w));
      const phrase = words.join(" ");
      if (tokens(phrase).length) alts = [phrase];
    } else {
      alts = topicAlts(raw).alts;
    }
    if (alts.length) return { mode: "all", phrase: alts[0], alts };
  }
  return null;
}

// ---------------------------------------------------------------- cavab hissələri
const b64u = (s) => Buffer.from(s, "utf8").toString("base64url");
const unb64u = (s) => Buffer.from(s, "base64url").toString("utf8");

function sugBlock(lead, chips) {
  const ch = chips.filter(Boolean);
  if (!ch.length) return "";
  return `::sug::\n${lead ? "::sl:: " + lead + "\n" : ""}${ch.map(([l, q]) => `::sb:: ${l} | ${q}`).join("\n")}\n::/sug::`;
}
const openQuery = (b) => `كتاب ${b.ar} لابن تيمية`;
const pageQuery = (b, vol, page) => `${openQuery(b)} ${vol !== 1 ? "ج " + vol + " " : ""}ص ${page}`;

function blockFor(p, label, ex, lang) {
  const b = bk(p.slug);
  const lines = ["::tafsir itbooks::", `::tl:: ${label}${b ? b.ar : p.slug} · ${pgLabel(p)}`];
  for (const ln of ex.text.split("\n")) if (ln.trim()) lines.push(ln);
  if (ex.cut) lines.push("::tv:: " + tx(lang).cut);
  for (const s of sourceLines(p)) lines.push("::src:: " + s);
  lines.push("::/tafsir::");
  return lines.join("\n");
}

async function render({ key, ids, offset, total, lang, head, scopeName }) {
  const idx = await loadIndex();
  const t = tx(lang);
  const sep = key.indexOf("|");
  const phrase = key.slice(sep + 1);
  const q = tokens(phrase);
  const termSet = new Set(q);
  const slice = ids.slice(offset, offset + PAGE);
  const out = [];
  if (head) out.push(head);
  for (let i = 0; i < slice.length; i++) {
    const p = await getPage(idx, slice[i]);
    out.push(blockFor(p, `${total > 1 ? offset + i + 1 + "/" + total + " · " : ""}`, excerpt(p.text, termSet, q), lang));
  }
  const bEnd = offset + slice.length;
  if (bEnd < ids.length) {
    const nb = Math.min(ids.length, bEnd + PAGE);
    out.push(`::sug::\n::sl:: ${t.sl}\n::sb:: ${t.more(bEnd + 1, nb, total)} | ${t.moreQ}\n::/sug::`);
  }
  out.push(`::ctx:: itbooks q ${bEnd} ${lang} ${b64u(key)}`);
  void scopeName;
  return out.join("\n\n").replace(/\n\n(::sug::|::ctx::)/g, "\n$1");
}

async function runSearch(phrase, scope, lang, alts) {
  const t = tx(lang);
  const b = scope ? bySlug(scope) : null;
  const nm = b ? bookName(b, lang) : "";
  const list = alts && alts.length ? alts : [phrase];
  for (const ph of list) {
    const r = await searchBooks(ph, scope);
    if (!r.list.length) continue;
    const q = ph.replace(/\s+/g, " ").trim();
    return render({ key: (scope || "*") + "|" + q, ids: r.list, offset: 0, total: r.total, lang, head: t.found(r.total, b ? (lang === "ar" ? b.ar : nm) : ""), scopeName: nm });
  }
  return t.none(phrase.replace(/\s+/g, " ").trim(), b ? (lang === "ar" ? b.ar : nm) : "");
}

async function runPage(slug, vol, page, lang) {
  const idx = await loadIndex();
  const t = tx(lang);
  const b = bySlug(slug);
  const bi = idx.bookIdx.get(slug);
  const nm = lang === "ar" ? b.ar : bookName(b, lang);
  const info = idx.books[bi];
  const d = idx.byPage.get(bi + ":" + vol + ":" + page);
  if (d == null) {
    let mn = Infinity;
    for (let i = info.first; i < info.first + info.count; i++) if (idx.pv[i] >= 1 && typeof idx.pp[i] === "number" && idx.pp[i] < mn) mn = idx.pp[i];
    return t.noPage(nm, mn, info.maxPage);
  }
  const p = await getPage(idx, d);
  const ex = excerpt(p.text, null, null, PAGE_MAX, PAGE_MAX);
  const chips = [];
  const prev = d > info.first ? d - 1 : null;
  const next = d < info.first + info.count - 1 ? d + 1 : null;
  if (prev != null) chips.push([t.prev(idx.pp[prev]), pageQuery(b, idx.pv[prev], idx.pp[prev])]);
  if (next != null) chips.push([t.next(idx.pp[next]), pageQuery(b, idx.pv[next], idx.pp[next])]);
  const out = [blockFor(p, "", ex, lang)];
  const sg = sugBlock(next == null ? t.lastPage : "", chips);
  if (sg) out.push(sg);
  out.push(`::ctx:: itbooks b ${b.stage} ${lang}`);
  return out.join("\n").replace(/\n(::ctx::)/, "\n$1");
}

async function runBook(slug, lang) {
  const t = tx(lang);
  const b = bySlug(slug);
  const nm = bookName(b, lang);
  if (!isAvailable(slug)) return t.soonBook(nm, b.stage) + `\n::ctx:: itbooks b ${b.stage} ${lang}`;
  const idx = await loadIndex();
  const bi = idx.bookIdx.get(slug);
  const info = idx.books[bi];
  // fihrist: bölmə başlıqları (ilk rast gəlinən səhifə ilə)
  const heads = [];
  const seenT = new Set();
  for (let d = info.first; d < info.first + info.count; d++) {
    const ti = idx.pt[d];
    const title = idx.titles[ti];
    if (!title || seenT.has(ti)) continue;
    seenT.add(ti);
    heads.push([title, `${volLabel(idx.pv[d])}ص ${idx.pp[d]}`]);
  }
  const shown = heads.length <= TOC_MAX ? heads : heads.filter((_, i) => i % Math.ceil(heads.length / TOC_MAX) === 0).slice(0, TOC_MAX);
  const body = [];
  if (shown.length) {
    body.push(t.toc);
    for (const [ti, pg] of shown) body.push(`• ${ti} (${pg})`);
    if (shown.length < heads.length) body.push("…");
  }
  const mainAt = info.main ?? info.first;
  const firstLabel = idx.pp[mainAt];
  const stt = STAGES[b.stage][lang] || STAGES[b.stage].az;
  const parts = [t.ovHead(nm, b.ar, b.stage, stt, info.count)];
  const desc = bookDesc(b, lang);
  if (desc) parts.push(desc);
  parts.push(t.ovSearch(b.ar));
  const lines = ["::tafsir itbooks::", `::tl:: ${b.ar} · ابن تيمية · ${info.count} ${lang === "ar" ? "صفحة" : "ص"}`];
  for (const l of body.length ? body : [b.ar]) lines.push(l);
  lines.push(`::src:: ابن تيمية، ${b.ar}${info.ed ? " (" + info.ed + ")" : ""}`);
  lines.push("::/tafsir::");
  const out = [parts.join("\n"), lines.join("\n"), sugBlock("", [[t.start(firstLabel), pageQuery(b, idx.pv[mainAt], firstLabel)], [t.list, SHORT_Q[lang] || SHORT_Q.az]])];
  out.push(`::ctx:: itbooks b ${b.stage} ${lang}`);
  return out.join("\n").replace(/\n\n(::sug::)/, "\n$1");
}

// ---------------------------------------------------------------- tövsiyə cavabı
const stageBooks = (s) => BOOKS.filter((b) => b.stage === s);
function stageText(s, lang, { detail }) {
  const t = tx(lang);
  const bs = stageBooks(s);
  const title = STAGES[s][lang] || STAGES[s].az;
  const lines = [t.recStage(s, title, bs[0].n, bs[bs.length - 1].n)];
  for (const b of bs) {
    const nm = lang === "ar" ? b.ar : `${bookName(b, lang)} (${b.ar})`;
    lines.push(`${b.n}. ${nm} — ${isAvailable(b.slug) ? "✓ " + t.avail : t.soon}`);
    if (detail) {
      const d = bookDesc(b, lang);
      if (d) lines.push("   " + d);
    }
  }
  return lines.join("\n");
}
function stageChips(s, lang) {
  return stageBooks(s)
    .filter((b) => isAvailable(b.slug))
    .map((b) => [`${b.n}. ${lang === "ar" ? b.ar : bookName(b, lang)}`, openQuery(b)]);
}
export function recommendReply(lang, stage = null) {
  const t = tx(lang);
  const out = [];
  if (stage == null) {
    out.push(t.recHead);
    for (let s = 1; s <= 4; s++) {
      out.push(stageText(s, lang, { detail: false }));
      const sg = sugBlock(t.recPick, stageChips(s, lang));
      if (sg) out.push(sg);
    }
    out.push(t.recMajmu);
    out.push(sugBlock("", [[t.majmu, MAJMU.query], [NEXT_Q[lang], NEXT_Q[lang]]]));
    out.push(t.recFoot);
    out.push(`::ctx:: itbooks rec 1 ${lang}`);
  } else {
    out.push(stageText(stage, lang, { detail: true }));
    const chips = stageChips(stage, lang);
    const sg = sugBlock(t.recPick, chips);
    if (sg) out.push(sg);
    out.push(t.recMajmu);
    const tail = [[t.majmu, MAJMU.query]];
    if (stage < 4) tail.push([NEXT_Q[lang], NEXT_Q[lang]]);
    out.push(sugBlock("", tail));
    out.push(`::ctx:: itbooks rec ${stage} ${lang}`);
  }
  return out.filter(Boolean).join("\n\n").replace(/\n\n(::sug::|::ctx::)/g, "\n$1");
}

async function moreReply(hist) {
  const c = lastCtx(hist);
  if (!c || c.kind !== "q") return null;
  const lang = c.lang || "az";
  const key = unb64u(c.key);
  const sep = key.indexOf("|");
  const scope = key.slice(0, sep) === "*" ? null : key.slice(0, sep);
  const phrase = key.slice(sep + 1);
  const r = await searchBooks(phrase, scope);
  if (c.offset >= r.list.length) return tx(lang).ended;
  return render({ key, ids: r.list, offset: c.offset, total: r.total, lang, head: "" });
}

const MORE_RE = /^\s*(?:daha\s+(?:cox|çox|fazla)(?:\s+(?:goster|göstər|göster))?|goster|göstər|show\s+more|more|next|davam|devam|ещ[её]|больше|дальше|المزيد|أكثر|اكثر|تابع)\s*[.!?]?\s*$/i;

/** İbn Teymiyyə kitabları: tövsiyə siyahısı, «növbəti mərhələ», kitab adı / səhifə / axtarış, «davam». Digər suallarda null. */
export async function itbooksReply(message, hist, opts = {}) {
  try {
    if (MORE_RE.test(String(message || ""))) {
      const r = await moreReply(hist);
      if (r) return r;
    }
    const rq = parseRecQuery(message, hist);
    if (rq) {
      const lang = langOf(message, hist);
      if (rq.kind === "next") {
        const c = lastCtx(hist);
        const cur = c && c.stage ? c.stage : 1;
        return cur >= 4 ? tx(lang).lastStage : recommendReply(lang, cur + 1);
      }
      return recommendReply(lang, rq.stage);
    }
    if (opts.skipBooks) return null;
    const q = parseBookQuery(message);
    if (!q) return null;
    const lang = langOf(message, hist);
    if (q.mode === "book") return await runBook(q.slug, lang);
    if (q.mode === "page") {
      if (!isAvailable(q.slug)) return await runBook(q.slug, lang);
      return await runPage(q.slug, q.vol, q.page, lang);
    }
    if (q.mode === "search") {
      if (!isAvailable(q.slug)) return await runBook(q.slug, lang);
      return await runSearch(q.phrase, q.slug, lang, q.alts);
    }
    if (q.mode === "all") return await runSearch(q.phrase, null, lang, q.alts);
  } catch (e) {
    if (process.env.ITBOOKS_DEBUG) console.error(e);
    return null;
  }
  return null;
}
