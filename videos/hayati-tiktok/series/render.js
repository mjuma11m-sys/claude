// node render.js 3            → ep3.mp4   |   node render.js 3 preview 1 5 11
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30, DUR = 13, EP = process.argv[2] || '1';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'ep.html') + '#ep=' + EP);
  await p.evaluate(() => window.READY);
  if (process.argv[3] === 'preview') {
    for (const t of process.argv.slice(4).map(Number)) { await p.evaluate((x) => setT(x), t); await p.screenshot({ path: path.join(__dirname, 'prev_' + EP + '_' + t + '.jpg'), type: 'jpeg', quality: 85 }); }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', path.join(__dirname, 'music.wav'), '-filter_complex', '[1:a]afade=t=out:st=11.8:d=1.2,loudnorm=I=-16:TP=-1.5:LRA=11[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', path.join(__dirname, 'ep' + EP + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate((x) => setT(x), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    console.log('ep' + EP + '.mp4');
  }
  await b.close();
})();
