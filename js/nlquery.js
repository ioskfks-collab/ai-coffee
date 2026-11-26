// AI Coffee Beta 1.8.9 — 자연어 검색어 → 조건(규칙 기반 분석, 기기 안에서만 실행. 외부 API·키·전송 없음).
// Android domain/NlQuery.kt와 같은 규칙. 공용 정답 shared/golden/nlquery-1.8.9.json (웹·Android 테스트가 같은 파일을 읽음)
// 데이터가 없는 조건(분위기·시설·영업시간·지원하지 않는 메뉴 등)은 unsupported로 돌려주고 필터에 넣지 않음.

export const NL_BRANDS = [ // Brands.ALL 순서(1부터)
  [1, ['스타벅스', '스벅', 'starbucks']],
  [2, ['투썸플레이스', '투썸', 'twosome']],
  [3, ['이디야커피', '이디야', 'ediya']],
  [4, ['메가mgc커피', '메가엠지씨커피', '메가커피', '메가mgc', '메가']],
  [5, ['컴포즈커피', '컴포즈', 'compose']],
  [6, ['빽다방', '백다방']],
  [7, ['할리스커피', '할리스', 'hollys']],
  [8, ['폴바셋', 'paulbassett']],
  [9, ['커피빈', 'coffeebean']],
  [10, ['파스쿠찌', 'pascucci']],
  [11, ['하삼동커피', '하삼동']],
  [12, ['텐퍼센트커피', '텐퍼센트', '10퍼센트']],
];
const KNUM = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const NEG = '(?:은|는|이|가|을|를|도)?\\s*(?:말고|빼고|제외하고|제외|없는|아닌|아니고|싫어|빼)';
// 지원하지 않는 메뉴(가격 데이터 없음): 라떼 계열 먼저
const UNSUP_MENU = ['녹차라떼', '말차라떼', '고구마라떼', '초코라떼', '딸기라떼', '흑당라떼', '돌체라떼', '토피넛라떼', '곡물라떼', '민트라떼', '밀크티', '카페모카', '모카', '에스프레소', '카라멜마끼아또', '카라멜마키아또', '마끼아또', '마키아또', '플랫화이트', '아인슈페너', '아포가토', '프라푸치노', '프라페', '스무디', '에이드', '녹차', '디카페인', '디저트', '케이크', '베이커리', '빵', '브런치', '크로플', '와플', '쿠키'];
const UNSUP = [
  ['분위기·공간', ['조용한', '조용히', '조용', '한적한', '분위기', '감성', '예쁜', '이쁜', '인스타', '오션뷰', '뷰맛집', '전망', '루프탑', '테라스', '넓은', '아늑한', '힙한', '아기자기']],
  ['시설', ['콘센트', '와이파이', 'wifi', '주차', '화장실', '흡연', '노키즈', '키즈', '애견', '반려견', '반려동물', '좌석', '자리']],
  ['영업시간', ['24시간', '24시', '심야', '새벽', '영업중', '지금 열린', '문 연', '오픈한']],
  ['방문 목적', ['카공', '공부', '작업', '회의', '모임', '데이트']],
];
const STOP = new Set(['곳', '데', '집', '카페', '커피숍', '커피집', '매장', '가게', '찾아줘', '찾아', '알려줘', '알려', '추천해줘', '추천', '보여줘', '좀', '좋은', '괜찮은', '근처', '주변', '여기', '내', '우리', '에서', '중에', '중', '있는', '파는', '하는', '커피', '마시고', '싶어', '먹고', '원해', '제일', '가장', '정말', '진짜', '완전', '아주', '잔', '한잔', '요', '줘', '주세요', '해줘', '어디', '어디야', '있어', '있나', '있을까', '좋아', '좋고', '좋을', '곳은', '곳이', '곳좀', '데좀', '걸로', '거', '것', '음료', '메뉴', '사이즈', '하나', '그리고', '또는', '랑', '하고', '및', '이랑', '위주', '순', '순으로', '기준', '정도', '쯤', '먹을', '마실', '갈', '만한', '데가', '곳을', '나', '저', '지금', '오늘']);
const JOSA = /(에서|으로|이랑|하고|은|는|이|가|을|를|에|로|도|만|랑|의|요)$/;

function priceFromMatch(m) { return m; }
/** 한글 숫자 천·백 표현: (삼)천(오)백 → 3500 */
function kChun(a, b) { return (a ? KNUM[a] : 1) * 1000 + (b !== undefined ? (b === '' ? 1 : KNUM[b]) * 100 : 0); }

/** @returns {{menu,temp,size,pmax,rmax,sort,rmin,type,brands,xbrands,unsupported,unknown,notes,empty}} */
export function parseQuery(q) {
  const out = { menu: null, temp: null, size: null, pmax: null, rmax: null, sort: null, rmin: null, type: null, brands: [], xbrands: [], unsupported: [], unknown: [], notes: [] };
  let w = ' ' + String(q || '').normalize('NFC').toLowerCase().replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d)\.(\d)/g, '$1\u0001$2').replace(/[~!?.。,·]/g, ' ').replace(/\u0001/g, '.').replace(/\s+/g, ' ') + ' ';
  if (!w.trim()) { out.empty = true; return out; }
  const cut = (re, fn) => { w = w.replace(re, (...a) => { const r = fn(...a); return r === false ? a[0] : ' '; }); };
  const unsup = (term, kind) => { if (!out.unsupported.some(u => u.term === term)) out.unsupported.push({ term, kind }); };

  // 1) 별점 최소값: '별점 4점 이상', '평점 4.5 이상', '4점 이상'
  cut(/(?:(?:별점|평점)\s*(\d(?:\.\d)?)\s*점?|(\d(?:\.\d)?)\s*점)\s*(?:이상|넘는|넘게|보다\s*높은)/g, (s, a, b) => { const v = parseFloat(a ?? b); if (!(v >= 1 && v <= 5)) return false; out.rmin = v; return true; });
  cut(/핫\s*플(?:레이스)?/g, () => unsup('핫플', '분위기·공간'));
  // 2) 거리
  cut(/(?:반경\s*)?(\d+(?:\.\d+)?)\s*(?:km|㎞|킬로미터|킬로|키로)\s*(?:이내|안쪽|안|내|까지|거리)?/g, (s, n) => { out.rmax = Math.round(parseFloat(n) * 1000); });
  cut(/(?:반경\s*)?(\d+)\s*(?:m|미터|ｍ)(?![a-z])\s*(?:이내|안쪽|안|내|까지|거리)?/g, (s, n) => { out.rmax = parseInt(n, 10); });
  cut(/(?:반경\s*)?(일|이|삼|사|오|육|칠|팔|구)?백\s*(?:m|미터)\s*(?:이내|안쪽|안|내|까지)?/g, (s, a) => { out.rmax = (a ? KNUM[a] : 1) * 100; });
  cut(/(?:도보|걸어서)\s*(\d+)\s*분\s*(?:이내|안쪽|안|내|거리|까지)?/g, (s, n) => { out.rmax = parseInt(n, 10) * 67; out.notes.push(`도보 ${n}분 → 약 ${parseInt(n, 10) * 67}m(분당 67m)`); });
  // 3) 가격
  const QUAL = '\\s*(이하|까지|아래|이내|안쪽|밑|미만|보다\\s*싼|보다\\s*저렴한|보다\\s*저렴|대|이상|넘는|부터)?';
  const setPrice = (n, qual, raw) => {
    if (!(n >= 500 && n <= 50000)) return false;
    qual = (qual || '').replace(/\s+/g, '');
    if (qual === '이상' || qual === '넘는' || qual === '부터') { unsup(raw.trim(), '최소 가격'); return true; }
    if (qual === '미만' || qual.startsWith('보다')) { out.pmax = n - 100; out.notes.push(`${n.toLocaleString('ko-KR')}원 미만 → ${(n - 100).toLocaleString('ko-KR')}원 이하`); }
    else if (qual === '대') { out.pmax = n + 900; out.notes.push(`${n.toLocaleString('ko-KR')}원대 → ${(n + 900).toLocaleString('ko-KR')}원 이하`); }
    else out.pmax = n;
    return true;
  };
  cut(new RegExp('(\\d+(?:\\.\\d+)?)\\s*천\\s*(?:(\\d)\\s*백)?\\s*원?' + QUAL, 'g'), (s, a, b, ql) => setPrice(Math.round(parseFloat(a) * 1000 + (b ? parseInt(b, 10) * 100 : 0)), ql, s));
  cut(new RegExp('(\\d+)\\s*만\\s*원' + QUAL, 'g'), (s, a, ql) => setPrice(parseInt(a, 10) * 10000, ql, s));
  cut(new RegExp('(\\d+)\\s*원' + QUAL, 'g'), (s, a, ql) => setPrice(parseInt(a, 10), ql, s));
  cut(new RegExp('(일|이|삼|사|오|육|칠|팔|구)?천\\s*(?:(일|이|삼|사|오|육|칠|팔|구)?(백))?\\s*원' + QUAL, 'g'), (s, a, b, bb, ql) => setPrice(kChun(a, bb ? (b || '') : undefined), ql, s));
  cut(/(\d{4,5})\s*(이하|까지|아래|이내|미만)/g, (s, a, ql) => setPrice(parseInt(a, 10), ql, s));
  // 4) 메뉴·온도 (줄임말 먼저)
  const setMenu = (k) => { if (out.menu == null) out.menu = k; else if (out.menu !== k) out.notes.push('메뉴는 하나만 반영돼요'); };
  cut(/아아/g, () => { setMenu('am'); out.temp = out.temp || 'i'; });
  cut(/뜨아/g, () => { setMenu('am'); out.temp = out.temp || 'h'; });
  for (const m of UNSUP_MENU) cut(new RegExp(m.replace(/(.)/g, '$1\\s*').replace(/\\s\*$/, ''), 'g'), () => unsup(m, '메뉴'));
  cut(/바닐라\s*(?:라떼|라테)|바닐라/g, () => setMenu('va'));
  cut(/(?:카페|까페)?\s*(?:라떼|라테|latte)/g, () => setMenu('la'));
  cut(/아메리카노|americano|아메/g, () => setMenu('am'));
  cut(/카푸치노|cappuccino/g, () => setMenu('cp'));
  cut(/콜드\s*브루|cold\s*brew|더치\s*커피|더치/g, () => setMenu('cb'));
  cut(/아이스|차가운|시원한|iced|ice/g, () => { out.temp = 'i'; });
  cut(/따뜻한|따듯한|따뜻하게|뜨거운|뜨겁게|따신|핫|hot/g, () => { out.temp = 'h'; });
  // 5) 사이즈
  cut(/스몰|small|작은\s*(?:사이즈|거|걸로|잔|용량)|톨|tall|숏|short|레귤러|regular/g, () => { out.size = 'S'; });
  cut(/라지|large|큰\s*(?:사이즈|거|걸로|잔|용량)|벤티|venti|그란데|grande|엑스트라|extra|대용량|점보|빅\s*사이즈|메가\s*사이즈/g, () => { out.size = 'L'; });
  // 6) 카페 유형(부정 포함)
  cut(new RegExp('(프랜차이즈|체인점|체인)\\s*' + NEG, 'g'), () => { out.type = 'IND'; });
  cut(new RegExp('(개인|동네|로컬|독립)\\s*(?:카페|커피숍)?\\s*' + NEG, 'g'), () => { out.type = 'FR'; });
  cut(/프랜차이즈|체인점|체인|브랜드\s*카페/g, () => { out.type = 'FR'; });
  cut(/(?:개인|동네|로컬|독립)\s*(?:카페|커피숍|커피집)/g, () => { out.type = 'IND'; });
  // 7) 브랜드(제외 먼저: 'X 말고')
  const all = NL_BRANDS.flatMap(([c, al]) => al.map(a => [c, a])).sort((x, y) => y[1].length - x[1].length);
  for (const [c, a] of all) {
    const esc = a.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&');
    cut(new RegExp(esc + '\\s*' + NEG, 'g'), () => { if (!out.xbrands.includes(c)) out.xbrands.push(c); });
  }
  for (const [c, a] of all) {
    const esc = a.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&');
    cut(new RegExp(esc + (a === '메가' ? '(?!\\s*사이즈)' : ''), 'g'), () => { if (!out.brands.includes(c)) out.brands.push(c); });
  }
  out.xbrands = out.xbrands.filter(c => !out.brands.includes(c));
  // 8) 정렬 의도(우선순위 가성비 > 가격 > 별점 > 거리)
  const sorts = [];
  cut(/가성비|가심비|혜자|값어치/g, () => { sorts.push('VAL'); });
  cut(/최저가|가격\s*낮은|가격순|싼|싸게|싸고|저렴한|저렴하게|저렴하고|저렴|싸다|값싼/g, () => { sorts.push('PRICE'); });
  cut(/별점\s*(?:높은|좋은|순)?|평점\s*(?:높은|좋은|순)?|맛있는|맛집|후기\s*좋은|리뷰\s*좋은|평\s*좋은/g, () => { sorts.push('TASTE'); });
  cut(/가까운|가까이|가깝고|가까운\s*순|거리순|최단/g, () => { sorts.push('NEAR'); });
  for (const s of ['VAL', 'PRICE', 'TASTE', 'NEAR']) if (sorts.includes(s)) { out.sort = s; break; }
  if (new Set(sorts).size > 1) out.notes.push('정렬은 하나만 반영돼요');
  // 9) 데이터 없는 조건
  for (const [kind, terms] of UNSUP) for (const t of [...terms].sort((a, b) => b.length - a.length)) cut(new RegExp(t.replace(/\s/g, '\\s*'), 'g'), () => unsup(t, kind));
  // 10) 남은 말: 조사 떼고 불용어 빼고 → 모르는 말
  for (let tok of w.split(' ')) {
    tok = tok.trim(); if (!tok) continue;
    let t = tok; for (let k = 0; k < 2 && t.length > 1 && JOSA.test(t) && !STOP.has(t); k++) t = t.replace(JOSA, '');
    if (!t || STOP.has(t) || STOP.has(tok) || /^[\d\s]+$/.test(t) || /^(이하|이내|까지|안|내|미만|대|좋은|곳|순)$/.test(t)) continue;
    if (t.length < 2 && !/[a-z]/.test(t)) continue;
    if (t.length >= 3 && /(역|구|동)$/.test(t)) { unsup(t, '장소'); continue; }
    if (!out.unknown.includes(t)) out.unknown.push(t);
  }
  // 반경 상한(검색 반경 1km 고정)·하한
  if (out.rmax != null) {
    if (out.rmax > 1000) { out.notes.push(`${out.rmax >= 1000 ? (out.rmax / 1000) + 'km' : out.rmax + 'm'}는 앱 검색 반경(1km)보다 넓어서 1km로 적용`); out.rmax = 1000; }
    else if (out.rmax < 100) { out.notes.push(`${out.rmax}m는 너무 좁아서 100m로 적용`); out.rmax = 100; }
  }
  if (out.menu === 'cb' && out.temp === 'h') { out.temp = 'i'; out.notes.push('콜드브루는 아이스만 있어요'); }
  out.empty = !hasCondition(out) && !out.unsupported.length && !out.unknown.length;
  return out;
}
export const hasCondition = p => p.menu != null || p.temp != null || p.size != null || p.pmax != null || p.rmax != null || p.sort != null || p.rmin != null || p.type != null || p.brands.length > 0 || p.xbrands.length > 0;

/** 정렬 의도 → 앱 정렬(Preset). PRICE(싼 곳)는 가격 80% 가성비 정렬로 반영(순수 가격순은 '메뉴 비교' 화면) */
export const SORT_PRESET = { VAL: 'VAL', PRICE: 'VAL', TASTE: 'TASTE', NEAR: 'NEAR' };
/** 메뉴 키: 메뉴 없고 온도만 있으면 아메리카노, 온도 없으면 Hot(콜드브루는 Ice) */
export function menuKey(p) {
  if (p.menu == null && p.temp == null) return null;
  const m = p.menu || 'am'; if (m === 'cb') return 'cb_i';
  return `${m}_${p.temp || 'h'}`;
}
/** 분석 결과 → 새 필터(이전 조건은 지우고 새로 적용)·정렬. 정렬 의도가 없으면 지금 정렬 유지 */
export function toFilter(p, curPreset, base) {
  const f = { ...base };
  const mk = menuKey(p); if (mk) f.menu = mk;
  if (p.pmax != null) f.pmax = p.pmax;
  if (p.rmax != null) f.rmax = p.rmax;
  if (p.size) f.sz = p.size;
  if (p.rmin != null) f.rmin = p.rmin;
  if (p.brands.length) { f.brands = [...p.brands].sort((a, b) => a - b); f.type = 'FR'; }
  else if (p.type) f.type = p.type;
  if (p.xbrands.length && f.type !== 'IND') f.xbrands = [...p.xbrands].sort((a, b) => a - b);
  return { filter: f, preset: p.sort ? SORT_PRESET[p.sort] : curPreset };
}
