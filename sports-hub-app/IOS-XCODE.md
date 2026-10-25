# تشغيل Sports Hub على الآيفون عبر Xcode (نسخة تجريبية)

## الطريقة السريعة: أمر واحد
افتح Xcode مرة وسجّل Apple ID (Settings ← Accounts)، وصّل الآيفون مفتوح القفل بوضع Developer Mode، ثم:
```bash
npm run ios:run                 # أو: bash scripts/ios-run.sh com.اسمك.sportshub
```
يبني ويوقّع ويثبّت ويشغّل التطبيق على الجوال تلقائياً. لو ما لقي الـTeam: `TEAM=XXXXXXXXXX npm run ios:run`.
السكربت ما انجرّب على جهاز حقيقي بعد، فإذا وقف بخطأ، الطريقة اليدوية تحت تبقى شغالة.

## الطريقة اليدوية

غلاف iOS بسيط (Capacitor) حول نسخة التجربة، يعمل على iOS 17 وأحدث. يحتاج ماك فيه Xcode و Node 20+ و CocoaPods، وآيفون بكيبل أو نفس الشبكة.

```bash
cd sports-hub-app
npm ci
sudo gem install cocoapods      # أو: brew install cocoapods  (مرة وحدة)
npm run ios:sync                # يبني نسخة التجربة (VITE_SHARE=1) وينسخها لمشروع iOS
cd ios/App && pod install && cd ../..
npm run ios:open                # يفتح Xcode
```

في Xcode:
1. اختر الهدف **App** ← تبويب **Signing & Capabilities** ← فعّل *Automatically manage signing* واختر **Team** (حسابك المجاني من Apple ID يكفي).
2. غيّر **Bundle Identifier** إلى شي فريد لك، مثل `com.abujafar.sportshub`.
3. وصّل الآيفون، فعّل **Developer Mode** (الإعدادات ← الخصوصية والأمان)، واختره من القائمة العلوية، واضغط ▶︎.
4. أول مرة: الإعدادات ← عام ← VPN وإدارة الجهاز ← ثق بحسابك.

ملاحظات:
- التوقيع المجاني ينتهي بعد 7 أيام؛ أعد التشغيل من Xcode للتجديد.
- بعد أي تعديل بالكود: `npm run ios:sync` ثم ▶︎.
- هذي نسخة تجربة بوضع العرض (بيانات خيالية محلية)، وما تحتاج مفاتيح Supabase. لنسخة حقيقية ضع `VITE_SUPABASE_*` قبل `ios:sync` (انظر DEPLOY-TRIAL.md).
- مو للنشر على App Store: هذا يحتاج حساب مطوّر مدفوع وقرار منفصل (خصوصية، تصنيف، مراجعة آبل).
