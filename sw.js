const CACHE_NAME = 'captain-hook-v2';
const assets = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './assets/js/tmdbService.js',
    './assets/js/config.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// Force update by clearing old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});
