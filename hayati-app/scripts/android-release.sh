#!/usr/bin/env bash
# 📦 يبني نسخة المتجر (AAB) — DW-046
#   bash scripts/android-release.sh   (من داخل hayati-app، بعد npm ci، ويحتاج Android SDK + JDK 21)
#   KS_B64 + HAYATI_KEYSTORE_PASSWORD + HAYATI_KEY_ALIAS + HAYATI_KEY_PASSWORD موجودة ← AAB موقّع جاهز للرفع.
#   ناقصة ← AAB بدون توقيع (يثبت إن البناء سليم بس، ما ينرفع).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=android-release
mkdir -p "$OUT"
KS="${RUNNER_TEMP:-/tmp}/hayati-upload.jks"
cleanup() { rm -f "$KS"; }
trap cleanup EXIT

SIGNED=no
if [ -n "${KS_B64:-}" ] && [ -n "${HAYATI_KEYSTORE_PASSWORD:-}" ] && [ -n "${HAYATI_KEY_ALIAS:-}" ] && [ -n "${HAYATI_KEY_PASSWORD:-}" ]; then
  printf '%s' "$KS_B64" | base64 -d > "$KS"
  export HAYATI_KEYSTORE_FILE="$KS"
  SIGNED=yes
else
  echo "ℹ️ أسرار التوقيع مو موجودة: نبني بدون توقيع (فحص بس)"
fi

echo "▶ نجهّز ملفات التطبيق"
npm run cap:sync:android

echo "▶ نبني AAB"
(cd android && ./gradlew --no-daemon bundleRelease) > "$OUT/build.log" 2>&1 \
  || { tail -60 "$OUT/build.log"; echo "❌ البناء فشل"; exit 1; }
AAB=android/app/build/outputs/bundle/release/app-release.aab
[ -f "$AAB" ] || { echo "❌ ما لقيت $AAB"; exit 1; }

VER=$(grep -oE "versionCode [0-9]+" android/app/build.gradle | grep -oE "[0-9]+")
if [ "$SIGNED" = yes ]; then
  jarsigner -verify "$AAB" > "$OUT/verify.txt" 2>&1 || { cat "$OUT/verify.txt"; echo "❌ التوقيع ما انتحقق"; exit 1; }
  grep -q "jar verified" "$OUT/verify.txt" || { cat "$OUT/verify.txt"; echo "❌ التوقيع ما انتحقق"; exit 1; }
  MSG="✅ AAB موقّع، versionCode $VER، جاهز ترفعه على Play Console ($(du -h "$AAB" | cut -f1))"
else
  MSG="✅ AAB انبنى بدون توقيع، versionCode $VER (ما ينرفع لين تنحط الأسرار)"
fi
echo "$MSG" | tee "$OUT/summary.txt"
