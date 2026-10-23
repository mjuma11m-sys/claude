import { useStore } from "../data/store";
import { buildIcs, isoDay } from "../data/logic";
import { useToast } from "../ui/kit";
import { saveFile } from "../native";

/** DW-029: ملف تقويم بمواعيد الإيجار والعقود والوثائق والشيكات — ينبني بالجهاز وما يطلع شي للنت */
export function Reminders() {
  const { data } = useStore();
  const toast = useToast();
  const save = async () => {
    const { text, count } = buildIcs(data);
    try { await saveFile(`idarati-${isoDay(new Date())}.ics`, new Blob([text], { type: "text/calendar;charset=utf-8" }), "مواعيد إداراتي"); } catch { return; }
    toast({ text: `انحفظ ملف التقويم (${count} موعد) — افتحه وأضفه للتقويم` });
  };
  return (
    <section className="card stack" aria-labelledby="rem-h">
      <h2 className="set-title" id="rem-h">التذكيرات بالتقويم</h2>
      <p className="muted small" style={{ margin: 0 }}>ملف فيه موعد إيجار كل وحدة كل شهر، ونهاية العقود وانتهاء الوثائق (تنبيه قبل 30 يوم)، والشيكات اللي عندك (قبل يوم). افتحه بالآيفون أو الأندرويد واختار «إضافة الكل». لو تغيّرت المواعيد، نزّله مرة ثانية.</p>
      <button className="btn press" id="ics-btn" onClick={save}>أضف للتقويم</button>
    </section>
  );
}
