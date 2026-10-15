import type { Data, Fils, Status, Unit } from "./types";

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const isoDay = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];

export const GRACE_DAYS = 5;

/** كل الأشهر من a إلى b (شامل) بصيغة YYYY-MM */
export function monthsBetween(a: string, b: string): string[] {
  const out: string[] = [];
  let [y, m] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  while (y < by || (y === by && m <= bm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

const paidFor = (data: Data, unitId: string, month: string) =>
  data.payments.filter((p) => p.unitId === unitId && p.month === month).reduce((s, p) => s + p.amount, 0);

/** الأشهر اللي ما اندفعت (أو اندفعت ناقص) من بداية التتبّع لين هالشهر، مع المبلغ الباقي لكل شهر */
export function owedMonths(data: Data, unit: Unit, now = new Date()) {
  if (!unit.tenant) return [];
  const start = data.trackFrom > unit.tenant.since ? data.trackFrom : unit.tenant.since;
  return monthsBetween(start, monthKey(now))
    .map((month) => ({ month, left: unit.rent - paidFor(data, unit.id, month) }))
    .filter((x) => x.left > 0);
}

/** المتأخرات = أشهر سابقة ما اندفعت + هالشهر لو عدّى يوم الاستحقاق + 5 أيام سماح */
export function arrears(data: Data, unit: Unit, now = new Date()) {
  const cur = monthKey(now);
  const late = now.getDate() > unit.dueDay + GRACE_DAYS;
  const months = owedMonths(data, unit, now).filter((x) => x.month !== cur || late);
  return { months, amount: months.reduce((s, x) => s + x.left, 0) };
}

/** الحالة: متأخر لو عليه أي متأخرات؛ مدفوع لو ما عليه شي؛ وإلا مستحق (هالشهر وبعده داخل المهلة) */
export function unitStatus(data: Data, unit: Unit, now = new Date()): Status {
  if (arrears(data, unit, now).amount > 0) return "late";
  return owedMonths(data, unit, now).length === 0 ? "paid" : "due";
}

export const rented = (data: Data) => data.units.filter((u) => u.tenant);

export function collection(data: Data, now = new Date()) {
  const m = monthKey(now);
  const units = rented(data);
  const expected = units.reduce((s, u) => s + u.rent, 0);
  const collected = data.payments.filter((p) => p.month === m).reduce((s, p) => s + p.amount, 0);
  const by = (st: Status) => units.filter((u) => unitStatus(data, u, now) === st);
  const owed = units.reduce((s, u) => s + arrears(data, u, now).amount, 0);
  return { month: m, expected, collected, owed, late: by("late"), due: by("due"), paid: by("paid"), vacant: data.units.length - units.length };
}

export function budget(data: Data, now = new Date()) {
  const m = monthKey(now);
  const spentBy = (catId: string) =>
    data.expenses.filter((e) => e.catId === catId && e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
  const cats = data.cats.map((c) => ({ ...c, spent: spentBy(c.id) }));
  return { cats, limit: cats.reduce((s, c) => s + c.limit, 0), spent: cats.reduce((s, c) => s + c.spent, 0) };
}

export function balances(data: Data) {
  const members = data.members.map((m) => ({
    ...m,
    balance: data.bank.filter((t) => t.memberId === m.id).reduce((s, t) => s + t.amount, 0),
  }));
  return { members, total: members.reduce((s, m) => s + m.balance, 0) };
}

export const fmt = (fils: Fils) =>
  (fils / 1000).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** "180.5" أو "180,500" → 180500 فلس. يرجّع null لو المدخل غلط أو صفر/سالب */
export function parseBHD(input: string): Fils | null {
  const clean = input.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[,\s]/g, "").replace("٫", ".");
  if (!/^\d+(\.\d{0,3})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  const fils = Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
  return fils > 0 ? fils : null;
}

/** عقود تنتهي خلال days يوم (أو انتهت) — مرتبة من الأقرب */
export function contractAlerts(data: Data, now = new Date(), days = 30) {
  const today = isoDay(now);
  const limit = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
  return data.units
    .filter((u) => u.tenant?.until && u.tenant.until <= limit)
    .map((u) => {
      const left = Math.round((Date.parse(u.tenant!.until!) - Date.parse(today)) / 86400000);
      return { unit: u, until: u.tenant!.until!, left };
    })
    .sort((a, b) => a.left - b.left);
}

/** آخر n أشهر: الدخل (دفعات الإيجار حسب شهر الاستحقاق) والمصروف والصافي */
export function monthlyReport(data: Data, now = new Date(), n = 6) {
  const months = monthsBetween(monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1), 1)), monthKey(now));
  const rows = months.map((m) => {
    const income = data.payments.filter((p) => p.month === m).reduce((s, p) => s + p.amount, 0);
    const expense = data.expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
    return { month: m, income, expense, net: income - expense };
  });
  const sum = (k: "income" | "expense" | "net") => rows.reduce((s, r) => s + r[k], 0);
  return { rows, income: sum("income"), expense: sum("expense"), net: sum("net") };
}

/** CSV بعلامة BOM عشان Excel يقرا العربي صح */
export function toCSV(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** آخر n أشهر للوحدة: مدفوع / متأخر / مستحق / قبل العقد — للنقاط على البطاقة */
export function monthTrail(data: Data, unit: Unit, now = new Date(), n = 6) {
  const cur = monthKey(now);
  const months = monthsBetween(monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1), 1)), cur);
  const start = unit.tenant ? (data.trackFrom > unit.tenant.since ? data.trackFrom : unit.tenant.since) : "9999-99";
  const late = now.getDate() > unit.dueDay + GRACE_DAYS;
  return months.map((m) => {
    if (m < start) return { month: m, state: "none" as const };
    if (paidFor(data, unit.id, m) >= unit.rent) return { month: m, state: "paid" as const };
    if (m === cur && !late) return { month: m, state: "due" as const };
    return { month: m, state: "late" as const };
  });
}

// ── DW-017 ──────────────────────────────────────────────

/** المصاريف الثابتة اللي ما انسجلت هالشهر (نفس الفئة ونفس الوصف = انسجلت) */
export function dueRecurring(data: Data, now = new Date()) {
  const m = monthKey(now);
  const logged = new Set(data.expenses.filter((e) => e.date.startsWith(m)).map((e) => `${e.catId}|${e.label.trim()}`));
  return (data.recurring ?? []).filter((r) => !logged.has(`${r.catId}|${r.label.trim()}`));
}

/** كشف حساب المستأجر: كل شهر من بداية الحساب لين هالشهر — المطلوب والمدفوع والباقي.
 *  «متأخر» = نفس arrears بالضبط، و«مستحق» = هالشهر لو ما عدّى السماح. */
export function statement(data: Data, unit: Unit, now = new Date()) {
  if (!unit.tenant) return { rows: [], paid: 0, late: 0, due: 0 };
  const cur = monthKey(now);
  const start = data.trackFrom > unit.tenant.since ? data.trackFrom : unit.tenant.since;
  const lateNow = now.getDate() > unit.dueDay + GRACE_DAYS;
  const rows = monthsBetween(start, cur).map((month) => {
    const paid = paidFor(data, unit.id, month);
    const left = Math.max(0, unit.rent - paid);
    const state = left === 0 ? "paid" : month === cur && !lateNow ? "due" : "late";
    return { month, rent: unit.rent, paid, left, state: state as Status };
  });
  return {
    rows,
    paid: rows.reduce((s, r) => s + r.paid, 0),
    late: rows.filter((r) => r.state === "late").reduce((s, r) => s + r.left, 0),
    due: rows.filter((r) => r.state === "due").reduce((s, r) => s + r.left, 0),
  };
}

/** تذكير النسخة الاحتياطية: ما فيه نسخة أبد، أو آخر وحدة قبل 30 يوم أو أكثر */
export const BACKUP_DAYS = 30;
export function backupDue(last: string | undefined, now = new Date()) {
  if (!last) return true;
  const days = (now.getTime() - new Date(last + "T00:00:00").getTime()) / 86_400_000;
  return days >= BACKUP_DAYS;
}
