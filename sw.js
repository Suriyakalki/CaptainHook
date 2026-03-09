const CACHE_NAME = 'captain-hook-v62';
const assets = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/style.css?v=62.0',
    './assets/js/app.js?v=62.0',
    './assets/js/tmdbService.js?v=62.0',
    './assets/js/config.js?v=62.0'
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
    const url = new URL(e.request.url);
    // Check if the request is for one of our core versioned assets
    const isInternal = assets.some(asset => {
        const assetPath = asset.split('?')[0].replace('./', '');
        return url.pathname.endsWith(assetPath);
    });

    if (isInternal || url.origin === location.origin) {
        // Stale-While-Revalidate for local assets
        e.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(e.request).then(cachedResponse => {
                    const fetchPromise = fetch(e.request).then(networkResponse => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // Network first for external APIs
        e.respondWith(
            fetch(e.request).catch(() => {
                return caches.match(e.request);
            })
        );
    }
});
