// Bütün API üçün TƏK Vercel funksiyası (Function Storage-a qənaət: hər deploy-da bir bundle).
// vercel.json rewrite-ı /api/<ad> ünvanlarını bura yönəldir (açıq URL-lər eynidir). Hər marşrut öz modulunu yalnız lazım olanda yükləyir:
// /api/books yalnız catalog.js-i, /api/quran yalnız Quran mətnini yükləyir; kitab/AI modulları yalnız onları istəyən sorğuda açılır.
// _ep-chat.js, _ep-chats.js, _ep-translate.js, _ep-image.js, _ep-stats.js nibrascode/code api/*.js ilə eynidir (sorğu/cavab formatı, mühit dəyişənləri).

const ROUTES = {
  books: () => import("./_ep-books.js"),
  page: () => import("./_ep-page.js"),
  toc: () => import("./_ep-toc.js"),
  search: () => import("./_ep-search.js"),
  quran: () => import("./_ep-quran.js"),
  tafsir: () => import("./_ep-tafsir.js"),
  chat: () => import("./_ep-chat.js"),
  chats: () => import("./_ep-chats.js"),
  translate: () => import("./_ep-translate.js"),
  image: () => import("./_ep-image.js"),
  stats: () => import("./_ep-stats.js"),
};
// Açıq oxu məlumatı (kitab/Quran) hamıya açıqdır; AI və hesab marşrutları yalnız bu saytlardan çağırıla bilər.
const PUBLIC = new Set(["books", "page", "toc", "search", "quran", "tafsir"]);
export const ORIGINS = new Set(["https://nibrascode.com", "https://www.nibrascode.com", "https://library.nibrascode.com"]);
const ALLOW_HEADERS = "Content-Type, x-device-id, x-stats-key";
const ALLOW_METHODS = "GET, POST, PUT, DELETE, OPTIONS";

export const config = { maxDuration: 60 };

function routeOf(req) {
  const fromQuery = req.query && req.query.__route;
  if (fromQuery) return String(fromQuery);
  const m = String(req.url || "").match(/^\/api\/([a-z]+)\/?(?:\?|$)/);
  return m ? m[1] : "";
}

// CORS başlıqlarını burada qoyuruq; marşrut modullarının özlərinin qoyduğu Access-Control-* başlıqları nəzərə alınmır
function applyCors(req, res, name) {
  const origin = String((req.headers && req.headers.origin) || "");
  const set = res.setHeader.bind(res);
  res.setHeader("Vary", "Origin");
  if (ORIGINS.has(origin)) {
    set("Access-Control-Allow-Origin", origin);
    set("Access-Control-Allow-Methods", ALLOW_METHODS);
    set("Access-Control-Allow-Headers", ALLOW_HEADERS);
    set("Access-Control-Max-Age", "86400");
  } else if (PUBLIC.has(name)) {
    set("Access-Control-Allow-Origin", "*");
  }
  res.setHeader = (k, v) => (/^access-control-/i.test(k) ? res : set(k, v));
}

export default async function handler(req, res) {
  const name = routeOf(req);
  if (req.query) delete req.query.__route;
  const load = Object.hasOwn(ROUTES, name) ? ROUTES[name] : null;
  applyCors(req, res, name);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (!load) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "not_found" }));
  }
  const mod = await load();
  return mod.default(req, res);
}
