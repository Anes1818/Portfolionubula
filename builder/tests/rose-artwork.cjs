require('../tools/qa-output.cjs').prepareLaFlor();
/* Compare artwork inside the ordinary shop editor; never launch a text handler. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'studio.html?template=pink-promise');await page.waitForFunction(()=>window.__ready);
  const original=await page.evaluate(()=>({code:NebulaLink.encode(NebulaApp.state),price:NebulaModel.price(NebulaApp.state).totalCents,slots:NebulaApp.scene().nodes.map(n=>[n.slot,n.x,n.y]).sort((a,b)=>a[0]-b[0])}));
  await page.locator('[data-rose-artwork="blush-v1"]').click();await page.waitForFunction(()=>NebulaApp.state.finishes.roseArtwork==='blush-v1');
  const result=await page.evaluate(()=>{
   const s=NebulaApp.state,copy=NebulaLink.decode(NebulaLink.encode(s)).design;
   const describe=s=>NebulaRenderer.scene(s).nodes.map(n=>[n.uid,n.x,n.y,n.w,n.h,n.url,n.petalMask]);
   return {same:JSON.stringify(describe(s))===JSON.stringify(describe(copy)),price:NebulaModel.price(s).totalCents,count:s.items.length,slots:NebulaApp.scene().nodes.map(n=>[n.slot,n.x,n.y]).sort((a,b)=>a[0]-b[0]),code:NebulaLink.encode(s)};
  });
  assert.equal(result.count,44);assert.equal(result.price,original.price);assert.deepEqual(result.slots,original.slots);assert.ok(result.same);
  await page.evaluate(()=>NebulaApp.undo());assert.equal(await page.evaluate(()=>NebulaLink.encode(NebulaApp.state)),original.code);
  await page.evaluate(()=>NebulaApp.redo());assert.equal(await page.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
  await page.reload();await page.waitForFunction(()=>window.__ready);assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.roseArtwork),'blush-v1');
  const stable=await page.evaluate(()=>{
   const s=NebulaApp.state,describe=()=>JSON.stringify(NebulaRenderer.scene(s).nodes);
   const before=describe();s.title='A different title';s.finishes.paper='black';return before===describe();
  });assert.ok(stable);
  await page.locator('#orderButton').click();await page.locator('#ordName').fill('Preview test');await page.locator('#ordDate').fill('2099-11-20');await page.locator('#orderSend').click();
  const sheet=await page.locator('#smsSheet').getAttribute('href');assert.ok(sheet.includes('order.html#b='));assert.ok((await page.locator('#smsMessage').inputValue()).includes(sheet));
  const fresh=await browser.newPage();await fresh.goto(sheet);await fresh.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
  assert.equal(await fresh.evaluate(()=>NebulaLink.decode(NebulaLink.readHash(location.hash)).design.finishes.roseArtwork),'blush-v1');
  await fresh.locator('#osOpenStudio').click();await fresh.waitForFunction(()=>window.__ready);
  assert.equal(await fresh.evaluate(()=>NebulaApp.state.finishes.roseArtwork),'blush-v1');
  const image=await fresh.evaluate(async()=>{const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);return {bytes:(await NebulaRenderer.blob(s,1080,1080,'en')).size,missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u))};});assert.ok(image.bytes>50000);assert.deepEqual(image.missing,[]);
  // Mixed flowers still use the real model/slots; sizes and quantities remain editable.
  assert.ok(await fresh.evaluate(()=>NebulaApp.replace(NebulaApp.state.items[0].uid,'rose_white').ok));
  assert.equal(await fresh.evaluate(()=>NebulaApp.scene().nodes.filter(n=>n.id==='rose_pink').length),43);
  await fresh.locator('[data-rose-artwork="original"]').click();await fresh.waitForFunction(()=>!NebulaApp.state.finishes.roseArtwork);
  assert.ok(await fresh.evaluate(()=>NebulaApp.scene().nodes.every(n=>!n.petalMask)));
  await fresh.locator('#language').selectOption('es');assert.equal(await fresh.locator('[data-rose-artwork="blush-v1"]').innerText(),'Rosas nuevas');
  assert.ok(await fresh.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await fresh.goto('http://127.0.0.1:4174/builder/studio.html?template=midnight-blooms');await fresh.waitForFunction(()=>window.__ready);
  assert.equal(await fresh.locator('#roseArtworkControl').count(),0);assert.equal(await fresh.evaluate(()=>NebulaApp.state.items.length),23);
  assert.deepEqual(errors,[]);
  console.log('PASS artwork comparison preserves count, price, anchors, undo/redo, reload and legacy design');
  console.log('PASS new finish round-trips through SMS sheet, fresh browser and export; mixed flowers remain editable');
  console.log('PASS EN/ES, phone width and unaffected original Nebula/Midnight');
  fs.writeFileSync('.private/qa/la-flor-eterna/next-phase/rose-comparison-link.txt',base+'studio.html#b='+result.code+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
