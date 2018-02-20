'use strict';

let version = '1.0';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open('hamaker-v'+version).then(cache => {
            return cache.addAll([
                'index.html'
            ])
            .then(() => self.skipWaiting());
        })
    )
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(cacheNames.map(function(thisCacheName) {
                if (thisCacheName !== 'hamaker-v'+version) {
                    console.log('[ServiceWorker] Removing Cached Files from Cache - ', thisCacheName);
                    return caches.delete(thisCacheName);
                }
            }));
        })
    );
});