# «حياتي» على المتاجر

> قرار الديوانية (جلسة 22): **Google Play أول**، و**iOS بعدين**.
> **DW-008 (شركة الديوانية):** نسخة Google Play صارت **Capacitor أندرويد أصلية** بدال PWABuilder، عشان المختبرين توصلهم التذكيرات وأزرار التنبيه وسؤال الحضور والتطبيق مسكّر. نفس كود الآيفون.
> التطبيق **قيد التطوير**: ينشر كاختبار مغلق أول، ولا تاريخ إطلاق بأي نص.

## 💰 التكاليف
| البند | السعر | متى |
|---|---|---|
| Google Play Console | **25$ مرة وحدة** (≈ 9.4 د.ب) | الحين |
| Apple Developer Program | **99$ بالسنة** (≈ 37.3 د.ب) | لما نروح iOS |
| ماك (لـ iOS بس) | ماك أحد تعرفه، أو ماك سحابي (Codemagic / GitHub Actions macOS) | لما نروح iOS |
| Vercel | مجاني | موجود |

---

## 🤖 Google Play: الخطوات
### 1) رابط عام للتطبيق (لسياسة الخصوصية بس)
- Vercel ← مشروع **claude** ← Settings ← **Deployment Protection** ← طفّ **Vercel Authentication** للـ Production.
- خذ رابط Production (مثل `xxxx.vercel.app`). Google Play يحتاج رابط `privacy.html` منه.

### 2) سوّ ملف التطبيق بـ Android Studio (مرة وحدة تثبّت، وبعدها 10 دقايق لكل نسخة)
1. **developer.android.com/studio** ← نزّل Android Studio وثبّته (ساعة تقريباً مع التحميلات).
2. بالـ Terminal:
   ```bash
   cd ~/Desktop/claude && git pull
   cd hayati-app && npm install
   npm run cap:sync:android      # ينسخ ملفات التطبيق لمشروع أندرويد
   npm run cap:open:android      # يفتح Android Studio
   ```
3. جرّبه أول (اختياري): فوق اختار جهاز (Pixel أو جوالك بالكيبل) ← ▶️ ← ⚙️ ← «التنبيهات» ← «جرّب التنبيه».
4. **Build ← Generate Signed App Bundle or APK ← Android App Bundle**:
   - **Key store path ← Create new**: احفظه برّا مجلد المشروع (مثل `~/Documents/hayati-upload.jks`)، وكلمة سر قوية.
   - **Build Variant: release** ← **Create**.
5. الملف يطلع بـ `android/app/release/app-release.aab`. هذا اللي ترفعه.

> 🔐 **مفتاح التوقيع (`.jks`) وكلمة سره:** احفظهم بمكانين (مثل Google Drive خاص + فلاش). بدونهم ما تقدر ترفع تحديث.
> فعّل **Play App Signing** (يطلع لك أول رفع): Google تحفظ مفتاح التوزيع، ومفتاحك يصير «مفتاح الرفع» بس، فلو ضاع تقدر تطلب تغييره.
> ⚠️ لا ترسل المفتاح ولا كلمة السر بالشات، ولا تحطه داخل مجلد `hayati-app`. الريبو يرفض ملفات `.jks` و`.keystore` أصلاً.

> ℹ️ ما تحتاج `assetlinks.json` ولا PWABuilder بعد: كان لنسخة الويب الملفوفة.

### 3) Google Play Console
1. **play.google.com/console** ← سجّل (حساب شخصي) ← ادفع 25$ ← تحقق من الهوية (البطاقة الذكية).
2. **Create app**: الاسم `حياتي - Hayati` · اللغة الافتراضية: العربية · App · Free.
3. **Store listing**: النصوص تحت، والصور من `store/out/`:
   | الحقل | الملف |
   |---|---|
   | App icon 512×512 | `store/out/icon-play-512.png` |
   | Feature graphic 1024×500 | `store/out/play-feature-1024x500.png` |
   | Phone screenshots (2–8) | `store/out/android-01…05_*.png` |
4. **App content**: الإجابات تحت (Privacy policy، Data safety، Content rating…).
5. **Testing ← Closed testing** ← ارفع `app-release.aab` ← أضف المختبرين بالإيميل (Google Group أو قائمة).
6. **App content ← Exact alarms** (لو سألك): التطبيق يستخدم `SCHEDULE_EXACT_ALARM` (يوافق عليه المستخدم) لتذكيرات المحاضرات والاختبارات، **مو** `USE_EXACT_ALARM`. على أندرويد 14 لو المستخدم ما وافق، التذكير ممكن يتأخر دقايق.

### 4) ⚠️ شرط الـ 12 مختبر
الحسابات الشخصية الجديدة لازم:
- **12 مختبر على الأقل** مشتركين بالاختبار المغلق
- لمدة **14 يوم ورا بعض**
- بعدها تقدر تطلب **Production access** وتجاوب أسئلة عن الاختبار.

**المختبرين:** العايلة، الربع، واللي سجلوا بالفورم. كل واحد يحتاج حساب Google على جوال أندرويد، ويضغط رابط الاشتراك اللي يعطيك Play Console، وينزّل التطبيق.

**رسالة جمع المختبرين (DW-005 · CMO)** — للواتساب والستوري، نفس الرسالة للكل:
```
أحتاج فزعتك 🙏
سويت تطبيق بحريني اسمه «حياتي»: مصاريفك (تلصق رسالة البنك وتنسجل)، جدولك، صلاتك، ومهامك بمكان واحد.
Google تطلب 12 شخص يجربونه 14 يوم قبل ما ينزل للكل.
اللي تحتاجه: جوال أندرويد + حساب Google، وتفتحه مرة باليوم بس.
ردّ علي بإيميل Google حقك وأرسل لك الرابط ✌️
```
**المتابعة:** جدول بسيط (الاسم · الإيميل · انضاف؟ · فتح التطبيق يوم 1/7/14). الهدف **15** مو 12 — لو واحد طلع، العداد ما يرجع للصفر.

---

## 🍎 iOS (المرحلة الجاية)
- Apple ترفض «موقع داخل غلاف» (الإرشاد **4.2**). قبل ما نرفع، نضيف بـ **Capacitor**:
  - **تنبيهات محلية**: «الحين وقت المحاضرة / الصلاة» بدون التقويم.
  - **اهتزاز** عند الحفظ والحذف.
- يحتاج Xcode = ماك. أو ماك سحابي.
- أول شي **TestFlight** (اختبار، لين 10,000 مختبر)، بعدين المتجر.
- الصور جاهزة: `store/out/ios-01…05_*.png` (1290×2796) و`icon-ios-1024.png`.

---

## 📝 نصوص المتجر
### العربي
**الاسم (30 حرف):** `حياتي - Hayati`

**الوصف القصير (80 حرف):**
```
مصاريفك ودراستك وصلاتك ومهامك بمكان واحد. تطبيق بحريني، نسخة تجريبية.
```

**الوصف الكامل:**
```
«حياتي» تطبيق بحريني يرتّب يومك كله بمكان واحد.

💳 المصاريف
• سجّل مصروفك بثواني، أو الصق رسالة البنك وتنسجل.
• رقم بطاقتك ينخفى قبل الحفظ، ويبقى آخر رقمين بس.
• بحث يجمع لك كم صرفت على أي محل.
• تقدير لوين بتوصل ميزانيتك آخر الشهر.
• الاشتراكات، الأهداف، والديون.

🎓 الدراسة والجدول
• جدولك الأسبوعي: محاضرة، تمرين، أو دوام.
• المذاكرة والمعدل الفصلي والتراكمي.
• المهام والاختبارات بمواعيدها.

🕌 أوقات الصلاة
• بالطريقة اللي تختارها، وتنضاف لتقويم جوالك.

💪 للرياضيين
• تقدير جاهزيتك من نومك ونبضك (تقدير، مو تشخيص طبي).
• قسم خاص لحراس المرمى.

🔒 خصوصيتك
• بياناتك على جهازك. ما فيه إعلانات ولا تتبّع، وما نبيع بيانات أحد.
• تقدر تحذف كل بياناتك من الإعدادات.

🛠️ التطبيق قيد التطوير (نسخة تجريبية). اقتراحاتكم تحدد وش ننبني بعد: @hayati.bh
```

### English
**Short description:**
```
Expenses, studies, prayer times and tasks in one place. A Bahraini app (beta).
```
**Full description:** نفس العربي مترجم، أو استخدم Google Play ← **Translate** ← English وراجعه.

---

## 🔐 إجابات الخصوصية
### Google Play: Data safety
| السؤال | الجواب |
|---|---|
| Does your app collect or share user data? | **No** (البيانات تنحفظ على الجهاز). ⚠️ صحيح بس طول ما `config.js` فاضي بنسخة المتجر — أي تفعيل للمزامنة يغيّر الجواب قبل الرفع |
| لو فعّلت المزامنة (Supabase) بعدين | تتغير الإجابة: Financial info + Personal info, **collected, not shared**, encrypted in transit, user can request deletion |
| Privacy policy URL | `https://<رابط-Production>/privacy.html` |
| Terms of use / EULA URL | `https://<رابط-Production>/terms.html` (بـ App Store Connect: App Information ← License Agreement ← Custom، أو خلّه Standard Apple EULA) |
| Account deletion URL | نفس الرابط (فيه شرح «احذف كل بياناتي») |

### Google Play: باقي App content
| البند | الجواب |
|---|---|
| Ads | **No ads** |
| Content rating | استبيان IARC ← كل الأجوبة No ← **Everyone** |
| Target audience | **18+** (فيه مصاريف ورسايل بنك؛ أسهل من سياسة الأطفال) |
| Financial features | «Personal finance tracking / budgeting» بس. **لا** قروض ولا تداول |
| Government app | No |

### Apple: App Privacy
- **Data Not Collected** (لين ما تشتغل المزامنة).
- Age rating: **4+**.

---

## ✅ قائمة قبل الرفع
- [ ] حماية Vercel منطفية للـ Production
- [x] PR #10 مدموج
- [x] موافقة صريحة قبل أول رسالة بنك (DW-002)
- [ ] `privacy.html` يفتح من الرابط العام
- [ ] `terms.html` يفتح من الرابط العام، ومحامي مرخّص بالبحرين راجع الشروط والسياسة
- [ ] `app-release.aab` من Android Studio + مفتاح الرفع (`.jks`) محفوظ بمكانين + Play App Signing مفعّل
- [ ] 12 مختبر جاهزين
