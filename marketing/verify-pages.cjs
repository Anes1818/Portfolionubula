/* Local page review: no external requests or form submissions. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = 'http://127.0.0.1:8765';
const phase = process.argv[2] || 'after';
const out = path.join(__dirname, 'screenshots-2026-09-30');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEBULA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    if (phase === 'capture-builder') {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      await context.route('**/*', request => request.request().url().startsWith(base) ? request.continue() : request.abort());
      const page = await context.newPage();
      await page.goto(base + '/builder/');
      await page.waitForFunction(() => window.NebulaApp?.ready);
      await page.waitForTimeout(500);
      const target = path.join(__dirname, '..', 'assets', 'builder-current-demo.png');
      await page.locator('.art-surface').screenshot({ path: target });
      console.log('Captured current builder:', target);
      await context.close();
      return;
    }
    for (const [pageName, route] of [['pricing', '/build-your-plan.html'], ['florists', '/flowers/']]) {
      for (const [viewportName, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        await context.route('**/*', request => {
          const url = request.request().url();
          if (url.startsWith(base)) return request.continue();
          return request.abort();
        });
        const page = await context.newPage();
        await page.goto(base + route);
        await page.waitForTimeout(700);
        if (pageName === 'florists') {
          for (const picture of await page.locator('.tpl-preview-inner img').all()) {
            await picture.scrollIntoViewIfNeeded();
            await picture.evaluate(img => img.decode().catch(() => {}));
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        await page.screenshot({ path: path.join(out, `${phase}-${pageName}-${viewportName}-viewport.png`), animations: 'disabled' });
        await page.screenshot({ path: path.join(out, `${phase}-${pageName}-${viewportName}.png`), fullPage: true, animations: 'disabled' });
        console.log(`${phase} ${pageName} ${viewportName}:`, await page.title(), 'overflow=', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
        await context.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
