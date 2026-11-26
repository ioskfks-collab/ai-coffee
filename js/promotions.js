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
  /** 1.8.7 r4: 오늘 날짜(KST, YYYY-MM-DD) — 기기 시간대 무관. 안내창 '오늘 하루 보지 않기' 비교에 씀 */
  kstToday(now) { return new Date(+now + 9 * 3600e3).toISOString().slice(0, 10); },
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
// ---------- Beta 1.8.9 r2: 원격 promos.json(같은 Pages 출처) 자동 갱신 ----------
// 받는 곳: 같은 출처 data/promos.json 하나뿐(CSP connect-src 'self' 그대로). 실행 시 1회, 시간 제한 FEED_TIMEOUT_MS, 재시도 없음.
// 성공본만 localStorage에 저장(실패·형식 오류는 덮어쓰지 않음). 실패하면 저장본 → 없으면 앱 번들 CSV(확인일 표시) 순.
// 기간 판정은 기존 Promotions.isVisible(KST, 종료일 23:59:59까지 보이고 다음 날 00:00부터 숨김). 종료일 없는 항목은 넣지 않음.
export const FEED_URL = 'data/promos.json';
export const FEED_SCHEMA = 'aicafe-promos/1';
export const FEED_CACHE_KEY = 'aic.promoFeed';
export const FEED_TIMEOUT_MS = 6000;
const STAMP_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?\+09:00$/;
/** ms → 'YYYY-MM-DD HH:mm'(KST, 기기 시간대 무관) */
export const kstStamp = t => new Date(+t + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
export const PromoFeed = {
  /** text → { items, rejected, generatedAt }. JSON·schema 오류는 throw(=받기 실패) */
  parse(text) {
    const d = JSON.parse(text);
    if (!d || d.schema !== FEED_SCHEMA || !Array.isArray(d.promos)) throw new Error('promos.json schema 오류');
    const items = [], rejected = [];
    for (const r of d.promos) {
      const st = typeof r.checked_at === 'string' && r.checked_at.match(STAMP_RE);
      const why = !r || !r.id || !r.brand || !r.title ? '필수값 없음'
        : typeof r.source_url !== 'string' || !r.source_url.startsWith('https://') ? 'source_url 없음'
        : !st ? 'checked_at 없음'
        : !isDate(r.end_date || '') ? 'end_date 없음'
        : r.start_date && !isDate(r.start_date) ? 'start_date 오류'
        : r.scope && !SCOPES.includes(r.scope) ? 'scope 오류' : null;
      if (why) { rejected.push([r && r.id, why]); continue; }
      items.push({ id: String(r.id), brand: r.brand, title: r.title, benefitText: r.benefit_text || '', startDate: r.start_date || null, endDate: r.end_date, scope: r.scope || '',
        sourceUrl: r.source_url, checkedDate: st[1], checkedAt: `${st[1]} ${st[2]}`, recurWeekday: null, scopeNote: null, menu: Array.isArray(r.menu) ? r.menu : [] });
    }
    return { items, rejected, generatedAt: d.generated_at || null };
  },
  /** 가장 늦은 공식 페이지 확인 날짜(안내창 '데이터 확인일'용) */
  checkedOf: items => items.map(p => p.checkedDate).filter(Boolean).sort().pop() || null,
};
/** 상태(UI promo-states-1.8.9r2 §3): loading ② · ok ① · offline ③ · failed ④. source: remote·cache·bundle·null */
export const PromoData = { items: [], checked: null, failed: false, loading: false, ready: false, status: 'loading', source: null, receivedAt: null, bundleChecked: null,
  storage: () => { try { return globalThis.localStorage || null; } catch { return null; } },
  readCache() { try { const c = JSON.parse(this.storage()?.getItem(FEED_CACHE_KEY) || 'null'); if (!c || !c.text || !c.receivedAt) return null; return { receivedAt: c.receivedAt, ...PromoFeed.parse(c.text) }; } catch { return null; } },
  use(items, source, receivedAt) { this.items = items; this.source = source; this.receivedAt = receivedAt; this.checked = PromoFeed.checkedOf(items); },
  /** fetchImpl·now는 시험용 주입. 반환 전 ready=true */
  async load({ url = FEED_URL, bundleUrl = PROMO_URL, fetchImpl = (...a) => fetch(...a), now = () => Date.now(), timeoutMs = FEED_TIMEOUT_MS, online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false) } = {}) {
    this.loading = true; this.ready = false; this.status = 'loading'; this.failed = false;
    const c = this.readCache(); if (c) this.use(c.items, 'cache', c.receivedAt);
    let status = 'failed', text = null;
    if (!online()) status = 'offline';
    else {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null; const tm = setTimeout(() => ac && ac.abort(), timeoutMs);
      try { const r = await fetchImpl(url, { cache: 'no-store', signal: ac ? ac.signal : undefined }); if (r.ok) text = await r.text(); else status = 'failed'; }
      catch (e) { status = e && e.name === 'AbortError' ? 'failed' : (online() ? 'offline' : 'offline'); } // 연결 자체 실패(TypeError) = 오프라인, 시간 초과 = 갱신 실패
      finally { clearTimeout(tm); }
      if (text != null) { try { const f = PromoFeed.parse(text); const at = kstStamp(now()); this.use(f.items, 'remote', at); status = 'ok'; try { this.storage()?.setItem(FEED_CACHE_KEY, JSON.stringify({ receivedAt: at, text })); } catch { } } catch { status = 'failed'; } }
    }
    if (status !== 'ok' && !c) { // 저장본 없음 → 앱 번들 CSV(확인일만 있는 옛 목록, 상태 줄에 표시)
      let t = null; try { const r = await fetchImpl(bundleUrl); if (r.ok) t = await r.text(); } catch { t = null; }
      const b = Promotions.stateOf(t);
      if (!b.failed) { this.use(b.items, 'bundle', null); this.bundleChecked = b.checked; } else { this.use([], null, null); }
    }
    this.status = status; this.failed = this.source == null; this.loading = false; this.ready = true;
  } };
/** 목록 위 상태 줄(UI §3). null = 줄 없음 */
export const PromoStatus = {
  OK: at => `${at} 받은 목록이에요`,
  LOADING: '새 목록을 받는 중이에요 · 지금은 저장된 목록이에요',
  OFFLINE: at => `인터넷에 연결되지 않아 ${at}에 받은 목록을 보여 드려요`,
  FAILED: at => `새 목록을 받지 못해 ${at}에 받은 목록을 보여 드려요`,
  OFFLINE_BUNDLE: d => `인터넷에 연결되지 않아 앱에 들어 있는 목록(확인일 ${d})을 보여 드려요`,
  FAILED_BUNDLE: d => `새 목록을 받지 못해 앱에 들어 있는 목록(확인일 ${d})을 보여 드려요`,
  EMPTY_T: '지금 진행 중인 공식 프로모션이 없어요', EMPTY_S: '기간이 끝난 프로모션은 보여 드리지 않아요.',
  NONE_T: '프로모션 목록을 아직 받지 못했어요', NONE_S: '인터넷에 연결된 상태로 앱을 다시 열면 받아 와요.',
  /** { line, warn, body: 'cards'|'empty'|'none' } — visibleN = 오늘 보이는 개수 */
  of(D, visibleN) {
    const warn = D.status === 'offline' || D.status === 'failed';
    let line = null;
    if (D.status === 'loading') line = D.source === 'cache' ? this.LOADING : null;
    else if (D.source === 'remote') line = this.OK(D.receivedAt);
    else if (D.source === 'cache') line = (D.status === 'offline' ? this.OFFLINE : this.FAILED)(D.receivedAt);
    else if (D.source === 'bundle' && visibleN > 0) line = (D.status === 'offline' ? this.OFFLINE_BUNDLE : this.FAILED_BUNDLE)(D.bundleChecked || '없음');
    const body = visibleN > 0 ? 'cards' : (D.source === 'remote' || D.source === 'cache') ? 'empty' : D.status === 'loading' ? 'loading' : 'none';
    return { line, warn: warn && line != null, body };
  },
};
/** 카드 맨 아래 줄(UI §2) */
export const PromoCardText = {
  period: p => `기간 ${p.startDate ? p.startDate + ' ~ ' : '~ '}${p.endDate}`,
  source: p => `출처 ${p.brand} 공식 이벤트 페이지`,
  checked: p => `확인 ${p.checkedAt || p.checkedDate}`,
  LINK: '원문 보기',
};
export const Promo185 = { SECTION: '공식 프로모션·이벤트', EMPTY: '현재 확인된 공식 프로모션이 없습니다', LINK: '공식 출처 보기 ›', NET_NOTE: '외부 브라우저로 열려요 · 인터넷 연결 필요', sourceLine: p => `공식 출처 · 데이터 확인일 ${p.checkedDate}`,
  FAIL: '프로모션 정보를 불러오지 못했어요', RETRY: '다시 시도', LOADING: '불러오는 중…', MORE: '더 보기', LESS: '접기', checkedLine: d => `데이터 확인일 ${d}` };

// 1.8.7 r4: 시작 안내창 '오늘 하루 보지 않기' 저장 키(localStorage, 값 = kstToday). Android: DataStore promoHideDate
export const PROMO_HIDE_KEY = 'aic.promoHideDate';

// 1.8.7 r4 시작 안내창(UI 명세 2a2c0098 §3~§6). 셈은 목록과 같은 Promotions.visible. Android data/Promotions.kt PromoNotice와 같음
export const PromoNotice = {
  CAP_MS: 5000, // 시작 화면 5초 상한(CEO2 확정)
  TITLE: '공식 프로모션·이벤트 확인하기!', SRC: '브랜드 공식 홈페이지 기준 · 추천 순위와 무관',
  summary: (n, m) => `진행 중인 공식 프로모션 ${n}개 · 브랜드 ${m}곳`, checkedLine: d => `데이터 확인일 ${d}`,
  OPEN: '확인하기', HIDE_TODAY: '오늘은 그만 보기', CLOSE: '닫기',
  /** 띄울지 판단: 로딩 중·실패·5초 초과·다른 창·이미 이동·N=0·오늘 그만 보기면 null */
  decide({ ready, failed, items, now, hideDate, otherOpen = false, moved = false, timedOut = false }) {
    if (!ready || failed || timedOut || otherOpen || moved) return null;
    const v = Promotions.visible(items, now); if (!v.length) return null;
    if (hideDate === Promotions.kstToday(now)) return null;
    const brands = [...new Set(v.map(p => p.brand))];
    return { n: v.length, m: brands.length, brands };
  },
};
