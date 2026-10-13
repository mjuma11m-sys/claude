import { expect, test, type Page } from '@playwright/test'

/* The shipped default: fan zone OFF. Clubs and the federation only, with both divisions. */
const as = async (page: Page, role: 'إدارة النادي' | 'الاتحاد' | 'الطاقم الطبي') => {
  await page.goto('/login')
  await page.getByRole('button', { name: role }).click()
}

test.describe('no fan zone', () => {
  test('the demo login offers staff roles only', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'مشجع' })).toHaveCount(0)
    for (const r of ['إدارة النادي', 'الاتحاد', 'الطاقم الطبي']) await expect(page.getByRole('button', { name: r })).toBeVisible()
    await expect(page.getByText('وزاوية للجمهور')).toHaveCount(0)
  })
  test('fan routes send everyone back to their room, and no nav item points at them', async ({ page }) => {
    await as(page, 'إدارة النادي')
    for (const path of ['/zone', '/vote', '/pass']) {
      await page.goto(path)
      await expect(page).toHaveURL('/club')
    }
    const links = await page.locator('nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(links.filter((h) => ['/zone', '/vote', '/pass'].includes(h ?? ''))).toEqual([])
  })
  test('medical staff land on the load screen', async ({ page }) => {
    await as(page, 'الطاقم الطبي')
    await expect(page).toHaveURL('/medical')
  })
  test('a fan account gets a plain explanation, not a blank page', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => { localStorage.setItem('sh.demoRole', 'fan') })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'التطبيق للأندية والاتحاد حالياً' })).toBeVisible()
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}|يوم الإطلاق/)).toHaveCount(0) // no launch date, ever
  })
})

test.describe('divisions', () => {
  test('the club room names its division and the limit of that division', async ({ page }) => {
    await as(page, 'إدارة النادي')
    await expect(page.getByText('الدوري الممتاز').first()).toBeVisible()
    await expect(page.getByText(/حد الدوري الممتاز/)).toBeVisible()
  })
  test('the federation filters by division and every counter follows', async ({ page }) => {
    await as(page, 'الاتحاد')
    const tab = (n: string) => page.getByRole('tab', { name: new RegExp(n) })
    await expect(tab('الدرجتين')).toContainText('20')
    await expect(tab('الدوري الممتاز')).toContainText('12')
    await expect(tab('الدرجة الثانية')).toContainText('8')
    await tab('الدرجة الثانية').click()
    await expect(tab('الدرجة الثانية')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('listitem').filter({ hasText: 'نادي تجريبي 14' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'نادي تجريبي 01' })).toHaveCount(0)
    // 6 of 8 filed; the status tabs inside the division: 1 over (14), 1 near (17), 2 not filed (19, 20)
    await expect(page.locator('.sr-only', { hasText: '6/8' })).toHaveCount(1)
    await expect(page.getByRole('tab', { name: /^تجاوزوا/ })).toContainText('1')
    await expect(page.getByRole('tab', { name: /^قريبون/ })).toContainText('1')
    await expect(page.getByRole('tab', { name: /^لم يرفعوا/ })).toContainText('2')
  })
  test('the Second Division is judged against its own limit', async ({ page }) => {
    await as(page, 'الاتحاد')
    await page.getByRole('tab', { name: /الدرجة الثانية/ }).click()
    // club 17 is at 77%: "near" under the 80% Second limit, it would be "over" under the 70% Premier limit
    const row = page.getByRole('listitem').filter({ hasText: 'نادي تجريبي 17' })
    await expect(row).toContainText('قريب')
    await expect(row).not.toContainText('تجاوز')
  })
  test('both limits are labelled as demo values', async ({ page }) => {
    await as(page, 'الاتحاد')
    await expect(page.getByText('حد الأجور (تجريبي)')).toBeVisible()
    await expect(page.getByText(/أندية وأرقام مالية خيالية/)).toBeVisible()
  })
  test('percent signs read digits-then-percent in the division views', async ({ page }) => {
    await as(page, 'الاتحاد')
    await page.getByRole('tab', { name: /الدرجة الثانية/ }).click()
    await page.waitForTimeout(500)
    const flipped = await page.evaluate(() => {
      const out: string[] = []
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent ?? ''
        for (const m of t.matchAll(/(\d+)%/g)) {
          const at = (i: number) => { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); return r.getBoundingClientRect().left }
          if (!(at(m.index! + m[0].length - 1) > at(m.index!))) out.push(m[0])
        }
      }
      return out
    })
    expect(flipped).toEqual([])
  })
})
