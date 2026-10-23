// DW-038: لقطات المتجر من التطبيق نفسه (بيانات تجريبية + التنبيه) — آيفون 6.7" وأندرويد 1080×1920، وصورة Google Play
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
const OUT = "../docs/company/store/";
const srv = spawn("npx", ["vite", "preview", "--port", "4187", "--strictPort"], { stdio: "ignore" });
const U = "http://localhost:4187/";
for (let i = 0; i < 50; i++) { try { await fetch(U); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const label = `document.body.insertAdjacentHTML("beforeend", '<div style="position:fixed;inset:auto 0 0 0;z-index:9999;text-align:center;padding:6px 0 calc(6px + env(safe-area-inset-bottom));font:600 12px IBM Plex Sans Arabic,sans-serif;background:rgba(20,33,58,.88);color:#F5F2EB">* لقطات ببيانات تجريبية</div>')`;
const shots = [
  ["1-home", "#home", null],
  ["2-tenants", "#tenants", null],
  ["3-unit", "#tenants", async (p) => { await p.locator(".unit-card").nth(1).click(); await p.waitForTimeout(600); }],
  ["4-track", "#track", null],
  ["5-docs", "#docs", null],
];
for (const [dev, vw, vh, dpr] of [["iphone", 430, 932, 3], ["android", 360, 640, 3]]) {
  for (const [n, hash, act] of shots) {
    const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
    await p.goto(U + hash); await p.evaluate(() => { localStorage.clear(); localStorage.setItem("idarati:welcomed", "1"); }); await p.reload(); await p.waitForTimeout(1300);
    if (act) await act(p);
    await p.evaluate(label); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}${dev}-${n}.png` });
    await p.close();
  }
}
// صورة Google Play المميزة 1024×500
const sym = fs.readFileSync("brand/symbol.svg", "utf8");
const g = await b.newPage({ viewport: { width: 1024, height: 500 } });
await g.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@700&family=IBM+Plex+Sans+Arabic:wght@400&display=swap"></head>
<body style="margin:0;width:1024px;height:500px;background:#14213A;color:#F5F2EB;display:flex;align-items:center;justify-content:center;gap:56px;direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif">
<div style="width:220px;height:220px">${sym.replace("<svg ", '<svg width="220" height="220" ')}</div>
<div><div style="font:700 92px 'Readex Pro',sans-serif;line-height:1.35">إداراتي</div><div style="font-size:30px;opacity:.9;margin-top:10px">يرتّب إيجاراتك وعقاراتك</div>
<div style="margin-top:18px;color:#C9963A;letter-spacing:4px;font-size:18px;direction:ltr;text-align:right">BY WADQA · BETA</div></div></body></html>`);
await g.waitForTimeout(1500);
await g.screenshot({ path: `${OUT}play-feature-1024x500.png` });
await b.close(); srv.kill();
console.log("ok");
