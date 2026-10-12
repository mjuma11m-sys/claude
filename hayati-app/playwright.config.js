// اختبارات «حياتي»: تشغّل التطبيق بمتصفح حقيقي بحجم آيفون وتتأكد إن الأساسيات شغّالة
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js$/,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Bahrain',
    locale: 'ar-BH',
    // بيئة Claude Code السحابية فيها Chromium جاهز هني
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: 'iphone-size', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: { command: 'node tests/serve.js', url: 'http://127.0.0.1:4173/index.html', reuseExistingServer: !process.env.CI },
});
