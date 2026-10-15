// فيديو شرح إداراتي — يسجّل التطبيق الحقيقي (my-rent/dist) داخل مسرح 9:16 بكابشن عربي.
// node record.mjs <outDir>  → <outDir>/f/*.jpg + list.txt + taps.json
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "renders");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const port = 4183, U = `http://localhost:${port}/`;
const srv = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], { cwd: path.join(HERE, "../../my-rent"), stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { await fetch(U); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const sym = "data:image/svg+xml;base64," + fs.readFileSync(path.join(HERE, "../../my-rent/brand/symbol.svg")).toString("base64");
const stage = fs.readFileSync(path.join(HERE, "stage.html"), "utf8").replace("__SYMBOL__", sym);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, serviceWorkers: "block" });
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
await S("card", "مين ما دفع هالشهر؟", "", false); await wait(1600);
await S("card", "إداراتي", "إيجاراتك وعقودك بمكان واحد", true); await wait(1900);
await S("hideCard"); await wait(300);
const esc = async () => { await app.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await wait(500); };

// 1 الرئيسية + استلمت
await S("step", 1, "الوضع بنظرة · واستلمت بضغطة", "نسبة التحصيل واللي عليهم · الدفعة على أقدم شهر وفيه تراجع"); await wait(2000);
await tap(".got-btn", { after: 3000 });

// 2 المتأخر: ذكّره + كشف حساب
await S("step", 2, "المتأخر: ذكّره · وكشف حساب", "رسالة واتساب جاهزة · كل شهر: المدفوع والباقي"); await wait(300);
await tap(".bottom-item", { hasText: "المستأجرين", after: 1100 });
await tap(".unit-card", { hasText: "شقة 3 ", after: 1200 });
await tap(".dlg .btn-wa", { click: false, after: 900 });
await tap(".dlg button", { hasText: "كشف حساب", after: 2400 });
await esc();

// 3 العقد
await S("step", 3, "العقد يتعبّى بروحه", "نموذجك أنت ببيانات المستأجر · ارفع الموقّع · راجعه مع محامي"); await wait(300);
await tap(".unit-card", { hasText: "شقة 3 ", after: 1000 });
await tap(".dlg button", { hasText: "العقد", after: 1400 });
await app.locator(".dlg").evaluate((el) => el.scrollTo({ top: 260, behavior: "smooth" })); await wait(1800);
await app.locator(".dlg").evaluate((el) => el.scrollTo({ top: 0, behavior: "smooth" })); await wait(700);
await tap(".contract-file .btn", { hasText: "ارفع العقد", click: false, after: 1000 });
await esc();

// 4 التأمين
await S("step", 4, "التأمين محفوظ مع الوحدة", "وقت الإخلاء يسألك: رجّعته أو انخصم؟"); await wait(300);
await tap(".unit-card", { hasText: "شقة 3 ", after: 1000 });
await app.locator(".dlg").evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })); await wait(900);
await tap(".dlg button", { hasText: "إخلاء الوحدة", after: 600 });
await app.locator(".dlg").evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })); await wait(1900);
await tap(".dlg .confirm-box button", { hasText: "إلغاء", after: 500 });
await esc();

// 5 المصاريف الثابتة
await S("step", 5, "المصاريف الثابتة بضغطة", "الكهرباء والإنترنت والعاملة · ما تتكرر بنفس الشهر"); await wait(300);
await tap(".bottom-item", { hasText: "الميزانية", after: 1500 });
await tap(".nudge-gold .btn", { after: 2600 });

// 6 التقارير
await S("step", 6, "التقارير", "الدخل مقابل المصروف لآخر 6 أشهر · ملف CSV للمحاسب"); await wait(300);
await tap(".bottom-item", { hasText: "المزيد", after: 700 });
await tap(".sheet-item", { hasText: "التقارير", after: 1700 });
await app.evaluate(() => window.scrollTo({ top: 380, behavior: "smooth" })); await wait(1700);

// 7 حسابك
await S("step", 7, "حسابك · اختياري", "كل حساب بياناته له · بدون حساب تبقى على جهازك"); await wait(300);
await tap(".bottom-item", { hasText: "المزيد", after: 700 });
await tap(".sheet-item", { hasText: "الإعدادات", after: 1000 });
await app.locator("#sync-h").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "smooth" })); await wait(1300);
await app.evaluate(() => window.scrollBy({ top: -70, behavior: "smooth" })); await wait(2600);

// الختام
await S("outro"); await wait(4800);

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
