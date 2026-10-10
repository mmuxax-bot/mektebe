// «Kitabda aç»: Nibras AI cavabındakı sitat bloklarını (::tafsir itbooks|fatawa|hadith|nahw::) kitabxananın kitab id-si və səhifəsinə bağlayır.
// Bloklar cavabdakı sıra ilə qaytarılır: [{book, p, q} | null]. q — oxuyucuda vurğulanacaq axtarış sözləri (::ctx:: sətrindən və ya nəhv sorğusundan).
import * as IT from "../_itbooks.js";
import * as FT from "../_fatawa.js";
import * as HD from "../_hadith.js";
import * as NH from "../_nahw.js";
import { CATALOG, bookMeta, nahwPages } from "./library.js";
import { norm } from "../_hadith/tok.js";

const ascii = (s) => String(s || "").replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
const books = [];
for (const s of CATALOG.sections) for (const g of s.groups) for (const b of g.books) books.push(b);
const byAr = (kind, ar) => books.find((b) => b.kind === kind && b.ar === ar) || null;
const cleanTitle = (t) => String(t || "").replace(/\s+-\s+(?:ت|معها|ضمن|مع)\s.*$/, "").replace(/\s*=\s*.*$/, "").replace(/\s*-\s*ضمن\s.*$/, "").trim(); // _nahw.js ilə eyni
const HD_AUTHOR = Object.fromEntries(Object.entries(HD.BOOK_META).map(([id, m]) => [m.author, id]));

/** Cavab mətni -> bloklar [{kind, tl, src[]}] və ctx {mode, key} */
export function parseBlocks(text) {
  const out = [];
  let cur = null;
  for (const l of String(text || "").split("\n")) {
    let m;
    if ((m = l.match(/^::tafsir\s+(\S+)::$/))) cur = { kind: m[1], tl: "", src: [], body: [] };
    else if (l.trim() === "::/tafsir::" && cur) out.push(cur), (cur = null);
    else if (cur && (m = l.match(/^::tl::\s?(.*)$/))) cur.tl = m[1];
    else if (cur && (m = l.match(/^::src::\s?(.*)$/))) cur.src.push(m[1]);
    else if (cur && l.trim() && !/^::\w+::/.test(l)) cur.body.push(l);
  }
  const c = /^::ctx:: (?:hadith|fatawa|itbooks) (\w+) \d+ \w+ (\S+)$/m.exec(String(text || ""));
  let key = "";
  if (c && c[1] === "q") {
    try {
      key = Buffer.from(c[2], "base64url").toString("utf8").replace(/^[^|]*\|/, ""); // itbooks: «<kitab>|<ifadə>»
    } catch {}
  }
  return { blocks: out, key };
}

// «المقدمة، ص 5» / «ج 2، ص 345» / «ص 43» -> {vol, page}
function volPage(s) {
  const t = ascii(s);
  const pm = t.match(/ص\s*\(?(\d+)\)?/);
  if (!pm) return null;
  const vm = t.match(/ج\s*(\d+)/);
  return { vol: /المقدمة/.test(t) ? 0 : vm ? Number(vm[1]) : null, page: Number(pm[1]), ap: /ص\s*\(\d+\)/.test(t) };
}

async function itLink(blk) {
  // «<ad> · ابن تيمية · 109 ص» (kitab haqqında) və ya «[i/n · ]<ad> · [ج v، ]ص N»
  const parts = blk.tl.split(" · ").map((x) => x.trim());
  const isInfo = parts[1] === "ابن تيمية";
  const ar = isInfo ? parts[0] : parts[parts.length - 2];
  const b = byAr("it", ar);
  if (!b) return null;
  if (isInfo) return { book: b.id, p: b.start || 1 };
  const vp = volPage(parts[parts.length - 1]);
  if (!vp) return { book: b.id, p: 1 };
  const idx = await IT.__loadIndex();
  const bi = idx.bookIdx.get(b.src);
  let d = idx.byPage.get(bi + ":" + (vp.vol ?? 1) + ":" + vp.page);
  if (d == null) for (let i = b.first; i < b.first + b.pages; i++) if (idx.pp[i] === vp.page && (vp.vol == null || idx.pv[i] === vp.vol)) { d = i; break; }
  return d == null ? { book: b.id, p: 1 } : { book: b.id, p: d - b.first + 1 };
}
async function ftLink(blk) {
  const t = ascii(blk.tl);
  const vm = t.match(/المجلد\s*(\d+)/);
  const vp = volPage(t);
  if (!vm || !vp) return { book: "majmu", p: 1 };
  const idx = await FT.__loadIndex();
  const vol = Number(vm[1]);
  let d = vp.ap ? null : idx.byPage.get(vol + ":" + vp.page);
  if (d == null) for (let i = 0; i < idx.N; i++) if (idx.pv[i] === vol && idx.pp[i] === vp.page && !!idx.pa[i] === vp.ap) { d = i; break; }
  return d == null ? { book: "majmu", p: 1 } : { book: "majmu", p: d + 1 };
}
async function hdLink(blk) {
  // «i/n · البخاري · رقم 1»
  const parts = blk.tl.split(" · ").map((x) => x.trim());
  const bid = HD_AUTHOR[parts.find((x) => HD_AUTHOR[x])];
  const no = (parts.find((x) => /^رقم\s/.test(x)) || "").replace(/^رقم\s*/, "");
  if (!bid) return null;
  const idx = await HD.__loadIndex();
  const meta = idx.books.find((x) => x.id === bid);
  const b = bookMeta("hd-" + meta.slug);
  const { HD_NO } = await import("./hdno.js");
  const nos = HD_NO[b.id].split("\n");
  const want = ascii(no);
  const cand = [];
  for (let i = 0; i < nos.length; i++) if (nos[i] === want) cand.push(i);
  if (!cand.length) return { book: b.id, p: 1 };
  // eyni nömrəli bir neçə sətir (məs. Müslimdə rəvayət yolları): blokdakı mətnlə müqayisə
  if (cand.length > 1 && blk.body.length) {
    const sig = norm(blk.body.join(" ").replace(/^…|…$/g, "")).replace(/[^\u0621-\u064A]+/g, "").slice(0, 60);
    for (const i of cand) {
      const h = await HD.getHadith(idx, b.first + i);
      if (sig && norm(h.text).replace(/[^\u0621-\u064A]+/g, "").includes(sig)) return { book: b.id, p: i + 1 };
    }
  }
  return { book: b.id, p: cand[0] + 1 };
}
async function nhLink(blk) {
  // ::src:: «<müəllif>، <ad>، [ج v، ]ص N»
  const src = blk.src[0] || "";
  const b = books.find((x) => x.kind === "nh" && src.includes("، " + cleanTitle(x.ar) + "،"));
  if (!b) return null;
  const vp = volPage(src.slice(src.lastIndexOf(cleanTitle(b.ar)) + cleanTitle(b.ar).length));
  if (!vp) return { book: b.id, p: 1 };
  const pages = await nahwPages(b.id);
  let i = pages.findIndex((pg) => Number(ascii(pg[0])) === vp.page && (vp.vol == null || String(pg[1]) === String(vp.vol)));
  if (i < 0) i = pages.findIndex((pg) => Number(ascii(pg[0])) === vp.page);
  return { book: b.id, p: i >= 0 ? i + 1 : 1 };
}

/** reply -> [{book, p, q?} | null], hər blok üçün bir element */
export async function locateBlocks(reply, message = "") {
  const { blocks, key } = parseBlocks(reply);
  if (!blocks.length) return [];
  let nq = "";
  if (blocks.some((b) => b.kind === "nahw")) {
    try {
      const q = NH.parseNahwQuery(message);
      nq = q && q.terms ? q.terms.join(" ") : "";
    } catch {}
  }
  const out = [];
  for (const blk of blocks) {
    let r = null;
    try {
      if (blk.kind === "itbooks") r = await itLink(blk);
      else if (blk.kind === "fatawa") r = await ftLink(blk);
      else if (blk.kind === "hadith") r = await hdLink(blk);
      else if (blk.kind === "nahw") r = await nhLink(blk);
    } catch {
      r = null;
    }
    const q = blk.kind === "nahw" ? nq : key;
    out.push(r ? (q ? { ...r, q } : r) : null);
  }
  return out;
}
