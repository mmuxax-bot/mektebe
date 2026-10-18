import { AsyncLocalStorage } from "node:async_hooks";
import { askProvider, aiConfig } from "./_ai.js";
import { cannedReply } from "./_canned.js";
import { quranReply } from "./_quran.js";
import { tawhidReply, tawhidFallbackReply } from "./_tawhid.js";
import { tafsirReply, withTafsirSuggest } from "./_tafsir.js";
import { nextReply } from "./_next.js";
import { gameReply } from "./_game.js";
import { ayahReply, quranTextReply, finalizeAi, compactHistory, AYAH_PROMPT } from "./_ayah.js";
import { lughaReply, lughaNotFoundNote, isLexicalQuestion, lexicalFollowup } from "./_lugha.js";
import { nahwReply } from "./_nahw.js";
import { LAT_CUE } from "./_nahw/terms.js"; // Nibras Library: qrammatika sualı işarəsi (kitabxana axtarışı üçün)
import { hadithReply, hadithBare } from "./_hadith.js";
import { fatawaReply, fatawaNaturalReply } from "./_fatawa.js";
import { itbooksReply } from "./_itbooks.js";
import { translateReply } from "./_translate-chat.js";
import { snippetReply } from "./_snippets.js";
import { localReply } from "./_local.js";
import { toolsReply } from "./_tools.js";
import { wikidataReply } from "./_wikidata.js";
import { extraReply, prayerReply } from "./_extra.js";
import { track } from "./_stats.js";
import { locateBlocks } from "./_lib/locate.js";
import { libraryAnswer, groundingPrompt } from "./_lib/ground.js"; // Nibras Library: AI-dən əvvəl kitabxana axtarışı və AI üçün mənbə çıxarışları // Nibras Library: kitab bloklarına «Kitabda aç» linkləri (cavab mətni dəyişmir)
import { isReligious } from "./_religious.js";
import { isSourceKind, stripNotice, OLD_AZ_NOTICE } from "./_notice.js";

const SYSTEM = [
  "Sən Nibras AI-san, Nibras Code saytının köməkçisisən.",
  "Cavabların qısa, aydın və nəzakətli olsun. İstifadəçi hansı dildə yazırsa, o dildə cavab ver.",
  "Cavaba İbn Sirin sitatı, «süni intellektdən din öyrənilməz» xəbərdarlığı və «لن» ədatı haqqında qrammatik təvil yazma.",
  "Layihənin adı Nibras Code-dur. NibrasCodr yazma. Sahibi Mahir Əliyevdir. Bu faktı dəyişmə, başqa adam adı uydurma.",
  "Nibras Code böyük şirkət deyil. Sadə, faydalı və istifadəsi rahat tətbiqlər üzərində çalışan müstəqil şəxsi layihədir.",
  "Tətbiqlər: Nibras Arabic hazırdır. Nibras PDF və Nibras Plans tezliklədir. Nibras Docs hazırlanır.",
  "Pulsuz tətbiqlərdə də reklam yoxdur. Premium olsa belə, əsas funksiyalar pulsuz qalır.",
  "Əlaqə: nibrascode@gmail.com. Sayt: nibrascode.com.",
  "Nibras Code, tətbiq siyahısı və əlaqə ünvanını yalnız istifadəçi Nibras, tətbiq, reklam və ya əlaqə haqqında soruşanda yaz. Başqa cavabın sonuna imza, reklam və ya əlaqə əlavə etmə.",
  AYAH_PROMPT,
].join(" ");

const LEXICAL_HINT =
  "Bu, ərəbcə (və ya dini) sözün mənası (lüğət) sualıdır, dini hökm və ya fətva sualı deyil. Sözün mənasını qısa və düz izah et. Xəbərdarlıq sitatı yazma. Allahın sifətlərini təvil etmə. " +
  "SƏRT QAYDALAR: kök, məna, etimologiya və ya feil formalarını UYDURMA; dəqiq bilmirsənsə, bunu açıq yaz (məsələn «dəqiq bilmirəm»). Quran ayəsi və ya Quranın ərəbcə mətnini, ﴿ ﴾ içində heç nə, [[ayah:..]] işarəsini YAZMA, ayə nömrəsi də göstərmə. Cavab qısa olsun (2-4 cümlə).";

// Tək ərəbcə söz (ال ilə, məs. «الصبر»): başqa heç bir idarəçi tanımadısa, lüğət mənası (Ibn Faris və s., api/_lugha.js) göstərilir.
// Zəncirin sonunda işləyir ki, «الفاعل» (nəhv), «التوحيد» (tövhid) kimi sözlər öz idarəçisində qalsın.
const BARE_AR = /^\s*ال[\u0621-\u064A\u064B-\u065F\u0670]{3,}\s*[؟?.!]?\s*$/;
const BARE_SKIP = /^(?:السلام|الحمد|الله)$/;
async function bareWordLugha(m) {
  const w = String(m || "").replace(/[؟?.!\s\u064B-\u065F\u0670]/g, "");
  if (!BARE_AR.test(m) || BARE_SKIP.test(w)) return null;
  return lughaReply("معنى " + w);
}

export const LIMIT_REPLY = "Bu gün üçün sual limiti bitdi. Sabah yenidən yaz. Hazır cavabı olan suallar isə bu gün də cavablanır.";

export const config = { maxDuration: 45 };

// Uzun kod (oyun, proqram) soruşulanda cavab 700 tokenda kəsilib yarımçıq qalırdı: belə sorğularda token/vaxt həddi böyüdülür.
// Hədd sorğu daxilində (AsyncLocalStorage) saxlanır ki, provayder funksiyalarının imzası dəyişməsin.
const budget = new AsyncLocalStorage();
export const SHORT_TOKENS = 700;
export const CODE_TOKENS = 3500;
export function wantsLongCode(message, mode) {
  if (mode === "code") return true;
  const q = String(message || "").toLowerCase();
  return /(^|[^\p{L}])(kod\w*|code\w*|coding|oyun\w*|game\w*|html|script\w*|skript\w*|proqram\w*|program\w*|canvas|javascript|python|код\w*|игр\w*|скрипт\w*)/u.test(q) || /(كود|لعبة|لعبه|برنامج|سكريبت)/.test(q);
}
function tokenLimit() { return budget.getStore()?.long ? CODE_TOKENS : SHORT_TOKENS; }
function timeoutFor(base) {
  const st = budget.getStore();
  if (!st || !st.long) return AbortSignal.timeout(base);
  return AbortSignal.timeout(Math.max(3000, Math.min(20000, st.deadline - Date.now())));
}
// Kəsilmiş (açıq qalmış ```) kod bloku bağlanır və istifadəçiyə xəbər verilir
export function closeTruncatedFence(text) {
  const t = String(text || "");
  if ((t.match(/```/g) || []).length % 2 === 0) return t;
  return t.replace(/\s+$/, "") + "\n```\n\nKod uzunluq həddinə çatdığı üçün yarımçıq qala bilər. Davamı üçün «davam et» yaz.";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ success: false, reply: "Yalnız POST sorğusu qəbul olunur." });
    return;
  }

  try {
    const body = await readJson(req);
    const message = String(body.message || "").trim().slice(0, 800);
    if (!message) {
      res.status(400).json({ success: false, reply: "Mesaj boş ola bilməz." });
      return;
    }
    // Nibras Library: nibrascode.com serverindən gələn «yalnız kitab» sorğusu (başlıq x-nibras-books-only: 1). Yalnız məlumat idarəçiləri
    // (fətava, İbn Teymiyyə kitabları, hədis, ayə davamı, təfsir, ayə, tövhid, hazır cavab, Quran lüğəti, ərəb lüğəti, nəhv) eyni sırada işləyir;
    // AI provayderi HEÇ VAXT çağırılmır. op:"finalize" — AI cavabındakı [[ayah:..]] / ﴿…﴾ mətnini Tanzil ilə əvəz edir (modelsiz).
    if (String(req.headers?.["x-nibras-books-only"] || "") === "1") {
      await booksOnly(body, message, res);
      return;
    }
    // Bəqərə surəsi sözlərinin izahı hazır cavabdır (AI-yə getmir). dinReply-dən əvvəl gəlməlidir,
    // yoxsa «ayə»/«təfsir» sözləri olan suallar ümumi dini xəbərdarlığa düşər.
    // Tövhid 1 (Əqidə 3001) dərs xülasəsi də hazır cavabdır. cannedReply-dən əvvəl gəlir: «Allahın adları təvqifidir» kimi
    // suallarda «Allahın adları» ifadəsi ümumi hazır cavaba düşməsin. Tövhid uyğunlaşdırıcısı yalnız mətndəki suallara cavab verir.
    // Quran ayələrinin mətni yalnız daxili Tanzil məlumatından gəlir (api/_ayah.js): «Bəqərə 255», «İxlas surəsi», «Ayətül-Kürsi».
    // Sözlərin izahı (mənası, izah, söz) sorğuları burada null qaytarır və aşağıdakı quranReply-ə düşür.
    // Təfsir sorğuları («Bəqərə 255 təfsiri», «İbn Kəsir təfsiri 2:255») ayə axtarışından əvvəl gəlir (api/_tafsir.js, daxili məlumat, AI-siz).
    // Hansı idarəçinin cavab verdiyi bilinir: ayə, tövhid, hazır dini cavab, Quran lüğəti və dinReply dini sayılır (brend yox).
    let fixed = null;
    let religious = false;
    let fromSource = false; // cavab daxili mənbədən (ayə, təfsir, tövhid, kitab) gəlir: AI-siz, bildiriş verilmir
    // söhbət tarixçəsi: client «messages» göndərir ({role,text}); «history» və «content» də qəbul olunur
    const hist = (Array.isArray(body.messages) ? body.messages : Array.isArray(body.history) ? body.history : []).map((i) => (i && i.text == null && typeof i.content === "string" ? { ...i, text: i.content } : i));
    // client bütün söhbətdə göstərilmiş oyunların slug-larını ayrıca göndərir (tarixçə yalnız son mesajları saxlayır); sıra qorunur
    const gameHist = Array.isArray(body.games) && body.games.length
      ? body.games.filter((x) => typeof x === "string" && /^[a-z0-9-]{1,40}$/.test(x)).slice(-60).map((x) => ({ role: "assistant", text: `::game:: ${x} | x` }))
      : hist;
    // Sözün mənası (lüğət) sualı dini məsləhət deyil: bildiriş verilmir, dinReply-ə düşmür, AI də xəbərdarlıq yazmır.
    // strict: ərəb yazılı söz / «söz» işarəsi / tanış transliterasiya; loose: «what is the meaning of ihlas» kimi qısa sual (yalnız dinReply/AI üçün).
    // Əvvəlki mesaj söz mənası sualı idisə və indi yalnız ərəbcə söz yazılıbsa («والصبر؟»), bu da lüğət sualıdır.
    const follow = lexicalFollowup(message, hist);
    const lexical = isLexicalQuestion(message) || !!follow;
    const lexicalLoose = lexical || isLexicalQuestion(message, { loose: true });
    // Tərcümə («tərcümə et: …», «translate: …», «переведи: …», «ترجم: …»): modelsiz, hazır insan tərcümələrindən (api/_translate); yalnız aydın əmr + ərəbcə mətn/iki nöqtə olanda, game-dən sonra.
    // Məcmuu əl-Fətava (İbn Teymiyyə) axtarışı yalnız açıq «فتاوى ابن تيمية»/«مجموع الفتاوى»/«İbn Teymiyyə fətvası» sorğusunda işləyir; hədis, ayə, nəhv, lüğət idarəçilərindən əvvəl gəlir, çünki onlar həmin ifadələri tanımır.
    if (!fixed && body.mode !== "code" && body.mode !== "create") {
      try {
        const prayer = await prayerReply(message);
        if (prayer) fixed = prayer;
      } catch {
        /* namaz vaxtı tapılmazsa, sual öz axınında qalır */
      }
    }
    if (!fixed) for (const [kind, fn] of [["game", (m) => gameReply(m, gameHist)], ["ayah", (m) => (body.mode === "code" || body.mode === "create" ? null : quranTextReply(m))], ["book", (m) => translateReply(m, { ip: String(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "").split(",")[0].trim() || "chat" })], ["book", (m) => fatawaReply(m, hist)], ["book", (m) => (body.mode === "code" || body.mode === "create" ? null : itbooksReply(m, hist))], ["book", (m) => hadithReply(m, hist)], ["next", (m) => nextReply(m, hist)], ["tafsir", tafsirReply], ["ayah", ayahReply], ["tawhid", tawhidReply], ["canned", cannedReply], ["quran", quranReply], ["book", (m) => lughaReply(follow || m)], ["book", nahwReply], ["book", hadithBare], ["book", (m) => (lexicalLoose || body.mode === "code" || body.mode === "create" ? null : fatawaNaturalReply(m))], ["book", (m) => (body.mode === "code" || body.mode === "create" ? null : bareWordLugha(m))], ["din", (m) => (lexicalLoose ? null : dinReply(m))], ["brand", brandReply], ["tawhid", tawhidFallbackReply]]) {
      let r = await fn(message);
      if (r) {
        if (kind === "ayah") r = withTafsirSuggest(r, message); // təfsir istənilməyib: ayə/surə cavabına təfsir seçimləri əlavə olunur
        fixed = r;
        fromSource = isSourceKind(kind);
        religious = kind !== "brand" && kind !== "game" && !lexical && !(kind === "din" && body.mode === "code"); // kod rejimində ümumi din-söz uyğunluğu dini sual sayılmır
        break;
      }
    }
    // Hava, məzənnə, qısa izah və paket modeli çağırmır. Qalan fakt Wikidata-ya düşür.
    if (!fixed && body.mode !== "code" && body.mode !== "create") {
      try {
        const extra = await extraReply(message);
        if (extra) fixed = extra;
      } catch {
        /* mənbə susursa, sual Wikidata-ya və ya modelə düşür */
      }
    }
    // Wikidata faktı modelə getmir: şəhər, adam, ölkə kimi aydın sualı server özü oxuyur.
    if (!fixed && body.mode !== "code" && body.mode !== "create") {
      try {
        const wiki = await wikidataReply(message);
        if (wiki) fixed = wiki;
      } catch {
        /* Wikidata susursa, sual hazır cavaba və ya modelə düşür */
      }
    }
    // Köhnə İbn Sirin bildirişi və «لن» qrammatika xəbərdarlığı artıq əlavə olunmur. Model yazsa belə, silinir.
    const cleaned = (reply) => stripLanWarning(stripNotice(reply));
    const relFlag = (isRel) => (isRel ? { religious: true } : {});
    // Hazır python/html/javascript/sql/css kod nümunələri: AI-yə getmədən (kod rejimi də daxil)
    const snippet = fixed ? null : snippetReply(message, body.mode);
    const tools = fixed || snippet || body.mode === "create" ? null : toolsReply(message);
    const ready =
      fixed ||
      snippet ||
      tools ||
      // Çox kiçik sorğular (salam, təşəkkür, sadə hesab, saat/tarix) yerli cavablanır
      (body.mode === "create" ? null : localReply(message));
    if (ready) {
      track("snippet", snippet ? "hit" : "local"); // yalnız say; mesaj mətni saxlanmır
      // Hazır cavab: xarici AI çağırılmayıb -> limitə sayılmır (usedAI:false)
      const isRel = fixed ? religious : false;
      // dinReply artıq özü bildirişdir: sonrakı dini suallarda (noticeShown:true) təkrar bildiriş yox, qısa cavab qalır
      let out = cleaned(ready);
      if (isRel && ready.startsWith(OLD_AZ_NOTICE)) out = cleaned(ready.slice(OLD_AZ_NOTICE.length));
      const links = fixed ? await locateBlocks(out, message).catch(() => []) : [];
      res.status(200).json({ success: true, reply: out, usedAI: false, ...relFlag(isRel), ...(links.length ? { links } : {}) });
      return;
    }
    // Nibras Library: dini və ya kitab/qrammatika sualı AI-yə getməzdən əvvəl kitabxanada axtarılır (api/_lib/ground.js).
    // Yaxşı nəticə varsa, cavab sözbəsöz çıxarışlardır (mənbə + «Kitabda aç»); yoxdursa, tapılan 3–5 çıxarış AI-yə mənbə kimi verilir.
    let grounding = [];
    let libWeak = null; // zəif kitabxana nəticəsi: AI cavab verə bilməsə, xəta əvəzinə bu çıxarışlar göstərilir
    const bookish = body.mode !== "code" && body.mode !== "create" && !lexicalLoose && (isReligious(message, body.mode) || LAT_CUE.test(fold(message)) || /[\u0621-\u064A]{2}/.test(message));
    if (bookish) {
      try {
        const lib = await libraryAnswer(message, replyLang(message));
        if (lib.strong) {
          track("snippet", "library");
          res.status(200).json({ success: true, reply: lib.reply, usedAI: false, religious: true, links: lib.links, library: true });
          return;
        }
        grounding = lib.items || [];
        if (lib.reply && grounding.length) libWeak = lib;
      } catch {
        /* axtarış alınmadı: sual adi axınla AI-yə gedir */
      }
    }
    // Gündəlik limit istifadəçi tərəfində sayılır; doluysa yalnız xarici AI tələb edən suallar dayandırılır (hazır cavablar yuxarıda artıq cavablanıb)
    if (body.limitReached === true) {
      res.status(200).json({ success: true, reply: LIMIT_REPLY, usedAI: false, limited: true });
      return;
    }
    track("snippet", "ai");
    const history = normalizeHistory(hist, message);
    if (body.mode === "code") {
      history.unshift({
        role: "system",
        text: "İstifadəçi kod istəyir. İşlək kod yaz. Kodu mütləq ``` dil ``` blokunda ver və bloku sonadək bağla; kodu yarımçıq buraxma (html oyun/səhifə üçün tək faylda, </html> ilə bitən tam kod). İzahı bir-iki cümlə saxla. Kod yazmağı rədd etmə.",
      });
    } else if (body.mode === "create") {
      history.unshift({
        role: "system",
        text: "İstifadəçi yeni fikir istəyir. Onun yazdığı mövzuya uyğun qısa, konkret və istifadə edilə bilən bir fikir ver. Boş ümumi cümlə ilə keçinmə.",
      });
    }
    if (lexicalLoose && body.mode !== "code") {
      history.unshift({ role: "system", text: LEXICAL_HINT });
    }
    if (grounding.length) history.unshift({ role: "system", text: groundingPrompt(grounding) });
    const hint = body.mode === "code" ? " kod" : body.mode === "create" ? " yaradıcı" : "";
    const order = pickOrder(message + hint);
    const notes = [];
    const started = Date.now();

    const long = wantsLongCode(message, body.mode);
    const ctx = { long, deadline: started + 40000 };
    for (const name of order) {
      if (Date.now() - started > (long ? 30000 : 18000)) break;
      const result = await budget.run(ctx, () => aiConfig.run({ system: SYSTEM, tokens: tokenLimit, timeout: timeoutFor }, () => askProvider(name, history, lexicalLoose ? LEXICAL_HINT + "\n\n" + message : message)));
      if (result.skipped) continue;
      if (result.ok) {
        // AI ayə mətni yazıbsa, ərəbcə hissə Tanzil məlumatı ilə əvəz olunur, [[ayah:S:A]] işarələri açılır
        const isRel = isReligious(message, body.mode) && !lexicalLoose;
        let aiReply = cleaned(closeTruncatedFence(finalizeAi(result.reply, message, { noBlocks: lexicalLoose })));
        // Söz mənası lüğətdə tapılmadı, cavabı AI yazıb: dəqiq olmaya bilər qeydi (dini bildiriş yox)
        const nf = lexical ? lughaNotFoundNote(follow || message) : null;
        if (nf && aiReply.trim()) aiReply = aiReply.replace(/\s+$/, "") + "\n\n" + nf;
        if (!aiReply.trim()) {
          notes.push(name + ": boş cavab");
          continue;
        }
        const sources = grounding.slice(0, 5).map((x) => ({ book: x.book, p: x.p, q: x.via, ref: x.ref, title: x.bookAr }));
        res.status(200).json({ success: true, reply: aiReply, usedAI: true, ...relFlag(isRel), ...(sources.length ? { sources } : {}) });
        return;
      }
      notes.push(name + ": " + String(result.detail || "xəta").slice(0, 140));
      if (notes.length >= 12) break;
    }

    // AI provayderləri cavab vermədi: kitabxanada tapılan çıxarışlar varsa, xəta yox, onlar göstərilir (sözbəsöz, mənbə ilə)
    if (libWeak) {
      track("snippet", "library");
      res.status(200).json({ success: true, reply: libWeak.reply, usedAI: false, religious: true, links: libWeak.links, library: true });
      return;
    }
    track("error", "ai");
    res.status(200).json({
      success: false,
      reply: "İndi cavab alınmadı. Bir az sonra yenidən yoxlayın.",
      usedAI: false,
    });
  } catch {
    track("error", "server");
    res.status(200).json({
      success: false,
      reply: "Server xətası. Bir az sonra yenidən cəhd edin.",
    });
  }
}

// ---------------------------------------------------------------- Nibras Library: «yalnız kitab» rejimi (nibrascode.com üçün)
async function booksOnly(body, message, res) {
  const hist = (Array.isArray(body.messages) ? body.messages : Array.isArray(body.history) ? body.history : []).map((i) => (i && i.text == null && typeof i.content === "string" ? { ...i, text: i.content } : i));
  const follow = lexicalFollowup(message, hist);
  const lexical = isLexicalQuestion(message) || !!follow;
  const lexicalLoose = lexical || isLexicalQuestion(message, { loose: true });
  const meta = { lexical, lexicalLoose };
  if (body.op === "meta") {
    res.status(200).json({ success: true, ...meta });
    return;
  }
  if (body.op === "finalize") {
    // AI cavabının son emalı (chat.js-dəki kimi): ayə işarələri/sitatları + lüğətdə tapılmayan söz qeydi
    const text = finalizeAi(String(body.text || ""), message, { noBlocks: lexicalLoose });
    const note = lexical ? lughaNotFoundNote(follow || message) : null;
    res.status(200).json({ success: true, text, note, ...meta });
    return;
  }
  const code = body.mode === "code" || body.mode === "create";
  const chain = [["ayah", (m) => (code ? null : quranTextReply(m))], ["book", (m) => fatawaReply(m, hist)], ["book", (m) => (code ? null : itbooksReply(m, hist))], ["book", (m) => hadithReply(m, hist)], ["next", (m) => nextReply(m, hist)], ["tafsir", tafsirReply], ["ayah", ayahReply], ["tawhid", tawhidReply], ["canned", cannedReply], ["quran", quranReply], ["book", (m) => lughaReply(follow || m)], ["book", nahwReply], ["book", hadithBare], ["book", (m) => (lexicalLoose || code ? null : fatawaNaturalReply(m))], ["book", (m) => (code ? null : bareWordLugha(m))], ["tawhid", (m) => ((!lexicalLoose && dinReply(m)) || brandReply(m) ? null : tawhidFallbackReply(m))]];
  // sonuncu: tövhid ehtiyat uyğunlaşdırması (en/ru/tr, qısa ifadə) — nibrascode-un din/brand cavabları qabaqlanmır
  for (const [kind, fn] of chain) {
    let r = await fn(message);
    if (!r) continue;
    if (kind === "ayah") r = withTafsirSuggest(r, message);
    const isRel = !lexical; // chat.js: religious = kind !== brand/game/din-kod && !lexical
    let out = stripLanWarning(stripNotice(r));
    if (isRel && r.startsWith(OLD_AZ_NOTICE)) out = stripLanWarning(stripNotice(r.slice(OLD_AZ_NOTICE.length)));
    const links = await locateBlocks(out, message).catch(() => []);
    res.status(200).json({ success: true, reply: out, usedAI: false, kind, fromSource: isSourceKind(kind), ...(isRel ? { religious: true } : {}), links, sources: [], ...meta });
    return;
  }
  res.status(200).json({ success: true, reply: null, ...meta });
}

function fold(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g");
}

function replyLang(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  const q = fold(text);
  if (/[əğıöüçş]/i.test(text)) return "az";
  if (/\b(uygulama|ucretsiz|hakkinda|degildir|lutfen|merhaba|tesekkur|kurucusu|yakinda|projen)\b/.test(q)) return "tr";
  if (/\b(who|what|owner|owns|about|contact|free|company|is|the)\b/.test(q)) return "en";
  return "az";
}

function stripLanWarning(text) {
  return String(text || "")
    .replace(/Ərəb qrammatikasında\s*[«"]?لن[»"]?[\s\S]{0,500}?təvillər vermə\.?\s*/g, "")
    .replace(/[^\n]*«لن»[^\n]*(əbədi inkar|Allahı görm|təvil)[^\n]*\n?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ISLAM_DEF = [
  "Qurana və səhih Sünnəyə möhkəm sarılmaq, dini səhabələrin, tabiinlərin və onların yolunu izləyən ilk nəsillərin anlayışı ilə qəbul etməkdir.",
  "Bu əqidənin əsası tövhiddir: ibadəti yalnız Allaha yönəltmək, Ona heç bir şərik qoşmamaq və Allahın ad və sifətlərini Quranda və səhih Sünnədə gəldiyi kimi qəbul etməkdir. Həmçinin peyğəmbərlərə, mələklərə, kitablara, axirət gününə və qədərə iman etmək, İslamın əsaslarını və imanın şərtlərini təsdiq etməkdir.",
  "Sələfin yolu dini şəxsi fikir, fəlsəfə və sonradan ortaya çıxmış etiqadlarla deyil, Quran, səhih Sünnə və ilk nəsillərin anlayışı ilə öyrənməyi əsas tutur. Buna görə müsəlman etiqad məsələlərində etibarlı və elm sahibi alimlərə müraciət etməli, dəlilsiz danışmaqdan çəkinməlidir.",
].join("\n\n");

function islamDefinition(q, raw) {
  if (/(ما هو الإسلام|ما هو الاسلام|الإسلام الصحيح|حقيقة الإسلام|ما معنى الإسلام|الإسلام الحق)/.test(raw)) return true;
  if (/(dogru|heqiqi|heqiqi|esl|sahih|sehih|gercek|hakiki|true|real|correct|истинн|подлинн)\s+islam/.test(q)) return true;
  if (/islam\w{0,4}\s+(nedir|ne dir|nedemek|ne demek|menasi|terifi|haqqinda|anlami|nədir)/.test(q)) return true;
  if (/\b(what is islam|whats islam|что такое ислам|истинный ислам)\b/.test(q)) return true;
  return false;
}

export function dinReply(message) {
  const raw = String(message || "");
  const q = fold(raw);
  if (islamDefinition(q, raw)) return ISLAM_DEF;
  return null;
}

export function brandReply(message) {
  const raw = String(message || "");
  const q = fold(raw);
  const brand = /nibras\s*cod|nibrascod|nibrascode|nibras\s*ai|nibras\s*arabic|nibras\s*pdf|nibras\s*plans|nibras\s*docs|\bnibras\b|mahir/.test(q);
  const self = /seni kim|sen kim|who are you|kim yarat|seni yarad|who made you|sen kimesen|sen kimsən/.test(q);
  if (!brand && !self) return null;
  if (/(kod yaz|kodu yaz|kod numune|write code|script yaz)/.test(q)) return null;

  const lang = replyLang(raw);
  const who = /(kimindir|kimin dir|kimdir|sahibi|sahib|owner|owns|founder|kurucu|aittir|aitdir|belongs|whose|who owns|кому принадл|чей |владел|صاحب|لمن)/.test(q) || /mahir/.test(q) || self;
  const contact = /(elaqe|email|e-poct|gmail|contact|mail|почт|связ|تواصل|بريد)/.test(q);
  const ads = /(reklam|ads|advert|реклам|إعلان)/.test(q);
  const price = /(pulsuz|odenis|premium|qiymet|free|ücret|ucret|платн|бесплат|مجاني|سعر)/.test(q);
  const company = /(sirket|company|şirkət|компания|شركة)/.test(q);
  const arabic = /arabic|ereb|arapca|араб/.test(q);
  const pdf = /\bpdf\b/.test(q);
  const plans = /plans|plan\b/.test(q);
  const docs = /\bdocs\b|sened/.test(q);
  const ai = /nibras\s*ai|nibrasai|yapay|komekci/.test(q) || self;
  const apps = /(tetbiq|uygulama|apps|приложен|تطبيق)/.test(q);

  const pack = {
    az: {
      who: "Nibras Code Mahir Əliyevin layihəsidir.\n\nNibras Code sadə, faydalı və istifadəsi rahat tətbiqlər üzərində çalışan müstəqil şəxsi layihədir. Böyük şirkət deyil. Məqsəd gündəlik ehtiyacı aydın interfeys və lazım olan funksiyalarla, reklamsız həll etməkdir.\n\nHazırda Nibras Arabic açıqdır. Nibras PDF və Nibras Plans tezliklə, Nibras Docs isə hazırlanır. Pulsuz tətbiqlərdə də reklam yoxdur.\n\nƏlaqə: nibrascode@gmail.com\nSayt: nibrascode.com",
      about: "Nibras Code Mahir Əliyevin müstəqil şəxsi layihəsidir. Böyük şirkət deyil.\n\nSadə ideyaları faydalı və rahat tətbiqlərə çevirir. Pulsuz tətbiqlərdə də reklam yoxdur. Nibras Arabic hazırdır. Nibras PDF və Nibras Plans tezliklə, Nibras Docs isə hazırlanır.\n\nƏlaqə: nibrascode@gmail.com",
      contact: "Nibras Code ilə əlaqə: nibrascode@gmail.com\nSayt: nibrascode.com\nLayihə Mahir Əliyevindir.",
      ads: "Nibras Code tətbiqlərində, pulsuz olanlarda da, reklam yoxdur. Layihə Mahir Əliyevindir.",
      price: "Tətbiqlərin hamısı pullu deyil. Pulsuz planda da reklam olmur. Premium olsa, əsas funksiyalar pul ödəmədən qalır. Premium daha çox istifadə edənlər üçün kiçik aylıq seçimdir.",
      company: "Xeyr. Nibras Code böyük şirkət deyil. Mahir Əliyevin başladığı müstəqil şəxsi layihədir.",
      arabic: "Nibras Arabic, Nibras Code-un ərəb dilini sadə və praktik öyrədən tətbiqidir. Hərflərlə yanaşı isimlər, feillər, sifətlər, saylar, dialoqlar, testlər, flash kartlar və feil babları var. Layihə Mahir Əliyevindir.",
      pdf: "Nibras PDF telefonunda PDF və şəkillərlə işləmək üçündür. Hazırda tezliklədir. Sənəd əsasən cihazda qalır. Layihə Nibras Code, yəni Mahir Əliyevindir.",
      plans: "Nibras Plans hələ tezliklədir. Nibras Code layihəsinin tətbiqlərindən biridir. Layihə Mahir Əliyevindir.",
      docs: "Nibras Docs hazırlanma mərhələsindədir. Nibras Code layihəsinə aiddir. Layihə Mahir Əliyevindir.",
      ai: "Mən Nibras AI-yam, Nibras Code saytının köməkçisiyəm. Nibras Code Mahir Əliyevin müstəqil layihəsidir.",
      apps: "Nibras Arabic hazırdır. Nibras PDF və Nibras Plans tezliklə, Nibras Docs isə hazırlanır. Hamısı Nibras Code, yəni Mahir Əliyevin layihəsidir. Pulsuz tətbiqlərdə reklam yoxdur.",
    },
    en: {
      who: "Nibras Code belongs to Mahir Əliyev.\n\nIt is an independent personal project, not a large company. It makes simple, useful apps that are comfortable to use, with no ads even on the free ones.\n\nNibras Arabic is available. Nibras PDF and Nibras Plans are coming soon. Nibras Docs is in preparation.\n\nContact: nibrascode@gmail.com\nSite: nibrascode.com",
      about: "Nibras Code is Mahir Əliyev's independent personal project. It is not a large company.\n\nIt turns simple ideas into useful, comfortable apps. Free apps have no ads. Nibras Arabic is ready. Nibras PDF and Nibras Plans are coming soon. Nibras Docs is in preparation.\n\nContact: nibrascode@gmail.com",
      contact: "Contact Nibras Code at nibrascode@gmail.com\nSite: nibrascode.com\nThe project belongs to Mahir Əliyev.",
      ads: "Nibras Code apps do not show ads, including the free ones. The project belongs to Mahir Əliyev.",
      price: "Not every app is paid. The free plan has no ads. If Premium exists, the main features stay usable without paying. Premium is a small monthly option for heavier use.",
      company: "No. Nibras Code is not a large company. It is Mahir Əliyev's independent personal project.",
      arabic: "Nibras Arabic is Nibras Code's app for learning Arabic in a simple, practical way. Besides letters it includes nouns, verbs, adjectives, numbers, dialogues, tests, flashcards, and verb forms. The project belongs to Mahir Əliyev.",
      pdf: "Nibras PDF is for working with PDFs and images on the phone. It is marked as coming soon. Files stay mainly on the device. It is part of Nibras Code, Mahir Əliyev's project.",
      plans: "Nibras Plans is coming soon. It is one of the Nibras Code apps. The project belongs to Mahir Əliyev.",
      docs: "Nibras Docs is still in preparation. It belongs to Nibras Code, Mahir Əliyev's project.",
      ai: "I am Nibras AI, the assistant on the Nibras Code site. Nibras Code is Mahir Əliyev's independent project.",
      apps: "Nibras Arabic is available. Nibras PDF and Nibras Plans are coming soon. Nibras Docs is in preparation. They all belong to Nibras Code, Mahir Əliyev's project. Free apps have no ads.",
    },
    tr: {
      who: "Nibras Code, Mahir Əliyev'in projesidir.\n\nBüyük bir şirket değildir. Sade, faydalı ve kullanımı rahat uygulamalar üzerinde çalışan bağımsız bir kişisel projedir. Ücretsiz uygulamalarda da reklam yoktur.\n\nNibras Arabic hazır. Nibras PDF ve Nibras Plans yakında. Nibras Docs hazırlanıyor.\n\nİletişim: nibrascode@gmail.com\nSite: nibrascode.com",
      about: "Nibras Code, Mahir Əliyev'in bağımsız kişisel projesidir. Büyük bir şirket değildir.\n\nSade fikirleri faydalı ve rahat uygulamalara çevirir. Ücretsiz uygulamalarda reklam yoktur. Nibras Arabic hazır. Nibras PDF ve Nibras Plans yakında, Nibras Docs hazırlanıyor.\n\nİletişim: nibrascode@gmail.com",
      contact: "İletişim: nibrascode@gmail.com\nSite: nibrascode.com\nProje Mahir Əliyev'indir.",
      ads: "Nibras Code uygulamalarında, ücretsiz olanlarda da, reklam yoktur. Proje Mahir Əliyev'indir.",
      price: "Uygulamaların hepsi ücretli değildir. Ücretsiz planda da reklam olmaz. Premium olsa bile temel işlevler ödemesiz kalır.",
      company: "Hayır. Nibras Code büyük bir şirket değildir. Mahir Əliyev'in başlattığı bağımsız kişisel projedir.",
      arabic: "Nibras Arabic, Arapçayı sade ve pratik öğreten Nibras Code uygulamasıdır. Harflerin yanında isimler, fiiller, sıfatlar, sayılar, diyaloglar, testler ve fiil babları vardır. Proje Mahir Əliyev'indir.",
      pdf: "Nibras PDF telefonda PDF ve görsellerle çalışmak içindir. Şimdilik yakında olarak yazılır. Proje Mahir Əliyev'indir.",
      plans: "Nibras Plans henüz yakında. Nibras Code projesine aittir. Proje Mahir Əliyev'indir.",
      docs: "Nibras Docs hazırlık aşamasındadır. Nibras Code projesine aittir. Proje Mahir Əliyev'indir.",
      ai: "Ben Nibras AI'yım, Nibras Code sitesinin yardımcısıyım. Nibras Code, Mahir Əliyev'in bağımsız projesidir.",
      apps: "Nibras Arabic hazır. Nibras PDF ve Nibras Plans yakında, Nibras Docs hazırlanıyor. Hepsi Nibras Code, yani Mahir Əliyev'in projesidir.",
    },
    ru: {
      who: "Nibras Code принадлежит Махиру Алиеву (Mahir Əliyev).\n\nЭто не большая компания, а независимый личный проект: простые, полезные и удобные приложения. В бесплатных приложениях тоже нет рекламы.\n\nNibras Arabic уже доступен. Nibras PDF и Nibras Plans скоро. Nibras Docs готовится.\n\nСвязь: nibrascode@gmail.com\nСайт: nibrascode.com",
      about: "Nibras Code — независимый личный проект Махира Алиева. Это не большая компания.\n\nОн превращает простые идеи в полезные и удобные приложения. В бесплатных нет рекламы. Nibras Arabic готов. Nibras PDF и Nibras Plans скоро, Nibras Docs готовится.\n\nСвязь: nibrascode@gmail.com",
      contact: "Связь с Nibras Code: nibrascode@gmail.com\nСайт: nibrascode.com\nПроект принадлежит Махиру Алиеву.",
      ads: "В приложениях Nibras Code, в том числе бесплатных, нет рекламы. Проект принадлежит Махиру Алиеву.",
      price: "Не все приложения платные. В бесплатном плане нет рекламы. Если есть Premium, основные функции остаются без оплаты.",
      company: "Нет. Nibras Code — не большая компания. Это независимый личный проект Махира Алиева.",
      arabic: "Nibras Arabic — приложение Nibras Code для простого и практичного изучения арабского. Кроме букв есть имена, глаголы, прилагательные, числа, диалоги, тесты и породы глагола. Проект Махира Алиева.",
      pdf: "Nibras PDF — для работы с PDF и изображениями на телефоне. Пока отмечен как скоро. Это часть Nibras Code, проекта Махира Алиева.",
      plans: "Nibras Plans пока скоро. Это одно из приложений Nibras Code. Проект Махира Алиева.",
      docs: "Nibras Docs ещё готовится. Он относится к Nibras Code, проекту Махира Алиева.",
      ai: "Я Nibras AI, помощник сайта Nibras Code. Nibras Code — независимый проект Махира Алиева.",
      apps: "Nibras Arabic доступен. Nibras PDF и Nibras Plans скоро, Nibras Docs готовится. Всё это Nibras Code, проект Махира Алиева. В бесплатных приложениях нет рекламы.",
    },
    ar: {
      who: "Nibras Code مشروع ماهِر علييف (Mahir Əliyev).\n\nليس شركة كبيرة، بل مشروع شخصي مستقل يصنع تطبيقات بسيطة ومفيدة وسهلة الاستخدام. لا توجد إعلانات حتى في التطبيقات المجانية.\n\nNibras Arabic متاح الآن. Nibras PDF وNibras Plans قريبًا. Nibras Docs قيد الإعداد.\n\nالتواصل: nibrascode@gmail.com\nالموقع: nibrascode.com",
      about: "Nibras Code مشروع شخصي مستقل لماهِر علييف. ليس شركة كبيرة.\n\nيحوّل الأفكار البسيطة إلى تطبيقات مفيدة ومريحة. لا إعلانات في التطبيقات المجانية. Nibras Arabic جاهز. Nibras PDF وNibras Plans قريبًا، وNibras Docs قيد الإعداد.\n\nالتواصل: nibrascode@gmail.com",
      contact: "التواصل مع Nibras Code: nibrascode@gmail.com\nالموقع: nibrascode.com\nالمشروع لماهِر علييف.",
      ads: "لا توجد إعلانات في تطبيقات Nibras Code، حتى المجانية. المشروع لماهِر علييف.",
      price: "ليست كل التطبيقات مدفوعة. الخطة المجانية بلا إعلانات. وإن وُجد Premium تبقى الوظائف الأساسية بدون دفع.",
      company: "لا. Nibras Code ليست شركة كبيرة. إنه مشروع شخصي مستقل لماهِر علييف.",
      arabic: "Nibras Arabic تطبيق من Nibras Code لتعلّم العربية ببساطة وبشكل عملي. إلى جانب الحروف فيه أسماء وأفعال وصفات وأعداد وحوارات واختبارات وبطاقات وأبواب الفعل. المشروع لماهِر علييف.",
      pdf: "Nibras PDF للعمل مع ملفات PDF والصور على الهاتف. يظهر حاليًا كـ«قريبًا». وهو جزء من مشروع ماهِر علييف.",
      plans: "Nibras Plans ما زال قريبًا. وهو أحد تطبيقات Nibras Code. المشروع لماهِر علييف.",
      docs: "Nibras Docs قيد الإعداد. وهو تابع لـ Nibras Code، مشروع ماهِر علييف.",
      ai: "أنا Nibras AI، مساعد موقع Nibras Code. Nibras Code مشروع مستقل لماهِر علييف.",
      apps: "Nibras Arabic جاهز. Nibras PDF وNibras Plans قريبًا، وNibras Docs قيد الإعداد. كلها من Nibras Code، مشروع ماهِر علييف. لا إعلانات في التطبيقات المجانية.",
    },
  };

  const text = pack[lang] || pack.az;
  if (self && !/nibras/.test(q)) return text.ai;
  if (contact) return text.contact;
  if (ads) return text.ads;
  if (price) return text.price;
  if (company) return text.company;
  if (arabic) return text.arabic;
  if (pdf) return text.pdf;
  if (plans && !/plan\b.*python|python/.test(q)) return text.plans;
  if (docs) return text.docs;
  if (apps && !ai) return text.apps;
  if (who) return text.who;
  if (ai && !/kod yaz|kod nümun|write code/.test(q)) return text.ai;
  if (brand) return text.about;
  return null;
}

function pickOrder(message) {
  const q = message.toLowerCase();
  if (/(python|javascript|typescript|\bjava\b|c#|c\+\+|sql|html|css|\bkod\b|funksiya|function|\bbug\b|algoritm|regex|proqramlaş|react|node\.?js)/i.test(q)) {
    return ["mistral-code", "deepseek", "groq", "cerebras", "github", "nvidia", "openrouter", "gemini", "sambanova", "xai", "hf"];
  }
  if (/(niyə|nədən|neden|почему|hesabla|hesab|riyaz|riyazi|isbat|müqayisə|fərqi|analiz|\d+\s*[\+\-\*\/]\s*\d+|explain|solve|vur|vurma|çarp|multiply)/i.test(q)) {
    return ["xai", "deepseek", "groq-reason", "cerebras", "mistral", "openrouter", "gemini", "nvidia", "hf"];
  }
  if (/(bu gün|bugün|today|xəbər|xeber|hava |qiymət|latest|dünən|sabah)/i.test(q)) {
    return ["xai", "openrouter", "groq", "gemini", "deepseek", "hf"];
  }
  if (/(şeir|hekayə|şer|yazı yaz|poem|story|yaradıcı)/i.test(q)) {
    return ["mistral", "xai", "groq", "gemini", "deepseek", "openrouter", "ollama"];
  }
  return ["groq", "xai", "deepseek", "mistral", "gemini", "cerebras", "openrouter", "nvidia", "sambanova", "scaleway", "ollama", "llm7", "airforce", "hf", "github"];
}

function normalizeHistory(raw, message) {
  const list = Array.isArray(raw) ? raw : [];
  const cleaned = list
    .map((item) => ({
      role: item && item.role === "assistant" ? "assistant" : "user",
      text: compactHistory(String((item && item.text) || "")).trim().slice(0, 800),
    }))
    .filter((item) => item.text)
    .slice(-8);
  if (!cleaned.length || cleaned[cleaned.length - 1].text !== message) {
    cleaned.push({ role: "user", text: message });
  }
  return cleaned;
}

async function readJson(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return JSON.parse(body || "{}");
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8") || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
