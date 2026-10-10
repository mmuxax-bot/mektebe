// Ümumi çıxarış sərhədi köməkçisi: kitab çıxarışı cümlə/paraqraf əvvəlindən başlasın, cümlə sonunda bitsin.
// Mətnə toxunmur, yalnız kəsmə yerlərini seçir (AI yoxdur).
const TERM = "[.؟!؛۔?;]"; // cümlə sonu
const CLOSE = "[»)\\]\"'”’}]*"; // cümlə sonundan sonra gələn bağlayıcı işarələr
const SENT_BREAK = new RegExp(`${TERM}${CLOSE}(?:[ \\t\\u00a0]+|\\n\\s*)|\\n\\s*`, "g");
const CLAUSE_BREAK = new RegExp(`[،,:]${CLOSE}[ \\t\\u00a0]+`, "g");
const LEAD_JUNK = /^[\s»)\]"'”’}.،,؛:؟!۔?;\-–—]+/;

/** pos-dan əvvəlki ən yaxın cümlə başlanğıcı (maxBack-dən uzaq deyilsə); yoxsa vergül/iki nöqtə, yoxsa söz sərhədi. */
export function sentenceStart(text, pos, maxBack = 600) {
  if (pos <= 0) return 0;
  const lo = Math.max(0, pos - maxBack);
  const seg = text.slice(lo, pos);
  let best = -1;
  let m;
  SENT_BREAK.lastIndex = 0;
  while ((m = SENT_BREAK.exec(seg))) best = lo + m.index + m[0].length;
  if (best < 0 && lo === 0) best = 0; // mətnin əvvəli
  if (best < 0) {
    CLAUSE_BREAK.lastIndex = 0;
    while ((m = CLAUSE_BREAK.exec(seg))) best = lo + m.index + m[0].length;
  }
  if (best < 0) {
    const sp = Math.max(seg.lastIndexOf(" "), seg.lastIndexOf("\n"));
    if (sp >= 0) best = lo + sp + 1;
    else best = pos; // pos tokenin başıdır
  }
  if (best > pos) best = pos;
  // sətirin əvvəlində qalan bağlayıcı işarə / durğu işarəsi atılır
  const lead = text.slice(best, pos).match(LEAD_JUNK);
  if (lead) best += lead[0].length;
  if (best > pos) best = pos;
  return best;
}

/** target-dən sonrakı ilk cümlə sonu (maxFwd daxilində), yoxsa target-dən əvvəl (minPos-dan sonra) sonuncu cümlə sonu, yoxsa söz sərhədi. Qaytarır: son indeks (exclusive). */
export function sentenceEnd(text, target, { minPos = 0, maxFwd = 350 } = {}) {
  const len = text.length;
  if (target >= len) return len;
  const re = new RegExp(`${TERM}${CLOSE}(?=\\s|$)|\\n`, "g");
  re.lastIndex = Math.max(0, target - 1);
  let m = re.exec(text);
  if (m && m.index + m[0].length - target <= maxFwd) return m.index + m[0].length;
  const seg = text.slice(minPos, target);
  re.lastIndex = 0;
  let back = -1;
  while ((m = re.exec(seg))) back = minPos + m.index + m[0].length;
  if (back > minPos) return back;
  const sp = text.lastIndexOf(" ", target);
  return sp > minPos ? sp : target;
}
