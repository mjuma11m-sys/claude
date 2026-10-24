// فيديو إداراتي للشركاء: يصوّر stage.html فريم فريم بـ render(t).
// node record.mjs renders [t1,t2,…]  → renders/f/00000.png … (30fps، 1920×1080) · مع أوقات = لقطات معاينة بس
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "renders");
const PREVIEW = process.argv[3]?.split(",").map(Number);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30, LEN = 50;

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("file://" + path.join(HERE, "stage.html"));
await p.evaluate(() => document.fonts.ready);
if (!(await p.evaluate(() => document.fonts.check("700 20px Plex", "إداراتي")))) throw new Error("الخط العربي ما تحمّل");
// اللقطات الثلاث بالكاش قبل البداية، عشان التبديل ما يطلع فريم فاضي
await p.evaluate(() => Promise.all(["iphone-1-home.png", "iphone-4-track.png", "iphone-5-docs.png"].map((f) => { const i = new Image(); i.src = "../../docs/company/store/" + f; return i.decode(); })));
const shot = async (t, file) => {
  await p.evaluate((t) => window.render(t), t);
  await p.evaluate(() => document.getElementById("shot").decode().catch(() => {}));
  await p.screenshot({ path: file });
};
if (PREVIEW) {
  fs.mkdirSync(OUT + "/preview", { recursive: true });
  for (const t of PREVIEW) await shot(t, `${OUT}/preview/t${t}.png`);
} else {
  fs.rmSync(OUT + "/f", { recursive: true, force: true });
  fs.mkdirSync(OUT + "/f", { recursive: true });
  for (let i = 0; i < FPS * LEN; i++) await shot(i / FPS, `${OUT}/f/${String(i).padStart(5, "0")}.png`);
  fs.writeFileSync(OUT + "/meta.json", JSON.stringify({ fps: FPS, length: LEN }));
}
await b.close();
