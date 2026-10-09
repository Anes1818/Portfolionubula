const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
const out=__dirname+'/connected-options';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261009a');await p.waitForFunction(()=>window.NebulaApp?.ready);await p.waitForFunction(()=>document.querySelectorAll('[data-preview]:not(:disabled)').length===10);
 assert.equal(await p.locator('.catalog-photo').count(),9);
 for(const id of ['pink-promise','written-in-roses','always-you','scream-for-you','forever-my-boo','midnight-blooms','autumn-latte','october-cream','harvest-sunshine']){
  const img=p.locator('[data-preview='+id+'] img');await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());
  await p.locator('[data-preview='+id+']').click();assert((await p.locator('#collectionPreviewImage').getAttribute('src')).endsWith(id+'.jpg'));
  await p.locator('#collectionPreviewDesign').click();assert(await p.evaluate(id=>document.querySelector('[data-preview="'+id+'"] canvas').toDataURL()===document.querySelector('#collectionPreviewImage').src,id));await p.keyboard.press('Escape');
 }
 console.log('PASS Nine supplied style images map to the correct recipes and switch to exact editable previews');
 await p.evaluate(()=>NebulaApp.applyFallTemplate('scream-for-you'));await p.locator('#tab-finishing').click();
 const before=await p.evaluate(()=>JSON.stringify(NebulaApp.state)),price=await p.evaluate(()=>NebulaModel.price(NebulaApp.state).totalCents);
 await p.locator('#spookyMask').uncheck();
 assert(await p.evaluate(price=>{const s=NebulaApp.state,R=NebulaRenderer,cv=R.alphaCanvas(s),c=cv.getContext('2d'),data=c.getImageData(320,330,80,120).data;let filled=0;for(let i=3;i<data.length;i+=4)if(data[i]>180)filled++;return filled/(80*120)>.95&&s.items.length===30&&NebulaModel.price(s).totalCents===price-NebulaConfig.CONFIG.extrasCents.spookyMask&&!R.scene(s).finishes.some(n=>n.uid==='scream-mask');},price));
 const png=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(1080,1080)).arrayBuffer())));fs.writeFileSync(out+'/mask-removed.png',Buffer.from(png));
 const unmasked=await p.evaluate(()=>JSON.stringify(NebulaApp.state));await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),before);await p.locator('#redo').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),unmasked);
 console.log('PASS Mask removal fills more than 95% of its central opening with the same 30 roses; price and undo/redo agree');
 await p.locator('[data-detail=kitty]').click();assert(await p.evaluate(()=>NebulaApp.scene().finishes.some(n=>n.detailId==='kitty')&&NebulaModel.price(NebulaApp.state).extraLines.some(n=>n.id==='kitty')));
 await p.locator('#sash').selectOption('blank_cocoa');await p.locator('#cocoaBow').check();await p.locator('#pumpkin').check();
 assert(await p.evaluate(()=>!!NebulaModel.validate(NebulaApp.state)));await p.screenshot({path:out+'/shared-details.png',fullPage:true});
 const report=await p.evaluate(async()=>{const results=[];for(const collection of [NebulaRomance,NebulaSpooky,NebulaFall])for(const recipe of collection.recipes){const s=collection.create(recipe.id);
  Object.assign(s.finishes,{decorations:[NebulaDetails.create('kitty')],spookyMask:false,spookyBow:true,ghostCount:2,thistleCount:2,fillerCount:2,greeneryCount:2,initial:'B',crown:true,butterfly:2,pumpkin:true,bow:true,sash:'blank_cocoa',sashText:'Together',paper:'cocoa',greenRim:true});
  NebulaModel.syncTemplate(s);await NebulaRenderer.awaitAssets(s);const d=NebulaLink.decode(NebulaLink.encode(s))?.design,sc=NebulaRenderer.scene(s),cost=NebulaModel.price(s);
  results.push({id:recipe.id,valid:!!NebulaModel.validate(s),shared:!!d&&JSON.stringify(sc)===JSON.stringify(NebulaRenderer.scene(d))&&JSON.stringify(cost)===JSON.stringify(NebulaModel.price(d)),fits:(()=>{const b=NebulaRenderer.artBounds(s,sc),v=NebulaRenderer.view(s);return b.x*v.scale+v.x>=0&&b.y*v.scale+v.y>=0&&(b.x+b.w)*v.scale+v.x<=720&&(b.y+b.h)*v.scale+v.y<=820;})(),kitty:sc.finishes.some(n=>n.detailId==='kitty'),thistles:sc.filler.filter(n=>n.url.includes('blue-thistle')).length,greenery:sc.greenery.length,rim:sc.nodes.some(n=>n.decorative),priced:['kitty','spookyBow','ghostCount','thistleCount','filler','interiorGreenery','floralInitial','crown','butterfly','pumpkin','bow','sash','greenRim'].every(id=>cost.extraLines.some(n=>n.id===id))});
 }return results;});
 for(const r of report)assert(r.valid&&r.shared&&r.fits&&r.kitty&&r.thistles===2&&r.greenery===2&&r.rim&&r.priced,JSON.stringify(r));console.log('PASS All ten recipes support shared toys, ribbons, greenery, fillers and seasonal extras with matching prices and saved links');
 await p.evaluate(()=>NebulaApp.applyFallTemplate('harvest-sunshine'));assert(await p.evaluate(()=>NebulaApp.scene().nodes.filter(n=>n.id==='sunflower').length===4));
 const harvest=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(1080,1080)).arrayBuffer())));fs.writeFileSync(out+'/harvest.png',Buffer.from(harvest));
 for(const width of [320,390]){await p.setViewportSize({width,height:844});await p.evaluate(()=>NebulaApp.applyFallTemplate('scream-for-you'));await p.locator('#tab-finishing').click();await p.locator('[data-detail=kitty]').scrollIntoViewIfNeeded();assert(await p.locator('[data-detail=kitty]').isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/phone-'+width+'.png'});}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log('PASS Four Harvest sunflowers remain visible; phone controls fit; no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
