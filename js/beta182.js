// Beta 1.8.2 로직. Android domain/Beta182.kt와 같은 규칙(공용 정답 shared/golden/beta-1.8.2-cases.json).
import { MapLinks } from './core.js';

/** (a) 메뉴 보기: 네이버(query만)·카카오(query + 매장 좌표 p). 사용자 위치는 인자로 받지 않음 */
export const MenuLinks = {
  APPS: MapLinks.HOURS_APPS,
  naver: (name, addr) => MapLinks.naverSearch(name, addr),
  kakao: (name, addr, store) => MapLinks.kakaoSearch(name, addr, store),
  url(id, name, addr, store) {
    if (id === 'naver') return MenuLinks.naver(name, addr);
    if (id === 'kakao') return MenuLinks.kakao(name, addr, store);
    throw new Error('메뉴 보기는 네이버·카카오만 지원해요');
  },
};
/** (b) 시즌 메뉴: KST(UTC+9, 서머타임 없음) 날짜. 출시일 전 숨김, 종료일 당일까지 표시. 종료일 없음 = sale && checked 둘 다 있을 때만 */
export const Seasonal = {
  kstDate(ms) { return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); },
  isVisible(it, ms = Date.now()) {
    const d = Seasonal.kstDate(ms);
    if (it.start && d < it.start) return false;
    return it.end == null ? !!(it.sale && it.checked) : d <= it.end;
  },
  visible: (items, ms = Date.now()) => items.filter(it => Seasonal.isVisible(it, ms)),
  md: s => `${+s.slice(5, 7)}.${+s.slice(8, 10)}`,
  period: it => it.end == null ? `종료일 미정 · ${it.checked ? Seasonal.md(it.checked) : ''} 확인` : `${it.start ? Seasonal.md(it.start) + ' ~ ' : '~ '}${Seasonal.md(it.end)}까지`,
  endingSoon(it, ms = Date.now()) { if (!it.end) return false; const left = (Date.parse(it.end + 'T00:00:00Z') - Date.parse(Seasonal.kstDate(ms) + 'T00:00:00Z')) / 864e5; return left >= 0 && left <= 3; },
};

/** PLAN 취향 태그 v1 */
export const TasteTags = {
  SECTIONS: [['로스팅', ['라이트', '미디엄', '다크']], ['원산지', ['에티오피아', '콜롬비아', '브라질', '과테말라', '케냐', '블렌드']],
    ['원두 종류', ['디카페인', '싱글오리진']], ['맛', ['산미', '고소함', '쌉쌀함', '단맛', '초콜릿', '견과', '과일', '꽃향']]],
  get ALL() { return TasteTags.SECTIONS.flatMap(s => s[1]); },
  visibleSections: m => TasteTags.SECTIONS.map(([h, ts]) => [h, ts.filter(t => (m[t] || 0) > 0)]).filter(s => s[1].length),
  brandsMatched: beans => Object.fromEntries(TasteTags.ALL.map(t => [t, new Set(beans.filter(b => b.tags.includes(t)).map(b => b.brand)).size])),
};

/** 나의 메뉴: 공식 문구 직접 일치만. stores = [[i, brand, dist]] */
export const MyMenu = {
  brandTags(beans, brand) { const bs = beans.filter(b => b.brand === brand); return bs.length ? new Set(bs.flatMap(b => b.tags)) : null; },
  match: (prefs, tags) => tags ? TasteTags.ALL.filter(t => prefs.includes(t) && tags.has(t)) : null,
  run(prefs, beans, stores) {
    const cache = new Map(), hits = [], no = [];
    for (const [i, b, d] of stores) {
      if (!cache.has(b)) cache.set(b, b ? MyMenu.brandTags(beans, b) : null);
      const m = MyMenu.match(prefs, cache.get(b));
      if (m == null) no.push([i, d]); else if (m.length) hits.push({ store: i, matched: m, dist: d });
    }
    hits.sort((a, b) => b.matched.length - a.matched.length || a.dist - b.dist || a.store - b.store);
    no.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return { hits, noInfo: no.map(x => x[0]) };
  },
};

/** (c) 나의 메뉴 취향: localStorage 한 키(JSON), 서버 전송 없음. 값 = 태그 v1 한글 이름 */
export const TastePrefs = {
  KEY: 'aic.myMenu.v2', VER: 2,
  empty: () => ({ v: 2, tags: [], updated: null }),
  clean(o) { return { v: 2, tags: [...new Set((Array.isArray(o.tags) ? o.tags : []).filter(x => TasteTags.ALL.includes(x)))].sort(), updated: /^\d{4}-\d{2}-\d{2}$/.test(o.updated) ? o.updated : null }; },
  encode: o => JSON.stringify(TastePrefs.clean(o)),
  decode(s) { try { const o = JSON.parse(s); return o && o.v === 2 ? TastePrefs.clean(o) : TastePrefs.empty(); } catch { return TastePrefs.empty(); } },
  load: (st = globalThis.localStorage) => TastePrefs.decode(st?.getItem(TastePrefs.KEY)),
  save: (o, st = globalThis.localStorage) => st.setItem(TastePrefs.KEY, TastePrefs.encode(o)),
};

/** Beta 1.8.2 데이터: DATA 원본 CSV(data/1.8.2, 같은 출처 정적 파일)를 실행 시 읽음. 태그·브랜드·날짜를 코드에 적지 않음 */
export const Data182 = {
  BEANS: [], SEASON: [], STATUS: [],
  csv(text) {
    if (!text || !text.trim()) return [];
    const rows = text.trim().split(/\r?\n/).filter(l => l.trim()).map(l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; });
    const h = rows[0].map(x => x.trim().replace(/^\uFEFF/, '')); return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])));
  },
  /** flag '미확정' 행 제외. 원문(official_phrase)은 화면에 쓰지 않음(인용 약관 미확인) */
  parseBeans(text) { const m = new Map();
    for (const r of Data182.csv(text)) { if (!r.brand || !r.tag || ('status' in r ? r.status !== '확정' : (r.flag || '').startsWith('미확정'))) continue;
      const o = m.get(r.brand) || { brand: r.brand, tags: [], source: r.source_url, checked: r.checked_date || '' }; if (!o.tags.includes(r.tag)) o.tags.push(r.tag); m.set(r.brand, o); }
    return [...m.values()]; },
  parseSeason: text => Data182.csv(text).filter(r => r.source_url && r.menu).map(r => ({ id: `${r.brand}-${r.menu}`, brand: r.brand, name: r.menu, start: r.launch_date || null, end: r.end_date || null,
    sale: r.sale_confirmed === 'true' || r.on_sale_confirmed === 'true', checked: r.checked_date || null, price: /^\d+$/.test(r.price_krw || '') ? +r.price_krw : null, source: r.source_url })),
  parseStatus: text => Data182.csv(text).filter(r => r.brand).map(r => [r.brand, (!r.bean_status || r.bean_status.startsWith('미') || r.bean_status.includes('차단')) ? null : (r.checked_date || null)]),
  /** 원문 인용 허용·약관 링크(열 없음 = 원문 숨김) */
  parseTerms: text => Data182.csv(text).filter(r => r.brand).map(r => ({ brand: r.brand, quoteAllowed: (r.quote_allowed || '').toLowerCase() === 'true', termsUrl: /^https:\/\//.test(r.terms_url || '') ? r.terms_url : null })),
  TERMS: [],
  install(p, s, st) { Data182.TERMS = Data182.parseTerms(st); Data182.BEANS = Data182.parseBeans(p); Data182.SEASON = Data182.parseSeason(s); Data182.STATUS = Data182.parseStatus(st); },
  get TAG_BRANDS_MATCHED() { return TasteTags.brandsMatched(Data182.BEANS); },
  beansChecked: () => Data182.BEANS.map(b => b.checked).filter(Boolean).sort().pop() || null,
  async load(base = 'data/1.8.2/') {
    const get = async n => { try { const r = await fetch(base + n); return r.ok ? await r.text() : ''; } catch { return ''; } };
    const [p, s, st] = await Promise.all(['taste_tag_phrases.csv', 'season_menus.csv', 'brand_status.csv'].map(get));
    Data182.install(p, s, st);
  },
};
