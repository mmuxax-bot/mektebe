// /api/chats — Nibras AI söhbətləri (Supabase, 24 saat)
//   GET    (başlıq: x-device-id)               -> {chats:[{id,title,updated_at}]}
//   GET    ?id=...                              -> {chat:{id,title,messages,updated_at}}
//   PUT    ?id=...  {title, messages}           -> yazır (upsert)
//   DELETE ?id=...                              -> silir
// Cihaz nömrəsi x-device-id başlığı (və ya ?device_id=) ilə gəlir; yalnız həmin cihazın sətirləri qaytarılır.
import { handleChats } from "./_chats.js";

export const config = { maxDuration: 15 };

const BODY_LIMIT = 400 * 1024;

async function readBody(req) {
  let body = req.body;
  if (body === undefined || body === null) {
    if (typeof req[Symbol.asyncIterator] !== "function") return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > BODY_LIMIT) return null;
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    if (body.length > BODY_LIMIT) return null;
    try {
      return JSON.parse(body || "{}");
    } catch {
      return null;
    }
  }
  return typeof body === "object" ? body : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const header = req.headers && req.headers["x-device-id"];
    const device = (Array.isArray(header) ? header[0] : header) || url.searchParams.get("device_id") || "";
    const id = url.searchParams.get("id") || "";
    const body = req.method === "PUT" ? await readBody(req) : undefined;
    if (req.method === "PUT" && body === null) {
      res.status(413).json({ ok: false, error: "Sorğu çox böyükdür və ya yanlışdır" });
      return;
    }
    const out = await handleChats({ method: req.method, device, id, body });
    res.status(out.status).json(out.body);
  } catch {
    res.status(200).json({ ok: false, storage: false, error: "Server xətası" });
  }
}
