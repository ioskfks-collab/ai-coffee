// Beta 1.8.5 공식 프로모션(오프라인 번들 data/1.8.5/promotions.csv). core.js의 추천·정렬(Engine)은 이 모듈을 읽지 않는다.
import { Csv } from './core.js';
export const SCOPES = ['전매장', '일부매장'];
export const HEADER = ['id', 'brand', 'title', 'benefit_text', 'start_date', 'end_date', 'scope', 'source_url', 'checked_date'];
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00+09:00')) && new Date(Date.parse(s + 'T00:00:00+09:00') + 9 * 3600e3).toISOString().slice(0, 10) === s;
const kstMs = s => Date.parse(s + 'T00:00:00+09:00');
export const Promotions = {
  parse(text) {
    const head = (Csv.parse(text)[0] || []).map(s => s.trim());
    if (head.join(',') !== HEADER.join(',')) throw new Error('promotions.csv 머리행 불일치: ' + head);
    const items = [], rejected = [];
    for (const r of Csv.records(text)) {
      const why = Object.values(r).some(v => v.includes('미확인')) ? '미확인'
        : !r.id || !r.brand || !r.title ? '필수값 없음'
        : !r.source_url || !r.source_url.startsWith('https://') ? 'source_url 없음'
        : !isDate(r.checked_date) ? 'checked_date 없음'
        : !SCOPES.includes(r.scope) ? 'scope 오류'
        : !isDate(r.end_date) ? 'end_date 오류'
        : r.start_date && !isDate(r.start_date) ? 'start_date 오류' : null;
      if (why) { rejected.push([r.id, why]); continue; }
      items.push({ id: r.id, brand: r.brand, title: r.title, benefitText: r.benefit_text, startDate: r.start_date || null, endDate: r.end_date, scope: r.scope, sourceUrl: r.source_url, checkedDate: r.checked_date });
    }
    return { items, rejected };
  },
  /** start_date 00:00 KST ≤ now ≤ end_date 23:59:59 KST(기기 시간대 무관). now: Date 또는 ms */
  isVisible(start, end, now) { const t = +now; if (start && t < kstMs(start)) return false; return t < kstMs(end) + 86400e3; },
  visible(items, now) { return items.filter(p => this.isVisible(p.startDate, p.endDate, now)); },
  forBrand(items, brand, now) { return this.visible(items, now).filter(p => p.brand === brand); },
};
// 목록: 브랜드 묶음은 가장 빠른 종료일 순, 묶음 안은 종료일 순, 같으면 id 순
const byEnd = (a, b) => a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
Promotions.grouped = function (items, now) {
  const m = new Map(); for (const p of this.visible(items, now)) { if (!m.has(p.brand)) m.set(p.brand, []); m.get(p.brand).push(p); }
  return [...m].map(([b, v]) => [b, v.sort(byEnd)]).sort((a, b) => byEnd(a[1][0], b[1][0]));
};
Promotions.dataCheckedDate = text => Csv.records(text).map(r => r.checked_date).filter(isDate).sort().pop() || null;
Promotions.period = p => `${p.startDate || ''}~${p.endDate}`;
export const PROMO_URL = 'data/1.8.5/promotions.csv';
export const PromoData = { items: [], checked: null, ready: false,
  async load(url = PROMO_URL) { try { const r = await fetch(url); const t = await r.text(); this.items = Promotions.parse(t).items; const lm = Date.parse(r.headers.get('last-modified') || ''); this.checked = Promotions.dataCheckedDate(t) || (isNaN(lm) ? null : new Date(lm + 9 * 3600e3).toISOString().slice(0, 10) + '(파일 날짜)'); } catch { this.items = []; } this.ready = true; } };
export const Promo185 = { SECTION: '공식 프로모션·이벤트', EMPTY: '현재 확인된 공식 프로모션이 없습니다', LINK: '공식 출처 보기 ›', NET_NOTE: '외부 브라우저로 열려요 · 인터넷 연결 필요', sourceLine: p => `공식 출처 · 확인일 ${p.checkedDate}` };
