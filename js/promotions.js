// Beta 1.8.5 공식 프로모션(오프라인 번들 data/1.8.5/promotions.csv). core.js의 추천·정렬(Engine)은 이 모듈을 읽지 않는다.
import { Csv } from './core.js';
export const SCOPES = ['전매장', '일부매장'];
export const HEADER = ['id', 'brand', 'title', 'benefit_text', 'start_date', 'end_date', 'scope', 'source_url', 'checked_date'];
// Beta 1.8.6: 맨 끝 선택 열 recur_weekday(ISO 1=월…7=일, KST). 1.8.5 CSV(열 없음)도 읽음. 빈 값=매일, 잘못된 값=행 숨김
export const RECUR_COL = 'recur_weekday';
// Beta 1.8.6(P8): 맨 끝 선택 열 scope_note(출처 범위 원문). 빈 값=없음(null). 표시·정렬에는 아직 쓰지 않음
export const SCOPE_NOTE_COL = 'scope_note';
// 필수 9열은 순서까지 엄격히 검사. 그 뒤 열은 선택: 아는 열(OPTIONAL)은 읽고, 모르는 열은 실패 없이 unknown으로 돌려줌(검사 스크립트가 WARNING 출력)
export const OPTIONAL = ['recur_weekday', 'scope_note'];
export const headerCheck = head => { const h = head.map(s => s.trim()); const extra = h.slice(HEADER.length);
  if (HEADER.some((c, i) => h[i] !== c)) throw new Error('promotions.csv 머리행 불일치: ' + h);
  if (new Set(extra).size !== extra.length || extra.some(c => c === '' || HEADER.includes(c))) throw new Error('promotions.csv 머리행 중복·빈 열: ' + h);
  return { unknown: extra.filter(c => !OPTIONAL.includes(c)) }; };
export const RECUR_LABEL = '매주 {d}요일'; // UI 수정 예정 → 이 상수만 바꿈
const DAY = ['월', '화', '수', '목', '금', '토', '일'];
export const recurLabel = w => RECUR_LABEL.replace('{d}', DAY[w - 1]);
export const parseRecur = s => s === '' ? null : /^[1-7]$/.test(s) ? +s : -1;
const kstWeekday = t => { const d = new Date(+t + 9 * 3600e3).getUTCDay(); return d === 0 ? 7 : d; };
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00+09:00')) && new Date(Date.parse(s + 'T00:00:00+09:00') + 9 * 3600e3).toISOString().slice(0, 10) === s;
const kstMs = s => Date.parse(s + 'T00:00:00+09:00');
export const Promotions = {
  parse(text) {
    const head = (Csv.parse(text)[0] || []).map(s => s.trim());
    const { unknown } = headerCheck(head);
    const items = [], rejected = [];
    for (const r of Csv.records(text)) {
      const why = Object.values(r).some(v => v.includes('미확인')) ? '미확인'
        : !r.id || !r.brand || !r.title ? '필수값 없음'
        : !r.source_url || !r.source_url.startsWith('https://') ? 'source_url 없음'
        : !isDate(r.checked_date) ? 'checked_date 없음'
        : !SCOPES.includes(r.scope) ? 'scope 오류'
        : !isDate(r.end_date) ? 'end_date 오류'
        : r.start_date && !isDate(r.start_date) ? 'start_date 오류'
        : parseRecur((r[RECUR_COL] || '').trim()) === -1 ? 'recur_weekday 오류' : null;
      if (why) { rejected.push([r.id, why]); continue; }
      items.push({ id: r.id, brand: r.brand, title: r.title, benefitText: r.benefit_text, startDate: r.start_date || null, endDate: r.end_date, scope: r.scope, sourceUrl: r.source_url, checkedDate: r.checked_date, recurWeekday: parseRecur((r[RECUR_COL] || '').trim()), scopeNote: (r[SCOPE_NOTE_COL] || '') === '' ? null : r[SCOPE_NOTE_COL] });
    }
    return { items, rejected, unknown };
  },
  /** start_date 00:00 KST ≤ now ≤ end_date 23:59:59 KST(기기 시간대 무관). now: Date 또는 ms */
  isVisible(start, end, now) { const t = +now; if (start && t < kstMs(start)) return false; return t < kstMs(end) + 86400e3; },
  /** Beta 1.8.6: 기간 안 + (recur 있으면) KST 요일 일치 */
  isVisibleRecur(start, end, recur, now) { return this.isVisible(start, end, now) && (recur == null || kstWeekday(+now) === recur); },
  visible(items, now) { return items.filter(p => this.isVisibleRecur(p.startDate, p.endDate, p.recurWeekday ?? null, now)); },
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
export const PROMO_URL = 'data/1.8.6/promotions.csv'; // 1.8.6 재빌드(17:40): data/1.8.6
/** Beta 1.8.6(Q185-01): text == null(읽기 실패)·파싱 예외 → failed. 실패면 확인일 없음. 확인일은 파일 checked_date 최신값만(파일 날짜로 대신하지 않음) */
Promotions.stateOf = text => { if (text == null) return { items: [], checked: null, failed: true }; try { return { items: Promotions.parse(text).items, checked: Promotions.dataCheckedDate(text), failed: false }; } catch { return { items: [], checked: null, failed: true }; } };
export const PromoData = { items: [], checked: null, failed: false, loading: false, ready: false,
  async load(url = PROMO_URL) { this.loading = true; let t = null; try { const r = await fetch(url); if (r.ok) t = await r.text(); } catch { t = null; }
    Object.assign(this, Promotions.stateOf(t)); this.loading = false; this.ready = true; } };
export const Promo185 = { SECTION: '공식 프로모션·이벤트', EMPTY: '현재 확인된 공식 프로모션이 없습니다', LINK: '공식 출처 보기 ›', NET_NOTE: '외부 브라우저로 열려요 · 인터넷 연결 필요', sourceLine: p => `공식 출처 · 데이터 확인일 ${p.checkedDate}`,
  FAIL: '프로모션 정보를 불러오지 못했어요', RETRY: '다시 시도', LOADING: '불러오는 중…', MORE: '더 보기', LESS: '접기', checkedLine: d => `데이터 확인일 ${d}` };
