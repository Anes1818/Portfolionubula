require('../tools/qa-output.cjs').prepareLaFlor();
/* Local owner-preview QA. Never launches a messaging handler or sends a message. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../..'),out=path.join(repo,'.private/qa/la-flor-eterna');fs.mkdirSync(out,{recursive:true});
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/',origin=new URL(base).origin;
const checks=[],lengths=[],errors=[],missing=[];function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
const sandbox={window:{navigator:{}},Date,encodeURIComponent};vm.runInNewContext(fs.readFileSync(path.join(repo,'builder/request.js'),'utf8'),sandbox);const Q=sandbox.window.NebulaRequest;
check('Strict international recipient validation',Q.recipient('+13108729856')&&['13108729856','+012345678','+1 310 872 9856','+123','+1234567890123456'].every(v=>!Q.recipient(v)));
const special='María & Ana + ñ\nA rose? #1';
check('Both channel URLs preserve accents, newlines and punctuation',decodeURIComponent(Q.url('sms','+13108729856',special).split('body=')[1])===special&&decodeURIComponent(Q.url('whatsapp','+15713367129',special).split('text=')[1])===special);
check('Apple best-effort syntax remains explicit',Q.url('sms','+13108729856','test',true)==='sms:+13108729856&body=test');
check('Impossible dates, past dates, empty names and overlong notes rejected',Q.validate({name:'Ana',date:'2026-02-30',method:'Pickup'},'2026-01-01')==='date'&&Q.validate({name:'Ana',date:'2026-01-01',method:'Pickup'},'2026-10-16')==='date'&&Q.validate({name:'',date:'2026-11-20',method:'Pickup'},'2026-10-16')==='name'&&Q.validate({name:'Ana',date:'2026-11-20',method:'Pickup',note:'x'.repeat(121)},'2026-10-16')==='note');
const {loadShop,audit}=require('../tools/check-shop.cjs');const shop=audit(loadShop(fs.readFileSync(path.join(repo,'shops/la-flor-eterna/shop-config.js'),'utf8')));check('SMS profile passes price coverage/configuration audit in sample mode',shop.ok&&shop.mode==='demo');
check('Live validation blocks unapproved sample prices',!audit(loadShop(fs.readFileSync(path.join(repo,'shops/la-flor-eterna/shop-config.js'),'utf8')),{live:true}).ok);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  const ready=()=>page.waitForFunction(()=>window.__ready===true,null,{timeout:30000});
  await page.goto(origin+'/builder/studio.html');await ready();const nebula=await page.evaluate(()=>{const s=NebulaApp.state;s.title='NEBULA-DO-NOT-IMPORT';localStorage.setItem('nebulaBouquetV6',JSON.stringify(NebulaModel.portfolio(s,{})));localStorage.setItem('nebulaLanguageV4','es');localStorage.setItem('nebulaSavedBouquetsV1',JSON.stringify([{id:'other',savedAt:1,design:s}]));return localStorage.getItem('nebulaBouquetV6');});
  await page.goto(base,{waitUntil:'networkidle'});
  check('Catalog stays light and does not import Nebula language/draft/shelf',await page.evaluate(()=>document.documentElement.lang==='en'&&document.querySelector('#resumeDesign').hidden&&document.querySelectorAll('.saved-card').length===0&&![...document.scripts].some(s=>/renderer|model|assets-bundle/.test(s.src))));
  check('Confirmed design is first; complete retained library available',await page.locator('.bouquet-card').count()===10&&await page.locator('.bouquet-card').first().getAttribute('data-id')==='pink-promise');
  const ids=await page.evaluate(()=>NEBULA_COLLECTIONS.map(r=>r.id));
  check('Withdrawn design absent',!ids.includes('sunlit-heart'));
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width>760?1000:844});check('Catalog fits '+width,await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));await page.screenshot({path:path.join(out,'catalog-'+width+'.png'),fullPage:width===390});}
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-id="pink-promise"] .customize-link').click();await ready();
  check('Shop identity, exact SMS recipient and scoped keys',await page.evaluate(()=>NebulaConfig.CONFIG.brand==='La Flor Eterna'&&NebulaConfig.CONFIG.recipient==='+13108729856'&&NebulaConfig.CONFIG.storageKey==='shop:la-flor-eterna:nebulaBouquetV6'&&NebulaApp.lang==='en'));
  await page.evaluate(()=>{const s=NebulaApp.state;s.title='PRIVATE-TITLE';s.note='PRIVATE-GIFT-NOTE';NebulaApp.setState(s);});
  const initial=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));
  await page.evaluate(()=>{const s=NebulaApp.state;s.finishes.butterfly=1;NebulaApp.setState(s);NebulaApp.undo();});
  check('Undo retains exact design',await page.evaluate(()=>NebulaLink.encode(NebulaApp.state))===initial);
  await page.evaluate(()=>NebulaApp.redo());await page.reload();await ready();
  check('Reload retains edits and isolates original Nebula draft',await page.evaluate(()=>NebulaApp.state.finishes.butterfly===1&&NebulaApp.state.title==='PRIVATE-TITLE')&&await page.evaluate(()=>localStorage.getItem('nebulaBouquetV6'))===nebula);
  await page.locator('#saveTop').click();await page.locator('#savedBouquetName').fill('Owner saved design');await page.locator('#saveShelf').click();await page.locator('#saveDialog [data-close="saveDialog"]').click();
  check('Saved shelf is shop-scoped',await page.evaluate(()=>JSON.parse(localStorage.getItem('shop:la-flor-eterna:nebulaSavedBouquetsV1')).length===1&&JSON.parse(localStorage.getItem('nebulaSavedBouquetsV1'))[0].id==='other'));
  await page.locator('#orderButton').click();await page.locator('#orderSend').click();check('Empty form has recovery error',await page.locator('#orderError').isVisible());
  await page.locator('#ordName').fill('María & Ana');await page.locator('#ordDate').fill('2026-01-01');await page.locator('#orderSend').click();check('Past date rejected',await page.locator('#orderError').isVisible());
  await page.locator('#ordDate').fill('2099-11-20');await page.locator('.order-options summary').click();await page.locator('#ordNote').fill('Ánimo & amor\nPlease confirm delivery.');await page.locator('#orderSend').click();
  const draft=await page.locator('#smsMessage').inputValue(),href=await page.locator('#smsOpen').getAttribute('href');
  check('Request uses exact recipient, sample label and complete florist-sheet link',href.startsWith('sms:+13108729856?body=')&&decodeURIComponent(href.split('body=')[1])===draft&&draft.includes('Sample estimate')&&draft.includes(base+'order.html#b='));
  check('Diagnostics removed and fallbacks initially collapsed',await page.locator('#smsLength').count()===0&&await page.locator('.sms-trouble').evaluate(el=>!el.open));
  const link=draft.split('Design: ')[1],decoded=await page.evaluate(link=>NebulaLink.decode(NebulaLink.readHash(new URL(link).hash)),link);
  check('Design link omits all customer and private title/note fields',decoded.design.title===''&&decoded.design.note===''&&!decoded.order&&!link.includes('Mar'));
  await page.locator('#orderSend').click();check('Repeated prepare preserves reference',await page.locator('#smsMessage').inputValue()===draft);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}}));await page.locator('#smsCopy').click();
  check('Clipboard failure selects complete text and keeps manual fallback',await page.evaluate(()=>smsMessage.selectionStart===0&&smsMessage.selectionEnd===smsMessage.value.length)&&await page.locator('#smsStatus').innerText()==='Automatic copy is unavailable. The text is selected; copy it manually.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));await page.locator('#smsCopy').click();check('Clipboard success confirms copy only',await page.evaluate(()=>window.__copied===smsMessage.value)&&(await page.locator('#smsStatus').innerText()).startsWith('Request copied.'));
  await page.locator('.sms-trouble summary').click();
  await page.locator('#smsPlain').check();check('Complete text alternative omits link and retains name/notes/options',!(await page.locator('#smsMessage').inputValue()).includes('#b=')&&(await page.locator('#smsMessage').inputValue()).includes('Ánimo & amor'));
  await page.locator('#smsPlain').uncheck();
  await page.evaluate(()=>smsOpen.addEventListener('click',e=>e.preventDefault()));await page.locator('#smsOpen').click();check('Simulated unavailable/cancelled handler retains message and form',await page.locator('#smsMessage').inputValue()===draft&&await page.locator('#ordName').inputValue()==='María & Ana'&&await page.locator('#orderDialog').isVisible());
  const downloadPromise=page.waitForEvent('download');await page.locator('#smsImage').click();const download=await downloadPromise;await download.saveAs(path.join(out,'branded-bouquet.png'));check('Branded PNG exports successfully',(fs.statSync(path.join(out,'branded-bouquet.png')).size>50000));
  const sheet=await page.locator('#smsSheet').getAttribute('href');
  await page.locator('#orderDialog [data-close="orderDialog"]').click();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width>760?1000:844});check('Editor fits '+width,await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));await page.screenshot({path:path.join(out,'editor-'+width+'.png')});}
  await page.setViewportSize({width:390,height:844});await page.locator('#orderButton').click();
  check('Customer review has no WhatsApp or payment chooser',!(await page.locator('#orderDialog').innerText()).match(/WhatsApp|Zelle|CashApp|Venmo|PayPal/) && !await page.locator('#ordPay').isVisible());
  await page.locator('#orderDialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'review-en.png')});
  await page.locator('#orderSend').click();await page.locator('#smsPrepared').evaluate(el=>el.scrollIntoView());await page.locator('#smsMessage').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'handoff-en.png')});
  await page.locator('#orderDialog [data-close="orderDialog"]').click();await page.locator('#language').selectOption('es');await page.locator('#orderButton').click();await page.locator('#orderSend').click();
  check('Spanish handoff uses translated request, sample estimate and exact recipient',(await page.locator('#smsMessage').inputValue()).includes('Estimación de muestra')&&(await page.locator('#smsOpen').innerText())==='Abrir mensaje de texto');
  await page.locator('#orderDialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'review-es.png')});await page.locator('#smsPrepared').evaluate(el=>el.scrollIntoView());await page.locator('#smsMessage').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'handoff-es.png')});
  await page.goto(sheet);await page.waitForFunction(()=>!document.getElementById('orderSheet').hidden);check('Florist sheet has working supplied logo, client title and sample estimate',await page.evaluate(()=>document.querySelector('.sheet-logo').naturalWidth===1024&&document.title.startsWith('La Flor Eterna')&&document.getElementById('osTotal').textContent.includes('muestra')));await page.screenshot({path:path.join(out,'sheet-mobile.png'),fullPage:true});
  await page.locator('#osOpenStudio').click();await ready();check('Florist-sheet edit link preserves shop context and recipe',page.url().startsWith(base+'studio.html')&&await page.evaluate(()=>NebulaApp.state.items.length===44));
  const fresh=await browser.newContext(),other=await fresh.newPage();await other.goto(link);await other.waitForFunction(()=>!document.getElementById('orderSheet').hidden);await other.locator('#osOpenStudio').click();await other.waitForFunction(()=>window.__ready);check('Fresh browser reconstructs same bouquet from sheet without saved state',await other.evaluate(()=>NebulaApp.state.items.length===44&&NebulaConfig.CONFIG.recipient==='+13108729856'));await fresh.close();
  const tampered=new URL(link.replace('order.html','studio.html'));tampered.search='?recipient=%2B19999999999&shop=another&whatsapp=19999999999';await page.goto(tampered.href);await ready();check('Untrusted URL fields cannot override shop identity or recipient',await page.evaluate(()=>NebulaConfig.CONFIG.recipient==='+13108729856'&&NebulaConfig.CONFIG.brand==='La Flor Eterna'));
  await page.locator('#language').selectOption('en');
  for(const id of ids){
   await page.goto(base+'studio.html?template='+id);await ready();
   const result=await page.evaluate(async()=>{const s=NebulaApp.state,R=NebulaRenderer;await R.awaitAssets(s);const copy=NebulaLink.decode(NebulaLink.encode(s)).design;const blob=await R.blob(s,400,400,'en');return {same:JSON.stringify(R.scene(s).nodes.map(x=>[x.id,x.slot,x.x,x.y,x.w,x.h,x.rot,x.url]))===JSON.stringify(R.scene(copy).nodes.map(x=>[x.id,x.slot,x.x,x.y,x.w,x.h,x.rot,x.url])),bytes:blob.size,missing:[...R.assetsFor(s)].filter(x=>!R.decoded(x))};});
   check('Recipe loads, links and exports complete artwork: '+id,result.same&&result.bytes>5000&&result.missing.length===0);
   await page.locator('#orderButton').click();await page.locator('#ordName').fill('Owner preview');await page.locator('#ordDate').fill('2099-11-20');await page.locator('#orderSend').click();const text=await page.locator('#smsMessage').inputValue();lengths.push({id,characters:text.length,encodedBody:encodeURIComponent(text).length,uri:(await page.locator('#smsOpen').getAttribute('href')).length});
  }
  await page.goto(base+'studio.html?template=scream-for-you');await ready();
  check('Scream preserves restrictions and hides unsupported lily controls',await page.evaluate(()=>!Array.from({length:NebulaApp.state.template.capacity},(_,i)=>NebulaSpooky.allowed(NebulaApp.state,i,'lily')).some(Boolean)&&!document.querySelector('#flowerGrid [data-flower="lily"]'))&&(await page.locator('#catalogueNote').innerText()).includes('Lilies do not fit'));
  await page.goto(base+'studio.html?template=midnight-blooms');await ready();
  check('Midnight retains restored Classic composition with real lilies',await page.evaluate(()=>NebulaApp.state.mode==='classic'&&NebulaApp.state.items.some(i=>i.id==='lily')));
  let attempts=0;await page.route('**/classic/lily-bloom.webp',r=>++attempts===1?r.abort('failed'):r.continue());await page.reload();await ready();check('Transient lily request failure retries automatically without losing design',attempts===2&&await page.evaluate(()=>NebulaApp.state.items.some(i=>i.id==='lily')));await page.unroute('**/classic/lily-bloom.webp');
  // Force one real lily asset to fail on a fresh document, then recover with Retry.
  await page.route('**/classic/lily-bloom.webp',r=>r.abort('failed'));
  await page.reload();await page.waitForFunction(()=>document.getElementById('startupError').hidden===false);
  check('Lily failure is visible and retryable',await page.locator('#retryStartup').isEnabled());await page.unroute('**/classic/lily-bloom.webp');await page.locator('#retryStartup').click();await ready();
  check('Lily retry restores export readiness',await page.evaluate(async()=>{const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);return NebulaRenderer.decoded('assets/classic/lily-bloom.webp').naturalWidth>0&&(await NebulaRenderer.blob(s,400,400,'en')).size>5000;}));
  for(const mode of ['classic','dome','heart']){check('Lily renders and exports in supported '+mode,await page.evaluate(async mode=>{let s;if(mode==='classic')s=NebulaApp.createScenario(mode,['lily','rose_pink']);else{s=NebulaModel.defaultMode(mode);s.template.overrides={0:'lily'};NebulaModel.syncTemplate(s);}NebulaApp.setState(s);await NebulaRenderer.awaitAssets(s);return (await NebulaRenderer.blob(s,400,400,'en')).size>5000;},mode));}
  await page.evaluate(()=>{const ids=Object.keys(NebulaConfig.CAT).filter(id=>{const c=NebulaConfig.CAT[id];return c.kind==='flower'&&c.classic!==false&&c.classicOffered!==false&&c.classicDiameter<=116;}).slice(0,20);const s=NebulaApp.createScenario('classic',ids);s.finishes.ribbon='burgundy';s.finishes.sash='blank_blackband';s.finishes.sashText='Con mucho amor, para siempre';s.finishes.butterfly=3;s.finishes.crown=true;for(const [i,it] of s.items.entries()){it.anchors.classic.manual=true;it.anchors.classic.x+=Math.sin(i)*.000001;it.anchors.classic.y+=Math.cos(i)*.000001;}s.title='PRIVATE';s.note='花'.repeat(180);NebulaApp.setState(s);});
  const anchors=await page.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(s.items.map(i=>i.anchors))===JSON.stringify(d.items.map(i=>i.anchors));});check('Custom Classic preserves all manual anchors in design links',anchors);
  await page.locator('#orderButton').click();await page.locator('#ordName').fill('花'.repeat(120));await page.locator('#ordPhone').fill('+1 202 555 0100 ext. 1234567890123456789000'.slice(0,40));await page.locator('#ordDate').fill('2099-11-20');await page.locator('.order-options summary').click();await page.locator('#ordNote').fill('花'.repeat(120));await page.locator('#orderSend').click();const worst=await page.locator('#smsMessage').inputValue();lengths.push({id:'custom-classic-20-varieties-manual-max-unicode-form',characters:worst.length,encodedBody:encodeURIComponent(worst).length,uri:(await page.locator('#smsOpen').getAttribute('href')).length});
  await page.locator('#orderDialog [data-close="orderDialog"]').click();await page.evaluate(()=>{const s=NebulaApp.state;s.items=[];NebulaApp.setState(s);});check('Empty bouquet cannot enter request flow',await page.locator('#orderButton').isDisabled());
  // Scoped invalid backups do not touch old shop data.
  await page.evaluate(()=>localStorage.setItem('shop:la-flor-eterna:nebulaBouquetV6','INVALID-SHOP-DRAFT'));await page.reload();await ready();check('Invalid backup is namespaced; Nebula original untouched',await page.evaluate(()=>localStorage.getItem('shop:la-flor-eterna:nebulaBouquetV6.invalid-backup')==='INVALID-SHOP-DRAFT')&&await page.evaluate(()=>localStorage.getItem('nebulaBouquetV6'))===nebula);
  await page.goto(base);await page.locator('#language').selectOption('es');await page.screenshot({path:path.join(out,'catalog-es.png')});check('Catalog Spanish supports SMS wording with no WhatsApp',!(await page.locator('body').innerText()).includes('WhatsApp')&&(await page.locator('h1').innerText()).includes('Un ramo'));
  check('No missing HTTP resources across retained library',missing.length===0);
  check('No unexpected runtime errors (one intentional lily failure recorded)',errors.length===0);
  await page.goto(base+'order.html#b=invalid');check('Invalid sheet links have localized recovery text',await page.locator('#orderBroken').isVisible()&&(await page.locator('#orderBroken').innerText()).startsWith('No se pudo'));
  if(fs.existsSync(path.join(out,'failure.json')))fs.unlinkSync(path.join(out,'failure.json'));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,lengths,missing,errors,physicalSMSDeliveryTested:false,notes:['One lily asset request intentionally aborted to test retry.','No SMS handler launched. Cancellation/unavailable handler simulated by preventing navigation.','Lengths use local preview URL; rerun with final publicBaseUrl before handset checks.']},null,2));
  console.log('COMPLETE',checks.length,'checks. Screenshots:',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,checks,errors,missing},null,2));process.exitCode=1;});



