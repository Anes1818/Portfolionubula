const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4176/demo/nebula-builder/studio.html?template=pink-celebration');await p.waitForFunction(()=>window.__ready);
 const initial=await p.evaluate(()=>({items:NebulaApp.state.items,code:NebulaLink.encode(NebulaApp.state)}));assert.equal(initial.items.length,25);assert.ok(initial.items.every(n=>!['lily_bud','eucalyptus','white_flower_spray'].includes(n.id)));
 await p.locator('#bouquet').scrollIntoViewIfNeeded();
 for(const kind of ['greenery','spray']){
  const point=await p.evaluate(kind=>{NebulaApp.stopBrush();const s=NebulaApp.state,sc=NebulaApp.scene(),v=NebulaRenderer.view(s,NebulaApp.camera),rect=document.getElementById('bouquet').getBoundingClientRect();for(const n of sc.layeredFlowers.filter(n=>n.infillKind===kind))for(let y=-.4;y<.4;y+=.08)for(let x=-.4;x<.4;x+=.08){const q={x:n.x+x*n.w,y:n.y+y*n.h};if(NebulaFillerOptions.hit(sc,q)?.uid===n.uid&&!NebulaRenderer.detailHit(sc,q))return{x:rect.left+(q.x*v.scale+v.x)/720*rect.width,y:rect.top+(q.y*v.scale+v.y)/820*rect.height,id:n.uid};}},kind);
  assert.ok(point,kind+' hit target');await p.mouse.move(point.x,point.y);await p.mouse.down();await p.mouse.move(point.x+22,point.y+15,{steps:6});await p.mouse.up();
  assert.ok(await p.evaluate(id=>!!NebulaApp.state.finishes.studio.positions?.[id],point.id),kind+' drag stored');
 }
 const result=await p.evaluate(()=>{const s=NebulaApp.state,M=NebulaModel,R=NebulaRenderer,round=NebulaLink.decode(NebulaLink.encode(s)).design,price=M.price(s),sc=R.scene(s),cv=document.createElement('canvas');cv.width=720;cv.height=820;R.paint(cv,s);
 const off=M.clone(s);off.finishes.greeneryCount=0;off.finishes.studio.sprays=0;off.finishes.studio.buds=0;const gone=R.scene(off).layeredFlowers;
 return{positions:s.finishes.studio.positions,round:round.finishes.studio.positions,items:s.items,buds:sc.layeredFlowers.filter(n=>n.uid.startsWith('bud-option')).length,budDraggable:sc.layeredFlowers.filter(n=>n.uid.startsWith('bud-option')).some(n=>NebulaFillerOptions.hit(sc,n)?.uid===n.uid),off:gone.filter(n=>n.infillKind==='greenery'||n.infillKind==='spray'||n.uid.startsWith('bud-option')).length,greenLines:price.extraLines?.filter(n=>n.id==='interiorGreenery'),image:cv.toDataURL()};});
 assert.deepEqual(result.items,initial.items);assert.deepEqual(result.positions,result.round);assert.equal(result.buds,7);assert.equal(result.greenLines.length,1);assert.ok(result.greenLines[0].totalCents>0);assert.equal(result.budDraggable,false);assert.equal(result.off,0);
 fs.writeFileSync('clients/la-flor-eterna/qa/celebration/options.png',Buffer.from(result.image.split(',')[1],'base64'));fs.writeFileSync('clients/la-flor-eterna/qa/celebration/code.txt',initial.code);
 await p.evaluate(()=>NebulaApp.undo());assert.equal(await p.evaluate(()=>Object.keys(NebulaApp.state.finishes.studio.positions||{}).length),1);
 await p.locator('#resetFillerPositions').click();assert.equal(await p.evaluate(()=>Object.keys(NebulaApp.state.finishes.studio.positions||{}).length),0);
 await p.locator('#budLess').click();assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.studio.buds),6);
 for(const [key,counts] of Object.entries({buds:[0,3,7,10],greenery:[0,3,7,12]})){
  for(let level=0;level<4;level++){
   await p.locator('#'+key+'Density button').nth(level).click();
   const state=await p.evaluate(key=>({count:key==='buds'?NebulaApp.state.finishes.studio.buds:NebulaApp.state.finishes.greeneryCount,items:NebulaApp.state.items,valid:!!NebulaLink.decode(NebulaLink.encode(NebulaApp.state))}),key);
   assert.equal(state.count,counts[level]);assert.deepEqual(state.items,initial.items);assert.ok(state.valid);
   assert.equal(await p.locator('#'+key+'Density button[aria-pressed="true"]').count(),1);
  }
 }
 const stable=await p.evaluate(()=>{const s=NebulaApp.state;s.finishes.studio.buds=3;const a=NebulaRenderer.scene(s).layeredFlowers.filter(n=>n.uid.startsWith('bud-option'));s.finishes.studio.buds=7;const b=NebulaRenderer.scene(s).layeredFlowers.filter(n=>n.uid.startsWith('bud-option'));return a.every(n=>{const q=b.find(x=>x.uid===n.uid);return q&&q.x===n.x&&q.y===n.y&&q.rot===n.rot;});});assert.ok(stable,'increasing bud density preserves existing placements');
 for(const mode of ['dome','heart']){assert.ok(await p.evaluate(mode=>{const s=NebulaModel.defaultMode(mode);s.finishes.greeneryCount=3;s.finishes.studio={v:1,buds:2,sprays:2};return !!NebulaModel.validate(s)&&!!NebulaLink.decode(NebulaLink.encode(s));},mode));}
 assert.deepEqual(errors,[]);console.log('PASS filler-only options, real eucalyptus/white-spray pointer drags, locked buds, unchanged main flowers, saved offsets, undo/reset, toggles and all-mode links.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
