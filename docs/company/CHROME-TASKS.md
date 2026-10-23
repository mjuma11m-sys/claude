# مهام لـ Claude في Chrome (DW-059)

> كل مهمة: **ممنوع** كتابة أو تغيير أي كلمة سر، وممنوع Submit/Send/Delete. لو طلب رمز أو كلمة سر ← يوقف ويقول.

## 1) Supabase: حماية كلمات المرور المسرّبة (IT)
```
supabase.com/dashboard → project "hayati" (gqpagtblgqxzwjgsrech) → Authentication → Attack Protection (or Policies/Settings → Password security).
Turn ON "Prevent use of leaked passwords" (HaveIBeenPwned). Press Save for that setting only.
Then tell me: the setting's state after saving, and the minimum password length shown.
Don't type any password, don't touch any other setting.
```

## 2) فحص التحقق بخطوتين (IT) — قراءة بس
```
Read only, don't change anything:
- github.com/settings/security → is Two-factor authentication "Enabled"?
- vercel.com/account/settings/authentication → is 2FA enabled?
- supabase.com/dashboard/account/security → is MFA enabled?
Report Enabled / Not enabled for each. Don't press any button.
```
(لو مو مفعّل: المالك يفعّله بنفسه لأنه يحتاج جواله.)

## 3) Vercel: نشر موقع ودقة (QA) — قراءة بس
```
vercel.com → project "wadqa" → Deployments. Tell me: the latest Production deployment's commit (should start with ee0d99c), status, and time.
Then open https://myrent-sigma.vercel.app/support.html and tell me if the page shows 6 questions. Read only.
```
