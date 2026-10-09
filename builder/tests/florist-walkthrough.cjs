/* Simulated shop-owner workflow, not customer research or a sent order. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const checks=[],out=path.join(__dirname,'florist-walkthrough');fs.mkdirSync(out,{recursive:true});
function check(name,ok){assert.ok(ok,name);checks.push(name);console.log('PASS',name);}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261007d');await p.waitForFunction(()=>window.NebulaApp?.ready);
 await p.locator('#floristGuide summary').click();check('Demo explains branding, sample prices and the request workflow',await p.locator('#floristGuide').innerText().then(s=>s.includes('logo')&&s.includes('sample prices')&&s.includes('WhatsApp draft')));
 await p.evaluate(()=>NebulaApp.applyFallTemplate('scream-for-you'));await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 check('Larger mask fills the central opening without stretching the source',await p.evaluate(()=>{const n=NebulaApp.scene().finishes.find(n=>n.uid==='scream-mask');return Math.abs(n.w/n.h-520/1104)<1e-8&&Math.abs(n.h-4.75*68)<.01&&n.w>2.1*68;}));
 const png=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(900,900)).arrayBuffer())));fs.writeFileSync(path.join(out,'mask-filled.png'),Buffer.from(png));
 await p.locator('#saveTop').click();await p.locator('#savedBouquetName').fill('Spooky customer idea');await p.locator('#saveShelf').click();
 check('Named snapshot saved with exact flowers and extras',await p.evaluate(()=>{const e=NebulaSaved.read()[0],s=NebulaApp.state;return e.design.title==='Spooky customer idea'&&JSON.stringify(e.design.items)===JSON.stringify(s.items)&&JSON.stringify(e.design.finishes)===JSON.stringify(s.finishes);}));
 const saved=await p.evaluate(()=>JSON.stringify(NebulaSaved.read()[0].design));
 await p.locator('[data-close=saveDialog]').click();await p.evaluate(()=>NebulaApp.applyFallTemplate('pink-promise'));const previous=await p.evaluate(()=>JSON.stringify(NebulaApp.state));
 await p.locator('#browseTemplates').click();await p.locator('[data-saved-id]').click();await p.locator('#confirmYes').click();
 check('Saved bouquet reopens with exact snapshot and estimate',await p.evaluate(saved=>JSON.stringify(NebulaApp.state)===saved,saved));
 await p.locator('#undo').click();check('Opening saved bouquet can be undone',await p.evaluate(()=>JSON.stringify(NebulaApp.state))===previous);
 await p.reload();await p.waitForFunction(()=>NebulaApp?.ready);check('Saved copy survives reload independently of current bouquet',await p.evaluate(saved=>JSON.stringify(NebulaSaved.read()[0].design)===saved,saved));
 await p.locator('[data-saved-id]').click();await p.locator('#confirmYes').click();await p.evaluate(()=>NebulaApp.paintSlot(0,'rose_black'));
 check('Editing reopened bouquet leaves saved snapshot unchanged',await p.evaluate(saved=>JSON.stringify(NebulaSaved.read()[0].design)===saved,saved));
 await p.locator('#orderButton').click();check('Request is clearly a review, not confirmed checkout',await p.locator('#orderSend').innerText()==='Prepare WhatsApp request'&&await p.locator('#orderDialog').innerText().then(s=>s.includes('No payment')&&s.includes('final price')));await p.locator('[data-close=orderDialog]').click();
 await p.locator('#browseTemplates').click();await p.locator('[data-remove-saved]').click();await p.locator('#confirmCancel').click();check('Removing a saved copy requires confirmation',await p.locator('[data-saved-id]').count()===1);
 const current=await p.evaluate(()=>JSON.stringify(NebulaApp.state));await p.locator('[data-remove-saved]').click();await p.locator('#confirmYes').click();check('Removing snapshot leaves open bouquet intact',await p.evaluate(current=>NebulaSaved.read().length===0&&JSON.stringify(NebulaApp.state)===current,current));
 check('Storage-full failure preserves all 20 saved designs',await p.evaluate(()=>{for(let i=0;i<20;i++)NebulaSaved.save(NebulaApp.state);const before=JSON.stringify(NebulaSaved.read());try{NebulaSaved.save(NebulaApp.state);return false;}catch(e){return e.message==='full'&&JSON.stringify(NebulaSaved.read())===before;}}));
 check('Malformed saved data is preserved instead of silently overwritten',await p.evaluate(()=>{const key='nebulaSavedBouquetsV1',before=localStorage.getItem(key);localStorage.setItem(key,'{broken');let ok=false;try{NebulaSaved.save(NebulaApp.state);}catch{ok=localStorage.getItem(key)==='{broken';}localStorage.setItem(key,before);return ok;}));
 await p.evaluate(()=>{for(const entry of NebulaSaved.read())NebulaSaved.remove(entry.id);const s=NebulaApp.state;s.title='<img src=x onerror=alert(1)>';NebulaSaved.save(s);NebulaApp.showGallery(true);});
 check('Saved titles render as text, not executable markup',await p.locator('.saved-bouquet-card h3').innerText()==='<img src=x onerror=alert(1)>'&&await p.locator('.saved-bouquet-card img').count()===0);
 for(const width of [320,390]){await p.setViewportSize({width,height:844});check(width+'px gallery and saved controls fit',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'gallery-'+width+'.png'),fullPage:true});await p.evaluate(()=>NebulaApp.showGallery(false));check(width+'px review request button fits',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.evaluate(()=>NebulaApp.showGallery(true));}
 await p.locator('#language').selectOption('es');check('Saved library and buyer guide translate to Spanish',await p.locator('#savedBouquetsTitle').innerText()==='Ramos guardados'&&await p.locator('#floristGuide summary').innerText().then(s=>s.includes('floristerías')));
 await p.evaluate(()=>{NebulaConfig.CONFIG.demo=false;NebulaApp.showGallery(true);});check('Buyer evaluation guide is hidden on configured non-demo storefront',await p.locator('#floristGuide').isHidden());
 check('No runtime errors',errors.length===0);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
