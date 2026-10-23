import fs from "node:fs";
globalThis.fetch = async (u) => new Response(fs.readFileSync(new URL(String(u).split("?")[0])));
const { meta } = await import("/workspace/mektebe/public/fatawa/js/data.js");
const { tokens } = await import("/workspace/mektebe/public/fatawa/js/tok.js");
const m = await meta(); const voc = fs.readFileSync("/workspace/fatawa-fix/vocab.txt","utf8").split("\n"); const vm=new Map(voc.map((v,i)=>[v,i]));
fs.writeFileSync("/workspace/fatawa-fix/meta.json", JSON.stringify({pt:m.pt, pv:m.pv, tt:m.titles.map(t=>tokens(t).map(x=>vm.get(x)).filter(x=>x!=null))}));
