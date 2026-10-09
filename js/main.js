import { start } from './app.js';
start();
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인 캐시 없이 동작 */ }); });
