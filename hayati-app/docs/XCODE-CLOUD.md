# رفع مباشر: Xcode Cloud ← TestFlight (DW-064)

مرة وحدة بس. بعدها كل تحديث ينرفع على الفرع `claude/beautiful-wozniak-sqapsx` ينبني وينرفع لـ TestFlight لحاله، بدون Archive من الماك.

## الإعداد (10 دقايق)
1. افتح المشروع بـ Xcode (`npm run cap:open`).
2. القائمة: **Product ← Xcode Cloud ← Create Workflow…**
3. اختار **App** ← **Next**.
4. **Grant Access** لـ GitHub: يفتح صفحة GitHub ← ثبّت «Xcode Cloud» على مستودع `mjuma11m-sys/claude` بس.
5. عدّل الـ Workflow:
   - **Start Conditions ← Branch Changes:** الفرع `claude/beautiful-wozniak-sqapsx` (شيل أي فرع ثاني).
   - **Actions ← Archive – iOS:** Deployment Preparation = **TestFlight (Internal Testing Only)**.
   - **Post-Actions ← TestFlight Internal Testing:** + ← مجموعتك (أو سوّ مجموعة فيها إيميلك).
6. **Save** ← **Start Build**.

## وش يصير بكل بناء
- `ios/App/ci_scripts/ci_post_clone.sh`: يثبّت Node، `npm ci`، اختبارات الوحدة، `cap sync ios`، ويخلي رقم البناء `25.N`.
- Xcode Cloud يوقّع بفريقك (Z84MU9349R) ويرفع لـ TestFlight.
- يوصلك إشعار، وتنزّل التحديث من تطبيق **TestFlight** على جوالك.

## للمتجر (للعامة)
TestFlight مو المتجر. للنشر: App Store Connect ← النسخة ← اختار البناء ← **Add for Review**. مراجعة Apple إجبارية لكل نسخة.

## لو فشل البناء
App Store Connect ← Xcode Cloud ← البناء ← Logs ← `ci_post_clone.sh`. صوّر آخر سطور الخطأ.
