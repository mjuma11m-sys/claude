// اختبار شامل: npm run build && npm test   (يشغّل vite preview ويفحص بـ Chromium)
import { chromium } from "playwright-core";
import writeXlsxFile from "write-excel-file/node";
import readXlsxFile from "read-excel-file/node";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  const pages = ["home", "tenants", "budget", "bank", "reports", "track", "docs", "house", "vendors", "settings"];

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
  // 13) DW-018/019: الحساب اختياري · Supabase مدمج (بدون إعداد) · الموافقة إجبارية · ولا طلب للسحابة قبل ما يدخل
  {
    const z = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const zErr = []; z.on("pageerror", (e) => zErr.push(e.message));
    const calls = []; z.on("request", (r) => { if (/supabase\.(co|in)/.test(r.url())) calls.push(r.url()); });
    await z.goto(URL + "#settings"); await z.evaluate(() => localStorage.clear()); await z.reload(); await z.waitForTimeout(1200);
    ok(await z.locator("#sync-url").count() === 0 && await z.locator("#sync-email").isVisible(), "Supabase مدمج: ما يطلب رابط ولا مفتاح، يطلب الإيميل بس");
    await z.locator("#sync-email").fill("a@b.co"); await z.locator("#sync-pass").fill("12345678");
    ok(await z.getByRole("button", { name: "دخول", exact: true }).last().isDisabled(), "الدخول مقفل بدون الموافقة");
    await z.getByRole("radio", { name: "حساب جديد" }).click();
    ok(await z.getByRole("button", { name: "سوّ الحساب" }).isDisabled(), "الحساب الجديد مقفل بدون الموافقة");
    await z.locator("#sync-consent").check(); await z.locator("#sync-pass").fill("123");
    await z.getByRole("button", { name: "سوّ الحساب" }).click(); await z.waitForTimeout(200);
    ok((await z.locator(".field-error").first().innerText()).includes("8"), "كلمة سر قصيرة تنرفض قبل ما يتصل");
    ok(calls.length === 0, "بدون دخول: ولا طلب للسحابة", calls.join(" "));
    ok(await z.evaluate(() => localStorage.getItem("idarati:syncConfig")) === null, "ما ينحفظ شي قبل الدخول");
    ok(await z.getByRole("button", { name: "رجّع البيانات التجريبية" }).isVisible(), "بدون مزامنة: البيانات التجريبية متاحة");
    ok(zErr.length === 0, "DW-019: بدون أخطاء", zErr.join(" | "));
    await z.close();
  }

  // 14) DW-020: نموذج العقد يتعبّى + رفع العقد الموقّع (محلي) + رفض الأنواع الغلط
  {
    const c = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const cErr = []; c.on("pageerror", (e) => cErr.push(e.message));
    await c.goto(URL + "#settings"); await c.evaluate(() => localStorage.clear()); await c.reload(); await c.waitForTimeout(900);
    await c.locator("#ct-owner").fill("أبو جعفر");
    await c.locator("#ct-text").fill("المؤجر {المالك} يؤجر {الوحدة} لـ {المستأجر} بـ {الإيجار} د.ب، تأمين {التأمين}، نهاية {نهاية العقد}، {خانة غلط}");
    await c.getByRole("button", { name: "احفظ النموذج" }).click(); await c.waitForTimeout(300);
    await c.goto(URL + "#tenants"); await c.waitForTimeout(700);
    await c.locator(".unit-card", { hasText: "شقة 3 " }).click(); await c.waitForTimeout(500);
    await c.getByRole("button", { name: /^العقد/ }).click(); await c.waitForTimeout(500);
    const txt = await c.locator(".contract-text").innerText();
    ok(txt.includes("أبو جعفر") && txt.includes("شقة 3") && txt.includes("عائلة سلمان") && txt.includes("200.000"), "العقد: الخانات تتعبّى من الوحدة", txt.slice(0, 80));
    ok(txt.includes("نهاية —") && txt.includes("{خانة غلط}"), "العقد: الفاضية «—» والخانة المجهولة تبقى مثل ما هي");
    await c.locator("#contract-file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }); await c.waitForTimeout(300);
    ok((await c.locator(".contract-file .field-error").innerText()).includes("PDF"), "رفع ملف نصي: ينرفض");
    await c.locator("#contract-file").setInputFiles({ name: "عقد-شقة3.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") }); await c.waitForTimeout(800);
    ok((await c.locator(".contract-file").innerText()).includes("عقد-شقة3.pdf"), "رفع PDF: ينحفظ ويطلع اسمه");
    await c.reload(); await c.waitForTimeout(800);
    await c.goto(URL + "#tenants"); await c.waitForTimeout(700);
    await c.locator(".unit-card", { hasText: "شقة 3 " }).click(); await c.waitForTimeout(500);
    ok((await c.getByRole("button", { name: /^العقد/ }).innerText()).includes("✓"), "بعد إعادة الفتح: زر العقد عليه ✓");
    await c.getByRole("button", { name: /^العقد/ }).click(); await c.waitForTimeout(500);
    const size = await c.evaluate(async () => {
      const id = JSON.parse(localStorage.getItem("idarati:v2")).units.find((u) => u.id === "u3").contractFile.id;
      const db = await new Promise((r) => { const q = indexedDB.open("idarati-files", 1); q.onsuccess = () => r(q.result); });
      return await new Promise((r) => { const q = db.transaction("files").objectStore("files").get(id); q.onsuccess = () => r(q.result?.size ?? -1); });
    });
    ok(size === 13, "الملف نفسه محفوظ بالجهاز (IndexedDB)", String(size));
    ok(cErr.length === 0, "DW-020: بدون أخطاء", cErr.join(" | "));
    await c.close();
  }

  // 15) DW-021: Excel — استيراد بمعاينة وأخطاء لكل صف + تراجع + تصدير يرجع ينقرا
  {
    const x = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const xErr = []; x.on("pageerror", (e) => xErr.push(e.message));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "idarati-xl-"));
    const xl = path.join(tmp, "import.xlsx");
    const buf = await writeXlsxFile([
      { sheet: "الوحدات", data: [["الوحدة", "المبنى", "الإيجار", "يوم الاستحقاق", "المستأجر", "الهاتف", "بداية العقد", "CPR"], ["شقة 20", "برج السيف", 250, 5, "ناصر علي", "33334444", "2026-02", "880101234"], ["شقة 1", "عمارة المالكية", 185, 1, "أحمد عبدالله", "3xxx 1101", "2024-03", ""], ["", "", "مو رقم", "", "", "", "", ""], ["شقة 21", "", "abc", 3, "", "", "", ""]] },
      { sheet: "الدفعات", data: [["الوحدة", "الشهر", "المبلغ", "الطريقة", "التاريخ"], ["شقة 20", "2026-09", 250, "نقد", "2026-09-04"], ["شقة 20", { value: new Date(2026, 9, 1), format: "yyyy-mm-dd" }, "٢٥٠", "BenefitPay", ""], ["شقة 99", "2026-10", 100, "نقد", ""], ["شقة 20", "13/2026", 250, "", ""]] },
      { sheet: "المصاريف", data: [["الوصف", "المبلغ", "الفئة", "التاريخ"], ["تصليح باب", 35.5, "صيانة العقار", "2026-10-02"], ["تأمين المبنى", 120, "تأمينات", "02/10/2026"]] },
    ], { dateFormat: "yyyy-mm-dd" }).toBuffer();
    fs.writeFileSync(xl, buf);
    await x.goto(URL + "#reports"); await x.evaluate(() => localStorage.clear()); await x.reload(); await x.waitForTimeout(900);
    const before = await x.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    await x.locator("#xl-file").setInputFiles(xl); await x.waitForTimeout(1500);
    const prev = await x.locator(".xl-preview").innerText();
    ok(/1\s*وحدة جديدة/.test(prev) && /1\s*وحدة تتحدّث/.test(prev) && /2\s*دفعة/.test(prev) && /2\s*مصروف/.test(prev), "Excel: المعاينة تعد الصح", prev.replace(/\s+/g, " ").slice(0, 160));
    ok(prev.includes("تأمينات") && prev.includes("CPR"), "Excel: فئة جديدة تنذكر + تنبيه CPR");
    const errs = await x.locator(".xl-errors").textContent();
    ok(errs.includes("صف 4") && errs.includes("الإيجار") && errs.includes("شقة 99") && errs.includes("الشهر"), "Excel: كل خطأ برقم صفه وسببه", errs.replace(/\s+/g, " ").slice(0, 200));
    await x.getByRole("button", { name: /^استورد/ }).click(); await x.waitForTimeout(500);
    const after = await x.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    const u20 = after.units.find((u) => u.name === "شقة 20");
    ok(u20 && u20.rent === 250000 && u20.dueDay === 5 && u20.tenant.name === "ناصر علي" && !JSON.stringify(u20).includes("880101234"), "Excel: الوحدة الجديدة بالفلس وبدون CPR");
    ok(after.units.length === before.units.length + 1 && after.units.find((u) => u.id === "u1").rent === 185000, "Excel: «شقة 1» تتحدّث بدون تكرار");
    ok(after.payments.filter((p) => p.unitId === u20.id).map((p) => p.month).sort().join() === "2026-09,2026-10" && after.payments.some((p) => p.unitId === u20.id && p.amount === 250000 && p.method === "BenefitPay"), "Excel: الدفعات (تاريخ Excel + أرقام عربية)");
    ok(after.expenses.some((e) => e.label === "تأمين المبنى" && e.date === "2026-10-02") && after.cats.some((c) => c.name === "تأمينات"), "Excel: المصاريف + فئة جديدة + تاريخ يوم/شهر/سنة");
    await x.getByRole("button", { name: "تراجع" }).click(); await x.waitForTimeout(400);
    const undone = await x.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    ok(JSON.stringify(undone.units) === JSON.stringify(before.units) && undone.payments.length === before.payments.length && undone.expenses.length === before.expenses.length && undone.cats.length === before.cats.length, "Excel: التراجع يرجّع كل شي مثل قبل");
    const dl = x.waitForEvent("download"); await x.getByRole("button", { name: "تصدير التقارير Excel" }).click();
    const out = path.join(tmp, "export.xlsx"); await (await dl).saveAs(out);
    const sheets = await readXlsxFile(out);
    ok(sheets.map((s) => s.sheet).join("|") === "متابعة الإيجار|التقرير الشهري|الدفعات|المصاريف|الوحدات" && sheets[2].data.length === before.payments.length + 1, "Excel: التصدير 5 صفحات وينقرا", sheets.map((s) => s.sheet + ":" + s.data.length).join(" "));
    const dl2 = x.waitForEvent("download"); await x.getByRole("button", { name: "نزّل القالب" }).click();
    const tpl = path.join(tmp, "tpl.xlsx"); await (await dl2).saveAs(tpl);
    ok((await readXlsxFile(tpl)).length === 3, "Excel: القالب 3 صفحات");
    await x.locator("#xl-file").setInputFiles({ name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("a,b") }); await x.waitForTimeout(300);
    ok((await x.locator(".field-error").first().innerText()).includes("xlsx"), "Excel: ملف مو xlsx ينرفض");
    ok(xErr.length === 0, "DW-021: بدون أخطاء", xErr.join(" | "));
    await x.close();
  }

  // 16) DW-022: ملف متابعة حالة الإيجار + الدفعة المقدمة + نوع العقار
  {
    const t = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const tErr = []; t.on("pageerror", (e) => tErr.push(e.message));
    await t.goto(URL + "#track"); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForTimeout(1200);
    ok(await t.locator("#track-tbl tbody tr").count() === 7, "المتابعة: صف لكل وحدة (7)");
    const ahead = await t.locator("#ahead-tbl").innerText();
    ok(ahead.includes("محل 1") && ahead.includes("محل تجاري") && /3\s*أشهر/.test(ahead), "المقدم: محل 1 دافع 3 أشهر", ahead.replace(/\s+/g, " ").slice(0, 120));
    await t.locator(".track-filters").getByRole("radio", { name: /^محل تجاري/ }).click(); await t.waitForTimeout(300);
    ok(await t.locator("#track-tbl tbody tr").count() === 2, "تصفية النوع: محلين");
    await t.locator(".track-filters").getByRole("radio", { name: /^الكل/ }).first().click();
    await t.locator(".track-filters").getByRole("radio", { name: /^متأخر/ }).click(); await t.waitForTimeout(300);
    const late = await t.locator("#track-tbl tbody").innerText();
    ok(late.includes("شقة 3") && !late.includes("محل 1"), "تصفية السداد: المتأخرين بس");
    ok(await t.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "المتابعة: الجدول ينزلق داخل البطاقة بدون scroll للصفحة");
    const shown = await t.locator("#track-tbl tbody tr").count();
    const dl = t.waitForEvent("download"); await t.getByRole("button", { name: "تصدير Excel" }).click();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "idarati-tr-")); const out = path.join(tmp, "t.xlsx"); await (await dl).saveAs(out);
    const sh = await readXlsxFile(out);
    ok(sh[0].sheet === "متابعة الإيجار" && sh[0].data.length === shown + 2 && !JSON.stringify(sh).includes("3xxx"), "تصدير المتابعة: الصفوف المصفّاة + المجموع، بدون هواتف", String(sh[0].data.length));
    // دفعة مقدمة 6 أشهر لشقة 1 + تراجع
    await t.goto(URL + "#tenants"); await t.waitForTimeout(700);
    await t.locator(".unit-card", { hasText: "شقة 1" }).first().click(); await t.waitForTimeout(500);
    await t.locator(".ahead-form").getByRole("radio", { name: "6 أشهر" }).click();
    ok((await t.locator(".ahead-sum").innerText()).includes("1,080") || (await t.locator(".ahead-sum").innerText()).includes("1080"), "المعاينة: 6 × 180 = 1,080", await t.locator(".ahead-sum").innerText());
    const n0 = await t.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).payments.length);
    await t.locator("#ahead-btn").click(); await t.waitForTimeout(500);
    const st = await t.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    ok(st.payments.length === n0 + 6 && st.payments.filter((p) => p.unitId === "u1").every((p) => p.amount === 180000), "دفعة مقدمة: 6 دفعات بالإيجار كامل");
    await t.getByRole("button", { name: "تراجع" }).click(); await t.waitForTimeout(400);
    ok(await t.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).payments.length) === n0, "التراجع يمسح الستة");
    // نوع العقار بالنموذج + ملف العقد ما ينمسح مع التعديل
    await t.evaluate(() => { const d = JSON.parse(localStorage.getItem("idarati:v2")); d.units[6].contractFile = { id: "cfx", name: "a.pdf", type: "application/pdf", size: 1, tenant: "", uploadedAt: "2026-10-01" }; localStorage.setItem("idarati:v2", JSON.stringify(d)); });
    await t.reload(); await t.waitForTimeout(800);
    await t.locator(".unit-card", { hasText: "محل 2" }).first().click(); await t.waitForTimeout(400);
    await t.getByRole("button", { name: /^(تعديل|أضف مستأجر)$/ }).first().click(); await t.waitForTimeout(400);
    await t.locator(".unit-form").getByRole("radio", { name: "ستور" }).click();
    await t.getByRole("button", { name: "احفظ التعديل" }).click(); await t.waitForTimeout(400);
    const u7 = await t.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).units.find((u) => u.id === "u7"));
    ok(u7.kind === "store" && u7.contractFile?.id === "cfx", "النوع ينحفظ وملف العقد يبقى بعد التعديل");
    ok(tErr.length === 0, "DW-022: بدون أخطاء", tErr.join(" | "));
    await t.close();
  }

  // 17) DW-023: الوثائق والمستندات + تنبيه الرئيسية + عدادات الوحدة
  {
    const g = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const gErr = []; g.on("pageerror", (e) => gErr.push(e.message));
    await g.goto(URL + "#home"); await g.evaluate(() => localStorage.clear()); await g.reload(); await g.waitForTimeout(1000);
    const hd = await g.locator("#home-docs").innerText();
    ok(hd.includes("رخصة البلدية") && hd.includes("تأمين عمارة المالكية") && !hd.includes("الدفاع المدني"), "الرئيسية: وثيقتين تحتاج تجديد بس");
    await g.locator("#home-docs").getByRole("button", { name: "كل الوثائق" }).click(); await g.waitForTimeout(700);
    ok(g.url().endsWith("#docs") && await g.locator("#doc-list li").count() === 5, "صفحة الوثائق: 5 وثائق");
    ok((await g.locator("#doc-list li").first().innerText()).includes("منتهية"), "المنتهية أول القائمة");
    await g.locator(".doc-kpi-soon").click(); await g.waitForTimeout(300);
    ok(await g.locator("#doc-list li").count() === 1, "بطاقة «قريبة الانتهاء» تصفّي");
    await g.locator(".doc-kpi-soon").click(); await g.waitForTimeout(300);
    // إضافة وثيقة بالزر الذهبي
    await g.locator(".fab").click(); await g.waitForTimeout(400);
    await g.locator(".doc-form").getByRole("radio", { name: "تأمين" }).click();
    await g.locator("#d-title").fill("تأمين المحلات");
    await g.locator("#d-expires").fill(await g.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().slice(0, 10); }));
    await g.locator("#d-unit").selectOption("u6");
    await g.getByRole("button", { name: "أضف الوثيقة" }).click(); await g.waitForTimeout(500);
    let st = await g.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    const nd = st.docs.find((d) => d.title === "تأمين المحلات");
    ok(nd && nd.kind === "insurance" && nd.unitId === "u6", "إضافة وثيقة بنوعها ووحدتها");
    // الملف: رفض النوع الغلط
    await g.locator("#doc-list li", { hasText: "تأمين المحلات" }).locator("button").click(); await g.waitForTimeout(400);
    await g.locator("#doc-file").setInputFiles({ name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("x") }); await g.waitForTimeout(200);
    ok((await g.locator(".doc-form .field-error").innerText()).includes("PDF"), "ملف مو PDF/صورة ينرفض");
    await g.locator("#doc-file").setInputFiles({ name: "p.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") }); await g.waitForTimeout(200);
    await g.getByRole("button", { name: "احفظ التعديل" }).click(); await g.waitForTimeout(700);
    st = await g.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")));
    ok(st.docs.find((d) => d.title === "تأمين المحلات")?.file?.name === "p.pdf", "إرفاق PDF بالوثيقة (محلي)");
    // حذف + تراجع
    await g.locator("#doc-list li", { hasText: "تأمين المحلات" }).locator("button").click(); await g.waitForTimeout(400);
    await g.getByRole("button", { name: "احذف الوثيقة" }).click(); await g.waitForTimeout(400);
    ok(await g.evaluate(() => !JSON.parse(localStorage.getItem("idarati:v2")).docs.some((d) => d.title === "تأمين المحلات")), "حذف الوثيقة");
    await g.getByRole("button", { name: "تراجع" }).click(); await g.waitForTimeout(400);
    ok(await g.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).docs.some((d) => d.title === "تأمين المحلات" && d.file)), "التراجع يرجعها مع ملفها");
    // العدادات
    await g.goto(URL + "#tenants"); await g.waitForTimeout(600);
    await g.locator(".unit-card", { hasText: "شقة 2" }).first().click(); await g.waitForTimeout(400);
    await g.getByRole("button", { name: /^تعديل$/ }).first().click(); await g.waitForTimeout(400);
    await g.locator("#u-elec").fill("445566"); await g.locator("#u-water").fill("778899");
    await g.getByRole("button", { name: "احفظ التعديل" }).click(); await g.waitForTimeout(400);
    const u2 = await g.evaluate(() => JSON.parse(localStorage.getItem("idarati:v2")).units.find((u) => u.id === "u2"));
    ok(u2.meters?.elec === "445566" && u2.meters?.water === "778899" && u2.tenant?.name, "عدادات الكهرباء والماء تنحفظ مع الوحدة");
    ok(gErr.length === 0, "DW-023: بدون أخطاء", gErr.join(" | "));
    await g.close();
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
