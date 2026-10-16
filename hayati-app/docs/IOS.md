# «حياتي» على الآيفون (Capacitor)

> قرار الديوانية (جلسة 23). نفس ملفات التطبيق، داخل تطبيق iOS أصلي، مع ميزات أصلية حقيقية (عشان إرشاد Apple **4.2**):
> - 🔔 **تنبيهات محلية** «بعد 10 دقايق: محاسبة إدارية · S40-2050» و«الحين وقت صلاة الفجر»، تشتغل والتطبيق مسكّر.
> - 🧠 **تذكيرات ذكية** (جلسة 25): «بكرة اختبار/تسليم/يتجدد» الساعة 8 الليل، «بعد ساعتين: اختبار…»، وملخص صباح اختياري. كل نوع له مفتاح بالإعدادات ← التنبيهات.
> - 👆 **أزرار التنبيه**: الضغطة تفتح الشي نفسه (المهمة، الاشتراكات، اليوم)، وضغطة مطوّلة على تنبيه الواجب أو الاختبار فيها «✓ خلصته» و«⏰ ذكّرني بعد ساعة».
> - 🎓 **سؤال الحضور**: بعد كل محاضرة بـ 5 دقايق «حضرت X؟» بزرين «✓ حضرت» و«✗ غبت»، وينسجل على يوم المحاضرة مع تحذير حد الغياب.
> - 📳 **اهتزاز خفيف** عند الحفظ والحذف.
> - 📤 **المشاركة**: النسخة الاحتياطية، ملف التقويم، وملخص تقرير الشهر تروح لقائمة المشاركة.
> - 📩 **«شارك ← حياتي»** (DW-046): من أي تطبيق يعطي «مشاركة» للنص (الملاحظات، الإيميل، تطبيق البنك، أو نص محدد ← «مشاركة…») اختار «حياتي». تطلع «✓ وصلت الرسالة»، وأول ما تفتح التطبيق تطلع نافذة اللصق معبّاة (نفس الأندرويد: موافقة أول مرة، والأرقام تتموّه). ⚠️ تطبيق الرسائل بالآيفون غالباً ما يعطي «مشاركة» للرسالة نفسها، فهناك «نسخ» ← «الصق رسالة» يظل الأسرع (لازم نتأكد على جهاز). يحتاج App Group `group.bh.hayati.app` مفعّل لـ `bh.hayati.app.HayatiShare` بعد.
>
> ⚠️ المشروع انبنى على سيرفر Linux. منطق التنبيهات مختبر هناك، بس **أول بناء حقيقي يصير على ماكك**. لو طلع خطأ بـ Xcode، صوّره وأرسله.

## 1) مرة وحدة على الماك
1. **Xcode**: موجود ✅ (خلّ تنزيل iOS Simulator يكمل).
2. **Node.js**: من **nodejs.org** ← نسخة **LTS** ← ثبّتها. تأكد بالـ Terminal:
   ```bash
   node -v   # لازم 22 أو أعلى
   ```
3. **المشروع**:
   ```bash
   cd ~/Desktop
   git clone https://github.com/mjuma11m-sys/claude.git
   cd claude
   git checkout claude/beautiful-wozniak-sqapsx   # بعد دمج PR #10 تقدر تستخدم الفرع الأساسي
   cd hayati-app
   npm install
   ```

## 2) كل مرة تبي تشغّل آخر نسخة
```bash
cd ~/Desktop/claude && git pull
cd hayati-app
npm run cap:sync    # ينسخ ملفات التطبيق لمشروع Xcode
npm run cap:open    # يفتح Xcode
```

## 3) شغّله على السميوليتر
1. بـ Xcode، يسار: اضغط **App** (الأيقونة الزرقا فوق).
2. **Signing & Capabilities** ← **Team**: اختار حسابك (حتى لو حساب Developer لسه قيد المراجعة، «Personal Team» يكفي للسميوليتر وجوالك).
3. **Bundle Identifier**: `bh.hayati.app`
4. فوق: اختار **iPhone 17** (أو أي آيفون) ← **▶️**.

## 4) على جوالك الحقيقي (اختياري، قبل TestFlight)
1. وصّل الآيفون بالكيبل ← اختاره فوق بدال السميوليتر ← ▶️.
2. أول مرة: بالآيفون ← الإعدادات ← الخصوصية والأمان ← **وضع المطوّر** ← شغّله.
3. بالآيفون ← الإعدادات ← عام ← VPN وإدارة الأجهزة ← وثّق حسابك.
4. جرّب التنبيه: أضف محاضرة بعد ربع ساعة من الحين، وسكّر التطبيق. لازم يوصلك تنبيه قبلها بـ 10 دقايق.

## 5) TestFlight (بعد موافقة Apple Developer)
1. **appstoreconnect.apple.com** ← Apps ← ➕ **New App**:
   | الحقل | القيمة |
   |---|---|
   | Platform | iOS |
   | Name | `حياتي - Hayati` |
   | Primary Language | Arabic |
   | Bundle ID | `bh.hayati.app` |
   | SKU | `hayati-ios` |
2. بـ Xcode: فوق اختار **Any iOS Device (arm64)** ← **Product** ← **Archive**.
3. ينفتح Organizer ← **Distribute App** ← **App Store Connect** ← **Upload**.
4. بعد 10–30 دقيقة يطلع البناء بـ App Store Connect ← **TestFlight**.
5. **Internal Testing**: أضف نفسك ← ينزل بتطبيق TestFlight بجوالك.
6. **External Testing** (العايلة والربع): أضف إيميلاتهم أو فعّل **Public Link**. أول مرة Apple تراجع البناء (يوم تقريباً). **هذا هو «كود الدعوة»** اللي شفته بشاشة Redeem Code.

## 6) ملاحظات للمراجعة (App Review Notes)
انسخها لما تقدّم للمتجر أو TestFlight الخارجي:
```
Hayati is an offline-first personal organizer for Bahrain: expenses (with on-device bank SMS parsing that masks card numbers), weekly class schedule, prayer times, tasks and athlete readiness.
Native features: local notifications before each class/appointment, at prayer times, the evening before exams, homework deadlines and subscription renewals, plus an optional morning brief (each type can be switched off in Settings). Homework and exam alerts have actions to mark the task done or snooze it for an hour, and an alert after each class records attendance or absence (scheduled on-device, work while the app is closed), haptic feedback, and the iOS share sheet for backups, calendar files and monthly report summaries.
No account is required. All data is stored on the device. No ads, no tracking.
```

## ⚠️ لا تسوي
- لا تعدّل ملفات داخل `ios/App/App/public/`: تنمسح مع كل `cap:sync`. التعديل يصير بملفات التطبيق نفسها (`js/`…).
- لا ترفع شهادات التوقيع أو كلمات السر للريبو.
