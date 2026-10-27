import { useState } from "react";
import { t } from "../i18n";

const TO = ((import.meta.env.VITE_FEEDBACK_WA as string | undefined) ?? "").replace(/\D/g, "");

/** DW-031: رأي العائلات التجريبية — رسالة واتساب جاهزة، ما ينحفظ شي عندنا */
export function Feedback() {
  const [ease, setEase] = useState<number | null>(null);
  const [bad, setBad] = useState("");
  const [missing, setMissing] = useState("");
  const text = `رأيي بإداراتي (نسخة تجريبية):\n• سهل الاستخدام: ${ease ?? "—"} من 5\n• شنو ضايقني: ${bad.trim() || "—"}\n• شنو ناقص: ${missing.trim() || "—"}`;
  const url = `https://wa.me/${TO}?text=${encodeURIComponent(text)}`;
  return (
    <section className="card stack" aria-labelledby="fb-h" id="feedback">
      <h2 className="set-title" id="fb-h">{t("رأيك بالتجربة")}</h2>
      <p className="muted small" style={{ margin: 0 }}>{t("ثلاث أسئلة، وتنرسل بالواتساب. ما ينحفظ شي بالتطبيق.")}</p>
      <div className="chips" role="radiogroup" aria-label={t("سهل الاستخدام من 1 إلى 5")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={ease === n} className="chip press num" onClick={() => setEase(n)}>{n}</button>
        ))}
        <span className="muted small" style={{ alignSelf: "center" }}>{t("سهل الاستخدام؟ (5 = جداً)")}</span>
      </div>
      <label className="field"><span>{t("شنو ضايقك؟")}</span><textarea id="fb-bad" className="input" rows={2} value={bad} onChange={(e) => setBad(e.target.value)} /></label>
      <label className="field"><span>{t("شنو ناقص؟")}</span><textarea id="fb-missing" className="input" rows={2} value={missing} onChange={(e) => setMissing(e.target.value)} /></label>
      <a className={`btn btn-wa press${ease === null && !bad.trim() && !missing.trim() ? " is-disabled" : ""}`} id="fb-send" href={url} target="_blank" rel="noreferrer" aria-disabled={ease === null && !bad.trim() && !missing.trim()}>{t("أرسل رأيك بالواتساب")}</a>
    </section>
  );
}
