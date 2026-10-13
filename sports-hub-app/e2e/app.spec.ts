import { expect, test, type Page } from '@playwright/test'

const enter = async (page: Page, role: 'مشجع' | 'الطاقم الطبي') => {
  await page.goto('/login')
  await page.getByRole('button', { name: role }).click()
  await expect(page).toHaveURL('/')
}
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

test.describe('every screen', () => {
  const pages: [string, string][] = [['/', 'الرئيسية'], ['/standings', 'الترتيب'], ['/vote', 'رجل المباراة'], ['/pass', 'تذكرتي'], ['/settings', 'الإعدادات'], ['/medical', 'الأحمال']]

  test('has a title, fits the width, and calls no third party', async ({ page }) => {
    const external = new Set<string>()
    page.on('request', (r) => { const h = new URL(r.url()).hostname; if (h !== 'localhost') external.add(h) })
    await enter(page, 'الطاقم الطبي')
    for (const [path, title] of pages) {
      await page.goto(path)
      await expect(page).toHaveTitle(`${title} · Sports Hub`)
      expect(await noHorizontalScroll(page), `${path} overflows`).toBe(true)
    }
    for (const path of ['/privacy', '/terms']) {
      await page.goto(path)
      expect(await noHorizontalScroll(page), `${path} overflows`).toBe(true)
    }
    expect([...external]).toEqual([])
  })

  test('skip link is the first tab stop and the 404 is friendly', async ({ page }) => {
    await page.goto('/') // a fresh load: after in-app navigation focus deliberately moves to the page content
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'fan'))
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'تخطي للمحتوى' })).toBeAttached() // wait for React to paint before pressing Tab
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('تخطي للمحتوى')
    await page.goto('/no-such-page')
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible()
  })
})

test.describe('roles', () => {
  test('a fan cannot reach the medical area, medical staff can', async ({ page }) => {
    await enter(page, 'مشجع')
    await page.goto('/medical')
    await expect(page).toHaveURL('/')
    await page.goto('/login')
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
    await page.goto('/medical')
    await expect(page).toHaveURL('/medical')
    await expect(page.getByRole('heading', { name: /أحمال/ })).toBeVisible()
  })

  test('the demo login only offers roles that have a screen', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button')).toHaveCount(4)
  })
})

test.describe('fan zone', () => {
  test('standings highlight my club and use a real minus sign', async ({ page }) => {
    await enter(page, 'مشجع')
    await page.goto('/standings')
    await expect(page.locator('tr[aria-current="true"]')).toContainText('المالكية')
    await expect(page.getByRole('cell', { name: /^−2$/ }).first()).toBeVisible()
    await page.getByRole('tab', { name: 'دوري الدرجة الثانية' }).click()
    await expect(page.getByRole('cell', { name: 'قلالي' })).toBeVisible()
  })

  test('one vote per fan, results appear and survive a reload', async ({ page }) => {
    await enter(page, 'مشجع')
    await page.goto('/vote')
    await page.getByRole('button', { name: /اللاعب 10/ }).click()
    await expect(page.getByText('انحسب صوتك')).toBeVisible()
    await expect(page.getByRole('button', { name: /اللاعب 1\b/ })).toBeDisabled()
    await page.reload()
    await expect(page.getByRole('button', { name: /اللاعب 10/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('home shows the countdown and my club stats', async ({ page }) => {
    await enter(page, 'مشجع')
    await expect(page.getByRole('timer')).toBeVisible()
    await expect(page.getByText('المركز')).toBeVisible()
  })

  test('add to calendar downloads a valid .ics', async ({ page }) => {
    await enter(page, 'مشجع')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'أضف للتقويم' }).click()])
    const body = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
    expect(download.suggestedFilename()).toBe('match.ics')
    expect(body).toContain('BEGIN:VEVENT')
    expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/)
  })

  test('share falls back to copying the link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined }) })
    await enter(page, 'مشجع')
    await page.getByRole('button', { name: 'شارك' }).click()
    await expect(page.getByText('اننسخ الرابط')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/vote')
  })
})

test.describe('privacy', () => {
  test('"delete all my data" leaves nothing on the device', async ({ page }) => {
    await enter(page, 'مشجع')
    await page.goto('/vote')
    await page.getByRole('button', { name: /اللاعب 10/ }).click()
    await page.goto('/settings')
    await page.getByRole('button', { name: 'احذف كل بياناتي' }).click()
    await page.getByRole('button', { name: 'أكّد الحذف' }).click()
    await expect(page).toHaveURL(/\/login/)
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sh.')))).toEqual([])
  })

  test('policy and terms are public', async ({ page }) => {
    for (const [path, h] of [['/privacy', 'سياسة الخصوصية'], ['/terms', 'شروط الاستخدام']]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: h })).toBeVisible()
    }
  })
})

test.describe('install and offline', () => {
  test('iPhone Safari gets the two-tap instructions, and dismissing sticks', async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    await enter(page, 'مشجع')
    await expect(page.getByText('إضافة إلى الشاشة الرئيسية')).toBeVisible()
    await page.getByRole('button', { name: 'إخفاء' }).click()
    await page.reload()
    await expect(page.getByText('إضافة إلى الشاشة الرئيسية')).toHaveCount(0)
    await ctx.close()
  })

  test('opens offline from the cached shell, and caches no data', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'phone', 'one project is enough')
    await enter(page, 'مشجع')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    await context.setOffline(true)
    await page.goto('/standings')
    await expect(page.getByRole('tab').first()).toBeVisible()
    await expect(page.getByText('ما فيه اتصال')).toBeVisible()
    const cached = await page.evaluate(async () => {
      const out: string[] = []
      for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname)
      return out
    })
    expect(cached.length).toBeGreaterThan(0)
    expect(cached.filter((p) => /rest|auth|supabase/.test(p))).toEqual([])
  })
})
