// منطق ملف متابعة الإيجار (DW-022): npm run test:track
import { buildIcs, chequeSeries, chequesDue, billsDue, collection, monthlyReport, addMonthsDay, renewUnit, rentAt, upcomingRent, owedMonths, docStatus, docsList, docAlerts, kindOf, nextUnpaid, paidThrough, prepaid, rentTracker, statement, trackerTotals, monthKey } from "../src/data/logic";
import { reducer } from "../src/data/store";
import { demoData } from "../src/data/demo";
import { planImport, trackerSheet, TRACK_HEAD } from "../src/data/excel";
import type { Data, Unit } from "../src/data/types";

let failed = 0;
const ok = (c: boolean, name: string, extra = "") => { console.log(`${c ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); if (!c) failed++; };
const now = new Date(2026, 9, 15);
const add = (k: string, n: number) => monthKey(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1 + n, 1));
const cur = monthKey(now);
const d = demoData(now);
const rows = rentTracker(d, now);

// 1) المتبقي = كشف الحساب لكل وحدة، والمستحق = المسدد + المتبقي
ok(rows.every((r) => { const s = statement(d, r.unit, now); return r.left === s.late + s.due && r.due === r.paid + r.left; }), "المتبقي يطابق كشف الحساب لكل وحدة");
const t = trackerTotals(rows);
ok(t.units === 7 && t.rented === 6 && t.due === t.paid + t.left, "المجاميع متسقة", JSON.stringify(t));

// 2) المقدم: المحل دافع 3 أشهر بعد هالشهر
const shop = rows.find((r) => r.unit.id === "u6")!;
ok(shop.ahead === 3 && shop.aheadAmount === 1350000 && shop.through === add(cur, 3) && shop.left === 0, "المحل: 3 أشهر مقدم ومدفوع لين +3", `${shop.ahead} ${shop.through}`);
ok(shop.paid <= shop.due, "المقدم ما يدخل بالمسدد لين هالشهر");

// 3) شقة 3 متأخرة: «مدفوع لين» فاضي والدفعة المقدمة تسدد المتأخر أول
const u3 = d.units.find((u) => u.id === "u3")!;
ok(paidThrough(d, u3, now) === null, "متأخر من البداية: مدفوع لين = —");
const nx = nextUnpaid(d, u3, 3, now);
ok(nx[0] < cur || nx[0] === d.trackFrom, "الدفعة المقدمة تبدأ بأقدم شهر ما اندفع", nx.join());

// 4) دفعة مقدمة 6 أشهر لشقة 1 (مدفوعة لين هالشهر) ثم التراجع
const u1 = d.units.find((u) => u.id === "u1")!;
const ms = nextUnpaid(d, u1, 6, now);
ok(ms[0] === add(cur, 1) && ms[5] === add(cur, 6), "شقة 1: الستة أشهر تبدأ الشهر الجاي", ms.join());
let s2: Data = d;
ms.forEach((month, i) => { s2 = reducer(s2, { type: "pay", payment: { id: "x" + i, unitId: "u1", month, amount: u1.rent, method: "تحويل", date: "2026-10-15" } }); });
ok(prepaid(s2, u1, now).months.length === 6 && paidThrough(s2, u1, now) === add(cur, 6), "بعد الدفعة: 6 أشهر مقدم ومدفوع لين +6");
ms.forEach((_, i) => { s2 = reducer(s2, { type: "unpay", id: "x" + i }); });
ok(prepaid(s2, u1, now).months.length === 0 && paidThrough(s2, u1, now) === cur, "التراجع يرجّعها صفر");

// 5) نوع العقار: المحفوظ أول، وإلا من الاسم
const k = (name: string, kind?: Unit["kind"]) => kindOf({ id: "z", name, building: "", rent: 1, dueDay: 1, kind });
ok(k("محل 2") === "shop" && k("ستور 1") === "store" && k("روضة الأمل") === "nursery" && k("بيت الحد") === "house" && k("شقة 5") === "flat" && k("شقة 5", "store") === "store", "kindOf");

// 6) حالة العقد
const dl = (u: string) => rows.find((r) => r.unit.id === u)!;
ok(dl("u2").lease === "soon" && dl("u4").lease === "active" && dl("u1").lease === "open" && dl("u7").lease === "vacant", "حالة العقد: قريبة/سارية/بدون نهاية/شاغرة");

// 7) Excel: صفحة المتابعة بدون هواتف + عمود النوع بالاستيراد
const sh = trackerSheet(d, now);
ok(sh.data[0].length === TRACK_HEAD.length && sh.data.length === d.units.length + 2 && !JSON.stringify(sh).includes("3xxx"), "صفحة المتابعة: كل الوحدات + المجموع وبدون هواتف");
const plan = planImport([{ sheet: "الوحدات", data: [["الوحدة", "النوع", "الإيجار"], ["ستور 9", "ستور", 90], ["روضة 1", "روضه", 900], ["x", "قصر", 1]] }], d, now);
ok(plan.units.find((u) => u.name === "ستور 9")?.kind === "store" && plan.units.find((u) => u.name === "روضة 1")?.kind === "nursery" && plan.errors.some((e) => e.msg.includes("النوع")), "استيراد النوع + خطأ للنوع الغلط");

// 8) DW-023: حالة الوثائق على الحدود + الترتيب + التنبيه + العدادات بالاستيراد
const doc = (expires?: string) => ({ id: "x", kind: "cr" as const, title: "x", expires });
const at = (n: number) => { const x = new Date(now); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
ok(docStatus(doc(at(30)), now).state === "soon" && docStatus(doc(at(31)), now).state === "active" && docStatus(doc(at(0)), now).state === "soon" && docStatus(doc(at(-1)), now).state === "ended" && docStatus(doc(), now).state === "open", "حالة الوثيقة: 30 قريبة · 31 سارية · 0 قريبة · -1 منتهية · بدون");
const dl2 = docsList(d, now);
ok(dl2[0].state === "ended" && dl2[dl2.length - 1].state === "open" && docAlerts(d, now).length === 2, "الترتيب: المنتهية أول والبدون آخر · تنبيهين بالتجريبي", dl2.map((x) => x.state).join());
let s3: Data = reducer(d, { type: "doc", doc: { id: "d9", kind: "insurance", title: "تأمين", expires: at(10) } });
s3 = reducer(s3, { type: "doc", doc: { id: "d9", kind: "insurance", title: "تأمين معدّل", expires: at(10) } });
ok(s3.docs!.filter((x) => x.id === "d9").length === 1 && s3.docs!.find((x) => x.id === "d9")!.title === "تأمين معدّل", "doc: إضافة ثم تعديل بدون تكرار");
ok(reducer(s3, { type: "undoc", id: "d9" }).docs!.length === d.docs!.length, "undoc يحذف");
ok(reducer({ ...d, docs: undefined }, { type: "doc", doc: { id: "a", kind: "cr", title: "a" } }).docs!.length === 1, "بيانات قديمة بدون docs");
const p2 = planImport([{ sheet: "الوحدات", data: [["الوحدة", "الإيجار", "عداد الكهرباء", "عداد الماء"], ["شقة 77", 100, "123456", 987]] }], d, now);
const m77 = p2.units.find((u) => u.name === "شقة 77")?.meters;
ok(m77?.elec === "123456" && m77?.water === "987", "استيراد العدادات", JSON.stringify(m77));

// 9) DW-024: تجديد مع زيادة — الماضي ما يتغيّر والمستقبل بالإيجار الجديد
{
  const u2 = d.units.find((u) => u.id === "u2")!; // عقده ينتهي بعد 20 يوم، وعليه متأخرات
  const before = statement(d, u2, now);
  const from = add(cur, 1);
  const r = renewUnit(u2, addMonthsDay(u2.tenant!.until!, 12), 240000, from);
  const d2: Data = reducer(d, { type: "unit", unit: r });
  const ru = d2.units.find((u) => u.id === "u2")!;
  const after = statement(d2, ru, now);
  ok(JSON.stringify(before) === JSON.stringify(after), "التجديد مع زيادة: كشف الأشهر الفايتة ما تغيّر");
  ok(rentAt(ru, cur) === 220000 && rentAt(ru, from) === 240000 && rentAt(ru, "2025-01") === 220000, "rentAt: قبل 220 · من الشهر الجاي 240");
  ok(upcomingRent(ru, now)?.rent === 240000 && upcomingRent(ru, now)?.from === from, "الزيادة الجاية تبين");
  ok(owedMonths(d2, ru, new Date(now.getFullYear(), now.getMonth() + 1, 20)).find((x) => x.month === from)?.left === 240000, "الشهر الجاي يُطلب بـ 240");
  const nu = nextUnpaid(d2, { ...ru }, 3, new Date(now.getFullYear(), now.getMonth(), 15));
  ok(nu.length === 3, "nextUnpaid يشتغل مع السجل");
  ok(addMonthsDay("2026-01-31", 1) === "2026-02-28" && addMonthsDay("2026-11-04", 12) === "2027-11-04", "addMonthsDay");
  const same = renewUnit(u2, "2027-12-31", u2.rent, from);
  ok(!same.rentBefore && same.tenant!.until === "2027-12-31", "تجديد بدون زيادة: ما ينضاف سجل");
}

// 10) DW-026: الفواتير منفصلة عن الإيجار والدخل
{
  const u3 = d.units.find((u) => u.id === "u3")!;
  ok(billsDue(d, u3).amount === 67050 && billsDue(d, d.units.find((u) => u.id === "u1")!).amount === 0, "فواتير غير مسددة: شقة 3 = 67.050 · شقة 1 = 0");
  const noBills: Data = { ...d, bills: [] };
  ok(JSON.stringify(rentTracker(d, now).map((r) => [r.due, r.paid, r.left])) === JSON.stringify(rentTracker(noBills, now).map((r) => [r.due, r.paid, r.left]))
    && JSON.stringify(collection(d, now)) === JSON.stringify(collection(noBills, now)) && JSON.stringify(monthlyReport(d, now)) === JSON.stringify(monthlyReport(noBills, now)), "الفواتير ما تغيّر المستحق ولا التحصيل ولا الدخل");
  ok(rentTracker(d, now).find((r) => r.unit.id === "u3")!.bills === 67050 && trackerTotals(rentTracker(d, now)).bills === 67050, "المتابعة: عمود ومجموع الفواتير");
  const paid = reducer(d, { type: "bill", bill: { ...d.bills!.find((b) => b.id === "b3")!, paid: true } });
  ok(billsDue(paid, u3).amount === 35250 && paid.bills!.length === d.bills!.length, "مسددة: تنقص من غير المسددة بدون تكرار");
  ok(reducer(d, { type: "unbill", id: "b4" }).bills!.length === d.bills!.length - 1 && reducer({ ...d, bills: undefined }, { type: "bill", bill: { id: "z", unitId: "u1", month: cur, kind: "ewa", amount: 1, paid: false } }).bills!.length === 1, "unbill + بيانات قديمة بدون bills");
}

// 11) DW-029: الشيكات + ملف التقويم
{
  const ser = chequeSeries({ number: "000099", bank: "BBK", amount: 450000, due: "2026-01-31" }, 12);
  ok(ser.length === 12 && ser[1].number === "000100" && ser[11].number === "000110" && ser[1].due === "2026-02-28" && ser[11].due === "2026-12-31", "سلسلة 12 شيك: الرقم والتاريخ", `${ser[1].number} ${ser[1].due}`);
  ok(chequeSeries({ number: "A12", bank: "", amount: 1, due: "2026-03-01" }, 2)[1].number === "A12-2", "رقم مو أرقام: لاحقة");
  const due = chequesDue(d, now);
  ok(due.length === 1 && due[0].cheque.id === "q1" && due[0].left === 3, "شيكات تستحق خلال 7 أيام: واحد (باقي 3)");
  const held: Data = d;
  ok(JSON.stringify(rentTracker(held, now).map((r) => r.paid)) === JSON.stringify(rentTracker({ ...d, cheques: [] }, now).map((r) => r.paid)), "الشيك «عندي» ما يغيّر المسدد");
  const ics = buildIcs(d, now);
  const lines = ics.text.split("\r\n");
  ok(ics.text.startsWith("BEGIN:VCALENDAR\r\n") && ics.text.endsWith("END:VCALENDAR\r\n") && (ics.text.match(/BEGIN:VEVENT/g) ?? []).length === ics.count, "ICS: بنية صحيحة", String(ics.count));
  ok(ics.count === 6 + 2 + 4 + 2, "ICS: 6 إيجارات + 2 عقود + 4 وثائق بتاريخ + 2 شيكات", String(ics.count));
  ok(lines.every((l) => new TextEncoder().encode(l).length <= 75), "ICS: كل سطر ≤ 75 بايت");
  ok(ics.text.includes("RRULE:FREQ=MONTHLY") && ics.text.includes("TRIGGER:-P30D") && ics.text.includes("TRIGGER:-P1D"), "ICS: تكرار شهري + تنبيهات 30 يوم ويوم");
}

console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات المتابعة نجحت");
process.exit(failed ? 1 : 0);
