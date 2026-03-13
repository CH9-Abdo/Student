const CACHE_NAME = 'studentpro-cache-v1';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/auth.css',
    './css/dashboard.css',
    './css/planner.css',
    './css/pomodoro.css',
    './css/responsive.css',
    './js/app.js',
    './js/auth.js',
    './js/config.js',
    './js/dashboard.js',
    './js/db.js',
    './js/leaderboard.js',
    './js/planner.js',
    './js/pomodoro.js',
    './js/templates.js',
    './js/translations.js',
    './js/utils.js',
    './js/analytics.js',
    './assets/vendor/supabase.js',
    './assets/vendor/chart.js',
    './assets/vendor/fontawesome/css/all.min.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching shell assets');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Skip supabase calls to allow real-time or handled by db.js
    if (e.request.url.includes('supabase.co')) return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
