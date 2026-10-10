// GET /api/search?q=...[&book=<id>][&offset=0&limit=20] — bir kitabda və ya bütün kitabxanada axtarış (ərəbcə söz/ifadə)
import { search, searchForChat } from "./_lib/library.js";
import { send, query } from "./_lib/http.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const q = query(req);
  try {
    // ?for=ai: AI üçün mənbə çıxarışları (hər bölmədən ən yaxşı nəticələr, uzun sözbəsöz pəncərə, kitab adı və müəllif) — nibrascode.com istifadə edir
    if (q.for === "ai") return send(res, 200, await searchForChat(q.q, Math.min(5, Math.max(1, Number(q.limit) || 5))), { cache: "public, max-age=600, s-maxage=86400" });
    const out = await search(q.q, q.book || null, q.offset, q.limit);
    if (!out) return send(res, 404, { error: "book_not_found" });
    send(res, 200, out, { cache: "public, max-age=600, s-maxage=86400" });
  } catch (e) {
    send(res, 500, { error: "server_error" });
  }
}
