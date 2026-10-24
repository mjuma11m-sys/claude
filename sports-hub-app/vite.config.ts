import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_SHARE=1 builds the trial copy for a shared link: relative paths and hash routes, so it works from any folder with no server rewrites.
export default defineConfig({
  base: process.env.VITE_SHARE ? './' : '/',
  // Unit tests only: browser specs in e2e/ belong to Playwright.
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\/]@supabase/ },
            { name: 'react', test: /node_modules[\/](react|react-dom|react-router|scheduler)[\/]/ },
          ],
        },
      },
    },
  },
})
