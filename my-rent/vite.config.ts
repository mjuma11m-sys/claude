import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": يشتغل من جذر Netlify أو من أي مجلد فرعي
// DW-051: رقم البناء — لو تغيّر عند المستخدم (تحديث) ناخذ نسخة تلقائية من بياناته قبل أي شي
export default defineConfig({ base: "./", plugins: [react()], define: { "import.meta.env.VITE_BUILD": JSON.stringify(new Date().toISOString().slice(0, 16)) } });
