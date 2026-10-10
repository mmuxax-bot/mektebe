// Ortaq normallaşdırma: ərəbcə (hərəkələr, alif/yaa/taa-marbuta variantları) və latın/kiril yazılar (böyük-kiçik hərf, diakritika).
const AR_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u0610-\u061A\u08D3-\u08FF\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** Ərəbcə açar: hərəkələr/tətvil atılır, أ إ آ ٱ -> ا, ؤ -> و, ئ -> ي, ء atılır, ى -> ي, ة -> ه; ﷺ açılır. */
export function normAr(s) {
  return String(s || "")
    .replace(/ﷺ/g, " صلى الله عليه وسلم ")
    .replace(/\uFD40/g, " رحمه الله ")
    .replace(/\uFD41/g, " رضي الله عنه ")
    .replace(/\uFD42/g, " رضي الله عنها ")
    .replace(/\uFD43/g, " رضي الله عنهم ")
    .replace(/\uFD44/g, " رضي الله عنهما ")
    .replace(/\uFD45/g, " رضي الله عنهن ")
    .replace(/\uFD47/g, " عليه السلام ")
    .replace(/\uFD4A/g, " عليه الصلاة والسلام ")
    .replace(/\uFDFB/g, " جل جلاله ")
    .replace(/\uFDF2/g, " الله ")
    .replace(/﷽/g, " بسم الله الرحمن الرحيم ")
    .replace(AR_MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ڪک]/g, "ك")
    .replace(/[یې]/g, "ي");
}

export function tokAr(s) {
  return normAr(s).split(/[^\u0621-\u064A]+/).filter(Boolean);
}

/** Qoşa dırnaq «…» içindəki mətn (hədisin mətni; isnadsız). Yoxdursa null. */
export function quotedCore(s) {
  const parts = [...String(s || "").matchAll(/«([^»]+)»/g)].map((m) => m[1]);
  return parts.length ? parts.join(" ") : null;
}

/** Latın/kiril: kiçik hərf, diakritika atılır (ə→e, ı→i, ё→е …), durğu işarələri atılır. */
export function normLat(s) {
  return String(s || "")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´ʻʼ‘ʿʾ]/g, "");
}

export function tokLat(s) {
  return normLat(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export function tokens(lang, s) {
  return lang === "ar" ? tokAr(s) : tokLat(s);
}

const AD = /[٠-٩]/g;
const PD = /[۰-۹]/g;
/** Mətndəki rəqəmlər (Qərb rəqəmləri; ərəb-hind rəqəmləri çevrilir). */
export function numbersIn(s) {
  const t = String(s || "")
    .replace(AD, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(PD, (c) => String(c.charCodeAt(0) - 0x06f0));
  return [...t.matchAll(/\d+/g)].map((m) => m[0]);
}

/** Yazı sistemi ilə dil təxmini: ar | ru | latin (az/tr/en ayrıca yoxlanır). */
export function detectScript(s) {
  const t = String(s || "");
  const ar = (t.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const cy = (t.match(/[\u0400-\u04FF]/g) || []).length;
  const la = (t.match(/[A-Za-zƏəİıÖöÜüĞğŞşÇç]/g) || []).length;
  if (ar >= cy && ar >= la && ar > 0) return "ar";
  if (cy >= la && cy > 0) return "ru";
  if (la > 0) return "latin";
  return null;
}
