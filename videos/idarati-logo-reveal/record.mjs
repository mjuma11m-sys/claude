// كشف شعار إداراتي (DW-034): يصوّر stage.html فريم فريم بـ render(t).
// node record.mjs renders  → renders/f/00000.png … (30fps، 1080×1920)
import { chromium } from "../../my-rent/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "renders");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30, LEN = 13;

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await p.goto("file://" + path.join(HERE, "stage.html"));
await p.evaluate(() => document.fonts.ready);
const ok = await p.evaluate(() => document.fonts.check("700 20px Plex", "إداراتي"));
if (!ok) throw new Error("الخط العربي ما تحمّل");
fs.rmSync(OUT + "/f", { recursive: true, force: true });
fs.mkdirSync(OUT + "/f", { recursive: true });
for (let i = 0; i < FPS * LEN; i++) {
  await p.evaluate((t) => window.render(t), i / FPS);
  await p.screenshot({ path: `${OUT}/f/${String(i).padStart(5, "0")}.png` });
}
fs.writeFileSync(OUT + "/meta.json", JSON.stringify({ fps: FPS, length: LEN }));
await b.close();
