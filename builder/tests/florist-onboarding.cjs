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
    const mockDb = new Map();

    // Intercept external network in automated test and store Firebase PUTs in mockDb to test ?inspect=<id> round-trip!
    await context.route('**/*firebaseio.com/**', async route => {
      const req = route.request();
      const u = new URL(req.url());
      if (req.method() === 'PUT') {
        firebaseSaved = true;
        const key = u.pathname;
        if (mockDb.has(key)) {
          // Simulate Firebase !data.exists() rule: existing slot returns 403 so slot finder advances!
          await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Permission denied' }) });
        } else {
          mockDb.set(key, req.postDataJSON());
          await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
        }
      } else {
        if (mockDb.has(u.pathname)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDb.get(u.pathname)) });
        } else {
          await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Permission denied' }) });
        }
      }
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

    // Country drives currency + languages; switching back keeps the generated config valid
    await page.selectOption('#shopCountry', 'Morocco');
    assert.equal(await page.inputValue('#shopCurrency'), 'MAD', 'Morocco sets MAD currency');
    assert.equal(await page.locator('#builderLangs input[value="ar"]').isChecked(), true, 'Morocco pre-selects Arabic');
    assert.match(await page.locator('#samplePrice1').innerText(), /MAD/, 'Sample prices use the shop currency');
    await page.selectOption('#shopCountry', 'United States');
    assert.equal(await page.inputValue('#shopCurrency'), 'USD');
    assert.ok((await page.locator('#shopCurrency option').count()) >= 40, 'Many currencies offered');

    // Static visual builder preview image (no live builder iframe or code link exposed on setup page)
    assert.equal(await page.locator('#builderPreview iframe').count(), 0, 'No live builder iframe exposed on setup page');
    assert.equal(await page.locator('#builderPreview .phone-poster-img').count(), 1, 'Static builder preview image is rendered');

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

    // Upload a real logo image, a custom toy photo, and a signature bouquet photo
    await page.setInputFiles('#logoInput', 'assets/logo.png');
    await page.setInputFiles('.custom-item-row .ca-file', 'builder/assets/fall/plush-snoopy.png');
    await page.setInputFiles('.slot-file-input[data-idx="0"]', 'builder/assets/catalog/pink-promise.jpg');

    // Select $35/mo Custom Domain plan
    await page.locator('.plan-choice-card[data-plan-choice="custom_domain"]').click();
    assert.equal(await page.locator('#samplePlanPrice').innerText(), '$35/mo');

    // Submit form
    await page.locator('#submitSetupBtn').click();
    await page.waitForSelector('#successPanel:not([hidden])');

    assert.ok(firebaseSaved, 'Should save onboarding payload to Firebase Realtime Database');
    assert.ok(formspreePosted, 'Should post onboarding summary to Formspree email endpoint');

    // Client-facing confirmation: clear next steps, reference code, NO developer config exposed to the client
    const badgeText = await page.locator('#deliveryBadges').innerText();
    const idMatch = badgeText.match(/reference:\s*([A-Za-z0-9_-]{22})/i);
    assert.ok(idMatch, 'Should display 22-char reference code');
    assert.equal(await page.locator('#nextSteps li').count(), 4, 'Confirmation shows 4 clear next steps');
    assert.equal(await page.locator('#generatedConfigPreview, #btnDownloadShopConfig, #inspectBanner').count(), 0, 'Client page must not expose developer config/inspector');

    // Legacy ?inspect= owner link redirects to the private admin dashboard
    await page.goto(url + '?inspect=' + idMatch[1], { waitUntil: 'networkidle' });
    assert.match(page.url(), /admin\.html\?setup=/, 'Legacy inspect link redirects to admin');

    // Admin dossier reconstructs all 3 uploaded photos + config from chunked Firebase records
    await page.waitForFunction(() => document.querySelectorAll('#dsBody .photo-card img').length === 3);
    assert.equal(await page.locator('#dsBody .photo-card img').count(), 3, 'Admin dossier shows all 3 uploaded photos (logo, bouquet, toy)');
    assert.equal(await page.locator('#dsBody .photo-card [data-dl]').count(), 3, 'Each photo has a download button');

    // Validate generated window.NEBULA_SHOP config against check-shop.cjs!
    const generatedJs = await page.locator('#dsConfigPre').textContent();
    const report = audit(loadShop(generatedJs), { live: true });
    assert.equal(report.ok, true, 'Generated window.NEBULA_SHOP config must pass check-shop.cjs --live: ' + report.errors.join('; '));
    // 4. Test flowers/index.html Consultation Form -> Firebase -> Admin Dashboard
    const baseOrigin = new URL(url).origin;
    await page.goto(baseOrigin + '/flowers/index.html', { waitUntil: 'networkidle' });
    await page.fill('#fname', 'Sophie Laurent');
    await page.fill('#femail', 'sophie@kfleurs.fr');
    await page.fill('#fbusiness', 'K Fleurs 971');
    await page.fill('#fmessage', 'Bonjour, we want the bouquet builder in French and EUR.');
    await page.click('#formBtn');
    await page.waitForFunction(() => document.getElementById('formStatus')?.dataset.state === 'success');

    // 5. Test admin.html displays both the Lead and the Shop Setup
    await page.goto(baseOrigin + '/admin.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.getElementById('countLeads')?.textContent === '1');
    assert.equal(await page.locator('#countLeads').textContent(), '1', 'Admin dashboard shows consultation lead');
    assert.equal(await page.locator('#countSetups').textContent(), '1', 'Admin dashboard shows shop setup submission');

    assert.deepEqual(errors, []);
    console.log('PASS florist-onboarding.cjs: UI, images, EN/ES, custom assets, consultation form, Admin Dashboard, and valid NEBULA_SHOP output');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
