const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:8767/builder/',checks=[];
function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.NebulaApp?.ready);
 await page.locator('[data-template="autumn-latte"]').click();await page.locator('#tab-finishing').click();
 check('Latte opens with new flowers, six sprigs and Snoopy',await page.evaluate(()=>{const s=NebulaApp.state,c=NebulaModel.counts(s);return c.rose_caramel>0&&c.mum_burgundy===8&&s.finishes.fillerCount===6&&s.finishes.decorations[0].id==='snoopy'&&NebulaApp.scene().filler.length===6;}));
 const before=await page.evaluate(()=>({flowers:JSON.stringify(NebulaApp.scene().nodes),filler:JSON.stringify(NebulaApp.scene().filler),price:NebulaModel.price(NebulaApp.state).totalCents}));
 await page.locator('#fillerMore').click();
 check('One new sprig costs exactly one unit',await page.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents)===before.price+200);
 check('Adding filler preserves flowers and existing sprigs',await page.evaluate(b=>JSON.stringify(NebulaApp.scene().nodes)===b.flowers&&JSON.stringify(NebulaApp.scene().filler.slice(0,6))===b.filler,before));
 await page.locator('#undo').click();check('Filler undo restores count and total',await page.evaluate(()=>NebulaApp.state.finishes.fillerCount===6&&NebulaModel.price(NebulaApp.state).totalCents)===before.price);
 await page.locator('[data-detail="kitty"]').click();await page.locator('[data-detail="snoopy_topper"]').click();
 check('All three new details are independent',await page.evaluate(()=>NebulaApp.state.finishes.decorations.length===3&&NebulaApp.scene().finishes.filter(n=>n.detailId).length===3));
 await page.locator('[data-detail="snoopy_topper"]').click();
 check('Selecting an existing detail does not duplicate or recharge it',await page.evaluate(()=>NebulaApp.state.finishes.decorations.length===3));
 await page.locator('#detailScale').fill('1.25');await page.locator('#detailScale').dispatchEvent('change');
 await page.locator('#detailRotation').fill('-17');await page.locator('#detailRotation').dispatchEvent('change');
 await page.locator('#detailLayer').selectOption('tucked');
 await page.locator('[data-nudge="right"]').click();
 check('Size, rotation, layer and nudge update selected topper only',await page.evaluate(()=>{const [a,b,c]=NebulaApp.state.finishes.decorations;return a.scale===1&&b.scale===1&&c.scale===1.25&&c.rotation===-17&&c.layer==='tucked'&&c.x===.04;}));
 await page.locator('#detailLayer').selectOption('front');
 const pos=await page.evaluate(()=>{const n=NebulaApp.scene().finishes.find(n=>n.detailId==='snoopy_topper'),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),r=document.getElementById('bouquet').getBoundingClientRect();return {x:r.left+(n.x*v.scale+v.x)*r.width/720,y:r.top+(n.y*v.scale+v.y)*r.height/820};});
 const dragBefore=await page.evaluate(()=>JSON.stringify(NebulaApp.state));
 await page.mouse.move(pos.x,pos.y);await page.mouse.down();await page.mouse.move(pos.x+36,pos.y-24,{steps:8});await page.mouse.up();
 check('Dragging moves topper without repainting flowers',await page.evaluate(b=>{const old=JSON.parse(b),s=NebulaApp.state;return JSON.stringify(old.items)===JSON.stringify(s.items)&&old.finishes.decorations[2].x!==s.finishes.decorations[2].x;},dragBefore));
 await page.locator('#undo').click();check('Drag is one undo step',await page.evaluate(()=>JSON.stringify(NebulaApp.state))===dragBefore);
 await page.locator('[data-detail="snoopy"]').click();await page.locator('#bouquet').focus();
 const x=await page.evaluate(()=>NebulaApp.state.finishes.decorations[0].x);await page.keyboard.press('ArrowRight');
 check('Keyboard arrows move selected plush',await page.evaluate(()=>NebulaApp.state.finishes.decorations[0].x)>x);
 await page.locator('#detailRemove').click();check('Remove affects only selected plush',await page.evaluate(()=>NebulaApp.state.finishes.decorations.length===2&&!NebulaApp.state.finishes.decorations.some(d=>d.id==='snoopy')));
 await page.locator('#undo').click();
 await page.locator('#sashText').fill('For you');await page.locator('#designName').click();
 check('Text changes do not move filler',await page.evaluate(b=>JSON.stringify(NebulaApp.scene().filler)===b,before.filler));
 check('All sprigs are counted and charged',await page.evaluate(()=>{const s=NebulaApp.state,line=NebulaModel.price(s).extraLines.find(l=>l.id==='filler');return line.quantity===NebulaRenderer.scene(s).filler.length&&line.totalCents===line.quantity*NebulaConfig.CONFIG.extrasCents.filler;}));
 check('Malformed and non-dome detail states rejected',await page.evaluate(()=>{
  const changes=[s=>s.finishes.fillerCount=13,s=>s.finishes.fillerCount=-1,s=>s.finishes.decorations[0].x=NaN,s=>s.finishes.decorations[0].id='unknown',s=>s.finishes.decorations[0].scale=100,s=>s.finishes.decorations[0].rotation=90,s=>s.finishes.decorations[0].layer='script',s=>s.finishes.decorations.push(s.finishes.decorations[0]),s=>s.mode='classic'];
  return changes.every(fn=>{const s=NebulaApp.state;fn(s);return !NebulaModel.validate(s);});
 }));
 const link=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 check('Share preserves exact detail/filler geometry and price',await page.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(NebulaRenderer.scene(s))===JSON.stringify(NebulaRenderer.scene(d))&&NebulaModel.price(s).totalCents===NebulaModel.price(d).totalCents;}));
 check('JSON portfolio validates with all new details',await page.evaluate(()=>!!NebulaModel.validatePortfolio(JSON.parse(JSON.stringify(NebulaApp.portfolio)))));
 check('Twelve paid sprigs remain visible nodes across sparse, dense and empty designs',await page.evaluate(()=>{
  for(const count of [1,15,30,44,62,84,100])for(const id of ['rose_ivory','sunflower','lily']){
   const s=NebulaFall.create('october-cream');NebulaModel.resize(s,count);s.template.palette=[id];s.template.accent.count=0;s.template.overrides={};s.finishes.fillerCount=12;NebulaModel.syncTemplate(s);
   if(NebulaRenderer.scene(s).filler.length!==12)return false;
  }
  const s=NebulaFall.create('autumn-latte');for(const item of [...s.items])NebulaModel.remove(s,item.uid);
  return NebulaRenderer.scene(s).filler.length===6&&NebulaModel.price(s).extraLines.find(l=>l.id==='filler').quantity===6;
 }));
 const state=await page.evaluate(()=>JSON.stringify(NebulaApp.state));await page.reload();await page.waitForFunction(()=>NebulaApp?.ready);
 check('Reload restores all details and transforms',state===await page.evaluate(()=>JSON.stringify(NebulaApp.state)));
 const sheet=await context.newPage();await sheet.goto(base+'order.html#b='+link);await sheet.waitForSelector('#orderSheet:not([hidden])');
 check('Florist sheet lists all extras and exact filler count',await sheet.locator('#osFinishes').innerText().then(t=>['Baby’s breath sprigs: × 6','Snoopy plush','Hello Kitty plush','Snoopy pumpkin topper'].every(x=>t.includes(x))));
 await sheet.close();await page.locator('#resumeBuilder').click();
 await page.evaluate(()=>NebulaApp.applyFallTemplate('autumn-latte'));await page.locator('#tab-finishing').click();await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 await page.screenshot({path:path.join(__dirname,'details-desktop.png'),fullPage:true});
 const png=await page.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(1080,1080)).arrayBuffer())));fs.writeFileSync(path.join(__dirname,'latte-export.png'),Buffer.from(png));check('Detailed PNG export succeeds',png.length>20000);
 await page.locator('#language').selectOption('es');check('Spanish detail controls translate',await page.locator('[data-detail="kitty"]').innerText().then(t=>t.includes('Peluche Hello Kitty')&&t.includes('Añadir')));
 check('No desktop runtime errors',errors.length===0);
 for(const width of [390,320]){
  const mobile=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),p=await mobile.newPage();
  await p.goto(base);await p.waitForFunction(()=>window.NebulaApp?.ready);await p.locator('[data-template="autumn-latte"]').tap();await p.locator('#tab-finishing').tap();await p.locator('[data-detail="kitty"]').tap();await p.locator('[data-nudge="left"]').tap();
  check(width+'px detail controls fit and work by touch',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty').x===.56));
  const touch=await p.evaluate(()=>{const n=NebulaApp.scene().finishes.find(n=>n.detailId==='kitty'),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),r=document.getElementById('bouquet').getBoundingClientRect();return {x:r.left+(n.x*v.scale+v.x)*r.width/720,y:r.top+((n.y-n.h*.2)*v.scale+v.y)*r.height/820};});
  const client=await mobile.newCDPSession(p);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y}]});
  await p.waitForTimeout(100);
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x-22,y:touch.y+15}]});
  await p.waitForTimeout(100);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check(width+'px real touch drag moves plush without replacing flowers',await p.evaluate(()=>NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty').x<.56&&NebulaApp.state.items.length===30));
  // Pace raw CDP touch events like a finger gesture; let the browser finish
  // recognizing the swipe before the next, separate tap.
  await p.waitForTimeout(1000);
  await p.locator('#undo').tap();
  await p.waitForFunction(()=>NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty').x===.56);
  check(width+'px touch drag undo restores position',await p.evaluate(()=>NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty').x===.56));
  await p.screenshot({path:path.join(__dirname,'details-mobile-'+width+'.png'),fullPage:true});await mobile.close();
 }
 const offline=await browser.newPage();await offline.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../../index.html')).href+'#b='+link);await offline.waitForFunction(()=>window.NebulaApp?.ready);
 check('Offline share opens and exports all new artwork',await offline.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);const paths=[...NebulaRenderer.assetsFor(NebulaApp.state)];return paths.filter(p=>/breath-|plush-snoopy|plush-kitty|topper-snoopy/.test(p)).length===5&&paths.every(p=>NebulaRenderer.decoded(p))&&(await NebulaApp.exportBlob(1080,1080)).size>20000;}));await offline.close();
 fs.writeFileSync(path.join(__dirname,'details-results.json'),JSON.stringify({checks},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
