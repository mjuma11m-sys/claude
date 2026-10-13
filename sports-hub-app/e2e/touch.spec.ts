import { expect, test } from '@playwright/test'

/* Fingers are ~44px wide (Apple HIG) and WCAG 2.2 asks for at least 24px: anything you tap on a phone should clear 44. */
test('every tap target on a phone is at least 44px', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch sizing matters on the phone layout')
  await page.goto('/login')
  await page.getByRole('button', { name: 'الطاقم الطبي' }).click()
  const small: string[] = []
  for (const path of ['/', '/standings', '/vote', '/pass', '/medical', '/settings']) {
    await page.goto(path)
    await page.waitForTimeout(600)
    const found = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a,button,select,[role=tab]')]
        .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
        .map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), n: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24) } })
        .filter((x) => x.w > 2 && (x.w < 44 || x.h < 44)),
    )
    small.push(...found.map((f) => `${path}: "${f.n}" ${f.w}x${f.h}`))
  }
  expect(small, small.join('\n')).toEqual([])
})
