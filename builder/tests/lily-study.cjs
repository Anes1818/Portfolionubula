const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='clients/la-flor-eterna/qa/next-phase/';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'studio.html?template=pink-promise');await p.waitForFunction(()=>window.__ready);
  const result=await p.evaluate(async()=>{
   const s=NebulaApp.state;NebulaModel.resize(s,24);s.finishes.roseArtwork='lily-study-v1';s.finishes.collar=false;s.finishes.fillerCount=0;s.title='Pink lilies — composition study';
   for(let i=0;i<s.items.length;i++)if(i%2===0)NebulaModel.replace(s,s.items[i].uid,'rose_cream');
   const used=new Set();
   for(const [x,y] of [[-.58,-.34],[.55,-.2],[.05,.65]]){
    const sc=NebulaRenderer.scene(s),n=sc.nodes.filter(n=>!used.has(n.uid)).sort((a,b)=>Math.hypot((a.x-360)/sc.frame.radius-x,(a.y-390)/sc.frame.radius-y)-Math.hypot((b.x-360)/sc.frame.radius-x,(b.y-390)/sc.frame.radius-y))[0];
    used.add(n.uid);NebulaModel.replace(s,n.uid,'lily');
   }
   NebulaApp.setState(s);await NebulaRenderer.awaitAssets(s);
   const scene=NebulaRenderer.scene(s),code=NebulaLink.encode(s),copy=NebulaLink.decode(code).design;
   const cv=document.createElement('canvas');cv.width=720;cv.height=820;NebulaRenderer.paint(cv,s);const ctx=cv.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff9f6';ctx.fillRect(0,0,720,820);
   return {code,png:cv.toDataURL(),lilies:scene.nodes.filter(n=>n.id==='lily').map(n=>n.url),count:s.items.length,same:JSON.stringify(scene)===JSON.stringify(NebulaRenderer.scene(copy)),missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u)),price:NebulaModel.price(s).totalCents};
  });
  assert.equal(result.count,24);assert.equal(result.lilies.length,3);assert.ok(result.lilies.every(u=>u.endsWith('lily-pink-open-a.webp')));assert.ok(result.same);assert.deepEqual(result.missing,[]);
  fs.writeFileSync(out+'lily-study.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(out+'lily-study-link.txt',base+'studio.html#b='+result.code+'\n');
  await p.waitForFunction(()=>NebulaApp.ready);await p.locator('#focusPreview').click();await p.screenshot({path:out+'lily-study-mobile.png'});
  await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
  assert.ok(await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportBlob(1080,1080)).size>50000;}));
  const fresh=await browser.newPage();await fresh.goto(base+'order.html#b='+result.code);await fresh.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
  assert.equal(await fresh.evaluate(()=>NebulaLink.decode(NebulaLink.readHash(location.hash)).design.finishes.roseArtwork),'lily-study-v1');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'lily-study-results.json',JSON.stringify(result,null,2));console.log('PASS new lossless lily loads in 24-flower study; 3 lily assets, deterministic links, reload, export and fresh florist sheet.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
