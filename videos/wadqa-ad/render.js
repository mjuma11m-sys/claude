// يرسم scene.html فريم فريم → MP4 (30fps، 20 ث)
//   node render.js preview 1.5 4 10 16   |   node render.js
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30, DUR = 20;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'scene.html'));
  await p.evaluate(() => window.READY);
  if (process.argv[2] === 'preview') {
    for (const t of process.argv.slice(3).map(Number)) { await p.evaluate((x) => setT(x), t); await p.screenshot({ path: path.join(__dirname, 'prev_' + t + '.jpg'), type: 'jpeg', quality: 80 }); }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', path.join(__dirname, 'silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate((x) => setT(x), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 150 === 0) process.stdout.write(i + '/' + FPS * DUR + '\n');
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
