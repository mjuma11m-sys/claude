// node record.mjs renders [t1,t2,…] → renders/f/*.png (30fps 1080×1920) · مع أوقات = معاينة
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import fs from "node:fs"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname), OUT = path.resolve(process.argv[2] ?? "renders"), PREVIEW = process.argv[3]?.split(",").map(Number), FPS = 30;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto("file://" + path.join(HERE, "stage.html"));
await p.evaluate(async () => { await document.fonts.load("700 20px Plex", "إداراتي"); await document.fonts.load("400 20px Plex", "إداراتي"); await document.fonts.ready; });
if (!(await p.evaluate(() => document.fonts.check("700 20px Plex", "إداراتي")))) throw new Error("الخط ما تحمّل");
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
const LEN = await p.evaluate(() => window.LEN);
const shot = async (t, f) => { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: f }); };
if (PREVIEW) { fs.mkdirSync(OUT + "/preview", { recursive: true }); for (const t of PREVIEW) await shot(t, `${OUT}/preview/t${t}.png`); }
else { fs.rmSync(OUT + "/f", { recursive: true, force: true }); fs.mkdirSync(OUT + "/f", { recursive: true });
  for (let i = 0; i < Math.round(FPS * LEN); i++) await shot(i / FPS, `${OUT}/f/${String(i).padStart(5, "0")}.png`);
  fs.writeFileSync(OUT + "/meta.json", JSON.stringify({ fps: FPS, length: LEN })); }
await b.close();
