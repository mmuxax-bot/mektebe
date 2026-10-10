// Qrammatika çıxarışlarında sələfə (əhli-sünnə əqidəsinə) zidd təvillərin göstərilməməsi üçün əllə yazılmış süzgəc.
// Əsas qayda (sahibin tələbi): «لن» əbədi inkar (تأبيد) bildirmir; buna görə axirətdə Allahı görməyi inkar etmək (müʿtəzilə / Zəməxşəri) olmaz.
//   * Çıxarışda «لن» ilə bağlı təbid iddiası varsa, yalnız eyni çıxarışda aydın RƏDD olduqda göstərilir
//     (İbn Malik: «ومن رأى النفي بلن مؤبدا فقوله اردد»; İbn Hişam/Muradi: «ولا يقتضي تأبيدا خلافا للزمخشري»...).
//   * Digər mübahisəli mövzular (Allahın sifətləri: istiva = istila, əl-yəd = qüdrət, Quran məxluqdur və s.) eyni qaydadır.
// Mətn burada dəyişdirilmir; çıxarış ya olduğu kimi göstərilir, ya da heç göstərilmir.
import { key } from "../_lugha.js";

// Bütün nümunələr gkey() ilə normallaşdırılmış mətnə tətbiq olunur: hərəkələr yoxdur, bütün həmzə formaları = ا, ة = ه, ى = ي.
const gkey = (t) => key(t).replace(/ء/g, "ا");
// near: iddianın ətrafında (±220 simvol) bu da olmalıdır (məs. «تأبيد» sözü yalnız «لن»/«نفي» ilə birlikdə iddiadır)
export const ASSERT = [
  { id: "lan-tabeed", re: /(?:تابيد|تاييد|مابد)/g, near: /(?:^|\s)(?:بلن|لن)(?:\s|$)|النفي|نفي|نفيها/, desc: "«لن» əbədi inkar bildirir" },
  { id: "istawa-istawla", re: /(?:استوي|الاستواء)\s*(?:بمعني|اي|يعني|معناه|هو|=)?\s*(?:استولي|الاستيلا)|بمعني\s+استولي/g, desc: "istiva = istila" },
  { id: "yad-qudra", re: /يد\s+(?:ال)?لهه?\s*(?:بمعني|اي|هي)?\s*(?:ال)?(?:قدر|نعم|قو)\w*/g, desc: "Allahın əli = qüdrət" },
  { id: "jaa-amr", re: /جاا?\s+ربك\s+(?:اي|بمعني)\s+امر|اي\s+جاا?\s+امر\s+ربك/g, desc: "«gəldi Rəbbin» = əmri" },
  { id: "quran-makhluq", re: /(?:القرا+ن|كلام\s+(?:ال)?لهه?)\s+(?:مخلوق|حادث)/g, desc: "Quran məxluqdur" },
];
// «يلزم أن يكون مؤبدا» (başında «لا» yoxdursa) mənbə mətnindəki səhvdir: həmişə bloklanır
const BAD_TYPO = /يلزم\s+ان\s+يكون\s+(?:نفيها\s+)?مابد/g;

// Aydın rədd işarələri (yalnız iddianın ətrafında yoxlanılır). «خلافا للزمخشري» tək başına KİFAYƏT DEYİL.
export const REFUTE = /(?:ولا\s+يلزم|لا\s+يلزم|لا\s+(?:ت|ي)(?:فيد|قتضي)|ولا\s+(?:ت|ي)(?:فيد|قتضي)|ليس[ت]?\s+(?:ل)?لتابيد|دعوي\s+(?:بلا|لا)\s+دليل|بلا\s+دليل|اعتقاد\s+باطل|يبطله|فقوله\s+اردد|اردد|مناف\s+للتحديد|لو\s+كان[ت]?\s+(?:موضوع[ةه]\s+)?(?:ل)?لتابيد|لم\s+يقيد\s+منفيها|قول\s+باطل|وهو\s+باطل|ليس\s+بصحيح|لا\s+حجه|ليس\s+كما\s+زعم)/;
const NEAR_BEFORE = 380;
const NEAR_AFTER = 520;

function around(text, idx, len, before, after) {
  return text.slice(Math.max(0, idx - before), idx + len + after);
}

/**
 * Çıxarışı yoxlayır. Qaytarır {ok, blocked:[id...], refutation:boolean}.
 *  ok=false: çıxarışda rədd olmadan sələfə zidd iddia var.
 *  refutation=true: çıxarış aydın şəkildə bu iddianı rədd edir (sıralamada üstünlük).
 */
export function checkExcerpt(text) {
  const k = gkey(text);
  const blocked = [];
  let refuted = false;
  for (const a of ASSERT) {
    a.re.lastIndex = 0;
    let m;
    while ((m = a.re.exec(k))) {
      if (m[0].length === 0) a.re.lastIndex++;
      if (a.near && !a.near.test(around(k, m.index, m[0].length, 220, 220))) continue;
      if (REFUTE.test(around(k, m.index, m[0].length, NEAR_BEFORE, NEAR_AFTER))) refuted = true;
      else blocked.push(a.id);
    }
  }
  BAD_TYPO.lastIndex = 0;
  let t;
  while ((t = BAD_TYPO.exec(k))) {
    const before = k.slice(Math.max(0, t.index - 6), t.index).trim();
    if (!/(?:^|\s)(?:و)?لا$/.test(before)) blocked.push("typo-lan-yalzam");
  }
  return { ok: blocked.length === 0, blocked: [...new Set(blocked)], refutation: refuted };
}

/** «لن» mövzusu: sorğuda tək «لن» sözü varsa */
export const isLanQuery = (text) => /(?:^|\s)لن(?:\s|$)/.test(gkey(text));
export { gkey };
