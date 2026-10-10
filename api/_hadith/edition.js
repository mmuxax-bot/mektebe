// Çap / nömrələmə qeydi (hər hədis blokunun altında bir qısa sətir; oxucuda başlığın altında).
// Yalnız məlumatdakı Şamilə kitab kartlarının (books/<id>.json → card) və naşir/müəllif müqəddimələrinin təsdiqlədiyi faktlar:
//   735   Buxari: «المحقق: د. مصطفى ديب البغا — دار ابن كثير، دار اليمامة، دمشق — الطبعة الخامسة ١٤١٤هـ/١٩٩٣م»;
//         müqəddimə: «ترقيم الأحاديث ترقيما متسلسلا ... حتى ولو كان الحديث متكررا» (son hədis 7123 — Fəthul-Bari nömrəsindən fərqlidir)
//   1727  Müslim: «المحقق: محمد فؤاد عبد الباقي — مطبعة عيسى البابي الحلبي، القاهرة ١٣٧٤هـ/١٩٥٥م»; mətndə «١ - (٨)»:
//         mötərizədəki ümumi nömrə (məlumatda saxlanan və göstərilən budur) + kitab daxilində ardıcıl nömrə (saxlanmır)
//   117359 Əbu Davud: «المحقق: شعيب الأرنؤوط - محمد كامل قره بللي — دار الرسالة العالمية، ط١ ١٤٣٠هـ/٢٠٠٩م»
//   1363  Tirmizi: «حققه: شعيب الأرنؤوط (جميع الأجزاء) وآخرون — دار الرسالة العالمية، ط١ ١٤٣٠هـ/٢٠٠٩م»
//   1339  Nəsai (əl-Müctəba): «محمد رضوان عرقسوسي، محمد أنس مصطفى الخن — دار الرسالة العالمية، ط١ ١٤٣٩هـ/٢٠١٨م»;
//         kart: «ترقيم الأحاديث: تابعوا الترقيم الذي وضعه عبد الفتاح أبو غدة»
//   1194  İbn Macə: «حققه وحكم على أحاديثه: عصام موسى هادي — دار الصديق، الجبيل، ط٢ ١٤٣٥هـ/٢٠١٤م»;
//         müqəddimə: «حافظت على الترقيم المشهور لابن ماجه ... ترقيم ... فؤاد عبد الباقي»
const ED = {
  735: {
    az: "Çap: Mustafa əl-Buğa nəşri (Dəməşq, 1993); nömrə bu çapın ardıcıl nömrəsidir, başqa çaplarda (məs. Fəthul-Bari) fərqlidir.",
    tr: "Baskı: Mustafa el-Buğa neşri (Dımaşk, 1993); numara bu baskının sıra numarasıdır, diğer baskılarda (ör. Fethu'l-Bârî) farklıdır.",
    en: "Edition: Mustafa al-Bugha (Damascus, 1993); the number is this edition's running number and differs in others (e.g. Fath al-Bari).",
    ru: "Издание: Мустафа аль-Буга (Дамаск, 1993); номер — сквозной номер этого издания, в других (напр. «Фатх аль-Бари») он иной.",
    ar: "الطبعة: ط البغا (دمشق ١٤١٤هـ)؛ الرقم هو ترقيم البغا المتسلسل، ويختلف في غيرها (كترقيم فتح الباري).",
  },
  1727: {
    az: "Çap: M. Fuad Əbdülbaqi nəşri (Qahirə, 1955); nömrə onun ümumi nömrəsidir (kitab daxilindəki alt nömrə yox); başqa çaplarda fərqli ola bilər.",
    tr: "Baskı: M. Fuâd Abdülbâkî neşri (Kahire, 1955); numara onun genel numarasıdır (kitap içi alt numara değil); diğer baskılarda farklı olabilir.",
    en: "Edition: M. Fuad ʿAbd al-Baqi (Cairo, 1955); the number is his general number (not the in-chapter sub-number); other editions may differ.",
    ru: "Издание: М. Фуад Абд аль-Баки (Каир, 1955); номер — его общий номер (не номер внутри книги); в других изданиях может отличаться.",
    ar: "الطبعة: ترقيم محمد فؤاد عبد الباقي (القاهرة ١٣٧٤هـ)؛ الرقم هو الرقم العام لا الرقم داخل الكتاب، وقد يختلف في غيرها.",
  },
  117359: {
    az: "Çap: ər-Risalə nəşri, Şuayb əl-Arnaut təhqiqi (2009); nömrə bu çapa görədir, başqa çaplarda fərqli ola bilər.",
    tr: "Baskı: er-Risâle neşri, Şuayb el-Arnaût tahkiki (2009); numara bu baskıya göredir, diğer baskılarda farklı olabilir.",
    en: "Edition: al-Risalah, ed. Shuʿayb al-Arnaʾut (2009); numbering follows this edition and may differ in others.",
    ru: "Издание: ар-Рисаля, ред. Шуайб аль-Арнаут (2009); нумерация по этому изданию, в других может отличаться.",
    ar: "الطبعة: ط الرسالة بتحقيق الأرنؤوط (١٤٣٠هـ)؛ الترقيم بحسبها وقد يختلف في غيرها.",
  },
  1363: {
    az: "Çap: ər-Risalə nəşri, Şuayb əl-Arnaut və başqaları (2009); nömrə bu çapa görədir, başqa çaplarda fərqli ola bilər.",
    tr: "Baskı: er-Risâle neşri, Şuayb el-Arnaût ve diğerleri (2009); numara bu baskıya göredir, diğer baskılarda farklı olabilir.",
    en: "Edition: al-Risalah, ed. Shuʿayb al-Arnaʾut et al. (2009); numbering follows this edition and may differ in others.",
    ru: "Издание: ар-Рисаля, ред. Шуайб аль-Арнаут и др. (2009); нумерация по этому изданию, в других может отличаться.",
    ar: "الطبعة: ط الرسالة بتحقيق الأرنؤوط وآخرين (١٤٣٠هـ)؛ الترقيم بحسبها وقد يختلف في غيرها.",
  },
  1339: {
    az: "Çap: ər-Risalə nəşri (2018); nömrə Əbdülfəttah Əbu Ğuddənin nömrələməsinə görədir, başqa çaplarda fərqli ola bilər.",
    tr: "Baskı: er-Risâle neşri (2018); numara Abdülfettâh Ebû Gudde'nin numaralandırmasına göredir, diğer baskılarda farklı olabilir.",
    en: "Edition: al-Risalah (2018); numbering follows ʿAbd al-Fattah Abu Ghuddah and may differ in other editions.",
    ru: "Издание: ар-Рисаля (2018); нумерация по Абд аль-Фаттаху Абу Гудде, в других изданиях может отличаться.",
    ar: "الطبعة: ط الرسالة (١٤٣٩هـ)؛ الترقيم ترقيم عبد الفتاح أبو غدة، وقد يختلف في غيرها.",
  },
  1194: {
    az: "Çap: İsam Musa Hadi təhqiqi (əl-Cübeyl, 2014); nömrə Fuad Əbdülbaqinin məşhur nömrələməsidir, başqa çaplarda fərqli ola bilər.",
    tr: "Baskı: İsâm Mûsâ Hâdî tahkiki (Cübeyl, 2014); numara Fuâd Abdülbâkî'nin meşhur numaralandırmasıdır, diğer baskılarda farklı olabilir.",
    en: "Edition: ed. ʿIsam Musa Hadi (Jubail, 2014); the number is Fuad ʿAbd al-Baqi's well-known numbering; other editions may differ.",
    ru: "Издание: ред. Исам Муса Хади (Джубайль, 2014); номер — известная нумерация Фуада Абд аль-Баки; в других изданиях может отличаться.",
    ar: "الطبعة: تحقيق عصام موسى هادي (الجبيل ١٤٣٥هـ)؛ الرقم على الترقيم المشهور لمحمد فؤاد عبد الباقي، وقد يختلف في غيرها.",
  },
};
export function editionLine(bookId, lang) {
  const e = ED[bookId];
  if (!e) return "";
  // mənbə sətirləri ərəbcədir (sağdan sola blok): latın/kiril sətrin sonundakı nöqtə yerində qalsın deyə LRM
  return lang === "ar" ? e.ar : (e[lang] || e.az) + "\u200E";
}
export const EDITION = ED;
