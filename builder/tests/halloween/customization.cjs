/* Interaction, geometry and saved-design checks for Spooky customization. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const checks=[];function check(name,ok){assert.ok(ok,name);checks.push(name);console.log('PASS',name);}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261007c');await p.waitForFunction(()=>window.NebulaApp?.ready);
 for(const id of ['scream-for-you','forever-my-boo','midnight-blooms']){
  await p.evaluate(id=>NebulaApp.applyFallTemplate(id),id);await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
  check(id+': all available rose colors visible',await p.locator('#flowerGrid [data-flower^=rose_]').count()===10);
  const before=await p.evaluate(()=>JSON.stringify(NebulaApp.state));
  await p.locator('#flowerGrid [data-flower=rose_violet]').click();await p.locator('#recolorRoses').click();
  check(id+': bulk recolor preserves exact slots, extras and non-roses',await p.evaluate(before=>{const b=JSON.parse(before),s=NebulaApp.state;return s.items.length===b.items.length&&JSON.stringify(s.finishes)===JSON.stringify(b.finishes)&&s.items.every(it=>{const prev=b.items.find(n=>n.uid===it.uid);return prev&&prev.slot===it.slot&&JSON.stringify(prev.anchors)===JSON.stringify(it.anchors)&&(NebulaConfig.CAT[prev.id].family==='rose'?it.id==='rose_violet':it.id===prev.id);});},before));
  check(id+': new colors and exact prices survive saved links',await p.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s))?.design;return d&&JSON.stringify(NebulaModel.price(d))===JSON.stringify(NebulaModel.price(s))&&d.items.every(it=>it.id===s.items.find(n=>n.uid===it.uid).id);}));
  await p.locator('#undo').click();check(id+': one Undo restores all rose colors',await p.evaluate(()=>JSON.stringify(NebulaApp.state))===before);
  await p.locator('#spookyWrap').click();check(id+': wrapping shortcut opens six compatible paper choices',await p.locator('#panel-wrapping').isVisible()&&await p.locator('#paperChoices button').count()===6);
  const original=await p.evaluate(async()=>{const b=await NebulaRenderer.blob(NebulaApp.state,540,540,'en');return b.size;});
  for(const tone of ['ivory','blush','sage','custom']){
   await p.locator('#paperChoices [data-paper='+tone+']').click();
   if(tone==='custom'){await p.locator('#customTint').fill('#613457');await p.locator('#customTint').dispatchEvent('input');await p.locator('#customTint').blur();}
   check(id+': '+tone+' changes paper pixels and preserves flower geometry',await p.evaluate(async({before,original,tone})=>{const b=JSON.parse(before),s=NebulaApp.state,R=NebulaRenderer,d=NebulaLink.decode(NebulaLink.encode(s))?.design;const img=await R.blob(s,540,540,'en');return !!NebulaModel.validate(s)&&d.finishes.paper===tone&&d.finishes.tint===s.finishes.tint&&JSON.stringify(R.scene(b).nodes)===JSON.stringify(R.scene(s).nodes)&&img.size!==original;},{before,original,tone}));
  }
  await p.evaluate(()=>NebulaApp.setTab('flowers'));await p.locator('#spookyDetails').click();
  await p.locator('#giftNote').fill('My favorite person, every season.');await p.locator('#giftNote').blur();
  check(id+': personal gift note is saved',await p.evaluate(()=>NebulaLink.decode(NebulaLink.encode(NebulaApp.state)).design.note==='My favorite person, every season.'));
 }
 await p.evaluate(()=>{NebulaApp.applyFallTemplate('midnight-blooms');NebulaApp.chooseFlower('lily');});
 check('Lily helper identifies its five compatible positions',await p.locator('#spookyFitCount').innerText().then(s=>s.includes('5 of 20')));
 await p.evaluate(()=>NebulaApp.paintSlot(8,'lily'));
 check('Rejected oversized flower explains the fit instead of suggesting rearrangement',await p.locator('#toast').innerText().then(s=>s.includes('too large')&&!s.includes('Arrange')));
 check('Bulk recolor leaves deleted slots empty',await p.evaluate(()=>{const s=NebulaApp.state;NebulaModel.remove(s,'b9');const n=s.items.length;return NebulaSpooky.recolorRoses(s,'rose_pink').ok&&s.items.length===n&&s.template.overrides[8]===null;}));
 await p.evaluate(()=>NebulaApp.chooseFlower('rose_pink'));
 for(const width of [320,390]){await p.setViewportSize({width,height:844});check(width+'px controls fit viewport',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(__dirname,'customize-'+width+'.png'),fullPage:true});}
 await p.locator('#language').selectOption('es');check('Spanish customization instructions and action are translated',await p.locator('#recolorRoses').innerText().then(s=>s.startsWith('Cambiar las')));
 await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>{NebulaApp.setLanguage('en');NebulaApp.applyFallTemplate('forever-my-boo');NebulaApp.setTab('wrapping');});await p.locator('[data-paper=ivory]').click();
 await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 const png=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(900,900)).arrayBuffer())));fs.writeFileSync(path.join(__dirname,'custom-ivory.png'),Buffer.from(png));
 await p.screenshot({path:path.join(__dirname,'customize-desktop.png'),fullPage:true});
 check('No runtime errors',errors.length===0);fs.writeFileSync(path.join(__dirname,'customization-results.json'),JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
