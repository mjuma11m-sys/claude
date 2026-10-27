import { useState } from "react";
import { useStore } from "../data/store";
import { buildIcs, isoDay, planReminders } from "../data/logic";
import { useToast } from "../ui/kit";
import { saveFile } from "../native";
import { canRemind, disableReminders, enableReminders, remindersOn } from "../notify";
import { t } from "../i18n";

/** DW-029: ملف تقويم بمواعيد الإيجار والعقود والوثائق والشيكات — ينبني بالجهاز وما يطلع شي للنت
 *  DW-042: وبتطبيق الجوال: تذكيرات من الجوال نفسه (اختيارية) */
export function Reminders() {
  const { data } = useStore();
  const toast = useToast();
  const [on, setOn] = useState(remindersOn);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const { text, count } = buildIcs(data);
    try { await saveFile(`idarati-${isoDay(new Date())}.ics`, new Blob([text], { type: "text/calendar;charset=utf-8" }), t("مواعيد إداراتي")); } catch { return; }
    toast({ text: t("انحفظ ملف التقويم ({n} موعد) — افتحه وأضفه للتقويم", { n: count }) });
  };
  const toggle = async () => {
    setBusy(true);
    try {
      if (on) { await disableReminders(); setOn(false); toast({ text: t("وقفت تذكيرات الجوال") }); }
      else if (await enableReminders(data) === "on") { setOn(true); toast({ text: t("تشغّلت التذكيرات ({n} خلال الشهرين الجايين)", { n: planReminders(data).length }) }); }
      else toast({ text: t("الإشعارات مقفلة لإداراتي — فعّلها من إعدادات الجوال وجرّب مرة ثانية") });
    } catch { toast({ text: t("ما قدرنا نشغّل التذكيرات، جرّب مرة ثانية") }); }
    setBusy(false);
  };
  return (
    <section className="card stack" aria-labelledby="rem-h">
      <h2 className="set-title" id="rem-h">{t("التذكيرات")}</h2>
      {canRemind() && <>
        <p className="muted small" style={{ margin: 0 }} id="push-note">{t("الجوال يذكّرك الساعة 9 الصبح: يوم الإيجار لو الشهر مو مسدد، ونهاية العقد والوثائق قبل 30 يوم، والشيك قبل يوم. على شاشة القفل يطلع اسم الوحدة بس، بدون مبالغ ولا أسماء.")}</p>
        <button className={`btn press${on ? " btn-ghost" : ""}`} id="push-btn" onClick={toggle} disabled={busy} aria-pressed={on}>{on ? t("أوقف تذكيرات الجوال") : t("شغّل تذكيرات الجوال")}</button>
      </>}
      <p className="muted small" style={{ margin: 0 }}>{t("أو ملف تقويم فيه موعد إيجار كل وحدة كل شهر، ونهاية العقود وانتهاء الوثائق (تنبيه قبل 30 يوم)، والشيكات اللي عندك (قبل يوم). افتحه بالآيفون أو الأندرويد واختار «إضافة الكل». لو تغيّرت المواعيد، نزّله مرة ثانية.")}</p>
      <button className="btn press" id="ics-btn" onClick={save}>{t("أضف للتقويم")}</button>
    </section>
  );
}
