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

> 🔢 **رقم النسخة (DW-011):** `versionCode` بـ `android/app/build.gradle` = رقم `APP_VERSION` بـ `js/core/app.js` (مثلاً `v16` ← `16` و`0.16`)، وفيه اختبار يمنع يختلفون. Google Play ترفض أي رفع برقم استخدمته قبل، فكل تحديث: `git pull` ← `npm run cap:sync:android` ← Generate Signed Bundle بنفس المفتاح.
> 📴 **بدون نت:** الخط وقارئ PDF ومكتبة Supabase داخل التطبيق (`vendor/`)، فنسخة المتجر ما تتصل بأي جهة خارجية (فيه اختبار يمنع أي رابط برّا يرجع).

### 3) Google Play Console
1. **play.google.com/console** ← سجّل (حساب شخصي) ← ادفع 25$ ← تحقق من الهوية (البطاقة الذكية).
2. **Create app**: الاسم `حياتي - Hayati` · اللغة الافتراضية: العربية · App · Free.
3. **Store listing**: النصوص تحت، والصور من `store/out/`:
   | الحقل | الملف |
   |---|---|
   | App icon 512×512 | `store/out/icon-play-512.png` |
   | Feature graphic 1024×500 | `store/out/play-feature-1024x500.png` |
   | Phone screenshots (2–8) | `store/out/android-01…07_*.png` (7 لقطات) |
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

## 🍎 iOS
- مشروع Capacitor iOS جاهز (`ios/`) بنفس كود الأندرويد: التنبيهات المحلية والاهتزاز موجودين (يغطي الإرشاد **4.2**).
- رقم النسخة: `CURRENT_PROJECT_VERSION` = رقم `APP_VERSION` و`MARKETING_VERSION` = `0.xx` (فيه اختبار يمنع يختلفون).
- **يحتاج:** ماك + **Xcode** (من App Store) + **Apple Developer Program 99$ بالسنة** (≈ 37.3 د.ب).
- الخطوات:
  1. `cd ~/Desktop/claude/hayati-app && git pull && npm install`
  2. `npm run cap:sync` ← `npm run cap:open` (يفتح Xcode).
  3. Xcode ← **App** ← **Signing & Capabilities** ← Team = حسابك ← Bundle ID `bh.hayati.app`.
  4. جرّبه: اختار iPhone Simulator ← ▶️.
  5. فوق اختار **Any iOS Device (arm64)** ← **Product ← Archive** ← **Distribute App ← App Store Connect ← Upload**.
  6. **appstoreconnect.apple.com** ← My Apps ← ➕ ← الاسم `حياتي - Hayati` ← Bundle ID `bh.hayati.app` ← SKU `hayati-ios`.
  7. **TestFlight** أول (لين 10,000 مختبر، بدون شرط 12×14 يوم)، بعدين المراجعة للمتجر.
- الصور: `store/out/ios-01…07_*.png` (1290×2796، مقاس 6.9") و`icon-ios-1024.png`.

---

## 📝 نصوص المتجر
### العربي
**الاسم (30 حرف):** `حياتي - Hayati`

**الوصف القصير (80 حرف):**
```
يومك كله بتطبيق واحد: مصاريفك، دراستك، صلاتك ومهامك. تطبيق بحريني تجريبي.
```

**الوصف الكامل:**
```
«حياتي» تطبيق بحريني يرتّب يومك كله بمكان واحد.

💳 المصاريف
• سجّل مصروفك بثواني، أو الصق رسالة البنك (أو شاركها لحياتي على أندرويد) وراجعها قبل ما تنضاف.
• تختار يوم راتبك، والشهر يمشي من راتب لراتب.
• «راتبك وين راح؟»: أكثر 3 أشياء صرفت عليها بالشهر اللي خلص.
• تقدير لوين بتوصل ميزانيتك قبل الراتب الجاي.
• بحث يجمع لك كم صرفت على أي محل.
• الاشتراكات، أهداف الادخار، ولي وعلي.
• رقم بطاقتك ينخفى قبل الحفظ، ويبقى آخر رقمين بس.

🧮 الزكاة والخُمس
• حاسبة تقدير للزكاة والخُمس، وتختار سني أو شيعي. تقدير يساعدك تحسب، مو فتوى.

🎓 الدراسة والجدول
• جدولك الأسبوعي: محاضرة، تمرين، أو دوام.
• المذاكرة والمعدل الفصلي والتراكمي.
• المهام والاختبارات بمواعيدها.

🕌 عبادتي
• أوقات الصلاة بالطريقة اللي تختارها، والصلاة الجاية.
• التاريخ الهجري، والمناسبات الجاية (رمضان، العيد، القرقاعون، الناصفة…).
• عداد ورد القرآن والختمة، ومسبحة.
• التطبيق يرتب وقتك بس، وتقرا من مصحفك أو تطبيقك.

✨ كل شي بحياتي
• زر واحد فيه كل الأدوات، وترتّب شاشة «اليوم» على كيفك.
• تذكيرات المحاضرات والصلاة و«سكّر يومك» حتى والتطبيق مسكّر (أندرويد).

🔒 خصوصيتك
• بياناتك على جهازك. ما فيه إعلانات ولا تتبّع، وما نبيع بيانات أحد.
• يشتغل بدون نت.
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
| Does your app collect or share user data? | **Yes** (DW-020: الحسابات مفعّلة، Supabase فرانكفورت). الحساب اختياري |
| Location | **لا تختارها**: موقع القبلة (DW-023) يتحسب على الجهاز وما يطلع منه، وGoogle ما تعتبر المعالجة على الجهاز «collected». الإذن بالـ manifest: `ACCESS_COARSE_LOCATION` |
| Data types | **Personal info → Email address** (Account management) · **Financial info → Other financial info** (App functionality) · **Other user-generated content** (App functionality) |
| Collected / Shared | **Collected, not shared** · مو إجباري (Optional) · ما ينباع. ملاحظات المحاضرة اللي تنرسل لـ Anthropic لما المستخدم يضغط «لخّصها لي ✨» = **service provider** يعالج نيابة عنا، فـ Google ما تعتبرها «Shared» (DW-021) |
| Photos (DW-034) | **Photos and videos → Photos** · Collected, **processed ephemerally** (تنرسل لـ Anthropic عشان تتحوّل لنص وما تنحفظ) · Optional · App functionality |
| Goal photo (DW-040) | **Not collected** — stays on the device (IndexedDB), never uploaded or synced; only inside the user's own encrypted backup file |
| المساعد الذكي (DW-037) | **Financial info** + **Other user-generated content** (ملخص أرقام، بدون أسماء) · Collected, **processed ephemerally** · Optional · App functionality |
| ملفات PDF (DW-036) | **Files and docs** · Collected, **processed ephemerally** (تنرسل لـ Anthropic وما تنحفظ) · Optional · App functionality |
| الرحلات (DW-035) | ضمن **Other user-generated content** (تتزامن مع الحساب). رحلات العمرة على الجهاز بس |
| Security | **Encrypted in transit: Yes** · **Users can request deletion: Yes** (الإعدادات ← احذف كل بياناتي) |
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
- **Data Linked to You** (اختياري، لو سجّل حساب): Contact Info → Email · Financial Info · User Content. **Not used for tracking.**
- Age rating: **4+**.

---

## ✅ قائمة قبل الرفع
- [ ] حماية Vercel منطفية للـ Production
- [x] PR #10 مدموج
- [x] موافقة صريحة قبل أول رسالة بنك (DW-002)
- [ ] `privacy.html` يفتح من الرابط العام
- [ ] `terms.html` يفتح من الرابط العام، ومحامي مرخّص بالبحرين راجع الشروط والسياسة
- [ ] `app-release.aab` من Android Studio + مفتاح الرفع (`.jks`) محفوظ بمكانين + Play App Signing مفعّل
- [x] نسخة المتجر ما تتصل بأي جهة خارجية: الخط والمكتبات محلية (DW-011)
- [x] `versionCode` مربوط بـ `APP_VERSION` (DW-011)
- [ ] جرّبته على المحاكي أو جوالك: أضف مصروف، الصق رسالة بنك، جرّب التنبيه، سكّر التطبيق وافتحه بدون نت
- [ ] لقطات المتجر من `store/out` + الأيقونة 512 + الصورة المميزة 1024×500
- [ ] 12 مختبر جاهزين (هدفنا 15)
