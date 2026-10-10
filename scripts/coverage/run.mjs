// İstifadə: node scripts/coverage/run.mjs [baseUrl] [out.json] [--misses]
// Kitab-yalnız rejimində (x-nibras-books-only) hər bölmənin dəstini yoxlayır; /api/search üçün nəticə sayı.
import fs from "node:fs";
import * as S from "./sets.mjs";
const BASE = process.argv[2] || "http://localhost:3077";
const OUT = process.argv[3];
const MISSES = process.argv.includes("--misses");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const hit = {
  FATAWA: (j) => /::tafsir fatawa::/.test(j.reply || ""),
  HADITH: (j) => /::tafsir hadith/.test(j.reply || ""),
  NAHW: (j) => /::tafsir nahw::/.test(j.reply || ""),
  ITBOOKS: (j) => j.kind === "book" && !!j.reply && !/::tafsir (?:fatawa|hadith|nahw|lugha)/.test(j.reply),
  TAWHID: (j) => j.kind === "tawhid",
  QURAN: (j) => ["ayah", "quran", "tafsir"].includes(j.kind),
  LUGHA: (j) => /::tafsir lugha::/.test(j.reply || ""),
  NEGATIVE: (j) => !j.reply,
};
async function chat(m) {
  for (let i = 0; i < 3; i++)
    try {
      const r = await fetch(BASE + "/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-nibras-books-only": "1" }, body: JSON.stringify({ message: m, lang: "az", history: [], noticeShown: false }) });
      return await r.json();
    } catch (e) {
      if (i === 2) throw e;
    }
}
const store = {};
const summary = {};
for (const [name, list] of Object.entries(S)) {
  if (!Array.isArray(list) || (ONLY.length && !ONLY.includes(name))) continue;
  let ok = 0;
  const miss = [];
  for (const q of list) {
    let good;
    if (name === "SEARCH") {
      const j = await (await fetch(BASE + "/api/search?q=" + encodeURIComponent(q))).json();
      good = (j.total || 0) > 0 || (j.groups || []).some((g) => (g.hits || g.results || []).length);
      store["search:" + q] = j.total || 0;
    } else {
      const j = await chat(q);
      good = hit[name](j);
      store[q] = { kind: j.kind || null, reply: j.reply || null };
    }
    if (good) ok++;
    else miss.push(q);
  }
  summary[name] = { total: list.length, hit: ok, rate: Math.round((1000 * ok) / list.length) / 10 };
  console.log(`${name.padEnd(9)} ${ok}/${list.length} = ${summary[name].rate}%`);
  if (MISSES && miss.length) console.log("   miss: " + miss.join(" ‖ "));
}
if (OUT && !ONLY.length) fs.writeFileSync(OUT, JSON.stringify({ summary, store }));
