// Nibras Tərcümə mühərriki: defolt MODELSİZ. Yalnız mövcud insan tərcümələrindən axtarış/uyğunlaşdırma. Heç nə yaradılmır.
//  1) sabit ifadə lüğəti (formulae): dua/salavat ifadələri, qarşılıqları korpusdan sayla çıxarılıb;
//  2) hədis uyğunlaşdırması: giriş mətni HadeethEnc hədis mətnləri ilə (ən uzun ortaq söz ardıcıllığı) tutuşdurulur, tapılan hədisin hazır tərcüməsi qaytarılır;
//  3) tapılmasa: method "no-source" (heç vaxt uydurma yoxdur);
//  4) İSTƏYƏ BAĞLI: mühərrik adapteri (setDefaultEngine / opts.engine / TRANSLATE_ENGINE_URL, src/adapter.js). 1-3 nəticə vermədisə (və ya hədəf dildə insan tərcüməsi yoxdursa) çağırılır:
//     method "model" (tək mühərrik) və ya "ensemble" (bir neçə modelin konsensusu; adapter özü method qaytarır). Həmişə «maşın tərcüməsi» kimi etiketlənir, insan tərcümələri parallel[]-də qalır.
import { loadPart, extSource } from "./data.js";
import { tokens, quotedCore, numbersIn, detectScript, normAr, normLat } from "./normalize.js";
import { msg, footerFor, BRAND, UI_LANGS } from "./messages.js";
import { envEngine } from "./adapter.js";

export const LANGS = ["ar", "az", "tr", "en", "ru"];
export const MAX_TEXT = 3000;
const SOURCE_NAME = "HadeethEnc.com";
const SOURCE_LICENSE = "Mətn dəyişdirilmədən, mənbə göstərilməklə istifadə olunur (HadeethEnc şərtləri)";
const hadithUrl = (lang, id) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`;
let defaultEngine = null;
/** Host tətbiqi (məs. Nibras AI saytı) öz mühərrikini qeydiyyata alır: async ({text, from, to, ui, ctx}) => {translation, engine?, confidence?, method?, noteKeys?, meta?} | {limited:"rate"|"budget"} | null */
export function setDefaultEngine(fn) {
  defaultEngine = typeof fn === "function" ? fn : null;
}
export const hasDefaultEngine = () => Boolean(defaultEngine);
const LANG_NAME = { ar: "ərəbcə", az: "azərbaycanca", tr: "türkcə", en: "ingiliscə", ru: "rusca" };

// ------------------------------------------------------------ indekslər (tənbəl)
const _idx = new Map();
/** Dil üçün sənəd siyahısı: [{i, variants:[{toks, set, raw}]}] */
async function index(lang) {
  if (!_idx.has(lang)) {
    _idx.set(
      lang,
      (async () => {
        const data = await loadPart(lang);
        const docs = [];
        if (lang === "ar") {
          data.forEach((row, i) => {
            const texts = [row[1], ...(row[5] || [])];
            const variants = [];
            for (const t of texts) {
              variants.push({ raw: t, toks: tokens("ar", t) });
              const core = quotedCore(t);
              if (core) {
                const ct = tokens("ar", core);
                variants.push({ raw: core, toks: ct, core: true, frac: ct.length / Math.max(1, variants[variants.length - 1].toks.length) });
              }
            }
            docs.push({ i, variants });
          });
        } else {
          for (const [k, row] of Object.entries(data)) docs.push({ i: Number(k), variants: [{ raw: row[0], toks: tokens(lang, row[0]) }] });
        }
        for (const d of docs) for (const v of d.variants) v.set = new Set(v.toks);
        return docs;
      })(),
    );
  }
  return _idx.get(lang);
}

// Rəvayət boilerplate-i (isnad/salavat sözləri): bunlar uyğunluğun «məzmun» ölçüsünə sayılmır, yoxsa «سمعت رسول الله صلى الله عليه وسلم يقول» hər hədisə uyğun gəlir.
const STOP_AR = new Set("عن قال قالت قالوا سمعت سمع رسول الله صلي عليه وسلم يقول رضي عنه عنها عنهما عنهم النبي نبي ان انه ابي ابو بن ابن حدثنا اخبرنا حدثني اخبرني ثم في من علي الي هو هي ما لا لم".split(" "));
const STOP = {
  ar: STOP_AR,
  az: new Set("allah allahin ve ve bir bu ki ile da de ucun olsun razi ondan deyib deyir edir revayet edilir resulu".split(" ")),
  tr: new Set("ve bir bu ki ile de da icin allah rasulullah rivayet edildigine gore sallallahu aleyhi sellem radiyallahu anh anhuma".split(" ")),
  en: new Set("the a an of and to in is was be that it he his him she her with for as on by from said allah messenger may pleased peace blessings upon".split(" ")),
  ru: new Set("и в на с что он его не как по да аллах аллаха посланник сказал будет доволен".split(" ")),
};

/** Ən uzun ortaq ardıcıl söz bloku: { L, Lc (stop-söz olmayan sayı) }. */
function longestRun(a, b, lang) {
  const stop = STOP[lang] || new Set();
  let best = 0;
  let bestEnd = 0;
  let prev = new Int32Array(b.length + 1);
  let cur = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) {
          best = cur[j];
          bestEnd = i;
        }
      } else cur[j] = 0;
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  let Lc = 0;
  for (let k = bestEnd - best; k < bestEnd; k++) if (!stop.has(a[k])) Lc++;
  return { L: best, Lc };
}

/** q (token siyahısı) üçün namizəd hədislər, xalına görə sıralı. */
async function findDocs(lang, q, rawText) {
  const docs = await index(lang);
  const stop = STOP[lang] || new Set();
  const qc = new Set(q.filter((t) => !stop.has(t))); // məzmun sözləri (boilerplate-siz)
  const out = [];
  for (const d of docs) {
    let best = null;
    for (const v of d.variants) {
      if (!v.cset) v.cset = new Set([...v.set].filter((t) => !stop.has(t)));
      let ov = 0;
      for (const t of qc) if (v.cset.has(t)) ov++;
      if (ov < 2 || ov / Math.min(qc.size, v.cset.size) < 0.4) continue;
      const run = longestRun(q, v.toks, lang);
      const L = run.L;
      const Lc = run.Lc;
      if (L < 2 || Lc < 2) continue;
      const cq = L / q.length;
      const cd = L / v.toks.length;
      let type = null;
      let conf = 0;
      // «…» içindəki mətn (core) hədisin yalnız kiçik hissəsidirsə (frac < 0.45), onun tam uyğunluğu hədisin tamamı demək deyil: yalnız fragment/partial ola bilər
      const coreOk = !v.core || (v.frac >= 0.45 && Lc >= 5);
      if (coreOk && L === q.length && L === v.toks.length) {
        const exact = !v.core && String(rawText).trim() === v.raw.trim();
        type = v.core ? "matn" : exact ? "exact" : "normalized";
        conf = v.core ? 0.92 : exact ? 1 : 0.97;
      } else if (coreOk && cd >= 0.9 && Lc >= 4) {
        type = "contains";
        conf = 0.9;
      } else if (cq >= 0.95 && Lc >= 3) {
        type = "fragment";
        conf = Lc >= 8 ? 0.85 : Lc >= 5 ? 0.75 : 0.6;
      } else if (Lc >= 3 && Math.max(cq, cd) >= 0.4) {
        type = "partial";
        conf = 0.4;
      }
      if (!type) continue;
      const cand = { i: d.i, type, conf, L, Lc, cq, cd };
      if (!best || cand.conf > best.conf || (cand.conf === best.conf && cand.Lc > best.Lc)) best = cand;
    }
    if (best) out.push(best);
  }
  out.sort((a, b) => b.conf - a.conf || b.Lc - a.Lc || b.cd - a.cd);
  return out;
}

// ------------------------------------------------------------ yardımçılar
async function arRow(i) {
  return (await loadPart("ar"))[i];
}
async function langRow(lang, i) {
  if (lang === "ar") {
    const r = await arRow(i);
    return r ? [r[1], r[2], r[3]] : null;
  }
  return (await loadPart(lang))[i] || null;
}
const srcOf = (lang, id) => {
  const x = id >= 900000 ? extSource(id, lang) : null;
  if (x) return { name: x.name, url: x.url, lang, license: x.license };
  return srcOfHe(lang, id);
};
const srcOfHe = (lang, id) => ({ name: SOURCE_NAME, url: hadithUrl(lang === "ru" || lang === "en" || lang === "ar" || lang === "tr" || lang === "az" ? lang : "en", id), lang, license: SOURCE_LICENSE });

/** Sabit ifadələr: tam bərabərlik (normallaşdırılmış) -> cavab. Bir neçə ifadə eyni mətni verirsə (məs. az «Allah ondan razı olsun» həm عنه, həm عنها) hamısı qaytarılır. */
async function lexiconLookup(text, from, to) {
  const f = await loadPart("formulae");
  const q = tokens(from, text).join(" ");
  if (!q || q.split(" ").length > 8) return null;
  const hits = [];
  for (const [key, entry] of Object.entries(f)) {
    const forms = { ar: key, ...Object.fromEntries(Object.entries(entry.forms).map(([l, v]) => [l, v.text])) };
    if (!forms[from] || tokens(from, forms[from]).join(" ") !== q) continue;
    if (!forms[to]) continue;
    hits.push({ key, text: forms[to], count: entry.forms[to]?.count ?? entry.forms[from]?.count ?? null, entry, forms });
  }
  return hits.length ? hits : null;
}

function crossCheck(map, arText) {
  const per = {};
  for (const [l, t] of Object.entries(map)) per[l] = numbersIn(t);
  if (arText) per.ar = numbersIn(arText);
  const langs = Object.keys(per);
  const withNum = langs.filter((l) => per[l].length);
  let agree = null;
  if (withNum.length >= 2) {
    const ref = JSON.stringify([...new Set(per[withNum[0]])].sort());
    agree = withNum.every((l) => JSON.stringify([...new Set(per[l])].sort()) === ref);
  }
  return { check: "numbers", compared: langs, numbers: per, agree, same_source_id: true };
}

// ------------------------------------------------------------ əsas funksiya
/**
 * translate({ text, from = "auto", to, ui = "az", parallel = true, engine?, model = true })
 * -> { ok, brand, from, to, input, method, translation, translation_lang, confidence, match, sources, parallel, candidates, closest, crosscheck, notes, footer }
 * method: lookup | lookup-alt-lang | lexicon | model | no-source.  footer: hər tərcümənin altında göstərilən kiçik sətir (ui dilində).
 */
export async function translate(opts = {}) {
  const ui = UI_LANGS.includes(opts.ui) ? opts.ui : "az";
  const text = String(opts.text ?? "").trim();
  const to = String(opts.to || "az").toLowerCase();
  const from = String(opts.from || "auto").toLowerCase();
  const base = { ok: true, brand: BRAND, from, to, input: text.slice(0, 200), method: "no-source", translation: null, translation_lang: null, confidence: 0, match: null, sources: [], parallel: [], candidates: [], notes: [] };
  const withFooter = (r) => (r.translation || r.method === "lookup-alt-lang" ? { ...r, footer: footerFor(ui) } : r);
  const fail = (key, vars) => ({ ...base, ok: false, error: msg(ui, key, vars), notes: [msg(ui, key, vars)] });
  if (!text) return fail("empty");
  const maxChars = Number(opts.maxChars) > 0 ? Number(opts.maxChars) : MAX_TEXT;
  if (text.length > maxChars) return fail("tooLong", { n: maxChars });
  if (!LANGS.includes(to) || (from !== "auto" && !LANGS.includes(from))) return fail("badLang");
  if (from === to) return fail("sameLang");

  // mənbə dili
  let fromLangs;
  const script = detectScript(text);
  if (from !== "auto") fromLangs = [from];
  else if (script === "ar") fromLangs = ["ar"];
  else if (script === "ru") fromLangs = ["ru"];
  else if (script === "latin") fromLangs = ["az", "tr", "en"].filter((l) => l !== to);
  else fromLangs = [];

  // İstəyə bağlı model mühərriki (yalnız hazır mənbə nəticə verməyəndə və ya hədəf dildə yoxdursa)
  const engines = opts.model === false ? [] : opts.engine ? [opts.engine] : [defaultEngine, envEngine()].filter(Boolean);
  const engine = engines.length
    ? async (a) => {
        for (const e of engines) {
          const m = await e(a);
          if (m) return m;
        }
        return null;
      }
    : null;
  const viaModel = async (res) => {
    if (!engine) return null;
    let m = null;
    try {
      m = await engine({ text, from: from !== "auto" ? from : script === "latin" ? "auto" : script || "auto", to, ui, ctx: opts.ctx });
    } catch {
      m = null;
    }
    if (m && m.limited) {
      return { ...res, limited: m.limited, notes: [msg(ui, m.limited === "rate" ? "rateLimited" : "budget"), ...(res.notes || []).filter((n) => n !== msg(ui, "noSource"))] };
    }
    if (!m || !m.translation) return null;
    const method = m.method === "ensemble" ? "ensemble" : "model";
    return withFooter({
      ...res,
      method,
      translation: m.translation,
      translation_lang: to,
      confidence: m.confidence ?? 0.5,
      machine: true,
      flags: m.noteKeys || [],
      sources: [{ name: m.engine, type: method === "ensemble" ? "machine" : "model", lang: to, ...(m.pivot ? { pivot: m.pivot } : {}) }],
      notes: [msg(ui, "model"), ...(m.noteKeys || []).map((k) => msg(ui, k)), ...(res.notes || []).filter((n) => n !== msg(ui, "noSource"))],
      ...(opts.debug && m.meta ? { diagnostics: m.meta } : {}),
    });
  };
  const noSource = async (res = {}) => {
    const r = { ...base, ...res, method: "no-source", notes: [msg(ui, "noSource"), ...(res.notes || []).filter((n) => n !== msg(ui, "noSource"))] };
    return (await viaModel(r)) || r;
  };
  if (!fromLangs.length) return noSource();

  // 1) sabit ifadə
  for (const fl of fromLangs) {
    const hits = await lexiconLookup(text, fl, to);
    if (hits) {
      const lx = hits[0];
      const parallel = Object.entries(lx.forms).filter(([l]) => l !== fl && l !== to).map(([l, t]) => ({ lang: l, text: t, label: LANG_NAME[l] }));
      const notes = [msg(ui, "lexicon", { count: lx.count })];
      if (hits.length > 1) notes.push(msg(ui, "lexAmbiguous", { keys: hits.map((h) => h.key).join(" | ") }));
      return withFooter({
        ...base,
        from: fl,
        method: "lexicon",
        translation: lx.text,
        translation_lang: to,
        confidence: hits.length > 1 ? 0.7 : 0.9,
        match: { type: "formula", kind: "formula", key: lx.key, corpus_hadiths: lx.entry.n_docs },
        candidates: hits.length > 1 ? hits.map((h) => ({ type: "formula", key: h.key, translation: h.text })) : [],
        sources: [{ name: SOURCE_NAME, url: "https://hadeethenc.com", lang: to, license: SOURCE_LICENSE, note: "korpusda ən çox işlənən qarşılıq" }],
        parallel: opts.parallel === false ? [] : parallel,
        notes,
      });
    }
  }

  // 2) hədis uyğunlaşdırması
  let best = null;
  let chosenFrom = null;
  for (const fl of fromLangs) {
    const q = tokens(fl, text);
    if (q.length < 3) continue;
    const found = await findDocs(fl, q, text);
    if (found.length && (!best || found[0].conf > best[0].conf || (found[0].conf === best[0].conf && found[0].Lc > best[0].Lc))) {
      best = found;
      chosenFrom = fl;
    }
  }
  if (!best) return noSource({ from: fromLangs[0] });

  // Eyni hədis bir neçə mənbədə ola bilər (HadeethEnc + əlavə mənbə): bərabər uyğunluqlar arasında hədəf dildə hazır tərcüməsi olan seçilir
  if (best.length > 1 && best[0].type !== "partial") {
    const t0 = best[0];
    const tie = best.filter((c) => c.type === t0.type && c.conf === t0.conf && c.Lc >= t0.Lc * 0.95 && c.cq >= t0.cq * 0.95);
    if (tie.length > 1) {
      const has = [];
      for (const c of tie) has.push(Boolean(await langRow(to, c.i)));
      const k = has.findIndex(Boolean);
      if (k > 0) best = [tie[k], ...best.filter((c) => c !== tie[k])];
    }
  }
  const top = best[0];
  const rowAr = await arRow(top.i);
  const id = rowAr[0];
  const match = {
    type: top.type,
    kind: "hadith",
    id,
    ar_text: rowAr[1],
    attribution_ar: rowAr[2],
    grade_ar: rowAr[3],
    reference: rowAr[4],
    covered_words: top.L,
    url: id >= 900000 ? extSource(id, "ar")?.url || hadithUrl("ar", id) : hadithUrl("ar", id),
  };
  const sameTier = best.filter((c) => c.type === top.type && c.Lc >= top.Lc * 0.95 && c.cq >= top.cq * 0.95);
  const candidates = [];
  for (const c of top.type === "partial" || top.type === "fragment" ? best.slice(1, 6).filter((c) => sameTier.includes(c) || top.type === "partial") : []) {
    const r = await arRow(c.i);
    candidates.push({ id: r[0], type: c.type, confidence: c.conf, ar_text: r[1], url: hadithUrl("ar", r[0]) });
  }
  const notes = [];
  if (fromLangs.length > 1) notes.push(msg(ui, "ambiguousLang", { lang: chosenFrom }));

  const result = { ...base, from: chosenFrom, match, candidates };
  const rows = {};
  for (const l of LANGS.filter((l) => l !== chosenFrom)) {
    const r = await langRow(l, top.i);
    if (r) rows[l] = r;
  }
  const row = (l) => ({ lang: l, label: LANG_NAME[l], text: rows[l][0], attribution: rows[l][1], grade: rows[l][2], source: srcOf(l, id) });

  if (top.type === "partial") {
    // qismən oxşarlıq: tərcümə kimi verilmir
    result.confidence = 0.4;
    result.closest = { match, translations: Object.fromEntries(Object.keys(rows).map((l) => [l, row(l)])) };
    return noSource({ from: chosenFrom, match, candidates, closest: result.closest, confidence: 0.4, notes: [msg(ui, "closest")] });
  }

  const crossMap = Object.fromEntries(Object.entries(rows).filter(([l]) => l !== "ar").map(([l, r]) => [l, r[0]]));
  if (chosenFrom !== "ar") crossMap[chosenFrom] = text;
  result.crosscheck = Object.keys(crossMap).length ? crossCheck(crossMap, rowAr[1]) : null;
  const wantRows = Object.keys(rows).filter((l) => l !== to);
  // Hədis daha uzun mətnin kiçik hissəsidir (məs. fətva içində sitat): hazır tərcümə yalnız o hissəni əhatə edir, qalanı üçün mühərrik; hazır insan tərcüməsi parallel[]-də qalır
  if (engine && chosenFrom === "ar" && top.type === "contains" && top.cq < 0.6 && tokens("ar", text).length >= 12) {
    const humanParts = Object.keys(rows).map((l) => row(l));
    const m = await viaModel({ ...result, parallel: opts.parallel === false ? [] : humanParts, notes: [msg(ui, "humanPart")], sources: [] });
    if (m && m.translation) return m;
  }
  if (opts.parallel !== false || !rows[to]) result.parallel = wantRows.map((l) => row(l));
  const shape = [];
  if (top.type === "fragment" || top.type === "matn") shape.push(msg(ui, "fragment"));
  if (top.type === "contains") shape.push(msg(ui, "contains"));

  if (rows[to]) {
    result.method = "lookup";
    result.translation = rows[to][0];
    result.translation_lang = to;
    result.confidence = top.conf;
    result.sources = [srcOf(to, id)];
    if (to !== "ar") result.translation_meta = { attribution: rows[to][1], grade: rows[to][2] };
    notes.push(msg(ui, "credit"), ...shape);
    if (candidates.length && top.type === "fragment") notes.push(msg(ui, "ambiguous"));
    if (result.crosscheck && result.crosscheck.agree === false) {
      result.confidence = Math.round(result.confidence * 0.8 * 100) / 100;
      notes.push(msg(ui, "numDisagree"));
    }
    result.notes = notes;
    return withFooter(result);
  }
  if (wantRows.length) {
    result.method = "lookup-alt-lang";
    result.confidence = Math.round(top.conf * 0.7 * 100) / 100;
    result.sources = wantRows.map((l) => srcOf(l, id));
    result.notes = [msg(ui, "noTarget", { to: LANG_NAME[to] || to }), ...shape];
    // model qoşulubsa: hədəf dildə model tərcüməsi əsas, hazır insan tərcümələri parallel qalır
    return (await viaModel(result)) || withFooter(result);
  }
  return noSource({ from: chosenFrom, match, candidates });
}

/** Sabit ifadə cədvəli (mühərrik göstərişləri üçün): [{ar, text}] verilmiş hədəf dilində. */
export async function formulaHints(to) {
  const f = await loadPart("formulae");
  return Object.entries(f)
    .map(([ar, e]) => ({ ar, text: e.forms?.[to]?.text }))
    .filter((x) => x.text);
}

export async function coverage() {
  const out = {};
  const ar = await loadPart("ar");
  const he = ar.filter((r) => r[0] < 900000).length;
  out.ar = he;
  for (const l of ["az", "tr", "en", "ru"]) {
    const d = await loadPart(l);
    out[l] = Object.keys(d).filter((k) => ar[k] && ar[k][0] < 900000).length;
  }
  // əlavə mənbələr (HadeethEnc-dən kənar): dil -> say
  const extra = {};
  for (const l of ["az", "tr", "en", "ru"]) {
    const d = await loadPart(l);
    const n = Object.keys(d).filter((k) => ar[k] && ar[k][0] >= 900000).length;
    if (n) extra[l] = n;
  }
  if (ar.length > he) out.extra = { hadiths: ar.length - he, ...extra };
  return out;
}
