import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage();
await p.goto("file:///tmp/claude-0/-home-user-claude/fa0894b5-e889-5902-a0af-609d821faaef/scratchpad/v2/cover.html"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.pdf({ path: "/tmp/claude-0/-home-user-claude/fa0894b5-e889-5902-a0af-609d821faaef/scratchpad/v2/cover.pdf", format: "A4", printBackground: true, preferCSSPageSize: true });
await p.goto("file:///tmp/claude-0/-home-user-claude/fa0894b5-e889-5902-a0af-609d821faaef/scratchpad/v2/body.html"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.pdf({ path: "/tmp/claude-0/-home-user-claude/fa0894b5-e889-5902-a0af-609d821faaef/scratchpad/v2/body.pdf", format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: '<div style="font-size:7.5px;width:100%;padding:0 18mm;color:#C9963A;text-align:left;font-family:sans-serif">IDARATI · Legal review request</div>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
await b.close();
