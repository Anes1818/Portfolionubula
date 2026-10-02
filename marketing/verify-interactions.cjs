/* Local smoke checks. External requests are blocked or mocked; no lead data is sent. */
const { chromium } = require('playwright');
const assert = require('assert');

const base = 'http://127.0.0.1:8765';
const results = [];
const check = (name, value) => { assert(value, name); results.push(name); console.log('PASS', name); };

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEBULA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      let posts = 0;
      let formServiceOk = true;
      await context.route('**/*', request => {
        const url = request.request().url();
        if (url.startsWith(base)) return request.continue();
        if (url.startsWith('https://formspree.io/')) {
          posts += 1;
          return request.fulfill({ status: formServiceOk ? 200 : 503, contentType: 'application/json', body: formServiceOk ? '{"ok":true}' : '{"ok":false}' });
        }
        return request.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.goto(base + '/');
      check(`${width}: root reaches canonical florist page`, new URL(page.url()).pathname === '/flowers/');
      await page.goto(base + '/flower');
      check(`${width}: /flower reaches canonical florist page`, new URL(page.url()).pathname === '/flowers/');
      await page.goto(base + '/flowers/');
      check(`${width}: florist hero and builder link visible`, await page.locator('#heroHeadline').isVisible() && await page.locator('.hero-actions a[href="../builder/"]').isVisible());
      check(`${width}: returning-visitor copy keeps builder offer`, (await page.locator('#rv-banner').textContent()).includes('$29 plan'));
      if (width === 390) {
        await page.locator('#navToggle').click();
        check('390: mobile menu exposes builder and plan', await page.locator('#navOverlay.open').isVisible() && await page.locator('#navOverlay a[href="#showcase"]').isVisible() && await page.locator('#navOverlay a[href="../build-your-plan.html#plans"]').first().isVisible());
        await page.locator('#navToggle').click();
      }
      check(`${width}: florist layout fits viewport`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`${width}: florist fallback keeps process compact`, await page.locator('#processPinWrap').evaluate(el => el.getBoundingClientRect().height < 2000));
      check(`${width}: current builder image loads`, await page.locator('.idea-banner img').evaluate(img => img.complete && img.naturalWidth > 0));
      check(`${width}: three demos are clearly labeled`, await page.locator('.tpl-tag:has-text("Concept Demo")').count() === 3);
      for (const route of ['/builder/', '/demo/pavon/', '/demo/petalpress/', '/demo/ashleys/']) {
        check(`${width}: ${route} resolves`, (await page.request.get(base + route)).ok());
      }
      await page.locator('#formBtn').click();
      check(`${width}: empty florist form is rejected locally`, (await page.locator('#formStatus').innerText()).includes('Please fill') && posts === 0);
      await page.locator('#fname').fill('Test Florist');
      await page.locator('#femail').fill('test@example.invalid');
      await page.locator('#fmessage').fill('Local test only');
      await page.locator('#formBtn').click();
      await page.locator('#formStatus.success').waitFor();
      check(`${width}: florist form success uses mocked service`, posts === 1);
      formServiceOk = false;
      await page.locator('#fname').fill('Test Florist');
      await page.locator('#femail').fill('test@example.invalid');
      await page.locator('#fmessage').fill('Local failure test');
      await page.locator('#formBtn').click();
      await page.locator('#formStatus.error a[href^="mailto:"]').waitFor();
      check(`${width}: florist failure offers email fallback`, posts === 2);
      formServiceOk = true;

      await page.goto(base + '/build-your-plan.html');
      check(`${width}: pricing demo links to current builder`, await page.locator('.hero-actions a[href="builder/"]').count() === 1);
      check(`${width}: one priced offer and one enquiry button`, await page.locator('article.plan').count() === 1 && await page.locator('[data-plan]').count() === 1);
      check(`${width}: pricing layout fits viewport`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('[data-plan="studio"]').click();
      check(`${width}: enquiry opens $29 modal`, await page.locator('#checkout.open').isVisible() && (await page.locator('#ck-price').innerText()) === '$29');
      await page.locator('#sendBtn').click();
      check(`${width}: empty pricing form is rejected locally`, (await page.locator('#status').innerText()).includes('Please fill') && posts === 2);
      await page.locator('#f-name').fill('Test Florist');
      await page.locator('#f-shop').fill('Test Shop');
      await page.locator('#f-city').fill('Test City');
      await page.locator('#f-contact').fill('test@example.invalid');
      await page.locator('#sendBtn').click();
      await page.locator('#ck-done:visible').waitFor();
      check(`${width}: pricing form success uses mocked service`, posts === 3);
      await page.locator('.modal-close').click();
      await page.locator('[data-plan="studio"]').click();
      formServiceOk = false;
      await page.locator('#f-name').fill('Test Florist');
      await page.locator('#f-shop').fill('Test Shop');
      await page.locator('#f-city').fill('Test City');
      await page.locator('#f-contact').fill('test@example.invalid');
      await page.locator('#sendBtn').click();
      await page.locator('#status.err a[href^="mailto:"]').waitFor();
      check(`${width}: pricing failure offers email fallback`, posts === 4);
      check(`${width}: no page errors`, errors.length === 0);
      await context.close();
    }
    console.log(`${results.length} checks passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
