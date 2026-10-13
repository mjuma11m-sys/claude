#!/usr/bin/env bash
# 🤖 «حياتي» يختبر نفسه على محاكي أندرويد (GitHub Actions) — DW-008
#   يثبّت الـ APK، يفتح التطبيق، يصوّر الشاشة، ويفشل لو التطبيق طاح أو الشاشة سودا/فاضية
#   bash scripts/android-smoke.sh   (بعد android-build.sh، والمحاكي شغّال)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${SMOKE_OUT:-android-smoke}"
mkdir -p "$OUT"
PKG=bh.hayati.app
APK=android/app/build/outputs/apk/debug/app-debug.apk

echo "▶ نثبّت ونفتح «حياتي»"
adb wait-for-device
adb install -r "$APK" >/dev/null
adb shell am start -n "$PKG/.MainActivity" >/dev/null

# PNG ← BMP: الفحص بايثون بدون مكتبات ويقرا BMP بس
to_bmp() {
  if command -v magick >/dev/null; then magick "$1" -resize '120x240!' BMP3:"$2"
  elif command -v convert >/dev/null; then convert "$1" -resize '120x240!' BMP3:"$2"
  else sudo apt-get install -y -qq imagemagick >/dev/null && convert "$1" -resize '120x240!' BMP3:"$2"; fi
}

echo "▶ الشاشة مو سودا ومو فاضية؟"
# لقطة كل 10 ثواني لين 90 ثانية (المحاكي البطيء يظل على شاشة البداية البحرية شوي)
ok=0
for try in 1 2 3 4 5 6 7 8 9; do
  sleep 10
  adb exec-out screencap -p > "$OUT/launch.png"
  to_bmp "$OUT/launch.png" "$OUT/launch.bmp"
  echo "   محاولة $try ($((try * 10)) ث)"
  if python3 scripts/screen-check.py "$OUT/launch.bmp"; then ok=1; break; fi
done
[ "$ok" = 1 ] || { echo "❌ بعد 90 ثانية الواجهة ما انرسمت"; adb logcat -d -t 200 > "$OUT/logcat.txt" || true; exit 1; }

echo "▶ التطبيق شغّال؟"
if ! adb shell pidof "$PKG" >/dev/null; then
  adb logcat -d -t 300 > "$OUT/logcat.txt" || true
  echo "❌ التطبيق طاح بعد الفتح"; exit 1
fi
echo "✅ «حياتي» انفتح على أندرويد"

# DW-009: «شارك ← حياتي» — نرسل رسالة بنك مثل ما يسوي تطبيق الرسائل، والواجهة لازم تفتح نافذتها
echo "▶ مشاركة رسالة بنك لحياتي"
adb logcat -c || true
adb shell "am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF' -n $PKG/.MainActivity" >/dev/null
shared=""
for try in $(seq 1 15); do
  sleep 2
  shared=$(adb logcat -d | grep -o 'hayati-share:[a-z]*' | head -1 || true)
  [ -n "$shared" ] && break
done
adb exec-out screencap -p > "$OUT/share.png" || true
adb logcat -d -t 300 > "$OUT/logcat.txt" || true
[ -n "$shared" ] || { echo "❌ المشاركة ما فتحت نافذة اللصق خلال 30 ثانية"; exit 1; }
echo "✅ المشاركة وصلت ($shared)"
