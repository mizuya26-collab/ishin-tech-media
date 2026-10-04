# 版籍奉還(明治2年)の知藩事の位置データを作る。
# 位置は、藩領データの代表点(han-labels.json)を使う。移封・改称で対応する藩がないものは、現在の所在地から目安の座標を手入力。
import json,re,sys
L=json.load(open('public/data/han-labels.json',encoding='utf8'))
by={l['n']:l for l in L}
ALIAS={'館藩':'松前藩','中村藩':'相馬中村藩','久保田藩':'秋田藩','鶴岡藩':'庄内藩','松嶺藩':'松山(出羽)藩','石岡藩':'府中(常陸)藩','清崎藩':'糸魚川藩','金沢藩':'加賀藩','敦賀藩':'鞠山藩','竜岡藩':'田野口藩','名古屋藩':'尾張藩','尼崎藩':'尼ヶ崎藩','和歌山藩':'紀州藩','西大路藩':'仁正寺藩','山口藩':'長州藩','高知藩':'土佐藩','鹿児島藩':'薩摩藩','対馬府中藩':'対馬藩','加知山藩':'勝山(安房)藩','亀山藩':'亀山(伊勢)藩','龍野藩':'竜野藩'}
# 移封・新設などで藩領データに対応する藩がないもの(経度,緯度)。目安の位置。
MANUAL={'七戸藩':(141.15,40.72),'白石藩':(140.62,38.00),'矢島藩':(140.10,39.20),'松岡藩':(140.72,36.72),'志筑藩':(140.23,36.17),
'菊間藩':(140.08,35.47),'鶴舞藩':(140.16,35.33),'桜井藩':(139.93,35.37),'小久保藩':(139.85,35.30),'柴山藩':(140.43,35.67),
'長尾藩':(139.90,34.91),'花房藩':(140.10,35.11),'野村藩':(136.65,35.48),'今尾藩':(136.63,35.25),'堀江藩':(137.65,34.76),
'半原藩':(137.58,34.93),'重原藩':(137.02,34.99),'犬山藩':(136.94,35.38),'亀岡藩':(135.57,35.01),'舞鶴藩':(135.39,35.47),
'村岡藩':(134.55,35.50),'田原本藩':(135.79,34.55),'新宮藩':(135.99,33.73),'鶴田藩':(133.98,35.01),'成羽藩':(133.43,34.84),
'岩国藩':(132.22,34.17),'三池藩':(130.45,33.03),'香春藩':(130.85,33.66),'千束藩':(131.05,33.62),'府中(駿河)藩':(138.38,34.98)}
def minz(v): return 5.0 if v>=500 else 6.0 if v>=250 else 6.8 if v>=120 else 7.6 if v>=60 else 8.4
def norm(s): return s.replace('舘','館').replace('ヶ','ケ')
bynorm={norm(k):v for k,v in by.items()}
out=[];miss=[]
for line in open('scripts/hanseki_raw.txt',encoding='utf8'):
    if not line.strip() or line.startswith('#'): continue
    n,chiji,place,note=(line.rstrip('\n').split('|')+[''])[:4]
    lab=by.get(n) or by.get(ALIAS.get(n,'')) or bynorm.get(norm(n))
    if lab:
        lon,lat,v,ap=lab['x'],lab['y'],lab['v'],False
    elif n in MANUAL:
        (lon,lat),v,ap=MANUAL[n],0,True
    else:
        miss.append(n);continue
    disp=n if re.search(r'\(',n) else n
    out.append({'n':disp,'chiji':chiji,'place':place,'note':note,'lon':round(lon,4),'lat':round(lat,4),'z':minz(v) if v else 8.0,'approx':ap})
json.dump(out,open('public/data/hanseki.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print(len(out),'藩; 位置が見つからない:',miss)
