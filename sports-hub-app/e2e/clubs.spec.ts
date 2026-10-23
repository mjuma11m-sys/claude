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

const GOOD = 'num,name,pos,status,ends_on,monthly_wage_bhd,consent_ref\n1,حارس تجريبي,حارس مرمى,جاهز,2027-06-30,1500,FORM-001\n9,مهاجم تجريبي,مهاجم,مصاب,2026-12-31,2200,FORM-002\n10,صانع تجريبي,صانع ألعاب,جاهز,2028-01-31,3100,FORM-003\n'
const csv = (page: Page, body: string, name = 'squad.csv') => page.setInputFiles('#csv', { name, mimeType: 'text/csv', buffer: Buffer.from(body) })
const signAgreement = async (page: Page) => {
  await page.locator('#signatory').fill('فلان الفلاني')
  await page.locator('#title').fill('المدير التنفيذي')
  await page.locator('#reference').fill('DPA-2026-001')
  await page.locator('#ack').check()
  await page.getByRole('button', { name: 'سجّل الاتفاقية' }).click()
}

test.describe('data center', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/data') })

  test('three steps, and the import is locked until the agreement is on record', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'مركز البيانات' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /اتفاقية معالجة البيانات/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /موافقات اللاعبين/ })).toBeVisible()
    await expect(page.getByText('سجّل الاتفاقية بالخطوة 1 أول.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'اختر ملف CSV' })).toHaveCount(0)
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1)
    await expect(page.getByText('تجربة داخل متصفحك').first()).toBeVisible()
  })

  test('the agreement form asks for what is missing', async ({ page }) => {
    await page.getByRole('button', { name: 'سجّل الاتفاقية' }).click()
    await expect(page.getByRole('alert')).toContainText('اسم الموقّع')
    await page.locator('#signatory').fill('فلان'); await page.locator('#title').fill('مدير'); await page.locator('#reference').fill('DPA-1')
    await page.getByRole('button', { name: 'سجّل الاتفاقية' }).click()
    await expect(page.getByRole('alert')).toContainText('تقرّ')
    await page.locator('#signedOn').fill('2999-01-01'); await page.locator('#ack').check()
    await page.getByRole('button', { name: 'سجّل الاتفاقية' }).click()
    await expect(page.getByRole('alert')).toContainText('بالمستقبل')
  })

  test('a bad file is rejected with line numbers and changes nothing; a good one replaces the squad', async ({ page }) => {
    await signAgreement(page)
    await expect(page.getByText('DPA-2026-001')).toBeVisible()
    await csv(page, 'num,name,pos,status,ends_on,monthly_wage_bhd,consent_ref\n1,حارس,حارس مرمى,جاهز,2027-06-30,1500,\n9,مهاجم,مهاجم,كسر,2026-12-31,2200,F-2\n')
    const alert = page.getByRole('alert').filter({ hasText: 'ما انقبل الملف' })
    await expect(alert).toContainText('سطر 2')
    await expect(alert).toContainText('مرجع الموافقة')
    await expect(alert).toContainText('الحالة لازم')
    await expect(page.getByRole('button', { name: 'استورد واستبدل التشكيلة' })).toHaveCount(0)
    await page.goto('/club')
    await expect(page.getByRole('heading', { name: /^الفريق/ })).toContainText('16') // untouched sample squad

    await page.goto('/data')
    await csv(page, GOOD)
    await expect(page.getByText(/3\s*لاعب جاهزين للاستيراد/)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'FORM-002' })).toBeVisible()
    await page.getByRole('button', { name: 'استورد واستبدل التشكيلة' }).click()
    await expect(page.getByText('يستبدل')).toBeVisible()
    await page.getByRole('button', { name: 'أكّد الاستيراد' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انستوردوا' })).toBeVisible()
    await page.getByRole('link', { name: 'افتح غرفة النادي' }).click()
    await expect(page.getByRole('heading', { name: /^الفريق/ })).toContainText('3')
    await expect(page.locator('.sr-only', { hasText: '2/3' })).toHaveCount(1) // ring: 2 of 3 fit (one injured)
    await expect(page.getByText('البيانات تجريبية. ابدأ باستيراد بيانات ناديك')).toHaveCount(0)
    await expect(page.getByText('لاعبون غير متاحين (إصابة أو إيقاف): 1')).toBeVisible()
  })

  test('a health-notes column is refused outright', async ({ page }) => {
    await signAgreement(page)
    await csv(page, GOOD.replace('consent_ref', 'consent_ref,ملاحظات').replace(/\n(\d)/g, ',x\n$1'))
    await expect(page.getByRole('alert').filter({ hasText: 'ما انقبل الملف' })).toContainText('ما نقبل ملاحظات صحية')
  })

  test('withdrawing a player\'s consent deletes the player; revoking the agreement closes the door', async ({ page }) => {
    await signAgreement(page)
    await csv(page, GOOD)
    await page.getByRole('button', { name: 'استورد واستبدل التشكيلة' }).click()
    await page.getByRole('button', { name: 'أكّد الاستيراد' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انستوردوا' })).toBeVisible()
    await page.locator('#withdraw').selectOption({ label: '9 · مهاجم تجريبي' })
    await page.getByRole('button', { name: 'اسحب موافقته' }).click()
    await page.getByRole('button', { name: 'احذف بياناته' }).click()
    await expect(page.locator('#withdraw option')).toHaveCount(3) // placeholder + 2 left
    await page.goto('/club')
    await expect(page.getByRole('heading', { name: /^الفريق/ })).toContainText('2')
    await expect(page.getByText('مهاجم تجريبي')).toHaveCount(0)
    await page.goto('/data')
    await page.getByRole('button', { name: 'اسحب الاتفاقية' }).click()
    await page.getByRole('button', { name: 'اسحب الاتفاقية' }).last().click()
    await expect(page.getByText('سجّل الاتفاقية بالخطوة 1 أول.')).toBeVisible()
  })

  test('the template and the draft agreement download', async ({ page }) => {
    const t = page.waitForEvent('download')
    await page.getByRole('button', { name: 'حمّل المسودة (للمراجعة القانونية)' }).click()
    expect((await t).suggestedFilename()).toBe('dpa-draft.txt')
    await signAgreement(page)
    const c = page.waitForEvent('download')
    await page.getByRole('button', { name: 'حمّل القالب' }).click()
    expect((await c).suggestedFilename()).toBe('squad-template.csv')
  })
})

test.describe('ease of use', () => {
  test('the club room opens with "today": items link to the place that fixes them', async ({ page }) => {
    await as(page, 'إدارة النادي')
    const strip = page.getByRole('region', { name: 'اليوم' })
    await expect(strip).toBeVisible()
    await expect(strip.getByRole('link', { name: /عقود تنتهي خلال 6 أشهر: 5/ })).toBeVisible()
    await expect(strip.getByRole('link')).toHaveCount(5) // capped at five: the softer items drop off when urgent ones appear (unavailable players are covered in today.test.ts)
    await strip.getByRole('link', { name: /عقود تنتهي/ }).click()
    await expect(page).toHaveURL(/#contracts$/)
    await expect(strip.getByRole('link', { name: /ابدأ باستيراد بيانات ناديك/ })).toHaveAttribute('href', '/data')
  })
  test('the federation "today" strip jumps to the matching filter', async ({ page }) => {
    await as(page, 'الاتحاد')
    await page.getByRole('region', { name: 'اليوم' }).getByRole('button', { name: /أندية ما رفعت تقرير الموسم: 4/ }).click()
    await expect(page.getByRole('tab', { name: /^لم يرفعوا/ })).toHaveAttribute('aria-selected', 'true')
  })
  test('the sliding pill ends exactly under the selected tab', async ({ page }) => {
    await as(page, 'الاتحاد')
    const tab = page.getByRole('tab', { name: /^الدرجة الثانية/ })
    await tab.click()
    await page.waitForTimeout(500)
    const pill = page.locator('[role=tablist][aria-label="الدرجة"] .seg-pill')
    const [a, b] = await Promise.all([pill.boundingBox(), tab.boundingBox()])
    expect(Math.abs(a!.x - b!.x)).toBeLessThan(1.5)
    expect(Math.abs(a!.width - b!.width)).toBeLessThan(1.5)
  })
  test('the readiness ring and the pulse respect reduced motion', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:4174', reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await as(page, 'إدارة النادي')
    await expect(page.locator('.urgent-ping').first()).toBeHidden().catch(() => {})
    const anim = await page.locator('.gauge-arc').first().evaluate((el) => getComputedStyle(el).animationName)
    expect(anim).toBe('none')
    await ctx.close()
  })
})

test.describe('development room', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/development') })

  test('goalkeepers come first, with ratings, priorities, goals and a match-day plan', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'غرفة التطوير' })).toBeVisible()
    await expect(page.getByText('التقييم رأي المدرب مو قياس')).toBeVisible()
    await expect(page.getByRole('button', { name: /اللاعب 1/, pressed: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'مهارات الحارس' })).toBeVisible()
    await expect(page.getByText('أولوية')).toHaveCount(2) // the two lowest-rated skills, from the latest rating only
    await expect(page.getByRole('heading', { name: /^الأهداف/ })).toContainText('2/3')
    for (const l of ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1']) await expect(page.getByRole('button', { name: new RegExp(l.replace('+', '\\+')) })).toBeVisible()
    await expect(page.getByRole('img', { name: /مؤشر الحمل/ })).toBeVisible()
  })

  test('rating a skill saves, and the change shows as a trend', async ({ page }) => {
    await page.getByRole('button', { name: 'قيّم الآن' }).click()
    await page.getByRole('radio', { name: 'التوزيع 5: ممتاز' }).click()
    await page.getByRole('button', { name: 'احفظ التقييم' }).click()
    await expect(page.getByRole('button', { name: 'قيّم الآن' })).toBeVisible()
    const row = page.getByRole('listitem').filter({ hasText: 'التوزيع' })
    await expect(row).toContainText('تحسّن')
    await expect(row.getByRole('img', { name: '5 من 5' })).toBeVisible()
  })

  test('at most three open goals, and finishing one frees a slot', async ({ page }) => {
    await page.locator('#goalSkill').selectOption('diving')
    await page.locator('#goalDue').fill('2999-01-01')
    await page.getByRole('button', { name: 'أضف هدف' }).click()
    await expect(page.getByRole('heading', { name: /^الأهداف/ })).toContainText('3/3')
    await expect(page.getByRole('button', { name: 'أضف هدف' })).toHaveCount(0)
    await page.getByRole('button', { name: 'أنهِه' }).first().click()
    await expect(page.getByRole('heading', { name: /^الأهداف/ })).toContainText('2/3')
  })

  test('a goal in the past is refused', async ({ page }) => {
    await page.locator('#goalDue').fill('2020-01-01')
    await page.getByRole('button', { name: 'أضف هدف' }).click()
    await expect(page.getByRole('alert')).toContainText('مستقبلي')
  })

  test('a day of the plan opens to its drills, and the dive count only exists for goalkeepers', async ({ page }) => {
    await page.getByRole('button', { name: /^MD-3/ }).click()
    await expect(page.getByText(/ارتماءات\s*30–40/)).toBeVisible()
    await expect(page.getByText('Box jumps')).toBeVisible()
    await page.getByRole('button', { name: /اللاعب 8/ }).click()
    await page.getByRole('button', { name: /^MD-3/ }).click()
    await expect(page.getByText(/ارتماءات/)).toHaveCount(0)
  })

  test('an injured player gets no training plan, only a pointer to the medical staff', async ({ page }) => {
    await page.getByRole('button', { name: /اللاعب 5/ }).click() // injured in the demo squad
    await expect(page.getByRole('status').filter({ hasText: 'مصاب' })).toContainText('الطاقم الطبي')
    await expect(page.getByRole('button', { name: /^MD-3/ })).toHaveCount(0)
  })

  test('logging a session is validated, then listed', async ({ page }) => {
    await page.locator('#logMin').fill('500')
    await page.getByRole('button', { name: 'سجّل الجلسة' }).click()
    await expect(page.getByRole('alert')).toContainText('1–300')
    await page.locator('#logMin').fill('45'); await page.locator('#logRpe').fill('8')
    await page.getByRole('button', { name: 'سجّل الجلسة' }).click()
    await expect(page.getByText('= 360')).toBeVisible()
  })

  test('a player with no history says how many days are missing, and does not invent a ratio', async ({ page }) => {
    await page.getByRole('button', { name: /اللاعب 8/ }).click()
    await expect(page.getByText('مؤشر الحمل يحتاج 28 يوم سجل جلسات')).toBeVisible()
    await expect(page.getByRole('img', { name: /مؤشر الحمل/ })).toHaveCount(0)
  })

  test('medical staff can read the room but cannot rate', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
    await page.goto('/development')
    await expect(page.getByRole('heading', { name: 'مهارات الحارس' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'قيّم الآن' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'أضف هدف' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'سجّل الجلسة' })).toBeVisible() // medical may log load
  })

  test('the federation cannot open it', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin'))
    await page.goto('/development')
    await expect(page).toHaveURL('/federation')
  })
})

test.describe('layout', () => {
  test('no screen of the club or the federation scrolls sideways', async ({ page }) => {
    for (const [role, paths] of [['إدارة النادي', ['/club', '/data', '/development', '/lineup', '/attendance', '/rights', '/analysis', '/report', '/player/demo-9']], ['الاتحاد', ['/federation']]] as const) {
      await as(page, role)
      for (const path of paths) {
        await page.goto(path); await page.waitForTimeout(400)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows`).toBe(true)
      }
      await page.evaluate(() => localStorage.clear())
    }
  })
})

test.describe('match lineup', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/lineup') })
  const pitch = (page: Page) => page.getByRole('group', { name: 'الملعب' })
  const filled = (page: Page) => pitch(page).locator('button:not([aria-label$=": فاضي"])')

  test('an empty lineup says what is missing and cannot be saved', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'تشكيلة المباراة' })).toBeVisible()
    await expect(page.getByText('الأساسيون 0 من 11')).toBeVisible()
    await expect(page.getByRole('button', { name: 'احفظ التشكيلة' })).toBeDisabled()
    await expect(pitch(page).getByRole('button')).toHaveCount(11)
  })

  test('the suggestion fills eleven fit players with the goalkeeper in goal, and explains itself', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    await expect(filled(page)).toHaveCount(11)
    await expect(pitch(page).getByRole('button', { name: 'حارس: اللاعب 1' })).toBeVisible()
    for (const n of [5, 14, 19]) await expect(pitch(page).getByRole('button', { name: new RegExp(`: اللاعب ${n}$`) })).toHaveCount(0) // injured or suspended
    await expect(page.getByRole('heading', { name: 'ليش هالاقتراح' })).toBeVisible()
    await expect(page.getByText('مركزه الأصلي').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'احفظ التشكيلة' })).toBeEnabled()
    await expect(page.getByRole('heading', { name: /^البدلاء/ })).toContainText('2/9') // the demo squad has 13 available: 11 start, 2 sit
  })

  test('an injured player cannot be picked, and the picker lists the natural position first', async ({ page }) => {
    await pitch(page).getByRole('button', { name: /^حارس: / }).click()
    const dialog = page.getByRole('article', { name: 'اختيار لاعب' })
    await expect(dialog.getByRole('button', { name: /اللاعب 1 / })).toBeEnabled()
    await expect(dialog.getByRole('button', { name: /اللاعب 8 / })).toBeDisabled() // an outfield player in goal
    await dialog.getByRole('button', { name: 'إغلاق' }).click()
    await pitch(page).getByRole('button', { name: /^مهاجم: / }).first().click()
    await expect(page.getByRole('article', { name: 'اختيار لاعب' }).getByRole('button', { name: /اللاعب 19 / })).toBeDisabled() // injured
    await expect(page.getByRole('article', { name: 'اختيار لاعب' }).getByRole('button', { name: /اللاعب 9 / })).toBeEnabled()
  })

  test('picking a player by hand fills the slot, and clearing a slot empties it', async ({ page }) => {
    await pitch(page).getByRole('button', { name: /^حارس: / }).click()
    await page.getByRole('button', { name: /اللاعب 22 / }).click()
    await expect(pitch(page).getByRole('button', { name: 'حارس: اللاعب 22' })).toBeVisible()
    await expect(filled(page)).toHaveCount(1)
    await pitch(page).getByRole('button', { name: /^حارس: / }).click()
    await page.getByRole('button', { name: 'أزل اللاعب من الخانة' }).click()
    await expect(filled(page)).toHaveCount(0)
  })

  test('changing the formation keeps the eleven and the goalkeeper', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    await page.getByRole('tab', { name: '3-5-2' }).click()
    await expect(filled(page)).toHaveCount(11)
    await expect(pitch(page).getByRole('button', { name: 'حارس: اللاعب 1' })).toBeVisible()
    await expect(page.getByText('الأساسيون 11 من 11')).toHaveCount(0)
  })

  test('a doubtful player is a warning, not a block', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click() // the demo squad is short of defenders: the doubtful left back is used
    await expect(page.getByRole('status', { name: 'ملاحظات التشكيلة' })).toContainText('اللاعب 3 مشكوك بجاهزيته')
    await expect(page.getByRole('button', { name: 'احفظ التشكيلة' })).toBeEnabled()
  })

  test('saving needs an opponent, then it is listed, survives a reload, opens, and deletes', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    await page.getByRole('button', { name: 'احفظ التشكيلة' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'اسم الخصم' })).toBeVisible()
    await page.locator('#opponent').fill('نادي الخصم')
    await page.getByRole('button', { name: 'احفظ التشكيلة' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انحفظت التشكيلة' })).toBeVisible()
    await expect(page.getByText('ضد نادي الخصم')).toBeVisible()
    await page.reload()
    await expect(page.getByText('ضد نادي الخصم')).toBeVisible()
    await page.getByRole('button', { name: 'امسح' }).click()
    await expect(filled(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'افتح' }).click()
    await expect(filled(page)).toHaveCount(11)
    await expect(page.locator('#opponent')).toHaveValue('نادي الخصم')
    await page.getByRole('button', { name: 'احذف' }).click()
    await expect(page.getByText('ما فيه تشكيلات محفوظة')).toBeVisible()
  })

  test('the bench takes available players only, and each can be removed and re-added', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    await page.getByRole('button', { name: /أزل .* من البدلاء/ }).first().click()
    await expect(page.getByRole('heading', { name: /^البدلاء/ })).toContainText('1/9')
    await page.getByRole('button', { name: 'أضف بديل' }).click()
    const list = page.getByRole('article', { name: 'اختيار لاعب' })
    await expect(list.getByRole('button', { name: /اللاعب 5 / })).toBeDisabled() // injured
    await expect(list.getByRole('button', { name: /اللاعب 14 / })).toBeDisabled() // suspended
    await list.getByRole('button').filter({ hasText: /جاهز/ }).first().click()
    await expect(page.getByRole('heading', { name: /^البدلاء/ })).toContainText('2/9')
  })

  test('the copied text lists the starters in slot order and the bench', async ({ page }) => {
    await page.evaluate(() => { (window as unknown as { __copied: string }).__copied = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => { (window as unknown as { __copied: string }).__copied = t } }, configurable: true }) })
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    await page.locator('#opponent').fill('الخصم')
    await page.getByRole('button', { name: 'انسخ كنص' }).click()
    const text = await page.evaluate(() => (window as unknown as { __copied: string }).__copied)
    expect(text).toContain('تشكيلة المباراة ضد الخصم')
    expect(text).toContain('التشكيل: 4-3-3')
    expect(text).toContain('1 · اللاعب 1')
    expect(text.match(/ · اللاعب /g)!.length).toBe(13) // 11 starters + 2 on the bench
    expect(text).not.toMatch(/اللاعب (5|14|19)\b/)
  })

  test('medical staff and the federation cannot open it', async ({ page }) => {
    for (const role of ['medical', 'bfa_admin']) {
      await page.evaluate((r) => localStorage.setItem('sh.demoRole', r), role)
      await page.goto('/lineup')
      await expect(page).not.toHaveURL(/lineup/)
    }
  })

  test('on a phone the eleven slots do not overlap and nothing scrolls sideways', async ({ page }) => {
    await page.getByRole('button', { name: 'اقترح التشكيلة' }).click()
    for (const f of ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']) {
      await page.getByRole('tab', { name: f }).click(); await page.waitForTimeout(700)
      const boxes = await pitch(page).getByRole('button').evaluateAll((els) => els.map((e) => { const c = e.querySelector('span')!.getBoundingClientRect(); return [c.x, c.y, c.width, c.height] }))
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]]
        const overlap = a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
        expect(overlap, `${f}: slots ${i + 1} and ${j + 1} overlap`).toBe(false)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  })
})

test.describe('attendance', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/attendance') })
  const sheet = (page: Page) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'تسجيل جلسة' }) })
  const row = (page: Page, n: number) => sheet(page).getByRole('listitem').filter({ has: page.getByRole('radiogroup', { name: new RegExp(`حضور اللاعب ${n}$`) }) })
  const mark = (page: Page, n: number, s: string) => page.getByRole('radiogroup', { name: new RegExp(`حضور اللاعب ${n}$`) }).getByRole('radio', { name: s, exact: true }).click()

  test('everyone starts present, the injured one as an excused medical absence, with live counts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'الحضور والغياب' })).toBeVisible()
    const summary = page.getByRole('status', { name: 'ملخص التسجيل' })
    await expect(summary).toContainText('حاضر 14')
    await expect(summary).toContainText('غائب بعذر 2') // 5 and 19 are listed as injured
    await expect(page.getByRole('combobox', { name: 'سبب غياب اللاعب 5' })).toHaveValue('medical')
    await expect(page.getByRole('radiogroup', { name: 'حضور اللاعب 9' }).getByRole('radio', { name: 'حاضر' })).toHaveAttribute('aria-checked', 'true')
  })

  test('marking exceptions updates the counts, and the excuse list only appears for an excused absence', async ({ page }) => {
    await mark(page, 3, 'متأخر'); await mark(page, 11, 'غائب'); await mark(page, 9, 'غائب بعذر')
    const summary = page.getByRole('status', { name: 'ملخص التسجيل' })
    await expect(summary).toContainText('متأخر 1'); await expect(summary).toContainText('غائب 1'); await expect(summary).toContainText('غائب بعذر 3')
    await expect(page.getByRole('combobox', { name: 'سبب غياب اللاعب 9' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'سبب غياب اللاعب 11' })).toHaveCount(0)
    await page.getByRole('combobox', { name: 'سبب غياب اللاعب 9' }).selectOption('travel')
    await page.getByRole('button', { name: 'الكل حاضر' }).click()
    await expect(summary).toContainText('حاضر 14')
  })

  test('saving a session lists it and replaces it when saved again', async ({ page }) => {
    await mark(page, 11, 'غائب')
    await page.getByRole('button', { name: 'احفظ التسجيل' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انحفظ التسجيل' })).toBeVisible()
    await expect(page.getByText('هالجلسة مسجّلة من قبل')).toBeVisible()
    await expect(page.getByRole('button', { name: 'احفظ التعديل' })).toBeVisible()
    await page.reload()
    await expect(page.getByText('هالجلسة مسجّلة من قبل')).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'حضور اللاعب 11' }).getByRole('radio', { name: 'غائب', exact: true })).toHaveAttribute('aria-checked', 'true') // the saved mark is reloaded
  })

  test('a future day and a day older than 90 days cannot be chosen', async ({ page }) => {
    await page.locator('#attDay').fill('2999-01-01')
    await expect(page.getByRole('alert')).toContainText('آخر 90 يوم')
    await expect(page.getByRole('button', { name: /احفظ/ })).toHaveCount(0)
    await page.locator('#attDay').fill('2020-01-01')
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('the figures: repeated absence is flagged with its definition, excused absences are not counted against, too little data says so', async ({ page }) => {
    const stats = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /الالتزام آخر 30 يوم/ }) })
    const p11 = stats.locator('[data-player="11"]')
    await expect(p11).toContainText('غياب متكرر')
    await expect(stats.getByRole('listitem').first()).toHaveAttribute('data-player', '11') // worst first
    await expect(stats.locator('[data-player="5"]')).toContainText('بعذر') // the injured, excused every time
    await expect(stats.locator('[data-player="5"]')).toContainText('بيانات قليلة') // 0 counted sessions
    await expect(page.getByText('الغياب بعذر ما يحسب ضد اللاعب')).toBeVisible()
    const p3 = stats.locator('[data-player="3"]') // often late: still counts as attended
    await expect(p3.getByRole('img', { name: /نسبة الحضور 100%/ })).toBeVisible()
  })

  test('the club room "today" strip mentions repeated absence and links here', async ({ page }) => {
    await page.goto('/club')
    const link = page.getByRole('region', { name: 'اليوم' }).getByRole('link', { name: /غياب متكرر.*: 1/ })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/attendance/)
  })

  test('opening a past session loads its marks, and it can be deleted', async ({ page }) => {
    await page.getByRole('button', { name: 'افتح' }).first().click()
    await expect(page.getByText('هالجلسة مسجّلة من قبل')).toBeVisible()
    const n = await page.getByRole('button', { name: 'احذف' }).count()
    await page.getByRole('button', { name: 'احذف' }).first().click()
    await expect(page.getByRole('button', { name: 'احذف' })).toHaveCount(n - 1)
  })

  test('medical staff can read the figures but not record', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
    await page.goto('/attendance')
    await expect(page.getByRole('heading', { name: /الالتزام آخر 30 يوم/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'تسجيل جلسة' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'احذف' })).toHaveCount(0)
  })

  test('the federation cannot open it', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin'))
    await page.goto('/attendance')
    await expect(page).not.toHaveURL(/attendance/)
  })

  test('on a phone each row fits its four buttons and nothing scrolls sideways', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const small = await page.getByRole('radiogroup').first().getByRole('radio').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height] }))
    for (const [w, h] of small) { expect(w).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44) }
  })
})

test.describe('player rights', () => {
  const AGREEMENT = { reference: 'REF-1', signatory: 'اسم تجريبي', title: 'مدير', signedOn: '2026-01-01', version: 'dpa-draft-1' }
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/rights') })
  const card = (page: Page, text: string) => page.locator('[data-request]').filter({ hasText: text })
  const log = async (page: Page, player: string, kind: string, day?: string) => {
    await page.locator('#rqPlayer').selectOption({ label: player }); await page.locator('#rqKind').selectOption({ label: kind })
    if (day) await page.locator('#rqDay').fill(day)
    await page.getByRole('button', { name: 'سجّل الطلب' }).click()
  }
  const squadLabel = (n: number) => new RegExp(`^${n} · اللاعب ${n}$`)

  test('shows the seeded requests with an internal deadline, and the honest note', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'طلبات اللاعبين وحقوقهم' })).toBeVisible()
    await expect(page.getByText('مو صياغة قانونية')).toBeVisible()
    await expect(page.locator('[data-request]')).toHaveCount(2)
    await expect(card(page, 'اللاعب 3')).toHaveAttribute('data-tone', 'soon')
    await expect(card(page, 'اللاعب 8')).toHaveAttribute('data-tone', 'ok')
    await expect(page.getByText('* لاعبون وطلبات ورواتب خيالية')).toBeVisible()
  })

  test('logging a request adds it, a second open one of the same kind is refused, a late one raises the club strip', async ({ page }) => {
    await log(page, '9 · اللاعب 9', 'اعتراض')
    await expect(page.getByRole('status').filter({ hasText: 'انسجل الطلب' })).toBeVisible()
    await expect(card(page, 'اعتراض')).toHaveCount(1)
    await log(page, '9 · اللاعب 9', 'اعتراض')
    await expect(page.getByText('فيه طلب مفتوح من هالنوع لنفس اللاعب.')).toBeVisible()
    const old = await page.evaluate(() => new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10))
    await log(page, '10 · اللاعب 10', 'تصحيح بيانات', old)
    await expect(card(page, 'اللاعب 10')).toHaveAttribute('data-tone', 'late')
    await page.goto('/club')
    await expect(page.getByText('طلبات لاعبين تعدّت مهلتها الداخلية: 1')).toBeVisible()
  })

  test('an access request cannot be closed before the export, which warns first and downloads a file', async ({ page }) => {
    const c = card(page, 'نسخة من بياناته')
    await expect(c.getByRole('button', { name: 'سكّر الطلب' })).toHaveCount(0)
    await c.getByRole('button', { name: 'صدّر النسخة' }).click()
    await expect(c.getByRole('alert')).toContainText('بيانات حساسة')
    const [dl] = await Promise.all([page.waitForEvent('download'), c.getByRole('button', { name: 'نزّل الملف' }).click()])
    expect(dl.suggestedFilename()).toMatch(/^player-8-\d{4}-\d{2}-\d{2}\.json$/)
    const body = JSON.parse(await (await import('node:fs/promises')).readFile((await dl.path())!, 'utf8'))
    expect(body.player.name).toBe('اللاعب 8')
    expect(body.attendance.length).toBeGreaterThan(0)
    await expect(c).toContainText('صُدّرت النسخة')
    await c.getByRole('button', { name: 'سكّر الطلب' }).click()
    await expect(c).toContainText('سُكّر')
    await expect(c.getByRole('button')).toHaveCount(0)
  })

  test('a correction request closes once handled', async ({ page }) => {
    const c = card(page, 'تصحيح بيانات')
    await c.getByRole('button', { name: 'تم التصحيح' }).click()
    await expect(c).toHaveAttribute('data-tone', 'done')
  })

  test('a withdrawal asks twice, then the player is gone and the request keeps only the consent reference', async ({ page }) => {
    await log(page, '17 · اللاعب 17', 'سحب الموافقة وحذف')
    const c = card(page, 'سحب الموافقة')
    await c.getByRole('button', { name: 'نفّذ الحذف' }).click()
    await expect(c.getByRole('alert')).toContainText('ما يرجع')
    await c.getByRole('button', { name: 'أكّد الحذف' }).click()
    await expect(c).toContainText('لاعب محذوف')
    await expect(c).toContainText('DEMO-17')
    await expect(page.locator('#rqPlayer option', { hasText: 'اللاعب 17' })).toHaveCount(0)
  })

  test('the pay ledger needs the data agreement, then saves a month and keeps it after reload', async ({ page }) => {
    await page.getByRole('tab', { name: /الرواتب والعقد/ }).click()
    await expect(page.getByText('سجل الرواتب يحتاج اتفاقية معالجة بيانات فعّالة')).toBeVisible()
    await page.evaluate((a) => localStorage.setItem('sh.demoAgreement', JSON.stringify(a)), AGREEMENT)
    await page.goto('/rights'); await page.getByRole('tab', { name: /الرواتب والعقد/ }).click()
    await expect(page.getByRole('heading', { name: 'سجل الرواتب' })).toBeVisible()
    const month = page.getByRole('group', { name: 'الشهر' }).getByRole('button').first()
    await month.click()
    const p9 = page.getByRole('button', { name: 'انصرف راتب اللاعب 9' })
    await expect(p9).toHaveAttribute('aria-pressed', 'false')
    await p9.click()
    await expect(p9).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'احفظ الشهر' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انحفظ الشهر' })).toBeVisible()
    await page.reload(); await page.getByRole('tab', { name: /الرواتب والعقد/ }).click()
    await expect(page.getByRole('button', { name: 'انصرف راتب اللاعب 9' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('last month shows player 11 late only once the grace days have passed, and never in a month with no records', async ({ page }) => {
    await page.evaluate((a) => localStorage.setItem('sh.demoAgreement', JSON.stringify(a)), AGREEMENT)
    await page.goto('/rights'); await page.getByRole('tab', { name: /الرواتب والعقد/ }).click()
    const months = page.getByRole('group', { name: 'الشهر' }).getByRole('button')
    await months.nth(1).click()
    const expected = await page.evaluate(() => { const n = new Date(); const end = Date.UTC(n.getFullYear(), n.getMonth(), 0); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - end > 15 * 86_400_000 })
    await expect(page.locator('[data-pay="11"]')).toHaveAttribute('data-late', String(expected))
    await expect(page.locator('[data-pay="9"]')).toHaveAttribute('data-late', 'false')
    await months.nth(0).click()
    await expect(page.locator('[data-late="true"]')).toHaveCount(0)
  })

  test('medical staff and the federation cannot open it', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
    await page.goto('/rights'); await expect(page).toHaveURL('/medical')
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin'))
    await page.goto('/rights'); await expect(page).toHaveURL('/federation')
  })

  test('"احذف كل بياناتي" clears the sandbox', async ({ page }) => {
    await log(page, '9 · اللاعب 9', 'اعتراض')
    await expect(card(page, 'اعتراض')).toHaveCount(1)
    await page.goto('/settings')
    await page.getByRole('button', { name: 'احذف كل بياناتي' }).click()
    await page.getByRole('button', { name: 'أكّد الحذف' }).click()
    await expect(page).toHaveURL(/\/login/)
    expect(await page.evaluate(() => localStorage.getItem('sh.demoRights'))).toBeNull()
  })
})

test.describe('match report', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي'); await page.goto('/analysis') })
  const open = async (page: Page) => { await page.locator('[data-report="نادي تجريبي 07"]').click(); await expect(page.locator('[data-replay]')).toBeVisible(); await page.getByRole('button', { name: 'للنهاية' }).click() }
  const at = async (page: Page, m: number) => { await page.locator('#replayMinute').fill(String(m)) }
  const score = (page: Page) => page.locator('[data-score]').evaluateAll((els) => els.map((e) => e.textContent!.trim()).join(':'))

  test('lists the seeded match, says what it is and is not, and opens the replay', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'تقرير المباراة' })).toBeVisible()
    await expect(page.getByText('ما فيه فيديو ولا تتبع لاعبين ولا ذكاء اصطناعي')).toBeVisible()
    await expect(page.getByText('* مباراة وأحداث خيالية')).toBeVisible()
    await open(page)
    await expect(page.locator('[data-clock]')).toContainText('94')
  })

  test('the score follows the scrubber minute by minute, from the goals only', async ({ page }) => {
    await open(page)
    for (const [m, s] of [[0, '0:0'], [22, '0:0'], [23, '1:0'], [54, '1:0'], [55, '1:1'], [67, '2:1'], [87, '2:1'], [88, '2:2'], [94, '2:2']] as const) {
      await at(page, m); expect(await score(page), `minute ${m}`).toBe(s)
    }
    await expect(page.locator('[data-replay] .sr-only').first()).toContainText('النتيجة النهائية: نحن 2')
  })

  test('play advances the clock at the chosen speed, pause holds it, and the end stops it', async ({ page }) => {
    await open(page)
    await at(page, 0)
    await page.getByRole('group', { name: 'السرعة' }).getByRole('button', { name: '4×' }).click()
    await expect(page.getByRole('group', { name: 'السرعة' }).getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'شغّل' }).click()
    await expect(page.getByRole('button', { name: 'إيقاف' })).toBeVisible()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'إيقاف' }).click()
    const held = Number((await page.locator('[data-clock] .num').textContent())!)
    expect(held).toBeGreaterThanOrEqual(3); expect(held).toBeLessThan(40)
    await page.waitForTimeout(500)
    expect(Number((await page.locator('[data-clock] .num').textContent())!)).toBe(held)
    await page.getByRole('button', { name: 'للنهاية' }).click()
    await expect(page.getByRole('button', { name: 'أعد العرض' })).toBeVisible()
  })

  test('the shot map, momentum and events grow with the replay', async ({ page }) => {
    await open(page)
    const dots = page.locator('[data-shot]')
    await at(page, 0); await expect(dots).toHaveCount(0); await expect(page.locator('[data-events] li')).toHaveCount(0)
    await at(page, 23); await expect(dots).toHaveCount(3); await expect(page.locator('[data-events] li').first()).toContainText('هدف')
    await at(page, 94); expect(await dots.count()).toBeGreaterThan(10)
    await expect(page.locator('[data-shot="goal"]')).toHaveCount(4)
  })

  test('the keeper line and the team notes come from the same numbers, and grade nobody', async ({ page }) => {
    await open(page)
    await expect(page.locator('[data-keeper]')).toContainText('تصدّى لـ 5 من 7')
    await expect(page.locator('[data-keeper]')).toContainText('استقبل 2')
    await expect(page.locator('[data-keeper]')).toContainText('71%')
    await expect(page.locator('[data-notes]')).toContainText('استقبلنا هدف بآخر')
    await expect(page.getByText('مو تقييم للحارس')).toBeVisible()
    await at(page, 30); await expect(page.locator('[data-keeper]')).toContainText('استقبل 0')
  })

  test('with reduced motion nothing plays by itself and the final state is shown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await page.locator('[data-report="نادي تجريبي 07"]').click()
    await expect(page.locator('[data-clock]')).toContainText('94')
    expect(await score(page)).toBe('2:2')
    await expect(page.getByRole('button', { name: 'أعد العرض' })).toBeVisible()
  })

  test('a new report: needs an opponent and events, refuses a bad minute, then replays what was typed', async ({ page }) => {
    await page.getByRole('button', { name: 'تقرير جديد' }).click()
    const save = page.getByRole('button', { name: 'احفظ التقرير' })
    await expect(save).toBeDisabled()
    await page.locator('#anOpp').fill('خصم تجريبي')
    await page.locator('#evMin').fill('131'); await page.getByRole('button', { name: 'أضف الحدث' }).click()
    await expect(page.getByText('الدقيقة من 0 إلى 130')).toBeVisible()
    await page.locator('#evMin').fill('10'); await page.getByRole('group', { name: 'نوع الحدث' }).getByRole('button', { name: 'هدف', exact: true }).click(); await page.getByRole('button', { name: 'أضف الحدث' }).click()
    await page.locator('#evMin').fill('50'); await page.getByRole('group', { name: 'الفريق' }).getByRole('button', { name: 'الخصم' }).click(); await page.getByRole('button', { name: 'أضف الحدث' }).click()
    await expect(page.locator('[data-draft] li')).toHaveCount(2)
    await expect(page.locator('#evPlayer')).toHaveCount(0) // no player on the opponent side
    await expect(save).toBeEnabled(); await save.click()
    await expect(page.locator('[data-replay]')).toBeVisible()
    await page.getByRole('button', { name: 'للنهاية' }).click()
    expect(await score(page)).toBe('1:1')
    await expect(page.locator('[data-report="خصم تجريبي"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('tapping the small pitch places an approximate position on a shot', async ({ page }) => {
    await page.getByRole('button', { name: 'تقرير جديد' }).click()
    await page.locator('#anOpp').fill('خصم تجريبي')
    await page.getByRole('img', { name: 'حدّد موضع التسديدة' }).click({ position: { x: 100, y: 40 } })
    await expect(page.getByText('محدد')).toBeVisible()
    await page.getByRole('button', { name: 'أضف الحدث' }).click()
    await expect(page.locator('[data-draft] li').first()).toContainText('بموضع')
  })

  test('a report can be deleted', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'احذف التقرير' }).click()
    await expect(page.locator('[data-report]')).toHaveCount(0)
  })

  test('medical staff and the federation cannot open it', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical'))
    await page.goto('/analysis'); await expect(page).toHaveURL('/medical')
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin'))
    await page.goto('/analysis'); await expect(page).toHaveURL('/federation')
  })

  test('nothing scrolls sideways with a report open', async ({ page }) => {
    await open(page); await page.waitForTimeout(400)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test.describe('phone tab bar', () => {
  test('the fifth tab opens the rest of the screens, so none is out of reach', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 1000) >= 768, 'the tab bar is phone only')
    await as(page, 'إدارة النادي')
    const bar = page.locator('nav.fixed')
    await expect(bar.getByRole('link')).toHaveCount(4)
    await bar.getByRole('button', { name: 'المزيد' }).click()
    await expect(page.locator('#more-menu').getByRole('link', { name: 'حقوق اللاعبين' })).toBeVisible()
    await page.locator('#more-menu').getByRole('link', { name: 'حقوق اللاعبين' }).click()
    await expect(page).toHaveURL(/rights/)
    await expect(page.locator('#more-menu')).toHaveCount(0)
    await expect(bar.getByRole('button', { name: 'المزيد' })).toBeVisible()
  })
})

test.describe('club toolkit', () => {
  test.beforeEach(async ({ page }) => { await as(page, 'إدارة النادي') })
  const IMPORT = [{ num: 1, name: 'لاعب ١', pos: 'حارس مرمى', status: 'fit', ends_on: '2027-06-30', monthly_wage_bhd: 500, consent_ref: 'C-1' }]
  const AGREEMENT = { reference: 'REF-1', signatory: 'اسم تجريبي', title: 'مدير', signedOn: '2026-01-01', version: 'dpa-draft-1' }

  test('"ابدأ هنا" counts what exists, links each step, hides, and disappears when all four are done', async ({ page }) => {
    await page.goto('/club')
    const card = page.locator('[data-start]')
    await expect(card).toContainText('2 من 4')
    await expect(card.locator('[data-step="agreement"]')).toHaveAttribute('data-done', 'false')
    await expect(card.locator('[data-step="attendance"]')).toHaveAttribute('data-done', 'true')
    await expect(card.getByRole('link', { name: /اتفاقية معالجة/ })).toHaveAttribute('href', '/data')
    await card.getByRole('button', { name: 'أخفها' }).click()
    await expect(card).toHaveCount(0)
    await page.reload(); await expect(page.locator('[data-start]')).toHaveCount(0)
    await page.getByRole('button', { name: /أظهر «ابدأ هنا»/ }).click(); await expect(page.locator('[data-start]')).toBeVisible()
    await page.evaluate(([a, i]) => { localStorage.setItem('sh.demoAgreement', JSON.stringify(a)); localStorage.setItem('sh.demoImport', JSON.stringify(i)) }, [AGREEMENT, IMPORT] as const)
    await page.reload()
    await expect(page.locator('[data-start]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /أظهر «ابدأ هنا»/ })).toHaveCount(0)
  })

  test('the player file opens from the squad number and shows facts, the coach\'s ratings and counts, never a grade', async ({ page }) => {
    await page.goto('/club')
    await page.getByRole('link', { name: 'ملف اللاعب 9' }).click()
    await expect(page).toHaveURL(/\/player\/demo-9/)
    await expect(page.getByRole('heading', { name: 'اللاعب 9' })).toBeVisible()
    await expect(page.locator('[data-att]')).toContainText('نسبة الحضور')
    await expect(page.locator('[data-recent] li').first()).toBeVisible()
    await expect(page.locator('[data-match]')).toContainText('أهداف 1')
    await expect(page.locator('[data-match]')).toContainText('تسديدات 3 (على المرمى 1)')
    await expect(page.getByText('مو تقييم أداء')).toBeVisible()
    await page.goto('/player/demo-1')
    await expect(page.locator('[data-avg]')).toContainText('متوسط')
    await expect(page.locator('[data-skills] li').first()).toBeVisible()
    await expect(page.locator('[data-load]')).toBeVisible()
    await expect(page.locator('[data-match]')).toContainText('ما فيه أحداث')
    await expect(page.getByText('تقييم المدرب رأي مو قياس')).toBeVisible()
  })

  test('an unknown player says so, and medical staff and the federation cannot open a file', async ({ page }) => {
    await page.goto('/player/nobody'); await expect(page.getByRole('alert')).toContainText('ما لقينا هذا اللاعب')
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'medical')); await page.goto('/player/demo-9'); await expect(page).toHaveURL('/medical')
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin')); await page.goto('/player/demo-9'); await expect(page).toHaveURL('/federation')
  })

  test('the monthly report holds team counters only, follows the month, prints clean, and is closed to others', async ({ page }) => {
    await page.goto('/report')
    await expect(page.getByRole('heading', { name: 'التقرير الشهري' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText('اللاعب 9')
    await expect(page.locator('main')).not.toContainText('BHD')
    const expected = await page.evaluate(() => { const n = new Date(); const d = new Date(Date.now() - 6 * 86_400_000); return d.getMonth() === n.getMonth() ? 1 : 0 })
    await expect(page.locator('[data-rep="matches"]').getByText('مباريات', { exact: true }).locator('..')).toContainText(String(expected))
    await page.locator('#rpMonth').selectOption({ index: 5 })
    await expect(page.locator('[data-rep="attendance"]').getByText('نسبة الحضور').locator('..')).toContainText('—')
    await page.locator('#rpMonth').selectOption({ index: 0 })
    await page.evaluate(() => { (window as unknown as { __printed: number }).__printed = 0; window.print = () => { (window as unknown as { __printed: number }).__printed++ } })
    await page.getByRole('button', { name: 'اطبع أو احفظ PDF' }).click()
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('header').first()).toBeHidden(); await expect(page.locator('.no-print').first()).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => localStorage.setItem('sh.demoRole', 'bfa_admin')); await page.goto('/report'); await expect(page).toHaveURL('/federation')
  })

  test('the internal operations log is collapsed, says what it stores, and says plainly it needs the real database', async ({ page }) => {
    await page.goto('/data')
    const d = page.locator('details').filter({ hasText: 'سجل العمليات (داخلي)' })
    await expect(d.getByText('بدون أسماء ولا قيم')).toBeHidden()
    await d.locator('summary').click()
    await expect(d.getByText('بدون أسماء ولا قيم')).toBeVisible()
    await expect(d.getByText('السجل يشتغل مع قاعدة البيانات الحقيقية')).toBeVisible()
  })
})
