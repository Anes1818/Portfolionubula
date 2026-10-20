/* Real browser checks for Classic placement, recipe routing and wrapping finishes. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const out=process.env.QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'nebula-classic-'));
fs.mkdirSync(out,{recursive:true});
const base=process.env.BUILDER_URL||'http://127.0.0.1:4173/builder/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=async()=>{try{await page.waitForFunction(()=>window.__ready,null,{timeout:45000});}catch(e){console.error(await page.evaluate(()=>({errors:window.__errors,startup:document.querySelector('#startupError')?.innerText})));throw e;}};
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  for(const id of ['midnight-blooms']){
   await page.goto(base+'studio.html?template='+id);await ready();
   const data=await page.evaluate(async()=>{
    const s=NebulaApp.state,M=NebulaModel;await NebulaRenderer.awaitAssets(s);
    const sc=NebulaRenderer.scene(s),copy=M.validate(M.clone(s));
    const cv=await NebulaApp.exportCanvas(720,820),decoded=NebulaLink.decode(NebulaLink.encode(s))?.design;
    return {title:s.title,mode:s.mode,n:s.items.length,valid:!!copy,roundtrip:!!decoded&&JSON.stringify(copy.items.map(i=>[i.id,i.anchors[copy.mode].x,i.anchors[copy.mode].y]))===JSON.stringify(decoded.items.map(i=>[i.id,i.anchors[decoded.mode].x,i.anchors[decoded.mode].y]))&&M.price(copy).totalCents===M.price(decoded).totalCents ,nodes:sc.nodes.map(n=>({id:n.id,x:n.x,y:n.y,w:n.w,h:n.h})),green:M.price(s).extraLines.find(l=>l.id==='greenRim'),png:cv.toDataURL('image/png')};
   });
   assert.equal(data.mode,'classic');assert.ok(data.valid);assert.ok(data.roundtrip);assert.equal(data.n,20);
   assert.ok(data.nodes.every(n=>[n.x,n.y,n.w,n.h].every(Number.isFinite)));
   fs.writeFileSync(path.join(out,id+'.png'),Buffer.from(data.png.split(',')[1],'base64'));
   await page.screenshot({path:path.join(out,id+'-desktop.png')});
   const encoded=await page.evaluate(()=>NebulaModel.validate(NebulaApp.state));await page.reload();await ready();
   assert.deepEqual(await page.evaluate(()=>NebulaModel.validate(NebulaApp.state)),encoded);
   for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));}
   await page.screenshot({path:path.join(out,id+'-mobile.png')});await page.setViewportSize({width:1440,height:1000});
   console.log('PASS recipe, save/share validation, export and responsive layout:',id);
  }
  for(const preset of ['romantic','pureWhite','allYellow']){
   const png=await page.evaluate(async key=>{NebulaApp.setState(NebulaModel.create(key));await NebulaRenderer.awaitAssets(NebulaApp.state);return (await NebulaApp.exportCanvas(720,820)).toDataURL('image/png').split(',')[1];},preset);
   fs.writeFileSync(path.join(out,preset+'.png'),Buffer.from(png,'base64'));
  }
  const checks=await page.evaluate(()=>{
   const M=NebulaModel,G=NebulaGeometry,out=[];
   const check=(name,value)=>{if(!value)throw Error(name);out.push(name);};
   for(const [key,preset] of Object.entries(NebulaConfig.PRESETS)){
    const s=M.create(key);check(key+' validates',!!M.validate(M.clone(s)));
    check(key+' deterministic',JSON.stringify(s)===JSON.stringify(M.create(key)));
    check(key+' respects paper bounds',s.items.every(it=>{const p=it.anchors.classic,q=G.constrainClassic(p,s.frames.classic,it.id);return p.x===q.x&&p.y===q.y;}));
   }
   const s=NebulaClassic.create('midnight-blooms');
   const reshuffle=M.create('romantic'),original=JSON.stringify(reshuffle.items.map(i=>i.anchors));reshuffle.seed++;M.arrange(reshuffle,'classic',{fresh:true});check('Arrange refreshes the gathered layout',original!==JSON.stringify(reshuffle.items.map(i=>i.anchors)));
   const anchors=JSON.stringify(s.items.map(i=>i.anchors));const added=M.add(s,'rose_pink');
   check('Classic can add a stem',added.ok);check('Adding preserves existing anchors',anchors===JSON.stringify(s.items.slice(0,-1).map(i=>i.anchors)));
   const uid=s.items.at(-1).uid;check('New bloom can move',M.move(s,uid,{x:355,y:405}).ok);
   check('New bloom can be replaced',M.replace(s,uid,'rose_white').ok);check('New bloom can be removed',M.remove(s,uid).ok);
   const full=M.empty();full.items=Array.from({length:32},()=>M.newItem(full,'rose_red'));M.arrange(full,'classic',{fresh:true});
   const before=JSON.stringify(full);check('Over-capacity add is rejected',!M.add(full,'lily').ok);check('Rejected add does not mutate design',JSON.stringify(full)===before);
   const nodes=G.nodes(full).nodes;check('Dense Classic has no stacked centres',nodes.every((n,i)=>nodes.slice(i+1).every(q=>Math.hypot(n.x-q.x,n.y-q.y)>25)));
   const legacy=NebulaSpooky.create('midnight-blooms');check('Legacy Dome Midnight still validates',!!M.validate(M.clone(legacy))&&legacy.mode==='dome');
   const old=M.create('romantic'),oldLayout=G.arrange(old.items,'classic',old.seed,old.finishes.paper);old.frames.classic=oldLayout.frame;old.items.forEach(it=>it.anchors.classic=oldLayout.positions[it.uid]);
   check('Legacy Classic still validates without adopting the new frame',!!M.validate(M.clone(old))&&!M.validate(M.clone(old)).frames.classic.engine);
   const malformed=M.clone(s);malformed.frames.classic.unit=999;check('Invalid gathered frame is rejected',M.validate(malformed)===null);
   const h=NebulaClassic.create('midnight-blooms');h.finishes.greenRim=true;const price=M.price(h).totalCents,positions=JSON.stringify(h.items);h.finishes.greenRim=false;
   check('Greenery removal updates estimate',M.price(h).totalCents<price);check('Greenery removal preserves rose layout',JSON.stringify(h.items)===positions);
   return out;
  });
  checks.forEach(c=>console.log('PASS',c));
  await page.goto(base+'?collection=classic');await page.locator('[data-filter="classic"][aria-pressed="true"]').waitFor();
  assert.equal(await page.locator('.bouquet-card:visible').count(),1);
  await page.locator('[data-id="midnight-blooms"] .customize-link').click();await page.waitForFunction(()=>window.__ready);
  assert.equal(await page.evaluate(()=>NebulaApp.state.mode),'classic');
  const before=await page.evaluate(()=>{NebulaApp.setState(NebulaModel.create('pureWhite'));return NebulaApp.state;});
  await page.locator('#startingPanel summary').click();await page.locator('[data-recipe="midnight-blooms"]').click();await page.locator('#confirmCancel').click();
  assert.deepEqual(await page.evaluate(()=>NebulaApp.state),before);
  await page.locator('[data-recipe="midnight-blooms"]').click();await page.locator('#confirmYes').click();
  assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Midnight Blooms');
  await page.evaluate(()=>NebulaApp.undo());assert.deepEqual(await page.evaluate(()=>NebulaApp.state),before);
  await page.evaluate(()=>NebulaApp.redo());assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Midnight Blooms');
  console.log('PASS Classic catalog filter, starting recipe confirmation, undo and redo');
  const offline=await browser.newPage();
  for(const id of ['midnight-blooms']){
   await offline.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../studio.html')).href+'?template='+id);
   await offline.waitForFunction(()=>window.__ready,null,{timeout:60000});
   assert.ok(await offline.evaluate(async()=>(await NebulaApp.exportBlob(360,410)).size>10000));
   console.log('PASS new recipe exports offline:',id);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS no runtime errors. Artifacts:',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
