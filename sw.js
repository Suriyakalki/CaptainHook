const CACHE_NAME = 'captain-hook-v22';
const assets = [
    './',
    './index.html',
    './assets/css/style.css?v=22.0',
    './assets/js/app.js?v=20.0',
    './assets/js/tmdbService.js?v=20.0',
    './assets/js/config.js?v=20.0'
];

self.addEventListener('install', e => {
    // Skip waiting so the new SW activates immediately
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// Force update by clearing ALL old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});
