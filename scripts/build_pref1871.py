import sys,json,pickle,collections,re
from shapely.geometry import Polygon,MultiPolygon,mapping
from shapely.ops import unary_union
sys.path.insert(0,'scripts')
from pref1871_table import T,FU
raw=pickle.load(open(sys.argv[1],'rb'))          # (属性, 点, パート, bbox) のリスト
OUT=sys.argv[2]
ALIAS={'閇':'閉','羽栗':'葉栗','條':'条','頸':'頚','邊':'辺','舩':'船','嶋':'島','准':'准','淮':'准','蘆':'芦','對':'対','球摩':'球磨','摩':'磨'}
def norm(s):
    for a,b in ALIAS.items(): s=s.replace(a,b)
    return s
DIRS='東西南北上下中'
def poly(points,parts):
    parts=list(parts)+[len(points)];rings=[points[parts[i]:parts[i+1]] for i in range(len(parts)-1)]
    ps=[Polygon(r).buffer(0) for r in rings if len(r)>=4]
    ps=[p for p in ps if not p.is_empty]
    if not ps: return None
    # 外周と穴の扱い: 面積の大きい順に、含まれるものは穴として引く
    ps.sort(key=lambda p:-p.area);res=ps[0]
    for p in ps[1:]:
        res=res.difference(p) if res.contains(p) else res.union(p)
    return res
# 県ごとの (国→郡の集合) に整える
rule={}
for ken,lst in T.items():
    for kuni,guns in lst:
        rule.setdefault(norm(kuni),[]).append((ken,'*' if guns=='*' else {norm(g) for g in guns}))
def match(gun,guns):
    g=norm(gun)
    if g in guns: return True
    if len(g)>=3 and g[0] in DIRS and g[1:] in guns: return True
    if len(g)>=3 and g[-1] in DIRS and g[:-1] in guns: return True
    return False
assign=collections.defaultdict(list);unmatched=collections.Counter();geo={}
for d,pts,parts,bb in raw:
    if not d['gun']: continue
    kuni=norm(d['kuni']);gun=d['gun']
    if kuni not in rule: unmatched[(kuni,gun)]+=1;continue
    hit=None
    for ken,guns in rule[kuni]:
        if guns=='*' or match(gun,guns): hit=ken;break
    if not hit: unmatched[(kuni,gun)]+=1;continue
    p=poly(pts,parts)
    if p is not None: assign[hit].append(p)
print('未割り当て:',sorted(unmatched.items()))
feats=[]
for ken,ps in assign.items():
    u=unary_union(ps).buffer(0.0006).buffer(-0.0006)      # 郡の隙間を閉じる
    u=u.simplify(0.004,preserve_topology=True)
    if isinstance(u,MultiPolygon): u=MultiPolygon([g for g in u.geoms if g.area>0.0004]) if any(g.area>0.0004 for g in u.geoms) else u
    if u.is_empty: continue
    big=max(u.geoms,key=lambda g:g.area) if isinstance(u,MultiPolygon) else u
    rp=big.representative_point()
    def r4(c):return json.loads(json.dumps(c))
    g=mapping(u)
    def rnd(x):return [round(v,4) for v in x] if isinstance(x[0],(int,float)) else [rnd(i) for i in x]
    g['coordinates']=rnd(g['coordinates'])
    feats.append({'type':'Feature','properties':{'name':ken,'fu':ken in FU,'lon':round(rp.x,4),'lat':round(rp.y,4),'n':len(ps)},'geometry':g})
print(len(feats),'府県');print(sorted(set(T)-set(f['properties']['name'] for f in feats)))
json.dump({'type':'FeatureCollection','features':feats},open(OUT,'w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
import os;print(os.path.getsize(OUT)//1024,'KB')
