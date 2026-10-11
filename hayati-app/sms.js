// قارئ رسائل البنوك و BenefitPay — يطلّع المبلغ ونوع العملية واسم المحل والتصنيف
(function (global) {
  'use strict';

  const CURRENCIES = {
    BHD: 'BHD', BD: 'BHD', 'د.ب': 'BHD', 'دب': 'BHD', 'دينار': 'BHD', 'دينار بحريني': 'BHD',
    USD: 'USD', '$': 'USD', SAR: 'SAR', 'ر.س': 'SAR', AED: 'AED', 'د.إ': 'AED',
    KWD: 'KWD', 'د.ك': 'KWD', QAR: 'QAR', OMR: 'OMR', EUR: 'EUR', GBP: 'GBP',
  };

  const CUR = '(BHD|BD|USD|SAR|AED|KWD|QAR|OMR|EUR|GBP|\\$|د\\.?\\s?ب|د\\.?\\s?إ|د\\.?\\s?ك|ر\\.?\\s?س|دينار(?:\\s+بحريني)?)';
  const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d+(?:\\.\\d{1,3})?)';
  const AMOUNT_RES = [
    new RegExp(CUR + '\\s*' + NUM, 'gi'),
    new RegExp(NUM + '\\s*' + CUR, 'gi'),
  ];

  const BALANCE_HINT = /(balance|bal\.?|avl|available|limit|الرصيد|رصيد|المتاح|الحد)[^\d]{0,25}$/i;

  const EXPENSE_WORDS = [
    'debited', 'debit', 'purchase', 'purchased', 'spent', 'used', 'paid', 'payment', 'withdrawn',
    'withdrawal', 'sent', 'transferred to', 'deducted', 'pos', 'charged',
    'خصم', 'شراء', 'سحب', 'دفع', 'مدفوعات', 'صادرة', 'تحويل إلى', 'تحويل الى', 'أرسلت', 'ارسلت',
    'استخدام بطاقة', 'استخدام البطاقة', 'عملية شراء', 'تم الدفع',
  ];
  const INCOME_WORDS = [
    'credited', 'received', 'deposit', 'deposited', 'refund', 'refunded', 'salary', 'reversal', 'reversed',
    'إيداع', 'ايداع', 'استلام', 'استلمت', 'إضافة', 'اضافة', 'أضيف', 'اضيف', 'راتب', 'واردة',
    'تحويل من', 'مسترد', 'استرجاع', 'استرداد',
  ];
  const IGNORE_WORDS = /\b(otp|one[\s-]?time|verification code|password)\b|رمز التحقق|كلمة المرور|رمز الدخول|الرمز السري/i;

  // التصنيف التلقائي حسب اسم المحل أو نص الرسالة
  const CATEGORY_RULES = [
    ['سحب نقدي', /\batm\b|cash withdrawal|withdrawal|صراف|سحب نقدي|سحب/i],
    ['قهوة', /starbucks|costa|caribou|tim hortons|dunkin|coffee|cafe|café|كافيه|قهوة|كوفي|% arabica|arabica/i],
    ['أكل ومطاعم', /talabat|jahez|deliveroo|careem food|mcdonald|kfc|burger|pizza|hardee|shawarma|restaurant|مطعم|طلبات|جاهز|شاورما|برجر|بيتزا|subway|nando|texas/i],
    ['مواصلات وبنزين', /bapco|petrol|fuel|station|uber|careem|taxi|parking|بابكو|بنزين|محطة|وقود|تاكسي|كريم|مواقف/i],
    ['بقالة وتسوق', /lulu|carrefour|al ?osra|alosra|jawad|mega ?mart|geant|ramez|supermarket|hypermarket|market|mall|amazon|noon|shein|ikea|لولو|كارفور|الأسرة|جواد|سوبرماركت|هايبر|مول|نون|أمازون/i],
    ['فواتير واتصالات', /batelco|zain|stc|viva|ewa|electricity|water|bill|netflix|spotify|apple\.com|icloud|بتلكو|زين|فاتورة|كهرباء|ماء|اشتراك/i],
    ['جامعة ودراسة', /university|uob|polytechnic|college|bookstore|library|tuition|جامعة|بوليتكنك|كلية|مكتبة|رسوم دراسية|كتب/i],
    ['صحة', /pharmacy|clinic|hospital|medical|صيدلية|عيادة|مستشفى|طبي/i],
    ['ترفيه', /cinema|vox|cineco|game|playstation|steam|سينما|ألعاب|العاب/i],
    ['تحويلات', /benefit ?pay|benefitpay|fawri|transfer|تحويل|حوالة|بنفت/i],
  ];
  const INCOME_CATEGORY_RULES = [
    ['راتب', /salary|payroll|راتب/i],
    ['مكافأة', /allowance|stipend|reward|bonus|مكافأة|مكافاة|منحة/i],
    ['استرجاع', /refund|reversal|reversed|مسترد|استرجاع|استرداد/i],
    ['تحويل وارد', /benefit ?pay|benefitpay|fawri|transfer|تحويل|حوالة/i],
  ];

  function normalizeDigits(s) {
    return String(s)
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/٫/g, '.')
      .replace(/٬/g, ',');
  }

  function currencyCode(token) {
    const t = token.replace(/\s+/g, '').replace(/\.$/, '');
    if (CURRENCIES[t.toUpperCase()]) return CURRENCIES[t.toUpperCase()];
    if (/^د\.?ب$/.test(t) || /^دينار/.test(t)) return 'BHD';
    if (/^د\.?إ$/.test(t)) return 'AED';
    if (/^د\.?ك$/.test(t)) return 'KWD';
    if (/^ر\.?س$/.test(t)) return 'SAR';
    return 'BHD';
  }

  function findAmount(text) {
    const hits = [];
    for (const re of AMOUNT_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const curFirst = re === AMOUNT_RES[0];
        const cur = curFirst ? m[1] : m[2];
        const num = curFirst ? m[2] : m[1];
        // تجاهل أرقام الحساب/البطاقة الطويلة بدون فاصلة عشرية
        if (!num.includes('.') && num.replace(/,/g, '').length > 7) continue;
        const before = text.slice(Math.max(0, m.index - 40), m.index);
        hits.push({
          index: m.index,
          amount: parseFloat(num.replace(/,/g, '')),
          currency: currencyCode(cur),
          isBalance: BALANCE_HINT.test(before),
        });
      }
    }
    hits.sort((a, b) => a.index - b.index);
    return hits.find((h) => !h.isBalance && h.amount > 0) || null;
  }

  function countWords(lower, words) {
    let score = 0;
    let first = Infinity;
    for (const w of words) {
      const re = new RegExp('(^|[^a-z\\u0600-\\u06FF])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^a-z])', 'i');
      const m = re.exec(lower);
      if (m) {
        score++;
        first = Math.min(first, m.index);
      }
    }
    return { score, first };
  }

  function detectKind(text) {
    const lower = text.toLowerCase().replace(/credit card|بطاقة ائتمان|البطاقة الائتمانية/g, ' ');
    const exp = countWords(lower, EXPENSE_WORDS);
    const inc = countWords(lower, INCOME_WORDS);
    if (exp.score && !inc.score) return { kind: 'expense', sure: true };
    if (inc.score && !exp.score) return { kind: 'income', sure: true };
    if (exp.score && inc.score) {
      // الكلمة اللي تجي أول غالباً هي وصف العملية
      return { kind: exp.first <= inc.first ? 'expense' : 'income', sure: false };
    }
    return { kind: 'expense', sure: false };
  }

  const STOP_EN = '(?=\\s+(?:on|using|with|via|ref|reference|for|card|a/c|acct|account|dated|at|has|have|is|was|been|successfully)\\b|\\s*[,.;:\\n(]|\\s+\\d{1,2}[/-]|$)';
  const MERCHANT_RES = [
    new RegExp('\\b(?:at|@)\\s+([A-Za-z0-9][A-Za-z0-9&\'\\-\\s]{1,40}?)' + STOP_EN, 'i'),
    new RegExp('\\b(?:from|to)\\s+(?!your\\b|a/c|acc|account|card|xx)([A-Za-z][A-Za-z0-9&\'\\-\\s]{1,40}?)' + STOP_EN, 'i'),
    /(?:لدى|عند|في محل|محل|التاجر)\s*:?\s*([^،,.\n\d]{2,40}?)(?=\s+(?:بتاريخ|في\s+\d|رقم|الرصيد|باستخدام|عبر)|[،,.\n]|$)/,
    /(?:إلى|الى|من)\s+(?!حساب|بطاقة|البطاقة|رصيد)([^،,.\n\d]{2,30}?)(?=\s+(?:بتاريخ|في\s+\d|رقم|الرصيد|باستخدام|عبر)|[،,.\n]|$)/,
  ];

  function findMerchant(text) {
    for (const re of MERCHANT_RES) {
      const m = re.exec(text);
      if (m) {
        const name = m[1].replace(/\s+/g, ' ').trim();
        if (name && !/^(xx|\*|your|the)\b/i.test(name)) return name;
      }
    }
    return '';
  }

  function categorize(kind, text, merchant) {
    const hay = (merchant + ' ' + text);
    const rules = kind === 'income' ? INCOME_CATEGORY_RULES : CATEGORY_RULES;
    // اسم المحل أهم من باقي الرسالة
    for (const [cat, re] of rules) if (merchant && re.test(merchant)) return cat;
    for (const [cat, re] of rules) if (re.test(hay)) return cat;
    return kind === 'income' ? 'دخل آخر' : 'أخرى';
  }

  /**
   * يحلل نص رسالة ويرجّع عملية، أو null إذا الرسالة مو عملية مالية
   * { kind, amount, currency, merchant, category, needs_review }
   */
  function parse(raw) {
    if (!raw) return null;
    const text = normalizeDigits(raw).replace(/\u200f|\u200e/g, '');
    if (IGNORE_WORDS.test(text)) return null;
    const amt = findAmount(text);
    if (!amt) return null;
    const { kind, sure } = detectKind(text);
    const merchant = findMerchant(text);
    return {
      kind,
      amount: Math.round(amt.amount * 1000) / 1000,
      currency: amt.currency,
      merchant,
      category: categorize(kind, text, merchant),
      needs_review: !sure || amt.currency !== 'BHD',
    };
  }

  const api = { parse, categorize, CATEGORY_RULES, INCOME_CATEGORY_RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.SmsParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
