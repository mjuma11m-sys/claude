// خادم ثابت يطبّق هيدرات vercel.json (CSP) عشان نكشف أي مخالفة قبل النشر
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2], PORT = +process.argv[3] || 8790;
const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  const hs = {}; for (const h of vj.headers) { const re = new RegExp('^' + h.source.replace('(.*)', '.*') + '$'); if (re.test(p)) for (const x of h.headers) hs[x.key] = x.value; }
  res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', ...hs });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);
