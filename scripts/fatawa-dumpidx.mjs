import fs from "node:fs"; import { gunzipSync } from "node:zlib";
let b = fs.readFileSync("/workspace/mektebe/public/fatawa/data/idx.bin"); try { b = gunzipSync(b); } catch {}
const hl = b.readUInt32LE(0); const h = JSON.parse(b.subarray(4, 4 + hl)); const body = b.subarray(4 + hl);
let p = 0; const rv = () => { let n = 0, m = 1, x; do { x = body[p++]; n += (x & 127) * m; m *= 128; } while (x & 128); return n; };
const out = []; const lens = [];
for (let d = 0; d < h.N; d++) { const n = rv(); lens.push(n); for (let i = 0; i < n; i++) out.push(rv()); }
fs.writeFileSync("tok.u32", Buffer.from(new Uint32Array(out).buffer)); fs.writeFileSync("lens.json", JSON.stringify(lens));
fs.writeFileSync("vocab.txt", h.vocab); console.log(h.N, out.length, p, body.length);
