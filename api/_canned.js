// Hazır cavablar: bu suallara süni intellektə getmədən birbaşa cavab verilir.
// Hər element: id, triggers (dilə görə ifadələr), answers (dilə görə mətn).

const ENTRIES = [
 {
  "id": "salafilik",
  "triggers": {
   "az": [
    "sələfilik",
    "selefilik",
    "sələfi",
    "selefi",
    "sələfilik nədir",
    "selefilik nedir",
    "sələfi nədir",
    "sələfizm"
   ],
   "tr": [
    "selefilik",
    "selefi",
    "selefilik nedir",
    "selefi nedir",
    "selefizm"
   ],
   "ar": [
    "السلفية",
    "ما هي السلفية",
    "ما هو المنهج السلفي",
    "المنهج السلفي"
   ],
   "en": [
    "salafism",
    "salafi",
    "salafiyyah",
    "what is salafism",
    "what is salafi",
    "who are salafis"
   ],
   "ru": [
    "салафизм",
    "салафиты",
    "салафия",
    "что такое салафизм",
    "кто такие салафиты"
   ]
  },
  "answers": {
   "az": "Sələfilik — İslamı Qurana və səhih Sünnəyə, səhabələrin, tabiinlərin və onların yolunu izləyən ilk nəsillərin anlayışına uyğun şəkildə yaşamağı əsas götürən yanaşmadır. “Sələf” sözü İslamın ilk nəsillərinə, xüsusilə səhabələrə və onları yaxşılıqla izləyənlərə aid edilir.\n\nSələfi əqidəsinin əsasını tövhid təşkil edir: ibadətin yalnız Allaha edilməsinə, Ona heç bir şərik qoşulmamasına və Allahın Özünü Quranda və səhih Sünnədə vəsf etdiyi ad və sifətlərinə iman gətirməyə xüsusi əhəmiyyət verilir.\n\nSələfilikdə dini məsələlərdə şəxsi fikir və sonradan ortaya çıxmış etiqadlardan çox, Quran, səhih Sünnə və ilk nəsillərin anlayışı əsas götürülür. Məqsəd dini Peyğəmbərin ﷺ və onun səhabələrinin yoluna mümkün qədər uyğun şəkildə anlamaq və yaşamaqdır.\n\nBununla yanaşı, hər bir dini məsələni yalnız süni intellektdən öyrənmək doğru deyil. Əqidə və digər mühüm dini məsələlərdə Quran və Sünnə ilə yanaşı, etibarlı və elm sahibi alimlərə müraciət etmək lazımdır.",
   "tr": "Selefilik — İslam'ı Kur'an'a ve sahih Sünnet'e, sahabenin, tabiînin ve onların yolunu izleyen ilk nesillerin anlayışına uygun şekilde yaşamayı esas alan bir yaklaşımdır. “Selef” kelimesi İslam'ın ilk nesillerini, özellikle sahabeyi ve onları güzellikle izleyenleri ifade eder.\n\nSelefi inancının temelini tevhid oluşturur: ibadetin yalnızca Allah'a yapılmasına, O'na hiçbir ortak koşulmamasına ve Allah'ın Kur'an'da ve sahih Sünnet'te kendisini nitelediği isim ve sıfatlarına iman etmeye özel önem verilir.\n\nSelefilikte dini meselelerde kişisel görüş ve sonradan ortaya çıkmış inançlardan çok, Kur'an, sahih Sünnet ve ilk nesillerin anlayışı esas alınır. Amaç, dini Peygamber ﷺ'in ve ashabının yoluna mümkün olduğunca uygun şekilde anlamak ve yaşamaktır.\n\nBununla birlikte, her dini meseleyi yalnızca yapay zekâdan öğrenmek doğru değildir. Akide ve diğer önemli dini konularda Kur'an ve Sünnet'in yanı sıra güvenilir ve ilim sahibi âlimlere başvurmak gerekir.",
   "ar": "السلفية منهجٌ يقوم على فهم الإسلام والعمل به وفق القرآن الكريم والسنة الصحيحة، وبفهم الصحابة والتابعين ومن سار على طريقهم من القرون الأولى. وكلمة «السلف» تُطلق على الأجيال الأولى من الإسلام، وخاصة الصحابة ومن اتبعهم بإحسان.\n\nوأساس العقيدة السلفية التوحيد: إفراد الله وحده بالعبادة، وعدم الإشراك به شيئًا، والإيمان بأسمائه وصفاته كما وصف بها نفسه في القرآن والسنة الصحيحة.\n\nوفي المنهج السلفي يُقدَّم القرآن والسنة الصحيحة وفهم السلف الصالح على الآراء الشخصية والمعتقدات التي ظهرت فيما بعد. والغاية فهم الدين والعمل به على طريق النبي ﷺ وأصحابه قدر الإمكان.\n\nومع ذلك، لا ينبغي أخذ كل مسألة دينية من الذكاء الاصطناعي وحده. ففي العقيدة وسائر المسائل الدينية المهمة، ينبغي الرجوع إلى القرآن والسنة، وإلى العلماء الثقات أهل العلم.",
   "en": "Salafism is an approach that seeks to live Islam according to the Quran and the authentic Sunnah, as understood by the Companions, the Followers (Tabi'un) and the early generations who followed their way. The word “Salaf” refers to the first generations of Islam, especially the Companions and those who followed them in goodness.\n\nThe foundation of Salafi creed is Tawhid: worshipping Allah alone, associating no partner with Him, and believing in His names and attributes as He described Himself in the Quran and the authentic Sunnah.\n\nIn religious matters, Salafism gives priority to the Quran, the authentic Sunnah and the understanding of the early generations, rather than personal opinion or beliefs that appeared later. The aim is to understand and practise the religion as closely as possible to the way of the Prophet ﷺ and his Companions.\n\nThat said, it is not right to learn every religious matter from artificial intelligence alone. In creed and other important religious questions, besides the Quran and Sunnah, you should consult reliable and knowledgeable scholars.",
   "ru": "Салафизм — это подход, при котором ислам понимают и практикуют в соответствии с Кораном и достоверной Сунной, так, как их понимали сподвижники, табиины и первые поколения, следовавшие их пути. Слово «салаф» означает первые поколения ислама, прежде всего сподвижников и тех, кто последовал за ними в благом.\n\nОснову салафитского вероубеждения составляет таухид: поклонение только Аллаху, непридание Ему сотоварищей и вера в Его имена и атрибуты так, как Он Сам описал Себя в Коране и достоверной Сунне.\n\nВ религиозных вопросах салафизм отдаёт приоритет Корану, достоверной Сунне и пониманию первых поколений, а не личному мнению и убеждениям, возникшим позже. Цель — понимать и практиковать религию как можно ближе к пути Пророка ﷺ и его сподвижников.\n\nВместе с тем неправильно изучать каждый религиозный вопрос только у искусственного интеллекта. В вопросах вероубеждения и других важных религиозных темах, помимо Корана и Сунны, следует обращаться к надёжным и знающим учёным."
  }
 },
 {
  "id": "firqeler",
  "triggers": {
   "az": [
    "islamda firqələr",
    "islamda firqeler",
    "firqələr",
    "firqeler",
    "firqə",
    "firqe",
    "məzhəblər",
    "mezhebler",
    "islam firqələri",
    "müsəlman firqələri",
    "neçə firqə var",
    "firqələr məsələsi"
   ],
   "tr": [
    "islamda fırkalar",
    "fırkalar",
    "fırka",
    "mezhepler",
    "islam mezhepleri",
    "islam fırkaları",
    "kaç fırka var"
   ],
   "ar": [
    "الفرق في الإسلام",
    "الفرق الإسلامية",
    "افتراق الأمة",
    "الفرق",
    "المذاهب في الإسلام"
   ],
   "en": [
    "sects in islam",
    "islamic sects",
    "islamic groups",
    "divisions in islam",
    "how many sects in islam",
    "firaq"
   ],
   "ru": [
    "секты в исламе",
    "течения в исламе",
    "исламские течения",
    "разделение в исламе",
    "фирки"
   ]
  },
  "answers": {
   "az": "İslamda firqələr məsələsi\n\nİslam tarixində etiqad və dini məsələlərdə fərqli görüşlərin meydana gəlməsi nəticəsində müxtəlif firqə və məzhəbi cərəyanlar ortaya çıxmışdır. Quranda müsəlmanların parçalanmaması əmr edilir və Allahın ipinə hamılıqla sarılmaq buyurulur.\n\nHədislərdə də əvvəlki ümmətlərin parçalanmasından bəhs edilir. Bu səbəbdən müsəlman üçün əsas ölçü Quran və səhih Sünnə, həmçinin səhabələrin və ilk nəsillərin dini necə anlayıb yaşadıqlarıdır.\n\nFirqələrin adlarını sadəcə sadalamaq kifayət deyil. Hər bir qrupun hansı məsələlərdə fərqləndiyini, hansı etiqadı qəbul etdiyini və həmin görüşlərin hansı dəlillərə əsaslandırıldığını araşdırmaq lazımdır. Həmçinin konkret şəxslərə və bütün qruplara tələsik hökm verməkdən çəkinmək, bu məsələləri elm əhli ilə öyrənmək lazımdır.\n\nNəticə: Müsəlman firqəçilikdən çox haqqın dəlilinə bağlanmalı, Quran və səhih Sünnəyə sarılmalı və dini ilk nəsillərin anlayışı ilə öyrənməyə çalışmalıdır.",
   "tr": "İslam'da fırkalar meselesi\n\nİslam tarihinde inanç ve dini konularda farklı görüşlerin ortaya çıkması sonucunda çeşitli fırka ve mezhep akımları meydana gelmiştir. Kur'an'da Müslümanların bölünmemesi emredilir ve hep birlikte Allah'ın ipine sarılmaları buyrulur.\n\nHadislerde de önceki ümmetlerin bölünmesinden söz edilir. Bu nedenle Müslüman için asıl ölçü Kur'an ve sahih Sünnet, ayrıca sahabenin ve ilk nesillerin dini nasıl anlayıp yaşadıklarıdır.\n\nFırkaların adlarını sadece saymak yeterli değildir. Her grubun hangi konularda ayrıldığını, hangi inancı benimsediğini ve bu görüşlerin hangi delillere dayandırıldığını araştırmak gerekir. Ayrıca belirli kişilere ve tüm gruplara aceleyle hüküm vermekten kaçınmak, bu konuları ilim ehliyle öğrenmek gerekir.\n\nSonuç: Müslüman, fırkacılıktan çok hakkın delilne bağlanmalı, Kur'an ve sahih Sünnet'e sarılmalı ve dini ilk nesillerin anlayışıyla öğrenmeye çalışmalıdır.",
   "ar": "مسألة الفرق في الإسلام\n\nظهرت في تاريخ الإسلام فرق وتيارات مذهبية متعددة نتيجة اختلاف الآراء في العقيدة والمسائل الدينية. وقد أمر القرآن الكريم المسلمين بعدم التفرق، وأمرهم بالاعتصام جميعًا بحبل الله.\n\nوتحدثت الأحاديث كذلك عن افتراق الأمم السابقة. ولهذا فإن المعيار الأساسي للمسلم هو القرآن والسنة الصحيحة، وكذلك كيف فهم الصحابة والقرون الأولى الدين وعاشوه.\n\nولا يكفي مجرد سرد أسماء الفرق، بل لا بد من دراسة المسائل التي اختلفت فيها كل فرقة، والعقيدة التي تتبناها، والأدلة التي تستند إليها تلك الآراء. كما ينبغي الابتعاد عن التسرع في الحكم على أشخاص بعينهم أو على جميع الجماعات، وتعلّم هذه المسائل من أهل العلم.\n\nالخلاصة: على المسلم أن يتمسك بدليل الحق لا بالتحزب، وأن يعتصم بالقرآن والسنة الصحيحة، وأن يسعى إلى تعلم الدين بفهم القرون الأولى.",
   "en": "The question of sects in Islam\n\nThroughout Islamic history, differing views on belief and religious matters gave rise to various sects and schools of thought. The Quran commands Muslims not to divide and tells them to hold fast, all together, to the rope of Allah.\n\nThe hadiths also speak of the division of earlier nations. For this reason, a Muslim's main criterion is the Quran and the authentic Sunnah, along with how the Companions and the early generations understood and lived the religion.\n\nIt is not enough to simply list the names of the sects. One must examine the issues on which each group differs, what beliefs it holds, and what evidence those views rely on. One should also avoid rushing to judge specific individuals or entire groups, and learn these matters from people of knowledge.\n\nConclusion: A Muslim should be attached to the evidence of truth rather than to sectarianism, hold fast to the Quran and the authentic Sunnah, and strive to learn the religion through the understanding of the early generations.",
   "ru": "Вопрос о течениях в исламе\n\nВ истории ислама из-за различий во взглядах на вероубеждение и религиозные вопросы возникли разные течения и мазхабы. В Коране мусульманам велено не разделяться и всем вместе держаться за вервь Аллаха.\n\nВ хадисах также говорится о разделении прежних общин. Поэтому главным мерилом для мусульманина являются Коран и достоверная Сунна, а также то, как сподвижники и первые поколения понимали религию и жили по ней.\n\nПросто перечислить названия течений недостаточно. Нужно изучить, в каких вопросах отличается каждая группа, какие убеждения она принимает и на какие доказательства опираются эти взгляды. Также следует воздерживаться от поспешных суждений о конкретных людях и обо всех группах и изучать эти вопросы у людей знания.\n\nИтог: мусульманину следует держаться доказательства истины, а не сектантства, придерживаться Корана и достоверной Сунны и стремиться изучать религию так, как её понимали первые поколения."
  }
 },
 {
  "id": "adlar-sifetler",
  "triggers": {
   "az": [
    "allahın ad və sifətləri",
    "allahin ad ve sifetleri",
    "allahın adları",
    "allahin adlari",
    "allahın sifətləri",
    "allahin sifetleri",
    "əsmaül hüsna",
    "əsməul-hüsnə",
    "esmaul husna",
    "əsmaul hüsna",
    "allahın 99 adı",
    "allahın gözəl adları"
   ],
   "tr": [
    "allah'ın isim ve sıfatları",
    "allahın isim ve sıfatları",
    "allah'ın isimleri",
    "allahın isimleri",
    "allah'ın sıfatları",
    "allahın sıfatları",
    "esmaül hüsna",
    "esma-ül hüsna",
    "allah'ın 99 ismi"
   ],
   "ar": [
    "أسماء الله وصفاته",
    "أسماء الله الحسنى",
    "صفات الله",
    "ما هي أسماء الله وصفاته",
    "الأسماء الحسنى"
   ],
   "en": [
    "names and attributes of allah",
    "allah's names and attributes",
    "names of allah",
    "attributes of allah",
    "99 names of allah",
    "asma wa sifat",
    "asmaul husna"
   ],
   "ru": [
    "имена и атрибуты аллаха",
    "имена и качества аллаха",
    "имена аллаха",
    "атрибуты аллаха",
    "99 имён аллаха",
    "асма уль хусна"
   ]
  },
  "answers": {
   "az": "Allahın ad və sifətləri nədir?\n\nAllahın adları (Əsməul-Hüsnə) — Allahın Özünü Quranda və səhih Sünnədə adlandırdığı gözəl adlardır. Məsələn: ər-Rəhman (mərhəməti geniş olan), əl-Ğafur (çox bağışlayan), əs-Səmi (hər şeyi eşidən) və əl-Bəsir (hər şeyi görən).\n\nAllahın sifətləri isə Onun Özündə olan kamil xüsusiyyətlərdir. Məsələn, Allahın elmi, qüdrəti, eşitməsi, görməsi, mərhəməti və danışması vardır.\n\nSələfin əqidəsinə görə Allahın ad və sifətləri Quranda və səhih Sünnədə necə gəlibsə, elə də qəbul edilir. Onları inkar etmək, mənasını təhrif etmək və Allahın sifətlərini yaradılmışların sifətlərinə bənzətmək doğru deyil. Eyni zamanda onların “necə” olduğunu sorğulamırıq. Çünki Allah buyurur:\n“Onun heç bir bənzəri yoxdur. O, Eşidəndir, Görəndir.” (əş-Şura, 42:11)\n\nYəni Allahın sifətləri həqiqidir, lakin Onun sifətləri yaradılmışların sifətlərinə bənzəmir. Allahın zatı bənzərsiz olduğu kimi, ad və sifətləri də bənzərsizdir.",
   "tr": "Allah'ın isim ve sıfatları nedir?\n\nAllah'ın isimleri (Esmâü'l-Hüsnâ) — Allah'ın kendisini Kur'an'da ve sahih Sünnet'te adlandırdığı güzel isimlerdir. Örneğin: er-Rahman (rahmeti geniş olan), el-Gafur (çok bağışlayan), es-Semi' (her şeyi işiten) ve el-Basir (her şeyi gören).\n\nAllah'ın sıfatları ise O'nun zatında bulunan kemal sıfatlarıdır. Örneğin Allah'ın ilmi, kudreti, işitmesi, görmesi, rahmeti ve konuşması vardır.\n\nSelefin inancına göre Allah'ın isim ve sıfatları Kur'an'da ve sahih Sünnet'te nasıl geldiyse öyle kabul edilir. Onları inkâr etmek, anlamını tahrif etmek ve Allah'ın sıfatlarını yaratılmışların sıfatlarına benzetmek doğru değildir. Aynı zamanda onların “nasıl” olduğunu sorgulamayız. Çünkü Allah şöyle buyurur:\n“O'nun benzeri hiçbir şey yoktur. O, işitendir, görendir.” (Şûrâ, 42:11)\n\nYani Allah'ın sıfatları gerçektir, ancak O'nun sıfatları yaratılmışların sıfatlarına benzemez. Allah'ın zatı benzersiz olduğu gibi isim ve sıfatları da benzersizdir.",
   "ar": "ما هي أسماء الله وصفاته؟\n\nأسماء الله (الأسماء الحسنى) هي الأسماء الحسنى التي سمّى الله بها نفسه في القرآن والسنة الصحيحة. مثل: الرحمن (واسع الرحمة)، والغفور (كثير المغفرة)، والسميع (الذي يسمع كل شيء)، والبصير (الذي يرى كل شيء).\n\nأما صفات الله فهي صفات الكمال الثابتة لذاته سبحانه. فلله علم وقدرة وسمع وبصر ورحمة وكلام.\n\nوعلى عقيدة السلف تُثبَت أسماء الله وصفاته كما جاءت في القرآن والسنة الصحيحة. ولا يجوز إنكارها، ولا تحريف معانيها، ولا تشبيه صفات الله بصفات المخلوقين. ومع ذلك لا نسأل عن «كيفيتها». لأن الله يقول:\n«لَيْسَ كَمِثْلِهِ شَيْءٌ ۖ وَهُوَ السَّمِيعُ الْبَصِيرُ» (الشورى: 11)\n\nأي أن صفات الله حقيقية، لكنها لا تشبه صفات المخلوقين. فكما أن ذات الله لا مثيل لها، فكذلك أسماؤه وصفاته لا مثيل لها.",
   "en": "What are the names and attributes of Allah?\n\nThe names of Allah (al-Asma' al-Husna) are the beautiful names by which Allah named Himself in the Quran and the authentic Sunnah. For example: ar-Rahman (the Most Merciful), al-Ghafur (the Oft-Forgiving), as-Sami' (the All-Hearing) and al-Basir (the All-Seeing).\n\nAllah's attributes are the perfect qualities that belong to Him. For example, Allah has knowledge, power, hearing, sight, mercy and speech.\n\nAccording to the creed of the Salaf, Allah's names and attributes are accepted as they came in the Quran and the authentic Sunnah. It is not right to deny them, distort their meaning, or compare Allah's attributes to the attributes of created beings. At the same time, we do not ask “how” they are. Because Allah says:\n“There is nothing like Him, and He is the All-Hearing, the All-Seeing.” (ash-Shura, 42:11)\n\nThat is, Allah's attributes are real, but they are not like the attributes of created beings. Just as Allah's Essence has no equal, His names and attributes have no equal.",
   "ru": "Что такое имена и атрибуты Аллаха?\n\nИмена Аллаха (аль-Асма аль-Хусна) — это прекрасные имена, которыми Аллах назвал Себя в Коране и достоверной Сунне. Например: ар-Рахман (Милостивый), аль-Гафур (Прощающий), ас-Сами (Всеслышащий) и аль-Басир (Всевидящий).\n\nАтрибуты Аллаха — это совершенные качества, присущие Ему. Например, у Аллаха есть знание, могущество, слух, зрение, милость и речь.\n\nСогласно вероубеждению саляфов, имена и атрибуты Аллаха принимаются так, как они пришли в Коране и достоверной Сунне. Нельзя отрицать их, искажать их смысл и уподоблять атрибуты Аллаха атрибутам созданных существ. В то же время мы не спрашиваем «как» они. Ведь Аллах говорит:\n«Нет ничего подобного Ему. Он — Слышащий, Видящий» (аш-Шура, 42:11)\n\nТо есть атрибуты Аллаха истинны, но не похожи на атрибуты созданных существ. Как Сущность Аллаха не имеет подобия, так и Его имена и атрибуты не имеют подобия."
  }
 },
 {
  "id": "haqq-din",
  "triggers": {
   "az": [
    "allah qatında qəbul olunan din",
    "allah qatinda qebul olunan din",
    "allah yanında din",
    "haqq din hansıdır",
    "haqq din hansidir",
    "düzgün din hansıdır",
    "duzgun din hansidir",
    "ən doğru din",
    "en dogru din",
    "hansı din haqdır",
    "hansi din haqdir",
    "allahın qəbul etdiyi din",
    "qəbul olunan din hansıdır"
   ],
   "tr": [
    "allah katında kabul edilen din",
    "allah nezdinde din",
    "hak din hangisidir",
    "doğru din hangisi",
    "en doğru din",
    "hangi din haktır",
    "allah'ın kabul ettiği din"
   ],
   "ar": [
    "الدين المقبول عند الله",
    "الدين الحق",
    "ما هو الدين الحق",
    "ما هو الدين عند الله",
    "أي دين هو الحق"
   ],
   "en": [
    "religion accepted by allah",
    "which religion is true",
    "true religion",
    "which religion is right",
    "the religion with allah",
    "what is the true religion"
   ],
   "ru": [
    "религия принятая аллахом",
    "истинная религия",
    "какая религия истинная",
    "какая религия правильная",
    "религия перед аллахом"
   ]
  },
  "answers": {
   "az": "Allah qatında qəbul olunan din İslamdır.\n\nAllah Quranda buyurur: “Həqiqətən, Allah yanında din İslamdır.” (Ali-İmran, 3:19)\n\nİslam — Allahı tək olaraq ibadətə layiq bilmək, Ona heç bir şərik qoşmamaq və Peyğəmbərimiz Məhəmməd ﷺ-in gətirdiyi vəhyi qəbul edib ona tabe olmaqdır. Allah həmçinin buyurur: “Kim İslamdan başqa bir din axtararsa, ondan əsla qəbul edilməz.” (Ali-İmran, 3:85)\n\nBuna görə müsəlman üçün haqq din İslamdır və nicat Allahın Kitabına və Rəsulunun ﷺ səhih Sünnəsinə tabe olmaqla axtarılır.",
   "tr": "Allah katında kabul edilen din İslam'dır.\n\nAllah Kur'an'da şöyle buyurur: “Şüphesiz Allah katında din İslam'dır.” (Âl-i İmrân, 3:19)\n\nİslam — Allah'ı tek başına ibadete layık bilmek, O'na hiçbir ortak koşmamak ve Peygamberimiz Muhammed ﷺ'in getirdiği vahyi kabul edip ona uymaktır. Allah ayrıca şöyle buyurur: “Kim İslam'dan başka bir din ararsa, bu ondan asla kabul edilmez.” (Âl-i İmrân, 3:85)\n\nBu nedenle Müslüman için hak din İslam'dır ve kurtuluş, Allah'ın Kitab'ına ve Resulü ﷺ'in sahih Sünnet'ine uymakla aranır.",
   "ar": "الدين المقبول عند الله هو الإسلام.\n\nقال الله تعالى في القرآن: «إِنَّ الدِّينَ عِندَ اللَّهِ الْإِسْلَامُ» (آل عمران: 19)\n\nوالإسلام هو إفراد الله وحده بالعبادة، وعدم الإشراك به شيئًا، وقبول الوحي الذي جاء به نبينا محمد ﷺ والانقياد له. وقال تعالى أيضًا: «وَمَن يَبْتَغِ غَيْرَ الْإِسْلَامِ دِينًا فَلَن يُقْبَلَ مِنْهُ» (آل عمران: 85)\n\nلذلك فالدين الحق عند المسلم هو الإسلام، والنجاة تُطلب باتباع كتاب الله وسنة رسوله ﷺ الصحيحة.",
   "en": "The religion accepted by Allah is Islam.\n\nAllah says in the Quran: “Indeed, the religion with Allah is Islam.” (Aal-Imran, 3:19)\n\nIslam means recognising Allah alone as worthy of worship, associating no partner with Him, and accepting and following the revelation brought by our Prophet Muhammad ﷺ. Allah also says: “And whoever seeks a religion other than Islam, it will never be accepted from him.” (Aal-Imran, 3:85)\n\nTherefore, for a Muslim the true religion is Islam, and salvation is sought by following the Book of Allah and the authentic Sunnah of His Messenger ﷺ.",
   "ru": "Религия, принимаемая Аллахом, — это ислам.\n\nАллах говорит в Коране: «Воистину, религия перед Аллахом — ислам» (Али Имран, 3:19).\n\nИслам — это признание того, что только Аллах достоин поклонения, непридание Ему сотоварищей, принятие откровения, принесённого нашим Пророком Мухаммадом ﷺ, и следование ему. Аллах также говорит: «Кто ищет иную религию, кроме ислама, то это никогда не будет принято от него» (Али Имран, 3:85).\n\nПоэтому для мусульманина истинная религия — ислам, а спасения ищут, следуя Книге Аллаха и достоверной Сунне Его Посланника ﷺ."
  }
 },
 {
  "id": "bidet",
  "triggers": {
   "az": [
    "bidətin hökmü",
    "bidetin hokmu",
    "bidət nədir",
    "bidet nedir",
    "bidət",
    "bidet",
    "dində bidət",
    "bidət haramdır",
    "bidət etmək"
   ],
   "tr": [
    "bidatın hükmü",
    "bid'atın hükmü",
    "bidat nedir",
    "bid'at nedir",
    "bidat",
    "bid'at",
    "dinde bidat"
   ],
   "ar": [
    "حكم البدعة",
    "ما هي البدعة",
    "البدعة",
    "البدعة في الدين"
   ],
   "en": [
    "ruling on bidah",
    "ruling of bidah",
    "what is bidah",
    "bidah",
    "bid'ah",
    "innovation in religion",
    "religious innovation"
   ],
   "ru": [
    "вердикт о бида",
    "что такое бида",
    "бида",
    "новшество в религии",
    "религиозное новшество"
   ]
  },
  "answers": {
   "az": "Bidətin hökmü\n\nBidət — dinə ibadət və etiqad olaraq Allah və Rəsulunun ﷺ şəriətdə qoymadığı yeni bir şey daxil etməkdir. Peyğəmbər ﷺ buyurmuşdur: “Kim bizim bu işimizə ondan olmayan bir şeyi daxil edərsə, o rədd edilər.” (Buxari, Müslim)\n\nBu səbəbdən dində bidət etmək və bidətə etiqadla ibadət etmək haramdır. Lakin konkret bir əmələ “bidət” hökmü vermək üçün onun həqiqətən dini ibadət kimi ortaya qoyulub-qoyulmadığı və şəri dəlillərin nə dediyi araşdırılmalıdır.\n\nMüsəlman dini məsələlərdə Qurana, səhih Sünnəyə və səhabələrin anlayışına bağlı qalmalı, bilmədiyi məsələlərdə isə etibarlı alimlərə müraciət etməlidir.",
   "tr": "Bid'atın hükmü\n\nBid'at — dine ibadet ve inanç olarak Allah'ın ve Resulü ﷺ'in şeriatta koymadığı yeni bir şey sokmaktır. Peygamber ﷺ şöyle buyurmuştur: “Kim bizim bu işimize ondan olmayan bir şey sokarsa, o reddedilir.” (Buhârî, Müslim)\n\nBu nedenle dinde bid'at çıkarmak ve bid'ate inanarak ibadet etmek haramdır. Ancak belirli bir ameli “bid'at” diye hükümlendirmek için onun gerçekten dini bir ibadet olarak ortaya konup konulmadığı ve şer'i delillerin ne dediği araştırılmalıdır.\n\nMüslüman dini konularda Kur'an'a, sahih Sünnet'e ve sahabenin anlayışına bağlı kalmalı, bilmediği konularda ise güvenilir âlimlere başvurmalıdır.",
   "ar": "حكم البدعة\n\nالبدعة هي إحداث شيء جديد في الدين، عبادةً واعتقادًا، لم يشرعه الله ورسوله ﷺ. قال النبي ﷺ: «مَن أحدثَ في أمرِنا هذا ما ليس منه فهو رَدّ» (رواه البخاري ومسلم).\n\nولهذا فالابتداع في الدين، والتعبد لله بالبدعة اعتقادًا، محرّم. لكن الحكم على عمل معيّن بأنه «بدعة» يتطلب النظر في: هل هو مقدَّم فعلًا على أنه عبادة دينية، وماذا تقول الأدلة الشرعية فيه.\n\nوعلى المسلم أن يلتزم بالقرآن والسنة الصحيحة وفهم الصحابة في أمور الدين، وأن يرجع إلى العلماء الثقات فيما لا يعلم.",
   "en": "The ruling on bid'ah (innovation)\n\nBid'ah is introducing into the religion something new, as worship or belief, that Allah and His Messenger ﷺ did not legislate. The Prophet ﷺ said: “Whoever introduces into this matter of ours something that is not part of it, it will be rejected.” (Bukhari, Muslim)\n\nFor this reason, innovating in the religion and worshipping with the belief in an innovation is forbidden. However, before ruling that a particular act is a “bid'ah”, one must examine whether it is truly presented as an act of religious worship and what the Islamic evidences say about it.\n\nA Muslim should stay attached to the Quran, the authentic Sunnah and the understanding of the Companions in religious matters, and consult reliable scholars about what he does not know.",
   "ru": "Вердикт о бида (нововведении)\n\nБида — это привнесение в религию в качестве поклонения и вероубеждения чего-то нового, чего не устанавливали Аллах и Его Посланник ﷺ. Пророк ﷺ сказал: «Кто привнесёт в это наше дело то, что не относится к нему, то это будет отвергнуто» (аль-Бухари, Муслим).\n\nПоэтому совершение нововведений в религии и поклонение с убеждённостью в нововведении запрещено. Однако, чтобы вынести о конкретном деянии вердикт «бида», нужно изучить, действительно ли оно выдаётся за религиозное поклонение и что говорят шариатские доказательства.\n\nМусульманин должен держаться Корана, достоверной Сунны и понимания сподвижников в религиозных вопросах, а в том, чего не знает, обращаться к надёжным учёным."
  }
 },
 {
  "id": "gozel-bidet",
  "triggers": {
   "az": [
    "gözəl bidət varmı",
    "gozel bidet varmi",
    "gözəl bidət",
    "gozel bidet",
    "gözəl bidət var",
    "yaxşı bidət",
    "bidəti həsənə",
    "bidət həsənə",
    "bidəti-həsənə"
   ],
   "tr": [
    "güzel bidat var mı",
    "güzel bidat",
    "güzel bid'at var mı",
    "güzel bid'at",
    "bidat-ı hasene",
    "bidat hasene",
    "hasen bidat"
   ],
   "ar": [
    "هل هناك بدعة حسنة",
    "هل توجد بدعة حسنة",
    "البدعة الحسنة",
    "بدعة حسنة"
   ],
   "en": [
    "is there a good bidah",
    "good bidah",
    "good bid'ah",
    "is there good innovation in islam",
    "bidah hasanah",
    "beautiful bidah",
    "good innovation in islam"
   ],
   "ru": [
    "бывает ли хорошая бида",
    "хорошая бида",
    "есть ли хорошая бида",
    "бида хасана",
    "хорошее нововведение в исламе"
   ]
  },
  "answers": {
   "az": "Gözəl bidət varmı?\n\nSələfin yoluna görə, şəri mənada “gözəl bidət” yoxdur. Çünki Peyğəmbər ﷺ buyurmuşdur:\n\n“Hər bir bidət zəlalətdir.” (Səhih Müslim)\n\nİmam Malik رحمه الله-dan belə rəvayət olunur:\n\n“Kim İslamda gözəl bir bidət olduğunu düşünürsə, Məhəmmədin ﷺ risalətə xəyanət etdiyini iddia etmiş olar. Çünki Allah buyurur: ‘Bu gün dininizi sizin üçün kamil etdim.’” (əl-İʿtisam, əş-Şatibi)\n\nHəmçinin İmam Malik رحمه الله demişdir:\n\n“O gün din olmayan bir şey, bu gün də din olmaz.”\n\nBuna görə dində ibadət məqsədilə sonradan ortaya çıxarılan və Quranda, səhih Sünnədə əsası olmayan bir əməli “gözəl bidət” adlandırmaq doğru deyil.\n\nÖmər ibn Xəttabın رضي الله عنه “Bu nə gözəl bidətdir” sözü isə şəri mənada yeni ibadət yaratmaq demək deyil. Çünki təravihin əsli Peyğəmbərin ﷺ Sünnəsində mövcud idi.\n\nNəticə: İbadətlərdə əsas yenilik gətirmək deyil, Qurana, səhih Sünnəyə və səhabələrin yoluna tabe olmaqdır.",
   "tr": "Güzel bid'at var mı?\n\nSelefin yoluna göre, şer'i anlamda “güzel bid'at” yoktur. Çünkü Peygamber ﷺ şöyle buyurmuştur:\n\n“Her bid'at dalalettir.” (Sahih-i Müslim)\n\nİmam Malik رحمه الله'dan şöyle rivayet edilir:\n\n“Kim İslam'da güzel bir bid'at olduğunu düşünürse, Muhammed'in ﷺ risaletine ihanet ettiğini iddia etmiş olur. Çünkü Allah şöyle buyurur: ‘Bugün dininizi sizin için kemale erdirdim.’” (el-İtisâm, eş-Şâtıbî)\n\nİmam Malik رحمه الله ayrıca şöyle demiştir:\n\n“O gün din olmayan bir şey, bugün de din olmaz.”\n\nBu nedenle dinde ibadet amacıyla sonradan ortaya çıkarılan ve Kur'an'da, sahih Sünnet'te aslı olmayan bir ameli “güzel bid'at” diye adlandırmak doğru değildir.\n\nÖmer b. Hattab رضي الله عنه'ın “Bu ne güzel bid'at” sözü ise şer'i anlamda yeni bir ibadet icat etmek demek değildir. Çünkü terevihin aslı Peygamber ﷺ'in Sünnet'inde mevcuttu.\n\nSonuç: İbadetlerde asıl olan yenilik getirmek değil, Kur'an'a, sahih Sünnet'e ve sahabenin yoluna uymaktır.",
   "ar": "هل توجد بدعة حسنة؟\n\nعلى طريقة السلف، لا توجد «بدعة حسنة» بالمعنى الشرعي. لأن النبي ﷺ قال:\n\n«وكلّ بدعةٍ ضلالة» (صحيح مسلم)\n\nورُوي عن الإمام مالك رحمه الله:\n\n«مَن ابتدع في الإسلام بدعةً يراها حسنة فقد زعم أن محمدًا ﷺ خان الرسالة، لأن الله يقول: ﴿الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ﴾» (الاعتصام للشاطبي)\n\nوقال الإمام مالك رحمه الله أيضًا:\n\n«ما لم يكن يومئذٍ دينًا فلا يكون اليوم دينًا».\n\nلذلك لا يصح تسمية عمل أُحدث بعد ذلك على وجه التعبد، وليس له أصل في القرآن ولا في السنة الصحيحة، «بدعة حسنة».\n\nأما قول عمر بن الخطاب رضي الله عنه: «نِعمَت البدعةُ هذه» فليس معناه إحداث عبادة جديدة بالمعنى الشرعي، لأن أصل التراويح كان موجودًا في سنة النبي ﷺ.\n\nالخلاصة: الأصل في العبادات ليس الإتيان بالجديد، بل اتباع القرآن والسنة الصحيحة وطريق الصحابة.",
   "en": "Is there a good bid'ah?\n\nAccording to the way of the Salaf, there is no “good bid'ah” in the Islamic legal sense. Because the Prophet ﷺ said:\n\n“Every bid'ah is misguidance.” (Sahih Muslim)\n\nIt is narrated from Imam Malik رحمه الله:\n\n“Whoever introduces a bid'ah in Islam thinking it is good has claimed that Muhammad ﷺ betrayed the message. Because Allah says: ‘Today I have perfected your religion for you.’” (al-I'tisam, ash-Shatibi)\n\nImam Malik رحمه الله also said:\n\n“Whatever was not religion on that day is not religion today.”\n\nTherefore, it is not right to call an act that was later introduced as worship, and has no basis in the Quran or the authentic Sunnah, a “good bid'ah”.\n\nAs for the saying of Umar ibn al-Khattab رضي الله عنه, “What a good bid'ah this is”, it does not mean creating a new act of worship in the legal sense, because the origin of Tarawih already existed in the Sunnah of the Prophet ﷺ.\n\nConclusion: In acts of worship, the principle is not to bring something new, but to follow the Quran, the authentic Sunnah and the way of the Companions.",
   "ru": "Бывает ли хорошая бида?\n\nПо пути саляфов, «хорошей бида» в шариатском смысле не существует. Ведь Пророк ﷺ сказал:\n\n«Всякая бида — заблуждение» (Сахих Муслим).\n\nОт имама Малика, да смилуется над ним Аллах, передаётся:\n\n«Кто привнёс в ислам бида, считая её хорошей, тот утверждает, что Мухаммад ﷺ предал посланничество. Ведь Аллах говорит: ‹Сегодня Я завершил для вас вашу религию›» (аль-И'тисам, аш-Шатыби).\n\nИмам Малик, да смилуется над ним Аллах, также сказал:\n\n«То, что не было религией в тот день, не станет религией и сегодня».\n\nПоэтому неверно называть «хорошей бида» деяние, привнесённое позже в качестве поклонения и не имеющее основы в Коране и достоверной Сунне.\n\nСлова Умара ибн аль-Хаттаба, да будет доволен им Аллах, «Какая хорошая это бида» не означают установление нового поклонения в шариатском смысле, поскольку основа тарвиха существовала в Сунне Пророка ﷺ.\n\nИтог: в поклонении главное — не вводить новое, а следовать Корану, достоверной Сунне и пути сподвижников."
  }
 },
 {
  "id": "namaz-vaxtlari",
  "triggers": {
   "az": [
    "gündə neçə vaxt namaz",
    "gunde nece vaxt namaz",
    "neçə vaxt namaz",
    "nece vaxt namaz",
    "5 vaxt namaz",
    "beş vaxt namaz",
    "fərz namazlar",
    "ferz namazlar",
    "neçə rükət fərz",
    "nece reket ferz",
    "namaz neçə rükətdir",
    "namaz nece reketdir",
    "namaz vaxtları",
    "fərz namaz"
   ],
   "tr": [
    "günde kaç vakit namaz",
    "kaç vakit namaz",
    "5 vakit namaz",
    "beş vakit namaz",
    "farz namazlar",
    "kaç rekat farz",
    "namaz kaç rekat",
    "farz namaz"
   ],
   "ar": [
    "كم عدد الصلوات المفروضة",
    "الصلوات الخمس",
    "كم ركعة في الصلوات الخمس",
    "عدد ركعات الصلوات",
    "الصلوات المفروضة"
   ],
   "en": [
    "how many daily prayers",
    "how many prayers a day",
    "five daily prayers",
    "5 daily prayers",
    "obligatory prayers",
    "how many rakats are fard",
    "how many rakats in prayer"
   ],
   "ru": [
    "сколько намазов в день",
    "пять намазов",
    "5 намазов",
    "обязательные намазы",
    "сколько ракатов в намазе",
    "сколько ракаатов фард"
   ]
  },
  "answers": {
   "az": "Gündə 5 vaxt fərz namaz vardır:\n\nSübh — 2 rükət\nZöhr — 4 rükət\nƏsr — 4 rükət\nMəğrib — 3 rükət\nİşa — 4 rükət\n\nCəmi: 17 rükət fərz namaz.\n\nBu beş vaxt namaz Quranda və səhih Sünnədə sabitdir və həddi-büluğa çatmış, ağlı başında olan müsəlmana fərzdir.",
   "tr": "Günde 5 vakit farz namaz vardır:\n\nSabah — 2 rekât\nÖğle — 4 rekât\nİkindi — 4 rekât\nAkşam — 3 rekât\nYatsı — 4 rekât\n\nToplam: 17 rekât farz namaz.\n\nBu beş vakit namaz Kur'an'da ve sahih Sünnet'te sabittir ve ergenlik çağına ulaşmış, akıllı Müslümana farzdır.",
   "ar": "الصلوات المفروضة في اليوم خمس:\n\nالفجر — ركعتان\nالظهر — 4 ركعات\nالعصر — 4 ركعات\nالمغرب — 3 ركعات\nالعشاء — 4 ركعات\n\nالمجموع: 17 ركعة فرضًا.\n\nهذه الصلوات الخمس ثابتة بالقرآن والسنة الصحيحة، وهي فرض على المسلم البالغ العاقل.",
   "en": "There are 5 obligatory prayers every day:\n\nFajr — 2 rak'ahs\nDhuhr — 4 rak'ahs\nAsr — 4 rak'ahs\nMaghrib — 3 rak'ahs\nIsha — 4 rak'ahs\n\nTotal: 17 rak'ahs of obligatory prayer.\n\nThese five prayers are established in the Quran and the authentic Sunnah, and are obligatory upon every Muslim who has reached puberty and is of sound mind.",
   "ru": "Каждый день есть 5 обязательных намазов:\n\nФаджр (утренний) — 2 ракята\nЗухр (полуденный) — 4 ракята\nАср (послеполуденный) — 4 ракята\nМагриб (закатный) — 3 ракята\nИша (вечерний) — 4 ракята\n\nВсего: 17 ракятов обязательной молитвы.\n\nЭти пять намазов установлены в Коране и достоверной Сунне и являются обязательными для каждого мусульманина, достигшего совершеннолетия и находящегося в здравом уме."
  }
 },
 {
  "id": "namaz-nesihet",
  "triggers": {
   "az": [
    "namaz haqqında nəsihət",
    "namaz haqqinda nesihet",
    "namaz nəsihəti",
    "namaz nesihet",
    "namazı qorumaq",
    "namazi qorumaq",
    "namazı niyə qılmalıyam",
    "namazi niye qilmaliyam",
    "namazı həyatın mərkəzində tut",
    "namaza nəsihət",
    "namaz qılmağa nəsihət",
    "namazı tərk etmək",
    "namaz qılmıram nə edim",
    "namaz qilmiram ne edim",
    "namaz qılmaq istəmirəm",
    "namaza həvəs"
   ],
   "tr": [
    "namaz hakkında nasihat",
    "namaz nasihati",
    "namazı korumak",
    "namazı neden kılmalıyım",
    "namaz kılmıyorum ne yapmalıyım",
    "namaz kılmak istemiyorum"
   ],
   "ar": [
    "نصيحة عن الصلاة",
    "نصيحة في الصلاة",
    "المحافظة على الصلاة",
    "لماذا أصلي",
    "أنا لا أصلي ماذا أفعل",
    "نصيحة للمحافظة على الصلاة"
   ],
   "en": [
    "advice about prayer",
    "advice on prayer",
    "advice about salah",
    "why should i pray",
    "i don't pray what should i do",
    "keeping up the prayer",
    "protecting the prayer"
   ],
   "ru": [
    "совет о намазе",
    "совет про намаз",
    "совет по намазу",
    "почему я должен молиться",
    "я не молюсь что делать",
    "беречь намаз"
   ]
  },
  "answers": {
   "az": "Namazı həyatının kənarında deyil, mərkəzində tut. Dünya işləri üçün vaxt tapdığın kimi, səni yaradan və sənə saysız nemətlər verən Allahın çağırışına da cavab ver.\n\nNamazı qorumaq — dini qorumağın ən böyük əlamətlərindəndir.\n\nVaxtını gözləmə; namaz üçün vaxt ayır.",
   "tr": "Namazı hayatının kenarında değil, merkezinde tut. Dünya işleri için vakit bulduğun gibi, seni yaratan ve sana sayısız nimetler veren Allah'ın çağrısına da cevap ver.\n\nNamazı korumak, dini korumanın en büyük alametlerindendir.\n\nVaktini bekleme; namaz için vakit ayır.",
   "ar": "اجعل الصلاة في مركز حياتك لا على هامشها. وكما تجد وقتًا لأمور الدنيا، أجب نداء الله الذي خلقك وأنعم عليك بنعم لا تُحصى.\n\nالمحافظة على الصلاة من أعظم علامات المحافظة على الدين.\n\nلا تنتظر أن يتسع وقتك؛ بل خصّص وقتًا للصلاة.",
   "en": "Keep prayer at the centre of your life, not on its edge. Just as you find time for worldly affairs, answer the call of Allah, who created you and gave you countless blessings.\n\nProtecting the prayer is one of the greatest signs of protecting the religion.\n\nDon't wait for free time; make time for prayer.",
   "ru": "Держи намаз в центре своей жизни, а не на её обочине. Как ты находишь время для мирских дел, так отвечай и на призыв Аллаха, Который создал тебя и даровал тебе бесчисленные блага.\n\nОберегание намаза — один из величайших признаков того, что человек бережёт религию.\n\nНе жди свободного времени; выделяй время для намаза."
  }
 },
 {
  "id": "nesihet",
  "triggers": {
   "az": [
    "nəsihət",
    "nesihet",
    "nəsihət ver",
    "nesihet ver",
    "mənə nəsihət ver",
    "mene nesihet ver",
    "bir nəsihət",
    "bir nesihet",
    "mənə məsləhət ver",
    "mene meslehet ver",
    "nəsihət et",
    "nəsihət yaz",
    "tövsiyə ver"
   ],
   "tr": [
    "nasihat",
    "nasihat ver",
    "bana nasihat ver",
    "bir nasihat",
    "nasihat et",
    "öğüt ver",
    "bana öğüt ver"
   ],
   "ar": [
    "نصيحة",
    "انصحني",
    "أعطني نصيحة",
    "أريد نصيحة",
    "عظني",
    "عظة"
   ],
   "en": [
    "advice",
    "give me advice",
    "give me some advice",
    "nasiha",
    "nasihah",
    "give me a nasiha",
    "any advice"
   ],
   "ru": [
    "совет",
    "дай совет",
    "дай мне совет",
    "насиха",
    "наставление",
    "дай наставление"
   ]
  },
  "answers": {
   "az": "🌿 Nəsihət\n\nDünyanın keçici olduğunu, axirətin isə əbədi olduğunu unutma. Allahdan qorx, Ona ümid bəslə və hər işində ixlaslı ol. Namazını qoru, günahlardan uzaq dur, valideynlərinə yaxşılıq et və insanlarla gözəl rəftar et.\n\nGünah etdikdə ümidsiz olma — tövbə et və Allaha qayıt. Elm öyrənərkən onu etibarlı mənbələrdən və elm əhlindən götür. Bildiyinlə əməl et və bilmədiyin şey haqqında danışma.\n\nHər gün özünü sorğu-sual et: bu gün Allah üçün nə etdim və sabah Ona necə daha yaxşı yaxınlaşa bilərəm?\n\nAllah hamımıza haqqı haqq olaraq göstərib ona tabe olmağı, batili batil olaraq göstərib ondan çəkinməyi nəsib etsin. آمين.",
   "tr": "🌿 Nasihat\n\nDünyanın geçici, ahiretin ise ebedi olduğunu unutma. Allah'tan kork, O'na ümit bağla ve her işinde ihlaslı ol. Namazını koru, günahlardan uzak dur, anne babana iyilik et ve insanlara güzel davran.\n\nGünah işlediğinde ümitsizliğe kapılma — tövbe et ve Allah'a dön. İlim öğrenirken onu güvenilir kaynaklardan ve ilim ehlinden al. Bildiğinle amel et ve bilmediğin şey hakkında konuşma.\n\nHer gün kendini sorgula: bugün Allah için ne yaptım ve yarın O'na nasıl daha iyi yaklaşabilirim?\n\nAllah hepimize hakkı hak olarak gösterip ona uymayı, batılı batıl olarak gösterip ondan sakınmayı nasip etsin. آمين.",
   "ar": "🌿 نصيحة\n\nلا تنسَ أن الدنيا زائلة وأن الآخرة باقية. اتقِ الله وارجُه، وأخلص في كل أعمالك. حافظ على صلاتك، وابتعد عن الذنوب، وأحسن إلى والديك، وعامل الناس بالحسنى.\n\nإذا أذنبت فلا تيأس، بل تُب وارجع إلى الله. وإذا طلبت العلم فخذه من مصادر موثوقة ومن أهل العلم. اعمل بما علمت ولا تتكلم فيما لا تعلم.\n\nحاسب نفسك كل يوم: ماذا فعلت اليوم لله، وكيف أقترب منه أكثر غدًا؟\n\nنسأل الله أن يرينا الحق حقًا ويرزقنا اتباعه، وأن يرينا الباطل باطلًا ويرزقنا اجتنابه. آمين.",
   "en": "🌿 Advice\n\nDo not forget that this world is temporary and the Hereafter is eternal. Fear Allah, place your hope in Him, and be sincere in everything you do. Protect your prayer, stay away from sins, be good to your parents, and treat people well.\n\nWhen you sin, do not despair — repent and return to Allah. When you seek knowledge, take it from reliable sources and from people of knowledge. Act on what you know, and do not speak about what you do not know.\n\nQuestion yourself every day: what did I do for Allah today, and how can I draw closer to Him tomorrow?\n\nMay Allah show all of us the truth as truth and grant us to follow it, and show falsehood as falsehood and grant us to avoid it. Ameen.",
   "ru": "🌿 Наставление\n\nНе забывай, что этот мир временен, а Последняя жизнь вечна. Бойся Аллаха, возлагай на Него надежду и будь искренним во всех делах. Береги свой намаз, держись подальше от грехов, делай добро родителям и хорошо относись к людям.\n\nСовершив грех, не отчаивайся — покайся и вернись к Аллаху. Приобретая знание, бери его из надёжных источников и у людей знания. Поступай согласно тому, что знаешь, и не говори о том, чего не знаешь.\n\nКаждый день спрашивай себя: что я сделал сегодня ради Аллаха и как мне завтра приблизиться к Нему ещё больше?\n\nПусть Аллах покажет всем нам истину истиной и даст нам следовать ей, а ложь покажет ложью и даст нам сторониться её. Аминь."
  }
 }
];

function norm(text) {
  return " " + String(text || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ё/g, "е")
    .replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim() + " ";
}

const INDEX = [];
for (const entry of ENTRIES) {
  for (const [lang, list] of Object.entries(entry.triggers)) {
    for (const phrase of list) {
      const key = norm(phrase);
      if (key.trim()) INDEX.push({ entry, lang, key, words: key.trim().split(" ").length, len: key.trim().length });
    }
  }
}
INDEX.sort((a, b) => b.len - a.len);

export function cannedReply(message) {
  const raw = String(message || "");
  const text = norm(raw);
  const total = text.trim().split(" ").length;
  const hits = [];
  for (const item of INDEX) {
    if (!text.includes(item.key)) continue;
    // Tək sözlü ifadə yalnız qısa mesajda işləsin (məs. "nəsihət ver", "bidət nədir").
    if (item.words === 1 && total > 4) continue;
    // İki sözlü ifadə çox uzun cümlədə təsadüfi uyğunlaşmasın.
    if (item.words === 2 && total > 8) continue;
    hits.push(item);
  }
  if (!hits.length) return null;
  const best = hits[0];
  const same = hits.filter((h) => h.entry === best.entry);
  let lang = best.lang;
  if (lang === "az" || lang === "tr") {
    const hasAz = same.some((h) => h.lang === "az");
    const hasTr = same.some((h) => h.lang === "tr");
    if (/[əƏ]/.test(raw)) lang = "az";
    else if (hasAz && hasTr) lang = /\b(kac|hangi|gunde|vakit|nasil|nasihat|bid at|firka|rekat|kilmiyorum|kilmak)\b/.test(norm(raw).trim()) ? "tr" : "az";
    else lang = hasAz ? "az" : "tr";
  }
  if (/[\u0600-\u06FF]/.test(raw)) lang = "ar";
  else if (/[\u0400-\u04FF]/.test(raw)) lang = "ru";
  return best.entry.answers[lang] || best.entry.answers.az;
}
