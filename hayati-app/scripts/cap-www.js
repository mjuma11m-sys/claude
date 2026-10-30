// يجهّز مجلد www/ لـ Capacitor: نفس ملفات التطبيق اللي تنشر على Vercel، بدون الاختبارات والأدوات
//   node scripts/cap-www.js  (أو npm run cap:sync)
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..'), OUT = path.join(D, 'www');
const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
// كل سكربت محلي ينذكر بالصفحة + الصفحات والأيقونات
const scripts = [...html.matchAll(/<script src="([^":]+)"/g)].map((m) => m[1]);
const files = ['index.html', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'sw.js', 'media/howto.mp4', 'media/howto.jpg', ...scripts];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const f of files) { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.copyFileSync(path.join(D, f), path.join(OUT, f)); }
for (const f of fs.readdirSync(path.join(D, 'icons'))) fs.copyFileSync(path.join(D, 'icons', f), path.join(OUT, 'icons', f));
// المكتبات والخطوط المحلية (pdf.js والخطوط ما تنذكر كـ <script>)
fs.cpSync(path.join(D, 'vendor'), path.join(OUT, 'vendor'), { recursive: true });
// مكتبة Capacitor (registerPlugin) لنسخة الآيفون بس، قبل native.js. نسخة الويب ما تحتاجها
fs.copyFileSync(path.join(D, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(OUT, 'capacitor.js'));
const page = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const tag = '<script src="js/native/native.js"></script>';
if (!page.includes(tag)) throw new Error('index.html: ما لقيت ' + tag);
// DW-100: سياسة أمان (CSP) لنسخة الجوال: ما يشتغل أي سكربت من برّا التطبيق، والاتصال بس بسيرفرنا (Supabase).
//   السكربت الوحيد اللي داخل الصفحة (اتجاه اللغة) مسموح ببصمته. نسخة الويب (ملف واحد) ما تنطبق عليها.
const crypto = require('crypto');
const inline = [...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => "'sha256-" + crypto.createHash('sha256').update(m[1]).digest('base64') + "'");
const CSP = ["default-src 'self'", "script-src 'self' " + inline.join(' '), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "media-src 'self' data: blob:",
  "font-src 'self' data:", "worker-src 'self' blob:", "connect-src 'self' https://*.supabase.co wss://*.supabase.co", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'"].join('; ');
const withCsp = page.replace('<head>', '<head>\n  <meta http-equiv="Content-Security-Policy" content="' + CSP + '">');
if (withCsp === page) throw new Error('index.html: ما لقيت <head>');
fs.writeFileSync(path.join(OUT, 'index.html'), withCsp.replace(tag, '<script src="capacitor.js"></script>\n  ' + tag));
console.log('www/: ' + (files.length + fs.readdirSync(path.join(OUT, 'icons')).length) + ' ملف');
