// AI Coffee Web Beta 1.8 — 순수 로직(DOM 없음). Android Beta 1.8 data/*.kt, domain/*.kt를 그대로 옮김.
// 위치 좌표는 인자로만 받고 저장·전송·로그하지 않음.

// ---------- CSV (Csv.kt) ----------
export const Csv = {
  parse(text) {
    const s = text.replace(/^\uFEFF/, '');
    const out = []; let row = []; let cell = ''; let q = false; let i = 0; let lineStart = true;
    while (i < s.length) {
      const c = s[i];
      if (lineStart && !q && c === '#') { while (i < s.length && s[i] !== '\n') i++; i++; continue; }
      lineStart = false;
      if (q && c === '"' && i + 1 < s.length && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = !q;
      else if (!q && c === ',') { row.push(cell); cell = ''; }
      else if (!q && (c === '\n' || c === '\r')) {
        if (c === '\r' && i + 1 < s.length && s[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (!(row.length === 1 && row[0] === '')) out.push(row);
        row = []; lineStart = true;
      } else cell += c;
      i++;
    }
    if (cell !== '' || row.length) { row.push(cell); out.push(row); }
    return out;
  },
  records(text) {
    const rows = Csv.parse(text); if (!rows.length) return [];
    const h = rows[0].map(x => x.trim());
    return rows.slice(1).map(r => { const o = {}; h.forEach((k, j) => { o[k] = (r[j] ?? '').trim(); }); return o; });
  },
};

// ---------- Brands / MenuTable (MenuTable.kt) ----------
export const Brands = {
  ALL: ['스타벅스', '투썸플레이스', '이디야', '메가MGC커피', '컴포즈커피', '빽다방', '할리스', '폴바셋', '커피빈', '파스쿠찌', '하삼동커피', '텐퍼센트커피'],
};
{ const col = new Intl.Collator('ko'); Brands.SORTED = Brands.ALL.map((b, i) => [i + 1, b]).sort((a, b) => col.compare(a[1], b[1])); }

export const EXAMPLE = '예시 가격(확인 전)';
const intOrNull = v => { if (v == null || !/^[+-]?\d+$/.test(v)) return null; return parseInt(v, 10); };

export class BrandPriceTable {
  constructor(rows) { this.rows = rows; this.byBrand = new Map(); for (const r of rows) { if (!this.byBrand.has(r.brand)) this.byBrand.set(r.brand, []); this.byBrand.get(r.brand).push(r); } }
  brandSizes(brand, key) {
    if (!Brands.ALL.includes(brand)) return null;
    const br = this.byBrand.get(brand) || [];
    if (!br.some(r => r.price != null)) return { list: [], missing: true };
    const [g, t0] = key.split('_'); const t = t0 === 'h' ? 'hot' : 'ice';
    const mine = br.filter(r => r.menu === g && r.temp === t);
    if (!mine.length) return { list: [], notSold: true };
    const priced = mine.filter(r => r.price != null);
    if (!priced.length) return { list: [], missing: true };
    return { list: priced.map(r => ({ n: r.size, ml: r.ml, oz: 0, p: r.price, src: r.source || (r.verified ? '메뉴판 확인' : EXAMPLE), shop: '', d: r.checked, verified: r.verified })) };
  }
  static parse(text) {
    return new BrandPriceTable(Csv.records(text).filter(r => (r.brand || '') !== '').map(r => {
      const ml = intOrNull(r.volume_ml);
      return { brand: r.brand, menu: r.menu || '', size: r.size || '', temp: (r.temp || '').toLowerCase(), price: intOrNull(r.price), ml: ml != null && ml > 0 ? ml : null,
        volumeSource: r.volume_source || '', source: r.source || '', verified: (r.verified || '').toLowerCase() === 'true', checked: r.checked_date || '' };
    }));
  }
}

const MENUS = { am: '아메리카노', la: '카페라떼', va: '바닐라라떼', cp: '카푸치노', cb: '콜드브루' };
export const MenuTable = {
  KEYS: ['am_h', 'am_i', 'la_h', 'la_i', 'va_h', 'va_i', 'cp_h', 'cp_i', 'cb_i'],
  table: new BrandPriceTable([]),
  install(t) { this.table = t; },
  menuName: k => MENUS[k.substring(0, 2)] + (k.endsWith('_h') ? ' Hot' : ' Ice'),
  mlText: s => s.ml != null ? (s.oz > 0 ? `${s.ml}mL(${s.oz}oz)` : `${s.ml}mL`) : '용량 미공개',
  brandSizes(brand, key) { return this.table.brandSizes(brand, key); },
};

// ---------- GoodPrice.kt ----------
const FOOD = /빵|쿠키|쿠기|크로플|와플|토스트|샌드|케이크|카스텔라|마카롱|뚱카롱|휘낭시에|피낭시에|마들렌|까눌레|스콘|파이|타르트|베이글|크루아상|프레첼|모카번|빙수|아이스크림|돈까스|돈가스|파스타|오므라이스|우동|샐러드|비빔밥|물회|회국수|죽|(?<!에)스프|오란다|꼬꼬랩|종일권|^원두$|요거트(?!.*(스무|에이드|라떼))/;
const BEV = /커피|아메리|마메리|라떼|라뗴|라테|티|차|에이드|주스|쥬스|스무디|스무티|모카|카푸|에스프레|에소프레|음료|우유|쉐이크|프라페|콜드|초코|생강|대추|유자|식혜|미숫가루|그라니따|샤케라또|아인슈패너|마차|오미자|캐모마일|얼그레이|허브|마끼아또|마키아또|드립|헤이즐넛|에스프레스|coffee|tea|latte/i;
const ICE = /ice|아이스|iced/i, HOT = /hot|핫|힛/i;
const QUAL = /\(|\)|hot|ice|iced|아이스|핫|힛|테이크아웃|테이크웃|takeout|포장|매장|다회용기\s*지참|\/|,|\s/gi;
const BASES = [['am', ['아메리카노', '아메리카도', '마메리카노']], ['la', ['카페라떼', '까페라떼', '카페라뗴', '카페라테', '라떼', '라테']], ['va', ['바닐라라떼', '바닐라라뗴']], ['cp', ['카푸치노']], ['cb', ['콜드브루', '콜드브루더치', '커피콜드브루']]];
export const GP_SOURCE = '착한가격업소 공공데이터, 2026-06-30 기준', GP_DATE = '2026-06-30';
export const isBeverage = m => !FOOD.test(m) && BEV.test(m);
export function keysOf(menu) {
  const base = menu.replace(QUAL, '');
  const e = BASES.find(([, set]) => set.includes(base)); if (!e) return [[], 9];
  const g = e[0]; const ice = ICE.test(menu), hot = HOT.test(menu);
  const keys = g === 'cb' ? ['cb_i'] : ice && hot ? [`${g}_h`, `${g}_i`] : ice ? [`${g}_i`] : [`${g}_h`];
  const prio = /테이크|takeout|포장|다회용기/i.test(menu) ? 2 : menu.includes('매장') ? 1 : 0;
  return [keys, prio];
}
export class GoodPriceTable {
  constructor(byStore, loadedRows = 0) { this.byStore = byStore; this.loadedRows = loadedRows; }
  has(i) { return this.byStore.has(i); }
  sizeFor(i, key) {
    const rows = (this.byStore.get(i) || []).filter(r => r.keys.includes(key)); if (!rows.length) return null;
    let best = rows[0]; for (const r of rows) if (r.prio < best.prio || (r.prio === best.prio && r.price < best.price)) best = r;
    return { n: best.menu, ml: null, oz: 0, p: best.price, src: GP_SOURCE, shop: '', d: GP_DATE, verified: true };
  }
  static load(text, nStores) {
    const m = new Map(); let rows = 0;
    for (const r of Csv.records(text)) {
      const id = r.store_id || ''; if (id.startsWith('sbiz:')) continue;
      const nS = id.replace(/^app:/, ''); const n = /^\d+$/.test(nS) ? parseInt(nS, 10) : null; const price = intOrNull(r.price_krw);
      if (!id.startsWith('app:') || n == null || n < 0 || n >= nStores || price == null || price <= 0) continue;
      const menu = r.menu || ''; const bev = isBeverage(menu); const [keys, prio] = bev ? keysOf(menu) : [[], 9];
      if (!m.has(n)) m.set(n, []); m.get(n).push({ menu, price, beverage: bev, keys, prio }); rows++;
    }
    return new GoodPriceTable(m, rows);
  }
}

// ---------- StoreDb.kt ----------
export const cellKey = (la, lo) => Math.floor(la / 1000) * 100000 + Math.floor(lo / 1000);
export class StoreDb {
  get size() { return this.brand.length; }
  isFr(i) { return this.brand[i] > 0; }
  brandName(i) { return this.brand[i] > 0 ? Brands.ALL[this.brand[i] - 1] : ''; }
  lat(i) { return this.latE5[i] / 1e5; }
  lng(i) { return this.lngE5[i] / 1e5; }
  static load(storesText, ratingsText) {
    const L = storesText.split('\n'); const head = L[0].split('|'); const n = parseInt(head[2], 10);
    const db = new StoreDb(); db.dbDate = head[1];
    const b = db.brand = new Uint8Array(n); const la = db.latE5 = new Int32Array(n); const lo = db.lngE5 = new Int32Array(n);
    const nm = db.name = new Array(n); const ad = db.addr = new Array(n); const grid = db.grid = new Map();
    for (let i = 0; i < n; i++) {
      const line = L[i + 1]; let p0 = line.indexOf('|'), p1 = line.indexOf('|', p0 + 1), p2 = line.indexOf('|', p1 + 1), p3 = line.indexOf('|', p2 + 1);
      b[i] = +line.slice(0, p0); la[i] = +line.slice(p0 + 1, p1); lo[i] = +line.slice(p1 + 1, p2);
      if (p3 < 0) { nm[i] = line.slice(p2 + 1); ad[i] = ''; } else { nm[i] = line.slice(p2 + 1, p3); ad[i] = line.slice(p3 + 1); }
      const k = cellKey(la[i], lo[i]); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i);
    }
    const v = db.ratingCount = new Int32Array(n); const r10 = db.rating10 = new Int32Array(n); const rep = db.rep = new Map();
    const sv = new Float64Array(13), sw = new Float64Array(13);
    if (ratingsText != null) {
      const R = ratingsText.split('\n');
      for (let i = 0; i < n; i++) {
        const l = R[i + 1]; if (l == null) break; if (l === '') continue;
        const c1 = l.indexOf(','), c2 = l.indexOf(',', c1 + 1);
        v[i] = parseInt(l.slice(0, c1), 10); r10[i] = parseInt(c2 < 0 ? l.slice(c1 + 1) : l.slice(c1 + 1, c2), 10);
        sv[b[i]] += v[i] * r10[i] / 10.0; sw[b[i]] += v[i];
        const x = c2 < 0 ? '' : l.slice(c2 + 1);
        if (x === 'P') rep.set(i, { pending: true });
        else if (x !== '') {
          const [kv, d = ''] = x.split('@'); const prices = {};
          for (const e of kv.split(';')) { const [k, pv] = e.split('='); prices[k] = parseInt(pv, 10); }
          rep.set(i, { prices, date: d });
        }
      }
    }
    let tv = 0, tw = 0; for (let k = 1; k <= 12; k++) { tv += sv[k]; tw += sw[k]; }
    const all = tw > 0 ? tv / tw : 3.8;
    db.brandAvg = Array.from({ length: 13 }, (_, k) => (k >= 1 && k <= 12 && sw[k] >= 30) ? sv[k] / sw[k] : all);
    db.indAvg = sw[0] > 0 ? sv[0] / sw[0] : all;
    return db;
  }
}

// ---------- Geo.kt ----------
export const Radius = { SEARCH_M: 1000, FALLBACK_M: 3000, FALLBACK_COUNT: 3, ONSITE_M: 100 };
const RAD = Math.PI / 180;
export const Geo = {
  haversine(la1, lo1, la2, lo2) {
    const dla = (la2 - la1) * RAD, dlo = (lo2 - lo1) * RAD;
    const a = Math.sin(dla / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin(dlo / 2) ** 2;
    return 12742000.0 * Math.asin(Math.sqrt(a));
  },
  dist(db, i, p) { return Geo.haversine(p.lat, p.lng, db.lat(i), db.lng(i)); },
  M_PER_DEG: 6371000.0 * Math.PI / 180,
  cellRange(p, radius) {
    const dLat = radius / Geo.M_PER_DEG * 1.001;
    const phiMax = Math.min(89.0, Math.abs(p.lat) + dLat);
    const dLng = Math.min(180.0, radius / (Geo.M_PER_DEG * Math.cos(phiMax * Math.PI / 180)) * 1.001);
    return [Math.floor((p.lat - dLat) * 100), Math.floor((p.lat + dLat) * 100), Math.floor((p.lng - dLng) * 100), Math.floor((p.lng + dLng) * 100)];
  },
  query(db, p, radius) {
    const [a0, a1, b0, b1] = Geo.cellRange(p, radius); const out = [];
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
      const arr = db.grid.get(a * 100000 + b); if (!arr) continue;
      for (const i of arr) { const d = Geo.dist(db, i, p); if (d <= radius) out.push({ i, d }); }
    }
    out.sort((x, y) => x.d - y.d);
    return out;
  },
  distText: d => d >= 1000 ? `약 ${(d / 1000).toFixed(1)}km` : `약 ${Math.max(10, Math.round(d / 10) * 10)}m`,
  /** Beta 1.8 도보 시간: 직선거리 원값 / 분당 67m → 올림, 최소 1분(Android Geo.walkMin과 같음) */
  WALK_M_PER_MIN: 67,
  walkMin: d => Math.max(1, Math.ceil(d / 67)),
  walkText: d => `도보 ${Geo.walkMin(d)}분(추정)`,
  /** 카드·상세 거리: '약' 없이(예: 320m · 도보 5분(추정)) */
  distPlain: d => Geo.distText(d).replace(/^약 /, ''),
  /** Beta 1.8.6: 도보 시간 표시 상한(반올림 전 직선거리 m, 공용 정답 shared/golden/walk-limit-1.8.6.json). 3000m 이하 표시(3.0km 포함), 넘으면 숨김 */
  WALK_LIMIT_M: 3000,
  showWalk: d => d <= 3000,
  distWalk: d => Geo.showWalk(d) ? `${Geo.distPlain(d)} · ${Geo.walkText(d)}` : Geo.distPlain(d),
};

// ---------- Engine.kt ----------
export const CafeType = { ALL: 'ALL', FR: 'FR', IND: 'IND' };
export const Reasons = ['NO_VOL', 'NO_PRICE', 'NO_TASTE'];
export const LBL = { NO_VOL: '용량 미공개', NO_PRICE: '가격 정보 없음', NO_TASTE: '별점 부족' };
export const defaultFilter = () => ({ type: 'ALL', menu: 'am_h', pmax: null, vmin: null, vmax: null, brands: [], rmin: null });
export const F = {
  priceOn: f => f.pmax != null,
  volOn: f => f.vmin != null || f.vmax != null,
  active: f => f.type !== 'ALL' || f.pmax != null || F.volOn(f) || f.brands.length > 0 || f.rmin != null,
  activeCount: f => [f.type !== 'ALL', f.pmax != null, F.volOn(f), f.brands.length > 0, f.rmin != null, f.menu !== 'am_h'].filter(Boolean).length,
  volOk: (f, ml) => ml != null && (f.vmin == null || ml >= f.vmin) && (f.vmax == null || ml <= f.vmax),
  eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
};
export const defaultInc = () => ({ NO_VOL: false, NO_PRICE: false, NO_TASTE: false });
export const Presets = {
  BAL: { short: '균형(기본)', sort: '거리·메뉴판 가격·앱 이용자 별점 종합', w: [0.4, 0.3, 0.3] },
  NEAR: { short: '가까운 곳', sort: '가까운 순', w: null },
  VAL: { short: '가성비', sort: '가격 80% + 이용자 별점 20%(별점 5개 이상일 때)', w: [0.2, 0.6, 0.2] }, // Beta 1.8.1: 정렬은 Engine.valScore, w는 표시 호환용
  TASTE: { short: '이용자 별점', sort: '별점 5개 이상 매장을 보정 별점 높은 순으로 먼저, 별점 부족 매장은 그 아래 가까운 순', w: [0.2, 0.2, 0.6] },
};
export const PRESET_ORDER = ['BAL', 'NEAR', 'VAL', 'TASTE'];
const minBy = (arr, fn) => arr.reduce((m, x) => (m == null || fn(x) < fn(m) ? x : m), null);

export class Engine {
  constructor(db, gp = new GoodPriceTable(new Map()), ind = null) { this.db = db; this.gp = gp; this.ind = ind; } // ind: Beta 1.8.3 IndPriceTable(beta183.js)
  storeSizes(i, key) {
    const db = this.db;
    if (db.isFr(i)) return MenuTable.brandSizes(db.brandName(i), key);
    if (this.gp.has(i)) { const s = this.gp.sizeFor(i, key); return s ? { list: [s] } : { list: [], none: true, gpOther: true }; }
    // Beta 1.8.3: 공식 출처로 확인된 개인 카페 가격(출처 URL·확인 날짜 있는 행만). 없으면 제보 → 가격 미확인(size null, 점수 계산 제외·0원 처리 없음)
    const ip = this.ind ? this.ind.sizeFor(db.name[i], db.addr[i], key) : null; if (ip) return { list: [ip] };
    const r = db.rep.get(i);
    if (!r) return { list: [], none: true };
    if (r.pending) return { list: [], pending: true };
    const p = r.prices[key];
    return p != null ? { list: [{ n: '기본', ml: null, oz: 0, p, src: '이용자 제보(일치 2건 이상·검수)', shop: '', d: r.date, verified: false }] } : { list: [], none: true };
  }
  taste(i) {
    const db = this.db; const v = db.ratingCount[i]; const r = db.rating10[i] / 10.0; const m = 10.0;
    const c = db.isFr(i) ? db.brandAvg[db.brand[i]] : db.indAvg;
    const adj = v > 0 ? v / (v + m) * r + m / (v + m) * c : null;
    return { v, r, adj, enough: v >= 5 };
  }
  evalStore(i, f) {
    const db = this.db;
    if (f.type === 'FR' && !db.isFr(i)) return null;
    if (f.type === 'IND' && db.isFr(i)) return null;
    if (f.brands.length && !f.brands.includes(db.brand[i])) return null;
    const ss = this.storeSizes(i, f.menu); const priced = ss ? ss.list : [];
    let size = null, reason = null; const pOn = F.priceOn(f), vOn = F.volOn(f);
    if (!priced.length) {
      if (ss && ss.notSold) return null;
      if (pOn || vOn) reason = 'NO_PRICE';
    } else {
      const cand = priced.filter(s => !pOn || s.p <= f.pmax);
      if (!cand.length) return null;
      if (vOn) {
        const cv = cand.filter(s => F.volOk(f, s.ml));
        if (cv.length) size = minBy(cv, s => s.p);
        else if (cand.some(s => s.ml == null)) { reason = 'NO_VOL'; size = minBy(cand.filter(s => s.ml == null), s => s.p); }
        else return null;
      } else size = pOn ? minBy(cand, s => s.p) : priced[0];
    }
    const t = this.taste(i);
    if (f.rmin != null) { if (!t.enough) reason = reason ?? 'NO_TASTE'; else if (t.adj < f.rmin) return null; }
    return { i, size, ss, reason, matched: pOn || vOn, t, d: 0, sc: null };
  }
  population(f) {
    const out = []; const pOn = F.priceOn(f), vOn = F.volOn(f);
    for (const b of Brands.ALL) {
      const ss = MenuTable.brandSizes(b, f.menu); if (!ss || !ss.list.length) continue;
      if (!pOn && !vOn) out.push(ss.list[0].p);
      else ss.list.forEach(s => { if ((!pOn || s.p <= f.pmax) && (!vOn || F.volOk(f, s.ml))) out.push(s.p); });
    }
    return out.sort((a, b) => a - b);
  }
  scoreOf(e, d, pop, w) { return Engine.score(d, e.size ? e.size.p : null, pop, e.t.enough ? e.t.adj : null, w); }
  computeNear(loc, f, preset, inc) {
    const inR = Geo.query(this.db, loc, Radius.SEARCH_M);
    const pop = this.population(f); const w = Presets[preset].w || Presets.BAL.w;
    const groups = { NO_VOL: [], NO_PRICE: [], NO_TASTE: [] }; const items = [];
    for (const h of inR) {
      const e0 = this.evalStore(h.i, f); if (!e0) continue;
      const e = { ...e0, d: h.d }; e.sc = this.scoreOf(e, h.d, pop, w);
      if (e.reason != null) { groups[e.reason].push(e); if (!inc[e.reason]) continue; }
      items.push(e);
    }
    let main = items.filter(e => e.reason == null); const extra = items.filter(e => e.reason != null);
    // Beta 1.8.1 가성비: 거리 비중 없음. 현재 목록의 가격 있는 매장 가격 범위로 연속 가격 점수(shared/golden/value-sort-1.8.1.md)
    if (preset === 'VAL') {
      const ps = main.filter(e => e.size).map(e => e.size.p);
      if (ps.length) { const lo = Math.min(...ps), hi = Math.max(...ps); main = main.map(e => e.size ? { ...e, sc: Engine.valScore(e.d, e.size.p, lo, hi, e.t.enough ? e.t.adj : null) } : e); }
    }
    const order = Engine.orderFor(preset);
    const noPriceFor = e => e.size == null;
    const noPrice = main.filter(noPriceFor).sort(order);
    main = main.filter(e => !noPriceFor(e)).sort(order);
    const fb = [];
    if (!inR.length) for (const h of Geo.query(this.db, loc, Radius.FALLBACK_M)) {
      if (fb.length >= Radius.FALLBACK_COUNT) break;
      const e = this.evalStore(h.i, f); if (e && e.reason == null) fb.push({ ...e, d: h.d });
    }
    const fbSorted = fb.filter(e => e.size != null).concat(fb.filter(e => e.size == null));
    return { baseCount: inR.length, main, extra, noPriceList: noPrice, groups, fallback: fbSorted };
  }
  /** 정렬 순서(Android Engine.orderFor와 같음). TASTE(Beta 1.7 F-2): 별점 5개 이상 먼저 — 보정 별점(adj) 높은 순, 같으면 거리순;
   *  그 아래 별점 5개 미만은 거리순. 가중합 미사용. 가격 없는 매장은 규칙 E 묶음. NEAR 거리순, BAL·VAL 점수순(동점 거리순) */
  static orderFor(preset) {
    if (preset === 'NEAR') return (a, b) => a.d - b.d;
    if (preset === 'TASTE') return (a, b) => {
      const ea = a.t.enough ? 0 : 1, eb = b.t.enough ? 0 : 1;
      if (ea !== eb) return ea - eb;
      if (ea === 0 && a.t.adj !== b.t.adj) return b.t.adj - a.t.adj;
      return a.d - b.d;
    };
    if (preset === 'VAL') return (a, b) => (b.sc.total - a.sc.total) || ((a.size ? a.size.p : Infinity) - (b.size ? b.size.p : Infinity)) || (a.d - b.d);
    return (a, b) => (b.sc.total - a.sc.total) || (a.d - b.d);
  }
  compareStores(loc, f, inc) {
    let noPriceInd = 0; const list = [];
    for (const h of Geo.query(this.db, loc, Radius.SEARCH_M)) {
      const e = this.evalStore(h.i, f); if (!e) continue;
      if (e.size == null) { if (!this.db.isFr(h.i)) noPriceInd++; continue; }
      if (e.reason != null && !inc[e.reason]) continue;
      list.push({ ...e, d: h.d });
    }
    list.sort((a, b) => (a.size.p - b.size.p) || (a.d - b.d));
    return [list, noPriceInd];
  }
  brandNearest(loc) {
    const m = new Map();
    for (const h of Geo.query(this.db, loc, Radius.SEARCH_M)) { const b = this.db.brand[h.i]; if (b > 0 && !m.has(b)) m.set(b, h.d); }
    return m;
  }
  countIn(loc, radius, f, inc) {
    return Geo.query(this.db, loc, radius).filter(h => { const e = this.evalStore(h.i, f); return e != null && (e.reason == null || inc[e.reason]); }).length;
  }
  relaxOptions(loc, f, inc, useFallback) {
    const pool = Geo.query(this.db, loc, useFallback ? Radius.FALLBACK_M : Radius.SEARCH_M);
    const cnt = (ff, ii = inc) => pool.filter(h => { const e = this.evalStore(h.i, ff); return e != null && (e.reason == null || ii[e.reason]); }).length;
    const o = [];
    if (F.priceOn(f)) o.push({ label: '가격 조건을 빼면', arg: 'price', n: cnt({ ...f, pmax: null }) });
    if (F.volOn(f)) { o.push({ label: '용량 조건을 빼면', arg: 'vol', n: cnt({ ...f, vmin: null, vmax: null }) }); if (!inc.NO_VOL) o.push({ label: '용량 미공개 포함하면', arg: 'incVol', n: cnt(f, { ...inc, NO_VOL: true }) }); }
    if (f.rmin != null) { o.push({ label: '별점 조건을 빼면', arg: 'rating', n: cnt({ ...f, rmin: null }) }); if (!inc.NO_TASTE) o.push({ label: '별점 부족 포함하면', arg: 'incTaste', n: cnt(f, { ...inc, NO_TASTE: true }) }); }
    if (f.brands.length) o.push({ label: '브랜드 조건을 빼면', arg: 'brand', n: cnt({ ...f, brands: [] }) });
    if (f.type !== 'ALL') o.push({ label: '카페 유형을 전체로 바꾸면', arg: 'type', n: cnt({ ...f, type: 'ALL', brands: [] }) });
    if (f.menu !== 'am_h') o.push({ label: '메뉴를 아메리카노 Hot으로 바꾸면', arg: 'menu', n: cnt({ ...f, menu: 'am_h' }) });
    return o.filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  }
  /** Beta 1.8.1 가성비 점수(Android Engine.valScore와 같음): priceScore=(maxP−p)/(maxP−minP)(같으면 1), ratingScore=보정 별점/5.
   *  별점 5개 이상 0.8·price + 0.2·rating, 5개 미만 0.8·price(재분배 없음). sd는 표시용 */
  /** Beta 1.8.1 '별점 반영' 표시(가성비 목록 전용, Android Engine.ratingBoostFlags와 같음): 별점 5개 이상이고 바로 아래 카드(다음 순위)가 더 쌀 때만 true. 같은 가격·마지막 카드는 false */
  static ratingBoostFlags(main) {
    const out = new Array(main.length).fill(false);
    for (let k = 0; k < main.length - 1; k++) { const p = main[k].size ? main[k].size.p : null, q = main[k + 1].size ? main[k + 1].size.p : null; if (main[k].t.enough && p != null && q != null && q < p) out[k] = true; }
    return out;
  }
  static valScore(d, p, minP, maxP, adj) {
    const pr = maxP === minP ? 1 : (maxP - p) / (maxP - minP); const rs = adj != null ? adj / 5 : null;
    return { total: 0.8 * pr + 0.2 * (rs ?? 0), sd: Math.max(0, 1 - d / Radius.SEARCH_M), sv: pr, st: rs, lacking: rs == null };
  }
  static valueScore(p, pop) {
    if (p == null || pop.length < 2) return null;
    const less = pop.filter(x => x < p).length;
    return Math.min(1, Math.max(0, 1.0 - less / (pop.length - 1)));
  }
  static score(d, price, pop, adj, w) {
    const sd = Math.max(0.0, 1 - d / Radius.SEARCH_M);
    const sv = Engine.valueScore(price, pop);
    const st = adj != null ? (adj - 1) / 4 : null;
    const parts = [[w[0], sd], [w[1], sv], [w[2], st]].filter(x => x[1] != null);
    const ws = parts.reduce((s, x) => s + x[0], 0);
    return { total: ws > 0 ? parts.reduce((s, x) => s + x[0] * x[1], 0) / ws : 0.0, sd, sv, st, lacking: sv == null || st == null };
  }
  static isOld(date, today = new Date()) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || ''); if (!m) return false;
    const a = Date.UTC(+m[1], +m[2] - 1, +m[3]); const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((b - a) / 86400000) > 60;
  }
}

export const SubmitRules = {
  canSubmit(gpsMode, distance, ratingsToday, pricesToday) {
    if (!gpsMode || distance == null) return { ok: false, code: 'R-03b', msg: '현재 위치를 확인하지 못했어요. 매장 반경 100m 안에서 현재 위치(정밀)를 확인한 뒤 제출해 주세요.' };
    if (distance > Radius.ONSITE_M) return { ok: false, code: 'R-03b', msg: `매장 100m 밖이에요(${Geo.distText(distance)}). 매장 근처에서 다시 시도해 주세요.` };
    if (ratingsToday >= 5 || pricesToday >= 5) return { ok: false, code: 'R-03c', msg: '오늘 제출 한도(별점 5개·제보 5건)를 넘었어요. 내일 다시 시도해 주세요.' };
    return { ok: true, code: '', msg: '' };
  },
  needsReview: p => p < 1000 || p > 15000,
};

// ---------- Beta 1.8.7 지도 검색어 규칙(Android domain/MapSearch187.kt와 같음, docs/map-search-rule-1.8.7.md · 정답 shared/golden/map-search-1.8.7.json) ----------
export const MapSearch = {
  AMBIG: new Set(['중구', '동구', '서구', '남구', '북구', '강서구', '고성군']),
  /** 법인 표기 고정 11개(plan M9). 정답 파일 corp_markers와 같아야 함 */
  CORP_MARKERS: ['㈜', '(주)', '주식회사', '유한회사', '농업회사법인', '합자회사', '합명회사', '협동조합', '사회적협동조합', '영농조합법인', '사단법인'],
  /** 짝 없는 괄호 기호: true=공백(CEO2 17:05 확정) */
  UNMATCHED_TO_SPACE: true,
  squash: s => s.trim().split(/\s+/).filter(Boolean).join(' '),
  stripCorp(x) { for (const c of [...MapSearch.CORP_MARKERS].sort((a, b) => b.length - a.length)) x = x.split(c).join(' '); return x; }, // 괄호 밖 법인 표기 → 공백(CEO2 17:05)
  corpOnly(c) { return MapSearch.stripCorp(c).trim() === '' || MapSearch.CORP_MARKERS.includes('(' + c.trim() + ')'); },
  /** plan M9(16:57): 가장 안쪽 ( )·[ ]부터 — 안이 법인 표기뿐이면 괄호째 삭제, 아니면 괄호 기호만 공백. 괄호 밖 법인 표기 삭제. 비면 DB 이름 */
  cleanName(name) {
    let s = String(name ?? '');
    for (let t; (t = s.replace(/\(([^()\[\]]*)\)|\[([^()\[\]]*)\]/g, (m, a, b) => { const c = a ?? b ?? ''; return MapSearch.corpOnly(c) ? ' ' : ` ${c} `; })) !== s;) s = t;
    if (MapSearch.UNMATCHED_TO_SPACE) s = s.replace(/[()\[\]]/g, ' ');
    s = MapSearch.squash(MapSearch.stripCorp(s));
    return s || String(name ?? '');
  },
  /** 시·도 약칭: plan M9 고정표 7개만(구현에서 만들지 않음) */
  SIDO_SHORT: { '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '대전광역시': '대전', '울산광역시': '울산', '강원특별자치도': '강원', '경상남도': '경남' },
  shortSido: t => MapSearch.SIDO_SHORT[t] ?? t, // 표에 없으면(전남광주통합특별시 등) 첫 단어 그대로(M9)
  sigungu(addr) {
    const t = String(addr ?? '').trim().split(/\s+/).filter(Boolean);
    if (!t.length) return '';
    if (t[0].startsWith('세종')) return '세종';
    if (t.length < 2 || !/[시군구]$/.test(t[1])) return '';
    if (t[1].endsWith('시') && t.length > 2 && t[2].endsWith('구')) return `${t[1]} ${t[2]}`;
    if (MapSearch.AMBIG.has(t[1])) return `${MapSearch.shortSido(t[0])} ${t[1]}`;
    return t[1];
  },
  query(name, addr) { const n = MapSearch.cleanName(name), g = MapSearch.sigungu(addr); return g ? `${n} ${g}` : n; },
};

// ---------- 길 안내 (MapApps.kt의 iOS판): 목적지(매장 좌표·상호)만. 사용자 좌표는 어떤 함수도 받지 않음 ----------
export const MapApps = [
  { id: 'naver', label: '네이버 지도', hint: '도보' }, { id: 'kakao', label: '카카오맵', hint: '도보' },
  { id: 'tmap', label: 'TMAP', hint: '위치' }, { id: 'google', label: 'Google 지도', hint: '도보' },
  { id: 'apple', label: 'Apple 지도', hint: '도보' }, // Android의 '다른 지도 앱(geo: 선택창)' 자리. iOS엔 시스템 선택창이 없어 Apple 지도로 대신함
];
export const MapLinks = {
  APPNAME: 'com.aicoffee.web',
  coord(v) { if (!Number.isFinite(v)) throw new Error('좌표 값이 올바르지 않아요'); return v.toFixed(6); },
  check(p) { if (!(p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180)) throw new Error('좌표 범위를 벗어났어요'); },
  ll(p) { MapLinks.check(p); return MapLinks.coord(p.lat) + ',' + MapLinks.coord(p.lng); },
  enc: s => encodeURIComponent(s),
  naver(dest, name) { MapLinks.check(dest); return `nmap://route/walk?dlat=${MapLinks.coord(dest.lat)}&dlng=${MapLinks.coord(dest.lng)}&dname=${MapLinks.enc(name)}&appname=${MapLinks.APPNAME}`; },
  kakao(dest) { return `kakaomap://route?ep=${MapLinks.ll(dest)}&by=foot`; },
  google(dest) { return `comgooglemaps://?daddr=${MapLinks.ll(dest)}&directionsmode=walking`; },
  /** TMAP: 공개 공식 문서 없음(Android도 geo: 인텐트로 대신함). iOS에서 널리 쓰이는 형식 rGoName/rGoX(경도)/rGoY(위도) — 목적지만, 출발지(rSt*) 없음 → 앱이 현재 위치를 출발지로. 실기기 확인 필요 */
  tmap(dest, name) { MapLinks.check(dest); return `tmap://route?rGoName=${MapLinks.enc(name)}&rGoX=${MapLinks.coord(dest.lng)}&rGoY=${MapLinks.coord(dest.lat)}`; },
  apple(dest, name) { return `https://maps.apple.com/?daddr=${MapLinks.ll(dest)}&q=${MapLinks.enc(name)}&dirflg=w`; },
  url(id, dest, name) { return id === 'naver' ? MapLinks.naver(dest, name) : id === 'kakao' ? MapLinks.kakao(dest) : id === 'tmap' ? MapLinks.tmap(dest, name) : id === 'google' ? MapLinks.google(dest) : MapLinks.apple(dest, name); },
  /** 순서(Android MapLinks.sheet와 같음): 지난번 선택 → 네이버·카카오·TMAP·Google → Apple(=Android '다른 지도 앱' 자리) */
  sheet(last) { const l = MapApps.find(a => a.id === last); return l ? [l, ...MapApps.filter(a => a !== l)] : MapApps.slice(); },
  // ---- Beta 1.8 [영업시간·후기 보기] 탭: 네이버·카카오만. 검색어 = 매장명 + 주소(DB 값), 카카오는 매장 좌표 p만. 사용자 위치는 받지 않음 ----
  HOURS_APPS: ['naver', 'kakao'], HOURS_HINT: '검색으로 열기', // 1.8.7 r3: 행 표시 '검색으로 열기 ›'
  // Beta 1.8.7: 검색어 = MapSearch.query(정리한 매장명 + 시·군·구). 인코딩은 Android URLEncoder와 같게(encJ) — 두 플랫폼 URL 동일
  encJ: s => encodeURIComponent(s).replace(/[!'()~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()),
  hoursQuery: (name, addr) => MapSearch.query(name, addr),
  naverSearch(name, addr) { return `nmap://search?query=${MapLinks.encJ(MapLinks.hoursQuery(name, addr))}&appname=${MapLinks.APPNAME}`; },
  kakaoSearch(name, addr, store) { return `kakaomap://search?q=${MapLinks.encJ(MapLinks.hoursQuery(name, addr))}&p=${MapLinks.ll(store)}`; },
  /** Beta 1.8.7 [위치로 보기](공식 URL Scheme): 카카오 look?p=매장좌표, 네이버 place?lat&lng&name&appname */
  kakaoLook(store) { return `kakaomap://look?p=${MapLinks.ll(store)}`; },
  naverPlace(store, name) { MapLinks.check(store); return `nmap://place?lat=${MapLinks.coord(store.lat)}&lng=${MapLinks.coord(store.lng)}&name=${MapLinks.encJ(name)}&appname=${MapLinks.APPNAME}`; },
  lookUrl(id, name, store) { if (id === 'naver') return MapLinks.naverPlace(store, name); if (id === 'kakao') return MapLinks.kakaoLook(store); throw new Error('위치로 보기는 네이버·카카오만 지원해요'); },
  hoursUrl(id, name, addr, store) {
    if (id === 'naver') return MapLinks.naverSearch(name, addr);
    if (id === 'kakao') return MapLinks.kakaoSearch(name, addr, store);
    throw new Error('영업시간 탭은 네이버·카카오만 지원해요');
  },
  /** 두 탭이 같은 '지난번 선택'을 씀. 지난번이 네이버·카카오면 맨 위, 아니면(TMAP 등) 네이버 → 카카오 */
  hoursSheet(last) { const base = MapApps.filter(a => MapLinks.HOURS_APPS.includes(a.id)); const l = base.find(a => a.id === last); return l ? [l, ...base.filter(a => a !== l)] : base; },
};

// ---------- 번들 파싱 ----------
export function parseBundle(text) {
  const out = {}; const parts = text.split('\n@@');
  if (!parts[0].startsWith('#AICWEB1')) throw new Error('DB 형식 오류');
  for (const p of parts.slice(1)) { const nl = p.indexOf('\n'); out[p.slice(0, nl)] = p.slice(nl + 1); }
  return out;
}
export function buildEngine(text) {
  const s = parseBundle(text);
  MenuTable.install(BrandPriceTable.parse(s.brand_prices));
  const db = StoreDb.load(s.stores, s.ratings);
  const en = new Engine(db, GoodPriceTable.load(s.good_price, db.size));
  en.regions = s.regions ? Regions.parse(s.regions) : [];
  en.indText = s.ind_prices || ''; // Beta 1.8.3: app.js가 IndPriceTable.parse로 설치(순환 import 회피)
  return en;
}

// ---------- Beta 1.7 수동 지역 선택: 시군구 중심점 목록(Android assets/regions.csv와 같은 내용, DB 파일 안 섹션) ----------
// 고른 지역은 메모리에만 두고 저장·전송하지 않음
export const Regions = {
  parse(text) { return Csv.parse(text).slice(1).filter(r => r.length >= 6).map(r => ({ code: r[0], sido: r[1], sigungu: r[2], latE5: +r[3], lngE5: +r[4], n: +r[5],
    get lat() { return this.latE5 / 1e5; }, get lng() { return this.lngE5 / 1e5; }, get label() { return this.sido + ' ' + this.sigungu; } })); },
  sidos(all) { return [...new Set(all.map(r => r.sido))]; },
  of(all, sido) { return all.filter(r => r.sido === sido); },
};

// ---------- Beta 1.8 매장 id 변환(DB r2 → r3). Android data/IdMigration.kt와 같은 규칙 ----------
export const ID_VER = 3;
/** 압축 변환표(지운 행 목록): 남은 행은 old − (old보다 작은 지운 행 수), 중복으로 합쳐진 행은 남긴 행의 새 id, 비커피 행은 없음(null) */
export function parseIdMap(text) {
  const lines = text.split('\n'); const h = lines[0].split('|');
  // Beta 1.8.3: '#AICIDMAP|rA|<옛 수>|rB|<새 수>' (B = A+1). r2→r3, r3→r4 같은 형식
  const fa = /^r(\d+)$/.exec(h[1] || ''), fb = /^r(\d+)$/.exec(h[3] || '');
  if (h[0] !== '#AICIDMAP' || !fa || !fb || +fb[1] !== +fa[1] + 1) throw new Error('id 변환표 형식 오류');
  const fromRev = +fa[1], toRev = +fb[1];
  const oldSize = +h[2], newSize = +h[4]; const removed = [], target = new Map();
  for (const l of lines.slice(1)) { if (!l) continue; const [a, b] = l.split(','); const o = +a; removed.push(o); if (b !== '' && b != null) target.set(o, +b); }
  removed.sort((x, y) => x - y); const rmSet = new Set(removed);
  const below = o => { let lo = 0, hi = removed.length; while (lo < hi) { const m = (lo + hi) >> 1; if (removed[m] < o) lo = m + 1; else hi = m; } return lo; };
  const map = old => {
    let o = old;
    for (let k = 0; k < 8; k++) {
      if (!Number.isInteger(o) || o < 0 || o >= oldSize) return null;
      if (!rmSet.has(o)) { const n = o - below(o); return n >= 0 && n < newSize ? n : null; }
      if (!target.has(o)) return null; o = target.get(o);
    }
    return null;
  };
  return { oldSize, newSize, fromRev, toRev, map, merged: o => target.has(o) };
}
/** 1.7 저장값(o)의 즐겨찾기·내 별점·제출함 매장 id를 새 id로. 변환표에 없는 id는 조용히 버림. o를 바꾸지 않고 새 객체 반환 */
export function migrateIds(o, idMap, to = ID_VER) {
  const ID_VER = to; // 이 단계를 마친 뒤 dbIdVer
  if ((+o.dbIdVer || 0) >= ID_VER) return { o, stats: null };
  const hasData = (Array.isArray(o.favs) && o.favs.length) || (o.myRatings && typeof o.myRatings === 'object' && Object.keys(o.myRatings).length) || (Array.isArray(o.outbox) && o.outbox.length);
  if (!hasData) return { o: { ...o, dbIdVer: ID_VER }, stats: null };
  const M = idMap(); const num = v => (typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+$/.test(v) ? +v : NaN);
  const favIn = Array.isArray(o.favs) ? o.favs : []; const favs = [];
  for (const v of favIn) { const n = M.map(num(v)); if (n != null && !favs.includes(n)) favs.push(n); }
  const rIn = o.myRatings && typeof o.myRatings === 'object' ? o.myRatings : {}; const rOut = {}; const from = {};
  for (const k of Object.keys(rIn)) {
    const r = rIn[k]; if (!r || typeof r !== 'object') continue; const old = num(k); const n = M.map(old); if (n == null) continue;
    const prev = rOut[n];
    if (prev) { const a = String(r.date || ''), b = String(prev.date || ''); if (a < b || (a === b && M.merged(old) && !M.merged(from[n]))) continue; }
    rOut[n] = r; from[n] = old;
  }
  const obIn = Array.isArray(o.outbox) ? o.outbox : []; const outbox = [];
  for (const r of obIn) {
    if (!r || typeof r !== 'object') continue;
    if (!('store' in r)) { outbox.push(r); continue; }
    const st = num(r.store); if (Number.isNaN(st)) continue;
    if (st < 0) { outbox.push(r); continue; } // 매장과 무관한 기록(store -1)은 그대로
    const n = M.map(st); if (n == null) continue; outbox.push({ ...r, store: n });
  }
  return { o: { ...o, favs, myRatings: rOut, outbox, dbIdVer: ID_VER },
    stats: { favs: [favIn.length, favs.length], ratings: [Object.keys(rIn).length, Object.keys(rOut).length], outbox: [obIn.length, outbox.length] } };
}
/** Beta 1.8.3: 단계 [[to, () => idMap], …]를 차례로(r2→r3 → r3→r4). 변환표 r 번호가 단계와 다르면 예외(호출 쪽에서 원래 값 유지) */
export function migrateIdsAll(o, steps) {
  for (let k = 1; k < steps.length; k++) if (steps[k][0] !== steps[k - 1][0] + 1) throw new Error('변환 단계 순서 오류');
  const stats = [];
  for (const [to, mk] of steps) {
    const r = migrateIds(o, () => { const m = mk(); if (m.toRev !== to || m.fromRev !== to - 1) throw new Error(`변환표 r${m.fromRev}→r${m.toRev} ≠ 단계 ${to}`); return m; }, to);
    o = r.o; if (r.stats) stats.push(r.stats);
  }
  return { o, stats };
}
