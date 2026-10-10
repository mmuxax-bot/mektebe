// GET /api/toc?book=<id>[&vol=<n>] — mündəricat (başlıqlar) və ya cild siyahısı
import { getToc } from "./_lib/library.js";
import { send, query, LONG } from "./_lib/http.js";

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  const q = query(req);
  try {
    const out = await getToc(q.book, q.vol || null);
    if (!out) return send(res, 404, { error: "book_not_found" });
    send(res, 200, out, { cache: LONG });
  } catch (e) {
    send(res, 500, { error: "server_error" });
  }
}
