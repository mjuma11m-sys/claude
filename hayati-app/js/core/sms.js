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
    ['قهوة', /starbucks|costa|caribou|tim hortons|dunkin|coffee|cafe|café|كافيه|قهوة|كوفي|كوستا|ستاربكس|كاريبو|% arabica|arabica/i],
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


  /**
   * سطر قصير يكتبه المستخدم من التنبيه (DW-038): «1.200 قهوة» · «قهوة 1.2» · «٣٫٥ كوستا» · «+50 راتب» (+ = دخل)
   * يرجّع { kind, amount, merchant, category } أو null لو ما فيه مبلغ واضح
   */
  function quick(raw) {
    const text = normalizeDigits(raw || '').replace(/\u200f|\u200e/g, '').replace(/\s+/g, ' ').trim();
    const m = /(^|\s)([+-]?)(\d+(?:[.,]\d+)?)(?:\s*(?:د\.?\s?ب|bd|bhd|دينار))?(?=\s|$)/i.exec(text);
    if (!m) return null;
    const amount = Math.round(parseFloat(m[3].replace(',', '.')) * 1000) / 1000;
    if (!(amount > 0) || amount > 100000) return null;
    const kind = m[2] === '+' ? 'income' : 'expense';
    const merchant = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim().slice(0, 60);
    return { kind, amount, merchant, category: categorize(kind, merchant, merchant) };
  }

  // ================= توحيد أسماء المحلات =================
  // «COSTA SEEF» = «Costa Coffee» = «كوستا» → مفتاح واحد «costa» واسم واحد «Costa»
  const BRANDS = [
    ['costa', 'Costa', /costa|كوستا/], ['starbucks', 'Starbucks', /starbucks|ستاربكس|ستار بكس/],
    ['tim hortons', 'Tim Hortons', /tim\s*hortons?|تيم\s*هورتنز/], ['dunkin', 'Dunkin', /dunkin|دانكن/],
    ['mcdonalds', "McDonald's", /mc\s*donald|ماكدونالدز|ماكدونالد/], ['kfc', 'KFC', /\bkfc\b|كنتاكي/],
    ['burger king', 'Burger King', /burger\s*king|برجر\s*كنج/], ['nandos', "Nando's", /nando|ناندوز/],
    ['shake shack', 'Shake Shack', /shake\s*shack|شيك\s*شاك/], ['five guys', 'Five Guys', /five\s*guys|فايف\s*قايز/],
    ['talabat', 'Talabat', /talabat|طلبات/], ['jahez', 'Jahez', /jahez|جاهز/], ['keeta', 'Keeta', /keeta|كيتا/],
    ['careem', 'Careem', /careem|كريم/], ['uber', 'Uber', /\buber\b|اوبر|أوبر/],
    ['lulu', 'LuLu', /\blulu\b|لولو/], ['carrefour', 'Carrefour', /carrefour|كارفور/],
    ['alosra', 'Al Osra', /al\s*osra|alosra|الاسره|الأسرة|الاسرة/], ['jawad', 'Jawad', /jawad|جواد/],
    ['al jazira', 'Al Jazira', /al\s*jazira|الجزيره|الجزيرة/], ['midway', 'Midway', /midway|ميدواي/],
    ['bapco', 'Bapco', /bapco|بابكو/], ['batelco', 'Batelco', /batelco|بتلكو/], ['zain', 'Zain', /\bzain\b|زين/],
    ['stc', 'stc', /\bstc\b|viva|فيفا/], ['ewa', 'EWA', /\bewa\b|الكهرباء والماء/],
    ['apple', 'Apple', /apple\.com|itunes|\bapple\b|ابل/], ['netflix', 'Netflix', /netflix|نتفلكس|نتفليكس/],
    ['spotify', 'Spotify', /spotify|سبوتيفاي/], ['amazon', 'Amazon', /amazon|امازون|أمازون/],
    ['noon', 'noon', /noon\.com|^noon$|^نون$/], ['ikea', 'IKEA', /ikea|ايكيا|إيكيا/], ['shein', 'SHEIN', /shein|شي ان/],
  ];
  // الكلمات العربية لازم تكون كلمة كاملة: «آيس كريم» مو Careem، و«مطعم الزينة» مو Zain
  for (const b of BRANDS) b[2] = new RegExp(b[2].source.replace(/[\u0600-\u06FF][\u0600-\u06FF ]*[\u0600-\u06FF]/g, (w) => '(?<![\\p{L}])' + w + '(?![\\p{L}])'), 'u');
  BRANDS.find((b) => b[0] === 'careem')[2] = /careem|(?<!(?:آيس|ايس) )(?<![\p{L}])كريم(?![\p{L}])/u;
  // كلمات الفرع والمكان والشركة — تنشال قبل المقارنة
  const NOISE = /\b(seef|juffair|manama|muharraq|riffa|isa town|hamad town|amwaj|saar|budaiya|sitra|adliya|janabiya|city cent(?:er|re)|mall|bahrain|bh|bhr|wll|w\.l\.l|spc|co|llc|ltd|branch|store|online|pos|\d+)\b|سيف|جفير|المنامه|المنامة|المحرق|الرفاع|مدينة عيسى|مدينة حمد|مجمع|فرع|البحرين/gi;
  function brand(name) {
    const raw = String(name || '').trim();
    if (!raw) return { key: '', label: '' };
    const low = raw.toLowerCase();
    for (const [key, label, re] of BRANDS) if (re.test(low)) return { key, label };
    const key = low.replace(NOISE, ' ').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim() || low;
    return { key, label: raw };
  }
  // يجمع العمليات حسب المحل: «costa coffee» ينضم لـ «costa» لو واحد بداية الثاني
  function groupByBrand(list) {
    const groups = {};
    for (const t of list) {
      const b = brand(t.merchant);
      const k = b.key || ('cat:' + (t.category || 'أخرى'));
      const g = groups[k] || (groups[k] = { key: k, label: b.key ? b.label : (t.category || 'أخرى'), sum: 0, n: 0, names: {} });
      g.sum += Number(t.amount) || 0; g.n++;
      if (b.key) g.names[b.label] = (g.names[b.label] || 0) + 1;
    }
    const keys = Object.keys(groups).sort((a, b) => a.length - b.length);
    for (let i = 0; i < keys.length; i++) {
      const g = groups[keys[i]];
      if (!g || keys[i].startsWith('cat:')) continue;
      for (let j = i + 1; j < keys.length; j++) {
        const o = groups[keys[j]];
        if (o && keys[j].startsWith(keys[i] + ' ')) {
          g.sum += o.sum; g.n += o.n;
          for (const [nm, c] of Object.entries(o.names)) g.names[nm] = (g.names[nm] || 0) + c;
          delete groups[keys[j]];
        }
      }
    }
    // الاسم اللي ينعرض = الأكثر تكرار (إلا لو المحل معروف بالقاموس)
    return Object.values(groups).map((g) => {
      const known = BRANDS.find((b) => b[0] === g.key);
      const top = Object.entries(g.names).sort((a, b) => b[1] - a[1])[0];
      return { key: g.key, label: known ? known[1] : top ? top[0] : g.label, sum: g.sum, n: g.n };
    }).sort((a, b) => b.sum - a.sum);
  }

  // ================= إخفاء أرقام البطاقة والحساب =================
  // «XX4821» ← «••21» · «BH67BMAG00001299123456» ← «BH••56» · المبالغ (412.300) والتواريخ تظل مثل ما هي
  function mask(text) {
    if (!text) return text;
    return String(text)
      .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, (m) => m.slice(0, 2) + '••' + m.slice(-2))
      .replace(/(?:[xX*•]{2,}[\s-]?)?\d(?:[\d\s-]{2,}\d)(?![.,]\d)/g, (m) => {
        const d = m.replace(/\D/g, '');
        return d.length >= 4 ? '••' + d.slice(-2) : m;
      })
      .replace(/[xX*]{2,}(?=\s|$)/g, '••');
  }

  const api = { parse, quick, categorize, mask, brand, groupByBrand, BRANDS, CATEGORY_RULES, INCOME_CATEGORY_RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.SmsParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
