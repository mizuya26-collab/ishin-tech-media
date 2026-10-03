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

// ---------- 状態と共通の関数 ----------
const PIL = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
const EVT = [...PIL.events.items].sort((a, b) => a.y - b.y);
const state = { year: 1853, mode: 0, sel: null, full: false };
const DEFAULT_VIEW = { center: [136.0, 36.5], zoom: 5.5 };
const NOTE_ALL = '左のタブを押すとその年の出来事、中心人物、代表的事例を一覧表示します。';
const TAB_SUB = { people: 'その年に生きていた志士を表示します。', orgs: 'その年に存在した藩や隊を表示します。', places: 'その年に関係する場所や道を表示します。', tour: 'その年の出来事ゆかりの史跡を表示します。' };
const hasPos = (it) => typeof it.lat === 'number' && typeof it.lon === 'number';

let map = null, ready = false, lastCam = '';
const pins = []; // { pid, idx, it, marker, el }
const personMarkers = {}; // key -> { marker, active }
let kuniLabelMarkers = {}, hanLabelMarkers = [], pref1876LabelMarkers = [], special1876LabelMarkers = [];
let finalPrefMode = false;
const hanColorByName = {};

function currentEvents(y) { let m = null; EVT.forEach((e) => { if (e.y <= y) m = e.y; }); return m === null ? [] : EVT.filter((e) => e.y === m); }
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
function regionFor(y) { return y === 1868 ? 'boshin' : y === 1869 ? 'hakodate' : y >= 1876 ? 'final' : 'han'; }
const detailUrl = (pid, it) => `${BASE}/${pid}/${it.slug}/`;
const listUrl = (pid) => `${BASE}/${pid}/`;

// ---------- 地図の領域の見せ方(藩領 / 戊辰戦争 / 函館戦争 / 1876年府県) ----------
function setFinalPrefectureMode(isFinal) {
  finalPrefMode = isFinal;
  if (!map || !map.getLayer('pref1876-fill')) return;
  const oldOpacity = isFinal ? 0 : 0.55, oldLineOpacity = isFinal ? 0 : 0.95, hanOpacity = isFinal ? 0 : 0.8, hanLineOpacity = isFinal ? 0 : 0.4, prefOpacity = isFinal ? 0.62 : 0, prefLineOpacity = isFinal ? 0.95 : 0;
  map.setPaintProperty('kuni-fill', 'fill-opacity', oldOpacity); map.setPaintProperty('kuni-line', 'line-opacity', oldLineOpacity);
  map.setPaintProperty('han-fill', 'fill-opacity', hanOpacity); map.setPaintProperty('han-line', 'line-opacity', hanLineOpacity);
  map.setPaintProperty('pref1876-fill', 'fill-opacity', prefOpacity); map.setPaintProperty('pref1876-line', 'line-opacity', prefLineOpacity);
  Object.values(kuniLabelMarkers).forEach((m) => (m.getElement().style.display = isFinal ? 'none' : ''));
  hanLabelMarkers.forEach((o) => (o.m.getElement().style.display = isFinal ? 'none' : map.getZoom() >= o.minZ ? '' : 'none'));
  pref1876LabelMarkers.forEach((m) => (m.getElement().style.display = isFinal ? '' : 'none'));
  special1876LabelMarkers.forEach((m) => (m.getElement().style.display = isFinal ? '' : 'none'));
  const stance = document.querySelector('.stance-legend'); if (stance) stance.style.display = isFinal ? 'none' : '';
}
const NOTE_HAN = '藩領は幕末期近世村領域データセットの村点(領分)から作成した概略です。藩名はズームすると順に表示されます。北海道・沖縄はデータがありません。';
function setRegionMode(kind, y) {
  if (!map || !map.getLayer('han-fill')) return;
  const isBoshin = kind === 'boshin', isHakodate = kind === 'hakodate', isFinal = kind === 'final';
  setFinalPrefectureMode(isFinal);
  map.setPaintProperty('han-fill', 'fill-color', isBoshin ? ['get', 'boshinColor'] : isHakodate ? ['get', 'hakodateColor'] : ['get', 'color']);
  map.setPaintProperty('kuni-fill', 'fill-color', isHakodate ? ['get', 'hakodateColor'] : NEUTRAL_FILL);
  if (!isFinal) map.setPaintProperty('kuni-fill', 'fill-opacity', isHakodate ? 0.72 : 0.55);
  hanLabelMarkers.forEach((o) => { if (!o.dot) return; const hc = hanColorByName[o.n]; o.dot.style.background = isBoshin && hc ? hc.boshin : isHakodate && hc ? hc.hakodate : CATEGORY_COLOR[o.c]; });
  const hl = document.querySelector('.hakodate-legend'); if (hl) hl.style.display = isHakodate ? 'flex' : 'none';
  const bl = document.querySelector('.boshin-legend'); if (bl) bl.style.display = isBoshin ? 'flex' : 'none';
  const note = document.querySelector('.han-note');
  if (note) note.textContent = isFinal ? '1876年8月21日の第二次府県統合後。旧国名・幕末の藩領表示はこの年では非表示。北海道は開拓使、沖縄は琉球藩。'
    : isHakodate ? '青は榎本軍が奉行を置いて実効支配した道南(箱館・松前・江差など、旧渡島国)、薄緑は蝦夷地全域(道央・道北・道東・千島)への名目上の領有宣言、赤は明治政府側です。北海道は藩領データがないため旧国境で表示しています。樺太は地図データがありません。'
    : (y >= 1871 ? '1871年の廃藩置県の後も、この地図は幕末期の藩領を表示しています。' : '') + NOTE_HAN;
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
  const y = state.year, pid = MODES[state.mode], cur = currentEvents(y), vis = new Set();
  if (pid === 'events') evView(y).list.forEach((e) => vis.add(e.slug));
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
function select(pid, idx) { state.full = false; state.sel = { pid, idx }; if (pid === 'events' && PIL.events.items[idx].y !== state.year) state.year = PIL.events.items[idx].y; syncSlider(); applyAll(); }
function renderPanel() {
  const y = state.year, pid = MODES[state.mode], P = PIL[pid];
  let h = '', target = null;
  if (state.sel) {
    const sp = PIL[state.sel.pid], it = sp.items[state.sel.idx];
    const pm = it.key && personMarkers[it.key] && personMarkers[it.key].active ? personMarkers[it.key].marker.getLngLat() : null;
    const pt = pm ? [pm.lng, pm.lat] : hasPos(it) ? [it.lon, it.lat] : null;
    if (pt) target = { points: [pt], zoom: 8 };
    const tl = it.key && SHISHI_TIMELINE[it.key] ? '<ol class="tl" style="margin-top:12px">' + SHISHI_TIMELINE[it.key].timeline.map((t) => `<li class="past"><span class="ty">${t.year}年</span><span style="padding:6px 8px">${esc(t.event)}</span></li>`).join('') + '</ol>' : '';
    h = `<button class="back" type="button" id="back">‹ 一覧にもどる</button><span class="kind" style="background:${sp.c}">${sp.t}</span><h3 style="margin-top:8px">${esc(it.n)}</h3><p class="sub">${esc(it.sub.split('|').join(' / '))}</p><p>[概要は記事ページに掲載します]</p>${tl}<a class="read" href="${detailUrl(sp.id, it)}">記事を読む</a><div style="margin-top:14px"><a class="more" href="${listUrl(sp.id)}">${sp.t}の一覧へ</a></div>`;
  } else if (pid === 'events') {
    const V = evView(y), inYear = V.list.filter((e) => e.y === y), focus = inYear.length ? inYear : V.list;
    if (focus.length) target = { points: focus.map((e) => { const p = pins.find((q) => q.it === e); return p ? [p.lon, p.lat] : [e.lon, e.lat]; }), zoom: focus.length > 1 ? 7.2 : 7.6 };
    h = `<h3>${V.s}年～${V.e}年の出来事</h3><p class="sub">${V.fb ? 'この期間に登録された事件はありません。前後の出来事を表示しています。' : '地図にも、この3年間の事件を表示しています。'}押すとその年へ移ります。</p><ol class="tl">`;
    let last = null;
    V.list.forEach((e) => { const st = e.y === y ? 'now' : e.y < y ? 'past' : 'future'; h += `<li class="${st}">${e.y !== last ? `<span class="ty">${e.y}年</span>` : '<span class="ty"></span>'}<button type="button" data-pid="events" data-i="${P.items.indexOf(e)}"><b>${esc(e.n)}</b>${st === 'now' ? '<span class="nowchip">いま</span>' : ''}</button></li>`; last = e.y; });
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
  camera(target);
  $('fit').style.display = target && !state.full ? '' : 'none';
  const now = $('pbody').querySelector('.tl .now'); if (now && !state.sel) { try { $('panel').scrollTop = Math.max(0, now.offsetTop - 90); } catch (e) { /* 何もしない */ } }
}

// ---------- 画面全体の更新 ----------
function syncSlider() { $('range').value = state.year; }
function applyAll() {
  const y = state.year, pid = MODES[state.mode], cur = currentEvents(y);
  $('tlYear').textContent = y + '年';
  $('tlWareki').textContent = WAREKI[y] || '';
  $('tlEv').textContent = cur.map((e) => e.n).join('・');
  document.querySelectorAll('.mk').forEach((m) => m.classList.toggle('on', +m.dataset.y === y));
  const tn = $('tabnote'); if (tn) tn.textContent = NOTE_ALL;
  if (ready) { setRegionMode(regionFor(y), y); updatePins(); }
  renderPanel();
}
function buildUI() {
  $('tabs').innerHTML = MODES.map((pid, k) => `<button type="button" class="seg" style="--c:${PIL[pid].c}" data-m="${k}" aria-pressed="${k === state.mode}">${PIL[pid].t}</button>`).join('') + '<span class="tabnote" id="tabnote"></span>';
  $('pinLegend').innerHTML = MODES.map((pid) => `<span><i class="dot" style="background:${PIL[pid].c}"></i>${PIL[pid].t}</span>`).join('');
  const ys = {}; EVT.forEach((e) => (ys[e.y] = ys[e.y] || []).push(e.n));
  $('marks').innerHTML = Object.keys(ys).map((y) => `<button type="button" class="mk" data-y="${y}" style="left:calc(11px + (100% - 22px) * ${(y - 1853) / 24})" title="${esc(y + '年: ' + ys[y].join('・'))}" aria-label="${esc(y + '年 ' + ys[y].join('、'))}"></button>`).join('');
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.seg'); if (!b) return; state.mode = +b.dataset.m; state.sel = null; state.full = false; $('tabs').querySelectorAll('.seg').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); applyAll(); });
  $('range').addEventListener('input', (e) => { state.year = +e.target.value; state.sel = null; state.full = false; applyAll(); });
  $('marks').addEventListener('click', (e) => { const b = e.target.closest('.mk'); if (!b) return; state.year = +b.dataset.y; state.sel = null; state.full = false; syncSlider(); applyAll(); });
  $('fit').addEventListener('click', () => { state.sel = null; state.full = true; applyAll(); });
  $('pbody').addEventListener('click', (e) => {
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
  const data = Promise.all(['kuni', 'han', 'han-labels', 'pref1876'].map((n) => fetch(`${BASE}/data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
  try {
    const [, [KUNI, HAN, HAN_LABELS, PREF]] = await Promise.all([loaded, data]);
    addLayers(KUNI, HAN, HAN_LABELS, PREF);
    createPins();
    ready = true; $('loading').remove();
    applyAll();
  } catch (err) { console.error(err); $('loading').textContent = '地図データの読み込みに失敗しました。ページを再読み込みしてください。'; }
}
function addLayers(KUNI, HAN, HAN_LABELS, PREF) {
  KUNI.features.forEach((f) => { f.properties.hakodateColor = HAKODATE_EZO_KUNI.has(f.properties.name) ? HAKODATE_EZO : HAKODATE_NOMINAL_KUNI.has(f.properties.name) ? HAKODATE_NOMINAL : HAKODATE_MEIJI; });
  map.addSource('kuni', { type: 'geojson', data: KUNI });
  map.addLayer({ id: 'kuni-fill', type: 'fill', source: 'kuni', paint: { 'fill-color': NEUTRAL_FILL, 'fill-opacity': 0.55 } });
  map.addLayer({ id: 'kuni-line', type: 'line', source: 'kuni', paint: { 'line-color': '#3a3222', 'line-width': 1.8, 'line-opacity': 0.95 } });
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))); return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join(''); }
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
  });
  map.addSource('han', { type: 'geojson', data: HAN });
  map.addLayer({ id: 'han-fill', type: 'fill', source: 'han', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.8 } }, 'kuni-line');
  map.addLayer({ id: 'han-line', type: 'line', source: 'han', paint: { 'line-color': '#2b2620', 'line-width': 0.45, 'line-opacity': 0.28, 'line-join': 'round', 'line-cap': 'round' } }, 'kuni-line');
  const prefColor = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h},42%,72%)`; };
  PREF.features.forEach((f) => (f.properties.color = prefColor(f.properties.name)));
  map.addSource('pref1876', { type: 'geojson', data: PREF });
  map.addLayer({ id: 'pref1876-fill', type: 'fill', source: 'pref1876', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 } });
  map.addLayer({ id: 'pref1876-line', type: 'line', source: 'pref1876', paint: { 'line-color': '#2d2922', 'line-width': 1.7, 'line-opacity': 0 } });
  const mkLabel = (text, lng, lat, store) => { const el = document.createElement('div'); el.className = 'han-pin'; el.innerHTML = `<div class="label">${esc(text)}</div>`; el.style.display = 'none'; store.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)); };
  PREF.features.forEach((f) => mkLabel(f.properties.name, f.properties.lon, f.properties.lat, pref1876LabelMarkers));
  [['開拓使', 141.35, 43.06], ['琉球藩', 127.68, 26.21]].forEach(([n, lng, lat]) => mkLabel(n, lng, lat, special1876LabelMarkers));
  KUNI.features.forEach((f) => { const el = document.createElement('div'); el.className = 'kuni-label'; el.textContent = f.properties.name; kuniLabelMarkers[f.properties.name] = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([f.properties.lon, f.properties.lat]).addTo(map); });
  hanLabelMarkers = [];
  HAN_LABELS.forEach((l) => {
    const el = document.createElement('div'); el.className = 'han-pin';
    el.innerHTML = `<div class="dot" style="background:${CATEGORY_COLOR[l.c]}"></div><div class="label">${esc(l.n)}</div>`;
    const minZ = l.v >= 500 ? 5.0 : l.v >= 250 ? 6.0 : l.v >= 120 ? 6.8 : l.v >= 60 ? 7.6 : 8.4;
    hanLabelMarkers.push({ m: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([l.x, l.y]).addTo(map), minZ, n: l.n, c: l.c, dot: el.querySelector('.dot') });
  });
  const refresh = () => { const z = map.getZoom(); Object.values(kuniLabelMarkers).forEach((m) => { m.getElement().style.opacity = z >= 5.8 ? '1' : '0'; m.getElement().style.display = finalPrefMode ? 'none' : ''; }); hanLabelMarkers.forEach((o) => { o.m.getElement().style.display = !finalPrefMode && z >= o.minZ ? '' : 'none'; }); };
  map.on('zoom', refresh); refresh();
}

boot();
