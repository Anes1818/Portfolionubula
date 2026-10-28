require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',qa='.private/qa/la-flor-eterna/next-phase/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1100,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 await p.evaluate(()=>NebulaApp.setState(NebulaSunflower.create()));await p.waitForFunction(()=>NebulaApp.ready);
 const before=await p.evaluate(()=>({state:NebulaApp.state,scene:NebulaApp.scene(),view:NebulaRenderer.view(NebulaApp.state,NebulaApp.camera)}));
 const rect=await p.locator('#bouquet').boundingBox(),n=before.scene.nodes.find(n=>n.uid==='b1'),v=before.view;
 const point=(x,y)=>({x:rect.x+(x*v.scale+v.x)*rect.width/720,y:rect.y+(y*v.scale+v.y)*rect.height/820});
 const a=point(n.x,n.y),z=point(n.x-65,n.y-35);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:12});await p.mouse.up();
 const after=await p.evaluate(()=>({state:NebulaApp.state,scene:NebulaApp.scene(),view:NebulaRenderer.view(NebulaApp.state,NebulaApp.camera)}));
 assert.notDeepEqual(after.state.items[0].anchors,before.state.items[0].anchors,'real pointer drag moves the selected flower');
 assert.deepEqual(after.view,before.view,'drag must not refit camera');assert.deepEqual(after.scene.collar,before.scene.collar,'paper stays anchored');
 for(const it of before.state.items.slice(1))assert.deepEqual(after.state.items.find(n=>n.uid===it.uid).anchors,it.anchors,'other flowers stay still');
 await p.evaluate(()=>NebulaApp.chooseFlower('rose_pink'));
 const roseTarget=point(430,290);await p.mouse.click(roseTarget.x,roseTarget.y);await p.waitForFunction(()=>NebulaApp.ready);
 assert.equal(await p.evaluate(()=>NebulaApp.state.items.find(n=>n.uid==='b2').id),'rose_pink','tap replaces only the chosen flower');
 assert.ok(await p.evaluate(()=>NebulaApp.add('lily').ok));
 assert.equal(await p.evaluate(()=>NebulaApp.state.items.filter(n=>n.id==='sunflower').length),6);
 // Exercise the real optional-gift UI in every layout, and reconstruct each link.
 for(const mode of ['classic','dome','heart']){
  await p.evaluate(mode=>{NebulaApp.setState(mode==='classic'?NebulaSunflower.create():NebulaModel.defaultMode(mode));NebulaApp.setTab('finishing');},mode);await p.waitForFunction(()=>NebulaApp.ready);
  const price=await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents);
  await p.locator('#chocolateBox').check();await p.waitForFunction(()=>NebulaApp.ready);
  const gift=await p.evaluate(()=>{const s=NebulaApp.state,c=NebulaLink.encode(s),r=NebulaLink.decode(c).design;return {code:c,yes:r.finishes.chocolateBox,price:NebulaModel.price(s).totalCents,box:NebulaApp.scene().finishes.some(n=>n.uid==='chocolate-box'),items:s.items.length};});
  assert.ok(gift.yes&&gift.box);assert.equal(gift.price-price,1500);
  await p.locator('#chocolateBox').uncheck();await p.waitForFunction(()=>NebulaApp.ready);assert.equal(await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents),price);
  await p.evaluate(code=>NebulaApp.setState(NebulaLink.decode(code).design),gift.code);await p.waitForFunction(()=>NebulaApp.ready);
  const sheet=await b.newPage();await sheet.goto(base+'order.html#b='+gift.code);await sheet.waitForFunction(()=>!document.getElementById('orderSheet').hidden);assert.match(await sheet.locator('body').innerText(),/Chocolate gift box/);await sheet.close();
  const png=await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportCanvas(900,1025)).toDataURL();});fs.writeFileSync(qa+'gift-'+mode+'.png',Buffer.from(png.split(',')[1],'base64'));
  if(mode==='classic')fs.writeFileSync(qa+'sunflower-gift-link.txt',base+'studio.html#b='+gift.code+'\n');
 }
 await p.goto(fs.readFileSync(qa+'sunflower-gift-link.txt','utf8').trim());await p.reload();await p.waitForFunction(()=>window.__ready);assert.ok(await p.evaluate(()=>NebulaApp.state.finishes.chocolateBox&&NebulaApp.state.mode==='classic'));
 for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await p.locator('#focusPreview').click();await p.screenshot({path:qa+'sunflower-gift-mobile.png'});assert.deepEqual(errors,[]);
 console.log('PASS real pointer drag independently; stable camera/paper; replace rose, add lily; optional chocolate UI/pricing/remove/link/export/order sheet in Classic, Dome, Heart; 320/390px');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
