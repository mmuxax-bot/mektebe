// GET /api/books — kitabxana kataloqu (bölmələr, qruplar, kitablar)
import { CATALOG } from "./_lib/catalog.js";
import { send, LONG } from "./_lib/http.js";

export default function handler(req, res) {
  send(res, 200, CATALOG, { cache: LONG });
}
