require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='.private/qa/la-flor-eterna/next-phase/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const p=await browser.newPage({viewport:{width:1100,height:1000},hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html?template=midnight-blooms');await p.waitForFunction(()=>window.__ready);
 const ready=()=>p.waitForFunction(()=>NebulaApp.ready);
 async function capture(name){const png=await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);const c=document.createElement('canvas');c.width=900;c.height=1025;NebulaRenderer.paint(c,NebulaApp.state);const x=c.getContext('2d');x.globalCompositeOperation='destination-over';x.fillStyle='#fff9f6';x.fillRect(0,0,c.width,c.height);return c.toDataURL();});fs.writeFileSync(out+name+'.png',Buffer.from(png.split(',')[1],'base64'));}
 assert.equal(await p.evaluate(()=>NebulaApp.state.items.length),20);
 assert.equal(await p.evaluate(()=>NebulaApp.state.items.filter(n=>n.id==='blue_thistle').length),0);
 await capture('midnight-after-oct20');
 for(const mode of ['classic','dome','heart']){
  await p.evaluate(mode=>NebulaApp.setState(mode==='classic'?NebulaClassic.create('midnight-blooms'):NebulaModel.defaultMode(mode)),mode);await ready();await p.evaluate(()=>NebulaApp.setTab('finishing'));
  const before=await p.evaluate(()=>({items:JSON.stringify(NebulaApp.state.items),price:NebulaModel.price(NebulaApp.state).totalCents}));
  for(const enabled of [true,false]){
   await p.locator('#thistleEnabled').setChecked(enabled);await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
   const a=await p.evaluate(()=>{const s=NebulaApp.state,sc=NebulaRenderer.scene(s),copy=NebulaLink.decode(NebulaLink.encode(s))?.design;return {items:JSON.stringify(s.items),price:NebulaModel.price(s).totalCents,each:NebulaConfig.CONFIG.extrasCents.thistleCount,count:NebulaMidnightArt.thistleCount(s),enabled:s.finishes.studio.thistles,roundtrip:copy?.finishes.studio.thistles,nodes:(sc.layeredFlowers||[]).filter(n=>n.infillKind==='thistle').map(n=>({x:n.x,y:n.y,w:n.w,unit:sc.frame.unit,core:n.coreOverlap,url:n.url})),other:(sc.filler||[]).filter(n=>n.url.includes('thistle')).length};});
   assert.equal(a.items,before.items);assert.equal(a.enabled,enabled);assert.equal(a.roundtrip,enabled);assert.equal(a.price,before.price+a.each*a.count);assert.equal(a.nodes.length,a.count);assert.equal(a.other,0);assert.ok(a.nodes.every(n=>n.w<=n.unit*.72&&n.url.includes('midnight-oct20')&&n.core<.2));
   if(enabled){assert.ok(a.count>3);assert.ok(Math.max(...a.nodes.map(n=>n.x))-Math.min(...a.nodes.map(n=>n.x))>a.nodes[0].unit*2);assert.ok(Math.max(...a.nodes.map(n=>n.y))-Math.min(...a.nodes.map(n=>n.y))>a.nodes[0].unit*2);}
   if(mode==='classic'&&enabled)await capture('midnight-optional-thistles-oct20');
  }
 }
 // Choosing None removes legacy thistles only, retaining authored flower anchors.
 await p.evaluate(()=>{const s=NebulaClassic.create('midnight-blooms');for(let i=0;i<3;i++){const n=NebulaModel.newItem(s,'blue_thistle');n.anchors.classic={x:300+i*50,y:350,manual:false};s.items.push(n);}NebulaApp.setState(s);});await ready();
 await p.locator('#thistleEnabled').uncheck();await ready();assert.equal(await p.evaluate(()=>NebulaApp.state.items.length),20);
 await p.evaluate(()=>NebulaApp.undo());await ready();assert.equal(await p.evaluate(()=>NebulaApp.state.items.length),23);
 // Real hit testing: find an opaque, topmost pixel of each accessory.
 async function accessoryPoint(id){
  await p.locator('#bouquet').scrollIntoViewIfNeeded();
  const point=await p.evaluate(id=>{const sc=NebulaApp.scene(),n=sc.finishes.find(n=>n.detailId===id),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),r=document.getElementById('bouquet').getBoundingClientRect();
   for(let j=0;j<25;j++)for(let i=0;i<25;i++){const x=n.x+(i/24-.5)*n.w*.9,y=n.y+(j/24-.5)*n.h*.9;if(NebulaRenderer.detailHit(sc,{x,y})?.detailId===id){const px=r.x+(v.x+x*v.scale)*r.width/720,py=r.y+(v.y+y*v.scale)*r.height/820;if(px>0&&px<innerWidth&&py>0&&py<innerHeight)return {x:px,y:py};}}return null;
  },id);assert.ok(point,'visible opaque target '+id);return point;
 }
 for(const mobile of [false,true]){
  await p.setViewportSize(mobile?{width:390,height:844}:{width:1100,height:1000});
  for(const mode of ['classic','dome','heart']){
   for(const id of ['snoopy','snoopy_topper','kitty','pumpkin_plush','satin_bow','satin_black','satin_cocoa','satin_burgundy','satin_sage']){
    await p.evaluate(({mode,id})=>{const s=mode==='classic'?NebulaClassic.create('midnight-blooms'):NebulaModel.defaultMode(mode);s.finishes.decorations=[NebulaCustomization.placeDetail(s,NebulaDetails.create(id))];NebulaApp.setState(s);NebulaApp.stopBrush();NebulaApp.setTab('flowers');}, {mode,id});await ready();
    const original=await p.evaluate(()=>({items:JSON.stringify(NebulaApp.state.items),detail:JSON.stringify(NebulaApp.state.finishes.decorations)}));
    const xy=await accessoryPoint(id);if(mobile)await p.touchscreen.tap(xy.x,xy.y);else await p.mouse.click(xy.x,xy.y);
    await p.locator('#inlineDelete').waitFor({state:'visible'});assert.match(await p.locator('#inlineDelete').getAttribute('aria-label'),/Remove/);
    if(mobile)await p.locator('#inlineDelete').tap();else await p.locator('#inlineDelete').click();
    assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.decorations.length),0,id+' removed');
    assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state.items)),original.items);
    await p.evaluate(()=>NebulaApp.undo());await ready();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state.finishes.decorations)),original.detail);
    await p.evaluate(()=>NebulaApp.redo());await ready();assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.decorations.length),0);
   }
  }
 }
 await p.setViewportSize({width:1100,height:1000});
 await p.evaluate(()=>{const s=NebulaClassic.create('midnight-blooms');s.finishes.decorations=[NebulaDetails.create('satin_black')];NebulaApp.setState(s);NebulaApp.stopBrush();});await ready();
 const xy=await accessoryPoint('satin_black'),beforeDrag=await p.evaluate(()=>NebulaApp.state.finishes.decorations[0]);
 await p.mouse.move(xy.x,xy.y);await p.mouse.down();await p.mouse.move(xy.x+20,xy.y-10,{steps:8});await p.mouse.up();await ready();
 assert.notDeepEqual(await p.evaluate(()=>NebulaApp.state.finishes.decorations[0]),beforeDrag);
 assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.decorations.length),1,'drag never removes the bow');
 await p.keyboard.press('Delete');assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.decorations.length),0,'keyboard delete');
 assert.deepEqual(errors,[]);console.log('PASS Midnight art; optional thistles in 3 modes: geometry, prices, links, legacy migration/undo; 54 real desktop/touch accessory selections, removal and undo/redo; drag and keyboard delete.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
