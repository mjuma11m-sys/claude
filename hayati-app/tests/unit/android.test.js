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

test('share to Hayati (DW-009): plain text only, registered, capped, and no permission to read SMS', () => {
  const m = read('app/src/main/AndroidManifest.xml');
  assert.match(m, /<action android:name="android.intent.action.SEND" \/>[\s\S]*?<data android:mimeType="text\/plain" \/>/);
  assert.doesNotMatch(m, /READ_SMS|RECEIVE_SMS/);
  assert.match(read('app/src/main/java/bh/hayati/app/MainActivity.java'), /registerPlugin\(ShareInPlugin\.class\);\s*super\.onCreate/);
  const p = read('app/src/main/java/bh/hayati/app/ShareInPlugin.java');
  assert.match(p, /@CapacitorPlugin\(name = "ShareIn"\)/);
  assert.match(p, /static final int MAX = 2000;/);
  const web = JSON.parse(fs.readFileSync(path.join(__dirname, '../../manifest.webmanifest'), 'utf8'));
  assert.equal(web.share_target.params.text, 'share_text');
});

// DW-011: جاهزية المتجر
const W = path.join(__dirname, '../..');
test('Play versionCode follows APP_VERSION, so every update uploads with a new number', () => {
  const v = /const APP_VERSION = 'v(\d+)'/.exec(fs.readFileSync(path.join(W, 'js/core/app.js'), 'utf8'))[1];
  const g = read('app/build.gradle');
  assert.match(g, new RegExp('versionCode ' + v + '\\b'));
  assert.match(g, new RegExp('versionName "0\\.' + v + '"'));
});

test('the store build reaches no outside server: fonts and libraries are local', () => {
  const files = ['index.html', 'privacy.html', 'terms.html', 'sw.js', 'vendor/fonts/fonts.css'];
  for (const d of ['js/core', 'js/features', 'js/i18n', 'js/native']) for (const f of fs.readdirSync(path.join(W, d))) files.push(d + '/' + f);
  for (const f of files) {
    const src = fs.readFileSync(path.join(W, f), 'utf8');
    assert.doesNotMatch(src, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/, f);
    // pdf.js من الـ CDN مسموح بس لملف dist الواحد (file://)
    if (/cdnjs\.cloudflare/.test(src)) assert.match(src, /location\.protocol === 'file:' \? 'https:\/\/cdnjs/, f);
  }
  for (const f of ['vendor/supabase/supabase.min.js', 'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js', 'vendor/fonts/plex-arabic-400.woff2', 'vendor/fonts/OFL.txt'])
    assert.ok(fs.existsSync(path.join(W, f)), f);
  assert.match(fs.readFileSync(path.join(W, 'scripts/cap-www.js'), 'utf8'), /cpSync\(path\.join\(D, 'vendor'\)/);
});
