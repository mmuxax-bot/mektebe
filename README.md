# Nibras Library

library.nibrascode.com — İbn Teymiyyə kitabları (28 kitab + Məcmuul-fətava, 35 cild), Kütübü-sittə (6 kitab) və ərəb qrammatikası (74 kitab).
Ərəbcə mətn olduğu kimi göstərilir, tərcümə olunmur.

## Quruluş

- `public/` — statik sayt (build yoxdur): `index.html` (ana səhifə: axtarış, «Davam et», 3 bölmə kartı), `section.html` (`/bolme/<ibn-taymiyyah|nahw|hadith>`; Məcmuul-fətava İbn Teymiyyə bölməsində ayrıca blokdur, köhnə `/bolme/majmu` ora keçir), `reader.html` (`/kitab/<id>`, vərəq çevirmə), `ai.html` (Nibras AI).
- `api/index.js` — Vercel-də TƏK funksiya (Function Storage-a qənaət). `vercel.json` rewrite-ı `/api/<books|page|toc|search|chat>` ünvanlarını ora yönəldir, açıq URL-lər eynidir; hər marşrutun kodu `api/_books.js`, `_page.js`, `_toc.js`, `_search.js`, `_chat.js`-dədir və yalnız lazım olanda yüklənir (`/api/books` kitab məlumatını yükləmir):
  - `GET /api/books` — katalog
  - `GET /api/page?book=<id>&p=<n>[&q=]` — səhifə
  - `GET /api/toc?book=<id>[&vol=<n>]` — mündəricat / cildlər
  - `GET /api/search?q=...[&book=<id>&offset=&limit=]` — axtarış
  - `POST /api/chat` — Nibras AI (nibrascode/code `api/chat.js`-in kitab hissəsi)
- `api/_itbooks`, `_nahw`, `_hadith`, `_fatawa`, `_lugha` — məlumat modulları (nibrascode/code-dan dəyişmədən köçürülüb).
- `api/_lib/` — kitabxana qatı (`library.js`), avtomatik katalog (`catalog.js`, `hdtoc.js`, `hdno.js`), AI cavabındakı kitab bloklarını səhifəyə bağlayan `locate.js` («Kitabda aç»).

Kitab id-ləri: `it-<slug>` (İbn Teymiyyə), `majmu`, `hd-<bukhari|muslim|abudawud|tirmidhi|nasai|ibnmajah>`, `nh-<Şamilə id>`.

## Yerli sınaq

```
node scripts/dev-server.mjs 3000
node scripts/build-catalog.mjs   # kitab məlumatı dəyişəndə katalogu yenilə
```

## Vercel

Framework: Other, Root: `./`, Build Command: boş, Output: `public` (vercel.json-da yazılıb).
AI üçün mühit dəyişənləri nibrascode ilə eynidir: `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `CEREBRAS_API_KEY`, `NVIDIA_API_KEY`, `SAMBANOVA_API_KEY`, `HF_TOKEN`, `GITHUB_MODELS_TOKEN` və s. (`api/_ai.js`). Açar olmasa da kitab cavabları işləyir.

## Axtarış (faza 4)
- `/api/search?q=` ərəbcə ilə yanaşı azərbaycanca, türkcə, ingiliscə və rusca təbii sorğu qəbul edir (`api/_lib/qexpand.js`): Məcmuul-fətava mövzu lüğəti (`_fatawa/topics.js` + `topicmatch.js`), hədis `TOPICS`/`TOPICS_EXTRA`/`TOPIC_PHRASES`, nəhv `LAT_TERMS`/`PHRASES` ərəbcə ifadələrə çevrilir, bir neçə variant sınanır və ən yaxşısı seçilir. Latın yazıda hərf səhvləri (q/k, x/h, 1–2 hərf) və «Əbu/Ebu» fərqi tolerantdır; kitab adları da tapılır (`books`).
- Ərəbcə normallaşdırma (həmzə/əlif, ة, ى, hərəkə, tətvil, ال/و/ف/ب/ل/ك önşəkilçiləri, yüngül kök) indekslərin öz tokenləşdirməsidir; sıralama: başlıq > ardıcıl ifadə > yaxınlıq (12 söz) > BM25. Nəhv nəticələri `_nahw/guard.js` süzgəcindən keçir («لن» əbədi inkar deyil).
- Nəticələr bölmələr üzrə qruplaşır, hər nəticədə vurğulanmış parça və `url` («Kitabda aç») var.
- `/api/chat`: dini/kitab sualı AI-yə getməzdən əvvəl kitabxanada axtarılır (`api/_lib/ground.js`); yaxşı nəticə varsa sözbəsöz çıxarışlar + «Kitabda aç» qaytarılır, yoxdursa ən yaxşı 3–5 çıxarış AI-yə mənbə kimi verilir (`sources`).
