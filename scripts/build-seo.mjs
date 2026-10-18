// SEO: sitemap.xml + robots.txt + hər kitab/bölmə/surə üçün öz <title>, description, canonical, Open Graph və JSON-LD olan statik HTML.
//   public/kitab/<id>.html, public/bolme/<id>.html, public/quran/<n>.html — reader/section/sura şablonlarının surəti (yalnız <head> fərqlidir);
//   Vercel əvvəlcə statik faylı verir (cleanUrls), olmasa vercel.json rewrite-ı köhnə qaydada işləyir. Yaranan fayllar repoya commit olunur.
//   Statik səhifələrin (ana səhifə, AI, Quran, haqqında, fatawa) <head> bloku da burada yenilənir (<!--seo--> … <!--/seo--> arası).
// İşlətmək: node scripts/build-seo.mjs   — kataloq (api/_lib/catalog.js), şablon HTML-lər və ya statik səhifələr dəyişəndə yenidən işlət və commit et
//   (Vercel buildCommand kimi işlədəndə deploy alınmadı, ona görə statik fayllar repoda saxlanır).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (...p) => path.join(root, "public", ...p);
const SITE = "https://library.nibrascode.com";
const NAME = "مكتبة نبراس";
const NAME_EN = "Nibras Library";
const OG = SITE + "/assets/img/og.jpg";
const { CATALOG } = await import(path.join(root, "api/_lib/catalog.js"));
const { SURAS } = await import(path.join(root, "api/_quran/suras.js"));
const { SURA_NAMES_AR, AYAS } = await import(path.join(root, "api/_quran/quran.js"));

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const arNum = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
const clip = (s, n = 300) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const ORG = { "@type": "Organization", "@id": "https://nibrascode.com/#org", name: "Nibras Code", url: "https://nibrascode.com", email: "Nibrascode@gmail.com", logo: SITE + "/icon-512.png" };

function head({ title, desc, url, type = "website", ld = [], selfContained = false }) {
  desc = clip(desc);
  const tags = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(NAME + " — " + NAME_EN)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${OG}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="ar_AR">`,
    `<meta property="og:locale:alternate" content="az_AZ">`,
    `<meta property="og:locale:alternate" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${OG}">`,
    // /fatawa/ müstəqil qovluqdur (APK-ya da köçürülür): kökə bağlı ikon/manifest linkləri ora qoyulmur
    ...(selfContained ? [] : [`<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<link rel="manifest" href="/manifest.webmanifest">`]),
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...o }).replace(/</g, "\\u003c")}</script>`),
  ];
  return `<!--seo-->\n${tags.join("\n")}\n<!--/seo-->`;
}
// <title>-ı əvəz edir, köhnə description/seo blokunu silir, yeni bloku <title>-dan sonra qoyur
function apply(html, o) {
  html = html.replace(/\n?<!--seo-->[\s\S]*?<!--\/seo-->/, "").replace(/\n?<meta name="description"[^>]*>/, "");
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>\n${head(o)}`);
}
const crumbs = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) });
const WEBSITE_REF = { "@type": "WebSite", "@id": SITE + "/#site", name: NAME, url: SITE + "/" };

const urls = [];
const add = (u, pr) => urls.push([u, pr]);

// ---------- statik səhifələr (yerində yenilənir)
const STATIC = [
  {
    f: "index.html", u: "/", pr: "1.0",
    title: `${NAME} — كتب ابن تيمية ومجموع الفتاوى والقرآن الكريم والكتب الستة والنحو | ${NAME_EN}`,
    desc: "مكتبة إسلامية مجانية غير ربحية من Nibras Code: القرآن الكريم مع ترجمة المعاني والتفسير، كتب شيخ الإسلام ابن تيمية، مجموع الفتاوى (٣٥ مجلدًا)، الكتب الستة، وكتب النحو والصرف — بالنص العربي مع البحث. Free Islamic library: Ibn Taymiyyah, Majmu' al-Fatawa, Hadith, Nahw, Quran.",
    ld: [
      { "@type": "WebSite", "@id": SITE + "/#site", name: NAME, alternateName: [NAME_EN, "Nibras Kitabxana"], url: SITE + "/", inLanguage: ["ar", "az", "en", "tr", "ru"], publisher: { "@id": ORG["@id"] }, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: SITE + "/?q={search_term_string}" }, "query-input": "required name=search_term_string" } },
      ORG,
    ],
  },
  { f: "about.html", u: "/about", pr: "0.6", title: `عن المكتبة — ${NAME} | About ${NAME_EN}`, desc: "مكتبة نبراس مكتبة إسلامية إلكترونية مجانية غير ربحية من Nibras Code: القرآن الكريم مع ترجمة المعاني والتفسير، كتب ابن تيمية، مجموع الفتاوى، الكتب الستة، وكتب النحو والصرف. About Nibras Library, a free non-profit Islamic library.", type: "website", ld: [{ "@type": "AboutPage", name: "عن مكتبة نبراس", url: SITE + "/about", isPartOf: WEBSITE_REF, publisher: ORG }] },
  { f: "quran.html", u: "/quran", pr: "0.9", title: `القرآن الكريم — ١١٤ سورة مع ترجمة المعاني والتفسير | ${NAME}`, desc: "القرآن الكريم كاملًا بالرسم العثماني: ١١٤ سورة مع ترجمة معاني القرآن والتفسير الميسر وتفسير السعدي وتفسير ابن كثير. The Quran with meaning translation and tafsir.", ld: [crumbs([[NAME, SITE + "/"], ["القرآن الكريم", SITE + "/quran"]])] },
  { f: "ai.html", u: "/ai", pr: "0.7", title: `مساعد المكتبة (Library AI) — البحث في كتب أهل العلم | ${NAME}`, desc: "مساعد يبحث في كتب مكتبة نبراس: القرآن والتفسير، الحديث بترقيم محمد فؤاد عبد الباقي، مجموع الفتاوى، كتب ابن تيمية والنحو، ويعرض النصوص مع مصادرها. Library AI answers from the books with sources." },
  { f: "fatawa/index.html", u: "/fatawa/", pr: "0.9", selfContained: true, title: `مجموع الفتاوى لشيخ الإسلام ابن تيمية — ٣٥ مجلدًا | ${NAME}`, desc: "مجموع فتاوى شيخ الإسلام ابن تيمية في ٣٥ مجلدًا: فهارس المجلدات، والقراءة، والبحث في النص كله، والانتقال إلى المجلد والصفحة. Majmu' al-Fatawa of Ibn Taymiyyah, 35 volumes, full-text search.", type: "book", ld: [{ "@type": "Book", name: "مجموع الفتاوى", alternateName: "Majmu' al-Fatawa", author: { "@type": "Person", name: "ابن تيمية", alternateName: "Ibn Taymiyyah" }, inLanguage: "ar", numberOfPages: 16872, bookFormat: "https://schema.org/EBook", url: SITE + "/fatawa/", isAccessibleForFree: true, isPartOf: WEBSITE_REF }, crumbs([[NAME, SITE + "/"], ["كتب ابن تيمية", SITE + "/bolme/ibn-taymiyyah"], ["مجموع الفتاوى", SITE + "/fatawa/"]])] },
  { f: "fatawa/privacy.html", u: "/fatawa/privacy", pr: "0.3", selfContained: true, keepTitle: true, desc: "Privacy Policy of the Majmu' al-Fatawa app by Nibras Code: works offline, collects no personal data, no accounts, no ads, analytics or trackers." },
];
for (const s of STATIC) {
  const fp = pub(s.f);
  let html = fs.readFileSync(fp, "utf8");
  const title = s.keepTitle ? html.match(/<title>([\s\S]*?)<\/title>/)[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'") : s.title;
  const out = apply(html, { ...s, title, url: SITE + s.u });
  if (out !== html) fs.writeFileSync(fp, out);
  add(s.u, s.pr);
}

// ---------- generasiya olunan səhifələr
function writeGen(dir, name, tpl, o) {
  fs.mkdirSync(pub(dir), { recursive: true });
  fs.writeFileSync(pub(dir, name + ".html"), apply(tpl, o));
}
for (const d of ["kitab", "bolme", "quran"]) fs.rmSync(pub(d), { recursive: true, force: true });
const T = { reader: fs.readFileSync(pub("reader.html"), "utf8"), section: fs.readFileSync(pub("section.html"), "utf8"), sura: fs.readFileSync(pub("sura.html"), "utf8") };

const SEC = {
  "ibn-taymiyyah": { t: "كتب شيخ الإسلام ابن تيمية", d: "كتب شيخ الإسلام ابن تيمية مرتّبة على أربع مراحل للطالب، ومجموع الفتاوى في ٣٥ مجلدًا: النص العربي كاملًا للقراءة والبحث. Books of Ibn Taymiyyah in four study stages, plus Majmu' al-Fatawa." },
  nahw: { t: "كتب النحو والصرف", d: "أمّهات كتب النحو والصرف مرتّبة على العصور: النص العربي كاملًا للقراءة والبحث. Classical books of Arabic grammar (nahw and sarf)." },
  hadith: { t: "الكتب الستة", d: "الكتب الستة: صحيح البخاري (بترقيم محمد فؤاد عبد الباقي)، صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن النسائي، سنن ابن ماجه — مع البحث برقم الحديث ونصه. The Six Books of hadith." },
};
for (const s of CATALOG.sections) {
  const m = SEC[s.id] || { t: s.title.ar, d: s.title.ar };
  const u = `${SITE}/bolme/${s.id}`;
  writeGen("bolme", s.id, T.section, { title: `${m.t} | ${NAME}`, desc: m.d, url: u, ld: [{ "@type": "CollectionPage", name: m.t, url: u, isPartOf: WEBSITE_REF }, crumbs([[NAME, SITE + "/"], [m.t, u]])] });
  add(`/bolme/${s.id}`, "0.8");
  for (const g of s.groups)
    for (const b of g.books) {
      if (b.id === "majmu") continue; // /fatawa/ səhifəsi
      const title0 = String(b.ar).split(" - ")[0];
      const en = b.name && b.name.en;
      const death = b.death ? ` (ت ${arNum(b.death)}هـ)` : "";
      const kind = b.kind === "hd" ? "كتاب حديث" : b.kind === "nh" ? "كتاب في النحو والصرف" : "";
      const count = b.kind === "hd" ? `${arNum(b.pages)} حديثًا` : `${arNum(b.pages)} صفحة`;
      const desc = [
        `${title0} — ${b.author}${death}.`,
        (b.desc && b.desc.ar) || kind,
        `النص العربي كاملًا (${count}) للقراءة والبحث في ${NAME}.`,
        en ? `${en}${b.authorName && b.authorName.en ? " by " + b.authorName.en : ""} — read online, free.` : "",
      ].filter(Boolean).join(" ");
      const u = `${SITE}/kitab/${b.id}`;
      writeGen("kitab", b.id, T.reader, {
        title: `${title0} — ${b.author} | ${NAME}`, desc, url: u, type: "book",
        ld: [
          { "@type": "Book", name: title0, ...(en ? { alternateName: en } : {}), author: { "@type": "Person", name: b.author, ...(b.authorName && b.authorName.en ? { alternateName: b.authorName.en } : {}) }, inLanguage: "ar", ...(b.kind !== "hd" ? { numberOfPages: b.pages } : {}), bookFormat: "https://schema.org/EBook", url: u, isAccessibleForFree: true, isPartOf: WEBSITE_REF },
          crumbs([[NAME, SITE + "/"], [m.t, `${SITE}/bolme/${s.id}`], [title0, u]]),
        ],
      });
      add(`/kitab/${b.id}`, "0.7");
    }
}
for (let n = 1; n <= 114; n++) {
  const ar = SURA_NAMES_AR[n - 1], en = SURAS[n - 1].en, az = SURAS[n - 1].az, k = AYAS[n - 1].length;
  const u = `${SITE}/quran/${n}`;
  writeGen("quran", String(n), T.sura, {
    title: `سورة ${ar} — ${arNum(k)} آية مع ترجمة المعاني والتفسير | ${NAME}`,
    desc: `سورة ${ar} (السورة ${arNum(n)}، ${arNum(k)} آية) بالرسم العثماني مع ترجمة معاني القرآن والتفسير الميسر وتفسير السعدي وتفسير ابن كثير. Surah ${en} (${n}) — Arabic text, meaning translation and tafsir. ${az} surəsi: mənaca tərcümə və təfsir.`,
    url: u,
    ld: [crumbs([[NAME, SITE + "/"], ["القرآن الكريم", SITE + "/quran"], [`سورة ${ar}`, u]])],
  });
  add(`/quran/${n}`, "0.6");
}

// ---------- sitemap (50 000-dən çox URL olarsa indeksə bölünür) + robots.txt
const MAX = 50000;
const xml = (list) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(([u, p]) => `  <url><loc>${esc(SITE + u)}</loc><priority>${p}</priority></url>`).join("\n")}\n</urlset>\n`;
for (const f of fs.readdirSync(pub())) if (/^sitemap(-\d+)?\.xml$/.test(f)) fs.rmSync(pub(f));
if (urls.length <= MAX) fs.writeFileSync(pub("sitemap.xml"), xml(urls));
else {
  const parts = [];
  for (let i = 0; i < urls.length; i += MAX) {
    const name = `sitemap-${parts.length + 1}.xml`;
    fs.writeFileSync(pub(name), xml(urls.slice(i, i + MAX)));
    parts.push(name);
  }
  fs.writeFileSync(pub("sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.map((p) => `  <sitemap><loc>${SITE}/${p}</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`);
}
// /api/ bağlanmır: Googlebot səhifələri JS ilə render edəndə kitab mətnini /api/books, /api/page-dən oxuyur
fs.writeFileSync(pub("robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`SEO: ${urls.length} URL, sitemap.xml + robots.txt yazıldı`);
