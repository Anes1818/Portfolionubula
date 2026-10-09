const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=__dirname,base='http://127.0.0.1:8767/builder/',checks=[];
function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.NebulaApp?.ready);
 await page.waitForFunction(()=>document.querySelectorAll('[data-template]').length===10&&[...document.querySelectorAll('[data-template]')].every(b=>!b.disabled));
 check('Ten working template cards in three collections',await page.locator('[data-template]').count()===10);
 await page.screenshot({path:path.join(out,'gallery-desktop.png'),fullPage:true});
 await page.locator('[data-template="october-cream"]').click();
 check('Template opens as 44 editable flowers',await page.evaluate(()=>NebulaApp.state.items.length===44&&NebulaFall.active(NebulaApp.state)&&NebulaApp.scene().nodes.length===44));
 check('Template contains exactly 24 ivory roses and 20 rust mums',await page.evaluate(()=>{const c=NebulaModel.counts(NebulaApp.state);return c.rose_ivory===24&&c.mum_rust===20;}));
 await page.locator('#tab-finishing').click();
 const initial=await page.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents);
 await page.locator('#pumpkin').uncheck();
 check('Removing pumpkin removes only its price',await page.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents)===initial-1800);
 await page.locator('#undo').click();check('Undo restores pumpkin',await page.locator('#pumpkin').isChecked());
 await page.locator('#pumpkinPosition').selectOption('left');
 await page.locator('#pumpkinScale').fill('1.2');await page.locator('#pumpkinScale').dispatchEvent('change');
 await page.locator('#sashText').fill('Autumn, just for you');await page.locator('#designName').click();
 check('Ribbon text edit is undoable',await page.evaluate(()=>{NebulaApp.undo();return NebulaApp.state.finishes.sashText==='Still falling for you';}));
 await page.evaluate(()=>NebulaApp.redo());
 const before=await page.evaluate(()=>({nodes:NebulaApp.scene().nodes.map(n=>[n.uid,n.x,n.y,n.d]),items:NebulaApp.state.items}));
 await page.locator('#sashText').fill('Still falling for you');await page.locator('#designName').click();
 check('Text editing never reshuffles flowers',JSON.stringify(before)===await page.evaluate(()=>JSON.stringify({nodes:NebulaApp.scene().nodes.map(n=>[n.uid,n.x,n.y,n.d]),items:NebulaApp.state.items})));
 await page.screenshot({path:path.join(out,'editor-desktop.png'),fullPage:true});
 const info=await page.evaluate(()=>{const s=NebulaApp.state,decoded=NebulaLink.decode(NebulaLink.encode(s));return {link:NebulaLink.encode(s),original:JSON.stringify({f:s.finishes,items:NebulaModel.counts(s),nodes:NebulaRenderer.scene(s).nodes}),roundtrip:decoded&&JSON.stringify({f:decoded.design.finishes,items:NebulaModel.counts(decoded.design),nodes:NebulaRenderer.scene(decoded.design).nodes})};});
 check('Shared link preserves exact rendering and finishes',info.original===info.roundtrip);
 const saved=await page.evaluate(()=>JSON.stringify(NebulaApp.state));await page.reload();await page.waitForFunction(()=>NebulaApp?.ready);
 check('Reload preserves every design property',saved===await page.evaluate(()=>JSON.stringify(NebulaApp.state)));
 await page.locator('#resumeBuilder').click();
 const image=await page.evaluate(async()=>{const blob=await NebulaApp.exportBlob(1080,1080);return Array.from(new Uint8Array(await blob.arrayBuffer()));});fs.writeFileSync(path.join(out,'october-export.png'),Buffer.from(image));
 check('PNG export succeeds',image.length>20000);
 const sheet=await context.newPage();await sheet.goto(base+'order.html#b='+info.link);await sheet.waitForSelector('#orderSheet:not([hidden])');
 check('Order sheet lists pumpkin and bow',await sheet.locator('#osFinishes').innerText().then(t=>t.includes('Pumpkin plush')&&t.includes('Satin bow')&&t.includes('Top left')));
 await sheet.screenshot({path:path.join(out,'order-sheet.png'),fullPage:true});
 await page.evaluate(()=>NebulaApp.applyFallTemplate('harvest-sunshine'));
 check('Sunflowers are 1.85 times rose diameter',await page.evaluate(()=>{const ns=NebulaApp.scene().nodes;return Math.abs(ns.find(n=>n.id==='sunflower').d/ns.find(n=>n.id==='rose_ivory').d-1.85)<.0001;}));
 check('Mixed sizes keep exact paid stem count',await page.evaluate(()=>NebulaModel.price(NebulaApp.state).pieces===30&&NebulaModel.counts(NebulaApp.state).sunflower===4));
 await page.screenshot({path:path.join(out,'harvest-desktop.png'),fullPage:true});
 check('All gallery recipes validate and share',await page.evaluate(()=>NebulaFall.recipes.every(r=>{const s=NebulaFall.create(r.id);return NebulaModel.validate(s)&&NebulaLink.decode(NebulaLink.encode(s));})));
 check('Malformed seasonal values rejected',await page.evaluate(()=>{const a=NebulaFall.create('october-cream');a.finishes.pumpkinScale=100;const b=NebulaFall.create('october-cream');b.template.layout='unknown';return !NebulaModel.validate(a)&&!NebulaModel.validate(b);}));
 check('Legacy classic/dome/heart designs remain valid',await page.evaluate(()=>['classic','dome','heart'].every(mode=>{const s=NebulaModel.defaultMode(mode);return NebulaModel.validate(s)&&NebulaLink.decode(NebulaLink.encode(s));})));
 await page.locator('#browseTemplates').click();await page.locator('#language').selectOption('es');await page.waitForFunction(()=>[...document.querySelectorAll('[data-template]')].every(b=>!b.disabled));
 check('Spanish gallery and customizer labels',await page.locator('[data-template="october-cream"]').innerText()==='Personalizar →');
 check('No desktop runtime errors',errors.length===0);
 for(const width of [390,320]){
  const mobile=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.waitForFunction(()=>NebulaApp?.ready&&document.querySelector('[data-template]')&&!document.querySelector('[data-template]').disabled);
  check('Mobile gallery fits '+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:path.join(out,'gallery-'+width+'.png'),fullPage:true});
  await p.locator('[data-template="october-cream"]').tap();
  check('Mobile editor fits '+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('#tab-finishing').tap();await p.locator('#pumpkinPosition').selectOption('center');await p.locator('#sashText').fill('Happy fall');await p.locator('#sash').focus();
  await p.screenshot({path:path.join(out,'finishing-'+width+'.png'),fullPage:true});
  check('Mobile finish change updates scene '+width,await p.evaluate(()=>NebulaApp.state.finishes.pumpkinPosition==='center'&&NebulaApp.scene().finishes.some(n=>n.uid==='pumpkin'&&n.x===360)));
  await p.locator('#tab-flowers').tap();await p.locator('[data-flower="sunflower"]').tap();
  const tap=await p.evaluate(()=>{const n=NebulaApp.scene().nodes.find(n=>n.id==='rose_ivory'&&n.y>365&&n.y<420),r=document.getElementById('bouquet').getBoundingClientRect(),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera);return {x:r.left+(v.x+n.x*v.scale)*r.width/720,y:r.top+(v.y+n.y*v.scale)*r.height/820};});
  await p.touchscreen.tap(tap.x,tap.y);
  check('Real touch replaces a flower without changing count '+width,await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).sunflower===1&&NebulaApp.state.items.length===44));
  await p.screenshot({path:path.join(out,'editor-'+width+'.png'),fullPage:true});await mobile.close();
 }
 check('No runtime errors on any tested screen',errors.length===0);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
