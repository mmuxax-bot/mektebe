# Nibras Library

library.nibrascode.com — İbn Teymiyyə kitabları (28), Məcmuu əl-Fətava (35 cild), Kütübü-sittə (6 kitab) və ərəb qrammatikası (74 kitab).
Ərəbcə mətn olduğu kimi göstərilir, tərcümə olunmur.

## Quruluş

- `public/` — statik sayt (build yoxdur): `index.html` (kitabxana), `reader.html` (`/kitab/<id>`, vərəq çevirmə), `ai.html` (Nibras AI).
- `api/` — Vercel Node funksiyaları:
  - `GET /api/books` — katalog
  - `GET /api/page?book=<id>&p=<n>[&q=]` — səhifə
  - `GET /api/toc?book=<id>[&vol=<n>]` — mündəricat / cildlər
  - `GET /api/search?q=...[&book=<id>&offset=&limit=]` — axtarış
  - `POST /api/chat` — Nibras AI (nibrascode/code `api/chat.js`-in kitab hissəsi)
- `api/_itbooks`, `_nahw`, `_hadith`, `_fatawa`, `_lugha` — məlumat modulları (nibrascode/code-dan dəyişmədən köçürülüb).
- `api/_lib/` — kitabxana qatı (`library.js`), avtomatik katalog (`catalog.js`, `hdtoc.js`).

Kitab id-ləri: `it-<slug>` (İbn Teymiyyə), `majmu`, `hd-<bukhari|muslim|abudawud|tirmidhi|nasai|ibnmajah>`, `nh-<Şamilə id>`.

## Yerli sınaq

```
node scripts/dev-server.mjs 3000
node scripts/build-catalog.mjs   # kitab məlumatı dəyişəndə katalogu yenilə
```

## Vercel

Framework: Other, Root: `./`, Build Command: boş, Output: `public` (vercel.json-da yazılıb).
AI üçün mühit dəyişənləri nibrascode ilə eynidir: `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `CEREBRAS_API_KEY`, `NVIDIA_API_KEY`, `SAMBANOVA_API_KEY`, `HF_TOKEN`, `GITHUB_MODELS_TOKEN` və s. (`api/_ai.js`). Açar olmasa da kitab cavabları işləyir.
