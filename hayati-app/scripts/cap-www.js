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
// مكتبة Capacitor (registerPlugin) لنسخة الآيفون بس، قبل native.js. نسخة الويب ما تحتاجها
fs.copyFileSync(path.join(D, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(OUT, 'capacitor.js'));
const page = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const tag = '<script src="native.js"></script>';
if (!page.includes(tag)) throw new Error('index.html: ما لقيت ' + tag);
fs.writeFileSync(path.join(OUT, 'index.html'), page.replace(tag, '<script src="capacitor.js"></script>\n  ' + tag));
console.log('www/: ' + (files.length + fs.readdirSync(path.join(OUT, 'icons')).length) + ' ملف');
