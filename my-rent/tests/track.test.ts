// منطق ملف متابعة الإيجار (DW-022): npm run test:track
import { docStatus, docsList, docAlerts, kindOf, nextUnpaid, paidThrough, prepaid, rentTracker, statement, trackerTotals, monthKey } from "../src/data/logic";
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

console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات المتابعة نجحت");
process.exit(failed ? 1 : 0);
