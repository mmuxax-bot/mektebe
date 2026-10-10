// İstifadəçiyə qayıdan qısa qeydlər (notes) və hər tərcümənin altındakı kiçik sətir (footer). Brend: «Nibras Tərcümə».
// ui: az | tr | en | ru | ar. Qeydlər az və en dillərindədir (tr -> az, ru/ar -> en); footer bütün 5 dildədir.
export const BRAND = "Nibras Tərcümə";
export const UI_LANGS = ["az", "tr", "en", "ru", "ar"];

export const FOOTER = {
  az: "Nibras Tərcümə ilə tərcümə olunub, xətalar ola bilər",
  tr: "Nibras Tərcümə ile çevrilmiştir, hatalar olabilir",
  en: "Translated with Nibras Tərcümə; errors are possible",
  ru: "Переведено с помощью Nibras Tərcümə, возможны ошибки",
  ar: "تمت الترجمة بواسطة Nibras Tərcümə، وقد تحدث أخطاء",
};

const M = {
  az: {
    sameLang: "Mənbə və hədəf dili eynidir.",
    badLang: "Dəstəklənən dillər: ar, az, tr, en, ru.",
    empty: "Tərcümə üçün mətn yoxdur.",
    tooLong: "Mətn çox uzundur (ən çox {n} simvol). Daha qısa hissələrlə göndərin.",
    credit: "Hazır insan tərcüməsi, dəyişdirilməyib.",
    fragment: "Mətniniz bu hədisin bir hissəsidir; tərcümə hədisin tamınındır.",
    contains: "Mətninizdə hədisdən əlavə söz də var (məs. isnad); tərcümə yalnız hədisin mətninindir.",
    ambiguous: "Bu mətn bir neçə hədisdə var; ən yaxını göstərildi.",
    noTarget: "{to} dilində hazır tərcümə yoxdur. Digər dillərdəki hazır tərcümələr aşağıdadır (çevrilməyib).",
    noTargetNone: "Bu mətn üçün hazır tərcümə mənbəsi tapılmadı.",
    noSource: "Bu mətn üçün hazır tərcümə mənbəsi tapılmadı.",
    closest: "Tam uyğunluq yoxdur; ən yaxın hədis aşağıdadır (tərcümə deyil).",
    numDisagree: "Dillər arasında rəqəmlər üst-üstə düşmür.",
    lexicon: "Sabit ifadə ({count} hədis tərcüməsində ən çox işlənən qarşılıq).",
    lexAmbiguous: "Bir neçə ərəbcə ifadənin qarşılığıdır ({keys}); birincisi göstərildi.",
    ambiguousLang: "Dil dəqiq bilinmədi; seçildi: {lang}.",
    model: "Maşın tərcüməsidir (model əsaslı), insan tərcüməsi deyil.",
    humanPart: "Mətnin içindəki hədisin hazır insan tərcüməsi aşağıdadır (yalnız həmin hissə); bütün mətnin tərcüməsi maşın tərcüməsidir.",
    disagree: "Tərcümələr bir-birindən xeyli fərqləndi; nəticə yoxlanılmalıdır.",
    lowSupport: "Tərcümə yalnız məhdud sayda yoxlama ilə alındı; ehtiyatlı olun.",
    unverified: "Yoxlama mərhələsi tərcümədə uyğunsuzluq göstərdi; nəticə yoxlanılmalıdır.",
    partialFail: "Mətnin bəzi hissələri tərcümə olunmadı (ərəbcə qaldı).",
    verseKept: "Quran ayələri tərcümə edilmir: mötərizədə olduğu kimi saxlanıldı.",
    rateLimited: "Çox sorğu göndərildi. Bir az sonra yenidən cəhd edin.",
    budget: "Bir sorğuda maşın tərcüməsi üçün limit dolub. Bu hissəni ayrıca tərcümə edin.",
  },
  en: {
    sameLang: "Source and target languages are the same.",
    badLang: "Supported languages: ar, az, tr, en, ru.",
    empty: "No text to translate.",
    tooLong: "Text is too long (max {n} characters). Please send shorter parts.",
    credit: "Existing human translation, unmodified.",
    fragment: "Your text is part of this hadith; the translation covers the full hadith.",
    contains: "Your text has extra words beyond the hadith (e.g. the chain); the translation covers the hadith text only.",
    ambiguous: "This text occurs in several hadiths; the closest is shown.",
    noTarget: "No ready translation in {to}. Ready translations in other languages are below (not converted).",
    noTargetNone: "No ready translation source was found for this text.",
    noSource: "No ready translation source was found for this text.",
    closest: "No full match; the closest hadith is below (not a translation).",
    numDisagree: "Numbers differ between languages.",
    lexicon: "Fixed phrase (most frequent rendering across {count} hadith translations).",
    lexAmbiguous: "Corresponds to several Arabic phrases ({keys}); the first is shown.",
    ambiguousLang: "Language uncertain; chosen: {lang}.",
    model: "Machine translation (model-based), not a human translation.",
    humanPart: "The existing human translation of the hadith quoted inside the text is below (that part only); the translation of the whole text is machine translation.",
    disagree: "The independent translations differed noticeably; please double-check the result.",
    lowSupport: "The translation was produced with limited cross-checking; be careful.",
    unverified: "The verification step flagged a possible mismatch; please double-check the result.",
    partialFail: "Some parts of the text could not be translated (left in Arabic).",
    verseKept: "Quran verses are not translated: kept as-is in braces.",
    rateLimited: "Too many requests. Please try again in a moment.",
    budget: "The machine-translation limit for one request is used up. Translate this part separately.",
  },
};
const NOTE_UI = { az: "az", tr: "az", en: "en", ru: "en", ar: "en" };
export function msg(ui, key, vars = {}) {
  const t = M[NOTE_UI[ui] || "az"][key] || M.az[key] || key;
  return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}
export const footerFor = (ui) => FOOTER[ui] || FOOTER.az;
