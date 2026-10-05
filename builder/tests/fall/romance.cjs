const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:8767/builder/',checks=[];
function check(name,ok){assert.ok(ok,name);checks.push(name);console.log('PASS',name);}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.waitForFunction(()=>window.NebulaApp?.ready);await p.waitForFunction(()=>[...document.querySelectorAll('[data-template]')].length===7&&[...document.querySelectorAll('[data-template]')].every(b=>!b.disabled));
 check('For Love and Autumn have separate groups',await p.locator('#loveTemplateCards [data-template]').count()===3&&await p.locator('#fallTemplateCards [data-template]').count()===4);
 await p.screenshot({path:path.join(__dirname,'love-gallery.png'),fullPage:true});
 for(const id of ['pink-promise','written-in-roses','always-you']){
  await p.locator('[data-template="'+id+'"]').click();await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
  check(id+' opens with correct counts and validates',await p.evaluate(id=>{const s=NebulaApp.state;return s.items.length===(id==='always-you'?30:44)&&!!NebulaModel.validate(s)&&document.getElementById('family').value==='romance';},id));
  const png=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(1080,1080)).arrayBuffer())));fs.writeFileSync(path.join(__dirname,id+'.png'),Buffer.from(png));
  await p.locator('#browseTemplates').click();
 }
 await p.locator('[data-template="pink-promise"]').click();await p.locator('#tab-finishing').click();
 const original=await p.evaluate(()=>({price:NebulaModel.price(NebulaApp.state).totalCents,nodes:JSON.stringify(NebulaApp.scene().nodes)}));
 await p.locator('#fillerPattern').selectOption('border');
 check('Border mode keeps all 12 sprigs and same price without moving roses',await p.evaluate(o=>{const s=NebulaApp.state,sc=NebulaApp.scene();return s.finishes.fillerPattern==='border'&&sc.filler.length===12&&sc.filler.every(n=>Math.hypot(n.x-sc.frame.center.x,n.y-sc.frame.center.y)>sc.frame.radius)&&NebulaModel.price(s).totalCents===o.price&&JSON.stringify(sc.nodes)===o.nodes;},original));
 await p.locator('#undo').click();check('Border selection is undoable',await p.locator('#fillerPattern').inputValue()==='scatter');
 await p.locator('#greeneryMore').click();check('Greenery costs one eucalyptus sprig and adds no flower slot',await p.evaluate(o=>NebulaApp.scene().greenery.length===1&&NebulaApp.state.items.length===44&&NebulaModel.price(NebulaApp.state).totalCents===o.price+NebulaConfig.CAT.eucalyptus.priceCents,original));
 await p.evaluate(()=>NebulaApp.applyFallTemplate('written-in-roses'));await p.locator('#tab-finishing').click();
 await p.locator('#initialLetter').fill('e');check('Initial entry uppercases the letter',await p.evaluate(()=>NebulaApp.state.finishes.initial==='E'));
 await p.locator('#initialScale').fill('1.2');await p.locator('#initialScale').dispatchEvent('change');
 await p.locator('#initialOffset').fill('-0.2');await p.locator('#initialOffset').dispatchEvent('change');
 check('Initial scales and moves independently of roses',await p.evaluate(()=>{const s=NebulaApp.state,n=NebulaApp.scene().finishes.find(n=>n.uid==='floral-initial');return s.finishes.initialScale===1.2&&s.finishes.initialOffset===-.2&&n.y<s.frames.dome.center.y&&s.items.length===44;}));
 const enabledPrice=await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents);await p.locator('#initialEnabled').uncheck();
 check('Removing initial removes exactly its price',await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents)===enabledPrice-1200);await p.locator('#undo').click();
 check('Initial undo restores exact lettering and transforms',await p.evaluate(()=>NebulaApp.state.finishes.initial==='E'&&NebulaApp.state.finishes.initialScale===1.2&&NebulaApp.state.finishes.initialOffset===-.2));
 check('All 26 initial textures draw with transparent margins',await p.evaluate(()=>{for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){const cv=NebulaRomance.initialCanvas(letter,NebulaRenderer),d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let count=0;for(let i=3;i<d.length;i+=4)if(d[i])count++;if(count<1000||count>cv.width*cv.height*.8)return false;for(let x=0;x<cv.width;x++)if(d[x*4+3]||d[((cv.height-1)*cv.width+x)*4+3])return false;}return true;}));
 await p.locator('#greeneryMore').click();await p.locator('#fillerMore').click();await p.locator('#fillerPattern').selectOption('border');
 const link=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 check('Shared link retains exact romantic scene and pricing',await p.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(NebulaRenderer.scene(s))===JSON.stringify(NebulaRenderer.scene(d))&&JSON.stringify(NebulaModel.price(s))===JSON.stringify(NebulaModel.price(d));}));
 check('Invalid pattern, counts, letters and transforms are rejected',await p.evaluate(()=>[s=>s.finishes.fillerPattern='unknown',s=>s.finishes.greeneryCount=13,s=>s.finishes.initial='<',s=>s.finishes.initial='AB',s=>s.finishes.initialScale=5,s=>s.finishes.initialOffset=Infinity].every(change=>{const s=NebulaApp.state;change(s);return !NebulaModel.validate(s);})));
 const saved=await p.evaluate(()=>JSON.stringify(NebulaApp.state));await p.reload();await p.waitForFunction(()=>NebulaApp?.ready);check('Reload preserves romantic details',saved===await p.evaluate(()=>JSON.stringify(NebulaApp.state)));
 const sheet=await ctx.newPage();await sheet.goto(base+'order.html#b='+link);await sheet.waitForSelector('#orderSheet:not([hidden])');
 check('Florist sheet lists letter, greenery and filler placement',await sheet.locator('#osFinishes').innerText().then(t=>t.includes('Floral initial: E')&&t.includes('Eucalyptus between roses: × 1')&&t.includes('Around the edge')));await sheet.close();
 await p.locator('#language').selectOption('es');check('Spanish collection title is translated',await p.locator('#loveCollectionHeading').innerText()==='Por amor');
 check('No desktop runtime errors',!errors.length);
 for(const width of [320,390]){
  const m=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),mp=await m.newPage();await mp.goto(base);await mp.waitForFunction(()=>window.NebulaApp?.ready);
  await mp.locator('[data-template="written-in-roses"]').tap();await mp.locator('#tab-finishing').tap();await mp.locator('#initialLetter').fill('B');await mp.locator('#initialLetter').blur();
  check(width+'px mobile collection and initial controls work',await mp.evaluate(()=>innerWidth>=document.documentElement.scrollWidth&&NebulaApp.state.finishes.initial==='B'));
  await mp.screenshot({path:path.join(__dirname,'love-mobile-'+width+'.png'),fullPage:true});await m.close();
 }
 const file=await browser.newPage();await file.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../../index.html')).href+'#b='+link);await file.waitForFunction(()=>window.NebulaApp?.ready);
 check('Offline romantic design exports without missing assets',await file.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportBlob(1080,1080)).size>20000&&NebulaApp.state.finishes.initial==='E';}));await file.close();
 fs.writeFileSync(path.join(__dirname,'romance-results.json'),JSON.stringify({checks},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
