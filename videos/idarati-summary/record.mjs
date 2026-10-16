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
await S("card", "كل إيجاراتك بتطبيق واحد", "", false); await wait(1500);
await S("card", "إداراتي", "كل اللي يسويه، بسرعة", true); await wait(1400);
await S("hideCard"); await wait(250);
const esc = async () => { await app.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await wait(250); };
const scroll = (y) => app.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y);
const dlgScroll = (y) => app.locator(".dlg").evaluate((el, y) => el.scrollTo({ top: y, behavior: "smooth" }), y);
const STEP = 2600;
const feat = async (n, title, fn) => { await S("step", n, title, ""); const t = Date.now(); taps.push(t / 1000 - 0.38); await fn(); const left = STEP - (Date.now() - t); if (left > 0) await wait(left); };
const unit3 = async () => { await nav("tenants"); await wait(350); await app.locator(".unit-card", { hasText: "شقة 3 " }).evaluate((el) => el.click()); await wait(450); };

await feat(1, "التحصيل بنظرة", async () => { await wait(900); await scroll(120); });
await feat(2, "استلمت بضغطة", async () => { await app.locator(".got-btn").first().evaluate((el) => el.click()); });
await feat(3, "المتأخر وتذكيره", async () => { await unit3(); await dlgScroll(120); });
await feat(4, "إيصال وكشف حساب", async () => { await app.locator(".dlg button", { hasText: "كشف حساب" }).evaluate((el) => el.click()); await wait(900); await dlgScroll(200); });
await feat(5, "العقد يتعبّى", async () => { await esc(); await unit3(); await app.locator(".dlg button", { hasText: "العقد" }).evaluate((el) => el.click()); await wait(800); await dlgScroll(300); });
await feat(6, "التأمين محفوظ", async () => { await esc(); await unit3(); await dlgScroll(130); });
await feat(7, "الميزانية والثابت", async () => { await esc(); await nav("budget"); await wait(1200); await scroll(250); });
await feat(8, "بنك العائلة", async () => { await nav("bank"); await wait(1000); await scroll(200); });
await feat(9, "الصيانة والموردين", async () => { await nav("house"); await wait(1100); await nav("vendors"); });
await feat(10, "التقارير و CSV", async () => { await nav("reports"); await wait(900); await scroll(350); });
await feat(11, "بحث · خط كبير · ليلي", async () => { await nav("settings"); await wait(600); await app.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); });
await feat(12, "نسخة احتياطية · حساب اختياري", async () => { await app.evaluate(() => document.documentElement.removeAttribute("data-theme")); await app.locator("#sync-h").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" })); });

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
