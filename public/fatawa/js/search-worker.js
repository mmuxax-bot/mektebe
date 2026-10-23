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
// ---- mənaya görə axtarış: oflayn LSA (TF-IDF + başlıq çəkisi + SVD, int8) + fətva başlıqları indeksi + anlayış xəritəsi — sem.bin
let _sem = null;
function loadSem() {
  if (_sem) return _sem;
  _sem = (async () => {
    const [blob, idx] = await Promise.all([binFile("sem.bin"), load()]);
    const hl = new DataView(blob.buffer, blob.byteOffset).getUint32(0, true);
    const h = JSON.parse(new TextDecoder().decode(blob.subarray(4, 4 + hl)));
    const K = h.K, nt = h.terms.length, off = blob.byteOffset + 4 + hl;
    const buf = blob.buffer.slice(off, off + K * (nt + h.N + h.NT));
    const T = new Int8Array(buf, 0, K * nt), D = new Int8Array(buf, K * nt, K * h.N), TT = new Int8Array(buf, K * (nt + h.N), K * h.NT);
    const tpos = new Map(h.terms.map((v, i) => [v, i]));
    // başlıq tərs indeksi (hər fətva/fəsil başlığı ayrıca vahid)
    const tdf = new Map(), tlist = [];
    for (let t = 0; t < h.NT; t++) { const ids = [...titleTokens(idx, t)].map((w) => idx.vmap.get(w)).filter((x) => x != null); tlist.push(new Set(ids)); for (const i of new Set(ids)) tdf.set(i, (tdf.get(i) || 0) + 1); }
    const tdocs = Array.from({ length: h.NT }, () => []);
    for (let d = 0; d < h.N; d++) tdocs[idx.pt[d]].push(d);
    return { K, nt, N: h.N, NT: h.NT, T, D, TT, tpos, terms: h.terms, idf: h.idf, conc: h.conc, tdf, tlist, tdocs };
  })();
  return _sem;
}
const dot = (A, i, q, K) => { let s = 0; const o = i * K; for (let k = 0; k < K; k++) s += q[k] * A[o + k]; return s / 127; };
const P = Object.assign({ tl: 0.6, tc: 0.5, cs: 0.55, ts: 1.0, cv: 0.6, lx: 0.15, pc: 0.34, pm: 0.7, dv: 1 }, globalThis.__P || {});
async function semantic(phrase, vol, extra) {
  const [idx, S] = await Promise.all([load(), loadSem()]);
  const lex = await search(phrase, vol);
  const K = S.K;
  const resolve = (t) => { let id = idx.vmap.get(t); if (id == null) { const f = nearest(idx, t); if (f) id = idx.vmap.get(f); } return id; };
  // əsas terminlər (sualdan) və genişləndirmə (sinonim xəritəsi + avtomatik anlayışlar)
  const core = new Map(); // vocabId -> çəki
  for (const t of new Set(lex.terms.length ? lex.terms : tokens(phrase))) { const id = resolve(t); if (id != null && S.tpos.has(id)) core.set(id, 1); }
  const ext = new Map();
  for (const x of extra) for (const t of tokens(x)) { const id = resolve(t); if (id != null && S.tpos.has(id) && !core.has(id)) ext.set(id, 0.7); }
  for (const id of core.keys()) for (const j of S.conc[S.tpos.get(id)] || []) { const v = S.terms[j]; if (!core.has(v) && !ext.has(v)) ext.set(v, 0.35); }
  if (!core.size && !ext.size) return lex;
  const qv = new Float32Array(K);
  for (const [id, w0] of [...core, ...ext]) { const p = S.tpos.get(id), w = w0 * S.idf[p]; for (let k = 0; k < K; k++) qv[k] += w * S.T[p * K + k]; }
  let n = 0; for (let k = 0; k < K; k++) n += qv[k] * qv[k]; n = Math.sqrt(n) || 1; for (let k = 0; k < K; k++) qv[k] /= n;
  // 1) başlıq (mündəricat) uyğunluğu: BM25-vari termin örtüyü + kosinus
  const coreIdf = (id) => S.idf[S.tpos.get(id)] || 1;
  const coreW = [...core.keys()].reduce((a, id) => a + coreIdf(id), 0) || 1;
  const tsc = new Float32Array(S.NT);
  for (let t = 0; t < S.NT; t++) {
    const L = S.tlist[t]; if (!L.size) continue;
    let lx = 0, cc = 0; for (const id of L) { const w = core.get(id) || ext.get(id); if (w) (lx += w * coreIdf(id)), core.has(id) && cc++; }
    const cf = core.size ? Math.min(1, (cc + 0.5) / Math.min(core.size, 3)) : 1;
    tsc[t] = P.tl * Math.min(1, lx / coreW) * cf / Math.sqrt(0.5 + L.size / 6) + P.tc * dot(S.TT, t, qv, K);
  }
  // 2) sənəd balı + yenidən sıralama (əsas anlayış örtüyü olmayan mövzudankənar səhifələr cəzalanır)
  const lexRank = new Map(lex.list.slice(0, 300).map((d, r) => [d, r]));
  const sc = [];
  for (let d = 0; d < S.N; d++) {
    if (vol && idx.pv[d] !== vol) continue;
    const cs = dot(S.D, d, qv, K), ts = tsc[idx.pt[d]];
    if (cs < 0.12 && ts < 0.25 && !lexRank.has(d)) continue;
    let cov = 0, ex = 0; const a = idx.dstart[d], b = idx.dstart[d + 1]; const seen = new Set();
    for (let i = a; i < b; i++) { const t = idx.tok[i]; if (seen.has(t)) continue; seen.add(t); if (core.has(t)) cov += coreIdf(t); else if (ext.has(t)) ex++; }
    for (const t of S.tlist[idx.pt[d]]) if (core.has(t) && !seen.has(t)) cov += coreIdf(t);
    const covR = cov / coreW;
    const lr = lexRank.get(d);
    let s = P.cs * cs + P.ts * ts + P.cv * covR + 0.02 * Math.min(ex, 6) + (lr === undefined ? 0 : P.lx / (1 + lr / 15));
    if (core.size >= 2 && covR < P.pc) s *= P.pm; // mövzudankənar
    sc.push([d, s]);
  }
  sc.sort((a, b) => b[1] - a[1]);
  // müxtəliflik: hər fətva/başlıqdan ilk növbədə yalnız ən uyğun səhifə; qalanları sonra
  { const seenT = new Map(), A = [], B = []; for (const x of sc) { const t = idx.pt[x[0]], c = seenT.get(t) || 0; seenT.set(t, c + 1); (c < P.dv ? A : B).push(x); } sc.length = 0; sc.push(...A.slice(0, 60), ...B, ...A.slice(60)); }
  const expW = [...ext.keys()].slice(0, 12).map((v) => idx.vocab[v]);
  return { ...lex, terms: [...new Set([...lex.terms, ...expW])], list: sc.slice(0, 500).map((x) => x[0]), total: Math.max(lex.total, Math.min(sc.length, 500)), exact: lex.exact, sem: 1 };
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
