require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:390,height:664}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 const featured=JSON.parse(fs.readFileSync('clients/la-flor-eterna/top-sellers.json','utf8'));
 const report=await p.evaluate(async featured=>{
  const designs=featured.map(e=>({name:e.id,s:NebulaLink.decode(e.expected.code).design}));
  const lilies=NebulaClassic.create('midnight-blooms');for(const n of lilies.items)NebulaModel.replace(lilies,n.uid,'lily');designs.push({name:'many-lilies',s:lilies});
  for(const mode of ['dome','heart']){const s=NebulaModel.defaultMode(mode);NebulaModel.resize(s,60);designs.push({name:mode+'-60',s});}
  const rows=[],images=[];for(const {name,s} of designs){s.finishes.studio={...s.finishes.studio,v:1,breath:1};const items=JSON.stringify(s.items);await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s),air=sc.layeredFlowers.filter(n=>n.infillKind==='breath');rows.push({name,count:air.length,expected:NebulaCustomization.breathCount(s),maxWidth:Math.max(...air.map(n=>n.w/sc.frame.unit)),core:Math.max(...air.map(n=>n.coreOverlap)),overlap:Math.max(...air.map(n=>n.branchOverlap)),items:JSON.stringify(s.items)===items,link:JSON.stringify(NebulaRenderer.scene(NebulaLink.decode(NebulaLink.encode(s)).design))===JSON.stringify(sc)});
   if(['many-lilies','blush-lilies'].includes(name)){const cv=document.createElement('canvas');cv.width=720;cv.height=820;NebulaRenderer.paint(cv,s);const ctx=cv.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff9f6';ctx.fillRect(0,0,720,820);images.push({name,png:cv.toDataURL()});}
  }NebulaApp.setState(designs.find(d=>d.name==='blush-lilies').s);return {rows,images};
 },featured);
 for(const r of report.rows){assert.equal(r.count,r.expected);assert.ok(r.maxWidth<=.865,JSON.stringify(r));assert.ok(r.core<.10,JSON.stringify(r));assert.ok(r.overlap<.12,JSON.stringify(r));assert.ok(r.items&&r.link);}
 for(const img of report.images)fs.writeFileSync('.private/qa/la-flor-eterna/next-phase/breath-'+img.name+'-after.png',Buffer.from(img.png.split(',')[1],'base64'));
 const before=await p.evaluate(()=>JSON.stringify(NebulaApp.scene().layeredFlowers));await p.locator('#focusPreview').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.scene().layeredFlowers)),before);await p.screenshot({path:'.private/qa/la-flor-eterna/next-phase/breath-focus-after.png'});await p.locator('#focusPreview').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.scene().layeredFlowers)),before);assert.deepEqual(errors,[]);console.log('PASS Light breath widths, bloom-center clearance, branch overlap, inventory and shared links; focus preserves arrangement.',JSON.stringify(report.rows));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
