// بيانات تجريبية — أسماء وأرقام وهمية. تنبدل بـ Supabase لما ينربط الكود الحقيقي.
import type { Data } from "./types";
import { monthKey, isoDay } from "./logic";

export function demoData(now = new Date()): Data {
  const m = monthKey(now);
  const prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const d = (day: number) => isoDay(new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate())));
  return {
    units: [
      { id: "u1", name: "شقة 1", building: "عمارة المالكية", rent: 180000, dueDay: 1, tenant: { name: "أحمد عبدالله", phone: "3xxx 1101", since: "2024-03" } },
      { id: "u2", name: "شقة 2", building: "عمارة المالكية", rent: 220000, dueDay: 5, tenant: { name: "يوسف محمد", phone: "3xxx 1102", since: "2025-01" } },
      { id: "u3", name: "شقة 3", building: "عمارة المالكية", rent: 200000, dueDay: 1, tenant: { name: "عائلة سلمان", phone: "3xxx 1103", since: "2023-09" } },
      { id: "u4", name: "شقة 4", building: "عمارة المالكية", rent: 190000, dueDay: 10, tenant: { name: "خالد ناصر", phone: "3xxx 1104", since: "2025-06" } },
      { id: "u5", name: "شقة 5", building: "عمارة المالكية", rent: 200000, dueDay: 28, tenant: { name: "مريم حسن", phone: "3xxx 1105", since: "2026-02" } },
      { id: "u6", name: "محل 1", building: "شارع المالكية", rent: 450000, dueDay: 1, tenant: { name: "مطعم الريف", phone: "17xx 2201", since: "2022-11" } },
      { id: "u7", name: "محل 2", building: "شارع المالكية", rent: 380000, dueDay: 15 },
    ],
    payments: [
      { id: "p1", unitId: "u1", month: m, amount: 180000, method: "BenefitPay", date: d(1) },
      { id: "p2", unitId: "u4", month: m, amount: 190000, method: "تحويل", date: d(3) },
      { id: "p3", unitId: "u6", month: m, amount: 450000, method: "شيك", date: d(2) },
      { id: "p4", unitId: "u1", month: prev, amount: 180000, method: "BenefitPay", date: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 2)) },
      { id: "p5", unitId: "u3", month: prev, amount: 200000, method: "نقد", date: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 6)) },
    ],
    cats: [
      { id: "c1", name: "صيانة العقار", limit: 250000 },
      { id: "c2", name: "كهرباء وماء", limit: 180000 },
      { id: "c3", name: "البيت", limit: 400000 },
      { id: "c4", name: "سيارات", limit: 120000 },
      { id: "c5", name: "رسوم وحكومة", limit: 60000 },
    ],
    expenses: [
      { id: "e1", catId: "c1", label: "تصليح مكيف شقة 2", amount: 85000, date: d(4) },
      { id: "e2", catId: "c2", label: "فاتورة EWA العمارة", amount: 162500, date: d(6) },
      { id: "e3", catId: "c3", label: "مقاضي الشهر", amount: 210750, date: d(2) },
      { id: "e4", catId: "c4", label: "تبديل زيت", amount: 18000, date: d(8) },
      { id: "e5", catId: "c1", label: "دهان مدخل العمارة", amount: 190000, date: d(9) },
    ],
    members: [
      { id: "m1", name: "الوالد" },
      { id: "m2", name: "أبو جعفر" },
      { id: "m3", name: "الوالدة" },
    ],
    bank: [
      { id: "b1", memberId: "m1", amount: 1500000, label: "رصيد افتتاحي", date: "2026-01-01" },
      { id: "b2", memberId: "m2", amount: 420000, label: "رصيد افتتاحي", date: "2026-01-01" },
      { id: "b3", memberId: "m3", amount: 650000, label: "رصيد افتتاحي", date: "2026-01-01" },
      { id: "b4", memberId: "m2", amount: -120000, label: "قرض: رسوم الجامعة", date: d(3) },
      { id: "b5", memberId: "m1", amount: 300000, label: "إيداع من الإيجارات", date: d(5) },
    ],
    wallet: [
      { id: "w1", title: "حساب الإيجارات", sub: "بنك محلي · ينتهي 4021", value: 3240500 },
      { id: "w2", title: "حساب البيت", sub: "بنك محلي · ينتهي 7718", value: 812250 },
      { id: "w3", title: "نقد بالبيت", sub: "آخر جرد قبل 3 أيام", value: 145000 },
    ],
    travel: [
      { id: "t1", title: "عمرة العائلة", sub: "ديسمبر · 5 أشخاص", value: 1350000, tag: { label: "حجز ناقص", tone: "due" } },
      { id: "t2", title: "دبي · ويكند", sub: "فبراير", value: 420000, tag: { label: "مخطط", tone: "paid" } },
    ],
    house: [
      { id: "h1", title: "صيانة مكيفات البيت", sub: "كل 6 شهور · آخر مرة أبريل", tag: { label: "متأخر", tone: "late" } },
      { id: "h2", title: "تجديد استمارة السيارة", sub: "بعد 12 يوم", tag: { label: "قريب", tone: "due" } },
      { id: "h3", title: "تنظيف خزان الماء", sub: "تم الشهر الماضي", tag: { label: "تم", tone: "paid" } },
    ],
    vendors: [
      { id: "v1", title: "فني مكيفات", sub: "صيانة وتركيب · 3xxx 4410" },
      { id: "v2", title: "سبّاك المالكية", sub: "طوارئ 24 ساعة · 3xxx 5520" },
      { id: "v3", title: "شركة الدهانات", sub: "عقود سنوية · 17xx 6630" },
    ],
  };
}
