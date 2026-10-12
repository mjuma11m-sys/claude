// يجهّز مجلد www/ لـ Capacitor: نفس ملفات التطبيق اللي تنشر على Vercel، بدون الاختبارات والأدوات
//   node scripts/cap-www.js  (أو npm run cap:sync)
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..'), OUT = path.join(D, 'www');
const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
// كل سكربت محلي ينذكر بالصفحة + الصفحات والأيقونات
const scripts = [...html.matchAll(/<script src="([^":]+)"/g)].map((m) => m[1]);
const files = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', ...scripts];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const f of files) fs.copyFileSync(path.join(D, f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(D, 'icons'))) fs.copyFileSync(path.join(D, 'icons', f), path.join(OUT, 'icons', f));
console.log('www/: ' + (files.length + fs.readdirSync(path.join(OUT, 'icons')).length) + ' ملف');
