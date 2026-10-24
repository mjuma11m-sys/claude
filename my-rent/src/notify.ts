// DW-042: تذكيرات الجوال المحلية — الجوال نفسه يذكّر (بدون سيرفر ولا إنترنت ولا يطلع شي من الجهاز).
// مطفأة لين المستخدم يفعّلها. نعيد الجدولة كل ما تتغيّر البيانات: نمسح المعلّق ونحط أقرب 60 (حد أبل 64).
import { isNative } from "./native";
import { planReminders } from "./data/logic";
import type { Data } from "./data/types";

const KEY = "idarati-reminders";
export const remindersOn = () => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };
const setOn = (on: boolean) => { try { if (on) localStorage.setItem(KEY, "on"); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
/** بالمتصفح ما نعرض الخيار: إشعارات الويب ما توصل والتطبيق مسكّر */
export const canRemind = () => isNative();

/** رقم ثابت لكل تذكير (نفس المفتاح = نفس الرقم) */
export const reminderId = (key: string) => { let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) || 1; };
/** الساعة 9 الصبح بتوقيت الجوال */
export const reminderAt = (day: string) => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d, 9, 0, 0); };

const plugin = async () => (await import("@capacitor/local-notifications")).LocalNotifications;

async function clearPending() {
  const ln = await plugin();
  const { notifications } = await ln.getPending();
  if (notifications.length) await ln.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
}

/** يمسح التذكيرات المعلّقة ويجدول من جديد. يرجّع عدد اللي انجدول */
export async function syncReminders(data: Data, now = new Date()) {
  if (!canRemind() || !remindersOn()) return 0;
  await clearPending();
  const list = planReminders(data, now).map((r) => ({
    id: reminderId(r.key), title: r.title, body: r.body,
    schedule: { at: reminderAt(r.day), allowWhileIdle: true },
    isExactNotification: false, // بدون إذن «المنبّه الدقيق» (قوقل بلاي يقيّده) — فرق دقايق ما يهم
    smallIcon: "ic_stat_idarati",
  })).filter((n) => n.schedule.at > now);
  if (list.length) await (await plugin()).schedule({ notifications: list });
  return list.length;
}

export async function enableReminders(data: Data): Promise<"on" | "denied"> {
  const ln = await plugin();
  const p = await ln.requestPermissions();
  if (p.display !== "granted") return "denied";
  setOn(true);
  await syncReminders(data);
  return "on";
}

export async function disableReminders() {
  setOn(false);
  if (canRemind()) await clearPending();
}
