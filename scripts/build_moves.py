# 藩の移転・改称・廃止・立藩を日付つきで持たせる。public/data/moves.json を作り、sanchi.json の府県に from/to を足す。
# 日付は ISO 形式('YYYY-MM-DD')。月や年だけの日付は目安(文字列として比較するので 'YYYY-MM' < 'YYYY-MM-DD' になる)。
import json, re
P = 'public/data/sanchi.json'
S = json.load(open(P, encoding='utf-8'))
L = {}   # 版籍奉還より前の地図で使う藩名ラベル(han-labels.json の藩名 → 日付つきの変化)
L['浜田藩'] = [dict(d='1866', dn='鶴田藩', x=133.87237, y=34.91191)]                       # 第2次長州征討後、美作へ
L['小倉藩'] = [dict(d='1867', dn='香春藩', x=130.83851, y=33.67781), dict(d='1870-01-25', dn='豊津藩', x=130.97213, y=33.67369)]
for old, new in [('掛川藩', '柴山藩'), ('浜松藩', '鶴舞藩'), ('田中藩', '長尾藩'), ('沼津藩', '菊間藩'), ('横須賀藩', '花房藩'), ('小島藩', '桜井藩'), ('相良藩', '小久保藩')]:
    h = next(x for x in S['han'] if x['n'] == new)                                        # 徳川氏の駿河入封に伴う移転(1868年。月は目安)
    L[old] = [dict(d='1868-06', dn=new, x=h['lon'], y=h['lat'])]
L['盛岡藩'] = [dict(d='1869-01', dn='白石藩', x=140.61611, y=38.00219), dict(d='1869-08-29', dn='盛岡藩', x=141.2067, y=39.746)]
H = {}   # 版籍奉還後の府藩県三治制の地図で使う、藩ごとの変化
def ev(n, *e): H.setdefault(n, {})['ev'] = list(e)
ev('白石藩', dict(d='1869-08-29', dn='盛岡藩', lon=141.1525, lat=39.7019, place='岩手県盛岡市内丸'), dict(d='1870-08-06', end=True))
ev('長瀞藩', dict(d='1869-12-03', dn='大網藩', lon=140.32435, lat=35.52517, place='千葉県大網白里市大網'))
ev('香春藩', dict(d='1870-01-25', dn='豊津藩', lon=130.97213, lat=33.67369, place='福岡県京都郡みやこ町豊津'))
ev('高徳藩', dict(d='1870-04-19', dn='曽我野藩', lon=140.13, lat=35.56988, place='千葉県千葉市中央区蘇我', approx=True))
ev('敦賀藩', dict(d='1870-04-23', dn='鞠山藩', lon=136.08232, lat=35.67644, place='福井県敦賀市鞠山'), dict(d='1870-10-11', end=True))
ev('三上藩', dict(d='1870-05-14', dn='吉見藩', lon=135.28735, lat=34.3898, place='大阪府泉南郡田尻町吉見'))
ev('山形藩', dict(d='1870-08-13', dn='朝日山藩', nopos=True, place='近江国(陣屋の位置を確認できていません)'))
ev('三根山藩', dict(d='1870-11-22', dn='峰岡藩'))
for n, dn, d in [('駿河府中藩', '静岡藩', '1869-09-12'), ('三河吉田藩', '豊橋藩', '1869-09-12'), ('長府藩', '豊浦藩', '1869-09-12'), ('対馬府中藩', '厳原藩', '1869-09-12'),
                 ('鶴岡藩', '大泉藩', '1869-10-17'), ('備中松山藩', '高梁藩', '1869-12-04'), ('美作勝山藩', '真島藩', '1869-08-11')]:
    ev(n, dict(d=d, dn=dn))
for n, d in [('吉井藩', '1870-01-27'), ('狭山藩', '1870-01-27'), ('喜連川藩', '1870-08-13'), ('長岡藩', '1870-11-15')]:
    ev(n, dict(d=d, end=True))
# 明治3年(1870年)に版籍を奉還し、その年に知藩事が任命された藩(斗南藩・生坂藩・岩崎藩)は、最初の知藩事の任命日から藩として存在する
for h in S['han']:
    if '明治3年(1870年)に版籍を奉還' in h.get('note', ''): H.setdefault(h['n'], {})['since'] = h['chiji'][0]['d']; print('立藩', h['n'], h['chiji'][0]['d'])
# 府県の設置日・廃止日
for f in S['fuken']:
    m = re.search(r'\((\d{4})年(\d+)月(\d+)日\)', f.get('set') or ''); f.pop('from', None); f.pop('to', None)
    if m: f['from'] = '%s-%02d-%02d' % (m[1], int(m[2]), int(m[3]))
    elif re.search(r'(\d{4})年\)', f.get('set') or ''): f['from'] = re.search(r'(\d{4})年\)', f['set'])[1]
    m = re.search(r'\((\d{4})年(\d+)月(\d+)日\)に廃止', f.get('end') or '')
    if m: f['to'] = '%s-%02d-%02d' % (m[1], int(m[2]), int(m[3]))
json.dump(S, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'labels': L, 'sanchi': H}, open('public/data/moves.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(L), len(H), [(f['n'], f.get('from'), f.get('to')) for f in S['fuken'] if f.get('to')])
