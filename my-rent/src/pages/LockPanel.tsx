import { useState } from "react";
import { useToast } from "../ui/kit";
import { canLock, disableLock, enableLock, lockOn } from "../lock";

/** DW-043: إعداد قفل التطبيق — بتطبيق الجوال بس */
export function LockPanel() {
  const toast = useToast();
  const [on, setOn] = useState(lockOn);
  const [busy, setBusy] = useState(false);
  if (!canLock()) return null;
  const toggle = async () => {
    setBusy(true);
    try {
      if (on) { disableLock(); setOn(false); toast({ text: "انشال قفل التطبيق" }); }
      else {
        const r = await enableLock();
        if (r === "on") { setOn(true); toast({ text: "تفعّل القفل: البصمة أو الوجه أو رمز الجوال" }); }
        else toast({ text: r === "unavailable" ? "حط رمز أو بصمة للجوال من إعداداته أول" : "ما تم التحقق — القفل ما تفعّل" });
      }
    } finally { setBusy(false); }
  };
  return (
    <section className="card stack" aria-labelledby="lock-h">
      <h2 className="set-title" id="lock-h">قفل التطبيق</h2>
      <p className="muted small" style={{ margin: 0 }}>يطلب البصمة أو Face ID (أو رمز الجوال) لما تفتح إداراتي، أو لما ترجع له بعد دقيقة. التحقق من الجوال نفسه — البصمة ما توصلنا.</p>
      <button className={`btn press${on ? " btn-ghost" : ""}`} id="lock-btn" onClick={toggle} disabled={busy} aria-pressed={on}>{on ? "شيل القفل" : "فعّل القفل"}</button>
    </section>
  );
}
