// Adi cümlə tərcüməsi. Açar yoxdur. Hazır hədis tərcüməsinin yerinə keçmir.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function joinSentences(data) {
  const text = (data?.sentences || []).map((s) => s?.trans || "").join("").trim();
  if (!text) return null;
  return { text, from: String(data?.src || "") };
}

async function byGtx(text, to, from) {
  const body = new URLSearchParams({ client: "gtx", sl: from || "auto", tl: to, dt: "t", dj: "1", q: text });
  const res = await fetch("https://translate.googleapis.com/translate_a/single", {
    method: "POST",
    headers: { "User-Agent": UA, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return joinSentences(await res.json());
}

async function byChrome(text, to, from) {
  const url = "https://clients5.google.com/translate_a/t?" + new URLSearchParams({ client: "dict-chrome-ex", sl: from || "auto", tl: to, q: text });
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  const row = Array.isArray(data) ? data[0] : null;
  const textOut = Array.isArray(row) ? row[0] : typeof data?.[0] === "string" ? data[0] : "";
  const detected = Array.isArray(row) ? row[1] : "";
  if (!textOut) return null;
  return { text: String(textOut).trim(), from: String(detected || "") };
}

export async function googleTranslate(text, to, from = "auto") {
  const q = String(text || "").trim();
  if (q.length < 1 || q.length > 4500 || !/^[a-z]{2}$/.test(to)) return null;
  try {
    return (await byGtx(q, to, from)) || (await byChrome(q, to, from));
  } catch {
    try {
      return await byChrome(q, to, from);
    } catch {
      return null;
    }
  }
}
