import numpy as np, json, sys, scipy.sparse as sp
from scipy.sparse.linalg import svds
K=int(sys.argv[1]) if len(sys.argv)>1 else 128
tok=np.fromfile('tok.u32',dtype=np.uint32); lens=json.load(open('lens.json')); N=len(lens)
mt=json.load(open('meta.json')); pt=np.array(mt['pt']); NT=len(mt['tt'])
doc=np.repeat(np.arange(N),lens); V=int(tok.max())+1
M=sp.csr_matrix((np.ones(len(tok),dtype=np.float32),(doc,tok)),shape=(N,V))
# başlıq tokenləri sənədə əlavə çəki ilə (başlıq = güclü mövzu siqnalı)
r=[];c=[]
for d in range(N):
  for t in mt['tt'][pt[d]]: r.append(d);c.append(t)
M=M+sp.csr_matrix((np.full(len(r),3,np.float32),(r,c)),shape=(N,V))
df=np.asarray((M>0).sum(0)).ravel()
keep=np.where((df>=3)&(df<=N*0.25))[0]
M=M[:,keep].tocsr(); M.data=np.log1p(M.data)
idf=np.log(N/df[keep]).astype(np.float32); M=M.multiply(idf).tocsr()
nr=np.sqrt(np.asarray(M.multiply(M).sum(1)).ravel())+1e-9; M=sp.diags(1/nr)@M
U,S,Vt=svds(M.astype(np.float64),k=K); o=np.argsort(-S); U,S,Vt=U[:,o],S[o],Vt[o]
T=Vt.T*S; D=U*S
nz=lambda X:X/(np.linalg.norm(X,axis=1,keepdims=True)+1e-9)
Dn=nz(D); TTv=np.zeros((NT,K))
np.add.at(TTv,pt,Dn); TTv=nz(TTv)
q8=lambda X:np.clip(np.round(nz(X)*127),-127,127).astype(np.int8)
T8,D8,TT8=q8(T),q8(D),q8(TTv)
# avtomatik anlayış xəritəsi: başlıqlarda ≥2 dəfə gələn hər termin üçün LSA qonşuları (cos>0.5)
pos={v:i for i,v in enumerate(keep)}; from collections import Counter
tc=Counter(t for tt in mt['tt'] for t in set(tt))
Tn=nz(T).astype(np.float32); conc={}
for t,cnt in tc.items():
  if cnt<2 or t not in pos: continue
  s=Tn@Tn[pos[t]]; nb=[int(j) for j in np.argsort(-s)[1:9] if s[j]>0.5][:6]
  if nb: conc[pos[t]]=nb
h=json.dumps({"K":K,"N":N,"NT":NT,"terms":keep.tolist(),"idf":[round(float(x),2) for x in idf],"conc":conc}).encode()
open('/workspace/mektebe/public/fatawa/data/sem.raw','wb').write(len(h).to_bytes(4,'little')+h+T8.tobytes()+D8.tobytes()+TT8.tobytes())
print(K,len(keep),len(conc))
