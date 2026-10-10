// Nibras AI söhbətlərinin Supabase (PostgREST) ilə saxlanması. Yeni npm paketi yoxdur, yalnız fetch.
// Hər sorğu yalnız verilən device_id-yə aid sətirlərə toxunur. Açar yalnız serverdə (service role) işlədilir.
// Supabase qoşulmayıbsa heç nə sınmır: cavab {storage:false} olur və səhifə yalnız localStorage ilə işləyir.

export const TABLE = "nibras_chats";
export const KEEP_MS = 24 * 3600 * 1000;
export const MAX_MESSAGES_BYTES = 200 * 1024;
export const MAX_TITLE = 80;
export const MAX_LIST = 50;
const MAX_MESSAGES = 200;
const MAX_TEXT = 20000;
const MAX_IMG = 2000;
const TIMEOUT_MS = 6000;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const KINDS = new Set(["u", "b", "b err"]);

export function supaConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  // Yalnız server açarı: anon açar bilərəkdən qəbul edilmir (RLS siyasəti yoxdur, brauzer açarı ilə çatmaq olmaz).
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SECRET_KEY || "";
  if (!/^https?:\/\//i.test(url) || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

export function cleanId(v) {
  return typeof v === "string" && ID_RE.test(v) ? v : "";
}

export function cleanTitle(v) {
  const s = (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, MAX_TITLE).join("");
}

// Mesajları yoxlayır və təmizləyir. Qaytarır: {messages} və ya {error, status}
export function cleanMessages(input) {
  if (!Array.isArray(input)) return { error: "Mesajlar siyahı olmalıdır", status: 400 };
  if (input.length > MAX_MESSAGES) return { error: "Çox mesaj var", status: 413 };
  const out = [];
  for (const m of input) {
    if (!m || typeof m !== "object" || typeof m.t !== "string" || !KINDS.has(m.k)) {
      return { error: "Yanlış mesaj", status: 400 };
    }
    const item = { k: m.k, t: m.t.slice(0, MAX_TEXT) };
    if (typeof m.i === "string" && /^https?:\/\//i.test(m.i) && m.i.length <= MAX_IMG) item.i = m.i;
    if (m.x) item.x = 1;
    out.push(item);
  }
  if (Buffer.byteLength(JSON.stringify(out), "utf8") > MAX_MESSAGES_BYTES) {
    return { error: "Söhbət çox böyükdür", status: 413 };
  }
  return { messages: out };
}

async function rest(cfg, method, path, { body, prefer, fetchImpl }) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
  try {
    const headers = { apikey: cfg.key, Authorization: "Bearer " + cfg.key };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    const res = await fetchImpl(cfg.url + "/rest/v1/" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined,
    });
    if (!res.ok) {
      const err = new Error("supabase " + res.status);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// req: {method, device, id, body}. Qaytarır {status, body}. Heç vaxt xəta atmır.
export async function handleChats(req, { env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  const method = String(req.method || "").toUpperCase();
  if (!["GET", "PUT", "DELETE"].includes(method)) return { status: 405, body: { ok: false, error: "Yalnız GET, PUT, DELETE" } };

  const device = cleanId(req.device);
  if (!device) return { status: 400, body: { ok: false, error: "Cihaz nömrəsi yanlışdır" } };
  const id = req.id === undefined || req.id === "" || req.id === null ? "" : cleanId(req.id);
  if (req.id && !id) return { status: 400, body: { ok: false, error: "Söhbət nömrəsi yanlışdır" } };

  const cfg = supaConfig(env);
  if (!cfg || typeof fetchImpl !== "function") {
    // Saxlama qoşulmayıb: səhifə yerli yaddaşla davam edir
    if (method === "GET") return { status: 200, body: id ? { ok: true, storage: false, chat: null } : { ok: true, storage: false, chats: [] } };
    return { status: 200, body: { ok: true, storage: false } };
  }

  const cutoff = new Date(now - KEEP_MS).toISOString();
  const dev = "device_id=eq." + encodeURIComponent(device);
  try {
    if (method === "GET") {
      if (!id) {
        const rows = await rest(cfg, "GET", `${TABLE}?select=id,title,updated_at&${dev}&updated_at=gte.${encodeURIComponent(cutoff)}&order=updated_at.desc&limit=${MAX_LIST}`, { fetchImpl });
        const chats = (Array.isArray(rows) ? rows : []).map((r) => ({ id: r.id, title: r.title, updated_at: r.updated_at }));
        return { status: 200, body: { ok: true, storage: true, chats } };
      }
      const rows = await rest(cfg, "GET", `${TABLE}?select=id,title,messages,updated_at&${dev}&id=eq.${encodeURIComponent(id)}&updated_at=gte.${encodeURIComponent(cutoff)}&limit=1`, { fetchImpl });
      const r = Array.isArray(rows) ? rows[0] : null;
      if (!r) return { status: 404, body: { ok: false, storage: true, error: "Söhbət tapılmadı" } };
      return { status: 200, body: { ok: true, storage: true, chat: { id: r.id, title: r.title, messages: r.messages, updated_at: r.updated_at } } };
    }

    if (method === "PUT") {
      if (!id) return { status: 400, body: { ok: false, error: "Söhbət nömrəsi yoxdur" } };
      const b = req.body && typeof req.body === "object" ? req.body : null;
      if (!b) return { status: 400, body: { ok: false, error: "Yanlış sorğu" } };
      const clean = cleanMessages(b.messages);
      if (clean.error) return { status: clean.status, body: { ok: false, error: clean.error } };
      const title = cleanTitle(b.title);
      if (!title) return { status: 400, body: { ok: false, error: "Başlıq boşdur" } };
      await rest(cfg, "POST", `${TABLE}?on_conflict=device_id,id`, {
        body: [{ device_id: device, id, title, messages: clean.messages, updated_at: new Date(now).toISOString() }],
        prefer: "resolution=merge-duplicates,return=minimal",
        fetchImpl,
      });
      // 24 saatdan köhnə sətirləri (hamının) yazı zamanı silirik; alınmasa əsas yazı pozulmur
      try {
        await rest(cfg, "DELETE", `${TABLE}?updated_at=lt.${encodeURIComponent(cutoff)}`, { prefer: "return=minimal", fetchImpl });
      } catch {}
      return { status: 200, body: { ok: true, storage: true, stored: true } };
    }

    // DELETE
    if (!id) return { status: 400, body: { ok: false, error: "Söhbət nömrəsi yoxdur" } };
    await rest(cfg, "DELETE", `${TABLE}?${dev}&id=eq.${encodeURIComponent(id)}`, { prefer: "return=minimal", fetchImpl });
    return { status: 200, body: { ok: true, storage: true, deleted: true } };
  } catch (e) {
    const missing = e && (e.status === 404 || e.status === 400);
    return { status: 200, body: { ok: false, storage: false, error: missing ? "Cədvəl hazır deyil" : "Saxlama xətası" } };
  }
}
