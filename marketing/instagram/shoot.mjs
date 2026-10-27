// لقطات التطبيق للبوستات (بيانات تجريبية بس) ← shots/<اسم>.png. يحتاج my-rent/dist (npm run build)
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname), PORT = 4791, BASE = `http://localhost:${PORT}/`;
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { cwd: path.join(HERE, "../../my-rent"), stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
const p = await ctx.newPage();
const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(HERE, "shots", name + ".png") }); };
const go = async (hash, lang = "ar") => {
  await p.goto(BASE + "#home"); await p.evaluate((l) => { localStorage.clear(); localStorage.setItem("idarati-lang", l); }, lang);
  await p.goto(BASE + hash); await p.reload(); await p.waitForTimeout(900);
};
try {
  await go("#tenants"); await shot("tenants");
  await go("#budget"); await shot("budget");
  await go("#bank"); await shot("bank");
  await go("#reports"); await p.locator("#year-report").scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -90)); await shot("year");
  await go("#home"); await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await shot("home-follow");
  await go("#home"); await p.locator(".shell-actions button").first().click(); await p.waitForTimeout(300);
  await p.fill("#search-q", "شقة"); await shot("search");
  await go("#tenants"); await p.locator(".unit-card").first().click(); await p.waitForTimeout(400); await shot("unit");
  await p.locator(".unit-tabs [role=radio]", { hasText: "السجل" }).first().click(); await p.waitForTimeout(200); await p.locator(".dlg .rows-tap li button").first().click(); await p.waitForTimeout(600); await shot("receipt");
  await go("#home", "en"); await shot("home-en");
  await go("#settings"); await shot("settings");
} finally { await b.close(); srv.kill(); }
console.log("ok");
