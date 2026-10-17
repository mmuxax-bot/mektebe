// GET /api/page?book=<id>&p=<n> — səhifə mətni (sözbəsöz), cild/səhifə etiketi, əvvəlki/növbəti
import { getPage } from "./_lib/library.js";
import { send, query, LONG } from "./_lib/http.js";

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  const q = query(req);
  try {
    // Məcmuul-fətava: ?book=majmu&vol=3&pg=10 (çap cildi və səhifəsi)
    const vp = q.vol != null && q.pg != null ? { vol: q.vol, pg: q.pg } : null;
    const out = await getPage(q.book, q.p, q.q, vp);
    if (!out) return send(res, 404, { error: "book_not_found" });
    if (out.error) return send(res, 404, out);
    send(res, 200, out, { cache: LONG });
  } catch (e) {
    send(res, 500, { error: "server_error" });
  }
}
