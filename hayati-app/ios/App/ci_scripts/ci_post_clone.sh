#!/bin/sh
# Xcode Cloud (DW-064): بعد ما ينسحب الكود وقبل البناء — نجهّز مكتبات Capacitor (node_modules) وملفات الواجهة (public/)
# ونعطي كل بناء رقم جديد (25.1، 25.2…) عشان TestFlight يقبله. ما فيه أي سر هني؛ التوقيع والرفع من إعدادات Xcode Cloud.
set -e
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
APP="$CI_PRIMARY_REPOSITORY_PATH/hayati-app"
cd "$APP"

command -v node >/dev/null 2>&1 || brew install node
node --version

npm ci --no-audit --no-fund
npm run test:unit
node scripts/cap-www.js
npx cap sync ios

# رقم البناء: رقم النسخة بالمشروع + رقم بناء Xcode Cloud (مثلاً 25 ← 25.7)
PBX="$APP/ios/App/App.xcodeproj/project.pbxproj"
CUR=$(grep -m1 'CURRENT_PROJECT_VERSION = ' "$PBX" | sed 's/[^0-9]//g')
if [ -n "$CI_BUILD_NUMBER" ] && [ -n "$CUR" ]; then
  sed -i '' "s/CURRENT_PROJECT_VERSION = $CUR;/CURRENT_PROJECT_VERSION = $CUR.$CI_BUILD_NUMBER;/g" "$PBX"
  echo "build $CUR.$CI_BUILD_NUMBER"
fi
