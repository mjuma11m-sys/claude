/* Offline shell for WADQA Hub.
   - Hashed build files (/assets/*, fonts): cache-first, they never change under the same name.
   - Page navigations: network-first, falling back to the cached app shell when offline.
   - Everything else (the Supabase API, auth, any cross-origin request) is NOT touched and NOT cached,
     so no user data ever lands in this cache. Bump VERSION to drop old caches. */
const VERSION = 'sh-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(VERSION).then((c) => c.put('/', copy))
        return res
      }).catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)) }
        return res
      })),
    )
  }
})
