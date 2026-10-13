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
import { ListPage } from "./pages/ListPage";
import { PaySheet, PickUnitSheet } from "./pages/PaySheet";
import "./app.css";
import symbolUrl from "../brand/symbol.svg";

const PAGES = ["home", "tenants", "budget", "bank", "wallet", "travel", "house", "vendors"] as const;
type Page = (typeof PAGES)[number];
const TITLES: Record<Page, string> = {
  home: "الرئيسية", tenants: "المستأجرين", budget: "الميزانية", bank: "بنك العائلة",
  wallet: "المحفظة", travel: "السفر", house: "المنزل", vendors: "الموردين",
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
    page === "home" || page === "tenants" ? () => setPicking(true)
    : page === "budget" ? () => setExpense(true)
    : undefined;

  const closeUnit = useCallback(() => setUnit(null), []);
  const closePick = useCallback(() => setPicking(false), []);
  const closeExpense = useCallback(() => setExpense(false), []);

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
      {page === "wallet" && <ListPage items={data.wallet} total="مجموع الحسابات" />}
      {page === "travel" && <ListPage items={data.travel} total="ميزانية السفرات" />}
      {page === "house" && <ListPage items={data.house} />}
      {page === "vendors" && <ListPage items={data.vendors} />}

      <PaySheet unit={unit} onClose={closeUnit} />
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
