// المحوّل الصافي (DW-032): كل تعديل على البيانات حدث، والـ reducer يطبّقه. بدون React ولا تخزين — يتزامن ويُختبر لحاله.
import type { Bill, BudgetCat, Cheque, Data, DepositLog, Doc, Expense, Payment, Recurring, Unit, VatCfg } from "./types";
import type { Contract, CreditNote } from "./types";

export const FORMER = "مستأجر سابق";

export type Action =
  | { type: "pay"; payment: Payment }
  | { type: "unpay"; id: string; at?: string } // at = تاريخ الإشعار الدائن لو الدفعة عليها فاتورة
  | { type: "expense"; expense: Expense }
  | { type: "unexpense"; id: string }
  | { type: "task"; id: string }
  | { type: "unit"; unit: Unit }
  | { type: "vacate"; id: string }
  | { type: "delunit"; id: string }
  | { type: "replace"; data: Data }
  | { type: "recurring"; item: Recurring }
  | { type: "unrecurring"; id: string }
  | { type: "expenses"; items: Expense[] }
  | { type: "unexpenses"; ids: string[] }
  | { type: "deposit"; log: DepositLog }
  | { type: "undeposit"; id: string }
  | { type: "contract"; template: string; owner: string }
  | { type: "contractrec"; contract: Contract } // DW-047: اعتماد/إنهاء عقد (نفس id = تعديل)
  | { type: "uncontractrec"; id: string }
  | { type: "doc"; doc: Doc }
  | { type: "undoc"; id: string }
  | { type: "bill"; bill: Bill }
  | { type: "unbill"; id: string }
  | { type: "cheque"; cheque: Cheque }
  | { type: "uncheque"; id: string }
  | { type: "anonymize"; depositIds: string[] }          // DW-032: حق المحو — اسم المستأجر السابق يصير «مستأجر سابق»
  | { type: "restoreDeposits"; logs: DepositLog[] }
  | { type: "vat"; vat?: VatCfg }                        // DW-035: تفعيل/إيقاف الفاتورة الضريبية
  | { type: "invoice"; paymentId: string; no: number }    // رقم الفاتورة ينحفظ على الدفعة مرة وحدة
  | { type: "credit"; paymentId: string; amount: number; at?: string } // DW-037: إشعار دائن جزئي (إرجاع جزء للمستأجر)
  | { type: "import"; units: Unit[]; payments: Payment[]; expenses: Expense[]; cats: BudgetCat[] }
  | { type: "unimport"; restore: Unit[]; unitIds: string[]; paymentIds: string[]; expenseIds: string[]; catIds: string[]; at?: string };

/** DW-036: أرقام الفواتير المستخدمة (الحالية + اللي صار لها إشعار دائن) — ما تنعاد أبداً */
export const usedInvoiceNos = (d: Data) => new Set([...d.payments.map((p) => p.inv ?? 0), ...(d.credits ?? []).map((c) => c.payment.inv ?? 0)].filter(Boolean));
const nextFree = (d: Data) => Math.max(0, ...usedInvoiceNos(d)) + 1;

/** حذف دفعات: اللي عليها فاتورة ضريبية تطلع لها إشعار دائن بدل ما تختفي */
const snapshot = (state: Data, p: Payment) => { const u = state.units.find((x) => x.id === p.unitId);
  return { unit: u ? `${u.name} · ${u.building}` : "—", tenant: u?.tenant?.name ?? "—", ...(u?.tenant?.trn ? { trn: u.tenant.trn } : {}) }; };
const nextCredit = (state: Data) => Math.max(0, ...(state.credits ?? []).map((c) => c.no)) + 1;
/** DW-037: الباقي من الدفعة بعد الإشعارات الجزئية (الدفعة نفسها ما تنقص — الشهر يبقى مسدد) */
export const creditable = (state: Data, p: Payment) => p.amount - (state.credits ?? []).filter((c) => c.payment.id === p.id && c.amount).reduce((s, c) => s + (c.amount ?? 0), 0);

function dropPayments(state: Data, ids: string[], at?: string): Data {
  const gone = state.payments.filter((p) => ids.includes(p.id));
  if (!gone.length) return state;
  let credits = state.credits ?? [];
  for (const p of gone.filter((x) => x.inv)) {
    const no = Math.max(0, ...credits.map((c) => c.no)) + 1;
    const left = creditable(state, p);
    const cn: CreditNote = { id: "cn-" + p.id, no, date: at ?? p.date, payment: p, ...(left !== p.amount ? { amount: left } : {}), ...snapshot(state, p) };
    credits = [...credits, cn];
  }
  return { ...state, payments: state.payments.filter((p) => !ids.includes(p.id)), ...(credits.length ? { credits } : {}) };
}

export function reducer(state: Data, a: Action): Data {
  switch (a.type) {
    case "pay": return { ...state, payments: [...state.payments, a.payment] };
    case "unpay": return dropPayments(state, [a.id], a.at);
    case "expense": return { ...state, expenses: [a.expense, ...state.expenses] };
    case "unexpense": return { ...state, expenses: state.expenses.filter((e) => e.id !== a.id) };
    case "task": return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t)) };
    case "unit": {
      const exists = state.units.some((u) => u.id === a.unit.id);
      return { ...state, units: exists ? state.units.map((u) => (u.id === a.unit.id ? a.unit : u)) : [...state.units, a.unit] };
    }
    case "vacate": return { ...state, units: state.units.map((u) => (u.id === a.id ? { ...u, tenant: undefined } : u)) };
    case "delunit": // بس الوحدة اللي ما عليها دفعات — السجل المالي ما ينحذف
      return state.payments.some((p) => p.unitId === a.id) ? state : { ...state, units: state.units.filter((u) => u.id !== a.id) };
    case "replace": return a.data;
    case "recurring": return { ...state, recurring: [...(state.recurring ?? []), a.item] };
    case "unrecurring": return { ...state, recurring: (state.recurring ?? []).filter((r) => r.id !== a.id) };
    case "expenses": return { ...state, expenses: [...a.items, ...state.expenses] };
    case "unexpenses": return { ...state, expenses: state.expenses.filter((e) => !a.ids.includes(e.id)) };
    case "deposit": return { ...state, deposits: [a.log, ...(state.deposits ?? [])] };
    case "undeposit": return { ...state, deposits: (state.deposits ?? []).filter((d) => d.id !== a.id) };
    // DW-021: استيراد Excel كتعديل واحد (يتزامن مرة وحدة، والتراجع يرجّعه كله)
    case "import": return { ...state,
      units: [...state.units.map((u) => a.units.find((x) => x.id === u.id) ?? u), ...a.units.filter((u) => !state.units.some((x) => x.id === u.id))],
      payments: [...state.payments, ...a.payments],
      expenses: [...a.expenses, ...state.expenses],
      cats: [...state.cats, ...a.cats.filter((c) => !state.cats.some((x) => x.id === c.id))],
    };
    case "unimport": return { ...dropPayments(state, a.paymentIds, a.at),
      units: state.units.filter((u) => !a.unitIds.includes(u.id)).map((u) => a.restore.find((r) => r.id === u.id) ?? u),
      expenses: state.expenses.filter((e) => !a.expenseIds.includes(e.id)),
      cats: state.cats.filter((c) => !a.catIds.includes(c.id)),
    };
    case "contract": return { ...state, contractTemplate: a.template, contractOwner: a.owner };
    case "contractrec": {
      const list = state.contracts ?? [];
      return { ...state, contracts: list.some((c) => c.id === a.contract.id) ? list.map((c) => (c.id === a.contract.id ? a.contract : c)) : [a.contract, ...list] };
    }
    case "uncontractrec": return { ...state, contracts: (state.contracts ?? []).filter((c) => c.id !== a.id) };
    case "doc": { // DW-023: إضافة أو تعديل
      const docs = state.docs ?? [];
      return { ...state, docs: docs.some((d) => d.id === a.doc.id) ? docs.map((d) => (d.id === a.doc.id ? a.doc : d)) : [...docs, a.doc] };
    }
    case "undoc": return { ...state, docs: (state.docs ?? []).filter((d) => d.id !== a.id) };
    case "bill": { // DW-026: إضافة أو تعديل (نفس id)
      const bills = state.bills ?? [];
      return { ...state, bills: bills.some((b) => b.id === a.bill.id) ? bills.map((b) => (b.id === a.bill.id ? a.bill : b)) : [...bills, a.bill] };
    }
    case "unbill": return { ...state, bills: (state.bills ?? []).filter((b) => b.id !== a.id) };
    case "cheque": { // DW-029
      const cs = state.cheques ?? [];
      return { ...state, cheques: cs.some((c) => c.id === a.cheque.id) ? cs.map((c) => (c.id === a.cheque.id ? a.cheque : c)) : [...cs, a.cheque] };
    }
    case "uncheque": return { ...state, cheques: (state.cheques ?? []).filter((c) => c.id !== a.id) };
    case "anonymize": return { ...state, deposits: (state.deposits ?? []).map((d) => (a.depositIds.includes(d.id) ? { ...d, tenant: FORMER } : d)) };
    case "vat": return { ...state, vat: a.vat };
    case "invoice": { // DW-036: لو الرقم انأخذ (جهاز ثاني بنفس الوقت) ياخذ أول رقم فاضي — كل الأجهزة توصل لنفس النتيجة
      const no = usedInvoiceNos(state).has(a.no) ? nextFree(state) : a.no;
      return { ...state, payments: state.payments.map((p) => (p.id === a.paymentId && !p.inv ? { ...p, inv: no, invAmount: p.amount } : p)) };
    }
    case "credit": {
      const p = state.payments.find((x) => x.id === a.paymentId);
      const amount = Math.round(a.amount);
      if (!p?.inv || amount <= 0) return state;
      if (amount >= creditable(state, p)) return dropPayments(state, [p.id], a.at); // كل الباقي = إشعار بالباقي والدفعة تنشال
      const cn: CreditNote = { id: `cn-${p.id}-${nextCredit(state)}`, no: nextCredit(state), date: a.at ?? p.date, payment: p, amount, ...snapshot(state, p) };
      return { ...state, credits: [...(state.credits ?? []), cn] };
    }
    case "restoreDeposits": return { ...state, deposits: (state.deposits ?? []).map((d) => a.logs.find((l) => l.id === d.id) ?? d) };
    default: return state; // حدث من نسخة أحدث للتطبيق: نتجاهله بدل ما ننكسر
  }
}

