import { expect, test } from '@playwright/test'

const enter = async (page: import('@playwright/test').Page) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'الطاقم الطبي' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('motion', () => {
  test('with reduced motion nothing animates and the final numbers show immediately', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    await enter(page)
    await expect(page.getByText('المركز')).toBeVisible()
    // no running CSS animations anywhere on the page
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && (a.effect as KeyframeEffect | null)?.getTiming().iterations !== Infinity).length)
    expect(running).toBe(0)
    // count-up is skipped: the animated layer already shows the real value
    await expect(page.locator('[aria-hidden="true"]', { hasText: /^4$/ }).first()).toBeVisible()
    await ctx.close()
  })

  test('the count-up lands on the real number and screen readers get it from the start', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.sr-only', { hasText: /^18$/ })).toHaveCount(1) // points, in the DOM from the first paint
    await expect(page.locator('[aria-hidden="true"]', { hasText: /^18$/ }).first()).toBeVisible({ timeout: 2500 }) // animation finished
  })

  test('the Home entrance plays once per session', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.sweep')).toHaveCount(1) // retries until the match card has painted
    await page.goto('/standings')
    await page.goto('/')
    await expect(page.getByRole('timer')).toBeVisible()
    await expect(page.locator('.sweep')).toHaveCount(0)
  })

  test('voting fires the goal flash once, on the card that was picked', async ({ page }) => {
    await enter(page)
    await page.goto('/vote')
    await page.getByRole('button', { name: /اللاعب 10/ }).click()
    await expect(page.locator('.goal-flash')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /اللاعب 10/ }).locator('.goal-flash')).toHaveCount(1)
  })

  test('each load gauge says its zone in text, not just in color', async ({ page }) => {
    await enter(page)
    await page.goto('/medical')
    const gauges = page.getByRole('img', { name: /نسبة الحمل/ })
    await expect(gauges).toHaveCount(5)
    await expect(gauges.first()).toHaveAttribute('aria-label', /خطر|انتبه|آمن|حمل منخفض/)
  })
})
