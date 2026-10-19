const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',qa='clients/la-flor-eterna/qa/next-phase/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'studio.html?template=pink-promise');await page.waitForFunction(()=>window.__ready);
  const old=await page.evaluate(()=>({code:NebulaLink.encode(NebulaApp.state),price:NebulaModel.price(NebulaApp.state).totalCents}));
  await page.locator('[data-rose-artwork="reference-v3"]').click();
  await page.waitForFunction(()=>NebulaApp.state.finishes.roseArtwork==='reference-v3'&&NebulaApp.ready);
  const result=await page.evaluate(async()=>{
   const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);
   const sc=NebulaRenderer.scene(s),code=NebulaLink.encode(s),copy=NebulaLink.decode(code).design;
   const cv=document.createElement('canvas');cv.width=720;cv.height=820;
   NebulaRenderer.paint(cv,s);
   const context=cv.getContext('2d');context.globalCompositeOperation='destination-over';context.fillStyle='#fff9f6';context.fillRect(0,0,720,820);
   return {code,price:NebulaModel.price(s).totalCents,count:sc.nodes.length,filler:sc.filler.length,
    expectedFiller:s.finishes.fillerCount,same:JSON.stringify(sc)===JSON.stringify(NebulaRenderer.scene(copy)),
    alpha:NebulaRenderer.alphaReport(s),missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u)),
    png:cv.toDataURL(),paper:sc.collar.url,compact:sc.filler.every(n=>n.url.includes('breath-compact-reference-v1')),
    pairs:[0,1,5,12].map(count=>{const state={...s,finishes:{...s.finishes,fillerCount:count}},scene=NebulaRenderer.scene(state);return {count,tufts:scene.filler.length,branches:scene.layeredFlowers.filter(n=>n.parentFiller).length,price:NebulaModel.price(state).totalCents,previousPrice:NebulaModel.price({...state,finishes:{...state.finishes,roseArtwork:'reference-v2'}}).totalCents};}),
    previousLayers:NebulaRenderer.scene({...s,finishes:{...s.finishes,roseArtwork:'reference-v2'}}).layeredFlowers.filter(n=>n.parentFiller).length,
    zeroFiller:NebulaRenderer.scene({...s,finishes:{...s.finishes,fillerCount:0}}).filler.length,
    legacyFiller:NebulaRenderer.scene({...s,finishes:{...s.finishes,roseArtwork:'reference-v1'}}).filler.every(n=>n.url.includes('assets/fall/'))};
  });
  fs.writeFileSync(qa+'reference-composition.png',Buffer.from(result.png.split(',')[1],'base64'));
  delete result.png;fs.writeFileSync(qa+'reference-results.json',JSON.stringify(result,null,2));
  fs.writeFileSync(qa+'reference-comparison-link.txt',base+'studio.html#b='+result.code+'\n');
  assert.equal(result.price,old.price);assert.equal(result.count,44);assert.equal(result.filler,result.expectedFiller);
  assert.ok(result.same);assert.deepEqual(result.missing,[]);assert.ok(result.paper.includes('gingham'));
  assert.ok(result.compact);assert.equal(result.zeroFiller,0);assert.ok(result.legacyFiller);
  for(const pair of result.pairs){assert.equal(pair.tufts,pair.count);assert.equal(pair.branches,pair.count);assert.equal(pair.price,pair.previousPrice);}assert.equal(result.previousLayers,0);
  await page.evaluate(()=>NebulaApp.undo());assert.equal(await page.evaluate(()=>NebulaLink.encode(NebulaApp.state)),old.code);
  await page.evaluate(()=>NebulaApp.redo());assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.roseArtwork),'reference-v3');
  await page.reload();await page.waitForFunction(()=>window.__ready);assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.roseArtwork),'reference-v3');
  await page.setViewportSize({width:390,height:844});await page.locator('#focusPreview').click();
  await page.screenshot({path:qa+'reference-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await page.locator('#focusPreview').click();
  await page.locator('#orderButton').click();await page.locator('#ordName').fill('Local preview');await page.locator('#ordDate').fill('2099-11-20');await page.locator('#orderSend').click();
  const sheet=await page.locator('#smsSheet').getAttribute('href');assert.ok((await page.locator('#smsMessage').inputValue()).includes(sheet));
  const fresh=await browser.newPage();await fresh.goto(sheet);await fresh.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
  assert.equal(await fresh.evaluate(()=>NebulaLink.decode(NebulaLink.readHash(location.hash)).design.finishes.roseArtwork),'reference-v3');
  await fresh.locator('#osOpenStudio').click();await fresh.waitForFunction(()=>window.__ready);
  assert.ok(await fresh.evaluate(()=>NebulaApp.replace(NebulaApp.state.items[0].uid,'rose_white').ok));
  assert.equal(await fresh.evaluate(()=>NebulaApp.scene().nodes.filter(n=>n.id==='rose_pink').length),43);
  const exported=await fresh.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaRenderer.blob(NebulaApp.state,1080,1080,'en')).size;});assert.ok(exported>50000);
  assert.deepEqual(errors,[]);
  console.log('PASS reference artwork: count, price, sprig count, deterministic link, alpha report, undo/redo, reload, mobile, SMS sheet, mixed flowers, export.');
  console.log(JSON.stringify(result.alpha));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


