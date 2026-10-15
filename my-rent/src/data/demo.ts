// بيانات تجريبية — أسماء وأرقام وهمية (الهواتف مخفية عمداً). تنبدل بـ Supabase لما ينربط الكود الحقيقي.
import type { Data, Payment } from "./types";
import { monthKey, isoDay } from "./logic";

export function demoData(now = new Date()): Data {
  const y = now.getFullYear(), mo = now.getMonth();
  const mk = (back: number) => monthKey(new Date(y, mo - back, 1));
  const day = (back: number, d: number) => isoDay(new Date(y, mo - back, back === 0 ? Math.min(d, now.getDate()) : d));
  const m1 = mk(1), m2 = mk(2);
  let n = 0;
  const pay = (unitId: string, back: number, amount: number, method: Payment["method"], d: number): Payment =>
    ({ id: `p${++n}`, unitId, month: mk(back), amount, method, date: day(back, d) });

  return {
    trackFrom: m2,
    units: [
      { id: "u1", name: "شقة 1", building: "عمارة المالكية", rent: 180000, dueDay: 1, tenant: { name: "أحمد عبدالله", phone: "3xxx 1101", since: "2024-03" } },
      { id: "u2", name: "شقة 2", building: "عمارة المالكية", rent: 220000, dueDay: 5, tenant: { name: "يوسف محمد", phone: "3xxx 1102", since: "2025-01", until: isoDay(new Date(y, mo, now.getDate() + 20)), deposit: 220000 } },
      { id: "u3", name: "شقة 3", building: "عمارة المالكية", rent: 200000, dueDay: 1, tenant: { name: "عائلة سلمان", phone: "3xxx 1103", since: "2023-09", deposit: 200000 } },
      { id: "u4", name: "شقة 4", building: "عمارة المالكية", rent: 190000, dueDay: 10, tenant: { name: "خالد ناصر", phone: "3xxx 1104", since: "2025-06", until: isoDay(new Date(y + 1, 5, 30)) } },
      { id: "u5", name: "شقة 5", building: "عمارة المالكية", rent: 200000, dueDay: 28, tenant: { name: "مريم حسن", phone: "3xxx 1105", since: m1 } },
      { id: "u6", name: "محل 1", building: "شارع المالكية", rent: 450000, dueDay: 1, tenant: { name: "مطعم الريف", phone: "17xx 2201", since: "2022-11" } },
      { id: "u7", name: "محل 2", building: "شارع المالكية", rent: 380000, dueDay: 15 },
    ],
    payments: [
      // قبل شهرين: الكل دفع إلا شقة 3
      pay("u1", 2, 180000, "BenefitPay", 2), pay("u2", 2, 220000, "تحويل", 6), pay("u4", 2, 190000, "تحويل", 9), pay("u6", 2, 450000, "شيك", 1),
      // الشهر الماضي: شقة 2 وشقة 3 ما دفعوا
      pay("u1", 1, 180000, "BenefitPay", 1), pay("u4", 1, 190000, "تحويل", 11), pay("u5", 1, 200000, "نقد", 27), pay("u6", 1, 450000, "شيك", 2),
      // هالشهر
      pay("u1", 0, 180000, "BenefitPay", 1), pay("u4", 0, 190000, "تحويل", 3), pay("u6", 0, 450000, "شيك", 2),
    ],
    cats: [
      { id: "c1", name: "صيانة العقار", limit: 250000 },
      { id: "c2", name: "كهرباء وماء", limit: 180000 },
      { id: "c3", name: "البيت", limit: 400000 },
      { id: "c4", name: "سيارات", limit: 120000 },
      { id: "c5", name: "رسوم وحكومة", limit: 60000 },
    ],
    expenses: [
      { id: "e1", catId: "c1", label: "تصليح مكيف شقة 2", amount: 85000, date: day(0, 4) },
      { id: "e2", catId: "c2", label: "فاتورة EWA العمارة", amount: 162500, date: day(0, 6) },
      { id: "e3", catId: "c3", label: "مقاضي الشهر", amount: 210750, date: day(0, 2) },
      { id: "e4", catId: "c4", label: "تبديل زيت", amount: 18000, date: day(0, 8) },
      { id: "e5", catId: "c1", label: "دهان مدخل العمارة", amount: 190000, date: day(0, 9) },
    ],
    recurring: [
      { id: "r1", catId: "c2", label: "فاتورة EWA العمارة", amount: 162500 },
      { id: "r2", catId: "c3", label: "إنترنت البيت", amount: 22000 },
      { id: "r3", catId: "c3", label: "راتب العاملة", amount: 160000 },
    ],
    deposits: [],
    members: [
      { id: "m1", name: "الوالد" },
      { id: "m2", name: "أبو جعفر" },
      { id: "m3", name: "الوالدة" },
    ],
    bank: [
      { id: "b1", memberId: "m1", amount: 1500000, label: "رصيد افتتاحي", date: `${m2}-01` },
      { id: "b2", memberId: "m2", amount: 420000, label: "رصيد افتتاحي", date: `${m2}-01` },
      { id: "b3", memberId: "m3", amount: 650000, label: "رصيد افتتاحي", date: `${m2}-01` },
      { id: "b4", memberId: "m2", amount: -120000, label: "قرض: رسوم الجامعة", date: day(0, 3) },
      { id: "b5", memberId: "m1", amount: 300000, label: "إيداع من الإيجارات", date: day(0, 5) },
    ],
    accounts: [
      { id: "a1", title: "حساب الإيجارات", sub: "ينتهي 4021", value: 3240500 },
      { id: "a2", title: "حساب البيت", sub: "ينتهي 7718", value: 812250 },
      { id: "a3", title: "نقد بالبيت", sub: "آخر جرد قبل 3 أيام", value: 145000 },
    ],
    tasks: [
      { id: "t1", title: "صيانة مكيفات البيت", sub: "كل 6 شهور", done: false },
      { id: "t2", title: "تجديد استمارة السيارة", sub: "قبل نهاية الشهر", done: false },
      { id: "t3", title: "تنظيف خزان ماء العمارة", sub: "كل سنة", done: true },
    ],
    vendors: [
      { id: "v1", name: "فني مكيفات", service: "صيانة وتركيب", phone: "3xxx 4410" },
      { id: "v2", name: "سبّاك المالكية", service: "طوارئ 24 ساعة", phone: "3xxx 5520" },
      { id: "v3", name: "شركة الدهانات", service: "عقود سنوية", phone: "17xx 6630" },
    ],
  };
}

/** بداية نظيفة بعد «احذف كل البيانات» */
export function emptyData(now = new Date()): Data {
  return { trackFrom: monthKey(now), units: [], payments: [], cats: [], expenses: [], members: [], bank: [], accounts: [], tasks: [], vendors: [], recurring: [], deposits: [] };
}
