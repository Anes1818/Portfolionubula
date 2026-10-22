const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/',qa='clients/la-flor-eterna/qa/next-phase/';
const entries=JSON.parse(fs.readFileSync('clients/la-flor-eterna/top-sellers.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'index.html');await page.locator('#collectionTools').waitFor();
 assert.equal(await page.locator('.featured-card').count(),entries.length);
 await page.locator('#top-sellers').scrollIntoViewIfNeeded();await page.evaluate(()=>Promise.all([...document.querySelectorAll('.featured-photo img')].map(i=>i.decode())));
 assert.ok(await page.evaluate(()=>!window.NebulaRenderer&&!window.NebulaModel),'Catalog stays lightweight');
 await page.locator('#top-sellers').screenshot({path:qa+'top-sellers-desktop.png'});
 for(const entry of entries){
  await page.locator(`[data-featured-id="${entry.id}"] .customize-link`).click();await page.waitForFunction(()=>window.__ready);await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
  const state=await page.evaluate(()=>({mode:NebulaApp.state.mode,count:NebulaApp.state.items.length,art:NebulaApp.state.finishes.roseArtwork,code:NebulaLink.encode(NebulaApp.state),missing:[...NebulaRenderer.assetsFor(NebulaApp.state)].filter(u=>!NebulaRenderer.decoded(u))}));
  assert.equal(state.mode,entry.expected.mode);assert.equal(state.count,entry.expected.count);assert.equal(state.art,entry.expected.art);assert.equal(state.code,entry.expected.code);assert.deepEqual(state.missing,[]);
  // Each photo leads to editable items, not a flattened bouquet picture.
  assert.ok(await page.evaluate(()=>NebulaApp.replace(NebulaApp.state.items[0].uid,'rose_red').ok));
  await page.goto(base+'index.html');await page.locator('#collectionTools').waitFor();
 }
 await page.locator('#language').selectOption('es');assert.equal(await page.locator('#topSellersTitle').textContent(),'Los más vendidos');assert.equal(await page.locator('.featured-copy h3').first().innerText(),'Promesa rosa');
 await page.locator('#language').selectOption('en');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);if(width===390){await page.locator('#top-sellers').screenshot({path:qa+'top-sellers-mobile.png'});}}
 await page.screenshot({path:qa+'full-site-preview.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: original photo covers; exact editable design links; flower replacement; asset loading; English/Spanish; 320/390/768/1440px; no browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
