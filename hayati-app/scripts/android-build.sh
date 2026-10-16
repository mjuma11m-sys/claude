#!/usr/bin/env bash
# 🤖 يبني APK أندرويد للاختبار (debug، بدون توقيع المتجر) — DW-008
#   bash scripts/android-build.sh   (من داخل hayati-app، بعد npm ci، ويحتاج Android SDK + JDK 21)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${SMOKE_OUT:-android-smoke}"
mkdir -p "$OUT"

echo "▶ نجهّز ملفات التطبيق"
npm run cap:sync:android

echo "▶ نبني APK"
(cd android && ./gradlew --no-daemon assembleDebug) > "$OUT/build.log" 2>&1 \
  || { tail -60 "$OUT/build.log"; echo "❌ البناء فشل"; exit 1; }
APK=android/app/build/outputs/apk/debug/app-debug.apk
[ -f "$APK" ] || { echo "❌ ما لقيت $APK"; exit 1; }
echo "✅ $APK ($(du -h "$APK" | cut -f1))"
