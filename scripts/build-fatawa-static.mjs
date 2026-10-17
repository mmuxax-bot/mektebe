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
const blob = brotliDecompressSync(Buffer.from(m.default, "base64"));
const hl = blob.readUInt32LE(0);
const head = JSON.parse(blob.subarray(4, 4 + hl).toString("utf8"));
const shard = head.shard || 400;
const meta = { N: head.N, shard, vols: head.vols, titles: head.titles, pv: head.pv, pp: head.pp, pa: head.pa, pt: head.pt };
fs.writeFileSync(path.join(out, "meta.bin"), gz(Buffer.from(JSON.stringify(meta))));
// indeks: başlıqdan təkrarlanan meta sahələri atılır (yalnız vocab və N qalır)
const ihead = Buffer.from(JSON.stringify({ N: head.N, vocab: head.vocab }));
const len = Buffer.alloc(4);
len.writeUInt32LE(ihead.length, 0);
fs.writeFileSync(path.join(out, "idx.bin"), gz(Buffer.concat([len, ihead, blob.subarray(4 + hl)])));
const shards = Math.ceil(head.N / shard);
for (let s = 0; s < shards; s++) {
  const mm = await import(path.join(root, `api/_fatawa/books/f_${s}.js`));
  fs.writeFileSync(path.join(out, `p_${s}.bin`), gz(brotliDecompressSync(Buffer.from(mm.default, "base64"))));
}
let total = 0;
for (const f of fs.readdirSync(out)) total += fs.statSync(path.join(out, f)).size;
console.log(`fatawa static: ${shards} hissə, ${(total / 1048576).toFixed(1)} MB -> ${path.relative(root, out)}`);
