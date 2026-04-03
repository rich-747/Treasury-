// Treasury PWA Service Worker — Network-First (always fresh)
const CACHE = 'treasury-v3';

self.addEventListener('install', e => {
  // Activate immediately, don't wait for old SW to die
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  // Delete ALL old caches so stale content is wiped
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-FIRST: always fetch fresh from server, cache as fallback only
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never intercept Firebase, Google auth, Firestore — let them go direct
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('accounts.google')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a copy for offline fallback
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});

// Tell all open tabs to reload when this new SW takes over
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
