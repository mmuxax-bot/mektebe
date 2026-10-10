// Nibras AI bəzi faktları özü Wikidata-dan oxuyur. Model və başqa axtarış aləti çağırılmır.
// wikidataReply(message) -> mətn və ya null.

const UA = "NibrasAI/1.0 (https://www.nibrascode.com; nibrascode@gmail.com)";

const LABEL = {
  az: { country: "Ölkə", capital: "Paytaxt", lang: "Rəsmi dil", born: "Doğum", died: "Vəfat", birthplace: "Doğum yeri", job: "Peşə", citizen: "Vətəndaşlıq", people: "Əhali", started: "Yaranma", kind: "Növ", place: "Yer", area: "Sahə", source: "Mənbə" },
  en: { country: "Country", capital: "Capital", lang: "Official language", born: "Born", died: "Died", birthplace: "Place of birth", job: "Occupation", citizen: "Citizenship", people: "Population", started: "Started", kind: "Kind", place: "Place", area: "Area", source: "Source" },
  tr: { country: "Ülke", capital: "Başkent", lang: "Resmi dil", born: "Doğum", died: "Vefat", birthplace: "Doğum yeri", job: "Meslek", citizen: "Vatandaşlık", people: "Nüfus", started: "Kuruluş", kind: "Tür", place: "Yer", area: "Yüzölçümü", source: "Kaynak" },
  ru: { country: "Страна", capital: "Столица", lang: "Официальный язык", born: "Рождение", died: "Смерть", birthplace: "Место рождения", job: "Занятие", citizen: "Гражданство", people: "Население", started: "Основание", kind: "Вид", place: "Место", area: "Площадь", source: "Источник" },
  ar: { country: "البلد", capital: "العاصمة", lang: "اللغة الرسمية", born: "الميلاد", died: "الوفاة", birthplace: "مكان الميلاد", job: "المهنة", citizen: "الجنسية", people: "السكان", started: "التأسيس", kind: "النوع", place: "المكان", area: "المساحة", source: "المصدر" },
};

const FOCUS_PROPS = {
  who: ["born", "died", "birthplace", "job", "citizen"],
  where: ["country", "place", "capital", "people"],
  capital: ["capital", "country"],
  population: ["people", "country"],
  born: ["born", "birthplace", "died"],
  what: ["kind", "country", "capital", "started", "people"],
  about: ["kind", "country", "capital", "people", "born", "job", "started"],
};

const PROP = {
  kind: "P31",
  country: "P17",
  capital: "P36",
  lang: "P37",
  place: "P131",
  born: "P569",
  died: "P570",
  birthplace: "P19",
  job: "P106",
  citizen: "P27",
  people: "P1082",
  started: "P571",
  area: "P2046",
};

function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ё/g, "е")
    .replace(/[’'`´]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessLang(raw) {
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/[\u0400-\u04FF]/.test(raw)) return "ru";
  if (/[əƏ]/.test(raw)) return "az";
  const q = norm(raw);
  if (/\b(merhaba|baskent\w*|nufus\w*|nerede\w*|nedir|hakkinda)\b/.test(q)) return "tr";
  if (/\b(who|where|what|capital|population|born|about)\b/.test(q)) return "en";
  if (/\b(kim|harada|paytaxt|ehali|haqqinda|dogul)\w*/.test(q)) return "az";
  return "az";
}

function cleanTopic(topic) {
  return String(topic || "").replace(/[?؟!.]+/g, " ").replace(/\s+/g, " ").trim();
}

function caseCandidates(topic) {
  const t = cleanTopic(topic);
  const out = [t];
  if (/(nın|nin|nun|nün)$/iu.test(t)) out.push(t.replace(/(nın|nin|nun|nün)$/iu, ""));
  if (/(ın|in|un|ün)$/iu.test(t) && t.length > 4) out.push(t.replace(/(ın|in|un|ün)$/iu, ""));
  return [...new Set(out.map((x) => x.trim()).filter((x) => x.length >= 2))];
}

const SKIP = /quran|qurani|quranin|aye|sur[ea]|hadis|hedis|fetva|fetwa|tefsir|tafsir|namaz|oruc|allah\b|nibras|kod yaz|oyun yaz|html|javascript|python/;

export function wikiQuery(message) {
  const raw = String(message || "").trim();
  const q = norm(raw);
  if (q.length < 3 || q.length > 180) return null;
  if (SKIP.test(q)) return null;
  const lang = guessLang(raw);
  const rules = [
    [/^(?:who is|who was|kimdir|kim idi|кто так(?:ой|ая)|من هو|من هي)\s+(.{2,80})$/, "who"],
    [/(.{2,80}?)\s+(?:kimdir|kim idi)$/, "who"],
    [/^(?:where is|where are|nerede|neresi)\s+(.{2,80})$/, "where"],
    [/(.{2,80}?)\s+(?:where is|nerede|neresi|haradadir|harada yerlesir|nerededir|где находится|где это)$/, "where"],
    [/^(?:capital of|paytaxti|baskenti|столица|عاصمة)\s+(.{2,80})$/, "capital"],
    [/(.{2,60}?)\s+(?:paytaxti(?: nedir)?|baskenti(?: nedir)?|столица)$/, "capital"],
    [/^(?:population of|ehalisi|nufusu|население)\s+(.{2,80})$/, "population"],
    [/(.{2,60}?)\s+(?:ehalisi(?: ne qederdir)?|nufusu(?: ne kadar)?|население)$/, "population"],
    [/(.{2,60}?)\s+(?:ne vaxt dogulub|ne zaman dogdu|when was .{0,20}born|когда родился)$/, "born"],
    [/^(?:what is|nedir|nedir bu|что такое|ما هو|ما هي)\s+(.{2,80})$/, "what"],
    [/(.{2,60}?)\s+(?:nedir|nədir|nedır)$/, "what"],
    [/(.{2,60}?)\s+(?:haqqinda|hakkinda|about|о нем|о ней|عنه)$/, "about"],
  ];
  for (const [re, focus] of rules) {
    const m = q.match(re);
    if (!m) continue;
    const topic = cleanTopic(m[1] || m[2] || "");
    if (topic.length < 2) continue;
    if (/^(bu|o|su|bu se|the|a|an|это|هذا|هذه)$/.test(topic)) continue;
    return { lang, focus, topic: topicFromRaw(raw, topic) || topic };
  }
  return null;
}

function topicFromRaw(raw, normalizedTopic) {
  const words = raw.replace(/[?؟!.]+/g, " ").trim().split(/\s+/);
  const nwords = norm(raw).split(" ");
  const target = normalizedTopic.split(" ");
  const start = nwords.findIndex((_, i) => nwords.slice(i, i + target.length).join(" ") === normalizedTopic);
  if (start < 0) return cleanTopic(normalizedTopic);
  return cleanTopic(words.slice(start, start + target.length).join(" "));
}

async function getJson(url, accept = "application/json") {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function searchEntity(topic, lang) {
  const cands = caseCandidates(topic);
  const langs = lang === "en" ? ["en"] : [lang, "en"];
  let best = [];
  let bestScore = 0;
  for (const cand of cands) {
    for (const code of langs) {
      const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&type=item&limit=5&strictlanguage=false&language=" + code + "&uselang=" + code + "&search=" + encodeURIComponent(cand);
      const data = await getJson(url);
      const hits = (data?.search || []).slice().sort((a, b) => hitScore(b, cands) - hitScore(a, cands));
      const score = hits.reduce((n, hit) => Math.max(n, hitScore(hit, cands)), 0);
      if (score > bestScore && hits.length) {
        best = hits;
        bestScore = score;
      }
      if (bestScore >= 100) return best;
    }
  }
  return best;
}

function hitScore(hit, cands) {
  const label = norm(hit?.label || hit?.display?.label?.value || hit?.match?.text || "");
  const match = norm(hit?.match?.text || "");
  const wanted = cands.map(norm);
  if (wanted.includes(label) || wanted.includes(match)) return hit?.match?.type === "alias" ? 90 : 100;
  if (wanted.some((c) => label.startsWith(c + " ") || c.startsWith(label + " "))) return 30;
  return 10;
}

const PID = Object.fromEntries(Object.entries(PROP).map(([key, pid]) => [pid, key]));

function sparqlLiteral(value) {
  const raw = String(value || "");
  if (/^[+-]?\d+(\.\d+)?$/.test(raw)) return formatQty({ amount: raw });
  const time = raw.match(/^[+-]?(\d{4})-(\d{2})-(\d{2})/);
  if (time) return formatTime({ time: raw, precision: raw.endsWith("-01-01T00:00:00Z") ? 9 : 11 });
  return raw;
}

function prettyFact(text) {
  const raw = String(text || "");
  if (/^[+-]?\d{4,}$/.test(raw)) return formatQty({ amount: raw });
  const date = raw.match(/^([+-]?\d{4})-(\d{2})-(\d{2})/);
  if (!date) return raw;
  const year = String(Number(date[1]));
  if (date[2] === "01" && date[3] === "01") return year;
  return year + "-" + date[2] + "-" + date[3];
}

async function sparqlFacts(id, lang, topic) {
  if (!/^Q\d+$/.test(id)) return null;
  const languages = [...new Set([lang, "en", "az"])].join(",");
  const query = `
SELECT ?itemLabel ?itemDescription ?prop ?value ?valueLabel WHERE {
  BIND(wd:${id} AS ?item)
  OPTIONAL {
    VALUES ?prop { wdt:P31 wdt:P17 wdt:P36 wdt:P37 wdt:P131 wdt:P569 wdt:P570 wdt:P19 wdt:P106 wdt:P27 wdt:P1082 wdt:P571 wdt:P2046 }
    ?item ?prop ?value .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}`;
  const data = await getJson("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query), "application/sparql-results+json");
  const rows = data?.results?.bindings || [];
  if (!rows.length) return null;
  const title = rows[0].itemLabel?.value || topic;
  const desc = rows[0].itemDescription?.value || "";
  if (/^Q\d+$/.test(title)) return null;
  const grouped = {};
  for (const row of rows) {
    const pid = String(row.prop?.value || "").split("/").pop();
    const key = PID[pid];
    if (!key) continue;
    const literal = row.value?.type === "literal" ? sparqlLiteral(row.value.value) : "";
    const named = row.valueLabel?.value && !/^Q\d+$/.test(row.valueLabel.value) ? prettyFact(row.valueLabel.value) : "";
    const text = named || literal;
    if (!text) continue;
    grouped[key] = grouped[key] || [];
    if (!grouped[key].includes(text)) grouped[key].push(text);
  }
  return { title, desc, grouped };
}

function claimsOf(entity, pid) {
  const all = (entity?.claims?.[pid] || []).filter((c) => c.rank !== "deprecated" && c.mainsnak?.snaktype === "value");
  const pref = all.filter((c) => c.rank === "preferred");
  return (pref.length ? pref : all).slice(0, 2);
}

function rawValue(claim) {
  return claim?.mainsnak?.datavalue?.value;
}

function formatTime(value) {
  const time = String(value?.time || "");
  const m = time.match(/^[+-]?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const year = String(Number(m[1]));
  const prec = value.precision || 11;
  if (prec <= 9) return year;
  if (prec === 10) return year + "-" + m[2];
  return year + "-" + m[2] + "-" + m[3];
}

function formatQty(value) {
  const n = Number(value?.amount);
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
}

function labelOf(entity, lang, fallback = true) {
  return entity?.labels?.[lang]?.value || (fallback ? entity?.labels?.en?.value || entity?.labels?.az?.value || "" : "");
}

function descriptionOf(entity, lang) {
  return entity?.descriptions?.[lang]?.value || entity?.descriptions?.en?.value || entity?.descriptions?.az?.value || "";
}

export async function wikidataReply(message) {
  const query = wikiQuery(message);
  if (!query) return null;
  const hits = await searchEntity(query.topic, query.lang);
  if (!hits.length) return null;
  const names = LABEL[query.lang] || LABEL.az;
  const wanted = FOCUS_PROPS[query.focus] || FOCUS_PROPS.about;
  const show = [...new Set([...wanted, ...FOCUS_PROPS.about])];
  for (const hit of hits.slice(0, 3)) {
    const facts = await sparqlFacts(hit.id, query.lang, query.topic);
    if (!facts) continue;
    const kind = facts.grouped.kind || [];
    if (kind.some((text) => /disambiguation|çoxmənalı|неоднознач|توضيح/i.test(text))) continue;
    const lines = [];
    for (const key of show) {
      const text = (facts.grouped[key] || []).slice(0, key === "job" || key === "kind" ? 2 : 1).join(", ");
      if (text && names[key]) lines.push(names[key] + ": " + text);
    }
    if (!facts.desc && !lines.length) continue;
    const head = facts.desc ? facts.title + " — " + facts.desc + "." : facts.title + ".";
    const body = lines.slice(0, 5).join("\n");
    return body ? head + "\n\n" + body : head;
  }
  const ids = hits.map((h) => h.id).filter(Boolean).slice(0, 4);
  const packed = await getJson(
    "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims&languages=az|en|tr|ru|ar&ids=" + ids.join("|"),
  );
  const entities = packed?.entities || {};
  let entity = null;
  for (const id of ids) {
    const item = entities[id];
    if (!item || item.missing != null) continue;
    const kinds = claimsOf(item, "P31").map((c) => rawValue(c)?.id);
    if (kinds.includes("Q4167410") || kinds.includes("Q13406463")) continue;
    entity = item;
    break;
  }
  if (!entity) return null;
  const keys = [...new Set([...wanted, ...FOCUS_PROPS.about])].filter((k) => PROP[k]);
  const qids = new Set();
  const picked = {};
  for (const key of keys) {
    const values = claimsOf(entity, PROP[key]);
    if (!values.length) continue;
    picked[key] = values.map(rawValue);
    for (const value of picked[key]) if (value?.id) qids.add(value.id);
  }
  let linked = {};
  if (qids.size) {
    const extra = await getJson(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=az|en|tr|ru|ar&ids=" + [...qids].slice(0, 24).join("|"),
    );
    linked = extra?.entities || {};
  }
  const lang = query.lang;
  const title = labelOf(entity, lang) || query.topic;
  const desc = descriptionOf(entity, lang);
  const lines = [];
  for (const key of show) {
    const values = picked[key];
    if (!values?.length || !names[key]) continue;
    const text = values
      .map((value) => {
        if (!value) return "";
        if (value.id) return labelOf(linked[value.id], lang, false);
        if (value.time) return formatTime(value);
        if (value.amount) return formatQty(value);
        if (typeof value === "string") return value;
        return "";
      })
      .filter(Boolean)
      .join(", ");
    if (text) lines.push(names[key] + ": " + text);
  }
  if (!desc && !lines.length) return null;
  const head = desc ? title + " — " + desc + "." : title + ".";
  const body = lines.slice(0, 5).join("\n");
  return body ? head + "\n\n" + body : head;
}
