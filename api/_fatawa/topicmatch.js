// Mövzu lüğətindən (api/_fatawa/topics.js + hədis lüğəti) mesajdakı mövzuları tapır: az/tr/en/ru sözü -> ərəbcə axtarış ifadələri.
import { foldLat } from "../_ayah.js";
import { TOPICS as HADITH_TOPICS } from "../_hadith.js";
import { TOPIC_SRC } from "./topics.js";

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
  const addEntry = (keys, ar) => {
    const idx = entries.length;
    entries.push({ ar });
    for (const k0 of keys) {
      const k = foldKey(k0.trim());
      if (!k) continue;
      const words = k.split(/[\s-]+/).filter(Boolean);
      if (!words.length) continue;
      if (words.length === 1 && words[0].length < 4 && !SHORT_OK.has(words[0])) continue;
      const weak = words.length === 1 && DENY.has(words[0]); // ümumi söz: yalnız hökm sualında (bare rejimində sayılmır)
      kws.push({ words: words.map(cyrStem), e: idx, len: words.join("").length, weak });
    }
  };
  for (const ln of TOPIC_SRC.split("\n")) {
    const l = ln.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=>");
    if (i < 0) continue;
    addEntry(l.slice(0, i).split(","), l.slice(i + 2).split("/").map((x) => x.trim()).filter(Boolean));
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
const FILL = new Set(["seyler", "seyleri", "seylar", "sey", "things", "thing", "вещи", "вещей", "yani", "ne", "neler", "nelerdir", "hangileri", "hansilar", "hansi", "which", "list", "nedir", "nedi", "ne", "nə", "haqqinda", "hakkinda", "haqda", "barede", "about", "what", "is", "are", "the", "a", "an", "of", "on", "in", "and", "ve", "və", "ile", "ucun", "icin", "for", "bu", "o", "hokmu", "ruling", "me", "tell", "give", "show", "melumat", "bilgi", "information", "info", "izah", "aciqla", "explain", "qaydalari", "kurallari", "rules", "mesele", "mesele", "meselesi", "hakkinda", "islamda", "islamda", "islamin", "islam", "in", "что", "такое", "это", "о", "об", "про", "в", "и", "какой", "каково", "положение", "please", "zehmet", "olmasa", "lutfen", "mövzu", "movzu", "konu", "topic", "тема", "тему"]);

/**
 * @returns {{ tokens:string[], hits:{pos:number,e:number}[], used:boolean[], entries:{ar:string[]}[], bare:boolean }}
 * hits: tapılan mövzular (mesajdakı mövqe sırası ilə, hər mövzu bir dəfə)
 */
export function matchTopics(message) {
  const { entries, kws } = build();
  const f = foldKey(String(message || ""));
  const tokens = f.split(/[^a-z0-9\u0400-\u04FF]+/).filter(Boolean);
  const used = new Array(tokens.length).fill(false);
  const hits = [];
  const weakUsed = new Array(tokens.length).fill(false);
  const seen = new Set();
  for (const kw of kws) {
    const n = kw.words.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      let ok = true;
      for (let j = 0; j < n; j++) if (used[i + j] || !wordMatch(tokens[i + j], kw.words[j])) { ok = false; break; }
      if (!ok) continue;
      for (let j = 0; j < n; j++) { used[i + j] = true; if (kw.weak) weakUsed[i + j] = true; }
      if (!seen.has(kw.e)) { seen.add(kw.e); hits.push({ pos: i, e: kw.e, weak: kw.weak }); }
    }
  }
  hits.sort((a, b) => a.pos - b.pos);
  const bare = hits.some((h) => !h.weak) && tokens.length <= 4 && tokens.every((t, i) => (used[i] && !weakUsed[i]) || FILL.has(t));
  return { tokens, hits, used, entries, bare };
}

/** Mövzulardan ərəbcə axtarış ifadələri siyahısı (ən dəqiqdən ümumiyə) */
export function topicAlts(message) {
  const m = matchTopics(message);
  const top = m.hits.slice(0, 2).map((h) => m.entries[h.e].ar);
  if (!top.length) return { alts: [], bare: false, hits: 0 };
  const alts = [];
  if (top.length === 2) alts.push(top[0][0] + " " + top[1][0]);
  alts.push(...top[0]);
  if (top.length === 2) alts.push(...top[1]);
  return { alts: [...new Set(alts)], bare: m.bare, hits: m.hits.length };
}
