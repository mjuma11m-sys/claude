// تفضيلات الجهاز: حجم الخط والمظهر (DW-016). تنحفظ محلياً وتنطبق قبل أول رسم.
export type TextSize = "normal" | "large" | "xl";
export type Theme = "auto" | "light" | "dark";
export type Prefs = { size: TextSize; theme: Theme };

const KEY = "idarati:prefs";
export const ZOOM: Record<TextSize, number> = { normal: 1, large: 1.12, xl: 1.25 };

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { size: p.size in ZOOM ? p.size : "normal", theme: ["auto", "light", "dark"].includes(p.theme) ? p.theme : "auto" };
  } catch {
    return { size: "normal", theme: "auto" };
  }
}

export function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  html.dataset.size = p.size;
  if (p.theme === "auto") delete html.dataset.theme;
  else html.dataset.theme = p.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.theme === "dark" ? "#0A1120" : "#14213A");
}

export function savePrefs(p: Prefs) {
  applyPrefs(p);
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** يوحّد النص للبحث: أرقام عربية ← غربية، بدون مسافات وتشكيل، والهمزات ← ا */
export const normalize = (s: string) =>
  s.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[ً-ْ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/\s+/g, "").toLowerCase();

/** تاريخ آخر نسخة احتياطية (YYYY-MM-DD) — للتذكير كل 30 يوم (DW-017) */
const BACKUP_KEY = "idarati:lastBackup";
export function getLastBackup(): string | undefined {
  try { return localStorage.getItem(BACKUP_KEY) ?? undefined; } catch { return undefined; }
}
export function setLastBackup(day: string) {
  try { localStorage.setItem(BACKUP_KEY, day); } catch { /* ignore */ }
}

// DW-031: بطاقة الترحيب (أول فتحة) — تختفي لما المستخدم يختار
const WELCOME_KEY = "idarati:welcomed";
export function welcomed(): boolean { try { return !!localStorage.getItem(WELCOME_KEY); } catch { return true; } }
export function setWelcomed() { try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ } }

// DW-035: قائمة «جهّز إداراتي» — تطلع بعد «ابدأ ببياناتي» لين يكمّل أو يسكّرها
const SETUP_KEY = "idarati:setup";
export function setupOpen(): boolean { try { return localStorage.getItem(SETUP_KEY) === "open"; } catch { return false; } }
export function setSetup(v: "open" | "done") { try { localStorage.setItem(SETUP_KEY, v); } catch { /* ignore */ } }

// DW-051: نسخة تلقائية قبل التحديث — لو رقم البناء تغيّر، بيانات الجهاز تنحفظ نسخة قبل ما النسخة الجديدة تلمسها
const BUILD_KEY = "idarati:build", SNAP_KEY = "idarati:snapshot";
export type Snapshot = { at: string; data: string };
export function snapshotOnUpdate(build = String(import.meta.env.VITE_BUILD ?? "")) {
  try {
    const prev = localStorage.getItem(BUILD_KEY);
    const raw = localStorage.getItem("idarati:v2");
    if (prev && prev !== build && raw) localStorage.setItem(SNAP_KEY, JSON.stringify({ at: new Date().toISOString().slice(0, 10), data: raw } satisfies Snapshot));
    localStorage.setItem(BUILD_KEY, build);
  } catch { /* التخزين ممتلي أو مقفل: نكمل عادي */ }
}
export function getSnapshot(): Snapshot | null { try { const v = localStorage.getItem(SNAP_KEY); return v ? (JSON.parse(v) as Snapshot) : null; } catch { return null; } }

// DW-051: تاريخ «ابدأ ببياناتي» — سؤال السعر يطلع بعد أسبوع، مرة وحدة
const START_KEY = "idarati:startedAt", PRICE_KEY = "idarati:priceAsked";
export function setStarted(day: string) { try { localStorage.setItem(START_KEY, day); } catch { /* ignore */ } }
export function priceAskDue(now = new Date()): boolean {
  try {
    const s = localStorage.getItem(START_KEY);
    if (!s || localStorage.getItem(PRICE_KEY)) return false;
    return (now.getTime() - new Date(s + "T00:00:00").getTime()) / 86_400_000 >= 7;
  } catch { return false; }
}
export function setPriceAsked() { try { localStorage.setItem(PRICE_KEY, "1"); } catch { /* ignore */ } }
