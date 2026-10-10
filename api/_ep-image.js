export const config = { maxDuration: 60 };

const MODELS = ["grok-imagine-image", "grok-imagine-image-2.0", "grok-imagine-image-quality"];

function env(name) {
  const hit = Object.keys(process.env).find((key) => key.toUpperCase() === name.toUpperCase());
  return hit ? String(process.env[hit] || "").trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") : "";
}


const LIVING = [
  // Azərbaycan / Türk
  "insan", "adam", "kişi", "kisi", "qadın", "qadin", "kadın", "kadin", "xanım", "xanim", "oğlan", "oglan", "qız", "qiz", "uşaq", "usaq", "çocuk", "cocuk", "körpə", "korpe", "bebek", "gənc", "genc", "yaşlı", "yasli", "qoca", "baba", "nənə", "nene", "ana", "ata", "anne", "baba", "üz", "uz", "yüz", "portret", "portre", "selfi", "şəxs", "sexs", "kimse", "kimsə", "insanlar", "camaat", "izdiham", "pərəstişkar", "futbolçu", "futbolcu", "oyunçu", "sürücü", "həkim", "hekim", "müəllim", "muellim", "şagird", "tələbə", "pilot", "əsgər", "esger", "polis", "padşah", "kral", "şahzadə", "pirens", "peyğəmbər", "peygamber", "mələk", "melek", "cin", "şeytan", "zombi", "robot insan", "canlı", "canli", "heyvan", "hayvan", "pişik", "pisik", "kedi", "it", "köpək", "kopek", "at", "ayı", "ayi", "aslan", "pələng", "pelen", "qurd", "kurt", "tülkü", "tulku", "dovşan", "tavsan", "dəvə", "deve", "inək", "inek", "qoyun", "keçi", "keci", "dana", "ceyran", "maral", "fil", "zürafə", "zurafe", "meymun", "maymun", "ilan", "timsah", "kərtənkələ", "quş", "kuş", "qartal", "kartal", "göyərçin", "goyercin", "toyuq", "tavuk", "xoruz", "ördək", "ordek", "qaz", "balıq", "balik", "delfin", "köpəkbalığı", "balina", "kəpənək", "kelebek", "arı", "ari", "milçək", "hörümçək", "horumcek", "həşərat", "hesere", "böcək", "bocek", "dinozavr", "əjdaha", "ejdaha", "ejder", "canavar", "heyvanlar", "kopekler",
  // English
  "human", "person", "people", "man", "men", "woman", "women", "boy", "girl", "child", "children", "kid", "baby", "face", "portrait", "selfie", "crowd", "soldier", "doctor", "teacher", "king", "queen", "prophet", "angel", "demon", "zombie", "animal", "animals", "cat", "dog", "horse", "lion", "tiger", "wolf", "fox", "rabbit", "camel", "cow", "sheep", "goat", "deer", "elephant", "giraffe", "monkey", "snake", "crocodile", "bird", "eagle", "pigeon", "chicken", "duck", "fish", "dolphin", "whale", "shark", "butterfly", "bee", "insect", "spider", "dinosaur", "dragon", "creature", "pet", "puppy", "kitten", "bear", "mouse", "rat", "owl", "parrot", "peacock", "turtle", "frog",
  // Русский
  "человек", "люди", "мужчина", "женщина", "мальчик", "девочка", "ребёнок", "ребенок", "дети", "лицо", "портрет", "селфи", "толпа", "солдат", "врач", "учитель", "король", "королева", "пророк", "ангел", "демон", "зомби", "животное", "животные", "кошка", "кот", "собака", "пёс", "лошадь", "конь", "лев", "тигр", "волк", "лиса", "кролик", "верблюд", "корова", "овца", "коза", "олень", "слон", "жираф", "обезьяна", "змея", "крокодил", "птица", "орёл", "орел", "голубь", "курица", "утка", "рыба", "дельфин", "кит", "акула", "бабочка", "пчела", "насекомое", "паук", "динозавр", "дракон", "медведь", "мышь", "крыса", "сова", "попугай", "павлин", "черепаха", "лягушка",
  // العربية
  "إنسان", "انسان", "شخص", "ناس", "رجل", "امرأة", "امراه", "ولد", "بنت", "طفل", "أطفال", "وجه", "صورة شخصية", "جندي", "طبيب", "معلم", "ملك", "ملكة", "نبي", "ملاك", "شيطان", "حيوان", "حيوانات", "قطة", "قط", "كلب", "حصان", "أسد", "اسد", "نمر", "ذئب", "ثعلب", "أرنب", "جمل", "بقرة", "خروف", "غنم", "ماعز", "غزال", "فيل", "زرافة", "قرد", "ثعبان", "تمساح", "طائر", "طير", "نسر", "حمامة", "دجاجة", "بطة", "سمكة", "دلفين", "حوت", "قرش", "فراشة", "نحلة", "حشرة", "عنكبوت", "ديناصور", "تنين", "دب", "فأر", "بومة", "ببغاء", "طاووس", "سلحفاة", "ضفدع",
];

function foldWord(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ё/g, "е")
    .replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");
}

const LIVING_SET = new Set(LIVING.map(foldWord));
const LIVING_PREFIX = LIVING.map(foldWord).filter((w) => w.length >= 4);
const LIVING_SHORT = LIVING.map(foldWord).filter((w) => w.length >= 2 && w.length <= 3 && /^[a-z]+$/.test(w) && w !== "uz");
const SHORT_END = /^(lar|ler)?(in|nin|nun|un|i|ni|si|su|a|e|na|ne|da|de|dan|den|la|le|ya|ye|im|in|imiz)?$/;

// İnsan və canlı (heyvan, quş, balıq, həşərat və s.) şəkillərinə icazə verilmir.
function wantsLiving(prompt) {
  const text = foldWord(prompt).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!text) return false;
  const words = text.split(" ");
  for (const w of words) {
    if (LIVING_SET.has(w)) return true;
    // Şəkilçili formalar: "pisiyi", "insanlarin", "kishinin" kimi.
    for (const base of LIVING_SHORT) {
      if (w.length > base.length && w.startsWith(base) && SHORT_END.test(w.slice(base.length))) return true;
    }
    for (const base of LIVING_PREFIX) {
      if (w.length > base.length && w.startsWith(base) && w.length - base.length <= 5) return true;
    }
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ success: false, reply: "Yalnız POST sorğusu qəbul olunur." });
    return;
  }

  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || body.message || "").trim().slice(0, 800);
    const image = String(body.image || "");
    if (!prompt) {
      res.status(400).json({ success: false, reply: "Şəkli qısa təsvir et." });
      return;
    }
    if (image && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image)) {
      res.status(400).json({ success: false, reply: "Şəkil PNG və ya JPG olmalıdır." });
      return;
    }
    if (image.length > 2_800_000) {
      res.status(400).json({ success: false, reply: "Şəkil çox böyükdür. Daha kiçik şəkil seç." });
      return;
    }
    if (wantsLiving(prompt)) {
      res.status(200).json({
        success: false,
        reply: "İnsan və canlı (heyvan, quş və s.) şəkilləri hazırlanmır. Başqa mövzu yaz: məsələn, mənzərə, bina, loqo, təbiət, kosmos, əşya.",
      });
      return;
    }
    if (body.limitReached === true) {
      res.status(200).json({ success: true, reply: "Bu gün üçün şəkil limiti bitdi. Sabah yenidən yaz.", usedAI: false, limited: true });
      return;
    }
    const providers = [
      () => viaXai(prompt, image),
      () => viaGemini(prompt, image),
      () => viaTogether(prompt, image),
      () => viaHuggingFace(prompt, image),
      () => viaOpenAi(prompt, image),
      () => viaPollinations(prompt, image),
    ];
    let last = "";
    for (const run of providers) {
      let result;
      try {
        result = await run();
      } catch (error) {
        result = { ok: false, detail: String(error && error.message || error) };
      }
      if (result.skipped) continue;
      if (result.ok) {
        res.status(200).json({ success: true, url: result.url, reply: image ? "Şəkil düzəldildi." : "Şəkil hazırdır.", usedAI: true });
        return;
      }
      console.error("image provider failed", result.status, result.detail);
      last = result.detail || last;
    }
    let reply = image
      ? "Şəkli düzəltmək olmadı. Bir az sonra yenidən yoxla."
      : "Şəkil hazırlanmadı. Bir az sonra yenidən yoxla.";
    if (/moderation|policy|safety|content/i.test(last)) reply = "Bu təsvirlə şəkil hazırlamaq olmadı. Başqa cür yaz.";
    res.status(502).json({ success: false, reply });
  } catch {
    res.status(500).json({ success: false, reply: "Şəkil xidmətinə çatmaq olmadı." });
  }
}

function dataParts(image) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(image);
  return m ? { mime: m[1], data: m[2] } : null;
}

async function viaXai(prompt, image) {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) return { skipped: true };
  let last = { ok: false, detail: "xAI cavab vermədi." };
  for (const model of MODELS) {
    last = await imagine(apiKey, model, prompt, image);
    if (last.ok) return last;
    if (last.status === 401 || last.status === 403 || last.status === 429) break;
  }
  return last;
}

async function viaGemini(prompt, image) {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return { skipped: true };
  const parts = [{ text: prompt }];
  const img = image ? dataParts(image) : null;
  if (img) parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
  let detail = "Gemini şəkil vermədi.";
  for (const model of ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation", "gemini-2.5-flash-image-preview"]) {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
    });
    const data = await upstream.json().catch(() => ({}));
    const out = (data.candidates?.[0]?.content?.parts || []).map((x) => x.inlineData || x.inline_data).find((x) => x && x.data);
    if (upstream.ok && out) return { ok: true, url: "data:" + (out.mimeType || out.mime_type || "image/png") + ";base64," + out.data };
    detail = String(data.error?.message || detail);
    if (upstream.status === 429 || upstream.status === 401 || upstream.status === 403) return { ok: false, status: upstream.status, detail };
  }
  return { ok: false, detail };
}

async function viaTogether(prompt, image) {
  const apiKey = env("TOGETHER_API_KEY");
  if (!apiKey || image) return { skipped: true };
  const upstream = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ model: "black-forest-labs/FLUX.1-schnell", prompt, steps: 4, n: 1, response_format: "b64_json" }),
  });
  const data = await upstream.json().catch(() => ({}));
  const b64 = data.data?.[0]?.b64_json;
  if (upstream.ok && b64) return { ok: true, url: "data:image/jpeg;base64," + b64 };
  return { ok: false, status: upstream.status, detail: String(data.error?.message || data.error || upstream.status) };
}

async function viaHuggingFace(prompt, image) {
  const apiKey = env("HF_TOKEN");
  if (!apiKey || image) return { skipped: true };
  const upstream = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({ inputs: prompt }),
  });
  const type = upstream.headers.get("content-type") || "";
  if (upstream.ok && type.startsWith("image/")) {
    const buf = Buffer.from(await upstream.arrayBuffer());
    return { ok: true, url: "data:" + type.split(";")[0] + ";base64," + buf.toString("base64") };
  }
  const data = await upstream.json().catch(() => ({}));
  return { ok: false, status: upstream.status, detail: String(data.error?.message || data.error || upstream.status) };
}

async function viaOpenAi(prompt, image) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey || image) return { skipped: true };
  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", quality: "low" }),
  });
  const data = await upstream.json().catch(() => ({}));
  const b64 = data.data?.[0]?.b64_json;
  if (upstream.ok && b64) return { ok: true, url: "data:image/png;base64," + b64 };
  return { ok: false, status: upstream.status, detail: String(data.error?.message || upstream.status) };
}

async function viaPollinations(prompt, image) {
  if (image) return { skipped: true };
  const seed = Math.floor(Math.random() * 1e6);
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=768&height=768&nologo=true&model=flux&seed=" + seed;
  const upstream = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { "User-Agent": "Mozilla/5.0 (compatible; NibrasAI/1.0)", Accept: "image/*" } });
  const type = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !type.startsWith("image/")) return { ok: false, status: upstream.status, detail: "Pollinations " + upstream.status };
  const buf = Buffer.from(await upstream.arrayBuffer());
  return { ok: true, url: "data:" + type.split(";")[0] + ";base64," + buf.toString("base64") };
}

async function imagine(apiKey, model, prompt, image) {
  const editing = Boolean(image);
  const upstream = await fetch(editing ? "https://api.x.ai/v1/images/edits" : "https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify(
      editing
        ? { model, prompt, image: { url: image, type: "image_url" } }
        : model === "grok-imagine-image-2.0" ? { model, prompt, n: 1, quality: "low" } : { model, prompt, n: 1 },
    ),
  });
  const data = await upstream.json().catch(() => ({}));
  const first = Array.isArray(data.data) ? data.data[0] : null;
  const url = first?.url || data.url || (first?.b64_json ? "data:image/png;base64," + first.b64_json : "");
  if (upstream.ok && url) return { ok: true, url };
  const detail = data.error?.message || data.error || data.message || String(upstream.status);
  return { ok: false, status: upstream.status, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
}

async function readJson(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return JSON.parse(body || "{}");
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8") || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
