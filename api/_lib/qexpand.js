// Kitabxana axtarışı üçün sorğu genişləndirmə: az/tr/en/ru təbii sorğu -> ərəbcə axtarış ifadələri (ən dəqiqdən ümumiyə).
// Yalnız mövcud lüğətlər istifadə olunur (AI yox): Məcmuu əl-Fətava mövzuları (api/_fatawa/topics.js + topicmatch.js),
// hədis mövzuları (TOPICS, TOPICS_EXTRA, TOPIC_PHRASES — api/_hadith.js), nəhv terminləri (LAT_TERMS, PHRASES — api/_nahw/terms.js)
// və bir neçə səhabə adı. Latın yazıda hərf səhvləri (q/k, x/h, w/v, qoşa hərf, 1–2 hərf səhvi) və «Əbu/Ebu/Abu» fərqləri tolerantdır.
import { stemMatch } from "../_stem.js";
import { foldLat } from "../_ayah.js";
import { TOPICS, TOPICS_EXTRA, TOPIC_PHRASES } from "../_hadith.js";
import { matchTopics, topicAlts } from "../_fatawa/topicmatch.js";
import { TOPIC_SRC } from "../_fatawa/topics.js";
import { LAT_TERMS, LAT_TERMS_MORE, latSkel, PHRASES as NH_PHRASES } from "../_nahw/terms.js";

const AR = /[\u0621-\u064A]/;
// nəhv fold-u (api/_nahw.js ilə eyni: kiril saxlanılır)
const nfold = (s) => String(s || "").toLowerCase().replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[’'`´ʻʼ‘ʿʾ]/g, "");
// səs skeleti: yazılış fərqləri birləşir (q/k, x/h, w/v, kh/h, sh/s, qoşa hərf, a/e, sonda h)
const skel = (w) =>
  w.replace(/kh/g, "h").replace(/sh/g, "s").replace(/q/g, "k").replace(/x/g, "h").replace(/w/g, "v").replace(/e/g, "a").replace(/y/g, "i").replace(/o/g, "u").replace(/(.)\1+/g, "$1").replace(/(.{4,})h$/, "$1");

// tez-tez soruşulan səhabə/alim adları -> ərəbcə (hədis isnadında axtarış üçün)
const NAMES = [
  [["ebu hureyre", "abu hurayra", "abu hurairah", "абу хурайра", "abu hureyre"], "أبو هريرة"],
  [["aise", "aisha", "ayse", "aişə", "аиша"], "عائشة"],
  [["ibn abbas", "ibni abbas", "ибн аббас"], "ابن عباس"],
  [["ibn omer", "ibn umar", "ibni omer", "ибн умар"], "ابن عمر"],
  [["enes", "anas", "анас"], "أنس بن مالك"],
  [["ebu bekr", "ebu bekir", "abu bakr", "абу бакр"], "أبو بكر"],
  [["omer ibn xettab", "umar ibn al khattab", "omer bin hattab", "умар ибн аль хаттаб"], "عمر بن الخطاب"],
  [["ebu musa", "abu musa", "абу муса"], "أبو موسى"],
  [["ibn mesud", "ibn masud", "ибн масуд"], "ابن مسعود"],
  [["ebu said", "abu said", "абу саид"], "أبو سعيد"],
  [["cabir", "jabir", "джабир"], "جابر بن عبد الله"],
  // əlavə (2026-10): səhabələr və peyğəmbərlər (yalnız axtarış genişləndirməsi)
  [["ali", "eli", "hz eli", "ali ibn ebu talib", "али"], "علي بن أبي طالب"],
  [["osman", "usman", "uthman", "усман"], "عثمان بن عفان"],
  [["omer", "omar", "umar", "умар"], "عمر بن الخطاب"],
  [["fatime", "fatima", "фатима"], "فاطمة"],
  [["xedice", "hatice", "khadija", "хадиджа"], "خديجة"],
  [["huseyn", "huseyin", "husayn", "хусейн"], "الحسين"],
  [["muaviye", "muawiya", "муавия"], "معاوية"],
  [["bilal", "билал"], "بلال"],
  [["selman", "salman", "салман"], "سلمان الفارسي"],
  [["muaz", "muadh", "муаз"], "معاذ بن جبل"],
  [["ebu zerr", "abu dharr", "абу зарр"], "أبو ذر"],
  [["xalid ibn velid", "halid bin velid", "khalid ibn al walid", "халид ибн валид"], "خالد بن الوليد"],
  [["musa", "moses", "муса"], "موسى"],
  [["isa", "jesus", "иса"], "عيسى ابن مريم"],
  [["ibrahim", "abraham", "ибрахим"], "إبراهيم"],
  [["nuh", "noah", "нух"], "نوح"],
  [["yusif", "yusuf", "joseph", "юсуф"], "يوسف"],
  [["adem", "adam", "адам"], "آدم"],
  [["suleyman", "solomon", "сулейман"], "سليمان"],
  [["davud", "david", "давуд"], "داود"],
  [["yunus", "jonah", "юнус"], "يونس"],
  [["eyyub", "ayyub", "job", "аюб"], "أيوب"],
  [["meryem", "maryam", "mary", "марьям"], "مريم"],
  [["peygemberler", "peygamberler", "prophets", "пророки", "peygember", "prophet", "пророк"], "الأنبياء"],
  [["sehabeler", "sahabeler", "sehabe", "sahabe", "companions", "сподвижники", "сахабы"], "الصحابة"],
];

const toks = (s) => foldLat(s).split(/[^a-z0-9\u0400-\u04FF]+/).filter(Boolean);
function seqMatch(qt, keyStr, prefix = 3) {
  const kw = toks(keyStr);
  if (!kw.length) return false;
  for (let i = 0; i + kw.length <= qt.length; i++) {
    let ok = true;
    for (let j = 0; j < kw.length; j++) {
      const t = qt[i + j], k = kw[j];
      if (!(t === k || (k.length >= prefix && t.startsWith(k)) || stemMatch(t, k, 99))) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// ---- lüğət söz siyahısı (hərf səhvi düzəlişi üçün)
let _vocab = null;
function vocab() {
  if (_vocab) return _vocab;
  const words = new Set();
  const add = (k) => !/[\u0400-\u04FF]/.test(k) && toks(k).forEach((w) => w.length >= 3 && words.add(w)); // yalnız latın açarlar
  for (const ln of TOPIC_SRC.split("\n")) {
    const i = ln.indexOf("=>");
    if (i > 0 && !ln.trim().startsWith("#")) ln.slice(0, i).split(",").forEach(add);
  }
  for (const [keys] of [...TOPICS, ...TOPICS_EXTRA, ...TOPIC_PHRASES, ...NAMES]) keys.forEach(add);
  for (const w of "nehv nahv serf sarf mubteda xeber khabar fail meful mefulun kane kana inne inna baci bacilari kardesleri sisters harf herf isim fiil feil mudari madi emr hal temyiz nida mecrur mansub merfu cezm".split(" ")) words.add(w);
  _vocab = [...words].map((w) => ({ w, k: skel(w) }));
  return _vocab;
}
function dl(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let row = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      row = Math.min(row, d[i][j]);
    }
    if (row > max) return max + 1;
  }
  return d[a.length][b.length];
}
/** Latın sorğuda lüğətdə olmayan sözlər üçün ən yaxın lüğət sözləri; bir neçə düzəldilmiş variant qaytarır (ən yaxından). */
export function corrections(q, maxVariants = 15) {
  const V = vocab();
  const exact = new Set(V.map((x) => x.w));
  const qt = toks(q);
  const opts = qt.map((t) => {
    if (t.length < 4 || exact.has(t) || /\d/.test(t) || /[\u0400-\u04FF]/.test(t) || V.some((v) => v.w.length >= 4 && t.startsWith(v.w))) return [t];
    const k = skel(t);
    const lim = t.length >= 7 ? 2 : 1;
    const c = [];
    for (const v of V) {
      if (v.w.length < 4) continue;
      const d = v.k === k ? 0 : dl(k, v.k, lim);
      if (d <= lim) c.push({ w: v.w, d: d + Math.abs(v.w.length - t.length) * 0.1 });
    }
    c.sort((x, y) => x.d - y.d);
    return c.length ? c.slice(0, maxVariants).map((x) => x.w) : [t];
  });
  if (opts.every((o, i) => o.length === 1 && o[0] === qt[i])) return [];
  const out = [];
  const multi = opts.findIndex((o) => o.length > 1);
  const base = opts.map((o) => o[0]);
  if (multi < 0) out.push(base.join(" "));
  else for (const w of opts[multi]) out.push(base.map((x, i) => (i === multi ? w : x)).join(" "));
  return out;
}

let _keys = null;
// variantdakı ən uzun lüğət açarının söz sayı (bir mövzunun neçə sözü əhatə etdiyi)
function keyCover(v) {
  if (!_keys) {
    _keys = [];
    for (const ln of TOPIC_SRC.split("\n")) {
      const i = ln.indexOf("=>");
      if (i > 0 && !ln.trim().startsWith("#")) _keys.push(...ln.slice(0, i).split(",").map((k) => k.trim()).filter(Boolean));
    }
    for (const [keys] of [...TOPICS, ...TOPICS_EXTRA, ...TOPIC_PHRASES, ...NAMES]) _keys.push(...keys);
    _keys = _keys.filter((k) => !/[\u0400-\u04FF]/.test(k)).map((k) => toks(k)).filter((k) => k.length);
  }
  const qt = toks(v);
  let best = 0;
  for (const k of _keys) if (k.length > best && seqMatch(qt, k.join(" "))) best = k.length;
  return best;
}

// LAT_TERMS-dəki \b kiril hərflərində işləmir (JS \b yalnız ASCII); kiril üçün Unicode sərhədli surət
const UB = "(?:(?<![\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_])|(?<=[\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_]))";
let _nh = null;
function NH_RE() {
  if (_nh) return _nh;
  _nh = LAT_TERMS.map((x) => {
    let cyr = null;
    if (/[\u0400-\u04FF]/.test(x.re.source))
      try {
        cyr = new RegExp(x.re.source.replace(/\\b/g, UB), "u" + x.re.flags.replace(/[gu]/g, ""));
      } catch {
        cyr = null;
      }
    return { ...x, cyr };
  });
  return _nh;
}

function latinCands(q) {
  const qt = toks(q);
  const general = [];
  const nahw = [];
  const names = [];
  for (const [keys, ar] of NAMES) if (keys.some((k) => seqMatch(qt, k, 4))) names.push(ar);
  for (const [keys, ar] of TOPIC_PHRASES) if (keys.some((k) => seqMatch(qt, k))) general.push(ar);
  const ta = topicAlts(q);
  general.push(...ta.alts);
  for (const [keys, ar] of TOPICS_EXTRA) if (qt.some((t) => t.length >= 3 && keys.some((k0) => { const k = foldLat(k0); return t === k || (k.length >= 4 && t.startsWith(k)); }))) general.push(ar);
  const f = nfold(q).replace(/ё/g, "е");
  let nhUniq = false;
  for (const x of NH_RE()) if (x.re.test(f) || (x.cyr && x.cyr.test(f))) { nahw.push(x.ar); if (x.uniq) nhUniq = true; }
  // əlavə terminlər (api/_nahw/terms.js LAT_TERMS_MORE): köhnələr tapmadısa və ya yalnız ümumi (uniq olmayan) tapdısa, öndə
  if (!nhUniq) {
    const sk = latSkel(q);
    const more = LAT_TERMS_MORE.filter((x) => x.re.test(sk)).map((x) => x.ar);
    if (more.length) nahw.unshift(...more);
  }
  return { general: [...new Set(general)], nahw: [...new Set(nahw)], names };
}

/**
 * @returns {{ arabic:boolean, general:string[], nahw:string[], names:string[], corrected:string|null }}
 *  general: İbn Teymiyyə kitabları, Məcmuul-fətava və hədis üçün; nahw: qrammatika kitabları üçün; names: hədis isnadı üçün.
 */
export function expandQuery(q) {
  q = String(q || "").trim();
  const arPart = (q.match(/[\u0621-\u064A\u064B-\u065F\u0670\u0640\s]+/g) || []).join(" ").replace(/\s+/g, " ").trim();
  if (AR.test(q) && arPart.replace(/\s/g, "").length >= 2) {
    const base = [arPart];
    // nəhv: məlum ifadə sorğunun içindədirsə, o da sınanır
    const nh = NH_PHRASES.filter((p) => arPart.includes(p) && p !== arPart);
    return { arabic: true, general: base, nahw: [...new Set([...base, ...nh])], names: [], corrected: null };
  }
  let c = latinCands(q);
  let corrected = null;
  if (!c.general.length && !c.nahw.length && !c.names.length) {
    // ən «dəqiq» variant: birinci ərəbcə ifadəsi daha çox sözdən ibarət olan (məs. «kabr azabi» -> عذاب القبر, القدر yox)
    let best = -1;
    for (const v of corrections(q)) {
      const c2 = latinCands(v);
      const first = c2.names[0] || c2.general[0] || c2.nahw[0];
      if (!first) continue;
      const sc = keyCover(v);
      if (sc > best) {
        best = sc;
        c = c2;
        corrected = v;
      }
    }
  }
  return { arabic: false, ...c, corrected };
}
export { matchTopics };
