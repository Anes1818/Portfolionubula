/* Local UI test. No customer request is submitted. */
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const base='http://127.0.0.1:4177/demo/nebula-builder/';
 await p.goto(base+'studio.html?template=peony-and-pearl');await p.waitForFunction(()=>window.__ready);
 assert.equal(await p.evaluate(()=>NebulaApp.state.title),'Peony & Pearl');
 assert.deepEqual(await p.evaluate(()=>NebulaModel.counts(NebulaApp.state)),{peony_apricot:8,rose_ivory:22});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const image=await p.evaluate(async()=>{const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);const c=document.createElement('canvas');c.width=720;c.height=820;NebulaRenderer.paint(c,s);return c.toDataURL('image/webp',.92);});
 fs.writeFileSync('builder/demo-brand/peony/peony-and-pearl.webp',Buffer.from(image.split(',')[1],'base64'));
 assert.ok(await p.evaluate(()=>{const s=NebulaApp.state;const c=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(NebulaRenderer.scene(s))===JSON.stringify(NebulaRenderer.scene(c));}),'Saved design reconstructs the same scene');
 const edit=await p.evaluate(()=>{const s=NebulaApp.state;const peony=s.items.find(n=>n.id==='peony_apricot');const result=NebulaModel.replace(s,peony.uid,'rose_pink');s.finishes.paper='black';NebulaApp.setState(s);return result;});assert.ok(edit.ok);
 assert.equal(await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).peony_apricot),7);
 const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 await p.goto(base+'order.html#b='+code);await p.locator('#orderSheet').waitFor({state:'visible'});
 assert.match(await p.locator('#osStems').innerText(),/7[\s\S]*Apricot peony/);
 assert.equal(await p.locator('#orderBroken:visible').count(),0);
 await p.goto(base+'studio.html?template=peony-and-pearl');await p.waitForFunction(()=>window.__ready);
 await p.locator('#language').selectOption('es');
 assert.ok(await p.evaluate(()=>NebulaI18n.es.peony_apricot==='Peonía albaricoque'));
 assert.ok(await p.evaluate(()=>{const s=NebulaModel.defaultMode('classic');return !NebulaModel.add(s,'peony_apricot').ok&&!NebulaModel.replace(s,s.items[0].uid,'peony_apricot').ok;}));
 await p.goto(base+'collection.html');assert.equal(await p.locator('[data-id="peony-and-pearl"]').count(),1);
 await p.goto(base);assert.equal(await p.locator('.collection-card a[href="studio.html?template=peony-and-pearl"]').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS peony recipe, editable flowers/wrap, saved scene, request preview, mobile layout and Classic guards. Cover exported from actual builder.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
