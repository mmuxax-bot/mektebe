// Katalog (api/_lib/catalog.js) və hədis mündəricatı (api/_lib/hdtoc.js) qurucusu: node scripts/build-catalog.mjs
// Məlumat kitab modullarından oxunur; kitab əlavə olunanda bu skripti yenidən işə sal.
import fs from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import * as IT from "../api/_itbooks.js";
import { BOOKS, STAGES, MAJMU } from "../api/_itbooks/registry.js";
import * as FT from "../api/_fatawa.js";
import * as HD from "../api/_hadith.js";
import * as NH from "../api/_nahw.js";
import { LOADERS as NH_LOADERS } from "../api/_nahw/loaders.js";

const L5 = (az, en, tr, ru, ar) => ({ az, en, tr, ru, ar });
const descOf = (d) => (d ? { az: d[0], tr: d[1], en: d[2], ru: d[2], ar: d[3] } : null);

// ---------------- İbn Teymiyyə (mərhələlər, registry sırası)
const iti = await IT.__loadIndex();
const itGroups = Object.keys(STAGES).map((st) => ({
  id: "stage-" + st,
  stage: Number(st),
  title: STAGES[st],
  books: [],
}));
for (const r of BOOKS) {
  const bi = iti.bookIdx.get(r.slug);
  if (bi == null || !IT.isAvailable(r.slug)) continue;
  const b = iti.books[bi];
  const vols = new Set();
  for (let d = b.first; d < b.first + b.count; d++) if (iti.pv[d] > 0) vols.add(iti.pv[d]);
  itGroups[r.stage - 1].books.push({
    id: "it-" + r.slug, kind: "it", src: r.slug, n: r.n, ar: r.ar, name: { ...r.names, ar: r.ar },
    author: "ابن تيمية", authorName: L5("İbn Teymiyyə", "Ibn Taymiyyah", "İbn Teymiyye", "Ибн Таймийя", "ابن تيمية"), death: 728,
    pages: b.count, volumes: Math.max(1, vols.size), first: b.first, start: b.main - b.first + 1, ed: b.ed || "", srcUrl: b.src || "", desc: descOf(r.desc),
  });
}

// ---------------- Məcmuu əl-Fətava
const fti = await FT.__loadIndex();
const majmu = {
  id: "majmu", kind: "majmu", src: "majmu", ar: MAJMU.ar, name: MAJMU.names,
  author: "ابن تيمية", authorName: L5("İbn Teymiyyə", "Ibn Taymiyyah", "İbn Teymiyye", "Ибн Таймийя", "ابن تيمية"), death: 728,
  pages: fti.N, volumes: fti.vols.length, first: 0, start: 1, ed: "", srcUrl: "",
  desc: L5("İbn Teymiyyənin fətva və risalələri, 35 cild.", "Ibn Taymiyyah's fatwas and treatises in 35 volumes.", "İbn Teymiyye'nin fetva ve risaleleri, 35 cilt.", "Фетвы и трактаты Ибн Таймийи в 35 томах.", "فتاوى ابن تيمية ورسائله في ٣٥ مجلدًا."),
};

// ---------------- Kütübü-sittə
const HD_INFO = {
  bukhari: [L5("Səhih əl-Buxari", "Sahih al-Bukhari", "Sahîh-i Buhârî", "Сахих аль-Бухари", "صحيح البخاري"), 256, L5("İmam Buxarinin səhih hədislər toplusu.", "Imam al-Bukhari's collection of authentic hadith.", "İmam Buhârî'nin sahih hadis derlemesi.", "Сборник достоверных хадисов имама аль-Бухари.", "الجامع الصحيح للإمام البخاري.")],
  muslim: [L5("Səhih Müslim", "Sahih Muslim", "Sahîh-i Müslim", "Сахих Муслим", "صحيح مسلم"), 261, L5("İmam Müslimin səhih hədislər toplusu.", "Imam Muslim's collection of authentic hadith.", "İmam Müslim'in sahih hadis derlemesi.", "Сборник достоверных хадисов имама Муслима.", "الصحيح للإمام مسلم.")],
  abudawud: [L5("Sünən Əbu Davud", "Sunan Abi Dawud", "Sünen-i Ebû Dâvûd", "Сунан Абу Дауда", "سنن أبي داود"), 275, L5("Əbu Davudun Sünəni: əsasən hökm hədisləri.", "Abu Dawud's Sunan, mostly hadith on rulings.", "Ebû Dâvûd'un Sünen'i: daha çok ahkâm hadisleri.", "Сунан Абу Дауда: в основном хадисы о нормах.", "سنن أبي داود، وعامتها في أحاديث الأحكام.")],
  tirmidhi: [L5("Cami ət-Tirmizi", "Jami' al-Tirmidhi", "Câmiu't-Tirmizî", "Джами ат-Тирмизи", "سنن الترمذي"), 279, L5("Tirmizinin Camisi: hədislərin dərəcəsi ilə birlikdə.", "Al-Tirmidhi's Jami', with the grade of each hadith.", "Tirmizî'nin Câmi'i: hadislerin dereceleriyle.", "Джами ат-Тирмизи с указанием степени хадисов.", "جامع الترمذي، مع بيان درجة الأحاديث.")],
  nasai: [L5("Sünən ən-Nəsai", "Sunan al-Nasa'i", "Sünen-i Nesâî", "Сунан ан-Насаи", "سنن النسائي"), 303, L5("Nəsainin Sünəni (əl-Muctəba).", "Al-Nasa'i's Sunan (al-Mujtaba).", "Nesâî'nin Sünen'i (el-Müctebâ).", "Сунан ан-Насаи (аль-Муджтаба).", "سنن النسائي (المجتبى).")],
  ibnmajah: [L5("Sünən İbn Macə", "Sunan Ibn Majah", "Sünen-i İbn Mâce", "Сунан Ибн Маджи", "سنن ابن ماجه"), 273, L5("İbn Macənin Sünəni, Kütübü-sittənin altıncısı.", "Ibn Majah's Sunan, the sixth of the six books.", "İbn Mâce'nin Sünen'i, Kütüb-i Sitte'nin altıncısı.", "Сунан Ибн Маджи, шестая из шести книг.", "سنن ابن ماجه، سادس الكتب الستة.")],
};
const hdi = await HD.__loadIndex();
const hdBooks = [];
const HD_TOC = {};
for (const b of hdi.books) {
  const m = HD.BOOK_META[b.id];
  const [name, death, desc] = HD_INFO[b.slug];
  const id = "hd-" + b.slug;
  hdBooks.push({ id, kind: "hd", src: b.slug, ar: m.title, name, author: m.author, authorName: null, death, pages: b.n, volumes: 1, first: b.start, start: 1, ed: m.ed, srcUrl: "https://shamela.ws/book/" + b.id, desc });
  const items = [];
  let last = null;
  for (let i = 0; i < b.n; i++) {
    const h = await HD.getHadith(hdi, b.start + i);
    const k = String(h.kitab || "").trim();
    if (k && k !== last) items.push({ t: k, p: i + 1 });
    last = k;
  }
  HD_TOC[id] = items;
}

// ---------------- Nəhv (ölüm ilinə görə, məlumatdakı sıra)
const nhi = await NH.__loadIndex();
const nhBooks = [];
for (const b of nhi.books) {
  const data = JSON.parse(brotliDecompressSync(Buffer.from((await NH_LOADERS[b.id]()).default, "base64")).toString("utf8"));
  const vols = new Set(data.p.map((p) => p[1]).filter((v) => /^\d+$/.test(String(v))));
  nhBooks.push({ id: "nh-" + b.id, kind: "nh", src: b.id, ar: b.title, name: null, author: b.author, authorName: null, death: b.death, pages: b.n, volumes: Math.max(1, vols.size), first: b.start, start: 1, ed: "", srcUrl: "https://shamela.ws/book/" + b.id, desc: null });
  if (data.p.length !== b.n) console.warn("nahw", b.id, "pages", data.p.length, "!=", b.n);
}

const CATALOG = {
  sections: [
    { id: "ibn-taymiyyah", title: L5("İbn Teymiyyə kitabları", "Books of Ibn Taymiyyah", "İbn Teymiyye'nin kitapları", "Книги Ибн Таймийи", "كتب شيخ الإسلام ابن تيمية"), groups: itGroups },
    { id: "nahw", title: L5("Ərəb qrammatikası (nəhv və sərf)", "Arabic grammar (nahw and sarf)", "Arapça dil bilgisi (nahiv ve sarf)", "Арабская грамматика (нахв и сарф)", "النحو والصرف"), groups: [{ id: "nahw", title: null, books: nhBooks }] },
    { id: "hadith", title: L5("Kütübü-sittə", "The six hadith books", "Kütüb-i Sitte", "Шесть сборников хадисов", "الكتب الستة"), groups: [{ id: "hadith", title: null, books: hdBooks }] },
    { id: "majmu", title: L5("Məcmuu əl-Fətava", "Majmu' al-Fatawa", "Mecmûu'l-Fetâvâ", "Маджму аль-фатава", "مجموع الفتاوى"), groups: [{ id: "majmu", title: null, books: [majmu] }] },
  ],
};
const count = CATALOG.sections.reduce((a, s) => a + s.groups.reduce((x, g) => x + g.books.length, 0), 0);
const pages = CATALOG.sections.reduce((a, s) => a + s.groups.reduce((x, g) => x + g.books.reduce((y, b) => y + b.pages, 0), 0), 0);
CATALOG.count = count;
CATALOG.pages = pages;
fs.writeFileSync(new URL("../api/_lib/catalog.js", import.meta.url), "// Avtomatik: node scripts/build-catalog.mjs\nexport const CATALOG = " + JSON.stringify(CATALOG) + ";\n");
fs.writeFileSync(new URL("../api/_lib/hdtoc.js", import.meta.url), "// Avtomatik: node scripts/build-catalog.mjs (Kütübü-sittə: kitab başlıqları)\nexport const HD_TOC = " + JSON.stringify(HD_TOC) + ";\n");
console.log("books", count, "pages", pages);
