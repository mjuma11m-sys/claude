import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/* WCAG 2.1 A/AA automated checks on every screen. Automated rules catch roughly a third of real issues, so this is a floor, not a pass mark. */
const SCREENS = ['/', '/standings', '/vote', '/pass', '/medical', '/settings', '/privacy', '/terms', '/login']

for (const path of SCREENS) {
  test(`axe: ${path}`, async ({ page }) => {
    if (path !== '/login' && path !== '/privacy' && path !== '/terms') {
      await page.goto('/login')
      await page.getByRole('button', { name: 'الطاقم الطبي' }).click()
      await expect(page).toHaveURL('/')
    }
    await page.goto(path)
    await page.waitForTimeout(700) // entrance animations finish, so contrast is measured on settled colors
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodes, e.g. ${v.nodes[0]?.target.join(' ')} — ${v.help}`)
    expect(summary, summary.join('\n')).toEqual([])
  })
}
