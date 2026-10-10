// İnterfeys mətnləri (az/en/ar/tr/ru). Kitab mətni heç vaxt tərcümə olunmur.
const STR = {
  az: {
    library: "Kitabxana", site: "nibrascode.com", hero1: "Kitabları", hero2: "rahat oxu",
    heroSub: "{books} kitab, {pages} səhifə. Ərəbcə mətn, olduğu kimi.",
    searchAll: "Bütün kitablarda axtar (ərəbcə)", search: "Axtar", filter: "Kitab adı ilə süz",
    resume: "Davam et", resumeTitle: "Qaldığın yer", pagesN: "{n} səhifə", hadithN: "{n} hədis", volsN: "{n} cild", booksN: "{n} kitab",
    stage: ["1-ci mərhələ", "2-ci mərhələ", "3-cü mərhələ", "4-cü mərhələ"],
    showAll: "Hamısını göstər ({n})", showLess: "Az göstər", toc: "Mündəricat", volumes: "Cildlər", searchBook: "Kitabda axtar",
    searchHint: "Ərəbcə söz və ya ifadə yaz", resultsN: "{n} nəticə", noResults: "Heç nə tapılmadı", more: "Daha çox",
    page: "Səhifə", go: "Keç", prev: "Əvvəlki", next: "Növbəti", loading: "Yüklənir…", error: "Yüklənmədi. Yenidən yoxla.",
    fontUp: "Şrifti böyüt", fontDown: "Şrifti kiçilt", death: "ö. {y} h.", startReading: "Oxumağa başla", close: "Bağla",
    tocFilter: "Başlıq axtar", results: "Axtarış nəticələri", noToc: "Bu kitabda başlıq yoxdur.", searchShort: "Ən azı 2 hərf yaz.",
    aiSub: "Kitablardan soruş: cavab kitabın öz mətnindən gəlir.", aiPh: "Sualını yaz…", send: "Göndər",
    aiErr: "İndi cavab alınmadı. Bir az sonra yenidən yoxla.", aiNote: "Kitabda tapılmayan suallara süni intellekt cavab verir, səhv ola bilər.",
    ex: ["İbn Teymiyyənin kitablarını məsləhət et", "musiqi haqqında fətva", "məfulun ləh nədir", "ana haqqı hədis"],
    footer: "Nibras Code layihəsi", lastRead: "səh. {p} / {n}", openBook: "Kitabı aç", newChat: "Yeni söhbət",
  },
  en: {
    library: "Library", site: "nibrascode.com", hero1: "Read the books", hero2: "with ease",
    heroSub: "{books} books, {pages} pages. The Arabic text as it is.",
    searchAll: "Search all books (Arabic)", search: "Search", filter: "Filter by title",
    resume: "Continue", resumeTitle: "Where you left off", pagesN: "{n} pages", hadithN: "{n} hadith", volsN: "{n} vols", booksN: "{n} books",
    stage: ["Stage 1", "Stage 2", "Stage 3", "Stage 4"],
    showAll: "Show all ({n})", showLess: "Show less", toc: "Contents", volumes: "Volumes", searchBook: "Search in book",
    searchHint: "Type an Arabic word or phrase", resultsN: "{n} results", noResults: "Nothing found", more: "More",
    page: "Page", go: "Go", prev: "Previous", next: "Next", loading: "Loading…", error: "Couldn't load. Try again.",
    fontUp: "Larger text", fontDown: "Smaller text", death: "d. {y} AH", startReading: "Start reading", close: "Close",
    tocFilter: "Find a heading", results: "Search results", noToc: "This book has no headings.", searchShort: "Type at least 2 letters.",
    aiSub: "Ask about the books: answers come from the book's own text.", aiPh: "Type your question…", send: "Send",
    aiErr: "No answer right now. Try again a bit later.", aiNote: "Questions not found in the books are answered by AI and may contain mistakes.",
    ex: ["Recommend Ibn Taymiyyah's books", "fatwa on music", "what is maf'ul li-ajlih", "hadith about mothers' rights"],
    footer: "A Nibras Code project", lastRead: "p. {p} / {n}", openBook: "Open book", newChat: "New chat",
  },
  ar: {
    library: "المكتبة", site: "nibrascode.com", hero1: "اقرأ الكتب", hero2: "براحة",
    heroSub: "{books} كتابًا، {pages} صفحة. النص العربي كما هو.",
    searchAll: "ابحث في كل الكتب", search: "بحث", filter: "تصفية بالعنوان",
    resume: "تابع القراءة", resumeTitle: "حيث توقفت", pagesN: "{n} صفحة", hadithN: "{n} حديث", volsN: "{n} مجلدات", booksN: "{n} كتب",
    stage: ["المرحلة الأولى", "المرحلة الثانية", "المرحلة الثالثة", "المرحلة الرابعة"],
    showAll: "عرض الكل ({n})", showLess: "عرض أقل", toc: "الفهرس", volumes: "المجلدات", searchBook: "ابحث في الكتاب",
    searchHint: "اكتب كلمة أو عبارة", resultsN: "{n} نتيجة", noResults: "لا توجد نتائج", more: "المزيد",
    page: "صفحة", go: "انتقل", prev: "السابق", next: "التالي", loading: "جارٍ التحميل…", error: "تعذر التحميل. حاول مجددًا.",
    fontUp: "تكبير الخط", fontDown: "تصغير الخط", death: "ت {y} هـ", startReading: "ابدأ القراءة", close: "إغلاق",
    tocFilter: "ابحث عن عنوان", results: "نتائج البحث", noToc: "لا عناوين في هذا الكتاب.", searchShort: "اكتب حرفين على الأقل.",
    aiSub: "اسأل عن الكتب: الجواب من نص الكتاب نفسه.", aiPh: "اكتب سؤالك…", send: "إرسال",
    aiErr: "تعذر الجواب الآن. حاول بعد قليل.", aiNote: "ما لا يوجد في الكتب يجيب عنه الذكاء الاصطناعي، وقد يخطئ.",
    ex: ["كتب تنصح بها لابن تيمية", "مجموع الفتاوى الصبر", "ما هو المفعول لأجله", "حديث بر الوالدين"],
    footer: "من مشاريع Nibras Code", lastRead: "ص {p} / {n}", openBook: "افتح الكتاب", newChat: "محادثة جديدة",
  },
  tr: {
    library: "Kütüphane", site: "nibrascode.com", hero1: "Kitapları", hero2: "rahatça oku",
    heroSub: "{books} kitap, {pages} sayfa. Arapça metin, olduğu gibi.",
    searchAll: "Tüm kitaplarda ara (Arapça)", search: "Ara", filter: "Kitap adına göre süz",
    resume: "Devam et", resumeTitle: "Kaldığın yer", pagesN: "{n} sayfa", hadithN: "{n} hadis", volsN: "{n} cilt", booksN: "{n} kitap",
    stage: ["1. aşama", "2. aşama", "3. aşama", "4. aşama"],
    showAll: "Tümünü göster ({n})", showLess: "Daha az göster", toc: "İçindekiler", volumes: "Ciltler", searchBook: "Kitapta ara",
    searchHint: "Arapça bir kelime veya ifade yaz", resultsN: "{n} sonuç", noResults: "Sonuç bulunamadı", more: "Daha fazla",
    page: "Sayfa", go: "Git", prev: "Önceki", next: "Sonraki", loading: "Yükleniyor…", error: "Yüklenemedi. Tekrar dene.",
    fontUp: "Yazıyı büyüt", fontDown: "Yazıyı küçült", death: "ö. {y} h.", startReading: "Okumaya başla", close: "Kapat",
    tocFilter: "Başlık ara", results: "Arama sonuçları", noToc: "Bu kitapta başlık yok.", searchShort: "En az 2 harf yaz.",
    aiSub: "Kitaplara sor: cevap kitabın kendi metninden gelir.", aiPh: "Sorunu yaz…", send: "Gönder",
    aiErr: "Şu an cevap alınamadı. Biraz sonra tekrar dene.", aiNote: "Kitaplarda bulunmayan sorulara yapay zekâ cevap verir, hata olabilir.",
    ex: ["İbn Teymiyye'nin kitaplarını öner", "müzik hakkında fetva", "mef'ûlün leh nedir", "anne hakkı hadis"],
    footer: "Bir Nibras Code projesi", lastRead: "s. {p} / {n}", openBook: "Kitabı aç", newChat: "Yeni sohbet",
  },
  ru: {
    library: "Библиотека", site: "nibrascode.com", hero1: "Читайте книги", hero2: "удобно",
    heroSub: "{books} книг, {pages} страниц. Арабский текст без изменений.",
    searchAll: "Поиск по всем книгам (на арабском)", search: "Найти", filter: "Фильтр по названию",
    resume: "Продолжить", resumeTitle: "Где вы остановились", pagesN: "{n} стр.", hadithN: "{n} хадисов", volsN: "{n} т.", booksN: "{n} книг",
    stage: ["Этап 1", "Этап 2", "Этап 3", "Этап 4"],
    showAll: "Показать все ({n})", showLess: "Свернуть", toc: "Оглавление", volumes: "Тома", searchBook: "Поиск в книге",
    searchHint: "Введите арабское слово или фразу", resultsN: "Результатов: {n}", noResults: "Ничего не найдено", more: "Ещё",
    page: "Страница", go: "Перейти", prev: "Назад", next: "Далее", loading: "Загрузка…", error: "Не загрузилось. Попробуйте ещё раз.",
    fontUp: "Крупнее", fontDown: "Мельче", death: "ум. {y} г. х.", startReading: "Начать чтение", close: "Закрыть",
    tocFilter: "Найти заголовок", results: "Результаты поиска", noToc: "В этой книге нет заголовков.", searchShort: "Введите хотя бы 2 буквы.",
    aiSub: "Спросите о книгах: ответ берётся из самого текста книги.", aiPh: "Напишите вопрос…", send: "Отправить",
    aiErr: "Сейчас ответа нет. Попробуйте чуть позже.", aiNote: "На вопросы вне книг отвечает ИИ, возможны ошибки.",
    ex: ["Посоветуй книги Ибн Таймийи", "фетва о музыке", "что такое мафуль ли-аджлих", "хадис о правах матери"],
    footer: "Проект Nibras Code", lastRead: "стр. {p} / {n}", openBook: "Открыть книгу", newChat: "Новый чат",
  },
};
export const LANGS = [["az", "AZ"], ["en", "EN"], ["ar", "AR"], ["tr", "TR"], ["ru", "RU"]];
export function getLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && STR[q]) {
    localStorage.setItem("nl:lang", q);
    return q;
  }
  const s = localStorage.getItem("nl:lang");
  return s && STR[s] ? s : "az";
}
export const lang = getLang();
export function t(key, vars = {}) {
  const v = (STR[lang] && STR[lang][key]) ?? STR.az[key] ?? key;
  if (typeof v !== "string") return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
}
export const pick = (obj) => (obj ? obj[lang] || obj.az || obj.en || "" : "");
