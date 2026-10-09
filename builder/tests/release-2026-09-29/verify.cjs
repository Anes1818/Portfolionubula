/* Run with NODE_PATH pointing to Playwright and a local server at :8765.
   Own headless Edge only. All external requests are intercepted; no messages sent. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const root=path.resolve(__dirname,'../../..'),out=__dirname,checks=[],errors=[];
const url='http://127.0.0.1:8765/builder/';
const git=process.env.NEBULA_GIT||'C:/Users/laptops zone/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const save=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2));
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail??'');}
async function ready(p){await p.waitForFunction(()=>window.NebulaApp?.ready);await p.waitForTimeout(350);}
async function shot(p,name){await p.waitForTimeout(450);await p.screenshot({path:path.join(out,name+'.png')});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NEBULA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,acceptDownloads:true});
 let draft='';
 await context.route('**/*',async r=>{
  const u=r.request().url();
  if(u.startsWith('https://wa.me/')){draft=u;await r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><h2>Local draft preview</h2><p>Intercepted in the test. Nothing sent.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+new URL(u).searchParams.get('text').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</pre>'});}
  else if(u.startsWith('http://127.0.0.1:8765/')||u.startsWith('file:'))await r.continue();
  else await r.abort();
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url);await ready(p);
 await shot(p,'after-phone');
 check('Classic strawberry is withheld from featured recipes',await p.locator('[data-recipe=strawberry]').count()===0);
 await p.evaluate(()=>NebulaApp.setState(NebulaModel.create('strawberry')));
 await p.selectOption('#family','rose');
 await p.waitForTimeout(4400);
 check('Strawberry recipe has 14 berries, 6 priced herbs, ivory and $89 demo estimate',await p.evaluate(()=>{
  const s=NebulaApp.state,c=NebulaModel.counts(s),v=NebulaModel.price(s);
  return c.__berry===14&&c.rosemary===6&&s.finishes.paper==='ivory'&&v.totalCents===8900&&v.demo;
 }));
 check('Classic uses both new berry photos and all three rosemary photos',await p.evaluate(()=>{
  const ns=NebulaApp.scene().nodes;return new Set(ns.filter(n=>n.id==='__berry').map(n=>n.url)).size===2&&new Set(ns.filter(n=>n.id==='rosemary').map(n=>n.url)).size===3;
 }));
 await shot(p,'classic-strawberry-phone');await p.click('#focusPreview');await shot(p,'classic-strawberry-expanded');await p.click('#focusPreview');
 check('Classic catalog excludes new strawberries',await p.locator('[data-flower=__berry]').count()===0);
 await p.click('[data-flower=rose_white]');await p.click('#addOne');
 check('Classic still adds a priced flower beside legacy strawberries',await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).__berry===14&&NebulaModel.counts(NebulaApp.state).rose_white===1&&NebulaModel.price(NebulaApp.state).totalCents===9300));
 await p.click('#undo');await p.click('#stopBrush');
 // Actual canvas tap, delete and Undo.
 const spot=await p.evaluate(()=>{const a=NebulaApp.scene().nodes.filter(n=>n.id==='__berry').at(-1),r=document.querySelector('#bouquet').getBoundingClientRect(),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera);return {x:r.x+(a.x*v.scale+v.x)*r.width/720,y:r.y+(a.y*v.scale+v.y)*r.height/820};});
 await p.touchscreen.tap(spot.x,spot.y);check('Phone canvas tap selects a berry',await p.evaluate(()=>!!NebulaApp.selected));
 await p.click('#inlineDelete');check('Delete updates berry quantity and estimate',await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).__berry===13&&NebulaModel.price(NebulaApp.state).totalCents===8600));
 await p.click('#undo');check('Undo restores the exact recipe price',await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents===8900));
 const beforeDrag=await p.evaluate(()=>NebulaApp.state);
 await p.mouse.move(spot.x,spot.y);await p.mouse.down();await p.mouse.move(spot.x+16,spot.y-16,{steps:8});await p.mouse.up();
 check('Canvas drag changes a Classic anchor without changing price',await p.evaluate(old=>JSON.stringify(old.items)!==JSON.stringify(NebulaApp.state.items)&&NebulaModel.price(NebulaApp.state).totalCents===8900,beforeDrag));
 await p.evaluate(()=>{const s=NebulaApp.state;s.finishes.sash='blank_champagne';s.finishes.sashText='Para ti';s.finishes.sashPlacement='low';s.finishes.sashOffset=8;NebulaApp.setState(s);});
 const round=await p.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s)).design;return {same:JSON.stringify(s.items)===JSON.stringify(d.items)&&JSON.stringify(s.finishes)===JSON.stringify(d.finishes),code:NebulaLink.encode(s)};});
 check('Design link preserves manual Classic positions, variation IDs and personalized sash',round.same);
 check('Classic berries count toward the 20-main-item capacity',await p.evaluate(()=>!NebulaGeometry.capacity(Array.from({length:21},(_,i)=>({id:'__berry',uid:'b'+(i+1)})),'classic').ok));
 check('Larger preview keeps the original Fit for tall manually placed greenery',await p.evaluate(()=>{
  const s=NebulaModel.create();NebulaModel.add(s,'eucalyptus');const it=s.items.at(-1);
  it.anchors.classic=NebulaGeometry.constrainClassic({x:360,y:0},s.frames.classic,'eucalyptus');
  const n=NebulaRenderer.scene(s).nodes.find(n=>n.uid===it.uid),v=NebulaRenderer.view(s);
  return v.scale===1.08&&(n.y-n.h/2)*v.scale+v.y>=0;
 }));
 // Exercise save/load across all three independent modes.
 for(const mode of ['dome','heart']){await p.click('[data-mode='+mode+']');await p.evaluate(()=>NebulaApp.paintSlot(0,'__berry'));}
 await p.click('[data-mode=classic]');
 const portfolio=await p.evaluate(()=>NebulaApp.portfolio);
 await p.reload();await ready(p);check('Reload restores all three mode states',await p.evaluate(old=>JSON.stringify(NebulaApp.portfolio)===JSON.stringify(old),portfolio));
 await p.click('#saveTop');
 let dl=p.waitForEvent('download');await p.click('#saveJSON');let download=await dl;const jsonFile=path.join(out,'saved-design.json');await download.saveAs(jsonFile);
 check('Downloaded JSON contains all three independently saved bouquets',Object.keys(JSON.parse(fs.readFileSync(jsonFile)).bouquets).length===3);
 dl=p.waitForEvent('download');await p.click('#saveSquare');download=await dl;await download.saveAs(path.join(out,'strawberry-export.png'));
 const png=fs.readFileSync(path.join(out,'strawberry-export.png'));check('Real PNG download is 1080 × 1080',png.readUInt32BE(16)===1080&&png.readUInt32BE(20)===1080&&png.length>10000);
 await p.click('[data-close=saveDialog]');
 await p.evaluate(()=>NebulaApp.setState(NebulaModel.create()));
 await p.locator('#importFile').setInputFiles(jsonFile);
 if(await p.locator('#confirmDialog').isVisible())await p.click('#confirmYes');
 check('JSON import restores the saved strawberry design and three banks',await p.evaluate(old=>JSON.stringify(NebulaApp.portfolio)===JSON.stringify(old),portfolio));
 // Browser route captures WhatsApp navigation; never touches its network.
 for(const lang of ['en','es']){
  await p.selectOption('#language',lang);await p.click('#orderButton');
  await p.click('#orderSend');check(lang+' empty request is blocked',await p.locator('#orderError').isVisible());
  await p.fill('#ordName','Release Test');await p.fill('#ordPhone','+1 202 555 0147');await p.fill('#ordDate','2026-10-15');await p.selectOption('#ordMethod','Delivery');
  check(lang+' correcting required fields clears the stale error',!(await p.locator('#orderError').isVisible()));
  await p.click('.order-options summary');await p.selectOption('#ordPay','Ask me');await p.fill('#ordNote',lang==='es'?'Prueba local, no enviar':'Local test, do not send');
  await p.locator('#orderSend').scrollIntoViewIfNeeded();await shot(p,'order-'+lang);
  await Promise.all([p.waitForURL('https://wa.me/**'),p.click('#orderSend')]);
  const text=new URL(draft).searchParams.get('text');fs.writeFileSync(path.join(out,'whatsapp-draft-'+lang+'.txt'),text);
  check(lang+' complete draft includes quantities, estimate, customer, date and unconfirmed notice',text.includes('14 ×')&&text.includes('6 ×')&&text.includes('89.00')&&text.includes('Release Test')&&text.includes('2026-10-15')&&text.includes(lang==='es'?'DEMO':'DEMO'));
  const sheetURL=text.match(/http:\/\/127\.0\.0\.1:8765\/builder\/order\.html#b=[\w-]+/)?.[0];check(lang+' draft contains a real order-sheet link',!!sheetURL);
  await p.goto(sheetURL);await p.waitForSelector('#orderSheet:not([hidden])');await p.selectOption('#language',lang);
  check(lang+' order sheet reconstructs customer, quantities and price',await p.evaluate(()=>document.querySelector('#osCustomerList').textContent.includes('Release Test')&&document.querySelector('#osStems').textContent.includes('14')&&document.querySelector('#osTotal').textContent.includes('89.00')));
  check(lang+' order sheet scrolls to recipe and actions on mobile',await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight&&getComputedStyle(document.body).overflow!=='hidden'));
  await shot(p,'sheet-'+lang);await p.locator('#osTotal').scrollIntoViewIfNeeded();await shot(p,'sheet-'+lang+'-recipe');
  const code=new URL(sheetURL).hash.slice(3);check(lang+' handoff preserves customized design',await p.evaluate(code=>{const d=NebulaLink.decode(code).design;return d.finishes.sashText==='Para ti'&&d.items.some(it=>it.anchors.classic.manual);},code));
  await p.goto(url);await ready(p);
 }
 // Existing artifacts/geometry are compared with the actual pre-release revision.
 const baseline=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const bp=await baseline.newPage();const cache={};
 await baseline.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();const rel=decodeURIComponent(u.pathname).slice(1)||'builder/index.html';if(/\.(js|css|html)$/.test(rel)||rel==='builder/'){
  const f=rel==='builder/'?'builder/index.html':rel;
  if(!cache[f])cache[f]=cp.execFileSync(git,['show','615d1db:'+f],{cwd:root,maxBuffer:30*1024*1024});
  return r.fulfill({body:cache[f],contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'});
 }return r.continue();});
 await bp.goto(url);await ready(bp);await bp.selectOption('#family','strawberry');await bp.locator('#flowerGrid').scrollIntoViewIfNeeded();await shot(bp,'before-classic-strawberry-catalog');const legacy={};
 for(const mode of ['dome','heart']){
  const render=async page=>page.evaluate(async mode=>{const s=NebulaApp.createScenario(mode,Array(mode==='dome'?30:41).fill('__berry'));s.finishes.greenRim=true;NebulaApp.setState(s);await NebulaRenderer.ready([s]);NebulaApp.render();return {picture:document.querySelector('#bouquet').toDataURL(),code:NebulaLink.encode(s),total:NebulaModel.price(s).totalCents};},mode);
  const old=await render(bp);legacy[mode]=old.code;await bp.waitForTimeout(4400);await shot(bp,'before-'+mode);
  await p.selectOption('#language','en');const current=await render(p);await shot(p,'after-'+mode);
  check(mode+' revised berry artwork replaces the original image',old.picture!==current.picture&&await p.evaluate(mode=>NebulaApp.scene().nodes.filter(n=>!n.decorative).every(n=>n.url.includes(mode==='dome'?'strawberry-natural-':'strawberry-overhead-')),mode));
  check(mode+' original price remains unchanged',old.total===current.total);
  // A fresh load exercises the link decoder; hash-only navigation does not reboot this vanilla app.
  await p.goto(url+'index.html#b='+old.code);await p.reload();await ready(p);check(mode+' old __berry link opens with all fruit and greenery',await p.evaluate(mode=>NebulaApp.state.mode===mode&&NebulaApp.state.items.every(i=>i.id==='__berry')&&NebulaApp.state.finishes.greenRim,mode));
  await p.selectOption('#family','rose');await p.click('[data-flower=rose_white]');
  const slot=await p.evaluate(()=>{const n=NebulaApp.scene().nodes.find(n=>n.slot===0),r=document.querySelector('#bouquet').getBoundingClientRect(),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera);return {x:r.x+(n.x*v.scale+v.x)*r.width/720,y:r.y+(n.y*v.scale+v.y)*r.height/820};});
  await p.touchscreen.tap(slot.x,slot.y);
  check(mode+' catalog selection paints a slot without adding capacity',await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).rose_white===1&&NebulaApp.state.items.length===NebulaApp.state.template.capacity));
  await p.click('#undo');check(mode+' Undo restores painted strawberry',await p.evaluate(()=>NebulaApp.state.items.every(i=>i.id==='__berry')));
 }
 save('legacy-links.json',legacy);await baseline.close();
 // Compact screens, English/Spanish, all panels and no horizontal overflow.
 await p.goto(url);await ready(p);await p.evaluate(()=>NebulaApp.setState(NebulaModel.create('strawberry')));
 for(const [width,height,lang] of [[390,844,'es'],[360,740,'en'],[320,568,'es']]){
  await p.setViewportSize({width,height});await p.selectOption('#language',lang);await shot(p,`phone-${width}-${lang}`);
  check(`${width}px ${lang}: no horizontal overflow and usable controls`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.panel-body').clientHeight>=100&&document.querySelector('#orderButton').getBoundingClientRect().bottom<=innerHeight));
  for(const tab of ['wrapping','finishing','flowers']){await p.click('[data-tab='+tab+']');check(`${width}px ${tab} reachable`,await p.locator('#panel-'+tab).isVisible());}
 }
 await p.setViewportSize({width:390,height:844});
 await p.goto('http://127.0.0.1:8765/build-your-plan.html');await shot(p,'pricing-phone');
 check('Pricing contains current offer and no retired prices',await p.evaluate(()=>document.body.textContent.includes('$29')&&!/\$650|\$49|\$350|30 days free/.test(document.documentElement.outerHTML)));
 await p.click('[data-plan=studio]');check('Pricing enquiry stores the $29 no-domain offer',await p.locator('#f-plan').inputValue().then(s=>s.includes('$29')&&s.includes('no custom domain')));await shot(p,'pricing-enquiry');
 await p.click('.modal-close');check('Custom domain remains a separate written quote without invented price',await p.evaluate(()=>{
  const section=document.querySelector('[aria-labelledby="custom-heading"]')||document.querySelector('#custom-heading')?.parentElement;
  return !!section&&/custom domain/i.test(section.textContent)&&/quoted separately/i.test(section.textContent)&&!section.querySelector('[data-plan]');
 }));
 // Offline file boot and new-asset export use the embedded bundle.
 const offline=await browser.newContext({viewport:{width:390,height:844}});await offline.setOffline(true);const fp=await offline.newPage();
 await fp.goto(require('url').pathToFileURL(path.join(root,'builder/index.html')).href);await ready(fp);
 check('file:// offline starts and renders all new Classic artwork',await fp.evaluate(async()=>{NebulaApp.setState(NebulaModel.create('strawberry'));const b=await NebulaApp.exportBlob(1080,1080);return b.size>10000&&window.__errors.length===0;}));await offline.close();
 check('No JavaScript errors',errors.length===0,errors);await context.close();
 }finally{await browser.close();save('results.json',{passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks});}
 if(checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);save('results.json',{error:e.stack,checks});process.exitCode=1;});
