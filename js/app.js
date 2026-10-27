// AI Coffee Web Beta 1.8.1 — 화면·상태. Android Beta 1.8 ui/screens/*.kt, AppViewModel.kt, MainActivity.kt를 옮김.
// 위치 좌표는 S.loc(메모리)에만 두고 저장·전송·console 출력하지 않음.
import { buildEngine, Brands, MenuTable, EXAMPLE, GP_SOURCE, GP_DATE, Geo, Radius, F, LBL, Reasons, Presets, PRESET_ORDER, Engine, SubmitRules, MapLinks, MapSearch, defaultFilter, defaultInc, parseIdMap, migrateIds, migrateIdsAll, ID_VER } from './core.js';
import { I } from './icons.js';
import { ID_MAP_R2_R3, ID_MAP_R3_R4 } from './idmap.js';
import { MenuLinks, Seasonal, TasteTags, MyMenu, TastePrefs, Data182 } from './beta182.js';
import { Promotions, PromoData, Promo185, recurLabel, PromoNotice, PROMO_HIDE_KEY } from './promotions.js';
import { BrandLinks, LinkData, P9 } from './brandlinks.js';
import { PhotoLinks, IndPriceTable, indLabel, indSourceLine } from './beta183.js';

export const VERSION = '1.8.7';
const DB_URL = 'data/aicoffee-db-r4.txt.gz', DB_CACHE = 'aic-db-2026-10-14-r4', LS = 'aic.state', LS_A2HS = 'aic.a2hsShown';

// ---------- 상태 ----------
const S = { loaded: false, ready: false, dbError: null, consent: {}, loc: null, locStatus: 'idle', locErr: null,
  filter: defaultFilter(), preset: 'BAL', inc: defaultInc(), favs: [], myRatings: {}, outbox: [], mapApp: null,
  area: null, taste: TastePrefs.empty(), homeCat: 'near' }; // area: Beta 1.7 수동 시·구(메모리 전용, persist 안 함)
let EN = null, did = '';
const UI = { route: 'near', sheet: null, toast: null, promoOpen: new Set() };
/** 목록·거리 기준점: GPS가 있으면 GPS, 없으면 고른 시·구 중심점 */
const ref = () => S.loc || (S.area ? { lat: S.area.lat, lng: S.area.lng, acc: null } : null);
const manual = () => !S.loc && !!S.area;
export const MANUAL_AREA_NOTE = '선택한 지역의 중심 기준이라 실제 거리와 다를 수 있어요';
// Beta 1.8 지도 앱 시트 문구(ui-1.8-map-app-sheet.md 그대로)
export const HOURS_ROW = '지도에서 보기 ›', HOURS_ROW_NOTE = '영업시간·후기·사진', SHEET_TAB_DIR = '길찾기', SHEET_TAB_HOURS = '영업시간·후기·사진'; // Beta 1.8.4: 사진 보기와 합침 // Beta 1.8.1 이름 변경(외부 별점 수집·저장 없음)
export const HOURS_NOTE = '네이버·카카오에서 검색 결과로 열려요. 주소로 매장을 확인해 주세요.', HOURS_SOURCE = '영업시간·별점·후기·사진은 네이버·카카오 기준이에요. 이 앱은 사진을 저장하지 않아요.'; // Beta 1.8.1
// Beta 1.8.3 문구(ui/ui-1.8.3.md, Android Sheet183·Common.kt와 같음). 사진 라벨은 ui-1.8.3.md(c3102b69) 확정 '사진 보기 ›' — PHOTO_LABEL 하나만 바꾸면 됨
export const PHOTO_LABEL = '사진 보기', PHOTO_ROW = PHOTO_LABEL + ' ›', SHEET_TAB_PHOTO = '사진 보기';
export const PHOTO_NOTE = '네이버·카카오의 매장 검색 화면으로 열려요. 매장을 눌러 사진을 확인해 주세요.', PHOTO_SOURCE = '사진은 네이버·카카오 기준이에요. 이 앱은 사진을 저장하지 않아요.';
export const LICENSE_FROM = 102921, LICENSE_SOURCE = '행정안전부 휴게음식점 인허가 (data.go.kr 15006730) 기준일 2026-10-14';
export const storeSource = (i, dbDate) => i >= LICENSE_FROM ? LICENSE_SOURCE : `소상공인시장진흥공단 상가(상권)정보 기준일 ${dbDate}`;
export const PRICE_UNCONFIRMED = '가격 미확인', VAL_EXCLUDED = '가격 정보가 없어 가성비 순위에서 빠졌어요.';
export const RATING_BOOST = '별점 반영'; // Beta 1.8.1 가성비 카드 표시(Engine.ratingBoostFlags)
// Beta 1.8.2 문구(ui/ui-1.8.2.md 확정본, Android Sheet182·Home182와 같음)
export const SHEET_TAB_MENU = '메뉴 보기', MENU_ROW = '메뉴 보기 ›', MENU_ROW_NOTE = '매장 검색 화면으로 열려요. 메뉴 탭을 눌러 확인해 주세요.';
export const MENU_NOTE = '네이버·카카오의 매장 검색 화면으로 열려요. 메뉴 탭을 눌러 확인해 주세요.', MENU_SOURCE = '메뉴·가격은 네이버·카카오 기준이에요.';
export const H182 = { CATS: [['near', '주변 카페'], ['fav', '나의 즐겨찾기'], ['mymenu', '나의 메뉴']],
  EMPTY_FAV: '아직 즐겨찾기한 카페가 없어요. 카페 상세에서 ☆를 눌러 추가해 보세요.', EMPTY_NO_TASTE: '원두나 맛 취향을 고르면 맞는 카페를 모아 보여 드려요.',
  EMPTY_NO_MATCH: '고른 취향과 공식 설명이 일치하는 카페가 없어요.', PICK: '취향 고르기', EDIT: '취향 수정', SORT_LABEL: '일치 많은 순', TASTE_NOTE: '취향은 이 휴대폰에만 저장돼요.',
  NO_INFO_NOTE: '브랜드 공식 원두·메뉴 설명이 없어 취향과 맞추지 않았어요.' };
export const HOURS_NOT_INSTALLED = '네이버 지도나 카카오맵이 설치되어 있지 않아요.';
// Beta 1.8.7 지도 검색 시트 문구(ui/screens/1.8.7/map-search-sheet.html 시안 623bc81a, Android Sheet187과 같음)
export const S187 = { QUERY_LABEL: '검색어', LOOK_NOTE: '검색 결과에 매장이 없으면 아래에서 위치로 열어 주세요.', LOOK_HEAD: '위치로 보기', look: id => `${id === 'naver' ? '네이버 지도' : '카카오맵'}에서 위치로 보기`, ADDR_HEAD: '주소', COPY: '주소 복사', COPIED: '주소를 복사했어요' };
const locOK = () => S.consent.age === '14+' && S.consent.loc === 'agree';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function persist() { // 좌표는 저장하지 않음
  const o = { did, consent: S.consent, filter: S.filter, preset: S.preset, mapApp: S.mapApp || '', favs: S.favs, myRatings: S.myRatings, outbox: S.outbox, dbIdVer };
  try { localStorage.setItem(LS, JSON.stringify(o)); } catch { /* 저장 불가(사파리 개인 정보 보호 모드 등) */ }
}
// ---------- Beta 1.8 매장 id 변환(DB r2 → r3): 업데이트 후 한 번만, 완료 표시 dbIdVer=3 저장 ----------
let dbIdVer = 0;
export const ID_MAP_STEPS = [[3, () => parseIdMap(ID_MAP_R2_R3)], ...(ID_MAP_R3_R4 ? [[4, () => parseIdMap(ID_MAP_R3_R4)]] : [])];
function restore() {
  let o = {}; try { o = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { o = {}; }
  if (typeof o !== 'object' || Array.isArray(o)) o = {};
  // Beta 1.8.3: r2→r3 다음 r3→r4. ID_MAP_STEPS에 r3→r4 표(idmap.js ID_MAP_R3_R4)는 DB r4를 넣을 때 함께 추가 — 없으면 r3에서 멈춤
  try { o = migrateIdsAll(o, ID_MAP_STEPS).o; dbIdVer = ID_MAP_STEPS[ID_MAP_STEPS.length - 1][0]; }
  catch { dbIdVer = +o.dbIdVer || 0; /* 변환 실패: 원래 값 유지, 완료 표시 안 함 → 다음 실행에 다시 시도 */ }
  did = o.did || Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  S.consent = o.consent || {};
  const f = o.filter; if (f && typeof f === 'object') S.filter = { ...defaultFilter(), ...f, brands: Array.isArray(f.brands) ? f.brands : [] };
  if (Presets[o.preset]) S.preset = o.preset;
  S.favs = Array.isArray(o.favs) ? o.favs.filter(Number.isInteger) : []; S.myRatings = o.myRatings && typeof o.myRatings === 'object' ? o.myRatings : {}; S.outbox = Array.isArray(o.outbox) ? o.outbox : []; S.mapApp = o.mapApp || null;
  try { S.taste = TastePrefs.load(); } catch { S.taste = TastePrefs.empty(); }
  S.loaded = true; persist();
}
function mut(fn) { fn(); persist(); render(); }

// ---------- DB: 전국 파일 하나(모든 사용자 동일 요청) → Cache Storage ----------
async function loadDb() {
  let res = null;
  if ('caches' in window) {
    try { const c = await caches.open(DB_CACHE); res = await c.match(DB_URL); if (!res) { res = await fetch(DB_URL); if (res.ok) await c.put(DB_URL, res.clone()); } } catch { res = null; }
  }
  if (!res) res = await fetch(DB_URL);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let text;
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    if (!('DecompressionStream' in window)) throw new Error('이 브라우저는 매장 DB 압축 해제를 지원하지 않아요 · iOS 16.4 이상 필요');
    text = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  } else text = new TextDecoder().decode(buf); // 호스트가 Content-Encoding으로 이미 풀어 준 경우
  const en = buildEngine(text); en.ind = IndPriceTable.parse(en.indText); return en;
}

// ---------- 위치(navigator.geolocation만) ----------
// 1.8.7 r4(P12·P14): 위치는 버튼을 눌렀을 때만 확인. 진입점은 requestLocation(trigger) 하나(호출처: 주변 카페 헤더 버튼),
// 위치 API(getCurrentPosition) 호출은 fixGps() 한 곳뿐. 앱 실행·동의 직후·화면 복귀 시 자동 측정 없음.
// 좌표는 S.loc(메모리)에만 두고 저장·전송하지 않음. 디버그 로그는 기기 안 메모리에만(좌표 없음: trigger·시각·결과 상태).
export const LocLog = { max: 50, items: [], add(trigger, state) { const e = { trigger, at: new Date().toISOString(), state }; this.items.push(e); if (this.items.length > this.max) this.items.shift(); try { console.debug('[loc]', trigger, state); } catch { } } };
let locReq = 0, locTrigger = null;
function fixGps(trigger) {
  if (!('geolocation' in navigator)) { S.locStatus = 'fail'; S.locErr = '이 브라우저에서 위치를 쓸 수 없어요'; LocLog.add(trigger, 'failed'); render(); return; }
  const id = ++locReq; S.locStatus = 'measuring'; LocLog.add(trigger, 'checking'); render();
  navigator.geolocation.getCurrentPosition(p => {
    if (id !== locReq) return;
    S.loc = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }; S.locStatus = 'ok'; S.consent.os = null; S.area = null; LocLog.add(trigger, 'ok'); render();
  }, err => {
    if (id !== locReq) return;
    if (err && err.code === 1) { S.consent.os = 'denied'; S.locStatus = 'denied'; S.locErr = '위치 권한이 허용되지 않았어요'; persist(); LocLog.add(trigger, 'denied'); }
    else { S.locStatus = 'fail'; S.locErr = '현재 위치를 받지 못했어요. 기기 위치 서비스가 켜져 있는지 확인해 주세요.'; LocLog.add(trigger, 'failed'); }
    render();
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}
/** 위치 확인 유일한 진입점: 앱 동의(처음 한 번, 만 14세 확인 포함) → OS 권한(브라우저가 필요할 때만 물음) → GPS 1회 */
export function requestLocation(trigger) {
  if (S.consent.age === 'u14') { S.locStatus = 'denied'; LocLog.add(trigger, 'denied'); openSheet({ type: 'region', sido: null }); return; }
  if (!locOK()) { locTrigger = trigger; LocLog.add(trigger, 'consent'); go(S.consent.age == null ? 'c01' : 'c02'); return; }
  fixGps(trigger);
}
/** 같은 탭에서 시작한 동의 흐름이 '동의'로 끝났을 때만 이어서 측정(자동 측정 아님). 거부하면 버림 */
function resumeAfterConsent(agreed) { const t = locTrigger; locTrigger = null; if (agreed && t && locOK()) fixGps(t); }
// 1.8.7 r4(CEO2 10:08): 거부 상태 [위치 권한 허용] → 안내 시트(닫기만). 위치·권한 요청 없음, 설정에서 돌아와도 자동 측정 없음
export const PERM_HELP_BTN = '위치 권한 허용';
export const PERM_HELP_LINES = ['iPhone: 설정 › 개인정보 보호 및 보안 › 위치 서비스 › Safari 웹 사이트를 \'앱을 사용하는 동안\'으로 바꿔 주세요.', 'Safari: 주소창의 aA(또는 페이지 메뉴) › 웹 사이트 설정 › 위치를 \'허용\' 또는 \'묻기\'로 바꿔 주세요.', '다른 브라우저: 주소창 옆 사이트 설정(자물쇠) › 위치 › 허용으로 바꿔 주세요.'];
export const PERM_HELP_NEXT = "권한을 켠 뒤 '내 위치 확인하기'를 눌러 주세요";
/** 헤더 '내 위치 확인하기' 버튼 상태: idle · checking · denied · failed */
const locBtnState = () => S.locStatus === 'measuring' ? 'checking' : S.locStatus === 'denied' ? 'denied' : S.locStatus === 'fail' ? 'failed' : 'idle';
export const LOC_BTN = { idle: '내 위치 확인하기', checking: '확인 중…', denied: '내 위치 확인하기', failed: '다시 확인하기' };
export const LOC_SUB = { idle: '아직 위치를 확인하지 않았어요', checking: '현재 위치 확인 중…', denied: '위치 권한이 꺼져 있어요', failed: '위치를 받지 못했어요' };
export const LOC_NONE = LOC_SUB.idle;
export const NO_LOC_DIST = '위치 확인 전이라 거리를 표시하지 않아요';

// ---------- 계산(캐시) ----------
let nearCache = null;
function nearState() {
  const p = ref(); if (!EN || !p) return null;
  const key = JSON.stringify([p.lat, p.lng, S.filter, S.preset, S.inc]);
  if (nearCache && nearCache.key === key) return nearCache;
  const f = S.filter, inc = S.inc;
  const r = EN.computeNear(p, f, S.preset, inc);
  const relax = (r.baseCount === 0 && !r.fallback.length && F.active(f)) ? EN.relaxOptions(p, f, inc, true)
    : (r.baseCount > 0 && !r.main.length && !r.extra.length && !r.noPriceList.length) ? EN.relaxOptions(p, f, inc, false) : [];
  const [cmpList, cmpNoPriceInd] = EN.compareStores(p, f, inc);
  nearCache = { key, r, relax, cmpList, cmpNoPriceInd, brandNear: EN.brandNearest(p), filter: f, preset: S.preset, inc };
  return nearCache;
}

// ---------- 동작 ----------
const A = {
  setAge(a) { mut(() => { S.consent = { ...S.consent, age: a, date: today(), loc: a === 'u14' ? 'deny' : S.consent.loc }; if (a === 'u14') { S.loc = null; S.area = null; } }); },
  /** 시·구 직접 선택(메모리 전용 — 저장·전송 안 함) */
  setArea(r) { S.area = r; UI.sheet = null; render(); },
  setLocConsent(a) { mut(() => { S.consent = { ...S.consent, loc: a, date: today(), os: null }; S.loc = null; S.locStatus = 'idle'; }); },
  withdraw() { mut(() => { S.consent = { ...S.consent, loc: 'withdrawn', date: today() }; S.loc = null; S.locStatus = 'idle'; }); },
  ageReset() { mut(() => { S.consent = { ...S.consent, age: null, loc: 'deny' }; }); },
  setPreset(p) { mut(() => { S.preset = p; UI.anim = true; }); },
  setFilter(f) { mut(() => { S.filter = f; }); },
  resetFilter() { mut(() => { S.filter = defaultFilter(); S.inc = defaultInc(); }); },
  toggleInc(r) { S.inc = { ...S.inc, [r]: !S.inc[r] }; render(); },
  setTaste(tags) { S.taste = TastePrefs.clean({ tags, updated: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) }); try { TastePrefs.save(S.taste); } catch { } render(); },
  setHomeCat(c) { S.homeCat = c; UI.scrollReset = true; render(); },
  setMapApp(id) { S.mapApp = id; persist(); },
  relax(arg) {
    const f = S.filter;
    if (arg === 'incVol') { S.inc = { ...S.inc, NO_VOL: true }; render(); return; }
    if (arg === 'incTaste') { S.inc = { ...S.inc, NO_TASTE: true }; render(); return; }
    A.setFilter(arg === 'price' ? { ...f, pmax: null } : arg === 'vol' ? { ...f, vmin: null, vmax: null } : arg === 'rating' ? { ...f, rmin: null }
      : arg === 'brand' ? { ...f, brands: [] } : arg === 'type' ? { ...f, type: 'ALL', brands: [] } : { ...f, menu: 'am_h' });
  },
  toggleFav(i) { mut(() => { S.favs = S.favs.includes(i) ? S.favs.filter(x => x !== i) : [...S.favs, i]; }); },
  canSubmit(i) {
    if (!EN) return { ok: false, code: '', msg: '불러오는 중' };
    const d = S.loc ? Geo.dist(EN.db, i, S.loc) : null; const t = S.outbox.filter(o => o.date === today());
    return SubmitRules.canSubmit(S.loc != null, d, t.filter(o => o.kind === 'rating').length, t.filter(o => o.kind === 'price').length);
  },
  submitRating(i, v) { if (!A.canSubmit(i).ok) return false; mut(() => { S.outbox = [...S.outbox, { kind: 'rating', store: i, date: today(), v, did }]; S.myRatings = { ...S.myRatings, [i]: { v, date: today() } }; }); return true; },
  submitPrice(i, menu, size, price) { if (!A.canSubmit(i).ok) return null; const review = SubmitRules.needsReview(price);
    mut(() => { S.outbox = [...S.outbox, { kind: 'price', store: i, date: today(), menu, size, price, review, did }]; }); return review ? 'review' : 'price'; },
  submitReport(i, type, reason, text) { mut(() => { S.outbox = [...S.outbox, { kind: 'report', store: i, date: today(), type, reason, text: text.slice(0, 500), did }]; }); },
};

// ---------- 라우팅 ----------
const TOP = new Set(['near', 'compare', 'fav', 'info', 'p02a', 'c02b']);
const TABS = [['near', I.placeOn, I.placeOff, '주변'], ['compare', I.listOn, I.listOff, '메뉴 비교'], ['fav', I.star, I.starLine, '즐겨찾기'], ['info', I.infoOn, I.info, '정보']];
function go(r) {
  UI.sheet = null; const top = TOP.has(r.split('/')[0]); const depth = (history.state && history.state.depth) || 0;
  if (top) history.replaceState({ depth: 0 }, '', '#/' + r); else history.pushState({ depth: depth + 1 }, '', '#/' + r);
  UI.route = r; UI.scrollReset = true; render();
}
function back() { if (history.state && history.state.depth > 0) history.back(); else go('near'); }
function backTwice() { const d = (history.state && history.state.depth) || 0; if (d >= 2) history.go(-2); else go('near'); }
window.addEventListener('popstate', () => { UI.route = (location.hash.replace(/^#\//, '') || 'near'); UI.sheet = null; UI.scrollReset = true; render(); });

// ---------- 렌더 도우미 ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let ACT = new Map(), actN = 0;
const act = fn => { const id = 'a' + (actN++); ACT.set(id, fn); return id; };
const won = n => n.toLocaleString('ko-KR') + '원';
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);
const btn = (t, fn, cls = 'sec', dis = false, extra = '') => `<button class="btn ${cls}" data-a="${act(fn)}" ${dis ? 'disabled' : ''} ${extra}>${esc(t)}</button>`;
const sub = (t, st = '') => `<p class="sub" ${st ? `style="${st}"` : ''}>${esc(t)}</p>`;
const h2 = t => `<h2 class="h2">${esc(t)}</h2>`, h3 = t => `<h3 class="h3">${esc(t)}</h3>`;
const box = (inner, kind = '', st = '') => `<div class="box ${kind}" ${st ? `style="${st}"` : ''}>${inner}</div>`;
const chip = (label, on, fn, o = {}) => `<button class="chip ${on ? 'on' : ''} ${o.lead ? 'lead' : ''} ${o.trail ? 'trail' : ''}" aria-pressed="${on}" ${o.disabled ? 'disabled' : ''} data-a="${act(fn)}">${o.lead || ''}<span>${esc(label)}</span>${o.trail || ''}</button>`;
const listRow = (t, fn) => `<button class="listrow" data-a="${act(fn)}"><span>${esc(t)}</span>${I.right}</button>`;
const badge = (t, k = '') => `<span class="badge ${k}">${esc(t)}</span>`;
const typeBadge = i => EN.db.isFr(i) ? badge('프랜차이즈') : badge('개인 카페(추정)', 'ind');
const emptyCup = () => `<div class="cup" aria-hidden="true">${I.cup}</div>`;
function topBar(title, { sub: sb, onBack, right, extra, subWarn } = {}) {
  return `<header class="topbar ${onBack ? 'back' : ''}"><div class="row">${onBack ? `<button class="iconbtn" aria-label="뒤로" data-a="${act(onBack)}">${I.back}</button>` : ''}
    <div class="ttl" role="heading" aria-level="1"><h1 class="title">${esc(title)}</h1>${sb ? `<p class="sub${subWarn ? ' locwarn' : ''}">${esc(sb)}</p>` : ''}</div>${right || ''}</div>
    ${extra ? `<div class="extra">${extra}</div>` : ''}</header>`;
}
const EX_NOTICE = '브랜드 가격·별점: 예시 데이터 · 착한가격업소: 공공데이터';
const DATA_NOTICE = [EX_NOTICE, '가격: 메뉴판 가격 그대로 · 매장에 따라 다를 수 있어요 (매장별 차이 가능)', '별점: 앱 이용자 별점이며 객관적인 맛 평가가 아니에요 · 산정 기간 최근 12개월'];
const EX_PRICE_NOTICE = '예시 가격(확인 전): 브랜드 공식 사이트가 가격을 게시하지 않아 매장 메뉴판으로 확인하기 전 가격이에요. 확인된 가격만 ✓로 표시해요.';
const SAME = '메뉴판 가격 그대로예요. 매장에 따라 다를 수 있어요. (매장별 차이 가능)';
function infoLine(summary, lines, title = '가격·별점 안내', more = null) {
  const segs = summary.split(' · ');
  return `<button class="infoline" aria-label="${esc(title)} 전체 보기" data-a="${act(() => openSheet({ type: 'info', title, lines, more }))}">
    <span class="t">${segs.map((s, i) => `<span>${esc(i < segs.length - 1 ? s + ' ·' : s)}</span>`).join(' ')}</span><span class="i">${I.info}</span></button>`;
}
const ratingInline = t => t.enough ? `<span class="rating" aria-label="이용자 별점 ${f1(t.r)}점, ${t.v}개"><span class="star">${I.star}</span><b>${f1(t.r)}</b><span class="sub">&nbsp;(${t.v})</span></span>` : `<span class="sub">별점 부족 (${t.v}개)</span>`;
const noPriceText = e => { const ss = e.ss; return ss?.pending ? '가격 확인 중' : ss?.missing ? '가격 미입력' : ss?.notSold ? '판매 메뉴 아님' : PRICE_UNCONFIRMED; };
const cardVolume = e => { const s = e.size; if (!s) return null; const a = [s.ml != null ? MenuTable.mlText(s) : null, s.src.startsWith('이용자') ? '제보 가격' : null].filter(Boolean); return a.length ? a.join(' · ') : null; };

/** 카드 3번째 줄(Beta 1.8): [별점] · [1km 밖] · 320m · 도보 5분(추정). 줄바꿈은 항목 사이에서만('·'는 앞 줄에 남고 '도보 n분(추정)'은 통째로 다음 줄) */
function cardMeta(e, showR, outside, boost = false) {
  const hasD = e.d != null; const items = [];
  if (showR) items.push(ratingInline(e.t));
  if (boost) items.push(`<span class="boost">${RATING_BOOST}</span>`);
  if (outside) items.push('<span class="sub">1km 밖</span>');
  if (hasD) { items.push(`<span class="dist numtxt">${Geo.distPlain(e.d)}</span>`); if (Geo.showWalk(e.d)) items.push(`<span class="walk sub">${Geo.walkText(e.d)}</span>`); }
  if (!items.length) return '';
  return `<div class="l3 meta">${items.map((x, k) => k < items.length - 1 ? `<span class="mi">${x}<span class="sep">&nbsp;·</span></span> ` : `<span class="mi">${x}</span>`).join('')}</div>`;
}
function storeCard(e, n, outside, boost = false, valExcluded = false) {
  const db = EN.db; const s = e.size; const showR = e.t.enough;
  return `<div class="card" role="button" tabindex="0" data-a="${act(() => go('store/' + e.i))}">
    <div class="body"><div class="l1">${n > 0 ? `<span class="rank">${n}</span>` : ''}<span class="name">${esc(db.name[e.i])}</span></div>
    <div class="l2">${s ? `<span class="price">${won(s.p)}</span>${cardVolume(e) ? `<span class="sub">${esc(cardVolume(e))}</span>` : ''}` : `<span class="noprice">${noPriceText(e)}</span>`}</div>
    ${valExcluded && !s ? `<p class="sub valexcl">${VAL_EXCLUDED}</p>` : ''}
    ${cardMeta(e, showR, outside, boost)}</div>
    <button class="diricon" aria-label="길찾기" data-a="${act(() => openSheet({ type: 'map', i: e.i }))}"><span>${I.nav}</span></button></div>`;
}

// ---------- 공통 칩 바 / 정렬 탭 ----------
function sortTabs() {
  const big = isBig();
  return `<div class="sorttabs" role="tablist">${PRESET_ORDER.map(p => { const on = p === S.preset; let t = Presets[p].short.replace(/\(기본\)$/, ''); if (big && t.length > 5) t = t.replace(' ', '<br>');
    return `<button role="tab" aria-selected="${on}" data-a="${act(() => A.setPreset(p))}">${t}</button>`; }).join('')}</div>`;
}
function chipBar() {
  const f = S.filter; const n = F.activeCount(f); const out = [];
  out.push(chip('필터' + (n > 0 ? ' ' + n : ''), n > 0, () => openSheet({ type: 'filter', d: structuredClone(f) }), { lead: I.sliders }));
  out.push(chip(MenuTable.menuName(f.menu), false, () => openSheet({ type: 'menu' }), { trail: I.drop }));
  if (n > 0) out.push(chip('초기화', false, A.resetFilter, { lead: I.refresh }));
  if (f.type !== 'ALL') out.push(chip((f.type === 'FR' ? '프랜차이즈' : '개인 카페') + ' ✕', true, () => A.setFilter({ ...f, type: 'ALL', brands: [] })));
  if (f.pmax != null) out.push(chip(`${won(f.pmax)} 이하 ✕`, true, () => A.setFilter({ ...f, pmax: null })));
  if (F.volOn(f)) out.push(chip([f.vmin != null ? `${f.vmin}mL 이상` : null, f.vmax != null ? `${f.vmax}mL 이하` : null].filter(Boolean).join(' ~ ') + ' ✕', true, () => A.setFilter({ ...f, vmin: null, vmax: null })));
  if (f.brands.length) out.push(chip((f.brands.length === 1 ? Brands.ALL[f.brands[0] - 1] : `브랜드 ${f.brands.length}개`) + ' ✕', true, () => A.setFilter({ ...f, brands: [] })));
  if (f.rmin != null) out.push(chip(`★${f1(f.rmin)} 이상 ✕`, true, () => A.setFilter({ ...f, rmin: null })));
  return `<div class="chips">${out.join('')}</div>`;
}
const isBig = () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 1 > 16 * 1.15 * (document.documentElement.classList.contains('ios') ? 17 / 16 : 1);

// ---------- 화면: 주변 ----------
const areaBtn = () => EN && EN.regions && EN.regions.length ? btn('시·구 직접 고르기', () => openSheet({ type: 'region', sido: null })) : '';
function locationHelp() {
  let h = `<div class="empty">${emptyCup()}</div><div style="height:8px"></div>`;
  if (S.consent.age === 'u14') h += box('<p>만 14세 미만은 위치 기능을 쓸 수 없어서 주변 매장 찾기를 이용할 수 없어요. 메뉴 비교·즐겨찾기는 이용할 수 있어요.</p>') + btn('메뉴 비교 보기', () => go('compare'), 'pri');
  else if (!locOK()) h += box('<p>위치 이용에 동의하지 않아 현재 위치로 찾기가 꺼져 있어요. 시·구를 직접 골라 그 지역 중심 기준으로 찾을 수 있어요(고른 지역은 저장하지 않아요).</p>') + btn('위치 이용 켜기', () => go('c02'), 'pri') + areaBtn() + btn('메뉴 비교 보기', () => go('compare'));
  else if (S.locStatus === 'denied') h += box(`<p class="b">위치 권한이 필요해요</p><p class="pre">주변 1km 매장은 현재 위치(GPS)로 찾아요. 위치 좌표는 기기 안에서만 쓰고 밖으로 보내지 않아요.
위치를 거부했다면 iPhone 설정 › 개인정보 보호 및 보안 › 위치 서비스 › Safari 웹 사이트를 '앱을 사용하는 동안'으로 바꾸고, Safari 주소창의 aA(또는 페이지 메뉴) › 웹 사이트 설정 › 위치를 '허용' 또는 '묻기'로 바꿔 주세요.
위치 없이 시·구를 직접 골라 찾을 수도 있어요.</p>`, 'warn')
    + btn(PERM_HELP_BTN, () => openSheet({ type: 'permHelp' }), 'pri', false, 'id="permHelpBtn"') + areaBtn(); // 1.8.7 r4(CEO2 10:08): 웹은 위치를 요청하지 않고 안내 시트만 엶
  else if (S.locStatus === 'fail') h += box(`<p class="b">${esc(S.locErr || '위치를 측정하지 못했어요')}</p><p>실내라면 창가로 이동하거나 잠시 후 다시 시도해 주세요.</p>`, 'warn') + areaBtn();
  else if (S.locStatus === 'measuring') h += `<p class="b">현재 위치 확인 중…</p>${sub('위치는 기기 안에서만 써요.')}<div class="progress"></div>` + areaBtn();
  else h += `<p class="b" style="font-size:var(--fs-17)">위치를 확인하면 주변 1km 카페를 보여 드려요</p>${sub('위에 있는 [내 위치 확인하기]를 눌러 주세요. 위치는 기기 안에서만 써요.')}` + areaBtn();
  return h;
}
function exclNotes(r) {
  return Reasons.map(k => { const n = r.groups[k].length; return n > 0 ? box(`<div class="rowc"><p style="flex:1">${LBL[k]} ${n}곳 제외됨</p>${btn(S.inc[k] ? '다시 빼기' : '포함해서 보기', () => A.toggleInc(k), 'sec inline')}</div>`) : ''; }).join('');
}
function relaxBlock(o) {
  let h = o.length ? h3('조건 완화 제안') + o.map(x => `<div style="padding:3px 0">${btn(`${x.label} ${x.n}곳`, () => A.relax(x.arg))}</div>`).join('') : '';
  return h + `<div style="padding:3px 0">${btn('필터 초기화', A.resetFilter)}</div>` + sub('조건을 자동으로 바꾸거나 반경을 넓히지 않아요(1km 고정).');
}
// Beta 1.7(QA-Web ②): 3km 대체 목록은 추천 점수 없이 거리순 → 가격 없는 묶음 안내도 거리순으로
export const NOPRICE_FALLBACK_NOTE = '가격 정보 없는 곳은 거리순이에요';
const noPriceHeader = (n, menu, fallback = false) => `<div class="npHead"><hr><p class="t">가격 정보 없음 · ${n}곳</p>${sub(fallback ? NOPRICE_FALLBACK_NOTE : `${MenuTable.menuName(menu)} 가격을 모르는 매장이라 순위에 넣지 않고 맨 아래에 모았어요. 묶음 안 순서는 지금 정렬과 같아요.`)}</div>`;
function nearList(ns) {
  const r = ns.r, f = ns.filter, L = ref(); let h = '';
  if (manual()) h += `<div class="manualnote"><p class="sub" id="manualAreaNote">${esc(MANUAL_AREA_NOTE)}</p><div class="pair" style="margin-top:6px">${btn('지역 바꾸기', () => openSheet({ type: 'region', sido: S.area.sido }))}${btn('현재 위치 사용', () => A.setArea(null))}</div></div>`;
  const empty = r.baseCount > 0 && !r.main.length && !r.extra.length && !r.noPriceList.length;
  if ((L.acc || 0) > 50) h += box(`<p>위치 정확도가 낮아요 (약 ${Math.trunc(L.acc)}m) · 거리와 별점·제보 현장 확인(100m) 판정이 정확하지 않을 수 있어요.</p>`, 'warn');
  if (r.baseCount === 0) {
    h += `<div class="empty">${emptyCup()}`;
    if (r.fallback.length) h += `<p class="b" style="font-size:var(--fs-17);line-height:1.41;margin-top:8px">1km 안에 카페가 없어요. 3km까지 찾아봤어요</p>${sub((F.active(f) ? '조건에 맞는 가장 가까운 매장' : '가장 가까운 매장') + ' · 3km 이내 · 거리순 · 추천 점수 없이 거리순으로만 보여 줘요. 반경은 자동으로 넓히지 않아요.', 'margin:4px 0')}`;
    else if (F.active(f)) h += `<div style="width:100%;text-align:left"><p class="b" style="padding:8px 0">3km 안에도 조건에 맞는 매장이 없어요.</p>${relaxBlock(ns.relax)}</div>`;
    else h += `<p class="b" style="font-size:var(--fs-17);padding:8px 0">3km 안에도 카페가 없어요</p>`;
    h += '</div>';
    const fbP = r.fallback.filter(e => e.size), fbN = r.fallback.filter(e => !e.size);
    h += fbP.map(e => storeCard(e, 0, true)).join('');
    if (fbN.length) h += noPriceHeader(fbN.length, f.menu, true) + fbN.map(e => storeCard(e, 0, true)).join('');
  } else if (empty) {
    h += `<div class="empty">${emptyCup()}<p class="b" style="font-size:var(--fs-17);margin-top:8px">조건에 맞는 매장이 1km 안에 없어요</p>${sub(`필터 없이 보면 1km 안 ${r.baseCount}곳이 있어요.`)}<div style="width:100%;text-align:left">${exclNotes(r)}${relaxBlock(ns.relax)}</div></div>`;
  } else {
    h += exclNotes(r);
    const boost = ns.preset === 'VAL' ? Engine.ratingBoostFlags(r.main) : null;
    h += r.main.map((e, n) => storeCard(e, n + 1, false, !!(boost && boost[n]))).join('');
    if (r.noPriceList.length) h += noPriceHeader(r.noPriceList.length, f.menu) + r.noPriceList.map(e => storeCard(e, 0, false, false, ns.preset === 'VAL')).join('');
    for (const k of Reasons) { const g = r.groups[k]; if (ns.inc[k] && g.length) h += h3(`${LBL[k]} ${g.length}곳 (포함해서 보기)`) + g.map(e => storeCard(e, 0, false)).join(''); }
  }
  h += sub(`매장 정보: 소상공인시장진흥공단 상가(상권)정보 기준일 ${EN.db.dbDate} + 행정안전부 휴게음식점 인허가 (data.go.kr 15006730) 기준일 2026-10-14 · 전국 ${EN.db.size.toLocaleString('ko-KR')}곳(프랜차이즈 12개 브랜드 + 개인 카페(추정))을 기기에 저장해 계산 · 폐업·없는 매장은 매장 상세 › 정보 오류 제보로 알려 주세요.`, 'padding:16px 0');
  return h;
}
// ---------- Beta 1.8.2 홈 카테고리·나의 메뉴·취향 입력 ----------
const catTabs = () => `<div class="sheettabs cattabs" role="tablist">${H182.CATS.map(([k, l]) => `<button role="tab" aria-selected="${S.homeCat === k}" data-a="${act(() => A.setHomeCat(k))}">${l}</button>`).join('')}</div>`;
const empty182 = (t, b) => `<div class="empty">${emptyCup()}<p class="b" style="margin-top:8px">${esc(t)}</p>${b ? `<div style="padding-top:12px">${btn(b, () => go('taste'))}</div>` : ''}</div>`;
function favBody() {
  if (!S.favs.length) return empty182(H182.EMPTY_FAV);
  const R0 = ref();
  return S.favs.filter(i => i < EN.db.size).map(i => { const d = R0 ? Geo.dist(EN.db, i, R0) : null; const f0 = { ...defaultFilter(), menu: S.filter.menu };
    const e = { ...(EN.evalStore(i, f0) || { i, size: null, ss: EN.storeSizes(i, f0.menu), reason: null, t: EN.taste(i) }), d };
    return storeCard(e, 0, R0 != null && d > Radius.SEARCH_M); }).join('');
}
let MM = { key: null, r: null };
function myMenuBody(L) {
  const tags = S.taste.tags;
  if (!tags.length) return (S.taste.updated ? `<div class="rowc tastenone" style="padding-top:6px">${sub('선택 없음')}</div>` : '') + empty182(H182.EMPTY_NO_TASTE, H182.PICK); // 0개 저장 = 명시적 '선택 없음', 취향별 카페 묶음 숨김
  let b = `<div class="rowc" style="padding-top:6px;gap:8px"><div class="flow" style="flex:1;row-gap:4px">${tags.map(t => badge(t)).join('')}</div><div>${btn(H182.EDIT, () => go('taste'))}</div></div>${sub(H182.SORT_LABEL, 'padding-top:6px')}`;
  const key = tags.join() + '|' + L.lat + ',' + L.lng;
  if (MM.key !== key) { const db = EN.db, st = [];
    for (let i = 0; i < db.size; i++) { const d = Geo.dist(db, i, L); if (d <= Radius.SEARCH_M) st.push([i, db.brandName(i), d]); }
    MM = { key, r: MyMenu.run(tags, Data182.BEANS, st) }; }
  const r = MM.r, db = EN.db;
  if (!r.hits.length) b += empty182(H182.EMPTY_NO_MATCH, H182.EDIT);
  b += r.hits.map(h => `<button class="listrow mymenurow" data-a="${act(() => go('store/' + h.store))}"><span><b>${esc(db.name[h.store])}</b><br><span class="sub">${esc(Geo.distPlain(h.dist))} · 일치: ${esc(h.matched.join(', '))}</span>${(bb => bb && bb.checked ? `<br><span class="sub">출처: ${esc(bb.brand)} 공식 홈페이지 · 확인 ${Seasonal.md(bb.checked)}</span>` : '')(Data182.BEANS.find(x => x.brand === db.brandName(h.store)))}</span>${I.right}</button><hr>`).join('');
  const bc = Data182.beansChecked(); if (bc) b += sub(`원두 정보는 브랜드 공식 홈페이지 기준 · 확인 ${Seasonal.md(bc)}`, 'padding-top:8px');
  if (r.noInfo.length) { const open = !!UI.noInfo;
    b += `<div class="fold"><button class="noinfo" aria-expanded="${open}" data-a="${act(() => { UI.noInfo = !UI.noInfo; render(); })}"><span>정보 없음 ${r.noInfo.length}곳</span>${open ? I.up : I.down}</button>${open ? `<div class="content">${sub(H182.NO_INFO_NOTE)}${r.noInfo.map(i => listRow(db.name[i], () => go('store/' + i))).join('')}</div>` : ''}</div>`; }
  return b;
}
const TASTE = { sel: null };
function TasteScreen() {
  const secs = TasteTags.visibleSections(Data182.TAG_BRANDS_MATCHED); const allowed = secs.flatMap(s => s[1]);
  if (!TASTE.sel) TASTE.sel = S.taste.tags.filter(t => allowed.includes(t));
  const sel = TASTE.sel; const leave = () => { TASTE.sel = null; back(); };
  const right = `<button class="txtbtn" data-a="${act(() => { TASTE.sel = []; render(); })}">초기화</button>`;
  return topBar('취향 고르기', { onBack: leave, right }) + `<div class="scroll">${sub(H182.TASTE_NOTE, 'padding-top:6px')}${secs.map(([h, ts]) => h3(h) + `<div class="flow tall">${ts.map(t => chip(t, sel.includes(t), () => { TASTE.sel = sel.includes(t) ? sel.filter(x => x !== t) : [...sel, t]; render(); })).join('')}</div>`).join('')}<div style="height:12px"></div></div>
    <div class="cta">${btn('저장', () => { A.setTaste(sel); TASTE.sel = null; back(); }, 'pri', false)}</div>`;
}
// Beta 1.8.5 공식 프로모션·이벤트: 기존 흰 카드(box notice)만, 광고형 배지·색 없음. 추천·정렬과 무관
function promoCard(p, showBrand = true) {
  // Beta 1.8.6 P8(ui §6-1·§8-3): 브랜드→제목→요일 칩→혜택(2줄 접기)→기간→원문 범위 상자(scope_note 그대로, 비면 숨김)→출처 줄→공식 출처 보기. 토글 하나로 혜택·범위 상자 함께 펼침
  const open = UI.promoOpen.has(p.id);
  const tog = act(() => { open ? UI.promoOpen.delete(p.id) : UI.promoOpen.add(p.id); render(); });
  return `<div class="promocard ${open ? 'open' : ''}" data-pid="${esc(p.id)}">${showBrand ? `<p class="pc-brand">${esc(p.brand)}</p>` : ''}<p class="pc-title">${esc(p.title)}</p>${p.recurWeekday ? `<div class="promorecur">${badge(recurLabel(p.recurWeekday))}</div>` : ''}<p class="foldtxt pc-benefit ${open ? 'open' : ''}">${esc(p.benefitText)}</p><button class="txtbtn c foldbtn pc-row" ${open ? '' : 'hidden'} aria-expanded="${open}" data-a="${tog}">${open ? Promo185.LESS : Promo185.MORE}</button><p class="pc-period">기간 ${esc(Promotions.period(p))} · ${esc(p.scope)}</p>${p.scopeNote ? `<div class="pc-scope"><p class="pc-scope-l">원문 범위·조건</p><p class="pc-scope-b foldscope ${open ? 'open' : ''}">${esc(p.scopeNote)}</p></div>` : ''}<p class="pc-src">${esc(Promo185.sourceLine(p))}</p><a class="txtbtn c promolink pc-row" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${Promo185.LINK}<span class="sub">&nbsp;${Promo185.NET_NOTE}</span></a></div>`;
}
// Beta 1.8.6 P9: 외곽선 버튼(전체 폭 48dp)
const p9Button = fn => `<button class="p9btn" data-a="${act(fn)}">${P9.BUTTON}</button>`;
function openBrandLink(row) { if (row && row.tappable) openSheet({ type: 'link', row }); else go('brandlinks'); }
/** 매장 상세: 그 브랜드 링크가 있으면 이동 확인 시트로 바로, 없으면(미확인·목록 실패) 브랜드 목록 화면 */
function p9Detail(brand) { return `<div class="p9detail">${p9Button(() => openBrandLink(BrandLinks.forBrand(LinkData.rows, brand)))}</div>`; }
function launchLink(sh) {
  let w = null; try { w = window.open(sh.row.url, '_blank'); } catch { w = null; }
  if (!w) { sh.failed = true; render(); return; }
  try { w.opener = null; } catch { } UI.sheet = null; render();
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { } a.remove(); return ok; } }
function BrandLinksScreen() {
  const rows = LinkData.rows;
  const b = !LinkData.ready || LinkData.loading ? `<div class="p9loading">${'<i></i>'.repeat(3)}</div>`
    : LinkData.failed ? `<div class="empty p9fail"><p class="b t15">${P9.FAIL}</p><p class="sub">${P9.FAIL_SUB}</p><button class="btn sec p9retry" style="min-height:48px;margin-top:8px" data-a="${act(() => { LinkData.load().then(render); render(); })}">${P9.RETRY}</button></div>`
    : `<p class="sub p9guide">${BrandLinks.allUnconfirmed(rows) ? P9.NONE : P9.GUIDE}</p><div class="p9list">${rows.map(r => r.tappable
      ? `<button class="p9row" data-a="${act(() => openSheet({ type: 'link', row: r }))}"><span class="p9t"><span class="p9b">${esc(r.brand)}</span><span class="p9s">${esc(r.label)}</span></span><span class="p9ic" aria-hidden="true">↗</span></button>`
      : `<div class="p9row off" aria-disabled="true"><span class="p9t"><span class="p9b">${esc(r.brand)}</span><span class="p9s">${esc(r.label)}</span></span></div>`).join('')}</div>`;
  return topBar(P9.TITLE, { onBack: back }) + `<div class="scroll"><div class="p9wrap">${b}</div></div>`;
}
export function promoSection(brand, items = PromoData.items, now = Date.now()) {
  const vis = brand ? Promotions.forBrand(items, brand, now).sort((a, b) => a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : a.id < b.id ? -1 : 1) : [];
  if (PromoData.failed) return ''; // Beta 1.8.6: 불러오기 실패면 섹션째 숨김
  return vis.length ? `<section class="promo">${h3(Promo185.SECTION)}${vis.map(p => promoCard(p)).join('')}</section>` : '';
}
function PromoScreen() {
  const g = Promotions.grouped(PromoData.items, Date.now());
  // Beta 1.8.6(Q185-01): 실패는 목록 영역 안 문구 + 48dp [다시 시도](별도 화면 없음). 0건 확인일은 날짜 있을 때만
  const b = !PromoData.ready || PromoData.loading ? `<p class="promoloading">${Promo185.LOADING}</p>`
    : PromoData.failed ? `<div class="empty promofail">${emptyCup()}<p class="b" style="margin-top:8px">${Promo185.FAIL}</p><button class="btn sec promoretry" style="min-height:48px;margin-top:8px" data-a="${act(() => { PromoData.load().then(render); render(); })}">${Promo185.RETRY}</button></div>`
    : !g.length ? `<div class="empty promoempty">${emptyCup()}<p class="b" style="margin-top:8px">${Promo185.EMPTY}</p>${PromoData.checked ? `<p class="sub promochecked">${esc(Promo185.checkedLine(PromoData.checked))}</p>` : ''}</div>`
    : g.map(([br, ps]) => `<p class="b promobrand" style="font-weight:800;padding-top:14px">${esc(br)}</p>` + ps.map(p => promoCard(p)).join('')).join('');
  return topBar(Promo185.SECTION, { sub: '브랜드 공식 홈페이지 기준 · 추천 순위와 무관', onBack: back }) + `<div class="scroll">${p9Button(() => go('brandlinks'))}${b}${sub('확인한 공식 출처만 실어요. 끝난 행사는 자동으로 숨겨요. 매장별로 참여가 다를 수 있어요.')}</div>`;
}
function seasonSection(brand) {
  const vis = Seasonal.visible(Data182.SEASON.filter(x => x.brand === brand)); if (!vis.length) return '';
  const ck = vis.map(x => x.checked).filter(Boolean).sort().pop();
  return `<section class="season">${h3('시즌 메뉴')}${vis.map((x, n) => `${n ? '<hr>' : ''}<div class="trow"><span class="nm" style="flex:1"><b class="t15">${esc(x.name)}</b><span class="sub">${esc(Seasonal.period(x))}${Seasonal.endingSoon(x) ? ' · <b>곧 종료</b>' : ''}</span></span><span class="rowprice">${x.price != null ? won(x.price) : '가격 미공개'}</span></div>`).join('')}${sub('브랜드 공식 홈페이지 기준' + (ck ? ` · 확인 날짜 ${Seasonal.md(ck)}` : ''))}</section>`;
}
function NearScreen() {
  const L = ref(); const ns = nearState(); const man = manual();
  const head = topBar('주변 카페', { sub: man ? `반경 1km · 선택 지역 기준 · ${S.area.label}` : L ? `반경 1km · GPS 기준 · 정확도 약 ${Math.trunc(L.acc || 0)}m` : LOC_SUB[locBtnState()], subWarn: !L && !man && ['denied', 'failed'].includes(locBtnState()),
    right: `<button class="locbtn" data-loc="${locBtnState()}" aria-label="내 위치 확인하기" ${S.locStatus === 'measuring' ? 'aria-busy="true" disabled' : ''} data-a="${act(() => requestLocation('header'))}">${I.placeOff}<span>${LOC_BTN[locBtnState()]}</span></button>`,
    extra: EN ? `<div style="display:flex;flex-direction:column;gap:2px">${catTabs()}${L && S.homeCat === 'near' ? sortTabs() + chipBar() : ''}</div>` : null });
  let body; const cat = EN && !S.dbError ? S.homeCat : 'near';
  if (cat === 'fav') body = `<div class="scroll" data-keep="fav">${favBody()}</div>`;
  else if (cat === 'mymenu' && (L || !S.taste.tags.length)) body = `<div class="scroll" data-keep="mymenu">${myMenuBody(L)}</div>`;
  else if (S.dbError) body = `<div class="scroll" data-keep="near">${box(`<p class="b">매장 정보를 불러오지 못했어요.</p><p>${esc(S.dbError)}</p>`, 'warn')}</div>`;
  else if (!EN) body = `<div class="scroll"><div style="padding-top:24px"><p class="b">매장 DB를 준비하고 있어요…</p>${sub('전국 일괄 파일(모든 사용자 동일)을 처음 한 번 받아 기기 안에서 읽고 있어요. 위치 정보는 보내지 않아요.')}<div class="progress"></div></div></div>`;
  else if (!L) body = `<div class="scroll">${locationHelp()}</div>`;
  else if (!ns) body = `<div class="center"><div class="spinner"></div></div>`;
  else body = `<div class="scroll list ${UI.anim ? 'fadein' : ''}" data-keep="near">${nearList(ns)}</div>`;
  UI.anim = false;
  let foot = '';
  if (ns && cat === 'near') { const r = ns.r; foot += `<button class="summary" data-a="${act(() => openSheet({ type: 'nearInfo' }))}"><span class="t">${esc(`${MenuTable.menuName(ns.filter.menu)} · 1km 안 ${r.main.length + r.noPriceList.length}곳 · 예시 가격 포함`)}</span><span class="i" aria-label="현재 기준·가격·별점 안내 열기">${I.info}</span></button>`; }
  return head + body + foot;
}

// ---------- 매장 상세 ----------
function sizeTable(rows, onCompare) {
  const cols = [...new Set(rows.flatMap(([, ss]) => ss.list.map(z => z.n)))]; const big = isBig();
  let h = `<div class="table"><div class="trow head">${big ? '' : '<span class="nm sub">메뉴</span>'}<span class="cells" style="--cols:${cols.length}">${cols.map(c => `<span class="cell sub b">${esc(c)}</span>`).join('')}</span></div>`;
  for (const [k, ss] of rows) {
    const name = MenuTable.menuName(k);
    const cells = `<span class="cells" style="--cols:${cols.length}">${cols.map(c => { const z = ss.list.find(x => x.n === c);
      return `<span class="cell">${!z ? `<span class="sub">${ss.missing ? '미입력' : '–'}</span>` : `<span class="rowprice s17">${z.verified ? `<span class="chk" aria-label="확인된 가격">${I.check}</span>` : ''}${won(z.p)}</span>${z.ml != null ? `<span class="sub">${MenuTable.mlText(z)}</span>` : ''}`}</span>`; }).join('')}</span>`;
    h += `<hr><button class="trow sz" aria-label="${esc(name)} 가격 비교" data-a="${act(() => onCompare(k))}"><span class="nm"><b>${esc(name)}</b>${ss.list.some(z => Engine.isOld(z.d)) ? `<div style="padding-top:4px">${badge('오래된 가격', 'dark')}</div>` : ''}</span>${cells}</button>`;
  }
  return h + '</div>';
}
const priceRow = (name, p, sb, onCompare, tag = '') => `<button class="trow" ${onCompare ? `data-a="${act(onCompare)}" aria-label="${esc(name)} 가격 비교"` : 'disabled style="cursor:default"'}><span class="nm" style="flex:1"><b class="t15">${esc(name)}</b>${sb ? sub(sb) : ''}${tag ? `<div style="padding-top:4px">${tag}</div>` : ''}</span><span class="rowprice" style="padding-left:10px">${won(p)}</span></button>`;
function sourceLine(s) {
  if (!s.verified) return `<div class="flow">${badge(s.src === EXAMPLE || s.src.includes('예시') ? s.src : `${s.src} · 예시`, 'ex')}${s.d ? sub(s.d) : ''}</div>`;
  return sub(`출처: ${s.src}${s.shop ? `(${s.shop})` : ''}${s.d && !s.src.includes(s.d) ? ` · 확인일 ${s.d}` : ''}`);
}
function StoreScreen(i) {
  const fav = S.favs.includes(i);
  const right = EN ? `<button class="iconbtn favbtn ${UI.favPop ? 'pop' : ''}" aria-pressed="${fav}" aria-label="${fav ? '즐겨찾기 해제' : '즐겨찾기'}" data-a="${act(() => { UI.favPop = true; A.toggleFav(i); })}">${fav ? I.star : I.starLine}</button>` : '';
  UI.favPop = false;
  let h = topBar('매장 상세', { onBack: back, right });
  if (!EN || !(i >= 0 && i < EN.db.size)) return h + `<div class="scroll"><p>불러오는 중…</p></div>`;
  const db = EN.db; const R0 = ref(); const d = R0 ? Geo.dist(db, i, R0) : null; const t = EN.taste(i); const mk = S.filter.menu;
  const cmp = k => () => { A.setFilter({ ...S.filter, menu: k }); go('compare'); };
  let b = `<h2 class="title" style="padding-top:6px;white-space:normal">${esc(db.name[i])}</h2>
    <p class="t15" style="margin-top:2px"><span class="b" style="color:var(--secondary)">${d != null ? Geo.distPlain(d) : NO_LOC_DIST}</span>${d != null && Geo.showWalk(d) ? ' · <span class="nowrap">' + Geo.walkText(d) + '</span>' : ''}${d != null && manual() ? ' · 선택 지역 기준' : ''}</p>
    <p>주소: ${esc(db.addr[i])}</p>
    <div class="flow" style="padding-top:6px;row-gap:4px">${typeBadge(i)}${d != null && d > Radius.SEARCH_M ? badge('1km 밖') : ''}${EN.gp.has(i) ? badge('착한가격업소') : ''}</div>` + (db.isFr(i) ? seasonSection(db.brandName(i)) + promoSection(db.brandName(i)) + p9Detail(db.brandName(i)) : '') + h3('메뉴 가격');
  if (db.isFr(i)) {
    const br = db.brandName(i);
    const rows = MenuTable.KEYS.map(k => [k, MenuTable.brandSizes(br, k)]).filter(([, ss]) => ss && !ss.notSold);
    const anyEx = rows.some(([, ss]) => ss.list.some(z => !z.verified));
    b += infoLine(anyEx ? `${EXAMPLE} · 메뉴를 누르면 비교` : '메뉴판 가격 · 메뉴를 누르면 비교', [...(anyEx ? [EX_PRICE_NOTICE] : []), SAME, ...DATA_NOTICE], '가격 안내');
    b += sizeTable(rows, k => cmp(k)());
    const v = rows.flatMap(([, ss]) => ss.list).find(z => z.verified); if (v) b += sourceLine(v);
  } else if (EN.gp.has(i)) {
    const rows = EN.gp.byStore.get(i);
    b += infoLine(`착한가격업소 메뉴판 가격 ${rows.length}개 · 공공데이터`, [`착한가격업소 메뉴판 가격 ${rows.length}개 · 공공데이터 · 용량 미공개`, `출처: ${GP_SOURCE} · 매장 메뉴판 가격 · 용량 미공개`, '음료가 아닌 메뉴는 비교·필터·점수에서 빼요.', SAME, ...DATA_NOTICE], '가격 안내');
    if (Engine.isOld(GP_DATE)) b += `<div style="padding-bottom:4px">${badge('오래된 가격', 'dark')}</div>`;
    b += `<div class="table">${rows.map((g, n) => (n > 0 ? '<hr>' : '') + priceRow(g.menu, g.price, !g.beverage ? '음료 아님 · 비교 제외' : null, g.keys[0] ? cmp(g.keys[0]) : null)).join('')}</div>`;
  } else if (EN.ind && EN.ind.has(db.name[i], db.addr[i])) {
    // Beta 1.8.3: 공식 출처로 확인된 개인 카페 가격 — 메뉴 · 사이즈/용량 · 가격, 아래 "출처 · 확인 날짜"(출처 링크, 확인자 미표시)
    b += `<div class="table">${EN.ind.rows(db.name[i], db.addr[i]).map((r, n) => (n > 0 ? '<hr>' : '') + `<div class="indrow" style="padding:10px 16px">${priceRow(indLabel(r), r.price, null, r.key ? cmp(r.key) : null)}<a class="sub indsrc" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;min-height:32px;padding:6px 0;text-decoration:underline">${esc(indSourceLine(r.date))}</a></div>`).join('')}</div>`;
  } else {
    const rp = db.rep.get(i);
    if (rp && !rp.pending) {
      b += infoLine(`제보 가격 · ${rp.date}`, [`제보 가격 · 용량 미공개 · 이용자 제보(일치 2건 이상·검수) · ${rp.date}`, SAME, ...DATA_NOTICE], '가격 안내');
      b += `<div class="table">${['am_h', 'am_i', 'la_h'].filter(k => rp.prices[k] != null).map((k, n) => (n > 0 ? '<hr>' : '') + priceRow(MenuTable.menuName(k), rp.prices[k], null, cmp(k), Engine.isOld(rp.date) ? badge('오래된 가격', 'dark') : '')).join('')}</div>`;
    } else b += box(`<p class="b">${PRICE_UNCONFIRMED}${rp && rp.pending ? ' · 제보 1건 확인 중' : ''}</p><p>개인 카페 가격은 서로 다른 기기 2대 이상의 일치 제보가 모이면 표시돼요.</p>`);
  }
  const mine = S.myRatings[i];
  b += box(`<div class="rowc"><p class="eb" style="flex:1;font-size:var(--fs-h3)">이용자 별점</p>${badge('예시', 'ex')}</div>
    <div class="rowc" style="padding-top:4px;gap:2px">${t.enough ? `<span class="rating"><span class="star" style="width:18px;height:18px">${I.star}</span></span>` : ''}<p class="t15">${t.enough ? `${f1(t.r)} / 5 · 별점 ${t.v}개 · 최근 12개월` : `별점 부족 · 별점 ${t.v}개(5개 미만은 평균 비공개)`}</p></div>
    ${mine ? sub(`내 별점 ★${mine.v} (${mine.date}, 이 기기에 보관)`) : ''}${sub('앱 이용자 별점이며 객관적인 맛 평가가 아니에요')}
    <div style="padding-top:8px">${btn(mine ? '별점 수정' : '별점 남기기', () => openSheet({ type: 'rate', i, star: 0 }))}</div>`, 'notice', 'margin-top:16px');
  // 접힘: 출처·안내 · 추천 점수
  let fold = '';
  if (d != null && d <= Radius.SEARCH_M) {
    const f0 = { ...defaultFilter(), menu: mk }; const e = EN.evalStore(i, f0) || { i, size: null, t };
    const sc = EN.scoreOf(e, d, EN.population(f0), Presets.BAL.w);
    fold += `<div class="rowc"><p class="b">추천 점수(균형) 종합 ${f2(sc.total)}</p>${sc.lacking ? badge('정보 부족') : ''}</div>${sub(`거리 ${f2(sc.sd)} · 가성비 ${sc.sv != null ? f2(sc.sv) : '정보 부족'} · 별점 ${sc.st != null ? f2(sc.st) : '정보 부족'} (${MenuTable.menuName(mk)} 기준)`)}
      <button class="txtbtn c" style="padding:0" data-a="${act(() => go('doc/criteria'))}">계산 방식 ›</button>`;
  } else fold += sub('1km 밖 매장은 추천 점수를 계산하지 않아요.');
  fold += `<hr style="margin:6px 0">` + [EX_PRICE_NOTICE, ...DATA_NOTICE].map(x => `<p style="padding:2px 0">· ${esc(x)}</p>`).join('')
    + `<p style="padding:2px 0">· 길 안내: 설치된 지도 앱으로 이동 · 매장 위치만 전달하고 내 위치 좌표는 보내지 않아요</p><p style="padding:2px 0">· 매장 정보 출처: ${storeSource(i, db.dbDate)} · 등록된 브랜드·카페와 제휴 관계가 없어요</p>`;
  const open = !!UI.fold;
  b += `<div style="height:4px"></div><hr>` + `<button class="listrow hoursrow" data-a="${act(() => openSheet({ type: 'map', i, tab: 'hours' }))}"><span>${HOURS_ROW}<br><span class="sub">${HOURS_ROW_NOTE}</span></span></button><hr><button class="listrow menurow" data-a="${act(() => openSheet({ type: 'map', i, tab: 'menu' }))}"><span>${MENU_ROW}<br><span class="sub">${MENU_ROW_NOTE}</span></span></button>`;
  b += `<div class="fold"><hr><button aria-expanded="${open}" data-a="${act(() => { UI.fold = !UI.fold; render(); })}"><span>출처·안내 · 추천 점수</span>${open ? I.up : I.down}</button>${open ? `<div class="content">${fold}</div>` : ''}</div>`;
  b += '<hr>' + listRow('정보 제보·신고', () => openSheet({ type: 'report', i }));
  return h + `<div class="scroll" data-keep="store">${b}</div><div class="cta">${btn('지도 앱으로 길찾기', () => openSheet({ type: 'map', i }), 'pri')}</div>`;
}

// ---------- 메뉴 비교 ----------
function CompareScreen() {
  const f = S.filter; const ns = nearState(); const pOn = F.priceOn(f), vOn = F.volOn(f);
  const rows = []; let noVol = 0, noFit = 0;
  for (const [code, b] of Brands.SORTED) {
    if (f.brands.length && !f.brands.includes(code)) continue;
    const ss = MenuTable.brandSizes(b, f.menu); if (!ss || ss.notSold) continue;
    if (ss.missing) { rows.push({ b, code, s: null }); continue; }
    let c = ss.list.filter(z => !pOn || z.p <= f.pmax);
    if (vOn) { const cv = c.filter(z => F.volOk(f, z.ml)); if (!cv.length && c.some(z => z.ml == null)) { noVol++; if (!S.inc.NO_VOL) continue; c = c.filter(z => z.ml == null); } else c = cv; }
    if (!c.length) { noFit++; continue; }
    rows.push({ b, code, s: pOn || vOn ? c.reduce((m, z) => z.p < m.p ? z : m) : ss.list[0] });
  }
  rows.sort((a, b) => (a.s ? a.s.p : Infinity) - (b.s ? b.s.p : Infinity));
  const minP = rows.filter(r => r.s).reduce((m, r) => Math.min(m, r.s.p), Infinity);
  const anyEx = rows.some(r => r.s && r.s.verified === false);
  const cond = [MenuTable.menuName(f.menu), pOn ? `${won(f.pmax)} 이하` : null, f.vmin != null ? `${f.vmin}mL 이상` : null, f.vmax != null ? `${f.vmax}mL 이하` : null].filter(Boolean);
  const head = (pOn || vOn ? cond.join(' · ') + ' · 낮은 가격순' : MenuTable.menuName(f.menu) + ' · 기본 사이즈 · 낮은 가격순') + (anyEx ? ' · 예시 가격 포함' : '');
  let b = infoLine(head, ['메뉴판 가격 기준이에요. 브랜드마다 기본 용량이 달라요.', pOn || vOn ? cond.join(' · ') + ' · 메뉴판 가격 기준' : MenuTable.menuName(f.menu) + ' · 브랜드별 기본(가장 작은) 사이즈 · 메뉴판 가격 낮은 순', ...(anyEx ? [EX_PRICE_NOTICE] : []), ...DATA_NOTICE], '비교 기준·가격·별점 안내');
  if (f.type === 'IND') b += box("<p>카페 유형이 '개인 카페'라 브랜드 비교표는 표시하지 않아요.</p>");
  else {
    b += rows.map((r, n) => { const top = r.s && r.s.p === minP; const d = ns ? ns.brandNear.get(r.code) : undefined;
      return `<div class="cmp ${n === 0 ? 'first' : ''} ${n === rows.length - 1 ? 'last' : ''} ${top ? 'top' : ''}">${n > 0 ? '<hr>' : ''}<div class="r"><span class="bar"></span><div class="m">
        <div class="rowc" style="gap:6px"><span class="bn">${esc(r.b)}</span>${top ? badge('최저', 'top') : ''}</div>
        ${!r.s ? `<p class="c2">가격 미입력</p>` : `<div class="pl">${r.s.verified ? `<span class="chk" style="width:18px;height:18px" aria-label="확인된 가격">${I.check}</span>` : ''}<span class="cmpprice">${won(r.s.p)}</span><span class="sub">${esc([r.s.n, r.s.ml != null ? MenuTable.mlText(r.s) : null].filter(Boolean).join(' · '))}</span>${Engine.isOld(r.s.d) ? badge('오래된 가격', 'dark') : ''}</div>`}
        </div><span class="d ${d != null ? 'numtxt' : 'sub'}" aria-label="${d != null ? '1km 안 가장 가까운 매장 ' + Geo.distText(d) : '1km 안 매장 없음'}">${d != null ? Geo.distText(d) : ref() ? '1km 안 없음' : NO_LOC_DIST}</span></div></div>`; }).join('');
    b += `<div style="padding-top:6px">${noVol > 0 ? box(`<div class="rowc"><p style="flex:1">용량 미공개 ${noVol}개 브랜드 제외됨</p>${btn(S.inc.NO_VOL ? '다시 빼기' : '포함해서 보기', () => A.toggleInc('NO_VOL'), 'sec inline')}</div>`) : ''}${noFit > 0 ? sub(`조건에 맞는 사이즈가 없는 브랜드 ${noFit}개는 표에서 뺐어요.`) : ''}</div>`;
  }
  b += h3('1km 안 매장 가격 · 메뉴판 가격 낮은 순');
  if (!ref()) b += sub('현재 위치(GPS)를 확인하거나 시·구를 고르면 1km 안 매장 가격도 볼 수 있어요.');
  else if (!EN || !ns) b += '<p>계산하고 있어요…</p>';
  else if (!ns.cmpList.length) b += box('<p>1km 안에 이 메뉴를 이 조건으로 파는 매장이 없어요.</p>');
  else b += sub(`${ns.cmpList.length}곳`);
  if (EN && ns) b += ns.cmpList.map(e => storeCard(e, 0, false)).join('');
  if (ns && ns.cmpNoPriceInd > 0) b += sub(`가격 정보가 없는 개인 카페 ${ns.cmpNoPriceInd}곳은 표에 넣지 않았어요.`);
  b += sub('등록된 브랜드·카페와 제휴 관계가 없어요. 용량 환산 가격은 쓰지 않아요.', 'padding:12px 0');
  return topBar('메뉴 가격 비교', { sub: manual() ? `거리: 선택 지역 기준 · ${S.area.label}` : null, extra: chipBar() }) + `<div class="scroll list" data-keep="compare">${b}</div>`;
}

// ---------- 즐겨찾기 ----------
function FavScreen() {
  let b = '';
  if (!S.favs.length) b = `<div class="empty">${emptyCup()}<p class="b" style="margin-top:8px">즐겨찾기한 매장이 없어요. 매장 상세에서 ☆를 눌러 추가할 수 있어요.</p></div>`;
  else if (!EN) b = '<p>불러오는 중…</p>';
  else b = S.favs.filter(i => i < EN.db.size).map(i => {
    const R0 = ref(); const d = R0 ? Geo.dist(EN.db, i, R0) : null; /* 기준 위치가 없으면 거리·도보 표시 안 함 */ const f0 = { ...defaultFilter(), menu: S.filter.menu };
    const e = { ...(EN.evalStore(i, f0) || { i, size: null, ss: EN.storeSizes(i, f0.menu), reason: null, t: EN.taste(i) }), d };
    return storeCard(e, 0, R0 != null && d > Radius.SEARCH_M);
  }).join('');
  return topBar('즐겨찾기', { sub: '이 기기에만 저장 · ' + (manual() ? '선택 지역 기준 거리' : '현재 위치 기준 거리'), extra: `<p class="sub" style="padding-top:2px">${EX_NOTICE}</p>` }) + `<div class="scroll" data-keep="fav">${b}</div>`;
}

// ---------- 정보·문서 ----------
const cstate = c => ({ agree: '동의', deny: '동의 안 함', withdrawn: '철회함' }[c.loc] || '-') + (c.age === 'u14' ? ' (만 14세 미만)' : '');
const MAPTXT = "앱 안 지도는 없어요. '길 안내'를 누르면 고른 외부 지도 앱(네이버 지도·카카오맵·TMAP·Google 지도 등)을 열고 매장 위치(좌표·상호)만 전달해요. 내 위치 좌표는 보내지 않아요.";
const DOCS = {
  terms: ['서비스 이용약관', '문안 확정 전 · 정식 출시 전 변호사 검토\n\n· 로그인 없이 이용, 익명 기기 ID 사용\n· 이용자 별점·제보의 이용 허락 범위 (문안 자리)\n· 다른 서비스에서 복사한 정보 제보 금지, 자체 DB 무단 수집 금지\n· 권리침해 신고 → 소명 확인 → 정정 또는 30일 이내 임시조치 → 통지 → 앱 안 공시(정보통신망법 제44조의2)\n· 포괄 면책 조항을 두지 않아요'],
  lbs: ['위치기반서비스 이용약관', `문안 확정 전\n\n· 개인위치정보는 기기 안에서 거리 계산에만 쓰고 서버·지도 앱·광고로 보내거나 저장하지 않아요\n· ${MAPTXT}\n· 동의는 선택이며 언제든 철회할 수 있어요\n· 감독기관: 방송미디어통신위원회`],
  privacy: ['개인정보처리방침', `문안 확정 전\n\n· 수집: 익명 기기 ID, 별점, 제보·신고 내용, 제출 날짜\n· 수집 안 함: 이름·전화번호·이메일·광고 ID·위치 좌표\n· 외부 지도 앱: ${MAPTXT}\n· 보유·파기: (확정 전)\n· 광고와 광고 SDK가 없어요\n· 문의처: (확정 전) · 감독기관: 개인정보보호위원회`],
  policy: ['별점 운영정책', '1. 평가 자격: 앱을 쓰는 기기, 해당 매장 100m 안 현장 확인(기기 안에서만 판정), 기기당 매장 1개(수정 가능, 재등록 30일 후). 이해관계자는 평가할 수 없어요.\n2. 노출 기간: 최근 12개월 별점을 게시하고 평균에 반영해요.\n3. 계산 방식: 평균 + 베이지안 보정(브랜드 평균 또는 개인 카페 평균). 별점 5개 미만은 \'별점 부족\'.\n4. 삭제·보류 기준: 스팸, 현장 확인 우회, 자동화 의심, 이해관계자 평가, 복사한 정보일 때만. 점수가 낮다는 이유로 지우지 않아요.\n5. 이의제기: 앱 안 신고 창구, 영업일 3일 안 검토(초기값).\n6. 보상 없음: 별점·제보에 대가를 주지 않아요.\n7. 기록 보관: 처리 기록 보관(기간 확정 전).\n8. 임시조치: 권리침해 신고 → 소명 확인 → 정정 또는 30일 이내 임시조치 → 통지 → 앱 안 공시.'],
  criteria: ['추천 기준 설명 · 점수 기반 추천', '점수 기반 추천(거리·메뉴판 가격·앱 이용자 별점 가중합)이에요. 반경 1km 안 매장만 점수를 계산해요(별점·가격 제보의 현장 확인은 별도 규칙으로 매장 100m 안).\n\n· 균형: 거리 0.4 · 가격 0.3 · 별점 0.3\n· 가까운 곳: 거리순 정렬\n· 가성비: 가격 80% + 이용자 별점 20%(별점 5개 이상일 때). 가격 점수 = (목록 최고가 − 가격)/(최고가 − 최저가), 거리는 반영 안 함\n· 이용자 별점: 0.2 · 0.2 · 0.6\n\n· 거리: 1 − 거리/1km (기기 안 직선거리, 앱 안 지도 없음)\n· 가격: 1 − (같은 메뉴의 12개 브랜드 메뉴판 가격 중 백분위). 모집단 고정, 용량 환산 없음.\n· 별점: 베이지안 보정 (v/(v+m))·R + (m/(v+m))·C, m=10. 별점 5개 미만은 \'별점 부족\'.\n· 결측: 없는 항목의 가중치는 나머지에 비례 재분배하고 \'정보 부족\' 배지. 모든 정렬에서 선택 메뉴 가격이 없는 매장은 순위에 넣지 않고 맨 아래 \'가격 정보 없음\' 묶음에 같은 정렬 순서로 보여줘요(3km 대체 목록도 동일).\n· 필터는 결과를 걸러낼 뿐 정렬을 바꾸지 않아요.'],
  sources: ['데이터 출처·기준일 · 제휴 없음 · 광고 없음', `· 매장(상호·주소·좌표): 소상공인시장진흥공단 상가(상권)정보, 기준일 2026-06-30, 소분류 I21201 '카페'. Beta 1.8.3에서 추가된 매장 40,749곳: 행정안전부 휴게음식점 인허가 (data.go.kr 15006730) 기준일 2026-10-14(영업/정상, 업태 커피숍 등 카페). 전국 파일 하나를 처음 한 번 받아 기기에 저장하고, 모든 사용자가 같은 파일을 써요(위치에 따라 받는 파일이 달라지지 않아요).\n· 개인 카페는 분류 규칙에 따른 추정이라 '개인 카페(추정)'으로 표시해요.\n· 브랜드 기본 가격: 예시 가격(확인 전) — 12개 브랜드 공식 사이트가 가격을 게시하지 않아 매장 메뉴판으로 확인 전이에요.\n· 용량: 공식 게시값만 표시(빽다방 아메리카노·라떼, 할리스 R/G/V, 폴바셋 룽고), 나머지는 미공개.\n· 개인 카페 가격: 착한가격업소 공공데이터(2026-06-30 기준) 메뉴판 가격, 용량 미공개. 음료가 아닌 메뉴는 비교·필터·점수에서 빼요.\n· 별점은 예시 데이터예요.\n· 지도: ${MAPTXT}\n· 등록된 브랜드·카페와 제휴 관계가 없어요. 브랜드 로고·메뉴 사진은 쓰지 않아요.`],
};
function InfoScreen() {
  const items = [['terms', '서비스 이용약관 (문안 확정 전)'], ['lbs', '위치기반서비스 이용약관 (문안 확정 전)'], ['privacy', '개인정보처리방침 (문안 확정 전)'], ['policy', '별점 운영정책'], ['criteria', '추천 기준 설명 (점수 기반 추천)'], ['sources', '데이터 출처·기준일 · 제휴 없음 · 광고 없음'], ['withdraw', '개인위치정보 동의 관리·철회'], ['oss', '오픈소스 라이선스 (글꼴·아이콘)']];
  let b = items.map(([k, t]) => listRow(t, () => go('doc/' + k))).join('') + listRow(Promo185.SECTION, () => go('promos')) + listRow('브랜드·업주 정보 수정·삭제·노출 중단 요청', () => go('report/-1/d'));
  b += `<div style="height:12px"></div><p>매장 DB: 상가정보 기준일 2026-06-30 + 인허가(data.go.kr 15006730) 기준일 2026-10-14 · ${EN ? EN.db.size.toLocaleString('ko-KR') + '곳 기기 저장됨' : '불러오는 중'}</p><p>위치 동의: ${cstate(S.consent)}</p>
    <p>내 제출 기록: ${S.outbox.length}건 (서버 미연결 베타: 이 기기에만 보관)</p><p>권한: 위치(선택)만 사용 · 광고 ID·분석 도구 없음 · 외부 서버 요청 없음(앱 파일·전국 DB를 처음 한 번 받기만 함)</p><p>개인정보 문의: (운영자 이메일 확정 전)</p>`;
  return topBar('정보', { sub: `AI Coffee Web Beta ${VERSION}` }) + `<div class="scroll" data-keep="info">${b}</div>`;
}
let OFL = null;
const termsLinks = () => !Data182.STATUS.length ? '' : h3('원두·맛 정보 (브랜드 공식 홈페이지 기준)') + sub('원문은 싣지 않고 일치한 태그만 써요.') + Data182.STATUS.map(([b, c]) => { const t = Data182.TERMS.find(x => x.brand === b);
  return `<div class="rowc termsrow" style="min-height:48px"><p style="flex:1">${esc(b)} · ${c ? '확인 ' + Seasonal.md(c) : '미확인'}</p>${t && t.termsUrl ? `<a class="txtbtn c termslink" style="min-height:48px;display:inline-flex;align-items:center" href="${esc(t.termsUrl)}" target="_blank" rel="noopener noreferrer">약관 보기 ›</a>` : '<span class="sub">약관 미확인</span>'}</div>`; }).join('');
function DocScreen(name) {
  if (name === 'withdraw') {
    let b = `<p class="b" style="padding-top:12px">현재 상태: ${cstate(S.consent)}${S.consent.date ? ` (${S.consent.date})` : ''}</p>` + box('<p>철회하면 위치 기능이 꺼지고 주변 매장 찾기를 쓸 수 없어요(메뉴 비교·즐겨찾기는 가능). iPhone 설정 › 개인정보 보호 및 보안 › 위치 서비스 › Safari 웹 사이트에서 위치 권한도 끌 수 있어요.</p>');
    if (S.consent.loc === 'agree') b += btn('개인위치정보 이용 동의 철회', () => { A.withdraw(); go('p02a'); });
    else if (S.consent.age !== 'u14') b += btn('위치 이용 켜기', () => go('c02'));
    b += `<div style="height:12px"></div>` + btn('만 14세 확인 다시 하기', () => { A.ageReset(); go('c02'); });
    return topBar('개인위치정보 동의 관리', { onBack: back }) + `<div class="scroll">${b}</div>`;
  }
  if (name === 'oss') {
    if (OFL == null) { OFL = '불러오는 중…'; fetch('licenses/OFL-NanumSquareRound.txt').then(r => r.text()).then(t => { OFL = t; render(); }).catch(() => { OFL = '라이선스 파일을 읽지 못했어요: licenses/OFL-NanumSquareRound.txt'; render(); }); }
    const b = box('<p class="b">글꼴: 나눔스퀘어라운드 (NanumSquareRound)</p>' + sub('Regular·Bold·ExtraBold · © NAVER Corporation · SIL Open Font License 1.1 · 원본 그대로 포함(수정·서브셋 없음, 이 사이트에서 직접 제공) · 글꼴 단독 판매 불가'), 'notice', 'margin-top:12px')
      + box('<p class="b">아이콘</p>' + sub('앱에서 직접 그린 SVG(외부 아이콘 파일·라이브러리 없음)'), 'notice')
      + box('<p class="b">프로그램</p>' + sub('외부 라이브러리·프레임워크·CDN 없이 작성(바닐라 JavaScript)'), 'notice')
      + h3('SIL Open Font License 1.1 전문') + `<p class="pre sub" style="color:var(--text);padding-bottom:16px">${esc(OFL)}</p>`;
    return topBar('오픈소스 라이선스', { onBack: back }) + `<div class="scroll">${b}</div>`;
  }
  const d = DOCS[name] || ['문서', '없는 문서예요.'];
  const extra = '';
  return topBar(d[0], { onBack: back }) + `<div class="scroll"><p class="pre" style="padding-top:12px">${esc(d[1] + extra)}</p>${name === 'sources' ? termsLinks() : ''}</div>`;
}

// ---------- 동의 ----------
function C01() {
  return topBar('AI Coffee') + `<div class="scroll">${h2('앱 접근권한 안내')}<p class="b">필수 권한: 없음</p><p>선택 권한: 위치(정밀) — 주변 1km 매장 거리 계산용</p>
    ${sub('허용하지 않아도 시·구를 직접 골라 그 지역 중심 기준으로 매장을 찾을 수 있고, 메뉴 비교·즐겨찾기도 이용할 수 있어요. 주소 검색은 없어요.')}
    ${box(`<p class="pre">· 위치는 기기 안에서 거리 계산에만 쓰고 앱 밖(서버·지도 앱·광고)으로 보내지 않아요.
· ${MAPTXT}
· 매장 정보는 전국 파일 하나를 처음 한 번 받아 기기에 저장하고, 기기 안에서 계산해요. 어느 위치에서든 같은 파일을 받아요.
· 앱 파일과 전국 매장 파일을 받는 것 말고는 외부로 요청을 보내지 않아요.
· 위치 권한은 언제든 iPhone 설정에서 끌 수 있어요.</p>`)}
    ${h3('약관·정책 보기')}${listRow('서비스 이용약관 (문안 확정 전)', () => go('doc/terms'))}${listRow('개인정보처리방침 (문안 확정 전)', () => go('doc/privacy'))}${listRow('별점 운영정책', () => go('doc/policy'))}
    <p class="sub pre">수집: 익명 기기 ID, 별점, 제보·신고 내용, 제출 날짜 · 수집 안 함: 이름·전화번호·이메일·광고 ID·위치 좌표
AI Coffee는 등록된 브랜드·카페와 제휴 관계가 없어요. 광고와 광고 SDK가 없어요.</p>
    <div style="height:12px"></div>${btn('다음', () => go('c02'), 'pri')}</div>`;
}
const pair = (a, b, fa, fb) => `<div class="pair">${btn(a, fa)}${btn(b, fb)}</div>`;
function C02() {
  return topBar('만 14세 이상 확인', { onBack: back }) + `<div class="scroll"><div style="height:12px"></div><p>위치 기능을 쓰기 전에 나이를 확인해요. 응답은 이 기기에만 저장돼요.</p>${box('<p>만 14세 미만이면 위치 기능을 끄고, 메뉴 비교·즐겨찾기만 이용할 수 있어요.</p>')}
    ${pair('만 14세 미만이에요', '만 14세 이상이에요', () => { A.setAge('u14'); go('c02b'); }, () => { A.setAge('14+'); go('c03'); })}${sub('자기 신고 방식 (정식 출시 전 확인)', 'padding-top:8px')}</div>`;
}
const C02b = () => topBar('위치 기능 꺼짐') + `<div class="scroll"><div style="height:12px"></div><p>만 14세 미만은 위치 기능을 쓸 수 없어서 주변 매장 찾기를 이용할 수 없어요.</p>${box('<p>메뉴 비교·즐겨찾기는 이용할 수 있어요.</p>')}${btn('메뉴 비교 보기', () => go('compare'), 'pri')}</div>`;
function C03() {
  return topBar('위치 이용 동의', { onBack: back }) + `<div class="scroll">${h2('위치기반서비스 이용약관 · 개인위치정보 이용 동의')}<p class="pre">목적: 현재 위치 반경 1km 안 카페를 찾고 거리를 계산해요.

처리 방식: 위치 좌표는 기기 안에서만 계산에 쓰고, 서버·지도 앱·광고로 보내거나 저장하지 않아요. ${MAPTXT}

철회: 정보 탭 › 개인위치정보 동의 관리에서 언제든 철회할 수 있어요. iPhone 설정에서 위치 권한도 끌 수 있어요.

거부해도 시·구를 직접 골라 그 지역 중심 기준으로 매장을 찾을 수 있고(고른 지역은 저장하지 않아요), 메뉴 비교·즐겨찾기도 이용할 수 있어요.</p>${sub('위치기반서비스 이용약관 전문 (문안 확정 전) · 감독기관: 방송미디어통신위원회', 'padding-top:8px')}
    ${pair('동의하지 않음', '동의', () => { A.setLocConsent('deny'); resumeAfterConsent(false); go('p02a'); }, () => { A.setLocConsent('agree'); go('near'); resumeAfterConsent(true); })}${sub("동의하면 Safari가 위치 권한을 물어요. '허용'을 눌러 주세요.", 'padding-top:8px')}</div>`;
}
const P02a = () => topBar('위치 기능이 꺼져 있어요') + `<div class="scroll">${locationHelp()}</div>`;

// ---------- 별점·제보·신고 ----------
const cantBox = c => c.ok ? '' : box(`<p class="b">${c.code === 'R-03c' ? '제출 한도' : '지금은 제출할 수 없어요'}</p><p>${esc(c.msg)}</p>`, 'warn');
function rateContent(i, inSheet, st) {
  const mine = S.myRatings[i]; let h = inSheet ? h2(mine ? '별점 수정' : '별점 남기기') : '';
  if (!EN) return h + '<p>불러오는 중…</p>';
  const c = A.canSubmit(i);
  h += `<div class="rowc" style="padding-top:${inSheet ? 0 : 12}px;gap:6px"><p class="b">${esc(EN.db.name[i])}</p>${typeBadge(i)}</div>${cantBox(c)}<p style="padding-top:6px">이 매장은 어땠나요? (숫자 별점만, 텍스트 리뷰 없음)</p>
    <div class="flow" style="padding:10px 0">${[1, 2, 3, 4, 5].map(n => chip(`${n}★`, st.star === n, () => { st.star = n; render(); })).join('')}</div>
    ${box('<p class="pre">· 앱 이용자 별점이며 객관적인 맛 평가가 아니에요.\n· 기기당 매장 1개(수정 가능, 재등록 30일 후), 하루 5개까지.\n· 매장 100m 안에서만 제출돼요. 거리 판정은 기기 안에서만 하고 결과·위치는 보내지 않아요.\n· 운영자·광고주·브랜드·매장 직원 등 이해관계자는 평가할 수 없어요. 별점에 대가를 주지 않아요.</p>')}
    ${btn(mine ? '수정하기' : '별점 남기기', () => { if (A.submitRating(i, st.star)) { UI.sheet = null; go('done/rating'); } }, 'pri', !(c.ok && st.star > 0))}`;
  return h;
}
const RATE = {};
function RateScreen(i) { const st = RATE[i] || (RATE[i] = { star: 0 }); return topBar(S.myRatings[i] ? '별점 수정' : '별점 남기기', { onBack: back }) + `<div class="scroll">${rateContent(i, false, st)}</div>`; }
const PRICE = {};
function PriceScreen(i) {
  let h = topBar('가격 제보', { onBack: back });
  if (!EN) return h + '<div class="scroll"><p>불러오는 중…</p></div>';
  const db = EN.db, c = A.canSubmit(i), fr = db.isFr(i);
  const st = PRICE[i] || (PRICE[i] = { sel: 0, price: '', size: '모름' });
  const opts = MenuTable.KEYS.flatMap(k => { const ss = EN.storeSizes(i, k); if (ss && ss.notSold) return [];
    return fr && ss && ss.list.length ? ss.list.map(z => [k, z.n, `${MenuTable.menuName(k)} · ${z.n} · ${MenuTable.mlText(z)}`]) : [[k, '', MenuTable.menuName(k)]]; });
  const ok = () => c.ok && parseInt(st.price, 10) > 0;
  const b = `<div class="rowc" style="padding-top:12px;gap:6px;flex-wrap:wrap"><p class="b">${esc(db.name[i])}</p>${typeBadge(i)}${S.loc ? `<span> · ${Geo.distText(Geo.dist(db, i, S.loc))}</span>` : ''}</div>${cantBox(c)}
    ${h3('메뉴 선택')}<div class="flow tall">${opts.map((o, n) => chip(o[2], st.sel === n, () => { st.sel = n; render(); })).join('')}</div>
    ${!fr ? h3('사이즈 (선택)') + `<div class="flow tall">${['모름', '작은 사이즈', '큰 사이즈'].map(z => chip(z, st.size === z, () => { st.size = z; render(); })).join('')}</div>` : ''}
    <label class="field" style="margin-top:10px"><span class="lab">이 매장에서 실제로 본 가격(원)</span><input inputmode="numeric" placeholder="예: 3100" value="${esc(st.price)}" data-in="price" data-i="${i}"></label>
    ${box('<p class="pre">· 할인·멤버십 가격이 아니라 메뉴판에 적힌 가격을 알려 주세요.\n· 서로 다른 기기에서 같은 가격 제보가 2건 이상 모이면 \'제보 가격\'으로 표시돼요(운영자 검수). 1건이면 \'제보 1건 확인 중\'.\n· 1,000원 미만·15,000원 초과는 \'검수 대기\'로 가요.\n· 매장 100m 안에서만 제출돼요. 하루 최대 5건.</p>')}
    ${listRow('메뉴판 정보 자체가 틀렸나요? 메뉴·가격·용량 오류 제보', () => go(`report/${i}/b`))}
    ${btn('제보하기', () => { const o = opts[st.sel]; const r = A.submitPrice(i, o[0], fr ? o[1] : st.size, parseInt(st.price, 10)); if (r) go('done/' + r); }, 'pri', !ok(), 'id="priceSubmit"')}`;
  UI.priceOk = () => c.ok && parseInt(PRICE[i].price, 10) > 0;
  return h + `<div class="scroll">${b}</div>`;
}
const RTYPES = {
  a: ['폐점·이전 / 매장 정보 오류', ['폐업·없는 매장', '다른 곳으로 이전', '카페 유형 오류(개인↔프랜차이즈)', '카페가 아닌 업소', '상호·주소 오류']],
  b: ['메뉴·가격·용량 오류', ['메뉴판 가격이 달라요', '용량이 달라요', '없는 메뉴예요', '기타']],
  c: ['부적절한 별점·제보 신고 / 이의제기', ['실제와 다른 제보 가격', '이해관계자 별점', '짧은 시간 집중 평가', '보류·삭제 이의제기', '기타']],
  d: ['브랜드·업주 정보 수정·삭제·노출 중단 요청', ['정보 수정', '삭제·노출 중단', '권리침해 신고(임시조치)']],
};
const REP = {};
function ReportScreen(i, type) {
  const nm = EN && i >= 0 && i < EN.db.size ? EN.db.name[i] : ''; const rt = RTYPES[type];
  let b = nm ? `<p class="b" style="padding-top:12px">${esc(nm)}</p>` : '';
  if (!rt) b += Object.entries(RTYPES).map(([k, v]) => listRow(v[0], () => go(`report/${i}/${k}`))).join('') + sub('운영자가 영업일 3일 안에 검토해요(초기값). 연락처는 받지 않아 결과를 개별로 알려 드리지 않아요.');
  else {
    const key = i + '/' + type; const st = REP[key] || (REP[key] = { reason: null, text: '' });
    b += h3(type === 'd' ? '요청 유형' : '사유') + `<div role="radiogroup">${rt[1].map(r => `<button class="radio" role="radio" aria-checked="${st.reason === r}" data-a="${act(() => { st.reason = r; render(); })}"><i></i><span>${esc(r)}</span></button>`).join('')}</div>
      <label class="field" style="margin-top:8px"><span class="lab">내용 (선택)</span><textarea maxlength="500" placeholder="개인정보(이름·전화번호)는 적지 말아 주세요" data-in="report" data-k="${key}">${esc(st.text)}</textarea></label>
      ${type === 'd' ? box('<p>권리침해 신고는 소명 확인 → 사실 오류면 정정 / 판단이 어려우면 30일 이내 임시조치 → 통지 → 앱 안 공시 순서로 처리해요. 회신 이메일: (운영자 이메일 확정 전)</p>') : ''}<div style="height:8px"></div>
      ${btn('접수하기', () => { A.submitReport(i, type, st.reason, st.text); delete REP[key]; go('done/report'); }, 'pri', st.reason == null)}`;
  }
  return topBar(rt ? rt[0] : '신고·정보 오류 제보', { onBack: back }) + `<div class="scroll">${b}</div>`;
}
function DoneScreen(k) {
  const m = { rating: ['별점을 남겼어요', '고마워요. 별점은 다음 별점 묶음 배포 때 반영돼요.'], price: ['가격 제보를 받았어요', '서로 다른 기기 2건 이상 일치하면 제보 가격으로 표시돼요.'],
    review: ['검수 대기로 접수했어요', '범위를 벗어난 가격이라 운영자가 확인해요.'], report: ['접수됐어요', '운영자가 영업일 3일 안에 검토해요(초기값). 결과는 개별 통지하지 않아요.'] }[k] || ['완료', ''];
  return topBar(m[0]) + `<div class="scroll"><p style="padding-top:12px">${m[1]}</p>${box('<p>베타: 서버가 아직 연결되지 않아 제출 내용은 이 기기에만 보관돼요(위치·현장 확인 결과·시각은 담지 않고 날짜만).</p>', 'ok')}${btn('돌아가기', backTwice, 'pri')}</div>`;
}

// ---------- 바텀시트 ----------
// ---------- 1.8.7 r4 시작 화면(index.html #splash)·안내창 ----------
const BOOT = { t0: performance.now(), timedOut: false, splashGone: false, promoDecided: false };
function hideSplash() { if (BOOT.splashGone) return; BOOT.splashGone = true; document.getElementById('splash')?.remove(); }
function maybePromoNotice() {
  if (BOOT.promoDecided || !BOOT.splashGone) return;
  if (!PromoData.ready && !PromoData.failed) { if (BOOT.timedOut) BOOT.promoDecided = true; return; } // 로딩 중: 5초 초과 실행이면 포기
  BOOT.promoDecided = true;
  let hideDate = null; try { hideDate = localStorage.getItem(PROMO_HIDE_KEY); } catch { }
  const d = PromoNotice.decide({ ready: PromoData.ready, failed: PromoData.failed, items: PromoData.items, now: new Date(), hideDate,
    otherOpen: !!UI.sheet, moved: UI.route.split('/')[0] !== 'near', timedOut: BOOT.timedOut });
  if (d) openSheet({ type: 'promoNotice', d });
}
function promoNoticeSheet(sh) {
  const d = sh.d; const ck = PromoData.checked;
  const hideToday = () => { try { localStorage.setItem(PROMO_HIDE_KEY, Promotions.kstToday(new Date())); } catch { } closeSheet(); };
  return { body: `<div class="sc promonotice"><h2 class="h2 pn-title" tabindex="-1">${esc(PromoNotice.TITLE)}</h2>
    <p class="pn-sum">진행 중인 공식 프로모션 ${d.n}개 · <span class="nowrap">브랜드 ${d.m}곳</span></p>
    <p class="pn-src">${esc(PromoNotice.SRC)}</p>${ck ? `<p class="pn-src">${esc(PromoNotice.checkedLine(ck))}</p>` : ''}
    <div class="pn-btns"><button class="pn-btn pri" data-a="${act(() => { UI.sheet = null; go('promos'); })}">${PromoNotice.OPEN}</button>
    <button class="pn-btn txt" data-a="${act(hideToday)}">${PromoNotice.HIDE_TODAY}</button>
    <button class="pn-btn sec" data-a="${act(closeSheet)}">${PromoNotice.CLOSE}</button></div></div>` };
}
function openSheet(s) { UI.sheet = s; UI.sheetScroll = 0; render(); }
function closeSheet() { UI.sheet = null; render(); }
const sheetBtns = (more) => `<div class="sheetbtns">${more ? `<button class="txtbtn c" data-a="${act(more[1])}">${esc(more[0])}</button>` : ''}<button class="txtbtn" data-a="${act(closeSheet)}">닫기</button></div>`;
function filterSheet(sh) {
  const d = sh.d; const set = p => { Object.assign(d, p); render(); };
  const R0 = ref(); const cnt = R0 && EN ? EN.countIn(R0, Radius.SEARCH_M, d, S.inc) : null;
  const pText = sh.pText ?? (d.pmax != null && ![2000, 3000, 4000, 5000].includes(d.pmax) ? String(d.pmax) : '');
  sh.pText = pText; sh.vminT = sh.vminT ?? (d.vmin != null ? String(d.vmin) : ''); sh.vmaxT = sh.vmaxT ?? (d.vmax != null ? String(d.vmax) : '');
  const vols = [[null, 400, '400mL 이하'], [null, 500, '500mL 이하'], [500, null, '500mL 이상'], [600, null, '600mL 이상']];
  const body = `<p class="b" style="font-size:var(--fs-17);padding:0 16px">필터 · ${MenuTable.menuName(d.menu)} 기준</p><div class="sc f16" data-keep="sheet">
    ${h3('카페 유형')}<div class="flow tall">${chip('전체', d.type === 'ALL', () => set({ type: 'ALL', brands: [] }))}${chip('프랜차이즈', d.type === 'FR', () => set({ type: 'FR' }))}${chip('개인 카페', d.type === 'IND', () => set({ type: 'IND', brands: [] }))}</div>
    ${h3('메뉴 종류 (하나만)')}<div class="flow tall">${MenuTable.KEYS.map(k => chip(MenuTable.menuName(k), d.menu === k, () => set({ menu: k }))).join('')}</div>
    ${h3('가격대')}<div class="flow tall">${chip('전체', d.pmax == null, () => { sh.pText = ''; set({ pmax: null }); })}${[2000, 3000, 4000, 5000].map(p => chip(`${won(p)} 이하`, d.pmax === p, () => { sh.pText = ''; set({ pmax: p }); })).join('')}</div>
    <label class="field"><span class="lab">직접 입력: 최대 가격(원)</span><input inputmode="numeric" value="${esc(sh.pText)}" data-in="pmax"></label>
    ${sub('매장 가격 = 확인된 제보 가격, 없으면 메뉴판 가격 · 용량 조건과 함께 쓰면 같은 사이즈 하나가 둘 다 만족해야 해요')}
    ${h3('용량대')}<div class="flow tall">${chip('전체', !F.volOn(d), () => { sh.vminT = ''; sh.vmaxT = ''; set({ vmin: null, vmax: null }); })}${vols.map(([a, b2, l]) => chip(l, d.vmin === a && d.vmax === b2, () => { sh.vminT = a != null ? String(a) : ''; sh.vmaxT = b2 != null ? String(b2) : ''; set({ vmin: a, vmax: b2 }); })).join('')}</div>
    <div class="vrange"><label class="field"><span class="lab">최소 mL</span><input inputmode="numeric" value="${esc(sh.vminT)}" data-in="vmin"></label><span style="padding-bottom:22px">~</span><label class="field"><span class="lab">최대 mL</span><input inputmode="numeric" value="${esc(sh.vmaxT)}" data-in="vmax"></label></div>
    ${h3('브랜드 (여러 개, 가나다순)')}<div class="flow tall">${Brands.SORTED.map(([code, b]) => chip(b, d.brands.includes(code), () => { const nb = d.brands.includes(code) ? d.brands.filter(x => x !== code) : [...d.brands, code]; set({ brands: nb, type: nb.length ? 'FR' : d.type }); }, { disabled: d.type === 'IND' })).join('')}</div>
    ${sub(d.type === 'IND' ? '개인 카페를 고르면 브랜드는 선택할 수 없어요.' : '브랜드를 고르면 카페 유형이 프랜차이즈로 바뀌어요.')}
    ${h3('이용자 별점 최소값 (보정 평점)')}<div class="flow tall">${chip('전체', d.rmin == null, () => set({ rmin: null }))}${[3.5, 4.0, 4.5].map(r => chip(`${f1(r)} 이상`, d.rmin === r, () => set({ rmin: r }))).join('')}</div>
    ${sub('거리 필터는 없어요(반경 1km 고정).', 'padding-bottom:8px')}</div>
    <div class="foot"><div style="flex:1">${btn('초기화', () => { sh.d = defaultFilter(); sh.pText = ''; sh.vminT = ''; sh.vmaxT = ''; render(); })}</div><div style="flex:2">${btn(cnt == null ? '적용' : `${cnt}곳 보기`, () => { UI.sheet = null; A.setFilter({ ...sh.d, brands: [...sh.d.brands] }); }, 'pri', false, 'id="applyBtn"')}</div></div>`;
  return { body, full: true };
}
function sheetContent() {
  const sh = UI.sheet; if (!sh) return null;
  if (sh.type === 'filter') return filterSheet(sh);
  if (sh.type === 'region') { // Beta 1.7 시·구 직접 고르기: 기기 안 시군구 중심점 목록만, 검색·네트워크 없음
    const all = EN.regions; const sidos = [...new Set(all.map(r => r.sido))];
    let b = `<div class="sc">${h2('시·구 직접 고르기')}${sub('고른 시·구의 중심점을 기준으로 1km 안 매장을 찾아요. 목록은 앱 안에 들어 있고, 고른 지역은 저장하거나 보내지 않아요.')}${h3('시·도')}<div class="flow tall">${sidos.map(d => chip(d, sh.sido === d, () => { sh.sido = d; render(); })).join('')}</div>`;
    if (sh.sido) b += h3(`${sh.sido} · 시·군·구`) + all.filter(r => r.sido === sh.sido).map((r, n) => (n > 0 ? '<hr>' : '') + listRow(r.sigungu, () => { A.setArea(r); if (UI.route !== 'near') go('near'); })).join('');
    return { body: b + sheetBtns() + '</div>', full: true };
  }
  if (sh.type === 'menu') return { body: `<div class="sc">${h2('메뉴 선택')}${sub('고른 메뉴의 메뉴판 가격으로 정렬·비교해요.')}<div class="flow tall" style="padding-top:8px">${MenuTable.KEYS.map(k => chip(MenuTable.menuName(k), S.filter.menu === k, () => { UI.sheet = null; A.setFilter({ ...S.filter, menu: k }); })).join('')}</div>${sheetBtns()}</div>` };
  if (sh.type === 'info') return { body: `<div class="sc">${h2(sh.title)}${sh.lines.map(l => `<p class="t15" style="padding:4px 0">· ${esc(l)}</p>`).join('')}${sheetBtns(sh.more)}</div>` };
  if (sh.type === 'nearInfo') return { body: `<div class="sc">${h2('현재 기준')}<p class="b">메뉴: ${MenuTable.menuName(S.filter.menu)}</p><div class="flow tall" style="padding-top:6px">${MenuTable.KEYS.map(k => chip(MenuTable.menuName(k), S.filter.menu === k, () => A.setFilter({ ...S.filter, menu: k }))).join('')}</div>
    <p style="padding-top:10px">반경: 1km 고정 · 거리 필터 없음 · 1km 안에 없으면 3km 안 가장 가까운 3곳</p><p style="padding-top:4px">정렬: ${Presets[S.preset].short.replace(/\(기본\)$/, '')} · ${Presets[S.preset].sort}</p>
    ${h3('가격·별점 안내')}${[EX_PRICE_NOTICE, ...DATA_NOTICE].map(l => `<p class="t15" style="padding:3px 0">· ${esc(l)}</p>`).join('')}${sheetBtns(['점수 설명 ›', () => go('doc/criteria')])}</div>` };
  if (sh.type === 'report') return { body: `<div class="sc">${h2('정보 제보·신고')}${listRow('가격 제보 (이 매장에서 본 메뉴판 가격)', () => go(`price/${sh.i}`))}<hr>${listRow('별점·제보 신고 / 이의제기', () => go(`report/${sh.i}/c`))}<hr>${listRow('정보 오류 제보 (폐점·이전, 메뉴·가격·용량 오류)', () => go(`report/${sh.i}/x`))}${sheetBtns()}</div>` };
  if (sh.type === 'rate') return { body: `<div class="sc">${rateContent(sh.i, true, sh)}</div>`, full: true };
  if (sh.type === 'map') {
    const nm = EN.db.name[sh.i]; const menu = sh.tab === 'menu'; const photo = sh.tab === 'photo'; const hours = sh.tab === 'hours' || menu || photo; const apps = hours ? MapLinks.hoursSheet(S.mapApp) : MapLinks.sheet(S.mapApp);
    const tab = (t, label) => `<button role="tab" aria-selected="${t === (sh.tab || 'dir')}" data-a="${act(() => { sh.tab = t; render(); })}">${label}</button>`;
    const rows = apps.map((a, n) => `${n > 0 ? '<hr>' : ''}<button class="maprow" data-a="${act(() => hours ? launchHours(a.id, sh.i, menu, photo) : launchMap(a.id, sh.i))}"><span class="ic">${I.nav}</span><span class="lb">${a.label}</span>${a.id === S.mapApp ? badge('지난번 선택') : ''}<span class="numtxt">&nbsp;&nbsp;${hours ? MapLinks.HOURS_HINT : a.hint} ›</span></button>`).join('');
    return { body: `<div class="sc"><h2 class="h2 sheettitle">${esc(nm)}</h2><div class="sheettabs" role="tablist">${tab('dir', SHEET_TAB_DIR)}${tab('hours', SHEET_TAB_HOURS)}${tab('menu', SHEET_TAB_MENU)}</div>
      ${hours ? '' : sub('고른 지도 앱으로 이동해요. 매장 위치(목적지)만 전달하고 내 위치 좌표는 보내지 않아요. 출발지는 지도 앱이 현재 위치로 정해요.')}<div style="height:6px"></div>${rows}
      ${hours ? look187(sh.i, apps) : ''}
      ${hours ? `<p class="t15 hoursnote" style="padding-top:8px">${menu ? MENU_NOTE : photo ? PHOTO_NOTE : HOURS_NOTE}</p><p class="sub hourssrc" style="padding-top:2px">${menu ? MENU_SOURCE : photo ? PHOTO_SOURCE : HOURS_SOURCE}</p>` : sub('앱이 설치되어 있지 않으면 Apple 지도(웹)로 열어요.', 'padding-top:6px')}<div style="display:flex;justify-content:flex-end;padding-top:4px"><button class="txtbtn" data-a="${act(closeSheet)}">취소</button></div></div>` };
  }
  if (sh.type === 'link') { const r = sh.row; // Beta 1.8.6 P9 이동 확인(§7-3·§8-2): 버튼 전체 폭 세로, [이동하기] 맨 아래
    return { body: `<div class="sc p9sheet"><p class="p9ask">${esc(P9.ask(r.brand))}</p><p class="p9url">${esc(r.url)}</p><p class="sub">${P9.SHEET_NOTE}</p>${sh.failed ? `<p class="p9openfail">${P9.OPEN_FAIL}</p><button class="btn sec p9copy" data-a="${act(async () => { if (await copyText(r.url)) toast(P9.COPIED); })}">${P9.COPY}</button>` : ''}<div class="p9btns"><button class="btn p9cancel" data-a="${act(closeSheet)}">${P9.CANCEL}</button><button class="btn pri p9go" data-a="${act(() => launchLink(sh))}">${P9.GO}</button></div></div>` }; }
  if (sh.type === 'permHelp') return { body: `<div class="sc permhelp">${h2('위치 권한 켜는 방법')}${PERM_HELP_LINES.map(l => `<p class="t15" style="padding:4px 0">· ${esc(l)}</p>`).join('')}<p class="t15 b" style="padding-top:8px">${esc(PERM_HELP_NEXT)}</p>${sheetBtns()}</div>` }; // 닫기만, 다른 동작 없음
  if (sh.type === 'promoNotice') return promoNoticeSheet(sh);
  if (sh.type === 'a2hs') return { body: `<div class="sc">${h2('홈 화면에 추가')}<p class="t15">Safari 공유 → 홈 화면에 추가</p>${sub('홈 화면에서 열면 주소창 없이 앱처럼 쓸 수 있어요. 이 안내는 한 번만 보여 드려요.')}${sheetBtns()}</div>` };
  return null;
}

// Beta 1.8.7: 검색어 한 줄 + [위치로 보기](좌표 있을 때만) + 주소·[주소 복사](주소 있을 때만). 빈 값은 채우지 않고 숨김
function look187(i, apps) {
  const db = EN.db, nm = db.name[i], addr = db.addr[i] || '', lat = db.lat(i), lng = db.lng(i);
  const okCoord = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const q = MapSearch.query(nm, addr); let h = '';
  if (apps.length && q.trim()) h += `<p class="sub mapquery" style="padding-top:10px">${S187.QUERY_LABEL} <b>${esc(q)}</b></p>`;
  if (okCoord && apps.length) h += `<p class="sub looknote" style="padding-top:6px">${S187.LOOK_NOTE}</p><p class="looktitle">${S187.LOOK_HEAD}</p>` + apps.map(a => `<button class="btn sec lookbtn" data-id="${a.id}" data-a="${act(() => launchLook(a.id, i))}">${S187.look(a.id)}</button>`).join('');
  if (addr.trim()) h += `<p class="looktitle">${S187.ADDR_HEAD}</p><p class="mapaddr">${esc(addr)}</p><button class="btn sec copyaddr" data-a="${act(async () => { if (await copyText(addr)) toast(S187.COPIED); })}">${S187.COPY}</button>`;
  return h;
}
function launchLook(id, i) {
  const db = EN.db; const store = { lat: db.lat(i), lng: db.lng(i) };
  A.setMapApp(id); UI.sheet = null; render();
  let url; try { url = MapLinks.lookUrl(id, db.name[i], store); } catch { toast(HOURS_NOT_INSTALLED); return; }
  let left = false; const hide = () => { left = true; };
  document.addEventListener('visibilitychange', hide, { once: true }); window.addEventListener('pagehide', hide, { once: true }); window.addEventListener('blur', hide, { once: true });
  UI.lastHoursUrl = url;
  try { location.href = url; } catch { }
  setTimeout(() => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); window.removeEventListener('blur', hide);
    if (!left && document.visibilityState === 'visible') toast(HOURS_NOT_INSTALLED); }, 1500);
}

// ---------- 길 안내 실행 ----------
function launchMap(id, i) {
  const dest = { lat: EN.db.lat(i), lng: EN.db.lng(i) }, name = EN.db.name[i];
  A.setMapApp(id); UI.sheet = null; render();
  const apple = MapLinks.apple(dest, name);
  if (id === 'apple') { location.href = apple; return; }
  let left = false; const hide = () => { left = true; };
  document.addEventListener('visibilitychange', hide, { once: true }); window.addEventListener('pagehide', hide, { once: true }); window.addEventListener('blur', hide, { once: true });
  try { location.href = MapLinks.url(id, dest, name); } catch { /* 스킴 미지원 */ }
  setTimeout(() => {
    document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); window.removeEventListener('blur', hide);
    if (!left && document.visibilityState === 'visible') { toast('지도 앱을 열 수 없어 Apple 지도로 열어요'); location.href = apple; }
  }, 1500);
}
/** 영업시간·후기: 네이버(검색어만)·카카오(검색어+매장 좌표 p)로 넘김. 사용자 위치 없음. 앱이 안 열리면 미설치 안내만(다른 앱·웹으로 넘기지 않음) */
function launchHours(id, i, menu = false, photo = false) {
  const db = EN.db; const store = { lat: db.lat(i), lng: db.lng(i) };
  A.setMapApp(id); UI.sheet = null; render();
  let url; try { url = menu ? MenuLinks.url(id, db.name[i], db.addr[i], store) : photo ? PhotoLinks.url(id, db.name[i], db.addr[i], store) : MapLinks.hoursUrl(id, db.name[i], db.addr[i], store); } catch { toast(HOURS_NOT_INSTALLED); return; }
  let left = false; const hide = () => { left = true; };
  document.addEventListener('visibilitychange', hide, { once: true }); window.addEventListener('pagehide', hide, { once: true }); window.addEventListener('blur', hide, { once: true });
  UI.lastHoursUrl = url;
  try { location.href = url; } catch { /* 스킴 미지원 */ }
  setTimeout(() => {
    document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); window.removeEventListener('blur', hide);
    if (!left && document.visibilityState === 'visible') toast(HOURS_NOT_INSTALLED);
  }, 1500);
}
function toast(t) { UI.toast = t; render(); setTimeout(() => { UI.toast = null; render(); }, 2000); }

// ---------- 렌더 ----------
const root = document.getElementById('app');
function screenHtml() {
  const [r, a, b2] = UI.route.split('/');
  switch (r) {
    case 'c01': return C01(); case 'c02': return C02(); case 'c02b': return C02b(); case 'c03': return C03(); case 'p02a': return P02a();
    case 'taste': return TasteScreen();
    case 'compare': return CompareScreen(); case 'fav': return FavScreen(); case 'info': return InfoScreen(); case 'promos': return PromoScreen(); case 'brandlinks': return BrandLinksScreen();
    case 'doc': return DocScreen(a || ''); case 'store': return StoreScreen(parseInt(a, 10));
    case 'rate': return RateScreen(parseInt(a, 10)); case 'price': return PriceScreen(parseInt(a, 10));
    case 'report': return ReportScreen(parseInt(a, 10), b2 || ''); case 'done': return DoneScreen(a || '');
    default: UI.route = 'near'; return NearScreen();
  }
}
// Beta 1.8.6: 혜택 문구 2줄 접기 — 접힌 문구가 넘칠 때만 '더 보기' 표시
function foldCheck() { root.querySelectorAll('.promocard:not(.open)').forEach(c => { const b = c.querySelector('.foldbtn'); if (!b) return; const over = el => el && el.scrollHeight > el.clientHeight + 1; b.hidden = !(over(c.querySelector('.foldtxt')) || over(c.querySelector('.foldscope'))); }); }
export function render() {
  if (!S.loaded) return;
  const keep = {}; if (!UI.scrollReset) root.querySelectorAll('[data-keep]').forEach(el => { keep[el.dataset.keep] = el.scrollTop; });
  const sheetSc = document.querySelector('.sheet .sc'); const sheetTop = sheetSc ? sheetSc.scrollTop : 0;
  const ae = document.activeElement; const focusIn = ae && ae.dataset && ae.dataset.in ? ae.dataset.in : null;
  ACT = new Map(); actN = 0;
  const top = UI.route.split('/')[0]; const tabs = ['near', 'compare', 'fav', 'info'].includes(top);
  let html = `<main class="screen">${screenHtml()}</main>`;
  if (tabs) html += `<nav class="tabs" aria-label="하단 탭">${TABS.map(([r, on, off, l]) => `<button ${top === r ? 'aria-current="page"' : ''} data-a="${act(() => go(r))}"><span class="pill">${top === r ? on : off}</span>${l}</button>`).join('')}</nav>`;
  const sc = sheetContent();
  if (sc) html += `<div class="sheetwrap" data-a="${act(closeSheet)}"><div class="sheet ${sc.full ? 'full' : ''}" role="dialog" aria-modal="true" data-stop="1"><div class="grab"><i></i></div>${sc.body}</div></div>`;
  if (UI.toast) html += `<div class="toast" role="status">${esc(UI.toast)}</div>`;
  root.innerHTML = html;
  root.querySelectorAll('[data-keep]').forEach(el => { if (keep[el.dataset.keep] != null) el.scrollTop = keep[el.dataset.keep]; });
  const ns = document.querySelector('.sheet .sc'); if (ns && UI.sheetScroll === 0) { UI.sheetScroll = 1; } else if (ns) ns.scrollTop = sheetTop;
  if (focusIn) { const el = root.querySelector(`[data-in="${focusIn}"]`); if (el) { el.focus(); const v = el.value; try { el.setSelectionRange(v.length, v.length); } catch { } } }
  UI.scrollReset = false;
  foldCheck();
  if (tabs && UI.maybeA2hs) { UI.maybeA2hs = false; maybeA2hs(); }
  if (!BOOT.splashGone && (S.ready || S.dbError)) hideSplash(); // 데이터 준비 끝 → 바로 메인(인위 지연 없음)
  if (!BOOT.promoDecided && BOOT.splashGone && S.loaded) queueMicrotask(maybePromoNotice);
}
root.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || !root.contains(el)) return;
  if (el.classList.contains('sheetwrap') && e.target !== el) return; // 시트 안 클릭은 닫지 않음
  const fn = ACT.get(el.dataset.a); if (fn) { e.preventDefault(); fn(); }
});
root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); e.target.click(); } if (e.key === 'Escape' && UI.sheet) closeSheet(); });
root.addEventListener('input', e => {
  const el = e.target; const k = el.dataset.in; if (!k) return;
  const digits = (n) => el.value.replace(/\D/g, '').slice(0, n);
  const num = t => { const v = parseInt(t.slice(0, 6), 10); return v > 0 ? v : null; };
  if (k === 'pmax' || k === 'vmin' || k === 'vmax') {
    const sh = UI.sheet; const t = digits(k === 'pmax' ? 6 : 4); el.value = t;
    if (k === 'pmax') { sh.pText = t; sh.d.pmax = num(t); } else { sh[k + 'T'] = t; sh.d[k] = num(t); }
    render();
  } else if (k === 'price') { const i = +el.dataset.i; const t = digits(6); el.value = t; PRICE[i].price = t; const b = document.getElementById('priceSubmit'); if (b) b.disabled = !UI.priceOk(); }
  else if (k === 'report') { REP[el.dataset.k].text = el.value.slice(0, 500); }
});

// ---------- 홈 화면 추가 안내(Safari, 독립 실행이 아닐 때 1회) ----------
function maybeA2hs() {
  const ua = navigator.userAgent; const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let shown = false; try { shown = localStorage.getItem(LS_A2HS) === '1'; } catch { }
  if (safari && !standalone && !shown && !UI.sheet) { try { localStorage.setItem(LS_A2HS, '1'); } catch { } openSheet({ type: 'a2hs' }); }
}

// ---------- 시작 ----------
export async function start() {
  if (CSS.supports('font', '-apple-system-body') && CSS.supports('-webkit-touch-callout', 'none')) document.documentElement.classList.add('ios');
  const big = () => document.documentElement.classList.toggle('big', isBig());
  restore(); big(); Data182.load().then(() => { MM.key = null; render(); }); PromoData.load().then(render); LinkData.load().then(render); window.addEventListener('resize', () => { big(); render(); });
  const h = location.hash.replace(/^#\//, '');
  UI.route = S.consent.age == null ? 'c01' : (h && !h.startsWith('c0') ? h : 'near');
  history.replaceState({ depth: 0 }, '', '#/' + UI.route);
  UI.maybeA2hs = true;
  setTimeout(() => { if (!BOOT.splashGone) { BOOT.timedOut = true; hideSplash(); render(); } }, PromoNotice.CAP_MS); // 5초 상한: 메인 로딩 상태로, 안내창 없음
  render();
  try { EN = await loadDb(); S.ready = true; } catch (e) { S.dbError = '매장 DB를 읽지 못했어요 (' + (e && e.message ? e.message : e) + ')'; }
  render();
}
