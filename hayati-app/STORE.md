# «حياتي» على المتاجر

> قرار الديوانية (جلسة 22): **Google Play أول** (TWA عن طريق PWABuilder)، و**iOS بعدين** (Capacitor + ميزات أصلية + TestFlight).
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
### 1) رابط عام للتطبيق
- Vercel ← مشروع **claude** ← Settings ← **Deployment Protection** ← طفّ **Vercel Authentication** للـ Production.
- ادمج PR #10 عشان النسخة الجديدة تصير Production.
- خذ رابط Production من Vercel ← **Domains** (مثل `xxxx.vercel.app`). افتحه بمتصفح خاص بدون تسجيل دخول وتأكد إن التطبيق يفتح.
- (اختياري) دومين خاص مثل `hayati.bh` يطلع أحلى بالمتجر، بس مو شرط.

### 2) سوّ ملف التطبيق
1. افتح **pwabuilder.com** ← الصق رابط Production ← **Start**.
2. **Package for stores** ← **Android** ← **Generate Package**:
   - Package ID: `bh.hayati.app`
   - App name: `حياتي` · Launcher name: `حياتي`
   - Signing key: **Create new** (خلّ PWABuilder يسويه)
3. ينزل لك ملف zip فيه:
   - `*.aab`: هذا اللي ترفعه لـ Google Play.
   - `signing.keystore` + كلمة السر: **احفظهم بمكان آمن (Google Drive خاص + نسخة ثانية)**. لو ضاعوا ما تقدر تحدّث التطبيق أبد.
   - `assetlinks.json`: أرسله لي، وأنا أحطه بـ `hayati-app/.well-known/assetlinks.json`. بدونه التطبيق يطلع بشريط عنوان المتصفح فوق.

> ⚠️ لا ترسل `signing.keystore` ولا كلمة سره بالشات. بس `assetlinks.json`.

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
5. **Testing ← Closed testing** ← ارفع `.aab` ← أضف المختبرين بالإيميل (Google Group أو قائمة).

### 4) ⚠️ شرط الـ 12 مختبر
الحسابات الشخصية الجديدة لازم:
- **12 مختبر على الأقل** مشتركين بالاختبار المغلق
- لمدة **14 يوم ورا بعض**
- بعدها تقدر تطلب **Production access** وتجاوب أسئلة عن الاختبار.

**المختبرين:** العايلة، الربع، واللي سجلوا بالفورم. كل واحد يحتاج حساب Google على جوال أندرويد، ويضغط رابط الاشتراك اللي يعطيك Play Console، وينزّل التطبيق.

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
| Does your app collect or share user data? | **No** (البيانات تنحفظ على الجهاز) |
| لو فعّلت المزامنة (Supabase) بعدين | تتغير الإجابة: Financial info + Personal info, **collected, not shared**, encrypted in transit, user can request deletion |
| Privacy policy URL | `https://<رابط-Production>/privacy.html` |
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
- [ ] PR #10 مدموج
- [ ] `privacy.html` يفتح من الرابط العام
- [ ] ملف `.aab` من PWABuilder + المفتاح محفوظ بمكانين
- [ ] `assetlinks.json` منشور (أرسله لي)
- [ ] 12 مختبر جاهزين
