import { useState } from "react";
import { useToast } from "../ui/kit";
import { canLock, disableLock, enableLock, lockOn } from "../lock";
import { t } from "../i18n";

/** DW-043: إعداد قفل التطبيق — بتطبيق الجوال بس */
export function LockPanel() {
  const toast = useToast();
  const [on, setOn] = useState(lockOn);
  const [busy, setBusy] = useState(false);
  if (!canLock()) return null;
  const toggle = async () => {
    setBusy(true);
    try {
      if (on) { disableLock(); setOn(false); toast({ text: t("انشال قفل التطبيق") }); }
      else {
        const r = await enableLock();
        if (r === "on") { setOn(true); toast({ text: t("تفعّل القفل: البصمة أو الوجه أو رمز الجوال") }); }
        else toast({ text: r === "unavailable" ? t("حط رمز أو بصمة للجوال من إعداداته أول") : t("ما تم التحقق — القفل ما تفعّل") });
      }
    } finally { setBusy(false); }
  };
  return (
    <section className="card stack" aria-labelledby="lock-h">
      <h2 className="set-title" id="lock-h">{t("قفل التطبيق")}</h2>
      <p className="muted small" style={{ margin: 0 }}>{t("يطلب البصمة أو Face ID (أو رمز الجوال) لما تفتح إداراتي، أو لما ترجع له بعد دقيقة. التحقق من الجوال نفسه — البصمة ما توصلنا.")}</p>
      <button className={`btn press${on ? " btn-ghost" : ""}`} id="lock-btn" onClick={toggle} disabled={busy} aria-pressed={on}>{on ? t("شيل القفل") : t("فعّل القفل")}</button>
    </section>
  );
}
