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
  return JSON.stringify({ top: r ? r.top : null, text: h ? h.textContent.trim().slice(0, 30) : null, dpr: devicePixelRatio, vh: innerHeight }); })()`;
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
// WV_TOP = أعلى الـ WebView على الشاشة (من uiautomator). Capacitor يا يحط الـ WebView تحت الشريط، يا يخليه ملء الشاشة ويعطي CSS الحواف
const wvTop = Number(process.env.WV_TOP || 0), abs = wvTop + topPx;
console.log(`   الـ WebView يبدأ ${wvTop} · العنوان على الشاشة ${abs}`);
if (abs < barPx) { console.error(`❌ العنوان تحت شريط الساعة (${abs} < ${barPx}) — edge-to-edge مكسور`); process.exit(1); }
console.log("✅ العنوان تحت شريط الساعة مو وراه");
