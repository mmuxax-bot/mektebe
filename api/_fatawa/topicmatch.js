// Mövzu lüğətindən (api/_fatawa/topics.js + hədis lüğəti) mesajdakı mövzuları tapır: az/tr/en/ru sözü -> ərəbcə axtarış ifadələri.
import { foldLat } from "../_ayah.js";
import { TOPICS as HADITH_TOPICS } from "../_hadith.js";
import { TOPIC_SRC } from "./topics.js";
import { stemMatch, editDist } from "../_stem.js";

const foldKey = (s) => (/[\u0400-\u04FF]/.test(s) ? s.toLowerCase().replace(/ё/g, "е") : foldLat(s));
// 4 hərfdən qısa açarlardan yalnız bunlar qəbul edilir (tam uyğunluq); qalanları ümumi sözlərlə qarışır
const SHORT_OK = new Set(["ruh", "dua", "cin", "def", "daf", "duf", "hac", "hec", "ayn", "ney", "ud", "riya", "zina", "tato", "sihr", "kibr", "ilm"]);
// ümumi sözlər: açar kimi qəbul edilmir
const DENY = new Set(["interest", "game", "games", "sport", "sports", "oyun", "film", "films", "party", "state", "trade", "business", "army", "yasa", "yasaq", "kart", "cards", "dans", "dance", "song", "songs", "music", "gift", "gifts", "rent", "work", "life", "love", "deed", "deeds", "will", "loan", "debt", "king", "free", "time", "rule", "rules", "sign", "word", "name", "names", "book", "good", "evil", "dream", "dreams", "angel", "angels", "devil", "magic", "money", "price", "share", "pure", "clean", "fish", "food", "foods", "drink", "meat", "wine", "beer", "dress", "photo", "photos", "image", "images", "picture", "pictures", "death", "dead", "soul", "spirit", "sin", "sins", "faith", "belief", "prayer", "prayers", "praying", "fasting", "fast", "charity", "marriage", "wedding", "divorce", "birth", "child", "children", "woman", "women", "man", "men", "wife", "husband", "friend", "enemy", "war", "peace", "land", "home", "house", "car", "bank", "tax", "salary", "gold", "silver", "sex", "tv", "ring", "rings", "doll", "dolls", "toy", "toys", "beard", "silk", "dog", "dogs", "cat", "cats", "pig", "pork", "horse", "mosque", "mosques", "grave", "graves"]);

let _t = null;
function build() {
  if (_t) return _t;
  const entries = [];
  const kws = [];
  const addEntry = (keys, ar, more = false) => {
    const idx = entries.length;
    entries.push({ ar });
    for (const k0 of keys) {
      const k = foldKey(k0.trim());
      if (!k) continue;
      const words = k.split(/[\s-]+/).filter(Boolean);
      if (!words.length) continue;
      if (words.length === 1 && words[0].length < 4 && !SHORT_OK.has(words[0])) continue;
      const weak = words.length === 1 && DENY.has(words[0]); // ümumi söz: yalnız hökm sualında (bare rejimində sayılmır)
      kws.push({ words: words.map(cyrStem), e: idx, len: words.join("").length, weak, more });
    }
  };
  let more = false;
  for (const ln of TOPIC_SRC.split("\n")) {
    const l = ln.trim();
    if (l.startsWith("# ===== ƏLAVƏ (2026-10)")) more = true;
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=>");
    if (i < 0) continue;
    addEntry(l.slice(0, i).split(","), l.slice(i + 2).split("/").map((x) => x.trim()).filter(Boolean), more);
  }
  // hədis mövzu lüğəti (niyyət, sədəqə, nikah və s.) ən aşağı üstünlüklə
  for (const [keys, ar] of HADITH_TOPICS) addEntry(keys, [ar]);
  kws.sort((a, b) => b.words.length - a.words.length || b.len - a.len);
  _t = { entries, kws };
  return _t;
}
export const topicCount = () => build().entries.length;

// kiril açarların sonluğu atılır (бороду/бороды ~ борода): sonda 1-2 saitsiz qalana qədər
function cyrStem(w) {
  if (!/[\u0400-\u04FF]/.test(w) || w.length < 5) return w;
  let x = w;
  while (x.length > 4 && /[аяыиоеуюьй]$/.test(x)) x = x.slice(0, -1);
  return x;
}
const wordMatch = (t, k) => t === k || (k.length >= 4 && t.startsWith(k));
// ikinci keçid (köhnə açarlar heç nə tapmayanda): az/tr şəkilçi zənciri (dualar, kitabı, sabrı ...) də qəbul olunur (api/_stem.js)
const wordMatch2 = (t, k) => wordMatch(t, k) || stemMatch(t, k);
const FILL = new Set(["seyler", "seyleri", "seylar", "sey", "things", "thing", "вещи", "вещей", "yani", "ne", "neler", "nelerdir", "hangileri", "hansilar", "hansi", "which", "list", "nedir", "nedi", "ne", "nə", "haqqinda", "hakkinda", "haqda", "barede", "about", "what", "is", "are", "the", "a", "an", "of", "on", "in", "and", "ve", "və", "ile", "ucun", "icin", "for", "bu", "o", "hokmu", "ruling", "me", "tell", "give", "show", "melumat", "bilgi", "information", "info", "izah", "aciqla", "explain", "qaydalari", "kurallari", "rules", "mesele", "mesele", "meselesi", "hakkinda", "islamda", "islamda", "islamin", "islam", "in", "что", "такое", "это", "о", "об", "про", "в", "и", "какой", "каково", "положение", "please", "zehmet", "olmasa", "lutfen", "mövzu", "movzu", "konu", "topic", "тема", "тему"]);

/**
 * @returns {{ tokens:string[], hits:{pos:number,e:number}[], used:boolean[], entries:{ar:string[]}[], bare:boolean }}
 * hits: tapılan mövzular (mesajdakı mövqe sırası ilə, hər mövzu bir dəfə)
 */
export function matchTopics(message, opts = {}) {
  const { entries, kws } = build();
  const f = foldKey(String(message || ""));
  const tokens = f.split(/[^a-z0-9\u0400-\u04FF]+/).filter(Boolean);
  const used = new Array(tokens.length).fill(false);
  const hits = [];
  const weakUsed = new Array(tokens.length).fill(false);
  const seen = new Set();
  // 1-ci keçid: köhnə lüğət və köhnə uyğunluq qaydası (əvvəlki cavablar dəyişmir); boşdursa 2-ci keçid: əlavə açarlar + şəkilçi kökü
  for (const pass of [1, 2]) {
    if (pass === 1 && opts.all) continue;
    if (pass === 2 && hits.length) break;
    const wm = pass === 1 ? wordMatch : wordMatch2;
    for (const kw of kws) {
      if (pass === 1 && kw.more) continue;
      const n = kw.words.length;
      for (let i = 0; i + n <= tokens.length; i++) {
        let ok = true;
        for (let j = 0; j < n; j++) if (used[i + j] || !wm(tokens[i + j], kw.words[j])) { ok = false; break; }
        if (!ok) continue;
        for (let j = 0; j < n; j++) { used[i + j] = true; if (kw.weak) weakUsed[i + j] = true; }
        if (!seen.has(kw.e)) { seen.add(kw.e); hits.push({ pos: i, e: kw.e, weak: kw.weak }); }
      }
    }
  }
  // səhv yazılış (yalnız opts.fuzzy, heç bir mövzu tapılmayanda): ≥5 hərfli söz ≥5 hərfli tək açardan 1 hərf fərqli (ilk hərf eyni); zəif sayılır (bare olmur)
  if (opts.fuzzy && !hits.length) {
    let best = null;
    tokens.forEach((t, i) => {
      if (used[i] || t.length < 5 || !/^[a-z]+$/.test(t) || FILL.has(t)) return;
      for (const kw of kws) {
        if (kw.words.length !== 1 || kw.weak) continue;
        const k = kw.words[0];
        if (k.length < 5 || k[0] !== t[0]) continue;
        const lim = 1;
        const stem = t.length > k.length + 1 ? t.slice(0, k.length + 1) : t;
        const d = Math.min(editDist(t, k), editDist(stem, k), editDist(t.slice(0, k.length), k) + (t.length > k.length && stemMatch(t, t.slice(0, k.length)) ? 0 : 9));
        if (d <= lim && (!best || d < best.d)) best = { d, i, e: kw.e };
      }
    });
    if (best) {
      used[best.i] = true;
      weakUsed[best.i] = true;
      hits.push({ pos: best.i, e: best.e, weak: true, fuzzy: true });
    }
  }
  hits.sort((a, b) => a.pos - b.pos);
  const bare = hits.some((h) => !h.weak) && tokens.length <= 4 && tokens.every((t, i) => (used[i] && !weakUsed[i]) || FILL.has(t));
  return { tokens, hits, used, entries, bare };
}

/** Mövzulardan ərəbcə axtarış ifadələri siyahısı (ən dəqiqdən ümumiyə) */
export function topicAlts(message, opts) {
  const m = matchTopics(message, opts);
  const top = m.hits.slice(0, 2).map((h) => m.entries[h.e].ar);
  if (!top.length) return { alts: [], bare: false, hits: 0 };
  const alts = [];
  if (top.length === 2) alts.push(top[0][0] + " " + top[1][0]);
  alts.push(...top[0]);
  if (top.length === 2) alts.push(...top[1]);
  return { alts: [...new Set(alts)], bare: m.bare, hits: m.hits.length };
}
