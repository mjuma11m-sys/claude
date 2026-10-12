// يبني dist/Hayati.html: التطبيق كله بملف واحد يشتغل بدون نت (npm run build)
const fs = require('fs'), path = require('path');
const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f));
let html = read('index.html').toString('utf8');
const b64 = (f, mime) => 'data:' + mime + ';base64,' + read(f).toString('base64');
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '');
html = html.replace('href="icons/apple-touch-icon.png"', () => 'href="' + b64('icons/apple-touch-icon.png', 'image/png') + '"');
html = html.replace('href="icons/icon-192.png"', () => 'href="' + b64('icons/icon-192.png', 'image/png') + '"');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
  src.startsWith('http') ? m : '<script>/* ' + src + ' */\n' + read(src).toString('utf8').replace(/<\/script/g, '<\\/script') + '\n</script>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/Hayati.html'), html);
console.log('dist/Hayati.html', (html.length / 1024).toFixed(0) + ' KB');
