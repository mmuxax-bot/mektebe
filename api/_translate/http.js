// HTTP qatı (Vercel / Node http / Express ilə uyğun: (req, res)). 
//   GET  -> xidmət məlumatı (dillər, əhatə, istifadə)
//   POST -> { text, from?, to, ui?, parallel? }  və ya  { texts: [...], from?, to }  (ən çox 20)
// CORS açıqdır. TRANSLATE_API_KEY mühit dəyişəni təyin olunubdursa: "Authorization: Bearer <key>" və ya "X-API-Key: <key>" tələb olunur.
import { timingSafeEqual } from "node:crypto";
import { translate, coverage, hasDefaultEngine, LANGS, MAX_TEXT } from "./engine.js";
import { BRAND, UI_LANGS } from "./messages.js";

const BATCH_MAX = 20;
const RATE = { windowMs: 60_000, max: 120 };
const hits = new Map();

function keyOk(req) {
  const want = process.env.TRANSLATE_API_KEY;
  if (!want) return true;
  const h = req.headers || {};
  const got = String(h["x-api-key"] || (/^Bearer\s+(.+)$/i.exec(String(h.authorization || "")) || [])[1] || "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIp(req) {
  return String((req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) || req.socket?.remoteAddress || "?").split(",")[0].trim();
}

function limited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const rec = hits.get(ip) || { t: now, n: 0 };
  if (now - rec.t > RATE.windowMs) {
    rec.t = now;
    rec.n = 0;
  }
  rec.n++;
  hits.set(ip, rec);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > RATE.windowMs) hits.delete(k);
  return rec.n > RATE.max;
}

const healthHits = new Map();
function healthAllowed(ip, now = Date.now()) {
  const arr = (healthHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 3) return false;
  arr.push(now);
  healthHits.set(ip, arr);
  return true;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 200_000) throw new Error("too large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

// Host tətbiq diaqnostika qarmağı qeydiyyata alır (məs. provayder sağlamlığı): async (body, req, ip) => obyekt
let healthHook = null;
export function setHealthHook(fn) {
  healthHook = typeof fn === "function" ? fn : null;
}

export const INFO = {
  service: "nibras-translate-core",
  brand: BRAND,
  version: "0.1.0",
  description: "Əvvəl mövcud insan tərcümələrindən axtarış/uyğunlaşdırma. Hədəf dildə insan tərcüməsi yoxdursa və host tətbiq mühərrik qoşubsa: maşın tərcüməsi (method ensemble/model, həmişə etiketlənir). Uydurma «insan tərcüməsi» yoxdur.",
  languages: LANGS,
  max_text_chars: MAX_TEXT,
  max_batch: BATCH_MAX,
  usage: { method: "POST", body: { text: "string", from: "auto|ar|az|tr|en|ru", to: "ar|az|tr|en|ru", ui: "az|tr|en|ru|ar (footer və qeydlərin dili)", parallel: "true|false (digər dillər də qaytarılsın)" } },
  ui_languages: UI_LANGS,
  methods: { lookup: "hədəf dildə hazır insan tərcüməsi tapıldı", "lookup-alt-lang": "hədəf dildə yoxdur; digər dillərdəki hazır tərcümələr ayrıca etiketlə qaytarıldı", lexicon: "sabit ifadə lüğəti", model: "yalnız TRANSLATE_ENGINE_URL qoşulubsa: tək model mühərrikinin tərcüməsi (maşın tərcüməsi kimi etiketlənir)", ensemble: "bir neçə modelin müstəqil tərcümələrinin konsensusu (maşın tərcüməsi kimi etiketlənir); yalnız hədəf dildə insan tərcüməsi yoxdursa və host mühərrik qoşubsa", "no-source": "mənbə yoxdur; heç nə uydurulmur" },
  get engine_connected() {
    return Boolean(process.env.TRANSLATE_ENGINE_URL) || hasDefaultEngine();
  },
  get model_free() {
    return !this.engine_connected;
  },
  sources: [{ name: "HadeethEnc.com", url: "https://hadeethenc.com", terms: "Mətn dəyişdirilmədən, mənbə göstərilməklə istifadə" }],
};

// Bir HTTP sorğusu üçün ortaq kontekst: IP, maşın tərcüməsi üçün simvol limiti, ümumi son vaxt.
export const REQUEST_ENGINE_CHARS = 6000;
export function makeCtx(ip, { engineChars = REQUEST_ENGINE_CHARS, budgetMs = 40_000 } = {}) {
  return { ip: ip || "?", engineChars, deadlineAt: Date.now() + budgetMs };
}

export async function handleTranslate(body, ctx = makeCtx("?")) {
  const debug = body && body.debug === true;
  if (Array.isArray(body.texts)) {
    const texts = body.texts.slice(0, BATCH_MAX);
    // paralel: hazır mənbə axtarışı ani, maşın tərcüməsi (varsa) bir-birini gözləməsin
    const results = await Promise.all(texts.map((t) => translate({ ...body, text: t, texts: undefined, ctx, debug })));
    return { ok: true, results };
  }
  return translate({ ...body, ctx, debug });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (!keyOk(req)) return send(res, 401, { ok: false, error: "API açarı yanlışdır və ya yoxdur (Authorization: Bearer … / X-API-Key)." });
  if (limited(req)) return send(res, 429, { ok: false, error: "Çox sorğu. Bir az sonra yenidən cəhd edin." });
  if (req.method === "GET") return send(res, 200, { ...INFO, coverage: await coverage() });
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Yalnız GET və POST." });
  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: "JSON oxunmadı." });
  }
  try {
    if (body && body.health === true && healthHook) {
      const ip = clientIp(req);
      if (!healthAllowed(ip)) return send(res, 429, { ok: false, error: "Diaqnostika limiti: dəqiqədə ən çox 3 sorğu." });
      return send(res, 200, await healthHook(body, req, ip));
    }
    const out = await handleTranslate(body || {}, makeCtx(clientIp(req)));
    return send(res, out.limited === "rate" ? 429 : out.ok === false && !out.results ? 400 : 200, out);
  } catch (e) {
    return send(res, 500, { ok: false, error: "Daxili xəta." });
  }
}
