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
function ed1(a, b) { // Levenshtein ≤ 1
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return e + (la - i) + (lb - j) <= 1;
}
function nearest(idx, t) { // yazı səhvinə dözümlü: lüğətdə ən çox işlənən 1 hərf fərqli söz
  if (t.length < 3) return null;
  let best = null, bdf = 0;
  for (let i = 0; i < idx.vocab.length; i++) {
    const w = idx.vocab[i];
    if (Math.abs(w.length - t.length) > 1 || !ed1(w, t)) continue;
    const df = idx.post[i + 1] - idx.post[i];
    if (df > bdf) (bdf = df), (best = w);
  }
  return best;
}
async function search(phrase, vol) {
  const idx = await load();
  const terms = tokens(phrase);
  const out = { terms, list: [], exact: 0, total: 0 };
  if (!terms.length) return out;
  const fixed = [];
  for (let i = 0; i < terms.length; i++) if (!idx.vmap.has(terms[i])) { const f = nearest(idx, terms[i]); if (f) (fixed.push([terms[i], f]), (terms[i] = f)); }
  out.fixed = fixed;
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
// ---- mənaya görə axtarış: oflayn hesablanmış LSA (TF-IDF + SVD, 128 ölçü, int8) — sem.bin
let _sem = null;
function loadSem() {
  if (_sem) return _sem;
  _sem = (async () => {
    const blob = await binFile("sem.bin");
    const hl = new DataView(blob.buffer, blob.byteOffset).getUint32(0, true);
    const h = JSON.parse(new TextDecoder().decode(blob.subarray(4, 4 + hl)));
    const K = h.K, nt = h.terms.length, off = blob.byteOffset + 4 + hl;
    const buf = blob.buffer.slice(off, off + K * (nt + h.N));
    const T = new Int8Array(buf, 0, K * nt), D = new Int8Array(buf, K * nt, K * h.N);
    const tpos = new Map(h.terms.map((v, i) => [v, i]));
    return { K, nt, N: h.N, T, D, tpos, terms: h.terms, idf: h.idf };
  })();
  return _sem;
}
async function semantic(phrase, vol, extra) {
  const [idx, S] = await Promise.all([load(), loadSem()]);
  const lex = await search(phrase, vol);
  const qt = [...new Set([...lex.terms, ...extra.flatMap((x) => tokens(x))])];
  const K = S.K, qv = new Float32Array(K);
  const used = [];
  for (const t of qt) {
    let id = idx.vmap.get(t); if (id == null) { const f = nearest(idx, t); if (f) id = idx.vmap.get(f); }
    const p = id == null ? undefined : S.tpos.get(id);
    if (p === undefined) continue;
    used.push(p);
    const w = S.idf[p];
    for (let k = 0; k < K; k++) qv[k] += w * S.T[p * K + k];
  }
  if (!used.length) return lex;
  let n = 0; for (let k = 0; k < K; k++) n += qv[k] * qv[k]; n = Math.sqrt(n) || 1;
  for (let k = 0; k < K; k++) qv[k] /= n;
  // yaxın anlayışlar (sorğunun genişləndirilməsi; vurğulama üçün)
  const near = [];
  for (let i = 0; i < S.nt; i++) { let s = 0; for (let k = 0; k < K; k++) s += qv[k] * S.T[i * K + k]; near.push([i, s]); }
  near.sort((a, b) => b[1] - a[1]);
  const exp = near.slice(0, 12).map(([i]) => idx.vocab[S.terms[i]]);
  const expIds = new Set([...used.map((p) => S.terms[p]), ...near.slice(0, 12).map(([i]) => S.terms[i])]);
  // sənəd balı: kosinus + genişləndirilmiş terminlərin örtüyü + başlıq siqnalı + leksik nəticə bonusu
  const lexRank = new Map(lex.list.slice(0, 300).map((d, r) => [d, r]));
  const sc = [];
  for (let d = 0; d < S.N; d++) {
    if (vol && idx.pv[d] !== vol) continue;
    let s = 0; for (let k = 0; k < K; k++) s += qv[k] * S.D[d * K + k];
    s /= 127;
    if (s < 0.15 && !lexRank.has(d)) continue;
    let hit = 0; const a = idx.dstart[d], b = idx.dstart[d + 1]; const seen = new Set();
    for (let i = a; i < b; i++) { const t = idx.tok[i]; if (expIds.has(t) && !seen.has(t)) (seen.add(t), hit++); }
    const tt = titleTokens(idx, idx.pt[d]); let th = 0; for (const t of expIds) if (tt.has(idx.vocab[t])) th++;
    const lr = lexRank.get(d);
    sc.push([d, s + 0.04 * Math.min(hit, 8) + 0.08 * Math.min(th, 3) + (lr === undefined ? 0 : 0.25 / (1 + lr / 20))]);
  }
  sc.sort((a, b) => b[1] - a[1]);
  return { ...lex, terms: [...new Set([...lex.terms, ...exp])], list: sc.slice(0, 500).map((x) => x[0]), total: Math.max(lex.total, Math.min(sc.length, 500)), exact: lex.exact, sem: 1, concepts: exp };
}
self.onmessage = async (e) => {
  const { id, q, vol, warm, sem: sm, extra } = e.data || {};
  try {
    if (warm) return (await Promise.all([load(), loadSem()]), self.postMessage({ id, ok: true }));
    if (sm) return self.postMessage({ id, ok: true, r: await semantic(String(q || ""), Number(vol) || 0, extra || []) });
    self.postMessage({ id, ok: true, r: await search(String(q || ""), Number(vol) || 0) });
  } catch (err) {
    self.postMessage({ id, ok: false, err: String(err && err.message || err) });
  }
};
