const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'index.html');
 for(const width of [320,390,430,768,1440]){
  await p.setViewportSize({width,height:900});
  for(const lang of ['en','es']){
   await p.locator('#language').selectOption(lang);
   const data=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,grids:['.featured-grid','.bouquet-grid'].map(sel=>{
    const grid=document.querySelector(sel),cards=[...grid.children].filter(n=>!n.hidden),rects=cards.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
    return {cols:getComputedStyle(grid).gridTemplateColumns.split(' ').length,rects,links:cards.map(n=>{const r=n.querySelector('.customize-link').getBoundingClientRect();return {height:r.height,bottom:r.bottom,right:r.right};})};
   })}));
   assert.equal(data.overflow,false,width+' '+lang+' no horizontal overflow');
   for(const grid of data.grids){assert.equal(grid.cols,2);assert.ok(Math.abs(grid.rects[0].y-grid.rects[1].y)<1);assert.ok(grid.rects[0].right<grid.rects[1].x);for(let i=0;i<grid.rects.length;i++){assert.ok(grid.links[i].height>=44);assert.ok(grid.links[i].bottom<=grid.rects[i].bottom+1);if(i>=2)assert.ok(grid.rects[i].y>=grid.rects[i-2].bottom);}}
  }
 }
 await p.setViewportSize({width:390,height:844});await p.locator('#language').selectOption('en');await p.locator('#top-sellers').scrollIntoViewIfNeeded();await p.screenshot({path:'clients/la-flor-eterna/qa/next-phase/two-column-phone-oct20.png'});
 await p.locator('#collection').scrollIntoViewIfNeeded();await p.screenshot({path:'clients/la-flor-eterna/qa/next-phase/two-column-catalog-oct20.png'});
 await p.goto(base+'studio.html?template=midnight-blooms');await p.waitForFunction(()=>window.__ready);
 const mobileSizes=[];
 for(const [width,height] of [[320,568],[390,664],[390,844],[430,740]]){
  await p.setViewportSize({width,height});
  for(const mode of ['classic','dome','heart']){
  await p.evaluate(mode=>NebulaApp.setState(mode==='classic'?NebulaClassic.create('midnight-blooms'):NebulaModel.defaultMode(mode)),mode);
  await p.evaluate(()=>document.getElementById('sharedBanner').hidden=false);
  const layout=await p.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
   return {panel:rect('.panel-body'),summary:rect('.design-summary'),preview:rect('#artSurface'),overflow:document.documentElement.scrollWidth>innerWidth+1,hidden:['#sharedBanner','.move-toolbar','#gestureHint'].every(s=>getComputedStyle(document.querySelector(s)).display==='none')};
  });
  assert.ok(layout.hidden);assert.equal(layout.overflow,false);assert.ok(layout.panel.height>=180,JSON.stringify({width,height,layout}));assert.ok(layout.panel.bottom<=layout.summary.top+1);
  mobileSizes.push({width,height,mode,panel:Math.round(layout.panel.height)});
  }
 }
 await p.evaluate(()=>NebulaApp.setState(NebulaClassic.create('midnight-blooms')));
 await p.setViewportSize({width:390,height:664});
 await p.screenshot({path:'clients/la-flor-eterna/qa/next-phase/phone-editor-space-oct20.png'});
 await p.locator('#focusPreview').click();assert.equal(await p.locator('#controls').isVisible(),false);
 await p.locator('#focusPreview').click();assert.equal(await p.locator('#controls').isVisible(),true);
 console.log('Phone control space:',mobileSizes);
 assert.equal(await p.locator('#flowerFillers #thistleEnabled').count(),0);
 await p.evaluate(()=>NebulaApp.setTab('finishing'));assert.equal(await p.locator('#smallAccents #thistleEnabled').count(),1);
 await p.locator('#thistleEnabled').check();await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 const count=await p.evaluate(()=>NebulaMidnightArt.thistleCount(NebulaApp.state));assert.ok(count>3);
 const saved=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.studio.thistles),true);
 const sheet=await browser.newPage();await sheet.goto(base+'order.html#b='+saved);await sheet.waitForFunction(()=>!document.getElementById('orderSheet').hidden);assert.match(await sheet.locator('body').innerText(),/thistle/i);await sheet.close();
 const resized=await p.evaluate(async()=>{
  const results=[];for(const n of [1,12,28,60,100]){const s=NebulaModel.defaultMode('dome');NebulaModel.resize(s,n);s.finishes.studio={v:1,thistles:true};await NebulaRenderer.awaitAssets(s);const nodes=NebulaRenderer.scene(s).layeredFlowers.filter(n=>n.infillKind==='thistle');results.push({n,count:NebulaMidnightArt.thistleCount(s),rendered:nodes.length,unique:new Set(nodes.map(n=>n.pocket.x+','+n.pocket.y)).size});}return results;
 });for(const x of resized){assert.equal(x.count,x.rendered);assert.equal(x.count,x.unique);}assert.ok(resized.at(-1).count>resized[1].count);
 await p.evaluate(()=>NebulaApp.setTab('finishing'));await p.locator('#thistleEnabled').scrollIntoViewIfNeeded();await p.screenshot({path:'clients/la-flor-eterna/qa/next-phase/thistle-toggle-phone-oct20.png'});
 assert.deepEqual(errors,[]);console.log('PASS two columns at 320–1440px in EN/ES, card bounds and 44px tap targets; additions toggle, reload/share/sheet, adaptive distinct thistles at 1–100 flowers.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
