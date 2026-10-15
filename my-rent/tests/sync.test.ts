// اختبار محرّك المزامنة (DW-018) بسيرفر وهمي بالذاكرة: npm run test:sync
import { SyncEngine, checkKey, checkUrl, type Pending, type Remote, type Row, type SyncAction } from "../src/data/sync";
import { reducer } from "../src/data/store";
import { demoData, emptyData } from "../src/data/demo";
import type { Data } from "../src/data/types";

let failed = 0;
const ok = (c: boolean, name: string, extra = "") => { console.log(`${c ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); if (!c) failed++; };

/** سيرفر وهمي: نفس قواعد الجدول (id تصاعدي، client_id ما يتكرر بنفس العائلة) */
class FakeServer {
  rows: (Row & { family: string })[] = [];
  down = false;
  listeners: (() => void)[] = [];
  remote(): Remote {
    return {
      pull: async (f, after) => { if (this.down) throw new Error("Failed to fetch"); return this.rows.filter((r) => r.family === f && r.id > after).map(({ family, ...r }) => r); },
      push: async (f, ev: Pending) => {
        if (this.down) throw new Error("Failed to fetch");
        if (this.rows.some((r) => r.family === f && r.client_id === ev.client_id)) return; // 23505
        this.rows.push({ id: this.rows.length + 1, family: f, client_id: ev.client_id, action: JSON.parse(JSON.stringify(ev.action)) });
        queueMicrotask(() => this.listeners.forEach((l) => l()));
      },
      subscribe: (_f, cb) => { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter((l) => l !== cb); }; },
    };
  }
}

class MemStorage implements Storage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

const R = reducer as (s: Data, a: SyncAction) => Data;
const device = (srv: FakeServer, store = new MemStorage()) => {
  const views: Data[] = [];
  const e = new SyncEngine(srv.remote(), "fam1", R, emptyData(), (v) => views.push(v), store);
  return { e, store, views };
};
const settle = () => new Promise((r) => setTimeout(r, 20));
const same = (a: Data, b: Data) => JSON.stringify(a) === JSON.stringify(b);

const srv = new FakeServer();
const A = device(srv), B = device(srv);
await A.e.start(); await B.e.start();

// 1) أول جهاز يرفع بياناته، والثاني يستلمها
A.e.local({ type: "replace", data: demoData() });
await settle(); await B.e.sync();
ok(same(A.e.view, B.e.view) && B.e.view.units.length === demoData().units.length, "الجهاز الثاني يستلم بيانات الأول");
ok(srv.rows.length === 1, "حدث واحد بالسيرفر");

// 2) تعديلين من جهازين بنفس الوقت: الاثنين يتطابقون ويحتفظون بالتعديلين
A.e.local({ type: "pay", payment: { id: "pA", unitId: "u3", month: "2026-10", amount: 200000, method: "نقد", date: "2026-10-15" } });
B.e.local({ type: "expense", expense: { id: "eB", catId: "c1", label: "سباك", amount: 15000, date: "2026-10-15" } });
await settle(); await A.e.sync(); await B.e.sync();
ok(same(A.e.view, B.e.view), "تعديلين متزامنين: نفس النتيجة بالجهازين");
ok(A.e.view.payments.some((p) => p.id === "pA") && A.e.view.expenses.some((e) => e.id === "eB"), "ولا تعديل ضاع");
ok(A.e.queued === 0 && B.e.queued === 0 && A.e.status === "synced", "الطابور فاضي والحالة «متزامن»");

// 3) نفس المهمة تنقلب من جهازين: ترتيب السيرفر يحسم والجهازين يتفقون
A.e.local({ type: "task", id: "t1" }); B.e.local({ type: "task", id: "t1" });
await settle(); await A.e.sync(); await B.e.sync();
ok(same(A.e.view, B.e.view), "قلب نفس المهمة من جهازين: يتفقون");

// 4) بدون نت: التعديل يطلع بالشاشة، ينحفظ بالطابور، ويرتفع مرة وحدة لما يرجع النت
srv.down = true;
A.e.local({ type: "unpay", id: "pA" });
await settle();
ok(A.e.status === "offline" && A.e.queued === 1, "بدون نت: الحالة offline والطابور 1");
ok(!A.e.view.payments.some((p) => p.id === "pA"), "بدون نت: التعديل باين بالشاشة على طول");
const A2 = device(srv, A.store); // التطبيق انسكّر وانفتح وهو بدون نت
ok(same(A2.e.view, A.e.view) && A2.e.queued === 1, "بعد إعادة الفتح بدون نت: نفس البيانات والطابور محفوظ");
srv.down = false;
await A2.e.sync(); await A.e.sync(); await B.e.sync();
ok(srv.rows.filter((r) => r.action.type === "unpay").length === 1, "رجع النت: الحدث ارتفع مرة وحدة بس (بدون تكرار)");
ok(same(A2.e.view, B.e.view) && A2.e.queued === 0, "رجع النت: الأجهزة متطابقة");

// 5) الرفع نجح بس السحب فشل ← إعادة المحاولة ما تكرر الحدث
const C = device(srv);
await C.e.start();
const realPull = srv.remote().pull;
let failPull = true;
(C.e as unknown as { remote: Remote }).remote = { ...srv.remote(), pull: async (f, a) => { if (failPull) throw new Error("Failed to fetch"); return realPull(f, a); } };
C.e.local({ type: "task", id: "t2" });
await settle();
failPull = false;
(C.e as unknown as { sent: Set<string> }).sent.clear(); // كأنه جلسة جديدة
await C.e.sync();
ok(srv.rows.filter((r) => r.action.type === "task" && (r.action as { id: string }).id === "t2").length === 1, "رفع ناجح + سحب فاشل + إعادة: الحدث مرة وحدة");

// 6) حدث من نسخة أحدث للتطبيق ما يكسر
srv.rows.push({ id: srv.rows.length + 1, family: "fam1", client_id: "future-0001", action: { type: "something-new" } });
const before = JSON.stringify(B.e.view);
await B.e.sync();
ok(JSON.stringify(B.e.view) === before, "حدث غير معروف: ينتجاهل بدون ما ينكسر");

// 7) Realtime: حدث جديد من جهاز يوصل الثاني بدون ضغط «زامن»
A2.e.start();
B.e.local({ type: "task", id: "t3" });
await settle(); await settle();
ok(same(A2.e.view, B.e.view), "Realtime: الجهاز الثاني يتحدث بروحه");

// 8) المفاتيح والروابط
const jwt = (role: string) => `x.${btoa(JSON.stringify({ role, iss: "supabase" })).replace(/=+$/, "")}.y`;
ok(checkKey(jwt("anon")) === null, "مفتاح anon مقبول");
ok(checkKey(jwt("service_role")) !== null, "مفتاح service_role مرفوض");
ok(checkKey("sb_secret_abc") !== null && checkKey("sb_publishable_abc") === null, "sb_secret مرفوض و sb_publishable مقبول");
ok(checkKey("hello") !== null, "مفتاح عشوائي مرفوض");
ok(checkUrl("https://abcd.supabase.co") === null && checkUrl("http://abcd.supabase.co") !== null && checkUrl("https://evil.com") !== null, "الرابط: https و supabase.co بس");

console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات المزامنة نجحت");
process.exit(failed ? 1 : 0);
