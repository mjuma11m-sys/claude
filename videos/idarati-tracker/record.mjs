// فيديو شرح صفحة «متابعة الإيجار» (DW-022) — يسجّل التطبيق الحقيقي (my-rent/dist) داخل مسرح 9:16 بكابشن عربي.
// node record.mjs <outDir>  → <outDir>/f/*.jpg + list.txt + taps.json
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "renders");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const port = 4184, U = `http://localhost:${port}/`;
const srv = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], { cwd: path.join(HERE, "../../my-rent"), stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { await fetch(U); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const sym = "data:image/svg+xml;base64," + fs.readFileSync(path.join(HERE, "../../my-rent/brand/symbol.svg")).toString("base64");
const stage = fs.readFileSync(path.join(HERE, "stage.html"), "utf8").replace("__SYMBOL__", sym);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, serviceWorkers: "block", acceptDownloads: true });
const p = await ctx.newPage();
await p.route(U + "__stage.html", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: stage }));
await p.goto(U + "#home");
await p.evaluate(() => localStorage.clear());
await p.goto(U + "__stage.html");
await p.waitForSelector("iframe[name=app]", { state: "attached" });
let app; for (let i = 0; i < 50 && !app; i++) { app = p.frame({ name: "app" }); if (!app) await p.waitForTimeout(100); }
await app.waitForSelector(".got-btn");
await p.evaluate(() => document.fonts.ready);
await app.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);

fs.rmSync(OUT + "/f", { recursive: true, force: true });
fs.mkdirSync(OUT + "/f", { recursive: true });
const cdp = await ctx.newCDPSession(p);
const frames = [], taps = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const f = `${OUT}/f/${String(frames.length).padStart(5, "0")}.jpg`;
  fs.writeFileSync(f, Buffer.from(data, "base64"));
  frames.push([f, metadata.timestamp]);
  try { await cdp.send("Page.screencastFrameAck", { sessionId }); } catch {}
});

const wait = (ms) => p.waitForTimeout(ms);
const S = (fn, ...a) => p.evaluate(([fn, a]) => window.stage[fn](...a), [fn, a]);
const nav = (hash) => app.evaluate((h) => { location.hash = h; window.scrollTo(0, 0); }, hash);
// دائرة اللمس فوق العنصر، بعدين click حقيقي داخل التطبيق
const tap = async (sel, { after = 900, click = true, nth = 0, hasText } = {}) => {
  let loc = app.locator(sel); if (hasText) loc = loc.filter({ hasText }); loc = loc.nth(nth);
  await loc.evaluate((el) => el.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  await wait(350);
  const r = await loc.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await S("tap", r.x, r.y);
  taps.push(Date.now() / 1000);
  await wait(380);
  if (click) await loc.evaluate((el) => el.click());
  await wait(after);
};

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const t0 = Date.now() / 1000;

// الهوك
await S("card", "مين دافع مقدم؟ مين متأخر؟<br>وعقد مين قرب يخلص؟", "", false); await wait(1900);
await S("card", "متابعة الإيجار", "ملف المتابعة كامل · بشاشة وحدة", true); await wait(1500);
await nav("track"); await wait(200);
await S("hideCard"); await wait(250);
const esc = async () => { await app.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await wait(300); };
const scroll = (y) => app.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y);
const to = (sel, block = "start") => app.locator(sel).first().evaluate((el, b) => el.scrollIntoView({ block: b, behavior: "smooth" }), block);
const side = (f) => app.locator(".tbl-scroll").evaluate((el, f) => el.scrollTo({ left: -(el.scrollWidth - el.clientWidth) * f, behavior: "smooth" }), f);
const dlgTo = (sel) => app.locator(".dlg " + sel).first().evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
const feat = async (n, title, sub, ms, fn) => { await S("step", n, title, sub); const t = Date.now(); await fn(); const left = ms - (Date.now() - t); if (left > 0) await wait(left); };
const chip = (text, nth = 0) => tap(".track-filters [role=radio]", { hasText: text, nth, after: 700 });

await feat(1, "المؤشرات بنظرة", "المستحق · المسدد · المتبقي · المدفوع مقدماً", 3600, async () => { await wait(1600); });
await feat(2, "جدول لكل وحدة", "12 عمود — اسحب يمين ويسار", 4200, async () => { await to("#track-tbl", "center"); await wait(1300); await side(0.5); });
await feat(3, "مدفوع لين · أيام لنهاية العقد", "وحالة العقد: سارية · قريبة الانتهاء · منتهية", 3800, async () => { await side(1); await wait(1100); await tap("#track-tbl .lease-soon", { click: false, after: 600 }); });
await feat(4, "صفّي بالنوع والسداد", "شقة · محل تجاري · ستور · بيت · روضة", 4600, async () => {
  await side(0); await scroll(0); await wait(700);
  await to(".track-filters", "start"); await wait(500);
  await chip("محل تجاري"); await chip("الكل"); await chip("متأخر");
});
await feat(5, "الإيجارات المدفوعة مقدماً", "مدفوع لين أي شهر · كم شهر · كم مبلغ", 3800, async () => {
  await chip("الكل", 2); await to("#ahead-tbl", "center"); await wait(800);
  await tap("#ahead-tbl tbody tr", { click: false, after: 400 });
});
await feat(6, "دفعة مقدمة بضغطة", "شهر · 3 · 6 · سنة — وتراجع بضغطة", 5600, async () => {
  await to("#track-tbl", "center"); await wait(600);
  await tap("#track-tbl tbody tr", { hasText: "شقة 4", after: 700 });
  await dlgTo(".ahead-form"); await wait(600);
  await tap(".dlg .ahead-form [role=radio]", { hasText: "سنة", after: 900 });
  await tap("#ahead-btn", { after: 500 });
  await to("#ahead-tbl", "center");
});
await feat(7, "تصدير Excel", "نفس شكل القالب · بدون أرقام هواتف", 3600, async () => {
  await to("#track-tbl", "center"); await wait(500);
  await tap(".tracker .link", { hasText: "تصدير Excel", after: 900 });
});

// الختام
await S("outro"); await wait(4300);

const tStop = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
let list = "";
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1][1] - frames[i][1] : tStop - frames[i][1];
  list += `file '${frames[i][0]}'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`;
}
list += `file '${frames.at(-1)[0]}'\n`;
fs.writeFileSync(OUT + "/list.txt", list);
const start = frames[0][1];
fs.writeFileSync(OUT + "/taps.json", JSON.stringify({ taps: taps.map((t) => +(t - start).toFixed(3)), length: +(tStop - start).toFixed(3), t0: +(t0 - start).toFixed(3) }));
console.log("frames", frames.length, "len", (tStop - start).toFixed(1));
await ctx.close(); await b.close(); srv.kill();
