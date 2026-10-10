// Nəhv/sərf axtarışı üçün ortaq tokenləşdirmə (həm indeks qurulanda, həm sorğuda eyni qayda). Ərəbcə: hərəkələr atılır, həmzə birləşir,
// «ال» və yapışan əvəzlik şəkilçiləri (ها، هم) yüngül soyulur.
import { key } from "../_lugha.js";

const AR_SPLIT = /[^\u0621-\u064A]+/;

/** Tək söz üçün yüngül kök-forma (key() ilə normallaşdırılmış). */
export function stemTok(t) {
  let s = t;
  const m = s.match(/^(?:وال|فال|بال|كال|لل|ال)/);
  if (m && s.length - m[0].length >= 3) s = s.slice(m[0].length);
  const x = s.match(/(?:هما|هم|ها|هن)$/);
  if (x && s.length - x[0].length >= 3) s = s.slice(0, -x[0].length);
  return s;
}

/** Mətn -> sıralı token siyahısı (stem edilmiş, uzunluq ≥ 2). */
export function tokens(text) {
  return key(text)
    .split(AR_SPLIT)
    .filter((t) => t.length > 1)
    .map(stemTok);
}

/** Mətn -> [{t, start, end}] orijinal mətndəki mövqelərlə (kəsmə üçün). */
export function tokenSpans(text) {
  const out = [];
  const re = /[\u0621-\u064A\u0671-\u06D3][\u0621-\u064A\u0671-\u06D3\u064B-\u065F\u0670\u06D6-\u06ED\u0640]*/g;
  let m;
  while ((m = re.exec(text))) {
    const t = key(m[0]);
    if (t.length < 2) continue;
    out.push({ t: stemTok(t), start: m.index, end: m.index + m[0].length });
  }
  return out;
}
