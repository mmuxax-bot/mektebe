// Provayder sağlamlıq diaqnostikası: POST /api/translate {"health":true}. Hər provayderə (api/_ai.js) bir dəfə kiçik sorğu göndərir.
// Cavab (açarsız): hər provayder üçün {keyPresent, ok, ms, reason (kateqoriya)} — sirr və provayder mətni yoxdur.
// x-debug-key başlığı DEBUG_KEY (yoxdursa STATS_KEY) ilə üst-üstə düşərsə: əlavə olaraq qısaldılmış xəta mətni (detail) və gözlənilən dəyişən adları.
import { timingSafeEqual } from "node:crypto";
import { askProvider, aiConfig, PROVIDER_KEYS, env } from "./_ai.js";
import { setHealthHook } from "./_translate/http.js";
import { markProvider } from "./_translate-ensemble.js";

// Tez-tez səhv adlandırılan dəyişənlər: yalnız VAR/YOX bildirilir (dəyər yox)
const ALIASES = { scaleway: ["SCALEWAY_ACCESS_KEY"], github: ["GITHUB_MODELS_TOKEN", "GH_MODELS_TOKEN", "GITHUB_TOKEN"] };

export function classify(detail) {
  const d = String(detail || "");
  if (/timeout|abort/i.test(d)) return "timeout";
  if (/^\s*200\s*$/.test(d)) return "empty-reply";
  if (/^\s*(4\d\d|5\d\d)\s*$/.test(d) && !/^\s*(401|403|404|410|429|50[0-4])\s*$/.test(d)) return "http-" + d.trim();
  if (/wrong api key|authorization failed|bad credentials|invalid api key|incorrect api key|unauthori[sz]ed|invalid.*(key|token)|authentication|forbidden|\b40[13]\b|permission/i.test(d)) return "invalid-key";
  if (/credit|balance|billing|spending|payment|quota|insufficient|exceeded your|out of/i.test(d)) return "no-credit-or-quota";
  if (/rate.?limit|too many|\b429\b/i.test(d)) return "rate-limited";
  if (/model|not found|does not exist|unsupported|decommission|end of life|\bgone\b|\b(404|410)\b/i.test(d)) return "model-unavailable";
  if (/overload|unavailable|high demand|\b50[0-4]\b|capacity/i.test(d)) return "provider-down";
  return "error";
}

function authorized(req) {
  const want = process.env.DEBUG_KEY || process.env.STATS_KEY || "";
  if (!want) return false;
  const got = String((req.headers && req.headers["x-debug-key"]) || "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function ping(id, timeoutMs) {
  const t0 = Date.now();
  const cfg = { system: "Reply with exactly: OK", temperature: 0, tokens: () => 300, timeout: () => AbortSignal.timeout(timeoutMs) };
  try {
    const r = await aiConfig.run(cfg, () => askProvider(id, [{ role: "user", text: "Say OK" }], "Say OK"));
    if (r && r.ok && r.reply) return { ok: true, ms: Date.now() - t0 };
    if (r && r.skipped) return { ok: false, ms: Date.now() - t0, reason: "no-key", detail: "skipped" };
    return { ok: false, ms: Date.now() - t0, reason: classify(r && r.detail), detail: String((r && r.detail) || "") };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, reason: classify(e && (e.name + " " + e.message)), detail: String((e && e.message) || "") };
  }
}

export async function providerHealth(req, { timeoutMs = 12_000 } = {}) {
  const full = authorized(req || {});
  const ids = Object.keys(PROVIDER_KEYS);
  const rows = await Promise.all(
    ids.map(async (id) => {
      const present = PROVIDER_KEYS[id].some((k) => env(k));
      const row = { provider: id, keyPresent: present, ok: false, ms: 0, reason: "no-key" };
      if (present) {
        const r = await ping(id, timeoutMs);
        markProvider(id, r.ok);
        Object.assign(row, { ok: r.ok, ms: r.ms, reason: r.ok ? "ok" : r.reason });
        if (full && !r.ok) row.detail = r.detail.replace(/\s+/g, " ").slice(0, 160);
      }
      if (ALIASES[id]) row.otherEnvPresent = Object.fromEntries(ALIASES[id].filter((n) => !PROVIDER_KEYS[id].includes(n)).map((n) => [n, Boolean(env(n))]));
      row.expects = PROVIDER_KEYS[id]; // gözlənilən dəyişən adları (sirr deyil), sıra = üstünlük
      return row;
    }),
  );
  return { ok: true, health: true, detailed: full, checked_at: new Date().toISOString(), summary: { configured: rows.filter((r) => r.keyPresent).length, working: rows.filter((r) => r.ok).length, total: rows.length }, providers: rows };
}

setHealthHook((body, req) => providerHealth(req));
