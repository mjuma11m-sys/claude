// Service worker: يخلّي «حياتي» يفتح بدون نت، ويوصل التنبيهات للآيفون (iOS يطلب showNotification من SW)
// كود التطبيق بس ينحفظ هني — بياناتك ما تمر من الكاش أبداً.
const VERSION = 'hayati-v11';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'i18n-en.js', 'i18n.js', 'config.js', 'sms.js', 'store.js', 'calendar.js', 'icons.js', 'app.js', 'extras.js', 'extras2.js', 'extras3.js',
  'study.js', 'watch.js', 'import.js', 'lock.js', 'motion.js', 'pwa.js', 'find.js', 'insights.js', 'community.js', 'privacy.js', 'native.js', 'privacy.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
// مكتبات بإصدار مثبّت بالرابط = ما تتغير، فنقراها من الكاش أول
const PINNED_CDN = ['https://cdn.jsdelivr.net/npm/', 'https://cdnjs.cloudflare.com/ajax/libs/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // ملف واحد ناقص ما يوقف الباقي (addAll يفشل كله لو فشل ملف)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hayati-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const c = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') { const shell = await c.match('index.html'); if (shell) return shell; }
    throw err;
  }
}

async function cacheFirst(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // الكود يتحدّث من النت أول (Vercel يرسل no-cache)، والكاش بس لما ما فيه نت
    if (url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) e.respondWith(networkFirst(req));
    return;
  }
  if (PINNED_CDN.some((p) => req.url.startsWith(p))) e.respondWith(cacheFirst(req));
  // أي شي ثاني (Supabase وغيره) يروح للنت مباشرة بدون كاش
});

// ضغطة على التنبيه تفتح التطبيق (أو ترجعك له لو مفتوح)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of all) if ('focus' in w) return w.focus();
    return self.clients.openWindow('./');
  })());
});
