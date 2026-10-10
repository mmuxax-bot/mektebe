// Rəvayətçi (səhabə) aşkarlanması və isnadda rəvayətçiyə görə hədis süzgəci.
//   detectNarrator(message): mesajda rəvayətçi adı (latın/kiril/ərəb, şəkilçilərlə) -> {nar, words:Set(söz indeksləri), multi, about}
//   narratorDocs(idx, nar): rəvayətçinin isnadda olduğu hədislər -> {list, tier: Map(id -> 1 səhabə mövqeyi | 2 isnadda)}
//     1 = ad mətnə (matn) ən yaxın: arxasınca 14 token içində «النبي» / «رسول الله» gəlir, arada başqa «عن» yoxdur
//     2 = ad isnadda (ilk «النبي/رسول الله»-dan əvvəl), amma səhabə mövqeyində deyil. Mətn içində keçən ad sayılmır.
import { foldLat } from "../_ayah.js";
import { sufOk } from "../_stem.js";
import { norm, tokens } from "./tok.js";
import { NARRATORS } from "./narrators.js";

const RU_END = /^(?:a|i|u|e|om|oy|oj|ey|ej|ya|yu|ja|ju|ym|im|ov|ah|y|iy|ij)$/;
const DROP = new Set(["el", "al", "hz", "hezret", "hezreti", "hazrat", "hazret", "hazreti", "ra", "rah", "sahabi", "sahabe"]);
const IBN = new Set(["ibn", "bin", "ibni", "ibnu", "ibnul", "b", "bn"]);
/** latın skeleti: yazılış fərqləri birləşir (e/a, o/u, y/i, x/kh/h, q/k, j/c, w/v, sh/s, th/s, dh/z, iki hərf -> bir) */
export function skel(w) {
  return w
    .replace(/kh/g, "h").replace(/x/g, "h").replace(/sh/g, "s").replace(/dh/g, "z").replace(/th/g, "s").replace(/ch/g, "c")
    .replace(/j/g, "c").replace(/w/g, "v").replace(/q/g, "k").replace(/ou/g, "u").replace(/oo/g, "u").replace(/ee/g, "i")
    .replace(/e/g, "a").replace(/o/g, "u").replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
}
const VOW = /[aiu]$/;
// sözün mümkün kökləri (şəkilçi soyulmuş): az/tr şəkilçiləri (api/_stem.js) və rus hal sonluqları
function stems(t) {
  const out = new Set([t]);
  for (let i = 3; i < t.length; i++) {
    const rest = t.slice(i);
    if (sufOk(rest) || RU_END.test(rest) || /^(?:dan|den|tan|ten|nin|nun|in|un|un|ye|ya|e|a)$/.test(rest)) out.add(t.slice(0, i));
  }
  return [...out].map(skel);
}
// qısa tək söz açarı (məs. «enes», «omer», «aise»): yalnız tam söz və ya qısa hal şəkilçisi (-dən, -in, -ə, -ya ...)
function shortOk(t, kw) {
  const s = skel(t);
  if (s === kw.s || s === kw.cut) return true;
  for (const base of [kw.s, kw.cut]) if (s.startsWith(base) && /^(?:dan|tan|nin|nun|in|un|ya|a|i|u|ni|nu|ia|ian|iam|um|im)$/.test(s.slice(base.length))) return true;
  return false;
}
function keyWord(k) {
  const s = skel(k);
  return { s, cut: VOW.test(s) && s.length >= 4 ? s.slice(0, -1) : s };
}
function wordEq(stemList, kw) {
  return stemList.some((x) => x === kw.s || x === kw.cut || (kw.s.length >= 6 && x.length >= 6 && lev1(x, kw.s)));
}
function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}
const prepKey = (k) => foldLat(k).split(/[^a-z]+/).filter((w) => w && !DROP.has(w)).map((w) => (IBN.has(w) ? "ibn" : w));
const KEYS = [];
for (const [ni, n] of NARRATORS.entries())
  for (const k of [...n.lat, ...(n.cyr || [])]) {
    const ws = prepKey(k);
    if (ws.length) KEYS.push({ ni, n, ws: ws.map((w) => (w === "ibn" ? { s: "ibn", cut: "ibn", ibn: true } : keyWord(w))), len: ws.length, chars: ws.join("").length });
  }
KEYS.sort((a, b) => b.len - a.len || b.chars - a.chars || a.ni - b.ni);

const ABOUT_AFTER = new Set(["haqqinda", "haqqindaki", "barasinda", "barede", "barada", "hakkinda", "hakkindaki", "uzerine"]);
const ABOUT_BEFORE = new Set(["about", "on", "regarding", "concerning", "o", "ob", "obo", "pro", "virtue", "virtues", "fazail", "fezail", "fadail", "menakib", "manaqib", "fezileti", "fazilati"]);
const AR_ABOUT = new Set(["فضل", "فضايل", "فضاي", "مناقب", "ذكر", "فضيل"]);

/** Latın/kiril sözlər: [{w, wi}] (wi = orijinal söz indeksi) */
function latTokens(raw) {
  const words = String(raw || "").split(/\s+/).filter(Boolean);
  const out = [];
  words.forEach((w, wi) => {
    for (const t of foldLat(w).split(/[^a-z]+/).filter(Boolean)) {
      if (DROP.has(t)) out.push({ t, wi, drop: true });
      else out.push({ t: IBN.has(t) ? "ibn" : t, wi });
    }
  });
  return { words, toks: out };
}

// ərəbcə formalar: token ardıcıllığı; «ابي» ilə başlayan kunyələrə «ابو/ابا» də uyğun
const KUNYA = new Set(["ابي", "ابو", "ابا"]);
const NASAB = new Set(["بن", "ابن", "بنت"]);
const FORMS = NARRATORS.map((n) =>
  (n.ar || []).map((f) => {
    const ts = tokens(f);
    return { ts, bare: !ts.some((t) => NASAB.has(t)), ibnFirst: ts[0] === "ابن" };
  }),
);
const tokEq = (a, b) => a === b || (KUNYA.has(a) && KUNYA.has(b));

/** Mesajda rəvayətçi adı. Ən uzun açar seçilir. */
export function detectNarrator(raw) {
  const { words, toks } = latTokens(raw);
  // «barəsində», «haqqında» kimi qoşmalar ad sayılmır (məs. «barasinda» -> «bara» ≠ Bəra)
  const live = toks.filter((x) => !x.drop).map((x) => (ABOUT_AFTER.has(x.t) || ABOUT_BEFORE.has(x.t) ? { ...x, about: true } : x));
  const st = live.map((x) => stems(x.t));
  let best = null;
  for (const K of KEYS) {
    for (let i = 0; i + K.len <= live.length; i++) {
      let ok = true;
      for (let j = 0; j < K.len && ok; j++) {
        const kw = K.ws[j];
        ok = kw.ibn ? live[i + j].t === "ibn" : !live[i + j].about && (K.len > 1 || kw.s.length >= 5 || shortOk(live[i + j].t, kw)) && wordEq(st[i + j], kw);
      }
      if (!ok) continue;
      const span = new Set(live.slice(i, i + K.len).map((x) => x.wi));
      const after = live[i + K.len] ? live[i + K.len].t : "";
      const before = i > 0 ? live[i - 1].t : "";
      best = { nar: K.n, words: span, multi: K.len >= 2, about: ABOUT_AFTER.has(after) || ABOUT_BEFORE.has(before) };
      break;
    }
    if (best) break;
  }
  if (best) return best;
  // ərəbcə
  const arWords = words.map((w) => tokens(w));
  const flat = [];
  arWords.forEach((ts, wi) => ts.forEach((t) => flat.push({ t, wi })));
  if (!flat.length) return null;
  let bestAr = null;
  NARRATORS.forEach((n, ni) =>
    FORMS[ni].forEach((f) => {
      if (bestAr && bestAr.len >= f.ts.length) return;
      for (let i = 0; i + f.ts.length <= flat.length; i++) {
        if (!f.ts.every((t, j) => tokEq(flat[i + j].t, t))) continue;
        const prev = i > 0 ? flat[i - 1].t : "";
        const next = flat[i + f.ts.length] ? flat[i + f.ts.length].t : "";
        if (!f.ibnFirst && NASAB.has(prev)) continue;
        if (f.bare && (KUNYA.has(prev) || prev === "ام")) continue;
        if (f.bare && NASAB.has(next)) continue;
        bestAr = { nar: n, len: f.ts.length, words: new Set(flat.slice(i, i + f.ts.length).map((x) => x.wi)), multi: f.ts.length >= 2, about: AR_ABOUT.has(prev) };
        break;
      }
    }),
  );
  if (!bestAr) return null;
  const { len, ...r } = bestAr;
  void len;
  return r;
}

const light = (s) => String(s || "").replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "").replace(/[أإآٱ]/g, "ا");
function verifyRe(nar) {
  if (typeof nar.verify === "string") return new RegExp(nar.verify);
  const alts = (nar.ar || []).map((f) =>
    light(f)
      .split(/\s+/)
      .map((w, i) => (i === 0 && /^اب[يوا]$/.test(w) ? "اب[يوا]" : w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      .join("\\s+"),
  );
  return new RegExp(`(?<![\\u0621-\\u064A])(?:${alts.join("|")})(?![\\u0621-\\u064A])(?!\\s+بن\\s)`);
}
const _cache = new Map();
const MARK_WIN = 14;
/** Rəvayətçinin hədisləri: {list:number[] (əvvəl səhabə mövqeyi, sonra isnad; hər qrupda kitab sırası), tier:Map} */
export async function narratorDocs(idx, nar, getText) {
  if (_cache.has(nar.id)) return _cache.get(nar.id);
  const V = (t) => idx.vmap.get(t);
  const NABI = V("نبي");
  const RASUL = V("رسول");
  const ALLAH = V("الل");
  const AN = V("عن");
  const RADI = V("رضي");
  const UMM = V("ام");
  const nasab = new Set([...NASAB].map(V).filter((x) => x != null));
  const kun = new Set([...KUNYA].map(V).filter((x) => x != null));
  const tier = new Map();
  const forms = FORMS[NARRATORS.indexOf(nar)] || [];
  for (const f of forms) {
    const ids = f.ts.map((t) => V(t));
    if (ids.some((x, j) => x == null && !KUNYA.has(f.ts[j]))) continue;
    // ən nadir (kunyə olmayan) token üzrə postinqlər
    let pj = -1;
    let pl = Infinity;
    ids.forEach((x, j) => {
      if (KUNYA.has(f.ts[j]) || x == null) return;
      const n = idx.post[x + 1] - idx.post[x];
      if (n < pl) ((pl = n), (pj = j));
    });
    if (pj < 0) continue;
    const docs = idx.docs.subarray(idx.post[ids[pj]], idx.post[ids[pj] + 1]);
    const eq = (tok, j) => (KUNYA.has(f.ts[j]) ? kun.has(tok) : tok === ids[j]);
    for (const d of docs) {
      const a = idx.dstart[d];
      const b = idx.dstart[d + 1];
      const tk = idx.tok;
      // ilk «النبي / رسول الله» mövqeyi
      let first = b;
      for (let i = a; i < b; i++) if (tk[i] === NABI || (tk[i] === RASUL && tk[i + 1] === ALLAH)) { first = i; break; }
      let best = 0;
      for (let i = a; i + ids.length <= b && i < first; i++) {
        let ok = true;
        for (let j = 0; j < ids.length && ok; j++) ok = eq(tk[i + j], j);
        if (!ok) continue;
        if (!f.ibnFirst && i > a && nasab.has(tk[i - 1])) continue;
        if (f.bare && i > a && (kun.has(tk[i - 1]) || tk[i - 1] === UMM)) continue;
        const e = i + ids.length;
        if (f.bare && e < b && nasab.has(tk[e])) continue;
        let t = 2;
        for (let k = e; k < Math.min(b, e + MARK_WIN); k++) {
          if (tk[k] === AN && !(k > a && tk[k - 1] === ALLAH) && !(k > a + 1 && tk[k - 2] === RADI)) break;
          if (tk[k] === NABI || (tk[k] === RASUL && tk[k + 1] === ALLAH)) { t = 1; break; }
        }
        if (!best || t < best) best = t;
        if (best === 1) break;
      }
      if (best && (!tier.has(d) || best < tier.get(d))) tier.set(d, best);
    }
  }
  // indeksdə başqa sözlə üst-üstə düşən adlar (علي ~ عليه/على, سلمان ~ سلمة, ثوبان ~ ثوب): xam mətndə tam ad yoxlanır
  if (nar.verify && getText) {
    const re = verifyRe(nar);
    for (const d of [...tier.keys()]) if (!re.test(light(await getText(d)))) tier.delete(d);
  }
  const all = [...tier.keys()].sort((x, y) => x - y);
  const list = all.filter((d) => tier.get(d) === 1).concat(all.filter((d) => tier.get(d) === 2));
  const r = { list, tier };
  _cache.set(nar.id, r);
  return r;
}

export { norm };
