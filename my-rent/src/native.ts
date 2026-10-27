// DW-038: نسخة المتجر (Capacitor) — التنزيل والطباعة وفتح الملفات ما تشتغل داخل تطبيق الجوال،
// فنحفظ الملف بالجوال ونفتح قائمة المشاركة. بالمتصفح نفس السلوك القديم. الإضافات تتحمّل وقت الحاجة بس.
import { Capacitor } from "@capacitor/core";
import { handleBack } from "./back";

export const isNative = () => Capacitor.isNativePlatform();
/** الطباعة: المتصفح بس (WKWebView وWebView الأندرويد ما يطبعون) */
export const canPrint = () => !isNative();

/** DW-040: زر الرجوع بأندرويد (بالآيفون ما فيه زر) — الإضافة تلغي سلوك الرجوع الافتراضي، فنقرر نحن. DW-045: وروابط الدخول */
export async function initNative() {
  if (!isNative()) return;
  const { App } = await import("@capacitor/app");
  await App.addListener("appUrlOpen", ({ url }) => void handleAuthLink(url)); // DW-045
  if (Capacitor.getPlatform() !== "android") return; // زر الرجوع: أندرويد بس
  await App.addListener("backButton", ({ canGoBack }) => {
    const act = handleBack(canGoBack);
    if (act === "back") history.back();
    else if (act === "minimize") void App.minimizeApp();
  });
}

const toBase64 = (blob: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});

/** يحفظ ملف للمستخدم: تنزيل بالمتصفح، أو حفظ + مشاركة بالجوال */
export async function saveFile(name: string, blob: Blob, title = name) {
  if (!isNative()) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const safe = name.replace(/[\\/:*?"<>|]/g, "-");
  const { uri } = await Filesystem.writeFile({ path: safe, data: await toBase64(blob), directory: Directory.Cache });
  await Share.share({ title, files: [uri] });
}

/** يفتح ملف (عقد، وثيقة): تبويب جديد بالمتصفح، أو مشاركة بالجوال (تقدر تفتحه أو تحفظه منها) */
export async function openFile(name: string, blob: Blob) {
  if (!isNative()) {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  await saveFile(name, blob);
}

/** مشاركة نص (إيصال، فاتورة، عقد): قائمة المشاركة بالجوال والمتصفح، وإلا نسخ */
export async function shareText(title: string, text: string): Promise<"shared" | "copied"> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text });
    return "shared";
  }
  if (navigator.share) { await navigator.share({ title, text }); return "shared"; }
  await navigator.clipboard.writeText(text);
  return "copied";
}

/** DW-045: رجوع رابط الدخول بقوقل/أبل أو رابط الإيميل (bh.wadqa.idarati://auth?code=…) ← جلسة، ونفتح الإعدادات.
 *  النتيجة تطلع كحدث «idarati:auth» عشان شاشة الحساب تعرض «كلمة سر جديدة» أو الخطأ */
async function handleAuthLink(url: string) {
  if (!url.startsWith("bh.wadqa.idarati://auth")) return;
  try {
    const { loadSyncConfig } = await import("./data/sync");
    const env = import.meta.env;
    const cfg = loadSyncConfig() ?? (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_KEY ? { url: String(env.VITE_SUPABASE_URL), key: String(env.VITE_SUPABASE_KEY) } : null);
    if (!cfg) return;
    const { getClient, handleAuthDeepLink } = await import("./data/supabase");
    const recover = await handleAuthDeepLink(await getClient(cfg.url, cfg.key), url);
    location.hash = "settings";
    window.dispatchEvent(new CustomEvent("idarati:auth", { detail: { recover } }));
  } catch (e) {
    location.hash = "settings";
    window.dispatchEvent(new CustomEvent("idarati:auth", { detail: { error: e instanceof Error ? e.message : String(e) } }));
  }
}
