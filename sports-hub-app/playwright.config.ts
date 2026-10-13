import { defineConfig } from '@playwright/test'

/* One suite, three screens. The app runs in demo mode (no Supabase keys), so the tests need nothing external. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'allow', locale: 'ar-BH', timezoneId: 'Asia/Bahrain' },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'ipad', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
