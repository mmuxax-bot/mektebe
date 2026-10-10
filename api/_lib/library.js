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
    Object.assign(out, {
      no: h.no,
      title: h.kitab || "",
      head: [h.bab].filter(Boolean),
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
function snippet(text, terms, spansFn) {
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
async function searchIt(q, b, off, lim) {
  const idx = await IT.__loadIndex();
  const r = await IT.searchBooks(q, b ? b.src : null);
  const list = r.list;
  const terms = hTokens(q);
  const out = [];
  for (const d of list.slice(off, off + lim)) {
    const bk = bookMeta("it-" + idx.books[idx.pb[d]].slug);
    const pg = await IT.getPage(idx, d);
    out.push({ book: bk.id, p: d - bk.first + 1, ref: (bk.volumes > 1 || pg.vol === 0 ? itVol(pg.vol) + "، " : "") + "ص " + arNum(pg.page), title: pg.title || "", ...snippet(pg.text, terms, hSpans) });
  }
  return { total: list.length, results: out };
}
async function searchMajmu(q, off, lim) {
  const idx = await FT.__loadIndex();
  const r = await FT.searchFatawa(q);
  const terms = hTokens(q);
  const out = [];
  for (const d of r.list.slice(off, off + lim)) {
    const pg = await FT.getPage(idx, d);
    out.push({ book: "majmu", p: d + 1, ref: "ج " + arNum(pg.vol) + "، ص " + arNum(pg.page), title: pg.title || "", ...snippet(pg.text, terms, hSpans) });
  }
  return { total: r.list.length, results: out };
}
async function searchHd(q, b, off, lim) {
  const idx = await HD.__loadIndex();
  const r = await HD.searchHadith(q);
  let list = r.list;
  if (b) list = list.filter((g) => g >= b.first && g < b.first + b.pages);
  const terms = hTokens(q);
  const out = [];
  for (const g of list.slice(off, off + lim)) {
    const bi = idx.books.findIndex((x, i) => g >= x.start && (i === idx.books.length - 1 || g < idx.books[i + 1].start));
    const bk = bookMeta("hd-" + idx.books[bi].slug);
    const h = await HD.getHadith(idx, g);
    out.push({ book: bk.id, p: g - bk.first + 1, ref: "رقم " + h.no, title: h.kitab || "", ...snippet(h.text, terms, hSpans) });
  }
  return { total: list.length, results: out };
}
async function searchNh(q, b, off, lim) {
  const idx = await NH.__loadIndex();
  const terms = [...new Set(nTokens(q))];
  if (!terms.length) return { total: 0, results: [] };
  let lo = 0;
  let hi = idx.N;
  if (b) {
    lo = b.first;
    hi = b.first + b.pages;
  }
  const score = new Map();
  for (const t of terms) {
    const ps = nahwPostings(idx, t);
    if (!ps) return { total: 0, results: [] }; // bütün sözlər olmalıdır
    const idf = Math.log(1 + idx.N / ps.pages.length);
    for (let i = 0; i < ps.pages.length; i++) {
      const g = ps.pages[i];
      if (g < lo || g >= hi || !ps.tf[i]) continue;
      const e = score.get(g) || { n: 0, s: 0 };
      e.n++;
      e.s += idf * (ps.tf[i] * 2.2) / (ps.tf[i] + 1.2 * (0.25 + (0.75 * (idx.dl[g] || 1)) / idx.avgdl));
      score.set(g, e);
    }
  }
  const list = [...score.entries()].filter(([, e]) => e.n === terms.length).sort((x, y) => y[1].s - x[1].s || x[0] - y[0]).map(([g]) => g);
  const out = [];
  for (const g of list.slice(off, off + lim)) {
    let bi = 0;
    while (bi + 1 < idx.books.length && idx.books[bi + 1].start <= g) bi++;
    const meta = idx.books[bi];
    const bk = bookMeta("nh-" + meta.id);
    const data = await nahwBook(meta.id);
    const pg = data.p[g - meta.start];
    if (!pg) continue;
    out.push({ book: bk.id, p: g - meta.start + 1, ref: "ص " + arNum(pg[0]), title: data.t[pg[2]] || "", ...snippet(pg[3], terms, nSpans) });
  }
  return { total: list.length, results: out };
}

/** Bir kitabda (book verilib) və ya bütün kitabxanada axtarış. q ərəbcə söz/ifadədir. */
export async function search(q, id = null, off = 0, lim = PER) {
  q = String(q || "").trim().slice(0, 200);
  off = Math.max(0, Math.floor(Number(off) || 0));
  lim = Math.min(50, Math.max(1, Math.floor(Number(lim) || PER)));
  if (!q) return { q, total: 0, results: [] };
  if (id) {
    const b = bookMeta(id);
    if (!b) return null;
    const r = b.kind === "it" ? await searchIt(q, b, off, lim) : b.kind === "majmu" ? await searchMajmu(q, off, lim) : b.kind === "hd" ? await searchHd(q, b, off, lim) : await searchNh(q, b, off, lim);
    return { q, book: b.id, offset: off, ...r };
  }
  // bütün kitabxana: hər bölmədən ən uyğun nəticələr
  const per = Math.min(lim, 8);
  const [it, mj, hd, nh] = await Promise.all([searchIt(q, null, 0, per), searchMajmu(q, 0, per), searchHd(q, null, 0, per), searchNh(q, null, 0, per)]);
  const sections = [
    { id: "ibn-taymiyyah", ...it },
    { id: "majmu", ...mj },
    { id: "hadith", ...hd },
    { id: "nahw", ...nh },
  ];
  return { q, total: sections.reduce((a, s) => a + s.total, 0), sections };
}
