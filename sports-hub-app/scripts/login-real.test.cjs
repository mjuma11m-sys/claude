/* Real-mode sign-in form against a fake Supabase (requests to localhost:4400 are answered by this script). Run: npm run test:login-real */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, expect } = (() => { const p = require('playwright'); return { chromium: p.chromium }; })();
const root = require('path').join(__dirname, '..', 'dist-real'); const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html'); r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(4391, async () => {
  const errs = []; const ok = (c, m) => (c ? console.log('ok  ' + m) : errs.push(m));
  const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'ar-BH', viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  let mode = 'ok'; const bodies = [];
  await ctx.route('http://localhost:4400/**', async (route) => { const u = route.request().url();
    if (u.includes('/auth/v1/otp')) { bodies.push({ body: route.request().postData(), url: u }); if (mode === '429') return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }) }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await p.goto('http://localhost:4391/login');
  ok(await p.getByRole('button', { name: 'أرسل رابط الدخول' }).isVisible(), 'real mode shows the email form (no demo roles)');
  ok(await p.getByRole('button', { name: 'إدارة النادي' }).count() === 0, 'no demo role buttons in a real build');
  ok(await p.getByRole('button', { name: 'تابع مع Google' }).isVisible() && await p.getByRole('button', { name: 'تابع مع Apple' }).isVisible(), 'both provider buttons show when their flags are on');
  const authorize = p.waitForRequest((r) => r.url().includes('/auth/v1/authorize'));
  await p.getByRole('button', { name: 'تابع مع Google' }).click(); const au = (await authorize).url();
  ok(au.includes('provider=google') && au.includes('redirect_to=' + encodeURIComponent('http://localhost:4391')), 'Google sends the person to the provider and back to this origin: ' + au.split('?')[1]);
  await p.goto('http://localhost:4391/login');
  await p.getByLabel('البريد الإلكتروني').fill('a@b'); await p.getByRole('button', { name: 'أرسل رابط الدخول' }).click();
  ok(await p.getByRole('alert').textContent().then((t) => t.includes('غير صالح')), 'a bad address is refused before any request'); ok(bodies.length === 0, 'and nothing was sent');
  mode = '429'; await p.getByLabel('البريد الإلكتروني').fill('  Coach@Club.COM '); await p.getByRole('button', { name: 'أرسل رابط الدخول' }).click();
  await p.getByRole('alert').waitFor(); ok((await p.getByRole('alert').textContent()).includes('انتظر دقيقة'), 'a 429 shows the wait message');
  ok(JSON.parse(bodies[0].body).email === 'coach@club.com', 'the address was trimmed and lowercased: ' + JSON.parse(bodies[0].body).email);
  mode = 'ok'; await p.getByRole('button', { name: 'أرسل رابط الدخول' }).click(); await p.getByRole('status').waitFor();
  ok((await p.getByRole('status').textContent()).includes('coach@club.com'), 'success shows the normalised address');
  ok(bodies[1].url.includes('redirect_to=' + encodeURIComponent('http://localhost:4391')), 'the link comes back to this origin: ' + bodies[1].url.split('?')[1]);
  const resend = p.getByRole('button', { name: /أعد الإرسال بعد/ }); ok(await resend.isDisabled(), 'resend is disabled during the cooldown'); ok(/\d+ ثانية/.test(await resend.textContent()), 'with a visible countdown');
  await p.getByRole('button', { name: 'غيّر البريد' }).click(); ok(await p.getByLabel('البريد الإلكتروني').isVisible(), 'change address returns to the form');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'LOGIN REAL-MODE OK'); await b.close(); srv.close(); });
