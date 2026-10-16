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
import { StatementSheet } from "./pages/Statement";
import { ContractSheet } from "./pages/Contract";
import { UnitForm } from "./pages/UnitForm";
import { Reports } from "./pages/Reports";
import { SearchSheet } from "./pages/Search";
import { Tracker } from "./pages/Tracker";
import { RenewSheet } from "./pages/Renew";
import { DocSheet, Docs } from "./pages/Docs";
import type { Doc } from "./data/types";
import { PaySheet, PickUnitSheet } from "./pages/PaySheet";
import "./app.css";
import symbolUrl from "../brand/symbol.svg";

const PAGES = ["home", "tenants", "budget", "bank", "reports", "track", "docs", "house", "vendors", "settings"] as const;
type Page = (typeof PAGES)[number];
const TITLES: Record<Page, string> = {
  home: "الرئيسية", tenants: "المستأجرين", budget: "الميزانية", bank: "بنك العائلة",
  reports: "التقارير", track: "متابعة الإيجار", docs: "الوثائق", house: "الصيانة", vendors: "الموردين", settings: "الإعدادات",
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
  const [stmt, setStmt] = useState<Unit | null>(null);
  const [contract, setContract] = useState<Unit | null>(null);
  const [renew, setRenew] = useState<Unit | null>(null);
  const [editing, setEditing] = useState<{ unit: Unit | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [docEdit, setDocEdit] = useState<{ doc: Doc | null } | null>(null);

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
    : page === "docs" ? () => setDocEdit({ doc: null })
    : undefined;

  const closeUnit = useCallback(() => setUnit(null), []);
  const closePick = useCallback(() => setPicking(false), []);
  const closeExpense = useCallback(() => setExpense(false), []);
  const closeReceipt = useCallback(() => setReceipt(null), []);
  const closeStmt = useCallback(() => setStmt(null), []);
  const closeContract = useCallback(() => setContract(null), []);
  const closeRenew = useCallback(() => setRenew(null), []);
  const closeEditing = useCallback(() => setEditing(null), []);
  const closeSearch = useCallback(() => setSearching(false), []);
  const closeDoc = useCallback(() => setDocEdit(null), []);

  return (
    <AppShell
      items={items}
      active={page}
      onNavigate={go}
      title={page === "home" ? <span className="brand-title"><img src={symbolUrl} alt="" width={28} height={28} />إداراتي</span> : TITLES[page]}
      onAdd={onAdd}
      actions={<button className="hdr-btn press" onClick={() => setSearching(true)} aria-label="بحث">{Icon.search}</button>}
    >
      {page === "home" && (
        <Home onOpenUnit={setUnit} go={go} onQuick={(a) => {
          if (a === "pay") setPicking(true);
          else if (a === "expense") setExpense(true);
          else if (a === "unit") setEditing({ unit: null });
          else setSearching(true);
        }} />
      )}
      {page === "tenants" && <Tenants onOpenUnit={setUnit} />}
      {page === "budget" && <Budget />}
      {page === "bank" && <Bank />}
      {page === "reports" && <Reports />}
      {page === "track" && <Tracker onOpenUnit={setUnit} />}
      {page === "docs" && <Docs onOpen={(doc) => setDocEdit({ doc })} />}
      {page === "house" && <Maintenance />}
      {page === "vendors" && <Vendors />}
      {page === "settings" && <Settings />}

      <PaySheet unit={unit} onClose={closeUnit} onReceipt={(payment, u) => { setUnit(null); setReceipt({ payment, unit: u }); }} onEdit={(u) => { setUnit(null); setEditing({ unit: u }); }} onStatement={(u) => { setUnit(null); setStmt(u); }} onContract={(u) => { setUnit(null); setContract(u); }} onRenew={(u) => { setUnit(null); setRenew(u); }} />
      <SearchSheet open={searching} onClose={closeSearch} onPick={(u) => { setSearching(false); setUnit(u); }} />
      <UnitForm open={!!editing} unit={editing?.unit ?? null} onClose={closeEditing} />
      <ReceiptSheet value={receipt} onClose={closeReceipt} />
      <StatementSheet unit={stmt} onClose={closeStmt} />
      <ContractSheet unit={contract} onClose={closeContract} />
      <RenewSheet unit={renew} onClose={closeRenew} />
      <PickUnitSheet open={picking} onClose={closePick} onPick={(u) => { setPicking(false); setUnit(u); }} />
      <ExpenseSheet open={expense} onClose={closeExpense} />
      <DocSheet value={docEdit} onClose={closeDoc} />
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
