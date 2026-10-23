// كشف الشعار → MP4. VARIANT=v (1080×1920) أو h (1920×1080)
//   VARIANT=v node render.js preview 1 2 3.2 4.6 6   |   VARIANT=v node render.js
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 60, DUR = 8, V = (process.env.VARIANT || 'v') === 'v';
const [w, h] = V ? [1080, 1920] : [1920, 1080];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'scene.html'));
  await p.evaluate(() => window.READY);
  const tag = V ? 'v' : 'h';
  if (process.argv[2] === 'preview') {
    for (const t of process.argv.slice(3).map(Number)) { await p.evaluate((x) => setT(x), t); await p.screenshot({ path: path.join(__dirname, `prev_${tag}_${t}.jpg`), type: 'jpeg', quality: 80 }); }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', path.join(__dirname, `silent_${tag}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate((x) => setT(x), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
