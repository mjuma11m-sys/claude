// مخزن البيانات: useReducer + localStorage. لما ينربط Supabase، يتبدل load/save بس والشاشات ما تتغيّر.
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { Data, Expense, Method, Payment } from "./types";
import { demoData } from "./demo";
import { isoDay, monthKey } from "./logic";

const KEY = "idarati:v1";

type Action =
  | { type: "pay"; payment: Payment }
  | { type: "unpay"; id: string }
  | { type: "expense"; expense: Expense }
  | { type: "unexpense"; id: string }
  | { type: "reset" };

function reducer(state: Data, a: Action): Data {
  switch (a.type) {
    case "pay": return { ...state, payments: [...state.payments, a.payment] };
    case "unpay": return { ...state, payments: state.payments.filter((p) => p.id !== a.id) };
    case "expense": return { ...state, expenses: [a.expense, ...state.expenses] };
    case "unexpense": return { ...state, expenses: state.expenses.filter((e) => e.id !== a.id) };
    case "reset": return demoData();
  }
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch { /* storage مقفل: نكمل بالتجريبي */ }
  return demoData();
}

const uid = () => Math.random().toString(36).slice(2, 10);

type Store = {
  data: Data;
  loading: boolean;
  pay: (unitId: string, amount: number, method: Method) => Payment;
  unpay: (id: string) => void;
  addExpense: (catId: string, label: string, amount: number) => Expense;
  unexpense: (id: string) => void;
  reset: () => void;
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
    pay: (unitId, amount, method) => {
      const now = new Date();
      const payment = { id: uid(), unitId, month: monthKey(now), amount, method, date: isoDay(now) };
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
    reset: () => dispatch({ type: "reset" }),
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
