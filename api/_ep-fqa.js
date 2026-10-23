// POST /api/fqa {q, passages:[{v,p,t}]} -> {answer}  Məcmuul-fətava kitab daxili köməkçi: yalnız verilən parçalara əsaslanan qısa ərəbcə cavab.
// Açarlar yalnız serverdə (api/_ai.js); söhbət (Nibras AI) koduna toxunulmur.
import { aiConfig, askProvider, configuredProviders } from "./_ai.js";

export const config = { maxDuration: 30 };
const ORDER = ["groq", "cerebras", "gemini", "sambanova", "openrouter", "github", "mistral", "deepseek", "nvidia", "xai", "hf"];
const SYSTEM = "أنت مساعد بحث داخل كتاب «مجموع الفتاوى» لابن تيمية. أجب بالعربية الفصحى فقط وباختصار (من 2 إلى 5 جمل). اعتمد حصرًا على المقاطع المرقمة المعطاة، ولا تضف شيئًا من خارجها، ولا تخترع نصوصًا أو أرقامًا. بعد كل معلومة اذكر مرجعها بصيغة (ج X، ص Y) كما هو مكتوب في رأس المقطع. إن لم تجد الجواب في المقاطع فقل: «لم أجد جوابًا صريحًا في المقاطع المعروضة». لا تذكر أنك نموذج.";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST" });
  let b = req.body;
  if (typeof b === "string") try { b = JSON.parse(b); } catch { b = {}; }
  const q = String(b?.q || "").slice(0, 300).trim();
  const ps = (Array.isArray(b?.passages) ? b.passages : []).slice(0, 6).map((x) => ({ v: Number(x.v) | 0, p: String(x.p || "").slice(0, 12), t: String(x.t || "").slice(0, 1400) }));
  if (!/[\u0621-\u064A]{2,}/.test(q) || !ps.length) return res.status(400).json({ error: "bad" });
  const msg = `السؤال: ${q}\n\nالمقاطع:\n` + ps.map((x, i) => `[${i + 1}] (ج ${x.v}، ص ${x.p})\n${x.t}`).join("\n\n");
  const names = ORDER.filter((n) => configuredProviders().includes(n));
  const cfg = { system: SYSTEM, tokens: () => 450, timeout: (base) => AbortSignal.timeout(Math.min(base || 12000, 12000)), temperature: 0.2 };
  const errs = [];
  for (const n of names) {
    try {
      const r = await aiConfig.run(cfg, () => askProvider(n, [{ role: "user", text: msg }], msg));
      if (r && r.ok && r.reply) return res.status(200).json({ answer: String(r.reply).trim(), by: n });
      errs.push(n + ':' + String((r && (r.detail || (r.skipped && 'skip'))) || '').slice(0, 80));
    } catch (e) { errs.push(n + ':ex ' + String(e && e.message).slice(0, 80)); }
  }
  return res.status(503).json({ error: "no-ai", n: names.length, errs });
}
