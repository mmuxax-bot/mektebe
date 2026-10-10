// Hazır oyun kodu: «oyun kodu yaz», «write a game code», «اكتب كود لعبة», «напиши код игры» kimi sorğulara AI-yə getmədən
// kolleksiyadan (api/_games/index.js) TAM, orijinal tək-fayl HTML oyun qaytarır (```html bloku — «Aç» düyməsi onu açır).
// Hər dəfə fərqli oyun: söhbət tarixçəsindəki əvvəlki oyunlar (gizli «::game:: slug» sətri) çıxılır; hamısı istifadə olunubsa təsadüfi yenidən,
// lakin sonuncu ilə eyni olmayaraq. Konkret növ («tetris», «ilan/snake», «2048», «flappy», «xox») varsa və uyğun oyun mövcuddursa — o verilir.
// Yalnız aydın «kod yaz/ver» niyyəti ilə işləyir: «oyun haqqında», «oyun oynayaq», başqa dil/mühit (python, unity...) və qalıq
// tanınmayan sözlər olanda null qaytarır (adi axın: hazır nümunələr / AI).
import { GAMES } from "./_games/index.js";

function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ё/g, "е")
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘]/g, "")
    .replace(/\bbir\s+nec[eə]\b/g, "birnece")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
const words = (s) => new Set(s.split(/\s+/).filter(Boolean));
const arBase = (t) => (/^[\u0600-\u06FF]/.test(t) && t.length > 4 && t.startsWith("ال") ? t.slice(2) : t);

const GAME_W = words("oyun oyunu oyunlar oyunlari oyunun oyunlarin oyunumuz game games игра игру игры игр игре игрой لعبه العاب لعبتي لعبات");
const CODE_W = words("kod kodu kodlar kodlari kodunu kodlarini code codes coding script skript program proqram proqrami proqramlar html javascript js canvas код кода коды кодом كود اكواد كودا برنامج سكريبت");
const ACTION_RE = [
  /^yaz(a|ar\w*|in|sana|sene|maq|mak|ir|i)?$/,
  /^ver(in|ir\w*|er\w*|e|se\w*)?$/,
  /^duzelt(sene|sen|in|erdin|erse\w*)?$/,
  /^hazirla\w*$/,
  /^goster\w*$/,
  /^gonder\w*$/,
  /^(qur|qurun|yap|yapar\w*|yapin|olustur\w*)$/,
  /^(write|give|make|create|build|generate|show|need|want|send|code|provide)$/,
  /^(напиши\w*|написать|покажи\w*|дай\w*|сделай\w*|сделать|создай\w*|давай\w*|приведи\w*)$/,
  /^(اكتب\w*|اعطني|اعطيني|ارني|اريد|اصنع|اعمل|ابني|انشي|هات)$/,
];
const FILLER_W = words(
  "bir bu bunu mene mana bana bize ucun icin ile ve ya da de ki olar olarmi olursa olmaz zehmet olmasa lutfen please pls plz bilersen bilirsen bilersiniz mumkun mumkundur " +
    "varmi var lazimdir lazim isteyirem isterim istiyorum istedim istiyoruz gerek gerekiyor tam tamami hazir hazirdir hazirki sade sadece basit asan kicik boyuk yeni gozel maraqli ela yaxsi en cox super mukemmel " +
    "cool nice good best fun simple small full complete whole ready ornek numune example sample demo tek single file fayl faylli faylda brauzer brauzerde browser online offline web sehife page " +
    "misin musun misiniz miyim mi mu basqa baska diger another other next more one again yene tekrar daha yeniden birnece the a an me to for of i you can could would will may do does some any random " +
    "пожалуйста мне для на и в с ты вы можешь можете полный готовый простой новый другой еще ещё одну одна один любую любой какую какой нибудь " +
    "لي من في على الى عن و لو سمحت ممكن هل تقدر بسيط كامل جديد اخري اخرى واحده ال",
);
const BLOCK_W = words(
  "haqqinda haqda hakkinda about nedir necedir nece niye why kim kimdir tarix tarixi history qayda qaydalari rules oyna oynamaq oynayaq oynaya oynayim oynat play played playing nedi ne what how hansi which " +
    "izah explain mena meaning xeta error bug calismir calismiyor isleme islemir fix menim benim my kodum kodumu kodumda kodunu kodlarini mou moy мой мою моя моей почему как что кто " +
    "python pyton java cpp csharp unity pygame tkinter kotlin swift flutter dart roblox lua godot unreal php react node nodejs sql bash ruby rust golang scratch minecraft kivy turtle arduino android ios pascal питон пайтон джава юнити بايثون جافا يونيتي",
);

// Konkret oyun üçün birdən çox dilli açar sözlər index-dəki keywords sahəsindən gəlir; kateqoriya (kinds) ləqəbləri:
const KIND_ALIASES = {
  puzzle: ["puzzle", "tapmaca", "bulmaca", "bilmece", "zeka", "головоломка", "لغز"],
  arcade: ["arcade", "arkada", "аркада", "اركيد"],
  shooter: ["shooter", "shooting", "atis", "стрелялка", "шутер", "اطلاق"],
  snake: ["snake", "ilan", "yilan", "змейка", "ثعبان"],
  board: ["board", "xox", "lövhə", "настольная"],
  runner: ["runner", "qacis", "qacma", "kosu", "раннер", "бегалка", "جري"],
  defense: ["defense", "defence", "mudafie", "savunma", "защита"],
  bird: ["bird", "qus", "kus", "птица"],
};

const prep = (s) => norm(s).split(" ").filter(Boolean);
function tokenMatches(kw, tok) {
  if (kw === tok) return true;
  const a = arBase(tok);
  if (a === kw) return true;
  return kw.length >= 4 && tok.startsWith(kw);
}
function matchPhrase(phraseTokens, msgTokens) {
  const hit = [];
  for (const k of phraseTokens) {
    const i = msgTokens.findIndex((t, idx) => !hit.includes(idx) && tokenMatches(k, t));
    if (i < 0) return null;
    hit.push(i);
  }
  return hit;
}

export function langOf(message) {
  const t = String(message || "");
  if (/[\u0600-\u06FF]/.test(t)) return "ar";
  if (/[\u0400-\u04FF]/.test(t)) return "ru";
  if (/[əƏ]/.test(t)) return "az";
  const f = norm(t);
  if (/\b(write|give|make|create|game|games|code|show|me|please|build)\b/.test(f) && !/\b(oyun|kod|kodu|yaz|ver)\b/.test(f)) return "en";
  if (/\b(bana|istiyorum|lutfen|yapar|yapin|olustur\w*|isterim|gerek|gerekiyor|yazar misin|yazarmisin|yazarmisiniz)\b/.test(f)) return "tr";
  return "az";
}
const LEAD = {
  az: (n) => `Hazır oyun: ${n}. Kodun altındakı «Aç» düyməsi ilə oyunu aça bilərsən.`,
  tr: (n) => `Hazır oyun: ${n}. Kodun altındaki «Aç» düğmesiyle oyunu açabilirsin.`,
  en: (n) => `Ready-made game: ${n}. Use the «Aç» (open) button under the code to play it.`,
  ru: (n) => `Готовая игра: ${n}. Нажми кнопку «Aç» под кодом, чтобы открыть её.`,
  ar: (n) => `لعبة جاهزة: ${n}. اضغط زر «Aç» تحت الكود لفتحها.`,
};
const MARK = /::game:: ([a-z0-9][a-z0-9-]*)/g;

/** Tarixçədə (xam mesaj siyahısı) göstərilmiş oyunlar, köhnədən yeniyə: slug massivi. */
export function shownGames(history, games = GAMES) {
  const out = [];
  for (const item of Array.isArray(history) ? history : []) {
    if (!item || item.role !== "assistant") continue;
    const text = String(item.text || "");
    const seen = [];
    for (const m of text.matchAll(MARK)) seen.push([m.index, m[1]]);
    if (!seen.length) {
      // işarə itibsə (məs. köhnə/kəsilmiş mesaj): giriş cümləsindəki ada görə
      for (const g of games) for (const lang of Object.keys(LEAD)) { const i = text.indexOf(LEAD[lang](g.title)); if (i >= 0) seen.push([i, g.slug]); }
    }
    seen.sort((a, b) => a[0] - b[0]).forEach(([, s]) => out.push(s));
  }
  return out;
}

/** @returns {{kind:'game', slug:string}|null} niyyət və seçim; yan təsir yoxdur */
export function pickGame(message, history, rand = Math.random, games = GAMES) {
  const usable = games.filter((g) => g && g.slug && g.title);
  if (!usable.length) return null;
  const raw = String(message || "").trim();
  if (!raw || raw.length > 140) return null;
  const toks = norm(raw).split(" ").filter(Boolean);
  if (!toks.length || toks.length > 14) return null;
  const isGame = (t) => GAME_W.has(t) || GAME_W.has(arBase(t));
  // «oyun» sözü olmasa da, oyunun çoxsözlü adı/açar ifadəsi tam yazılıbsa («Qala keşikçisi kodu yaz», «tower defense kodu yaz») bu oyun istəyidir
  const namedGame = !toks.some(isGame) && usable.some((g) => [g.title, ...(g.keywords || [])].some((kw) => { const p = prep(kw); return p.length >= 2 && !!matchPhrase(p, toks); }));
  const hasGame = toks.some(isGame) || namedGame;
  const hasCode = toks.some((t) => CODE_W.has(t));
  const hasAction = toks.some((t) => ACTION_RE.some((re) => re.test(t)));
  if (!hasGame || !(hasCode || hasAction)) return null;
  if (toks.some((t) => BLOCK_W.has(t))) return null;
  // «oyun kodunu düzəlt» = mövcud kodu düzəlt (blok), «bir oyun düzəlt» = oyun hazırla
  if (toks.includes("duzelt") && toks.some((t) => /^kod\w*(u|unu|umu|um)$/.test(t) && t !== "kodu")) return null;

  // konkret oyun
  const consumed = new Set();
  let best = [];
  let bestScore = 0;
  for (const g of usable) {
    let score = 0;
    const used = [];
    for (const kw of [g.title, ...(g.keywords || [])]) {
      const hit = matchPhrase(prep(kw), toks);
      if (hit && hit.length >= score) {
        if (hit.length > score) score = hit.length;
        used.push(...hit);
      }
    }
    if (score > bestScore) { best = [{ g, used }]; bestScore = score; }
    else if (score && score === bestScore) best.push({ g, used });
  }
  let pool;
  let specific = false;
  if (best.length) {
    pool = best.map((b) => b.g);
    best.forEach((b) => b.used.forEach((i) => consumed.add(i)));
    specific = pool.length === 1;
  } else {
    // kateqoriya
    const kinds = Object.keys(KIND_ALIASES).filter((k) => KIND_ALIASES[k].some((a) => toks.some((t) => tokenMatches(norm(a), t) )));
    const byKind = usable.filter((g) => (g.kinds || []).some((k) => kinds.includes(k)));
    if (kinds.length && byKind.length) {
      pool = byKind;
      toks.forEach((t, i) => { if (kinds.some((k) => KIND_ALIASES[k].some((a) => tokenMatches(norm(a), t)))) consumed.add(i); });
    } else pool = usable;
  }
  // qalıq tanınmayan söz varsa (məs. «pong», «3D yarış») — konkret istək, bizdə yoxdur: null
  const leftover = toks.filter((t, i) => !consumed.has(i) && !isGame(t) && !CODE_W.has(t) && !FILLER_W.has(t) && !FILLER_W.has(arBase(t)) && !ACTION_RE.some((re) => re.test(t)));
  if (leftover.length) return null;

  const shown = shownGames(history, usable);
  const last = shown[shown.length - 1];
  const fresh = pool.filter((g) => !shown.includes(g.slug));
  let candidates;
  if (specific) candidates = pool; // aydın tək istək — təkrar olsa da verilir
  else if (fresh.length) candidates = fresh;
  else candidates = pool.length > 1 ? pool.filter((g) => g.slug !== last) : pool;
  const g = candidates[Math.min(candidates.length - 1, Math.floor(rand() * candidates.length))];
  return { kind: "game", slug: g.slug };
}

/** Kod blokunu ``` ilə qapayır: oyunun öz mətni dəyişmir. */
export function buildReply(lang, game, code) {
  const fence = "```";
  const body = code.endsWith("\n") ? code : code + "\n";
  return `${(LEAD[lang] || LEAD.az)(game.title)}\n::game:: ${game.slug} | ${game.title}\n\n${fence}html\n${body}${fence}`;
}

export function createGameReply(games = GAMES) {
  /** @returns {Promise<string|null>} yalnız seçilmiş oyunun modulu yüklənir */
  return async function gameReply(message, history, rand = Math.random) {
    let pool = games.slice();
    while (pool.length) {
      const pick = pickGame(message, history, rand, pool);
      if (!pick) return null;
      const g = pool.find((x) => x.slug === pick.slug);
      const code = await g.load().then((m) => m.default).catch(() => null);
      // ``` olan və ya boş oyun UI-də kod blokunu pozar: seçimdən çıxarılıb yenidən seçilir
      if (typeof code === "string" && code && !code.includes("```")) return buildReply(langOf(message), g, code);
      pool = pool.filter((x) => x !== g);
    }
    return null;
  };
}
export const gameReply = createGameReply(GAMES);
