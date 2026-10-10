// Məlumat yükləyicisi: brotli+base64 JSON hissələri yalnız lazım olanda (tənbəl) yüklənir.
import { brotliDecompressSync } from "node:zlib";

const LOADERS = {
  ar: () => import("./data/ar.js"),
  az: () => import("./data/az.js"),
  tr: () => import("./data/tr.js"),
  en: () => import("./data/en.js"),
  ru: () => import("./data/ru.js"),
  formulae: () => import("./data/formulae.js"),
};
const cache = new Map();
const unpack = (m) => JSON.parse(brotliDecompressSync(Buffer.from(m.default, "base64")).toString("utf8"));

// Əlavə hazır insan tərcümələri (ext.js): ar sətirlərinin sonuna əlavə olunur, dil sətirləri eyni indekslə əlavə olunur (mövcud axtarış kodu dəyişmir).
let _ext = null;
function ext() {
  if (!_ext) {
    _ext = import("./data/ext.js").then(unpack).catch(() => ({ sources: {}, items: [] }));
  }
  return _ext;
}
const extSrc = new Map(); // ərəb sətir id -> {lang -> mənbə}
/** Əlavə mənbə təsviri (id >= 900000 olan maddələr üçün), yoxdursa null. */
export function extSource(id, lang) {
  const e = extSrc.get(id);
  const key = e && (e.src[lang] || Object.values(e.src)[0]);
  return key ? { ...e.sources[key], key } : null;
}

export function loadPart(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      (async () => {
        const m = await LOADERS[name]();
        if (name === "formulae") return m.default;
        const base = unpack(m);
        if (!["ar", "az", "tr", "en", "ru"].includes(name)) return base;
        const x = await ext();
        if (name === "ar") {
          const n = base.length;
          for (const it of x.items) {
            base.push([it.id, it.ar, "", "", it.ref || ""]);
            extSrc.set(it.id, { src: it.src, sources: x.sources, idx: base.length - 1 });
          }
          base._extFrom = n;
        } else {
          // dil sətirləri: ar sətirinin yeri = baza uzunluğu + maddənin sırası; ar yüklənməmiş ola bilər, ona görə bazanı ar.js ölçüsündən təyin edirik
          const ar = await loadPart("ar");
          for (const it of x.items) if (it.tr[name]) base[extSrc.get(it.id).idx] = it.tr[name];
        }
        return base;
      })(),
    );
  }
  return cache.get(name);
}
