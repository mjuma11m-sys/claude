/**
 * «حياتي» · فورم Google للآراء والتسجيل
 * الطريقة: script.google.com ← New project ← الصق هالملف كامل ← احفظ ← اختار createHayatiForm ← ▶️ Run
 * يسوي: الفورم + Google Sheet للردود، ويطبع الروابط بالسجل (Execution log).
 *
 * المسار:
 *   1) جربت «حياتي»؟  نعم ← 2) رأيك   |  لا ← 3)
 *   3) تبي تسجّل عشان نتواصل معك؟  نعم ← 4) بياناتك  |  لا ← إرسال
 */

// لو عندك رابط عام لسياسة الخصوصية حطه هني، وإلا يظل التواصل عن طريق إنستقرام
const PRIVACY_URL = '';
const CONTACT = '@hayati.bh على إنستقرام';

function createHayatiForm() {
  const form = FormApp.create('رأيك بـ «حياتي»')
    .setDescription(
      '«حياتي» تطبيق بحريني يرتّب مصاريفك ودراستك وصلاتك ويومك بمكان واحد.\n' +
      'التطبيق قيد التطوير · نسخة تجريبية 🛠️\n' +
      'رأيك يحدد وش ننبني بعد. الفورم ياخذ دقيقتين.')
    .setProgressBar(true)
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage(
      'وصلنا رأيك ✓ شكراً!\n' +
      'التطبيق قيد التطوير، وإذا سجلت بياناتك بنتواصل معك لما تفتح التجربة.\n' +
      'تبي تتابع وش ننبني؟ ' + CONTACT);

  // ---------- 1) البداية ----------
  const tried = form.addMultipleChoiceItem()
    .setTitle('جربت تطبيق «حياتي»؟')
    .setRequired(true);

  // ---------- 2) رأيك ----------
  const pOpinion = form.addPageBreakItem().setTitle('رأيك بالتطبيق');

  form.addScaleItem()
    .setTitle('كم تعطي «حياتي»؟')
    .setBounds(1, 5).setLabels('ما عجبني', 'عجبني وايد')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('وش الميزات اللي استخدمتها؟')
    .setChoiceValues([
      'المصاريف', 'لصق رسالة البنك', 'الاشتراكات', 'الأهداف والديون',
      'الجدول', 'المذاكرة والمعدل', 'المهام', 'أوقات الصلاة',
      'صحتي والجاهزية', 'قسم الحارس', 'البحث',
    ])
    .showOtherOption(true);

  form.addParagraphTextItem().setTitle('وش اللي ضايقك أو ما اشتغل زين؟');
  form.addParagraphTextItem().setTitle('وش الميزة اللي تبيها؟');

  form.addScaleItem()
    .setTitle('كم احتمال تنصح ربعك فيه؟')
    .setBounds(0, 10).setLabels('مستحيل', 'أكيد')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('أنت…')
    .setChoiceValues(['طالب', 'موظف', 'رياضي', 'حارس مرمى', 'شؤون البيت'])
    .showOtherOption(true);

  form.addMultipleChoiceItem()
    .setTitle('جهازك')
    .setChoiceValues(['iPhone', 'Android', 'كمبيوتر'])
    .showOtherOption(true);

  form.addMultipleChoiceItem()
    .setTitle('لو سوينا ميزة من اقتراحك، نذكر اسمك؟')
    .setChoiceValues(['إي، اذكروني', 'لا، خلّوه بدون اسم']);

  form.addTextItem()
    .setTitle('حسابك بإنستقرام (لو تبي نذكرك)')
    .setHelpText('مثلاً: @username');

  // ---------- 3) التسجيل؟ ----------
  const pAsk = form.addPageBreakItem().setTitle('تبي تجرب أول؟');
  const wants = form.addMultipleChoiceItem()
    .setTitle('تبي تسجّل عشان نتواصل معك لما تفتح التجربة؟')
    .setRequired(true);

  // ---------- 4) بياناتك ----------
  const pReg = form.addPageBreakItem()
    .setTitle('عرّفنا عليك')
    .setHelpText('نستخدم بياناتك بس عشان نتواصل معك بخصوص تجربة «حياتي». ما نشاركها مع أحد.');

  form.addTextItem().setTitle('الاسم').setRequired(true);

  form.addTextItem()
    .setTitle('رقم الواتساب')
    .setHelpText('رقم بحريني من 8 أرقام، مثلاً 3XXXXXXX')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('اكتب رقم بحريني من 8 أرقام (تقدر تبدأ بـ 973+)')
      .requireTextMatchesPattern('^(\\+?973)?\\s?[0-9]{8}$')
      .build());

  form.addTextItem()
    .setTitle('الإيميل (اختياري)')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('اكتب إيميل صحيح')
      .requireTextIsEmail()
      .build());

  form.addCheckboxItem()
    .setTitle('الموافقة')
    .setHelpText('تقدر تطلب حذف بياناتك بأي وقت: ' + CONTACT + (PRIVACY_URL ? '\nسياسة الخصوصية: ' + PRIVACY_URL : ''))
    .setChoiceValues(['أوافق إن «حياتي» يحفظ اسمي ورقمي وإيميلي ويتواصل معي بخصوص التجربة بس'])
    .setRequired(true);

  // ---------- التنقل ----------
  tried.setChoices([
    tried.createChoice('إي، جربته', pOpinion),
    tried.createChoice('لا، لسه', pAsk),
  ]);
  wants.setChoices([
    wants.createChoice('إي، سجّلني', pReg),
    wants.createChoice('لا، شكراً', FormApp.PageNavigationType.SUBMIT),
  ]);

  // ---------- جدول الردود ----------
  const ss = SpreadsheetApp.create('ردود «حياتي»');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('🔗 رابط الفورم (شاركه): ' + form.getPublishedUrl());
  Logger.log('✏️ رابط التعديل (لك بس): ' + form.getEditUrl());
  Logger.log('📊 جدول الردود (لك بس): ' + ss.getUrl());
}
