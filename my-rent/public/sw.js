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
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        (await caches.open(CACHE)).put("./", res.clone());
        return res;
      } catch {
        return (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
