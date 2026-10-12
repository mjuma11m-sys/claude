// ريل «سوّ ميزتك»: node render.js [config.json] [preview t1 t2 …]
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const FPS = 60, DUR = 14;
const cfgPath = path.resolve(process.argv[2] && !process.argv[2].startsWith('preview') ? process.argv[2] : path.join(__dirname, 'config.json'));
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.screen = 'file://' + path.resolve(path.dirname(cfgPath), cfg.screen);
const args = process.argv.slice(2).filter((a) => a !== process.argv[2] || a === 'preview');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.addInitScript((c) => { window.CFG = c; }, cfg);
  await p.goto('file://' + path.join(__dirname, 'feature.html'));
  await p.evaluate(() => window.READY);
  const pi = args.indexOf('preview');
  if (pi >= 0) {
    for (const t of args.slice(pi + 1).map(Number)) { await p.evaluate((x) => setT(x), t); await p.screenshot({ path: path.join(__dirname, 'prev_' + t + '.jpg'), type: 'jpeg', quality: 85 }); }
  } else {
    const out = path.join(__dirname, 'feature-week' + cfg.week + '.mp4');
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate((x) => setT(x), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    console.log('→', out);
  }
  await b.close();
})();
