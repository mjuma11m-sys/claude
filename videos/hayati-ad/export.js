// يطلّع نسخة احتياطية (JSON) بنفس بيانات الإعلان التجريبية، تنستورد من الإعدادات ← استيراد
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const seed = require('./seed.js');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ locale: 'ar-BH', timezoneId: 'Asia/Bahrain' })).newPage();
  await p.goto('file://' + path.join(__dirname, '../../hayati-app/dist/Hayati.html'));
  await p.waitForFunction(() => window.App && App.st);
  await p.evaluate(seed);
  const data = JSON.parse(await p.evaluate(() => App.S.exportJSON()));
  await b.close();
  // معرّفات UUID عشان تتزامن مع الحساب بدون مشاكل
  for (const k of Object.keys(data)) if (Array.isArray(data[k])) data[k].forEach((r) => { if (r && r.id) r.id = crypto.randomUUID(); });
  delete data.settings.madhhab;   // المذهب يختاره المستخدم بنفسه
  const out = path.join(__dirname, 'hayati-demo-backup.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  const counts = Object.fromEntries(Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => [k, v.length]));
  console.log(counts, Object.keys(data.settings).filter((k) => data.settings[k] != null));
})();
