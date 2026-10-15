import { expect, test, type Page } from '@playwright/test'

/* axe skips color-contrast on this app (the page background is a gradient, so it reports every text as "incomplete").
   This measures it ourselves: read each text's real color, hide all text, screenshot, and sample the actual background behind it. */
type Item = { text: string; x: number; y: number; w: number; h: number; rgba: [number, number, number, number]; size: number; bold: boolean }

async function measure(page: Page) {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: await page.evaluate(() => document.documentElement.scrollHeight) })
  await page.waitForTimeout(300)
  const items = await page.evaluate<Item[]>(() => {
    const out: Item[] = []
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const px = cv.getContext('2d', { willReadFrequently: true })!
    const toRgba = (css: string): [number, number, number, number] => { px.clearRect(0, 0, 1, 1); px.fillStyle = css; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim()
      const el = n.parentElement
      if (!text || !el || el.closest('[aria-hidden="true"],script,style,noscript,[disabled]')) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const r = document.createRange(); r.selectNodeContents(n)
      const b = r.getBoundingClientRect()
      if (b.width < 2 || b.height < 2) continue
      let op = 1; for (let e: Element | null = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
      const m = toRgba(cs.color)
      out.push({ text: text.slice(0, 30), x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, rgba: [m[0], m[1], m[2], m[3] * op], size: parseFloat(cs.fontSize), bold: Number(cs.fontWeight) >= 700 })
    }
    return out
  })
  await page.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important;transition:none!important;animation:none!important} svg{visibility:hidden!important}' })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))) // let the style settle before the screenshot
  const png = (await page.screenshot()).toString('base64')
  return page.evaluate(async ({ items, png }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0)
    const k = img.width / innerWidth
    const lum = ([r, gg, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b) }
    const bad: string[] = []
    for (const it of items) {
      let worst = Infinity
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        const px = Math.min(img.width - 1, Math.max(0, Math.round((it.x + (it.w * (i + 0.5)) / 6) * k)))
        const py = Math.min(img.height - 1, Math.max(0, Math.round((it.y + (it.h * (j + 0.5)) / 3) * k)))
        const [br, bg, bb] = g.getImageData(px, py, 1, 1).data
        const a = it.rgba[3]
        const fg = [0, 1, 2].map((n) => it.rgba[n] * a + [br, bg, bb][n] * (1 - a))
        const [hi, lo] = [lum(fg), lum([br, bg, bb])].sort((p, q) => q - p)
        worst = Math.min(worst, (hi + 0.05) / (lo + 0.05))
      }
      const large = it.size >= 24 || (it.size >= 18.66 && it.bold)
      const need = large ? 3 : 4.5
      if (worst < need) bad.push(`${worst.toFixed(2)} < ${need}  "${it.text}" (${it.size}px)`)
    }
    return { count: items.length, bad }
  }, { items, png })
}

const SCREENS: [string, string][] = [['/zone', 'الطاقم الطبي'], ['/standings', 'الطاقم الطبي'], ['/vote', 'الطاقم الطبي'], ['/pass', 'الطاقم الطبي'], ['/medical', 'الطاقم الطبي'], ['/settings', 'الطاقم الطبي'], ['/club', 'إدارة النادي'], ['/data', 'إدارة النادي'], ['/development', 'إدارة النادي'], ['/lineup', 'إدارة النادي'], ['/attendance', 'إدارة النادي'], ['/rights', 'إدارة النادي'], ['/federation', 'الاتحاد'], ['/privacy', 'الطاقم الطبي'], ['/terms', 'الطاقم الطبي']]
for (const [path, role] of SCREENS) {
  test(`contrast: ${path}`, async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: role }).click()
    await page.goto(path)
    await page.waitForTimeout(900)
    const { count, bad } = await measure(page)
    expect(count, 'measured some text').toBeGreaterThan(3)
    expect(bad, bad.join('\n')).toEqual([])
  })
}

test('the contrast check itself catches a faint text', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'مشجع' }).click()
  await page.waitForTimeout(600)
  await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<p style="color:#2a3a52">نص باهت جداً</p>'))
  const { bad } = await measure(page)
  expect(bad.some((b) => b.includes('نص باهت'))).toBe(true)
})
