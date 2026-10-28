import { isEn, t } from "../i18n";
import type { Bill, BillKind, ChequeState, Contract, Data, Doc, DocKind, Fils, Kind, Payment, Status, Unit } from "./types";

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const isoDay = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_UI_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (key: string) => (isEn() ? MONTHS_UI_EN : MONTHS)[Number(key.slice(5, 7)) - 1]; // DW-045: بلغة الواجهة
/** اسم الشهر بالعربي دايماً — للرسائل والمستندات اللي تروح للمستأجر بالعربي */
export const monthAr = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];

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

/** DW-024: إيجار شهر معيّن — أقدم إيجار سابق يغطي الشهر، وإلا الإيجار الحالي */
export function rentAt(unit: Unit, month: string): Fils {
  const hit = (unit.rentBefore ?? []).filter((r) => month <= r.until).sort((a, b) => a.until.localeCompare(b.until))[0];
  return hit ? hit.rent : unit.rent;
}

const paidFor = (data: Data, unitId: string, month: string) =>
  data.payments.filter((p) => p.unitId === unitId && p.month === month).reduce((s, p) => s + p.amount, 0);

/** الأشهر اللي ما اندفعت (أو اندفعت ناقص) من بداية التتبّع لين هالشهر، مع المبلغ الباقي لكل شهر */
export function owedMonths(data: Data, unit: Unit, now = new Date()) {
  if (!unit.tenant) return [];
  const start = data.trackFrom > unit.tenant.since ? data.trackFrom : unit.tenant.since;
  return monthsBetween(start, monthKey(now))
    .map((month) => ({ month, left: rentAt(unit, month) - paidFor(data, unit.id, month) }))
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
  const expected = units.reduce((s, u) => s + rentAt(u, m), 0);
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
    // DW-037: الإشعار الدائن الجزئي ينقص من دخل شهر الدفعة (الدفعة نفسها تبقى، والشهر مسدد)
    const refunds = (data.credits ?? []).filter((c) => c.amount && c.payment.month === m && data.payments.some((p) => p.id === c.payment.id)).reduce((s, c) => s + (c.amount ?? 0), 0);
    const income = data.payments.filter((p) => p.month === m).reduce((s, p) => s + p.amount, 0) - refunds;
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
    if (paidFor(data, unit.id, m) >= rentAt(unit, m)) return { month: m, state: "paid" as const };
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
    const rent = rentAt(unit, month);
    const left = Math.max(0, rent - paid);
    const state = left === 0 ? "paid" : month === cur && !lateNow ? "due" : "late";
    return { month, rent, paid, left, state: state as Status };
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

// ── DW-020: نموذج العقد ──────────────────────────────────

export const CONTRACT_FIELDS = ["المالك", "المستأجر", "هاتف المستأجر", "الوحدة", "المبنى", "الإيجار", "يوم الاستحقاق", "بداية العقد", "نهاية العقد", "التأمين", "تاريخ اليوم"] as const;

export const DEFAULT_CONTRACT = `عقد إيجار

إنه في يوم {تاريخ اليوم} تم الاتفاق بين:
الطرف الأول (المؤجر): {المالك}
الطرف الثاني (المستأجر): {المستأجر} — هاتف: {هاتف المستأجر}

على ما يلي:
1. يؤجر الطرف الأول للطرف الثاني {الوحدة} في {المبنى}.
2. مدة العقد من {بداية العقد} إلى {نهاية العقد}.
3. الإيجار الشهري {الإيجار} دينار بحريني، يُدفع في اليوم {يوم الاستحقاق} من كل شهر.
4. دفع المستأجر تأميناً قدره {التأمين} دينار بحريني، يُرد عند انتهاء العقد بعد خصم أي أضرار أو مبالغ مستحقة.
5. يستخدم المستأجر العقار للسكن فقط، ولا يجوز التأجير من الباطن إلا بموافقة كتابية.
6. فواتير الكهرباء والماء على المستأجر ما لم يُتفق على غير ذلك كتابياً.
7. يحافظ المستأجر على العقار ويُرجعه بالحالة التي استلمه بها، باستثناء الاستهلاك العادي.
8. يلتزم المؤجر بالصيانة الأساسية للعقار.
9. أي إنهاء مبكر يكون بإشعار كتابي قبل شهر على الأقل.
10. يخضع هذا العقد لقوانين مملكة البحرين.

توقيع المؤجر: ____________        توقيع المستأجر: ____________`;

/** يعبّي خانات النموذج من بيانات الوحدة. الخانة اللي ما لها قيمة تصير «—» */
export function fillContract(template: string, unit: Unit, owner: string, now = new Date()) {
  const t = unit.tenant;
  const v: Record<string, string> = {
    "المالك": owner.trim() || "—",
    "المستأجر": t?.name || "—",
    "هاتف المستأجر": t?.phone || "—",
    "الوحدة": unit.name,
    "المبنى": unit.building,
    "الإيجار": fmt(unit.rent),
    "يوم الاستحقاق": String(unit.dueDay),
    "بداية العقد": t?.since ? `${monthName(t.since)} ${t.since.slice(0, 4)}` : "—",
    "نهاية العقد": t?.until ?? "—",
    "التأمين": t?.deposit ? fmt(t.deposit) : "—",
    "تاريخ اليوم": isoDay(now),
  };
  return template.replace(/\{([^{}]+)\}/g, (m, k: string) => (k.trim() in v ? v[k.trim()] : m));
}

// ── DW-047: العقد المعتمد (نسخة ثابتة) والأرشيف ─────────

/** نسخة ثابتة من العقد ببيانات الوحدة والمستأجر الحين */
export function snapshotContract(id: string, unit: Unit, text: string, now = new Date()): Contract {
  const t = unit.tenant;
  return { id, unitId: unit.id, unit: unit.name, building: unit.building, tenant: t?.name ?? "", phone: t?.phone ?? "", trn: t?.trn, since: t?.since, until: t?.until, rent: unit.rent, dueDay: unit.dueDay, deposit: t?.deposit, text, signedAt: isoDay(now) };
}

/** العقد المعتمد الحالي للوحدة (ما انتهى) */
export const activeContract = (data: Data, unitId: string) => (data.contracts ?? []).find((c) => c.unitId === unitId && !c.endedAt);
/** العقود السابقة للوحدة، الأحدث أول */
export const pastContracts = (data: Data, unitId: string) =>
  (data.contracts ?? []).filter((c) => c.unitId === unitId && c.endedAt).sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));

/** شنو تغيّر بالوحدة بعد اعتماد العقد (أسماء الخانات) — فاضي = العقد مطابق */
export function contractChanges(c: Contract, unit: Unit): string[] {
  const t = unit.tenant;
  const diff: [boolean, string][] = [
    [(t?.name ?? "") !== c.tenant, "المستأجر"],
    [(t?.phone ?? "") !== c.phone, "هاتف المستأجر"],
    [(t?.trn ?? "") !== (c.trn ?? ""), "الرقم الضريبي"],
    [unit.rent !== c.rent, "الإيجار"],
    [unit.dueDay !== c.dueDay, "يوم الاستحقاق"],
    [(t?.since ?? "") !== (c.since ?? ""), "بداية العقد"],
    [(t?.until ?? "") !== (c.until ?? ""), "نهاية العقد"],
    [(t?.deposit ?? 0) !== (c.deposit ?? 0), "التأمين"],
  ];
  return diff.filter(([d]) => d).map(([, k]) => k);
}

// ── DW-022: ملف متابعة حالة الإيجار ─────────────────────

export const KINDS: { id: Kind; label: string }[] = [
  { id: "flat", label: t("شقة") }, { id: "shop", label: t("محل تجاري") }, { id: "store", label: t("ستور") },
  { id: "house", label: t("بيت") }, { id: "nursery", label: t("روضة") },
];
export const kindLabel = (k: Kind) => KINDS.find((x) => x.id === k)!.label;
/** النوع المحفوظ، وإلا من الاسم (محل/ستور/بيت/فيلا/روضة)، وإلا شقة */
export function kindOf(u: Unit): Kind {
  if (u.kind) return u.kind;
  const n = u.name;
  if (/محل|معرض/.test(n)) return "shop";
  if (/ستور|مخزن|مستودع/.test(n)) return "store";
  if (/روض|حضان/.test(n)) return "nursery";
  if (/بيت|فيلا|منزل/.test(n)) return "house";
  return "flat";
}

export const SOON_DAYS = 60;
export type LeaseState = "active" | "soon" | "ended" | "open" | "vacant";
export const LEASE_LABEL: Record<LeaseState, string> = { active: "سارية", soon: "قريبة الانتهاء", ended: "منتهية", open: "بدون نهاية", vacant: "شاغرة" };
export const monthLabel = (key: string) => `${monthName(key)} ${key.slice(0, 4)}`;

/** الأشهر المدفوعة كامل بعد هالشهر (الإيجار المقدم) */
export function prepaid(data: Data, unit: Unit, now = new Date()) {
  const cur = monthKey(now);
  const pays = data.payments.filter((p) => p.unitId === unit.id && p.month > cur);
  const months = [...new Set(pays.map((p) => p.month))].sort().filter((m) => paidFor(data, unit.id, m) >= rentAt(unit, m));
  return { months, amount: pays.reduce((s, p) => s + p.amount, 0) };
}

/** آخر شهر متصل مدفوع كامل من بداية الحساب (null = هالشهر وقبله فيه نقص) */
export function paidThrough(data: Data, unit: Unit, now = new Date()) {
  if (!unit.tenant) return null;
  const start = data.trackFrom > unit.tenant.since ? data.trackFrom : unit.tenant.since;
  const owed = owedMonths(data, unit, now);
  if (owed.length) {
    const first = owed[0].month;
    return first <= start ? null : monthsBetween(start, first).slice(-2)[0];
  }
  let m = monthKey(now);
  for (;;) {
    const next = monthKey(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1));
    if (paidFor(data, unit.id, next) < rentAt(unit, next)) return m;
    m = next;
  }
}

/** الأشهر الجاية اللي ما اندفعت (للدفعة المقدمة): تبدأ من أول شهر بعد «مدفوع لين» */
export function nextUnpaid(data: Data, unit: Unit, n: number, now = new Date()) {
  const owed = owedMonths(data, unit, now).map((x) => x.month);
  const out = [...owed].slice(0, n);
  let [y, m] = monthKey(now).split("-").map(Number);
  while (out.length < n) {
    m++; if (m > 12) { m = 1; y++; }
    const k = `${y}-${String(m).padStart(2, "0")}`;
    if (paidFor(data, unit.id, k) < rentAt(unit, k)) out.push(k);
  }
  return out;
}

/** صف لكل وحدة: المستحق والمسدد لين هالشهر (من كشف الحساب)، والمقدم منفصل، وحالة العقد */
export function rentTracker(data: Data, now = new Date()) {
  const today = isoDay(now);
  return data.units.map((u) => {
    const st = statement(data, u, now);
    const due = st.rows.reduce((s, r) => s + r.rent, 0);
    const paid = st.rows.reduce((s, r) => s + Math.min(r.paid, r.rent), 0);
    const pre = prepaid(data, u, now);
    const until = u.tenant?.until;
    const daysLeft = until ? Math.round((Date.parse(until) - Date.parse(today)) / 86400000) : null;
    const lease: LeaseState = !u.tenant ? "vacant" : daysLeft === null ? "open" : daysLeft < 0 ? "ended" : daysLeft <= SOON_DAYS ? "soon" : "active";
    return {
      unit: u, kind: kindOf(u), status: u.tenant ? unitStatus(data, u, now) : null,
      due, paid, left: st.late + st.due, through: paidThrough(data, u, now),
      ahead: pre.months.length, aheadAmount: pre.amount, daysLeft, lease,
      bills: u.tenant ? billsDue(data, u).amount : 0,
    };
  });
}
export type TrackRow = ReturnType<typeof rentTracker>[number];

export function trackerTotals(rows: TrackRow[]) {
  const sum = (k: "due" | "paid" | "left" | "aheadAmount" | "bills") => rows.reduce((s, r) => s + r[k], 0);
  return { units: rows.length, rented: rows.filter((r) => r.unit.tenant).length, due: sum("due"), paid: sum("paid"), left: sum("left"), ahead: sum("aheadAmount"), bills: sum("bills") };
}

// ── DW-023: الوثائق والمستندات ──────────────────────────

export const DOC_KINDS: { id: DocKind; label: string }[] = [
  { id: "cr", label: "سجل تجاري" }, { id: "insurance", label: "تأمين" }, { id: "license", label: "رخصة بلدية" },
  { id: "civil", label: "الدفاع المدني" }, { id: "service", label: "عقد صيانة" }, { id: "other", label: "أخرى" },
];
export const docKindLabel = (k: DocKind) => DOC_KINDS.find((x) => x.id === k)?.label ?? "أخرى";
export const DOC_SOON = 30;
export type DocState = "active" | "soon" | "ended" | "open";
export const DOC_LABEL: Record<DocState, string> = { active: t("سارية"), soon: t("قريبة الانتهاء"), ended: t("منتهية"), open: t("بدون انتهاء") };

export function docStatus(doc: Doc, now = new Date()) {
  if (!doc.expires) return { state: "open" as DocState, left: null };
  const left = Math.round((Date.parse(doc.expires) - Date.parse(isoDay(now))) / 86400000);
  return { state: (left < 0 ? "ended" : left <= DOC_SOON ? "soon" : "active") as DocState, left };
}

/** كل الوثائق بحالتها، مرتبة: المنتهية ثم الأقرب انتهاء، والبدون انتهاء آخر شي */
export function docsList(data: Data, now = new Date()) {
  return (data.docs ?? []).map((doc) => ({ doc, ...docStatus(doc, now) }))
    .sort((a, b) => (a.left ?? Infinity) - (b.left ?? Infinity));
}
export const docAlerts = (data: Data, now = new Date()) => docsList(data, now).filter((d) => d.state === "soon" || d.state === "ended");

// ── DW-024: تجديد العقد ─────────────────────────────────

export const nextMonth = (m: string) => monthKey(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1));
export const prevMonth = (m: string) => monthKey(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 2, 1));
/** يضيف أشهر لتاريخ يوم (آخر الشهر يبقى آخر الشهر) */
export function addMonthsDay(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(y, m - 1 + n + 1, 0).getDate();
  return isoDay(new Date(y, m - 1 + n, Math.min(d, last)));
}
/** الإيجار يتغيّر من شهر from: الأشهر قبله تبقى على الإيجار القديم */
export function renewUnit(unit: Unit, until: string, rent: Fils, from: string): Unit {
  if (!unit.tenant) return unit;
  const changed = rent !== unit.rent;
  return {
    ...unit,
    rent,
    ...(changed ? { rentBefore: [...(unit.rentBefore ?? []), { until: prevMonth(from), rent: unit.rent }] } : {}),
    tenant: { ...unit.tenant, until },
  };
}
/** الإيجار الجاي لو فيه زيادة ما بدت للحين */
export function upcomingRent(unit: Unit, now = new Date()) {
  const cur = monthKey(now);
  const r = rentAt(unit, cur);
  if (r === unit.rent) return null;
  const from = nextMonth([...(unit.rentBefore ?? [])].filter((x) => x.until >= cur).sort((a, b) => b.until.localeCompare(a.until))[0].until);
  return { rent: unit.rent, from };
}

// ── DW-026: فواتير الكهرباء والماء (على المستأجر) ───────

export const BILL_KINDS: { id: BillKind; label: string }[] = [{ id: "ewa", label: "كهرباء وماء" }, { id: "elec", label: "كهرباء" }, { id: "water", label: "ماء" }];
export const billKindLabel = (k: BillKind) => BILL_KINDS.find((x) => x.id === k)?.label ?? "كهرباء وماء";
export const unitBills = (data: Data, unitId: string) =>
  (data.bills ?? []).filter((b) => b.unitId === unitId).sort((a, b) => b.month.localeCompare(a.month) || a.kind.localeCompare(b.kind));
/** الفواتير غير المسددة للوحدة (للمستأجر الحالي: من بداية عقده) */
export function billsDue(data: Data, unit: Unit) {
  const since = unit.tenant?.since ?? "0000-00";
  const list = unitBills(data, unit.id).filter((b) => !b.paid && b.month >= since);
  return { list, amount: list.reduce((s, b) => s + b.amount, 0) };
}
/** نفس الوحدة + الشهر + النوع = نفس الفاتورة (تحديث بدل تكرار) */
export const findBill = (data: Data, unitId: string, month: string, kind: BillKind): Bill | undefined =>
  (data.bills ?? []).find((b) => b.unitId === unitId && b.month === month && b.kind === kind);

// ── DW-029: الشيكات المؤجلة ─────────────────────────────

export const CHEQUE_LABEL: Record<ChequeState, string> = { held: "عندي", deposited: "مودع", returned: "رجع" };
export const unitCheques = (data: Data, unitId: string) =>
  (data.cheques ?? []).filter((c) => c.unitId === unitId).sort((a, b) => a.due.localeCompare(b.due));
const daysTo = (day: string, now: Date) => Math.round((Date.parse(day) - Date.parse(isoDay(now))) / 86400000);
/** شيكات «عندي» وصل تاريخها أو باقي عليها <= days يوم */
export function chequesDue(data: Data, now = new Date(), days = 7) {
  return (data.cheques ?? []).filter((c) => c.state === "held").map((c) => ({ cheque: c, left: daysTo(c.due, now) }))
    .filter((x) => x.left <= days).sort((a, b) => a.left - b.left);
}
/** دفعات شيكات متتالية: الرقم يزيد واحد (لو رقم) والتاريخ شهر */
export function chequeSeries(first: { number: string; bank: string; amount: Fils; due: string }, n: number) {
  const digits = /^\d+$/.test(first.number);
  return Array.from({ length: n }, (_, i) => ({
    number: digits ? String(BigInt(first.number) + BigInt(i)).padStart(first.number.length, "0") : i ? `${first.number}-${i + 1}` : first.number,
    bank: first.bank, amount: first.amount, due: addMonthsDay(first.due, i),
  }));
}
export const chequeHeld = (data: Data, unitId: string) => (data.cheques ?? []).filter((c) => c.unitId === unitId && c.state === "held");

// ── DW-029: ملف التقويم (.ics) — ينبني بالجهاز ─────────

const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
const icsDay = (day: string) => day.replace(/-/g, "");
function fold(line: string) { // RFC 5545: سطر <= 75 بايت
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (bytes + b > 73) { out.push(cur); cur = " "; bytes = 1; } cur += ch; bytes += b; }
  out.push(cur); return out.join("\r\n");
}
export function buildIcs(data: Data, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ev: string[][] = [];
  const add = (uid: string, day: string, summary: string, extra: string[] = [], alarmDays?: number) => {
    const next = icsDay(addMonthsDay(day, 0)); const end = new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10);
    ev.push(["BEGIN:VEVENT", `UID:${uid}@idarati`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${next}`, `DTEND;VALUE=DATE:${icsDay(end)}`, `SUMMARY:${icsEsc(summary)}`, ...extra,
      ...(alarmDays !== undefined ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(summary)}`, `TRIGGER:-P${alarmDays}D`, "END:VALARM"] : []), "END:VEVENT"]);
  };
  const cur = monthKey(now);
  for (const u of data.units.filter((x) => x.tenant)) {
    const first = `${cur}-${String(u.dueDay).padStart(2, "0")}`;
    const until = u.tenant!.until ? [`RRULE:FREQ=MONTHLY;UNTIL=${icsDay(u.tenant!.until)}`] : ["RRULE:FREQ=MONTHLY"];
    add(`rent-${u.id}`, first, `إيجار ${u.name} · ${u.tenant!.name} · ${fmt(rentAt(u, cur))} د.ب`, until, 0);
    if (u.tenant!.until) add(`lease-${u.id}`, u.tenant!.until, `نهاية عقد ${u.name} (${u.tenant!.name})`, [], 30);
  }
  for (const { doc } of docsList(data, now)) if (doc.expires) add(`doc-${doc.id}`, doc.expires, `تنتهي: ${doc.title}`, [], 30);
  for (const c of data.cheques ?? []) if (c.state === "held") {
    const u = data.units.find((x) => x.id === c.unitId);
    add(`chq-${c.id}`, c.due, `أودع شيك ${c.number} · ${u?.name ?? ""} · ${fmt(c.amount)} د.ب`, [], 1);
  }
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Idarati//AR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:إداراتي", ...ev.flat(), "END:VCALENDAR"];
  return { text: lines.map(fold).join("\r\n") + "\r\n", count: ev.length };
}

// ── DW-030: وصف حدث بسجل النشاط ────────────────────────
export function describeAction(a: { type: string; [k: string]: unknown }, data: Data): string {
  const unit = (id: unknown) => data.units.find((u) => u.id === id)?.name ?? "وحدة";
  const money = (f: unknown) => (typeof f === "number" ? `${fmt(f)} د.ب` : "");
  const o = a as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (a.type) {
    case "pay": return `سجّل دفعة ${unit(o.payment?.unitId)} · ${monthName(o.payment?.month ?? "2000-01")} · ${money(o.payment?.amount)}`;
    case "unpay": return "تراجع عن دفعة";
    case "expense": return `سجّل مصروف «${o.expense?.label ?? ""}» · ${money(o.expense?.amount)}`;
    case "expenses": return `سجّل ${o.items?.length ?? 0} مصاريف ثابتة`;
    case "unexpense": case "unexpenses": return "تراجع عن مصروف";
    case "unit": return `عدّل ${o.unit?.name ?? "وحدة"}`;
    case "vacate": return `أخلى ${unit(o.id)}`;
    case "delunit": return "حذف وحدة";
    case "task": return "أشّر مهمة صيانة";
    case "replace": return "رفع بيانات الجهاز (بداية السجل)";
    case "deposit": return `سجّل تأمين ${money(o.log?.amount)}`;
    case "contract": return "عدّل نموذج العقد";
    case "import": return `استورد Excel (${o.units?.length ?? 0} وحدات، ${o.payments?.length ?? 0} دفعات)`;
    case "unimport": return "تراجع عن استيراد Excel";
    case "doc": return `حفظ وثيقة «${o.doc?.title ?? ""}»`;
    case "undoc": return "حذف وثيقة";
    case "bill": return `فاتورة ${unit(o.bill?.unitId)} · ${o.bill?.paid ? "مسددة" : "غير مسددة"}`;
    case "unbill": return "حذف فاتورة";
    case "cheque": return `شيك ${o.cheque?.number ?? ""} · ${unit(o.cheque?.unitId)} · ${CHEQUE_LABEL[o.cheque?.state as ChequeState] ?? ""}`;
    case "uncheque": return "حذف شيك";
    case "recurring": case "unrecurring": return "عدّل المصاريف الثابتة";
    case "vat": return o.vat ? "فعّل الفاتورة الضريبية" : "أوقف الفاتورة الضريبية"; // DW-035
    case "invoice": return `طلّع فاتورة ضريبية ${invoiceLabel(Number(o.no) || 0)}`;
    case "credit": return `إشعار دائن ${money(o.amount)}`;
    default: return "تعديل";
  }
}

// ---------- DW-035: الفاتورة الضريبية (VAT 10%) ----------
/** الإيجار التجاري عليه VAT، والسكني (شقة، بيت) معفى */
export const isCommercial = (u: Unit) => ["shop", "store", "nursery"].includes(kindOf(u));
export const VAT_RATE = 0.1;
/** المبلغ المستلم شامل الضريبة ← الصافي والضريبة بالفلس */
export function vatSplit(gross: Fils) { const net = Math.round((gross * 10) / 11); return { net, vat: gross - net }; }
export const validTrn = (s: string) => /^\d{15}$/.test(s.trim());
export const nextInvoiceNo = (d: Data) => Math.max(0, ...d.payments.map((p) => p.inv ?? 0), ...(d.credits ?? []).map((c) => c.payment.inv ?? 0)) + 1;
export const creditLabel = (no: number) => `CN-${String(no).padStart(6, "0")}`;
/** مبلغ الإشعار الدائن: الجزئي لو فيه، وإلا الباقي من الدفعة وقت الإلغاء */
export const creditAmount = (c: { amount?: Fils; payment: { amount: Fils } }) => c.amount ?? c.payment.amount;
/** DW-037: كل الفواتير اللي انطلعت — حتى اللي دفعتها انلغت (نسختها بالإشعار الدائن). مرة وحدة لكل رقم */
export function issuedInvoices(d: Data): Payment[] {
  const seen = new Set<number>(); const out: Payment[] = [];
  for (const p of [...d.payments, ...(d.credits ?? []).map((c) => c.payment)]) if (p.inv && !seen.has(p.inv)) { seen.add(p.inv); out.push(p); }
  return out.sort((a, b) => (a.inv ?? 0) - (b.inv ?? 0));
}
/** DW-036: ملخص الضريبة لكل ربع سنة (للإقرار). الفاتورة بتاريخها، والإشعار الدائن ينخصم بربع تاريخه */
export function vatSummary(d: Data, year: number) {
  const q = (day: string) => Math.floor((Number(day.slice(5, 7)) - 1) / 3);
  const rows = [0, 1, 2, 3].map((i) => ({ quarter: i + 1, invoices: 0, credits: 0, net: 0, vat: 0 }));
  for (const p of issuedInvoices(d)) if (p.date.startsWith(String(year))) { const r = rows[q(p.date)]; const s = vatSplit(p.invAmount ?? p.amount); r.invoices++; r.net += s.net; r.vat += s.vat; }
  for (const c of d.credits ?? []) if (c.date.startsWith(String(year))) { const r = rows[q(c.date)]; const s = vatSplit(creditAmount(c)); r.credits++; r.net -= s.net; r.vat -= s.vat; }
  return { rows, net: rows.reduce((t, r) => t + r.net, 0), vat: rows.reduce((t, r) => t + r.vat, 0) };
}
export const invoiceLabel = (no: number) => `INV-${String(no).padStart(6, "0")}`;

// ── DW-042: تذكيرات الجوال المحلية ────────────────────────
export type Reminder = { key: string; day: string; title: string; body: string };
const shiftDay = (day: string, n: number) => { const [y, m, d] = day.split("-").map(Number); return isoDay(new Date(y, m - 1, d + n)); };
/** تذكيرات الأيام الجاية، أقربها أول (أبل تسمح 64 معلّق بس).
 *  شاشة القفل يشوفها أي أحد: اسم الوحدة بس — بدون مبالغ ولا أسماء مستأجرين ولا أرقام شيكات */
export function planReminders(data: Data, now = new Date(), days = 60, max = 60): Reminder[] {
  const today = isoDay(now), end = shiftDay(today, days);
  const out: Reminder[] = [];
  const add = (key: string, day: string, title: string, body: string) => { if (day >= today && day <= end) out.push({ key, day, title, body }); };
  for (const u of data.units) {
    if (!u.tenant) continue;
    const start = data.trackFrom > u.tenant.since ? data.trackFrom : u.tenant.since;
    let m = monthKey(now);
    for (let i = 0; i <= Math.ceil(days / 28); i++, m = nextMonth(m)) {
      const day = `${m}-` + String(Math.min(u.dueDay, new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate())).padStart(2, "0");
      if (m < start || (u.tenant.until && day > u.tenant.until)) continue;
      if (paidFor(data, u.id, m) >= rentAt(u, m)) continue; // مدفوع مقدماً: ما نذكّر
      add(`rent-${u.id}-${m}`, day, "موعد الإيجار", `إيجار ${u.name} مستحق اليوم`);
    }
    if (u.tenant.until) {
      add(`lease30-${u.id}`, shiftDay(u.tenant.until, -30), "عقد قرب يخلص", `عقد ${u.name} يخلص بعد 30 يوم`);
      add(`lease-${u.id}`, u.tenant.until, "نهاية عقد", `عقد ${u.name} يخلص اليوم`);
    }
  }
  for (const doc of data.docs ?? []) if (doc.expires) add(`doc-${doc.id}`, shiftDay(doc.expires, -30), "وثيقة قربت تخلص", `«${doc.title}» تخلص بعد 30 يوم`);
  for (const c of data.cheques ?? []) if (c.state === "held") {
    const u = data.units.find((x) => x.id === c.unitId);
    add(`chq-${c.id}`, shiftDay(c.due, -1), "شيك موعده بكرة", u ? `شيك ${u.name} موعده بكرة — جهّز الإيداع` : "شيك موعده بكرة — جهّز الإيداع");
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || a.key.localeCompare(b.key)).slice(0, max);
}

// ── DW-043: تذكير المتأخرين (عربي/إنقليزي) والتقرير السنوي لكل عقار ────────────────
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** رسالة تذكير صريحة: المبلغ والأشهر، بدون تهديد. بلغة المستأجر (عربي افتراضياً) */
export function reminderText(unit: Unit, months: string[], amount: Fils) {
  if (unit.tenant?.lang === "en") {
    const ms = months.map((m) => `${MONTHS_EN[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`).join(", ");
    return `Hello ${unit.tenant?.name ?? ""}, a friendly reminder about the rent for ${unit.name} (${ms}): BHD ${fmt(amount)}. If you have already paid, please ignore this message. Thank you.`;
  }
  return `السلام عليكم ${unit.tenant?.name ?? ""}، تذكير بإيجار ${unit.name} (${months.map(monthAr).join("، ")}): ${fmt(amount)} د.ب. إذا تم الدفع تجاهل الرسالة، وشكراً.`;
}
/** رابط واتساب: رقم بحريني من 8 أرقام يفتح محادثته، وإلا يختار المستخدم المحادثة */
export function waLink(phone: string | undefined, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const to = digits.length === 8 ? `973${digits}` : digits.length === 11 && digits.startsWith("973") ? digits : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
export const reminderUrl = (unit: Unit, months: string[], amount: Fils) => waLink(unit.tenant?.phone, reminderText(unit, months, amount));

/** كل المتأخرين (بعد مهلة الاستحقاق)، الأكبر مبلغ أول */
export function remindList(data: Data, now = new Date()) {
  return data.units.filter((u) => u.tenant)
    .map((unit) => { const a = arrears(data, unit, now); return { unit, months: a.months.map((m) => m.month), amount: a.amount }; })
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.unit.name.localeCompare(b.unit.name));
}

/** سنة لكل عقار (مبنى): الدخل (ناقص الإشعارات الدائنة الجزئية)، المصروف المربوط بالعقار، الصافي، واللي ما اندفع من أشهر السنة لين اليوم */
export function yearReport(data: Data, year: number, now = new Date()) {
  const y = String(year);
  const refundOf = (pid: string) => (data.credits ?? []).filter((c) => c.amount && c.payment.id === pid).reduce((s, c) => s + (c.amount ?? 0), 0);
  const names = [...new Set(data.units.map((u) => u.building || "بدون مبنى"))];
  const rows = names.map((building) => {
    const units = data.units.filter((u) => (u.building || "بدون مبنى") === building);
    const ids = new Set(units.map((u) => u.id));
    const income = data.payments.filter((p) => ids.has(p.unitId) && p.month.startsWith(y)).reduce((s, p) => s + p.amount - refundOf(p.id), 0);
    const expense = data.expenses.filter((e) => e.building === building && e.date.startsWith(y)).reduce((s, e) => s + e.amount, 0);
    const owed = units.reduce((s, u) => s + owedMonths(data, u, now).filter((m) => m.month.startsWith(y)).reduce((a, m) => a + m.left, 0), 0);
    return { building, units: units.length, rented: units.filter((u) => u.tenant).length, income, expense, net: income - expense, owed };
  }).sort((a, b) => b.income - a.income || a.building.localeCompare(b.building));
  const unassigned = data.expenses.filter((e) => !e.building && e.date.startsWith(y)).reduce((s, e) => s + e.amount, 0);
  const sum = (k: "income" | "expense" | "net" | "owed") => rows.reduce((s, r) => s + r[k], 0);
  return { year, rows, unassigned, income: sum("income"), expense: sum("expense"), net: sum("net"), owed: sum("owed") };
}
