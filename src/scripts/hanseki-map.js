// 版籍奉還・府藩県三治制の地図(MapLibre)。年表の地図(home-map.js)とは別の地図です。
// データ: public/data/sanchi.json(藩・知藩事・府県)、han.json / kuni.json(藩領・旧国の概略)
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MEIJI = '#e9968c'; // 函館戦争の地図で使う「明治政府」の色。藩領も旧国もこの色で統一する
const DEFAULT_VIEW = { center: [136.0, 36.5], zoom: 5.5 };
const KIND = { han: { t: '藩', c: '#b8860b' }, fu: { t: '府', c: '#c0392b' }, ken: { t: '県', c: '#2d5fa3' } };
const FILTERS = [['all', 'すべて'], ['han', '藩'], ['fuken', '府・県']];
const state = { f: 'all', q: '', sel: null };
let map = null, items = [], nopos = [];

function fmtDate(w, d) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d); if (!m) return w;
  const s = m[1] + '年' + (m[2] ? +m[2] + '月' : '') + (m[3] ? +m[3] + '日' : '');
  return `${w}(${s})`;
}
const inFilter = (it) => state.f === 'all' || (state.f === 'han' ? it.kind === 'han' : it.kind !== 'han');
const searchText = (it) => [it.n, it.place, it.note, it.kind === 'han' ? it.chiji.map((c) => c.name).join(' ') : ''].join(' ');

function buildTabs() {
  $('tabs').innerHTML = FILTERS.map(([v, t]) => `<button type="button" class="seg" style="--c:#b8860b" data-f="${v}" aria-pressed="${state.f === v}">${t}</button>`).join('');
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.seg'); if (!b) return;
    state.f = b.dataset.f; state.sel = null;
    $('tabs').querySelectorAll('.seg').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
}

function createMarkers(data) {
  const all = [...data.han.map((h) => ({ ...h, kind: 'han' })), ...data.fuken];
  all.forEach((it, i) => {
    const el = document.createElement('button'); el.type = 'button';
    el.className = 'sx-pin sx-' + it.kind; el.title = it.n; el.setAttribute('aria-label', `${KIND[it.kind].t} ${it.n}`);
    const lab = document.createElement('span'); lab.className = 'sx-lab'; lab.textContent = it.n; el.appendChild(lab);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([it.lon, it.lat]).addTo(map);
    el.addEventListener('click', (e) => { e.stopPropagation(); select(i); });
    items.push({ ...it, el, lab, marker, minZ: it.kind === 'han' ? it.z : it.kind === 'fu' ? 0 : 6.3 });
  });
  nopos = data.nopos;
  map.on('zoom', refreshLabels);
}
function refreshLabels() { if (!map) return; const z = map.getZoom(); items.forEach((it) => { it.lab.style.display = z >= it.minZ ? '' : 'none'; }); }
function updateMarkers() {
  items.forEach((it, i) => { it.el.style.display = inFilter(it) ? '' : 'none'; it.el.classList.toggle('sel', state.sel === i); });
  refreshLabels();
}

function select(i) { state.sel = i; render(); }
function listRow(i) {
  const it = items[i];
  const sub = it.kind === 'han' ? `知藩事 ${it.chiji[0].name} / ${it.place}` : `${KIND[it.kind].t} / ${it.place}${it.approx ? '(位置は目安)' : ''}`;
  return `<li><button type="button" data-i="${i}"><span class="dot" style="background:${KIND[it.kind].c}${it.kind === 'han' ? '' : ';border-radius:3px'}"></span><span><b>${esc(it.n)}</b><small>${esc(sub)}</small></span></button></li>`;
}
function renderList() {
  const k = state.q.trim(), hit = [];
  items.forEach((it, i) => { if (inFilter(it) && (!k || searchText(it).includes(k))) hit.push(i); });
  const nh = items.filter((x) => x.kind === 'han').length, nf = items.filter((x) => x.kind === 'fu').length, nk = items.filter((x) => x.kind === 'ken').length;
  $('hslist').innerHTML = hit.slice(0, 50).map(listRow).join('') + (hit.length > 50 ? `<li class="sub" style="padding:8px 4px">ほか${hit.length - 50}件。絞り込んでください。</li>` : '') + (!hit.length ? '<li class="sub" style="padding:8px 4px">見つかりませんでした。</li>' : '');
  $('hscount').textContent = `藩${nh}・府${nf}・県${nk}(うち${hit.length}件を表示)`;
}
function render() {
  updateMarkers();
  const i = state.sel;
  let h;
  if (i !== null) {
    const it = items[i], K = KIND[it.kind];
    h = `<button class="back" type="button" id="back" style="display:block">‹ 一覧にもどる</button><span class="kind" style="background:${K.c}">${K.t}</span><h3 style="margin-top:8px">${esc(it.n)}</h3>`;
    if (it.kind === 'han') {
      h += `<p class="sub">所在地: ${esc(it.place)}${it.approx ? '(位置は目安です)' : ''}</p><div class="grp" style="font-weight:700;margin:10px 0 4px">知藩事</div><ul style="list-style:none;padding:0;margin:0">` +
        it.chiji.map((c) => `<li style="padding:6px 0;border-bottom:1px solid #e3d9c2"><b>${esc(c.name)}</b><br><small>${esc(fmtDate(c.w, c.d))}${c.why ? ' / ' + esc(c.why) : ''}</small></li>`).join('') + '</ul>';
      if (it.note) h += `<p style="margin-top:12px">${esc(it.note)}</p>`;
    } else {
      h += `<p class="sub">庁の所在地: ${esc(it.place)}${it.approx ? '(位置は目安です)' : ''}</p><p><b>設置</b> ${esc(it.set || '(資料に日付なし)')}<br><b>廃止・その後</b> ${esc(it.end)}</p>${it.note ? `<p>${esc(it.note)}</p>` : ''}`;
    }
  } else {
    h = `<h3>府藩県三治制(明治2〜4年)</h3><p class="sub">1868年6月11日(慶応4年閏4月21日)の政体書で、旧幕府領などに府・県が置かれ、藩は従来どおり大名が治める「府藩県三治制」になりました。1869年7月25日の版籍奉還で藩も国の行政区画となり、大名は知藩事に任命されました。</p>
      <p class="sub" id="hscount"></p><div class="hsearch"><input id="hsq" type="search" placeholder="藩名・府県名・知藩事の名前で探す" value="${esc(state.q)}" aria-label="藩名・府県名・知藩事の名前で探す"></div><ul class="plist" id="hslist"></ul>
      <div class="grp" style="font-weight:700;margin:16px 0 4px">庁の位置を確認できていない府県(地図に点はありません)</div><ul style="list-style:none;padding:0;margin:0">${nopos.map((x) => `<li style="padding:5px 0;border-bottom:1px solid #e3d9c2"><b>${esc(x.n)}</b><br><small>${esc(x.set)} / ${esc(x.note)}</small></li>`).join('')}</ul>
      <p class="sub" style="margin-top:8px">東北民政取締諸藩の県(花巻県など)は、正式な県と認めない資料が多いため含めていません。</p>
      <p style="margin-top:12px"><a class="more" href="${BASE}/events/hanseki-hokan/">版籍奉還の記事ページへ</a></p>`;
  }
  $('pbody').innerHTML = h;
  if (i === null) renderList();
  $('fit').style.display = i !== null ? '' : 'none';
  if (map) {
    if (i !== null) map.flyTo({ center: [items[i].lon, items[i].lat], zoom: Math.max(map.getZoom(), 8), duration: 700 });
    else if (!render.first) map.easeTo({ center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom, duration: 700 });
  }
  render.first = false;
}
render.first = true;

function addLayers(KUNI, HAN) {
  map.addSource('kuni', { type: 'geojson', data: KUNI });
  map.addLayer({ id: 'kuni-fill', type: 'fill', source: 'kuni', paint: { 'fill-color': MEIJI, 'fill-opacity': 0.72 } });
  map.addLayer({ id: 'kuni-line', type: 'line', source: 'kuni', paint: { 'line-color': '#3a3222', 'line-width': 1.8, 'line-opacity': 0.95 } });
  map.addSource('han', { type: 'geojson', data: HAN });
  map.addLayer({ id: 'han-fill', type: 'fill', source: 'han', paint: { 'fill-color': MEIJI, 'fill-opacity': 0.8 } }, 'kuni-line');
  map.addLayer({ id: 'han-line', type: 'line', source: 'han', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2b2620', 'line-width': 0.45, 'line-opacity': 0.4 } }, 'kuni-line');
}

async function boot() {
  buildTabs(); render();
  $('pbody').addEventListener('click', (e) => {
    if (e.target.closest('#back')) { state.sel = null; return render(); }
    const b = e.target.closest('button[data-i]'); if (b) select(+b.dataset.i);
  });
  $('pbody').addEventListener('input', (e) => { if (e.target.id === 'hsq') { state.q = e.target.value; renderList(); } });
  $('fit').addEventListener('click', () => { state.sel = null; render(); });
  if (typeof maplibregl === 'undefined') { $('loading').textContent = '地図ライブラリを読み込めませんでした。通信状況を確認して再読み込みしてください。'; return; }
  map = new maplibregl.Map({
    container: 'japanMap',
    style: { version: 8, sources: { 'gsi-photo-tiles': { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院(写真)</a>' } }, layers: [{ id: 'gsi-photo-layer', type: 'raster', source: 'gsi-photo-tiles' }] },
    center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom,
  });
  window.__hsMap = map;
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  const loaded = new Promise((res) => map.on('load', res));
  const data = Promise.all(['kuni', 'han', 'sanchi'].map((n) => fetch(`${BASE}/data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
  try {
    const [, [KUNI, HAN, SANCHI]] = await Promise.all([loaded, data]);
    addLayers(KUNI, HAN); createMarkers(SANCHI);
    $('loading').remove(); render();
  } catch (err) { console.error(err); $('loading').textContent = '地図データの読み込みに失敗しました。ページを再読み込みしてください。'; }
}
boot();
