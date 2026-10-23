// DW-038: أيقونات وشاشات بداية آيفون وأندرويد من شعار البرجيل (brand/icon.svg) — كل ملف بنفس مقاسه الأصلي.
// node tools/native-assets.mjs   (بعد npx cap add ios/android)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const NIGHT = "#14213A";
const tower = fs.readFileSync("brand/symbol.svg", "utf8").replace(/<svg[^>]*>/, "").replace("</svg>", "");
const dims = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

// symbol.svg viewBox = 72 72 368 368 (البرجيل بالنص)
const svg = ({ bg, scale = 1, round = false }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  ${round ? `<clipPath id="c"><circle cx="256" cy="256" r="256"/></clipPath>` : ""}
  <g ${round ? 'clip-path="url(#c)"' : ""}>
    ${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ""}
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256)"><svg x="72" y="72" width="368" height="368" viewBox="72 72 368 368">${tower}</svg></g>
  </g></svg>`;

const jobs = [];
for (const f of walk("android/app/src/main/res").filter((x) => x.endsWith(".png"))) {
  const n = path.basename(f);
  if (n === "ic_launcher.png") jobs.push([f, svg({ bg: NIGHT, scale: .78 }), false]);
  else if (n === "ic_launcher_round.png") jobs.push([f, svg({ bg: NIGHT, scale: .72, round: true }), true]);
  else if (n === "ic_launcher_foreground.png") jobs.push([f, svg({ scale: .55 }), true]); // 108dp: المحتوى داخل الـ 66% الآمنة
  else if (n === "splash.png") jobs.push([f, null, false]);
}
for (const f of walk("ios/App/App/Assets.xcassets").filter((x) => x.endsWith(".png"))) {
  if (f.includes("AppIcon")) jobs.push([f, svg({ bg: NIGHT, scale: .78 }), false]); // آيفون: مربع بدون شفافية، النظام يدوّر الزوايا
  else if (f.includes("Splash")) jobs.push([f, null, false]);
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [f, html, alpha] of jobs) {
  const [w, h] = dims(f);
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const s = Math.round(Math.min(w, h) * .28); // شاشة البداية: البرجيل بالنص على الليل
  const body = html ?? `<div style="width:${s}px;height:${s}px">${svg({ scale: 1 })}</div>`;
  await p.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:${html ? "transparent" : NIGHT}">${html ? `<div style="width:${w}px;height:${h}px">${body}</div>` : body}</body></html>`);
  await p.screenshot({ path: f, omitBackground: alpha });
  await p.close();
}
await b.close();
fs.writeFileSync("android/app/src/main/res/values/ic_launcher_background.xml", `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${NIGHT}</color>\n</resources>\n`);
console.log(`${jobs.length} صورة`);
