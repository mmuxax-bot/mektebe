// Hədis məlumatı qurucusu: node scripts/build-hadith.mjs <giriş qovluğu>
//   Giriş: <id>.json — sətirlər [kitab, bab, nömrə, nömrə_int, hökm, mətn, mənbə, meta?]
//     meta (istəyə bağlı): {f: [[növ, mətn]...] (çapdakı kimi hədisdən əvvəlki başlıqlar/tərcümə: basmala|kitab|bab|text),
//                           x: [əlavə nömrələr] (bir hədisə düşən bir neçə Fuad nömrəsi), bg: "əl-Buğa nömrəsi"}
//   Çıxış: api/_hadith/books/h<id>_<n>.js (300 sətirlik hissələr), api/_hadith/loaders.js, api/_hadith/index.js (lüğət + token ardıcıllığı)
import fs from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { fileURLToPath } from "node:url";
import { tokens } from "../api/_hadith/tok.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IN = process.argv[2];
if (!IN) throw new Error("usage: node scripts/build-hadith.mjs <input dir>");
const BOOKS = [
  ["735", "bukhari"],
  ["1727", "muslim"],
  ["117359", "abudawud"],
  ["1363", "tirmidhi"],
  ["1339", "nasai"],
  ["1194", "ibnmajah"],
];
const SHARD = 300;
const br = (buf) => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).toString("base64");
const dir = path.join(root, "api/_hadith/books");
for (const f of fs.readdirSync(dir)) if (/^h\d+_\d+\.js$/.test(f)) fs.unlinkSync(path.join(dir, f));

const books = [];
const docs = [];
let start = 0;
const loaders = [];
for (const [id, slug] of BOOKS) {
  const rows = JSON.parse(fs.readFileSync(path.join(IN, id + ".json"), "utf8"));
  const shards = Math.ceil(rows.length / SHARD);
  loaders.push(`  "${id}": [\n` + Array.from({ length: shards }, (_, s) => `    () => import("./books/h${id}_${s}.js"),`).join("\n") + "\n  ],");
  for (let s = 0; s < shards; s++) {
    const part = rows.slice(s * SHARD, (s + 1) * SHARD);
    fs.writeFileSync(path.join(dir, `h${id}_${s}.js`), `// Avtomatik: node scripts/build-hadith.mjs (${slug}, hissə ${s}). [[kitab, bab, nömrə, nömrə_int, hökm, mətn, mənbə, meta]] (brotli+base64 JSON)\nexport default "${br(Buffer.from(JSON.stringify(part), "utf8"))}";\n`);
  }
  for (const r of rows) docs.push(tokens(r[5]));
  books.push({ id, slug, start, n: rows.length, shards });
  start += rows.length;
}
fs.writeFileSync(path.join(root, "api/_hadith/loaders.js"), `// Avtomatik: node scripts/build-hadith.mjs. Hər hissə yalnız lazım olanda dinamik yüklənir.\nexport const SHARD = ${SHARD};\nexport const LOADERS = {\n${loaders.join("\n")}\n};\n`);

// lüğət: tezliyə görə (çox işlənən söz kiçik id)
const freq = new Map();
for (const d of docs) for (const t of d) freq.set(t, (freq.get(t) || 0) + 1);
const vocab = [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a) || (a < b ? -1 : a > b ? 1 : 0));
const vid = new Map(vocab.map((t, i) => [t, i]));
const head = Buffer.from(JSON.stringify({ N: docs.length, books, vocab: vocab.join("\n") }), "utf8");
const parts = [];
const hl = Buffer.alloc(4);
hl.writeUInt32LE(head.length, 0);
parts.push(hl, head);
const vb = [];
const varint = (n) => {
  do {
    let b = n & 127;
    n = Math.floor(n / 128);
    if (n) b |= 128;
    vb.push(b);
  } while (n);
};
for (const d of docs) {
  varint(d.length);
  for (const t of d) varint(vid.get(t));
}
parts.push(Buffer.from(vb));
fs.writeFileSync(path.join(root, "api/_hadith/index.js"), `// Avtomatik: node scripts/build-hadith.mjs. Axtarış indeksi: lüğət + hədis başına token-id ardıcıllığı (brotli+base64)\nexport default "${br(Buffer.concat(parts))}";\n`);
console.log(JSON.stringify(books));
