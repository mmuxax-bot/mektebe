// Nibras AI söhbətində «tərcümə et: …» / «translate: …» / «переведи: …» / «ترجم: …» sorğusu.
// Modelsiz: api/_translate (hazır insan tərcümələrindən axtarış). AI-yə getmir; heç nə uydurulmur.
// Yalnız aydın əmr sözü + (iki nöqtə və ya ərəbcə mətn) olanda işləyir. Mənbə tapılmayanda: ərəb yazılı mətn üçün dürüst «mənbə yoxdur» cavabı;
// qeyri-ərəb mətn üçün null (adi söhbət/AI davam edir ki, adi tərcümə istəkləri pozulmasın).
import { translate } from "./_translate/engine.js";
import { makeCtx } from "./_translate/http.js";
import { googleTranslate } from "./_google.js";
import "./_translate-ensemble.js"; // maşın tərcüməsi mühərriki (hazır tərcümə olmayanda)

const CUES = [
  { re: /^\s*(?:tercüme\s+et|tercüme|çeviri)(?=[\s:：]|$)/i, ui: "tr", def: "tr" },
  { re: /^\s*(?:z[əe]hm[əe]t olmasa\s+)?(t[əe]rc[üu]m[əe]\s+et|t[əe]rc[üu]m[əe]|tercume\s+et|tercume|çevir|cevir)(?=[\s:：]|$)/i, ui: "az", def: "az" },
  { re: /^\s*(?:please\s+)?(translate(?:\s+this)?|translation)(?=[\s:：]|$)/i, ui: "en", def: "en" },
  { re: /^\s*(?:пожалуйста,?\s+)?(переведи(?:те)?|перевод)(?=[\s:：]|$)/i, ui: "ru", def: "ru" },
  { re: /^\s*(ترجم|ترجمة|ترجِم)(?=[\s:：]|$)/, ui: "ar", def: "az" },
];
const TARGETS = [
  ["ar", /ərəb|ereb|arab|араб|العربي/i],
  ["az", /azərbaycan|azerbaycan|azerbaijan|azeri|азербайджан|أذربيجان|اذربيجان|الأذري|الاذري/i],
  ["tr", /türk|turk|турецк|التركي/i],
  ["en", /ingilis|english|английск|الإنجليز|الانجليز/i],
  ["ru", /\brus|russian|русск|الروس/i],
];
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_PREFIX_WORDS = /^(?:\s*(?:إلى|الى|الي|الإنجليزية|الانجليزية|العربية|الأذربيجانية|الاذربيجانية|التركية|الروسية|نص|هذا|الحديث|حديث)\s*)+$/;

export function parseTranslate(message) {
  const m = String(message || "").trim();
  let cue = null;
  for (const c of CUES) {
    const x = c.re.exec(m);
    if (x) {
      cue = { ...c, len: x[0].length };
      break;
    }
  }
  if (!cue) return null;
  const rest = m.slice(cue.len);
  let prefix = "";
  let body = "";
  const colon = rest.search(/[:：]/);
  if (colon >= 0 && colon <= 70) {
    const p = rest.slice(0, colon);
    const words = p.trim().split(/\s+/).filter(Boolean);
    const ok = cue.def === "az" && AR_RE.test(p) ? ARABIC_PREFIX_WORDS.test(p) : !AR_RE.test(p) && words.length <= 5;
    if (ok || !p.trim()) {
      prefix = p;
      body = rest.slice(colon + 1);
    }
  }
  if (!body) {
    const ai = rest.search(AR_RE);
    if (ai >= 0) {
      const p = rest.slice(0, ai);
      if (p.trim().split(/\s+/).filter(Boolean).length > 5) return null;
      prefix = p;
      body = rest.slice(ai);
      const ar = /^\s*(?:إلى|الى)\s+(\S+)\s+(.+)$/s.exec(rest);
      if (ar) {
        prefix = ar[1];
        body = ar[2];
      }
    } else body = rest.trim();
  }
  body = body.trim().replace(/^["“«]+|["”»]+$/g, "").trim();
  if (!body) return null;
  const tokens = body.split(/\s+/);
  let cutAt = 0;
  let leadTo = null;
  while (cutAt < Math.min(4, tokens.length)) {
    const word = tokens[cutAt];
    const hit = TARGETS.find(([, re]) => re.test(word));
    if (hit) {
      leadTo = hit[0];
      cutAt++;
      continue;
    }
    if (/^(to|into|на|dilin[əe]|diline|dilinde)$/i.test(word)) {
      cutAt++;
      continue;
    }
    break;
  }
  if (leadTo) body = tokens.slice(cutAt).join(" ").trim();
  if (!body) return null;
  let to = leadTo;
  for (const [l, re] of TARGETS) if (!to && re.test(prefix)) to = l;
  return { ui: cue.ui, to, def: cue.def, text: body };
}

const L = {
  az: { head: (lang) => `Tərcümə (${lang})`, src: "Mənbə", grade: "Hökm (mənbədə)", others: "Digər dillərdə hazır tərcümələr (çevrilməyib)", closest: "Ən yaxın hədis (tərcümə deyil)", formula: "Sabit ifadə", langs: { ar: "ərəbcə", az: "azərbaycanca", tr: "türkcə", en: "ingiliscə", ru: "rusca" } },
  tr: { head: (lang) => `Çeviri (${lang})`, src: "Kaynak", grade: "Hüküm (kaynakta)", others: "Diğer dillerde hazır çeviriler (çevrilmedi)", closest: "En yakın hadis (çeviri değil)", formula: "Sabit ifade", langs: { ar: "Arapça", az: "Azerbaycanca", tr: "Türkçe", en: "İngilizce", ru: "Rusça" } },
  en: { head: (lang) => `Translation (${lang})`, src: "Source", grade: "Grade (per source)", others: "Ready translations in other languages (not converted)", closest: "Closest hadith (not a translation)", formula: "Fixed phrase", langs: { ar: "Arabic", az: "Azerbaijani", tr: "Turkish", en: "English", ru: "Russian" } },
  ru: { head: (lang) => `Перевод (${lang})`, src: "Источник", grade: "Степень (по источнику)", others: "Готовые переводы на другие языки (не конвертированы)", closest: "Ближайший хадис (не перевод)", formula: "Устойчивое выражение", langs: { ar: "арабский", az: "азербайджанский", tr: "турецкий", en: "английский", ru: "русский" } },
  ar: { head: (lang) => `الترجمة (${lang})`, src: "المصدر", grade: "الحكم (في المصدر)", others: "ترجمات جاهزة بلغات أخرى (غير محوّلة)", closest: "أقرب حديث (ليس ترجمة)", formula: "عبارة ثابتة", langs: { ar: "العربية", az: "الأذربيجانية", tr: "التركية", en: "الإنجليزية", ru: "الروسية" } },
};
const cut = (s, n = 900) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + " …" : s);

export function formatReply(r, ui) {
  const t = L[ui] || L.az;
  const out = [];
  const foot = r.footer ? `_${r.footer}_` : "";
  if (r.method === "lexicon") {
    out.push(`**${t.formula}**: ${r.match.key} → ${r.translation}`, r.notes.join(" "), foot);
  } else if (r.method === "lookup" || r.method === "model" || r.method === "ensemble") {
    out.push(`**${t.head(t.langs[r.translation_lang])}**`, r.translation);
    const meta = r.translation_meta;
    const bits = r.method === "model" || r.method === "ensemble" ? [] : [`${t.src}: HadeethEnc.com — ${r.sources[0].url}`];
    if (meta?.grade) bits.push(`${t.grade}: ${meta.grade}${meta.attribution ? " · " + meta.attribution : ""}`);
    if (bits.length) out.push(bits.join("\n"));
    out.push(r.notes.join(" "), foot);
  } else if (r.method === "lookup-alt-lang") {
    out.push(`**${r.notes[0]}**`, `**${t.others}:**`);
    for (const p of r.parallel) out.push(`**${t.langs[p.lang]}:** ${cut(p.text, 700)}\n${t.src}: ${p.source.url}`);
    out.push(r.notes.slice(1).join(" "), foot);
  } else if (r.closest) {
    const c = r.closest;
    out.push(r.notes.join(" "), `**${t.closest}:** ${cut(c.match.ar_text, 500)}`);
    const wanted = c.translations[r.to];
    if (wanted) out.push(`${t.langs[r.to]} (${t.src}: ${wanted.source.url}): ${cut(wanted.text, 700)}`);
  } else out.push(r.notes.join(" "));
  return out.filter(Boolean).join("\n\n");
}

function googleReply(text, ui, to) {
  const t = L[ui] || L.az;
  const note = {
    az: "Qısa xəta ola bilər.",
    en: "A small error is possible.",
    tr: "Kısa bir hata olabilir.",
    ru: "Возможна небольшая ошибка.",
    ar: "قد يكون هناك خطأ بسيط.",
  };
  return `**${t.head(t.langs[to] || to)}**\n${text}\n\n${note[ui] || note.az}`;
}

export async function translateReply(message, { ip } = {}) {
  const p = parseTranslate(message);
  if (!p) return null;
  const arabic = AR_RE.test(p.text);
  const to = p.to || p.def;
  if (arabic) {
    try {
      const r = await translate({ text: p.text, from: "ar", to, ui: p.ui, model: false, ctx: makeCtx(ip || "chat", { budgetMs: 12_000 }) });
      if (r?.ok && r.translation && r.method !== "no-source") return formatReply(r, p.ui);
    } catch { /* hazır mənbə yoxdursa Google */ }
  }
  let target = to;
  let g = await googleTranslate(p.text, target);
  if (g?.from === target) {
    const alt = target === "en" ? "az" : "en";
    const second = await googleTranslate(p.text, alt, g.from);
    if (second?.text) {
      g = second;
      target = alt;
    }
  }
  if (!g?.text) return null;
  return googleReply(g.text, p.ui, target);
}
