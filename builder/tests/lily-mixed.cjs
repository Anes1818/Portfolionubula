require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='.private/qa/la-flor-eterna/next-phase/';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'studio.html?template=pink-promise');await p.waitForFunction(()=>window.__ready);
  const result=await p.evaluate(async()=>{
   const s=NebulaApp.state;NebulaModel.resize(s,28);
   Object.assign(s.finishes,{roseArtwork:'lily-mixed-v1',collar:true,paper:'ivory',fillerCount:0,greeneryCount:8,decorations:[NebulaDetails.create('satin_bow')]});s.title='Blush lilies — La Flor Eterna';
   for(let i=0;i<s.items.length;i++)NebulaModel.replace(s,s.items[i].uid,i%3===0?'rose_pink':'rose_cream');
   const used=new Set();
   for(const [id,x,y] of [['lily',-.7,-.5],['lily',.15,-.78],['lily',.8,-.25],['lily',.65,.6],['lily',-.1,.8],['lily',-.85,.15],['white_flower_spray',-.45,-.8],['white_flower_spray',.8,.3],['white_flower_spray',-.6,.6],['white_flower_spray',.2,-.3]]){
    const sc=NebulaRenderer.scene(s),n=sc.nodes.filter(n=>!used.has(n.uid)).sort((a,b)=>Math.hypot((a.x-360)/sc.frame.radius-x,(a.y-390)/sc.frame.radius-y)-Math.hypot((b.x-360)/sc.frame.radius-x,(b.y-390)/sc.frame.radius-y))[0];
    used.add(n.uid);NebulaModel.replace(s,n.uid,id);
   }
   NebulaApp.setState(s);await NebulaRenderer.awaitAssets(s);
   const sc=NebulaRenderer.scene(s),code=NebulaLink.encode(s),copy=NebulaLink.decode(code).design;
   const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,s);const ctx=cv.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff9f6';ctx.fillRect(0,0,cv.width,cv.height);
   return {code,png:cv.toDataURL(),counts:NebulaModel.counts(s),same:JSON.stringify(sc)===JSON.stringify(NebulaRenderer.scene(copy)),missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u)),price:NebulaModel.price(s),bow:sc.finishes.find(n=>n.detailId==='satin_bow'),greens:sc.greenery.length};
  });
  assert.equal(result.counts.lily,6);assert.equal(result.counts.white_flower_spray,4);assert.equal(result.greens,8);assert.ok(result.bow);assert.ok(result.same);assert.deepEqual(result.missing,[]);
  assert.ok(result.price.extraLines.some(n=>n.id==='satin_bow'&&Number.isFinite(n.totalCents)));
  // The bow belongs on the bouquet face, not above the lilies like a character prop.
  assert.ok(result.bow.y>350&&result.bow.y<450,'Satin bow stays on the flower face');
  fs.writeFileSync(out+'lily-mixed.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(out+'lily-mixed-link.txt',base+'studio.html#b='+result.code+'\n');
  await p.waitForFunction(()=>NebulaApp.ready);await p.locator('#focusPreview').click();await p.screenshot({path:out+'lily-mixed-mobile.png'});
  await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
  // Every addition remains editable and explicitly priced, including the white spray.
  const changed=await p.evaluate(()=>{const s=NebulaApp.state;s.finishes.decorations=[];s.finishes.greeneryCount=3;NebulaApp.setState(s);const uid=NebulaApp.state.items.find(n=>n.id==='white_flower_spray').uid;return NebulaApp.replace(uid,'rose_pink').ok;});assert.ok(changed);
  assert.ok(await p.evaluate(()=>{const sc=NebulaApp.scene();return sc.greenery.length===3&&!sc.finishes.some(n=>n.detailId==='satin_bow')&&NebulaApp.state.items.filter(n=>n.id==='white_flower_spray').length===3;}));
  await p.evaluate(()=>{NebulaApp.undo();NebulaApp.undo();});assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
  assert.ok(await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportBlob(1080,1080)).size>50000;}));
  const fresh=await browser.newPage();await fresh.goto(base+'order.html#b='+result.code);await fresh.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
  assert.equal(await fresh.evaluate(()=>NebulaLink.decode(NebulaLink.readHash(location.hash)).design.finishes.roseArtwork),'lily-mixed-v1');
  for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'lily-mixed-results.json',JSON.stringify(result,null,2));console.log('PASS complete mixed lily study: assets, six lilies, four priced white sprays, eight greens, editable priced bow, undo, reload, export, fresh sheet, 320/390px.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
