require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4175/demo/nebula-builder/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await p.goto(base+'studio.html?template=crimson-velvet');await p.waitForFunction(()=>window.__ready);
 const result=await p.evaluate(async()=>{
  const R=NebulaRenderer,M=NebulaModel,U=NebulaCustomization,W=NebulaClassicWrapping,out=[],issues=[];
  const cases=[['Crimson Velvet',NebulaCrimson.create()],['Sunflowers',NebulaSunflower.create()],['Mixed lilies',NebulaClassic.create('midnight-blooms')],['Small roses',NebulaCrimson.create()]];
  const plain=M.defaultMode('classic');cases.push(['Standard Classic',plain]);
  const large=NebulaCrimson.create();while(large.items.length<36){if(!M.add(large,'rose_red').ok)break;}cases.push(['Large roses',large]);
  cases[3][1].items=cases[3][1].items.slice(0,5);M.arrange(cases[3][1],'classic',{fresh:true});
  for(const [label,original]of cases){
   const cv=document.createElement('canvas');cv.width=1800;cv.height=450;const ctx=cv.getContext('2d');ctx.fillStyle='#fcfaf8';ctx.fillRect(0,0,1800,450);
   const saved=JSON.stringify(original.items);
   for(let i=0;i<U.wraps.classic.length;i++){
    const s=M.clone(original),wrap=U.wraps.classic[i];s.finishes.studio={...s.finishes.studio,v:1,wrap};s.finishes.paper=['fan','smoke-upright'].includes(wrap)?'black':'ivory';
    await R.awaitAssets(s);const sc=R.scene(s),fit=W.layout(s,s.frames.classic),v=R.view(s);
    if(JSON.stringify(s.items)!==saved)issues.push(label+' '+wrap+' changed flowers');
    if(sc.collar.url!==fit.back.url)issues.push(label+' wrong paper');
    if(!sc.layeredFlowers.some(n=>n.uid==='paper-front'))issues.push(label+' missing front');
    if(R.assetsFor(s).size&&[...R.assetsFor(s)].some(u=>!R.decoded(u)))issues.push(label+' missing asset');
    if(!sc.classicPaper)issues.push(label+' missing fitted path');
    const round=M.validate(NebulaLink.decode(NebulaLink.encode(s)).design);if(!round)issues.push(label+' invalid share');
    const bounds=R.artBounds(s,sc);if(bounds.y*v.scale+v.y<0||(bounds.y+bounds.h)*v.scale+v.y>820)issues.push(label+' view crops '+wrap);
    const tile=document.createElement('canvas');tile.width=300;tile.height=342;R.paint(tile,s);ctx.drawImage(tile,i*300,50);
    ctx.fillStyle='#302639';ctx.font='16px Arial';ctx.fillText(label,i*300+10,23);ctx.font='14px Arial';ctx.fillText(U.wrapNames[wrap][0],i*300+10,425);
   }
   out.push({name:label.replaceAll(' ','-').toLowerCase(),data:cv.toDataURL()});
  }
  const color=NebulaCrimson.create();color.finishes.studio.wrap='fan';color.finishes.paper='ivory';const ivory=W.layout(color,color.frames.classic);if(ivory.back.untinted||ivory.front.paperTone!=='ivory')issues.push('Fan ivory tone lost');
  const sample=NebulaCrimson.create(),before=W.layout(sample,sample.frames.classic);sample.finishes.studio.breath=3;const after=W.layout(sample,sample.frames.classic);if(JSON.stringify(before)!==JSON.stringify(after))issues.push('Filler level moves wrapper');
  return {out,issues};
 });
 fs.mkdirSync('.private/qa/la-flor-eterna/wrap-fit',{recursive:true});for(const a of result.out)fs.writeFileSync('.private/qa/la-flor-eterna/wrap-fit/'+a.name+'.png',Buffer.from(a.data.split(',')[1],'base64'));
 assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);console.log('PASS 36 wrap/recipe combinations: unchanged flowers, aligned layers, assets, shares and mobile framing.');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
