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
sleep 20
xcrun simctl io "$UDID" screenshot "$OUT/launch.png" >/dev/null

echo "▶ التطبيق شغّال؟"
# نقرا القائمة كاملة أول: grep -q يقفل الأنبوب بدري فـ launchctl يطيح بـ SIGPIPE ومع pipefail يبين كأن التطبيق طاح
PROCS="$(xcrun simctl spawn "$UDID" launchctl list)"
if ! grep -q "UIKitApplication:$BUNDLE" <<<"$PROCS"; then
  echo "❌ التطبيق طاح بعد الفتح"; exit 1
fi

echo "▶ الشاشة مو سودا ومو فاضية؟"
python3 -m pip install --quiet pillow >/dev/null 2>&1 || true
python3 - "$OUT/launch.png" <<'PY'
import sys
from PIL import Image, ImageStat
im = Image.open(sys.argv[1]).convert("L")
w, h = im.size
body = im.crop((0, int(h * .12), w, int(h * .88)))   # بدون شريط الساعة فوق
st = ImageStat.Stat(body)
mean, std = st.mean[0], st.stddev[0]
print(f"   الإضاءة {mean:.0f}/255 · التباين {std:.0f}")
if mean < 25: sys.exit("❌ الشاشة سودا (الواجهة ما انحملت)")
if std < 12: sys.exit("❌ الشاشة لون واحد (فاضية)")
print("✅ «حياتي» فتح وانرسمت الواجهة")
PY
