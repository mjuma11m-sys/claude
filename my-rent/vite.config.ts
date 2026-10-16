import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": يشتغل من جذر Netlify أو من أي مجلد فرعي
export default defineConfig({ base: "./", plugins: [react()] });
