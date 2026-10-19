/* Browser regression for the isolated photographic study and shared renderer. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SHOP_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/',qa='clients/la-flor-eterna/qa/next-phase/';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'pink-proof.html?archive=1');await page.waitForFunction(()=>PinkProof.ready);
 const result=await page.evaluate(()=>{
  const s=PinkProof.state,M=NebulaModel,P=NebulaPhoto,L=NebulaLink,R=NebulaRenderer,signature=x=>JSON.stringify(P.scene(x));
  const reopened=L.decode(L.encode(s)).design,invalid=M.clone(s);invalid.photographic.version=99;
  const foreign=M.clone(s);foreign.photographic.id='not-a-recipe';const unsupported=M.clone(s);unsupported.finishes.crown=true;
  const legacy=NebulaRomance.create('pink-promise'),legacyDecoded=L.decode(L.encode(legacy)).design;
  const portfolio=M.validatePortfolio(M.portfolio(s,{})),v1=P.create(1),v1back=L.decode(L.encode(v1)).design;
  const invalidPaper=M.clone(s);invalidPaper.photographic.paper='gingham';if(M.validate(invalidPaper))throw Error('V2 accepted rejected paper');if(signature(v1)!==signature(v1back)||v1back.photographic.version!==1||P.scene(v1).nodes[0].x!==275)throw Error('V1 geometry changed');
  return {count:s.items.length,renderCount:P.scene(s).nodes.length,roundtrip:signature(s)===signature(reopened),portfolio:signature(s)===signature(portfolio.bouquets.dome),invalid:M.validate(invalid),unknownLink:L.decode(L.encode(invalid)),foreign:M.validate(foreign),unsupported:M.validate(unsupported),restricted:!NebulaShop.assess(s).ok,legacy:!legacyDecoded.photographic&&legacyDecoded.items.length===44,links:L.encode(s).length,assetCount:R.assetsFor(s).size};
 });
 assert.equal(result.count,28);assert.equal(result.renderCount,result.count);assert.ok(result.roundtrip&&result.portfolio&&result.restricted&&result.legacy);assert.equal(result.invalid,null);assert.equal(result.unknownLink,null);assert.equal(result.foreign,null);assert.equal(result.unsupported,null);
 console.log('PASS versioned scene/save/share round trips; unknown versions recover; legacy Pink Promise retains 44 items; proof cannot order');
 const original=await page.evaluate(()=>PinkProof.state);
 await page.locator('#adjust summary').click();await page.selectOption('#selected','b15');await page.locator('[data-nudge="4,0"]').click();
 let changed=await page.evaluate(()=>({state:PinkProof.state,scene:PinkProof.scene}));assert.equal(changed.state.photographic.adjustments.b15[0],4);assert.equal(changed.state.items.length,28);
 const changedCode=await page.evaluate(()=>NebulaLink.encode(PinkProof.state));
 await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>PinkProof.state),original);await page.locator('#redo').click();assert.equal((await page.evaluate(()=>PinkProof.state)).photographic.adjustments.b15[0],4);
 assert.equal(await page.locator('fieldset').isVisible(),false);await page.locator('#filler').uncheck();
 const noFiller=await page.evaluate(()=>({state:PinkProof.state,scene:PinkProof.scene}));assert.equal(noFiller.scene.filler.length,0);assert.deepEqual(changed.scene.nodes,noFiller.scene.nodes);
 await page.fill('#title','Private title');await page.fill('#note','Private card message');await page.locator('#save').click();const saved=await page.evaluate(()=>PinkProof.state);await page.reload();await page.waitForFunction(()=>PinkProof.ready);assert.deepEqual(await page.evaluate(()=>PinkProof.state),saved);
 assert.equal(await page.evaluate(()=>localStorage.getItem(NebulaConfig.CONFIG.storageKey)),null);
 console.log('PASS individual adjustment, undo/redo, paper/filler invariance, isolated save/reload');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('blocked'))},configurable:true}));await page.locator('#share').click();await page.locator('#linkFallback').waitFor({state:'visible'});const share=await page.locator('#linkText').inputValue();
 const sheetURL=await page.locator('#sheet').getAttribute('href');
 const fresh=await browser.newPage();await fresh.goto(share);await fresh.waitForFunction(()=>PinkProof.ready);const shared=await fresh.evaluate(()=>PinkProof.state);assert.equal(shared.note,'');assert.equal(shared.title,'');assert.deepEqual(shared.photographic,saved.photographic);await fresh.close();
 await page.goto(base+sheetURL);await page.locator('#orderSheet').waitFor({state:'visible'});assert.equal(await page.locator('#osTotal').innerText(),'Pricing pending');assert.ok((await page.locator('#osOpenStudio').getAttribute('href')).startsWith('pink-proof.html'));assert.match(await page.locator('#osFinishes').innerText(),/none.*Baby’s breath: off/s);
 const sheetPixels=await page.evaluate(()=>{const a=document.querySelector('#osCanvas'),b=NebulaRenderer.makeCanvas(a.width,a.height);NebulaRenderer.paint(b,NebulaLink.decode(NebulaLink.readHash(location.hash)).design);const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let difference=0;for(let i=0;i<x.length;i++)difference+=Math.abs(x[i]-y[i]);return difference/x.length;});assert.ok(sheetPixels<.3,'Sheet pixels differ beyond on/off-screen antialiasing tolerance: '+sheetPixels);
 console.log('PASS clipboard fallback, private title/note omission, fresh shared reopening, matching sheet renderer/options');
 await page.goto(base+'pink-proof.html#b='+changedCode);await page.waitForFunction(()=>PinkProof.ready);
 const png=await page.evaluate(async()=>{await NebulaRenderer.awaitAssets(PinkProof.state);return NebulaRenderer.exportCanvas(PinkProof.state,1440,1600).toDataURL().split(',')[1];});fs.writeFileSync(qa+'pink-proof-export.png',Buffer.from(png,'base64'));
 await page.screenshot({path:qa+'pink-proof-desktop.png',fullPage:true});await page.locator('#flowers').screenshot({path:qa+'pink-proof-flowers.png'});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const lang of ['en','es']){await page.selectOption('#language',lang);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#heading').innerText(),lang==='es'?'Rosas en flor.':'Pink, in bloom.');}}
 await page.setViewportSize({width:390,height:844});await page.selectOption('#language','en');await page.screenshot({path:qa+'pink-proof-mobile.png',fullPage:true});
 const before=await page.locator('#flowers').evaluate(c=>c.toDataURL());await page.locator('#oldView').click();const old=await page.locator('#flowers').evaluate(c=>c.toDataURL());assert.notEqual(before,old);await page.locator('#newView').click();assert.equal(before,await page.locator('#flowers').evaluate(c=>c.toDataURL()));
 await page.goto(base+'studio.html#b='+changedCode);await page.waitForURL('**/pink-proof.html#*');await page.waitForFunction(()=>PinkProof.ready);
 assert.deepEqual(errors,[]);
 const failure=await browser.newPage();let blocked=true;await failure.route('**/rose-blush-open-a.png',route=>blocked?route.abort():route.continue());await failure.goto(base+'pink-proof.html?archive=1');await failure.locator('#retry').waitFor({state:'visible'});assert.equal(await failure.locator('#download').isDisabled(),true);blocked=false;await failure.locator('#retry').click();await failure.waitForFunction(()=>PinkProof.ready);assert.equal(await failure.locator('#download').isDisabled(),false);await failure.close();
 console.log('PASS missing rose blocks incomplete export; Retry restores full scene without replacing design');
 fs.writeFileSync(qa+'pink-proof-results.json',JSON.stringify({passed:true,...result,widths:[320,390,768,1440],languages:['en','es'],errors,physicalSMSDeliveryTested:false},null,2));
 console.log('PASS large PNG, EN/ES at 320/390/768/1440, Before toggle, studio recovery route; no missing assets or JS errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
