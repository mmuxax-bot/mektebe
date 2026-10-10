// POST /api/stats  {type: visit|mode|snippet|error, name}  -> hadisəni sayır
// GET  /api/stats?key=STATS_KEY[&days=14]  (və ya x-stats-key başlığı) -> günlük say cədvəli
import { createHash, timingSafeEqual } from "node:crypto";
import { cleanEvent, recordEvent, readDays, storageConfig, TYPES } from "./_stats.js";

export const config = { maxDuration: 10 };

function sameKey(given, secret) {
  const a = createHash("sha256").update(String(given || "")).digest();
  const b = createHash("sha256").update(String(secret || "")).digest();
  return timingSafeEqual(a, b);
}

async function readBody(req) {
  let body = req.body;
  if (body === undefined || body === null) {
    if (typeof req[Symbol.asyncIterator] !== "function") return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2048) return null;
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    if (body.length > 2048) return null;
    try {
      return JSON.parse(body || "{}");
    } catch {
      return null;
    }
  }
  return typeof body === "object" ? body : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-stats-key");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "POST") {
      const ev = cleanEvent(await readBody(req));
      if (!ev) {
        res.status(400).json({ ok: false, error: "Yanlış hadisə" });
        return;
      }
      // Saxlama qoşulmayıbsa da sorğu uğurlu sayılır (səhifə heç nə hiss etməsin)
      const result = await recordEvent(ev);
      res.status(200).json({ ok: true, stored: result === "ok" });
      return;
    }

    if (req.method === "GET") {
      const secret = process.env.STATS_KEY || "";
      if (!secret) {
        res.status(503).json({ ok: false, error: "STATS_KEY təyin edilməyib" });
        return;
      }
      const url = new URL(req.url || "/", "http://localhost");
      const given = url.searchParams.get("key") || req.headers["x-stats-key"] || "";
      if (!sameKey(given, secret)) {
        res.status(401).json({ ok: false, error: "Açar yanlışdır" });
        return;
      }
      if (!storageConfig()) {
        res.status(200).json({ ok: true, storage: false, message: "Saxlama qoşulmayıb (Upstash/KV dəyişənləri yoxdur)", types: TYPES, days: [] });
        return;
      }
      const days = await readDays(url.searchParams.get("days"));
      res.status(200).json({ ok: true, storage: true, types: TYPES, days });
      return;
    }

    res.status(405).json({ ok: false, error: "Yalnız GET və POST" });
  } catch {
    res.status(200).json({ ok: false, error: "Server xətası" });
  }
}
