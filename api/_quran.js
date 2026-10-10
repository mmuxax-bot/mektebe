// Bəqərə surəsi sözlərinin izahı: AI-yə getmədən hazır cavab.
// Məlumat: api/_quran/baqara.js (davamı gələndə SOURCES siyahısına yeni fayl əlavə edin).
import { namesFatawaBook } from "./_fatawa-name.js";
import BAQARA from "./_quran/baqara.js";

const SOURCES = [BAQARA];
const SURAHS = { 2: { az: "Bəqərə", ar: "البقرة" } };
const MAX_WORDS = 25;
const MAX_TOKENS = 40;
const TOL = 0.45; // latın yazılışda eyni yerə düşən sözlər arasında yol verilən məsafə fərqi

// ---------- normallaşdırma ----------
const AR_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF\u0610-\u061A]/g;

export function normAr(text) {
  return String(text || "")
    .replace(AR_MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئء]/g, "")
    .replace(/[ڪک]/g, "ك")
    .replace(/[ی]/g, "ي")
    .replace(/\u200c|\u200d/g, "");
}

function digits(text) {
  return String(text || "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

function foldLat(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "");
}

// Samit "skeleti": ərəbcə söz və latın yazılış eyni kökə gətirilir (sait, ع, ء, ا, و, ي atılır).
// coarse = yaxın samitlər birləşdirilmiş açar; fine = dəqiq samit siyahısı (eyni uzunluqda, uyğunsuzluq cəzası üçün).
const AR_FINE = {
  ب: "b", ت: "t", ط: "t", ث: "s", س: "s", ص: "s", ش: "S", ج: "j", ح: "h", خ: "x", ه: "h",
  د: "d", ذ: "z", ز: "z", ظ: "z", ض: "d", ر: "r", غ: "g", ق: "q", ك: "k", ف: "f", ل: "l", م: "m", ن: "n",
};
const COARSE = { b: "b", t: "t", s: "s", S: "s", j: "j", h: "h", x: "h", d: "d", z: "d", r: "r", f: "f", l: "l", m: "m", n: "n", q: "k", k: "k", g: "k" };
// yarı-cəza (tez-tez qarışdırılan yazılışlar)
const HALF = {
  خ: "h", ح: "x", ذ: "d", ظ: "d", ض: "z", ث: "t", ش: "s", ق: "kg", غ: "kq", ك: "qg",
};

function pairFromFine(fineLetters) {
  let coarse = "";
  const fine = [];
  for (const f of fineLetters) {
    const c = COARSE[f];
    if (!c) continue;
    if (coarse[coarse.length - 1] === c) continue;
    coarse += c;
    fine.push(f);
  }
  return { coarse, fine };
}

function pairAr(word) {
  const letters = [];
  for (const ch of word) if (AR_FINE[ch]) letters.push({ ch, f: AR_FINE[ch] });
  let coarse = "";
  const fine = [];
  for (const { ch, f } of letters) {
    const c = COARSE[f];
    if (coarse[coarse.length - 1] === c) continue;
    coarse += c;
    fine.push(ch);
  }
  return { coarse, fine };
}

function letterCost(arCh, latF) {
  if (AR_FINE[arCh] === latF) return 0;
  if ((HALF[arCh] || "").includes(latF)) return 0.5;
  return 1;
}

function pairCost(arFine, latFine) {
  if (arFine.length !== latFine.length) return 9;
  let c = 0;
  for (let i = 0; i < arFine.length; i++) c += letterCost(arFine[i], latFine[i]);
  return c;
}

export function skelLat(token) {
  return latPair(token).coarse;
}

function latPair(token) {
  let s = String(token || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/ə/g, "a")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "S")
    .replace(/ç/g, "j")
    .replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/kh/g, "x").replace(/gh/g, "g").replace(/sh/g, "S").replace(/th/g, "s").replace(/dh/g, "z").replace(/ch/g, "j");
  const letters = [];
  for (const ch of s) {
    if (ch === "p") letters.push("b");
    else if (ch === "c") letters.push("j");
    else if (COARSE[ch] && (ch === "S" || /[a-z]/.test(ch))) letters.push(ch);
  }
  return pairFromFine(letters);
}

function skelAr(word) {
  return pairAr(word).coarse;
}

const PREFIXES = ["وال", "فال", "بال", "كال", "ولل", "لل", "ال", "و", "ف", "ب", "ك", "ل"];
const SUFFIXES = ["ون", "ين", "ان", "ات", "وا", "ها", "هم", "هن", "كم", "نا", "ك", "ه", "ي", "ا", "ت"];

function variantsAr(t, lenient) {
  const out = new Set([t]);
  for (let pass = 0; pass < 2; pass++) {
    for (const v of [...out]) for (const p of PREFIXES) if (v.startsWith(p) && v.length - p.length >= 2) out.add(v.slice(p.length));
  }
  if (lenient) {
    for (const v of [...out]) for (const s of SUFFIXES) if (v.endsWith(s) && v.length - s.length >= 3) out.add(v.slice(0, -s.length));
    for (const v of [...out]) if (v.endsWith("ين")) out.add(v.slice(0, -2) + "ون");
    for (const v of [...out]) if (v.endsWith("ه") && v.length - 1 >= 2) out.add(v.slice(0, -1));
  }
  return out;
}

// Latın token üçün: coarse açar -> fine siyahı (tənvin -un/-in/-an və -tun sonluqları da yoxlanılır)
function variantsLat(token) {
  const base = latPair(token);
  const out = new Map();
  const add = (coarse, fine) => {
    if (coarse.length >= 1 && !out.has(coarse)) out.set(coarse, fine);
  };
  add(base.coarse, base.fine);
  const forms = [[base.coarse, base.fine]];
  if (base.coarse.endsWith("n") && base.coarse.length - 1 >= 2) {
    forms.push([base.coarse.slice(0, -1), base.fine.slice(0, -1)]);
    if (base.coarse.endsWith("tn") && base.coarse.length - 2 >= 2) forms.push([base.coarse.slice(0, -2), base.fine.slice(0, -2)]);
  }
  for (const [c, f] of forms) {
    add(c, f);
    for (const p of ["l", "b", "f", "k"]) if (c.startsWith(p) && c.length - 1 >= 3) add(c.slice(1), f.slice(1));
  }
  return out;
}

// ---------- məlumat indeksi ----------
const ENTRIES = SOURCES.flat().map((e, i) => {
  const norm = normAr(e.word).replace(/[^\u0621-\u064A\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  return {
    ...e,
    id: `${e.surah}:${e.ayah}:${i}`,
    order: i,
    tokens: norm,
    strict: norm.map((t) => variantsAr(t, false)),
    lenient: norm.map((t) => variantsAr(t, true)),
    lat: norm.map((t) => {
      const map = new Map(); // coarse -> [fine massivləri]
      for (const v of variantsAr(t, true)) {
        const p = pairAr(v);
        if (!p.coarse) continue;
        if (!map.has(p.coarse)) map.set(p.coarse, []);
        map.get(p.coarse).push({ fine: p.fine, pen: v === t ? 0 : t.endsWith(v) ? 0.05 : 0.2 });
      }
      return map;
    }),
    letters: norm.join("").length,
  };
});

export const MAX_AYAH = ENTRIES.reduce((m, e) => Math.max(m, e.ayah), 0);
export const MIN_AYAH = ENTRIES.reduce((m, e) => Math.min(m, e.ayah), 999);

const STOP = new Set(["لا", "ولا", "ما", "وما", "فما", "بما", "من", "ومن", "في", "هم", "لن", "ولن", "او", "الله", "لك", "به", "الي", "اليك", "علي", "ان"]);
const AR_FILLER = new Set(["الكلمات", "كلمات", "كلمه", "الكلمه", "الايه", "ايه", "الايات", "ايات", "سوره", "السوره", "البقره", "القران", "معني", "معاني", "تفسير", "شرح", "ما", "هو", "هي", "ماذا", "يعني", "المقصود", "المراد", "اشرح", "لي", "قوله", "تعالي", "من", "في", "عن", "هل", "او", "كلمات"]);
const LAT_FILLER = new Set(
  (
    "nedir ne nece neden hansi bunun bunlarin soz sozu sozun sozunun sozler sozlerin sozlerinin kelime kelimeler kelimelerin kelimenin kelmeler " +
    "kelmelerin ifade ifadenin ifadesi deyir deyilir demek demekdir bize mene ver yaz goster izah izahi et edin eder edirem isteyirem lazimdir " +
    "lutfen zehmet olmasa the of what is does word words phrase in this from tell me about please verse verses surah quran and ve ile ucun bir her " +
    "hem ki da de cox sual cavab olan olur haqqinda barede aye ayeler ayenin ayede ayedeki ayesi ayelerin ayelerde ayelerdeki ayet ayat ayah ayahs sure suresi " +
    "suresinde suredeki surede menasi menasini menalari mena anlami anlam meaning means mean translation tercume tercumesi tefsir tafsir " +
    "beqere beqerenin bekere baqara baqarah bakara bakarah al kuran koran verildi istifade"
  ).split(" "),
);

// ---------- ipucu (cue) aşkarlanması ----------
function cues(raw) {
  const f = foldLat(digits(raw));
  const a = normAr(raw);
  const low = raw.toLowerCase();
  const meaning =
    /\b(mena\w*|izah\w*|tercum\w*|tefsir\w*|tafsir\w*|ne demek\w*|nedemek\w*|ne deme\w*|anlam\w*|meaning\w*|means|translat\w*|explan\w*)\b/.test(f) ||
    /(معني|معاني|تفسير|شرح|المقصود|المراد|ما يعني|ماذا يعني|توضيح)/.test(a) ||
    /(значени|смысл|перевод|толкован|тафсир|что значит|что означает)/.test(low);
  const surah =
    /\b(baqara\w*|bakara\w*|beqere\w*|bekere\w*|al ?baqarah?)\b/.test(f) || /(البقره|بقره)/.test(a) || /бакар/.test(low) || /(^|[^\d])2\s*:\s*\d{1,3}/.test(digits(raw));
  const quran =
    surah ||
    /\b(aye\w*|ayet\w*|ayat\w*|ayah\w*|verse\w*|quran\w*|kuran\w*|koran\w*|surah\w*|sura\w*|sure(si|nin|de|ler\w*)|suresi\w*)\b/.test(f) ||
    /(ايه|ايات|الايات|سوره|القران|قران)/.test(a) ||
    /(аят|сура|суре|коран)/.test(low);
  const wordCue = /\b(soz\w*|kelime\w*|kelmeler\w*|word\w*|phrase)\b/.test(f) || /(كلمات|كلمه|الكلمات)/.test(a) || /слов/.test(low);
  return { meaning, surah, quran, wordCue };
}

function tokenize(raw) {
  const text = digits(raw).toLowerCase();
  const tokens = [];
  const re = /[\u0600-\u06FF\u0750-\u077F]+|[a-z\u00c0-\u024f\u0259\u0131](?:[a-z\u00c0-\u024f\u0259\u0131'’`ʼʿ-]*[a-z\u00c0-\u024f\u0259\u0131])?|[\u0400-\u04ff]+|\d+/g;
  let m;
  while ((m = re.exec(text))) {
    const t = m[0];
    if (/^\d+$/.test(t)) tokens.push({ kind: "num", raw: t });
    else if (/[\u0600-\u077F]/.test(t)) {
      const n = normAr(t).replace(/[^\u0621-\u064A]/g, "");
      if (n) tokens.push({ kind: "ar", raw: t, norm: n, strict: variantsAr(n, false), lenient: variantsAr(n, true) });
    } else if (/[\u0400-\u04ff]/.test(t)) tokens.push({ kind: "cy", raw: t });
    else {
      const f = foldLat(t).replace(/-/g, "");
      const lat = variantsLat(t);
      tokens.push({ kind: "lat", raw: t, fold: f, lat, baseKey: lat.keys().next().value || "" });
    }
  }
  return tokens;
}

function intersectKey(a, b) {
  let best = "";
  for (const k of a) if (b.has(k) && k.length > best.length) best = k;
  return best;
}

// Mesaj tokeni ilə giriş tokeni uyğundurmu: {len, cost} qaytarır (uyğun deyilsə null).
function matchToken(tok, entry, i, strict, baseOnly) {
  if (tok.kind === "ar") {
    const k = intersectKey(strict ? tok.strict : tok.lenient, strict ? entry.strict[i] : entry.lenient[i]);
    return k ? { len: k.length, cost: 0 } : null;
  }
  if (tok.kind === "lat") {
    let best = null;
    for (const [coarse, latFine] of tok.lat) {
      if (baseOnly && coarse !== tok.baseKey) continue;
      const arFines = entry.lat[i].get(coarse);
      if (!arFines) continue;
      for (const af of arFines) {
        const cost = pairCost(af.fine, latFine) + (coarse !== tok.baseKey ? 0.3 : 0) + af.pen;
        if (!best || cost < best.cost || (cost === best.cost && coarse.length > best.len)) best = { len: coarse.length, cost };
      }
    }
    return best;
  }
  return null;
}

function isFillerTok(tok) {
  if (tok.kind === "num" || tok.kind === "cy") return true;
  if (tok.kind === "ar") return AR_FILLER.has(tok.norm) && tok.norm !== "كلمات";
  return LAT_FILLER.has(tok.fold);
}

// ---------- söz uyğunluğu ----------
// Latın yazılışda minimum samit sayı: ipucu nə qədər güclüdürsə, bir o qədər qısa açar qəbul edilir.
function latMinFor(tok, c) {
  if (c.quran && c.meaning) return 2;
  if (c.quran) return 3;
  if (c.meaning && tok.raw.length >= 6 && /ğ|gh/.test(tok.raw)) return 2;
  if (/[ğx]|gh|kh|dh|'/.test(tok.raw)) return 3;
  return 4;
}

function wordMatches(tokens, c, bare) {
  const full = [];
  for (const e of ENTRIES) {
    for (let s = 0; s + e.tokens.length <= tokens.length; s++) {
      let ok = true;
      let cost = 0;
      let latLen = 0;
      let latTok = null;
      let arSeen = false;
      for (let j = 0; j < e.tokens.length; j++) {
        const tok = tokens[s + j];
        if (!tok || (tok.kind !== "ar" && tok.kind !== "lat")) {
          ok = false;
          break;
        }
        if (e.tokens.length === 1 && isFillerTok(tok) && tok.norm !== "كلمات") {
          ok = false;
          break;
        }
        const k = matchToken(tok, e, j, bare);
        if (!k) {
          ok = false;
          break;
        }
        cost += k.cost;
        if (tok.kind === "ar") arSeen = true;
        else {
          latLen += k.len;
          if (!latTok || tok.fold.length > latTok.fold.length) latTok = tok;
        }
      }
      if (!ok) continue;
      if (latTok && !arSeen && latLen < latMinFor(latTok, c)) continue;
      if (!latTok && bare && e.letters < 3) continue;
      if (!latTok && !bare && e.letters < 2) continue;
      full.push({ e, start: s, end: s + e.tokens.length, cost, kind: "full" });
    }
  }
  // eyni yerə düşən müxtəlif sözlərdən ən yaxın yazılışı seç
  const groups = new Map();
  for (const h of full) {
    const key = h.start + ":" + h.end;
    const g = groups.get(key);
    if (!g || h.cost < g.min) groups.set(key, { min: h.cost });
  }
  const close = full.filter((h) => h.cost <= groups.get(h.start + ":" + h.end).min + TOL);
  // daha uzun giriş eyni yeri əhatə edirsə, qısanı at
  return {
    full: close.filter((a) => !close.some((b) => b !== a && b.start <= a.start && b.end >= a.end && b.e.tokens.length > a.e.tokens.length)),
  };
}

function partialMatches(tokens, c) {
  const contentIdx = [];
  tokens.forEach((t, i) => {
    if ((t.kind === "ar" || t.kind === "lat") && !isFillerTok(t) && (t.kind === "ar" ? t.norm.length >= 2 : t.fold.length >= 4)) contentIdx.push(i);
  });
  const content = contentIdx.map((i) => tokens[i]);
  if (!content.length || content.length > 3) return [];
  const spanStart = contentIdx[0];
  const spanEnd = contentIdx[contentIdx.length - 1] + 1;
  const out = [];
  for (const e of ENTRIES) {
    if (e.tokens.length <= content.length) continue;
    for (let off = 0; off + content.length <= e.tokens.length; off++) {
      let ok = true;
      let notStop = false;
      let cost = 0;
      for (let j = 0; j < content.length; j++) {
        const k = matchToken(content[j], e, off + j, false, true);
        if (!k || (content[j].kind === "lat" && k.len < latMinFor(content[j], c))) {
          ok = false;
          break;
        }
        cost += k.cost;
        if (!STOP.has(e.tokens[off + j])) notStop = true;
      }
      if (!ok || !notStop) continue;
      out.push({ e, cost, start: spanStart, end: spanEnd, kind: "partial" });
      break;
    }
  }
  return out;
}

// ---------- ayə nömrələri ----------
function ayahNumbers(raw) {
  const text = digits(raw);
  const colon = text.match(/(?:^|[^\d])2\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/);
  if (colon) return [Number(colon[1]), colon[2] ? Number(colon[2]) : null].filter((n) => n !== null);
  const nums = (text.match(/\d{1,3}/g) || []).map(Number).filter((n) => n >= 1 && n <= 286);
  return nums.slice(0, 2);
}

function ord(n) {
  const d = n % 10;
  let s;
  if (d === 0) {
    const t = Math.floor(n / 10) % 10;
    s = { 1: "cu", 2: "ci", 3: "cu", 4: "cı", 5: "ci", 6: "cı", 7: "ci", 8: "ci", 9: "cı", 0: "cü" }[t];
  } else s = { 1: "ci", 2: "ci", 3: "cü", 4: "cü", 5: "ci", 6: "cı", 7: "ci", 8: "ci", 9: "cu" }[d];
  return `${n}-${s}`;
}

function joinAz(list) {
  if (list.length <= 1) return list.join("");
  return list.slice(0, -1).join(", ") + " və " + list[list.length - 1];
}

function compress(nums) {
  const out = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j > i ? `${nums[i]}–${nums[j]}` : String(nums[i]));
    i = j + 1;
  }
  return out.join(", ");
}

// ---------- cavab formatı ----------
const SRC_AR = () => `المصدر: شرح كلمات سورة البقرة، الآيات ${MIN_AYAH}–${MAX_AYAH} (جواب جاهز)`;

function footerAz() {
  return `Mənbə: Bəqərə surəsi ${MIN_AYAH}–${ord(MAX_AYAH)} ayələrdəki sözlərin izahı (hazır cavab)`;
}

function formatEntries(hits, lang, headline, extra) {
  const ayahs = [...new Set(hits.map((h) => h.ayah))];
  const lines = [];
  if (lang === "ar") {
    lines.push(headline || `سورة البقرة، ${ayahs.length === 1 ? "الآية " + ayahs[0] : "الآيات " + ayahs.join("، ")}`);
  } else {
    lines.push(headline || `Bəqərə surəsi, ${ayahs.length === 1 ? ord(ayahs[0]) + " ayə" : joinAz(ayahs.map(ord)) + " ayələr"}`);
  }
  lines.push("");
  hits.forEach((h, i) => {
    if (lang === "ar") {
      lines.push(`${i + 1}) ${h.word} (الآية ${h.ayah})`);
      lines.push(`المعنى: ${h.ar}`);
    } else {
      lines.push(`${i + 1}) ${h.word} (${ord(h.ayah)} ayə)`);
      lines.push(`Mənası: ${h.az}`);
      lines.push(`Ərəbcə izah: ${h.ar}`);
    }
    lines.push("");
  });
  if (extra) {
    lines.push(extra);
    lines.push("");
  }
  lines.push(lang === "ar" ? SRC_AR() : footerAz());
  return lines.join("\n");
}

function notAvailable(lang) {
  if (lang === "ar") return `حاليًا يتوفر فقط شرح كلمات سورة البقرة من الآية ${MIN_AYAH} إلى ${MAX_AYAH}. وسيُضاف الباقي إن شاء الله. وللتفسير الموسّع يُرجى الرجوع إلى العلماء الثقات.`;
  return `Hazırda yalnız Bəqərə surəsi ${MIN_AYAH}–${ord(MAX_AYAH)} ayələrdəki sözlərin izahı mövcuddur. Davamı əlavə olunacaq, inşallah. Geniş təfsir üçün etibarlı alimlərə müraciət edin.`;
}

function offer(lang) {
  const avail = compress([...new Set(ENTRIES.map((e) => e.ayah))].sort((a, b) => a - b));
  if (lang === "ar") {
    return `يتوفر شرح كلمات سورة البقرة من الآية ${MIN_AYAH} إلى ${MAX_AYAH}. اكتب رقم الآية أو نطاقًا، مثل: «البقرة آية 25» أو «البقرة 1-10»، أو اكتب الكلمة نفسها.\n\nالآيات التي فيها كلمات: ${avail}\n\n${SRC_AR()}`;
  }
  return `Bəqərə surəsinin ${MIN_AYAH}–${ord(MAX_AYAH)} ayələrindəki sözlərin izahı var. Ayə nömrəsi və ya aralıq yaz, məsələn: «Bəqərə 25-ci ayə» və ya «Bəqərə 1-10-cu ayələr». Sözün özünü də yaza bilərsən, məsələn: «المفلحون mənası».\n\nSözləri olan ayələr: ${avail}\n\n${footerAz()}`;
}

function rangeReply(lo, hi, lang, narrowed) {
  let hits = ENTRIES.filter((e) => e.ayah >= lo && e.ayah <= hi).sort((a, b) => a.order - b.order);
  if (!hits.length) {
    const avail = compress([...new Set(ENTRIES.map((e) => e.ayah))].sort((a, b) => a - b));
    return lang === "ar"
      ? `لا توجد كلمات مشروحة في هذا النطاق. الآيات المتوفرة: ${avail}\n\n${SRC_AR()}`
      : `Bu aralıqda cədvəldə izah olunan söz yoxdur. Sözləri olan ayələr: ${avail}\n\n${footerAz()}`;
  }
  let note = "";
  if (hits.length > MAX_WORDS) {
    const cut = [];
    let last = 0;
    for (const h of hits) {
      if (cut.length >= MAX_WORDS && h.ayah !== last) break;
      if (cut.length >= MAX_WORDS) continue;
      cut.push(h);
      last = h.ayah;
    }
    // son ayə tam daxil deyilsə, onu çıxar (ən azı bir ayə qalsın)
    const lastAyah = cut[cut.length - 1].ayah;
    const inCut = cut.filter((h) => h.ayah === lastAyah).length;
    const total = hits.filter((h) => h.ayah === lastAyah).length;
    let shown = cut;
    if (inCut < total && cut.some((h) => h.ayah !== lastAyah)) shown = cut.filter((h) => h.ayah !== lastAyah);
    const shownLast = shown[shown.length - 1].ayah;
    const nextStart = hits.find((h) => h.ayah > shownLast).ayah;
    const nextEnd = Math.min(hi, nextStart + 9);
    note =
      lang === "ar"
        ? `ظهرت الآيات حتى ${shownLast} فقط.\n::sug::\n::sb:: المتابعة: البقرة ${nextStart}-${nextEnd} | البقرة ${nextStart}-${nextEnd}\n::/sug::`
        : `Cavabın uzunluğuna görə ${ord(shownLast)} ayəyə qədər göstərildi.\n::sug::\n::sb:: Davamı: Bəqərə ${nextStart}-${nextEnd} | Bəqərə ${nextStart}-${nextEnd}\n::/sug::`;
    hits = shown;
  }
  const first = hits[0].ayah;
  const last = hits[hits.length - 1].ayah;
  let headline;
  if (first !== last) {
    headline = lang === "ar" ? `سورة البقرة، الآيات ${first}–${last}` : `Bəqərə surəsi, ${first}–${ord(last)} ayələr`;
  }
  return formatEntries(hits, lang, headline, narrowed ? null : note || null) + "";
}

// ---------- əsas giriş ----------
export function quranReply(message) {
  if (namesFatawaBook(message)) return null; // «Məcmuu əl-Fətava» adı surə adına (Fatihə) bənzədilməsin
  const raw = String(message || "").trim();
  if (!raw || raw.length > 800) return null;
  const lang = /[\u0600-\u06FF]/.test(raw) ? "ar" : "az";
  const c = cues(raw);
  const tokens = tokenize(raw);
  if (!tokens.length || tokens.length > MAX_TOKENS) return null;

  // Ayə / aralıq sorğusu (surə adı məcburidir)
  if (c.surah) {
    const nums = ayahNumbers(raw);
    if (nums.length) {
      let lo = nums[0];
      let hi = nums.length > 1 ? nums[1] : nums[0];
      if (lo > hi) [lo, hi] = [hi, lo];
      if (lo > MAX_AYAH) {
        return c.meaning || c.wordCue ? notAvailable(lang) : null;
      }
      if (lo < 1) return null;
      const m = wordMatches(tokens, c, false);
      const inRange = m.full.filter((h) => h.e.ayah >= lo && h.e.ayah <= Math.min(hi, MAX_AYAH));
      if (inRange.length && lo === hi) {
        const hits = inRange.map((h) => h.e).sort((a, b) => a.order - b.order);
        return formatEntries(hits, lang, null, null);
      }
      return rangeReply(lo, Math.min(hi, MAX_AYAH), lang, false);
    }
  }

  const arabicOnly = tokens.every((t) => t.kind === "ar") && !/[a-z0-9\u0400-\u04ff]/i.test(digits(raw).replace(/[\u0600-\u06FF\s\u064B-\u065F\u0670\u06D6-\u06ED«»"“”()\[\]﴿﴾:؟?!.,،؛*-]/g, ""));
  const cued = c.meaning || c.quran;
  const bare = !cued && arabicOnly && tokens.length <= 4;
  if (!cued && !bare) return null;

  const m = wordMatches(tokens, c, bare);
  let hits = [];
  if (bare) {
    const covered = new Set();
    for (const h of m.full) for (let i = h.start; i < h.end; i++) covered.add(i);
    if (covered.size === tokens.length) hits = m.full;
  } else {
    const coveredIdx = new Set();
    for (const h of m.full) for (let i = h.start; i < h.end; i++) coveredIdx.add(i);
    const unexplained = tokens.filter((t, i) => (t.kind === "ar" || t.kind === "lat") && !isFillerTok(t) && !coveredIdx.has(i)).length;
    hits = m.full.filter((h) => !(h.e.letters <= 3 && unexplained > 0) && (unexplained <= 3 || c.quran));
  }
  // çoxsözlü girişin bir hissəsi (məs. «ريب» -> «لا ريب فيه») əlavə göstərilir
  const part = partialMatches(tokens, c);
  if (!hits.length) {
    if (!bare) hits = part;
  } else {
    const overlap = (a, b) => a.start < b.end && b.start < a.end;
    const fulls = hits.filter((h) => !part.some((p) => overlap(p, h) && p.cost + TOL < h.cost));
    const parts = part.filter((p) => !hits.some((h) => overlap(p, h) && h.cost + TOL < p.cost));
    hits = fulls.concat(parts.slice(0, 4));
  }
  const seen = new Set();
  const uniq = [];
  for (const h of hits) {
    if (seen.has(h.e.id)) continue;
    seen.add(h.e.id);
    uniq.push(h.e);
  }
  uniq.sort((a, b) => a.order - b.order);
  if (!uniq.length) {
    if (c.surah && c.meaning) return offer(lang);
    return null;
  }
  let shown = uniq;
  let extra = null;
  if (uniq.length > MAX_WORDS) {
    shown = uniq.slice(0, MAX_WORDS);
    extra = lang === "ar" ? "للمتابعة ضيّق السؤال أو حدّد الآية." : "Davamı üçün sualı daralt və ya ayəni göstər.";
  }
  return formatEntries(shown, lang, null, extra);
}

export const __internals = { ENTRIES, normAr, skelLat, skelAr, ord, cues, tokenize, variantsAr };
