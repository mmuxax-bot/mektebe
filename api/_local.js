// Çox kiçik, aydın sorğular üçün yerli cavablar: salam, təşəkkür, sadə hesab, saat/tarix.
// AI-yə getmədən cavab verir. localReply(message, now) -> mətn və ya null.

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
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function guessLang(raw, q) {
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/[\u0400-\u04FF]/.test(raw)) return "ru";
  if (/[əƏ]/.test(raw)) return "az";
  if (/\b(merhaba|selam|tesekkur\w*|nasilsin\w*|gunaydin|iyi\s+aksamlar|kac\s+eder|kacta|bugun|sag\s+olun)\b/.test(q)) return "tr";
  if (/\b(hello|hi|hey|thanks|thank|thx|how\s+are|good\s+(morning|evening|afternoon)|what|time|date|today|calculate)\b/.test(q)) return "en";
  return "az";
}

// ---------- Salamlaşma ----------
const GREETINGS = [
  "salam aleykum", "aleykum salam", "esselamu aleykum", "salamun aleykum", "selamun aleykum", "essalamu aleykum", "salam aleyküm",
  "salam", "selam", "merhaba", "hello", "hi", "hey", "hola", "alo",
  "sabahin xeyir", "sabahiniz xeyir", "gunaydin", "good morning", "gunun xeyir", "gununuz xeyir", "good afternoon",
  "axsamin xeyir", "axsaminiz xeyir", "iyi aksamlar", "good evening",
  "привет", "здравствуй", "здравствуйте", "добрый день", "доброе утро", "добрый вечер", "салам",
  "السلام عليكم", "عليكم السلام", "مرحبا", "اهلا", "اهلا وسهلا", "صباح الخير", "مساء الخير",
];
const HOW_ARE_YOU = [
  "necesen", "necesiniz", "nece sen", "nasilsin", "nasilsiniz", "nasil gidiyor", "how are you", "hows it going", "how r u",
  "nə var nə yox", "ne var ne yox", "ne haber", "kak dela", "как дела", "как ты", "как жизнь", "كيف حالك", "كيف الحال", "كيف حالكم",
  "yaxsisan", "yaxsisiniz", "yaxsimisan", "yaxsimisiniz", "iyi misin", "iyimisin", "sagsan", "sagsiniz",
];
const FILLERS_G = new Set(["a", "ey", "e", "dostum", "qardas", "brat", "bro", "nibras", "ai", "bot", "yapay", "zeka", "sen", "siz", "bele", "da", "de", "ve", "və", "и", "ты", "bir", "tez", "tez-tez", "the", "there", "again", "everyone", "hamiya", "hamimiza"]);

const THANKS = [
  "tesekkur edirem", "tesekkurler", "tesekkur", "cox tesekkur", "cox sag ol", "sag ol", "sag olun", "sagol", "saol", "eyvallah", "mersi", "minnətdaram", "minnetdaram",
  "tesekkur ederim", "tesekkurler", "sagol", "thanks", "thank you", "thx", "thanks a lot", "many thanks", "ty",
  "спасибо", "благодарю", "большое спасибо", "спс", "мерси", "شكرا", "شكرا لك", "شكرا جزيلا", "جزاك الله خيرا",
];

const REPLIES = {
  az: {
    hello: "Salam! Mən Nibras AI-yam. Necə kömək edim?",
    helloSalam: "Və əleykum salam! Mən Nibras AI-yam. Necə kömək edim?",
    how: "Salam! Yaxşıyam, sağ ol. Sən necəsən? Nə ilə kömək edim?",
    thanks: "Buyur! Başqa nə lazımdırsa, yaz.",
    time: (t) => `İndi saat ${t} (Bakı vaxtı).`,
    date: (d) => `Bu gün ${d} (Bakı vaxtı).`,
    calc: (e, r) => `${e} = ${r}`,
  },
  tr: {
    hello: "Merhaba! Ben Nibras AI. Nasıl yardımcı olabilirim?",
    helloSalam: "Ve aleykümselam! Ben Nibras AI. Nasıl yardımcı olabilirim?",
    how: "Merhaba! İyiyim, sağ ol. Sen nasılsın? Nasıl yardımcı olayım?",
    thanks: "Rica ederim! Başka bir şey lazım olursa yaz.",
    time: (t) => `Şu an saat ${t} (Bakü saati).`,
    date: (d) => `Bugün ${d} (Bakü saati).`,
    calc: (e, r) => `${e} = ${r}`,
  },
  en: {
    hello: "Hello! I'm Nibras AI. How can I help?",
    helloSalam: "Wa alaikum assalam! I'm Nibras AI. How can I help?",
    how: "Hello! I'm doing well, thanks. How are you? How can I help?",
    thanks: "You're welcome! Write if you need anything else.",
    time: (t) => `It is ${t} now (Baku time).`,
    date: (d) => `Today is ${d} (Baku time).`,
    calc: (e, r) => `${e} = ${r}`,
  },
  ru: {
    hello: "Привет! Я Nibras AI. Чем помочь?",
    helloSalam: "Ва алейкум ассалам! Я Nibras AI. Чем помочь?",
    how: "Привет! У меня всё хорошо, спасибо. А как ты? Чем помочь?",
    thanks: "Пожалуйста! Если что-то нужно, пиши.",
    time: (t) => `Сейчас ${t} (по времени Баку).`,
    date: (d) => `Сегодня ${d} (по времени Баку).`,
    calc: (e, r) => `${e} = ${r}`,
  },
  ar: {
    hello: "مرحبًا! أنا Nibras AI. كيف أساعدك؟",
    helloSalam: "وعليكم السلام ورحمة الله وبركاته! أنا Nibras AI. كيف أساعدك؟",
    how: "مرحبًا! أنا بخير، شكرًا. كيف حالك؟ كيف أساعدك؟",
    thanks: "عفوًا! اكتب إن احتجت شيئًا آخر.",
    time: (t) => `الساعة الآن ${t} (بتوقيت باكو).`,
    date: (d) => `اليوم ${d} (بتوقيت باكو).`,
    calc: (e, r) => `${e} = ${r}`,
  },
};

function stripPhrases(q, phrases) {
  let rest = " " + q + " ";
  let hit = false;
  const sorted = phrases.map((p) => norm(p)).filter(Boolean).sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    const re = new RegExp("(?<=\\s)" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s)", "gu");
    // lookbehind boşluq tələb edir; ardıcıl uyğunlaşma üçün təkrarla
    for (let i = 0; i < 3; i++) {
      if (re.test(rest)) {
        hit = true;
        rest = rest.replace(re, " ");
        re.lastIndex = 0;
      }
    }
  }
  return { hit, rest: rest.trim() };
}

function greetingReply(raw, q, lang) {
  if (!q || q.split(" ").length > 7 || raw.length > 60) return null;
  const g = stripPhrases(q, [...GREETINGS, ...HOW_ARE_YOU]);
  if (!g.hit) return null;
  const left = g.rest.split(" ").filter((w) => w && !FILLERS_G.has(w));
  if (left.length) return null;
  const salamRel = /(aleykum|aleyküm|esselamu|salamun|essalamu|السلام عليكم|عليكم السلام)/.test(q);
  const how = stripPhrases(q, HOW_ARE_YOU).hit;
  const R = REPLIES[lang];
  if (salamRel) return R.helloSalam;
  return how ? R.how : R.hello;
}

function thanksReply(raw, q, lang) {
  if (!q || q.split(" ").length > 6 || raw.length > 50) return null;
  const g = stripPhrases(q, THANKS);
  if (!g.hit) return null;
  const left = g.rest.split(" ").filter((w) => w && !FILLERS_G.has(w) && !["cox", "chox", "ucun", "kömək", "komek", "yardim", "yardimin", "ucun", "cavab", "cavabin", "cavaba", "sene", "sana", "you", "so", "much", "very", "a", "lot", "большое"].includes(w));
  if (left.length) return null;
  return REPLIES[lang].thanks;
}

// ---------- Sadə hesab ----------
function evaluate(expr) {
  let i = 0;
  const peek = () => expr[i];
  function sum() {
    let a = prod();
    while (peek() === "+" || peek() === "-") {
      const o = expr[i++];
      const b = prod();
      a = o === "+" ? a + b : a - b;
    }
    return a;
  }
  function prod() {
    let a = pow();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const o = expr[i++];
      const b = pow();
      if (o === "/" && b === 0) throw new Error("zero");
      a = o === "*" ? a * b : o === "/" ? a / b : a % b;
    }
    return a;
  }
  function pow() {
    const a = unary();
    if (peek() === "^") {
      i++;
      return Math.pow(a, pow());
    }
    return a;
  }
  function unary() {
    if (peek() === "-") {
      i++;
      return -unary();
    }
    if (peek() === "+") {
      i++;
      return unary();
    }
    return atom();
  }
  function atom() {
    if (peek() === "(") {
      i++;
      const v = sum();
      if (peek() !== ")") throw new Error("paren");
      i++;
      return v;
    }
    const m = /^\d+(?:\.\d+)?/.exec(expr.slice(i));
    if (!m) throw new Error("num");
    i += m[0].length;
    return parseFloat(m[0]);
  }
  const v = sum();
  if (i !== expr.length) throw new Error("trail");
  return v;
}

function fmt(n) {
  if (!Number.isFinite(n)) return null;
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return String(+n.toPrecision(10));
}

function arithmeticReply(raw, lang) {
  if (raw.length > 60) return null;
  let s = raw.trim().toLowerCase();
  s = s.replace(/^(hesabla|hesablayın|hesablayin|neçədir|nechedir|calculate|compute|what is|what's|whats|сколько будет|посчитай|вычисли|كم يساوي|كم ناتج|ne kadar|kaç eder)\s*[:\-]?\s*/u, "");
  s = s.replace(/\s*(neçə edir|nece edir|neçədir|necedir|kaç eder|kaç yapar|equals|будет|равно|يساوي)?\s*[=?؟]*\s*$/u, "");
  s = s.replace(/[×x✕]/g, (m, off) => (/\d/.test(s[off - 1] || "") || /[\s)]/.test(s[off - 1] || "") ? "*" : m)).replace(/÷/g, "/").replace(/−|–/g, "-");
  if (!/^[\d\s+\-*/^().,%]+$/.test(s)) return null;
  if (!/\d/.test(s) || !/[+\-*/^%]/.test(s.replace(/^\s*-/, ""))) return null;
  // tarix / telefon / sıra nömrəsinə bənzəyən ifadələri keçmə
  if (/\d{4}-\d{1,2}-\d{1,2}/.test(s) || /\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(s)) return null;
  if (/(^|[^\d.])0\d/.test(s)) return null;
  s = s.replace(/(\d),(\d)/g, "$1.$2").replace(/\s+/g, "");
  if (/\d\.\d+\.\d/.test(s) || /\.\./.test(s)) return null;
  if (s.length > 40 || (s.match(/\d+/g) || []).length < 2) return null;
  let r;
  try {
    r = evaluate(s);
  } catch {
    return null;
  }
  const out = fmt(r);
  if (out === null) return null;
  const shown = s.replace(/([+\-*/^%])/g, " $1 ").replace(/^\s*-\s*/, "-").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s+/g, " ").trim();
  return REPLIES[lang].calc(shown.replace(/\*/g, "×"), out);
}

// ---------- Saat və tarix (Asia/Baku) ----------
const MONTHS = {
  az: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  tr: ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
const DAYS = {
  az: ["bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə"],
  tr: ["pazar", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

function bakuParts(now) {
  const fmtr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baku",
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const p = {};
  for (const part of fmtr.formatToParts(now)) p[part.type] = part.value;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute), wd };
}

const TIME_RE = [
  /^(indi |hazirda |bu an |zehmet olmasa )?(saat|vaxt) (nece|necedir|neceydi|nece oldu|nece olub|nece edir|neceyedir)$/,
  /^(indi |hazirda |bu an )?saat nece dir$/,
  /^(su an |simdi )?(saat )(kac|kactir|kacta|kac oldu)$/,
  /^(saat kac|saat kactir)$/,
  /^(what time is it|what is the time|whats the time|current time|time now|what time is it now|tell me the time|time please)$/,
  /^(который час|сколько времени|сколько сейчас времени|сколько время|который сейчас час)$/,
  /^(كم الساعه|كم الساعه الان|ما الساعه|الساعه كم)$/,
];
const DATE_RE = [
  /^(bu gun |bugun |indi |hazirda )?(tarix|tarixi|tarix nedir|tarix nece|tarix necedir)$/,
  /^(bu gun |bugun )?(ayin nece|ayin necesi|ayin necesidir|hansi gun|hansi gundur|hansi gun dur|nece gundur)$/,
  /^bu gun ayin nece(si|sidir)$/,
  /^(bugun )(ayin kaci|ayin kacidir|gunlerden ne|hangi gun|tarih ne|tarih kac|kacinci gun)$/,
  /^(bugun ne gun|bugun tarih ne|bugunun tarihi|tarih)$/,
  /^(what is the date|whats the date|what is the date today|whats the date today|todays date|what day is it|what day is it today|what is today|current date|date today|what is todays date)$/,
  /^(какое сегодня число|какое число|какой сегодня день|какая сегодня дата|сегодняшняя дата|дата сегодня|какое число сегодня)$/,
  /^(ما هو تاريخ اليوم|ما تاريخ اليوم|كم التاريخ اليوم|تاريخ اليوم|ما اليوم|اي يوم اليوم)$/,
];

function timeDateReply(q, lang, now) {
  if (!q || q.split(" ").length > 8) return null;
  const R = REPLIES[lang];
  if (TIME_RE.some((re) => re.test(q))) {
    const b = bakuParts(now);
    const t = String(b.h).padStart(2, "0") + ":" + String(b.min).padStart(2, "0");
    return R.time(t);
  }
  if (DATE_RE.some((re) => re.test(q))) {
    const b = bakuParts(now);
    const month = MONTHS[lang][b.m - 1];
    const day = DAYS[lang][b.wd];
    const text = lang === "en" ? `${day}, ${month} ${b.d}, ${b.y}` : `${b.d} ${month} ${b.y}, ${day}`;
    return R.date(text);
  }
  return null;
}

export function localReply(message, now = new Date()) {
  const raw = String(message || "").trim();
  if (!raw || raw.length > 80) return null;
  const q = norm(raw);
  if (!q && !/\d/.test(raw)) return null;
  const lang = guessLang(raw, q);
  return arithmeticReply(raw, lang) || greetingReply(raw, q, lang) || thanksReply(raw, q, lang) || timeDateReply(q, lang, now);
}
