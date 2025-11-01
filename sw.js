const CACHE_NAME = '10min-rpg-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/game.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app assets');
                return cache.addAll(ASSETS.filter(asset => !asset.includes('icon')));
            })
            .catch((err) => {
                console.log('Cache failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Safely claim clients with error handling
            return self.clients.claim().catch((err) => {
                // Ignore errors if clients are not available
                console.log('Clients claim failed (may be expected):', err);
            });
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }

    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        // Invalid URL, skip caching
        event.respondWith(fetch(request));
        return;
    }

    // Skip caching for non-HTTP/HTTPS requests (chrome-extension, chrome, about, data, etc.)
    if (!url.protocol.startsWith('http')) {
        event.respondWith(fetch(request));
        return;
    }

    // Skip caching for chrome-extension and other special schemes
    if (url.protocol === 'chrome-extension:' || 
        url.protocol === 'chrome:' || 
        url.protocol === 'about:' ||
        url.protocol === 'data:') {
        event.respondWith(fetch(request));
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Only cache HTTP/HTTPS requests
                    if (url.protocol.startsWith('http')) {
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            })
                            .catch((err) => {
                                console.log('Cache put failed:', err);
                            });
                    }

                    return response;
                });
            })
            .catch(() => {
                // If both cache and network fail, could return a custom offline page
                return caches.match('/index.html');
            })
    );
});
