// Rəvayətçi (+ mövzu) üzrə hədis axtarışı və çap/nömrələmə qeydi. node --test scripts/hadith-narrator.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { hadithReply, parseHadithQuery, narratorQuery } from "../api/_hadith.js";
import { editionLine } from "../api/_hadith/edition.js";

// [sorğu, gözlənən rəvayətçi id, mövzu var?]
const POS = [
  ["Əbu Hureyrə namaz hədisi", "abu-hurayra", true],
  ["Aişədən oruc haqqında hədis", "aisha", true],
  ["hadith of Ibn Umar about prayer", "ibn-umar", true],
  ["حديث أبي هريرة في الصلاة", "abu-hurayra", true],
  ["Anas ibn Malik sadaqa", "anas", true],
  ["Əbu Hureyrə hədisləri", "abu-hurayra", false],
  ["Ebu Hureyre namaz hadisi", "abu-hurayra", true],
  ["Əbu Hureyrədən zəkat haqqında hədis", "abu-hurayra", true],
  ["Aişənin hədisləri", "aisha", false],
  ["Aişə rəvayət etdiyi namaz hədisləri", "aisha", true],
  ["Hz. Ayşe'den oruç hadisi", "aisha", true],
  ["İbn Ömərdən namaz hədisi", "ibn-umar", true],
  ["ibn omer hedisleri", "ibn-umar", false],
  ["İbn Abbasdan dua haqqında hədis", "ibn-abbas", true],
  ["hadiths narrated by Ibn Abbas", "ibn-abbas", false],
  ["Ənəs ibn Malikdən hədislər", "anas", false],
  ["Enes bin Malik sadaka hadisi", "anas", true],
  ["Cabir ibn Abdullahdan hədis", "jabir", false],
  ["Jabir hadith about fasting", "jabir", true],
  ["Əbu Səid əl-Xudridən oruc hədisi", "abu-said", true],
  ["abu said al khudri hadith on charity", "abu-said", true],
  ["İbn Məsuddan namaz hədisi", "ibn-masud", true],
  ["Ömər ibn əl-Xəttabdan niyyət hədisi", "umar", true],
  ["Əli ibn Əbu Talibdən hədis", "ali", false],
  ["Osman ibn Əffandan dəstəmaz hədisi", "uthman", true],
  ["Əbu Musa əl-Əşaridən hədis", "abu-musa", false],
  ["Muaz ibn Cəbəldən hədis", "muadh", false],
  ["Əbu Zərrdən hədislər", "abu-dharr", false],
  ["Ümmü Sələmədən hədis", "umm-salama", false],
  ["Abdullah ibn Amrdan hədis", "abdullah-ibn-amr", false],
  ["Numan ibn Bəşirdən hədis", "numan", false],
  ["Əbu Dərdadan elm haqqında hədis", "abu-darda", true],
  ["хадисы от Абу Хурайры о молитве", "abu-hurayra", true],
  ["хадис Аиши о посте", "aisha", true],
  ["хадисы Ибн Умара", "ibn-umar", false],
  ["حديث عائشة في الصيام", "aisha", true],
  ["أحاديث ابن عباس", "ibn-abbas", false],
  ["حديث أنس بن مالك في الصدقة", "anas", true],
  ["حديث جابر بن عبد الله في الحج", "jabir", true],
  ["حديث ابن عمر رضي الله عنهما في الصلاة", "ibn-umar", true],
  ["hadith of Abu Hurayrah about mercy", "abu-hurayra", true],
  ["Ubade ibn Samitdən hədis", "ubada", false],
  ["Səhl ibn Səddən hədis", "sahl", false],
  ["Huzeyfədən fitnə haqqında hədis", "hudhayfa", true],
  ["Bəra ibn Azibdən hədis", "bara", false],
];
// rəvayətçi rejiminə düşməməli olanlar (mövzu sorğusu, salam, adi söhbət, oyun, kod)
const NEG = [
  "Ömər haqqında hədis", "Əbu Bəkr haqqında hədis", "hadith about Abu Bakr", "فضل أبي بكر", "yalan barəsində hədis", "həsəd barəsində hədis",
  "nafi elm haqqında hədis", "Aişə kimdir", "Əbu Hureyrə", "salam necəsən", "Əli bu gün gəldi", "Ömər namaz qılır", "Ayşe ile oyun oyna",
  "2048 oyunu", "python kodu yaz", "Ənəs neçə yaşında idi", "əsma ul husna haqqında hədis", "Malik kimdir", "ibn sina kimdir", "Bəqərə 255",
];

test("rəvayətçi: 45 sorğu düzgün rəvayətçi + başlıq", async () => {
  assert.ok(POS.length >= 40);
  for (const [q, id, topic] of POS) {
    const p = parseHadithQuery(q);
    assert.ok(p && p.mode === "r", "rejim r deyil: " + q + " -> " + JSON.stringify(p));
    assert.equal(p.nar.id, id, q);
    assert.equal(p.alts.length > 0, topic, "mövzu: " + q);
    const r = await hadithReply(q, []);
    assert.ok(r && /::tafsir hadith::/.test(r), "nəticə yoxdur: " + q + " -> " + String(r).slice(0, 120));
    assert.ok(/::ctx:: hadith r \d+ \w+ \S+/.test(r), "ctx: " + q);
    const head = r.split("\n")[0];
    assert.ok(/rəvayəti|rivayeti|Narrated by|Передал|من رواية/.test(head), "başlıq: " + q + " -> " + head);
    if (topic) assert.ok(head.includes("«" + p.alts[0]) || /«[\u0600-\u06FF ]+»/.test(head), "mövzu başlıqda: " + head);
  }
});

test("rəvayətçi: yanlış tetiklənmə yoxdur", () => {
  for (const q of NEG) {
    const p = parseHadithQuery(q);
    assert.ok(!p || p.mode !== "r", "rəvayətçi rejimi olmamalıdır: " + q);
  }
});

test("rəvayətçi: səhabə mövqeyi əvvəldə, isnadda ad var, «davam» işləyir", async () => {
  const r = await hadithReply("Əbu Hureyrə hədisləri", []);
  const blocks = r.split("::tafsir hadith::").slice(1);
  assert.equal(blocks.length, 5);
  for (const b of blocks) assert.ok(/هُرَيْرَةَ|هريرة/.test(b.replace(/[\u064B-\u065F]/g, "").replace(/هُرَيْرَةَ/g, "هريرة")), "isnadda Əbu Hureyrə yoxdur");
  const m = /::ctx:: hadith r (\d+) az (\S+)/.exec(r);
  assert.equal(m[1], "5");
  const r2 = await hadithReply("davam", [{ role: "user", text: "Əbu Hureyrə hədisləri" }, { role: "assistant", text: r }]);
  assert.ok(/^6–10 \//.test(r2), r2.slice(0, 40));
  assert.ok(/::ctx:: hadith r 10 az /.test(r2));
  const r3 = await hadithReply("davam", [{ role: "user", text: "x" }, { role: "assistant", text: r2 }]);
  assert.ok(/^11–15 \//.test(r3));
});

test("çap qeydi: hər hədis blokunda bir sətir, cavab dilində", async () => {
  const cases = [["Buxari 1", "Fuad Əbdülbaqi"], ["Müslim 8", "Əbdülbaqi"], ["Əbu Davud 1", "Arnaut"], ["Tirmizi 1", "Arnaut"], ["Nəsai 1", "Əbu Ğuddə"], ["İbn Macə 1", "İsam Musa Hadi"], ["صحيح مسلم 8", "عبد الباقي"], ["سنن ابن ماجه 1", "عصام موسى هادي"]];
  for (const [q, want] of cases) {
    const r = await hadithReply(q, []);
    const blocks = r.split("::tafsir hadith::").slice(1);
    assert.ok(blocks.length >= 1, q);
    for (const b of blocks) {
      const src = b.split("\n").filter((l) => l.startsWith("::src:: "));
      assert.equal(src.length, 3, q);
      assert.ok(src[2].includes(want), q + " -> " + src[2]);
    }
  }
  for (const l of ["az", "tr", "en", "ru", "ar"]) for (const id of ["735", "1727", "117359", "1363", "1339", "1194"]) assert.ok(editionLine(id, l).length > 20 && editionLine(id, l).length < 170, id + l);
});

test("kitabxana axtarışı üçün rəvayətçi sorğusu", () => {
  assert.deepEqual({ ...narratorQuery("Əbu Hureyrə namaz"), nar: undefined }, { nar: undefined, rest: "namaz" });
  assert.equal(narratorQuery("hadith of Ibn Umar about prayer").rest, "prayer");
  assert.equal(narratorQuery("حديث أبي هريرة في الصلاة").rest, "الصلاة");
  assert.equal(narratorQuery("namaz haqqında"), null);
});
