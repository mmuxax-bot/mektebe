// Nibras Library: kitab oxuyucusu üçün ortaq qat (katalog, səhifə, mündəricat, axtarış).
// Məlumat modulları (api/_itbooks, _nahw, _hadith, _fatawa) nibrascode/code-dan dəyişmədən köçürülüb; burada yalnız onların
// ixrac etdiyi funksiyalar (indeks, səhifə, axtarış) çağırılır. Mətn sözbəsöz qaytarılır, heç vaxt tərcümə olunmur.
import { brotliDecompressSync } from "node:zlib";
import * as IT from "../_itbooks.js";
import * as FT from "../_fatawa.js";
import * as HD from "../_hadith.js";
import * as NH from "../_nahw.js";
import { tokens as hTokens, tokenSpans as hSpans } from "../_hadith/tok.js";
import { tokens as nTokens, tokenSpans as nSpans } from "../_nahw/tok.js";
import { LOADERS as NH_LOADERS } from "../_nahw/loaders.js";
import { CATALOG } from "./catalog.js";
import { expandQuery } from "./qexpand.js";
import { foldLat } from "../_ayah.js";
import { checkExcerpt } from "../_nahw/guard.js";

export { CATALOG };

const BY_ID = new Map();
for (const s of CATALOG.sections) for (const g of s.groups) for (const b of g.books) BY_ID.set(b.id, { ...b, section: s.id });
export const bookMeta = (id) => BY_ID.get(String(id || "")) || null;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arNum = (n) => String(n).replace(/\d/g, (c) => AR_DIGITS[c]);

// ---------------------------------------------------------------- nəhv: kitab faylı (tənbəl, bir neçəsi yaddaşda)
const _nb = new Map();
function nahwBook(id) {
  if (!_nb.has(id)) {
    if (_nb.size >= 6) _nb.delete(_nb.keys().next().value);
    _nb.set(id, NH_LOADERS[id]().then((m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"))));
  }
  return _nb.get(id);
}
/** nəhv kitabının səhifələri [[səhifə, cild, başlıq, mətn]] (id: nh-<id>) */
export async function nahwPages(id) {
  const b = bookMeta(id);
  return b && b.kind === "nh" ? (await nahwBook(b.src)).p : [];
}
// _nahw.js-dəki postinq oxuyucusunun eyni nüsxəsi (orada ixrac olunmur)
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
function nahwPostings(idx, tok) {
  const off = idx.map.get(tok);
  if (off == null) return null;
  const pos = { p: off };
  readVarint(idx.blob, pos);
  const n = readVarint(idx.blob, pos);
  const pages = new Int32Array(n);
  const tf = new Uint8Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    prev += readVarint(idx.blob, pos);
    pages[i] = prev;
    tf[i] = readVarint(idx.blob, pos) >> 1;
  }
  return { pages, tf };
}

// ---------------------------------------------------------------- səhifə
const clampP = (p, total) => Math.min(Math.max(1, Math.floor(Number(p) || 1)), total);
const itVol = (v) => (v === 0 ? "المقدمة" : v > 0 ? "ج " + arNum(v) : "");

/** {book, p, total, ref, vol, page, title, head[], text, foot[], prev, next} */
export async function getPage(id, pIn, q = "") {
  // vurğulama sorğusu latın/kirildirsə (məs. «namaz»), ərəbcə ifadəyə çevrilir
  if (q && !/[\u0621-\u064A]/.test(q)) {
    const ex = expandQuery(q);
    const bk = bookMeta(id);
    q = (bk && bk.kind === "nh" ? ex.nahw[0] : ex.names[0] || ex.general[0]) || "";
  }
  const b = bookMeta(id);
  if (!b) return null;
  const p = clampP(pIn, b.pages);
  const out = { book: b.id, p, total: b.pages, prev: p > 1 ? p - 1 : null, next: p < b.pages ? p + 1 : null, head: [], foot: [] };
  if (b.kind === "it") {
    const idx = await IT.__loadIndex();
    const d = b.first + p - 1;
    const pg = await IT.getPage(idx, d);
    const multi = b.volumes > 1 || pg.vol === 0;
    Object.assign(out, { vol: pg.vol, page: pg.page, title: pg.title || "", text: pg.text || "", ref: (multi ? itVol(pg.vol) + "، " : "") + "ص " + arNum(pg.page) });
  } else if (b.kind === "majmu") {
    const idx = await FT.__loadIndex();
    const pg = await FT.getPage(idx, p - 1);
    Object.assign(out, { vol: pg.vol, page: pg.page, title: pg.title || "", volTitle: pg.volTitle || "", text: pg.text || "", ref: "ج " + arNum(pg.vol) + "، ص " + arNum(pg.page) + (pg.ap ? " (ملحق)" : "") });
  } else if (b.kind === "hd") {
    const idx = await HD.__loadIndex();
    const h = await HD.getHadith(idx, b.first + p - 1);
    // çapdakı kimi: yeni kitab/bab başlayanda besmələ, kitab və bab başlığı, tərcümə mətni (front); qalan hədislərdə bab başlığı (head)
    const front = (h.front || []).map(([k, t]) => ({ k, t }));
    Object.assign(out, {
      no: h.no,
      title: h.kitab || "",
      front,
      head: front.some((x) => x.k === "bab") ? [] : [h.bab].filter(Boolean),
      text: h.text || "",
      foot: [HD.gradeLine(h), HD.sourceLine(h)],
      ref: "رقم " + h.no,
    });
  } else if (b.kind === "nh") {
    const data = await nahwBook(b.src);
    const pg = data.p[p - 1] || [p, "", 0, ""];
    const vol = /^\d+$/.test(String(pg[1])) ? Number(pg[1]) : null;
    Object.assign(out, { vol, page: pg[0], title: data.t[pg[2]] || "", text: pg[3] || "", ref: (vol && b.volumes > 1 ? "ج " + arNum(vol) + "، " : "") + "ص " + arNum(pg[0]) });
  }
  // axtarışdan gələndə sözlərin yeri (mətn dəyişmir, yalnız [başlanğıc, son] aralıqları)
  q = String(q || "").slice(0, 200);
  if (q) {
    const nh = b.kind === "nh";
    const set = new Set((nh ? nTokens : hTokens)(q));
    if (set.size) out.hl = (nh ? nSpans : hSpans)(out.text).filter((x) => set.has(x.t)).slice(0, 200).map((x) => [x.start, x.end]);
  }
  return out;
}

// ---------------------------------------------------------------- mündəricat
const _toc = new Map();
function headingRuns(n, titleAt, volAt) {
  const items = [];
  let lastT = null;
  let lastV = null;
  for (let i = 0; i < n; i++) {
    const t = titleAt(i);
    const v = volAt ? volAt(i) : null;
    if (t && (t !== lastT || v !== lastV)) items.push({ t, p: i + 1, ...(v != null ? { v } : {}) });
    lastT = t;
    lastV = v;
  }
  return items;
}
/** {book, kind:"headings"|"volumes", items:[{t,p,v?}], volumes?:[{v,t,p,count}]} */
export async function getToc(id, volQ = null) {
  const b = bookMeta(id);
  if (!b) return null;
  const ck = b.id + "|" + (volQ || "");
  if (_toc.has(ck)) return _toc.get(ck);
  let out;
  if (b.kind === "it") {
    const idx = await IT.__loadIndex();
    const items = headingRuns(b.pages, (i) => idx.titles[idx.pt[b.first + i]], b.volumes > 1 ? (i) => idx.pv[b.first + i] : null);
    out = { book: b.id, kind: "headings", items };
  } else if (b.kind === "majmu") {
    const idx = await FT.__loadIndex();
    const volumes = idx.vols.map((v) => ({ v: v.n, t: v.title, p: v.first + 1, count: v.count }));
    if (volQ) {
      const v = idx.vols.find((x) => x.n === Number(volQ));
      if (!v) return null;
      const items = headingRuns(v.count, (i) => idx.titles[idx.pt[v.first + i]]).map((x) => ({ ...x, p: x.p + v.first, v: v.n })).filter((x, i) => !(i === 0 && /^الجزء/.test(x.t)));
      out = { book: b.id, kind: "headings", vol: v.n, items };
    } else out = { book: b.id, kind: "volumes", volumes };
  } else if (b.kind === "hd") {
    // kitab (bölmə) başlıqları əvvəlcədən hazırlanıb: api/_lib/hdtoc.js (node scripts/build-catalog.mjs)
    const { HD_TOC } = await import("./hdtoc.js");
    out = { book: b.id, kind: "headings", items: HD_TOC[b.id] || [] };
  } else if (b.kind === "nh") {
    const data = await nahwBook(b.src);
    out = { book: b.id, kind: "headings", items: headingRuns(data.p.length, (i) => data.t[data.p[i][2]], null) };
  }
  if (_toc.size > 60) _toc.delete(_toc.keys().next().value);
  _toc.set(ck, out);
  return out;
}

// ---------------------------------------------------------------- axtarış
const SNIP = 110;
function snippet(text, terms, spansFn, SNIP = 110) {
  const set = new Set(terms);
  const sp = spansFn(text);
  const hits = sp.filter((s) => set.has(s.t));
  if (!hits.length) return { s: text.slice(0, SNIP * 2).trim(), hl: [] };
  const c = hits[0];
  let a = Math.max(0, c.start - SNIP);
  let z = Math.min(text.length, c.end + SNIP);
  // söz ortasından kəsmə
  while (a > 0 && !/\s/.test(text[a - 1])) a--;
  while (z < text.length && !/\s/.test(text[z])) z++;
  const hl = hits.filter((h) => h.start >= a && h.end <= z).map((h) => [h.start - a + (a > 0 ? 1 : 0), h.end - a + (a > 0 ? 1 : 0)]);
  return { s: (a > 0 ? "…" : "") + text.slice(a, z).replace(/\n/g, " ") + (z < text.length ? "…" : ""), hl };
}

const PER = 20;
const RERANK = 40; // ilk N nəticə ifadə/yaxınlığa görə yenidən sıralanır

// ---- bölmələr üzrə xam siyahı + səhifə oxuyucu (mətn, istinad)
async function rawIt(q, b) {
  const idx = await IT.__loadIndex();
  const r = await IT.searchBooks(q, b ? b.src : null);
  return {
    list: r.list,
    tok: "h",
    async load(d) {
      const bk = bookMeta("it-" + idx.books[idx.pb[d]].slug);
      const pg = await IT.getPage(idx, d);
      return { book: bk.id, p: d - bk.first + 1, ref: (bk.volumes > 1 || pg.vol === 0 ? itVol(pg.vol) + "، " : "") + "ص " + arNum(pg.page), title: pg.title || "", text: pg.text };
    },
  };
}
async function rawMajmu(q) {
  const idx = await FT.__loadIndex();
  const r = await FT.searchFatawa(q);
  return {
    list: r.list,
    tok: "h",
    async load(d) {
      const pg = await FT.getPage(idx, d);
      return { book: "majmu", p: d + 1, ref: "ج " + arNum(pg.vol) + "، ص " + arNum(pg.page), title: pg.title || "", text: pg.text };
    },
  };
}
async function rawHd(q, b, nar) {
  const idx = await HD.__loadIndex();
  // rəvayətçi verilibsə: isnadında o olan hədislər (səhabə mövqeyi əvvəldə), mövzu ifadəsi ilə süzülmüş
  let list = nar ? await HD.narratorIds(nar, q) : (await HD.searchHadith(q)).list;
  if (b) list = list.filter((g) => g >= b.first && g < b.first + b.pages);
  return {
    list,
    tok: "h",
    async load(g) {
      const bi = idx.books.findIndex((x, i) => g >= x.start && (i === idx.books.length - 1 || g < idx.books[i + 1].start));
      const bk = bookMeta("hd-" + idx.books[bi].slug);
      const h = await HD.getHadith(idx, g);
      return { book: bk.id, p: g - bk.first + 1, ref: "رقم " + h.no, title: h.kitab || "", text: h.text };
    },
  };
}
// Nəhv kitablarının məlumatdakı sırası (sələf müəllifləri önə çəkilmiş sıra) — bərabər nəticədə üstünlük
const NH_ORDER = new Map();
CATALOG.sections.find((x) => x.id === "nahw")?.groups.forEach((g) => g.books.forEach((bk, i) => NH_ORDER.set(bk.id, i)));
async function rawNh(q, b) {
  const idx = await NH.__loadIndex();
  const terms = [...new Set(nTokens(q))];
  const empty = { list: [], tok: "n", load: async () => null };
  if (!terms.length) return empty;
  let lo = 0;
  let hi = idx.N;
  if (b) {
    lo = b.first;
    hi = b.first + b.pages;
  }
  const score = new Map();
  // Hər söz üçün postinqlər: söz özü + yapışan و/ف/ب/ل/ك önşəkilçisiz forması (birləşmə); indeksdə olmayan söz atılır
  const groups = [];
  for (const t of terms) {
    const forms = [t];
    if (/^[وفبلك]/.test(t) && t.length >= 4) forms.push(t.slice(1));
    const ps = forms.map((f) => nahwPostings(idx, f)).filter(Boolean);
    if (ps.length) groups.push(ps);
  }
  if (!groups.length) return empty;
  for (const [gi, ps] of groups.entries()) {
    const df = ps.reduce((a, x) => a + x.pages.length, 0);
    const idf = Math.log(1 + idx.N / df);
    for (const p of ps)
      for (let i = 0; i < p.pages.length; i++) {
        const g = p.pages[i];
        if (g < lo || g >= hi || !p.tf[i]) continue;
        const e = score.get(g) || { hit: new Set(), s: 0 };
        e.hit.add(gi);
        e.s += idf * (p.tf[i] * 2.2) / (p.tf[i] + 1.2 * (0.25 + (0.75 * (idx.dl[g] || 1)) / idx.avgdl));
        score.set(g, e);
      }
  }
  // qısa sorğuda bütün sözlər, uzun sorğuda ~3/4-ü
  const need = groups.length <= 2 ? groups.length : Math.ceil(groups.length * 0.75);
  // çox işlənən sözlərin (məs. «كان») postinqləri indeksdə məhduddur: ciddi kəsişmə boşdursa, ən azı bir söz kifayətdir;
  // ifadə/yaxınlıq yenidən sıralaması (runSection) sonra «كان وأخواتها» olan səhifələri önə çıxarır
  const strict = [...score.values()].some((e) => e.hit.size >= need);
  const list = [...score.entries()].filter(([, e]) => e.hit.size >= (strict ? need : 1)).sort((x, y) => y[1].hit.size - x[1].hit.size || y[1].s - x[1].s || x[0] - y[0]).map(([g]) => g);
  return {
    list,
    tok: "n",
    async load(g) {
      let bi = 0;
      while (bi + 1 < idx.books.length && idx.books[bi + 1].start <= g) bi++;
      const meta = idx.books[bi];
      const bk = bookMeta("nh-" + meta.id);
      const data = await nahwBook(meta.id);
      const pg = data.p[g - meta.start];
      if (!pg) return null;
      // sələf əqidəsinə zidd təvil (məs. «لن» əbədi inkar) rədd olmadan varsa, səhifə göstərilmir (api/_nahw/guard.js)
      if (!checkExcerpt(pg[3]).ok) return null;
      return { book: bk.id, p: g - meta.start + 1, ref: "ص " + arNum(pg[0]), title: data.t[pg[2]] || "", text: pg[3], ord: NH_ORDER.get(bk.id) ?? 999 };
    },
  };
}
const RAW = { "ibn-taymiyyah": rawIt, majmu: (q) => rawMajmu(q), hadith: rawHd, nahw: rawNh };

// ifadə dərəcəsi: 2 = sorğu ardıcıl ifadə kimi var, 1 = bütün sözlər 12 tokenlik pəncərədə, 0 = yalnız BM25
function tier(seq, qt) {
  if (qt.length < 2) return 0;
  for (let i = 0; i + qt.length <= seq.length; i++) {
    let ok = true;
    for (let j = 0; j < qt.length; j++) if (seq[i + j] !== qt[j]) { ok = false; break; }
    if (ok) return 2;
  }
  const want = new Set(qt);
  const pos = [];
  seq.forEach((t, i) => want.has(t) && pos.push(i));
  for (let i = 0; i < pos.length; i++) {
    const win = new Set();
    for (let k = i; k < pos.length && pos[k] - pos[i] <= 12; k++) win.add(seq[pos[k]]);
    if (win.size >= want.size) return 1;
  }
  return 0;
}

/** Bir bölmədə bir ərəbcə ifadə ilə axtarış: ifadə > yaxınlıq > BM25 sırası, səhifələnmiş nəticələr və «Kitabda aç» linki. */
async function runSection(sec, phrase, b, off, lim, radius = SNIP, nar = null) {
  const raw = await RAW[sec](phrase, b, nar);
  const tk = raw.tok === "n" ? nTokens : hTokens;
  const sp = raw.tok === "n" ? nSpans : hSpans;
  // yalnız rəvayətçi: sıra rəvayətçi sırasıdır (səhabə mövqeyi əvvəldə), vurğu adın üzərində
  const narOnly = nar && !phrase;
  const hlPhrase = narOnly ? nar.ar[0] : phrase;
  const qt = tk(hlPhrase);
  const head = [];
  for (const [i, d] of raw.list.slice(0, RERANK).entries()) {
    const r = await raw.load(d);
    if (!r) continue;
    // bölmə başlığı sorğunun özüdürsə (məs. «باب كان وأخواتها») ən yüksək dərəcə
    const tt = tk(r.title || "");
    const inTitle = qt.length && qt.every((t) => tt.includes(t));
    const seq = tk(r.text);
    // hədis siyahısı kitab sırasıdır (uyğunluq yox): orada söz sıxlığı ikinci meyar olur
    const tf = sec === "hadith" ? seq.filter((t) => qt.includes(t)).length / Math.sqrt(seq.length + 1) : 0;
    head.push({ ...r, rank: i, tf, tier: inTitle ? 3 : tier(seq, qt) });
  }
  // eyni dərəcədə: əvvəl uyğunluq sırası; nəhvdə məlumatdakı (sələf müəllifləri önə çəkilmiş) kitab sırası da az təsir edir
  const key = (r) => r.rank + (r.ord != null ? r.ord * 0.15 : 0);
  if (!narOnly) head.sort((x, y) => y.tier - x.tier || y.tf - x.tf || key(x) - key(y));
  const total = raw.list.length - (Math.min(raw.list.length, RERANK) - head.length);
  const out = [];
  for (let k = off; k < Math.min(off + lim, total); k++) {
    let r = head[k];
    if (!r) {
      if (k < RERANK) continue;
      r = await raw.load(raw.list[k]);
      if (!r) continue;
      r.tier = 0;
    }
    const { text, rank, ord, tf, ...rest } = r;
    out.push({ ...rest, ...snippet(text, qt, sp, radius), url: `/kitab/${encodeURIComponent(r.book)}?p=${r.p}&q=${encodeURIComponent(hlPhrase)}` });
  }
  return { total, results: out, via: hlPhrase, top: head.length ? head[0].tier : -1 };
}

/** Bir neçə ifadə variantını sınayır və ən yaxşısını seçir: əvvəl ən yüksək ifadə dərəcəsi, sonra variantın sırası (dəqiqdən ümumiyə). */
async function bestSection(sec, cands, b, off, lim, radius = SNIP, nar = null) {
  let best = null;
  for (const c of cands.slice(0, 4)) {
    const r = await runSection(sec, c, b, off, lim, radius, nar);
    if (!r.total) continue;
    if (!best || r.top > best.top) best = r;
    if (best.top === 2) break;
  }
  return best || { total: 0, results: [], via: cands[0] || "" };
}

function candsFor(sec, ex) {
  if (ex.arabic) return sec === "nahw" ? ex.nahw : ex.general;
  if (sec === "nahw") return ex.nahw;
  if (sec === "hadith") return [...ex.names, ...ex.general];
  if (sec === "majmu") return [...ex.general, ...ex.names];
  return ex.general;
}

// Latın adla kitab tapmaq (məs. «Vasitiyyə», «Ubudiyyə»): kataloq adları, hərf fərqlərinə dözümlü
function titleMatches(q) {
  const f = foldLat(q).replace(/[^a-z0-9\u0400-\u04FF\u0621-\u064A ]+/g, " ").trim();
  if (f.length < 4) return [];
  const sk = (x) => foldLat(x).replace(/[^a-z\u0621-\u064A]+/g, "").replace(/q/g, "k").replace(/x/g, "h").replace(/(.)\1+/g, "$1").replace(/[aeiouy]/g, "");
  const want = sk(f);
  if (want.length < 3) return [];
  const out = [];
  for (const [id, bk] of BY_ID) {
    const names = [bk.ar, ...Object.values(bk.name || {})].filter(Boolean);
    if (names.some((n) => sk(n).includes(want))) out.push({ book: id, url: `/kitab/${encodeURIComponent(id)}` });
    if (out.length >= 6) break;
  }
  return out;
}

// «Buxari 1», «Bukhari 7563», «صحيح البخاري ٣٠٠», «Müslim 8»: hədis nömrəsi — birbaşa o hədisin səhifəsi (Buxari: M. Fuad Əbdülbaqi nömrələməsi)
async function numberSection(q, b, off, lim) {
  const pn = HD.parseNumberQuery(q);
  if (!pn) return null;
  const idx = await HD.__loadIndex();
  const meta = idx.books.find((x) => x.id === pn.book);
  const bk = meta && bookMeta("hd-" + meta.slug);
  if (!bk || (b && b.id !== bk.id)) return null;
  const ids = await HD.numberIds(pn.book, pn.num);
  const results = [];
  for (const g of ids.slice(off, off + lim)) {
    const h = await HD.getHadith(idx, g);
    const p = g - meta.start + 1;
    results.push({ book: bk.id, p, ref: "رقم " + h.no, title: h.kitab || "", tier: 3, ...snippet(h.text, [], hSpans), url: `/kitab/${encodeURIComponent(bk.id)}?p=${p}` });
  }
  return { total: ids.length, results, via: "", top: ids.length ? 3 : -1, number: { book: bk.id, num: pn.num } };
}

// «Əbu Hureyrə namaz», «hadith of Ibn Umar about prayer», «حديث أبي هريرة في الصلاة»: hədis bölməsində rəvayətçi süzgəci.
//   Mövzu sözü varsa ifadə variantları rəvayətçinin hədisləri içində axtarılır; heç nə tapılmasa adi axtarışa qayıdılır (null).
async function narratorSection(q, b, off, lim) {
  const nq = HD.narratorQuery(q);
  if (!nq) return null;
  let cands = [""];
  if (nq.rest) {
    const ex = expandQuery(nq.rest);
    cands = candsFor("hadith", ex);
    if (!cands.length && !ex.arabic) cands = [...ex.general, ...ex.names];
    if (!cands.length) return null;
  }
  const r = await bestSection("hadith", cands, b, off, lim, SNIP, nq.nar);
  if (!r.total) return null;
  return { ...r, narrator: { id: nq.nar.id, name: nq.nar.name } };
}

/** Bir kitabda (book verilib) və ya bütün kitabxanada axtarış. q: ərəbcə söz/ifadə və ya az/tr/en/ru təbii sorğu. */
export async function search(q, id = null, off = 0, lim = PER) {
  q = String(q || "").trim().slice(0, 200);
  off = Math.max(0, Math.floor(Number(off) || 0));
  lim = Math.min(50, Math.max(1, Math.floor(Number(lim) || PER)));
  if (!q) return { q, total: 0, results: [] };
  const num = await numberSection(q, id ? bookMeta(id) : null, off, lim).catch(() => null);
  if (num) {
    if (id) return { q, book: id, offset: off, expanded: [], ...num };
    const order = ["ibn-taymiyyah", "majmu", "hadith", "nahw"];
    return { q, total: num.total, expanded: [], books: /[\u0621-\u064A]/.test(q) ? [] : titleMatches(q), sections: order.map((sid) => (sid === "hadith" ? { id: sid, ...num } : { id: sid, total: 0, results: [], via: "" })) };
  }
  const ex = expandQuery(q);
  const meta = { expanded: [...new Set([...ex.names, ...ex.general, ...ex.nahw])].slice(0, 8), ...(ex.corrected ? { corrected: ex.corrected } : {}) };
  if (id) {
    const b = bookMeta(id);
    if (!b) return null;
    const sec = b.kind === "it" ? "ibn-taymiyyah" : b.kind === "majmu" ? "majmu" : b.kind === "hd" ? "hadith" : "nahw";
    if (sec === "hadith") {
      const nr = await narratorSection(q, b, off, lim);
      if (nr) return { q, book: b.id, offset: off, ...meta, ...nr };
    }
    let cands = candsFor(sec, ex);
    if (!cands.length && !ex.arabic) cands = [...ex.general, ...ex.nahw, ...ex.names];
    const r = await bestSection(sec, cands, b, off, lim);
    return { q, book: b.id, offset: off, ...meta, ...r };
  }
  // bütün kitabxana: hər bölmədən ən uyğun nəticələr (sıra: İbn Teymiyyə, Məcmuul-fətava, hədis, nəhv)
  const per = Math.min(lim, 8);
  const order = ["ibn-taymiyyah", "majmu", "hadith", "nahw"];
  const res = await Promise.all(order.map(async (sec) => (sec === "hadith" && (await narratorSection(q, null, 0, per))) || bestSection(sec, candsFor(sec, ex), null, 0, per)));
  const sections = order.map((id, i) => ({ id, ...res[i] }));
  return { q, total: sections.reduce((a, s) => a + s.total, 0), ...meta, books: ex.arabic ? [] : titleMatches(q), sections };
}

/**
 * Nibras AI üçün kitabxana çıxarışları: hər bölmədən ən yaxşı 2 nəticə, daha uzun sözbəsöz pəncərə ilə.
 * Sıra: əvvəl ifadə dərəcəsi, sonra bölmə sırası (İbn Teymiyyə, Məcmuul-fətava, hədis, nəhv — sələf müəllifləri önə).
 * @returns {{ items: object[], best: number, expanded: string[], arabic: boolean, single: boolean }}
 */
export async function searchForChat(q, max = 5) {
  q = String(q || "").trim().slice(0, 300);
  const ex = expandQuery(q);
  const order = ["ibn-taymiyyah", "majmu", "hadith", "nahw"];
  const res = await Promise.all(order.map((sec) => bestSection(sec, candsFor(sec, ex), null, 0, 2, 380).catch(() => ({ total: 0, results: [] }))));
  const items = [];
  res.forEach((r, si) => (r.results || []).forEach((x, k) => items.push({ ...x, sec: order[si], via: r.via, si, k })));
  items.sort((a, b) => (b.tier || 0) - (a.tier || 0) || a.k - b.k || a.si - b.si);
  const top = items.slice(0, max).map((x) => {
    const bk = bookMeta(x.book);
    return { ...x, bookAr: bk ? bk.ar : x.book, author: bk ? bk.author : "" };
  });
  const via = top[0] ? top[0].via : "";
  return { items: top, best: top.length ? Math.max(...top.map((x) => x.tier || 0)) : -1, expanded: [...new Set([...ex.names, ...ex.general, ...ex.nahw])], arabic: ex.arabic, single: hTokens(via).length <= 1 };
}
