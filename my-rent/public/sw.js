// إداراتي — يشتغل بدون إنترنت (DW-014)
// الصفحة: من الشبكة أول (عشان التحديثات توصل)، وإذا ما فيه نت من النسخة المحفوظة.
// الملفات (assets بأسماء فيها hash): من المحفوظ أول، وتتحدّث بالخلفية.
const CACHE = "idarati-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.headers.has("range")) return; // DW-035: الفيديو (طلبات جزئية 206) ما ينحفظ بالكاش
  if (req.mode === "navigate") {
    // DW-035: نسخة «./» = صفحة التطبيق بس. صفحة التعريف (about.html) لها نسختها، وما تطغى على التطبيق
    const isApp = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(isApp ? "./" : req, res.clone());
        return res;
      } catch {
        return (await caches.match(isApp ? "./" : req)) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok && res.status === 200) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
