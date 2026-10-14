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
    await expect(strip.getByRole('link', { name: /لاعبون غير متاحين/ })).toBeVisible()
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
    for (const [role, paths] of [['إدارة النادي', ['/club', '/data', '/development']], ['الاتحاد', ['/federation']]] as const) {
      await as(page, role)
      for (const path of paths) {
        await page.goto(path); await page.waitForTimeout(400)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows`).toBe(true)
      }
      await page.evaluate(() => localStorage.clear())
    }
  })
})
