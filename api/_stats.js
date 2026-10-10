// Gizlilik dostu sayğac: yalnız ümumi say (gün + növ + ad). IP, cookie, istifadəçi nömrəsi və mesaj mətni saxlanmır.
// Saxlama: Upstash Redis REST (UPSTASH_REDIS_REST_URL/TOKEN) və ya Vercel KV (KV_REST_API_URL/TOKEN). Yoxdursa səssizcə keçilir.

export const TYPES = ["visit", "mode", "snippet", "error"];
const MODE_NAMES = new Set(["ask", "chat", "code", "image", "create"]);
const SNIPPET_NAMES = new Set(["hit", "local", "ai"]);
const KEEP_SECONDS = 400 * 24 * 3600;
const TIMEOUT_MS = 2500;
const OFFSET_HOURS = 4; // Bakı vaxtı (UTC+4) ilə gün sərhədi

export function storageConfig(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "";
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "";
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function dayKey(ms = Date.now()) {
  return new Date(ms + OFFSET_HOURS * 3600 * 1000).toISOString().slice(0, 10);
}

// Gələn hadisəni yoxlayır və təmizləyir. Yanlışdırsa null.
export function cleanEvent(input) {
  if (!input || typeof input !== "object") return null;
  if (typeof input.type !== "string") return null;
  const type = input.type.toLowerCase();
  if (!TYPES.includes(type)) return null;
  let name = (typeof input.name === "string" ? input.name : "").toLowerCase().replace(/[^a-z0-9_:.-]/g, "").slice(0, 24);
  if (type === "mode" && !MODE_NAMES.has(name)) return null;
  if (type === "snippet" && !SNIPPET_NAMES.has(name)) return null;
  if (!name) name = type === "visit" ? "ai" : "other";
  return { type, name };
}

async function call(cfg, path, commands, fetchImpl) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(cfg.url + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: ctl ? ctl.signal : undefined,
    });
    if (!res.ok) throw new Error("storage " + res.status);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Hadisəni yazır. Heç vaxt xəta atmır; nəticə: "ok" | "skipped" | "failed"
export async function recordEvent(event, { env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  const ev = cleanEvent(event);
  if (!ev) return "skipped";
  const cfg = storageConfig(env);
  if (!cfg || typeof fetchImpl !== "function") return "skipped";
  const key = "nstat:" + dayKey(now);
  try {
    await call(cfg, "/pipeline", [["HINCRBY", key, ev.type + ":" + ev.name, 1], ["EXPIRE", key, KEEP_SECONDS]], fetchImpl);
    return "ok";
  } catch {
    return "failed";
  }
}

// Son N günün say cədvəli. Saxlama yoxdursa null.
export async function readDays(days, { env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  const cfg = storageConfig(env);
  if (!cfg || typeof fetchImpl !== "function") return null;
  const n = Math.max(1, Math.min(90, Math.floor(Number(days)) || 14));
  const dates = Array.from({ length: n }, (_, i) => dayKey(now - i * 24 * 3600 * 1000));
  const out = await call(cfg, "/pipeline", dates.map((d) => ["HGETALL", "nstat:" + d]), fetchImpl);
  return dates.map((date, i) => {
    const flat = (out && out[i] && out[i].result) || [];
    const counts = {};
    for (let k = 0; k + 1 < flat.length; k += 2) counts[flat[k]] = Number(flat[k + 1]) || 0;
    return { date, counts };
  });
}

// Cavabı gecikdirmədən göndərmək üçün: Vercel-də waitUntil ilə, yoxdursa sadəcə arxa planda
export function track(type, name) {
  try {
    const p = recordEvent({ type, name }).catch(() => {});
    const ctx = globalThis[Symbol.for("@vercel/request-context")];
    const c = ctx && typeof ctx.get === "function" ? ctx.get() : null;
    if (c && typeof c.waitUntil === "function") c.waitUntil(p);
  } catch {
    // sayğac heç vaxt əsas işə mane olmamalıdır
  }
}
