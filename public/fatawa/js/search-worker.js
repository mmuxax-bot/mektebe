// Məcmuul-fətava: brauzerdə tam mətn axtarışı (api/_fatawa.js searchRaw ilə eyni qayda: BM25, tam ifadə birinci, sonra yaxın sözlər).
import { tokens } from "./tok.js";
import { binFile, meta } from "./data.js";

const COMMON_DF = 0.08;
const WINDOW = 30;
const K1 = 1.2;
const B = 0.75;
const MAX = 3000;

let _idx = null;
function load() {
  if (_idx) return _idx;
  _idx = (async () => {
    const [blob, m] = await Promise.all([binFile("idx.bin"), meta()]);
    const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    const hl = dv.getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(blob.subarray(4, 4 + hl)));
    const vocab = head.vocab.split("\n");
    const V = vocab.length;
    const vmap = new Map();
    for (let i = 0; i < V; i++) vmap.set(vocab[i], i);
    const N = head.N;
    const dstart = new Int32Array(N + 1);
    let p = 4 + hl;
    const first = p;
    let total = 0;
    let b;
    for (let d = 0; d < N; d++) {
      let n = 0, mul = 1;
      do { b = blob[p++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
      dstart[d] = total;
      total += n;
      for (let i = 0; i < n; i++) while (blob[p++] & 128);
    }
    dstart[N] = total;
    const tok = new Int32Array(total);
    p = first;
    let w = 0;
    for (let d = 0; d < N; d++) {
      let n = 0, mul = 1;
      do { b = blob[p++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
      for (let i = 0; i < n; i++) {
        let v = 0, m2 = 1;
        do { b = blob[p++]; v += (b & 127) * m2; m2 *= 128; } while (b & 128);
        tok[w++] = v;
      }
    }
    const cnt = new Int32Array(V + 1);
    const seen = new Int32Array(V).fill(-1);
    for (let d = 0; d < N; d++) for (let i = dstart[d]; i < dstart[d + 1]; i++) {
      const t = tok[i];
      if (seen[t] !== d) { seen[t] = d; cnt[t + 1]++; }
    }
    for (let t = 0; t < V; t++) cnt[t + 1] += cnt[t];
    const docs = new Int32Array(cnt[V]);
    const fill = cnt.slice(0, V);
    seen.fill(-1);
    for (let d = 0; d < N; d++) for (let i = dstart[d]; i < dstart[d + 1]; i++) {
      const t = tok[i];
      if (seen[t] !== d) { seen[t] = d; docs[fill[t]++] = d; }
    }
    return { N, vocab, vmap, dstart, tok, post: cnt, docs, avgdl: total / N, titles: m.titles, pt: m.pt, pv: m.pv, titleToks: new Map() };
  })().catch((e) => ((_idx = null), Promise.reject(e)));
  return _idx;
}
const postings = (idx, t) => idx.docs.subarray(idx.post[t], idx.post[t + 1]);
function hasPhrase(idx, d, ids) {
  const a = idx.dstart[d], b = idx.dstart[d + 1] - ids.length, tk = idx.tok;
  outer: for (let i = a; i <= b; i++) {
    if (tk[i] !== ids[0]) continue;
    for (let j = 1; j < ids.length; j++) if (tk[i + j] !== ids[j]) continue outer;
    return true;
  }
  return false;
}
function near(idx, d, set) {
  const k = set.length;
  if (k <= 1) return true;
  const pos = new Map(set.map((t) => [t, -1e9]));
  for (let i = idx.dstart[d]; i < idx.dstart[d + 1]; i++) {
    const t = idx.tok[i];
    if (!pos.has(t)) continue;
    pos.set(t, i);
    let mn = i;
    for (const v of pos.values()) if (v < mn) mn = v;
    if (mn >= 0 && i - mn < Math.max(WINDOW, k * 4)) return true;
  }
  return false;
}
function titleTokens(idx, tid) {
  let s = idx.titleToks.get(tid);
  if (!s) idx.titleToks.set(tid, (s = new Set(tokens(idx.titles[tid]))));
  return s;
}
async function search(phrase, vol) {
  const idx = await load();
  const terms = tokens(phrase);
  const out = { terms, list: [], exact: 0, total: 0 };
  if (!terms.length) return out;
  let ids = terms.map((t) => idx.vmap.get(t));
  const unknown = ids.filter((x) => x == null).length;
  if (unknown && (terms.length < 5 || unknown * 2 >= terms.length)) return out;
  const phraseOk = unknown === 0;
  ids = ids.filter((x) => x != null);
  const uniq = [...new Set(ids)];
  const df = (t) => idx.post[t + 1] - idx.post[t];
  let content = uniq.filter((t) => df(t) / idx.N <= COMMON_DF);
  if (!content.length) content = uniq;
  const k = content.length;
  const minCov = k <= 3 ? k : Math.ceil(k * 0.75);
  const cov = new Uint8Array(idx.N);
  for (const t of content) for (const d of postings(idx, t)) cov[d]++;
  const cand = [];
  for (let d = 0; d < idx.N; d++) if (cov[d] >= minCov && (!vol || idx.pv[d] === vol)) cand.push(d);
  out.total = cand.length;
  if (!cand.length) return out;
  const qpos = new Map(uniq.map((t, i) => [t, i]));
  const idf = uniq.map((t) => Math.log(1 + (idx.N - df(t) + 0.5) / (df(t) + 0.5)));
  const scored = [];
  for (const d of cand) {
    const tf = new Float64Array(uniq.length);
    const a = idx.dstart[d], b = idx.dstart[d + 1];
    for (let i = a; i < b; i++) {
      const q = qpos.get(idx.tok[i]);
      if (q !== undefined) tf[q]++;
    }
    const dl = b - a;
    let score = 0;
    const tt = titleTokens(idx, idx.pt[d]);
    for (let q = 0; q < uniq.length; q++) {
      if (tf[q]) score += idf[q] * ((tf[q] * (K1 + 1)) / (tf[q] + K1 * (1 - B + (B * dl) / idx.avgdl)));
      if (tt.has(idx.vocab[uniq[q]])) score += idf[q] * 0.6;
    }
    let tier = 2;
    if (uniq.length === 1) tier = 0;
    else if (phraseOk && ids.length >= 2 && hasPhrase(idx, d, ids)) tier = 0;
    else if (content.every((t) => tf[qpos.get(t)] > 0) && near(idx, d, content)) tier = 1;
    scored.push([d, tier, score]);
  }
  scored.sort((x, y) => x[1] - y[1] || y[2] - x[2] || x[0] - y[0]);
  out.exact = uniq.length === 1 ? 0 : scored.filter((x) => x[1] === 0).length;
  out.list = scored.slice(0, MAX).map((x) => x[0]);
  return out;
}
self.onmessage = async (e) => {
  const { id, q, vol, warm } = e.data || {};
  try {
    if (warm) return (await load(), self.postMessage({ id, ok: true }));
    self.postMessage({ id, ok: true, r: await search(String(q || ""), Number(vol) || 0) });
  } catch (err) {
    self.postMessage({ id, ok: false, err: String(err && err.message || err) });
  }
};
