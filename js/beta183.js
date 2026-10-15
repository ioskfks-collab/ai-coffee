// Beta 1.8.3 로직. Android domain/Beta183.kt · data/IndPrice.kt와 같은 규칙(공용 정답 shared/golden/beta-1.8.3-cases.json).
import { MapLinks, Csv } from './core.js';

/** (a) 사진 보기: 공식 스킴에 사진 탭 직접 진입이 없고 장소 ID도 없음 → 영업시간·후기와 같은 매장 검색 결과 링크. 사용자 위치는 인자로 받지 않음 */
export const PhotoLinks = {
  APPS: MapLinks.HOURS_APPS,
  url(id, name, addr, store) {
    if (id === 'naver') return MapLinks.naverSearch(name, addr);
    if (id === 'kakao') return MapLinks.kakaoSearch(name, addr, store);
    throw new Error('사진 보기는 네이버·카카오만 지원해요');
  },
};

/** (b) 개인 카페 확인 가격(ind_prices). 표시·비교 = status '확인' + 가격 + 출처 URL(http/https) + 확인 날짜(YYYY-MM-DD) 모두 있을 때만. 나머지는 가격 미확인 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const intOrNull = v => (v != null && /^\s*\d+\s*$/.test(v)) ? parseInt(v, 10) : null;
export const indConfirmed = r => r.status === '확인' && r.price != null && r.price > 0 && /^https?:\/\//.test(r.url) && DATE_RE.test(r.date);
export const indLabel = r => [r.menu, [r.size || null, r.ml != null ? `${r.ml}mL` : null].filter(Boolean).join('/')].filter(x => x && x.trim()).join(' · ');
export const indSourceLine = date => `출처 · 확인 ${date}`;
const storeKey = (name, addr) => `${(name ?? '').trim()}\u0001${(addr ?? '').trim()}`;
export class IndPriceTable {
  constructor(rows = []) {
    this.confirmed = rows.filter(indConfirmed); this.unconfirmedRows = rows.length - this.confirmed.length; this.by = new Map();
    for (const r of this.confirmed) { const k = storeKey(r.name, r.addr); if (!this.by.has(k)) this.by.set(k, []); this.by.get(k).push(r); }
  }
  rows(name, addr) { return this.by.get(storeKey(name, addr)) || []; }
  has(name, addr) { return this.by.has(storeKey(name, addr)); }
  sizeFor(name, addr, key) {
    const c = this.rows(name, addr).filter(r => r.key === key); if (!c.length) return null;
    const r = c.reduce((a, b) => b.price < a.price ? b : a);
    return { n: r.size || '기본', ml: r.ml, oz: 0, p: r.price, src: r.url, shop: '', d: r.date, verified: true };
  }
  static parse(text) {
    return new IndPriceTable(Csv.records(text || '').filter(r => (r.name || '').trim()).map(r => {
      const ml = intOrNull(r.volume_ml);
      return { name: r.name.trim(), addr: (r.addr || '').trim(), key: (r.menu_key || '').trim(), menu: (r.menu || '').trim(), size: (r.size || '').trim(),
        ml: ml != null && ml > 0 ? ml : null, price: intOrNull(r.price), status: (r.status || '').trim(), url: (r.source_url || '').trim(), date: (r.checked_date || '').trim() };
    }));
  }
}
