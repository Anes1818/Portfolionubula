const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
const out=__dirname+'/phone-movement';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const width of [320,390]){
 const ctx=await b.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261008c');await p.waitForFunction(()=>window.NebulaApp?.ready);
 await p.evaluate(()=>NebulaApp.applyFallTemplate('midnight-blooms'));await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 const before=await p.evaluate(()=>JSON.stringify(NebulaApp.state));
 await p.locator('#moveFlowers').click();assert(await p.locator('body').evaluate(el=>el.classList.contains('preview-focus')));
 const coords=async slot=>p.evaluate(slot=>{const s=NebulaApp.state,n=NebulaRenderer.scene(s).slots.find(n=>n.slot===slot),v=NebulaRenderer.view(s,NebulaApp.camera),r=document.getElementById('bouquet').getBoundingClientRect();return {x:r.left+(n.x*v.scale+v.x)*r.width/720,y:r.top+(n.y*v.scale+v.y)*r.height/820};},slot);
 const source=await p.evaluate(()=>{const sc=NebulaApp.scene();return sc.nodes.find(n=>n.id==='lily'&&NebulaRenderer.hit(sc,n)?.uid===n.uid).slot;});
 let q=await coords(source);await p.touchscreen.tap(q.x,q.y);assert.equal(await p.evaluate(()=>NebulaApp.selected),'b'+(source+1));
 assert((await p.locator('#moveHelp').innerText()).includes('highlighted'));
 await p.screenshot({path:out+'/targets-'+width+'.png'});
 // A lily fits the gerbera slot only in the opposite direction: it must reject
 // that swap, preserving state. A rose can occupy the lily slot bidirectionally
 // only if the displaced lily fits the rose slot, which is also disallowed.
 const invalid=await p.evaluate(()=>NebulaApp.state.items.find(i=>i.id==='rose_black').slot);
 q=await coords(invalid);await p.touchscreen.tap(q.x,q.y);assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),before);
 // Make a different color in another lily-sized slot to make the swap observable.
 const target=await p.evaluate(source=>NebulaApp.state.items.find(i=>i.id==='lily'&&i.slot!==source).slot,source);
 await p.evaluate(target=>NebulaApp.paintSlot(target,'rose_red'),target);
 const preMove=await p.evaluate(()=>JSON.stringify(NebulaApp.state));
 await p.evaluate(source=>NebulaApp.select('b'+(source+1)),source);
 q=await coords(target);await p.touchscreen.tap(q.x,q.y);
 assert(await p.evaluate(({source,target})=>NebulaApp.state.items.find(i=>i.slot===target).id==='lily'&&NebulaApp.state.items.find(i=>i.slot===source).id==='rose_red',{source,target}));
 assert(await p.evaluate(()=>{const s=NebulaApp.state,d=NebulaLink.decode(NebulaLink.encode(s)).design;return JSON.stringify(NebulaRenderer.scene(s))===JSON.stringify(NebulaRenderer.scene(d));}));
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),preMove);
 const a=await coords(source),z=await coords(target);
 await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:8});
 assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),preMove);
 await p.mouse.up();assert(await p.evaluate(target=>NebulaApp.state.items.find(i=>i.slot===target).id==='lily',target));
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),preMove);
 await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:8});
 await p.locator('#bouquet').dispatchEvent('pointercancel',{pointerId:1});await p.mouse.up();
 assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),preMove);
 await p.locator('#moveFlowers').click();assert(!(await p.locator('body').evaluate(el=>el.classList.contains('preview-focus'))));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.screenshot({path:out+'/finished-'+width+'.png'});
 assert.deepEqual(errors,[]);console.log('PASS '+width+'px: touch select, compatible targets, rejected swap, tap movement, sharing, undo, expanded preview and screen fit');await ctx.close();
 }
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
