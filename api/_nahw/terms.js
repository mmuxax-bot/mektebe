// Qrammatika sorğularının aşkarlanması üçün əllə yazılmış termin siyahıları (ərəbcə) və latın/kiril yazılışları.
// Burada yalnız axtarış sözləri var; kitab mətni dəyişdirilmir və tərcümə edilmir.

// Birbaşa nəhv/sərf ifadəsi: tək başına qrammatika sualıdır (çərçivə sözü tələb olunmur)
export const PHRASES = [
  "كان وأخواتها", "إن وأخواتها", "ظن وأخواتها", "كاد وأخواتها", "أخوات كان", "أخوات إن", "أخوات ظن", "الأفعال الناقصة", "الأفعال الناسخة", "الحروف المشبهة بالفعل",
  "المبتدأ والخبر", "المبتدأ", "نائب الفاعل", "المفعول به", "المفعول المطلق", "المفعول لأجله", "المفعول فيه", "المفعول معه", "الحال والتمييز", "المضاف إليه",
  "حروف الجر", "حروف العطف", "حروف النصب", "حروف الجزم", "حروف الجر", "حروف المعاني", "حروف النفي", "حروف الاستفهام", "حروف النداء", "حروف الشرط",
  "الأفعال الخمسة", "الأسماء الخمسة", "الأسماء الستة", "الممنوع من الصرف", "ما لا ينصرف", "المثنى", "جمع المذكر السالم", "جمع المؤنث السالم", "جمع التكسير",
  "الفعل المضارع", "الفعل الماضي", "فعل الأمر", "اسم الفاعل", "اسم المفعول", "صيغ المبالغة", "اسم التفضيل", "اسم الفعل", "اسم المكان", "اسم الزمان", "اسم الآلة",
  "لا النافية للجنس", "ما الحجازية", "لات", "إن المخففة", "أن المصدرية", "أن المخففة", "لام التعليل", "لام الجحود", "واو المعية", "فاء السببية", "الواو الزائدة",
  "الاسم المقصور", "الاسم المنقوص", "الاسم الممدود", "العدد والمعدود", "الأسماء الموصولة", "أسماء الإشارة", "أسماء الأفعال", "أسلوب الشرط", "أسلوب الاستثناء",
  "الاستثناء", "التعجب", "المدح والذم", "التقاء الساكنين", "همزة الوصل", "همزة القطع", "الميزان الصرفي", "الإعلال", "الإبدال", "الفعل المعتل", "الأفعال المعتلة",
  "الفعل المبني للمجهول", "الفعل المتعدي", "الفعل اللازم", "الجملة الاسمية", "الجملة الفعلية", "شبه الجملة", "الجار والمجرور", "المعرب والمبني", "علامات الإعراب",
  "علامات الرفع", "علامات النصب", "علامات الجر", "علامات الجزم", "أقسام الكلام", "الكلمة والكلام", "علم النحو", "علم الصرف", "علم التصريف", "الأفعال المزيدة",
  "عطف البيان", "عطف النسق", "الاسم الموصول", "ضمير الفصل", "ضمير الشأن", "كم الخبرية", "كم الاستفهامية", "إعراب الفعل المضارع", "الفعل المضارع المرفوع", "نصب المضارع", "جزم المضارع",
  "الأسماء المعربة", "الأسماء المبنية", "الاسم المعرب", "المرفوعات", "المنصوبات", "المجرورات", "المجزومات", "التوابع",
  "علامات الاسم", "علامات الفعل", "علامات الحرف", "النكرة والمعرفة", "النكرة", "المعرفة والنكرة", "اسم الإشارة", "أسماء الاستفهام", "أسماء الشرط", "المنادى", "النداء والمنادى", "الصفة المشبهة", "أفعال المقاربة", "أفعال الشروع", "أفعال الرجاء", "أفعال القلوب", "أفعال التحويل", "أفعال المدح والذم", "نعم وبئس", "حبذا", "الاشتغال", "التنازع", "نون التوكيد", "نون الوقاية", "نون النسوة", "تاء التأنيث", "ألف الإطلاق", "المضارع المنصوب", "المضارع المجزوم", "نواصب المضارع", "جوازم المضارع", "الجزم", "النصب", "الرفع", "الجر", "البناء", "العطف", "المعطوف", "التوكيد اللفظي", "التوكيد المعنوي", "البدل", "النعت", "النعت والمنعوت", "صاحب الحال", "التمييز", "تمييز العدد", "العدد", "الأعداد", "الإضافة", "الإضافة اللفظية", "الإضافة المعنوية", "الظرف", "ظرف الزمان", "ظرف المكان", "المصدر", "المصدر المؤول", "المصدر الصريح", "مصدر الميمي", "المصدر الميمي", "المصدر الصناعي", "الترخيم", "الندبة", "الاستغاثة", "الإغراء", "التحذير", "الاختصاص", "الاستفهام", "النفي", "النهي", "القسم", "جواب الشرط", "فعل الشرط", "جواب القسم", "اسم كان", "خبر كان", "اسم إن", "خبر إن", "خبر المبتدأ", "تقديم الخبر", "حذف الخبر", "حذف المبتدأ", "الفعل الصحيح", "الفعل المجرد", "الفعل المزيد", "الفعل الجامد", "الفعل المتصرف", "الفعل الأجوف", "الفعل الناقص", "الفعل المثال", "الفعل اللفيف", "الفعل المهموز", "الفعل المضعف", "الأفعال الجامدة", "المذكر والمؤنث", "المؤنث", "التذكير والتأنيث", "التثنية", "الجمع", "جموع القلة", "جموع الكثرة", "صيغة منتهى الجموع", "منتهى الجموع", "النسبة", "التصغير", "الإمالة", "الوقف", "المشتقات", "الجامد والمشتق", "أوزان الفعل", "أوزان المصادر", "أبنية المصادر", "الإعراب التقديري", "الإعراب المحلي", "الإعراب الظاهر", "ألقاب الإعراب", "ألقاب البناء", "الضمير المتصل", "الضمير المنفصل", "الضمير المستتر", "العائد", "جملة الصلة", "الجمل التي لها محل من الإعراب", "الجمل التي لا محل لها من الإعراب", "ما التعجبية", "أفعل التفضيل", "لا النافية", "لا الناهية", "ما النافية", "حروف الزيادة", "الحروف الزائدة", "التعدية", "المفعولات", "المفاعيل",
];

// Aydın qrammatika sözü, amma tək başına qeyri-müəyyən deyil: sual çərçivəsi (ما/كيف/شرح...) ilə qəbul olunur
export const UNIQUE_SINGLE = ["الفاعل", "المفعول", "مبتدأ", "مبتدأ", "مجرور", "مرفوع", "منصوب", "مجزوم", "مضاف", "إعراب", "الإعراب", "التصريف", "الصرف", "النحو", "المبني", "المعرب", "الضمائر", "الضمير", "التوكيد", "الاشتقاق", "التصغير", "النسب", "الإدغام", "التمييز", "النعت", "البدل", "المنادى", "الاشتغال", "التنازع", "الترخيم", "الندبة", "الاستغاثة", "المعطوف", "المنعوت", "مفعول", "فاعل", "تمييز", "منادى", "المضارع", "الماضي"];
// Adi danışıqda da işlənən sözlər: yalnız güclü işarə («إعراب»، «في النحو»...) varsa qrammatika sayılır
export const AMBIG_SINGLE = ["الحال", "الخبر", "الفعل", "الاسم", "الحرف", "الصفة", "النعت", "المصدر", "الظرف", "البدل", "التمييز", "الإضافة", "النداء", "الوقف", "الابتداء", "الجملة", "الجمع", "المفرد", "المضارع", "الماضي", "الأمر", "الشرط", "الجواب", "الصلة", "الوصل"];

// Hərflər (ədatlar): «معنى لن»، «ماذا تفيد لن»، «إعراب لن» və s.
export const PARTICLES = ["لن", "لم", "لما", "لا", "ما", "إن", "أن", "كي", "حتى", "إذن", "إذا", "لعل", "ليت", "كأن", "لكن", "ثم", "أو", "بل", "هل", "قد", "سوف", "السين", "الباء", "اللام", "الواو", "الفاء", "الكاف", "من", "إلى", "في", "على", "عن", "إلا", "غير", "سوى", "ربما", "لولا", "لوما", "أما", "إما", "أم", "كلا", "نعم", "بلى", "ألا", "أنى", "مذ", "منذ", "عدا", "خلا", "حاشا", "لات", "ذو"];
// Hərf sualı üçün axtarışı genişləndirən sözlər (hərfin özü çox rast gəlindiyi üçün indekslənməyə bilər)
export const PARTICLE_EXPAND = {
  لن: ["النفي", "الاستقبال", "ينصب", "المضارع", "تأبيد"],
  لم: ["النفي", "يجزم", "المضارع", "الماضي"],
  لما: ["النفي", "الجزم", "الظرفية", "الاستثناء"],
  لا: ["النفي", "النهي", "النافية", "للجنس"],
  حتى: ["الجر", "العطف", "الابتداء", "الغاية", "ينصب"],
  كي: ["التعليل", "ينصب", "المضارع"],
  إذن: ["ينصب", "المضارع", "الجواب", "الجزاء"],
};

// Latın/kiril yazılışlar (foldLat: kiçik hərf, ə→e, ı→i, ö→o, ü→u, ş→s, ç→c, ğ→g, apostrof silinir) -> ərəbcə axtarış ifadəsi.
// uniq: true = tək başına (ərəb/nəhv sözü olmadan) qrammatika sayılır.
export const LAT_TERMS = [
  { re: /\b(?:kana|kane|kan|kyana)\b.{0,16}\b(?:baci\w*|kardes\w*|qardas\w*|sisters?|akhawat\w*|ehavat\w*|sestr\w*|sestry|aхawat\w*)|\bкана\b.*сёстр|\bкана\b.*сестр/, ar: "كان وأخواتها", uniq: true },
  { re: /\b(?:inne|inna|enne|anna)\b.{0,16}\b(?:baci\w*|kardes\w*|qardas\w*|sisters?|akhawat\w*|sestr\w*)|\bинна\b.*сестр/, ar: "إن وأخواتها", uniq: true },
  { re: /\b(?:zanne|zanna|zann)\b.{0,16}\b(?:baci\w*|kardes\w*|qardas\w*|sisters?|akhawat\w*)/, ar: "ظن وأخواتها", uniq: true },
  { re: /mubt[ae]d[ae]|mubted[ae]|мубтада/, ar: "المبتدأ", uniq: true },
  { re: /\b(?:xeber|khabar|haber|habar|хабар)\b/, ar: "الخبر", uniq: false },
  { re: /\b(?:ism(?:ul|ol)?\s*(?:ul|ol)?\s*fa[a']?il|esm(?:ul)?\s*fail|ismul\s*fail)\b/, ar: "اسم الفاعل", uniq: true },
  { re: /\bnaib\s*(?:ul|ol)?\s*fa[a']?il|nai?b\s+fail|нaиб/, ar: "نائب الفاعل", uniq: true },
  { re: /\b(?:fa+il|fail|faail|faʿil|фаиль|фаил)\b/, ar: "الفاعل", uniq: false },
  { re: /\b(?:mef|maf)['u]?ul\s*(?:mutlaq|mutlak)|mef.ul\s+mutlak|maf.ul\s+mutlaq/, ar: "المفعول المطلق", uniq: true },
  { re: /\b(?:mef|maf|mef'|maf')?[uö]?ul\s*bih\b|\b(?:mef|maf)['u]?ul\b|\bмаф.?уль\b/, ar: "المفعول به", uniq: false },
  { re: /\b(?:herf|harf|huruf|hurufu|хуруф)\s*(?:i|ul|ol|al|el)?[-\s]*(?:cer\w*|jarr\w*|jar\w*|джарр)|\bharf\s+of\s+jarr|prepositional\s+particles/, ar: "حروف الجر", uniq: true },
  { re: /\b(?:mensub|mansub|mənsub|mensup)\b|\bмансуб\b/, ar: "المنصوب", uniq: true },
  { re: /\b(?:mecrur|majrur|macrur|маджрур)\b/, ar: "المجرور", uniq: true },
  { re: /\b(?:merfu|marfu|merfuu|марфу)\w*/, ar: "المرفوع", uniq: true },
  { re: /\b(?:meczum|majzum|mecjum|маджзум)\b/, ar: "المجزوم", uniq: true },
  { re: /\b(?:temiz|tamyiz|tamyeez|tamiz|тамйиз)\b/, ar: "التمييز", uniq: false },
  { re: /\b(?:bedel|badal|бадаль)\b/, ar: "البدل", uniq: false },
  { re: /\b(?:muzaf|mudaf|mudaf ileyh|muzaf ileyh|мудаф)\w*/, ar: "المضاف إليه", uniq: true },
  { re: /\b(?:istisna|istithna|истисна)\b/, ar: "الاستثناء", uniq: false },
  { re: /\bnida\b|\bnidaa\b|\bнида\b/, ar: "النداء", uniq: false },
  { re: /(?:esma|asma|asmaa)[-'\s]*(?:ul|ol|ul-|al)?[-'\s]*hamse|asma\W{0,3}khamsa|пять\s+имён/, ar: "الأسماء الخمسة", uniq: true },
  { re: /(?:ef.al|af.al|efal)[-'\s]*(?:ul|ol)?[-'\s]*hamse|af.?al\W{0,3}khamsa/, ar: "الأفعال الخمسة", uniq: true },
  { re: /(?:memnu|mamnu)['\s]*(?:min|un)?\s*(?:es|as)?[-\s]*sarf|ممنوع من الصرف|ghayr\s+munsarif|ğeyri\s+munsarif|gayri\s+munsarif/, ar: "الممنوع من الصرف", uniq: true },
  { re: /\bhal\b|\bhalin\b|\bхаль\b/, ar: "الحال", uniq: false },
  { re: /\btemyiz\w*|\btamyiz\w*|\btemyez\w*/, ar: "التمييز", uniq: true },
  { re: /\b(?:mef|maf)\W?u?l\w*\s*(?:u|i|ul|un|ün)?\s*(?:leh|lah|lehu|lahu|li\s*ecl\w*|liajlih\w*|ecl\w*)\b/, ar: "المفعول لأجله", uniq: true },
  { re: /\b(?:mef|maf)\W?u?l\w*\s*(?:u|i|ul|un)?\s*(?:fih|fihi)\b/, ar: "المفعول فيه", uniq: true },
  { re: /\b(?:mef|maf)\W?u?l\w*\s*(?:u|i|ul|un)?\s*(?:meah|maah|meahu|maahu|mea|maa)\b/, ar: "المفعول معه", uniq: true },
  { re: /\b(?:ism|esm)\W*(?:i|ul|ol|u)?\W*(?:fail|faail|fa.il)\b/, ar: "اسم الفاعل", uniq: true },
  { re: /\b(?:ism|esm)\W*(?:i|ul|ol|u)?\W*(?:mef|maf)\W?u?l\b/, ar: "اسم المفعول", uniq: true },
  { re: /\b(?:ism|esm)\W*(?:i|ul|ol|u)?\W*(?:tefdil|tafdil|tefzil)\b/, ar: "اسم التفضيل", uniq: true },
  { re: /\b(?:ism|esm)\W*(?:i|ul|ol|u)?\W*(?:isare|ishara|isharat|isaret)\b|\bisare\s+isim/, ar: "اسم الإشارة", uniq: true },
  { re: /\b(?:ism|esm|esma|asma)\W*(?:i|ul|ol|u)?\W*(?:mevsul|mawsul|mausul)\w*/, ar: "الاسم الموصول", uniq: true },
  { re: /\bsifet\w*\s*(?:i|u)?\s*(?:musebbehe|mushabbaha|musebbehe)\b/, ar: "الصفة المشبهة", uniq: true },
  { re: /\b(?:muzari|mudari|mudare|muzare)\w*\b/, ar: "الفعل المضارع", uniq: true },
  { re: /\b(?:mazi|madi|mazi\s+fe\w*)\b.*\bfe\w*l\b|\bfe\w*l\w*\s*(?:i|u)?\s*mazi\b|\bkecmis\s+zaman\s+fe/, ar: "الفعل الماضي", uniq: true },
  { re: /\bemr\s+fe\w*l\w*|\bfe\w*l\w*\s*(?:i|u)?\s*emr\b|\bamr\s+fi.?l/, ar: "فعل الأمر", uniq: true },
  { re: /\bmusenna\w*|\bmuthanna\b|\bmusanna\b|\bdual\b/, ar: "المثنى", uniq: true },
  { re: /\bcem\w*\s*(?:i|u)?\s*(?:muzekker|mudhakkar|muzakkar)\w*\s*salim\w*|\bjam.?\s*mudhakkar\s*salim/, ar: "جمع المذكر السالم", uniq: true },
  { re: /\bcem\w*\s*(?:i|u)?\s*(?:muennes|muannath|muennas)\w*\s*salim\w*|\bjam.?\s*muannath\s*salim/, ar: "جمع المؤنث السالم", uniq: true },
  { re: /\bcem\w*\s*(?:i|u)?\s*teksir\w*|\bjam.?\s*taksir|\bsiniq\s+cem/, ar: "جمع التكسير", uniq: true },
  { re: /\b(?:qeyri|geyri|gayri|gheyri|ghayr)\W*munsarif\w*|\bmunsarif\b/, ar: "الممنوع من الصرف", uniq: true },
  { re: /\bnet\b|\bna.?t\b|\bmenut\b/, ar: "النعت", uniq: false },
  { re: /\batf\b|\batfu\w*|\bmatuf\b|\bmatuf\w*/, ar: "العطف", uniq: false },
  { re: /\btekid\w*|\btawkid\b|\btevkid\w*|\bte.kid\b/, ar: "التوكيد", uniq: false },
  { re: /\bizafe\w*|\bidafa\w*|\bizafet\w*/, ar: "الإضافة", uniq: false },
  { re: /\bmunada\w*|\bmunaada\b/, ar: "المنادى", uniq: true },
  { re: /\bsert\s+(?:cumle|uslub|edat|herf)\w*|\bshart\b/, ar: "أسلوب الشرط", uniq: false },
  { re: /\bl[ae]\s+(?:i\s+)?nafiy\w*|\bl[ae]\W*(?:yi\s+)?nafiy\w*/, ar: "لا النافية للجنس", uniq: true },
  { re: /\btecessub\b|\btaajjub\b|\bteaccub\w*|\btaaccub\w*/, ar: "التعجب", uniq: false },
  { re: /\bistigal\b|\bishtighal\b|\bistiqal\b/, ar: "الاشتغال", uniq: true },
  { re: /\btenazu\w*|\btanazu\w*/, ar: "التنازع", uniq: true },
  { re: /\bmesder\w*|\bmasdar\w*|\bmesdar\w*/, ar: "المصدر", uniq: false },
  { re: /\bzerf\w*|\bzarf\w*/, ar: "الظرف", uniq: false },
  { re: /\bzamir\w*|\bzemir\w*|\bdamir\w*|\bezmir\b/, ar: "الضمائر", uniq: false },
  { re: /\bnekre\w*|\bnakira\w*|\bmarife\w*|\bma.?rifa\w*/, ar: "النكرة والمعرفة", uniq: true },
  { re: /\bmebni\w*|\bmabni\w*|\bmu.?reb\b|\bmurab\b/, ar: "المعرب والمبني", uniq: true },
  { re: /\badad\b|\beded\w*\s+(?:ve\s+)?madud|\bmadud\b|\bmedud\b/, ar: "العدد والمعدود", uniq: true },
  { re: /\bsehih\b.*\bfil\b|\bmuetel\b|\bmuatal\b|\bmu'?tel\b/, ar: "الفعل المعتل", uniq: false },
];
// Ərəb dilinin qrammatikasına işarə edən latın/kiril sözlər (cue)
export const LAT_CUE = /\b(?:erebce|arapca|arabic|arabcha|arab\w*|erab\w*|ereb\w*|nehv\w*|nahv\w*|nahiv\w*|nahw\w*|sarf\w*|serf\w*|tasrif\w*|i.?rab\w*|ierab\w*|qram+at\w*|gram+at\w*|grammar\w*|grammatik\w*|dilbilgisi\w*|sintaksis|syntax)\b|араб|нахв|сарф|иъраб|грамматик/i;

// ---- Əlavə latın/kiril terminlər (2026-10): yalnız LAT_TERMS heç nə tapmayanda yoxlanır (köhnə cavablar dəyişmir).
// Mətn əvvəlcə latSkel() ilə sadələşir: diakritika (â, î ...), defis/apostrof -> boşluq, x -> h, «ul/ut/us/ur/un/ud/uz/ush» artikl qovuşmaları saxlanır.
// Hamısı fərqləndirici terminlərdir (uniq): ərəb/qrammatika sözü olmadan da qəbul olunur. Hər ifadə nəhv indeksində yoxlanıb (scripts/coverage).
export function latSkel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC")
    .replace(/ё/g, "е")
    .replace(/[’'`´ʻʼ‘ʿʾ-]/g, " ")
    .replace(/x/g, "h")
    .replace(/\s+/g, " ")
    .trim();
}
const A = "(?:\\s*(?:u[lt sdrnzh]?|i|e?l|a[lt]?|ush|ud|un)\\s*)?"; // ismu(l)/ismu(t)/ism-i ... qovuşma
const R = (src, ar) => ({ re: new RegExp(src, "u"), ar, uniq: true });
export const LAT_TERMS_MORE = [
  R(`(?:^|\\s)nai?bu?${A}fa+[ie]?l`, "نائب الفاعل"),
  R(`(?:^|\\s)m[ae]f?\\s?u+l(?:un|u|i)?\\s*bih[ie]?(?:\\s|$)`, "المفعول به"),
  R(`(?:^|\\s)m[ae]f?\\s?u+l(?:un|u|i)?\\s*mut?l[ae][qkg]`, "المفعول المطلق"),
  R(`(?:^|\\s)m[ae]f?\\s?u+l(?:un|u|i)?\\s*li\\s*e?[cj]l`, "المفعول لأجله"),
  R(`(?:^|\\s)m[ae]f?\\s?u+l(?:un|u|i)?\\s*fih[ie]?(?:\\s|$)`, "المفعول فيه"),
  R(`(?:^|\\s)m[ae]f?\\s?u+l(?:un|u|i)?\\s*m[ae]ah[ue]?(?:\\s|$)`, "المفعول معه"),
  R(`(?:^|\\s)(?:c[ae]r+|jar+|cer)\\s*h[ae]rf|h[ae]rf\\w*\\s*(?:i\\s*|u[lc]\\s*)?(?:c[ae]r+|jar+)(?:\\s|$)|\\bprepositions?\\b`, "حروف الجر"),
  R(`(?:^|\\s)n[ae]sb\\s*h[ae]rf|h[ae]rf\\w*\\s*(?:i\\s*|un\\s*)?n[ae]sb|nawasib|nevasib|\\bsubjunctive\\b`, "النواصب"),
  R(`(?:^|\\s)[cj][ae]zm\\s*h[ae]rf|h[ae]rf\\w*\\s*(?:i\\s*|ul\\s*)?[cj][ae]zm|jawazim|cevazim|\\bjussive\\b`, "الجوازم"),
  R(`(?:^|\\s)atf\\s*h[ae]rf|h[ae]rf\\w*\\s*(?:i\\s*|ul\\s*)?atf|\\bconjunctions?\\b`, "حروف العطف"),
  R(`(?:^|\\s)[ae]f\\s?al${A}h[ae]ms[ae]|five verbs|пять глагол`, "الأفعال الخمسة"),
  R(`(?:^|\\s)[ae]sma${A}h[ae]ms[ae]|five nouns|пять имен`, "الأسماء الخمسة"),
  R(`(?:qeyri|geyri|gayri|gheyri|ghayr)\\s*m[uü]n?s[ae]rif|\\bdiptotes?\\b|мамну|неизменяем`, "الممنوع من الصرف"),
  R(`(?:^|\\s)(?:fe|fi)[ie]?l\\w*\\s*(?:i\\s*)?(?:madi|mazi)(?:\\s|$)|(?:^|\\s)(?:madi|mazi)\\s*fi?[ie]?l|past tense|прошедшее время`, "الفعل الماضي"),
  R(`(?:^|\\s)(?:fe|fi)[ie]?l\\w*\\s*(?:i\\s*)?mu?[dz]ari|(?:^|\\s)mu?[dz]ari\\s*fi?[ie]?l|present tense verb|imperfect verb|настояще.{0,4}время`, "الفعل المضارع"),
  R(`(?:^|\\s)(?:emr|amr|emir)\\s*fi?[ie]?l|fi?[ie]?l\\w*\\s*(?:i\\s*|ul\\s*)?(?:emr|amr)(?:\\s|$)|imperative verb|повелительн`, "فعل الأمر"),
  R(`(?:^|\\s)(?:ism|esm)${A}t[ae]f[dz]il|\\belatives?\\b|comparative and superlative`, "اسم التفضيل"),
  R(`(?:^|\\s)(?:ism|esm|esma|asma)${A}m[aeo]v?w?s[uo]l|relative pronouns?|относительн.{0,3} местоимен`, "الاسم الموصول"),
  R(`(?:^|\\s)(?:ism|esm|esma|asma)${A}(?:isar|ishar)|demonstrative pronouns?|указательн.{0,3} местоимен`, "اسم الإشارة"),
  R(`(?:^|\\s)(?:ism|esm)${A}fa+[ie]?l(?:\\s|$)|active participle`, "اسم الفاعل"),
  R(`(?:^|\\s)(?:ism|esm)${A}m[ae]f\\s?u+l|passive participle`, "اسم المفعول"),
  R(`(?:^|\\s)sif[ae]t\\w*\\s*(?:i\\s*)?mu?s[ae]b+[ie]h|sifa mushabbaha`, "الصفة المشبهة"),
  R(`(?:^|\\s)(?:sert|shart)\\s*(?:cuml|cumlesi|cumle|edat|herf|adat|jumla)|conditional sentence|условн.{0,3} предложен`, "أدوات الشرط"),
  R(`(?:^|\\s)i\\s?rab\\w*(?:\\s|$)|(?:^|\\s)ierab|\\bi.?raab|иъраб|ирааб|ираб`, "الإعراب"),
  R(`(?:^|\\s)m[ae]bni\\s*(?:ve|and|и)?\\s*mu?\\s?r[ae]b|mabni and mu.?rab|мабни`, "المعرب والمبني"),
  R(`(?:^|\\s)t[ae]srif|(?:^|\\s)sarf\\s*(?:ilmi|elmi)|morphology|морфолог`, "التصريف"),
  R(`(?:^|\\s)t[ae]my(?:i+|e+)[zs]|tamyeez|tamy?eez|тамйиз|тамииз`, "التمييز"),
  R(`(?:^|\\s)(?:ha+l|hal)\\s+(?:in arabic|nahv|nehv|nahw|arapca|erebce|ereb)|хаал|(?:^|\\s)хал в араб`, "الحال"),
  R(`(?:^|\\s)(?:idafe|idafa|izafe|izafet)|isim tamlamas|genitive construct|идафа|изафет`, "الإضافة"),
  R(`subject and predicate|mubtada wa khabar|(?:^|\\s)мубтада`, "المبتدأ والخبر"),
  R(`(?:^|\\s)(?:fa+[ie]?l|fail)\\s+(?:in arabic|arapca|erebce|nahv|nehv)|(?:^|\\s)фа.?иль|(?:^|\\s)фаил`, "الفاعل"),
  R(`(?:^|\\s)(?:kana|kane|кана)\\s.{0,14}(?:baci|kardes|qardas|sister|akhawat|ehavat|с[её]стр)`, "كان وأخواتها"),
  R(`(?:^|\\s)(?:inne|inna|enne|инна)\\s.{0,14}(?:baci|kardes|qardas|sister|akhawat|с[её]стр)`, "إن وأخواتها"),
  R(`(?:^|\\s)(?:zanne|zanna|занна)\\s.{0,14}(?:baci|kardes|qardas|sister|akhawat|с[её]стр)`, "ظن وأخواتها"),
  R(`мафу?.?ль\\s*бих|maf?\\s?ul\\s*bih`, "المفعول به"),
  R(`(?:^|\\s)(?:la|lə)\\s*nafiy+[ae]\\s*(?:li\\s*)?(?:l\\s*)?(?:cins|jins)|negation of the genus`, "لا النافية للجنس"),
  R(`(?:^|\\s)(?:t[ae]kid|tawkid|tevkid)(?:\\s|$)|emphasis in arabic grammar`, "التوكيد"),
  R(`(?:^|\\s)(?:b[ae]d[ae]l)(?:\\s+in arabic|\\s+nahv|\\s+nehv)|badal in arabic`, "البدل"),
  R(`(?:^|\\s)(?:munada|munadi|nida)(?:\\s|$)|vocative|мунада`, "المنادى"),
  R(`(?:^|\\s)(?:musenna|musanna|muthanna|dual in arabic)|двойственн`, "المثنى"),
  R(`(?:^|\\s)c[ae]m\\w*\\s*(?:i\\s*)?t[ae]ks[ie]r|broken plural|ломан.{0,3} множеств`, "جمع التكسير"),
  R(`(?:^|\\s)c[ae]m\\w*\\s*(?:i\\s*)?muz[ae]k+[ae]r|sound masculine plural`, "جمع المذكر السالم"),
  R(`(?:^|\\s)c[ae]m\\w*\\s*(?:i\\s*)?mu[ae]n+[ae]s|sound feminine plural`, "جمع المؤنث السالم"),
  R(`(?:^|\\s)(?:nekre|nakira)\\s*(?:ve|and|и)?\\s*(?:marif|marife|maarifa)|definite and indefinite`, "النكرة والمعرفة"),
  R(`(?:^|\\s)(?:zamir\\S*|damir|dama.?ir)\\s+(?:in arabic|nahv|nehv|arapca|erebce)|pronouns? in arabic|местоимения в араб`, "الضمائر"),
  R(`(?:^|\\s)(?:istisna|istisnaa)\\s+(?:in arabic|nahv|nehv|arapca|erebce)|exception in arabic|исключени.{0,4} в араб`, "الاستثناء"),
  R(`(?:^|\\s)(?:te+c+ub|teaccub|taajjub|ta.?ajjub)`, "التعجب"),
  R(`(?:^|\\s)(?:adad|eded)\\s*(?:ve|and)?\\s*(?:madud|maadud)|numbers in arabic grammar`, "العدد والمعدود"),
];
