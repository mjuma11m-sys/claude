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
