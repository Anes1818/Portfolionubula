require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='.private/qa/la-flor-eterna/next-phase/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1100,height:1000},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 const result=await p.evaluate(async()=>{
  const issues=[],checks=[],sheets=[],assert=(yes,message)=>{if(!yes)issues.push(message);};
  for(const mode of ['classic','dome','heart']){
   const sheet=document.createElement('canvas');sheet.width=1200;sheet.height=1170;const cx=sheet.getContext('2d');cx.fillStyle='#fff9f6';cx.fillRect(0,0,1200,1170);
   const sizes=mode==='classic'?[3,7,20]:[12,28,60];
   for(let row=0;row<3;row++){
    const s=mode==='classic'?NebulaSunflower.create():NebulaModel.defaultMode(mode);
    if(mode==='classic'){while(s.items.length>sizes[row])NebulaModel.remove(s,s.items.at(-1).uid);while(s.items.length<sizes[row]){const r=NebulaModel.add(s,'rose_pink');if(!r.ok){issues.push('Cannot construct Classic '+sizes[row]+' sample: '+r.reason);break;}}}else NebulaModel.resize(s,sizes[row]);
    if(mode!=='classic'){s.template.palette=['rose_pink'];NebulaModel.syncTemplate(s);s.finishes.roseArtwork='reference-v3';s.finishes.paper='ivory';}
    s.finishes.decorations=[];s.finishes.ribbon='none';s.finishes.fillerCount=0;s.finishes.studio={v:1,breath:0};
    const flowerState=JSON.stringify(s.items);let previous=[],previousBlooms=null;
    for(let level=0;level<4;level++){
     s.finishes.studio.breath=level;await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s),air=(sc.layeredFlowers||[]).filter(n=>n.uid.startsWith('air-'));
     assert(JSON.stringify(s.items)===flowerState,mode+' filler changed flower state');
     assert(previous.every(n=>air.some(a=>a.uid===n.uid)),mode+' density lost earlier sprig identities');previous=air;
     if(previousBlooms)assert(sc.nodes.every(n=>{const old=previousBlooms.find(a=>a.uid===n.uid);return !old||n.x===old.x&&n.y===old.y&&n.w<=old.w;}),mode+' density must open petal space without moving centers');previousBlooms=sc.nodes;
     assert(air.length===NebulaCustomization.breathCount(s),mode+' density quantity');
     const copy=NebulaLink.decode(NebulaLink.encode(s)).design;assert(JSON.stringify(NebulaRenderer.scene(copy))===JSON.stringify(sc),mode+' scene roundtrip');
     const cv=document.createElement('canvas');cv.width=300;cv.height=342;NebulaRenderer.paint(cv,s);cx.drawImage(cv,level*300,row*390+35);cx.fillStyle='#522e37';cx.font='15px sans-serif';cx.fillText(mode+' · '+s.items.length+' flowers · '+['None','Light','Medium','Full'][level],level*300+8,row*390+22);
    }
    checks.push(mode+' '+s.items.length+' flowers: progressive petal spacing, unchanged anchors/quantities, deterministic link');
   }
   sheets.push({name:'density-standard-'+mode,png:sheet.toDataURL()});
  }
  for(const id of NebulaCustomization.bowIds){const s=NebulaSunflower.create();NebulaCustomization.beforeDetail(s,id);s.finishes.decorations.push(NebulaDetails.create(id));await NebulaRenderer.awaitAssets(s);const n=NebulaRenderer.scene(s).finishes.find(n=>n.detailId===id);assert(n.y>=NebulaCustomization.neckY(s)&&n.y<NebulaCustomization.neckY(s)+n.h*.4&&!n.tucked,id+' must tie stems in Classic');assert(![...NebulaRenderer.assetsFor(s)].some(u=>!NebulaRenderer.decoded(u)),id+' missing art');}
  const s=NebulaSunflower.create();for(const id of ['kitty','pumpkin_plush'])s.finishes.decorations.push(NebulaDetails.create(id));s.finishes.chocolateBox=true;await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s);assert(sc.finishes.filter(n=>n.detailId).every(n=>n.y-n.h/2>Math.max(...sc.nodes.map(f=>f.y+f.h*.5))&&!n.tucked),'Classic gifts must be separate');
  const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,s);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,900,1025);sheets.push({name:'classic-separated-gifts',png:cv.toDataURL()});
  checks.push('All 5 satin sources decoded; Classic gifts grouped at paper base; separate chocolate');
  return {issues,checks,sheets};
 });
 assert.deepEqual(result.issues,[]);for(const s of result.sheets)fs.writeFileSync(out+s.name+'.png',Buffer.from(s.png.split(',')[1],'base64'));delete result.sheets;
 // Touch interaction uses the same normalized gift frame as rendering and survives undo/reload.
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{const s=NebulaSunflower.create();s.finishes.decorations=[NebulaDetails.create('kitty')];NebulaApp.setState(s);NebulaApp.setTab('finishing');NebulaApp.stopBrush();});await p.waitForFunction(()=>NebulaApp.ready);await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));await p.locator('#bouquet').scrollIntoViewIfNeeded();
 const before=await p.evaluate(()=>({code:NebulaLink.encode(NebulaApp.state),v:NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),n:NebulaApp.scene().finishes.find(n=>n.detailId==='kitty')})),r=await p.locator('#bouquet').boundingBox(),x=r.x+(before.n.x*before.v.scale+before.v.x)*r.width/720,y=r.y+(before.n.y*before.v.scale+before.v.y)*r.height/820;
 const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-3*i,y:y+2*i}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));assert.notEqual(after,before.code,'real touch moves Classic gift');await p.evaluate(()=>NebulaApp.undo());assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),before.code);await p.evaluate(()=>NebulaApp.redo());assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),after);await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),after);assert.deepEqual(errors,[]);
 result.checks.push('390px touch drag, exact undo/redo, persisted reload');fs.writeFileSync(out+'customization-standards.json',JSON.stringify(result,null,2));console.log('PASS visual matrix + contracts: '+result.checks.join('; '));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
