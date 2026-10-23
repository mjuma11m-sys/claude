// المحوّل الصافي (DW-032): كل تعديل على البيانات حدث، والـ reducer يطبّقه. بدون React ولا تخزين — يتزامن ويُختبر لحاله.
import type { Bill, BudgetCat, Cheque, Data, DepositLog, Doc, Expense, Payment, Recurring, Unit, VatCfg } from "./types";

export const FORMER = "مستأجر سابق";

export type Action =
  | { type: "pay"; payment: Payment }
  | { type: "unpay"; id: string }
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
  | { type: "import"; units: Unit[]; payments: Payment[]; expenses: Expense[]; cats: BudgetCat[] }
  | { type: "unimport"; restore: Unit[]; unitIds: string[]; paymentIds: string[]; expenseIds: string[]; catIds: string[] };

export function reducer(state: Data, a: Action): Data {
  switch (a.type) {
    case "pay": return { ...state, payments: [...state.payments, a.payment] };
    case "unpay": return { ...state, payments: state.payments.filter((p) => p.id !== a.id) };
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
    case "unimport": return { ...state,
      units: state.units.filter((u) => !a.unitIds.includes(u.id)).map((u) => a.restore.find((r) => r.id === u.id) ?? u),
      payments: state.payments.filter((p) => !a.paymentIds.includes(p.id)),
      expenses: state.expenses.filter((e) => !a.expenseIds.includes(e.id)),
      cats: state.cats.filter((c) => !a.catIds.includes(c.id)),
    };
    case "contract": return { ...state, contractTemplate: a.template, contractOwner: a.owner };
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
    case "invoice": return { ...state, payments: state.payments.map((p) => (p.id === a.paymentId && !p.inv ? { ...p, inv: a.no } : p)) };
    case "restoreDeposits": return { ...state, deposits: (state.deposits ?? []).map((d) => a.logs.find((l) => l.id === d.id) ?? d) };
    default: return state; // حدث من نسخة أحدث للتطبيق: نتجاهله بدل ما ننكسر
  }
}

