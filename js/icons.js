// 직접 그린 SVG 아이콘(외부 아이콘 파일·폰트 없음). Android CoffeeIcon.kt 경로 + 단순 기본 도형
const s = (body, fill = false) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const I = {
  cup: s('<path d="M4.5 9.5h12V14c0 3-2.5 5.5-5.5 5.5h-1c-3 0-5.5-2.5-5.5-5.5z"/><path d="M16.5 11h1.3c1.5 0 2.5 1 2.5 2.3s-1 2.3-2.5 2.3h-1.5"/><path stroke-width="1.6" d="M8.5 3.5c-.9 1.1.9 2.1 0 3.5M12.5 3.5c-.9 1.1.9 2.1 0 3.5"/>'),
  nav: s('<path d="M12 3.5 19 20l-7-3.5L5 20z"/>'),
  sliders: s('<path d="M4 7h16M4 17h16"/><circle cx="8.8" cy="7" r="2.2" fill="#fff"/><circle cx="15.2" cy="17" r="2.2" fill="#fff"/>'),
  starLine: s('<path d="M12 3.6 14.5 8.9l5.7.6-4.3 3.9 1.2 5.7L12 16.2l-5.1 2.9 1.2-5.7-4.3-3.9 5.7-.6z"/>'),
  star: s('<path d="M12 3.6 14.5 8.9l5.7.6-4.3 3.9 1.2 5.7L12 16.2l-5.1 2.9 1.2-5.7-4.3-3.9 5.7-.6z"/>', true),
  placeOn: s('<path d="M12 21.5s-6.5-6.2-6.5-11.3a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11.3-6.5 11.3z"/><circle cx="12" cy="10" r="2.3" fill="#E8D5BE" stroke="none"/>', true),
  placeOff: s('<path d="M12 21.5s-6.5-6.2-6.5-11.3a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11.3-6.5 11.3z"/><circle cx="12" cy="10" r="2.3"/>'),
  listOn: s('<path stroke-width="2.4" d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.5M4 12h.5M4 17.5h.5"/>'),
  listOff: s('<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.5M4 12h.5M4 17.5h.5"/>'),
  infoOn: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M12 11v5.5M12 7.6v.2" stroke="#E8D5BE" stroke-width="2.2" stroke-linecap="round"/></svg>',
  info: s('<circle cx="12" cy="12" r="9"/><path stroke-width="2" d="M12 11v5.5M12 7.6v.2"/>'),
  refresh: s('<path stroke-width="2.2" d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.2v4.6h-4.6" stroke-width="2.2"/>'),
  back: s('<path stroke-width="2.2" d="M20 12H5M11 5.5 4.5 12l6.5 6.5"/>'),
  drop: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10h9L12 15z" fill="currentColor"/></svg>',
  check: s('<path stroke-width="2.6" d="M5 12.5l4.5 4.5L19 7.5"/>'),
  down: s('<path stroke-width="2.2" d="M6.5 9.5 12 15l5.5-5.5"/>'),
  up: s('<path stroke-width="2.2" d="M6.5 14.5 12 9l5.5 5.5"/>'),
  right: s('<path stroke-width="2.2" d="M9.5 6.5 15 12l-5.5 5.5"/>'),
};
