// Axtarış əhatəsi test dəstləri (az əsas; tr, en, ru, ar). node scripts/coverage/run.mjs
// Hər bölmə: təbii suallar (hal şəkilçiləri, «haqqında / barəsində / nədir / necə / hökmü / hədis / fətva», səhv yazılış, ə→e, ı→i, ş→s ...)
const lat = (s) => s.replace(/ə/g, "e").replace(/Ə/g, "E").replace(/ı/g, "i").replace(/ş/g, "s").replace(/Ş/g, "S").replace(/ç/g, "c").replace(/Ç/g, "C").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u").replace(/İ/g, "I");

// ---------------------------------------------------------------- Məcmuul-fətava (təbii hökm sualı)
export const FATAWA = [
  "musiqi hökmü", "musiqinin hökmü nədir", "mahnı oxumaq haramdır?", "siqaret çəkmək caizdirmi", "siqaretin hökmü", "faiz haramdır?", "faizin hökmü nədir", "bankdan kredit götürmək caizdirmi",
  "sığorta hökmü", "şəkil çəkmək haramdır?", "şəkil çəkdirməyin hökmü", "tatu vurdurmaq caizdirmi", "mövlud bayramı haqqında fətva", "mövlud keçirmək bidətdir?", "qəbir ziyarəti hökmü", "qəbirləri ziyarət etmək caizdirmi",
  "təvəssül hökmü", "sehr etmənin hökmü", "cindən qorunmaq haqqında fətva", "nəzir hökmü", "nəzir etmək caizdirmi", "and içməyin hökmü", "boşanma hökmü", "talaq haqqında fətva", "üç talaq bir məclisdə hökmü",
  "nikah hökmü", "mehr haqqında fətva", "hicab hökmü", "kişilər üçün ipək geyinmək haramdır?", "kişilərə qızıl taxmaq caizdirmi", "it saxlamaq haramdır?", "namaz qılmayanın hökmü", "namazı tərk edənin hökmü",
  "cəmaat namazının hökmü", "cümə namazı haqqında fətva", "qəzaya qalan namaz hökmü", "orucu pozan şeylər haqqında fətva", "oruc tutmayanın hökmü", "zəkat vermək vacibdir?", "qızıla zəkat düşürmü",
  "həcc haqqında fətva", "qurban kəsmək vacibdir?", "qurbanın hökmü", "dəstəmaz hökmü", "dəstəmazı pozan şeylər", "qüsl haqqında fətva", "təyəmmüm hökmü", "ay başı olan qadının namazı hökmü",
  "saqqal qırxmaq haramdır?", "saqqalın hökmü", "bığ haqqında fətva", "qadının qaşını aldırması caizdirmi", "parik taxmaq hökmü", "ərəb dilini öyrənmək vacibdir?", "riya haqqında fətva", "həsəd hökmü",
  "qeybət haramdır?", "yalan danışmaq haqqında fətva", "valideynə itaət vacibdir?", "kafirə salam vermək caizdirmi", "bayramlarını təbrik etmək hökmü", "rüşvət haramdır?", "oğurluğun cəzası",
  "zina haqqında fətva", "spirtli içkinin hökmü", "şərab içməyin hökmü", "narkotik haramdır?", "intihar hökmü", "abort hökmü", "övladları döymək caizdirmi", "çoxarvadlılıq haqqında fətva", "ikinci arvad almaq caizdirmi",
  // latın yazılış (ə->e ...)
  lat("musiqi hökmü"), lat("siqaret çəkmək caizdirmi"), lat("faiz haramdır?"), lat("qəbir ziyarəti hökmü"), lat("saqqal qırxmaq haramdır?"), lat("şəkil çəkmək haramdır?"), lat("namazı tərk edənin hökmü"), lat("boşanma hökmü"),
  // səhv yazılış
  "musiki hokmu", "sigaret haramdirmi", "faizin hokmu nedir", "sekil cekmek haramdir", "qebir ziyareti hokmu",
  // tr
  "müzik haram mı", "sigara içmek caiz mi", "faiz haram mıdır", "kabir ziyareti hükmü", "tesettür hakkında fetva", "sakal tıraşı haram mı", "fotoğraf çekmek caiz mi", "boşanmanın hükmü", "mevlid kutlamak bid'at mı", "kurban kesmek vacip mi",
  // en
  "is music haram", "ruling on smoking", "is interest haram", "ruling on visiting graves", "is shaving the beard haram", "ruling on photography", "ruling on divorce", "is celebrating mawlid allowed", "ruling on tattoos", "is it haram to cheat in exams",
  // ru
  "музыка харам?", "хукм курения", "проценты в исламе харам", "посещение могил хукм", "можно ли брить бороду", "фотографирование харам?", "развод в исламе хукм", "празднование мавлида",
  // ar
  "ما حكم الغناء", "حكم التدخين", "حكم الربا", "حكم زيارة القبور", "حكم حلق اللحية", "حكم التصوير", "حكم الطلاق الثلاث", "حكم الاحتفال بالمولد", "حكم التوسل", "حكم ترك الصلاة",
];

// ---------------------------------------------------------------- Kütübü-sittə (mövzu üzrə hədis)
export const HADITH = [
  "niyyət haqqında hədis", "səbr haqqında hədislər", "namaz haqqında hədis", "orucun fəziləti haqqında hədis", "zəkat haqqında hədis", "həcc haqqında hədislər", "iman haqqında hədis", "ixlas haqqında hədis",
  "doğruluq haqqında hədis", "yalan barəsində hədis", "təvəkkül haqqında hədis", "tövbə haqqında hədislər", "valideynə yaxşılıq haqqında hədis", "ananın haqqı haqqında hədis", "qonşu haqqında hədis", "yetim haqqında hədis",
  "elm öyrənmək haqqında hədis", "Quran oxumaq haqqında hədis", "zikr haqqında hədislər", "dua haqqında hədis", "duanın fəziləti barəsində hədis", "salavat haqqında hədis", "salam vermək haqqında hədis", "təbəssüm haqqında hədis",
  "şükr haqqında hədis", "həya haqqında hədis", "qəzəb haqqında hədis", "paxıllıq haqqında hədis", "həsəd barəsində hədis", "qeybət haqqında hədis", "dilin qorunması haqqında hədis", "gözəl əxlaq haqqında hədis",
  "cənnət haqqında hədis", "cəhənnəm haqqında hədislər", "qiyamət əlamətləri haqqında hədis", "qəbir əzabı haqqında hədis", "dəccal haqqında hədis", "ölüm haqqında hədis", "şəhid haqqında hədis", "cihad haqqında hədis",
  "ticarət haqqında hədis", "borc haqqında hədis", "faiz haqqında hədis", "rüşvət haqqında hədis", "nikah haqqında hədis", "evlilik haqqında hədislər", "qadınlar haqqında hədis", "uşaqlar haqqında hədis",
  "xəstəlik haqqında hədis", "xəstəni ziyarət haqqında hədis", "cənazə haqqında hədis", "məscid haqqında hədis", "cümə günü haqqında hədis", "gecə namazı haqqında hədis", "cəmaat namazı haqqında hədis", "sünnə haqqında hədis",
  "bidət haqqında hədis", "şirk haqqında hədislər", "tövhid haqqında hədis", "yuxu haqqında hədis", "misvak haqqında hədis", "saqqal haqqında hədis", "ipək haqqında hədis", "qızıl haqqında hədis",
  lat("səbr haqqında hədislər"), lat("qonşu haqqında hədis"), lat("valideynə yaxşılıq haqqında hədis"), lat("qəzəb haqqında hədis"), lat("şükr haqqında hədis"),
  "sebir haqqinda hedis", "niyet hedisi", "tovbe hedisleri",
  // tr
  "sabır hakkında hadis", "niyet hadisi", "komşu hakkı hadis", "ilim öğrenmek hadis", "anne hakkı hadisleri", "öfke hakkında hadis", "dua hakkında hadis", "kabir azabı hadisleri", "cennet hadisleri", "yalan hakkında hadis",
  // en
  "hadith about patience", "hadith on intention", "hadith about neighbours", "hadith on seeking knowledge", "hadith about mothers", "hadith about anger", "hadith on supplication", "hadith about the grave", "hadith on paradise", "hadith about lying",
  // ru
  "хадис о терпении", "хадис о намерении", "хадисы о соседях", "хадис о знании", "хадис о матери", "хадис о гневе", "хадисы о мольбе", "хадис о рае",
  // ar
  "حديث عن الصبر", "أحاديث عن النية", "حديث عن الجار", "حديث في طلب العلم", "حديث عن بر الوالدين", "حديث عن الغضب", "حديث عن الدعاء", "حديث عن الجنة",
];

// ---------------------------------------------------------------- nəhv / sərf
export const NAHW = [
  "kanə və bacıları", "kanə və bacıları nədir", "innə və bacıları", "zannə və bacıları", "mübtəda və xəbər", "mübtəda nədir", "xəbər nəhvdə nədir", "fail nədir ərəb qrammatikası", "naibul-fail", "məful bih",
  "məful mutləq", "məful liəclih", "məful fih", "məful məah", "hal nədir nəhvdə", "təmyiz nədir", "nida nəhv", "münada", "mənsub isimlər", "mərfu isimlər", "məcrur isimlər", "cərr hərfləri", "hurufu cər",
  "nəsb hərfləri", "cəzm hərfləri", "atf hərfləri", "nəhvdə idafə", "muzaf və muzafun ileyh", "nət (sifət) nəhv", "bədəl nədir nəhvdə", "təkid nəhv", "əfalul-xəmsə", "əsmaul-xəmsə", "mənu min əs-sarf",
  "qeyri-münsərif isimlər", "müsənna", "cəm müzəkkər salim", "cəm müənnəs salim", "cəm təksir", "fel mudari", "fel madi", "əmr feli", "ismul-fail", "ismul-məful", "sifəti müşəbbəhə", "ismut-təfdil",
  "masdar nədir", "zərf nəhvdə", "şərt cümləsi", "lə nafiyə lil-cins", "ərəb dilində lən nə bildirir", "lam nədir nəhvdə", "irab nədir", "mebni və murab", "zəmirlər nəhv", "ismul-işarə", "ismul-mövsul",
  "ərəb qrammatikası kitabları", "nəhv nədir", "sərf nədir", "təsrif", "feli növləri sərf", lat("kanə və bacıları"), lat("mübtəda və xəbər"), lat("məful mutləq"), "kane ve bacilari", "mubteda ve xeber nedir", "mefulun bih",
  // tr
  "kâne ve kardeşleri", "inne ve kardeşleri", "mübteda haber nedir", "fail nedir arapça", "mef'ul bih nedir", "hal nedir arapça dilbilgisi", "temyiz nedir", "harf-i cer", "isim tamlaması arapça", "Arapça nahiv kitapları",
  // en
  "kana and her sisters", "inna and her sisters", "subject and predicate in arabic", "what is the faa'il in arabic grammar", "maf'ul bihi", "haal in arabic grammar", "tamyeez", "prepositions in arabic grammar", "idafa arabic", "diptotes arabic grammar",
  // ru
  "кана и её сёстры", "инна и её сёстры", "мубтада и хабар", "фаиль в арабской грамматике", "мафуль бихи", "хаал в арабском", "предлоги арабская грамматика", "идафа",
  // ar
  "كان وأخواتها", "إن وأخواتها", "المبتدأ والخبر", "الفاعل", "نائب الفاعل", "المفعول المطلق", "الحال", "التمييز", "حروف الجر", "الممنوع من الصرف",
];

// ---------------------------------------------------------------- İbn Teymiyyə kitabları
export const ITBOOKS = [
  "Əl-Ubudiyyə kitabı", "İbn Teymiyyənin Ubudiyyə kitabı", "Vasitiyyə əqidəsi", "Əqidətul-Vasitiyyə", "Vasitiyyə kitabı haqqında", "Həməviyyə", "Fətva Həməviyyə", "Təhmuriyyə", "Tədmuriyyə kitabı", "Furqan kitabı İbn Teymiyyə",
  "Siyasətüş-şəriyyə", "Hisbə kitabı", "Rəful-məlam", "İqtidaus-siratil-mustəqim", "İqtida kitabı", "Minhacus-sünnə", "Kitabul-iman İbn Teymiyyə", "Əl-İman kitabı", "Təvəssül və vəsilə kitabı", "Qaidə cəlilə",
  "Əl-Kəlim ət-Təyyib", "Kəlimut-təyyib", "Əmrad əl-qulub", "qəlb xəstəlikləri kitabı", "Tuhfə İraqiyyə", "Müqəddimə fi usulit-təfsir", "Vəsiyyə Suğra", "Əl-Vasitə bəynəl-həqq vəl-xalq", "Dərə tearuz", "Dəru tearudil-əql vən-nəql",
  "Sarimul-məslul", "Əs-Sarim əl-Məslul", "Cəvabus-səhih", "Əl-Cəvab əs-Səhih", "Nubuvvat kitabı", "Ən-Nübuvvat", "Rəddu ələl-məntiqiyyin", "İstiqamə kitabı", "Qavaidun-nuraniyyə", "İbn Teymiyyə kitabları",
  "İbn Teymiyyənin kitabları hansılardır", "İbn Teymiyyədən nə oxuyum", "İbn Teymiyyənin hansı kitabından başlayım", "ibn teymiyye kitablari", "ibn teymiyyenin vasitiyye kitabi", "vasitiye", "ubudiye kitabi", "hemeviyye", "tedmuriyye", "iqtidaus sirat",
  // tr
  "Akîdetü'l-Vâsıtıyye", "İbn Teymiyye'nin Ubudiyye kitabı", "Furkan kitabı", "Siyaset-i Şeriyye", "İktidâü's-Sırâtı'l-Müstakîm", "İbn Teymiyye kitapları", "Tedmuriyye risalesi",
  // en
  "al aqidah al wasitiyyah", "Ibn Taymiyyah al-Ubudiyyah", "al furqan ibn taymiyyah", "al siyasa al shariyya", "iqtida al sirat al mustaqim", "ibn taymiyyah books", "kitab al iman ibn taymiyyah", "minhaj al sunnah",
  // ru
  "Акыда Васытыйя", "Убудийя Ибн Таймийя", "книги Ибн Таймийи", "Аль-Фуркан Ибн Таймия",
  // ar
  "العقيدة الواسطية", "العبودية لابن تيمية", "الفتوى الحموية", "التدمرية", "اقتضاء الصراط المستقيم", "منهاج السنة النبوية", "كتاب الإيمان لابن تيمية", "الصارم المسلول", "درء تعارض العقل والنقل", "السياسة الشرعية",
];

// ---------------------------------------------------------------- tövhid (Tövhid 1 dərs xülasəsi)
export const TAWHID = [
  "Tövhid nədir", "tövhidin növləri", "tövhid neçə qismdir", "rübubiyyət tövhidi nədir", "üluhiyyət tövhidi nədir", "əsma və sifat tövhidi", "Allahın ad və sifətləri tövhidi", "şirk nədir", "şirkin növləri", "böyük şirk və kiçik şirk",
  "rübubiyyətdə şirk", "Allahın varlığının dəlilləri", "Allahın varlığına dəlil", "Allahın mövcudluğuna neçə dəlil var", "fitrət dəlili", "Allahın adları təvqifidir", "Allahın sifətləri haqqında", "sifətlərin təvili", "təfviz nədir", "təşbih və təmsil",
  "tovhid nedir", "tevhid nedir", "tovhidin novleri", "sirk nedir", "rububiyyet tovhidi", "uluhiyyet tovhidi nedir", "esma ve sifat", "tövhidin mənası", "tövhid sözünün mənası", "tövhid dərsləri",
  "Tövhid 1 mövzuları", "tövhid mövzular siyahısı", "Allahı inkar edənlərə cavab", "ateistlərə cavab", "kainatın yaradılması dəlil", "mərifət və isbat tövhidi", "talab və qasd tövhidi", "ibadət nədir", "ibadətin şərtləri", "Allahın əfalı",
  // tr
  "tevhid nedir", "tevhidin kısımları", "rububiyet tevhidi", "uluhiyet tevhidi", "şirk nedir", "Allah'ın varlığının delilleri", "isim ve sıfat tevhidi",
  // en
  "what is tawhid", "types of tawhid", "tawhid ar-rububiyyah", "tawhid al-uluhiyyah", "what is shirk", "proofs of the existence of Allah", "tawhid al-asma wa al-sifat",
  // ru
  "что такое таухид", "виды таухида", "что такое ширк", "доказательства существования Аллаха",
  // ar
  "ما هو التوحيد", "أقسام التوحيد", "توحيد الربوبية", "توحيد الألوهية", "توحيد الأسماء والصفات", "ما هو الشرك", "أدلة وجود الله", "أنواع الشرك",
];

// ---------------------------------------------------------------- Quran surə adları
export const QURAN = [
  "Fatihə surəsi", "Bəqərə surəsi", "Ali İmran surəsi", "Nisa surəsi", "Maidə surəsi", "Ənam surəsi", "Əraf surəsi", "Ənfal surəsi", "Tövbə surəsi", "Yunus surəsi", "Hud surəsi", "Yusif surəsi", "Rəd surəsi", "İbrahim surəsi",
  "Kəhf surəsi", "Məryəm surəsi", "Taha surəsi", "Ənbiya surəsi", "Həcc surəsi", "Muminun surəsi", "Nur surəsi", "Furqan surəsi", "Yasin surəsi", "Rəhman surəsi", "Vaqiə surəsi", "Mülk surəsi", "Qələm surəsi", "Cin surəsi",
  "Nəbə surəsi", "Əla surəsi", "Fəcr surəsi", "Şəms surəsi", "Leyl surəsi", "Duha surəsi", "İnşirah surəsi", "Tin surəsi", "Ələq surəsi", "Qədr surəsi", "Zilzal surəsi", "Asr surəsi", "Kövsər surəsi", "Kafirun surəsi", "Nəsr surəsi",
  "İxlas surəsi", "Fələq surəsi", "Nas surəsi", "Yasin surəsini oxu", "Mülk surəsini göstər", "Kəhf surəsinin ilk 10 ayəsi", "Rəhman surəsindən", "Bəqərənin son iki ayəsi", "Ayətül-Kürsi", "ayetel kursi",
  lat("Fatihə surəsi"), lat("Bəqərə surəsi"), lat("Rəhman surəsi"), lat("Kövsər surəsi"), "yasin suresi", "mulk suresi", "ixlas suresi", "fatiha suresi", "kehf suresi", "yasinn surəsi", "fatiha", "felek suresi",
  // çətin: hal şəkilçiləri, surə sözü olmadan, səhv yazılış, mövzular
  "Yasin surəsindən ayələr", "Mülk surəsinin tərcüməsi", "Kəhf surəsinin mənası", "Rəhmanın 13-cü ayəsi", "Bəqərənin 286-cı ayəsi", "Nisa 34", "Ali-İmran 190", "Əl-Fatihə", "Fatihənin mənası", "ixlası oxu",
  "Yasini oxu", "Kövsər surəsinin mənaca tərcüməsi", "Hucurat surəsi", "Hücurat 12", "Lokman surəsi", "Loğman surəsi", "Zümər surəsi", "Mücadilə surəsi", "Haşr surəsinin son ayələri", "Cümə surəsi",
  "Munafiqun surəsi", "Təğabün surəsi", "Talaq surəsi", "Təhrim surəsi", "Müzzəmmil surəsi", "Müddəssir surəsi", "Qiyamə surəsi", "İnsan surəsi", "Mürsəlat surəsi", "Naziat surəsi", "Əbəsə surəsi", "Təkvir surəsi",
  "İnfitar surəsi", "Mutaffifin surəsi", "İnşiqaq surəsi", "Buruc surəsi", "Tariq surəsi", "Ğaşiyə surəsi", "Bələd surəsi", "Adiyat surəsi", "Qariə surəsi", "Təkasür surəsi", "Huməzə surəsi", "Fil surəsi", "Qureyş surəsi",
  "Maun surəsi", "Məsəd surəsi", "Ləhəb surəsi", "Tebbet suresi", "kevser suresi", "yasin surasi", "surə Yasin", "Yasin", "Mülk", "ikhlas surasi", "hucurat suresi", "lokman suresi 13", "zumer suresi",
  "Quranda səbr haqqında ayələr", "Quranda valideyn haqqında ayə", "Quranda namaz haqqında ayələr", "Quranda tövbə haqqında ayə", "ayə səbr haqqında", "Kuran'da sabır ayetleri", "verses about patience in the Quran", "аяты о терпении", "آيات عن الصبر",
  // tr
  "Yasin suresi", "Mülk suresi", "Fatiha suresi", "Kehf suresi oku", "Rahman suresi", "İhlas suresi", "Bakara suresi 255", "Felak ve Nas sureleri",
  // en
  "surah yasin", "surah al mulk", "surah al fatiha", "surah al kahf", "surah ar rahman", "surah al ikhlas", "show surah al asr",
  // ru
  "сура Ясин", "сура аль-Мульк", "сура аль-Фатиха", "сура аль-Кахф", "сура Ар-Рахман", "сура аль-Ихлас",
  // ar
  "سورة يس", "سورة الملك", "سورة الفاتحة", "سورة الكهف", "سورة الرحمن", "سورة الإخلاص", "سورة العصر", "سورة الكوثر",
];

// ---------------------------------------------------------------- ərəb lüğəti (sözün mənası)
export const LUGHA = [
  "səbr sözünün mənası", "təqva nə deməkdir", "təqva sözünün mənası nədir", "iman sözünün mənası", "ixlas sözünün mənası", "tövbə sözünün mənası", "şükr nə deməkdir", "hikmət sözünün mənası", "rəhmət sözünün mənası",
  "qəlb sözünün mənası", "cənnət sözünün mənası", "nəfs sözünün mənası", "ruh sözünün mənası", "zikr nə deməkdir", "dua sözünün mənası", "fiqh sözünün mənası", "əqidə sözünün mənası", "sünnə sözünün mənası",
  "bidət sözünün mənası", "şirk sözünün mənası", "küfr sözünün mənası", "nifaq sözünün mənası", "zülm sözünün mənası", "ədl sözünün mənası", "əmanət sözünün mənası", "cihad sözünün mənası", "hicrət sözünün mənası",
  "vəhy sözünün mənası", "nəbi sözünün mənası", "rəsul sözünün mənası", "elm sözünün mənası", "yəqin sözünün mənası", "xuşu sözünün mənası", "ehsan sözünün mənası", "islam sözünün mənası", "zəkat sözünün mənası",
  "salat sözünün mənası", "siyam sözünün mənası", "həcc sözünün mənası", "kitab sözünün mənası lüğətdə", "qələm sözünün mənası", "nur sözünün mənası", "hidayət sözünün mənası", "dəlalət sözünün mənası", "fitnə sözünün mənası",
  "səbr kəlməsinin mənası", "təqva kəlməsi nə deməkdir", lat("səbr sözünün mənası"), lat("şükr nə deməkdir"), "sebr sozunun menasi", "taqva ne demekdir", "rehmet sozunun menasi", "hikmet ne demekdir",
  // tr
  "sabır kelimesinin anlamı", "takva ne demek", "ihlas kelimesinin anlamı", "tevbe kelimesinin anlamı", "şükür ne demek", "hikmet kelimesinin anlamı", "rahmet ne demektir",
  // en
  "what does sabr mean", "meaning of taqwa", "what is the meaning of ikhlas", "meaning of the word tawbah", "what does shukr mean", "meaning of hikmah", "meaning of the word rahmah",
  // ru
  "что значит слово сабр", "значение слова таква", "что означает ихлас", "что значит тауба",
  // ar
  "ما معنى الصبر", "معنى كلمة التقوى", "ما معنى الإخلاص", "معنى التوبة لغة", "ما معنى الشكر", "معنى كلمة الحكمة", "معنى الرحمة في اللغة", "ما معنى كلمة القلب",
];

// ---------------------------------------------------------------- /api/search təbii sorğu
export const SEARCH = [
  "namaz", "namazın fəziləti", "orucun hökmləri", "zəkatın növləri", "səbr", "səbrin fəziləti", "tövbə", "tövbənin şərtləri", "niyyət", "ixlas", "riya", "həsəd", "qeybət", "qəzəb", "paxıllıq", "təvəkkül", "şükür",
  "valideynlər", "valideynə yaxşılıq", "qonşu haqqı", "yetim", "nikah", "boşanma", "mirası bölmək", "ticarət", "faiz", "borc", "rüşvət", "qəbir əzabı", "qiyamət günü", "cənnət", "cəhənnəm", "şəfaət", "mələklər", "cinlər",
  "peyğəmbərlər", "Musa peyğəmbər", "İsa peyğəmbər", "İbrahim peyğəmbər", "Nuh peyğəmbər", "səhabələr", "Əbu Bəkr", "Ömər", "Osman", "Əli", "Aişə", "Əbu Hureyrə", "Allahın sifətləri", "Allahın adları",
  "qədər", "iman", "küfr", "nifaq", "şirk", "bidət", "sünnə", "cihad", "dua", "zikr", "Quran oxumaq", "elm öyrənmək", "əxlaq", "həya", "doğruluq", "yalan", lat("səbrin fəziləti"), lat("qəbir əzabı"), lat("valideynə yaxşılıq"),
  "sebr", "tovbe", "namazin fezileti", "qiyamet gunu",
  // tr
  "namazın fazileti", "sabır", "tevbe", "kabir azabı", "kıyamet günü", "anne baba hakkı", "komşu hakkı", "miras", "ticaret", "kader",
  // en
  "patience", "repentance", "punishment of the grave", "day of judgement", "angels", "jinn", "prophets", "companions", "inheritance", "backbiting",
  // ru
  "терпение", "покаяние", "наказание в могиле", "судный день", "ангелы", "джинны", "пророки", "сподвижники",
  // ar
  "الصبر", "التوبة", "عذاب القبر", "يوم القيامة", "الملائكة", "الجن", "الأنبياء", "الصحابة", "الميراث", "الغيبة",
];

// ---------------------------------------------------------------- tutulmamalı (salam, söhbət, kod, oyun)
export const NEGATIVE = [
  "Salam", "salam necəsən", "Salam əleyküm", "Necəsən?", "nə var nə yox", "sağ ol", "təşəkkürlər", "çox sağ ol", "Sən kimsən?", "adın nədir", "Nibras AI nədir", "hava necədir", "Bakıda hava", "saat neçədir", "bu gün hansı gündür",
  "2+2 neçədir", "mənə zarafat danış", "bir şeir yaz", "hekayə yaz", "Python ilə salam dünya kodu", "javascript array sort", "HTML forma nümunəsi", "CSS düymə", "SQL select nümunəsi", "kod yaz", "react komponent yaz",
  "Tetris oyunu", "oyun oyna", "ilan oyunu", "2048 oyunu", "mənə oyun ver", "futbol nəticələri", "Real Madrid", "dollar neçədir", "məzənnə", "telefon almaq istəyirəm", "maşın", "kompüter yavaşdır", "Windows yenilə",
  "sabahın xeyir", "gecəniz xeyrə", "hello", "hi", "how are you", "what's up", "thanks", "who are you", "write a poem", "tell me a joke", "python code for calculator", "play a game",
  "merhaba", "nasılsın", "teşekkürler", "şiir yaz", "kod yaz python", "привет", "как дела", "спасибо", "напиши код", "сыграем в игру", "مرحبا", "كيف حالك", "شكرا", "اكتب كود بايثون",
  "yaxşıyam", "ok", "hə", "yox", "bilmirəm", "maraqlıdır", "əla", "super", "bir sual verim", "kömək et", "tərcümə et: hello", "nibrascode.com", "Mahir Əliyev kimdir",
  // ümumi az sözləri (qrammatika/fətva terminlərinə oxşar): «fail», «hal», «təmiz», «bədəl», «yeni il», «şəkil»
  "fail nədir", "hal əhval necədir", "təmiz otaq", "bədəl nədir", "yeni il təbriki yaz", "şəkil çək", "foto çək", "hekayə", "bunu oxu", "kitab sözünün mənası", "Həsən kimdir", "Taleh", "satış planı", "merci", "hello world",
];
