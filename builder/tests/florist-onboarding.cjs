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

    let firebaseSaved = false, adminGranted = false, privateReads = 0;
    let formspreePosted = false;
    const mockDb = new Map();

    await context.route('**/firebase-app.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const initializeApp = c => c;' }));
    await context.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', body: `
      const user={uid:'owner',getIdToken:async()=> 'fixture-token'};
      const auth={currentUser:sessionStorage.getItem('fixture-admin')?user:null};let observer;
      export const getAuth=()=>auth;export class GoogleAuthProvider{};
      export const browserSessionPersistence={};export const setPersistence=async()=>{};
      export const onAuthStateChanged=(a,fn)=>{observer=fn;queueMicrotask(()=>fn(a.currentUser));};
      export const signInWithPopup=async()=>{auth.currentUser=user;sessionStorage.setItem('fixture-admin','1');await observer(user);};
      export const signOut=async()=>{auth.currentUser=null;sessionStorage.removeItem('fixture-admin');await observer(null);};
    ` }));
    // Intercept external network in automated test and store Firebase PUTs in mockDb to test ?inspect=<id> round-trip!
    await context.route('**/*firebaseio.com/**', async route => {
      const req = route.request();
      const u = new URL(req.url());
      if(u.pathname.startsWith('/adminUids/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(adminGranted && u.searchParams.get('auth')==='fixture-token')});
      if (req.method() === 'PUT') {
        assert.ok(!u.pathname.includes('/la-flor-eterna/'), 'Personal form data must never use public bouquet storage');
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
        privateReads++;
        if(u.searchParams.get('auth')!=='fixture-token'||!adminGranted)return route.fulfill({status:401,contentType:'application/json',body:'null'});
        const prefix=u.pathname.replace(/\.json$/,'')+'/';
        const children=Object.fromEntries([...mockDb].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k.slice(prefix.length).replace(/\.json$/,''),v]));
        if(Object.keys(children).length)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(children)});
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
    assert.equal(await page.locator('.bouquet-slot').count(), 4, 'Should render 4 optional reference slots');

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

    // 2. Test language toggle (ES -> TR -> EN)
    await page.locator('.lang-btn[data-lang="es"]').click();
    assert.match(await page.locator('#customAssetSection, #customAssetsSection h3').innerText(), /nuevos elementos/i);
    await page.locator('.lang-btn[data-lang="tr"]').click();
    assert.match(await page.locator('#customAssetsSection h3').innerText(), /Kendi özel ürünlerinizi/i);
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
    assert.equal(await page.locator('#samplePlanPrice').innerText(), '$29 USD / month + separate quote');

    // Reject invalid destination details without submitting any records.
    const validPhone=await page.locator('#shopPhone').inputValue();await page.locator('#shopPhone').fill('123');await page.locator('#submitSetupBtn').click();assert.equal(firebaseSaved,false);assert.match(await page.locator('#submitErrorBox').innerText(),/country code/);await page.locator('#shopPhone').fill(validPhone);
    // Submit form
    await page.locator('#submitSetupBtn').click();
    await page.waitForSelector('#successPanel:not([hidden])');

    assert.ok(firebaseSaved, 'Should save onboarding payload to Firebase Realtime Database');
    const savedSetup=[...mockDb.values()].find(v=>v.code);const payload=JSON.parse(Buffer.from(savedSetup.code,'base64url'));assert.equal(payload.plan.monthlyUsd,29);assert.equal(payload.plan.includedFreeBouquets,0);assert.equal(payload.plan.customWorkRequiresQuote,true);assert.equal(payload.plan.oneTimeExtraBouquetsUsd,null);
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

    assert.equal(privateReads,0,'No private data fetched before sign-in');
    await page.locator('#adminSignIn').click();await page.waitForFunction(()=>document.getElementById('adminAuthStatus').textContent.includes('not approved'));assert.equal(privateReads,0,'Unapproved account gets no data');
    adminGranted=true;await page.locator('#adminSignIn').click();
    // Admin dossier reconstructs all 3 uploaded photos + config from chunked Firebase records
    await page.waitForFunction(() => document.querySelectorAll('#dsBody .photo-card img').length === 3);
    assert.equal(await page.locator('#dsBody .photo-card img').count(), 3, 'Admin dossier shows all 3 uploaded photos (logo, bouquet, toy)');
    assert.equal(await page.locator('#dsBody .photo-card [data-dl]').count(), 3, 'Each photo has a download button');

    // Validate generated window.NEBULA_SHOP config against check-shop.cjs!
    const generatedJs = await page.locator('#dsConfigPre').textContent();
    const report = audit(loadShop(generatedJs), { live: false });
    assert.equal(report.ok, true, 'Submitted draft prices must be structurally valid: ' + report.errors.join('; '));
    assert.equal(audit(loadShop(generatedJs), { live: true }).ok, false, 'Form submission is not launch approval');
    const downloadEvent=page.waitForEvent('download');await page.locator('#dsBuildKit').click();
    const download=await downloadEvent,kit=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));
    assert.equal(kit.kind,'nebula-shop-build-kit');assert.equal(kit.intake.nebulaShopConfig.demo,true);
    assert.equal(kit.intake.nebulaShopConfig.pricesApproved,false);
    assert.ok(kit.intake.logoDataUrl.startsWith('data:image/'));assert.ok(kit.intake.signatureBouquets[0].photoDataUrl.startsWith('data:image/'));
    assert.match(kit.brief,/docs\/SHOP-FACTORY.md/);

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

    assert.equal(await page.locator('#panel-setups').isVisible(), true, 'Website requests open by default');
    await page.locator('#setupSearch').fill('no-such-shop-xyz');
    assert.match(await page.locator('#panel-setups').textContent(), /No matching website requests/);
    await page.locator('#setupSearch').fill('');
    assert.equal(await page.locator('#panel-setups [data-dossier]').count(), 1, 'Clearing search restores saved setup');
    assert.match(await page.locator('#panel-setups').textContent(), /Submitted:/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Admin fits phone width');

    await page.locator('.tab-btn[data-tab="leads"]').click();
    await page.locator('#setupSearch').fill('sophie@kfleurs.fr');
    assert.equal(await page.locator('#panel-leads .rec-card').count(), 1, 'Find a lead by contact email');
    await page.locator('#setupSearch').fill('missing-shop');
    assert.match(await page.locator('#panel-leads').textContent(), /No matching requests/);
    await page.locator('#setupSearch').fill('');
    assert.equal(await page.locator('#panel-leads .rec-card').count(), 1, 'Clear search restores leads');

    // Undated legacy leads must not jump ahead of dated enquiries on refresh.
    mockDb.set('/nebula/leads/legacy-undated.json',{shop:'Undated legacy shop',email:'undated@example.invalid'});
    mockDb.set('/nebula/leads/older-submitted.json',{shop:'Older submitted shop',email:'older@example.invalid',submittedAt:'2020-01-02T12:00:00Z'});
    await page.locator('#btnRefresh').click();await page.waitForFunction(()=>document.getElementById('countLeads').textContent==='3');
    const cards=await page.locator('#panel-leads .rec-card').allTextContents();
    assert.match(cards[1],/Older submitted shop/);assert.match(cards[2],/Undated legacy shop/);assert.match(cards[2],/Date unavailable/);

    // 6. Test Invite-Only Gate & Domain Lock on /builder/
    await page.goto(baseOrigin + '/builder/?test_gate=1', { waitUntil: 'networkidle' });
    assert.match(page.url(), /\/shop-setup\.html$/, 'Uninvited visitor to /builder/ redirects to /shop-setup.html');

    await page.goto(baseOrigin + '/builder/?test_gate=1&vip=nebula', { waitUntil: 'networkidle' });
    assert.match(page.url(), /\/demo\/nebula-builder\/index\.html/, 'VIP link unlocks /demo/nebula-builder/');
    assert.equal(await page.evaluate(() => window.NebulaShop?.hostAllowed), true, 'Authorized host sets NebulaShop.hostAllowed = true');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('nebula_vip')), '1', 'VIP invite persists in sessionStorage');

    assert.deepEqual(errors, []);
    console.log('PASS florist-onboarding.cjs: UI, images, EN/ES, custom assets, consultation form, Admin Dashboard, and valid NEBULA_SHOP output');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
