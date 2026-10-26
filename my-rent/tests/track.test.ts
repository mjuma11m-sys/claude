// منطق ملف متابعة الإيجار (DW-022): npm run test:track
import { vatSummary, creditLabel, isCommercial, vatSplit, validTrn, nextInvoiceNo, invoiceLabel, describeAction, buildIcs, chequeSeries, chequesDue, billsDue, collection, monthlyReport, addMonthsDay, renewUnit, rentAt, upcomingRent, owedMonths, docStatus, docsList, docAlerts, kindOf, nextUnpaid, paidThrough, prepaid, rentTracker, statement, trackerTotals, monthKey } from "../src/data/logic";
import { reducer } from "../src/data/store";
import { creditable } from "../src/data/reducer";
import { demoData } from "../src/data/demo";
import { exportSheets, planImport, trackerSheet, TRACK_HEAD } from "../src/data/excel";
import type { Data, Unit } from "../src/data/types";
import { onBack, handleBack } from "../src/back";
import { reminderId, reminderAt } from "../src/notify";
import { planReminders, remindList, reminderText, waLink, yearReport } from "../src/data/logic";

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

// 12) DW-030: وصف أحداث سجل النشاط
ok(describeAction({ type: "pay", payment: { unitId: "u2", month: "2026-10", amount: 220000 } }, d) === "سجّل دفعة شقة 2 · أكتوبر · 220.000 د.ب", "سجل النشاط: دفعة", describeAction({ type: "pay", payment: { unitId: "u2", month: "2026-10", amount: 220000 } }, d));
ok(describeAction({ type: "cheque", cheque: { number: "000101", unitId: "u6", state: "deposited" } }, d).includes("مودع") && describeAction({ type: "something-new" }, d) === "تعديل", "سجل النشاط: شيك + حدث مجهول");

// 13) DW-035: الفاتورة الضريبية
{
  for (const g of [450000, 100000, 1, 333333, 0]) { const { net, vat } = vatSplit(g); ok(net + vat === g && Number.isInteger(net) && Math.abs(vat - net * 0.1) <= 1, `VAT: ${g} = ${net} + ${vat}`); }
  ok(vatSplit(450000).net === 409091 && vatSplit(450000).vat === 40909, "VAT: 450.000 شامل = 409.091 + 40.909");
  ok(validTrn("200012345600003") && !validTrn("12345") && !validTrn("20001234560000a"), "الرقم الضريبي 15 رقم");
  const shop = d.units.find((u) => u.id === "u6")!, flat = d.units.find((u) => u.id === "u1")!;
  ok(isCommercial(shop) && !isCommercial(flat) && isCommercial({ ...flat, kind: "store" }) && isCommercial({ ...flat, kind: "nursery" }) && !isCommercial({ ...flat, kind: "house" }), "التجاري (محل/مخزن/روضة) عليه VAT، والسكني معفى");
  let v = reducer(d, { type: "vat", vat: { trn: "200012345600003", name: "س", address: "ع" } });
  const pid = v.payments[0].id;
  v = reducer(v, { type: "invoice", paymentId: pid, no: nextInvoiceNo(v) });
  const first = v.payments.find((p) => p.id === pid)!.inv;
  v = reducer(v, { type: "invoice", paymentId: pid, no: 99 });
  ok(first === 1 && v.payments.find((p) => p.id === pid)!.inv === 1 && nextInvoiceNo(v) === 2, "رقم الفاتورة ينحفظ مرة وحدة، والتالي = 2");
  ok(describeAction({ type: "invoice", paymentId: "x", no: 3 }, d) === "طلّع فاتورة ضريبية INV-000003" && describeAction({ type: "vat" }, d) === "أوقف الفاتورة الضريبية", "سجل النشاط: الفاتورة الضريبية");
  ok(invoiceLabel(12) === "INV-000012" && reducer(v, { type: "vat" }).vat === undefined, "صيغة الرقم + الإيقاف يمسح الإعداد");
}

// 14) DW-036: الإشعار الدائن + تصادم الأرقام + ملخص الضريبة
{
  const P = (id: string, month: string, date: string) => ({ id, unitId: "u6", month, amount: 450000, method: "تحويل" as const, date });
  let v: Data = { ...d, payments: [...d.payments, P("x1", "2027-01", "2027-01-02"), P("x2", "2027-04", "2027-04-02"), P("x3", "2027-05", "2027-05-02")], vat: { trn: "200012345600003", name: "س", address: "ع" } };
  v = reducer(v, { type: "invoice", paymentId: "x1", no: 1 });
  v = reducer(v, { type: "invoice", paymentId: "x2", no: 2 });
  // تصادم: جهاز ثاني طلّع رقم 2 لدفعة ثانية بنفس الوقت ← ياخذ 3
  v = reducer(v, { type: "invoice", paymentId: "x3", no: 2 });
  ok(v.payments.find((p) => p.id === "x3")!.inv === 3, "تصادم رقم الفاتورة: الثانية تاخذ أول رقم فاضي (3)");
  const plain = reducer(v, { type: "unpay", id: v.payments[0].id, at: "2027-06-01" });
  ok(!plain.credits?.length, "حذف دفعة بدون فاتورة: ما يطلع إشعار دائن");
  v = reducer(v, { type: "unpay", id: "x2", at: "2027-07-10" });
  const cn = v.credits?.[0];
  ok(!!cn && cn.no === 1 && cn.payment.inv === 2 && cn.date === "2027-07-10" && cn.tenant === "مطعم الريف" && !v.payments.some((p) => p.id === "x2"), "حذف دفعة عليها فاتورة: إشعار دائن CN-000001 يخص INV-000002");
  ok(nextInvoiceNo(v) === 4, "رقم الفاتورة المحذوفة ما ينعاد (التالي 4)");
  v = reducer(v, { type: "unimport", restore: [], unitIds: [], paymentIds: ["x3"], expenseIds: [], catIds: [], at: "2027-07-11" });
  ok(v.credits?.length === 2 && v.credits[1].no === 2 && v.credits[1].payment.inv === 3, "التراجع عن استيراد: الدفعة المفوترة تطلع لها إشعار دائن");
  const sm = vatSummary(v, 2027);
  ok(sm.rows[0].invoices === 1 && sm.rows[1].invoices === 2 && sm.rows[1].vat === 81818 && sm.rows[2].credits === 2 && sm.rows[2].vat === -81818 && sm.vat === 40909, "ملخص الضريبة: 3 فواتير (حتى الملغاة) ناقص إشعارين = 40.909", JSON.stringify(sm.rows.map((r) => r.vat)));
  const sheet = exportSheets(v).find((x) => x.sheet === "الضريبة");
  ok(!!sheet && sheet.data.length === 1 + 3 + 2 && creditLabel(1) === "CN-000001", "Excel: صفحة «الضريبة» فيها الفواتير الثلاث والإشعارين");
  ok(!exportSheets(d).some((x) => x.sheet === "الضريبة"), "Excel: بدون فواتير ما تطلع صفحة الضريبة");
}

// 15) DW-037: إشعار دائن جزئي — الدفعة تبقى والشهر مسدد، والدخل ينقص
{
  const m = monthKey(new Date());
  let v: Data = { ...d, payments: [...d.payments, { id: "y1", unitId: "u6", month: m, amount: 450000, method: "تحويل", date: `${m}-02` }], vat: { trn: "200012345600003", name: "س", address: "ع" } };
  const inc0 = monthlyReport(v).rows.at(-1)!.income; // eslint-disable-line
  v = reducer(v, { type: "invoice", paymentId: "y1", no: nextInvoiceNo(v) });
  const invNo = v.payments.find((p) => p.id === "y1")!.inv!;
  ok(v.payments.find((p) => p.id === "y1")!.invAmount === 450000, "الفاتورة تحفظ مبلغها الأصلي");
  v = reducer(v, { type: "credit", paymentId: "y1", amount: 50000, at: `${m}-20` });
  const y1 = v.payments.find((p) => p.id === "y1")!;
  ok(y1.amount === 450000 && v.credits?.length === 1 && v.credits[0].amount === 50000 && creditable(v, y1) === 400000, "جزئي 50: الدفعة تبقى 450 والباقي للإشعار 400");
  ok(statement(v, v.units.find((u) => u.id === "u6")!).rows.find((r) => r.month === m)!.state === "paid", "جزئي: الشهر يبقى مسدد (ما يطلع متأخر)");
  ok(monthlyReport(v).rows.at(-1)!.income === inc0 - 50000, "جزئي: دخل الشهر ينقص 50");
  v = reducer(v, { type: "credit", paymentId: "y1", amount: 400000, at: `${m}-25` });
  ok(!v.payments.some((p) => p.id === "y1") && v.credits?.length === 2 && v.credits[1].amount === 400000 && v.credits[1].payment.inv === invNo, "الباقي كله: إشعار بـ 400 والدفعة تنلغي");
  ok(monthlyReport(v).rows.at(-1)!.income === inc0 - 450000, "بعد الإلغاء: ما ينخصم مرتين");
  const yr = Number(m.slice(0, 4));
  const q = vatSummary(v, yr); const qi = Math.floor((Number(m.slice(5, 7)) - 1) / 3);
  ok(q.rows[qi].credits === 2 && q.rows[qi].vat === 40909 - vatSplit(50000).vat - vatSplit(400000).vat, "ملخص الربع: الفاتورة ناقص الإشعارين", String(q.rows[qi].vat));
  ok(describeAction({ type: "credit", amount: 50000 }, d) === "إشعار دائن 50.000 د.ب", "سجل النشاط: الإشعار الدائن");
}

// 16) DW-040: زر الرجوع بأندرويد — آخر نافذة انفتحت تنسكّر أول، وبعدها رجوع، وبعدها تصغير
{
  const closed: string[] = [];
  const offA = onBack(() => closed.push("A"));
  const offB = onBack(() => closed.push("B"));
  ok(handleBack(true) === "closed" && closed.join() === "B", "الرجوع يسكّر آخر نافذة انفتحت");
  offB();
  ok(handleBack(true) === "closed" && closed.join() === "B,A", "بعدها النافذة اللي تحتها");
  offA(); offA();
  ok(handleBack(true) === "back" && handleBack(false) === "minimize", "بدون نوافذ: رجوع، وبالشاشة الأولى تصغير");
}

// 17) DW-042: تذكيرات الجوال — خلال 60 يوم، أقربها أول، بدون مبالغ ولا أسماء، والمدفوع مقدماً ما يتذكّر
{
  const plan = planReminders(d, now);
  const today = "2026-10-15", end = "2026-12-14";
  ok(plan.length > 0 && plan.length <= 60 && plan.every((r, i) => r.day >= today && r.day <= end && (i === 0 || plan[i - 1].day <= r.day)), "التذكيرات خلال 60 يوم ومرتبة", String(plan.length));
  const names = d.units.flatMap((u) => u.tenant ? [u.tenant.name] : []);
  const text = plan.map((r) => r.title + " " + r.body).join(" | ");
  ok(!/د\.ب|\d+\.\d{3}/.test(text) && !names.some((n) => text.includes(n)), "شاشة القفل: بدون مبالغ ولا أسماء مستأجرين");
  const u = d.units.find((x) => x.tenant && (!x.tenant.until || x.tenant.until > "2026-12-31"))!;
  const nov = "2026-11", key = `rent-${u.id}-${nov}`;
  ok(plan.some((r) => r.key === key && r.day === `${nov}-${String(Math.min(u.dueDay, 30)).padStart(2, "0")}`), "تذكير إيجار الشهر الجاي بيوم الاستحقاق");
  const pre = reducer(d, { type: "pay", payment: { id: "pre-nov", unitId: u.id, month: nov, amount: rentAt(u, nov), method: "cash", date: "2026-10-15" } });
  ok(!planReminders(pre, now).some((r) => r.key === key), "دفع مقدماً: تذكير الشهر ينشال");
  const chq = { id: "c-rem", unitId: u.id, number: "777", bank: "BBK", amount: 100000, due: "2026-11-20", state: "held" as const };
  const withChq = planReminders({ ...d, cheques: [...(d.cheques ?? []), chq] }, now).find((r) => r.key === "chq-c-rem");
  ok(withChq?.day === "2026-11-19" && !withChq.body.includes("777"), "الشيك: قبل يوم، بدون رقم الشيك");
  ok(planReminders(d, now, 3650, 60).length === 60, "الحد 60 (أبل تسمح 64 معلّق)");
  const ids = plan.map((r) => reminderId(r.key));
  ok(ids.every((x) => x > 0 && Number.isInteger(x)) && new Set(ids).size === ids.length && reminderId(plan[0].key) === ids[0], "رقم ثابت ومختلف لكل تذكير");
  const at = reminderAt("2026-11-01");
  ok(at.getHours() === 9 && at.getDate() === 1 && at.getMonth() === 10, "الساعة 9 الصبح بتوقيت الجوال");
}

// 18) DW-043: ذكّر المتأخرين + بالإنقليزي + التقرير السنوي لكل عقار
{
  const list = remindList(d, now);
  ok(list.length > 0 && list.every((x, i) => x.amount > 0 && (i === 0 || list[i - 1].amount >= x.amount)), "قائمة المتأخرين: كلهم عليهم مبلغ، الأكبر أول", String(list.length));
  ok(list.every((x) => x.months.length > 0 && (!x.months.includes(cur) || now.getDate() > x.unit.dueDay + 5)), "الشهر الحالي ما يدخل قبل المهلة");
  const u = list[0].unit;
  const ar = reminderText(u, list[0].months, list[0].amount);
  const en = reminderText({ ...u, tenant: { ...u.tenant!, lang: "en" } }, list[0].months, list[0].amount);
  ok(ar.startsWith("السلام عليكم") && ar.includes("د.ب"), "التذكير بالعربي افتراضياً");
  ok(en.startsWith("Hello") && en.includes("BHD") && !/[\u0600-\u06FF]/.test(en.replace(u.name, "").replace(u.tenant!.name, "")), "التذكير بالإنقليزي: بدون عربي غير الأسماء");
  ok(waLink("3600 1122", "x").startsWith("https://wa.me/97336001122?") && waLink("+973 3600 1122", "x").startsWith("https://wa.me/97336001122?") && waLink("", "x").startsWith("https://wa.me/?"), "رابط واتساب: 8 أرقام أو 973 + 8، وإلا يختار المحادثة");
  const yr = 2026;
  const r = yearReport(d, yr, now);
  const inc = d.payments.filter((p) => p.month.startsWith("2026")).reduce((s2, p) => s2 + p.amount, 0);
  ok(r.income === inc && r.rows.reduce((s2, x) => s2 + x.income, 0) === inc, "دخل السنة = مجموع دفعات السنة، موزّع على العقارات", `${r.income}/${inc}`);
  const b = d.units[0].building;
  const withExp = { ...d, expenses: [...d.expenses, { id: "yx", catId: d.cats[0].id, label: "صيانة", amount: 30000, date: "2026-05-02", building: b }] };
  const r2 = yearReport(withExp, yr, now);
  ok(r2.rows.find((x) => x.building === b)!.expense === r.rows.find((x) => x.building === b)!.expense + 30000 && r2.unassigned === r.unassigned, "مصروف مربوط بعقار يدخل صفّه بس");
  ok(r.unassigned === d.expenses.filter((e) => !e.building && e.date.startsWith("2026")).reduce((s2, e) => s2 + e.amount, 0), "المصروف غير المربوط ينعرض لحاله");
  ok(r.owed === d.units.reduce((s2, x) => s2 + owedMonths(d, x, now).filter((m) => m.month.startsWith("2026")).reduce((a, m) => a + m.left, 0), 0), "ما اندفع = المتبقي من أشهر السنة");
  ok(yearReport(d, 2019, now).income === 0, "سنة بدون بيانات = صفر");
}

console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات المتابعة نجحت");
process.exit(failed ? 1 : 0);
