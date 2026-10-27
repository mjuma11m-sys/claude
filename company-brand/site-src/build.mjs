// موقع ودقة: يولّد كل صفحة بالعربي (/) والإنقليزي (/en/) من نفس القالب → company-brand/site/
//   node company-brand/site-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SRC, '../site');
const ROOT = path.join(SRC, '..');
// العنوان الحقيقي للموقع (DW-063). wadqa.com مو لنا: لما ينشرى دومين، يتغيّر هالسطر بس (canonical، og، sitemap، الخصوصية)
const DOMAIN = 'https://myrent-sigma.vercel.app';
const HOST = DOMAIN.replace(/^https:\/\//, '');
// Google Search Console (DW-063): قيمة content من سطر google-site-verification (مو سر). null = ما ينضاف
const GOOGLE_VERIFY = null;
// الإيميل يطلع بالموقع بس لما يكون فيه صندوق حقيقي على دومين نملكه (DW-056). قبلها: نموذج التواصل
const EMAIL = 'wadqa.studio.bh@gmail.com';
const INSTAGRAM = 'wadqa.bh';   // حساب الشركة (2026-10-27)

// المفتاح العام (anon) لمشروع Supabase «hayati» — الجدول محمي، والكتابة بس عبر wadqa_submit
const { url: SUPA_URL, key: SUPA_KEY } = JSON.parse(fs.readFileSync(path.join(SRC, 'supabase/config.json'), 'utf8'));

const DROP = 'M256 104C256 104 160 228 160 310A96 96 0 0 0 352 310C352 228 256 104 256 104Z';
const mark = (cls = '') => `<svg class="${cls}" viewBox="0 0 512 512" aria-hidden="true"><path class="d-line" pathLength="1" d="${DROP}" fill="none" stroke="#F2EBDD" stroke-width="34" stroke-linejoin="round"/><circle class="d-dot" cx="256" cy="316" r="38" fill="#C8A04A"/></svg>`;
const heroMark = `<svg class="drop" viewBox="0 0 512 512" role="img" aria-label="ودقة · WADQA"><ellipse class="d-ring" cx="256" cy="330" rx="150" ry="40" fill="none" stroke="#C8A04A" stroke-width="3" opacity="0"/><path class="d-line" pathLength="1" d="${DROP}" fill="none" stroke="#F2EBDD" stroke-width="34" stroke-linejoin="round"/><circle class="d-dot" cx="256" cy="316" r="38" fill="#C8A04A"/></svg>`;

// كل نص بالموقع: [عربي، إنقليزي]
const T = {
  nav_values: ['قيمنا', 'Values'], nav_apps: ['تطبيقاتنا', 'Apps'], nav_contact: ['تواصل', 'Contact'],
  lang_other: ['English', 'عربي'],
  skip: ['تخطَّ للمحتوى', 'Skip to content'],
  footer_rights: ['© 2026 ودقة · WADQA Studio · مملكة البحرين', '© 2026 WADQA Studio · Kingdom of Bahrain'],
  footer_privacy: ['سياسة الخصوصية', 'Privacy policy'], footer_support: ['الدعم', 'Support'],
  footer_status: ['قيد التطوير', 'In development'],
  name_l: ['الاسم (اختياري)', 'Name (optional)'], email_l: ['الإيميل', 'Email'],
  consent: [`أوافق إن ودقة تحفظ اسمي وإيميلي ورسالتي على خوادم Supabase بألمانيا عشان ترد علي، حسب <a href="PRIV">سياسة الخصوصية</a>.`, `I agree that WADQA stores my name, email and message on Supabase servers in Germany to reply to me, as described in the <a href="PRIV">privacy policy</a>.`],
  send: ['أرسل', 'Send'], join: ['سجّلني', 'Notify me'],
  shots_note: ['* لقطات ببيانات تجريبية', '* Screenshots use sample data'],
  back_home: ['← الرئيسية', '← Home'],
};

// stores: روابط المتاجر. null = «قريباً» (زر باهت بدون رابط)، ورابط = زر يشتغل. التطبيق بدون stores ما تطلع له أزرار أبداً
//   (ما نعد بمتجر ما فيه خطة له). الشعارات الرسمية للمتاجر ممنوعة قبل ما يكون التطبيق متاح، فالأزرار نص بس (DW-050).
const apps = {
  hayati: { stores: { ios: null, android: null }, ic: '<img src="IMG/hayati-icon.png" alt="">', cls: 'ic-hayati', name: ['حياتي', 'Hayati'], pill: ['نسخة تجريبية · قيد التطوير', 'Beta · In development'], beta: true, short: ['يومك بمكان واحد: الميزانية، المواعيد، العبادة، والمحاضرات.', 'Your day in one place: budget, reminders, worship and lectures.'] },
  'sports-hub': { ic: '⚽', cls: 'ic-sports', name: ['Sports Hub', 'Sports Hub'], pill: ['قيد التطوير', 'In development'], short: ['إدارة الفرق واللاعبين والأندية.', 'Running teams, players and clubs.'] },
  idarati: { ic: '<img src="IMG/idarati-icon.png" alt="">', cls: 'ic-idarati', name: ['إداراتي', 'Idarati'], pill: ['نسخة تجريبية · قيد التطوير', 'Beta · In development'], beta: true, short: ['إدارة أملاك وميزانية العائلة: الإيجارات، الفواتير، والشيكات.', 'Family property and budget management: rent, bills and cheques.'] },
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
<meta property="og:image" content="${DOMAIN}/og-logo.png"><meta property="og:type" content="website"><meta property="og:url" content="${urlOf(L, slug)}"><meta property="og:locale" content="${ar ? 'ar_BH' : 'en_US'}"><meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0B1514">${GOOGLE_VERIFY && slug === 'index' && ar ? `\n<meta name="google-site-verification" content="${GOOGLE_VERIFY}">` : ''}
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
  <span><a href="support.html">${t('footer_support')}</a> · <a href="privacy.html">${t('footer_privacy')}</a> · <a href="https://instagram.com/${INSTAGRAM}" rel="noopener" dir="ltr">@${INSTAGRAM}</a> · ${t('footer_status')}</span>
</div></footer>
<script src="${pre}config.js"></script>
<script src="${pre}app.js" defer></script>
</body>
</html>
`;
}

const form = (L, kind, product, { btn, msgLabel, msg = true, msgRequired = false, consentText }) => `<form class="lead-form" data-kind="${kind}" data-product="${product}" novalidate>
  <div class="field"><label for="${product}-name">${T.name_l[L]}</label><input id="${product}-name" name="name" type="text" maxlength="80" autocomplete="name"></div>
  <div class="field"><label for="${product}-email">${T.email_l[L]}</label><input id="${product}-email" name="email" type="email" maxlength="254" autocomplete="email" required dir="ltr"></div>
  ${msg ? `<div class="field"><label for="${product}-msg">${msgLabel}</label><textarea id="${product}-msg" name="message" maxlength="2000"${msgRequired ? ' required' : ''}></textarea></div>` : ''}
  <div class="hp" aria-hidden="true"><label for="${product}-web">Website</label><input id="${product}-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
  <label class="consent"><input type="checkbox" name="consent" required><span>${consentText || T.consent[L]}</span></label>
  <div><button class="btn solid" type="submit">${btn}</button></div>
  <p class="status" role="status" aria-live="polite"></p>
</form>`;

const STORES = [['ios', 'App Store'], ['android', 'Google Play']];
const storeRow = (L, slug) => {
  const st = apps[slug].stores;
  if (!st) return '';
  return `<div class="stores" aria-label="${L === 0 ? 'التحميل' : 'Download'}">${STORES.map(([k, label]) => st[k]
    ? `<a class="store" href="${st[k]}" target="_blank" rel="noopener"><small>${L === 0 ? 'حمّله من' : 'Get it on'}</small><b dir="ltr">${label}</b></a>`
    : `<span class="store soon" aria-disabled="true"><small>${L === 0 ? 'قريباً على' : 'Coming soon to'}</small><b dir="ltr">${label}</b></span>`).join('')}</div>`;
};
const appCard = (L, slug) => { const a = apps[slug]; return `<div class="card app-card">
  <div class="app-ic ${a.cls}">${a.ic}</div>
  <h3${slug === 'sports-hub' ? ' dir="ltr"' : ''}><a class="stretch" href="${slug}.html">${a.name[L]}</a></h3><p>${a.short[L]}</p>
  <span class="pill${a.beta ? ' beta' : ''}">${a.pill[L]}</span>
  ${storeRow(L, slug)}
  <a class="more" href="${slug}.html">${L === 0 ? 'التفاصيل ←' : 'Details →'}</a></div>`; };

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
  <div class="grid">${['hayati', 'idarati', 'sports-hub'].map((s) => appCard(L, s)).join('')}</div>
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
  ${EMAIL ? `<p class="note">${L === 0 ? 'أو راسلنا مباشرة:' : 'Or email us directly:'} <span dir="ltr">${EMAIL}</span>${INSTAGRAM ? ` · ${L === 0 ? 'إنستقرام' : 'Instagram'} <a href="https://instagram.com/${INSTAGRAM}" rel="noopener" dir="ltr">@${INSTAGRAM}</a>` : ''}</p>` : ''}
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
    <div class="reveal r4">${storeRow(L, 'hayati')}</div>
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
  <p class="note"><a href="testers.html">${L === 0 ? 'تبي تصير مختبر رسمي (14 يوم)؟ شوف وش المطلوب ←' : 'Want to be an official tester (14 days)? See what it involves →'}</a></p>
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

P.idarati = (L) => ({
  navOn: 'apps',
  title: (L === 0 ? 'إداراتي · من ودقة' : 'Idarati · by WADQA'),
  desc: L === 0 ? 'إداراتي: إدارة أملاك وميزانية العائلة. نسخة تجريبية، قيد التطوير.' : 'Idarati: family property and budget management. Beta, in development.',
  body: `<div class="wrap hero">
  <div>
    <div class="app-ic ic-idarati reveal">${apps.idarati.ic}</div>
    <h1 class="sm reveal r2">${apps.idarati.name[L]}</h1>
    <p class="lead reveal r3">${L === 0 ? 'أملاك العائلة وميزانيتها بمكان واحد: مين دفع، مين متأخر، وش عليك هالشهر.' : 'Your family’s properties and budget in one place: who paid, who is late, and what is due this month.'}</p>
    <div class="cta reveal r4"><a class="btn solid" href="https://idarati-gamma.vercel.app" target="_blank" rel="noopener">${L === 0 ? 'جرّب النسخة التجريبية' : 'Try the beta'}</a><span class="pill beta">${apps.idarati.pill[L]}</span></div>
    <p class="note reveal r4">${L === 0 ? 'تشتغل ببيانات تجريبية على جهازك، وتقدر تمسحها وتبدأ ببياناتك.' : 'It runs on sample data on your device; you can clear it and start with your own.'}</p>
  </div>
</div>
<section><div class="wrap">
  <h2>${L === 0 ? 'الميزات' : 'Features'}</h2>
  <p class="h-sub">${L === 0 ? 'مبنية بالنسخة التجريبية.' : 'Built in the beta.'}</p>
  <div class="feat">
    ${(L === 0 ? [['الإيجارات', 'الوحدات والمستأجرين والعقود، والدفعات والإيصالات'], ['الشيكات المؤجلة', 'كل شيك وتاريخ استحقاقه'], ['الميزانية والفواتير', 'مصروف البيت، والفواتير، والصيانة'], ['التذكيرات', 'قبل ما يستحق إيجار أو فاتورة أو ينتهي عقد'], ['تقرير الشهر', 'دخل ومصروف الشهر بصفحة وحدة'], ['العائلة', 'صلاحيات لكل فرد، وسجل نشاط، وبحث وملاحظات']] : [['Rent', 'Units, tenants and leases, with payments and receipts'], ['Post-dated cheques', 'Every cheque and its due date'], ['Budget and bills', 'Household spending, bills and maintenance'], ['Reminders', 'Before rent or a bill is due, or a lease ends'], ['Monthly report', 'The month’s income and spending on one page'], ['Family', 'Per-member permissions, an activity log, search and notes']]).map(([b, d]) => `<div><b>${b}</b>${d}</div>`).join('\n    ')}
  </div>
  <p class="note">${L === 0 ? 'النسخة التجريبية تشتغل ببيانات تجريبية، وبعض الميزات ما انجربت للحين مع عائلات حقيقية.' : 'The beta runs on sample data, and some features have not yet been tried with real families.'}</p>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'بلّغني لما يجهز' : 'Tell me when it is ready'}</h2>
  <p class="h-sub">${L === 0 ? 'عندك أملاك أو تدير ميزانية البيت؟ سجّل وبنراسلك.' : 'Own property or run the household budget? Sign up and we will email you.'}</p>
  ${form(L, 'waitlist', 'idarati', { btn: T.join[L], msgLabel: L === 0 ? 'اختياري: كم وحدة عندك، وشلون تتابعها اليوم؟' : 'Optional: how many units you have, and how you track them today' })}
</div></section>`,
});

const AR_AGREEMENT = [
  `<b>وش تجرب:</b> نسخة تجريبية من «حياتي» قيد التطوير، عبر TestFlight (آيفون) أو اختبار Google Play المغلق (أندرويد). ممكن فيها أخطاء أو تنحذف ميزات.`,
  `<b>المدة:</b> Google يطلب 14 يوم متواصلة لأندرويد، فنطلب تخلي التطبيق مثبّت هالمدة لو تقدر. مو إلزام.`,
  `<b>بلا ضمان:</b> التطبيق «كما هو». لا تعتمد عليه وحده لأي قرار مالي، وخذ نسخة احتياطية.`,
  `<b>بياناتك:</b> نحتاج إيميلك بس عشان نضيفك للاختبار. بياناتك داخل التطبيق تظل بجهازك إلا لو سوّيت حساب. ما نطلب لقطات فيها أرقامك الحقيقية.`,
  `<b>ملاحظاتك:</b> نقدر نستخدم أفكارك وملاحظاتك لتطوير التطبيق بدون مقابل، وبدون ذكر اسمك إلا بإذنك.`,
  `<b>السرية:</b> لا تنشر لقطات أو تفاصيل ميزات ما انعلنت. اللي بالموقع أو المتجر مو سري.`,
  `<b>الانسحاب:</b> بأي وقت وبدون سبب. احذف التطبيق، ولو تبي نحذف إيميلك راسلنا من نموذج التواصل.`,
  `<b>العمر والقانون:</b> 18 سنة وفوق، وتنطبق قوانين مملكة البحرين.`
];
const EN_AGREEMENT = [
  `<b>What you test:</b> a beta of Hayati, in development, through TestFlight (iPhone) or Google Play closed testing (Android). It may have bugs, and features may change.`,
  `<b>How long:</b> Google requires 14 consecutive days on Android, so please keep the app installed that long if you can. Not mandatory.`,
  `<b>No warranty:</b> the app is provided as is. Don’t rely on it alone for money decisions, and keep a backup.`,
  `<b>Your data:</b> we only need your email to add you to the test. Data inside the app stays on your device unless you create an account. We never ask for screenshots with your real numbers.`,
  `<b>Your feedback:</b> we may use your ideas and notes to improve the app, without payment, and without naming you unless you agree.`,
  `<b>Confidentiality:</b> please don’t publish screenshots or details of unannounced features. Anything on the website or in the store is not confidential.`,
  `<b>Leaving:</b> any time, no reason needed. Delete the app, and contact us through the form if you want your email removed.`,
  `<b>Age and law:</b> 18 or older; the laws of the Kingdom of Bahrain apply.`
];

P.testers = (L) => ({
  navOn: 'apps',
  title: L === 0 ? 'كن مختبر · حياتي' : 'Become a tester · Hayati',
  desc: L === 0 ? 'جرّب «حياتي» قبل الكل: نسخة تجريبية لأندرويد وآيفون، 14 يوم، بدون فلوس.' : 'Try Hayati before everyone else: a beta for Android and iPhone, 14 days, free.',
  body: `<div class="wrap hero">
  <div>
    <div class="app-ic ic-hayati reveal">${apps.hayati.ic}</div>
    <h1 class="sm reveal r2">${L === 0 ? 'كن مختبر «حياتي»' : 'Become a Hayati tester'}</h1>
    <p class="lead reveal r3">${L === 0 ? 'نبي 12 شخص يجربون «حياتي» على جوالاتهم قبل ما ينزل للكل، ويقولون لنا وش ما اشتغل. بدون فلوس، وتقدر تنسحب بأي وقت.' : 'We are looking for 12 people to try Hayati on their phones before it goes public, and tell us what did not work. It is free, and you can leave any time.'}</p>
    <div class="cta reveal r4"><span class="pill beta">${apps.hayati.pill[L]}</span></div>
  </div>
</div>
<section><div class="wrap">
  <h2>${L === 0 ? 'وش المطلوب منك' : 'What it involves'}</h2>
  <div class="feat">
    ${(L === 0 ? [['1 · سجّل', 'إيميلك ونوع جوالك بالنموذج تحت.'], ['2 · ثبّت', 'نرسلك دعوة: TestFlight للآيفون أو رابط Google Play للأندرويد.'], ['3 · استخدمه 14 يوم', 'سجّل مصاريفك أو جدولك مثل العادة. خله مثبّت لين تخلص المدة.'], ['4 · قول لنا', 'من الإعدادات ← «بلّغ عن مشكلة» أو «رأيك بالتطبيق».']]
      : [['1 · Sign up', 'Your email and phone type in the form below.'], ['2 · Install', 'We send an invite: TestFlight for iPhone or a Google Play link for Android.'], ['3 · Use it for 14 days', 'Log your spending or timetable as usual. Keep it installed for the whole period.'], ['4 · Tell us', 'From Settings → “Report a problem” or “Your feedback”.']]).map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}
  </div>
  <p class="note">${L === 0 ? 'أندرويد: نبدأ أول ما Google يفعّل حساب المطوّر. آيفون: بعد ما تخلص مراجعة آبل. قبلها نحفظ اسمك بالقائمة بس.' : 'Android: we start once Google activates our developer account. iPhone: once Apple’s review is done. Until then we only keep you on the list.'}</p>
</div></section>
<section><div class="wrap prose">
  <h2>${L === 0 ? 'اتفاقية المختبر' : 'Tester agreement'}</h2>
  <p class="note">${L === 0 ? 'مسودة للمراجعة، مو استشارة قانونية ملزمة.' : 'Draft for review, not binding legal advice.'}</p>
  <ol>${(L === 0 ? AR_AGREEMENT : EN_AGREEMENT).map((x) => `<li>${x}</li>`).join('')}</ol>
</div></section>
<section id="contact"><div class="wrap">
  <h2>${L === 0 ? 'سجّلني مختبر' : 'Sign me up as a tester'}</h2>
  ${form(L, 'tester', 'hayati', { btn: L === 0 ? 'سجّلني مختبر' : 'Sign me up', msgRequired: true, msgLabel: L === 0 ? 'جوالك: أندرويد أو آيفون، والموديل (مثلاً: Samsung A54)' : 'Your phone: Android or iPhone, and the model (e.g. Samsung A54)',
    consentText: L === 0 ? 'قرأت اتفاقية المختبر وأوافق عليها، وأوافق إن ودقة تحفظ اسمي وإيميلي ونوع جوالي على خوادم Supabase بألمانيا عشان تضيفني للاختبار، حسب <a href="PRIV">سياسة الخصوصية</a>. عمري 18 أو أكثر.' : 'I have read and accept the tester agreement, and I agree that WADQA stores my name, email and phone type on Supabase servers in Germany to add me to the test, as described in the <a href="PRIV">privacy policy</a>. I am 18 or older.' })}
</div></section>`,
});

P.support = (L) => ({
  title: L === 0 ? 'الدعم · ودقة' : 'Support · WADQA',
  desc: L === 0 ? 'أسئلة شائعة عن تطبيقات ودقة، وشلون توصلنا.' : 'Common questions about WADQA apps, and how to reach us.',
  body: `<section><div class="wrap prose">
  <h1 class="sm">${L === 0 ? 'الدعم' : 'Support'}</h1>
  <p>${L === 0 ? 'أسئلة شائعة عن تطبيقاتنا. ما لقيت جوابك؟ <a href="./#contact">راسلنا</a>.' : 'Common questions about our apps. Not answered here? <a href="./#contact">Write to us</a>.'}</p>
  <details class="faq"><summary>${L === 0 ? 'هل «حياتي» موجود على App Store أو Google Play؟' : 'Is Hayati on the App Store or Google Play?'}</summary><p>${L === 0 ? 'مو للحين. «حياتي» قيد التطوير · نسخة تجريبية. سجّل بقائمة الانتظار بـ <a href="hayati.html">صفحة حياتي</a> ونراسلك مرة وحدة لما ينزل.' : 'Not yet. Hayati is in development (beta). Join the waitlist on the <a href="hayati.html">Hayati page</a> and we will email you once when it is out.'}</p></details>
  <details class="faq"><summary>${L === 0 ? 'هل أحتاج حساب؟' : 'Do I need an account?'}</summary><p>${L === 0 ? 'لا. كل الميزات الأساسية تشتغل على جهازك بدون حساب. الحساب اختياري، للنسخ الاحتياطي والمزامنة بين أجهزتك.' : 'No. The main features work on your device without an account. An account is optional, for backup and sync between your devices.'}</p></details>
  <details class="faq"><summary>${L === 0 ? 'وين تنحفظ بياناتي؟' : 'Where is my data stored?'}</summary><p>${L === 0 ? 'بجهازك أول. لو سوّيت حساب، نسخة من بياناتك تنحفظ بـ Supabase بمنطقة فرانكفورت (ألمانيا)، وكل حساب يشوف بياناته بس.' : 'On your device first. If you create an account, a copy is stored on Supabase in the Frankfurt region (Germany), and each account can only see its own data.'}</p></details>
  <details class="faq"><summary>${L === 0 ? 'شلون أحذف بياناتي؟' : 'How do I delete my data?'}</summary><p>${L === 0 ? 'داخل «حياتي»: الإعدادات ← «احذف كل بياناتي». يمسح اللي بالجهاز، ولو عندك حساب يمسح نسخته بعد. لبيانات نماذج هالموقع: راسلنا من نموذج التواصل.' : 'In Hayati: Settings → “Delete all my data”. It erases the device copy and, if you have an account, the account copy too. For data from this website’s forms, contact us through the form.'}</p></details>
  <details class="faq"><summary>${L === 0 ? '«إداراتي» شنو وضعه؟' : 'What is the status of Idarati?'}</summary><p>${L === 0 ? 'نسخة تجريبية · قيد التطوير، تنجرّب على الويب من <a href="idarati.html">صفحة إداراتي</a>.' : 'Beta, in development. You can try it on the web from the <a href="idarati.html">Idarati page</a>.'}</p></details>
  <details class="faq"><summary>${L === 0 ? 'لقيت مشكلة أو عندي اقتراح' : 'I found a problem or have an idea'}</summary><p>${L === 0 ? 'اكتب لنا من <a href="./#contact">نموذج التواصل</a>: اسم التطبيق، نوع جهازك، ووش صار بالضبط. نحاول نرد خلال 3 أيام عمل.' : 'Write to us through the <a href="./#contact">contact form</a>: the app name, your device, and exactly what happened. We aim to reply within 3 working days.'}</p></details>
  <p><a href="./">${T.back_home[L]}</a></p>
</div></section>`,
});

P.privacy = (L) => ({
  title: L === 0 ? 'سياسة الخصوصية · ودقة' : 'Privacy policy · WADQA',
  desc: L === 0 ? 'سياسة خصوصية موقع ودقة.' : 'Privacy policy for the WADQA website.',
  body: `<section><div class="wrap prose">
  <p class="note">${L === 0 ? 'مسودة للمراجعة — مو استشارة قانونية ملزمة. آخر تحديث: 21 أكتوبر 2026' : 'Draft for review, not binding legal advice. Last updated: 21 October 2026'}</p>
  <h1 class="sm">${L === 0 ? 'سياسة الخصوصية' : 'Privacy policy'}</h1>
  <p>${L === 0 ? `هذي السياسة لموقع <span dir="ltr">${HOST}</span> بس. كل تطبيق من تطبيقاتنا (مثل «حياتي») له سياسة خاصة داخل التطبيق.` : 'This policy covers the ${HOST} website only. Each of our apps (such as Hayati) has its own policy inside the app.'}</p>
  <h3>${L === 0 ? 'لما تتصفح' : 'When you browse'}</h3>
  <p>${L === 0 ? 'ما فيه ملفات تعريف ارتباط (cookies) ولا إعلانات ولا أدوات تحليل خارجية. الخطوط والصور على نفس الدومين. نعدّ فتح كل صفحة (المسار ولغة الصفحة واليوم بس، بدون IP ولا أي معرّف) عشان نعرف أي صفحة تنقرا، وما نعدّ لو متصفحك مفعّل «عدم التتبع». مزوّد الاستضافة (Vercel) يسجّل بيانات تقنية عادية لكل زيارة (عنوان IP، المتصفح، الوقت) لتشغيل الموقع وحمايته، حسب سياسته.' : 'There are no cookies, ads or third-party analytics. Fonts and images are served from this domain. We count page opens (only the path, page language and day, with no IP address or identifier) to learn which pages are read, and we do not count you if your browser sends Do Not Track. Our host (Vercel) logs standard technical data for each visit (IP address, browser, time) to run and protect the site, under its own policy.'}</p>
  <h3>${L === 0 ? 'لما تعبّي نموذج' : 'When you fill in a form'}</h3>
  <ul>
    <li>${L === 0 ? '<b>وش نحفظ:</b> إيميلك، واسمك ورسالتك لو كتبتها، والتطبيق اللي سجّلت عليه، ولغة الصفحة، ووقت الإرسال.' : '<b>What we store:</b> your email, your name and message if you wrote them, which app you signed up for, the page language, and the time.'}</li>
    <li>${L === 0 ? '<b>ليش:</b> عشان نرد عليك، أو نراسلك مرة وحدة لما التطبيق يجهز. ما نضيفك لأي قائمة بريدية ثانية.' : '<b>Why:</b> to reply to you, or to email you once when the app is ready. We do not add you to any other mailing list.'}</li>
    <li>${L === 0 ? '<b>وين:</b> قاعدة بيانات Supabase بمنطقة فرانكفورت (ألمانيا)، يعني خارج البحرين. نطلب موافقتك على هذا قبل الإرسال.' : '<b>Where:</b> a Supabase database in the Frankfurt region (Germany), outside Bahrain. We ask for your consent to this before you send.'}</li>
    <li>${L === 0 ? '<b>مين يشوفها:</b> مؤسس ودقة بس. ما ننشرها ولا نبيعها.' : '<b>Who sees it:</b> only WADQA’s founder. We do not publish or sell it.'}</li>
    <li>${L === 0 ? '<b>كم نحتفظ:</b> بحد أقصى 24 شهر، وبعدها تنحذف.' : '<b>How long:</b> 24 months at most, then it is deleted.'}</li>
  </ul>
  <h3>${L === 0 ? 'حقوقك' : 'Your rights'}</h3>
  <p>${L === 0 ? `حسب قانون حماية البيانات الشخصية البحريني (قانون رقم 30 لسنة 2018)، تقدر تطلب نسخة من بياناتك أو تصحيحها أو حذفها، وتسحب موافقتك، ${EMAIL ? `بإيميل على <span dir="ltr">${EMAIL}</span>` : `من <a href="./#contact">نموذج التواصل</a> (اكتب نفس الإيميل اللي سجّلت فيه)`}.` : `Under Bahrain’s Personal Data Protection Law (Law No. 30 of 2018), you can ask for a copy of your data, correct it, delete it, or withdraw your consent ${EMAIL ? 'by emailing ' + EMAIL : 'through the <a href="./#contact">contact form</a> (use the same email you signed up with)'}.`}</p>
  <h3>${L === 0 ? 'التواصل' : 'Contact'}</h3>
  <p>${L === 0 ? `ودقة · WADQA Studio — مملكة البحرين · السجل التجاري: [بعد التسجيل]${EMAIL ? ` · <span dir="ltr">${EMAIL}</span>` : ''}` : `WADQA Studio — Kingdom of Bahrain · Commercial registration: [pending]${EMAIL ? ' · ' + EMAIL : ''}`}</p>
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
// sitemap + robots (DW-063): الصفحات العامة بس، واللوحة ممنوعة
const urlOfPage = (l, s) => DOMAIN + (l === 0 ? '/' : '/en/') + (s === 'index' ? '' : s);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  Object.keys(P).flatMap((s) => [0, 1].map((l) => '  <url><loc>' + urlOfPage(l, s) + '</loc><xhtml:link rel="alternate" hreflang="ar" href="' + urlOfPage(0, s) + '"/><xhtml:link rel="alternate" hreflang="en" href="' + urlOfPage(1, s) + '"/></url>')).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ' + DOMAIN + '/sitemap.xml\n');
fs.copyFileSync(path.join(SRC, 'site.css'), path.join(OUT, 'site.css'));
fs.copyFileSync(path.join(SRC, 'app.js'), path.join(OUT, 'app.js'));
// لوحة الإدارة (DW-052): ملفات ثابتة + supabase-js محلي (MIT) عشان CSP «script-src 'self'»
fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
for (const f of ['index.html', 'admin.css', 'admin.js', 'logic.js', 'docs.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(SRC, 'admin', f), path.join(OUT, 'admin', f));
// أيقونات تطبيق اللوحة (DW-062)
fs.mkdirSync(path.join(OUT, 'admin/icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'admin/icons'))) fs.copyFileSync(path.join(SRC, 'admin/icons', f), path.join(OUT, 'admin/icons', f));
// لقطات «الملفات» (بيانات تجريبية). نص الملفات نفسه بالقاعدة بس، وما ينبني للموقع
fs.mkdirSync(path.join(OUT, 'admin/docs-img'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'admin/docs-src/img'))) fs.copyFileSync(path.join(SRC, 'admin/docs-src/img', f), path.join(OUT, 'admin/docs-img', f));
fs.copyFileSync(path.join(SRC, 'admin/vendor/supabase.min.js'), path.join(OUT, 'admin/supabase.min.js'));
fs.copyFileSync(path.join(SRC, 'admin/vendor/LICENSE'), path.join(OUT, 'admin/supabase-LICENSE.txt'));
fs.writeFileSync(path.join(OUT, 'config.js'), `window.WADQA = ${JSON.stringify({ url: SUPA_URL, key: SUPA_KEY })};\n`);
const CSP = `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self' ${SUPA_URL}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
fs.writeFileSync(path.join(OUT, 'vercel.json'), JSON.stringify({
  cleanUrls: true,
  // «إجاراتي» صارت «إداراتي» (DW-051): الرابط القديم يتحوّل
  redirects: [
    { source: '/ijarati', destination: '/idarati', permanent: true },
    { source: '/en/ijarati', destination: '/en/idarati', permanent: true },
  ],
  headers: [{ source: '/admin/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] }, { source: '/(.*)', headers: [
    { key: 'Content-Security-Policy', value: CSP },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ] }],
}, null, 2) + '\n');
console.log('built', Object.keys(P).length * 2, 'pages →', path.relative(ROOT, OUT));
