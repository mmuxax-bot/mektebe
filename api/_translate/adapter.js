// Model əsaslı mühərrik adapteri (İSTƏYƏ BAĞLI, defolt söndürülüb). Heç bir zəng edən kodu dəyişmədən sonradan öz serverinizdə işləyən NMT qoşulur.
//
// Qoşmaq üçün mühit dəyişənləri:
//   TRANSLATE_ENGINE_URL   (məcburi)  – mühərrikin POST ünvanı
//   TRANSLATE_ENGINE_KEY   (ixtiyari) – varsa "Authorization: Bearer <key>" göndərilir
//   TRANSLATE_ENGINE_TIMEOUT_MS (ixtiyari, defolt 20000)
//
// Müqavilə:
//   Sorğu  POST  { "text": "...", "from": "ar|az|tr|en|ru|auto", "to": "ar|az|tr|en|ru" }
//   Cavab  200   { "translation": "...", "engine": "nllb-600m-ct2" (ixtiyari), "confidence": 0..1 (ixtiyari), "pivot": ["en"] (ixtiyari) }
//   Mühərrik istənilən xətada/boş cavabda null sayılır (sistem «mənbə yoxdur» cavabına qayıdır).
export function envEngine() {
  const url = process.env.TRANSLATE_ENGINE_URL;
  if (!url) return null;
  return async ({ text, from, to }) => {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.TRANSLATE_ENGINE_KEY ? { Authorization: `Bearer ${process.env.TRANSLATE_ENGINE_KEY}` } : {}) },
        body: JSON.stringify({ text, from, to }),
        signal: AbortSignal.timeout(Number(process.env.TRANSLATE_ENGINE_TIMEOUT_MS) || 20000),
      });
      if (!r.ok) return null;
      const d = await r.json();
      const t = typeof d?.translation === "string" ? d.translation.trim() : "";
      if (!t) return null;
      return { translation: t, engine: String(d.engine || "model"), confidence: typeof d.confidence === "number" ? d.confidence : null, pivot: Array.isArray(d.pivot) ? d.pivot : null };
    } catch {
      return null;
    }
  };
}
