// DW-042: يقيس الواجهة من داخل WebView أندرويد (أدوات المطوّر مفعّلة بنسخة debug): وين يبدأ عنوان الهيدر
// مقارنة بشريط الساعة. uiautomator ما يشوف نص الـ WebView، فهذا القياس الدقيق.
// node scripts/android-webview.mjs <devtools-port> <statusBarPx> <density>
const [port, barPx, dpi] = process.argv.slice(2).map(Number);
let list;
try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); }
catch { console.log("⚠️ ما قدرنا نوصل لأدوات المطوّر بالـ WebView — شيك على launch.png بعينك"); process.exit(0); }
const page = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
if (!page) { console.log("⚠️ ما لقينا صفحة WebView للقياس"); process.exit(0); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
const expr = `(() => { const h = document.querySelector(".shell-header h1, h1"); const r = h && h.getBoundingClientRect();
  const probe = document.createElement("div"); probe.style.cssText = "position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top)"; document.body.appendChild(probe);
  const env = parseFloat(getComputedStyle(probe).paddingTop) || 0; probe.remove();
  const cap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top")) || 0;
  return JSON.stringify({ top: r ? r.top : null, text: h ? h.textContent.trim().slice(0, 30) : null, dpr: devicePixelRatio, vh: innerHeight, inset: Math.max(env, cap) }); })()`;
const res = await new Promise((ok) => {
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) ok(d.result?.result?.value); };
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } }));
});
ws.close();
const v = JSON.parse(res ?? "{}");
if (v.top == null) { console.log("⚠️ ما فيه عنوان بالصفحة للقياس"); process.exit(0); }
// إحداثيات الـ WebView بالـ CSS px من أعلى الـ WebView. لو Capacitor حط الـ WebView تحت الشريط (padding) فالأعلى = الشريط أصلاً
const scale = v.dpr || dpi / 160;
const topPx = Math.round(v.top * scale);
console.log(`   عنوان «${v.text}» يبدأ ${Math.round(v.top)}px (≈${topPx} بكسل جهاز) · شريط الساعة ${barPx} بكسل`);
// الـ WebView يا تحت الشريط (Capacitor يحط له padding، والـ inset = 0)، يا ملء الشاشة (والـ inset = طول الشريط).
// ملء الشاشة نعرفه من الطول: innerHeight × dpr قريب من طول الشاشة. لو ملء الشاشة لازم العنوان ينزل تحت الـ inset
const screenH = Number(process.env.SCREEN_H || 0);
const full = screenH ? v.vh * scale > screenH - barPx / 2 : v.inset > 0;
console.log(`   الـ WebView ${Math.round(v.vh * scale)} من ${screenH || "؟"} بكسل (${full ? "ملء الشاشة" : "تحت الشريط"}) · inset ${v.inset}px`);
if (full && (v.inset * scale < barPx * 0.9 || v.top < v.inset)) {
  console.error(`❌ الواجهة ملء الشاشة بس العنوان (${Math.round(v.top)}px) فوق حافة الشريط (${v.inset}px CSS، الشريط ${barPx} بكسل) — edge-to-edge مكسور`); process.exit(1);
}
console.log(full ? "✅ ملء الشاشة والعنوان تحت حافة شريط الساعة" : "✅ الـ WebView يبدأ تحت شريط الساعة (Capacitor يحجز مكانه)");
