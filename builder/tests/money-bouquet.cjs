const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4177/demo/nebula-builder/studio.html?template=money-bloom');await p.waitForFunction(()=>window.__ready);
 assert.equal(await p.evaluate(()=>NebulaApp.state.title),'Money Bloom');
 const preview=await p.evaluate(async()=>{const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);const c=NebulaRenderer.exportCanvas(s,720,820,'en');return c.toDataURL('image/webp',.9);});
 fs.writeFileSync('builder/demo-brand/money/money-bloom.webp',Buffer.from(preview.split(',')[1],'base64'));
 await p.screenshot({path:'builder/tests/money-phone.png',fullPage:true});
 assert.equal(await p.locator('#moneySize,#moneyRoses,#moneyOnly').count(),0);
 for(const [key,value]of [['money_note',1],['money_note_5',5],['money_note_10',10]]){await p.locator('#moneyValue').selectOption(key);const info=await p.evaluate(()=>({items:NebulaApp.state.items,price:NebulaModel.price(NebulaApp.state),urls:[...new Set(NebulaRenderer.scene(NebulaApp.state).nodes.map(n=>n.url))]}));assert.equal(info.items.length,50);assert.ok(info.items.every(n=>n.id===key));assert.equal(info.price.lines.find(l=>l.id===key).totalCents,50*value*100);assert.deepEqual(info.urls,['assets/money/folded-dollar-v1.png']);}
 assert.ok(await p.evaluate(()=>{const s=NebulaApp.state,copy=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(NebulaRenderer.scene(s))===JSON.stringify(NebulaRenderer.scene(copy));}));
 assert.equal(await p.evaluate(()=>NebulaModel.price(NebulaApp.state).lines.find(l=>l.id==='money_note_10').totalCents),50000);
 const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 assert.ok(await p.evaluate(()=>NebulaRenderer.scene(NebulaApp.state).nodes.every(n=>NebulaTemplates.nearest('dome',50,{x:n.x,y:n.y})===n.slot)),'visible positions match editable slots');
 await p.goto('http://127.0.0.1:4177/demo/nebula-builder/order.html#b='+code);await p.waitForFunction(()=>document.getElementById('osTitle')?.textContent==='Money Bloom');
 assert.match(await p.locator('#osStems').innerText(),/50[\s\S]*\$10/);assert.match(await p.locator('#osFinishes').innerText(),/cash gift/);
 await p.goto('http://127.0.0.1:4177/demo/nebula-builder/collection.html');assert.equal(await p.locator('[data-id="money-bloom"]').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS money bouquet, denominations, unchanged artwork, face value and saved design');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
