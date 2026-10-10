# Nibras Tərcümə (nibras-translate-core)

Ərəb / Azərbaycan / Türk / İngilis / Rus dilləri arasında **modelsiz** tərcümə xidməti. Defoltda LLM və xarici tərcümə API-si **işlətmir**:
tərcümə hazır insan tərcümələrindən **axtarış və uyğunlaşdırma** ilə tapılır, tapılmayanda heç nə uydurmur (`method: "no-source"`).
Sonradan öz serverinizdə işləyən NMT modeli **bir adapter** ilə qoşula bilər (aşağıda), zəng edən kodlar dəyişmir.

Hər tərcümənin altında kiçik sətir (`footer`) qaytarılır: `Nibras Tərcümə ilə tərcümə olunub, xətalar ola bilər` (az/tr/en/ru/ar).

## Mənbələr (cari)
| Mənbə | Nə üçün | Şərt |
|---|---|---|
| [HadeethEnc.com](https://hadeethenc.com) (IslamHouse) | 3574 seçilmiş hədis: ərəbcə + az (475) / tr (2150) / en (2328) / ru (2249) hazır insan tərcümələri, hökm və mənbə qeydi | «Mətn dəyişdirilmədən, HadeethEnc.com göstərilməklə» (HadeethEnc API şərtləri) – mətn olduğu kimi saxlanılır |
| [IslamHouse.com](https://islamhouse.com/az/books/2831432/) «Şərh Riyadus-Salihin» (ən-Nəvəvi; şərh: M. ibn Saleh əl-Useymin), az tərcümə: Əlixan Musayev | 106 hədis üçün **azərbaycanca** hazır insan tərcüməsi (Riyadus-Salihin №1–239 aralığı); ərəbcə mətn Şamilə (Riyad as-Salihin, Şuayb əl-Arnaut nəşri) | IslamHouse: mətn dəyişdirilmədən, mənbə göstərilməklə. Yalnız hədis mətninin tərcüməsi + mənbə cümləsi götürülür (şərh atılır); PDF şriftindəki ﷺ/رضي الله عنه simvolları bərpa edilib. Hizalama: PDF haşiyəsindəki mənbə nömrəsi (Buxari/Muslim) ilə Şamilə mətninin söz üst-üstə düşməsi (≥75% və ya eyni nömrədə ≥50%) |
| Korpusdan çıxarılmış sabit ifadələr | `صلى الله عليه وسلم`, `رضي الله عنه/عنها/عنهما` – hər dildə ən çox işlənən qarşılıq (say göstərilir) | HadeethEnc korpusu |

Quran ayələri bu sistemə **daxil deyil**. Hədis kitablarının hazır tərcümələri olan başqa dəstlər (fawazahmed0/hadith-api: Muhsin Khan, Siddiqui və s.) tərcüməçi müəllif hüququ aydın olmadığı üçün **qoşulmayıb**.

## Necə işləyir
1. **Sabit ifadə**: giriş tam bir formul ifadədirsə (`ﷺ`, `رضي الله عنه`…) → lüğətdən qarşılıq (`method: "lexicon"`).
2. **Hədis uyğunlaşdırması**: giriş hərəkələrdən/hamzə-alif variantlarından təmizlənir, hədis mətnləri ilə ən uzun ortaq söz ardıcıllığı tapılır (rəvayət boilerplate-i «قال رسول الله ﷺ» sayılmır).
   - `exact` / `normalized` – eyni mətn; `matn` – yalnız «…» içindəki hədis mətni; `contains` – mətn hədis + əlavə söz (isnad);
   - `fragment` – giriş hədisin bir parçasıdır (hədisin tam tərcüməsi qaytarılır, `notes`-da yazılır);
   - `partial` – yalnız qismən oxşarlıq: **tərcümə verilmir**, `closest` sahəsində ən yaxın hədis göstərilir.
3. Hədəf dildə hazır tərcümə varsa → `method: "lookup"`. Yoxdursa digər dillərdəki hazır tərcümələr `parallel` siyahısında (dil etiketi ilə) qaytarılır, `method: "lookup-alt-lang"`; **onlar hədəf dilə çevrilmir**.
4. Çarpaz yoxlama: eyni hədisin dillərdəki mətnlərində rəqəmlər müqayisə olunur (`crosscheck.agree`); uyğunsuzluqda `confidence` azalır. Bu zəif siqnaldır, dəqiqlik zəmanəti deyil.
5. Heç nə tapılmadı → `method: "no-source"`. `TRANSLATE_ENGINE_URL` qoşulubsa → `method: "model"` (maşın tərcüməsi kimi etiketlənir).

## HTTP API
`POST /api/translate` (CORS açıq), `GET /api/translate` → xidmət məlumatı + əhatə.
```bash
curl -X POST https://nibrascode.com/api/translate -H 'Content-Type: application/json' \
  -d '{"text":"سل الله العافية في الدنيا والآخرة","from":"auto","to":"az","ui":"az"}'
```
Sorğu: `{ text | texts[≤20], from: "auto|ar|az|tr|en|ru", to, ui: "az|tr|en|ru|ar", parallel: true }`.
Cavab:
```jsonc
{
  "ok": true, "brand": "Nibras Tərcümə",
  "method": "lookup",            // lookup | lookup-alt-lang | lexicon | model | no-source
  "translation": "…", "translation_lang": "az",
  "confidence": 0.75,            // exact 1, normalized .97, matn .92, contains .9, fragment .6-.85, partial .4 (tərcümə verilmir)
  "match": { "type": "fragment", "kind": "hadith", "id": 2932, "ar_text": "…", "reference": "…", "url": "…" },
  "sources": [{ "name": "HadeethEnc.com", "url": "https://hadeethenc.com/az/browse/hadith/2932", "lang": "az", "license": "…" }],
  "translation_meta": { "attribution": "…", "grade": "…" },   // mənbədəki hökm/qeyd (olduğu kimi)
  "parallel": [{ "lang": "tr", "label": "türkcə", "text": "…", "source": { … } }],
  "candidates": [], "crosscheck": { "check": "numbers", "agree": null, … },
  "notes": ["Hazır insan tərcüməsi, dəyişdirilməyib."],
  "footer": "Nibras Tərcümə ilə tərcümə olunub, xətalar ola bilər"
}
```
Mənbə yoxdursa: `{"ok":true,"method":"no-source","translation":null,"notes":["Bu mətn üçün hazır tərcümə mənbəsi tapılmadı."]}`. Xəta: `ok:false`, `error`.

Təhlükəsizlik: `TRANSLATE_API_KEY` təyin olunsa `Authorization: Bearer <key>` və ya `X-API-Key` tələb olunur (təyin olunmayıbsa açıqdır). Sorğu limiti: IP başına dəqiqədə 120 (yaddaşda, best-effort).

## Başqa layihədə istifadə
Paket kimi: `import { translate } from "nibras-translate-core"` → `await translate({ text, to: "az" })`. Və ya `src/` qovluğunu köçürün (`node scripts/vendor.mjs <hədəf>/_translate`), `http.js` default export `(req,res)` Vercel/Node/Express ilə uyğundur. Məlumat `src/data/*.js` (brotli+base64, tənbəl yüklənir, cəmi ≈2 MB).

## Model mühərrikinin qoşulması (gələcək mərhələ)
`TRANSLATE_ENGINE_URL` (+ ixtiyari `TRANSLATE_ENGINE_KEY`, `TRANSLATE_ENGINE_TIMEOUT_MS`) təyin edin. Sistem hazır mənbə tapmayanda və ya hədəf dildə hazır tərcümə olmayanda mühərrikə sorğu göndərir:
```
POST $TRANSLATE_ENGINE_URL   { "text": "…", "from": "ar", "to": "az" }
→ 200 { "translation": "…", "engine": "nllb-600m-ct2", "confidence": 0.0-1.0 (ixtiyari), "pivot": ["en"] (ixtiyari) }
```
Mühərrik cavabı `method: "model"` olaraq qayıdır və «Maşın tərcüməsidir» qeydi ilə etiketlənir; hazır insan tərcümələri `parallel`-da qalır. Mühərrik xəta versə/boş qaytarsa sistem `no-source` cavabına qayıdır. Adapter kodu: `src/adapter.js` (testdə `translate({ engine: async ({text,from,to}) => … })` ilə dəyişdirilə bilər).

### Host mühərriki: `setDefaultEngine` + `method: "ensemble"`
Host tətbiq (məs. Nibras AI saytı) `setDefaultEngine(async ({ text, from, to, ui, ctx }) => …)` ilə öz mühərrikini qeydiyyata alır; cavab `{ translation, engine, confidence, method?: "ensemble", noteKeys?: [...], meta? }` və ya `{ limited: "rate"|"budget" }` və ya `null`. `translate({ ctx })` və `handleTranslate(body, makeCtx(ip))` sorğu konteksti (IP, `engineChars` simvol limiti, `deadlineAt`) ötürür. Nibras saytında bu mühərrik `api/_translate-ensemble.js`-dir (saytın artıq qoşulmuş AI provayderlərinin konsensusu, tərcümə yaddaşı, limitlər). Nəticə həmişə `machine: true`, `flags: [...]` ilə qayıdır; `debug: true` göndərilsə `diagnostics` (provayder id-ləri, gecikmə) əlavə olunur (UI göstərmir). Mətn limiti: 3000 simvol (`MAX_TEXT`, `maxChars` ilə dəyişir). Mətn daha uzun hadisənin içində hazır hədisi ehtiva edir və örtük <60%-dirsə, bütün mətn mühərrikə gedir, hədisin hazır tərcüməsi `parallel[]`-də qalır.

## Əlavə mənbələr (`src/data/ext.js`)
`node scripts/build-ext.mjs <items.json>` hazır tərcümələri `ext.js`-ə yığır (id ≥ 900000). `loadPart('ar'|'az'|…)` onları HadeethEnc sətirlərinin sonuna əlavə edir, axtarış kodu eyni qalır; eyni hədis iki mənbədə olarsa hədəf dildə hazır tərcüməsi olan seçilir. `coverage()` HadeethEnc saylarını dəyişmir, əlavələr `extra` sahəsindədir.

**Qoşulmayan mənbələr (səbəb):** Kütübü-sittənin tr/ru/en tərcümələri (fawazahmed0/sunnah.com/i-muslim: tərcüməçi müəllif hüququ, açıq lisenziya yoxdur); IslamHouse az PDF-ləri «Müxtəsər Səhih əl-Buxari», «Səhih Müslim», «Qırx hədis» (şrift kodlaşdırması itkili/şifrəli – ə, ı, ş, ğ itir; təmiz çıxarış mümkün deyil); USC-MSA, Sunnah.com (qeyri-kommersiya/müəllif hüququ).

## Məlumatın yenilənməsi
`node scripts/fetch-hadeethenc.mjs <RAW>` → `node scripts/build-data.mjs <RAW>`. Mətn dəyişdirilmir.

## Məhdudiyyətlər
- Yalnız HadeethEnc-də olan hədislər tərcümə olunur (3574 hədis; Kütübü-sittənin kiçik hissəsi). Eyni mənalı, lakin fərqli rəvayət sözləri olan hədis `partial` olur və tərcümə verilmir.
- Azərbaycanca hədis tərcüməsi yalnız 475 hədis üçün var; qalanlar üçün tr/en/ru hazır tərcümələri ayrıca etiketlə qaytarılır.
- Fətva, nəhv, lüğət, təfsir mətnləri üçün hazır insan tərcüməsi yoxdur → mühərrik qoşulmayıbsa `no-source`, qoşulubsa maşın tərcüməsi (`ensemble`/`model`), xətalar ola bilər.
