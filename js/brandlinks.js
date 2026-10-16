// Beta 1.8.6(P9) 공식 프로모션 바로가기: 앱에 담은 data/1.8.6/brand_links.csv만 읽음. 앱은 URL을 만들거나 고치지 않고, 외부 브라우저(새 탭)만 엶.
import { Csv } from './core.js';
export const LINK_HEADER = ['brand', 'link_type', 'url', 'official_domain', 'http_status', 'final_url', 'checked_date', 'status', 'note'];
export const LINKS_URL = 'data/1.8.6/brand_links.csv';
export const P9 = { BUTTON: '공식 프로모션·이벤트 확인하기 ›', TITLE: '공식 프로모션·이벤트', GUIDE: '각 브랜드 공식 사이트로 이동해요', NONE: '아직 확인된 공식 링크가 없어요',
  UNCONFIRMED: '공식 링크 미확인', FAIL: '공식 링크 목록을 불러오지 못했어요', FAIL_SUB: '앱을 다시 실행해 주세요', RETRY: '다시 시도',
  ask: b => `${b} 공식 사이트로 이동할까요?`, GO: '이동하기', CANCEL: '취소', SHEET_NOTE: '앱 밖 브라우저에서 열려요.',
  OPEN_FAIL: '브라우저를 열 수 없어요. 아래 주소를 복사해 직접 열어 주세요.', COPY: '주소 복사', COPIED: '주소를 복사했어요' };
// link_type → 아래 줄 종류(UI §7-5). 그 밖의 값은 '공식 홈'
export const KIND = { '이벤트/프로모션': '이벤트 페이지', '공식홈': '공식 홈', '소식': '소식' };
export const kindOf = t => KIND[t] || '공식 홈';
export const BrandLinks = {
  parse(text) {
    const head = (Csv.parse(text)[0] || []).map(s => s.trim());
    if (LINK_HEADER.some((c, i) => head[i] !== c)) throw new Error('brand_links.csv 머리행 불일치: ' + head);
    return Csv.records(text).filter(r => r.brand).map(r => { const tappable = (r.final_url || '') !== '';
      return { brand: r.brand, linkType: r.link_type, url: r.url, finalUrl: r.final_url || null, checkedDate: r.checked_date, tappable,
        label: tappable ? `${kindOf(r.link_type)} · 확인일 ${r.checked_date}` : P9.UNCONFIRMED }; }); },
  forBrand: (rows, brand) => rows.find(r => r.brand === brand) || null,
  allUnconfirmed: rows => rows.length > 0 && rows.every(r => !r.tappable),
  stateOf(text) { if (text == null) return { rows: [], failed: true }; try { return { rows: this.parse(text), failed: false }; } catch { return { rows: [], failed: true }; } },
  /** 빌드 링크 검사: url·final_url(있으면) 모두 https://, 호스트가 brand_official_domains의 그 브랜드 도메인과 같아야 함. 오류 목록 반환(빈 배열 = 통과) */
  gate(linksText, domainsText) {
    const dom = new Map(Csv.records(domainsText).map(r => [r.brand, r.official_domain])); const errs = [];
    const host = u => { try { return new URL(u).hostname; } catch { return null; } };
    for (const r of Csv.records(linksText)) { const d = dom.get(r.brand);
      if (!d) { errs.push(`${r.brand}: 공식 도메인 목록에 없음`); continue; }
      if (r.official_domain !== d) errs.push(`${r.brand}: official_domain ${r.official_domain} ≠ ${d}`);
      for (const [k, u] of [['url', r.url], ['final_url', r.final_url]]) { if (k === 'final_url' && !u) continue;
        if (!u || !u.startsWith('https://')) errs.push(`${r.brand}: ${k} https 아님 (${u})`);
        else if (host(u) !== d) errs.push(`${r.brand}: ${k} 도메인 ${host(u)} ≠ ${d}`); } }
    return errs; },
};
export const LinkData = { rows: [], failed: false, loading: false, ready: false,
  async load(url = LINKS_URL) { this.loading = true; let t = null; try { const r = await fetch(url); if (r.ok) t = await r.text(); } catch { t = null; }
    Object.assign(this, BrandLinks.stateOf(t)); this.loading = false; this.ready = true; } };
