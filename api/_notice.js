// Dini suallarda cavabın BAŞINDA verilən xəbərdarlıq: «süni intellektdən din öyrənilməz» + İbn Sirinin sözü.
// Söhbətdə yalnız İLK dini cavabda göstərilir: client {noticeShown:false} göndərir (söhbət tarixçəsində bildiriş yoxdursa),
// server isə yalnız bu halda bloku əlavə edir (server vəziyyət saxlamır). noticeShown göndərilməyibsə (köhnə client) cavab dəyişmir.
import { detectLang } from "./_ayah.js";

export const NOTICE_AR = "إنَّ هذا العلمَ دِينٌ، فانظروا عمَّن تأخذون دينكم";

const T = {
  az: {
    lead: "İlk olaraq: süni intellektdən din öyrənilməz. İbn Sirin رحمه الله demişdir:",
    quote: "«Həqiqətən, bu elm sizin dininizdir; dininizi kimdən aldığınıza diqqət edin.»",
    src: "Mənbə: Müslim, «Səhih»in müqəddiməsi",
  },
  tr: {
    lead: "Öncelikle: din, yapay zekâdan öğrenilmez. İbn Sîrîn رحمه الله şöyle demiştir:",
    quote: "«Şüphesiz bu ilim dindir; öyleyse dininizi kimden aldığınıza dikkat edin.»",
    src: "Kaynak: Müslim, «Sahîh»in mukaddimesi",
  },
  en: {
    lead: "First of all: religion is not learned from artificial intelligence. Ibn Sirin رحمه الله said:",
    quote: "«Indeed, this knowledge is religion, so look carefully at whom you take your religion from.»",
    src: "Source: Muslim, introduction to his Sahih",
  },
  ru: {
    lead: "Прежде всего: религию не изучают у искусственного интеллекта. Ибн Сирин رحمه الله сказал:",
    quote: "«Поистине, это знание — религия, так смотрите, у кого вы берёте свою религию.»",
    src: "Источник: Муслим, введение к «Сахиху»",
  },
  ar: {
    lead: "أولًا: لا يُؤخذ الدين من الذكاء الاصطناعي. قال ابن سيرين رحمه الله:",
    quote: "«إنَّ هذا العلمَ دِينٌ، فانظروا عمَّن تأخذون دينكم»",
    src: "رواه مسلم في مقدمة صحيحه",
  },
};

export const NOTICE_START = "::notice::";
// Köhnə az mətni (DIN_REPLY) də bildiriş sayılır: təkrar yazılmasın
export const OLD_AZ_NOTICE = "İlk olaraq: süni intellektdən din öyrənilməz. İbn Sirin رحمه الله demişdir: «Həqiqətən, bu elm sizin dininizdir; dininizi kimdən aldığınıza diqqət edin.»";

// Bildiriş YALNIZ süni intellektin özünün yazdığı dini cavablara aiddir. Daxili mənbədən (AI-siz) gələn cavablarda bildiriş verilmir:
// Quran ayə/surə (mənaca tərcümə daxil), təfsir (Müyəssər, Sədi, İbn Kəsir), tövhid dərsləri, Quran lüğəti (Bəqərə sözləri),
// «davam» (növbəti ayə/təfsir) və gələcəkdə əlavə olunacaq kitab (Şamilə) çıxarışları. Yeni daxili mənbə «book» adı ilə qoşulur.
// Əl ilə yazılmış hazır cavablar («canned»), dinReply və İbn Sirin xəbərdarlığı bura daxil deyil: davranışları dəyişməyib.
export const SOURCE_KINDS = new Set(["ayah", "tafsir", "tawhid", "quran", "next", "book"]);
export const isSourceKind = (kind) => SOURCE_KINDS.has(kind);

export function noticeLang(message) {
  const l = detectLang(message);
  return T[l] ? l : "az";
}

// ::notice:: / lead / quote / [::ar:: ərəbcə] / ::src:: / ::/notice::
export function noticeBlock(lang = "az") {
  const t = T[lang] || T.az;
  const lines = [NOTICE_START, t.lead, t.quote];
  if (lang !== "ar") lines.push("::ar:: " + NOTICE_AR);
  lines.push("::src:: " + t.src, "::/notice::");
  return lines.join("\n");
}

export function hasNotice(text) {
  const s = String(text || "");
  return s.includes(NOTICE_START) || s.includes("süni intellektdən din öyrənilməz");
}

// Dini cavabın başına bildiriş əlavə edir (təkrarsız). Köhnə DIN_REPLY mətni varsa, ondan təmizlənir.
export function withNotice(reply, lang) {
  let body = String(reply || "");
  if (body.includes(NOTICE_START)) return body;
  body = body.split(OLD_AZ_NOTICE).join("").replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");
  return noticeBlock(lang) + (body.trim() ? "\n\n" + body.trim() : "");
}

// Bildirişi (::notice:: bloku, köhnə az mətni və AI-nin özünün yazdığı eyni xəbərdarlığı) mətndən çıxarır. Lüğət suallarında istifadə olunur.
export function stripNotice(text) {
  let body = String(text || "").replace(/(^|\n)::notice::\n[\s\S]*?\n::\/notice::(?=\n|$)/g, "$1");
  body = body.split(OLD_AZ_NOTICE).join("");
  // AI-nin sərbəst yazdığı variantlar (4 dildə «lead» + sitat)
  for (const l of Object.keys(T)) {
    body = body.split(T[l].lead + " " + T[l].quote).join("").split(T[l].lead).join("");
  }
  return body.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n").trim();
}
