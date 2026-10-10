// Azərbaycan/türk şəkilçiləri: sorğu sözü (foldLat ilə qatlanmış latın, ə->e, ı->i ...) lüğət açarına şəkilçi zənciri ilə uyğun gəlirmi.
// «dualar», «cinlərdən», «kitabı» (kitap), «sabrı» (sabır), «qəbri» (qəbir), «namazların» ... Kiril/ərəb sözlərə toxunmur.
const SUF = /^(?:l[ae]r|n?[iu]n|n?[iu]|y?[ae]|n?d[ae]n?|n?t[ae]n?|s[iu]|l[iu][kg]?|s[iu]z|[dt][iu]r|k[iu]|m[iu]|y?l[ae]|[c][iu]|y?[dt][iu]|y?[iu]m|y?[iu]z|m|n|y[iu]|c[ae]|m[ae][kqyg]|m[ae]s[iu]|m[ae]n|m[ae]z|y[ae]n|[iu]b|d[ae]k[iu]|t[ae]k[iu])+$/;
const SOFT = { p: "b", c: "c", t: "d", k: "g", q: "g" };

export function sufOk(rest) {
  return rest === "" || SUF.test(rest);
}

/** t (sorğu sözü) k (açar) ilə uyğundur: tam, uzun açarın prefiksi (köhnə qayda), qısa açar + şəkilçi, yumşalma və ya sait düşməsi + şəkilçi */
export function stemMatch(t, k, minPrefix = 4) {
  if (t === k) return true;
  if (!k || !t) return false;
  if (k.length >= minPrefix && t.startsWith(k)) return true;
  if (!/^[a-z]+$/.test(k) || !/^[a-z]+$/.test(t)) return false;
  if (k.length >= 2 && t.startsWith(k) && SUF.test(t.slice(k.length))) return true;
  if (k.length >= 3) {
    const last = k[k.length - 1];
    if (SOFT[last] && SOFT[last] !== last) {
      const v = k.slice(0, -1) + SOFT[last];
      if (t.length > v.length && t.startsWith(v) && /^[aeiu]/.test(t.slice(v.length)) && SUF.test(t.slice(v.length))) return true;
    }
    // sait düşməsi: sabır->sabrı, qəbir->qəbri, ilim->ilmi, ömür->ömrü, isim->ismi
    const m = /^(.*[^aeiou])([iu])([^aeiou])$/.exec(k);
    if (m && k.length >= 4) {
      const v = m[1] + m[3];
      if (t.length > v.length && t.startsWith(v) && /^[aeiu]/.test(t.slice(v.length)) && SUF.test(t.slice(v.length))) return true;
    }
  }
  return false;
}

/** Damerau-Levenshtein (kiçik sözlər üçün) */
export function editDist(a, b) {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > 2) return 9;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[n][m];
}
