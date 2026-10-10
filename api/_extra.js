// Müəyyən suallar modelə getmir: hava, məzənnə, qısa izah, paket.
// extraReply(message) -> mətn və ya null.

const UA = "NibrasAI/1.0 (https://www.nibrascode.com; nibrascode@gmail.com)";

const FRANKFURTER = "https://api.frankfurter.dev/v1/latest";
const RATES = "https://open.er-api.com/v6/latest/";

const WX = {
  az: ["açıq", "az buludlu", "buludlu", "dumanlı", "çiskin", "yağışlı", "qarlı", "leysan", "qar leysanı", "ildırımlı"],
  en: ["clear", "partly cloudy", "cloudy", "foggy", "drizzle", "rain", "snow", "showers", "snow showers", "thunder"],
  tr: ["açık", "az bulutlu", "bulutlu", "sisli", "çisenti", "yağmurlu", "karlı", "sağanak", "kar sağanağı", "gök gürültülü"],
  ru: ["ясно", "малооблачно", "пасмурно", "туман", "морось", "дождь", "снег", "ливень", "снежный ливень", "гроза"],
  ar: ["صحو", "غائم جزئياً", "غائم", "ضباب", "رذاذ", "مطر", "ثلج", "زخات", "زخات ثلج", "رعد"],
};

const RATE_WORD = {
  az: { usd: "dollar", eur: "avro", azn: "manat", try: "lirə", gbp: "funt", rub: "rubl" },
  en: { usd: "dollar", eur: "euro", azn: "manat", try: "lira", gbp: "pound", rub: "ruble" },
  tr: { usd: "dolar", eur: "avro", azn: "manat", try: "lira", gbp: "sterlin", rub: "ruble" },
  ru: { usd: "доллар", eur: "евро", azn: "манат", try: "лира", gbp: "фунт", rub: "рубль" },
  ar: { usd: "دولار", eur: "يورو", azn: "مانات", try: "ليرة", gbp: "جنيه", rub: "روبل" },
};

function hasWord(text, words) {
  return words.some((word) => new RegExp("(^|[^\\p{L}\\p{N}])" + word + "([^\\p{L}\\p{N}]|$)", "iu").test(text));
}

function guessLang(raw) {
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/[\u0400-\u04FF]/.test(raw)) return "ru";
  if (/[əƏ]/.test(raw)) return "az";
  const q = raw.toLowerCase();
  if (hasWord(q, ["hava", "merhaba", "kaç", "kac", "nasıl", "nasil", "nerede", "nedir", "hakkında", "hakkinda", "kısaca", "bugün", "lira", "dolar", "vakti"]) || /k[ıi]ble/i.test(q)) return "tr";
  if (hasWord(q, ["weather", "how", "about", "what", "who", "where", "package", "briefly", "dollar", "dollars", "prayer", "salah", "time", "hijri", "today", "date"]) || /qibla/i.test(q)) return "en";
  return "az";
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(7000) });
  if (!res.ok) return null;
  return res.json();
}

function weatherKind(code) {
  const n = Number(code);
  if (n === 0) return 0;
  if (n <= 2) return 1;
  if (n === 3) return 2;
  if (n <= 48) return 3;
  if (n <= 57) return 4;
  if (n <= 67) return 5;
  if (n <= 77) return 6;
  if (n <= 82) return 7;
  if (n <= 86) return 8;
  if (n >= 95) return 9;
  return 2;
}

function stripPlace(name) {
  return String(name || "").trim().replace(/(?:['’])?(?:da|də|de|ta|te)$/i, "").trim();
}

function weatherCity(raw) {
  const text = raw.replace(/[?؟!]/g, " ").replace(/\s+/g, " ").trim();
  let m = text.match(/(?:^|\s)(?:in|в|في)\s+(\S{2,40})\s*$/i);
  if (/(hava|weather|погода|طقس)/i.test(text) && m) return stripPlace(m[1]);
  m = text.match(/^(.{2,40}?)\s+(?:bugünkü|bugunku|indiki|today|сегодня)?\s*(?:hava|havası|havasi|hava durumu|weather|погода|الطقس)\b/i);
  if (m) return stripPlace(m[1]);
  m = text.match(/\b(?:hava|weather|погода|الطقس)\b\s+(?:indiki|bugün|bugun|necədir|necedir|nasıl|nasil|how is|какая)?\s*(.{2,40})/i);
  if (m) return stripPlace(m[1].replace(/^(?:in|at|в|في)\s+/i, "").replace(/\b(necədir|necedir|nasıl|nasil|bugün|indi|now)\b/gi, "").trim());
  return "";
}

async function weatherReply(message) {
  if (!/(hava|weather|погода|الطقس)/i.test(message)) return null;
  const city = weatherCity(message);
  if (city.length < 2) return null;
  const lang = guessLang(message);
  const geo = await getJson("https://geocoding-api.open-meteo.com/v1/search?count=1&language=" + lang + "&name=" + encodeURIComponent(city));
  const hit = geo?.results?.[0];
  if (!hit) return null;
  const cur = await getJson(
    "https://api.open-meteo.com/v1/forecast?timezone=auto&current=temperature_2m,weather_code,precipitation,wind_speed_10m&latitude=" + hit.latitude + "&longitude=" + hit.longitude,
  );
  const now = cur?.current;
  if (!now) return null;
  const name = hit.name || city;
  const words = WX[lang] || WX.az;
  const sky = words[weatherKind(now.weather_code)] || words[2];
  const temp = Math.round(Number(now.temperature_2m));
  const rain = Number(now.precipitation || 0);
  const wind = Math.round(Number(now.wind_speed_10m || 0));
  if (lang === "en") return name + ": " + temp + "°, " + sky + ". Rain " + rain + " mm. Wind " + wind + " km/h.";
  if (lang === "tr") return name + ": " + temp + "°, " + sky + ". Yağış " + rain + " mm. Rüzgar " + wind + " km/saat.";
  if (lang === "ru") return name + ": " + temp + "°, " + sky + ". Осадки " + rain + " мм. Ветер " + wind + " км/ч.";
  if (lang === "ar") return name + ": " + temp + "°، " + sky + ". المطر " + rain + " مم. الرياح " + wind + " كم/س.";
  return name + ": " + temp + "°, " + sky + ". Yağıntı " + rain + " mm. Külək " + wind + " km/saat.";
}

const CURRENCY = [
  ["usd", /dollars?|dollar|dolar|usd|доллар\w*|دولار/i],
  ["eur", /avro|euros?|euro|eur\b|евро|يورو/i],
  ["azn", /manat\w*|azn|манат\w*|مانات/i],
  ["try", /lirə\w*|lirasi|lira\w*|try\b|лир\w*|ليرة/i],
  ["gbp", /funt\w*|gbp|pounds?|фунт\w*|جنيه/i],
  ["rub", /rubl\w*|rub\b|рубл\w*|روبل/i],
];

function rateAsk(message) {
  if (!/(neçə|nece|kaç|kac|how much|сколько|بكم|məzənn|mezenn|kur\b|rate)/i.test(message)) return null;
  const found = [];
  for (const [code, re] of CURRENCY) {
    const hit = message.match(re);
    if (hit) found.push({ code, at: hit.index });
  }
  found.sort((a, b) => a.at - b.at);
  const unique = [...new Set(found.map((item) => item.code))];
  if (!unique.length) return null;
  let from = unique[0];
  let to = unique[1] || (from === "azn" ? "usd" : "azn");
  const amount = Number(String(message).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") || 1);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return null;
  return { from, to, amount };
}

function dotDate(raw) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const [day, month, year] = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(d).split("/");
  return day + "." + month + "." + year;
}

async function directRate(from, to) {
  const base = from.toUpperCase();
  const quote = to.toUpperCase();
  if (base === "AZN" || quote === "AZN") {
    const data = await getJson(RATES + base);
    const rate = data?.rates?.[quote];
    if (!rate) return null;
    return { rate, date: dotDate(data.time_last_update_utc) };
  }
  const data = await getJson(FRANKFURTER + "?from=" + base + "&to=" + quote);
  const rate = data?.rates?.[quote];
  if (!rate) return null;
  return { rate, date: String(data.date || "").split("-").reverse().join(".") };
}

async function rateReply(message) {
  const ask = rateAsk(message);
  if (!ask) return null;
  const lang = guessLang(message);
  const names = RATE_WORD[lang] || RATE_WORD.az;
  const quote = await directRate(ask.from, ask.to);
  if (!quote) return null;
  const value = (ask.amount * quote.rate).toLocaleString("en-US", { maximumFractionDigits: 4 }).replace(/,/g, " ");
  const left = (ask.amount === 1 ? "1" : String(ask.amount)) + " " + names[ask.from];
  return left + " = " + value + " " + names[ask.to] + (quote.date ? " (" + quote.date + ")" : "");
}

function wikiTopic(raw) {
  return raw
    .replace(/[?؟!]/g, " ")
    .replace(/\b(haqqında|haqqinda|qısaca|qisaca|qisa|hakkında|hakkinda|kısaca|kisaca|about|briefly|кратко|расскажи|نبذة|باختصار|عن)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function wikiReply(message) {
  if (!/(haqqında|haqqinda|qısaca|qisaca|hakkında|hakkinda|kısaca|about|briefly|кратко|расскажи|نبذة|باختصار)/i.test(message)) return null;
  const topic = wikiTopic(message);
  if (topic.length < 2) return null;
  const lang = guessLang(message);
  const host = lang + ".wikipedia.org";
  const found = await getJson("https://" + host + "/w/api.php?action=query&list=search&utf8=1&format=json&srlimit=3&srsearch=" + encodeURIComponent(topic));
  const title = found?.query?.search?.[0]?.title;
  if (!title) return null;
  const page = await getJson("https://" + host + "/api/rest_v1/page/summary/" + encodeURIComponent(title));
  if (!page || page.type === "disambiguation") return null;
  const text = String(page.extract || "").replace(/\s+/g, " ").trim();
  if (text.length < 40) return null;
  const short = text.length > 700 ? text.slice(0, 700).replace(/\s+\S*$/, "") + "…" : text;
  return short;
}

const PY_NAMES = new Set(["requests", "flask", "django", "numpy", "pandas", "scipy", "pillow", "matplotlib", "fastapi", "beautifulsoup4"]);
const CODE_NAMES = new Set([...PY_NAMES, "react", "vue", "express", "vite", "lodash", "axios", "webpack", "next", "redux", "jquery", "typescript"]);
const SKIP_PKG = new Set(["apk", "html", "css", "sql", "git", "api", "json", "python", "javascript", "typescript", "java", "php", "node", "npm", "pip", "android", "ios", "hava", "dollar", "manat"]);

function packageTopic(raw) {
  const text = raw.replace(/[?؟!]/g, " ").replace(/\s+/g, " ").trim();
  const hinted = /(npm|pypi|pip\b|paket|package|kitabxana|kütüphane|kutuphane|библиотека|حزمة)/i.test(text);
  const asked = (
    text.match(/(?:npm|pypi|pip)\s+([A-Za-z][A-Za-z0-9._-]{1,40})/i)?.[1] ||
    text.match(/(?:what is|что такое|ما هو|ما هي)\s+([A-Za-z][A-Za-z0-9._-]{1,40})/i)?.[1] ||
    text.match(/([A-Za-z][A-Za-z0-9._-]{1,40})\s+(?:nədir|nedir|nedır|paketi|package)/i)?.[1] ||
    ""
  );
  const name = asked.toLowerCase();
  if (!name || SKIP_PKG.has(name)) return null;
  const codeLike = CODE_NAMES.has(name) || /[.\-]/.test(name);
  if (!hinted && !codeLike && /[A-Z]/.test(asked)) return null;
  if (!hinted && !/(nədir|nedir|nedır|what is|что такое|ما هو|ما هي)/i.test(text)) return null;
  const py = /(pypi|pip\b|python)/i.test(text) || PY_NAMES.has(name);
  const node = /(npm|node|javascript)/i.test(text);
  return { name, prefer: py && !node ? "pypi" : "npm" };
}

async function packageReply(message) {
  const topic = packageTopic(message);
  if (!topic) return null;
  const lang = guessLang(message);
  const npm = await getJson("https://registry.npmjs.org/" + encodeURIComponent(topic.name));
  const pypi = await getJson("https://pypi.org/pypi/" + encodeURIComponent(topic.name) + "/json");
  const npmOk = npm && npm.error == null && npm["dist-tags"]?.latest;
  const pypiOk = pypi?.info?.version;
  let pick = null;
  if (topic.prefer === "pypi" && pypiOk) pick = "pypi";
  else if (topic.prefer === "npm" && npmOk) pick = "npm";
  else if (npmOk) pick = "npm";
  else if (pypiOk) pick = "pypi";
  if (!pick) return null;
  const via = { az: ["npm paketi", "PyPI paketi"], en: ["npm package", "PyPI package"], tr: ["npm paketi", "PyPI paketi"], ru: ["пакет npm", "пакет PyPI"], ar: ["حزمة npm", "حزمة PyPI"] };
  const label = (via[lang] || via.az)[pick === "npm" ? 0 : 1];
  if (pick === "npm") return topic.name + " — " + String(npm.description || "").trim() + "\n" + label + " " + npm["dist-tags"].latest;
  return topic.name + " — " + String(pypi.info.summary || "").trim() + "\n" + label + " " + pypi.info.version;
}

const PRAYER_NAMES = {
  az: ["Sübh", "Zöhr", "Əsr", "Məğrib", "İşa"],
  en: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"],
  tr: ["İmsak", "Öğle", "İkindi", "Akşam", "Yatsı"],
  ru: ["Фаджр", "Зухр", "Аср", "Магриб", "Иша"],
  ar: ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"],
};

function clockMinutes(value) {
  const [h, m] = String(value || "").slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function clockText(total) {
  const n = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}

export function ishaUmmalQura(maghrib, isha, place) {
  const start = clockMinutes(maghrib);
  if (start == null) return String(isha || "").slice(0, 5);
  return clockText(start + (place?.country === "SA" ? 120 : 90));
}

const PRAYER_WORD = /(?:sübh|subh|fəcr|fecr|fajr|imsak|zöhr|zohr|zuhr|dhuhr|öğle|ogle|günorta|gunorta|əsr|esr|asr|ikindi|məğrib|maghrib|magrib|axşam|aksam|akşam|işa|isha|yatsı|yatsi|xüftən|xaftan|namaz|vaxt|vakit|prayer|salah|times?|saat)[^\s]*/giu;

function isPrayerAsk(message) {
  const slot = /(sübh|subh|fajr|zöhr|zohr|zuhr|dhuhr|öğle|ogle|günorta|gunorta|əsr|asr|ikindi|məğrib|maghrib|axşam|akşam|işa|isha|yatsı)/i.test(message);
  const when = /(namaz|vaxt|vakit|prayer|salah|مواقيت|أوقات|намаз)/i.test(message);
  return (slot && when) || /(namaz\w*\s+vaxt|namaz\s+vakti|prayer\s+times?|salah\s+times?|время\s+намаза|مواقيت|أوقات\s+الصلاة|اوقات\s+الصلاة)/i.test(message);
}

function prayerFocus(raw) {
  const rules = [
    [/sübh|subh|fəcr|fecr|fajr|imsak/i, 0],
    [/zöhr|zohr|zuhr|dhuhr|öğle|ogle|günorta|gunorta/i, 1],
    [/əsr|asr|ikindi/i, 2],
    [/məğrib|maghrib|magrib|axşam|aksam|akşam/i, 3],
    [/işa|isha|yatsı|yatsi|xüftən|xaftan/i, 4],
  ];
  for (const [re, index] of rules) if (re.test(raw)) return index;
  return -1;
}

function prayerCity(raw) {
  let text = raw.replace(/[()（）[\]"?؟!]/g, " ");
  text = text.replace(PRAYER_WORD, " ");
  text = text.replace(/bu\s+gün|bugün|bugun|today|сегодня|اليوم|neçədir|necedir|nədir|nedir|təxminən|taxminen/gi, " ");
  text = text.replace(/\b(in|at|üçün|ucun|icin|için)\b/gi, " ");
  text = text.replace(/(?:^|\s)(?:في|в)(?=\s|$)/gi, " ");
  return stripPlace(text).replace(/\s+/g, " ").trim();
}

export async function prayerReply(message) {
  if (!isPrayerAsk(message)) return null;
  const city = prayerCity(message);
  if (city.length < 2) return null;
  const focus = prayerFocus(message);
  const lang = guessLang(message);
  const geo = await getJson("https://geocoding-api.open-meteo.com/v1/search?count=1&language=" + (lang === "az" ? "az" : lang) + "&name=" + encodeURIComponent(city));
  const hit = geo?.results?.[0];
  if (!hit) return null;
  const zone = hit.timezone || "UTC";
  const [day, month, year] = new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()).split("/");
  const data = await getJson(
    "https://api.aladhan.com/v1/timings/" + day + "-" + month + "-" + year +
      "?latitude=" + hit.latitude + "&longitude=" + hit.longitude + "&method=4&school=0&timezonestring=" + encodeURIComponent(zone),
  );
  const t = data?.data?.timings;
  if (!t?.Fajr || !t?.Maghrib || !t?.Isha) return null;
  const isha = ishaUmmalQura(t.Maghrib, t.Isha, { country: hit.country_code });
  const names = PRAYER_NAMES[lang] || PRAYER_NAMES.az;
  const times = [t.Fajr, t.Dhuhr, t.Asr, t.Maghrib, isha].map((value) => String(value).slice(0, 5));
  const lines = names.map((name, i) => name + " " + times[i]);
  const body = focus >= 0 ? lines[focus] + "\n\n" + lines.filter((_, i) => i !== focus).join("\n") : lines.join("\n");
  const gap = hit.country_code === "SA" ? 120 : 90;
  const note = {
    az: "İşa məğribdən " + gap + " dəqiqə sonra. Üsul: Ummul-Qura.",
    en: "Isha is " + gap + " minutes after Maghrib. Method: Umm al-Qura.",
    tr: "Yatsı akşamdan " + gap + " dakika sonra. Yöntem: Ümmü'l-Kura.",
    ru: "Иша через " + gap + " минут после магриба. Метод: Умм аль-Кура.",
    ar: "العشاء بعد المغرب بـ" + gap + " دقيقة. الطريقة: أم القرى.",
  };
  return (hit.name || city) + "\n" + body + "\n" + (note[lang] || note.az);
}

const HIJRI_MONTH = {
  az: ["Məhərrəm", "Səfər", "Rəbiüləvvəl", "Rəbiülaxir", "Cəmadiyələvvəl", "Cəmadiyəlaxir", "Rəcəb", "Şaban", "Ramazan", "Şəvval", "Zilqədə", "Zilhiccə"],
  en: ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qidah", "Dhu al-Hijjah"],
  tr: ["Muharrem", "Safer", "Rebiülevvel", "Rebiülahir", "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce"],
  ru: ["Мухаррам", "Сафар", "Раби аль-авваль", "Раби ас-сани", "Джумада аль-уля", "Джумада ас-сани", "Раджаб", "Шабан", "Рамадан", "Шавваль", "Зу-ль-када", "Зу-ль-хиджа"],
  ar: ["محرم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
};

function cleanPlace(raw, words) {
  let text = raw.replace(/[()?؟!]/g, " ").replace(words, " ");
  text = text.replace(/bu\s+gün|bugün|bugun|today|сегодня|сейчас|اليوم/gi, " ");
  text = text.replace(/\b(in|at|üçün|ucun|icin|için|indi|now)\b/gi, " ");
  text = text.replace(/(?:^|\s)(?:في|в)(?=\s|$)/gi, " ");
  return stripPlace(text).replace(/\s+/g, " ").trim();
}

async function findPlace(name, lang) {
  const geo = await getJson("https://geocoding-api.open-meteo.com/v1/search?count=1&language=" + (lang === "az" ? "az" : lang) + "&name=" + encodeURIComponent(name));
  return geo?.results?.[0] || null;
}

function zoneNow(zone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return { time: get("hour") + ":" + get("minute"), date: get("day") + "-" + get("month") + "-" + get("year") };
}

function isClockAsk(message) {
  return /(saat\s+ne[cç][əe]|saat\s+kaç|saat\s+kac|what\s+time|current\s+time|который\s+час|сколько\s+времени|كم\s+الساعة|الساعة\s+كم|ما\s+الوقت)/i.test(message);
}

export async function clockReply(message) {
  if (!isClockAsk(message)) return null;
  const lang = guessLang(message);
  const city = cleanPlace(message, /saat\s+ne[cç][əe]\w*|saat\s+kaç\w*|saat\s+kac\w*|what\s+time(?:\s+is\s+it)?|current\s+time|который\s+час|сколько\s+времени|كم\s+الساعة|الساعة\s+كم|ما\s+الوقت/gi);
  let zone = "Asia/Baku";
  let label = { az: "Bakı", en: "Baku", tr: "Bakü", ru: "Баку", ar: "باكو" }[lang] || "Bakı";
  if (city.length >= 2) {
    const hit = await findPlace(city, lang);
    if (!hit?.timezone) return null;
    zone = hit.timezone;
    label = hit.name || city;
  }
  return label + "\n" + zoneNow(zone).time;
}

function isHijriAsk(message) {
  if (!/(hicri|hijri|хиджр|هجر)/i.test(message)) return false;
  if (/(nədir|nedir|what is|что такое|ما هو|ما هي)/i.test(message) && !/(neçə|nece|bugün|today|tarix|tarih|сегодня|اليوم|كم)/i.test(message)) return false;
  return true;
}

export async function hijriReply(message) {
  if (!isHijriAsk(message)) return null;
  const lang = guessLang(message);
  const city = cleanPlace(message, /الهجري|hicri\w*|hijri\w*|хиджр\w*|هجري\w*|tarixi|tarix\w*|tarih\w*|neçədir|necedir|neçə|nece|nədir|nedir|date|число|كم|ما|هو|هي|هذا|التاريخ|какой|какая|какое|какие|what|which|how/gi);
  let zone = "Asia/Baku";
  let label = "";
  if (city.length >= 2) {
    const hit = await findPlace(city, lang);
    if (!hit?.timezone) return null;
    zone = hit.timezone;
    label = hit.name || city;
  }
  const data = await getJson("https://api.aladhan.com/v1/gToH?date=" + zoneNow(zone).date);
  const h = data?.data?.hijri;
  const monthNo = Number(h?.month?.number);
  const names = HIJRI_MONTH[lang] || HIJRI_MONTH.az;
  if (!h?.day || !names[monthNo - 1] || !h?.year) return null;
  const line = h.day + " " + names[monthNo - 1] + " " + h.year;
  return label ? label + "\n" + line : line;
}

const QIBLA_DIR = {
  az: ["şimal", "şimal-şərq", "şərq", "cənub-şərq", "cənub", "cənub-qərb", "qərb", "şimal-qərb"],
  en: ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"],
  tr: ["kuzey", "kuzeydoğu", "doğu", "güneydoğu", "güney", "güneybatı", "batı", "kuzeybatı"],
  ru: ["север", "северо-восток", "восток", "юго-восток", "юг", "юго-запад", "запад", "северо-запад"],
  ar: ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"],
};

function qiblaDegree(lat, lon) {
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const p2 = (21.4225 * Math.PI) / 180;
  const l2 = (39.8262 * Math.PI) / 180;
  const y = Math.sin(l2 - l1);
  const x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(l2 - l1);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

function isQiblaAsk(message) {
  return /(qibl[əe]|qibla|k[ıi]ble|кибл|قبل)/i.test(message);
}

export async function qiblaReply(message) {
  if (!isQiblaAsk(message)) return null;
  const lang = guessLang(message);
  const city = cleanPlace(
    message,
    /qibl[əe]\p{L}*|qibla\p{L}*|k[ıi]ble\p{L}*|кибл\p{L}*|قبل\p{L}*|hansı|hansi|tərəf\p{L}*|teref\p{L}*|direction|which|way|hangi|taraf\p{L}*|куда|где|сторона|جهة|وين|اين|what|nədir|nedir|\b(?:of|the|is)\b/giu,
  ).replace(/(?:['’])?(?:nın|nin|nun|nün|ın|in|un|ün)$/iu, "");
  let label = { az: "Bakı", en: "Baku", tr: "Bakü", ru: "Баку", ar: "باكو" }[lang] || "Bakı";
  let lat = 40.4093;
  let lon = 49.8671;
  if (city.length >= 2) {
    let hit = await findPlace(city, lang);
    if (!hit && /ы$/i.test(city)) hit = await findPlace(city.slice(0, -1) + "а", lang);
    if (!hit && /[ая]$/i.test(city)) hit = await findPlace(city.slice(0, -1), lang);
    if (hit?.latitude == null || hit?.longitude == null) return null;
    lat = hit.latitude;
    lon = hit.longitude;
    label = hit.name || city;
  }
  const deg = qiblaDegree(lat, lon);
  const dirs = QIBLA_DIR[lang] || QIBLA_DIR.az;
  const side = dirs[Math.round(deg / 45) % 8];
  const line = {
    az: "Qiblə " + deg + "°, " + side + ".",
    en: "Qibla is " + deg + "°, " + side + ".",
    tr: "Kıble " + deg + "°, " + side + ".",
    ru: "Кибла " + deg + "°, " + side + ".",
    ar: "القبلة " + deg + "°، " + side + ".",
  };
  const note = {
    az: "Üzünü Məkkəyə tutan tərəfdir.",
    en: "It is the direction that faces Makkah.",
    tr: "Yüzünü Mekke'ye çeviren yöndür.",
    ru: "Это сторона, которой встают лицом к Мекке.",
    ar: "هي الجهة التي تستقبل بها مكة.",
  };
  return label + "\n" + (line[lang] || line.az) + "\n" + (note[lang] || note.az);
}

export async function extraReply(message) {
  const raw = String(message || "").trim();
  if (raw.length < 3 || raw.length > 180) return null;
  if (/(quran|qurani|hədis|hadis|təfsir|tefsir|fətva|fetva|nibras)/i.test(raw)) return null;
  try {
    const clock = await clockReply(raw);
    if (clock) return clock;
  } catch { /* növbəti mənbə */ }
  try {
    const hijri = await hijriReply(raw);
    if (hijri) return hijri;
  } catch { /* növbəti mənbə */ }
  try {
    const qibla = await qiblaReply(raw);
    if (qibla) return qibla;
  } catch { /* növbəti mənbə */ }
  try {
    const prayer = await prayerReply(raw);
    if (prayer) return prayer;
  } catch { /* növbəti mənbə */ }
  try {
    const weather = await weatherReply(raw);
    if (weather) return weather;
  } catch { /* növbəti mənbə */ }
  try {
    const rate = await rateReply(raw);
    if (rate) return rate;
  } catch { /* növbəti mənbə */ }
  try {
    const about = await wikiReply(raw);
    if (about) return about;
  } catch { /* növbəti mənbə */ }
  try {
    return await packageReply(raw);
  } catch {
    return null;
  }
}
