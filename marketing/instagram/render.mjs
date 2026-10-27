// يصوّر كل [data-out] بـ posts.html ← out/<اسم>.png (بالمقاس الحقيقي)
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import fs from "node:fs"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(path.join(HERE, "out"), { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1200, height: 2000 } });
await p.goto("file://" + path.join(HERE, "posts.html"));
await p.evaluate(() => document.fonts.ready);
if (!(await p.evaluate(() => document.fonts.check("700 20px Plex", "إداراتي")))) throw new Error("الخط ما تحمّل");
for (const el of await p.$$("[data-out]")) {
  const name = await el.getAttribute("data-out");
  await el.screenshot({ path: path.join(HERE, "out", name + ".png") });
}
await b.close(); console.log("ok");
