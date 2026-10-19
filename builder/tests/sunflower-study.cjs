const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='clients/la-flor-eterna/qa/next-phase/';
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 const result=await p.evaluate(async()=>{
  NebulaApp.setState(NebulaSunflower.create());const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);
  const sc=NebulaRenderer.scene(s),code=NebulaLink.encode(s),copy=NebulaLink.decode(code).design;
  const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,s);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,900,1025);
  return {code,png:cv.toDataURL(),count:s.items.length,same:JSON.stringify(sc)===JSON.stringify(NebulaRenderer.scene(copy)),missing:[...NebulaRenderer.assetsFor(s)].filter(u=>!NebulaRenderer.decoded(u)),price:NebulaModel.price(s)};
 });assert.equal(result.count,7);assert.ok(result.same);assert.deepEqual(result.missing,[]);
 fs.writeFileSync(out+'sunflower-study.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
 fs.writeFileSync(out+'sunflower-study-link.txt',base+'studio.html#b='+result.code+'\n');
 await p.waitForFunction(()=>NebulaApp.ready);await p.locator('#focusPreview').click();await p.screenshot({path:out+'sunflower-study-mobile.png'});
 assert.ok(await p.evaluate(()=>NebulaApp.add('sunflower').ok));assert.equal(await p.evaluate(()=>NebulaApp.state.items.length),8);
 await p.evaluate(()=>NebulaApp.undo());assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
 const edits=await p.evaluate(async()=>{
  const s=NebulaApp.state;s.finishes.collar=false;s.finishes.ribbon='none';NebulaApp.setState(s);
  const bare=NebulaApp.scene(),noPaper=!bare.collar&&!bare.finishes.some(n=>n.uid==='sunflower-front-paper'||n.uid==='ribbon');
  NebulaApp.undo();const t=NebulaApp.state;t.finishes.paper='black';t.finishes.ribbon='blush';NebulaApp.setState(t);await NebulaRenderer.awaitAssets(t);
  const sc=NebulaApp.scene(),otherPaper=!sc.finishes.some(n=>n.uid==='sunflower-front-paper')&&sc.finishes.some(n=>n.url.endsWith('bow-blush-long-tails.webp'));NebulaApp.undo();return {noPaper,otherPaper};
 });assert.ok(edits.noPaper&&edits.otherPaper);
 await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaLink.encode(NebulaApp.state)),result.code);
 assert.ok(await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportBlob(1080,1080)).size>50000;}));
 const sheet=await b.newPage();await sheet.goto(base+'order.html#b='+result.code);await sheet.waitForFunction(()=>!document.getElementById('orderSheet').hidden);
 for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'sunflower-study-results.json',JSON.stringify(result,null,2));console.log('PASS sunflower Classic: seven flowers, assets, add/undo, link, reload, export, fresh sheet, 320/390px');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
