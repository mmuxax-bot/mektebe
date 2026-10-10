// Tərcümə yaddaşı (translation memory). Açar = sha256(normallaşdırılmış ərəbcə mətn + hədəf dil + versiya). Kiçik saxlama interfeysi:
//   store.get(key) -> Promise<{t, c, n, at}|null>     store.set(key, value, ttlSec) -> Promise<void>
// Qatlar: toxum faylı (yalnız oxunan) → yaddaş (LRU, hər isti serverless nüsxə üçün) → Upstash/Vercel KV REST (UPSTASH_REDIS_REST_URL/TOKEN və ya KV_REST_API_URL/TOKEN; api/_stats.js ilə eyni dəyişənlər).
// Qeyd: Nibras saytında bu an Upstash/KV/Supabase qoşulmayıb → yalnız yaddaş içi (isti nüsxə ömrü qədər) işləyir; qoşulan kimi avtomatik davamlı olur.
import { createHash } from "node:crypto";
import { normAr } from "./_translate/normalize.js";
import { storageConfig } from "./_stats.js";

export const CACHE_VERSION = "v1";
export const TTL_SEC = 30 * 24 * 3600;

export function cacheKey(arabic, to) {
  const norm = normAr(arabic).replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${CACHE_VERSION}|${to}|${norm}`).digest("hex");
}

export function memoryStore(max = 500) {
  const m = new Map();
  return {
    name: "memory",
    async get(key) {
      const v = m.get(key);
      if (!v) return null;
      if (v.exp && v.exp < Date.now()) {
        m.delete(key);
        return null;
      }
      m.delete(key);
      m.set(key, v); // LRU
      return v.value;
    },
    async set(key, value, ttlSec = TTL_SEC) {
      m.set(key, { value, exp: Date.now() + ttlSec * 1000 });
      while (m.size > max) m.delete(m.keys().next().value);
    },
    get size() {
      return m.size;
    },
  };
}

export function upstashStore(cfg, fetchImpl = globalThis.fetch, prefix = "ntr:") {
  const call = async (cmd) => {
    const r = await fetchImpl(cfg.url, { method: "POST", headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(2000) });
    if (!r.ok) throw new Error("storage " + r.status);
    return (await r.json()).result;
  };
  return {
    name: "upstash",
    async get(key) {
      try {
        const v = await call(["GET", prefix + key]);
        return v ? JSON.parse(v) : null;
      } catch {
        return null;
      }
    },
    async set(key, value, ttlSec = TTL_SEC) {
      try {
        await call(["SET", prefix + key, JSON.stringify(value), "EX", String(ttlSec)]);
      } catch {
        /* saxlama xətası tərcüməni pozmasın */
      }
    },
  };
}

/** Yalnız oxunan toxum: entries = [{ar, az?, tr?, en?, ru?, confidence?}] */
export function seedStore(entries) {
  const m = new Map();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || typeof e.ar !== "string") continue;
    for (const to of ["az", "tr", "en", "ru"]) if (typeof e[to] === "string" && e[to].trim()) m.set(cacheKey(e.ar, to), { t: e[to].trim(), c: typeof e.confidence === "number" ? e.confidence : 0.85, n: 0, seed: true });
  }
  return { name: "seed", size: m.size, async get(key) { return m.get(key) || null; }, async set() {} };
}

/** Qatlı saxlama: get ilk tapılanı qaytarır (tapılan aşağı qatlara kopyalanır), set bütün yazıla bilən qatlara yazır. */
export function layeredStore(stores) {
  return {
    name: stores.map((s) => s.name).join("+"),
    stores,
    async get(key) {
      for (let i = 0; i < stores.length; i++) {
        const v = await stores[i].get(key);
        if (v) {
          for (let j = 0; j < i; j++) if (!stores[j].readOnly && stores[j].name !== "seed") await stores[j].set(key, v);
          return v;
        }
      }
      return null;
    },
    async set(key, value, ttl) {
      await Promise.all(stores.filter((s) => s.name !== "seed").map((s) => s.set(key, value, ttl)));
    },
  };
}

let shared = null;
export async function defaultStore(env = process.env) {
  if (shared) return shared;
  let seed = [];
  try {
    seed = (await import("./_translate-seed.js")).default;
  } catch {
    seed = [];
  }
  const cfg = storageConfig(env);
  shared = layeredStore([seedStore(seed), memoryStore(), ...(cfg ? [upstashStore(cfg)] : [])]);
  return shared;
}
