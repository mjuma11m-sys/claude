import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
