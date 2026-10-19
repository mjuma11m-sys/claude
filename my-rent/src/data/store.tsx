// مخزن البيانات: useReducer + localStorage. لما ينربط Supabase، يتبدل load/save بس والشاشات ما تتغيّر.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Bill, BudgetCat, Cheque, Data, DepositLog, Doc, Expense, Method, Payment, Recurring, Unit } from "./types";
import { demoData, emptyData } from "./demo";
import { dueRecurring, findBill, isoDay, monthKey, nextUnpaid, owedMonths, rentAt } from "./logic";
import { SyncEngine, loadSyncConfig, saveSyncConfig, type SyncAction, type SyncConfig, type SyncStatus } from "./sync";

const KEY = "idarati:v2";

export { reducer, type Action } from "./reducer";
import { FORMER, reducer, type Action } from "./reducer";

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
  /** DW-022: دفعة مقدمة n شهر بمبلغ الإيجار كامل؛ يرجّع دالة التراجع */
  payAhead: (unitId: string, n: number, method: Method) => { months: string[]; undo: () => void } | null;
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
  setContract: (template: string, owner: string) => void;
  saveDoc: (doc: Omit<Doc, "id"> & { id?: string }) => Doc;
  removeDoc: (id: string) => Doc | null;
  saveBill: (b: Omit<Bill, "id"> & { id?: string }) => Bill;
  removeBill: (id: string) => void;
  addCheques: (unitId: string, list: Omit<Cheque, "id" | "unitId" | "state">[]) => Cheque[];
  setCheque: (c: Cheque) => void;
  removeCheque: (id: string) => void;
  /** يودع الشيك: دفعة «شيك» عن أول شهر ما اندفع؛ يرجّع دالة التراجع */
  depositCheque: (id: string) => (() => void) | null;
  /** الشيك رجع: لو كان مودع تنمسح دفعته */
  returnCheque: (id: string) => (() => void) | null;
  importPlan: (p: { units: Unit[]; payments: Payment[]; expenses: Expense[]; cats: BudgetCat[] }) => () => void; // يرجّع دالة التراجع
  deleteUnit: (id: string) => boolean;
  replace: (data: Data) => void;
  resetDemo: () => void;
  eraseAll: () => void;
  sync: SyncState | null;          // null = المزامنة مطفية (البيانات بالجهاز بس)
  connectSync: (cfg: SyncConfig, mode: "create" | "fresh" | "join") => Promise<void>;
  disconnectSync: () => void;      // يوقف المزامنة على هالجهاز بس — بيانات السيرفر تبقى
  syncNow: () => void;
  /** DW-032: يخفي أسماء المستأجرين السابقين من سجل التأمين؛ يرجّع العدد ودالة التراجع */
  anonymizeFormer: () => { count: number; undo: () => void };
  /** DW-030: صلاحية هالحساب من السيرفر (المالك يقدر يغيّرها) */
  setAccess: (canEdit: boolean) => void;
};

export type SyncState = { status: SyncStatus; queued: number; familyId: string; familyName: string; role: "owner" | "member"; canEdit: boolean; error: string };
/** DW-030: الحدث اللي يطلع لما المشاهد يحاول يعدّل (App يعرض تنبيه) */
export const READONLY_EVENT = "idarati:readonly";

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load);
  const [loading, setLoading] = useState(true);
  const engine = useRef<SyncEngine | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);

  // كل تعديل يمر من هني: محلي، أو عن طريق محرّك المزامنة لو مفعّلة
  const early = useRef<Action[] | null>(loadSyncConfig()?.familyId ? [] : null); // تعديلات قبل ما يجهز المحرّك
  const readOnly = useRef(loadSyncConfig()?.canEdit === false); // DW-030: المشاهد — السيرفر يرفض بعد (RLS)
  const dispatch = useCallback((a: Action) => {
    if (readOnly.current) { window.dispatchEvent(new CustomEvent(READONLY_EVENT)); return; }
    if (engine.current) engine.current.local(a as SyncAction);
    else { early.current?.push(a); setData((s) => reducer(s, a)); }
  }, []);

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

  // DW-018: تشغيل محرّك المزامنة للعائلة المحفوظة بالإعدادات
  const startEngine = useCallback(async (cfg: SyncConfig, seed?: Data) => {
    const { getClient, supabaseRemote } = await import("./supabase");
    const sb = await getClient(cfg.url, cfg.key);
    engine.current?.stop();
    const meta = { familyId: cfg.familyId!, familyName: cfg.familyName ?? "", role: cfg.role ?? "member", canEdit: cfg.canEdit !== false };
    readOnly.current = !meta.canEdit;
    const e = new SyncEngine(supabaseRemote(sb), cfg.familyId!, reducer as (s: Data, a: SyncAction) => Data, emptyData(), (view, status) => {
      setData(view);
      setSync({ ...meta, status, queued: e.queued, error: e.lastError });
    });
    engine.current = e;
    if (seed) e.local({ type: "replace", data: seed }); // أول جهاز: بياناته الحالية تصير بداية سجل العائلة
    for (const a of early.current ?? []) e.local(a as SyncAction); // اللي انسجل وهو يتحمّل ما يضيع
    early.current = null;
    setData(e.view);
    setSync({ ...meta, status: e.status, queued: e.queued, error: "" });
    await e.start();
  }, []);

  useEffect(() => {
    const cfg = loadSyncConfig();
    if (cfg?.familyId) void startEngine(cfg).catch(() => setSync((s) => s && { ...s, status: "offline" }));
    const again = () => void engine.current?.sync();
    window.addEventListener("online", again);
    window.addEventListener("focus", again);
    const t = window.setInterval(again, 30_000);
    return () => { window.removeEventListener("online", again); window.removeEventListener("focus", again); window.clearInterval(t); engine.current?.stop(); };
  }, [startEngine]);

  const connectSync = useCallback(async (cfg: SyncConfig, mode: "create" | "fresh" | "join") => {
    saveSyncConfig(cfg);
    await startEngine(cfg, mode === "create" ? data : mode === "fresh" ? emptyData() : undefined);
  }, [data, startEngine]);

  const disconnectSync = useCallback(() => {
    engine.current?.stop();
    engine.current?.clearCache();
    engine.current = null;
    early.current = null;
    readOnly.current = false;
    saveSyncConfig(null);
    setSync(null);
  }, []);

  const store: Store = {
    data,
    loading,
    pay: (unitId, month, amount, method) => {
      const payment = { id: uid(), unitId, month, amount, method, date: isoDay(new Date()) };
      dispatch({ type: "pay", payment });
      return payment;
    },
    unpay: (id) => dispatch({ type: "unpay", id }),
    payAhead: (unitId, n, method) => {
      const unit = data.units.find((u) => u.id === unitId);
      if (!unit?.tenant || n < 1) return null;
      const date = isoDay(new Date());
      const ps = nextUnpaid(data, unit, n).map((month) => ({ id: uid(), unitId, month, amount: rentAt(unit, month) - data.payments.filter((p) => p.unitId === unitId && p.month === month).reduce((s, p) => s + p.amount, 0), method, date }));
      ps.forEach((payment) => dispatch({ type: "pay", payment }));
      return { months: ps.map((p) => p.month), undo: () => ps.forEach((p) => dispatch({ type: "unpay", id: p.id })) };
    },
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
    saveBill: (b) => {
      const existing = b.id ? undefined : findBill(data, b.unitId, b.month, b.kind);
      const bill = { ...b, id: b.id ?? existing?.id ?? "b" + uid() } as Bill;
      dispatch({ type: "bill", bill });
      return bill;
    },
    removeBill: (id) => dispatch({ type: "unbill", id }),
    addCheques: (unitId, list) => {
      const cs = list.map((c) => ({ ...c, id: "q" + uid(), unitId, state: "held" as const }));
      cs.forEach((cheque) => dispatch({ type: "cheque", cheque }));
      return cs;
    },
    setCheque: (cheque) => dispatch({ type: "cheque", cheque }),
    removeCheque: (id) => dispatch({ type: "uncheque", id }),
    depositCheque: (id) => {
      const c = (data.cheques ?? []).find((x) => x.id === id);
      const unit = c && data.units.find((u) => u.id === c.unitId);
      if (!c || !unit || c.state === "deposited") return null;
      const month = nextUnpaid(data, unit, 1)[0] ?? monthKey(new Date());
      const payment = { id: uid(), unitId: unit.id, month, amount: c.amount, method: "شيك", date: isoDay(new Date()) } as Payment;
      dispatch({ type: "pay", payment });
      dispatch({ type: "cheque", cheque: { ...c, state: "deposited", paymentId: payment.id } });
      return () => { dispatch({ type: "unpay", id: payment.id }); dispatch({ type: "cheque", cheque: c }); };
    },
    returnCheque: (id) => {
      const c = (data.cheques ?? []).find((x) => x.id === id);
      if (!c || c.state === "returned") return null;
      const pay = c.paymentId ? data.payments.find((p) => p.id === c.paymentId) : undefined;
      if (pay) dispatch({ type: "unpay", id: pay.id });
      dispatch({ type: "cheque", cheque: { ...c, state: "returned", paymentId: undefined } });
      return () => { if (pay) dispatch({ type: "pay", payment: pay }); dispatch({ type: "cheque", cheque: c }); };
    },
    saveDoc: (d) => {
      const doc = { ...d, id: d.id ?? "d" + uid() } as Doc;
      dispatch({ type: "doc", doc });
      return doc;
    },
    removeDoc: (id) => {
      const doc = (data.docs ?? []).find((d) => d.id === id) ?? null;
      if (doc) dispatch({ type: "undoc", id });
      return doc;
    },
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
    setContract: (template, owner) => dispatch({ type: "contract", template, owner }),
    importPlan: (p) => {
      const restore = data.units.filter((u) => p.units.some((x) => x.id === u.id));
      dispatch({ type: "import", units: p.units, payments: p.payments, expenses: p.expenses, cats: p.cats });
      return () => dispatch({ type: "unimport", restore, unitIds: p.units.filter((u) => !restore.some((r) => r.id === u.id)).map((u) => u.id), paymentIds: p.payments.map((x) => x.id), expenseIds: p.expenses.map((x) => x.id), catIds: p.cats.map((c) => c.id) });
    },
    deleteUnit: (id) => {
      if (data.payments.some((p) => p.unitId === id)) return false;
      dispatch({ type: "delunit", id });
      return true;
    },
    replace: (d) => dispatch({ type: "replace", data: d }),
    resetDemo: () => dispatch({ type: "replace", data: demoData() }),
    // يمسح هالجهاز بس: لو المزامنة شغالة تتوقف عليه، وبيانات العائلة بالسيرفر ما تنمس
    eraseAll: () => {
      disconnectSync();
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      setData(emptyData());
    },
    sync,
    connectSync,
    disconnectSync,
    syncNow: () => void engine.current?.sync(),
    anonymizeFormer: () => {
      const logs = (data.deposits ?? []).filter((d) => d.tenant !== FORMER);
      if (logs.length) dispatch({ type: "anonymize", depositIds: logs.map((d) => d.id) });
      return { count: logs.length, undo: () => dispatch({ type: "restoreDeposits", logs }) };
    },
    setAccess: (canEdit) => {
      readOnly.current = !canEdit;
      const cfg = loadSyncConfig();
      if (cfg && cfg.canEdit !== canEdit) saveSyncConfig({ ...cfg, canEdit });
      setSync((s) => s && { ...s, canEdit });
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

