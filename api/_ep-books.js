// GET /api/books — kitabxana kataloqu (bölmələr, qruplar, kitablar)
import { CATALOG } from "./_lib/catalog.js";
import { send, LONG } from "./_lib/http.js";
import { EDITION } from "./_hadith/edition.js";

const HD_ID = { bukhari: "735", muslim: "1727", abudawud: "117359", tirmidhi: "1363", nasai: "1339", ibnmajah: "1194" };
// hədis kitablarına çap/nömrələmə qeydi (oxucuda başlığın altında kiçik sətir); kataloq faylı dəyişmir
const OUT = JSON.parse(JSON.stringify(CATALOG));
for (const s of OUT.sections)
  for (const g of s.groups || [])
    for (const b of g.books || []) {
      const id = b.kind === "hd" && HD_ID[b.src];
      if (id && EDITION[id]) b.edNote = EDITION[id];
    }

export default function handler(req, res) {
  send(res, 200, OUT, { cache: LONG });
}
