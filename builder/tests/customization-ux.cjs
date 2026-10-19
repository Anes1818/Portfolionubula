const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',qa='clients/la-flor-eterna/qa/next-phase/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1100,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 for(const mode of ['classic','dome','heart']){
  await p.evaluate(mode=>{const s=mode==='classic'?NebulaSunflower.create():NebulaModel.defaultMode(mode);if(mode==='dome'){NebulaModel.resize(s,28);s.template.palette=['rose_pink'];NebulaModel.syncTemplate(s);s.finishes.roseArtwork='reference-v3';}NebulaApp.setState(s);},mode);await p.waitForFunction(()=>NebulaApp.ready);
  await p.evaluate(()=>NebulaApp.setTab('flowers'));
  assert.equal(await p.locator('#roseArtworkControl:visible').count(),0);assert.equal(await p.locator('[data-flower="white_flower_spray"]').count(),0);
  const count=await p.evaluate(()=>NebulaApp.state.items.length);
  for(let level=0;level<=3;level++){
   await p.locator('[data-breath="'+level+'"]').click();await p.waitForFunction(()=>NebulaApp.ready);
   const x=await p.evaluate(()=>{const s=NebulaApp.state,sc=NebulaApp.scene(),o=s.finishes.studio;return {expected:NebulaCustomization.breathCount(s),count:s.items.length,airy:sc.layeredFlowers.filter(n=>n.uid.startsWith('air-')).length,tufts:sc.layeredFlowers.filter(n=>n.uid.startsWith('tuft-')).length,code:NebulaLink.encode(s)};});
   assert.equal(x.count,count);assert.equal(x.airy,x.expected);assert.equal(x.tufts,level>=2?x.expected:0);assert.ok(await p.evaluate(code=>NebulaLink.decode(code).design.finishes.studio.breath>=0,x.code));
  }
  await p.locator('#whiteSprayMore').click();await p.locator('#whiteSprayMore').click();await p.waitForFunction(()=>NebulaApp.ready);assert.equal(await p.evaluate(()=>NebulaApp.state.items.length),count);
  await p.evaluate(()=>NebulaApp.setTab('finishing'));
  assert.equal(await p.locator('#simpleLettering').isVisible(),mode!=='classic');
  await p.locator('[data-detail="kitty"]').click();await p.waitForFunction(()=>NebulaApp.ready);await p.locator('#satinColor').selectOption('satin_black');await p.waitForFunction(()=>NebulaApp.ready);
  await p.locator('[data-detail="pumpkin_plush"]').click();await p.waitForFunction(()=>NebulaApp.ready);
  await p.locator('#breathWrap').check();await p.waitForFunction(()=>NebulaApp.ready);
  const detail=await p.evaluate(()=>{NebulaApp.stopBrush();const n=NebulaApp.scene().finishes.find(n=>n.detailId==='kitty');return {n,v:NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),before:NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty')};});
  await p.locator('#bouquet').scrollIntoViewIfNeeded();
  const r=await p.locator('#bouquet').boundingBox(),x=r.x+(detail.n.x*detail.v.scale+detail.v.x)*r.width/720,y=r.y+(detail.n.y*detail.v.scale+detail.v.y)*r.height/820;
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+25,y+20,{steps:8});await p.mouse.up();
  const moved=await p.evaluate(()=>NebulaApp.state.finishes.decorations.find(d=>d.id==='kitty'));assert.notDeepEqual(moved,detail.before,'kitty draggable in '+mode);
  if(mode!=='classic'){await p.locator('#initialEnabled').check();await p.locator('#initialLetter').fill('M');await p.waitForFunction(()=>NebulaApp.ready);assert.ok(await p.evaluate(()=>NebulaApp.scene().finishes.some(n=>n.uid==='floral-initial')));}
  const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));assert.ok(await p.evaluate(c=>NebulaLink.decode(c).design.finishes.decorations.length===3,code));
  await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);});
  async function snap(name){const img=await p.evaluate(()=>{const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,NebulaApp.state);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,900,1025);return cv.toDataURL();});fs.writeFileSync(qa+name+'.png',Buffer.from(img.split(',')[1],'base64'));}
  await snap('customization-'+mode);fs.writeFileSync(qa+'customization-'+mode+'-link.txt',base+'studio.html#b='+code+'\n');
  await p.evaluate(()=>NebulaApp.setTab('wrapping'));const styles=await p.locator('[data-wrap-style]').evaluateAll(ns=>ns.map(n=>n.dataset.wrapStyle));
  for(const style of styles){await p.locator('[data-wrap-style="'+style+'"]').click();await p.waitForFunction(()=>NebulaApp.ready);await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));await snap('paper-'+style);assert.deepEqual(await p.evaluate(()=>[...NebulaRenderer.assetsFor(NebulaApp.state)].filter(u=>!NebulaRenderer.decoded(u))),[],style+' assets decode');}
  await p.evaluate(c=>NebulaApp.setState(NebulaLink.decode(c).design),code);await p.waitForFunction(()=>NebulaApp.ready);
  const sheet=await b.newPage();await sheet.goto(base+'order.html#b='+code);await sheet.waitForFunction(()=>!document.getElementById('orderSheet').hidden);assert.match(await sheet.locator('body').innerText(),/White flowering accents/);await sheet.close();
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>NebulaApp.setTab('finishing'));await p.screenshot({path:qa+'customization-'+mode+'-ui.png',fullPage:true});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.setViewportSize({width:1100,height:1000});
 }
 assert.deepEqual(errors,[]);console.log('PASS consolidated UI: levels 0–3, independent sprays, toys + bow + pumpkin, actual drag in 3 modes, initials only top views, all compatible paper styles, links, sheets, mobile.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
