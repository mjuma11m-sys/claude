// كل المبالغ بالفلس (integer). 1 د.ب = 1000 فلس.
export type Fils = number;
export type Status = "paid" | "due" | "late";

export type Unit = {
  id: string;
  name: string;
  building: string;
  rent: Fils;
  dueDay: number; // يوم الاستحقاق بالشهر
  tenant?: { name: string; phone: string; since: string; until?: string; deposit?: Fils }; // since = YYYY-MM · until = YYYY-MM-DD نهاية العقد · deposit = مبلغ التأمين
};

export type Payment = { id: string; unitId: string; month: string; amount: Fils; method: Method; date: string };
export type Method = "BenefitPay" | "تحويل" | "نقد" | "شيك";

export type BudgetCat = { id: string; name: string; limit: Fils };
export type Expense = { id: string; catId: string; label: string; amount: Fils; date: string };

export type Member = { id: string; name: string };
export type BankTxn = { id: string; memberId: string; amount: Fils; label: string; date: string };

export type Account = { id: string; title: string; sub: string; value: Fils };
export type Task = { id: string; title: string; sub: string; done: boolean };
/** مصروف ثابت يتكرر كل شهر (DW-017) */
export type Recurring = { id: string; catId: string; label: string; amount: Fils };
/** سجل التأمين وقت الإخلاء: رجع للمستأجر أو انخصم */
export type DepositLog = { id: string; unitId: string; tenant: string; amount: Fils; returned: boolean; date: string };

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
};
