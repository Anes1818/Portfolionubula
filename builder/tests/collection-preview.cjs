const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'collection-preview'),checks=[];fs.mkdirSync(out,{recursive:true});
function check(name,ok){assert.ok(ok,name);checks.push(name);console.log('PASS',name);}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261008a');await p.waitForFunction(()=>window.NebulaApp?.ready);await p.waitForFunction(()=>document.querySelectorAll('[data-preview]:not(:disabled)').length===10);
 check('Ten sharp portrait previews include every collection',await p.locator('.collection-picture canvas').evaluateAll(list=>list.length===10&&list.every(c=>c.width===1080&&c.height===1240)));
 const state=await p.evaluate(()=>JSON.stringify(NebulaApp.state));
 for(const [key,count] of [['love',3],['halloween',3],['fall',4],['all',10]]){
  await p.locator('[data-collection-filter='+key+']').click();check(key+': filter displays correct count and selected state',await p.locator('[data-preview]:visible').count()===count&&await p.locator('[data-collection-filter='+key+']').getAttribute('aria-pressed')==='true');
 }
 check('Browsing collections leaves current bouquet unchanged',await p.evaluate(()=>JSON.stringify(NebulaApp.state))===state);
 for(const id of ['always-you','scream-for-you','midnight-blooms','pink-promise']){
  await p.locator('[data-preview='+id+']').click();await p.locator('#collectionPreviewDesign').click();
  check(id+': enlarged preview exactly matches card artwork',await p.evaluate(id=>document.querySelector('[data-preview="'+id+'"] canvas').toDataURL()===document.getElementById('collectionPreviewImage').src,id));
  check(id+': displayed estimate matches the editable recipe',await p.evaluate(id=>{const collection=[NebulaRomance,NebulaSpooky,NebulaFall].find(c=>c.recipes.some(r=>r.id===id)),s=collection.create(id),cost=NebulaModel.price(s);return document.getElementById('collectionPreviewPrice').textContent.startsWith(NebulaModel.money(cost.totalCents,'en'))&&document.querySelectorAll('#collectionPreviewItems li').length===cost.lines.length+cost.extraLines.length;},id));
  if(id==='scream-for-you')await p.screenshot({path:path.join(out,'preview-desktop.png')});
  await p.locator('#collectionPreviewCustomize').click();
  check(id+': Customize opens the exact displayed design',await p.evaluate(id=>{const collection=[NebulaRomance,NebulaSpooky,NebulaFall].find(c=>c.recipes.some(r=>r.id===id));return JSON.stringify(NebulaApp.state)===JSON.stringify(collection.create(id));},id));
  await p.locator('#browseTemplates').click();
 }
 await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'gallery-desktop.png')});
 for(const width of [320,390]){
  await p.setViewportSize({width,height:844});await p.evaluate(()=>scrollTo(0,0));
  check(width+'px: gallery fits screen',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'gallery-'+width+'.png')});
  await p.locator('[data-collection-filter=halloween]').click();await p.locator('[data-preview=scream-for-you]').click();
  check(width+'px: preview dialog fits screen',await p.locator('#collectionPreviewDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().right<=innerWidth));
  await p.screenshot({path:path.join(out,'preview-'+width+'.png')});await p.keyboard.press('Escape');check(width+'px: Escape returns focus to preview button',await p.locator('[data-preview=scream-for-you]').evaluate(el=>el===document.activeElement));
 }
 await p.locator('#language').selectOption('es');check('Filter and preview actions translate to Spanish',await p.locator('[data-collection-filter=all]').innerText()==='Todos los ramos'&&await p.locator('[data-preview=scream-for-you]').getAttribute('aria-label').then(s=>s.startsWith('Ver ramo')));
 await p.locator('[data-preview=scream-for-you]').click();check('Spanish preview includes translated ingredients and instructions',await p.locator('#collectionPreviewItems').innerText().then(s=>s.includes('Rosa roja'))&&await p.locator('#collectionPreviewCustomize').innerText().then(s=>s.includes('Personalizar')));
 check('No runtime errors',!errors.length);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
