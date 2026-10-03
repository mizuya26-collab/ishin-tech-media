// 項目データ(7つの柱+雑記)。ホーム(地図)・一覧ページ・詳細ページが共通で使う。
// n=名前 / k=読み / y=年(事件=起きた年, 人物=生年) / d=没年 / r=関係する期間 / lat,lon=地図上の位置(目安)
// 位置・年・期間は公開前に出典で確認すること。

export const MODES = ['events', 'people', 'orgs', 'places', 'tour']; // 地図のタブにする柱

export const WAREKI = {1853:'嘉永6年',1854:'嘉永7年',1855:'安政2年',1856:'安政3年',1857:'安政4年',1858:'安政5年',1859:'安政6年',1860:'安政7年・万延元年',1861:'万延2年・文久元年',1862:'文久2年',1863:'文久3年',1864:'文久4年・元治元年',1865:'元治2年・慶応元年',1866:'慶応2年',1867:'慶応3年',1868:'慶応4年・明治元年',1869:'明治2年',1870:'明治3年',1871:'明治4年',1872:'明治5年',1873:'明治6年',1874:'明治7年',1875:'明治8年',1876:'明治9年',1877:'明治10年'};

// 人物の足跡(スライドごとの居場所)。人物マーカーの移動に使う
export const PHASES = [
 {year:1853,title:'黒船来航',desc:'ペリー艦隊が浦賀に来航し、幕府に開国を迫った。',
  ryoma:{lat:35.6852,lng:139.7528},saigo:{lat:31.5969,lng:130.5547},takasugi:{lat:34.4088,lng:131.3994},
  event:{name:'黒船来航(浦賀)',lat:35.2461,lng:139.7086}},
 {year:1858,title:'安政の大獄',desc:'大老井伊直弼が尊王攘夷派を弾圧した。',
  ryoma:{lat:33.5597,lng:133.5311},saigo:{lat:35.6852,lng:139.7528},takasugi:{lat:35.6852,lng:139.7528},
  event:{name:'安政の大獄(江戸)',lat:35.6852,lng:139.7528}},
 {year:1860,title:'桜田門外の変',desc:'井伊直弼が水戸浪士らに江戸城桜田門外で暗殺される。',
  ryoma:{lat:35.6852,lng:139.7528},saigo:{lat:28.3325,lng:129.4913},takasugi:{lat:34.1785,lng:131.4737},
  event:{name:'桜田門外の変(江戸)',lat:35.6796,lng:139.7530}},
 {year:1862,title:'寺田屋事件・生麦事件',desc:'薩摩藩内外で尊攘派の弾圧と衝突が相次いだ。',
  ryoma:{lat:34.6901,lng:135.1955},saigo:{lat:27.3667,lng:128.5667},takasugi:{lat:31.2304,lng:121.4737},
  event:{name:'生麦事件(横浜)',lat:35.4437,lng:139.6380}},
 {year:1864,title:'禁門の変・下関戦争',desc:'長州藩が京都で敗走し、四国艦隊が下関を砲撃した。',
  ryoma:{lat:34.6901,lng:135.1955},saigo:{lat:35.0116,lng:135.7681},takasugi:{lat:33.9515,lng:130.9414},
  event:{name:'禁門の変(京都)',lat:35.0117,lng:135.7615}},
 {year:1865,title:'亀山社中設立・功山寺挙兵',desc:'龍馬が貿易結社を、高杉が藩論転換の兵を起こす。',
  ryoma:{lat:32.7503,lng:129.8779},saigo:{lat:31.5969,lng:130.5547},takasugi:{lat:33.9500,lng:130.9400},
  event:{name:'亀山社中設立(長崎)',lat:32.7503,lng:129.8779}},
 {year:1866,title:'薩長同盟',desc:'龍馬の仲介で犬猿の仲だった薩摩と長州が同盟を結んだ。',
  ryoma:{lat:35.0116,lng:135.7681},saigo:{lat:35.0116,lng:135.7681},takasugi:{lat:33.9515,lng:130.9414},
  event:{name:'薩長同盟締結(京都)',lat:35.0116,lng:135.7681}},
 {year:1867,title:'大政奉還・近江屋事件',desc:'幕府が政権を朝廷に返上。直後に龍馬と高杉は世を去った。',
  ryoma:{lat:35.0042,lng:135.7681},saigo:{lat:35.0116,lng:135.7681},takasugi:{lat:33.9515,lng:130.9414},
  event:{name:'大政奉還(京都二条城)',lat:35.0142,lng:135.7484}},
 {year:1868,title:'江戸無血開城',desc:'西郷が勝海舟と会談し、江戸城の無血開城を実現した。',
  ryoma:null,saigo:{lat:35.6852,lng:139.7528},takasugi:null,
  event:{name:'江戸無血開城(江戸城)',lat:35.6852,lng:139.7528}},
  {year:1868,title:'戊辰戦争',desc:'鳥羽・伏見の戦いから各地へ戦火が広がり、旧幕府勢力と新政府軍が争った。',
  ryoma:null,saigo:{lat:34.9353,lng:135.7614},takasugi:null,
  event:{name:'戊辰戦争',lat:37.4948,lng:139.9298}},
  {year:1869,title:'函館戦争',desc:'榎本武揚ら旧幕府軍が箱館で抗戦し、五稜郭の降伏によって戊辰戦争が終結した。',
  ryoma:null,saigo:null,takasugi:null,
  event:{name:'函館戦争',lat:41.7969,lng:140.7569}},
  {year:1877,title:'西南戦争',desc:'西郷隆盛が新政府に反旗を翻し、鹿児島城山で自刃した。',
  ryoma:null,saigo:{lat:31.5977,lng:130.5480},takasugi:null,
  event:{name:'西南戦争(鹿児島城山)',lat:31.5977,lng:130.5480}}
];

export const SHISHI_TIMELINE = {
  ryoma:{name:'坂本龍馬',timeline:[
    {year:1836,event:'土佐国に生まれる'},
    {year:1853,event:'江戸へ剣術修行'},
    {year:1866,event:'薩長同盟締結に尽力'},
    {year:1867,event:'近江屋で暗殺される'}]},
  saigo:{name:'西郷隆盛',timeline:[
    {year:1828,event:'薩摩国に生まれる'},
    {year:1868,event:'江戸無血開城を実現'},
    {year:1877,event:'西南戦争で自刃'}]},
  takasugi:{name:'高杉晋作',timeline:[
    {year:1839,event:'長州藩に生まれる'},
    {year:1863,event:'奇兵隊を創設'},
    {year:1867,event:'結核により死去'}]}
};

export const PILLARS = [
{ id:'events', t:'事件', c:'#b5532a', sorts:['year','kana'], desc:'時代を動かした出来事を、年表と地図でたどる。', items:[
  {slug:'kurofune-raiko',n:'黒船来航',k:'くろふねらいこう',y:1853,lat:35.2461,lon:139.7086,sub:'1853年'},
  {slug:'nichibei-washin',n:'日米和親条約の締結',k:'にちべいわしんじょうやくのていけつ',y:1854,lat:35.4437,lon:139.638,sub:'1854年'},
  {slug:'nichibei-shuko-tsusho',n:'日米修好通商条約の締結',k:'にちべいしゅうこうつうしょうじょうやくのていけつ',y:1858,lat:35.41,lon:139.67,sub:'1858年'},
  {slug:'ansei-no-taigoku',n:'安政の大獄',k:'あんせいのたいごく',y:1858,lat:35.6852,lon:139.7528,sub:'1858年〜1859年'},
  {slug:'sakuradamon-gai',n:'桜田門外の変',k:'さくらだもんがいのへん',y:1860,lat:35.6796,lon:139.753,sub:'1860年'},
  {slug:'teradaya-jiken',n:'寺田屋事件',k:'てらだやじけん',y:1862,lat:34.9335,lon:135.7603,sub:'1862年'},
  {slug:'namamugi-jiken',n:'生麦事件',k:'なまむぎじけん',y:1862,lat:35.496,lon:139.67,sub:'1862年'},
  {slug:'satsuei-senso',n:'薩英戦争',k:'さつえいせんそう',y:1863,lat:31.58,lon:130.6,sub:'1863年'},
  {slug:'hachigatsu-juhachinichi',n:'八月十八日の政変',k:'はちがつじゅうはちにちのせいへん',y:1863,lat:35.0254,lon:135.7621,sub:'1863年'},
  {slug:'ikedaya-jiken',n:'池田屋事件',k:'いけだやじけん',y:1864,lat:35.0094,lon:135.77,sub:'1864年'},
  {slug:'hamaguri-gomon',n:'蛤御門の変',k:'はまぐりごもんのへん',y:1864,lat:35.0237,lon:135.7615,sub:'1864年'},
  {slug:'shimonoseki-senso',n:'下関戦争(四国艦隊砲撃)',k:'しものせきせんそう',y:1864,lat:33.9515,lon:130.9414,sub:'1864年'},
  {slug:'daiichiji-choshu-seito',n:'第一次長州征討',k:'だいいちじちょうしゅうせいとう',y:1864,lat:34.3853,lon:132.4553,sub:'1864年'},
  {slug:'satcho-domei',n:'薩長同盟',k:'さっちょうどうめい',y:1866,lat:35.0116,lon:135.7681,sub:'1866年'},
  {slug:'dainiji-choshu-seito',n:'第二次長州征討',k:'だいにじちょうしゅうせいとう',y:1866,lat:34.2,lon:132.2,sub:'1866年'},
  {slug:'taisei-hokan',n:'大政奉還',k:'たいせいほうかん',y:1867,lat:35.0142,lon:135.7484,sub:'1867年'},
  {slug:'omiya-jiken',n:'坂本龍馬の暗殺(近江屋事件)',k:'さかもとりょうまのあんさつ',y:1867,lat:35.0042,lon:135.7681,sub:'1867年'},
  {slug:'osei-fukko',n:'王政復古の大号令',k:'おうせいふっこのだいごうれい',y:1868,lat:35.0254,lon:135.7621,sub:'1868年'},
  {slug:'toba-fushimi',n:'鳥羽・伏見の戦い',k:'とばふしみのたたかい',y:1868,lat:34.9353,lon:135.7614,sub:'1868年'},
  {slug:'edo-kaijo',n:'江戸開城',k:'えどかいじょう',y:1868,lat:35.6852,lon:139.7528,sub:'1868年'},
  {slug:'aizu-senso',n:'会津戦争',k:'あいづせんそう',y:1868,lat:37.4948,lon:139.9298,sub:'1868年'},
  {slug:'hakodate-senso',n:'箱館戦争',k:'はこだてせんそう',y:1869,lat:41.7969,lon:140.7569,sub:'1869年'},
  {slug:'haihan-chiken',n:'廃藩置県',k:'はいはんちけん',y:1871,lat:35.6852,lon:139.7528,sub:'1871年'},
  {slug:'seinan-senso',n:'西南戦争',k:'せいなんせんそう',y:1877,lat:31.5977,lon:130.548,sub:'1877年'}
]},
{ id:'people', t:'人物', c:'#4a5fa8', sorts:['kana','year','north'], desc:'時代をかけた志士たちの軌跡。', items:[
  {slug:'sakamoto-ryoma',n:'坂本龍馬',k:'さかもとりょうま',y:1836,d:1867,lat:33.5597,lon:133.5311,sub:'土佐藩|1836年生まれ',key:'ryoma',color:'#2d5fa3',letter:'龍',img:'ryoma.jpg'},
  {slug:'saigo-takamori',n:'西郷隆盛',k:'さいごうたかもり',y:1828,d:1877,lat:31.5969,lon:130.5547,sub:'薩摩藩|1828年生まれ',key:'saigo',color:'#a5372a',letter:'西',img:'saigo.jpg'},
  {slug:'kido-takayoshi',n:'木戸孝允',k:'きどたかよし',y:1833,d:1877,lat:34.1785,lon:131.4737,sub:'長州藩|1833年生まれ'},
  {slug:'takasugi-shinsaku',n:'高杉晋作',k:'たかすぎしんさく',y:1839,d:1867,lat:34.4088,lon:131.3994,sub:'長州藩|1839年生まれ',key:'takasugi',color:'#2f7d4f',letter:'晋'}
]},
{ id:'orgs', t:'藩・組織', c:'#c0392b', sorts:['kana','north'], desc:'藩や隊が、何を目指して動いたのか。', items:[
  {slug:'tosa-han',n:'土佐藩',k:'とさはん',lat:33.5597,lon:133.5311,sub:'[藩の概要]',r:[[1853,1871]]},
  {slug:'choshu-han',n:'長州藩',k:'ちょうしゅうはん',lat:34.1785,lon:131.4737,sub:'[藩の概要]',r:[[1853,1871]]},
  {slug:'satsuma-han',n:'薩摩藩',k:'さつまはん',lat:31.5969,lon:130.5547,sub:'[藩の概要]',r:[[1853,1871]]},
  {slug:'aizu-han',n:'会津藩',k:'あいづはん',lat:37.4876,lon:139.9297,sub:'[藩の概要]',r:[[1853,1871]]},
  {slug:'sendai-han',n:'仙台藩',k:'せんだいはん',lat:38.2531,lon:140.8553,sub:'[藩の概要]',r:[[1853,1871]]},
  {slug:'kaientai',n:'海援隊',k:'かいえんたい',lat:32.7503,lon:129.8779,sub:'[組織の概要]',r:[[1867,1868]]},
  {slug:'kiheitai',n:'奇兵隊',k:'きへいたい',lat:33.9515,lon:130.9414,sub:'[組織の概要]',r:[[1863,1870]]},
  {slug:'shinsengumi',n:'新選組',k:'しんせんぐみ',lat:35.012,lon:135.745,sub:'[組織の概要]',r:[[1863,1869]]}
]},
{ id:'things', t:'物', c:'#8a6d3b', sorts:['kana'], desc:'志士たちが残した品と、その物語。', items:[
  {slug:'ryoma-pistol',n:'龍馬のピストル',k:'りょうまのぴすとる',sub:'[持ち主・所蔵先]'},
  {slug:'ryoma-boots',n:'龍馬のブーツ',k:'りょうまのぶーつ',sub:'[持ち主・所蔵先]'},
  {slug:'ship',n:'船',k:'ふね',sub:'[船名・持ち主]'},
  {slug:'katana',n:'刀',k:'かたな',sub:'[刀の名・持ち主]'}
]},
{ id:'places', t:'場所・道', c:'#3f7d6b', sorts:['kana','north'], desc:'歩いた道、築いた建物、進軍の経路を地図で。', items:[
  {slug:'ryoma-dappan-no-michi',n:'龍馬脱藩の道',k:'りょうまだっぱんのみち',lat:33.5597,lon:133.5311,sub:'[道筋を地図に線で表示]',r:[[1862,1862]]},
  {slug:'shingun-keiro',n:'進軍経路',k:'しんぐんけいろ',lat:35,sub:'[どの戦争かを指定]',r:[]}
]},
{ id:'words', t:'言葉', c:'#6b4e8a', sorts:['kana'], desc:'志士たちを動かした言葉と、その背景。', items:[
  {slug:'shisei',n:'至誠にして動かざるものいまだこれあらざるなり',k:'しせいにしてうごかざるもの',sub:'[出典と、語った人物]'},
  {slug:'yugyo-ryokuka',n:'遊魚緑荷を動かす',k:'ゆうぎょりょくかをうごかす',sub:'坂本龍馬の言葉として紹介される。[一次資料での出典を確認]'}
]},
{ id:'tour', t:'史跡巡り', c:'#2f6f8f', sorts:['north','kana'], desc:'今に残る史跡を訪ねる旅の案内。銅像・お土産・お祭りも。', items:[
  {slug:'katsurahama',n:'桂浜',k:'かつらはま',lat:33.4977,lon:133.575,sub:'高知県|坂本龍馬像',r:[]},
  {slug:'teradaya',n:'寺田屋',k:'てらだや',lat:34.9335,lon:135.7603,sub:'京都府',r:[[1862,1862],[1866,1866]]},
  {slug:'tsurugajo',n:'鶴ヶ城',k:'つるがじょう',lat:37.4876,lon:139.9297,sub:'福島県',r:[[1868,1868]]},
  {slug:'shokasonjuku',n:'松下村塾',k:'しょうかそんじゅく',lat:34.416,lon:131.399,sub:'山口県',r:[[1857,1858]]}
]},
{ id:'notes', t:'雑記', c:'#3e6f63', sorts:['kana'], desc:'疑問や考察、編集後記など、読み物としての雑記。', items:[
  {slug:'gimon',n:'疑問',k:'ぎもん',sub:'疑問'},
  {slug:'kosatsu',n:'考察',k:'こうさつ',sub:'考察'},
  {slug:'henshu-koki',n:'編集後記',k:'へんしゅうこうき',sub:'編集後記'}
]}
];

// 最新記事(トップに表示)。img があれば写真、なければ地図風の絵
export const LATEST = [
  {pillar:'events', slug:'ikedaya-jiken'},
  {pillar:'people', slug:'sakamoto-ryoma', img:'ryoma.jpg'},
  {pillar:'people', slug:'saigo-takamori', img:'saigo.jpg'},
  {pillar:'tour', slug:'shokasonjuku'}
];
