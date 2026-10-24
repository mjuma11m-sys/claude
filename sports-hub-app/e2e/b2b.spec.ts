import { expect, test, type Page } from '@playwright/test'

const as = async (page: Page, role: 'إدارة النادي' | 'الاتحاد' | 'الطاقم الطبي' | 'مشجع') => {
  await page.goto('/login')
  await page.getByRole('button', { name: role }).click()
}

test.describe('where each role lands', () => {
  test('a club admin lands in the club room, the federation in its own', async ({ page }) => {
    await as(page, 'إدارة النادي')
    await expect(page).toHaveURL('/club')
    await expect(page.getByRole('heading', { name: 'غرفة النادي' })).toBeVisible()
    await page.goto('/login') // signed in: bounces back to the room
    await expect(page).toHaveURL('/club')
  })
  test('the federation lands in the federation room', async ({ page }) => {
    await as(page, 'الاتحاد')
    await expect(page).toHaveURL('/federation')
  })
  test('fans and medical staff still land on the fan home', async ({ page }) => {
    await as(page, 'مشجع')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'ملعبك اليوم' })).toBeVisible()
  })
})

test.describe('the walls, in the UI', () => {
  for (const [role, blocked, lands] of [
    ['مشجع', '/club', '/'], ['مشجع', '/federation', '/'], ['الطاقم الطبي', '/club', '/'],
    ['إدارة النادي', '/federation', '/club'], ['الاتحاد', '/club', '/federation'], ['الاتحاد', '/medical', '/federation'],
  ] as const) {
    test(`${role} cannot open ${blocked}`, async ({ page }) => {
      await as(page, role)
      await page.goto(blocked)
      await expect(page).toHaveURL(lands)
    })
  }
  test('a club admin can open the load screen of their own club', async ({ page }) => {
    await as(page, 'إدارة النادي')
    await page.goto('/medical')
    await expect(page).toHaveURL('/medical')
  })
})

test.describe('club room', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي') })

  test('shows readiness, expiring contracts and the squad', async ({ page }) => {
    await expect(page.getByText('جاهزين من الفريق')).toBeVisible()
    await expect(page.locator('.sr-only', { hasText: '12/16' })).toHaveCount(1) // 16 players, 4 are not fit
    await expect(page.locator('.sr-only', { hasText: /^5$/ }).first()).toBeAttached() // five contracts end within six months
    const expiring = page.getByRole('heading', { name: 'عقود تنتهي قريباً' }).locator('..')
    await expect(expiring.getByRole('listitem')).toHaveCount(5)
    const squad = page.getByRole('heading', { name: /^الفريق/ }).locator('..').locator('..')
    await expect(squad.getByRole('listitem')).toHaveCount(16)
  })

  test('availability is words, not just colour', async ({ page }) => {
    for (const w of ['جاهز', 'مشكوك', 'مصاب', 'موقوف']) await expect(page.getByText(w, { exact: true }).first()).toBeVisible()
  })

  test('sorting the squad by wage puts the highest paid first', async ({ page }) => {
    await page.getByRole('button', { name: 'الراتب' }).click()
    const first = page.getByRole('heading', { name: /^الفريق/ }).locator('..').locator('..').getByRole('listitem').first()
    await expect(first).toContainText('اللاعب 9') // 3,500 BHD a month in the demo squad
    await expect(page.getByRole('button', { name: 'الراتب' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('filing the finance report needs an explicit confirmation that says what the federation sees', async ({ page }) => {
    await page.locator('#revenue').fill('500000')
    await page.locator('#wages').fill('300000')
    await page.getByRole('button', { name: /راجع وارفع/ }).click()
    await expect(page.getByText('رفع التقرير = موافقتك على هذا')).toBeVisible()
    await expect(page.getByText('ما يشوف رواتب اللاعبين')).toBeVisible()
    await page.getByRole('button', { name: 'أكّد الرفع' }).click()
    await expect(page.locator('.sr-only', { hasText: '60%' })).toHaveCount(1) // 300k / 500k
    await expect(page.getByText('ضمن الحد', { exact: true }).first()).toBeVisible()
  })

  test('bad numbers are refused with a reason', async ({ page }) => {
    await page.locator('#revenue').fill('0')
    await page.getByRole('button', { name: /راجع وارفع/ }).click()
    await expect(page.getByRole('alert')).toContainText('إيرادات الموسم')
    await expect(page.getByText('رفع التقرير = موافقتك')).toHaveCount(0)
  })

  test('what a club files shows up in the federation room', async ({ page }) => {
    await page.locator('#revenue').fill('400000')
    await page.locator('#wages').fill('390000') // 97.5%: over the demo limit
    await page.getByRole('button', { name: /راجع وارفع/ }).click()
    await page.getByRole('button', { name: 'أكّد الرفع' }).click()
    await expect(page.locator('.sr-only', { hasText: /98%|97%/ })).toHaveCount(1)
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin'))
    await page.goto('/federation')
    const row = page.getByRole('listitem').filter({ hasText: 'نادي تجريبي 01' })
    await expect(row).toContainText('تجاوز الحد')
  })
})

test.describe('federation room', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'الاتحاد') })

  test('summarises who filed and who is over the limit', async ({ page }) => {
    await expect(page.locator('.sr-only', { hasText: '16/20' })).toHaveCount(1)
    const tab = (name: RegExp) => page.getByRole('tab', { name })
    await expect(tab(/^الكل/)).toContainText('20')
    await expect(tab(/^تجاوزوا/)).toContainText('3')
    await expect(tab(/^قريبون/)).toContainText('4')
    await expect(tab(/^لم يرفعوا/)).toContainText('4')
  })

  test('worst offenders first, and the filter narrows the list', async ({ page }) => {
    const list = page.getByRole('heading', { name: /امتثال الأندية/ }).locator('..').locator('..')
    await expect(list.getByRole('listitem').first()).toContainText('نادي تجريبي 03') // 83% of a 70% limit: furthest past its own limit
    await page.getByRole('tab', { name: /^تجاوزوا/ }).click()
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await page.getByRole('tab', { name: /^لم يرفعوا/ }).click()
    await expect(list.getByRole('listitem')).toHaveCount(4)
    await expect(list.getByRole('listitem').first()).toContainText('ما رفع تقرير الموسم')
  })

  test('it never shows a player, a wage line or a health status', async ({ page }) => {
    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/اللاعب \d/)
    expect(body).not.toMatch(/مصاب|موقوف|مشكوك/)
    expect(body).not.toContain('/ شهر')
  })
})

test.describe('honesty', () => {
  test('the demo club and federation rooms never attach money or contracts to a real club', async ({ page }) => {
    // «الحد» is left out: it is a club and also the plain word for "the limit", which the finance screens use on purpose.
    const real = ['المالكية', 'المحرق', 'الخالدية', 'الرفاع', 'الأهلي', 'المنامة', 'سترة', 'البحرين', 'النجمة', 'الشباب', 'قلالي', 'البديع']
    await page.goto('/login')
    for (const [key, path] of [['club_admin', '/club'], ['bfa_admin', '/federation']] as const) {
      await page.evaluate((k) => localStorage.setItem('sh.demoRole', k), key)
      await page.goto(path)
      await page.waitForTimeout(500)
      const text = await page.locator('main').innerText()
      for (const club of real) expect(text, `${club} on ${path}`).not.toContain(club)
      await expect(page.getByText(/خيالي/).first()).toBeVisible()
    }
  })
})

test.describe('numbers inside Arabic sentences', () => {
  /* After an Arabic word, "70%" renders as "%70" unless it sits in its own LTR run. Measure the glyph positions. */
  for (const [role, path] of [['إدارة النادي', '/club'], ['الاتحاد', '/federation']] as const) {
    test(`every percentage on ${path} reads digits-then-percent`, async ({ page }) => {
      await as(page, role)
      await page.goto(path)
      await page.waitForTimeout(500)
      const flipped = await page.evaluate(() => {
        const out: string[] = []
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.textContent ?? ''
          for (const m of t.matchAll(/(\d+)%/g)) {
            const at = (i: number) => { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); return r.getBoundingClientRect().left }
            const digit = at(m.index!), pct = at(m.index! + m[0].length - 1)
            if (!(pct > digit)) out.push(`${m[0]} in "${t.slice(0, 30)}"`)
          }
        }
        return out
      })
      expect(flipped).toEqual([])
    })
  }
})
