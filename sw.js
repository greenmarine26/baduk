/* 나의 바둑친구 — 오프라인 지원
   © 2026 연지아빠 */
const VER = 'baduk-v3.10';
const SHELL = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/tf-backend-wasm.min.js'
];
/* 신경망 12MB 는 IndexedDB 에 따로 저장되므로 여기서는 캐시하지 않는다 */
const SKIP = /kata-model-js|\.bin(\?|$)/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    await Promise.all(SHELL.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || SKIP.test(req.url)) return;
  /* 화면(HTML)은 새 판이 있으면 바로 받도록 네트워크 먼저 */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(VER);
        c.put('./index.html', r.clone());
        return r;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  /* 나머지(라이브러리 등)는 저장해 둔 것 먼저 */
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r && (r.status === 200 || r.type === 'opaque')) {
        const c = await caches.open(VER);
        c.put(req, r.clone());
      }
      return r;
    } catch (err) {
      return caches.match(req) || Response.error();
    }
  })());
});
