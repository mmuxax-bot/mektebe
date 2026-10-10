// GET /api/books — kitabxana kataloqu (bölmələr, qruplar, kitablar)
import { CATALOG } from "./_lib/catalog.js";
import { send, LONG } from "./_lib/http.js";
import { EDITION } from "./_hadith/edition.js";

// hədis kitablarına çap/nömrələmə qeydi (oxucuda başlığın altında kiçik sətir); kataloq faylı dəyişmir
const OUT = JSON.parse(JSON.stringify(CATALOG));
for (const s of OUT.sections)
  for (const g of s.groups || [])
    for (const b of g.books || []) {
      const m = b.kind === "hd" && /book\/(\d+)/.exec(b.srcUrl || "");
      if (m && EDITION[m[1]]) b.edNote = EDITION[m[1]];
    }

export default function handler(req, res) {
  send(res, 200, OUT, { cache: LONG });
}
