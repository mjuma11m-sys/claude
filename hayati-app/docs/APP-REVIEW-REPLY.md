# رد Apple — Guideline 2.1 Information Needed (0.25)

> الصق النص الإنقليزي تحت بـ **Reply to App Review**، وبنفس الوقت بـ **App Review Information → Notes**.
> عبّ اللي بين `[...]` بنفسك. كلمة سر الحساب التجريبي تنكتب بـ App Store Connect بس (Sign-In Information)، مو هني ولا بالشات.

```
Hello App Review team,

Thank you for the review. Here is the information you requested.

1. SCREEN RECORDING
Attached: a screen recording captured on a physical iPhone running the latest iOS, starting from launching the app. It shows the typical flow: first launch, using the app without an account, logging an expense from a pasted bank message, adding a class timetable, recording a lecture, connecting Apple Health (read-only), creating an account, signing out and in, and deleting the account (Settings → "Delete all my data"). The app has no user-generated content shared with other users and no paid content or in-app purchases.

2. PURPOSE AND AUDIENCE
Hayati ("My Life") is a free personal organizer for students and young employees in Bahrain and the Gulf, in Arabic (with English). It brings together the things they otherwise track in several apps: daily spending (from bank SMS messages they paste or bank statements they import), budget and savings goals, the weekly class or work timetable, lectures and study notes, tasks and reminders, and prayer times. The value is one simple place, on the device, with no ads and no tracking.

3. HOW TO ACCESS THE MAIN FEATURES
The account is optional: every main feature works on the device without signing in.
- Expenses: Money tab → "Paste SMS" → paste: Purchase of BHD 3.200 at COSTA SEEF using card XXXX4821
- Timetable: Tools → "Upload timetable" → paste: MATH 101 MW 1:00 - 2:15 S1A-105
- Lectures: Study → Lectures → New lecture → Start recording
- Apple Health (optional): Study → My Health → "Connect Apple Health"
- Account (optional, for backup and sync): Settings → Account → Sign up
Demo account (already created, no setup needed): see Sign-In Information.
Email: [demo email]   Password: entered in the Sign-In Information field.

4. EXTERNAL SERVICES
- Supabase (EU, Frankfurt): optional account sign-in and backup/sync of the user's own data.
- Anthropic Claude API: optional AI features (lecture summaries, reading a timetable photo, "Ask Hayati") for signed-in users only. These features are currently switched off on our server, so the app shows a "being prepared" message instead; they are not needed to review the app.
- Apple HealthKit: read-only (sleep, resting heart rate, HRV, steps). Nothing is written to HealthKit, and HealthKit data never leaves the device.
- No advertising, analytics or tracking SDKs. No payment processing.

5. REGIONAL DIFFERENCES
None. The app works the same in all regions. It is Arabic-first with an English option, and the currency can be changed in Settings.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. Hayati is not a bank or payment app: it does not move money or connect to bank accounts; users paste or import their own messages and statements. Health data is read-only and stays on the device. The app contains no protected third-party content.

Background audio (UIBackgroundModes: audio) is used only while the user records their own lecture, so the recording continues when the screen locks. Nothing plays in the background.

Thank you,
[your name]
```

## تصوير الشاشة (2–3 دقايق، بالآيفون)
**قبل:** حدّث الآيفون لآخر iOS · نزّل build **25** من TestFlight · امسح التطبيق القديم عشان يبدأ من أول شاشة · سوّ حساب تجريبي بإيميل ثاني عندك.

| # | صوّر |
|---|---|
| 1 | مركز التحكم ← ⏺️ تسجيل الشاشة ← **افتح التطبيق من الشاشة الرئيسية** (لازم التسجيل يبدأ قبل الفتح) |
| 2 | أول شاشة ← تخطَّ الحساب ← الترحيب |
| 3 | الفلوس ← «الصق رسالة» ← الصق رسالة كوستا فوق ← تنحفظ |
| 4 | «ارفع جدولك» ← الصق `MATH 101 MW 1:00 - 2:15 S1A-105` ← أضف |
| 5 | الدراسة ← المحاضرات ← محاضرة جديدة ← ابدأ التسجيل ← اقفل الشاشة ثواني ← ارجع ← وقّف ← احفظ |
| 6 | صحتي ← «اربط تطبيق الصحة» ← نافذة Apple ← اسمح |
| 7 | الإعدادات ← الحساب ← **سجّل** بالإيميل التجريبي (يبين التسجيل) ← اطلع ← ادخل مرة ثانية |
| 8 | الإعدادات ← **«احذف كل بياناتي»** ← أكّد (يبين حذف الحساب) |
| 9 | وقّف التسجيل |

**بعدها:** سوّ الحساب التجريبي مرة ثانية (لأنك حذفته بالخطوة 8) وحط بياناته بـ **Sign-In Information**.

---

## 0.26 — الحالة الحالية (Waiting for Review)
- ما فيه رد ولا Resubmit: المعلومات تنحط بـ **App Review Information** حق 0.26 وتنحفظ بـ **Save** بس.
- **Sign-In:** Sign-in required ✅ · `mjuma11.m+review@gmail.com` · كلمة السر يكتبها المالك.
- **Notes:** نفس الرد فوق بدون «Attached»، ومعاه سطر رابط فيديو (Google Drive، Anyone with the link)، وسطرين زيادة لـ 0.26:
  - `Any file: Tools -> "Read any file" (PDF, Word, PowerPoint, Excel)`
  - `Assistant: the sparkle button at the top -> type: coffee 1.5 (it asks before saving anything)`
- **ممنوع:** Remove from Review (يرجّع الطابور من الصفر).
