import { t } from "../i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LOCK_AFTER_MS, lockOn, unlock } from "../lock";
import symbolUrl from "../../brand/symbol.svg";

/** DW-043: شاشة القفل. تغطي التطبيق كله لين يتحقق، وبالخلفية تغطّي المحتوى فوراً (صورة التطبيقات المفتوحة ما تكشف المبالغ) */
export function LockGate({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(lockOn);
  const [hidden, setHidden] = useState(false);
  const busy = useRef(false);
  const leftAt = useRef(0);

  const tryUnlock = async () => {
    if (busy.current) return;
    busy.current = true;
    const ok = await unlock();
    busy.current = false;
    if (ok) setLocked(false);
  };

  useEffect(() => { if (locked) void tryUnlock(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lockOn()) return;
    let off: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) { leftAt.current = Date.now(); setHidden(true); return; }
      setHidden(false);
      if (lockOn() && Date.now() - leftAt.current > LOCK_AFTER_MS) { setLocked(true); void tryUnlock(); }
    })).then((h) => { off = () => void h.remove(); });
    return () => off?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {children}
      {(locked || hidden) && (
        <div className="lock-screen" id="lock-screen" role="alertdialog" aria-modal="true" aria-label={t("إداراتي مقفل")}>
          <img src={symbolUrl} alt="" width={72} height={72} />
          <p className="lock-title">{t("إداراتي مقفل")}</p>
          {locked && <button className="btn press" id="lock-open" onClick={() => void tryUnlock()}>{t("افتح بالبصمة")}</button>}
        </div>
      )}
    </>
  );
}
