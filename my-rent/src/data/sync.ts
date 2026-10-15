// مزامنة أجهزة العائلة (DW-018): سجل أحداث append-only.
// كل action من الـ reducer ينرفع صف واحد بجدول events. كل جهاز يعيد تطبيق الأحداث بالترتيب (id)،
// فما فيه تعارض بين جهازين. التعديلات بدون نت تنتظر بطابور محلي وتنرفع أول ما يرجع النت.
// هالملف ما يعرف شي عن Supabase — الاتصال نفسه بـ supabase.ts (Remote).
import type { Data } from "./types";

export type SyncAction = { type: string; [k: string]: unknown };
export type Row = { id: number; client_id: string; action: SyncAction };
export type Pending = { client_id: string; action: SyncAction };

/** الطرف البعيد — Supabase بالتطبيق، ومحاكي بالاختبارات */
export interface Remote {
  pull(familyId: string, afterId: number): Promise<Row[]>;
  push(familyId: string, ev: Pending): Promise<void>; // نفس client_id مرتين = نجاح (الصف موجود)
  subscribe(familyId: string, onChange: () => void): () => void;
}

export type SyncStatus = "synced" | "pending" | "offline" | "error";

type Cache = { familyId: string; lastId: number; confirmed: Data; pending: Pending[] };

const cacheKey = (familyId: string) => `idarati:sync:${familyId}`;

export function loadCache(familyId: string, store: Storage | null = safeStorage()): Cache | null {
  try {
    const c = JSON.parse(store?.getItem(cacheKey(familyId)) ?? "null");
    return c && c.familyId === familyId && Array.isArray(c.pending) ? c : null;
  } catch { return null; }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

const newClientId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** محرّك المزامنة: الحالة = reduce(الأحداث المؤكدة) ثم reduce(الطابور المحلي) فوقها */
export class SyncEngine {
  private confirmed: Data;
  private lastId: number;
  private pending: Pending[];
  private pulling: Promise<void> | null = null;
  private pushing: Promise<void> | null = null;
  private unsub: (() => void) | null = null;
  private sent = new Set<string>(); // انرفع بهالجلسة وننتظر يرجع بالسحب
  status: SyncStatus = "pending";
  lastError = "";

  constructor(
    private remote: Remote,
    readonly familyId: string,
    private reduce: (s: Data, a: SyncAction) => Data,
    empty: Data,
    private onChange: (view: Data, status: SyncStatus) => void,
    private store: Storage | null = safeStorage(),
  ) {
    const c = loadCache(familyId, store);
    this.confirmed = c?.confirmed ?? empty;
    this.lastId = c?.lastId ?? 0;
    this.pending = c?.pending ?? [];
  }

  get view(): Data { return this.pending.reduce((s, p) => this.reduce(s, p.action), this.confirmed); }
  get queued(): number { return this.pending.length; }

  start() {
    this.unsub = this.remote.subscribe(this.familyId, () => void this.pull());
    return this.sync();
  }
  stop() { this.unsub?.(); this.unsub = null; }

  /** تعديل محلي: يطلع فوراً بالشاشة، وينرفع بالخلفية */
  local(action: SyncAction) {
    this.pending.push({ client_id: newClientId(), action });
    this.save();
    this.emit();
    void this.flush();
  }

  /** رفع الطابور ثم سحب الجديد */
  async sync() { await this.flush(); await this.pull(); }

  pull(): Promise<void> {
    if (!this.pulling) {
      // Promise.resolve().then: الجسم يشتغل بعد ما ننحفظ الوعد، وإلا لو خلص بدون await يبقى الوعد معلّق للأبد
      this.pulling = Promise.resolve().then(async () => {
        try {
          const rows = await this.remote.pull(this.familyId, this.lastId);
          for (const r of rows.sort((a, b) => a.id - b.id)) {
            if (r.id <= this.lastId) continue;
            this.confirmed = this.reduce(this.confirmed, r.action);
            this.lastId = r.id;
            this.pending = this.pending.filter((p) => p.client_id !== r.client_id); // وصل صفّي: يطلع من الطابور
          }
          this.setStatus(this.pending.length ? "pending" : "synced");
          this.save();
          this.emit();
        } catch (e) {
          this.fail(e);
        } finally {
          this.pulling = null;
        }
      });
    }
    return this.pulling;
  }

  flush(): Promise<void> {
    if (!this.pushing) {
      this.pushing = Promise.resolve().then(async () => {
        try {
          for (const p of [...this.pending]) {
            if (this.sent.has(p.client_id)) continue;
            await this.remote.push(this.familyId, p);
            this.sent.add(p.client_id);
          }
          // ما نشيلها من الطابور هني — تطلع لما ترجع بالسحب، عشان الترتيب يبقى ترتيب السيرفر
          if (this.pending.length) await this.pull();
        } catch (e) {
          this.fail(e);
        } finally {
          this.pushing = null;
        }
      });
    }
    return this.pushing;
  }

  private fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    this.lastError = msg;
    this.setStatus(offline || /fetch|network/i.test(msg) ? "offline" : "error");
    this.emit();
  }

  private setStatus(s: SyncStatus) { this.status = s; }
  private emit() { this.onChange(this.view, this.status); }
  private save() {
    try {
      this.store?.setItem(cacheKey(this.familyId), JSON.stringify({ familyId: this.familyId, lastId: this.lastId, confirmed: this.confirmed, pending: this.pending } satisfies Cache));
    } catch { /* التخزين ممتلي: نكمل من الذاكرة */ }
  }
  clearCache() { try { this.store?.removeItem(cacheKey(this.familyId)); } catch { /* ignore */ } }
}

// ── إعداد المزامنة (يحطه المالك بالإعدادات) ─────────────────────────

export type SyncConfig = { url: string; key: string; consentAt: string; familyId?: string; familyName?: string; role?: "owner" | "member" };
const CONFIG_KEY = "idarati:syncConfig";

export function loadSyncConfig(): SyncConfig | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "null");
    return c && typeof c.url === "string" && typeof c.key === "string" && c.consentAt ? c : null;
  } catch { return null; }
}
export function saveSyncConfig(c: SyncConfig | null) {
  try { if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); else localStorage.removeItem(CONFIG_KEY); } catch { /* ignore */ }
}

/** رابط المشروع: https://xxxx.supabase.co بس */
export function checkUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return "الرابط لازم يبدأ بـ https://";
    if (!/\.supabase\.(co|in)$/.test(u.hostname)) return "هذا مو رابط مشروع Supabase (…supabase.co)";
    return null;
  } catch { return "الرابط مو صحيح"; }
}

/** المفتاح العام بس (anon / publishable). أي مفتاح سري ينرفض — DW-008 */
export function checkKey(key: string): string | null {
  const k = key.trim();
  if (k.startsWith("sb_secret_")) return "هذا مفتاح سري (secret). حط المفتاح العام publishable أو anon";
  if (k.startsWith("sb_publishable_")) return null;
  const parts = k.split(".");
  if (parts.length !== 3) return "المفتاح مو صحيح. انسخ anon public من إعدادات المشروع";
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="));
    const role = JSON.parse(json).role;
    if (role === "service_role") return "هذا مفتاح service_role السري — ممنوع بالتطبيق. حط anon public";
    if (role !== "anon") return "المفتاح لازم يكون anon public";
    return null;
  } catch { return "المفتاح مو صحيح. انسخ anon public من إعدادات المشروع"; }
}
