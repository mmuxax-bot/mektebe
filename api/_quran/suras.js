// 114 surənin adları: n; azərbaycanca; türkcə; ingiliscə (transliterasiya); rusca; əlavə yazılışlar (vergüllə).
// Axtarışda yazılış fərqləri (q/k, x/h, ə/a, ş/sh, ğ/gh, Al-/Əl- ön şəkilçisi, kiril) ümumi "skelet"lə tutulur;
// burada yalnız skeletin tutmadığı əlavə yazılışlar qeyd olunur. «~» ilə başlayan yazılış zəifdir (adi söz ola bilər) və yalnız «surə» sözü ilə birlikdə tanınır.
// Sətir: n | az | tr | en | ru | extra
const RAW = `
1|Fatihə|Fâtiha|Al-Fatihah|Аль-Фатиха|fatihetul kitab,fatihetul-kitab,fatihe,~fatiha,ummul kitab,ummul-kitab,~the opening,~opening
2|Bəqərə|Bakara|Al-Baqarah|Аль-Бакара|bakara,bekere,baqara,baqarah,bakarah,~the cow,~cow
3|Ali-İmran|Âl-i İmrân|Aal-i-Imran|Аль Имран|ali imran,al imran,ali-imran,aal imran,al-i imran,ali-i imran,al-i-imran,ali imrân,~imran,~Имран,Али Имран,Аль-Имран,Али-Имран
4|Nisa|Nisâ|An-Nisa|Ан-Ниса|nisa,nisaa,an nisa,en-nisa,~the women,~women
5|Maidə|Mâide|Al-Ma'idah|Аль-Маида|maide,maida,maidah,maaidah,~the table spread,table spread
6|Ənam|En'âm|Al-An'am|Аль-Анам|enam,anam,an'am,en'am,anaam,~the cattle,~cattle
7|Əraf|A'râf|Al-A'raf|Аль-Араф|araf,a'raf,eraf,al-araaf,~the heights
8|Ənfal|Enfâl|Al-Anfal|Аль-Анфаль|anfal,enfal,~the spoils of war,~spoils of war
9|Tövbə|Tevbe|At-Tawbah|Ат-Тауба|tovbe,tevbe,tevbe suresi,tawba,tawbah,tauba,bəraət,beraet,baraat,bara'ah,bera'at,berae,bera'et,at-tawba,~the repentance,~repentance
10|Yunus|Yûnus|Yunus|Юнус|yunus,yunis,yunes,~jonah
11|Hud|Hûd|Hud|Худ|hud,~hood
12|Yusif|Yûsuf|Yusuf|Юсуф|yusuf,yusif,yusf,~joseph
13|Rəd|Ra'd|Ar-Ra'd|Ар-Раад|rad,ra'd,red,raad,ar-rad,~the thunder,~thunder
14|İbrahim|İbrâhîm|Ibrahim|Ибрахим|ibrahim,ibrahem,~abraham,ибрахим,ибрагим
15|Hicr|Hicr|Al-Hijr|Аль-Хиджр|hicr,hijr,al hijr,al-hijr,~hajar,hicir,~the rocky tract
16|Nəhl|Nahl|An-Nahl|Ан-Нахль|nahl,nehl,an nahl,~the bee,~bee
17|İsra|İsrâ|Al-Isra|Аль-Исра|isra,israa,bəni israil,beni israil,bani israil,bani israel,~the night journey,night journey
18|Kəhf|Kehf|Al-Kahf|Аль-Кахф|kehf,kahf,kəhf,~the cave,~cave,al kahf
19|Məryəm|Meryem|Maryam|Марьям|meryem,maryam,mariam,məryəm,~mary,мариам,мариям
20|Taha|Tâhâ|Ta-Ha|Та Ха|taha,ta ha,ta-ha,tâhâ,таха,та ха
21|Ənbiya|Enbiyâ|Al-Anbiya|Аль-Анбийа|anbiya,enbiya,anbiyaa,~the prophets,~prophets
22|Həcc|Hac|Al-Hajj|Аль-Хадж|hacc,hac,hajj,al-hajj,al hajj,hecc,~the pilgrimage,~pilgrimage,хаджж,хадж
23|Muminun|Mü'minûn|Al-Mu'minun|Аль-Муминун|muminun,mu'minun,muminin,muminoon,müminun,mu'minoon,~the believers,~believers
24|Nur|Nûr|An-Nur|Ан-Нур|nur,~nuur,an nur,~the light
25|Furqan|Furkân|Al-Furqan|Аль-Фуркан|furqan,furkan,furgan,~the criterion
26|Şuəra|Şuarâ|Ash-Shu'ara|Аш-Шуара|suera,suara,shuara,shu'ara,şüəra,suaraa,~the poets,~poets,şuara
27|Nəml|Neml|An-Naml|Ан-Намль|neml,naml,nəml,an-naml,~the ant,~ant,an naml,намль
28|Qəsəs|Kasas|Al-Qasas|Аль-Касас|qesas,kasas,qasas,qasas,~the stories,~stories
29|Ənkəbut|Ankebût|Al-Ankabut|Аль-Анкабут|ankabut,enkebut,ankabuut,~the spider,~spider
30|Rum|Rûm|Ar-Rum|Ар-Рум|rum,rûm,ar-rum,~the romans,~romans,ar rum
31|Lüqman|Lokman|Luqman|Лукман|luqman,lokman,lukman,lüqman
32|Səcdə|Secde|As-Sajdah|Ас-Саджда|secde,sajda,sajdah,as-sajda,as sajdah,as-sajdah,саджда,~the prostration,~prostration
33|Əhzab|Ahzâb|Al-Ahzab|Аль-Ахзаб|ahzab,ehzab,~the combined forces,~combined forces
34|Səba|Sebe'|Saba|Саба|seba,saba,sebe,sebe',sheba
35|Fatir|Fâtır|Fatir|Фатыр|fatir,fatır,fatyr,faatir
36|Yasin|Yâsîn|Ya-Sin|Ясин|yasin,yasen,ya sin,ya-sin,yaseen,yâsîn,ясин,я син,я-син,يس
37|Saffat|Sâffât|As-Saffat|Ас-Саффат|saffat,saffât,saaffaat,as saffat,those who set the ranks
38|Sad|Sâd|Sad|Сад|sad,saad,sâd
39|Zümər|Zümer|Az-Zumar|Аз-Зумар|zumar,zümər,zumer,az zumar,~the troops,~troops
40|Ğafir|Gâfir|Ghafir|Гафир|gafir,ghafir,ğafir,~mu'min,~mumin,~mü'min,~mömin,~momin,~al-mu'min,~the forgiver,gafir
41|Fussilət|Fussilet|Fussilat|Фуссылат|fussilat,fussilet,fusilet,fussilət,fusselet,ha mim sajda,ha-mim-secde,hâ mîm secde
42|Şura|Şûrâ|Ash-Shura|Аш-Шура|sura,shura,şûra,şura,aş-şura,ash shura,~the consultation,~consultation,шура
43|Zuxruf|Zuhruf|Az-Zukhruf|Аз-Зухруф|zuhruf,zukhruf,zuxruf,zukhruff,~the ornaments of gold,ornaments of gold
44|Duxan|Duhân|Ad-Dukhan|Ад-Духан|duhan,dukhan,duxan,dukhaan,~the smoke,~smoke
45|Casiyə|Câsiye|Al-Jathiyah|Аль-Джасия|casiye,casiya,jathiyah,jasiyah,jathiya,~the crouching,al-jathiya
46|Əhqaf|Ahkâf|Al-Ahqaf|Аль-Ахкаф|ahqaf,ahkaf,ehkaf,~the wind-curved sandhills,~the dunes
47|Muhəmməd|Muhammed|Muhammad|Мухаммад|muhemmed,muhammed,muhammad,muhamməd,мухаммед,мухаммад
48|Fəth|Fetih|Al-Fath|Аль-Фатх|feth,fath,fetih,al-fath,al fath,~the victory,~victory,фатх
49|Hucurat|Hucurât|Al-Hujurat|Аль-Худжурат|hucurat,hujurat,hucurât,hujuraat,~the rooms,~rooms
50|Qaf|Kâf|Qaf|Каф|qaf,kaf,kâf,qaaf,каф,ق
51|Zariyat|Zâriyât|Adh-Dhariyat|Аз-Зарийат|zariyat,zariyât,dhariyat,zâriyât,zariyaat,~the winnowing winds,az-zariyat,Аз-Зарият,Аз Зарият
52|Tur|Tûr|At-Tur|Ат-Тур|tur,tûr,at tur,~the mount,at-tur,~mount
53|Nəcm|Necm|An-Najm|Ан-Наджм|necm,najm,nəcm,an-najm,an najm,~the star,~star
54|Qəmər|Kamer|Al-Qamar|Аль-Камар|qemer,kamer,qamar,~the moon,~moon
55|Rəhman|Rahmân|Ar-Rahman|Ар-Рахман|rehman,rahman,rahmân,rahmaan,ar rahman,ar-rahman,~the beneficent,beneficent
56|Vaqiə|Vâkıa|Al-Waqi'ah|Аль-Вакиа|vaqie,vakia,waqia,waqiah,vaqiə,vakıa,waaqi'ah,~the inevitable event,inevitable event
57|Hədid|Hadîd|Al-Hadid|Аль-Хадид|hedid,hadid,hadîd,~the iron,~iron
58|Mücadilə|Mücâdele|Al-Mujadila|Аль-Муджадила|mucadile,mujadila,mucadilə,mujadilah,mücadele,~the pleading woman,~pleading woman
59|Həşr|Haşr|Al-Hashr|Аль-Хашр|hesr,hasr,hashr,həşr,haşr,~the exile,~exile
60|Mumtəhinə|Mümtehine|Al-Mumtahanah|Аль-Мумтахана|mumtehine,mumtahana,mumtahinah,mumtahine,mumtəhinə,mumtahanah,~the woman to be examined
61|Saff|Saf|As-Saff|Ас-Сафф|saff,saf,as saff,as-saff,~the ranks,~ranks
62|Cümə|Cuma|Al-Jumu'ah|Аль-Джума|cume,cuma,jumua,jumuah,jum'a,jumu'ah,cumə,~the congregation,~friday,джума,аль-джумуа
63|Munafiqun|Münâfikûn|Al-Munafiqun|Аль-Мунафикун|munafiqun,munafikun,münafikun,munafiqoon,munafikûn,~the hypocrites,~hypocrites
64|Təğabun|Tegâbün|At-Taghabun|Ат-Тагабун|tegabun,taghabun,təğabun,tagabun,tegabün,~the mutual disillusion
65|Talaq|Talâk|At-Talaq|Ат-Талак|talaq,talak,talâk,at talaq,at-talaq,~the divorce,~divorce
66|Təhrim|Tahrîm|At-Tahrim|Ат-Тахрим|tehrim,tahrim,təhrim,tahrîm,at tahrim,at-tahrim,~the prohibition,~prohibition
67|Mülk|Mülk|Al-Mulk|Аль-Мульк|mulk,mülk,al mulk,al-mulk,~the sovereignty,~sovereignty,~tebarek,~tabarak,tabârake,تبارك,мульк
68|Qələm|Kalem|Al-Qalam|Аль-Калям|qelem,kalem,qalam,~the pen,~pen
69|Haqqə|Hâkka|Al-Haqqah|Аль-Хакка|haqqe,hakka,haqqa,haqqah,al-haqqah,~the reality,haaqqah
70|Məaric|Meâric|Al-Ma'arij|Аль-Мааридж|mearic,maaric,ma'arij,maarij,məaric,~the ascending stairways
71|Nuh|Nûh|Nuh|Нух|nuh,nûh,~noah,nooh,нух
72|Cinn|Cin|Al-Jinn|Аль-Джинн|cinn,cin,jinn,jinne,al jinn,al-jinn,~the jinn,джинн
73|Müzzəmmil|Müzzemmil|Al-Muzzammil|Аль-Музаммиль|muzzemmil,muzzammil,müzzəmmil,muzammil,müzzemmîl,~the enshrouded one
74|Müddəssir|Müddessir|Al-Muddaththir|Аль-Муддассир|muddessir,muddathir,muddaththir,müddəssir,muddassir,muddasir,~the cloaked one
75|Qiyamə|Kıyâme|Al-Qiyamah|Аль-Кийама|qiyame,kiyame,qiyama,qiyamah,qiyamə,kıyame,~the resurrection,~resurrection
76|İnsan|İnsân|Al-Insan|Аль-Инсан|insan,insân,~dəhr,~dehr,~dahr,~ad-dahr,~ad dahr,al-insan,~man,al insan,аль-инсан
77|Mürsəlat|Mürselât|Al-Mursalat|Аль-Мурсалят|mursalat,murselat,mürsəlat,mursalât,mursalaat,those sent forth
78|Nəbə|Nebe'|An-Naba|Ан-Наба|nebe,naba,nəbə,an naba,an-naba,~the tidings,~tidings,amme yetesaelun
79|Naziat|Nâzi'ât|An-Nazi'at|Ан-Назиат|naziat,nazi'at,naziât,naziaat,those who drag forth
80|Əbəsə|Abese|Abasa|Абаса|abese,abasa,əbəsə,'abasa,~he frowned,~frowned
81|Təkvir|Tekvîr|At-Takwir|Ат-Таквир|tekvir,takwir,təkvir,tekwir,takvir,~the overthrowing,~overthrowing
82|İnfitar|İnfitâr|Al-Infitar|Аль-Инфитар|infitar,infitâr,infitaar,~the cleaving,~cleaving
83|Mütəffifin|Mutaffifîn|Al-Mutaffifin|Аль-Мутаффифин|mutəffifin,mutaffifin,muteffifin,mütəffifin,mutaffifîn,~the defrauding,~defrauding,tatfif,tatfîf
84|İnşiqaq|İnşikâk|Al-Inshiqaq|Аль-Иншикак|insiqaq,inshiqaq,insikak,inşikak,inşiqaq,~the sundering,~sundering
85|Buruc|Burûc|Al-Buruj|Аль-Бурудж|buruc,buruj,burûc,~the mansions of the stars
86|Tariq|Târık|At-Tariq|Ат-Тарик|tariq,tarik,târık,tareq,~the nightcomer
87|Əla|A'lâ|Al-A'la|Аль-Аля|ela,ala,a'la,əla,al-ala,al a'la,~the most high,~most high
88|Ğaşiyə|Gâşiye|Al-Ghashiyah|Аль-Гашия|gasiye,ghashiyah,gashiya,ğaşiyə,gashiye,~the overwhelming
89|Fəcr|Fecr|Al-Fajr|Аль-Фаджр|fecr,fajr,fəcr,al fajr,al-fajr,~the dawn,~dawn
90|Bələd|Beled|Al-Balad|Аль-Балад|beled,balad,bələd,al balad,~the city,~city
91|Şəms|Şems|Ash-Shams|Аш-Шамс|sems,shams,şəms,ash shams,ash-shams,~the sun,~sun,шамс
92|Leyl|Leyl|Al-Layl|Аль-Лайль|leyl,layl,al-layl,al layl,~the night,~night,лайль
93|Duha|Duhâ|Ad-Duha|Ад-Духа|duha,duhâ,ad duha,ad-duha,dhuha,~the morning hours,morning hours,духа
94|İnşirah|İnşirâh|Ash-Sharh|Аш-Шарх|insirah,inshirah,inşirah,serh,şərh,sharh,ash-sharh,alam nashrah,elem nesrah,elem neşrah,ələm nəşrəh,~the relief,~relief
95|Tin|Tîn|At-Tin|Ат-Тин|tin,tîn,at tin,at-tin,~the fig,~fig
96|Ələq|Alak|Al-'Alaq|Аль-Алак|eleq,alak,alaq,ələq,'alaq,~the clot,~clot,ikra,iqra,iqra'
97|Qədr|Kadir|Al-Qadr|Аль-Кадр|qedr,kadir,qadr,qədr,al kadr,kadr,al-qadr,~the power,~the night of decree
98|Bəyyinə|Beyyine|Al-Bayyinah|Аль-Баййина|beyyine,bayyina,bayyinah,bəyyinə,beyyinə,~the clear proof,~clear proof
99|Zilzal|Zilzâl|Az-Zalzalah|Аз-Зальзаля|zilzal,zalzala,zalzalah,zelzele,zilzâl,az-zalzalah,~the earthquake,~earthquake
100|Adiyat|Âdiyât|Al-'Adiyat|Аль-Адийат|adiyat,adiyât,'adiyat,adiyaat,~the courser,Аль-Адият,Аль-Адийат
101|Qariə|Kâria|Al-Qari'ah|Аль-Кариа|qarie,karia,qaria,qariah,qari'ah,qariə,kâria,~the calamity,~calamity
102|Təkasür|Tekâsür|At-Takathur|Ат-Такасур|tekasur,takathur,təkasür,takasur,tekasür,~the rivalry in world increase
103|Əsr|Asr|Al-'Asr|Аль-Аср|esr,asr,'asr,əsr,al asr,al-asr,~the declining day,~time,~the time
104|Hümazə|Hümeze|Al-Humazah|Аль-Хумаза|humaze,humaza,humazah,hümazə,hümeze,~the traducer,~traducer
105|Fil|Fîl|Al-Fil|Аль-Филь|fil,fîl,al fil,al-fil,~the elephant,~elephant,филь
106|Qureyş|Kureyş|Quraysh|Курейш|qureys,kureys,quraysh,qureyş,kureyş,quraish,qurayš,курайш,курейш
107|Maun|Mâûn|Al-Ma'un|Аль-Маун|maun,mâûn,ma'un,maoun,~small kindnesses,~almsgiving
108|Kövsər|Kevser|Al-Kawthar|Аль-Каусар|kovser,kevser,kawthar,kausar,kövsər,al kawthar,al kausar,~abundance,~the abundance,каусар
109|Kafirun|Kâfirûn|Al-Kafirun|Аль-Кафирун|kafirun,kafirûn,kafirun,kafiroon,kâfirun,kâfirûn,al kafirun,~the disbelievers,~disbelievers,~kafirlər,~kafirler,kəfirun,kefirun,кафирун
110|Nəsr|Nasr|An-Nasr|Ан-Наср|nesr,nasr,nəsr,an nasr,an-nasr,~the help,~iza caa,~iza ca,~idha jaa,~ida caa nasrullah
111|Məsəd|Tebbet|Al-Masad|Аль-Масад|mesed,tebbet,masad,lehəb,leheb,lahab,məsəd,al-lahab,tabbat,tebbət,~the palm fiber,~palm fiber,tabbat yada,тabbat,лахаб
112|İxlas|İhlâs|Al-Ikhlas|Аль-Ихлас|ixlas,ihlas,ihlâs,ikhlas,ixlas,ixlâs,al ikhlas,al-ikhlas,~the sincerity,~sincerity,qul huvallahu ehad,kulhuvallah,qulhuvallah,kul huvallahu ehad,ihlas suresi,ixlas suresi
113|Fələq|Felak|Al-Falaq|Аль-Фалак|feleq,felak,falaq,fələq,al falaq,al-falaq,~the daybreak,~daybreak
114|Nas|Nâs|An-Nas|Ан-Нас|nas,nâs,an nas,an-nas,naas,~mankind,~the mankind
`.trim();

export const SURAS = RAW.split("\n").map((line) => {
  const [n, az, tr, en, ru, extra] = line.split("|");
  return { n: Number(n), az, tr, en, ru, extra: extra ? extra.split(",").map((s) => s.trim()).filter(Boolean) : [] };
});

