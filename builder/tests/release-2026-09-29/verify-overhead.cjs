const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const checks=[],errors=[],out=__dirname;
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail??'');}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8765/builder/tests/release-2026-09-29/preview-dome-berries.html');
 await p.waitForFunction(()=>window.NebulaApp?.ready);
 await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);NebulaApp.render();});
 check('Preview has exactly 44 individually priced berries and ivory paper',await p.evaluate(()=>{
  const s=NebulaApp.state,pr=NebulaModel.price(s);return s.mode==='dome'&&s.items.length===44&&NebulaModel.counts(s).__berry===44&&s.finishes.paper==='ivory'&&pr.flowersCents===13200&&pr.totalCents===16700;
 }));
 check('Three Dome berry cutouts and the white ruffled collar render',await p.evaluate(()=>{const sc=NebulaApp.scene();return new Set(sc.nodes.map(n=>n.url)).size===3&&sc.nodes.every(n=>n.url.includes('strawberry-natural-'))&&sc.collar.url.endsWith('dome-ivory-ruffle.webp');}));
 check('Each cutout has real alpha; collar centre is open',await p.evaluate(()=>{
  return [...Array.from({length:3},(_,i)=>'assets/heads/strawberry-natural-'+(i+1)+'.webp'),'assets/wrapping/dome-ivory-ruffle.webp'].every(url=>{
   const im=NebulaRenderer.image(url),cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const c=cv.getContext('2d');c.drawImage(im,0,0);
   const corner=c.getImageData(0,0,1,1).data[3],centre=c.getImageData(cv.width/2,cv.height/2,1,1).data[3];
   return corner===0&&(url.includes('wrapping')?centre===0:centre>=250);
  });
 }));
 const before=await p.evaluate(()=>({s:NebulaApp.state,price:NebulaModel.price(NebulaApp.state).totalCents,nodes:NebulaApp.scene().nodes.map(n=>({uid:n.uid,url:n.url,rot:n.rot,x:n.x,y:n.y}))}));
 // Actual tap and delete on the visible centre fruit.
 const point=await p.evaluate(()=>{const sc=NebulaApp.scene(),n=sc.nodes.reduce((a,b)=>Math.hypot(a.x-360,a.y-390)<Math.hypot(b.x-360,b.y-390)?a:b),r=document.querySelector('#bouquet').getBoundingClientRect(),v=NebulaRenderer.view(NebulaApp.state);return {uid:n.uid,x:r.x+(n.x*v.scale+v.x)*r.width/720,y:r.y+(n.y*v.scale+v.y)*r.height/820};});
 await p.mouse.click(point.x,point.y);check('Visible fruit can be selected',await p.evaluate(()=>!!NebulaApp.selected));
 await p.click('#inlineDelete');
 check('Deleting one berry leaves an empty slot and deducts $3',await p.evaluate(old=>NebulaApp.state.items.length===43&&NebulaApp.state.template.capacity===44&&NebulaModel.price(NebulaApp.state).totalCents===old-300,before.price));
 check('Deletion preserves the remaining berry positions and variants',await p.evaluate(old=>NebulaApp.scene().nodes.every(n=>{const o=old.find(a=>a.uid===n.uid);return o&&n.url===o.url&&n.rot===o.rot&&n.x===o.x&&n.y===o.y;}),before.nodes));
 const hole=await p.evaluate(()=>NebulaApp.alphaReport().openPercent);check('An empty slot remains visibly empty',hole>0.1,hole);
 await p.click('#undo');check('Undo restores the exact design and price',await p.evaluate(old=>JSON.stringify(NebulaApp.state)===JSON.stringify(old.s)&&NebulaModel.price(NebulaApp.state).totalCents===old.price,before));
 for(const n of [15,30,44,62,84]){
  const result=await p.evaluate(async n=>{const s=NebulaApp.createScenario('dome',Array(n).fill('__berry'));s.finishes.paper='ivory';NebulaApp.setState(s);await NebulaRenderer.awaitAssets(s);NebulaApp.render();
   const sc=NebulaApp.scene(),v=NebulaRenderer.view(s),c=sc.collar;
   const fits=(c.x-c.w/2)*v.scale+v.x>=0&&(c.x+c.w/2)*v.scale+v.x<=720&&(c.y-c.h/2)*v.scale+v.y>=0&&(c.y+c.h/2)*v.scale+v.y<=820;
   return {fits,open:NebulaApp.alphaReport().openPercent,count:s.items.length,rot:sc.nodes.every(n=>Math.abs(n.rot)<=.30)};
  },n);
  check(n+'-berry Dome fits, keeps its count, and has no large interior gaps',result.fits&&result.count===n&&result.rot&&result.open<2,result);
 }
 await p.evaluate(s=>NebulaApp.setState(s),before.s);
 const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 await p.goto('http://127.0.0.1:8765/builder/index.html#b='+code);await p.reload();await p.waitForFunction(()=>window.NebulaApp?.ready);
 check('Shared link retains all quantities, mode and paper',await p.evaluate(()=>NebulaApp.state.mode==='dome'&&NebulaApp.state.items.length===44&&NebulaApp.state.finishes.paper==='ivory'));
 for(const [width,height] of [[320,568],[390,844],[1440,1000]]){
  await p.setViewportSize({width,height});await p.screenshot({path:path.join(out,'overhead-'+width+'.png')});
  if(width>820)await p.locator('#orderButton').scrollIntoViewIfNeeded();
  check(width+'px has no horizontal overflow and an accessible order control',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#orderButton').getBoundingClientRect().bottom<=innerHeight));
 }
 const data=await p.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);return NebulaApp.exportCanvas(1080,1080).toDataURL();});const png=Buffer.from(data.split(',')[1],'base64');
 fs.writeFileSync(path.join(out,'overhead-export.png'),png);check('Export is a complete 1080px PNG',png.readUInt32BE(16)===1080&&png.readUInt32BE(20)===1080&&png.length>100000);
 await context.close();
 const offline=await browser.newContext();await offline.setOffline(true);const fp=await offline.newPage();
 await fp.goto(require('url').pathToFileURL(path.resolve(out,'../../index.html')).href+'#b='+code);await fp.waitForFunction(()=>window.NebulaApp?.ready);
 check('Offline file preview/export includes the berries and white paper',await fp.evaluate(async()=>{
  const b=await NebulaApp.exportBlob(1080,1080);return b.size>100000&&NebulaApp.scene().nodes.every(n=>n.url.includes('strawberry-natural-'))&&NebulaApp.scene().collar.url.endsWith('dome-ivory-ruffle.webp');
 }));await offline.close();check('No browser errors',errors.length===0,errors);
 }finally{await browser.close();fs.writeFileSync(path.join(out,'overhead-results.json'),JSON.stringify({passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks},null,2));}
 if(checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
