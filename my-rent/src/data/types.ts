// كل المبالغ بالفلس (integer). 1 د.ب = 1000 فلس.
export type Fils = number;
export type Status = "paid" | "due" | "late";

/** نوع العقار (DW-022) */
export type Kind = "shop" | "flat" | "store" | "house" | "nursery";

export type Unit = {
  id: string;
  name: string;
  building: string;
  meters?: { elec?: string; water?: string }; // DW-023: رقم حساب/عداد الكهرباء والماء
  notes?: string; // DW-029: ملاحظة حرة («المكيف تبدّل 2026»)
  kind?: Kind; // اختياري: البيانات القديمة بدونه ← kindOf يحسبه من الاسم
  rent: Fils;              // الإيجار الحالي (وما بعده)
  rentBefore?: { until: string; rent: Fils }[]; // DW-024: إيجارات سابقة — كل شهر <= until (YYYY-MM) ياخذ أقرب واحد
  dueDay: number; // يوم الاستحقاق بالشهر
  tenant?: { name: string; phone: string; since: string; until?: string; deposit?: Fils; trn?: string }; // trn = الرقم الضريبي للمستأجر التجاري (DW-035)
  contractFile?: ContractFile; // DW-020: العقد الموقّع (الملف نفسه بالجهاز أو بالسحابة، هني بس وصفه) // since = YYYY-MM · until = YYYY-MM-DD نهاية العقد · deposit = مبلغ التأمين
};

export type Payment = { id: string; unitId: string; month: string; amount: Fils; method: Method; date: string; inv?: number; invAmount?: Fils }; // inv = رقم الفاتورة الضريبية (DW-035) · invAmount = مبلغها الأصلي (DW-037)

/** DW-035: بيانات المؤجر للفاتورة الضريبية. وجودها = الفاتورة مفعّلة */
export type VatCfg = { trn: string; name: string; address: string };
/** DW-036: إشعار دائن — دفعة عليها فاتورة ضريبية انحذفت. ينحفظ نسخة الفاتورة عشان التسلسل ما ينكسر */
export type CreditNote = { id: string; no: number; date: string; payment: Payment; unit: string; tenant: string; trn?: string; amount?: Fils }; // amount = جزئي (DW-037)، بدونه = كل الباقي
export type Method = "BenefitPay" | "تحويل" | "نقد" | "شيك";

export type BudgetCat = { id: string; name: string; limit: Fils };
export type Expense = { id: string; catId: string; label: string; amount: Fils; date: string };

export type Member = { id: string; name: string };
export type BankTxn = { id: string; memberId: string; amount: Fils; label: string; date: string };

export type Account = { id: string; title: string; sub: string; value: Fils };
export type Task = { id: string; title: string; sub: string; done: boolean };
/** ملف العقد الموقّع: الملف نفسه بـ IndexedDB (key = id) وبالسحابة لو فيه حساب (path) */
export type ContractFile = { id: string; name: string; type: string; size: number; tenant: string; uploadedAt: string; path?: string };

/** مصروف ثابت يتكرر كل شهر (DW-017) */
export type Recurring = { id: string; catId: string; label: string; amount: Fils };
/** سجل التأمين وقت الإخلاء: رجع للمستأجر أو انخصم */
export type DepositLog = { id: string; unitId: string; tenant: string; amount: Fils; returned: boolean; date: string };

/** DW-023: وثائق العقار والنشاط (مو هويات شخصية — DW-014) */
export type DocKind = "cr" | "insurance" | "license" | "civil" | "service" | "other";
export type DocFile = { id: string; name: string; type: string; size: number; uploadedAt: string; path?: string };
export type Doc = { id: string; kind: DocKind; title: string; ref?: string; unitId?: string; expires?: string; file?: DocFile }; // expires = YYYY-MM-DD

/** DW-026: فاتورة الكهرباء/الماء — المستأجر يدفعها للهيئة؛ نتابع السداد بس (مو دخل المالك) */
export type BillKind = "ewa" | "elec" | "water";
export type Bill = { id: string; unitId: string; month: string; kind: BillKind; amount: Fils; paid: boolean };

/** DW-029: شيك مؤجل — ما يصير دفعة إلا لما ينودع (paymentId) */
export type ChequeState = "held" | "deposited" | "returned";
export type Cheque = { id: string; unitId: string; number: string; bank: string; amount: Fils; due: string; state: ChequeState; paymentId?: string };

export type Vendor = { id: string; name: string; service: string; phone: string };

export type Data = {
  trackFrom: string; // "YYYY-MM": أول شهر نحسب منه المتأخرات
  units: Unit[];
  payments: Payment[];
  cats: BudgetCat[];
  expenses: Expense[];
  members: Member[];
  bank: BankTxn[];
  accounts: Account[];
  tasks: Task[];
  vendors: Vendor[];
  recurring?: Recurring[];   // اختياري: النسخ الاحتياطية القديمة ما فيها
  deposits?: DepositLog[];
  contractTemplate?: string; // DW-020: نموذج العقد بخانات {…}
  contractOwner?: string;    // اسم المؤجر اللي يطلع بالعقد
  docs?: Doc[];              // DW-023
  bills?: Bill[];            // DW-026
  cheques?: Cheque[];        // DW-029
  vat?: VatCfg;              // DW-035: للإيجار التجاري بس
  credits?: CreditNote[];    // DW-036: الإشعارات الدائنة
};
