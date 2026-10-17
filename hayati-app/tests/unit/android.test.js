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
  assert.match(read('app/src/main/java/bh/hayati/app/MainActivity.java'), /registerPlugin\(ShareInPlugin\.class\);[\s\S]*?super\.onCreate/);
  const p = read('app/src/main/java/bh/hayati/app/ShareInPlugin.java');
  assert.match(p, /@CapacitorPlugin\(name = "ShareIn"\)/);
  assert.match(p, /static final int MAX = 2000;/);
  const web = JSON.parse(fs.readFileSync(path.join(__dirname, '../../manifest.webmanifest'), 'utf8'));
  assert.equal(web.share_target.params.text, 'share_text');
});

// DW-031: ودجت الشاشة الرئيسية
test('home-screen widget (DW-031): registered, RemoteViews-safe layouts, ids match the code, no extra permissions', () => {
  const m = read('app/src/main/AndroidManifest.xml');
  assert.match(m, /<receiver[\s\S]*?android:name="\.HayatiWidget"[\s\S]*?android.appwidget.action.APPWIDGET_UPDATE[\s\S]*?android:resource="@xml\/hayati_widget_info"/);
  assert.match(read('app/src/main/java/bh/hayati/app/MainActivity.java'), /registerPlugin\(WidgetPlugin\.class\);[\s\S]*?super\.onCreate/);
  const info = read('app/src/main/res/xml/hayati_widget_info.xml');
  assert.match(info, /android:initialLayout="@layout\/hayati_widget"/);
  assert.ok(Number(/updatePeriodMillis="(\d+)"/.exec(info)[1]) >= 1800000, 'Android ignores updates more often than 30 min');
  const java = read('app/src/main/java/bh/hayati/app/HayatiWidget.java') + read('app/src/main/java/bh/hayati/app/WidgetPlugin.java');
  for (const f of ['hayati_widget.xml', 'hayati_widget_ltr.xml']) {
    const x = read('app/src/main/res/layout/' + f);
    // الودجت يقبل عناصر محددة بس؛ غيرها = «ما قدرنا نحمّل الودجت» بالشاشة الرئيسية
    const tags = [...x.matchAll(/<([A-Za-z.]+)[\s>]/g)].map((t) => t[1]);
    for (const t of tags) assert.ok(['LinearLayout', 'TextView', 'ProgressBar', 'FrameLayout', 'ImageView'].includes(t), f + ': <' + t + '> is not allowed in a widget');
    const ids = [...x.matchAll(/@\+id\/(\w+)/g)].map((t) => t[1]);
    for (const id of ['wg_root', 'wg_label', 'wg_title', 'wg_sub', 'wg_budget', 'wg_bar', 'wg_add', 'wg_paste']) assert.ok(ids.includes(id), f + ' is missing @+id/' + id);
    for (const used of java.matchAll(/R\.id\.(\w+)/g)) assert.ok(ids.includes(used[1]), f + ' has no id ' + used[1]);
  }
  assert.match(read('app/src/main/res/layout/hayati_widget.xml'), /layoutDirection="rtl"/);
  assert.match(read('app/src/main/res/layout/hayati_widget_ltr.xml'), /layoutDirection="ltr"/);
  for (const r of java.matchAll(/R\.(layout|drawable|xml)\.(\w+)/g)) assert.ok(fs.existsSync(path.join(A, 'app/src/main/res', r[1], r[2] + '.xml')), 'missing res/' + r[1] + '/' + r[2]);
  // PendingIntent لازم IMMUTABLE من أندرويد 12، وكل زر له request code مختلف
  assert.match(java, /PendingIntent\.FLAG_IMMUTABLE/);
  assert.match(java, /open\(ctx, "add-tx", 1\)[\s\S]*open\(ctx, "paste-sms", 2\)/);
  // الأزرار تقبل اسمين بس
  assert.match(java, /"add-tx"\.equals\(name\) \|\| "paste-sms"\.equals\(name\)/);
  assert.doesNotMatch(m, /BIND_APPWIDGET|READ_CONTACTS/);
});

test('every Android XML resource is well-formed (no «--» inside comments, which breaks the build)', () => {
  const files = ['app/src/main/AndroidManifest.xml'];
  const walk = (d) => { for (const f of fs.readdirSync(path.join(A, d))) { const p = d + '/' + f; if (fs.statSync(path.join(A, p)).isDirectory()) walk(p); else if (f.endsWith('.xml')) files.push(p); } };
  walk('app/src/main/res');
  for (const f of files) for (const c of read(f).matchAll(/<!--([\s\S]*?)-->/g)) assert.ok(!c[1].includes('--'), f + ': «--» inside a comment');
});

// DW-011: جاهزية المتجر
const W = path.join(__dirname, '../..');
test('Play versionCode follows APP_VERSION, so every update uploads with a new number', () => {
  const v = /const APP_VERSION = 'v(\d+)'/.exec(fs.readFileSync(path.join(W, 'js/core/app.js'), 'utf8'))[1];
  const g = read('app/build.gradle');
  assert.match(g, new RegExp('versionCode ' + v + '\\b'));
  assert.match(g, new RegExp('versionName "0\\.' + v + '"'));
});

test('iOS build number follows APP_VERSION too (App Store rejects a reused build)', () => {
  const v = /const APP_VERSION = 'v(\d+)'/.exec(fs.readFileSync(path.join(W, 'js/core/app.js'), 'utf8'))[1];
  const x = fs.readFileSync(path.join(W, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  assert.equal((x.match(/CURRENT_PROJECT_VERSION = (\d+);/g) || []).filter((l) => !l.includes(' ' + v + ';')).length, 0);
  assert.equal((x.match(/MARKETING_VERSION = ([\d.]+);/g) || []).filter((l) => !l.includes('0.' + v + ';')).length, 0);
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

test('small widget (DW-039): its own receiver and 2×2 info, RemoteViews-safe layout, ids and strings match', () => {
  const m = read('app/src/main/AndroidManifest.xml');
  assert.match(m, /<receiver[\s\S]*?android:name="\.HayatiWidgetSmall"[\s\S]*?android.appwidget.action.APPWIDGET_UPDATE[\s\S]*?android:resource="@xml\/hayati_widget_small_info"/);
  const info = read('app/src/main/res/xml/hayati_widget_small_info.xml');
  assert.match(info, /android:initialLayout="@layout\/hayati_widget_small"/);
  assert.match(info, /targetCellWidth="2"/);
  assert.ok(Number(/updatePeriodMillis="(\d+)"/.exec(info)[1]) >= 1800000);
  const x = read('app/src/main/res/layout/hayati_widget_small.xml');
  for (const t of [...x.matchAll(/<([A-Za-z.]+)[\s>]/g)].map((t) => t[1])) assert.ok(['LinearLayout', 'TextView', 'ProgressBar'].includes(t), '<' + t + '> is not allowed in a widget');
  const ids = [...x.matchAll(/@\+id\/(\w+)/g)].map((t) => t[1]);
  const java = read('app/src/main/java/bh/hayati/app/HayatiWidgetSmall.java');
  for (const used of java.matchAll(/R\.id\.(\w+)/g)) assert.ok(ids.includes(used[1]), 'layout has no id ' + used[1]);
  const strings = read('app/src/main/res/values/strings.xml');
  for (const s of (x + info + m).matchAll(/@string\/(\w+)/g)) assert.ok(strings.includes('name="' + s[1] + '"'), 'missing string ' + s[1]);
  // الكبير يحدّث الصغير من نفس اللقطة
  assert.match(read('app/src/main/java/bh/hayati/app/HayatiWidget.java'), /HayatiWidgetSmall\.refresh\(ctx\)/);
  for (const c of (x + info).matchAll(/<!--([\s\S]*?)-->/g)) assert.ok(!c[1].includes('--'), 'no -- inside XML comments');
});

test('iPhone widget (DW-044): WidgetKit target embedded in the app, files and plugin wired, same app group both sides', () => {
  const iosRead = (f) => require('fs').readFileSync(require('path').join(__dirname, '../../ios/App', f), 'utf8');
  const pbx = iosRead('App.xcodeproj/project.pbxproj');
  assert.match(pbx, /productType = "com\.apple\.product-type\.app-extension"/);
  assert.match(pbx, /HayatiWidgetExtension\.appex in Embed Foundation Extensions/);
  assert.match(pbx, /dstSubfolderSpec = 13;/);
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = bh\.hayati\.app\.HayatiWidget;/);
  for (const f of ['WidgetPlugin.swift in Sources', 'MainViewController.swift in Sources', 'HayatiWidget.swift in Sources']) assert.ok(pbx.includes(f), f);
  assert.match(iosRead('HayatiWidget/Info.plist'), /com\.apple\.widgetkit-extension/);
  for (const e of ['App/App.entitlements', 'HayatiWidget/HayatiWidget.entitlements']) assert.match(iosRead(e), /group\.bh\.hayati\.app/);
  const plugin = iosRead('App/WidgetPlugin.swift'), widget = iosRead('HayatiWidget/HayatiWidget.swift');
  assert.match(plugin, /jsName = "HayatiWidget"/);   // نفس اسم الإضافة اللي تناديه widget.js
  assert.match(plugin, /suiteName: "group\.bh\.hayati\.app"/);
  assert.match(widget, /hayatiGroup = "group\.bh\.hayati\.app"/);
  assert.match(iosRead('App/MainViewController.swift'), /registerPluginInstance\(WidgetPlugin\(\)\)/);
  assert.match(iosRead('App/Base.lproj/Main.storyboard'), /customClass="MainViewController" customModule="App"/);
  // الروابط اللي يفتحها الودجت يعرفها native.js
  for (const u of ['add-tx', 'paste-sms']) assert.ok(widget.includes('bh.hayati.app://widget/' + u), u);
});

// DW-046: نسخة المتجر من GitHub
test('release bundle is signed only from CI secrets, and no key material lives in the repo', () => {
  const g = read('app/build.gradle');
  assert.match(g, /System\.getenv\('HAYATI_KEYSTORE_FILE'\)/);
  assert.match(g, /storePassword System\.getenv\('HAYATI_KEYSTORE_PASSWORD'\)/);
  assert.doesNotMatch(g, /storePassword ['"]/);   // ولا كلمة سر مكتوبة
  const wf = fs.readFileSync(path.join(W, '../.github/workflows/hayati-release.yml'), 'utf8');
  assert.match(wf, /secrets\.HAYATI_KEYSTORE_B64/);
  assert.match(wf, /bash scripts\/android-release\.sh/);
  assert.doesNotMatch(wf, /upload-google-play|r0adkll|fastlane/);   // ما يرفع للمتجر بروحه
  const sh = fs.readFileSync(path.join(W, 'scripts/android-release.sh'), 'utf8');
  assert.match(sh, /trap cleanup EXIT/);
  assert.doesNotMatch(sh, /set -x|echo "\$KS_B64|cat "\$KS"/);   // المفتاح ما ينطبع
  const ign = fs.readFileSync(path.join(W, '.gitignore'), 'utf8');
  assert.match(ign, /\*\.jks/);
  assert.match(ign, /\*\.keystore/);
});

test('iPhone share (DW-046): share extension embedded, plain text only, hands the message to the same ShareIn flow as Android', () => {
  const iosRead = (f) => fs.readFileSync(path.join(W, 'ios/App', f), 'utf8');
  const pbx = iosRead('App.xcodeproj/project.pbxproj');
  // المشروع ينقرا بنفس المكتبة اللي تستخدمها Capacitor
  const xcode = require('xcode');
  const proj = xcode.project(path.join(W, 'ios/App/App.xcodeproj/project.pbxproj')); proj.parseSync();
  const targets = Object.values(proj.pbxNativeTargetSection()).filter((t) => t && t.name).map((t) => t.name);
  assert.deepStrictEqual(targets.sort(), ['App', 'HayatiShareExtension', 'HayatiWidgetExtension']);
  assert.match(pbx, /HayatiShareExtension\.appex in Embed Foundation Extensions/);
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = bh\.hayati\.app\.HayatiShare;/);
  for (const f of ['ShareInPlugin.swift in Sources', 'ShareViewController.swift in Sources']) assert.ok(pbx.includes(f), f);
  const info = iosRead('HayatiShare/Info.plist');
  assert.match(info, /com\.apple\.share-services/);
  assert.match(info, /NSExtensionActivationSupportsText/);
  assert.doesNotMatch(info, /SupportsImage|SupportsWebURL|SupportsFileWithMaxCount/);   // نص بس
  assert.match(iosRead('HayatiShare/HayatiShare.entitlements'), /group\.bh\.hayati\.app/);
  const ext = iosRead('HayatiShare/ShareViewController.swift'), plug = iosRead('App/ShareInPlugin.swift');
  assert.match(ext, /static let maxChars = 2000/);   // نفس حد الأندرويد
  assert.doesNotMatch(ext, /URLSession|http/);   // ما يرسل شي لأي مكان
  assert.match(plug, /jsName = "ShareIn"/);   // نفس اسم إضافة الأندرويد اللي يناديها native.js
  assert.match(plug, /removeObject\(forKey: "share"\)/);   // تنقرا مرة وحدة
  assert.match(iosRead('App/MainViewController.swift'), /registerPluginInstance\(ShareInPlugin\(\)\)/);
});

test('lecture recording to text (DW-047): on-device only, permission text present, plugin registered', () => {
  const iosRead = (f) => fs.readFileSync(path.join(W, 'ios/App', f), 'utf8');
  const sp = iosRead('App/SpeechPlugin.swift');
  assert.match(sp, /jsName = "HayatiSpeech"/);
  assert.match(sp, /requiresOnDeviceRecognition = true/);   // سيرفرات Apple ما تنستخدم
  assert.match(sp, /supportsOnDeviceRecognition/);
  assert.match(sp, /removeItem\(at: url\)/);   // الملف المؤقت ينمسح
  assert.doesNotMatch(sp, /URLSession|http/);
  assert.match(iosRead('App/Info.plist'), /NSSpeechRecognitionUsageDescription/);
  assert.match(iosRead('App/MainViewController.swift'), /registerPluginInstance\(SpeechPlugin\(\)\)/);
  assert.ok(iosRead('App.xcodeproj/project.pbxproj').includes('SpeechPlugin.swift in Sources'));
});

test('app icon shortcuts (DW-048): same actions on Android and iPhone, and the iPhone scene uses MainViewController so our plugins load', () => {
  const sc = read('app/src/main/res/xml/shortcuts.xml');
  for (const a of ['add-tx', 'paste-sms', 'ask']) assert.match(sc, new RegExp('android:name="hayati_action" android:value="' + a + '"'));
  assert.match(sc, /android:targetClass="bh\.hayati\.app\.MainActivity"/);
  assert.match(read('app/src/main/AndroidManifest.xml'), /android:name="android\.app\.shortcuts" android:resource="@xml\/shortcuts"/);
  const strings = read('app/src/main/res/values/strings.xml');
  for (const s of sc.matchAll(/@string\/(\w+)/g)) assert.ok(strings.includes('name="' + s[1] + '"'), 'missing string ' + s[1]);
  assert.match(read('app/src/main/java/bh/hayati/app/WidgetPlugin.java'), /"ask"\.equals\(name\)/);
  const iosRead = (f) => fs.readFileSync(path.join(W, 'ios/App', f), 'utf8');
  const plist = iosRead('App/Info.plist');
  for (const a of ['add-tx', 'paste-sms', 'ask']) assert.ok(plist.includes('<string>bh.hayati.app.' + a + '</string>'), a);
  const scene = iosRead('App/SceneDelegate.swift');
  assert.match(scene, /rootViewController = MainViewController\(\)/);   // كان CAPBridgeViewController: الإضافات ما كانت تتسجّل
  assert.doesNotMatch(scene, /rootViewController = CAPBridgeViewController\(\)/);
  assert.match(scene, /performActionFor shortcutItem/);
  assert.match(scene, /connectionOptions\.shortcutItem/);
});
