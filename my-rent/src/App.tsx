import { useCallback, useEffect, useState } from "react";
import { AppShell, type NavItem } from "./theme/AppShell";
import { StoreProvider, useStore } from "./data/store";
import { collection } from "./data/logic";
import type { Unit } from "./data/types";
import { ToastProvider } from "./ui/kit";
import { Icon } from "./ui/icons";
import { Home } from "./pages/Home";
import { Tenants } from "./pages/Tenants";
import { Budget, ExpenseSheet } from "./pages/Budget";
import { Bank } from "./pages/Bank";
import { Maintenance } from "./pages/Maintenance";
import { Vendors } from "./pages/Vendors";
import { Settings } from "./pages/Settings";
import { ReceiptSheet, type ReceiptRef } from "./pages/Receipt";
import { UnitForm } from "./pages/UnitForm";
import { Reports } from "./pages/Reports";
import { PaySheet, PickUnitSheet } from "./pages/PaySheet";
import "./app.css";
import symbolUrl from "../brand/symbol.svg";

const PAGES = ["home", "tenants", "budget", "bank", "reports", "house", "vendors", "settings"] as const;
type Page = (typeof PAGES)[number];
const TITLES: Record<Page, string> = {
  home: "الرئيسية", tenants: "المستأجرين", budget: "الميزانية", bank: "بنك العائلة",
  reports: "التقارير", house: "الصيانة", vendors: "الموردين", settings: "الإعدادات",
};

const fromHash = (): Page => {
  const h = location.hash.slice(1) as Page;
  return PAGES.includes(h) ? h : "home";
};

function Idarati() {
  const { data } = useStore();
  const [page, setPage] = useState<Page>(fromHash);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [picking, setPicking] = useState(false);
  const [expense, setExpense] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptRef>(null);
  const [editing, setEditing] = useState<{ unit: Unit | null } | null>(null);

  useEffect(() => {
    const onHash = () => setPage(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((id: string) => {
    if (location.hash.slice(1) !== id) location.hash = id;
    setPage(id as Page);
    window.scrollTo({ top: 0 });
  }, []);

  const c = collection(data);
  const items: NavItem[] = PAGES.map((id) => ({
    id, label: TITLES[id], icon: Icon[id],
    badge: id === "tenants" ? c.late.length || undefined : undefined,
  }));

  const onAdd =
    page === "home" ? () => setPicking(true)
    : page === "tenants" ? () => setEditing({ unit: null })
    : page === "budget" ? () => setExpense(true)
    : undefined;

  const closeUnit = useCallback(() => setUnit(null), []);
  const closePick = useCallback(() => setPicking(false), []);
  const closeExpense = useCallback(() => setExpense(false), []);
  const closeReceipt = useCallback(() => setReceipt(null), []);
  const closeEditing = useCallback(() => setEditing(null), []);

  return (
    <AppShell
      items={items}
      active={page}
      onNavigate={go}
      title={page === "home" ? <span className="brand-title"><img src={symbolUrl} alt="" width={28} height={28} />إداراتي</span> : TITLES[page]}
      onAdd={onAdd}
    >
      {page === "home" && <Home onOpenUnit={setUnit} go={go} />}
      {page === "tenants" && <Tenants onOpenUnit={setUnit} />}
      {page === "budget" && <Budget />}
      {page === "bank" && <Bank />}
      {page === "reports" && <Reports />}
      {page === "house" && <Maintenance />}
      {page === "vendors" && <Vendors />}
      {page === "settings" && <Settings />}

      <PaySheet unit={unit} onClose={closeUnit} onReceipt={(payment, u) => { setUnit(null); setReceipt({ payment, unit: u }); }} onEdit={(u) => { setUnit(null); setEditing({ unit: u }); }} />
      <UnitForm open={!!editing} unit={editing?.unit ?? null} onClose={closeEditing} />
      <ReceiptSheet value={receipt} onClose={closeReceipt} />
      <PickUnitSheet open={picking} onClose={closePick} onPick={(u) => { setPicking(false); setUnit(u); }} />
      <ExpenseSheet open={expense} onClose={closeExpense} />
    </AppShell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Idarati />
      </ToastProvider>
    </StoreProvider>
  );
}
