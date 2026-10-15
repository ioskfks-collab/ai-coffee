// 서비스 워커: 앱 셸 미리 캐시 + 같은 출처 GET만 캐시 우선. 외부 요청 없음.
// 매장 DB(data/aicoffee-db-r4.txt.gz)는 앱이 처음 한 번 받아 'aic-db-*' 캐시에 넣음(중복 다운로드 방지).
const SHELL = 'aic-shell-beta-1.8.3-r3-2'; // Web Beta 1.8.3 r3-2(매장별 출처: 인허가 추가 매장 표시) · (사진 보기 행·탭, 개인 카페 확인 가격·가격 미확인, js/beta183.js 셸 포함) // Web Beta 1.8.2(메뉴 보기·나의 메뉴·취향·시즌 섹션, data/1.8.2 CSV 셸 포함) // Web Beta 1.8.1 (maskable 아이콘 #FAF5EE 정사각 바탕 합성으로 셸 갱신(r3-5). 이전: 아이콘 icon-c-final 교체로 셸 갱신(r3-4). 이전: '별점 반영' 조건 좁힘(바로 아래 카드가 더 쌀 때만)·'별점 반영' 표시·시트 안내 문구 변경으로 셸 갱신. 이전 셸 캐시 이름들과 모두 다름 → activate에서 지움)
const DB_CACHE = 'aic-db-2026-10-14-r4'; // Beta 1.8: 매장 DB 정리(중복·비커피 제거, data/aicoffee-db-r4.txt.gz). 이전 DB 캐시는 activate에서 지움
const ASSETS = ['./', 'index.html', 'styles.css', 'js/main.js', 'js/app.js', 'js/core.js', 'js/icons.js', 'js/idmap.js', 'js/beta182.js', 'js/beta183.js', 'data/1.8.2/taste_tag_phrases.csv', 'data/1.8.2/season_menus.csv', 'data/1.8.2/brand_status.csv', 'manifest.webmanifest',
  'fonts/nanum_square_round_r.otf', 'fonts/nanum_square_round_b.otf', 'fonts/nanum_square_round_eb.otf',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'licenses/OFL-NanumSquareRound.txt'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DB_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isNav = req.mode === 'navigate';
  e.respondWith((async () => {
    const hit = await caches.match(isNav ? 'index.html' : req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && !url.pathname.endsWith('.gz')) { const c = await caches.open(SHELL); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      if (isNav) { const idx = await caches.match('index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
