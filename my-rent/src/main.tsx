import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyPrefs, loadPrefs } from "./data/prefs";
import { initNative } from "./native";
import { applyLang } from "./i18n";

applyPrefs(loadPrefs()); // قبل أول رسم عشان ما يرمش الخط أو الثيم
applyLang(); // DW-045: lang + dir
void initNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: بدون إنترنت — بالنسخة المبنية بس (مو وقت التطوير)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* المتصفح رفض: يشتغل عادي بالنت */ });
  });
}
