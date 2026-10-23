import { expect, test } from '@playwright/test'

/* Pitch mode (Settings): a display preference kept on the device. It must switch on, survive a reload,
   and never push a page sideways or shrink a tap target. */
test('pitch mode switches on from Settings and survives a reload', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
  await page.goto('/settings')
  const sw = page.getByRole('switch', { name: 'وضع الملعب' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-pitch', '')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-pitch', '')
  await expect(page.getByRole('switch', { name: 'وضع الملعب' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('switch', { name: 'وضع الملعب' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-pitch')
})

test('pitch mode: no sideways scroll and every control stays tappable', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the phone layout is where larger text can break')
  await page.goto('/login')
  const bad: string[] = []
  for (const [path, role] of [['/zone', 'medical'], ['/club', 'club_admin'], ['/lineup', 'club_admin'], ['/attendance', 'club_admin'], ['/rights', 'club_admin'], ['/report', 'club_admin'], ['/settings', 'medical']]) {
    await page.evaluate(([r]) => { localStorage.setItem('sh.demoRole', r); localStorage.setItem('sh.pitchMode', '1') }, [role])
    await page.goto(path)
    await page.waitForTimeout(600)
    const r = await page.evaluate(() => ({
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...document.querySelectorAll<HTMLElement>('a,button,select,[role=tab]')]
        .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
        .map((e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), n: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24) } })
        .filter((x) => x.w > 2 && (x.w < 44 || x.h < 44)),
    }))
    if (r.over > 1) bad.push(`${path}: page is ${r.over}px wider than the screen`)
    bad.push(...r.small.map((s) => `${path}: "${s.n}" ${s.w}x${s.h}`))
  }
  expect(bad, bad.join('\n')).toEqual([])
})
