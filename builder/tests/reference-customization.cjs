require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const qa='.private/qa/la-flor-eterna/next-phase/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(fs.readFileSync(require('node:path').join(__dirname,'fixtures/reference-comparison-link.txt'),'utf8').trim());await p.waitForFunction(()=>window.__ready);
  const original=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));
  const addRemove=await p.evaluate(()=>{
   const full=NebulaApp.add('lily');const uid=NebulaApp.state.items[0].uid;
   const removed=NebulaApp.remove(uid);const added=NebulaApp.add('lily');
   const count=NebulaApp.state.items.length;NebulaApp.undo();NebulaApp.undo();
   return {full,removed,added,count};
  });
  assert.equal(addRemove.full.reason,'templateFull');assert.ok(addRemove.removed.ok);assert.ok(addRemove.added.ok);assert.equal(addRemove.count,44);
  for(const [slot,id] of [[0,'lily'],[5,'sunflower'],[12,'lily']]){
   assert.ok(await p.evaluate(({slot,id})=>NebulaApp.replace(NebulaApp.state.items[slot].uid,id).ok,{slot,id}));
  }
  const report=[];
  for(const mode of ['flowers','toys-sash','mask-toys-sash']){
   await p.evaluate(mode=>{
    const s=NebulaApp.state;s.finishes.spookyMask=mode==='mask-toys-sash';
    s.finishes.decorations=mode==='flowers'?[]:[NebulaDetails.create('snoopy'),NebulaDetails.create('kitty')];
    s.finishes.sash=mode==='flowers'?'none':'blank_champagne';s.finishes.sashText='Happy Birthday';s.finishes.sashPlacement='diagonal';
    s.finishes.thistleCount=2;NebulaModel.syncTemplate(s);NebulaApp.setState(s);
   },mode);
   await p.waitForFunction(()=>NebulaApp.ready);
   const result=await p.evaluate(async()=>{
    const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s),v=NebulaRenderer.view(s),b=NebulaRenderer.artBounds(s,sc);
    const focal=sc.layeredFlowers.filter(n=>['lily','sunflower'].includes(n.id)),roses=sc.layeredFlowers.filter(n=>n.id==='rose_pink');
    const copy=NebulaLink.decode(NebulaLink.encode(s)).design;
    const cv=document.createElement('canvas');cv.width=720;cv.height=820;NebulaRenderer.paint(cv,s);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,720,820);
    const mask=sc.finishes.find(n=>n.uid==='scream-mask'),toys=sc.finishes.filter(n=>n.detailId),sash=sc.finishes.find(n=>n.uid==='sash');
    return {png:cv.toDataURL(),count:s.items.length,focal:focal.length,onTop:focal.every(n=>roses.every(r=>sc.layeredFlowers.indexOf(n)>sc.layeredFlowers.indexOf(r))),
     thistles:sc.filler.filter(n=>n.url.includes('blue-thistle')).length,
     same:JSON.stringify(sc)===JSON.stringify(NebulaRenderer.scene(copy)),priced:NebulaModel.price(s),
     maskClear:!mask||toys.every(n=>Math.abs(n.x-mask.x)>=(n.w+mask.w)/2),
     sashLast:!sash||sc.finishes.at(-1)===sash,
     fits:b.x*v.scale+v.x>=0&&b.y*v.scale+v.y>=0&&(b.x+b.w)*v.scale+v.x<=720&&(b.y+b.h)*v.scale+v.y<=820,
     missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u)),code:NebulaLink.encode(s)};
   });
   fs.writeFileSync(qa+'customization-'+mode+'.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
   assert.equal(result.count,44);assert.equal(result.focal,3);assert.ok(result.onTop);assert.equal(result.thistles,2);assert.ok(result.same);assert.ok(result.maskClear);assert.ok(result.sashLast);assert.ok(result.fits);assert.deepEqual(result.missing,[]);
   if(mode!=='flowers')for(const id of ['snoopy','kitty','sash'])assert.ok(result.priced.extraLines.some(n=>n.id===id));
   report.push({mode,...result});
  }
  // Real UI removal and placement controls must preserve the customized state.
  await p.locator('#tab-finishing').click();await p.locator('#spookyMask').uncheck();await p.waitForFunction(()=>NebulaApp.ready);
  assert.ok(await p.evaluate(()=>!NebulaApp.scene().finishes.some(n=>n.uid==='scream-mask')));
  await p.locator('[data-detail="kitty"]').click();await p.locator('#detailLayer').selectOption('front');
  assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty').layer),'front');
  const edited=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));await p.evaluate(()=>NebulaApp.undo());await p.evaluate(()=>NebulaApp.redo());assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),edited);
  await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),edited);
  assert.ok(await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportBlob(1080,1080)).size>50000;}));
  for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await p.goto('http://127.0.0.1:4174/shops/la-flor-eterna/studio.html#b='+original);await p.reload();await p.waitForFunction(()=>window.__ready);
  assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),original);
  assert.deepEqual(errors,[]);fs.writeFileSync(qa+'customization-results.json',JSON.stringify(report,null,2));
  console.log('PASS focal layering, mask/toy separation, sash ordering, preserved thistles, counts/prices, links, fit, UI toggles, undo/redo, reload, export, 320/390 widths and original restoration.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
