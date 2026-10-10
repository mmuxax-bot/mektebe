// Mesajın dini sual olub-olmadığını təyin edir (AI-yə gedən suallar üçün). Hazır cavab verənlər (tövhid, ayə, Quran lüğəti,
// dini hazır cavablar, dinReply) zatən dinidir və burada yoxlanılmır. Kod, salam, hesab, vaxt, brend dini sayılmır.
const fold = (t) =>
  String(t || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[’'`´ʻʼ‘]/g, "");

const LAT =
  /\b(islam\w*|muslim\w*|musulman\w*|muselman\w*|quran\w*|kuran\w*|koran\w*|hadis\w*|hedis\w*|hadith\w*|sunnet\w*|sunnah\w*|fiqh\w*|fikh\w*|seriat\w*|shariat\w*|sharia\w*|namaz\w*|salah\b|oruc\w*|ruze\w*|ramazan\w*|ramadan\w*|ramadhan\w*|zekat\w*|zakat\w*|hecc\b|hacc\b|hajj\w*|umre\w*|umrah\w*|destamaz\w*|abdest\w*|wudu\w*|gusl\w*|taharet\w*|haram\w*|helal\w*|halal\w*|fetva\w*|fatwa\w*|tefsir\w*|tafsir\w*|mezheb\w*|madhab\w*|peyqember\w*|peygamber\w*|resulullah\w*|muhammed\w*|muhammad\w*|ayet\w*|ayah\w*|tevhid\w*|tovhid\w*|tawhid\w*|tawheed\w*|akaid\w*|eqide\w*|aqida\w*|aqeedah\w*|gunah\w*|sevab\w*|savab\w*|cennet\w*|cehennem\w*|cenet\w*|allah\w*|rebb\w*|rabb\w*|iman\b|imani|ibadet\w*|ibadat\w*|worship\w*|imam\w*|seytan\w*|sheytan\w*|shaytan\w*|kafir\w*|kufr\w*|kufur\w*|musrik\w*|shirk\w*|bidat\w*|sahabe\w*|selef\w*|salaf\w*|sahih\w*|dua\b|duasi|duanin|ahiret\w*|axiret\w*|qiyamet\w*|qiyamat\w*|mehsher\w*|mehr\b|nikah\w*|talaq\w*|ferz\w*|vacib\w*|sunnet\w*|mekruh\w*|mustehab\w*)\b/;
const AR = /الله|اسلام|إسلام|الإسلام|قرآن|القرآن|حديث|الحديث|صلاة|الصلاة|صوم|صيام|زكاة|الحج|حلال|حرام|فقه|توحيد|عقيدة|وضوء|رسول|نبي|النبي|شريعة|السنة|إيمان|الايمان|دعاء|الجنة|الجنه|النار|صحابة|فتوى|تفسير|مسلم|ركعات|ربنا|ربي/;
const RU = /аллах|ислам|мусульман|коран|хадис|сунн|намаз|рамадан|закят|хадж|умр|харам|халяль|фетв|тафсир|пророк|шариат|акида|таухид|ширк|рай\b|ад\b/i;
const EN = /\b(islam\w*|muslim\w*|quran|koran|hadith\w*|sunnah|allah|prayer times|salah|ramadan|zakat|hajj|umrah|halal|haram|fatwa|tafsir|sharia|prophet muhammad|aqeedah|tawheed|tawhid|shirk|bidah|religion|religious|sin\b|paradise|hellfire|jannah)\b/i;

const CODE = /\b(kod|code|python|javascript|js|html|css|sql|script|funksiya|function|program\w*|algoritm\w*|regex|json|api|bug|debug|react|node|java|c\+\+)\b/;

export function isReligious(message, mode = "chat") {
  const raw = String(message || "");
  if (!raw.trim()) return false;
  if (mode === "code") return false;
  const q = fold(raw);
  if (CODE.test(q)) return false;
  return LAT.test(q) || AR.test(raw) || RU.test(raw) || EN.test(raw);
}
