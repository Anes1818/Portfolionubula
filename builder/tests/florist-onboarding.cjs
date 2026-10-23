const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { loadShop, audit } = require('../tools/check-shop.cjs');

const url = process.env.SETUP_URL || 'http://127.0.0.1:4174/shop-setup.html';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    let firebaseSaved = false;
    let formspreePosted = false;

    // Intercept external network in automated test so we don't spam live inbox during CI
    await context.route('**/*firebaseio.com/**', async route => {
      firebaseSaved = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });
    await context.route('**/*formspree.io/**', async route => {
      formspreePosted = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // 1. Verify all 8 flower families & 15 extras rendered with valid images
    assert.equal(await page.locator('.family-card').count(), 8, 'Should render 8 flower family cards');
    assert.equal(await page.locator('.extra-card').count(), 15, 'Should render 15 accessory/toy cards');
    assert.equal(await page.locator('.bouquet-slot').count(), 4, 'Should render 4 free signature bouquet slots');

    // Scroll through to trigger lazy images and check naturalWidth
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img')) {
        img.loading = 'eager';
        img.scrollIntoView();
      }
      await new Promise(r => setTimeout(r, 400));
    });
    const brokenImages = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
    );
    assert.deepEqual(brokenImages, [], 'All studio flower & toy images must load cleanly');

    // 2. Test bilingual toggle (ES -> EN)
    await page.locator('.lang-btn[data-lang="es"]').click();
    assert.match(await page.locator('#customAssetSection, #customAssetsSection h3').innerText(), /nuevos elementos/i);
    await page.locator('.lang-btn[data-lang="en"]').click();
    assert.match(await page.locator('#customAssetsSection h3').innerText(), /Do you want to add some new assets/i);

    // 3. Fill shop identity, adjust a flower price, add a custom toy request, and pick the $35 custom domain plan
    await page.fill('#shopName', 'Rosas Bella Studio');
    await page.fill('#ownerName', 'Camila Reyes');
    await page.fill('#shopPhone', '+1 (305) 555-0199');
    await page.fill('#shopEmail', 'camila@rosasbella.com');
    await page.fill('#shopCity', 'Miami, FL');

    // Adjust Roses family price to $4.50 and verify live calculator updates
    const beforeSample1 = await page.locator('#samplePrice1').innerText();
    await page.locator('.family-price-input[data-family="roses"]').fill('4.50');
    await page.locator('.family-price-input[data-family="roses"]').dispatchEvent('input');
    const afterSample1 = await page.locator('#samplePrice1').innerText();
    assert.notEqual(beforeSample1, afterSample1, 'Live sample bouquet calculator must update when rose price changes');

    // Click "+ New Plush Toys" chip in the custom assets section
    await page.locator('.cat-chip[data-cat="New Plush Toys"]').click();
    assert.equal(await page.locator('.custom-item-row').count(), 1, 'Clicking a custom asset category chip adds a custom item row');
    await page.locator('.custom-item-row .ca-name').fill('Giant Graduation Teddy Bear');
    await page.locator('.custom-item-row .ca-price').fill('28.00');

    // Select $35/mo Custom Domain plan
    await page.locator('.plan-choice-card[data-plan-choice="custom_domain"]').click();
    assert.equal(await page.locator('#samplePlanPrice').innerText(), '$35/mo');

    // Submit form
    await page.locator('#submitSetupBtn').click();
    await page.waitForSelector('#successPanel:not([hidden])');

    assert.ok(firebaseSaved, 'Should save onboarding payload to Firebase Realtime Database');
    assert.ok(formspreePosted, 'Should post onboarding summary to Formspree email endpoint');

    // Validate generated window.NEBULA_SHOP config against check-shop.cjs!
    const generatedJs = await page.locator('#generatedConfigPreview').textContent();
    const report = audit(loadShop(generatedJs), { live: true });
    assert.equal(report.ok, true, 'Generated window.NEBULA_SHOP config must pass check-shop.cjs --live: ' + report.errors.join('; '));
    assert.deepEqual(errors, []);

    console.log('PASS florist-onboarding.cjs: UI, images, EN/ES, custom assets, Firebase+Email submission, and valid NEBULA_SHOP output');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
