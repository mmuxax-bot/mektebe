// Kiçik HTTP köməkçiləri (Vercel Node funksiyaları və yerli server üçün eyni)
export function send(res, status, data, { cache = "no-store" } = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(data));
}
export function query(req) {
  if (req.query && typeof req.query === "object") return req.query;
  return Object.fromEntries(new URL(req.url, "http://x").searchParams);
}
// Kitab mətni dəyişmir: CDN-də uzun müddət saxlanır
export const LONG = "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400";
