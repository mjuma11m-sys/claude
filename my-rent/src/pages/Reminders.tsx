import { useStore } from "../data/store";
import { buildIcs, isoDay } from "../data/logic";
import { useToast } from "../ui/kit";

/** DW-029: ملف تقويم بمواعيد الإيجار والعقود والوثائق والشيكات — ينبني بالجهاز وما يطلع شي للنت */
export function Reminders() {
  const { data } = useStore();
  const toast = useToast();
  const save = () => {
    const { text, count } = buildIcs(data);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
    a.download = `idarati-${isoDay(new Date())}.ics`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
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
