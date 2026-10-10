// Hədis axtarışı üçün ortaq tokenləşdirmə (həm indeks qurulanda, həm sorğuda eyni qayda).
// Ərəbcə: hərəkələr/tətvil atılır, alif/yaa/taa-marbuta variantları birləşir, həmzə atılır, yüngül soyma (ال، و/ف əvəzliyi, cəm/müənnəs şəkilçisi).
const MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u0610-\u061A\u08D3-\u08FF\u200c-\u200f]/g;

/** Ərəbcə açar: hərəkələr atılır, أ إ آ ٱ -> ا, ؤ -> و, ئ -> ي, ء atılır, ى -> ي, ة -> ه */
export function norm(s) {
  return String(s || "")
    .replace(MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ڪک]/g, "ك")
    .replace(/[یې]/g, "ي");
}

const SUFFIX = ["هما", "ات", "ون", "ين", "ان", "ها", "هم", "هن", "كم", "نا", "ه", "ي"];
const SUF_MIN = { ات: 2, ه: 2 };

/** Normallaşdırılmış tək söz -> yüngül kök-forma */
export function stem(t) {
  let s = t;
  const m = s.match(/^(?:وال|فال|بال|كال|لل|ال)/);
  if (m && s.length - m[0].length >= 3) s = s.slice(m[0].length);
  else if (s.length >= 5 && /^[وف]/.test(s)) s = s.slice(1);
  else if (s.length >= 5 && /^[بلك]/.test(s)) s = s.slice(1);
  if (s.length >= 3) {
    for (const x of SUFFIX) {
      if (s.endsWith(x) && s.length - x.length >= (SUF_MIN[x] || 3)) {
        s = s.slice(0, -x.length);
        break;
      }
    }
  }
  return s;
}

const AR_SPLIT = /[^\u0621-\u064A]+/;
/** Mətn -> sıralı stem token siyahısı */
export function tokens(text) {
  return norm(text)
    .split(AR_SPLIT)
    .filter((t) => t.length > 1)
    .map(stem)
    .filter((t) => t.length > 1);
}

/** Mətn -> [{t, start, end}] orijinal mətndəki mövqelərlə (kəsmə/seçmə üçün); tokens() ilə eyni tokenlər */
export function tokenSpans(text) {
  const out = [];
  const re = /[\u0621-\u064A\u0671-\u06D3][\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640]*/g;
  let m;
  while ((m = re.exec(text))) {
    const n = norm(m[0]);
    if (n.length < 2) continue;
    const t = stem(n);
    if (t.length < 2) continue;
    out.push({ t, start: m.index, end: m.index + m[0].length });
  }
  return out;
}
