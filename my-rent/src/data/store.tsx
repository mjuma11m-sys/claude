// مخزن البيانات: useReducer + localStorage. لما ينربط Supabase، يتبدل load/save بس والشاشات ما تتغيّر.
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { Data, Expense, Method, Payment } from "./types";
import { demoData, emptyData } from "./demo";
import { isoDay } from "./logic";

const KEY = "idarati:v2";

type Action =
  | { type: "pay"; payment: Payment }
  | { type: "unpay"; id: string }
  | { type: "expense"; expense: Expense }
  | { type: "unexpense"; id: string }
  | { type: "task"; id: string }
  | { type: "replace"; data: Data };

function reducer(state: Data, a: Action): Data {
  switch (a.type) {
    case "pay": return { ...state, payments: [...state.payments, a.payment] };
    case "unpay": return { ...state, payments: state.payments.filter((p) => p.id !== a.id) };
    case "expense": return { ...state, expenses: [a.expense, ...state.expenses] };
    case "unexpense": return { ...state, expenses: state.expenses.filter((e) => e.id !== a.id) };
    case "task": return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t)) };
    case "replace": return a.data;
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

const uid = () => Math.random().toString(36).slice(2, 10);

type Store = {
  data: Data;
  loading: boolean;
  pay: (unitId: string, month: string, amount: number, method: Method) => Payment;
  unpay: (id: string) => void;
  addExpense: (catId: string, label: string, amount: number) => Expense;
  unexpense: (id: string) => void;
  toggleTask: (id: string) => void;
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

  const store: Store = {
    data,
    loading,
    pay: (unitId, month, amount, method) => {
      const payment = { id: uid(), unitId, month, amount, method, date: isoDay(new Date()) };
      dispatch({ type: "pay", payment });
      return payment;
    },
    unpay: (id) => dispatch({ type: "unpay", id }),
    addExpense: (catId, label, amount) => {
      const expense = { id: uid(), catId, label, amount, date: isoDay(new Date()) };
      dispatch({ type: "expense", expense });
      return expense;
    },
    unexpense: (id) => dispatch({ type: "unexpense", id }),
    toggleTask: (id) => dispatch({ type: "task", id }),
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

