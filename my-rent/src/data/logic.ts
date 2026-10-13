import type { Data, Fils, Status, Unit } from "./types";

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const isoDay = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];

export const GRACE_DAYS = 5;

/** حالة الوحدة لهالشهر: مدفوع لو فيه دفعة؛ متأخر لو عدّى يوم الاستحقاق + 5 أيام سماح؛ وإلا مستحق */
export function unitStatus(data: Data, unit: Unit, now = new Date()): Status {
  const m = monthKey(now);
  if (data.payments.some((p) => p.unitId === unit.id && p.month === m)) return "paid";
  return now.getDate() > unit.dueDay + GRACE_DAYS ? "late" : "due";
}

export const rented = (data: Data) => data.units.filter((u) => u.tenant);

export function collection(data: Data, now = new Date()) {
  const m = monthKey(now);
  const units = rented(data);
  const expected = units.reduce((s, u) => s + u.rent, 0);
  const collected = data.payments.filter((p) => p.month === m).reduce((s, p) => s + p.amount, 0);
  const late = units.filter((u) => unitStatus(data, u, now) === "late");
  const due = units.filter((u) => unitStatus(data, u, now) === "due");
  const paid = units.filter((u) => unitStatus(data, u, now) === "paid");
  return { month: m, expected, collected, late, due, paid, vacant: data.units.length - units.length };
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
