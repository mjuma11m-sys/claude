import { expect, test } from '@playwright/test'

/* Fingers are ~44px wide (Apple HIG) and WCAG 2.2 asks for at least 24px: anything you tap on a phone should clear 44. */
test('every tap target on a phone is at least 44px', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch sizing matters on the phone layout')
  const small: string[] = []
  await page.goto('/login')
  for (const [path, role] of [['/zone', 'medical'], ['/standings', 'medical'], ['/vote', 'medical'], ['/pass', 'medical'], ['/medical', 'medical'], ['/settings', 'medical'], ['/club', 'club_admin'], ['/data', 'club_admin'], ['/development', 'club_admin'], ['/federation', 'bfa_admin']]) {
    await page.evaluate((k) => localStorage.setItem('sh.demoRole', k), role)
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
