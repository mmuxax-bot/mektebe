// İnterfeys mətnləri. Kitab mətni heç vaxt tərcümə olunmur. Dil kitabxana saytı ilə ortaqdır (localStorage «nl:lang»), standart: ərəbcə.
const S = {
  ar: {
   privacy: "سياسة الخصوصية", aiNote: "استُعين بالذكاء الاصطناعي في إعداد هذا التطبيق، فقد تقع بعض الأخطاء. نرجو إبلاغنا بأي خطأ تلاحظونه.", contact: "تواصل معنا", contactTxt: "للملاحظات والإبلاغ عن الأخطاء:", chooseLang: "اختر اللغة", privShort: "لا نجمع أي بيانات شخصية؛ الإعدادات تُحفظ على جهازك فقط.",
    settings: "الإعدادات", language: "اللغة", fontSize: "حجم خط القراءة", theme: "المظهر", thDark: "داكن", thLight: "فاتح", thSepia: "ورقي", arFont: "الخط العربي", fAmiri: "أميري", fNaskh: "نسخ (خط الجهاز)", tashkil: "التشكيل", tkShow: "إظهار", tkHide: "إخفاء", contRead: "متابعة القراءة", noLast: "لم تبدأ القراءة بعد.", links: "روابط", about: "عن الكتاب", aboutAuthor: "المؤلف: شيخ الإسلام أحمد بن عبد الحليم ابن تيمية (ت ٧٢٨ هـ).", aboutComp: "الجمع والترتيب: عبد الرحمن بن محمد بن قاسم (ت ١٣٩٢ هـ)، وساعده ابنه محمد.", aboutEd: "ترقيم المجلدات والصفحات: طبعة مجمع الملك فهد لطباعة المصحف الشريف، المدينة النبوية.", close: "إغلاق", preview: "قَالَ شَيْخُ الْإِسْلَامِ رَحِمَهُ اللَّهُ: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.", searchIn: "ابحث في", 
    title: "مجموع الفتاوى", by: "لشيخ الإسلام أحمد بن عبد الحليم ابن تيمية (ت ٧٢٨ هـ)",
    compiled: "جمع وترتيب: عبد الرحمن بن محمد بن قاسم (ت ١٣٩٢ هـ)، وساعده ابنه محمد",
    edition: "ترقيم طبعة مجمع الملك فهد لطباعة المصحف الشريف، المدينة النبوية",
    library: "المكتبة", it: "ابن تيمية", volsN: "{n} مجلدًا", pagesN: "{n} صفحة", headsN: "{n} عنوانًا",
    start: "ابدأ القراءة", resume: "تابع: {r}", search: "بحث", searchPh: "ابحث في مجموع الفتاوى: كلمة أو عبارة",
    searchTitle: "البحث في الفتاوى", jumpTitle: "انتقل إلى مجلد وصفحة", vol: "المجلد", page: "الصفحة", go: "انتقل",
    volumes: "المجلدات", allVols: "كل المجلدات", openVol: "فهرس المجلد", readVol: "ابدأ قراءة المجلد",
    prevVol: "المجلد السابق", nextVol: "المجلد التالي", tocFilter: "ابحث في عناوين هذا المجلد",
    kAll: "الكل", kq: "المسائل", kf: "الفصول", kb: "القواعد والأبواب", kt: "عناوين أخرى",
    loading: "جارٍ التحميل…", loadingIdx: "جارٍ تجهيز فهرس البحث… (مرة واحدة)", error: "تعذر التحميل. حاول مجددًا.",
    resultsN: "{n} نتيجة", noResults: "لا توجد نتائج. جرّب كلمة عربية أخرى.", more: "المزيد", inVol: "في المجلد",
    exactN: "منها {n} بالعبارة نفسها", short: "اكتب حرفين عربيين على الأقل.", arOnly: "البحث بالنص العربي.",
    toc: "الفهرس", prev: "السابق", next: "التالي", fontUp: "تكبير الخط", fontDown: "تصغير الخط",
    noPage: "لا توجد هذه الصفحة في هذا المجلد.", appendix: "ملحق", groups: "التوحيد والاعتقاد|الإيمان والقدر والمنطق|السلوك والتصوف|القرآن والتفسير|الحديث وأصول الفقه|الفقه",
    indexVols: "المجلدان ٣٦ و٣٧: الفهارس العامة للكتاب في المطبوع، ويغني عنها هنا فهرس كل مجلد والبحث في النص.",
    ex: "أمثلة:", textNote: "النص كما هو في المطبوع، دون اختصار أو تعديل.", back: "رجوع", home: "مجموع الفتاوى",
  },
  az: {
   privacy: "Məxfilik siyasəti", aiNote: "Tətbiqin hazırlanmasında süni intellektdən kömək alınıb, xətalar ola bilər. Gördüyünüz səhvi bizə bildirməyinizi xahiş edirik.", contact: "Əlaqə", contactTxt: "Qeydlər və xətaları bildirmək üçün:", chooseLang: "Dili seçin", privShort: "Heç bir şəxsi məlumat toplamırıq; ayarlar yalnız cihazınızda saxlanılır.",
    settings: "Ayarlar", language: "Dil", fontSize: "Oxu şriftinin ölçüsü", theme: "Görünüş", thDark: "Tünd", thLight: "Açıq", thSepia: "Kağız", arFont: "Ərəb şrifti", fAmiri: "Amiri", fNaskh: "Nəsx (cihazın şrifti)", tashkil: "Hərəkələr (təşkil)", tkShow: "Göstər", tkHide: "Gizlət", contRead: "Oxumağa davam et", noLast: "Hələ oxumağa başlamamısan.", links: "Keçidlər", about: "Kitab haqqında", aboutAuthor: "Müəllif: Şeyxul-İslam Əhməd ibn Əbdülhəlim İbn Teymiyyə (ö. 728 h.).", aboutComp: "Toplayan və tərtib edən: Əbdürrəhman ibn Muhəmməd ibn Qasim (ö. 1392 h.), oğlu Muhəmmədin köməyi ilə.", aboutEd: "Cild və səhifə nömrələri: Kral Fəhd Mushaf Çapı Kompleksi nəşri, Mədinə.", close: "Bağla", preview: "قَالَ شَيْخُ الْإِسْلَامِ رَحِمَهُ اللَّهُ: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.", searchIn: "Axtarış yeri", 
    title: "Məcmuul-Fətava", by: "Şeyxul-İslam Əhməd ibn Əbdülhəlim İbn Teymiyyə (ö. 728 h.)",
    compiled: "Toplayan və tərtib edən: Əbdürrəhman ibn Muhəmməd ibn Qasim (ö. 1392 h.), oğlu Muhəmmədin köməyi ilə",
    edition: "Səhifə nömrələri: Kral Fəhd Mushaf Çapı Kompleksi nəşri, Mədinə",
    library: "Kitabxana", it: "İbn Teymiyyə", volsN: "{n} cild", pagesN: "{n} səhifə", headsN: "{n} başlıq",
    start: "Oxumağa başla", resume: "Davam et: {r}", search: "Axtar", searchPh: "Məcmuul-Fətavada ərəbcə söz və ya ifadə axtar",
    searchTitle: "Fətvalarda axtarış", jumpTitle: "Cild və səhifəyə keç", vol: "Cild", page: "Səhifə", go: "Keç",
    volumes: "Cildlər", allVols: "Bütün cildlər", openVol: "Cildin mündəricatı", readVol: "Cildi oxumağa başla",
    prevVol: "Əvvəlki cild", nextVol: "Növbəti cild", tocFilter: "Bu cildin başlıqlarında axtar",
    kAll: "Hamısı", kq: "Suallar", kf: "Fəsillər", kb: "Qaidələr və bablar", kt: "Digər başlıqlar",
    loading: "Yüklənir…", loadingIdx: "Axtarış indeksi hazırlanır… (bir dəfə)", error: "Yüklənmədi. Yenidən yoxla.",
    resultsN: "{n} nəticə", noResults: "Heç nə tapılmadı. Başqa ərəbcə söz yoxla.", more: "Daha çox", inVol: "Cild",
    exactN: "{n}-i eyni ifadə ilə", short: "Ən azı 2 ərəb hərfi yaz.", arOnly: "Axtarış ərəbcə mətnlədir.",
    toc: "Mündəricat", prev: "Əvvəlki", next: "Növbəti", fontUp: "Şrifti böyüt", fontDown: "Şrifti kiçilt",
    noPage: "Bu cilddə belə səhifə yoxdur.", appendix: "əlavə", groups: "Tövhid və əqidə|İman, qədər və məntiq|Sülük və təsəvvüf|Quran və təfsir|Hədis və fiqh üsulu|Fiqh",
    indexVols: "36–37-ci cildlər çap nəşrində ümumi fihristlərdir; burada onları hər cildin mündəricatı və mətn axtarışı əvəz edir.",
    ex: "Nümunələr:", textNote: "Mətn çap nəşrindəki kimidir, qısaldılmayıb və dəyişdirilməyib.", back: "Geri", home: "Məcmuul-Fətava",
  },
  en: {
   privacy: "Privacy Policy", aiNote: "AI assistance was used in preparing this app, so some errors are possible. Please report any mistake you notice.", contact: "Contact", contactTxt: "Feedback and error reports:", chooseLang: "Choose language", privShort: "We collect no personal data; settings stay on your device.",
    settings: "Settings", language: "Language", fontSize: "Reading font size", theme: "Theme", thDark: "Dark", thLight: "Light", thSepia: "Sepia", arFont: "Arabic font", fAmiri: "Amiri", fNaskh: "Naskh (device font)", tashkil: "Diacritics (tashkil)", tkShow: "Show", tkHide: "Hide", contRead: "Continue reading", noLast: "You have not started reading yet.", links: "Links", about: "About the book", aboutAuthor: "Author: Shaykh al-Islam Ahmad ibn 'Abd al-Halim Ibn Taymiyyah (d. 728 AH).", aboutComp: "Compiled and arranged by 'Abd al-Rahman ibn Muhammad ibn Qasim (d. 1392 AH), assisted by his son Muhammad.", aboutEd: "Volume and page numbering: King Fahd Complex for the Printing of the Holy Quran edition, Madinah.", close: "Close", preview: "قَالَ شَيْخُ الْإِسْلَامِ رَحِمَهُ اللَّهُ: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.", searchIn: "Search in", 
    title: "Majmu' al-Fatawa", by: "Shaykh al-Islam Ahmad ibn 'Abd al-Halim Ibn Taymiyyah (d. 728 AH)",
    compiled: "Compiled and arranged by 'Abd al-Rahman ibn Muhammad ibn Qasim (d. 1392 AH), assisted by his son Muhammad",
    edition: "Page numbers of the King Fahd Complex edition, Madinah",
    library: "Library", it: "Ibn Taymiyyah", volsN: "{n} volumes", pagesN: "{n} pages", headsN: "{n} headings",
    start: "Start reading", resume: "Continue: {r}", search: "Search", searchPh: "Search Majmu' al-Fatawa: an Arabic word or phrase",
    searchTitle: "Search the Fatawa", jumpTitle: "Go to volume and page", vol: "Volume", page: "Page", go: "Go",
    volumes: "Volumes", allVols: "All volumes", openVol: "Volume contents", readVol: "Read this volume",
    prevVol: "Previous volume", nextVol: "Next volume", tocFilter: "Search this volume's headings",
    kAll: "All", kq: "Questions", kf: "Sections (fasl)", kb: "Rules & chapters", kt: "Other headings",
    loading: "Loading…", loadingIdx: "Preparing the search index… (once)", error: "Could not load. Try again.",
    resultsN: "{n} results", noResults: "No results. Try another Arabic word.", more: "More", inVol: "Volume",
    exactN: "{n} with the exact phrase", short: "Type at least 2 Arabic letters.", arOnly: "Search works on the Arabic text.",
    toc: "Contents", prev: "Previous", next: "Next", fontUp: "Larger text", fontDown: "Smaller text",
    noPage: "That page is not in this volume.", appendix: "appendix", groups: "Tawhid and creed|Faith, destiny and logic|Spiritual conduct and Sufism|Quran and tafsir|Hadith and usul al-fiqh|Fiqh",
    indexVols: "Volumes 36–37 of the print edition are general indexes; here each volume's contents and full-text search take their place.",
    ex: "Examples:", textNote: "The text is as printed, unabridged and unaltered.", back: "Back", home: "Majmu' al-Fatawa",
  },
  tr: {
   privacy: "Gizlilik Politikası", aiNote: "Bu uygulamanın hazırlanmasında yapay zekâdan yardım alınmıştır; bazı hatalar olabilir. Fark ettiğiniz hataları bize bildirmenizi rica ederiz.", contact: "İletişim", contactTxt: "Görüş ve hata bildirimi:", chooseLang: "Dil seçin", privShort: "Hiçbir kişisel veri toplamıyoruz; ayarlar yalnızca cihazınızda kalır.",
    settings: "Ayarlar", language: "Dil", fontSize: "Okuma yazı boyutu", theme: "Görünüm", thDark: "Koyu", thLight: "Açık", thSepia: "Kâğıt", arFont: "Arapça yazı tipi", fAmiri: "Amiri", fNaskh: "Nesih (cihaz yazı tipi)", tashkil: "Harekeler", tkShow: "Göster", tkHide: "Gizle", contRead: "Okumaya devam et", noLast: "Henüz okumaya başlamadınız.", links: "Bağlantılar", about: "Kitap hakkında", aboutAuthor: "Müellif: Şeyhülislam Ahmed b. Abdülhalîm İbn Teymiyye (ö. 728 h.).", aboutComp: "Derleyen: Abdurrahman b. Muhammed b. Kâsım (ö. 1392 h.), oğlu Muhammed'in yardımıyla.", aboutEd: "Cilt ve sayfa numaraları: Kral Fahd Mushaf Matbaası baskısı, Medine.", close: "Kapat", preview: "قَالَ شَيْخُ الْإِسْلَامِ رَحِمَهُ اللَّهُ: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.", searchIn: "Arama yeri", 
    title: "Mecmûu'l-Fetâvâ", by: "Şeyhülislam Ahmed b. Abdülhalîm İbn Teymiyye (ö. 728 h.)",
    compiled: "Derleyen: Abdurrahman b. Muhammed b. Kâsım (ö. 1392 h.), oğlu Muhammed'in yardımıyla",
    edition: "Sayfa numaraları: Kral Fahd Mushaf Matbaası baskısı, Medine",
    library: "Kütüphane", it: "İbn Teymiyye", volsN: "{n} cilt", pagesN: "{n} sayfa", headsN: "{n} başlık",
    start: "Okumaya başla", resume: "Devam et: {r}", search: "Ara", searchPh: "Mecmûu'l-Fetâvâ'da Arapça kelime veya ifade ara",
    searchTitle: "Fetvalarda arama", jumpTitle: "Cilt ve sayfaya git", vol: "Cilt", page: "Sayfa", go: "Git",
    volumes: "Ciltler", allVols: "Tüm ciltler", openVol: "Cilt fihristi", readVol: "Cildi okumaya başla",
    prevVol: "Önceki cilt", nextVol: "Sonraki cilt", tocFilter: "Bu cildin başlıklarında ara",
    kAll: "Tümü", kq: "Sorular", kf: "Fasıllar", kb: "Kaideler ve bablar", kt: "Diğer başlıklar",
    loading: "Yükleniyor…", loadingIdx: "Arama dizini hazırlanıyor… (bir kez)", error: "Yüklenemedi. Tekrar deneyin.",
    resultsN: "{n} sonuç", noResults: "Sonuç yok. Başka bir Arapça kelime deneyin.", more: "Daha fazla", inVol: "Cilt",
    exactN: "{n} tanesi aynı ifadeyle", short: "En az 2 Arapça harf yazın.", arOnly: "Arama Arapça metinde yapılır.",
    toc: "Fihrist", prev: "Önceki", next: "Sonraki", fontUp: "Yazıyı büyüt", fontDown: "Yazıyı küçült",
    noPage: "Bu ciltte böyle bir sayfa yok.", appendix: "ek", groups: "Tevhid ve akide|İman, kader ve mantık|Sülûk ve tasavvuf|Kur'an ve tefsir|Hadis ve fıkıh usulü|Fıkıh",
    indexVols: "Matbu nüshada 36–37. ciltler genel fihristlerdir; burada her cildin fihristi ve metin araması onların yerini tutar.",
    ex: "Örnekler:", textNote: "Metin matbu nüshadaki gibidir; kısaltılmamış ve değiştirilmemiştir.", back: "Geri", home: "Mecmûu'l-Fetâvâ",
  },
  ru: {
   privacy: "Политика конфиденциальности", aiNote: "При подготовке приложения использовалась помощь искусственного интеллекта, поэтому возможны ошибки. Пожалуйста, сообщайте нам о замеченных ошибках.", contact: "Связь", contactTxt: "Отзывы и сообщения об ошибках:", chooseLang: "Выберите язык", privShort: "Мы не собираем персональных данных; настройки хранятся только на устройстве.",
    settings: "Настройки", language: "Язык", fontSize: "Размер шрифта", theme: "Тема", thDark: "Тёмная", thLight: "Светлая", thSepia: "Сепия", arFont: "Арабский шрифт", fAmiri: "Amiri", fNaskh: "Насх (шрифт устройства)", tashkil: "Огласовки (ташкиль)", tkShow: "Показать", tkHide: "Скрыть", contRead: "Продолжить чтение", noLast: "Вы ещё не начали чтение.", links: "Ссылки", about: "О книге", aboutAuthor: "Автор: шейх-уль-ислам Ахмад ибн Абд аль-Халим Ибн Таймийя (ум. 728 г. х.).", aboutComp: "Собрал и упорядочил Абд ар-Рахман ибн Мухаммад ибн Касим (ум. 1392 г. х.) с помощью сына Мухаммада.", aboutEd: "Нумерация томов и страниц: издание Комплекса короля Фахда, Медина.", close: "Закрыть", preview: "قَالَ شَيْخُ الْإِسْلَامِ رَحِمَهُ اللَّهُ: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.", searchIn: "Где искать", 
    title: "Маджму аль-фатава", by: "Шейх-уль-ислам Ахмад ибн Абд аль-Халим Ибн Таймийя (ум. 728 г. х.)",
    compiled: "Собрал и упорядочил Абд ар-Рахман ибн Мухаммад ибн Касим (ум. 1392 г. х.) с помощью сына Мухаммада",
    edition: "Нумерация страниц издания Комплекса короля Фахда, Медина",
    library: "Библиотека", it: "Ибн Таймийя", volsN: "{n} томов", pagesN: "{n} стр.", headsN: "{n} заголовков",
    start: "Начать чтение", resume: "Продолжить: {r}", search: "Поиск", searchPh: "Поиск в «Маджму аль-фатава»: арабское слово или фраза",
    searchTitle: "Поиск по фетвам", jumpTitle: "Перейти к тому и странице", vol: "Том", page: "Стр.", go: "Перейти",
    volumes: "Тома", allVols: "Все тома", openVol: "Оглавление тома", readVol: "Читать том",
    prevVol: "Предыдущий том", nextVol: "Следующий том", tocFilter: "Поиск по заголовкам тома",
    kAll: "Все", kq: "Вопросы", kf: "Разделы (фасль)", kb: "Правила и главы", kt: "Прочие заголовки",
    loading: "Загрузка…", loadingIdx: "Подготовка поискового индекса… (один раз)", error: "Не удалось загрузить. Попробуйте снова.",
    resultsN: "{n} результатов", noResults: "Ничего не найдено. Попробуйте другое арабское слово.", more: "Ещё", inVol: "Том",
    exactN: "из них {n} с точной фразой", short: "Введите хотя бы 2 арабские буквы.", arOnly: "Поиск по арабскому тексту.",
    toc: "Оглавление", prev: "Назад", next: "Далее", fontUp: "Крупнее", fontDown: "Мельче",
    noPage: "Такой страницы в этом томе нет.", appendix: "приложение", groups: "Таухид и вероучение|Вера, предопределение и логика|Духовное поведение и суфизм|Коран и тафсир|Хадис и усуль аль-фикх|Фикх",
    indexVols: "Тома 36–37 печатного издания — общие указатели; здесь их заменяют оглавления томов и полнотекстовый поиск.",
    ex: "Примеры:", textNote: "Текст как в печатном издании, без сокращений и изменений.", back: "Назад", home: "Маджму аль-фатава",
  },
};
export const LANGS = [["az", "AZ"], ["en", "EN"], ["ar", "AR"], ["tr", "TR"], ["ru", "RU"]];
function getLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && S[q]) {
    try { localStorage.setItem("nl:lang", q); } catch {}
    return q;
  }
  let s = null;
  try { s = localStorage.getItem("nl:lang"); } catch {}
  return s && S[s] ? s : "ar";
}
export const lang = getLang();
export function t(k, vars = {}) {
  const v = (S[lang] && S[lang][k]) ?? S.ar[k] ?? k;
  return String(v).replace(/\{(\w+)\}/g, (_, x) => (vars[x] != null ? vars[x] : ""));
}
// rəqəmlər: ərəbcə interfeysdə ərəb-hind rəqəmləri
export const fmt = (n) => (lang === "ar" ? Number(n).toLocaleString("ar-EG") : Number(n).toLocaleString("en-US"));
export const arNum = (n) => String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[c]);
