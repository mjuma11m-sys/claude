// مخزن البيانات: useReducer + localStorage. لما ينربط Supabase، يتبدل load/save بس والشاشات ما تتغيّر.
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { Data, DepositLog, Expense, Method, Payment, Recurring, Unit } from "./types";
import { demoData, emptyData } from "./demo";
import { dueRecurring, isoDay, owedMonths } from "./logic";

const KEY = "idarati:v2";

type Action =
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
  | { type: "undeposit"; id: string };

function reducer(state: Data, a: Action): Data {
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
  }
}

/** يتأكد إن ملف النسخة الاحتياطية فيه كل الأقسام قبل ما نستبدل البيانات */
export function isData(x: unknown): x is Data {
  const d = x as Data;
  return !!d && typeof d.trackFrom === "string" &&
    ["units", "payments", "cats", "expenses", "members", "bank", "accounts", "tasks", "vendors"].every((k) => Array.isArray((d as Record<string, unknown>)[k]));
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (isData(d)) return d;
    }
  } catch { /* storage مقفل: نكمل بالتجريبي */ }
  return demoData();
}

const PERSIST_KEY = "idarati:persist";
function requestPersist() {
  try {
    if (localStorage.getItem(PERSIST_KEY) || !navigator.storage?.persist) return;
    localStorage.setItem(PERSIST_KEY, "asked");
    navigator.storage.persist().then((ok) => { try { localStorage.setItem(PERSIST_KEY, ok ? "granted" : "denied"); } catch { /* ignore */ } });
  } catch { /* ignore */ }
}

const uid = () => Math.random().toString(36).slice(2, 10);

type Store = {
  data: Data;
  loading: boolean;
  pay: (unitId: string, month: string, amount: number, method: Method) => Payment;
  quickPay: (unitId: string) => Payment | null;
  unpay: (id: string) => void;
  addExpense: (catId: string, label: string, amount: number) => Expense;
  unexpense: (id: string) => void;
  toggleTask: (id: string) => void;
  saveUnit: (unit: Omit<Unit, "id"> & { id?: string }) => Unit;
  vacate: (id: string, depositReturned?: boolean) => DepositLog | null;
  undeposit: (id: string) => void;
  addRecurring: (catId: string, label: string, amount: number) => Recurring;
  removeRecurring: (id: string) => void;
  logRecurring: () => Expense[];
  unexpenses: (ids: string[]) => void;
  deleteUnit: (id: string) => boolean;
  replace: (data: Data) => void;
  resetDemo: () => void;
  eraseAll: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);
  const [loading, setLoading] = useState(true);

  // تحميل أول مرة (يحاكي Supabase) عشان الـ skeleton والـ stagger يشتغلون بنفس الشكل الحقيقي
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  // DW-017: نطلب من المتصفح ما يمسح البيانات (Safari يمسح بيانات المواقع بعد 7 أيام بدون استخدام). مرة وحدة بس.
  useEffect(() => { requestPersist(); }, []);

  const store: Store = {
    data,
    loading,
    pay: (unitId, month, amount, method) => {
      const payment = { id: uid(), unitId, month, amount, method, date: isoDay(new Date()) };
      dispatch({ type: "pay", payment });
      return payment;
    },
    unpay: (id) => dispatch({ type: "unpay", id }),
    // ضغطة وحدة: أقدم شهر ما اندفع، بالمبلغ الباقي، وبآخر طريقة دفع استخدمها نفس المستأجر
    quickPay: (unitId) => {
      const unit = data.units.find((u) => u.id === unitId);
      if (!unit) return null;
      const first = owedMonths(data, unit)[0];
      if (!first) return null;
      const last = [...data.payments].filter((p) => p.unitId === unitId).sort((a, b) => b.date.localeCompare(a.date))[0];
      const payment = { id: uid(), unitId, month: first.month, amount: first.left, method: last?.method ?? "BenefitPay", date: isoDay(new Date()) } as Payment;
      dispatch({ type: "pay", payment });
      return payment;
    },
    addExpense: (catId, label, amount) => {
      const expense = { id: uid(), catId, label, amount, date: isoDay(new Date()) };
      dispatch({ type: "expense", expense });
      return expense;
    },
    unexpense: (id) => dispatch({ type: "unexpense", id }),
    toggleTask: (id) => dispatch({ type: "task", id }),
    saveUnit: (u) => {
      const unit = { ...u, id: u.id ?? "u" + uid() } as Unit;
      dispatch({ type: "unit", unit });
      return unit;
    },
    // الإخلاء: لو فيه تأمين، ينسجل رجع أو انخصم — والسجل يبقى بعد ما يروح المستأجر
    vacate: (id, depositReturned) => {
      const unit = data.units.find((u) => u.id === id);
      let log: DepositLog | null = null;
      if (unit?.tenant?.deposit) {
        log = { id: uid(), unitId: id, tenant: unit.tenant.name, amount: unit.tenant.deposit, returned: !!depositReturned, date: isoDay(new Date()) };
        dispatch({ type: "deposit", log });
      }
      dispatch({ type: "vacate", id });
      return log;
    },
    undeposit: (id) => dispatch({ type: "undeposit", id }),
    addRecurring: (catId, label, amount) => {
      const item = { id: "r" + uid(), catId, label, amount };
      dispatch({ type: "recurring", item });
      return item;
    },
    removeRecurring: (id) => dispatch({ type: "unrecurring", id }),
    // يسجّل المصاريف الثابتة اللي ما انسجلت هالشهر بس — الضغطة الثانية ما تكرر
    logRecurring: () => {
      const items = dueRecurring(data).map((r) => ({ id: uid(), catId: r.catId, label: r.label, amount: r.amount, date: isoDay(new Date()) }));
      if (items.length) dispatch({ type: "expenses", items });
      return items;
    },
    unexpenses: (ids) => dispatch({ type: "unexpenses", ids }),
    deleteUnit: (id) => {
      if (data.payments.some((p) => p.unitId === id)) return false;
      dispatch({ type: "delunit", id });
      return true;
    },
    replace: (d) => dispatch({ type: "replace", data: d }),
    resetDemo: () => dispatch({ type: "replace", data: demoData() }),
    eraseAll: () => {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      dispatch({ type: "replace", data: emptyData() });
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

