import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '../components/Logo'
import { POLICY_DATE, PRIVACY_CONTACT } from '../lib/legal'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="glass flex items-center gap-4 p-5">
        <Logo className="size-11 shrink-0" />
        <div>
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
          <p className="text-sm text-mute">Sports Hub · قيد التطوير · نسخة تجريبية · آخر تحديث: {POLICY_DATE}</p>
        </div>
      </header>
      <div className="space-y-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-pulse [&_li]:mt-1 [&_section]:glass [&_section]:p-5 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:text-ink/90">
        {children}
      </div>
      <nav className="flex gap-4 text-sm text-mute">
        <Link to="/privacy" className="hover:text-ink">الخصوصية</Link>
        <Link to="/terms" className="hover:text-ink">الشروط</Link>
        <Link to="/" className="hover:text-ink">التطبيق</Link>
      </nav>
    </main>
  )
}

const Contact = () =>
  PRIVACY_CONTACT ? <bdi dir="ltr">{PRIVACY_CONTACT}</bdi> : <span>تنضاف قناة التواصل هنا قبل فتح التسجيل. لين ذاك ما نجمع أي بيانات عنك.</span>

export function Privacy() {
  return (
    <Doc title="سياسة الخصوصية">
      <section>
        <h2>باختصار</h2>
        <ul>
          <li>هالنسخة تجريبية: ما فيها حسابات، وما نجمع اسمك ولا بريدك ولا أي بيانات صحية.</li>
          <li>الدور اللي تختاره وصوتك لرجل المباراة ينحفظون <b>على جهازك بس</b>.</li>
          <li>الخطوط والصور جزء من التطبيق نفسه، ما نحمّلها من مواقع ثانية.</li>
          <li>كل الأرقام والأسماء بالشاشات تجريبية للعرض.</li>
        </ul>
      </section>
      <section>
        <h2>وش نحفظ، ووين</h2>
        <table className="w-full text-sm">
          <thead className="text-mute"><tr><th className="py-2 text-start">البيانات</th><th className="py-2 text-start">وين</th></tr></thead>
          <tbody className="[&_td]:border-t [&_td]:border-white/10 [&_td]:py-2">
            <tr><td>الدور اللي اخترته بالوضع التجريبي</td><td>جهازك (localStorage)</td></tr>
            <tr><td>صوتك لرجل المباراة</td><td>جهازك (localStorage)</td></tr>
            <tr><td>ملفات التطبيق (للفتح بدون إنترنت)</td><td>جهازك (Cache Storage). ما فيها بياناتك، بس شاشات التطبيق</td></tr>
            <tr><td>عنوان IP ونوع المتصفح</td><td>مزوّد الاستضافة لما يرسل لك ملفات التطبيق، مثل أي موقع. سيرفراته ممكن تكون برا البحرين</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2>قبل ما نفتح الحسابات</h2>
        <p>لما نفتح التسجيل (بريد، دور، نادي)، بنحدّث هالصفحة قبلها ونكتب: وين السيرفر وبأي دولة، وكم مدة الحفظ. البيانات الصحية (أحمال اللاعبين) ما تنجمع إلا بموافقة صريحة من اللاعب واتفاق مكتوب مع ناديه.</p>
        <p className="mt-2">قاعدة البيانات مقفولة بـ Row Level Security: المشجع ما يشوف إلا ملفه، وإدارة النادي تشوف طاقم ناديها بس، والدور ما يتغيّر من التطبيق.</p>
      </section>
      <section>
        <h2>حقوقك</h2>
        <p>حسب قانون حماية البيانات الشخصية في البحرين (رقم 30 لسنة 2018) لك حق تعرف وش نحفظ، وتصححه، وتحذفه، وتعترض عليه، وتشتكي لهيئة حماية البيانات الشخصية.</p>
        <ul>
          <li>الحذف: من «الإعدادات» ← «احذف كل بياناتي». يمسح كل شي فوراً.</li>
          <li>التواصل: <Contact /></li>
        </ul>
      </section>
      <section dir="ltr" className="text-start">
        <h2>In English</h2>
        <p>This is a beta with demo data. There are no accounts: we collect no name, email or health data. Your demo role and your man-of-the-match vote stay in your browser (localStorage). Fonts ship with the app; no third-party requests. Our host sees your IP address when serving files, as any website does, and may be outside Bahrain. You can erase everything from Settings → “Delete all my data”. Rights under Bahrain PDPL (Law 30 of 2018) apply.</p>
      </section>
    </Doc>
  )
}

export function Terms() {
  return (
    <Doc title="شروط الاستخدام">
      <section>
        <h2>نسخة تجريبية</h2>
        <ul>
          <li>التطبيق قيد التطوير، وممكن يتغيّر أو يوقف بدون إشعار.</li>
          <li>الترتيب والمباريات والأحمال بالشاشات <b>بيانات تجريبية</b>، مو نتائج رسمية.</li>
          <li>التذكرة الموسمية نموذج للعرض، ما تصلح للدخول.</li>
        </ul>
      </section>
      <section>
        <h2>مو استشارة طبية</h2>
        <p>مؤشر ACWR أداة تساعد الطاقم الطبي، مو تشخيص. قرار مشاركة أي لاعب يرجع للطبيب.</p>
      </section>
      <section>
        <h2>الجهات</h2>
        <p>Sports Hub مشروع مستقل. ما هو تابع للاتحاد البحريني لكرة القدم ولا لأي نادٍ، وأسماء الأندية والدوريات تنذكر للعرض بس.</p>
      </section>
      <section>
        <h2>القانون</h2>
        <p>تنطبق قوانين مملكة البحرين.</p>
      </section>
    </Doc>
  )
}
