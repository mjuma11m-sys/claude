// موقع ودقة: يولّد كل صفحة بالعربي (/) والإنقليزي (/en/) من نفس القالب → company-brand/site/
//   node company-brand/site-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SRC, '../site');
const ROOT = path.join(SRC, '../..');
const DOMAIN = 'https://wadqa.com';
const EMAIL = 'hello@wadqa.com';

// المفتاح العام (anon) من نفس مشروع حياتي — الجدول محمي، والكتابة بس عبر wadqa_submit
const cfg = fs.readFileSync(path.join(ROOT, 'hayati-app/js/core/config.js'), 'utf8');
const SUPA_URL = cfg.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const SUPA_KEY = cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)[1];

const DROP = 'M256 104C256 104 160 228 160 310A96 96 0 0 0 352 310C352 228 256 104 256 104Z';
const mark = (cls = '') => `<svg class="${cls}" viewBox="0 0 512 512" aria-hidden="true"><path class="d-line" pathLength="1" d="${DROP}" fill="none" stroke="#F2EBDD" stroke-width="34" stroke-linejoin="round"/><circle class="d-dot" cx="256" cy="316" r="38" fill="#C8A04A"/></svg>`;
const heroMark = `<svg class="drop" viewBox="0 0 512 512" role="img" aria-label="ودقة · WADQA"><ellipse class="d-ring" cx="256" cy="330" rx="150" ry="40" fill="none" stroke="#C8A04A" stroke-width="3" opacity="0"/><path class="d-line" pathLength="1" d="${DROP}" fill="none" stroke="#F2EBDD" stroke-width="34" stroke-linejoin="round"/><circle class="d-dot" cx="256" cy="316" r="38" fill="#C8A04A"/></svg>`;

// كل نص بالموقع: [عربي، إنقليزي]
const T = {
  nav_values: ['قيمنا', 'Values'], nav_apps: ['تطبيقاتنا', 'Apps'], nav_contact: ['تواصل', 'Contact'],
  lang_other: ['English', 'عربي'],
  skip: ['تخطَّ للمحتوى', 'Skip to content'],
  footer_rights: ['© 2026 ودقة · WADQA Studio · مملكة البحرين', '© 2026 WADQA Studio · Kingdom of Bahrain'],
  footer_privacy: ['سياسة الخصوصية', 'Privacy policy'],
  footer_status: ['قيد التطوير', 'In development'],
  name_l: ['الاسم (اختياري)', 'Name (optional)'], email_l: ['الإيميل', 'Email'],
  consent: [`أوافق إن ودقة تحفظ اسمي وإيميلي ورسالتي على خوادم Supabase بألمانيا عشان ترد علي، حسب <a href="PRIV">سياسة الخصوصية</a>.`, `I agree that WADQA stores my name, email and message on Supabase servers in Germany to reply to me, as described in the <a href="PRIV">privacy policy</a>.`],
  send: ['أرسل', 'Send'], join: ['سجّلني', 'Notify me'],
  shots_note: ['* لقطات ببيانات تجريبية', '* Screenshots use sample data'],
  back_home: ['← الرئيسية', '← Home'],
};

const apps = {
  hayati: { ic: '<img src="IMG/hayati-icon.png" alt="">', cls: 'ic-hayati', name: ['حياتي', 'Hayati'], pill: ['نسخة تجريبية · قيد التطوير', 'Beta · In development'], beta: true, short: ['يومك بمكان واحد: الميزانية، المواعيد، العبادة، والمحاضرات.', 'Your day in one place: budget, reminders, worship and lectures.'] },
  'sports-hub': { ic: '⚽', cls: 'ic-sports', name: ['Sports Hub', 'Sports Hub'], pill: ['قيد التطوير', 'In development'], short: ['إدارة الفرق واللاعبين والأندية.', 'Running teams, players and clubs.'] },
  ijarati: { ic: '🏠', cls: 'ic-ijarati', name: ['إجاراتي', 'Ijarati'], pill: ['فكرة · نقيس الطلب', 'Idea · Testing demand'], short: ['متابعة العقارات والإيجارات للملّاك.', 'Tracking properties and rent for landlords.'] },
};

function page(L, slug, { title, desc, body, navOn }) {
  const ar = L === 0, pre = ar ? '' : '../', href = (s) => (s === 'index' ? './' : s + '.html');
  const other = ar ? 'en/' + href(slug) : '../' + href(slug);
  const urlOf = (l, s) => DOMAIN + (l === 0 ? '/' : '/en/') + (s === 'index' ? '' : s);
  const t = (k) => T[k][L];
  return `<!doctype html>
<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${urlOf(L, slug)}">
<link rel="alternate" hreflang="ar" href="${urlOf(0, slug)}"><link rel="alternate" hreflang="en" href="${urlOf(1, slug)}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="${DOMAIN}/og-logo.png"><meta property="og:type" content="website">
<meta name="theme-color" content="#0B1514">
<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${pre}site.css">
</head>
<body>
<a class="skip" href="#main">${t('skip')}</a>
<header class="site"><div class="wrap">
  <a class="brand" href="${pre}${ar ? '' : 'en/'}./">${mark()}${ar ? 'ودقة' : 'WADQA'}</a>
  <nav class="main" aria-label="${ar ? 'التنقل' : 'Main'}">
    <a href="${slug === 'index' ? '' : './'}#values">${t('nav_values')}</a>
    <a href="${slug === 'index' ? '' : './'}#apps"${navOn === 'apps' ? ' aria-current="page"' : ''}>${t('nav_apps')}</a>
    <a href="${slug === 'index' ? '' : './'}#contact">${t('nav_contact')}</a>
    <a class="lang" href="${other}" hreflang="${ar ? 'en' : 'ar'}" lang="${ar ? 'en' : 'ar'}">${t('lang_other')}</a>
  </nav>
</div></header>
<main id="main">
${body.replaceAll('IMG/', pre + 'img/').replaceAll('PRIV', 'privacy.html')}
</main>
<footer class="site"><div class="wrap">
  <span>${t('footer_rights')}</span>
  <span><a href="privacy.html">${t('footer_privacy')}</a> · ${t('footer_status')}</span>
</div></footer>
<script src="${pre}config.js"></script>
<script src="${pre}app.js" defer></script>
</body>
</html>
`;
}

const form = (L, kind, product, { btn, msgLabel, msg = true }) => `<form class="lead-form" data-kind="${kind}" data-product="${product}" novalidate>
  <div class="field"><label for="${product}-name">${T.name_l[L]}</label><input id="${product}-name" name="name" type="text" maxlength="80" autocomplete="name"></div>
  <div class="field"><label for="${product}-email">${T.email_l[L]}</label><input id="${product}-email" name="email" type="email" maxlength="254" autocomplete="email" required dir="ltr"></div>
  ${msg ? `<div class="field"><label for="${product}-msg">${msgLabel}</label><textarea id="${product}-msg" name="message" maxlength="2000"></textarea></div>` : ''}
  <div class="hp" aria-hidden="true"><label for="${product}-web">Website</label><input id="${product}-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
  <label class="consent"><input type="checkbox" name="consent" required><span>${T.consent[L]}</span></label>
  <div><button class="btn solid" type="submit">${btn}</button></div>
  <p class="status" role="status" aria-live="polite"></p>
</form>`;

const appCard = (L, slug) => { const a = apps[slug]; return `<a class="card" href="${slug}.html">
  <div class="app-ic ${a.cls}">${a.ic}</div>
  <h3${slug === 'sports-hub' ? ' dir="ltr"' : ''}>${a.name[L]}</h3><p>${a.short[L]}</p>
  <span class="pill${a.beta ? ' beta' : ''}">${a.pill[L]}</span>
  <span class="more">${L === 0 ? 'التفاصيل ←' : 'Details →'}</span></a>`; };

// ———— الصفحات ————
const P = {};
P.index = (L) => ({
  title: L === 0 ? 'ودقة · WADQA Studio — استوديو برمجيات من البحرين' : 'WADQA Studio — A software studio from Bahrain',
  desc: L === 0 ? 'ودقة استوديو برمجيات من البحرين. تطبيقات شفافة وصادقة وأمينة: بياناتك مو للبيع، وبدون متتبعات إعلانية.' : 'WADQA is a software studio from Bahrain. Apps that are transparent, honest and trustworthy: your data is not for sale, and there are no ad trackers.',
  body: `<div class="wrap hero">
  <div>
    <div class="eyebrow latin reveal">WADQA STUDIO · BAHRAIN</div>
    <h1 class="reveal r2">${L === 0 ? 'ودقة' : 'WADQA'}</h1>
    <p class="lead reveal r3">${L === 0 ? 'استوديو برمجيات من البحرين. نبني تطبيقات تخفّف يومك، وتحترمك وتحترم بياناتك.' : 'A software studio from Bahrain. We build apps that lighten your day and respect you and your data.'}</p>
    <p class="tag reveal r3">${L === 0 ? 'صافية مثل المطر.' : 'Clear as rain.'}</p>
    <div class="cta reveal r4"><a class="btn solid" href="#apps">${L === 0 ? 'تطبيقاتنا' : 'Our apps'}</a><a class="btn ghost" href="#contact">${L === 0 ? 'تواصل معنا' : 'Get in touch'}</a></div>
  </div>
  ${heroMark}
</div>
<section id="values"><div class="wrap">
  <h2>${L === 0 ? 'قيمنا' : 'Our values'}</h2>
  <p class="h-sub">${L === 0 ? 'الوَدْق هو المطر، والودقة قطرته. صافي تشوف من خلاله، ينزل للكل، وما ياخذ منك شي.' : '“Wadq” is Arabic for rain, and a wadqa is one drop of it. Clear enough to see through, it falls for everyone and takes nothing from you.'}</p>
  <div class="grid">
    <div class="card v"><h3>${L === 0 ? 'شفافة' : 'Transparent'}</h3><p>${L === 0 ? 'واضح وش يسوي التطبيق ووش ما يسوي، ووش يجمع من بياناتك وليش ووين.' : 'You can see what each app does and does not do, and what data it collects, why, and where.'}</p></div>
    <div class="card v"><h3>${L === 0 ? 'صادقة' : 'Honest'}</h3><p>${L === 0 ? 'ما نعدك بميزة ما تشتغل اليوم. اللي قيد التطوير نقول عنه قيد التطوير.' : 'We never promise a feature that does not work today. What is in development is labelled as such.'}</p></div>
    <div class="card v"><h3>${L === 0 ? 'أمينة' : 'Trustworthy'}</h3><p>${L === 0 ? 'بياناتك مو للبيع، وتطبيقاتنا بدون متتبعات إعلانية.' : 'Your data is not for sale, and our apps carry no ad trackers.'}</p></div>
  </div>
</div></section>
<section id="apps"><div class="wrap">
  <h2>${L === 0 ? 'تطبيقاتنا' : 'Our apps'}</h2>
  <p class="h-sub">${L === 0 ? 'ثلاث تطبيقات، كل واحد بحالته الحقيقية.' : 'Three apps, each shown as it really is today.'}</p>
  <div class="grid">${['hayati', 'sports-hub', 'ijarati'].map((s) => appCard(L, s)).join('')}</div>
</div></section>
<section><div class="wrap">
  <h2>${L === 0 ? 'وعدنا لك' : 'Our promise'}</h2>
  <ul class="promise">
    <li>${L === 0 ? 'ما نبيع بياناتك ولا نشاركها للإعلانات.' : 'We do not sell your data or share it for advertising.'}</li>
    <li>${L === 0 ? 'ما نحط متتبعات إعلانية بتطبيقاتنا ولا بهالموقع.' : 'No ad trackers in our apps or on this site.'}</li>
    <li>${L === 0 ? 'بحياتي تقدر تحذف حسابك وبياناتك من داخل التطبيق، وهذا شرط لأي تطبيق ننزله.' : 'In Hayati you can delete your account and data from inside the app, and every app we release will let you do the same.'}</li>
    <li>${L === 0 ? 'أي جهة خارجية نستخدمها (استضافة، ذكاء اصطناعي) نذكرها بالاسم بسياسة الخصوصية.' : 'Every outside service we use (hosting, AI) is named in the privacy policy.'}</li>
  </ul>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'تواصل' : 'Contact'}</h2>
  <p class="h-sub">${L === 0 ? 'ملاحظة، فكرة، أو شغل مشترك؟' : 'A note, an idea, or work together?'}</p>
  ${form(L, 'contact', 'general', { btn: T.send[L], msgLabel: L === 0 ? 'رسالتك' : 'Your message' })}
  <p class="note">${L === 0 ? 'أو راسلنا مباشرة:' : 'Or email us directly:'} <span dir="ltr">${EMAIL}</span></p>
</div></section>`,
});

P.hayati = (L) => ({
  navOn: 'apps',
  title: L === 0 ? 'حياتي · من ودقة' : 'Hayati · by WADQA',
  desc: L === 0 ? 'حياتي: يومك بمكان واحد. الميزانية ورسائل البنك، المواعيد، العبادة، والمحاضرات. نسخة تجريبية قيد التطوير.' : 'Hayati: your day in one place. Budget and bank messages, reminders, worship and lectures. Beta, in development.',
  body: `<div class="wrap hero">
  <div>
    <div class="app-ic ic-hayati reveal">${apps.hayati.ic}</div>
    <h1 class="sm reveal r2">${apps.hayati.name[L]}</h1>
    <p class="lead reveal r3">${L === 0 ? 'يومك بمكان واحد، بدال ستة تطبيقات: فلوسك، مواعيدك، عبادتك، ومحاضراتك. بالعربي أولاً، لأندرويد وآيفون.' : 'Your day in one place instead of six apps: money, reminders, worship and lectures. Arabic first, for Android and iPhone.'}</p>
    <div class="cta reveal r4"><span class="pill beta">${apps.hayati.pill[L]}</span></div>
  </div>
</div>
<section><div class="wrap">
  <h2>${L === 0 ? 'من داخل التطبيق' : 'Inside the app'}</h2>
  <div class="shots">
    <img src="IMG/hayati-today.jpg" width="540" height="960" alt="${L === 0 ? 'شاشة اليوم' : 'Today screen'}" loading="lazy">
    <img src="IMG/hayati-money.jpg" width="540" height="960" alt="${L === 0 ? 'شاشة الفلوس' : 'Money screen'}" loading="lazy">
    <img src="IMG/hayati-ibada.jpg" width="540" height="960" alt="${L === 0 ? 'شاشة عبادتي' : 'Worship screen'}" loading="lazy">
  </div>
  <p class="note">${T.shots_note[L]}</p>
</div></section>
<section><div class="wrap">
  <h2>${L === 0 ? 'الميزات' : 'Features'}</h2>
  <p class="h-sub">${L === 0 ? 'مبنية بالنسخة التجريبية.' : 'Built in the beta.'}</p>
  <div class="feat">
    ${(L === 0 ? [['الفلوس', 'ميزانية شهرية، وتصنيف رسائل البنك اللي تشاركها، وهدف ادخار'], ['اليوم', 'مواعيد وتذكيرات، وودجت للشاشة الرئيسية'], ['عبادتي', 'ورد القرآن، المسبحة، والتقويم الهجري'], ['المحاضرات', 'تسجيل، وملخص وأسئلة بالذكاء الاصطناعي للمسجّلين'], ['السفر', 'رحلات، ميزانية، أغراض، وتحويل عملات'], ['حسابك', 'اختياري، مع نسخة احتياطية مشفّرة بكلمة سر']] : [['Money', 'Monthly budget, sorting the bank messages you share, and savings goals'], ['Today', 'Appointments, reminders and a home-screen widget'], ['Worship', 'Daily Quran reading, tasbih counter and Hijri calendar'], ['Lectures', 'Recording, plus AI summaries and quizzes for signed-in users'], ['Travel', 'Trips, budget, packing list and currency conversion'], ['Your account', 'Optional, with a password-encrypted backup']]).map(([b, d]) => `<div><b>${b}</b>${d}</div>`).join('\n    ')}
  </div>
  <p class="note">${L === 0 ? 'بعض الميزات ما انجربت للحين على أجهزة حقيقية قبل الإطلاق. سياسة خصوصية حياتي داخل التطبيق.' : 'Some features have not yet been tested on real devices ahead of release. Hayati has its own privacy policy inside the app.'}</p>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'جرّب النسخة التجريبية' : 'Try the beta'}</h2>
  <p class="h-sub">${L === 0 ? 'نجمع مختبرين أندرويد للاختبار المغلق على Google Play. سجّل وبنراسلك.' : 'We are gathering Android testers for a closed test on Google Play. Sign up and we will email you.'}</p>
  ${form(L, 'waitlist', 'hayati', { btn: T.join[L], msgLabel: L === 0 ? 'اختياري: جوالك (أندرويد/آيفون) وشنو تبي من التطبيق' : 'Optional: your phone (Android/iPhone) and what you want from the app' })}
</div></section>`,
});

P['sports-hub'] = (L) => ({
  navOn: 'apps',
  title: 'Sports Hub · ' + (L === 0 ? 'من ودقة' : 'by WADQA'),
  desc: L === 0 ? 'Sports Hub: إدارة الفرق واللاعبين والأندية. قيد التطوير.' : 'Sports Hub: running teams, players and clubs. In development.',
  body: `<div class="wrap hero">
  <div>
    <div class="app-ic ic-sports reveal">⚽</div>
    <h1 class="sm reveal r2" dir="ltr">Sports Hub</h1>
    <p class="lead reveal r3">${L === 0 ? 'إدارة الفرق واللاعبين والأندية بمكان واحد.' : 'Teams, players and clubs, managed in one place.'}</p>
    <div class="cta reveal r4"><span class="pill">${apps['sports-hub'].pill[L]}</span></div>
  </div>
</div>
<section><div class="wrap prose">
  <h2>${L === 0 ? 'وين وصلنا' : 'Where we are'}</h2>
  <p>${L === 0 ? 'الأساس جاهز: واجهة تشتغل على كل الأجهزة، وهوية وألوان موحّدة. الميزات نفسها قيد البناء، فما نعرضها قبل ما تشتغل.' : 'The foundation is in place: an interface that works on every device, with one identity and colour system. The features themselves are being built, so we will show them once they work.'}</p>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'بلّغني لما يجهز' : 'Tell me when it is ready'}</h2>
  <p class="h-sub">${L === 0 ? 'مدرّب، إداري نادي، أو لاعب؟ قول لنا وش تحتاج.' : 'Coach, club admin or player? Tell us what you need.'}</p>
  ${form(L, 'waitlist', 'sports-hub', { btn: T.join[L], msgLabel: L === 0 ? 'اختياري: دورك (مدرب/إداري/لاعب) وأكثر شي يتعبك' : 'Optional: your role (coach/admin/player) and your biggest pain' })}
</div></section>`,
});

P.ijarati = (L) => ({
  navOn: 'apps',
  title: (L === 0 ? 'إجاراتي · من ودقة' : 'Ijarati · by WADQA'),
  desc: L === 0 ? 'إجاراتي: متابعة العقارات والإيجارات للملّاك. فكرة، ونقيس الطلب قبل ما نبني.' : 'Ijarati: tracking properties and rent for landlords. An idea; we are testing demand before building.',
  body: `<div class="wrap hero">
  <div>
    <div class="app-ic ic-ijarati reveal">🏠</div>
    <h1 class="sm reveal r2">${apps.ijarati.name[L]}</h1>
    <p class="lead reveal r3">${L === 0 ? 'متابعة عقاراتك وإيجاراتك: مين دفع، مين متأخر، ومتى ينتهي العقد.' : 'Keep track of your properties and rent: who paid, who is late, and when each lease ends.'}</p>
    <div class="cta reveal r4"><span class="pill">${apps.ijarati.pill[L]}</span></div>
  </div>
</div>
<section><div class="wrap prose">
  <h2>${L === 0 ? 'ليش ما بنيناه للحين' : 'Why we have not built it yet'}</h2>
  <p>${L === 0 ? 'قبل ما نبني، نبي نتأكد إن الملّاك يحتاجونه فعلاً. لو أنت مالك عقار، تسجيلك هنا هو اللي يقرر.' : 'Before we build, we want to be sure landlords actually need it. If you own property, signing up here is what decides it.'}</p>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'سجّل اهتمامك' : 'Register your interest'}</h2>
  <p class="h-sub">${L === 0 ? 'بنراسلك مرة وحدة لما نقرر نبنيه.' : 'We will email you once, when we decide to build it.'}</p>
  ${form(L, 'waitlist', 'ijarati', { btn: T.join[L], msgLabel: L === 0 ? 'اختياري: كم وحدة عندك، وشلون تتابعها اليوم؟' : 'Optional: how many units you have, and how you track them today' })}
</div></section>`,
});

P.privacy = (L) => ({
  title: L === 0 ? 'سياسة الخصوصية · ودقة' : 'Privacy policy · WADQA',
  desc: L === 0 ? 'سياسة خصوصية موقع ودقة.' : 'Privacy policy for the WADQA website.',
  body: `<section><div class="wrap prose">
  <p class="note">${L === 0 ? 'مسودة للمراجعة — مو استشارة قانونية ملزمة. آخر تحديث: 20 أكتوبر 2026' : 'Draft for review, not binding legal advice. Last updated: 20 October 2026'}</p>
  <h1 class="sm">${L === 0 ? 'سياسة الخصوصية' : 'Privacy policy'}</h1>
  <p>${L === 0 ? `هذي السياسة لموقع <span dir="ltr">wadqa.com</span> بس. كل تطبيق من تطبيقاتنا (مثل «حياتي») له سياسة خاصة داخل التطبيق.` : 'This policy covers the wadqa.com website only. Each of our apps (such as Hayati) has its own policy inside the app.'}</p>
  <h3>${L === 0 ? 'لما تتصفح' : 'When you browse'}</h3>
  <p>${L === 0 ? 'ما فيه ملفات تعريف ارتباط (cookies) ولا تحليلات ولا إعلانات. الخطوط والصور على نفس الدومين. مزوّد الاستضافة (Vercel) يسجّل بيانات تقنية عادية لكل زيارة (عنوان IP، المتصفح، الوقت) لتشغيل الموقع وحمايته، حسب سياسته.' : 'There are no cookies, analytics or ads. Fonts and images are served from this domain. Our host (Vercel) logs standard technical data for each visit (IP address, browser, time) to run and protect the site, under its own policy.'}</p>
  <h3>${L === 0 ? 'لما تعبّي نموذج' : 'When you fill in a form'}</h3>
  <ul>
    <li>${L === 0 ? '<b>وش نحفظ:</b> إيميلك، واسمك ورسالتك لو كتبتها، والتطبيق اللي سجّلت عليه، ولغة الصفحة، ووقت الإرسال.' : '<b>What we store:</b> your email, your name and message if you wrote them, which app you signed up for, the page language, and the time.'}</li>
    <li>${L === 0 ? '<b>ليش:</b> عشان نرد عليك، أو نراسلك مرة وحدة لما التطبيق يجهز. ما نضيفك لأي قائمة بريدية ثانية.' : '<b>Why:</b> to reply to you, or to email you once when the app is ready. We do not add you to any other mailing list.'}</li>
    <li>${L === 0 ? '<b>وين:</b> قاعدة بيانات Supabase بمنطقة فرانكفورت (ألمانيا)، يعني خارج البحرين. نطلب موافقتك على هذا قبل الإرسال.' : '<b>Where:</b> a Supabase database in the Frankfurt region (Germany), outside Bahrain. We ask for your consent to this before you send.'}</li>
    <li>${L === 0 ? '<b>مين يشوفها:</b> مؤسس ودقة بس. ما ننشرها ولا نبيعها.' : '<b>Who sees it:</b> only WADQA’s founder. We do not publish or sell it.'}</li>
    <li>${L === 0 ? '<b>كم نحتفظ:</b> بحد أقصى 24 شهر، وبعدها تنحذف.' : '<b>How long:</b> 24 months at most, then it is deleted.'}</li>
  </ul>
  <h3>${L === 0 ? 'حقوقك' : 'Your rights'}</h3>
  <p>${L === 0 ? `حسب قانون حماية البيانات الشخصية البحريني (قانون رقم 30 لسنة 2018)، تقدر تطلب نسخة من بياناتك أو تصحيحها أو حذفها، وتسحب موافقتك، بإيميل على <span dir="ltr">${EMAIL}</span>.` : `Under Bahrain’s Personal Data Protection Law (Law No. 30 of 2018), you can ask for a copy of your data, correct it, delete it, or withdraw your consent by emailing ${EMAIL}.`}</p>
  <h3>${L === 0 ? 'التواصل' : 'Contact'}</h3>
  <p>${L === 0 ? `ودقة · WADQA Studio — مملكة البحرين · السجل التجاري: [بعد التسجيل] · <span dir="ltr">${EMAIL}</span>` : `WADQA Studio — Kingdom of Bahrain · Commercial registration: [pending] · ${EMAIL}`}</p>
  <p><a href="./">${T.back_home[L]}</a></p>
</div></section>`,
});

// ———— الكتابة ————
fs.mkdirSync(path.join(OUT, 'en'), { recursive: true });
for (const slug of Object.keys(P)) {
  for (const L of [0, 1]) {
    const file = path.join(OUT, L === 0 ? '' : 'en', slug + '.html');
    fs.writeFileSync(file, page(L, slug, P[slug](L)));
  }
}
fs.copyFileSync(path.join(SRC, 'site.css'), path.join(OUT, 'site.css'));
fs.copyFileSync(path.join(SRC, 'app.js'), path.join(OUT, 'app.js'));
fs.writeFileSync(path.join(OUT, 'config.js'), `window.WADQA = ${JSON.stringify({ url: SUPA_URL, key: SUPA_KEY })};\n`);
fs.copyFileSync(path.join(ROOT, 'hayati-app/brand/out/mark-app-icon-1024.png'), path.join(OUT, 'img/hayati-icon.png'));
const CSP = `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self' ${SUPA_URL}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
fs.writeFileSync(path.join(OUT, 'vercel.json'), JSON.stringify({
  cleanUrls: true,
  headers: [{ source: '/(.*)', headers: [
    { key: 'Content-Security-Policy', value: CSP },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ] }],
}, null, 2) + '\n');
console.log('built', Object.keys(P).length * 2, 'pages →', path.relative(ROOT, OUT));
