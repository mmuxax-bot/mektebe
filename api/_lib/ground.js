// Nibras Library: Nibras AI-ni kitabxana axtarışına bağlayır.
//  1) Dini/kitab sualı AI-yə getməzdən əvvəl kitabxanada axtarılır; yaxşı nəticə varsa, cavab sözbəsöz çıxarışlardır (mənbə + «Kitabda aç»).
//  2) AI istifadə olunanda ən yaxşı 3–5 çıxarış sistem mesajında verilir: model yalnız onlara əsaslanır və kitab/cild/səhifə göstərir.
// Qaydalar: sələf müəllifləri önə (bölmə sırası), «لن» əbədi inkar deyil (sələf əqidəsinə zidd qrammatik təvil yoxdur), Quran AI ilə tərcümə olunmur.
import { searchForChat } from "./library.js";

const KIND = { "ibn-taymiyyah": "itbooks", majmu: "fatawa", hadith: "hadith", nahw: "nahw" };
const LEAD = {
  az: (v) => `Kitabxanadan sözbəsöz çıxarışlar${v ? ` («${v}»)` : ""}:`,
  tr: (v) => `Kütüphaneden aynen alıntılar${v ? ` («${v}»)` : ""}:`,
  en: (v) => `Verbatim excerpts from the library${v ? ` («${v}»)` : ""}:`,
  ru: (v) => `Дословные выдержки из библиотеки${v ? ` («${v}»)` : ""}:`,
  ar: (v) => `مقتطفات حرفية من المكتبة${v ? ` («${v}»)` : ""}:`,
};
const NOTE = {
  az: "Çıxarışlar kitablardan olduğu kimi götürülüb, tərcümə və ya şərh edilməyib. Tam mətn üçün «Kitabda aç».",
  tr: "Alıntılar kitaplardan olduğu gibi alınmıştır; çeviri veya yorum yapılmamıştır. Tam metin için «Kitapta aç».",
  en: "Excerpts are quoted verbatim, without translation or commentary. Use «Open in book» for the full text.",
  ru: "Выдержки приведены дословно, без перевода и толкования. Полный текст — «Открыть в книге».",
  ar: "المقتطفات منقولة من الكتب كما هي دون ترجمة أو شرح. وللنص الكامل: «افتح في الكتاب».",
};
const clean = (s) => String(s || "").replace(/^…/, "").replace(/…$/, "").trim();
const srcOf = (x) => [x.author, x.bookAr, x.ref].filter(Boolean).join("، ");

/** Kitabxana axtarışı: { strong, items, reply?, links? } */
export async function libraryAnswer(message, lang = "az") {
  const r = await searchForChat(message, 5);
  if (!r.items.length) return { strong: false, items: [] };
  // «yaxşı nəticə»: ifadə/başlıq uyğunluğu, və ya lüğətdən gələn tək sözlük mövzu üzrə ən azı 3 çıxarış
  const strong = r.best >= 2 || (!r.arabic && r.single && r.items.length >= 3);
  const L = LEAD[lang] ? lang : "az";
  const via = r.items[0].via;
  const blocks = r.items.map((x) => [`::tafsir ${KIND[x.sec]}::`, `::tl:: ${x.bookAr} · ${x.ref}${x.title ? " · " + x.title : ""}`, clean(x.s), `::src:: ${srcOf(x)}`, "::/tafsir::"].join("\n"));
  const reply = [LEAD[L](via), "", ...blocks, "", `::note:: ${NOTE[L]}`].join("\n");
  const links = r.items.map((x) => ({ book: x.book, p: x.p, q: x.via }));
  return { strong, items: r.items, reply, links };
}

/** AI üçün sistem mesajı: yalnız bu çıxarışlara əsaslan, kitab/cild/səhifə göstər. */
export function groundingPrompt(items) {
  const list = items
    .slice(0, 5)
    .map((x, i) => `[${i + 1}] ${srcOf(x)}\n${clean(x.s).slice(0, 900)}`)
    .join("\n\n");
  return [
    "Aşağıda Nibras kitabxanasından (İbn Teymiyyə kitabları, Məcmuu əl-Fətava, Kütübü-sittə, nəhv kitabları) sözbəsöz çıxarışlar var.",
    "Suala YALNIZ bu çıxarışlara əsaslanaraq cavab ver. Hər fikirdən sonra mənbəni göstər: kitab, cild (varsa) və səhifə, məs. «(Məcmuu əl-Fətava, c. 23, s. 190)». Çıxarışlarda cavab yoxdursa, bunu açıq de və uydurma.",
    "Ərəbcə sitatı dəyişmə. Quran ayələrini özün tərcümə etmə (yalnız «mənaca tərcümə» olduğunu bildirərək ümumi məna ver).",
    "Əqidədə sələfin (əhli-sünnə) yolunu tut. Qrammatik təvillə əqidəyə zidd nəticə çıxarma: «لن» əbədi inkar (تأبيد) bildirmir, Allahı axirətdə görməyin inkarı üçün dəlil deyil.",
    "",
    list,
  ].join("\n");
}
