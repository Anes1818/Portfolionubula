/* Local integration QA: no customer records, outbound messages or payment calls. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),shop=path.join(root,'shops/raysbouquetz'),qa=path.join(root,'.private/qa/raysbouquetz/existing-builder');fs.mkdirSync(qa,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!p.startsWith('/shops/raysbouquetz/'))throw Error();if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(shop+path.sep)||!fs.statSync(file).isFile())throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(shop,'build-manifest.json')));
 // Git preserves generated manifest bytes; source checkout line endings can vary.
 const sourceText=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 for(const file of manifest.unchangedEngines)assert.equal(sourceText(path.join(shop,file)),sourceText(path.join(root,'builder',file)),file+' must retain the original engine source');
 assert.equal(sourceText(path.join(shop,'app.js')),sourceText(path.join(root,'builder/app.js')).replace("for(const mode of ['classic','dome','heart'])if(!banks[mode])","for(const mode of ['dome','heart'])if(!banks[mode])"));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/shops/raysbouquetz/';
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 async function ready(url){await page.goto(url);try{await page.waitForFunction(()=>window.__ready===true,null,{timeout:15000});}catch(e){console.log(JSON.stringify({errors,bad,startup:await page.locator('#startupError').textContent()},null,2));throw e;}}
 try{
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:width>1000?1050:844});await page.goto(base);assert.equal(await page.locator('.bouquet-card').count(),4);assert.equal(await page.locator('.card-order').count(),4);assert.equal(await page.locator('.card-customise').count(),4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Homepage overflow '+width);await page.screenshot({path:path.join(qa,'homepage-'+width+'.png'),fullPage:true});}
  await page.setViewportSize({width:1440,height:1050});
  for(const id of ['anus-daydream','pretty-and-paid','ruby-royale','money-moves']){
   await ready(base+'studio.html?template='+id);
   assert.equal(await page.locator('[data-mode]').count(),2);assert.equal(await page.locator('[data-mode="classic"]').count(),0);
   const state=await page.evaluate(()=>NebulaApp.state),name=await page.evaluate(id=>RAY_STORE.designs.find(d=>d.id===id).name,id);assert.equal(state.title,name);assert.equal(await page.locator('#sash').inputValue(),state.finishes.sash);
   assert.equal(await page.evaluate(()=>NebulaApp.state.items.every(i=>RayBuilder.inScope(NebulaApp.state))),true);
   assert.equal(await page.locator('#brandLogo').getAttribute('src'),'assets/shop/logo.webp');
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#flowerGrid img')].every(im=>im.src.includes('/art/')||im.src.includes('/money/')||im.src.includes('/finishes/extra_chocolate_gold.webp'))));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Builder overflow '+id);
   if(id==='pretty-and-paid'){assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>RayBuilder.notes.has(i.id)).length),80);assert.equal(await page.locator('#sizePanel').isVisible(),false);}
   if(id==='money-moves')assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>RayBuilder.notes.has(i.id)).length),50);
   const content=await page.evaluate(()=>({counts:NebulaModel.counts(NebulaApp.state),capacity:NebulaApp.state.template.capacity}));
   if(id==='anus-daydream'){assert.equal(content.capacity,43);assert.equal(Object.entries(content.counts).filter(([k])=>k.startsWith('rose_')).reduce((sum,[k,v])=>sum+v,0),18);assert.equal(Object.entries(content.counts).filter(([k])=>k.startsWith('satin_dahlia')).reduce((sum,[k,v])=>sum+v,0),8);assert.equal(Object.entries(content.counts).filter(([k])=>k.startsWith('satin_plumeria')).reduce((sum,[k,v])=>sum+v,0),17);}
   if(id==='pretty-and-paid'){assert.equal(content.capacity,86);assert.equal(content.counts.satin_plumeria_purple+content.counts.satin_plumeria_lilac,6);}
   if(id==='ruby-royale'){assert.equal(content.capacity,18);assert.equal(content.counts.rose_red_glitter,18);assert.equal(state.finishes.decorations[0].id,'bow_black');}
   if(id==='money-moves'){assert.equal(content.capacity,57);assert.equal(content.counts.foam_rose_black,7);}
   await page.screenshot({path:path.join(qa,id+'-desktop.png'),fullPage:true});
  }
  // Painting cash must not shrink or move any existing satin bloom, in either mode.
  for(const mode of ['dome','heart']){
   await ready(base+'studio.html?template=anus-daydream');
   if(mode==='heart')await page.locator('[data-mode="heart"]').click();
   const unchanged=await page.evaluate(()=>{const sc=NebulaApp.scene();return {frame:sc.frame,collar:sc.collar,nodes:sc.nodes.filter(n=>n.slot!==0).map(n=>({slot:n.slot,x:n.x,y:n.y,w:n.w,h:n.h})).sort((a,b)=>a.slot-b.slot)};});
   await page.evaluate(()=>NebulaApp.paintSlot(0,'cash_usd_1'));
   assert.deepEqual(await page.evaluate(()=>{const sc=NebulaApp.scene();return {frame:sc.frame,collar:sc.collar,nodes:sc.nodes.filter(n=>n.slot!==0).map(n=>({slot:n.slot,x:n.x,y:n.y,w:n.w,h:n.h})).sort((a,b)=>a.slot-b.slot)};}),unchanged,'Stable flowers and wrapping after cash in '+mode);
   await page.locator('#tab-finishing').click();
   for(const id of ['snoopy','kitty','snoopy_topper','bow_lilac','graduation_cap'])await page.locator('[data-detail="'+id+'"]').click();
   await page.evaluate(()=>NebulaApp.paintSlot(1,'__choc'));
   const gifts=await page.evaluate(()=>{const s=NebulaApp.state,p=NebulaModel.price(s);return {s,p,code:NebulaLink.encode(s),valid:!!NebulaModel.validate(s)};});
   assert.equal(gifts.valid,true);assert.equal(gifts.p.chocolates,1);assert.equal(gifts.p.lines.find(l=>l.id==='__choc').quoteRequired,true);
   assert.equal(gifts.p.extraLines.filter(l=>['snoopy','kitty','snoopy_topper'].includes(l.id)).reduce((sum,l)=>sum+l.totalCents,0),0);
   assert.equal(gifts.p.extraLines.some(l=>l.id==='usd_exchange_margin'),false);assert.equal(gifts.p.quoteRequired,true);
   await ready(base+'studio.html#b='+gifts.code);assert.deepEqual(await page.evaluate(()=>NebulaApp.state),gifts.s);
   await page.locator('#tab-finishing').click();await page.screenshot({path:path.join(qa,'gifts-money-'+mode+'.png'),fullPage:true});
  }
  await ready(base+'studio.html?template=ruby-royale');
  await page.evaluate(()=>localStorage.clear());await ready(base+'studio.html?template=ruby-royale');
  const before=await page.evaluate(()=>({s:NebulaApp.state,p:NebulaModel.price(NebulaApp.state)}));assert.equal(before.p.totalCents,17700);assert.equal(before.p.quoteRequired,true);
  await page.evaluate(()=>NebulaApp.paintSlot(0,'rose_pink'));assert.equal(await page.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents),17600);
  await page.evaluate(()=>NebulaApp.undo());assert.equal(await page.evaluate(()=>NebulaApp.state.items[0].id),'rose_red_glitter');await page.evaluate(()=>NebulaApp.redo());assert.equal(await page.evaluate(()=>NebulaApp.state.items[0].id),'rose_pink');
  await page.evaluate(()=>NebulaApp.move(NebulaApp.state.items[0].uid,NebulaTemplates.layout('dome',18).points[1]&&{x:360+NebulaTemplates.layout('dome',18).points[1].x,y:390+NebulaTemplates.layout('dome',18).points[1].y}));assert.equal(await page.evaluate(()=>NebulaApp.state.items.find(i=>i.slot===1).id),'rose_pink');
  const dome=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));await page.locator('[data-mode="heart"]').click();assert.equal(await page.evaluate(()=>NebulaApp.state.mode),'heart');
  await page.evaluate(()=>NebulaApp.paintSlot(0,'satin_plumeria_lilac'));await page.locator('[data-mode="dome"]').click();assert.equal(await page.evaluate(()=>NebulaLink.encode(NebulaApp.state)),dome);
  assert.deepEqual(await page.evaluate(()=>Object.keys(NebulaApp.portfolio.bouquets).sort()),['dome','heart']);
  assert.equal(await page.evaluate(()=>NebulaApp.switchMode('classic').ok),false);
  await page.locator('[data-mode="heart"]').click();await page.locator('#tab-finishing').click();await page.locator('[data-detail="graduation_cap"]').click();assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.decorations[0].id),'graduation_cap');
  const shared=await page.evaluate(()=>({code:NebulaLink.encode(NebulaApp.state),state:NebulaApp.state}));
  await ready(base+'studio.html#b='+shared.code);assert.deepEqual(await page.evaluate(()=>NebulaApp.state),shared.state);
  assert.equal(await page.evaluate(()=>NebulaModel.validate({...NebulaApp.state,mode:'classic'})),null);
  assert.equal(await page.evaluate(()=>{const s=NebulaApp.state;s.items[0].id='lily';return NebulaModel.validate(s);}),null);
  await page.reload();await page.waitForFunction(()=>window.__ready);assert.equal(await page.evaluate(()=>NebulaApp.state.mode),'heart');
  await page.evaluate(async()=>{const blob=await NebulaApp.exportBlob(1080,1080);if(!blob||blob.size<10000)throw Error('PNG export failed');});
  await page.goto(base+'order.html#b='+shared.code);await page.locator('#orderSheet').waitFor({state:'visible'});assert.equal(await page.locator('#orderBroken').isVisible(),false);assert.equal(await page.locator('#osTitle').textContent(),shared.state.title);
  await ready(base+'studio.html?template=pretty-and-paid');
  await page.locator('#rayMoney>summary').click();await page.locator('#rayPaintNotes').click();
  await page.selectOption('#rayCurrency','CAD');await page.selectOption('#rayDenomination','5');assert.equal(await page.evaluate(()=>NebulaApp.brush),'cash_cad_5');
  let p=await page.evaluate(()=>NebulaModel.price(NebulaApp.state));assert.equal(p.lines.filter(l=>l.id.startsWith('cash_')).reduce((n,l)=>n+l.totalCents,0),40000);assert.equal(p.extraLines.filter(l=>l.id==='money_styling').length,1);assert.equal(p.extraLines.some(l=>l.id==='usd_exchange_margin'),false);
  await page.selectOption('#rayCurrency','USD');await page.selectOption('#rayDenomination','10');assert.equal(await page.evaluate(()=>NebulaApp.brush),'cash_usd_10');p=await page.evaluate(()=>NebulaModel.price(NebulaApp.state));assert.equal(p.lines.filter(l=>l.id.startsWith('cash_')).reduce((n,l)=>n+l.totalCents,0),115872);assert.equal(p.extraLines.some(l=>l.id==='usd_exchange_margin'),false);assert.equal(p.totalCents,125372);
  const cashBefore=await page.evaluate(()=>NebulaModel.price(NebulaApp.state));
  await page.selectOption('#rayCashSupply','customer');const ownCash=await page.evaluate(()=>NebulaModel.price(NebulaApp.state));assert.equal(ownCash.cashCents,0);assert.equal(ownCash.totalCents,cashBefore.totalCents-115872);assert.equal(ownCash.payment.dueCents,Math.ceil(ownCash.totalCents/2));
  const ownLink=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));await ready(base+'studio.html#b='+ownLink);assert.equal(await page.locator('#rayCashSupply').inputValue(),'customer');assert.equal(await page.evaluate(()=>NebulaModel.price(NebulaApp.state).cashCents),0);
  if(!await page.locator('#rayMoney').evaluate(el=>el.open))await page.locator('#rayMoney>summary').click();await page.selectOption('#rayCashSupply','shop');
  await page.evaluate(()=>document.querySelector('#orderButton').click());await page.selectOption('#rayPaymentPlan','full');assert.equal(await page.evaluate(()=>NebulaModel.price(NebulaApp.state).payment.balanceCents),0);await page.locator('[data-close="orderDialog"]').click();
  const dlEvent=page.waitForEvent('download');await page.evaluate(()=>NebulaApp.showSave());await page.locator('#saveJSON').click();const dl=await dlEvent,json=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));assert.equal(json.activeEstimate.currency,'CAD');assert.equal(json.bouquets.dome.items.filter(i=>i.id==='cash_usd_10').length,80);
  await page.locator('[data-close="saveDialog"]').click();
  if(!await page.locator('#rayMoney').evaluate(el=>el.open))await page.locator('#rayMoney>summary').click();
  await page.locator('#rayNoteCount').fill('70');await page.locator('#rayUpdateNotes').click();
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>RayBuilder.notes.has(i.id)).length),70);assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>!RayBuilder.notes.has(i.id)).length),6);
  await page.locator('#rayNoteCount').fill('80');await page.locator('#rayUpdateNotes').click();
  await page.locator('[data-mode="heart"]').click();
  await page.evaluate(()=>{const s=NebulaApp.state;s.template.palette=['cash_cad_10'];Object.assign(s.template.zones,{wall:'cash_cad_10',fill:'cash_cad_10',center:'cash_cad_10'});s.template.overrides={};s.finishes.decorations=[];NebulaModel.syncTemplate(s);NebulaApp.setState(s);});
  const heartCash=await page.evaluate(()=>({state:NebulaApp.state,price:NebulaModel.price(NebulaApp.state),code:NebulaLink.encode(NebulaApp.state)}));assert.equal(heartCash.price.totalCents,49000);assert.equal(heartCash.state.items.length,41);
  await ready(base+'studio.html#b='+heartCash.code);await page.waitForFunction(()=>!!document.querySelector('[data-flower="cash_cad_10"]'));assert.equal(await page.locator('#rayCurrency').inputValue(),'CAD');assert.equal(await page.locator('#rayDenomination').inputValue(),'10');assert.equal(await page.evaluate(()=>NebulaApp.scene().nodes.filter(n=>n.id==='cash_cad_10').every(n=>[n.x,n.y,n.w,n.h,n.rot].every(Number.isFinite))),true);await page.screenshot({path:path.join(qa,'money-heart.png'),fullPage:true});
  for(const width of [768,390,320]){await page.setViewportSize({width,height:844});await ready(base+'studio.html?template=anus-daydream');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Builder overflow '+width);assert.ok(await page.locator('.panel-body').evaluate(el=>el.clientHeight>=180),'Usable controls at '+width);await page.locator('[data-flower="rose_pink"]').scrollIntoViewIfNeeded();assert.equal(await page.locator('[data-flower="rose_pink"]').isVisible(),true);await page.locator('[data-flower="rose_pink"]').click();assert.equal(await page.evaluate(()=>NebulaApp.brush),'rose_pink');await page.screenshot({path:path.join(qa,'builder-'+width+'.png'),fullPage:true});}
  for(const colorScheme of ['light','dark']){
   await page.emulateMedia({colorScheme});await page.setViewportSize({width:477,height:843});
   await ready(base+'studio.html?template=pretty-and-paid');
   assert.equal(await page.locator('.move-toolbar').count(),0);
   assert.equal(await page.locator('.history-tools #moveFlowers').count(),1);
   assert.equal(await page.locator('#rayMoney').evaluate(el=>el.open),false);
   assert.ok(await page.locator('#artSurface').evaluate(el=>el.clientHeight>=270));
   const colors=await page.evaluate(()=>({header:getComputedStyle(document.querySelector('.site-header')).backgroundColor,brand:getComputedStyle(document.querySelector('#brandName')).color,cta:getComputedStyle(document.querySelector('#orderButton')).color,ctaBg:getComputedStyle(document.querySelector('#orderButton')).backgroundColor,tab:getComputedStyle(document.querySelector('[aria-selected="true"]')).color}));
   assert.equal(colors.header,'rgb(250, 245, 242)');assert.equal(colors.brand,'rgb(52, 38, 49)');assert.equal(colors.cta,'rgb(255, 255, 255)');assert.equal(colors.ctaBg,'rgb(118, 57, 78)');assert.equal(colors.tab,'rgb(118, 57, 78)');
   await page.screenshot({path:path.join(qa,'mobile-money-'+colorScheme+'.png'),fullPage:true});
   await page.locator('#rayMoney>summary').click();assert.equal(await page.locator('#rayCurrency').isEnabled(),true);
   assert.equal(await page.locator('#rayCurrency').evaluate(el=>getComputedStyle(el).color),'rgb(52, 38, 49)');
   await page.locator('#rayMoney>summary').click();await page.evaluate(()=>NebulaApp.render(false));assert.equal(await page.locator('#rayMoney').evaluate(el=>el.open),false);
   await page.locator('#moveFlowers').click();assert.equal(await page.locator('#moveFlowers').textContent(),'Done');assert.equal(await page.locator('#moveFlowers').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(118, 57, 78)');assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('preview-focus')),true);
   await page.screenshot({path:path.join(qa,'mobile-arrange-'+colorScheme+'.png'),fullPage:true});
   await page.locator('#moveFlowers').click();assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('preview-focus')),false);
  }
  await page.emulateMedia({colorScheme:'light'});
  await ready(base+'studio.html?template=money-moves');await page.locator('#orderButton').click();await page.locator('#orderDialog[open]').waitFor();
  assert.match(await page.locator('#rayPaymentAmount').textContent(),/102.21/);await page.screenshot({path:path.join(qa,'confirmed-deposit-mobile.png'),fullPage:true});await page.locator('[data-close="orderDialog"]').click();
  const foamPrice=await page.evaluate(()=>{const s=NebulaModel.defaultMode('dome');NebulaModel.resize(s,7);s.template.palette=['foam_rose_black'];s.template.overrides={};s.template.accent.count=0;s.finishes.decorations=[NebulaDetails.create('bow_lilac')];NebulaModel.syncTemplate(s);return NebulaModel.price(s);});assert.equal(foamPrice.totalCents,4000);assert.equal(foamPrice.extraLines.some(l=>l.id==='bow_lilac'),false);
  await ready(base+'studio.html?template=ruby-royale&action=order');await page.locator('#orderDialog[open]').waitFor();assert.equal(await page.locator('#orderSend').isDisabled(),true);assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Ruby Royale');
  await require('./rays-review.cjs')({page,base,ready,qa});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS original engines, four shared Order/Customise recipes, satin artwork/logo, no Classic/fresh imports, CAD/USD conversion, fees, slot painting/moving/history, separate mode banks, share/reload, Heart extras, PNG/JSON export, responsive layouts and inactive order/payment submission. Screenshots: '+qa);
 }catch(e){await page.screenshot({path:path.join(qa,'failure.png'),fullPage:true});console.log(JSON.stringify({errors,bad},null,2));throw e;}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
