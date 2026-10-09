const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const dir=__dirname,base='http://127.0.0.1:8765/builder/',checks=[],errors=[];
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail??'');}
const savePNG=(name,data)=>fs.writeFileSync(path.join(dir,name),Buffer.from(data.split(',')[1],'base64'));
async function load(p){await p.goto(base);await p.waitForFunction(()=>window.NebulaApp?.ready);}
async function design(p,mode,n){return p.evaluate(async({mode,n})=>{
 const s=NebulaApp.createScenario(mode,Array(n).fill('__berry'));s.finishes.paper='ivory';s.title='';s.note='';NebulaApp.setState(s);NebulaApp.setFocusPreview(false);NebulaApp.stopBrush();await NebulaRenderer.awaitAssets(s);NebulaApp.render();
 const sc=NebulaApp.scene(),v=NebulaRenderer.view(s),cv=NebulaRenderer.makeCanvas();NebulaRenderer.paint(cv,s);
 const geometry=sc.nodes.map(n=>{const {url,meta,...rest}=n;return rest;});
 return {state:s,geometry,frame:sc.frame,collar:sc.collar,view:v,price:NebulaModel.price(s),picture:cv.toDataURL(),urls:sc.nodes.map(n=>n.url),alpha:NebulaApp.alphaReport(),code:NebulaLink.encode(s)};
 },{mode,n});}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const opts={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1};
 const before=await browser.newContext(opts);await before.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:8765')return r.abort();
  const file=path.join(dir,'baseline',path.basename(u.pathname));
  if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({body:fs.readFileSync(file),contentType:'text/javascript'});
  return r.continue();
 });
 const bp=await before.newPage();await load(bp);const old={};
 old.heart=await design(bp,'heart',41);old.classic=await design(bp,'classic',14);
 for(const n of [30,44,62])old[n]=await design(bp,'dome',n);
 await before.close();
 const ctx=await browser.newContext(opts),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());await load(p);
 const evidence=[],unchanged={heart:await design(p,'heart',41),classic:await design(p,'classic',14)};
 for(const n of [30,44,62]){
  const next=await design(p,'dome',n),prior=old[n];
  const placement=nodes=>nodes.map(({uid,id,slot,x,y,w,h,d,bright,depth,core,radiusCap})=>({uid,id,slot,x,y,w,h,d,bright,depth,core,radiusCap})).sort((a,b)=>a.uid.localeCompare(b.uid));
  check(n+' positions, dimensions, paper, framing and price unchanged',JSON.stringify([placement(next.geometry),next.frame,next.collar,next.view,next.price])===JSON.stringify([placement(prior.geometry),prior.frame,prior.collar,prior.view,prior.price]));
  const variants=[...new Set(next.urls)];
  check(n+' uses three natural strawberry assets with small rotations',variants.length===3&&next.urls.every(u=>u.includes('strawberry-natural-'))&&next.geometry.every(g=>Math.abs(g.rot)<=.30),{variants:variants.length,openPercent:next.alpha.openPercent});
  check(n+' picture changed, with every paid berry still represented',next.picture!==prior.picture&&next.geometry.length===n);
  await p.waitForTimeout(4500);await p.screenshot({path:path.join(dir,'phone-'+n+'.png')});
  check(n+' phone is normal view and has no strawberry title',await p.evaluate(()=>innerWidth===390&&!document.body.classList.contains('preview-focus')&&NebulaApp.state.title===''&&!document.querySelector('#designName').value));
  const exports=await p.evaluate(async()=>{
   const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s),b=NebulaRenderer.artBounds(s,sc);
   // Unlabelled art proof: same drawArt and bounds used in production export.
   // Only framing onto an empty 1080px canvas; no fruit/layout mutation.
   const cv=NebulaRenderer.makeCanvas(1080,1080),c=cv.getContext('2d');c.fillStyle='#f7f3eb';c.fillRect(0,0,1080,1080);
   const scale=Math.min(960/b.w,960/b.h);c.translate((1080-b.w*scale)/2-b.x*scale,(1080-b.h*scale)/2-b.y*scale);c.scale(scale,scale);NebulaRenderer.drawArt(c,s,{scene:sc});
   return {art:cv.toDataURL(),production:NebulaApp.exportCanvas(1080,1080).toDataURL()};
  });
  savePNG('export-'+n+'.png',exports.art);savePNG('production-export-'+n+'.png',exports.production);
  fs.writeFileSync(path.join(dir,'design-'+n+'.json'),JSON.stringify(next.state,null,2));
  evidence.push({n,url:base+'index.html#b='+next.code,variants,alpha:next.alpha});
 }
 for(const [mode,n] of [['heart',41],['classic',14]]){
  const next=unchanged[mode];
  savePNG(mode+'-before.png',old[mode].picture);savePNG(mode+'-after.png',next.picture);
  check(mode+' saved berry artwork and pricing preserved exactly',next.picture===old[mode].picture&&JSON.stringify(next.price)===JSON.stringify(old[mode].price),{sameGeometry:JSON.stringify(next.geometry)===JSON.stringify(old[mode].geometry),sameUrls:JSON.stringify(next.urls)===JSON.stringify(old[mode].urls),samePrice:JSON.stringify(next.price)===JSON.stringify(old[mode].price)});
 }
 // New Classic choices withdrawn, old Classic links and edit/delete still work.
 await design(p,'classic',14);
 await p.selectOption('#family','all');await p.fill('#flowerSearch','straw');
 const classicUI=await p.evaluate(()=>({mode:NebulaApp.state.mode,cards:document.querySelectorAll('[data-flower=__berry]').length,recipes:document.querySelectorAll('[data-recipe=strawberry]').length,disabled:document.querySelector('#family option[value=strawberry]').disabled,offered:NebulaConfig.CAT.__berry.classicOffered}));
 check('No Classic strawberry card, family option or featured recipe',classicUI.cards===0&&classicUI.recipes===0&&classicUI.disabled,classicUI);
 check('Model blocks new Classic berries without mutating a design',await p.evaluate(()=>{
  const s=NebulaModel.create(),original=JSON.stringify(s),a=NebulaModel.add(s,'__berry'),r=NebulaModel.replace(s,s.items[0].uid,'__berry');return !a.ok&&!r.ok&&JSON.stringify(s)===original;
 }));
 const legacyCode=old.classic.code;await p.goto(base+'index.html#b='+legacyCode);await p.reload();await p.waitForFunction(()=>window.NebulaApp?.ready);
 check('Existing Classic berry link keeps quantities and price',await p.evaluate(()=>NebulaModel.counts(NebulaApp.state).__berry===14&&NebulaModel.price(NebulaApp.state).totalCents===7700));
 check('Legacy Classic berry delete and Undo remain available',await p.evaluate(()=>{const before=NebulaApp.state;NebulaApp.remove(before.items[0].uid);const ok=NebulaApp.state.items.length===13;NebulaApp.undo();return ok&&JSON.stringify(before)===JSON.stringify(NebulaApp.state);}));
 await p.goto(evidence[1].url);await p.reload();await p.waitForFunction(()=>window.NebulaApp?.ready);
 const s=await p.evaluate(()=>NebulaApp.state);await p.evaluate(()=>NebulaApp.remove('b1'));
 check('Dome deletion updates count and deducts $3',await p.evaluate(()=>NebulaApp.state.items.length===43&&NebulaModel.price(NebulaApp.state).totalCents===16400));
 await p.evaluate(()=>NebulaApp.undo());check('Dome Undo restores the exact state',await p.evaluate(s=>JSON.stringify(s)===JSON.stringify(NebulaApp.state),s));
 check('PNG download can include all new assets',await p.evaluate(async()=>{const blob=await NebulaApp.exportBlob(1080,1080);return blob.size>100000;}));
 check('No browser errors',errors.length===0,errors);await ctx.close();
 const offline=await browser.newContext(opts);await offline.setOffline(true);const fp=await offline.newPage();await fp.goto(require('url').pathToFileURL(path.resolve(dir,'../../index.html')).href+'#b='+evidence[1].url.split('#b=')[1]);await fp.waitForFunction(()=>window.NebulaApp?.ready);
 check('Offline file preview/export includes new Dome artwork',await fp.evaluate(async()=>{await NebulaRenderer.awaitAssets(NebulaApp.state);const blob=await NebulaApp.exportBlob(1080,1080);return blob.size>100000&&NebulaApp.scene().nodes.every(n=>n.url.includes('strawberry-natural-'));}));await offline.close();
 fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks},null,2));}
 if(checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
