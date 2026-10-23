// يرسم scene.html فريم فريم → MP4 (60fps)
//   node render.js preview 1.5 4 6.5 10 …   |   node render.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 60, DUR = 27;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'scene.html') + (process.env.VARIANT ? '#' + process.env.VARIANT : ''));
  await p.evaluate(() => window.READY);
  if (process.argv[2] === 'preview') {
    for (const t of process.argv.slice(3).map(Number)) { await p.evaluate((x) => setT(x), t); await p.screenshot({ path: path.join(__dirname, 'prev_' + t + '.jpg'), type: 'jpeg', quality: 85 }); }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', path.join(__dirname, process.env.VARIANT ? process.env.VARIANT + '_video.mp4' : 'silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate((x) => setT(x), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 300 === 0) process.stdout.write(i + '/' + FPS * DUR + '\n');
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
