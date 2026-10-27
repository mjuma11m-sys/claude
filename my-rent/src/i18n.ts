// DW-045: اللغة الإنقليزية. النص العربي هو المفتاح، والقاموس الإنقليزي بـ i18n-en.ts.
// اللغة تنحفظ بالجهاز، وتغييرها يعيد تحميل الصفحة (كل النصوص تنقرا من جديد، والاتجاه ينقلب RTL/LTR).
import { EN } from "./i18n-en";

export type Lang = "ar" | "en";
const KEY = "idarati-lang";
const read = (): Lang => { try { return localStorage.getItem(KEY) === "en" ? "en" : "ar"; } catch { return "ar"; } };
let lang: Lang = read();

export const getLang = () => lang;
export const isEn = () => lang === "en";
export function setLang(l: Lang) {
  try { if (l === "en") localStorage.setItem(KEY, "en"); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  lang = l;
  location.reload();
}
/** يحط lang وdir على الصفحة — قبل أول رسم */
export function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}
/** ترجمة: t("إيجار {unit}", { unit: "شقة 1" }). بالعربي يرجّع النص نفسه، وبالإنقليزي من القاموس (وإلا العربي) */
export function t(ar: string, vars?: Record<string, string | number>) {
  let s = lang === "en" ? EN[ar] ?? ar : ar;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export const dir = () => (lang === "ar" ? "rtl" : "ltr");
