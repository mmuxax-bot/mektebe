// Tərcümə mühərrikinin təmiz (şəbəkəsiz) funksiyaları: Quran ayələrinin maskalanması, cümlə-uyğun bölmə, namizəd yoxlaması, konsensus (medoid).
import { numbersIn } from "./_translate/normalize.js";

// ---------------------------------------------------------------- Quran maskası
// {…} və ﴿…﴾ içindəki mətn modelə verilmir: [[Q1]] yer tutucusu ilə gedir, cavabda olduğu kimi geri qoyulur.
const VERSE_RE = /\{[^{}]*\}|﴿[^﴾]*﴾/g;
export function maskVerses(text) {
  const verses = [];
  const masked = String(text).replace(VERSE_RE, (m) => {
    verses.push(m);
    return `[[Q${verses.length}]]`;
  });
  return { masked, verses };
}
export function unmaskVerses(text, verses) {
  return String(text).replace(/\[\[\s*Q(\d+)\s*\]\]/g, (m, n) => verses[Number(n) - 1] ?? m);
}

// ---------------------------------------------------------------- bölmə
// Maskalanmış mətni (yer tutucular bölünmür) cümlə sərhədlərində ≤ max simvolluq hissələrə bölür. Hər hissə: {text, sep} (sep: sonrakı hissə ilə birləşdirən " " və ya "\n").
export function splitChunks(masked, max = 900) {
  const units = [];
  for (const line of String(masked).replace(/\r/g, "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const raw = t.split(/(?<=[.!?؟۔؛;:])\s+/u).filter(Boolean);
    // «1.» / «٣)» kimi sıra nömrəsi növbəti cümlədən ayrılmasın
    const parts = [];
    for (const p of raw) {
      if (parts.length && /^[\d٠-٩۰-۹]+[.)]$/.test(parts[parts.length - 1])) parts[parts.length - 1] += " " + p;
      else parts.push(p);
    }
    parts.forEach((p, i) => units.push({ s: p, brk: i === parts.length - 1 ? "\n" : " " }));
  }
  // çox uzun cümləni vergüldə, sonra sözlərdə böl
  const small = [];
  for (const u of units) {
    if (u.s.length <= max) {
      small.push(u);
      continue;
    }
    const bits = u.s.split(/(?<=[،,])\s+/u).filter(Boolean);
    const flat = [];
    for (const b of bits) {
      if (b.length <= max) flat.push(b);
      else {
        let cur = "";
        for (const w of b.split(/\s+/)) {
          if (cur && (cur + " " + w).length > max) {
            flat.push(cur);
            cur = w;
          } else cur = cur ? cur + " " + w : w;
        }
        if (cur) flat.push(cur);
      }
    }
    flat.forEach((b, i) => small.push({ s: b, brk: i === flat.length - 1 ? u.brk : " " }));
  }
  const chunks = [];
  let cur = null;
  for (const u of small) {
    if (cur && (cur.text + cur.sep + u.s).length <= max) {
      cur.text += cur.sep + u.s;
      cur.sep = u.brk;
    } else {
      if (cur) chunks.push(cur);
      cur = { text: u.s, sep: u.brk };
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ---------------------------------------------------------------- yoxlama / təmizləmə
const REFUSAL = /(^|\s)(i (cannot|can't|am unable)|sorry|as an ai|i'm sorry|üzr istəyirəm|bağışlayın|не могу|извините|hata:)/i;
export function cleanCandidate(raw) {
  let t = String(raw || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  t = t.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
  t = t.replace(/^(?:translation|tərcümə|tercume|çeviri|перевод|result)\s*[:：]\s*/i, "");
  t = t.replace(/^<<<\s*|\s*>>>$/g, "").trim();
  t = t.replace(/^["“«]\s*([\s\S]*?)\s*["”»]$/, (m, a) => (/["“”«»]/.test(a) ? m : a)).trim();
  return t;
}
const SCRIPT = { az: /[A-Za-zƏəİıÖöÜüĞğŞşÇç]/g, tr: /[A-Za-zİıÖöÜüĞğŞşÇç]/g, en: /[A-Za-z]/g, ru: /[\u0400-\u04FF]/g, ar: /[\u0600-\u06FF]/g };
const ANY_LETTER = /\p{L}/gu;
// {ok, reason}: yer tutucular, yazı sistemi, uzunluq nisbəti, imtina cümlələri
export function validateCandidate(text, { source, to, placeholders = 0 }) {
  if (!text) return { ok: false, reason: "empty" };
  if (REFUSAL.test(text.slice(0, 80)) && !REFUSAL.test(source.slice(0, 80))) return { ok: false, reason: "refusal" };
  for (let i = 1; i <= placeholders; i++) if (!new RegExp(`\\[\\[\\s*Q${i}\\s*\\]\\]`).test(text)) return { ok: false, reason: "verse-lost" };
  const body = text.replace(/\[\[\s*Q\d+\s*\]\]/g, "");
  const letters = (body.match(ANY_LETTER) || []).length;
  if (letters) {
    const own = (body.match(SCRIPT[to] || SCRIPT.en) || []).length;
    if (own / letters < 0.8) return { ok: false, reason: "script" };
  }
  const srcLen = source.replace(/\[\[\s*Q\d+\s*\]\]/g, "").length || 1;
  const r = body.length / srcLen;
  if (srcLen > 20 && (r < 0.25 || r > 3.5)) return { ok: false, reason: "length" };
  return { ok: true };
}

// ---------------------------------------------------------------- oxşarlıq (chrF-yönümlü)
export function normCmp(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ё/g, "е")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[\[\s*q\d+\s*\]\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function grams(s, n) {
  const m = new Map();
  for (let i = 0; i + n <= s.length; i++) {
    const g = s.slice(i, i + n);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}
function dice(a, b) {
  let ta = 0;
  let tb = 0;
  let inter = 0;
  for (const v of a.values()) ta += v;
  for (const v of b.values()) tb += v;
  if (!ta || !tb) return ta === tb ? 1 : 0;
  for (const [k, v] of a) inter += Math.min(v, b.get(k) || 0);
  return (2 * inter) / (ta + tb);
}
function wordGrams(words, n) {
  const m = new Map();
  for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n).join(" ");
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}
/** Simmetrik oxşarlıq 0..1: simvol n-qramları (n=1..5, boşluqsuz) 55%, söz unigram 25%, söz bigram 20%. */
export function similarity(a, b) {
  const na = normCmp(a);
  const nb = normCmp(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ca = na.replace(/\s/g, "");
  const cb = nb.replace(/\s/g, "");
  let cs = 0;
  for (let n = 1; n <= 5; n++) cs += dice(grams(ca, n), grams(cb, n));
  cs /= 5;
  const wa = na.split(" ");
  const wb = nb.split(" ");
  return 0.55 * cs + 0.25 * dice(wordGrams(wa, 1), wordGrams(wb, 1)) + 0.2 * (wa.length < 2 || wb.length < 2 ? dice(wordGrams(wa, 1), wordGrams(wb, 1)) : dice(wordGrams(wa, 2), wordGrams(wb, 2)));
}
// Xüsusi adlar (böyük hərflə başlayan, cümlə əvvəli olmayan sözlər)
export function namesIn(t) {
  const out = new Set();
  const words = String(t).replace(/\[\[\s*Q\d+\s*\]\]/g, " ").split(/\s+/);
  words.forEach((w, i) => {
    const c = w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (c.length < 3 || !/^\p{Lu}/u.test(c)) return;
    const prev = words[i - 1] || "";
    if (i === 0 || /[.!?:؟]$/.test(prev)) return;
    out.add(normCmp(c));
  });
  return out;
}
const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1;
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/** İki namizəd arasında razılaşma 0..1: oxşarlıq × uzunluq amili, rəqəm uyğunsuzluğu və ad fərqi cəzası. */
export function agreement(a, b) {
  let s = similarity(a, b);
  const la = a.length || 1;
  const lb = b.length || 1;
  s *= Math.sqrt(Math.min(la, lb) / Math.max(la, lb));
  const na = new Set(numbersIn(a));
  const nb = new Set(numbersIn(b));
  if ((na.size || nb.size) && !sameSet(na, nb)) s *= 0.85;
  const ma = namesIn(a);
  const mb = namesIn(b);
  if (ma.size || mb.size) s = s * 0.9 + 0.1 * jaccard(ma, mb) * s;
  return s;
}

/**
 * Konsensus. cands: [{id, text, rank}] (rank: provayder keyfiyyət sırası, kiçik = yaxşı).
 * source: ərəbcə mətn (yer tutucularla). Qaytarır: {best, meanAgreement, scores, confidence, disagree, single}
 */
export function consensus(cands, { source = "", to = "az" } = {}) {
  if (!cands.length) return null;
  const srcNums = new Set(numbersIn(source));
  const scored = cands.map((c, i) => {
    const others = cands.filter((_, j) => j !== i);
    const ag = others.map((o) => agreement(c.text, o.text));
    let mean = ag.length ? ag.reduce((x, y) => x + y, 0) / ag.length : 0;
    let penalty = 0;
    const nums = new Set(numbersIn(c.text));
    if (srcNums.size && [...srcNums].some((n) => !nums.has(n))) penalty += 0.1; // mənbədəki rəqəm itib
    if (to === "az" && /yarat/i.test(c.text) && !/خلق|خالق|برأ|بارئ|فطر|أنشأ|انشأ|ابدع|أبدع/.test(source)) penalty += 0.08; // «yaratmaq» yalnız Allah üçün
    return { ...c, agreement: mean, penalty, score: mean - penalty, agrees: ag };
  });
  scored.sort((a, b) => b.score - a.score || a.rank - b.rank);
  const best = scored[0];
  const n = cands.length;
  // etibar üçün çoxluğun razılaşması: ən yüksək floor(n/2) razılaşmanın ortası (bir kənar cavab etibarı sındırmasın)
  const top = [...best.agrees].sort((x, y) => y - x).slice(0, Math.max(1, Math.floor(n / 2)));
  const m = n > 1 ? top.reduce((x, y) => x + y, 0) / top.length : 0;
  let confidence;
  if (n === 1) confidence = 0.45;
  else {
    confidence = 0.4 + 0.5 * Math.min(1, Math.max(0, (m - 0.25) / 0.5));
    if (n === 2) confidence *= 0.92;
  }
  confidence -= best.penalty;
  const disagree = n > 1 && m < 0.4;
  if (disagree) confidence = Math.min(confidence, 0.5);
  confidence = Math.max(0.05, Math.min(0.95, confidence));
  return { best, meanAgreement: n > 1 ? Math.round(m * 100) / 100 : null, scores: scored.map((c) => ({ id: c.id, score: Math.round(c.score * 100) / 100 })), confidence: Math.round(confidence * 100) / 100, disagree, single: n === 1 };
}
