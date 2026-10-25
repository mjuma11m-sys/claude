#!/usr/bin/env bash
# One command: build the trial web app, sync it into the iOS shell, sign it and install it on a connected iPhone.
#   bash scripts/ios-run.sh [BUNDLE_ID]      TEAM=XXXXXXXXXX bash scripts/ios-run.sh   (when the team cannot be detected)
# Needs: macOS, Xcode (opened once, signed in with your Apple ID under Settings > Accounts), Node 20+, an iPhone with Developer Mode, unlocked and plugged in.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(uname)" = Darwin ] || { echo "هذا السكربت للماك فقط."; exit 1; }
command -v xcodebuild >/dev/null || { echo "Xcode غير مثبّت."; exit 1; }
BUNDLE="${1:-com.$(id -un | tr -cd 'a-z0-9').sportshub}"

command -v pod >/dev/null || { echo "▸ تثبيت CocoaPods"; (command -v brew >/dev/null && brew install cocoapods) || sudo gem install cocoapods; }
[ -d node_modules ] || npm ci
npm run ios:sync
(cd ios/App && pod install)

# Signing team: TEAM env, else the first team Xcode knows from the Apple ID you signed in with.
TEAM="${TEAM:-$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null | grep -Eo 'teamID = [A-Z0-9]{10}' | head -1 | awk '{print $3}')}"
[ -n "${TEAM:-}" ] || { echo "ما لقيت الـTeam. افتح Xcode ← Settings ← Accounts وسجّل Apple ID، أو شغّل: TEAM=XXXXXXXXXX bash scripts/ios-run.sh"; exit 1; }

# The first connected, available iPhone.
UDID="${UDID:-$(xcrun devicectl list devices 2>/dev/null | grep -E 'iPhone|iPad' | grep -Eiv 'shutdown|simulator|unavailable' | grep -Eo '[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}' | head -1)}"
[ -n "${UDID:-}" ] || { echo "ما لقيت آيفون. وصّله بالكيبل، افتح قفله، وفعّل Developer Mode (الإعدادات ← الخصوصية والأمان)."; exit 1; }

echo "▸ Team $TEAM · Bundle $BUNDLE · Device $UDID"
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -destination "id=$UDID" \
  -derivedDataPath ios/App/DerivedData -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE" CODE_SIGN_STYLE=Automatic build | tail -5
APP="$(ls -d ios/App/DerivedData/Build/Products/Debug-iphoneos/App.app)"
xcrun devicectl device install app --device "$UDID" "$APP"
xcrun devicectl device process launch --device "$UDID" "$BUNDLE" || echo "إذا ما انفتح: الإعدادات ← عام ← VPN وإدارة الجهاز ← ثق بحسابك، ثم افتح التطبيق."
