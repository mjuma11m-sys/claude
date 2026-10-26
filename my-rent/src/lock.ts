// DW-043: قفل التطبيق بالبصمة / Face ID (تطبيق الجوال بس، اختياري). النظام هو اللي يتحقق — إداراتي ما يشوف
// ولا يخزّن أي بصمة. لو البصمة فشلت: رمز الجوال (allowDeviceCredential) عشان المالك ما ينقفل برا أبداً.
import { isNative } from "./native";

const KEY = "idarati-lock";
export const lockOn = () => { try { return isNative() && localStorage.getItem(KEY) === "on"; } catch { return false; } };
const setOn = (on: boolean) => { try { if (on) localStorage.setItem(KEY, "on"); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
export const canLock = () => isNative();
/** يقفل بعد هالمدة بالخلفية (مو مع كل مشاركة ملف) */
export const LOCK_AFTER_MS = 60_000;

const plugin = async () => (await import("@aparajita/capacitor-biometric-auth")).BiometricAuth;

/** فيه بصمة أو وجه أو على الأقل رمز للجوال؟ */
export async function lockAvailable() {
  const r = await (await plugin()).checkBiometry();
  return r.isAvailable || r.deviceIsSecure;
}

export async function unlock() {
  try {
    await (await plugin()).authenticate({ reason: "افتح إداراتي", cancelTitle: "إلغاء", allowDeviceCredential: true, androidTitle: "إداراتي", androidSubtitle: "تأكد إنك أنت" });
    return true;
  } catch { return false; }
}

/** يتحقق مرة قبل التفعيل: لو ما قدر يتحقق الحين، ما نفعّل قفل ما يقدر ينفتح */
export async function enableLock(): Promise<"on" | "unavailable" | "failed"> {
  if (!(await lockAvailable())) return "unavailable";
  if (!(await unlock())) return "failed";
  setOn(true);
  return "on";
}
export const disableLock = () => setOn(false);
