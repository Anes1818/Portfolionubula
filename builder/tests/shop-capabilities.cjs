/* Live capability checks intercept configuration locally; no approvals are changed. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/shop-config.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('"demo": true','"demo": false')});});
  const ready=()=>page.waitForFunction(()=>window.__ready===true);
  await page.goto(base);assert.equal(await page.locator('.bouquet-card:visible').count(),1);
  await page.goto(base+'studio.html?template=pink-promise');await ready();
  const original=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));
  assert.ok(await page.evaluate(()=>NebulaShop.assess(NebulaApp.state).ok));
  assert.ok(await page.locator('[data-mode="classic"]').isDisabled());
  assert.equal(await page.evaluate(()=>NebulaApp.switchMode('classic').ok),false);
  await page.evaluate(()=>NebulaApp.applyFallTemplate('midnight-blooms'));
  assert.equal(await page.evaluate(()=>NebulaLink.encode(NebulaApp.state)),original);
  assert.equal(await page.locator('#startingRecipes [data-recipe="midnight-blooms"]').count(),0);
  assert.equal(await page.evaluate(()=>{const s=NebulaApp.state;s.finishes.butterfly=1;return NebulaApp.setState(s).ok;}),false);
  assert.equal(await page.evaluate(()=>{const s=NebulaApp.state;s.title='My bouquet';s.note='A private card';return NebulaApp.setState(s).ok;}),true);
  console.log('PASS live catalog, mode, starting recipe, direct application and unapproved customization');
  const unsupported=await page.evaluate(()=>{
   const s=NebulaClassic.create('midnight-blooms');
   localStorage.setItem(NebulaConfig.CONFIG.storageKey,JSON.stringify(NebulaModel.portfolio(s,{})));
   NebulaSaved.save(s);return {code:NebulaLink.encode(s),saved:NebulaSaved.read()[0].id,raw:localStorage.getItem(NebulaConfig.CONFIG.storageKey),design:s};
  });
  for(const entry of ['studio.html','studio.html?saved='+unsupported.saved,'studio.html#b='+unsupported.code]){
   await page.goto(base+entry);await ready();
   assert.ok(await page.locator('#shopCapabilityNotice').isVisible());assert.ok(await page.locator('#orderButton').isDisabled());
   assert.equal(await page.evaluate(()=>localStorage.getItem(NebulaConfig.CONFIG.storageKey)),unsupported.raw);
   await page.evaluate(()=>{document.getElementById('orderDialog').showModal();ordName.value='Test';ordDate.value='2099-11-20';orderSend.click();});
   assert.ok(await page.locator('#orderError').isVisible());assert.ok(await page.locator('#smsPrepared').isHidden());
   await page.evaluate(()=>orderDialog.close());
   assert.ok(await page.evaluate(async()=>{const blob=await NebulaApp.exportBlob(320,390);return blob.size>5000;}));
  }
  await page.goto(base+'order.html#b='+unsupported.code);await page.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
  assert.ok(await page.locator('#shopCapabilityNotice').isVisible());
  await page.goto(base+'studio.html?template=pink-promise');await ready();
  await page.evaluate(raw=>NebulaApp.importDesign(raw),unsupported.design);await page.locator('#confirmYes').click();
  assert.ok(await page.locator('#shopCapabilityNotice').isVisible());assert.ok(await page.locator('#orderButton').isDisabled());
  assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Midnight Blooms');
  await page.evaluate(()=>NebulaApp.applyFallTemplate('pink-promise'));assert.ok(await page.locator('#orderButton').isEnabled());
  assert.ok(await page.evaluate(()=>localStorage.getItem(NebulaConfig.CONFIG.storageKey+'.unsupported-backup').includes('Midnight Blooms')));
  console.log('PASS saved, local, shared, sheet and imported unsupported designs remain recoverable but cannot prepare requests');
  await page.goto(base+'studio.html?template=midnight-blooms');await ready();
  assert.equal(await page.evaluate(()=>NebulaApp.state.mode),'dome');
  assert.ok(await page.evaluate(()=>NebulaShop.assess(NebulaLink.decode(NebulaLink.encode(NebulaApp.state)).design).ok));
  // Explicit custom values do not grant approval to unrelated options.
  assert.ok(await page.evaluate(()=>{NEBULA_SHOP.recipeOptions={'pink-promise':{butterfly:[1]}};const s=NebulaApp.state;s.finishes.butterfly=1;return NebulaShop.assess(s).ok;}));
  assert.equal(await page.evaluate(()=>{const s=NebulaApp.state;s.finishes.butterfly=2;return NebulaShop.assess(s).ok;}),false);
  await page.goto(new URL('/builder/studio.html',base).href);await ready();
  assert.ok(await page.evaluate(()=>NebulaApp.switchMode('classic').ok));
  await page.evaluate(()=>NebulaApp.applyFallTemplate('midnight-blooms'));assert.equal(await page.evaluate(()=>NebulaApp.state.items.length),23);
  assert.ok(await page.evaluate(()=>NebulaShop.assess(NebulaApp.state).ok));
  assert.deepEqual(errors,[]);console.log('PASS trusted per-recipe option scope, shared round trip, and unrestricted Nebula/Midnight');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
