import numpy as np, json, scipy.sparse as sp
from scipy.sparse.linalg import svds
tok=np.fromfile('tok.u32',dtype=np.uint32); lens=json.load(open('lens.json')); N=len(lens)
doc=np.repeat(np.arange(N),lens)
V=int(tok.max())+1
M=sp.csr_matrix((np.ones(len(tok),dtype=np.float32),(doc,tok)),shape=(N,V))
df=np.asarray((M>0).sum(0)).ravel()
keep=np.where((df>=4)&(df<=N*0.25))[0]
M=M[:,keep].tocsr(); M.data=np.log1p(M.data)
idf=np.log(N/df[keep]).astype(np.float32); M=M.multiply(idf).tocsr()
nr=np.sqrt(np.asarray(M.multiply(M).sum(1)).ravel())+1e-9; M=sp.diags(1/nr)@M
K=128
U,S,Vt=svds(M.astype(np.float64),k=K); o=np.argsort(-S); U,S,Vt=U[:,o],S[o],Vt[o]
T=(Vt.T*S); D=U*S
def q8(X):
  X=X/(np.linalg.norm(X,axis=1,keepdims=True)+1e-9); return np.clip(np.round(X*127),-127,127).astype(np.int8)
T8,D8=q8(T),q8(D)
h=json.dumps({"K":K,"N":N,"terms":keep.tolist(),"idf":[round(float(x),2) for x in idf]}).encode()
open('/workspace/mektebe/public/fatawa/data/sem.raw','wb').write(len(h).to_bytes(4,'little')+h+T8.tobytes()+D8.tobytes())
print(len(keep),N)
# sanity: neighbors
voc=open('vocab.txt').read().split('\n'); pos={v:i for i,v in enumerate(keep)}
Tn=T8.astype(np.float32)
for w in ['توب','بدع','قنوت','صلا','استغفار']:
  ids=[i for i,v in enumerate(voc) if v==w]
  if ids and ids[0] in pos:
    s=Tn@Tn[pos[ids[0]]]; print(w,[voc[keep[j]] for j in np.argsort(-s)[:10]])
  else: print(w,'-')
