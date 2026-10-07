// ホームの地図(MapLibre)+タブ・年スライダー・一覧パネル。
// 地図データ(藩領・旧国・1876年府県)は public/data/*.json を実行時に読み込む。
import { PILLARS, PHASES, WAREKI, MODES, SHISHI_TIMELINE } from '../data/pillars.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- 色の定義(藩領・戊辰戦争・函館戦争) ----------
const CATEGORY_COLOR = { gosanke: '#b23b3b', shinpan: '#c98cc0', fudai: '#e0952e', tozama: '#4f8f52', bakufu: '#5d7396', hatamoto: '#9fb1cc', sankyo: '#7d8fb3', other: '#cfc6ad' };
const BOSHIN_RED = '#c0392b', BOSHIN_GREEN = '#5d8f58', BOSHIN_LIGHT_GREEN = '#a9c7a0', LIGHT_RED = '#e9968c', BOSHIN_PINK = LIGHT_RED;
const BOSHIN_REDS = new Set(['薩摩鹿児島藩', '周防山口藩', '土佐高知藩', '肥前佐賀藩']);
const BOSHIN_AIZU = new Set(['陸奥会津藩']);
const BOSHIN_ALLIANCE = new Set(['陸奥仙台藩','出羽米沢藩','陸奥弘前藩','陸奥八戸藩','陸奥盛岡藩','陸奥一関藩','出羽秋田藩','出羽本荘藩','出羽亀田藩','交代寄合生駒家','出羽新庄藩','出羽山形藩','出羽上山藩','出羽天童藩','陸奥二本松藩','陸奥守山藩','陸奥棚倉藩','陸奥中村藩','陸奥三春藩','陸奥磐城平藩','陸奥福島藩','陸奥泉藩','陸奥湯長谷藩','陸奥下手渡藩','蝦夷松前藩','越後長岡藩','越後新発田藩','越後村上藩','越後村松藩','越後三根山藩','越後黒川藩','出羽庄内藩']);
const NEUTRAL_FILL = '#e8e0cc';
const HAKODATE_EZO = '#4a5fa8', HAKODATE_MEIJI = LIGHT_RED, HAKODATE_NOMINAL = '#a9c7a0';
const HAKODATE_EZO_HAN = new Set(['蝦夷松前藩']);
const HAKODATE_EZO_KUNI = new Set(['渡島']);
const HAKODATE_NOMINAL_KUNI = new Set(['千島', '北見', '天塩', '石狩', '根室', '釧路', '十勝', '後志', '膽振', '日高']);

// ---------- 府藩県三治制(版籍奉還〜廃藩置県)の定義 ----------
const SANCHI_PALETTE = ['#e9968c', '#f2c879', '#a8d08d', '#d9a0d0', '#f0a86b', '#cfc47e', '#b9a8e3', '#d8b999', '#8fd3c4', '#e6a5b8'];
const KEN_COLOR = '#8fa6c4'; // 府県領(旧幕府領・旗本領・没収地・社寺領など)
const SKIND = { han: { t: '藩', c: '#8a5a00' }, fu: { t: '府', c: '#c0392b' }, ken: { t: '県', c: '#2d5fa3' } };
const SM = MODES.length; // 「府藩県」タブの番号(版籍奉還〜1870年だけ出る)
// スライダーの位置: 1853〜1869前半(函館戦争)=0〜16、1869後半(版籍奉還)=17、1870〜1877=18〜25
const MAXPOS = 25;
const posOf = (y, sub) => (y < 1869 ? y - 1853 : y === 1869 ? 16 + sub : y - 1852);
const fromPos = (p) => (p <= 16 ? { year: 1853 + p, sub: 0 } : p === 17 ? { year: 1869, sub: 1 } : { year: p + 1852, sub: 0 });
const evSub = (e) => (e.slug === 'hanseki-hokan' ? 1 : 0); // 版籍奉還は函館戦争より後

// ---------- 状態と共通の関数 ----------
const PIL = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
const EVT = [...PIL.events.items].sort((a, b) => a.y - b.y);
const state = { year: 1853, sub: 0, mode: 0, sel: null, full: false, ss: null, hq: '', sf: 'all', cmode: 'area', lastRg: '' };
const modeId = () => (state.mode === SM ? 'sanchi' : MODES[state.mode]);
const DEFAULT_VIEW = { center: [136.0, 36.5], zoom: 5.5 };
const NOTE_ALL = '左のタブを押すとその年の出来事、中心人物、代表的事例を一覧表示します。';
const TAB_SUB = { people: 'その年に生きていた志士を表示します。', orgs: 'その年に存在した藩や隊を表示します。', places: 'その年に関係する場所や道を表示します。', tour: 'その年の出来事ゆかりの史跡を表示します。' };
const hasPos = (it) => typeof it.lat === 'number' && typeof it.lon === 'number';

let map = null, ready = false, lastCam = '';
const pins = []; // { pid, idx, it, marker, el }
const personMarkers = {}; // key -> { marker, active }
let kuniLabelMarkers = {}, hanLabelMarkers = [], pref1876LabelMarkers = [], special1876LabelMarkers = [], ken1871LabelMarkers = [];
let hideHanLabels = false; // 府県の表示のときは、藩名・旧国名を出さない
const hanColorByName = {};

function currentEvents(y, sub = state.sub) { let m = null; EVT.forEach((e) => { if (e.y <= y) m = e.y; }); if (m === null) return []; let list = EVT.filter((e) => e.y === m); if (m === 1869) list = list.filter((e) => evSub(e) === (y > 1869 || sub === 1 ? 1 : 0)); return list; }
// 地図と一覧が表す期間: 3年間(1853〜1877の範囲内)
function evView(y) {
  const s0 = Math.max(1853, Math.min(y - 1, 1875)), e0 = s0 + 2;
  let list = EVT.filter((e) => e.y >= s0 && e.y <= e0), fb = false;
  if (!list.length) { let prev = null, next = null; EVT.forEach((e) => { if (e.y < s0) prev = e; if (e.y > e0 && !next) next = e; }); list = EVT.filter((e) => e === prev || e === next); fb = true; }
  return { s: s0, e: e0, list, fb };
}
function isActive(pid, it, y) { if (pid === 'people') return y <= it.d; return (it.r || []).some((a) => y >= a[0] && y <= a[1]); }
function subFor(pid, it, y) { let t = it.sub.split('|')[0]; if (pid === 'people') { t += ' / ' + (y - it.y) + '歳前後'; if (y === it.d) t += ' / この年に没'; } return t; }
function phaseAt(y) { let p = null; PHASES.forEach((ph) => { if (ph.year <= y) p = ph; }); return p; }
function regionFor(y, sub = state.sub) { return y === 1868 ? 'boshin' : y === 1869 && sub === 0 ? 'hakodate' : y === 1869 || y === 1870 ? 'sanchi' : y >= 1876 ? 'final' : y >= 1871 ? 'ken1871' : 'han'; }
const detailUrl = (pid, it) => `${BASE}/${pid}/${it.slug}/`;
// ---------- 基準日と、藩・府県の状態(移転・改称・廃止・設置を日付で切り替える) ----------
const refFor = (y, sub = state.sub) => (y === 1868 ? '1868-10-31' : y === 1869 ? (sub === 0 ? '1869-06-27' : '1869-09-30') : `${y}-12-31`);
const fmtRef = (r) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r); return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : r; };
let MOVES = { labels: {}, sanchi: {} };
function evState(base, evs, ref) { // 版籍奉還より前の藩名ラベル用
  let st = { ...base, on: true };
  for (const e of evs || []) { if (e.d > ref) break; if (e.end) st.on = false; else st = { ...st, ...e, on: true }; }
  return st;
}
function sanchiState(it, ref) { // 府藩県三治制の地図用
  if (it.kind !== 'han') return { on: (!it.from || it.from <= ref) && (!it.to || it.to > ref), dn: it.n, lon: it.lon, lat: it.lat, place: it.place, approx: it.approx };
  const m = MOVES.sanchi[it.n] || {};
  if (m.since && m.since > ref) return { on: false, dn: it.n };
  let st = { on: true, dn: it.n, lon: it.lon, lat: it.lat, place: it.place, approx: it.approx };
  for (const e of m.ev || []) {
    if (e.d > ref) break;
    if (e.end) { st.on = false; continue; }
    st = { ...st, on: true, dn: e.dn || st.dn };
    if (e.lon != null) { st.lon = e.lon; st.lat = e.lat; st.place = e.place; st.approx = !!e.approx; st.nopos = false; } else if (e.nopos) { st.nopos = true; st.place = e.place || st.place; }
  }
  return st;
}
const sc = (it) => sanchiState(it, refFor(state.year, state.sub));
const listUrl = (pid) => `${BASE}/${pid}/`;

// ---------- 地図の領域の見せ方(藩領 / 戊辰戦争 / 函館戦争 / 1876年府県) ----------
function setPrefMode(kind) {
  // kind: 'han'(藩領) / 'ken1871'(明治4年12月の3府72県) / 'final'(1876年の府県)
  const hideFill = kind === 'final' || kind === 'ken1871';
  hideHanLabels = hideFill || kind === 'sanchi';
  if (!map || !map.getLayer('pref1876-fill')) return;
  const han = hideFill ? 0 : 1, k71 = kind === 'ken1871' ? 1 : 0, k76 = kind === 'final' ? 1 : 0;
  map.setPaintProperty('kuni-fill', 'fill-opacity', 0.55 * han); map.setPaintProperty('kuni-line', 'line-opacity', 0.95 * han);
  map.setPaintProperty('han-fill', 'fill-opacity', 0.8 * han); map.setPaintProperty('han-line', 'line-opacity', 0.4 * han);
  map.setPaintProperty('pref1871-fill', 'fill-opacity', 0.66 * k71); map.setPaintProperty('pref1871-line', 'line-opacity', 0.95 * k71);
  map.setPaintProperty('pref1876-fill', 'fill-opacity', 0.62 * k76); map.setPaintProperty('pref1876-line', 'line-opacity', 0.95 * k76);
  Object.values(kuniLabelMarkers).forEach((m) => (m.getElement().style.display = hideHanLabels ? 'none' : ''));
  hanLabelMarkers.forEach((o) => (o.m.getElement().style.display = hideHanLabels || o.gone ? 'none' : map.getZoom() >= o.minZ ? '' : 'none'));
  ken1871LabelMarkers.forEach((m) => (m.getElement().style.display = k71 ? '' : 'none'));
  pref1876LabelMarkers.forEach((m) => (m.getElement().style.display = k76 ? '' : 'none'));
  special1876LabelMarkers.forEach((m) => (m.getElement().style.display = k76 ? '' : 'none'));
  const stance = document.querySelector('.stance-legend'); if (stance) stance.style.display = hideHanLabels ? 'none' : '';
}
const NOTE_KEN = {
  1871: '1871年8月の廃藩置県の約4か月後、第1次府県統合で3府72県になりました。この地図は1871年12月ごろの県で、国・郡を単位に作成した概略です(北海道は開拓使、琉球は琉球国)。県名は添付の県境図に合わせています。',
  1872: '県の統合はその後も続き、1876年に現在に近い形になりました。1872〜1875年のこの地図は1871年12月ごろの県境のままで、その後の統合は反映していません。',
};
const NOTE_HAN = '藩領は幕末期近世村領域データセットの村点(領分)から作成した概略です。藩名はズームすると順に表示されます。北海道・沖縄はデータがありません。';
const NOTE_SANCHI = '1869年7月25日(明治2年6月17日)の版籍奉還から、1871年8月29日(明治4年7月14日)の廃藩置県までの「府藩県三治制」の地図です。藩は藩名、府・県は庁所在地を示します。藩領は領域ごとに色を分け、藩に属さず府・県が管轄した地域(旧幕府領・旗本領・没収地・社寺領など)は青灰色で示しました(どの県かは分けていません)。領域は幕末期近世村領域データセットから作成した概略で、移封のあった藩は移封前の区域を新しい藩にあてはめています。斗南藩・岩崎藩・生坂藩・白石藩など、領域を描けていない藩は点だけです。領域を押すと説明が出ます。';
function updateHanLabels() {
  const ref = refFor(state.year, state.sub);
  hanLabelMarkers.forEach((o) => { const evs = MOVES.labels[o.n0]; if (!evs) return; const st = evState({ dn: o.n0, x: o.ox, y: o.oy }, evs, ref); o.lab.textContent = st.dn; o.m.setLngLat([st.x, st.y]); o.gone = !st.on; });
}
function setRegionMode(kind, y) {
  if (!map || !map.getLayer('han-fill')) return;
  const isBoshin = kind === 'boshin', isHakodate = kind === 'hakodate', isFinal = kind === 'final', isKen = kind === 'ken1871', isSanchi = kind === 'sanchi';
  updateHanLabels();
  setPrefMode(isFinal ? 'final' : isKen ? 'ken1871' : isSanchi ? 'sanchi' : 'han');
  const gone = isSanchi ? sanchiItems.filter((x) => x.kind === 'han' && !sc(x).on).map((x) => x.n) : [], sCol = ['get', state.cmode === 'type' ? 'sanchiTypeColor' : 'sanchiColor'];
  map.setPaintProperty('han-fill', 'fill-color', isSanchi ? (gone.length ? ['case', ['in', ['get', 'dn'], ['literal', gone]], KEN_COLOR, sCol] : sCol) : isBoshin ? ['get', 'boshinColor'] : isHakodate ? ['get', 'hakodateColor'] : ['get', 'color']);
  map.setPaintProperty('kuni-fill', 'fill-color', isHakodate ? ['get', 'hakodateColor'] : NEUTRAL_FILL);
  if (!isFinal && !isKen) map.setPaintProperty('kuni-fill', 'fill-opacity', isHakodate ? 0.72 : 0.55);
  hanLabelMarkers.forEach((o) => { if (!o.dot) return; const hc = hanColorByName[o.n]; o.dot.style.background = isBoshin && hc ? hc.boshin : isHakodate && hc ? hc.hakodate : CATEGORY_COLOR[o.c]; });
  const hl = document.querySelector('.hakodate-legend'); if (hl) hl.style.display = isHakodate ? 'flex' : 'none';
  const sl = document.querySelector('.sanchi-legend'); if (sl) sl.style.display = isSanchi ? 'flex' : 'none';
  const bl = document.querySelector('.boshin-legend'); if (bl) bl.style.display = isBoshin ? 'flex' : 'none';
  const note = document.querySelector('.han-note');
  if (note) note.textContent = isSanchi ? NOTE_SANCHI : isKen ? (NOTE_KEN[y] || NOTE_KEN[1872]) : isFinal ? '1876年8月21日の第二次府県統合後。北海道は開拓使、沖縄は琉球藩。'
    : isHakodate ? '青は榎本軍が奉行を置いて実効支配した道南(箱館・松前・江差など、旧渡島国)、薄緑は蝦夷地全域(道央・道北・道東・千島)への名目上の領有宣言、赤は明治政府側です。北海道は藩領データがないため旧国境で表示しています。樺太は地図データがありません。'
    : NOTE_HAN;
}

// ---------- ピンと人物マーカー ----------
function createPersonMarker(color, letter, title) {
  const el = document.createElement('div');
  el.className = 'person-icon'; el.style.width = '28px'; el.style.height = '28px'; el.style.background = color; el.innerText = letter; el.title = title;
  return new maplibregl.Marker({ element: el });
}
function animateMarker(marker, from, to, duration) {
  if (!from) { marker.setLngLat([to.lng, to.lat]); return; }
  const start = performance.now();
  function step(now) { const t = Math.min(1, (now - start) / duration); marker.setLngLat([from.lng + (to.lng - from.lng) * t, from.lat + (to.lat - from.lat) * t]); if (t < 1) requestAnimationFrame(step); }
  requestAnimationFrame(step);
}
function createPins() {
  const seen = {};
  MODES.forEach((pid) => {
    PIL[pid].items.forEach((it, idx) => {
      if (!hasPos(it)) return;
      if (it.key) { // 人物: 文字入りのマーカー(スライドごとに移動)
        const marker = createPersonMarker(it.color, it.letter, it.n);
        marker.getElement().addEventListener('click', (e) => { e.stopPropagation(); select(pid, idx); });
        personMarkers[it.key] = { marker, active: false, it, idx };
        return;
      }
      let lon = it.lon, lat = it.lat; const k = lon.toFixed(3) + ',' + lat.toFixed(3);
      seen[k] = (seen[k] || 0) + 1; if (seen[k] > 1) { lon += 0.02 * (seen[k] - 1); lat += 0.015 * (seen[k] - 1); } // 同じ場所のピンを少しずらす
      const el = document.createElement('button'); el.type = 'button'; el.className = 'pin-dot'; el.style.background = PIL[pid].c; el.title = it.n; el.setAttribute('aria-label', it.n);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(map);
      el.style.display = 'none';
      el.addEventListener('click', (e) => { e.stopPropagation(); select(pid, idx); });
      pins.push({ pid, idx, it, marker, el, lon, lat });
    });
  });
}
function updatePins() {
  const y = state.year, pid = modeId(), cur = currentEvents(y), vis = new Set();
  if (pid === 'sanchi') { /* 府藩県タブでは事件・人物のピンは出さない */ }
  else if (pid === 'events') evView(y).list.forEach((e) => vis.add(e.slug));
  else PIL[pid].items.forEach((it) => { if (hasPos(it)) vis.add(it.slug); });
  pins.forEach((p) => {
    const show = p.pid === pid && vis.has(p.it.slug);
    p.el.style.display = show ? '' : 'none';
    p.el.classList.toggle('cur', show && pid === 'events' && cur.indexOf(p.it) >= 0 && p.it.y === y);
    p.el.classList.toggle('dim', show && pid !== 'events' && !isActive(pid, p.it, y));
    p.el.classList.toggle('sel', !!state.sel && state.sel.pid === p.pid && state.sel.idx === p.idx);
  });
  // 人物マーカー: 人物タブのときだけ、その年のスライドの居場所に表示
  const ph = phaseAt(y);
  Object.entries(personMarkers).forEach(([key, pm]) => {
    const pos = ph && ph[key], show = pid === 'people' && pos && y <= pm.it.d;
    if (show) {
      if (!pm.active) { pm.marker.setLngLat([pos.lng, pos.lat]); pm.marker.addTo(map); pm.active = true; }
      else { const f = pm.marker.getLngLat(); animateMarker(pm.marker, { lat: f.lat, lng: f.lng }, pos, 700); }
    } else if (pm.active) { pm.marker.remove(); pm.active = false; }
    if (pm.active) pm.marker.getElement().classList.toggle('dim', false);
  });
}

// ---------- 府藩県三治制(版籍奉還〜廃藩置県)の藩と府県 ----------
let sanchiItems = [], sanchiNopos = [];
function fmtDate(w, d) { const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d); if (!m) return w; return `${w}(${m[1]}年${m[2] ? +m[2] + '月' : ''}${m[3] ? +m[3] + '日' : ''})`; }
const sanchiOn = () => regionFor(state.year, state.sub) === 'sanchi';
const sanchiVisible = (it) => state.sf === 'all' || (state.sf === 'han' ? it.kind === 'han' : it.kind !== 'han');
function createSanchiMarkers(data) {
  const all = [...data.han.map((h) => ({ ...h, kind: 'han' })), ...data.fuken], seen = {};
  all.forEach((it0, i) => {
    let it = it0; const k = it.lon.toFixed(3) + ',' + it.lat.toFixed(3); seen[k] = (seen[k] || 0) + 1;
    if (seen[k] > 1) it = { ...it, lon: it.lon + 0.012 * (seen[k] - 1) }; // 同じ場所(水原の越後府と水原県など)は少しずらす
    const el = document.createElement('button'); el.type = 'button'; el.className = 'sx-pin sx-' + it.kind; el.title = it.n; el.setAttribute('aria-label', `${SKIND[it.kind].t} ${it.n}`); el.style.display = 'none';
    const lab = document.createElement('span'); lab.className = 'sx-lab'; lab.textContent = it.n; el.appendChild(lab);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([it.lon, it.lat]).addTo(map);
    el.addEventListener('click', (e) => { e.stopPropagation(); selectSanchi(i); });
    sanchiItems.push({ ...it, el, lab, marker, minZ: it.kind === 'han' ? it.z : it.kind === 'fu' ? 0 : 6.3 });
  });
  sanchiNopos = data.nopos;
  map.on('zoom', refreshSanchiLabels);
}
function refreshSanchiLabels() { if (!map) return; const z = map.getZoom(); sanchiItems.forEach((it) => { it.lab.style.display = z >= it.minZ ? '' : 'none'; }); }
function updateSanchiMarkers() {
  const on = sanchiOn();
  sanchiItems.forEach((it, i) => { const c = sc(it), show = c.on && !c.nopos; it.el.style.display = on && show && sanchiVisible(it) ? '' : 'none'; if (show) it.marker.setLngLat([c.lon, c.lat]); it.lab.textContent = c.dn; it.el.title = c.dn; it.el.classList.toggle('sel', state.ss === i); });
  refreshSanchiLabels();
}
function selectSanchi(i) { state.mode = SM; state.sel = null; state.full = false; state.ss = i; applyAll(); }
function bindAreaClick() {
  map.on('mouseenter', 'han-fill', () => { if (sanchiOn()) map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'han-fill', () => (map.getCanvas().style.cursor = ''));
  map.on('click', 'han-fill', (e) => {
    if (!sanchiOn()) return;
    const f = e.features && e.features[0]; if (!f) return;
    const { k, dn, h } = f.properties;
    if (k === 'han') { const i = sanchiItems.findIndex((x) => x.kind === 'han' && x.n === dn); if (i >= 0 && sc(sanchiItems[i]).on) return selectSanchi(i); }
    const label = /藩$/.test(h) ? `旧${h}の領地` : h;
    new maplibregl.Popup({ closeButton: false, maxWidth: '260px' }).setLngLat(e.lngLat)
      .setHTML(`<b>${esc(label)}</b><br>府・県が管轄した地域(旧幕府領・旗本領・没収地・社寺領など)。どの県かは、この地図では分けていません。`).addTo(map);
  });
}
function sanchiRow(i) {
  const it = sanchiItems[i], K = SKIND[it.kind], c = sc(it), ref = refFor(state.year, state.sub);
  const cj = it.kind === 'han' ? it.chiji.filter((x) => x.d <= ref).pop() || it.chiji[0] : null;
  const sub = it.kind === 'han' ? `知藩事 ${cj.name} / ${c.place}${c.nopos ? '' : c.approx ? '(位置は目安)' : ''}` : `${K.t} / ${c.place}${c.approx ? '(位置は目安)' : ''}`;
  return `<li><button type="button" data-si="${i}"><span class="dot" style="background:${K.c}${it.kind === 'han' ? '' : ';border-radius:3px'}"></span><span><b>${esc(c.dn)}</b><small>${esc(sub)}</small></span></button></li>`;
}
function renderSanchiList() {
  const l = $('hslist'); if (!l) return;
  const k = state.hq.trim(), hit = [];
  sanchiItems.forEach((it, i) => { if (sanchiVisible(it) && sc(it).on && (!k || [it.n, sc(it).dn, sc(it).place, it.note, it.kind === 'han' ? it.chiji.map((c) => c.name).join(' ') : ''].join(' ').includes(k))) hit.push(i); });
  l.innerHTML = hit.slice(0, 50).map(sanchiRow).join('') + (hit.length > 50 ? `<li class="sub" style="padding:8px 4px">ほか${hit.length - 50}件。絞り込んでください。</li>` : '') + (!hit.length ? '<li class="sub" style="padding:8px 4px">見つかりませんでした。</li>' : '');
  const live = sanchiItems.filter((x) => sc(x).on);
  $('hscount').textContent = `藩${live.filter((x) => x.kind === 'han').length}・府${live.filter((x) => x.kind === 'fu').length}・県${live.filter((x) => x.kind === 'ken').length}(うち${hit.length}件を表示)`;
}
function sanchiPanelHtml() {
  const i = state.ss;
  if (i !== null && sanchiItems[i]) {
    const it = sanchiItems[i], K = SKIND[it.kind], c = sc(it);
    let h = `<button class="back" type="button" id="sback" style="display:block">‹ 府藩県の一覧にもどる</button><span class="kind" style="background:${K.c}">${K.t}</span><h3 style="margin-top:8px">${esc(c.dn)}</h3>`;
    if (it.kind === 'han') {
      h += `<p class="sub">所在地: ${esc(c.place)}${c.nopos ? '' : c.approx ? '(位置は目安です)' : ''}</p><div class="grp" style="font-weight:700;margin:10px 0 4px">知藩事</div><ul style="list-style:none;padding:0;margin:0">` +
        it.chiji.map((c) => `<li style="padding:6px 0;border-bottom:1px solid #e3d9c2"><b>${esc(c.name)}</b><br><small>${esc(fmtDate(c.w, c.d))}${c.why ? ' / ' + esc(c.why) : ''}</small></li>`).join('') + '</ul>';
      if (it.note) h += `<p style="margin-top:12px">${esc(it.note)}</p>`;
    } else {
      h += `<p class="sub">庁の所在地: ${esc(c.place)}${c.approx ? '(位置は目安です)' : ''}</p><p><b>設置</b> ${esc(it.set || '(資料に日付なし)')}<br><b>廃止・その後</b> ${esc(it.end)}</p>${it.note ? `<p>${esc(it.note)}</p>` : ''}`;
    }
    return h;
  }
  const pr = (v, cur) => `aria-pressed="${v === cur}"`;
  return `<h3>府藩県三治制(明治2〜4年)</h3><p class="sub">この地図の基準日は<b>${fmtRef(refFor(state.year, state.sub))}</b>です。藩の移転・改称・廃止、府県の設置・廃止は、この日の時点の状態で表示します。</p><p class="sub">1868年6月11日(慶応4年閏4月21日)の政体書で、旧幕府領などに府・県が置かれ、藩は従来どおり大名が治める「府藩県三治制」になりました。1869年7月25日の版籍奉還で藩も国の行政区画となり、大名は知藩事に任命されました。</p>
    <div class="sx-row">表示 <button type="button" class="sx-btn" data-sf="all" ${pr('all', state.sf)}>すべて</button><button type="button" class="sx-btn" data-sf="han" ${pr('han', state.sf)}>藩</button><button type="button" class="sx-btn" data-sf="fuken" ${pr('fuken', state.sf)}>府・県</button></div>
    <div class="sx-row">色分け <button type="button" class="sx-btn" data-cm="area" ${pr('area', state.cmode)}>領域ごと</button><button type="button" class="sx-btn" data-cm="type" ${pr('type', state.cmode)}>藩の種類</button></div>
    <p class="sub" id="hscount"></p><div class="hsearch"><input id="hsq" type="search" placeholder="藩名・府県名・知藩事の名前で探す" value="${esc(state.hq)}" aria-label="藩名・府県名・知藩事の名前で探す"></div><ul class="plist" id="hslist"></ul>
    <div class="grp" style="font-weight:700;margin:16px 0 4px">庁の位置を確認できていない府県(地図に点はありません)</div><ul style="list-style:none;padding:0;margin:0">${sanchiNopos.map((x) => `<li style="padding:5px 0;border-bottom:1px solid #e3d9c2"><b>${esc(x.n)}</b><br><small>${esc(x.set)} / ${esc(x.note)}</small></li>`).join('')}</ul>
    <p class="sub" style="margin-top:8px">東北民政取締諸藩の県(花巻県など)は、正式な県と認めない資料が多いため含めていません。</p>`;
}

// ---------- カメラ ----------
function camera(t) {
  if (!ready) return;
  const key = JSON.stringify(t || 'default');
  if (key === lastCam) return; lastCam = key;
  if (!t) { map.easeTo({ center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom, duration: 800 }); return; }
  if (t.points.length === 1) { map.flyTo({ center: t.points[0], zoom: t.zoom, duration: 900 }); return; }
  const b = new maplibregl.LngLatBounds(); t.points.forEach((p) => b.extend(p));
  map.fitBounds(b, { padding: 70, maxZoom: t.zoom, duration: 900 });
}

// ---------- 一覧パネル ----------
function select(pid, idx) {
  state.full = false; state.sel = { pid, idx };
  if (pid === 'events') { const ev = PIL.events.items[idx]; state.year = ev.y; state.sub = evSub(ev); }
  syncSlider(); applyAll();
}
function renderPanel() {
  const y = state.year, pid = modeId(), P = PIL[pid];
  let h = '', target = null;
  if (state.sel) {
    const sp = PIL[state.sel.pid], it = sp.items[state.sel.idx];
    const pm = it.key && personMarkers[it.key] && personMarkers[it.key].active ? personMarkers[it.key].marker.getLngLat() : null;
    const pt = pm ? [pm.lng, pm.lat] : hasPos(it) ? [it.lon, it.lat] : null;
    if (pt) target = { points: [pt], zoom: 8 };
    const tl = it.key && SHISHI_TIMELINE[it.key] ? '<ol class="tl" style="margin-top:12px">' + SHISHI_TIMELINE[it.key].timeline.map((t) => `<li class="past"><span class="ty">${t.year}年</span><span style="padding:6px 8px">${esc(t.event)}</span></li>`).join('') + '</ol>' : '';
    h = `<button class="back" type="button" id="back">‹ 一覧にもどる</button><span class="kind" style="background:${sp.c}">${sp.t}</span><h3 style="margin-top:8px">${esc(it.n)}</h3><p class="sub">${esc(it.sub.split('|').join(' / '))}</p><p>[概要は記事ページに掲載します]</p>${tl}<a class="read" href="${detailUrl(sp.id, it)}">記事を読む</a><div style="margin-top:14px"><a class="more" href="${listUrl(sp.id)}">${sp.t}の一覧へ</a></div>`;
  } else if (pid === 'sanchi') {
    h = sanchiPanelHtml();
    if (state.ss !== null && sanchiItems[state.ss]) target = { points: [[sanchiItems[state.ss].lon, sanchiItems[state.ss].lat]], zoom: 8 };
  } else if (pid === 'events') {
    const V = evView(y), inYear = V.list.filter((e) => e.y === y && (y !== 1869 || evSub(e) === state.sub)), focus = inYear.length ? inYear : V.list;
    if (focus.length) target = { points: focus.map((e) => { const p = pins.find((q) => q.it === e); return p ? [p.lon, p.lat] : [e.lon, e.lat]; }), zoom: focus.length > 1 ? 7.2 : 7.6 };
    h = `<h3>${V.s}年～${V.e}年の出来事</h3><p class="sub">${V.fb ? 'この期間に登録された事件はありません。前後の出来事を表示しています。' : '地図にも、この3年間の事件を表示しています。'}押すとその年へ移ります。</p><ol class="tl">`;
    let last = null;
    V.list.forEach((e) => { const st = e.y === y && (y !== 1869 || evSub(e) === state.sub) ? 'now' : e.y < y || (e.y === y && evSub(e) < state.sub) ? 'past' : 'future'; h += `<li class="${st}">${e.y !== last ? `<span class="ty">${e.y}年</span>` : '<span class="ty"></span>'}<button type="button" data-pid="events" data-i="${P.items.indexOf(e)}"><b>${esc(e.n)}</b>${st === 'now' ? '<span class="nowchip">いま</span>' : ''}</button></li>`; last = e.y; });
    h += '</ol>';
  } else {
    const act = [], oth = [];
    P.items.forEach((it, i) => (isActive(pid, it, y) ? act : oth).push(i));
    const row = (i, dim) => { const it = P.items[i]; return `<li class="${dim ? 'dimrow' : ''}"><button type="button" data-pid="${pid}" data-i="${i}"><span class="dot" style="background:${P.c}"></span><span><b>${esc(it.n)}</b><small>${esc(subFor(pid, it, y))}</small></span></button></li>`; };
    h = `<h3>${y}年の${P.t}</h3><p class="sub">${esc(TAB_SUB[pid])}</p>`;
    if (pid === 'orgs' && y >= 1871) h += '<p class="note">1871年の廃藩置県で、藩は県になりました。</p>';
    h += `<div class="grp">${y}年に関係する</div>` + (act.length ? `<ul class="plist">${act.map((i) => row(i, false)).join('')}</ul>` : '<p class="sub">この年に関係する項目は、まだ登録されていません。</p>');
    if (oth.length) h += `<div class="grp">ほかの${P.t}</div><ul class="plist">${oth.map((i) => row(i, true)).join('')}</ul>`;
    if (pid === 'people') { const pts = Object.values(personMarkers).filter((m) => m.active).map((m) => { const l = m.marker.getLngLat(); return [l.lng, l.lat]; }); if (pts.length) target = { points: pts, zoom: 7 }; }
  }
  if (state.full) target = null;
  $('pbody').innerHTML = h;
  if (pid === 'sanchi' && !state.sel && state.ss === null) renderSanchiList();
  camera(target);
  $('fit').style.display = target && !state.full ? '' : 'none';
  const now = $('pbody').querySelector('.tl .now'); if (now && !state.sel) { try { $('panel').scrollTop = Math.max(0, now.offsetTop - 90); } catch (e) { /* 何もしない */ } }
}

// ---------- 画面全体の更新 ----------
function syncSlider() { $('range').value = posOf(state.year, state.sub); }
function applyAll() {
  const y = state.year, sub = state.sub, rg = regionFor(y, sub);
  if (rg === 'sanchi' && state.lastRg !== 'sanchi') state.mode = SM; // 版籍奉還に入ったら「府藩県」タブにする
  if (rg !== 'sanchi') { if (state.mode === SM) state.mode = 0; state.ss = null; }
  state.lastRg = rg;
  const cur = currentEvents(y, sub);
  $('tlYear').textContent = y + '年';
  $('tlWareki').textContent = (WAREKI[y] || '') + (y === 1869 ? (sub ? '・後半(版籍奉還)' : '・前半(函館戦争)') : '');
  $('tlEv').textContent = cur.map((e) => e.n).join('・');
  document.querySelectorAll('.mk').forEach((m) => m.classList.toggle('on', +m.dataset.p === posOf(y, sub)));
  document.querySelectorAll('#tabs .seg').forEach((b) => { const k = +b.dataset.m; b.setAttribute('aria-pressed', String(k === state.mode)); if (k === SM) b.hidden = rg !== 'sanchi'; });
  const tn = $('tabnote'); if (tn) tn.textContent = NOTE_ALL;
  if (ready) { setRegionMode(rg, y); updatePins(); updateSanchiMarkers(); }
  renderPanel();
}
function buildUI() {
  $('tabs').innerHTML = MODES.map((pid, k) => `<button type="button" class="seg" style="--c:${PIL[pid].c}" data-m="${k}" aria-pressed="${k === state.mode}">${PIL[pid].t}</button>`).join('') + `<button type="button" class="seg" style="--c:#8a5a00" data-m="${SM}" aria-pressed="false" hidden>府藩県</button>` + '<span class="tabnote" id="tabnote"></span>';
  $('pinLegend').innerHTML = MODES.map((pid) => `<span><i class="dot" style="background:${PIL[pid].c}"></i>${PIL[pid].t}</span>`).join('');
  const ps = {}; EVT.forEach((e) => { const p = posOf(e.y, evSub(e)); (ps[p] = ps[p] || []).push(e.n); });
  $('marks').innerHTML = Object.keys(ps).map((p) => { const yy = fromPos(+p).year; return `<button type="button" class="mk" data-p="${p}" style="left:calc(11px + (100% - 22px) * ${p / MAXPOS})" title="${esc(yy + '年: ' + ps[p].join('・'))}" aria-label="${esc(yy + '年 ' + ps[p].join('、'))}"></button>`; }).join('');
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.seg'); if (!b) return; state.mode = +b.dataset.m; state.sel = null; state.full = false; $('tabs').querySelectorAll('.seg').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); applyAll(); });
  $('range').addEventListener('input', (e) => { const f = fromPos(+e.target.value); state.year = f.year; state.sub = f.sub; state.sel = null; state.full = false; applyAll(); });
  $('marks').addEventListener('click', (e) => { const b = e.target.closest('.mk'); if (!b) return; const f = fromPos(+b.dataset.p); state.year = f.year; state.sub = f.sub; state.sel = null; state.full = false; syncSlider(); applyAll(); });
  $('fit').addEventListener('click', () => { state.sel = null; state.ss = null; state.full = true; applyAll(); });
  $('pbody').addEventListener('input', (e) => { if (e.target.id === 'hsq') { state.hq = e.target.value; renderSanchiList(); } });
  $('pbody').addEventListener('click', (e) => {
    if (e.target.closest('#sback')) { state.ss = null; return applyAll(); }
    const si = e.target.closest('button[data-si]'); if (si) return selectSanchi(+si.dataset.si);
    const sf = e.target.closest('button[data-sf]'); if (sf) { state.sf = sf.dataset.sf; state.ss = null; return applyAll(); }
    const cm = e.target.closest('button[data-cm]'); if (cm) { state.cmode = cm.dataset.cm; return applyAll(); }
    if (e.target.closest('#back')) { state.sel = null; return applyAll(); }
    const b = e.target.closest('button[data-pid]'); if (b && !b.disabled) select(b.dataset.pid, +b.dataset.i);
  });
}

// ---------- 地図の初期化 ----------
async function boot() {
  buildUI();
  applyAll(); // 地図の準備ができる前でも、一覧・スライダーは使える
  if (typeof maplibregl === 'undefined') { $('loading').textContent = '地図ライブラリを読み込めませんでした。通信状況を確認して再読み込みしてください。'; return; }
  map = new maplibregl.Map({
    container: 'japanMap',
    style: { version: 8, sources: { 'gsi-photo-tiles': { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院(写真)</a>' } }, layers: [{ id: 'gsi-photo-layer', type: 'raster', source: 'gsi-photo-tiles' }] },
    center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  const loaded = new Promise((res) => map.on('load', res));
  const data = Promise.all(['kuni', 'han', 'han-labels', 'pref1876', 'pref1871', 'sanchi', 'moves'].map((n) => fetch(`${BASE}/data/${n}.json?v=20261007`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
  try {
    const [, [KUNI, HAN, HAN_LABELS, PREF, KEN71, SANCHI, MV]] = await Promise.all([loaded, data]);
    MOVES = MV;
    addLayers(KUNI, HAN, HAN_LABELS, PREF, KEN71, SANCHI);
    createPins();
    ready = true; $('loading').remove();
    applyAll();
  } catch (err) { console.error(err); $('loading').textContent = '地図データの読み込みに失敗しました。ページを再読み込みしてください。'; }
}
function addLayers(KUNI, HAN, HAN_LABELS, PREF, KEN71, SANCHI) {
  KUNI.features.forEach((f) => { f.properties.hakodateColor = HAKODATE_EZO_KUNI.has(f.properties.name) ? HAKODATE_EZO : HAKODATE_NOMINAL_KUNI.has(f.properties.name) ? HAKODATE_NOMINAL : HAKODATE_MEIJI; });
  map.addSource('kuni', { type: 'geojson', data: KUNI });
  map.addLayer({ id: 'kuni-fill', type: 'fill', source: 'kuni', paint: { 'fill-color': NEUTRAL_FILL, 'fill-opacity': 0.55 } });
  map.addLayer({ id: 'kuni-line', type: 'line', source: 'kuni', paint: { 'line-color': '#3a3222', 'line-width': 1.8, 'line-opacity': 0.95 } });
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))); return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join(''); }
  const sanchiNames = new Set(SANCHI.han.map((h) => h.n));
  HAN.features.forEach((f) => {
    let hsh = 0; for (const ch of f.properties.h) hsh = (hsh * 31 + ch.charCodeAt(0)) % 997;
    const j = (hsh % 9 - 4) / 4 * 0.14;
    f.properties.color = ['bakufu', 'hatamoto', 'sankyo', 'other'].includes(f.properties.c) ? CATEGORY_COLOR[f.properties.c] : shade(CATEGORY_COLOR[f.properties.c], j);
    if (BOSHIN_REDS.has(f.properties.h)) f.properties.boshinColor = BOSHIN_RED;
    else if (BOSHIN_AIZU.has(f.properties.h)) f.properties.boshinColor = BOSHIN_GREEN;
    else if (BOSHIN_ALLIANCE.has(f.properties.h)) f.properties.boshinColor = BOSHIN_LIGHT_GREEN;
    else f.properties.boshinColor = BOSHIN_PINK;
    f.properties.hakodateColor = HAKODATE_EZO_HAN.has(f.properties.h) ? HAKODATE_EZO : HAKODATE_MEIJI;
    if (!(f.properties.n in hanColorByName)) hanColorByName[f.properties.n] = { boshin: f.properties.boshinColor, hakodate: f.properties.hakodateColor };
    // 府藩県三治制: この区域が1869年以降のどの藩にあたるか(藩領)、府・県が管轄した地域(府県領)か
    const { n: pn, h: ph } = f.properties, d = sanchiNames.has(pn) ? pn : sanchiNames.has(ph) ? ph : SANCHI.poly[ph] || 'ken';
    f.properties.k = d === 'ken' ? 'ken' : 'han'; f.properties.dn = d === 'ken' ? '' : d;
    f.properties.sanchiColor = d === 'ken' ? KEN_COLOR : SANCHI_PALETTE[(SANCHI.colors[d] || 0) % SANCHI_PALETTE.length];
    f.properties.sanchiTypeColor = d === 'ken' ? KEN_COLOR : f.properties.color;
  });
  map.addSource('han', { type: 'geojson', data: HAN });
  map.addLayer({ id: 'han-fill', type: 'fill', source: 'han', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.8 } }, 'kuni-line');
  map.addLayer({ id: 'han-line', type: 'line', source: 'han', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2b2620', 'line-width': 0.45, 'line-opacity': 0.28 } }, 'kuni-line');
  const prefColor = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h},42%,72%)`; };
  PREF.features.forEach((f) => (f.properties.color = prefColor(f.properties.name)));
  map.addSource('pref1876', { type: 'geojson', data: PREF });
  map.addLayer({ id: 'pref1876-fill', type: 'fill', source: 'pref1876', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 } });
  map.addLayer({ id: 'pref1876-line', type: 'line', source: 'pref1876', paint: { 'line-color': '#2d2922', 'line-width': 1.7, 'line-opacity': 0 } });
  // 明治4年12月の3府72県(国・郡を単位に作成。scripts/build_pref1871.py)
  const kenColor = (name) => { let h = 7; for (const ch of name) h = (h * 37 + ch.charCodeAt(0)) % 360; return `hsl(${h},46%,70%)`; };
  KEN71.features.forEach((f) => (f.properties.color = f.properties.name === '開拓使' || f.properties.name === '琉球国' ? '#e3dcc6' : kenColor(f.properties.name)));
  map.addSource('pref1871', { type: 'geojson', data: KEN71 });
  map.addLayer({ id: 'pref1871-fill', type: 'fill', source: 'pref1871', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 } });
  map.addLayer({ id: 'pref1871-line', type: 'line', source: 'pref1871', paint: { 'line-color': '#7a1f1f', 'line-width': ['case', ['get', 'fu'], 2.4, 1.5], 'line-opacity': 0 } });
  const mkLabel = (text, lng, lat, store) => { const el = document.createElement('div'); el.className = 'han-pin'; el.innerHTML = `<div class="label">${esc(text)}</div>`; el.style.display = 'none'; store.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)); };
  PREF.features.forEach((f) => mkLabel(f.properties.name, f.properties.lon, f.properties.lat, pref1876LabelMarkers));
  KEN71.features.forEach((f) => mkLabel(f.properties.name, f.properties.lon, f.properties.lat, ken1871LabelMarkers));
  [['開拓使', 141.35, 43.06], ['琉球藩', 127.68, 26.21]].forEach(([n, lng, lat]) => mkLabel(n, lng, lat, special1876LabelMarkers));
  KUNI.features.forEach((f) => { const el = document.createElement('div'); el.className = 'kuni-label'; el.textContent = f.properties.name; kuniLabelMarkers[f.properties.name] = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([f.properties.lon, f.properties.lat]).addTo(map); });
  hanLabelMarkers = [];
  HAN_LABELS.forEach((l) => {
    const el = document.createElement('div'); el.className = 'han-pin';
    el.innerHTML = `<div class="dot" style="background:${CATEGORY_COLOR[l.c]}"></div><div class="label">${esc(l.n)}</div>`;
    const minZ = l.v >= 500 ? 5.0 : l.v >= 250 ? 6.0 : l.v >= 120 ? 6.8 : l.v >= 60 ? 7.6 : 8.4;
    hanLabelMarkers.push({ m: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([l.x, l.y]).addTo(map), minZ, n: l.n, n0: l.n, ox: l.x, oy: l.y, lab: el.querySelector('.label'), c: l.c, dot: el.querySelector('.dot') });
  });
  const refresh = () => { const z = map.getZoom(); Object.values(kuniLabelMarkers).forEach((m) => { m.getElement().style.opacity = z >= 5.8 ? '1' : '0'; m.getElement().style.display = hideHanLabels ? 'none' : ''; }); hanLabelMarkers.forEach((o) => { o.m.getElement().style.display = !hideHanLabels && !o.gone && z >= o.minZ ? '' : 'none'; }); };
  map.on('zoom', refresh); refresh();
  createSanchiMarkers(SANCHI); bindAreaClick();
}

boot();
