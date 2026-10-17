// Service worker: يخلّي «حياتي» يفتح بدون نت، ويوصل التنبيهات للآيفون (iOS يطلب showNotification من SW)
// كود التطبيق بس ينحفظ هني — بياناتك ما تمر من الكاش أبداً.
const VERSION = 'hayati-v25';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'js/core/errlog.js', 'js/i18n/i18n-en.js', 'js/i18n/i18n.js', 'js/core/config.js', 'js/core/sms.js', 'js/core/store.js', 'js/features/calendar.js', 'js/core/icons.js', 'js/core/app.js', 'js/features/extras.js', 'js/features/extras2.js', 'js/features/extras3.js',
  'js/features/study.js', 'js/features/watch.js', 'js/features/import.js', 'js/features/timetable.js', 'js/features/bankimport.js', 'js/features/recipes.js', 'js/features/kitchen.js', 'js/features/lock.js', 'js/features/motion.js', 'js/features/pwa.js', 'js/features/find.js', 'js/features/insights.js', 'js/features/community.js', 'js/features/privacy.js', 'js/features/payday.js', 'js/features/worship.js', 'js/features/ibada.js', 'js/features/qibla.js', 'js/features/travel.js', 'js/features/tools.js', 'js/features/officetext.js', 'js/features/lectures.js', 'js/features/levels.js', 'js/features/firstmin.js', 'js/features/fit.js', 'js/features/goalphoto.js', 'js/features/reportimg.js', 'js/features/backup.js', 'js/features/widget.js', 'js/features/account.js', 'js/features/whatsnew.js', 'js/native/native.js', 'privacy.html', 'terms.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // المكتبات والخطوط محلية (DW-011)؛ pdf.js ينحفظ أول ما ينستخدم
  'vendor/supabase/supabase.min.js', 'vendor/fonts/fonts.css',
  ...['arabic', 'latin'].flatMap((s) => [400, 500, 600, 700].map((w) => `vendor/fonts/plex-${s}-${w}.woff2`)),
];
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // الكود يتحدّث من النت أول (Vercel يرسل no-cache)، والكاش بس لما ما فيه نت
    if (url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) e.respondWith(networkFirst(req));
    return;
  }
  // أي شي برّا (Supabase لو تفعّلت الحسابات) يروح للنت مباشرة بدون كاش
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
