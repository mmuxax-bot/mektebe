// GET /api/page?book=<id>&p=<n> — səhifə mətni (sözbəsöz), cild/səhifə etiketi, əvvəlki/növbəti
import { getPage } from "./_lib/library.js";
import { send, query, LONG } from "./_lib/http.js";

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  const q = query(req);
  try {
    const out = await getPage(q.book, q.p, q.q);
    if (!out) return send(res, 404, { error: "book_not_found" });
    send(res, 200, out, { cache: LONG });
  } catch (e) {
    send(res, 500, { error: "server_error" });
  }
}
