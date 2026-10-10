import { createHash, randomBytes, randomInt } from "node:crypto";

const SECRET = new Set(["password", "md5", "sha256", "hash", "jwt", "base64"]);
const SITE = "https://www.nibrascode.com/tools";

function tail(slug) {
  return `\n\nXidmət: ${SITE}/${slug}`;
}

function payload(text) {
  const cut = text.split(/[:：]\s*/);
  if (cut.length > 1) return cut.slice(1).join(":").trim();
  return text.trim();
}

function pick(text, re) {
  const found = text.match(re);
  return found ? found[0] : text.trim();
}

function hash(text, name) {
  return createHash(name).update(text, "utf8").digest("hex");
}

function jsonFormat(text) {
  return JSON.stringify(JSON.parse(text), null, 2);
}

function jsonMin(text) {
  return JSON.stringify(JSON.parse(text));
}

function b64(text, undo) {
  return undo ? Buffer.from(text, "base64").toString("utf8") : Buffer.from(text, "utf8").toString("base64");
}

function unix(text) {
  const raw = text.trim();
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const value = Number(raw);
    const ms = Math.abs(value) < 1e11 ? value * 1000 : value;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) throw new Error("time");
    return date.toISOString().replace(".000Z", " UTC").replace("T", " ").replace("Z", " UTC");
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("time");
  return String(Math.floor(date.getTime() / 1000));
}

function count(text) {
  const chars = Array.from(text).length;
  const nospace = Array.from(text.replace(/\s/g, "")).length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.length ? text.split(/\n/).length : 0;
  return `Söz: ${words}\nSimvol: ${chars}\nBoşluqsuz: ${nospace}\nSətir: ${lines}`;
}

function cases(text) {
  const words = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^0-9A-Za-zəöüğıışçƏÖÜĞIİŞÇ]+/).filter(Boolean);
  if (!words.length) throw new Error("empty");
  const lower = words.map((word) => word.toLowerCase());
  const camel = lower.map((word, index) => (index ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join("");
  return `Böyük: ${text.toUpperCase()}\nKiçik: ${text.toLowerCase()}\ncamelCase: ${camel}\nsnake_case: ${lower.join("_")}`;
}

function color(text) {
  const raw = text.trim();
  const hex = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!hex) throw new Error("color");
  const n = [0, 2, 4].map((at) => parseInt(hex[1].slice(at, at + 2), 16));
  return `#${hex[1].toLowerCase()}\nrgb(${n.join(", ")})`;
}

function base(text) {
  const raw = text.trim().toLowerCase().replace(/[\s_]/g, "");
  let value;
  if (raw.startsWith("0b")) value = BigInt(raw);
  else if (raw.startsWith("0x")) value = BigInt(raw);
  else if (/^[0-9]+$/.test(raw)) value = BigInt(raw);
  else if (/^[0-9a-f]+$/.test(raw) && /[a-f]/.test(raw)) value = BigInt(`0x${raw}`);
  else throw new Error("base");
  return `10: ${value.toString(10)}\n2: ${value.toString(2)}\n16: ${value.toString(16)}`;
}

function pxrem(text) {
  const raw = text.trim().toLowerCase();
  const px = raw.match(/^(-?\d+(?:\.\d+)?)\s*px$/);
  const rem = raw.match(/^(-?\d+(?:\.\d+)?)\s*rem$/);
  if (px) return `${px[1]}px\n${Math.round((Number(px[1]) / 16) * 1000) / 1000}rem`;
  if (rem) return `${Math.round(Number(rem[1]) * 16 * 1000) / 1000}px\n${rem[1]}rem`;
  throw new Error("px");
}

function jwt(text) {
  const parts = text.trim().split(".");
  if (parts.length < 2) throw new Error("jwt");
  const read = (part) => Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const header = JSON.stringify(JSON.parse(read(parts[0])), null, 2);
  const body = JSON.stringify(JSON.parse(read(parts[1])), null, 2);
  return `İmza yoxlanmır.\n\nheader\n${header}\n\npayload\n${body}`;
}

function cron(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("cron");
  const week = ["bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə"];
  const day = /^\d$/.test(parts[4]) ? week[Number(parts[4])] || parts[4] : parts[4];
  return `Dəqiqə: ${parts[0]}\nSaat: ${parts[1]}\nGün: ${parts[2]}\nAy: ${parts[3]}\nHəftə: ${day}`;
}

function chmod(text) {
  const bits = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  const raw = text.trim().toLowerCase();
  if (/^[0-7]{3,4}$/.test(raw)) return `${raw}\n${[...raw.slice(-3)].map((digit) => bits[Number(digit)]).join("")}`;
  if (/^[rwx-]{9}$/.test(raw)) return `${raw.match(/.{3}/g).map((group) => bits.indexOf(group)).join("")}\n${raw}`;
  throw new Error("chmod");
}

const TOOLS = [
  { id: "json", slug: "json", test: /(?:json)\s*(?:düzəlt|duzelt|format|formatter|düzəld|beautify)/i, run: jsonFormat },
  { id: "json-min", slug: "json-minifier", test: /json\s*(?:sıx|six|minify|minifier)/i, run: jsonMin },
  { id: "md5", slug: "md5", test: /\bmd5\b/i, run: (text) => hash(text, "md5") },
  { id: "sha256", slug: "sha-256", test: /sha-?256/i, run: (text) => hash(text, "sha256") },
  { id: "hash", slug: "hash", test: /sha-?1\b|\bhash\b/i, run: (text) => hash(text, "sha1") },
  { id: "base64", slug: "base64", test: /base64/i, run: (text, all) => b64(text, /aç|decode|oku|декод/i.test(all)) },
  { id: "uuid", slug: "uuid", test: /\buuid\b/i, run: () => randomBytes(16).toString("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5") },
  { id: "password", slug: "password", test: /(?:şifrə|sifre|parol|password|كلمة سر)\s*(?:yarat|düzəlt|et|üret|:|\d)/i, run: (text) => {
    const len = Math.max(8, Math.min(40, Number((text.match(/\d+/) || ["12"])[0]) || 12));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    return Array.from({ length: len }, () => alphabet[randomInt(alphabet.length)]).join("");
  } },
  { id: "unix", slug: "unix-time", test: /unix|timestamp/i, run: unix },
  { id: "count", slug: "word-count", test: /söz sayı|soz say|word count|simvol sayı|kelime say/i, run: count },
  { id: "case", slug: "letter-case", test: /camelcase|snake_case|hərf form|harf biçim/i, run: cases },
  { id: "color", slug: "color", test: /rəng|renk|color|#[0-9a-f]{3,6}/i, run: (text) => color(pick(text, /#?[0-9a-f]{6}/i)) },
  { id: "base", slug: "binary-hex", test: /ikilik|onaltılıq|binary|hex/i, run: base },
  { id: "pxrem", slug: "px-rem", test: /\d+(?:\.\d+)?\s*(?:px|rem)\b/i, run: (text) => pxrem(pick(text, /-?\d+(?:\.\d+)?\s*(?:px|rem)/i)) },
  { id: "jwt", slug: "jwt", test: /\bjwt\b|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i, run: (text) => jwt(pick(text, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/)) },
  { id: "cron", slug: "cron", test: /\bcron\b/i, run: (text) => cron(pick(text, /(?:\S+\s+){4}\S+/)) },
  { id: "chmod", slug: "chmod", test: /\bchmod\b|\brwx[r-][w-][x-]/i, run: (text) => chmod(pick(text, /[0-7]{3,4}|[rwx-]{9}/i)) },
];

export function toolsReply(message) {
  const text = String(message || "").trim();
  if (!text || text.length > 5000) return null;
  if (/nədir|nedir|what is|nedir\?|necə işləyir|ne ise yarar/i.test(text) && !/[:：]/.test(text) && text.length < 80) return null;
  const tool = TOOLS.find((item) => item.test.test(text));
  if (!tool) return null;
  const body = tool.id === "uuid" ? "" : payload(text) || text;
  if (tool.id !== "uuid" && tool.id !== "password" && body.length < 1) return null;
  try {
    const out = tool.run(body, text);
    if (!out) return null;
    const bodyText = `${out}${tail(tool.slug)}`;
    return SECRET.has(tool.id) ? `::vault::\n${bodyText}` : bodyText;
  } catch {
    return null;
  }
}
