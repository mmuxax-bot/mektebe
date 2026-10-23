import fs from "node:fs";
globalThis.fetch = async (u) => new Response(fs.readFileSync(new URL(String(u).split("?")[0])));
const msgs = {}; globalThis.self = { postMessage: (m) => msgs[m.id](m) };
const W = process.argv[2] || "/workspace/mektebe/public/fatawa/js/search-worker.js";
await import(W);
const { meta } = await import("/workspace/mektebe/public/fatawa/js/data.js");
const { tokens } = await import("/workspace/mektebe/public/fatawa/js/tok.js");
const m = await meta();
const src = fs.readFileSync("/workspace/mektebe/public/fatawa/js/app.js", "utf8");
const a = src.indexOf("const Q_LEAD"), b = src.indexOf("// cavab:");
const analyzeQ = new Function("tokens", src.slice(a, b) + ";return analyzeQ;")(tokens);
const run = (d) => new Promise((res) => { const id = Math.random(); msgs[id] = res; self.onmessage({ data: { id, ...d } }); });
const set = JSON.parse(fs.readFileSync("/workspace/fatawa-fix/eval/holdout.json"));
let h1 = 0, h5 = 0, ms = 0; const miss = [];
for (const [q, exp] of set) {
  const A = analyzeQ(q); const t = Date.now();
  const r = (await run({ q: A.main, sem: 1, extra: A.extra, raw: q })).r; ms += Date.now() - t;
  const RX = new RegExp(exp); const E = { has: (t) => RX.test(m.titles[t] || '') }; const top = r.list.slice(0, 5).map((d) => m.pt[d]);
  if (E.has(top[0])) h1++; else if (process.argv[3]) console.log("  t1✗ " + q + " → " + m.titles[top[0]]?.slice(0, 45)); if (top.some((x) => E.has(x))) h5++; else miss.push(q + " → " + m.titles[top[0]]?.slice(0, 50));
}
console.log(`top1 ${h1}/${set.length}  top5 ${h5}/${set.length}  avg ${Math.round(ms / set.length)}ms`);
if (process.argv[3]) console.log(miss.join("\n"));
