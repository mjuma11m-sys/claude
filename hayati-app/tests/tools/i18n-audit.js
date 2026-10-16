// يفتح كل شاشة ونافذة بالإنقليزي ويجمع أي نص عربي باقي (بدون بيانات المستخدم). node tests/tools/i18n-audit.js [out.json]
const { chromium } = require('playwright');
const seed = require('../../store/seed.js');
const BASE = process.env.BASE || 'http://127.0.0.1:4173/index.html';

async function crawl(p, deep) {
  const found = new Map();
  const add = async (where) => { for (const s of await p.evaluate(() => HayatiLang.missing())) { if (!found.has(s)) found.set(s, where); } };
  const SHEETBTN = '#sheetBody button:not([data-del]):not([data-set]), #sheetBody [data-tv], #sheetBody .seg button';
  const dig = async (reopen, where) => {
    if (!deep) return;
    const k = await p.evaluate((q) => document.getElementById('sheet').open ? document.querySelectorAll(q).length : 0, SHEETBTN);
    for (let j = 0; j < Math.min(k, 25); j++) {
      await close(); await reopen(); await p.waitForTimeout(250);
      const l = await p.evaluate(([q, j]) => { const el = document.querySelectorAll(q)[j]; if (!el) return null; const t = (el.id || el.textContent.trim()).slice(0, 18); if (/حذف|امسح|delete|Delete|wipe/.test(t + el.className)) return null; el.click(); return t; }, [SHEETBTN, j]);
      if (!l) continue; await p.waitForTimeout(400); await add(where + ' › ' + l);
    }
  };
  const close = () => p.evaluate(() => { try { App.closeSheet(); } catch (e) {} });
  const tabs = ['today', 'money', 'schedule', 'tasks'];
  for (const tab of tabs) {
    await p.evaluate((t) => App.go(t), tab); await p.waitForTimeout(250); await add(tab);
    const n = await p.evaluate(() => document.querySelectorAll('#view [data-action], #view .seg button, #view [data-seg]').length);
    for (let i = 0; i < n; i++) {
      const label = await p.evaluate(([t, i]) => { App.go(t); const el = document.querySelectorAll('#view [data-action], #view .seg button, #view [data-seg]')[i]; if (!el) return null; const a = el.dataset.action || el.textContent.trim().slice(0, 20); if (/del|wipe|delete|logout|remove/.test(a)) return null; el.click(); return a; }, [tab, i]);
      if (!label) continue;
      await p.waitForTimeout(350); await add(tab + ' › ' + label);
      await dig(() => p.evaluate(([t, i]) => { App.go(t); const el = document.querySelectorAll('#view [data-action], #view .seg button, #view [data-seg]')[i]; if (el) el.click(); }, [tab, i]), tab + ' › ' + label);
      await close();
    }
  }
  // الإعدادات وكل أزرارها
  await p.evaluate(() => App.go('today')); await p.evaluate(() => document.getElementById('settingsBtn').click()); await p.waitForTimeout(300); await add('settings');
  const sets = await p.evaluate(() => [...document.querySelectorAll('#sheetBody [data-set]')].map((e) => e.dataset.set));
  for (const s of sets) {
    if (/wipe|delete|logout|rotate|signout|lang|import/.test(s)) continue;
    await close(); await p.waitForTimeout(150); await p.evaluate(() => document.getElementById('settingsBtn').click()); await p.waitForTimeout(250);
    await p.evaluate((s) => { const el = document.querySelector('#sheetBody [data-set="' + s + '"]'); if (el) el.click(); }, s);
    await p.waitForTimeout(500); await add('settings › ' + s);
  }
  await close();
  // نوافذ الإضافات مباشرة
  const extra = ['Qibla.sheet()', 'Travel.listSheet()', 'Umrah.sheet()', 'Lectures.sheet && Extras.Lectures.sheet()'];
  for (const x of extra) { await p.evaluate((x) => { try { eval('window.Extras.' + x); } catch (e) {} }, x); await p.waitForTimeout(400); await add('extra › ' + x); await dig(() => p.evaluate((x) => { try { eval('window.Extras.' + x); } catch (e) {} }, x), 'extra › ' + x); await close(); }
  return [...found].map(([s, w]) => ({ s, w }));
}
module.exports = { crawl, seed };

if (require.main === module) (async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('hayati-seen-version', 'v99'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-lang', 'en'); });
  await p.goto(BASE); await p.waitForFunction(() => window.App && App.st);
  await p.evaluate(seed);
  const res = await crawl(p, !!process.env.DEEP);
  require('fs').writeFileSync(process.argv[2] || 'i18n-missing.json', JSON.stringify(res, null, 1));
  console.log(res.length + ' strings');
  await b.close();
})();
