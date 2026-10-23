// يصدّر video.html فريم بفريم: node render.cjs preview | node render.cjs full
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const mode = process.argv[2] || 'preview', FPS = 30;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'video.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const DUR = await p.evaluate(() => window.DUR);
  if (mode === 'preview') {
    for (const t of [2.5, 7, 13, 20, 27, 35, 41, 47, 54, 59.5]) { await p.evaluate((t) => render(t), t); await p.screenshot({ path: path.join(__dirname, 'preview', 'f' + String(t).replace('.', '_') + '.jpg'), type: 'jpeg', quality: 70 }); }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(__dirname, 'wadqa-recap.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = Math.round(DUR * FPS);
    for (let f = 0; f < N; f++) {
      await p.evaluate((t) => render(t), f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  await b.close();
})();
