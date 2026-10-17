// Məcmuul-fətava üçün müstəqil statik paket: public/fatawa/data/*.bin (gzip). Mənbə: api/_fatawa (eyni mətn, eyni indeks).
//   meta.bin  : {N, shard, vols, titles, pv, pp, pa, pt} (JSON, gzip)
//   idx.bin   : axtarış indeksi (api/_fatawa/index.js ilə eyni ikili format: 4 bayt başlıq uzunluğu + JSON başlıq + varint token ardıcıllığı), gzip
//   p_<n>.bin : 400 səhifəlik mətn hissəsi (JSON massiv), gzip
// İşlətmək: node scripts/build-fatawa-static.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync, gzipSync, constants } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/fatawa/data");
fs.mkdirSync(out, { recursive: true });
const gz = (b) => gzipSync(b, { level: constants.Z_BEST_COMPRESSION });
const m = await import(path.join(root, "api/_fatawa/index.js"));
const { tokens } = await import(path.join(root, "api/_hadith/tok.js"));
// Mətn düzəlişləri (yalnız statik paket üçün; api/_fatawa və söhbət cavabları toxunulmur): scripts/fatawa-fixes.json
// Hər düzəliş dəqiq yoxlanılır: «frm» səhifədə tam bir dəfə olmalıdır, əks halda qurma dayanır.
const FIXES = JSON.parse(fs.readFileSync(path.join(root, "scripts/fatawa-fixes.json"), "utf8")).fixes;
const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
const hl = blob.readUInt32LE(0);
const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
const shard = head.shard || 400;
// bütün səhifələr (düzəliş üçün)
const shards = Math.ceil(head.N / shard);
const pages = [];
for (let s = 0; s < shards; s++) {
  const mm = await import(path.join(root, `api/_fatawa/books/f_${s}.js`));
  pages.push(...JSON.parse(brotliDecompressSync(Buffer.from(mm.default, "base64")).toString("utf8")));
}
if (pages.length !== head.N) throw new Error(`səhifə sayı ${pages.length} != ${head.N}`);
const changed = new Set();
for (const f of FIXES) {
  const t = pages[f.d];
  const at = t.indexOf(f.frm);
  if (at < 0 || t.indexOf(f.frm, at + 1) >= 0) throw new Error(`düzəliş tapılmadı/təkrar: d=${f.d}`);
  if (f.kind === "dup-start") {
    if (at !== 0) throw new Error(`dup-start səhifə əvvəlində deyil: d=${f.d}`);
    if (!pages[f.d - 1].replace(/\s+/g, " ").trimEnd().endsWith(f.frm.trim())) throw new Error(`əvvəlki səhifə bu mətnlə bitmir: d=${f.d}`);
  }
  pages[f.d] = t.slice(0, at) + f.to + t.slice(at + f.frm.length);
  changed.add(f.d);
}
const meta = { N: head.N, shard, vols: head.vols, titles: head.titles, pv: head.pv, pp: head.pp, pa: head.pa, pt: head.pt };
fs.writeFileSync(path.join(out, "meta.bin"), gz(Buffer.from(JSON.stringify(meta))));
// indeks: başlıqdan təkrarlanan meta sahələri atılır (yalnız vocab və N qalır)
const ihead = Buffer.from(JSON.stringify({ N: head.N, vocab: head.vocab }));
const len = Buffer.alloc(4);
len.writeUInt32LE(ihead.length, 0);
// indeks: dəyişən səhifələrin token ardıcıllığı yenidən qurulur (format: hər səhifə üçün varint say + varint token id-ləri)
const vocab = head.vocab.split("\n");
const vmap = new Map(vocab.map((v, i) => [v, i]));
const body = blob.subarray(4 + hl);
const outv = [];
const wv = (n) => { while (n >= 128) { outv.push((n & 127) | 128); n = Math.floor(n / 128); } outv.push(n); };
let p = 0;
const rv = () => { let n = 0, mul = 1, b; do { b = body[p++]; n += (b & 127) * mul; mul *= 128; } while (b & 128); return n; };
for (let d = 0; d < head.N; d++) {
  const n = rv();
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(rv());
  if (changed.has(d)) {
    const was = tokens(pages[d] === undefined ? "" : pages[d]);
    const nid = was.map((t) => vmap.get(t));
    if (nid.some((x) => x === undefined)) throw new Error(`indeksdə olmayan token: d=${d}`);
    wv(nid.length); nid.forEach(wv);
  } else { wv(n); ids.forEach(wv); }
}
if (p !== body.length) throw new Error("indeks oxunuşu uyğunsuz");
fs.writeFileSync(path.join(out, "idx.bin"), gz(Buffer.concat([len, ihead, Buffer.from(outv)])));
for (let s = 0; s < shards; s++) fs.writeFileSync(path.join(out, `p_${s}.bin`), gz(Buffer.from(JSON.stringify(pages.slice(s * shard, (s + 1) * shard)))));
console.log(`düzəlişlər: ${FIXES.length} (səhifələr: ${[...changed].join(", ")})`);
let total = 0;
for (const f of fs.readdirSync(out)) total += fs.statSync(path.join(out, f)).size;
console.log(`fatawa static: ${shards} hissə, ${(total / 1048576).toFixed(1)} MB -> ${path.relative(root, out)}`);
