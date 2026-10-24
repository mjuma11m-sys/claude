import { defineConfig } from '@playwright/test'

/* One suite, three screens. The app runs in demo mode (no Supabase keys), so the tests need nothing external. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'allow', locale: 'ar-BH', timezoneId: 'Asia/Bahrain' },
  projects: [
    // 4173 = fan zone switched ON: the whole fan suite still runs, so bringing the fan zone back is a flag flip, not a rewrite.
    { name: 'phone', testIgnore: 'clubs.spec.ts', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'ipad', testIgnore: 'clubs.spec.ts', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'desktop', testIgnore: 'clubs.spec.ts', use: { viewport: { width: 1440, height: 900 } } },
    // 4174 = the shipped default (fan zone OFF): clubs and the federation only, both divisions.
    { name: 'clubs-phone', testMatch: 'clubs.spec.ts', use: { baseURL: 'http://localhost:4174', viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'clubs-desktop', testMatch: 'clubs.spec.ts', use: { baseURL: 'http://localhost:4174', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'VITE_FAN_ZONE=true npx vite build --outDir dist-fan && npx vite preview --outDir dist-fan --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
