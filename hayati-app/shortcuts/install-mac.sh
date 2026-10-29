#!/bin/bash
# يوقّع اختصار «حياتي · رسايل البنك» ويفتحه بتطبيق الاختصارات بالماك (يتزامن للآيفون عبر iCloud).
# الكود السري ما ينحفظ بالملف: الاختصارات تسألك عنه وأنت تضيفه.
set -e
cd "$(dirname "$0")"
OUT="$HOME/Desktop/حياتي - رسايل البنك.shortcut"
shortcuts sign --mode anyone --input hayati-bank-sms.shortcut --output "$OUT"
open "$OUT"
echo "✓ انفتح بالاختصارات: اضغط Add Shortcut والصق الكود السري من حياتي"
