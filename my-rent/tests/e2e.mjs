// اختبار شامل: npm run build && npm test   (يشغّل vite preview ويفحص بـ Chromium)
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const exe = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
let failed = 0;
const ok = (cond, name, extra = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); if (!cond) failed++; };

async function waitServer() {
  for (let i = 0; i < 50; i++) { try { await fetch(URL); return; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  throw new Error("preview server did not start");
}

try {
  await waitServer();
  const browser = await chromium.launch({ executablePath: exe });
  const pages = ["home", "tenants", "budget", "bank", "reports", "house", "vendors", "settings"];

  // 1) كل الشاشات بكل الأحجام: بدون scroll أفقي وبدون أخطاء
  for (const [w, h] of [[390, 844], [820, 1180], [1280, 800]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    for (const id of pages) {
      await p.goto(URL + "#" + id); await p.waitForTimeout(650);
      const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (over) ok(false, `no h-scroll ${w}px #${id}`);
    }
    ok(errors.length === 0, `${w}px: 8 شاشات بدون أخطاء وبدون scroll أفقي`, errors.join(" | "));
    await p.close();
  }

  // 2) متأخرات + واتساب + تسجيل دفعة + تراجع + إيصال
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(URL + "#tenants"); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  await p.getByRole("radio", { name: /متأخر/ }).click();
  ok(await p.locator(".unit-card").count() >= 1, "فيه وحدات متأخرة من أشهر سابقة");
  await p.locator(".unit-card").first().click(); await p.waitForTimeout(350);
  const name = (await p.locator(".dlg-head h2").innerText()).split(" · ")[0];
  ok(await p.locator(".arrears").isVisible(), "نافذة الوحدة تبين المتأخرات", await p.locator(".arrears .strong").innerText());
  ok((await p.locator(".btn-wa").getAttribute("href")).startsWith("https://wa.me/"), "زر تذكير الواتساب فيه الرسالة");
  const hist0 = await p.locator(".dlg .rows-tap li").count();
  await p.fill("#pay-amount", "abc"); await p.getByRole("button", { name: "سجّل الدفعة" }).click();
  ok(await p.locator(".field-error").isVisible(), "مبلغ غلط يطلع رسالة خطأ");
  const owed0 = await p.locator(".dlg .chips").first().locator(".chip").count();
  await p.locator(".dlg .chips").first().locator(".chip").first().click();
  await p.getByRole("button", { name: "سجّل الدفعة" }).click(); await p.waitForTimeout(400);
  ok(await p.locator(".toast").isVisible(), "تطلع رسالة بعد التسجيل", (await p.locator(".toast").innerText()).split("\n")[0]);
  await p.getByRole("radio", { name: /الكل/ }).click(); await p.waitForTimeout(100);
  await p.locator(".unit-card", { hasText: name + " " }).first().click(); await p.waitForTimeout(350);
  ok(await p.locator(".dlg .rows-tap li").count() === hist0 + 1, "الدفعة انضافت لسجل الوحدة");
  const owed1 = await p.locator(".dlg .pay-form .chips").first().locator(".chip").count();
  ok(owed1 === owed0 - 1, "أقدم شهر متأخر انسدّ", `${owed0} → ${owed1}`);
  await p.locator(".dlg .rows-tap li button").first().click(); await p.waitForTimeout(450);
  ok(await p.getByRole("dialog", { name: "إيصال استلام إيجار" }).isVisible(), "الإيصال ينفتح من سجل الدفعات");
  ok(await p.locator("#receipt img[alt='إداراتي']").isVisible(), "الإيصال عليه شعار إداراتي");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);

  // 3) Escape يسكّر النافذة
  await p.locator(".unit-card").first().click(); await p.waitForTimeout(350);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok(await p.getByRole("dialog").count() === 0, "Escape يسكّر النافذة");

  // 4) العدّاد بالرئيسية يوصل للرقم الجديد بعد الدفعة
  await p.goto(URL + "#home"); await p.waitForTimeout(700);
  const before = await p.locator(".hero-amount").innerText();
  await p.locator(".fab").click(); await p.waitForTimeout(350);
  await p.locator(".dlg .row-btn").first().click(); await p.waitForTimeout(400);
  await p.locator(".dlg .pay-form .chips").first().locator(".chip").last().click();
  await p.getByRole("button", { name: "سجّل الدفعة" }).click(); await p.waitForTimeout(900);
  const after = await p.locator(".hero-amount").innerText();
  ok(before !== after, "التحصيل يتحدّث بعد الدفعة", `${before} → ${after}`);

  // 5) مصروف جديد
  await p.goto(URL + "#budget"); await p.waitForTimeout(700);
  const spent0 = await p.locator(".summary .big").first().innerText();
  await p.locator(".fab").click(); await p.waitForTimeout(350);
  await p.fill("#exp-label", "اختبار"); await p.fill("#exp-amount", "12.500");
  await p.getByRole("button", { name: "أضف المصروف" }).click(); await p.waitForTimeout(900);
  ok(spent0 !== await p.locator(".summary .big").first().innerText(), "المصروف ينضاف للميزانية");

  // 6) الصيانة: تأشير «تم»
  await p.goto(URL + "#house"); await p.waitForTimeout(700);
  const done0 = await p.locator('.task[aria-checked="true"]').count();
  await p.locator('.task[aria-checked="false"]').first().click();
  ok(await p.locator('.task[aria-checked="true"]').count() === done0 + 1, "مهمة الصيانة تتأشّر «تم»");

  // 7) الإعدادات: حذف كل البيانات ثم رجوع التجريبي
  await p.goto(URL + "#settings"); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "احذف كل البيانات" }).click();
  await p.getByRole("button", { name: "أكيد، احذف" }).click(); await p.waitForTimeout(300);
  await p.goto(URL + "#tenants"); await p.waitForTimeout(700);
  ok(await p.locator(".unit-card").count() === 0, "الحذف يمسح كل الوحدات");
  await p.goto(URL + "#settings"); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "رجّع البيانات التجريبية" }).click(); await p.waitForTimeout(300);
  await p.goto(URL + "#tenants"); await p.waitForTimeout(700);
  ok(await p.locator(".unit-card").count() === 7, "التجريبي يرجع");

  // 8) DW-014: وحدة جديدة + تعديل + إخلاء + حذف
  await p.goto(URL + "#tenants"); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  const n0 = await p.locator(".unit-card").count();
  await p.locator(".fab").click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: "أضف الوحدة" }).click();
  ok(await p.locator(".unit-form .field-error").isVisible(), "نموذج الوحدة يرفض بدون اسم");
  await p.fill("#u-name", "شقة 9"); await p.fill("#u-rent", "210"); await p.fill("#u-day", "28"); await p.fill("#u-tenant", "مستأجر تجريبي");
  await p.getByRole("button", { name: "أضف الوحدة" }).click(); await p.waitForTimeout(400);
  ok(await p.locator(".unit-card").count() === n0 + 1, "الوحدة الجديدة انضافت");
  await p.locator(".unit-card", { hasText: "شقة 9 " }).click(); await p.waitForTimeout(350);
  ok(await p.locator(".dlg .pill-due").count() >= 1 && await p.locator(".arrears").count() === 0, "مستأجر جديد = مستحق بدون متأخرات قديمة");
  await p.getByRole("button", { name: "تعديل" }).click(); await p.waitForTimeout(400);
  await p.fill("#u-rent", "225.500"); await p.getByRole("button", { name: "احفظ التعديل" }).click(); await p.waitForTimeout(400);
  ok((await p.locator(".unit-card", { hasText: "شقة 9 " }).innerText()).includes("225.500"), "تعديل الإيجار انحفظ");
  await p.locator(".unit-card", { hasText: "شقة 9 " }).click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: "إخلاء الوحدة" }).click();
  await p.getByRole("button", { name: "أكيد، أخلِها" }).click(); await p.waitForTimeout(400);
  ok((await p.locator(".unit-card", { hasText: "شقة 9 " }).innerText()).includes("شاغر"), "الإخلاء خلّى الوحدة شاغرة");
  await p.locator(".unit-card", { hasText: "شقة 9 " }).click(); await p.waitForTimeout(350);
  await p.getByRole("button", { name: "حذف الوحدة" }).click(); await p.waitForTimeout(400);
  ok(await p.locator(".unit-card").count() === n0, "حذف وحدة شاغرة بدون دفعات");
  await p.locator(".unit-card", { hasText: "شقة 1 " }).click(); await p.waitForTimeout(350);
  ok(await p.getByRole("button", { name: "حذف الوحدة" }).count() === 0, "وحدة عليها دفعات ما ينعرض لها حذف");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // 9) عقود تنتهي + التقارير + CSV
  await p.goto(URL + "#home"); await p.waitForTimeout(700);
  ok(await p.getByRole("heading", { name: "عقود تنتهي قريب" }).isVisible(), "تنبيه العقد اللي ينتهي خلال 30 يوم");
  await p.goto(URL + "#reports"); await p.waitForTimeout(1200);
  ok(await p.locator(".chart rect").count() === 12 && await p.locator(".tbl tbody tr").count() === 6, "التقارير: 6 أشهر × دخل/مصروف");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "تصدير CSV للمحاسب" }).click()]);
  const csv = (await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
  ok(csv.charCodeAt(0) === 0xFEFF && csv.includes("إيجار") && csv.includes("مصروف"), "CSV فيه BOM وعربي", dl.suggestedFilename());

  // 10) PWA: يفتح بدون إنترنت
  const oc = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const op = await oc.newPage();
  await op.goto(URL); await op.evaluate(() => navigator.serviceWorker.ready); await op.reload(); await op.waitForTimeout(800);
  await oc.setOffline(true); await op.reload(); await op.waitForTimeout(1000);
  ok(await op.locator(".hero-card").isVisible(), "يفتح بدون إنترنت (service worker)");
  await oc.close();

  // 12) DW-015: نقاط الأشهر + الختم + السحب + المؤشر
  await p.goto(URL + "#tenants"); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  ok(await p.locator(".unit-card", { hasText: "شقة 1 " }).locator(".dot").count() === 6, "6 نقاط أشهر على بطاقة الوحدة");
  ok(await p.locator(".unit-card", { hasText: "شقة 3 " }).locator(".dot-late").count() >= 2, "نقاط المتأخر حمراء لشقة 3");
  const ind0 = await p.locator(".bottom-ind").evaluate((e) => e.style.transform);
  await p.getByRole("button", { name: "الميزانية" }).click(); await p.waitForTimeout(450);
  ok(ind0 !== await p.locator(".bottom-ind").evaluate((e) => e.style.transform), "مؤشر التبويب ينزلق للتبويب الجديد");
  await p.goto(URL + "#tenants"); await p.waitForTimeout(600);
  await p.locator(".unit-card", { hasText: "شقة 2 " }).click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "سجّل الدفعة" }).click(); await p.waitForTimeout(150);
  ok(await p.locator(".stamp").count() === 1, "ختم «مستلم» يطلع مع الدفعة");
  await p.waitForTimeout(900);
  ok(await p.locator(".stamp").count() === 0, "الختم يختفي بروحه");
  await p.locator(".unit-card").first().click(); await p.waitForTimeout(450);
  const g = await p.locator(".dlg .sheet-grip").boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + 4); await p.mouse.down();
  await p.mouse.move(g.x + g.width / 2, g.y + 60, { steps: 4 }); await p.mouse.move(g.x + g.width / 2, g.y + 260, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(450);
  ok(await p.getByRole("dialog").count() === 0, "سحب النافذة لتحت يسكّرها");
  await p.locator(".unit-card").first().click(); await p.waitForTimeout(450);
  const g2 = await p.locator(".dlg .sheet-grip").boundingBox();
  await p.mouse.move(g2.x + g2.width / 2, g2.y + 4); await p.mouse.down(); await p.mouse.move(g2.x + g2.width / 2, g2.y + 50, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(450);
  ok(await p.getByRole("dialog").count() === 1, "سحب قصير يرجّعها مكانها");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // 13) DW-016: استلمت بضغطة + بحث + حجم الخط والمظهر + هيدر زجاجي
  await p.goto(URL + "#home"); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
  const rows0 = await p.locator(".att-row").count();
  const amt0 = await p.locator(".hero-amount").innerText();
  await p.locator(".att-row").last().locator(".got-btn").click(); await p.waitForTimeout(900);
  ok((await p.locator(".toast").innerText()).includes("استلمت"), "«استلمت» تسجّل الدفعة بضغطة", (await p.locator(".toast").innerText()).split("\n")[0]);
  const changed = (await p.locator(".att-row").count()) !== rows0 || (await p.locator(".hero-amount").innerText()) !== amt0;
  ok(changed, "الرئيسية تتحدّث بعد «استلمت»");
  await p.getByRole("button", { name: "تراجع" }).click(); await p.waitForTimeout(900);
  ok((await p.locator(".att-row").count()) === rows0 && (await p.locator(".hero-amount").innerText()) === amt0, "«تراجع» يرجّع كل شي");
  await p.locator(".quick-btn", { hasText: "بحث" }).click(); await p.waitForTimeout(400);
  await p.fill("#search-q", "١١٠٣"); await p.waitForTimeout(150);
  ok((await p.locator(".dlg .row-btn").count()) === 1 && (await p.locator(".dlg .row-btn").innerText()).includes("شقة 3"), "البحث بالأرقام العربية يلقى شقة 3");
  await p.fill("#search-q", "سلمان"); await p.locator(".dlg .row-btn").first().click(); await p.waitForTimeout(450);
  ok((await p.locator(".dlg-head h2").innerText()).includes("شقة 3"), "نتيجة البحث تفتح الوحدة");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(150);
  ok(await p.locator(".shell-header").getAttribute("data-scrolled") === "true", "الهيدر يصير زجاجي لما تمرّر");
  await p.goto(URL + "#settings"); await p.waitForTimeout(500);
  await p.getByRole("radio", { name: "أكبر" }).click(); await p.getByRole("radio", { name: "داكن" }).click();
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.dataset.size === "xl" && document.documentElement.dataset.theme === "dark"), "حجم الخط والمظهر ينحفظون بعد إعادة الفتح");
  let over = [];
  for (const id of pages) { await p.goto(URL + "#" + id); await p.waitForTimeout(500); if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) over.push(id); }
  ok(over.length === 0, "الخط «أكبر»: ولا شاشة فيها scroll أفقي", over.join(","));
  await p.evaluate(() => localStorage.removeItem("idarati:prefs"));

  // 11) تقليل الحركة: الرقم يطلع على طول
  const r = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await r.goto(URL + "#home"); await r.waitForTimeout(600);
  const v0 = await r.locator(".hero-amount").innerText();
  await r.locator(".fab").click(); await r.waitForTimeout(100);
  await r.locator(".dlg .row-btn").first().click(); await r.waitForTimeout(100);
  await r.locator(".dlg .pay-form .chips").first().locator(".chip").last().click(); // شهر الحين، عشان يتغيّر التحصيل
  await r.getByRole("button", { name: "سجّل الدفعة" }).click(); await r.waitForTimeout(60);
  ok(v0 !== await r.locator(".hero-amount").innerText(), "تقليل الحركة: الرقم يتحدّث فوري");

  {
  // 12) DW-017: حماية التخزين + تذكير النسخة + المصاريف الثابتة + التأمين + كشف الحساب
  const k = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const kErr = []; k.on("pageerror", (e) => kErr.push(e.message));
  const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  await k.goto(URL + "#home"); await k.evaluate(() => localStorage.clear()); await k.reload(); await k.waitForTimeout(900);
  ok(await k.locator(".nudge").isVisible(), "تذكير النسخة يطلع لو ما فيه نسخة");
  ok(!!(await k.evaluate(() => localStorage.getItem("idarati:persist"))), "انطلب storage.persist مرة وحدة");
  await k.evaluate((d) => localStorage.setItem("idarati:lastBackup", d), ago(29)); await k.reload(); await k.waitForTimeout(700);
  ok(await k.locator(".nudge").count() === 0, "29 يوم: ما فيه تذكير");
  await k.evaluate((d) => localStorage.setItem("idarati:lastBackup", d), ago(30)); await k.reload(); await k.waitForTimeout(700);
  ok(await k.locator(".nudge").isVisible(), "30 يوم بالضبط: التذكير يطلع");
  await k.locator(".nudge .link").click(); await k.waitForTimeout(500);
  const bk = k.waitForEvent("download"); await k.getByRole("button", { name: "تنزيل نسخة" }).click(); await bk;
  ok((await k.locator(".backup-state").innerText()).includes(ago(0)), "بعد التنزيل: «آخر نسخة» = اليوم");
  await k.goto(URL + "#home"); await k.waitForTimeout(700);
  ok(await k.locator(".nudge").count() === 0, "بعد النسخة: التذكير يختفي");

  // المصاريف الثابتة: EWA مسجلة هالشهر، فالباقي 2 · الضغطة الثانية ما تكرر · التراجع يحذف الكل
  await k.goto(URL + "#budget"); await k.waitForTimeout(700);
  const n0 = await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).expenses.length);
  ok((await k.locator(".nudge-gold").innerText()).includes("2"), "مصاريف ثابتة: 2 ما انسجلت (EWA مسجلة)");
  await k.getByRole("button", { name: "سجّلها كلها" }).click(); await k.waitForTimeout(400);
  const n1 = await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).expenses.length);
  ok(n1 === n0 + 2 && await k.locator(".nudge-gold").count() === 0, "سجّلها كلها: +2 والشريط يختفي", `${n0}→${n1}`);
  await k.reload(); await k.waitForTimeout(700);
  ok(await k.locator(".nudge-gold").count() === 0, "بعد إعادة الفتح: ما تتكرر بنفس الشهر");
  await k.evaluate(() => { const d = JSON.parse(localStorage.getItem("idarati:v2")); d.expenses = d.expenses.slice(2); localStorage.setItem("idarati:v2", JSON.stringify(d)); });
  await k.reload(); await k.waitForTimeout(700);
  await k.getByRole("button", { name: "سجّلها كلها" }).click(); await k.waitForTimeout(300);
  await k.getByRole("button", { name: "تراجع" }).click(); await k.waitForTimeout(300);
  ok(await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).expenses.length) === n0 && await k.locator(".nudge-gold").isVisible(), "تراجع: يحذف الاثنين ويرجع الشريط");
  await k.locator(".fab").click(); await k.waitForTimeout(400);
  await k.locator("#exp-label").fill("اشتراك نتفلكس"); await k.locator("#exp-amount").fill("4.5");
  await k.locator(".check-row input").check(); await k.getByRole("button", { name: "أضف المصروف" }).click(); await k.waitForTimeout(400);
  ok(await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).recurring.some((r) => r.label === "اشتراك نتفلكس" && r.amount === 4500)), "«يتكرر كل شهر»: ينضاف للمصاريف الثابتة بالفلس");

  // كشف الحساب: المتأخرات = نفس رقم المتأخرات بنافذة الوحدة
  await k.goto(URL + "#tenants"); await k.waitForTimeout(700);
  await k.locator(".unit-card", { hasText: "شقة 3 " }).click(); await k.waitForTimeout(500);
  const arrTxt = (await k.locator(".dlg .arrears .money").innerText()).trim();
  await k.getByRole("button", { name: "كشف حساب" }).click(); await k.waitForTimeout(500);
  const stLate = (await k.locator(".st-totals .is-late b .num").innerText()).trim();
  ok(arrTxt === stLate, "كشف الحساب: المتأخرات = arrears", `${arrTxt} / ${stLate}`);
  const stPaid = await k.evaluate(() => { const d = JSON.parse(localStorage.getItem("idarati:v2")); return d.payments.filter((p) => p.unitId === "u3" && p.month >= d.trackFrom).reduce((s, p) => s + p.amount, 0); });
  ok(Number((await k.locator(".st-totals b .num").first().innerText()).replace(/,/g, "")) * 1000 === stPaid, "كشف الحساب: مجموع المدفوع = الدفعات");
  ok(await k.locator(".st-table tbody tr").count() >= 2, "كشف الحساب: صف لكل شهر");
  await k.keyboard.press("Escape"); await k.waitForTimeout(400);

  // التأمين: الإخلاء يسأل رجّعته؟ · السجل ينحفظ · التراجع يرجّع المستأجر ويمسح السجل
  await k.locator(".unit-card", { hasText: "شقة 3 " }).click(); await k.waitForTimeout(500);
  await k.getByRole("button", { name: "إخلاء الوحدة" }).click(); await k.waitForTimeout(200);
  await k.getByRole("button", { name: "رجّعته، أخلِها" }).click(); await k.waitForTimeout(400);
  const dep = await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).deposits);
  ok(dep.length === 1 && dep[0].amount === 200000 && dep[0].returned === true, "الإخلاء: سجل التأمين 200.000 «رجع»");
  await k.getByRole("button", { name: "تراجع" }).click(); await k.waitForTimeout(400);
  const after = await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
  ok(after.deposits.length === 0 && after.units.find((u) => u.id === "u3").tenant?.deposit === 200000, "تراجع الإخلاء: المستأجر والتأمين يرجعون");
  await k.locator(".fab").click(); await k.waitForTimeout(400);
  await k.locator("#u-name").fill("شقة 9"); await k.locator("#u-rent").fill("150"); await k.locator("#u-tenant").fill("سعيد"); await k.locator("#u-deposit").fill("١٥٠");
  await k.getByRole("button", { name: "أضف الوحدة" }).click(); await k.waitForTimeout(400);
  ok(await k.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).units.find((u) => u.name === "شقة 9")?.tenant?.deposit === 150000), "نموذج الوحدة: التأمين بالأرقام العربية ينحفظ بالفلس");
  ok(kErr.length === 0, "DW-017: بدون أخطاء", kErr.join(" | "));

  }
  // 13) DW-018: المزامنة مطفية افتراضياً · المفتاح السري ينرفض · الموافقة إجبارية · ولا طلب لـ Supabase بدون إعداد
  {
    const z = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const zErr = []; z.on("pageerror", (e) => zErr.push(e.message));
    const calls = []; z.on("request", (r) => { if (/supabase\.(co|in)/.test(r.url())) calls.push(r.url()); });
    await z.goto(URL + "#settings"); await z.evaluate(() => localStorage.clear()); await z.reload(); await z.waitForTimeout(800);
    ok((await z.locator("#sync-h").count()) === 1 && (await z.locator("#sync-url").count()) === 1, "المزامنة: مطفية وتطلب الإعداد");
    const jwt = (role) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.y`;
    await z.locator("#sync-url").fill("https://abcd.supabase.co");
    await z.locator("#sync-key").fill(jwt("anon"));
    ok(await z.getByRole("button", { name: "احفظ وكمّل" }).isDisabled(), "زر الحفظ مقفل بدون الموافقة");
    await z.locator("#sync-key").fill(jwt("service_role"));
    await z.locator("#sync-consent").check();
    await z.getByRole("button", { name: "احفظ وكمّل" }).click(); await z.waitForTimeout(200);
    ok((await z.locator("#sync-h ~ * .field-error, .field-error").first().innerText()).includes("service_role"), "مفتاح service_role ينرفض بالواجهة");
    ok(await z.evaluate(() => localStorage.getItem("idarati:syncConfig")) === null, "المفتاح المرفوض ما ينحفظ");
    await z.locator("#sync-url").fill("https://evil.example.com"); await z.locator("#sync-key").fill(jwt("anon"));
    await z.getByRole("button", { name: "احفظ وكمّل" }).click(); await z.waitForTimeout(200);
    ok(await z.evaluate(() => localStorage.getItem("idarati:syncConfig")) === null, "رابط مو Supabase ينرفض");
    ok(calls.length === 0, "بدون إعداد: ولا طلب لـ Supabase", calls.join(" "));
    ok(await z.getByRole("button", { name: "رجّع البيانات التجريبية" }).isVisible(), "بدون مزامنة: البيانات التجريبية متاحة");
    ok(zErr.length === 0, "DW-018: بدون أخطاء", zErr.join(" | "));
    await z.close();
  }

  if (process.env.SHOTS) {
    for (const [n, w, h, s] of [["home-phone", 390, 844, "light"], ["home-dark", 390, 844, "dark"], ["home-desk", 1280, 800, "light"], ["tenants-tab", 820, 1180, "light"], ["budget-phone", 390, 844, "light"]]) {
      const q = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: s });
      await q.goto(URL + "#" + n.split("-")[0]); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(1300);
      await q.screenshot({ path: `${process.env.SHOTS}/${n}.png` });
    }
    const q = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await q.goto(URL + "#tenants"); await q.waitForTimeout(800); await q.locator(".unit-card").nth(0).click(); await q.waitForTimeout(500);
    await q.screenshot({ path: `${process.env.SHOTS}/sheet-phone.png` });
  }
  await browser.close();
} catch (e) { console.error(e); failed++; }
finally { server.kill(); }
console.log(failed ? `\n${failed} فشل` : "\nكل الاختبارات نجحت");
process.exit(failed ? 1 : 0);
