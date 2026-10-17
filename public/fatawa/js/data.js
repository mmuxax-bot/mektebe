// Məcmuul-fətava: statik məlumat (data/*.bin, gzip). Heç bir server funksiyası lazım deyil; fayllar qovluğun özündədir.
const BASE = new URL("../data/", import.meta.url);

async function bin(name) {
  const r = await fetch(new URL(name, BASE));
  if (!r.ok) throw new Error("HTTP " + r.status);
  const u = new Uint8Array(await r.arrayBuffer());
  // server/brauzer artıq açıbsa (Content-Encoding), olduğu kimi qalır
  if (u[0] !== 0x1f || u[1] !== 0x8b) return u;
  const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}
export const binFile = bin;
const json = async (name) => JSON.parse(new TextDecoder().decode(await bin(name)));

let _meta = null;
/** {N, shard, vols:[{n,title,first,count,maxPage}], titles[], pv[], pp[], pa[], pt[]} */
export function meta() {
  if (!_meta) _meta = json("meta.bin").catch((e) => ((_meta = null), Promise.reject(e)));
  return _meta;
}
const _sh = new Map();
function shard(s) {
  if (!_sh.has(s)) {
    if (_sh.size >= 8) _sh.delete(_sh.keys().next().value);
    _sh.set(s, json(`p_${s}.bin`).catch((e) => (_sh.delete(s), Promise.reject(e))));
  }
  return _sh.get(s);
}
/** d: 0-dan başlayan səhifə sırası -> {d, vol, page, ap, title, text, volStart, startTitle} */
export async function page(d) {
  const m = await meta();
  if (d < 0 || d >= m.N) return null;
  const sh = await shard(Math.floor(d / m.shard));
  const v = m.vols.find((x) => x.n === m.pv[d]);
  const title = m.titles[m.pt[d]] || "";
  return {
    d,
    vol: m.pv[d],
    page: m.pp[d],
    ap: !!m.pa[d],
    title: /^الجزء/.test(title) && v ? v.title : title,
    volTitle: v ? v.title : "",
    text: sh[d % m.shard] || "",
    volStart: !!v && v.first === d,
    startTitle: d > 0 && m.pt[d] !== m.pt[d - 1] && !(v && v.first === d) ? title : "",
  };
}
export const prefetch = async (d) => {
  const m = await meta();
  if (d >= 0 && d < m.N) shard(Math.floor(d / m.shard)).catch(() => {});
};

// Başlıq növü: q = sual (سئل/مسألة), f = fəsil, b = bab/kitab/qaidə/risalə, t = digər mövzu başlığı
export const headKind = (t) => (/^(سئل|وسئل|مسألة|مسائل|سؤال)/.test(t) ? "q" : /^(فصل|فصول)/.test(t) ? "f" : /^(باب|كتاب|قاعدة|رسالة)/.test(t) ? "b" : "t");

/** Cildin mündəricatı: [{t, d, pg, k}] (səhifədə başlıq dəyişəndə) */
export async function volToc(n) {
  const m = await meta();
  const v = m.vols.find((x) => x.n === n);
  if (!v) return null;
  const items = [];
  for (let d = v.first; d < v.first + v.count; d++) {
    if (d > v.first && m.pt[d] === m.pt[d - 1]) continue;
    const t = m.titles[m.pt[d]];
    if (!t || /^الجزء/.test(t)) continue;
    items.push({ t, d, pg: m.pp[d], ap: !!m.pa[d], k: headKind(t) });
  }
  return items;
}
export async function headCount(n) {
  return ((await volToc(n)) || []).length;
}

/** Cild + çap səhifəsi -> d (tam uyğunluq yoxdursa, həmin cilddə ondan sonrakı ilk səhifə) */
export async function resolve(vol, pg) {
  const m = await meta();
  const v = m.vols.find((x) => x.n === Number(vol));
  pg = Math.floor(Number(pg));
  if (!v || !(pg >= 1)) return null;
  for (let d = v.first; d < v.first + v.count; d++) if (!m.pa[d] && Number(m.pp[d]) === pg) return d;
  for (let d = v.first; d < v.first + v.count; d++) if (!m.pa[d] && Number(m.pp[d]) > pg) return d;
  return v.first + v.count - 1;
}
