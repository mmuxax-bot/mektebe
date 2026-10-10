// Sıxılmış təfsir faylını açır: base64 -> brotli -> JSON. Hər surə yalnız tələb olunanda yüklənir.
import { brotliDecompressSync } from "node:zlib";
export function unpack(b64) {
  return JSON.parse(brotliDecompressSync(Buffer.from(b64, "base64")).toString("utf8"));
}
