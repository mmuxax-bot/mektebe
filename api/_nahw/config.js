// Nəhv/sərf kitablarının sıralama ayarları (kitab id-ləri: shamela.ws/book/<id>).
// Qayda (sahibin istəyi): əhli-sünnə sələfinə yaxın müəlliflər önə çıxır; sadə, qısa dərs kitabları (Əcurrumiyyə, Qətr ən-Nədə, Əlfiyyə və şərhləri)
// ilk dəfə soruşanlar üçün üstündür. Çəkilər sıralama balını vuran əmsaldır (1 = təsirsiz). Dəyişmək üçün yalnız bu faylı redaktə edin.
export const AUTHOR_BOOST = {
  // İbn Hişam
  "11825": 1.35, // أوضح المسالك
  "6970": 1.45, // شرح قطر الندى
  "6969": 1.35, // شرح شذور الذهب
  "6972": 1.3, // مغني اللبيب
  "5352": 1.25, // نكت الإعراب = قواعد الإعراب
  "6978": 1.15,
  "6988": 1.15,
  "6991": 1.15,
  // İbn Malik
  "356": 1.45, // ألفية ابن مالك
  "13257": 1.2, // شرح التسهيل
  "10915": 1.2, // إيجاز التعريف
  "344": 1.1, // لامية الأفعال
  // İbn Əqil, İbn Əcurrum, İbn Qasim
  "9904": 1.45,
  "11371": 1.5, // الآجرومية
  "7368": 1.35, // حاشية الآجرومية (عبد الرحمن بن قاسم)
  // İbn əl-Hacib
  "122234": 1.2, // الكافية
  "22391": 1.2, // الشافية
  // Sibəveyh
  "23018": 1.15,
  // əl-Muradi
  "26099": 1.3, // الجنى الداني
  "9988": 1.3, // توضيح المقاصد
  // əl-Mukkudi, əl-Ğalayini
  "17719": 1.35,
  "3284": 1.5, // جامع الدروس العربية
  // əl-Muʿallimi
  "503": 1.3,
  "502": 1.3,
  "488": 1.3,
  "493": 1.3,
  "495": 1.3,
};

// Qısa, sadə dərs mətnləri: «ilk sual» (ətraflı/xilaf markeri olmayan) üçün əlavə üstünlük
export const DIDACTIC = new Set(["11371", "6970", "356", "9904", "3284", "7840", "4234", "7368", "122234", "38149", "11243", "5352"]);
export const DIDACTIC_BOOST = 1.25;
// Bu sözlər sorğuda varsa sual ətraflıdır: sadə kitab üstünlüyü tətbiq olunmur
export const ADVANCED_RE = /خلاف|الكوفي|البصري|مذهب|الخلاف|مسألة|علل|تعليل|دليل|ترجيح/;

// Axtarış sabitləri
export const MAX_RESULTS = 3;
export const EXCERPT_CHARS = 1200;
export const MIN_COVERAGE = 0.5; // nəticə səhifəsi sorğu terminlərinin ən azı bu payını əhatə etməlidir
