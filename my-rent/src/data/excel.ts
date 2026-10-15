// Excel (DW-021): قالب بثلاث صفحات، قراءة ملف المستخدم مع أخطاء لكل صف، وتصدير التقارير.
// المنطق هني صافي (بدون مكتبات) عشان ينختبر؛ القراءة والكتابة الفعلية بمكتبات تتحمّل وقت الحاجة.
import type { BudgetCat, Data, Expense, Kind as UnitKind, Method, Payment, Unit } from "./types";
import { LEASE_LABEL, isoDay, kindLabel, kindOf as unitKind, monthKey, monthLabel, monthName, monthlyReport, parseBHD, rentTracker } from "./logic";
import { normalize } from "./prefs";

export type Cell = string | number | boolean | Date | null | undefined;
export type Sheet = { sheet: string; data: Cell[][] };
export type ImportIssue = { sheet: string; row: number; msg: string };
export type ImportPlan = {
  units: Unit[];            // جديدة أو محدّثة (نفس id لو موجودة)
  payments: Payment[];
  expenses: Expense[];
  cats: BudgetCat[];        // فئات جديدة انذكرت بالملف
  errors: ImportIssue[];
  warnings: string[];
  counts: { units: number; updated: number; payments: number; expenses: number };
};

const METHODS: Method[] = ["BenefitPay", "تحويل", "نقد", "شيك"];

/** عناوين الأعمدة المقبولة (بعد normalize: بلا مسافات وهمزات) */
const COLS = {
  units: { name: ["الوحدة", "اسمالوحدة", "الشقة"], building: ["المبنى", "العمارة"], kind: ["النوع", "نوعالعقار", "نوعالوحدة"], rent: ["الإيجار", "الإيجارالشهري", "الإيجار(دب)"], dueDay: ["يومالاستحقاق", "يستحقيوم"], tenant: ["المستأجر", "اسمالمستأجر"], phone: ["الهاتف", "الجوال", "رقمالهاتف"], since: ["بدايةالعقد", "منشهر"], until: ["نهايةالعقد"], deposit: ["التأمين", "مبلغالتأمين"] },
  payments: { unit: ["الوحدة", "اسمالوحدة"], month: ["الشهر", "عنشهر"], amount: ["المبلغ"], method: ["الطريقة", "طريقةالدفع"], date: ["التاريخ", "تاريخالدفع"] },
  expenses: { label: ["الوصف", "البيان"], amount: ["المبلغ"], cat: ["الفئة", "التصنيف"], date: ["التاريخ"] },
} as const;
type Kind = keyof typeof COLS;
const KIND_ALTS: [UnitKind, string[]][] = [["flat", ["شقة", "شقه"]], ["shop", ["محل تجاري", "محل", "محلات", "معرض"]], ["store", ["ستور", "مخزن", "مستودع"]], ["house", ["بيت", "فيلا", "منزل"]], ["nursery", ["روضة", "روضه", "حضانة"]]];
const BLOCKED = ["cpr", "الرقمالشخصي", "الرقمالشخصيcpr", "البطاقةالذكية", "رقمالبطاقة"];

const key = (s: unknown) => normalize(String(s ?? ""));
const inAlts = (h: string, alts: readonly string[]) => alts.some((a) => normalize(a) === h);
const text = (c: Cell) => (c === null || c === undefined ? "" : c instanceof Date ? isoDay(c) : String(c).trim());

function money(c: Cell): number | null {
  if (typeof c === "number") return Number.isFinite(c) && c >= 0 ? Math.round(c * 1000) : null;
  const t = text(c);
  return t ? parseBHD(t) : null;
}
function month(c: Cell): string | null {
  if (c instanceof Date) return monthKey(c);
  const t = normalize(text(c));
  let m = t.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (m) return +m[2] >= 1 && +m[2] <= 12 ? `${m[1]}-${m[2].padStart(2, "0")}` : null;
  m = t.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return +m[1] >= 1 && +m[1] <= 12 ? `${m[2]}-${m[1].padStart(2, "0")}` : null;
  return null;
}
function day(c: Cell): string | null {
  if (c instanceof Date) return isoDay(c);
  const t = normalize(text(c));
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // يوم/شهر/سنة
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** يحدد نوع الصفحة من اسمها أو من عناوينها */
function kindOf(s: Sheet, header: string[]): Kind | null {
  const n = normalize(s.sheet);
  if (/وحد|مستاجر/.test(n)) return "units";
  if (/دفع/.test(n)) return "payments";
  if (/مصروف|مصاريف/.test(n)) return "expenses";
  const has = (alts: readonly string[]) => header.some((h) => inAlts(h, alts));
  if (has(COLS.units.rent)) return "units";
  if (has(COLS.payments.month)) return "payments";
  if (has(COLS.expenses.label)) return "expenses";
  return null;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function planImport(sheets: Sheet[], data: Data, now = new Date()): ImportPlan {
  const plan: ImportPlan = { units: [], payments: [], expenses: [], cats: [], errors: [], warnings: [], counts: { units: 0, updated: 0, payments: 0, expenses: 0 } };
  const unitsByName = new Map(data.units.map((u) => [normalize(u.name), u]));
  const catsByName = new Map(data.cats.map((c) => [normalize(c.name), c]));
  const order: Kind[] = ["units", "payments", "expenses"]; // الوحدات أول عشان الدفعات تلقاها
  const typed = sheets.map((s) => {
    const hi = s.data.findIndex((r) => r.some((c) => text(c)));
    const header = hi < 0 ? [] : s.data[hi].map((c) => key(c));
    return { s, hi, header, kind: hi < 0 ? null : kindOf(s, header) };
  });
  for (const t of typed) if (t.hi >= 0 && !t.kind) plan.warnings.push(`صفحة «${t.s.sheet}» ما انعرف نوعها، انتجاهلت`);
  if (typed.some((t) => t.header.some((h) => inAlts(h, BLOCKED)))) plan.warnings.push("عمود CPR/الرقم الشخصي انتجاهل — إداراتي ما يحفظه");

  for (const kind of order) {
    for (const { s, hi, header } of typed.filter((t) => t.kind === kind)) {
      const col = (alts: readonly string[]) => header.findIndex((h) => inAlts(h, alts));
      const cols = Object.fromEntries(Object.entries(COLS[kind]).map(([k, alts]) => [k, col(alts)])) as Record<string, number>;
      const get = (r: Cell[], k: string) => (cols[k] >= 0 ? r[cols[k]] : undefined);
      const err = (row: number, msg: string) => plan.errors.push({ sheet: s.sheet, row: row + 1, msg });

      s.data.slice(hi + 1).forEach((r, i) => {
        const row = hi + 1 + i;
        if (!r.some((c) => text(c))) return; // صف فاضي
        if (kind === "units") {
          const name = text(get(r, "name"));
          const rent = money(get(r, "rent"));
          if (!name) return err(row, "اسم الوحدة فاضي");
          if (rent === null) return err(row, "الإيجار مو رقم صحيح");
          const dueRaw = get(r, "dueDay");
          const due = dueRaw === undefined || text(dueRaw) === "" ? 1 : Number(normalize(text(dueRaw)));
          if (!Number.isInteger(due) || due < 1 || due > 28) return err(row, "يوم الاستحقاق لازم من 1 إلى 28");
          const tenant = text(get(r, "tenant"));
          const since = tenant ? month(get(r, "since")) ?? monthKey(now) : undefined;
          const untilRaw = get(r, "until");
          const until = text(untilRaw) ? day(untilRaw) : undefined;
          if (until === null) return err(row, "نهاية العقد مو تاريخ صحيح");
          const depRaw = get(r, "deposit");
          const deposit = text(depRaw) ? money(depRaw) : 0;
          if (deposit === null) return err(row, "التأمين مو رقم صحيح");
          const kindRaw = normalize(text(get(r, "kind")));
          const kind: UnitKind | undefined = !kindRaw ? undefined : KIND_ALTS.find(([, alts]) => alts.some((a) => normalize(a) === kindRaw))?.[0];
          if (kindRaw && !kind) return err(row, "النوع لازم: شقة، محل تجاري، ستور، بيت، أو روضة");
          const existing = unitsByName.get(normalize(name));
          const unit: Unit = {
            ...(existing ?? {}),
            id: existing?.id ?? "u" + uid(),
            name, rent, dueDay: due,
            building: text(get(r, "building")) || existing?.building || "بدون مبنى",
            ...(kind ? { kind } : {}),
            tenant: tenant ? { name: tenant, phone: text(get(r, "phone")), since: since!, ...(until ? { until } : {}), ...(deposit ? { deposit } : {}) } : undefined,
          };
          unitsByName.set(normalize(name), unit);
          plan.units = plan.units.filter((u) => u.id !== unit.id).concat(unit);
          if (existing) plan.counts.updated++; else plan.counts.units++;
        } else if (kind === "payments") {
          const u = unitsByName.get(normalize(text(get(r, "unit"))));
          if (!u) return err(row, `الوحدة «${text(get(r, "unit")) || "—"}» مو موجودة`);
          const m = month(get(r, "month"));
          if (!m) return err(row, "الشهر لازم مثل 2026-10");
          const amount = money(get(r, "amount"));
          if (!amount) return err(row, "المبلغ مو رقم صحيح");
          const methodRaw = text(get(r, "method"));
          const method = (METHODS.find((x) => normalize(x) === normalize(methodRaw)) ?? "تحويل") as Method;
          const dateRaw = get(r, "date");
          const date = text(dateRaw) ? day(dateRaw) : `${m}-01`;
          if (!date) return err(row, "تاريخ الدفع مو صحيح");
          if (data.payments.some((p) => p.unitId === u.id && p.month === m && p.amount === amount && p.date === date)) return err(row, "مكرر: نفس الدفعة موجودة");
          plan.payments.push({ id: uid(), unitId: u.id, month: m, amount, method, date });
          plan.counts.payments++;
        } else {
          const label = text(get(r, "label"));
          if (!label) return err(row, "الوصف فاضي");
          const amount = money(get(r, "amount"));
          if (!amount) return err(row, "المبلغ مو رقم صحيح");
          const dateRaw = get(r, "date");
          const date = text(dateRaw) ? day(dateRaw) : isoDay(now);
          if (!date) return err(row, "التاريخ مو صحيح");
          const catName = text(get(r, "cat")) || "أخرى";
          let cat = catsByName.get(normalize(catName));
          if (!cat) { cat = { id: "c" + uid(), name: catName, limit: 0 }; catsByName.set(normalize(catName), cat); plan.cats.push(cat); }
          plan.expenses.push({ id: uid(), catId: cat.id, label, amount, date });
          plan.counts.expenses++;
        }
      });
    }
  }
  return plan;
}

// ── القالب والتصدير (بيانات الصفحات؛ الكتابة بـ write-excel-file) ─────────

const H = (v: string) => ({ value: v, fontWeight: "bold" as const, backgroundColor: "#EDE8DD" });
const D = (fils: number) => fils / 1000;

export function templateSheets() {
  return [
    { sheet: "الوحدات", data: [["الوحدة", "النوع", "المبنى", "الإيجار", "يوم الاستحقاق", "المستأجر", "الهاتف", "بداية العقد", "نهاية العقد", "التأمين"].map(H), ["شقة 1", "شقة", "عمارة المالكية", 200, 1, "اسم المستأجر", "3xxxxxxx", "2026-01", "2026-12-31", 200]] },
    { sheet: "الدفعات", data: [["الوحدة", "الشهر", "المبلغ", "الطريقة", "التاريخ"].map(H), ["شقة 1", "2026-10", 200, "BenefitPay", "2026-10-03"]] },
    { sheet: "المصاريف", data: [["الوصف", "المبلغ", "الفئة", "التاريخ"].map(H), ["فاتورة كهرباء", 18.5, "كهرباء وماء", "2026-10-06"]] },
  ];
}

export function exportSheets(data: Data, now = new Date()) {
  const unitName = (id: string) => data.units.find((u) => u.id === id)?.name ?? "—";
  const catName = (id: string) => data.cats.find((c) => c.id === id)?.name ?? "—";
  const rep = monthlyReport(data, now, 12);
  return [
    trackerSheet(data, now),
    { sheet: "التقرير الشهري", data: [["الشهر", "الدخل (د.ب)", "المصروف (د.ب)", "الصافي (د.ب)"].map(H), ...rep.rows.map((r) => [`${monthName(r.month)} ${r.month.slice(0, 4)}`, D(r.income), D(r.expense), D(r.net)]), ["المجموع", D(rep.income), D(rep.expense), D(rep.net)].map((v) => ({ value: v, fontWeight: "bold" as const }))] },
    { sheet: "الدفعات", data: [["الوحدة", "الشهر", "المبلغ", "الطريقة", "التاريخ"].map(H), ...[...data.payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => [unitName(p.unitId), p.month, D(p.amount), p.method, p.date])] },
    { sheet: "المصاريف", data: [["الوصف", "المبلغ", "الفئة", "التاريخ"].map(H), ...[...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => [e.label, D(e.amount), catName(e.catId), e.date])] },
    { sheet: "الوحدات", data: [["الوحدة", "النوع", "المبنى", "الإيجار", "يوم الاستحقاق", "المستأجر", "الهاتف", "بداية العقد", "نهاية العقد", "التأمين"].map(H), ...data.units.map((u) => [u.name, kindLabel(unitKind(u)), u.building, D(u.rent), u.dueDay, u.tenant?.name ?? "", u.tenant?.phone ?? "", u.tenant?.since ?? "", u.tenant?.until ?? "", u.tenant?.deposit ? D(u.tenant.deposit) : ""])] },
  ];
}

// ── DW-022: ملف متابعة حالة الإيجار (بدون هاتف ولا CPR — Legal) ──
const PAY_LABEL = { paid: "مسدد", due: "مستحق", late: "متأخر" } as const;
export const TRACK_HEAD = ["الوحدة", "النوع", "المبنى", "المستأجر", "الإيجار", "المستحق", "المسدد", "المتبقي", "حالة السداد", "مدفوع لين", "أشهر مقدمة", "المبلغ المقدم", "نهاية العقد", "الأيام المتبقية", "حالة العقد"];
export function trackerSheet(data: Data, now = new Date(), rows = rentTracker(data, now)) {
  const sum = (k: "due" | "paid" | "left" | "aheadAmount") => D(rows.reduce((s, r) => s + r[k], 0));
  const bold = (v: string | number) => ({ value: v, fontWeight: "bold" as const });
  return {
    sheet: "متابعة الإيجار",
    data: [
      TRACK_HEAD.map(H),
      ...rows.map((r) => [
        r.unit.name, kindLabel(r.kind), r.unit.building, r.unit.tenant?.name ?? "شاغرة", D(r.unit.rent),
        D(r.due), D(r.paid), D(r.left), r.status ? PAY_LABEL[r.status] : "—",
        r.through ? monthLabel(r.through) : "—", r.ahead, D(r.aheadAmount),
        r.unit.tenant?.until ?? "", r.daysLeft ?? "", LEASE_LABEL[r.lease],
      ]),
      ["المجموع", "", "", `${rows.length} وحدة`, "", sum("due"), sum("paid"), sum("left"), "", "", "", sum("aheadAmount"), "", "", ""].map(bold),
    ],
  };
}
