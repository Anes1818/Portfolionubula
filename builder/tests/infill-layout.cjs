const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=(process.env.TEST_ORIGIN||'http://127.0.0.1:4177')+'/shops/la-flor-eterna/',out='clients/la-flor-eterna/qa/next-phase/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:1100,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'studio.html');await page.waitForFunction(()=>window.__ready);
 const featured=JSON.parse(fs.readFileSync('clients/la-flor-eterna/top-sellers.json','utf8'));
 const report=await page.evaluate(async featured=>{
  const checks=[],images=[],issues=[],check=(ok,text)=>{if(!ok)issues.push(text);};
  for(const entry of featured){
   const s=NebulaLink.decode(entry.expected.code).design,items=JSON.stringify(s.items),original=NebulaRenderer.scene(s).nodes;
   const grid=document.createElement('canvas');grid.width=1440;grid.height=460;const g=grid.getContext('2d');g.fillStyle='#fff9f6';g.fillRect(0,0,1440,460);
   let lastWidth=Infinity,lastAir=0;
   for(let level=0;level<=3;level++){
    s.finishes.studio.breath=level;await NebulaRenderer.awaitAssets(s);const scene=NebulaRenderer.scene(s),infill=scene.layeredFlowers.filter(n=>n.infill),air=infill.filter(n=>n.uid.startsWith('air-')),white=infill.filter(n=>n.uid.startsWith('spray-accent-')),greens=infill.filter(n=>n.uid.startsWith('greenery-'));
    check(JSON.stringify(s.items)===items,entry.id+' paid items unchanged');
    check(scene.nodes.every(n=>{const old=original.find(o=>o.uid===n.uid);return n.x===old.x&&n.y===old.y;}),entry.id+' anchors unchanged');
    check(air.length===NebulaCustomization.breathCount(s),entry.id+' every logical breath unit represented');
    const branches=infill.filter(n=>n.infillKind==='breath'),children=branches.filter(n=>n.parentFiller);
    check(children.every(n=>air.some(parent=>parent.uid===n.parentFiller)),entry.id+' every extra tip belongs to a selected stem');
    check(branches.length===(level===0?0:air.length*(level>=2?2:1)+(level===3?Math.ceil(air.length/2):0)),entry.id+' density adds complete branch tips');
    const paid=NebulaModel.price(s).extraLines.filter(n=>n.id==='filler');
    check(paid.length===(level?1:0)&&(!level||paid[0].quantity===air.length),entry.id+' visual branches never become extra paid stems');
    check(white.length===(s.finishes.studio.sprays||0),entry.id+' every white accent represented');
    check(greens.length===(s.finishes.greeneryCount||0),entry.id+' every greenery unit represented');
    check(infill.every(n=>n.z>Math.max(...scene.nodes.map(f=>f.z??f.y))),entry.id+' tips above petals');
    check(infill.every(n=>(n.occlude||[]).every(id=>scene.nodes.some(f=>f.uid===id))),entry.id+' valid petal occluders');
    check(scene.nodes.every(n=>{const old=original.find(o=>o.uid===n.uid);return n.w===old.w&&n.h===old.h;}),entry.id+' filler never shrinks flowers');
    const pockets=[...branches,...white,...greens].map(n=>n.pocket.x.toFixed(3)+','+n.pocket.y.toFixed(3));check(new Set(pockets).size===pockets.length,entry.id+' branches and families do not share a pocket');
    const avg=scene.nodes.reduce((v,n)=>v+n.w,0)/scene.nodes.length;check(lastWidth===Infinity||avg===lastWidth,entry.id+' unchanged heads');lastWidth=avg;
    const avgAir=air.reduce((v,n)=>v+n.w,0)/Math.max(1,air.length);lastAir=avgAir;
    const copy=NebulaLink.decode(NebulaLink.encode(s)).design;check(JSON.stringify(NebulaRenderer.scene(copy))===JSON.stringify(scene),entry.id+' exact saved-link reconstruction');
    const unrelated=NebulaModel.clone(s);unrelated.note='A note';unrelated.finishes.chocolateBox=!unrelated.finishes.chocolateBox;
    check(JSON.stringify(NebulaRenderer.scene(unrelated).layeredFlowers)===JSON.stringify(scene.layeredFlowers),entry.id+' notes and gifts do not move infill');
    const cv=document.createElement('canvas');cv.width=360;cv.height=410;NebulaRenderer.paint(cv,s);g.drawImage(cv,level*360,32);g.fillStyle='#542c3b';g.font='16px Arial';g.fillText(['None','Light','Medium','Full'][level],level*360+14,22);
   }
   images.push({name:'infill-density-'+entry.id,png:grid.toDataURL()});checks.push(entry.id+' density, counts, depth, gap ownership, unrelated edits, links');
   if(['blush-lilies','pink-promise'].includes(entry.id)){
    const initial=NebulaLink.decode(entry.expected.code).design;await NebulaRenderer.awaitAssets(initial);
    const cv=document.createElement('canvas');cv.width=720;cv.height=820;NebulaRenderer.paint(cv,initial);
    const ctx=cv.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff9f6';ctx.fillRect(0,0,720,820);
    images.push({name:entry.id==='blush-lilies'?'lily-silver-eucalyptus-preview':'pink-promise-realism-preview',png:cv.toDataURL()});
    if(entry.id==='pink-promise'){
     const exported=await NebulaRenderer.blob(initial,1080,1080,'en');check(exported.type==='image/png'&&exported.size>100000,'Pink Promise exports complete PNG');
    }
   }
  }
  for(const mode of ['dome','heart','classic'])for(const size of [3,12,40]){
   const s=mode==='classic'?NebulaSunflower.create():NebulaModel.defaultMode(mode);
   if(mode!=='classic')NebulaModel.resize(s,size);else while(s.items.length>size)NebulaModel.remove(s,s.items.at(-1).uid);
   s.finishes.studio={v:1,breath:3,sprays:8,edge:true};s.finishes.greeneryCount=mode==='dome'?12:0;
   await NebulaRenderer.awaitAssets(s);const a=NebulaRenderer.scene(s),b=NebulaRenderer.scene(s),nodes=a.layeredFlowers;
   check(JSON.stringify(a)===JSON.stringify(b),mode+' repeated drawing cannot accumulate border nodes');
   check(nodes.filter(n=>n.uid.startsWith('air-')).length===NebulaCustomization.breathCount(s),mode+' maximum density count');
   check(nodes.filter(n=>n.uid.startsWith('spray-accent-')).length===8,mode+' max white accents');
   check(nodes.every(n=>[n.x,n.y,n.w,n.h,n.rot].every(Number.isFinite)),mode+' finite geometry');
  }
  // Measure cached redraws separately from a geometry change / first asset fit.
  const s=NebulaLink.decode(featured[1].expected.code).design;await NebulaRenderer.awaitAssets(s);NebulaRenderer.scene(s);const t=performance.now();for(let i=0;i<30;i++)NebulaRenderer.scene(s);const cachedMs=(performance.now()-t)/30;
  return {issues,checks,cachedMs,images};
 },featured);
 assert.deepEqual(report.issues,[]);assert.deepEqual(errors,[]);
 for(const image of report.images)fs.writeFileSync(out+image.name+'.png',Buffer.from(image.png.split(',')[1],'base64'));delete report.images;
 fs.writeFileSync(out+'infill-results.json',JSON.stringify(report,null,2));console.log('PASS '+report.checks.join('; ')+`; max combinations and cached redraw ${report.cachedMs.toFixed(2)}ms.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
