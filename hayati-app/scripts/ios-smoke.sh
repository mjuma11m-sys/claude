#!/usr/bin/env bash
# 📱 «حياتي» يختبر نفسه على آيفون سميوليتر (GitHub Actions macOS، أو ماكك)
#   يبني مشروع Xcode، يشغّل التطبيق، يصوّر الشاشة، ويفشل لو التطبيق طاح أو الشاشة سودا/فاضية
#   bash scripts/ios-smoke.sh   (من داخل hayati-app، بعد npm ci)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${SMOKE_OUT:-ios-smoke}"
mkdir -p "$OUT"
BUNDLE=bh.hayati.app

echo "▶ نجهّز ملفات التطبيق"
npm run cap:sync

echo "▶ نبني لسميوليتر (بدون توقيع)"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$OUT/dd" CODE_SIGNING_ALLOWED=NO build > "$OUT/build.log" 2>&1 \
  || { tail -40 "$OUT/build.log"; echo "❌ البناء فشل"; exit 1; }
APP="$OUT/dd/Build/Products/Debug-iphonesimulator/App.app"
[ -d "$APP" ] || { echo "❌ ما لقيت App.app"; exit 1; }
# DW-044: ودجت الآيفون انبنى وانحط داخل التطبيق
WX="$APP/PlugIns/HayatiWidgetExtension.appex"
[ -d "$WX" ] || { echo "❌ الودجت (HayatiWidgetExtension.appex) مو داخل التطبيق"; ls "$APP"; exit 1; }
[ "$(/usr/libexec/PlistBuddy -c 'Print :NSExtension:NSExtensionPointIdentifier' "$WX/Info.plist")" = "com.apple.widgetkit-extension" ] \
  || { echo "❌ الودجت مو WidgetKit"; exit 1; }
echo "✅ ودجت الآيفون انبنى وداخل التطبيق"
# DW-046: «شارك ← حياتي» بالآيفون
SX="$APP/PlugIns/HayatiShareExtension.appex"
[ -d "$SX" ] || { echo "❌ امتداد المشاركة (HayatiShareExtension.appex) مو داخل التطبيق"; ls "$APP/PlugIns"; exit 1; }
[ "$(/usr/libexec/PlistBuddy -c 'Print :NSExtension:NSExtensionPointIdentifier' "$SX/Info.plist")" = "com.apple.share-services" ] \
  || { echo "❌ الامتداد مو Share Extension"; exit 1; }
echo "✅ «شارك ← حياتي» انبنى وداخل التطبيق"

echo "▶ نشغّل آيفون سميوليتر"
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json,sys
d=json.load(sys.stdin)["devices"]
ios=sorted([k for k in d if "iOS" in k], reverse=True)
for rt in ios:
    for dev in d[rt]:
        if dev["name"].startswith("iPhone"): print(dev["udid"]); sys.exit()
sys.exit("no iPhone simulator")')
echo "   $UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

echo "▶ نثبّت ونفتح «حياتي»"
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BUNDLE"

echo "▶ الشاشة مو سودا ومو فاضية؟"
# لقطة كل 10 ثواني لين 90 ثانية: السميوليتر البطيء يظل على شاشة البداية (بحري سادة) فترة،
#   واللقطة الوحدة بعد وقت ثابت فشلت مرة بالغلط (رقم 17: إضاءة 46 = لون شاشة البداية).
#   شاشة سودا أو فاضية فعلاً تفشل بكل المحاولات، فالاختبار ما يخبّي خطأ حقيقي.
# sips (موجود بكل ماك) يصغّر الصورة ويحولها BMP، والفحص بايثون بدون مكتبات
ok=0
for try in 1 2 3 4 5 6 7 8 9; do
  sleep 10
  xcrun simctl io "$UDID" screenshot "$OUT/launch.png" >/dev/null
  sips -s format bmp -z 240 120 "$OUT/launch.png" --out "$OUT/launch.bmp" >/dev/null
  echo "   محاولة $try ($((try * 10)) ث)"
  if python3 scripts/screen-check.py "$OUT/launch.bmp"; then ok=1; break; fi
done
[ "$ok" = 1 ] || { echo "❌ بعد 90 ثانية الواجهة ما انرسمت"; exit 1; }

echo "▶ التطبيق شغّال؟"
# نقرا القائمة كاملة أول: grep -q يقفل الأنبوب بدري فـ launchctl يطيح بـ SIGPIPE ومع pipefail يبين كأن التطبيق طاح
PROCS="$(xcrun simctl spawn "$UDID" launchctl list)"
if ! grep -q "UIKitApplication:$BUNDLE" <<<"$PROCS"; then
  echo "❌ التطبيق طاح بعد الفتح"; exit 1
fi
