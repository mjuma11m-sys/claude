#!/usr/bin/env bash
# 🤖 «إداراتي» يختبر نفسه على محاكي أندرويد (DW-040) — يشتغل داخل android-emulator-runner بـ GitHub Actions
#   يثبّت الـ APK، يفتحه، يصوّر الشاشة، ويفشل لو التطبيق طاح، أو الشاشة سودا/فاضية،
#   أو نص الواجهة طلع تحت شريط الساعة (edge-to-edge)، أو زر الرجوع قفل التطبيق بدال ما يصغّره
#   bash scripts/android-smoke.sh   (من داخل my-rent، بعد بناء app-debug.apk)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${SMOKE_OUT:-android-smoke}"
mkdir -p "$OUT"
PKG=bh.wadqa.idarati
APK=android/app/build/outputs/apk/debug/app-debug.apk

echo "▶ نثبّت ونفتح «إداراتي»"
adb wait-for-device
adb install -r "$APK" >/dev/null
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null

echo "▶ الشاشة مو سودا ومو فاضية؟"
# نفس فحص الآيفون: لقطة كل 10 ثواني لين 90 ثانية (المحاكي بطيء بأول فتحة)
ok=0
for try in 1 2 3 4 5 6 7 8 9; do
  sleep 10
  adb exec-out screencap > "$OUT/launch.raw"
  python3 scripts/raw2bmp.py "$OUT/launch.raw" "$OUT/launch.bmp"
  echo "   محاولة $try ($((try * 10)) ث)"
  if python3 scripts/screen-check.py "$OUT/launch.bmp"; then ok=1; break; fi
done
adb exec-out screencap -p > "$OUT/launch.png"   # الصورة للعين (Artifacts)
[ "$ok" = 1 ] || { echo "❌ بعد 90 ثانية الواجهة ما انرسمت"; exit 1; }
adb shell pidof "$PKG" >/dev/null || { echo "❌ التطبيق طاح بعد الفتح"; exit 1; }

echo "▶ الواجهة مو تحت شريط الساعة؟"
adb shell dumpsys window > "$OUT/window.txt"
dumped=0
for try in 1 2 3; do
  if adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 && adb pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1; then dumped=1; break; fi
  sleep 3
done
BAR=$(python3 -c "import re,sys;m=re.findall(r'type=statusBars[^\n]*?frame=\[\d+,\d+\]\[\d+,(\d+)\]',open(sys.argv[1]).read());print(max(map(int,m)) if m else 0)" "$OUT/window.txt")
SOCK=$(adb shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1 || true)
measured=0
if [ -n "$SOCK" ] && [ "$BAR" -gt 0 ]; then
  adb forward tcp:9333 "localabstract:$SOCK" >/dev/null
  SCREEN_H=$(adb shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1 | cut -dx -f2)
  SCREEN_H="$SCREEN_H" node scripts/android-webview.mjs 9333 "$BAR" "$(adb shell wm density | tr -dc '0-9\n' | tail -1)" && measured=1 || exit 1
fi
if [ "$measured" = 1 ]; then :
elif [ "$dumped" = 1 ]; then
  python3 scripts/android-insets.py "$OUT/ui.xml" "$OUT/window.txt" "$(adb shell wm density | tr -dc '0-9\n' | tail -1)"
else
  echo "⚠️ ما قدرنا نقرا شجرة الواجهة (uiautomator) — شيك على launch.png بعينك"
fi

echo "▶ زر الرجوع بالشاشة الأولى يصغّر التطبيق (ما يقفله)"
adb shell input keyevent KEYCODE_BACK
sleep 3
# نقرا القائمة كاملة أول: grep -q يقفل الأنبوب بدري ومع pipefail يبين كأن التطبيق انقفل (نفس درس الآيفون)
ACTS="$(adb shell dumpsys activity activities)"
if grep -q "$PKG/.MainActivity" <<<"$ACTS"; then
  echo "✅ التطبيق تصغّر وظل مفتوح بالخلفية"
else
  echo "❌ زر الرجوع قفل التطبيق (معالج الرجوع ما اشتغل)"; exit 1
fi

echo "▶ يرجع من الخلفية بدون ما يطيح"
adb shell am start -n "$PKG/.MainActivity" >/dev/null
sleep 3
adb shell pidof "$PKG" >/dev/null || { echo "❌ طاح لما رجع من الخلفية"; exit 1; }
adb exec-out screencap -p > "$OUT/resume.png"
echo "✅ «إداراتي» يشتغل على أندرويد"
