// نسخة أندرويد (DW-008): معايير القبول اللي تنفحص بدون Android SDK
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const A = path.join(__dirname, '../../android');
const read = (p) => fs.readFileSync(path.join(A, p), 'utf8');

test('the sign-in return link bh.hayati.app://auth opens the app', () => {
  const m = read('app/src/main/AndroidManifest.xml');
  assert.match(m, /<data android:scheme="bh.hayati.app" android:host="auth" \/>/);
  assert.match(m, /android.intent.category.BROWSABLE/);
});

test('no restricted USE_EXACT_ALARM, in the app or any plugin (Google Play policy)', () => {
  const manifests = [read('app/src/main/AndroidManifest.xml')];
  const nm = path.join(__dirname, '../../node_modules/@capacitor');
  for (const p of fs.readdirSync(nm)) {
    const f = path.join(nm, p, 'android/src/main/AndroidManifest.xml');
    if (fs.existsSync(f)) manifests.push(fs.readFileSync(f, 'utf8'));
  }
  for (const m of manifests) assert.doesNotMatch(m, /USE_EXACT_ALARM/);
});

test('signing keys and local SDK paths can never be committed', () => {
  const g = read('.gitignore');
  for (const rule of ['*.jks', '*.keystore', 'local.properties']) assert.ok(g.split('\n').includes(rule), rule);
});

test('notifications use the white status-bar icon, and every density has it', () => {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capacitor.config.json'), 'utf8'));
  assert.equal(c.plugins.LocalNotifications.smallIcon, 'ic_stat_hayati');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) assert.ok(fs.existsSync(path.join(A, `app/src/main/res/drawable-${d}/ic_stat_hayati.png`)), d);
  assert.match(read('app/src/main/res/values/ic_launcher_background.xml'), /#0E3B43/);
});
