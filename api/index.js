// Bütün API üçün TƏK Vercel funksiyası (Function Storage-a qənaət: hər deploy-da 5 yox, 1 bundle).
// vercel.json-dakı rewrite /api/<books|page|toc|search|chat> ünvanlarını bura yönəldir, açıq URL-lər dəyişmir.
// Hər marşrut öz modulunu yalnız lazım olanda yükləyir: /api/books kitab məlumatını yükləmir (yalnız catalog.js).
import { send } from "./_lib/http.js";

const ROUTES = {
  books: () => import("./_books.js"),
  page: () => import("./_page.js"),
  toc: () => import("./_toc.js"),
  search: () => import("./_search.js"),
  chat: () => import("./_chat.js"),
};

export const config = { maxDuration: 45 };

function routeOf(req) {
  const fromQuery = req.query && req.query.__route;
  if (fromQuery) return String(fromQuery);
  const m = String(req.url || "").match(/^\/api\/([a-z]+)\/?(?:\?|$)/);
  return m ? m[1] : "";
}

export default async function handler(req, res) {
  const name = routeOf(req);
  if (req.query) delete req.query.__route;
  const load = Object.hasOwn(ROUTES, name) ? ROUTES[name] : null;
  if (!load) return send(res, 404, { error: "not_found" });
  const mod = await load();
  return mod.default(req, res);
}
