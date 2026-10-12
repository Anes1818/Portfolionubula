const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'mask-and-links');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8767/builder/?v=20261011a');await p.waitForFunction(()=>window.NebulaApp?.ready);
 const report=await p.evaluate(()=>{
  const report=[],R=NebulaRenderer,M=NebulaModel,L=NebulaLink; const stable=v=>JSON.stringify(v,(k,x)=>x&&!Array.isArray(x)&&typeof x==="object"?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
  for(const collection of [NebulaRomance,NebulaSpooky,NebulaFall])for(const recipe of collection.recipes){
   const s=collection.create(recipe.id);s.finishes.spookyMask=false;const original=JSON.stringify(R.scene(s).nodes),count=s.items.length,price=M.price(s).totalCents,finishes=M.clone(s.finishes);
   s.finishes.spookyMask=true;s.finishes.sash='blank_blackband';s.finishes.sashText='Together 🖤 للأبد';
   for(const position of ['auto','low','diagonal'])for(const offset of [-60,0,60]){
    s.finishes.sashPlacement=position;s.finishes.sashOffset=offset;
    const sc=R.scene(s),mask=sc.finishes.find(n=>n.url.includes('scream-mask')),sash=sc.finishes.find(n=>n.uid==='sash');
    if(!mask||!sash)throw Error('Missing finishes '+recipe.id);
    if(sash.y-(Math.abs(Math.sin(sash.rot))*sash.w+Math.abs(Math.cos(sash.rot))*sash.h)/2<mask.y+mask.h/2+7.9)throw Error('Band crosses mask '+recipe.id);
    for(const n of sc.nodes.filter(n=>s.items.some(it=>it.uid===n.uid))){
     if(Math.hypot((n.x-mask.x)/(mask.w/2+n.w*.42+6),(n.y-mask.y)/(mask.h/2+n.h*.42+6))<.9999)throw Error('Flower behind mask '+recipe.id);
     const slot=sc.slots.find(q=>q.slot===n.slot);if(slot.x!==n.x||slot.y!==n.y)throw Error('Detached hit target');
    }
   }
   const order={name:'Test customer',phone:'+10000000000',note:'Demo فقط 🌻',date:'2026-10-31'},code=L.encode(s,order),decoded=L.decode(code);
   if(!decoded||JSON.stringify(decoded.order)!==JSON.stringify(order)||JSON.stringify(R.scene(decoded.design))!==JSON.stringify(R.scene(s)))throw Error('Link drift '+recipe.id);
   if(s.items.length!==count)throw Error('Lost paid flowers');
   s.finishes=finishes;if(JSON.stringify(R.scene(s).nodes)!==original||M.price(s).totalCents!==price)throw Error('Restore failed '+recipe.id);
   report.push({recipe:recipe.id,flowers:count,linkCodeLength:code.length});
  }
  for(const mode of ['classic','dome','heart']){const s=M.defaultMode(mode),scene=stable(R.scene(s)),d=L.decode(L.encode(s));if(!d||scene!==stable(R.scene(d.design)))throw Error('Mode roundtrip '+mode);}
  const movable=NebulaRomance.create('pink-promise');movable.finishes.spookyMask=true;
  const slots=R.scene(movable).slots,from=movable.items[0],target=slots.find(q=>q.slot!==from.slot);
  const moved=M.move(movable,from.uid,{x:target.x,y:target.y});if(!moved.ok||moved.slot!==target.slot)throw Error('Move ignored mask layout');
  // Exercise arbitrary mixed designs, escaped text and hand-placed Classic stems.
  for(let i=0;i<60;i++){
   const s=M.defaultMode(['classic','dome','heart'][i%3]);s.seed=100+i;s.title='Test '+i+' 🌷';s.note='A/B & C? # '+i+' ورد';
   if(s.mode==='classic'){s.items[0].anchors.classic.x+=i/10;s.items[0].anchors.classic.manual=true;}
   else{s.template.overrides[0]='rose_white';M.syncTemplate(s);}
   const a=stable(R.scene(s)),d=L.decode(L.encode(s));if(!d||a!==stable(R.scene(d.design))||d.design.title!==s.title||d.design.note!==s.note)throw Error('Mixed design roundtrip '+i);
  }
  const old=btoa(JSON.stringify({v:6,m:'dome',s:11,c:30,f:[['rose_red',30]]}));if(!L.decode(old))throw Error('Old link rejected');
  for(const code of ['z1_','z1_AQAA_w','z1_'+btoa(String.fromCharCode(1,0,0,5)),'x'.repeat(24001)])if(L.decode(code)!==null)throw Error('Invalid link accepted');
  return report;
 });console.log('PASS mask spacing, all sash positions, stable counts, exact shared scenes and Unicode for ten recipes');console.log(report);
 await p.evaluate(()=>{NebulaApp.applyFallTemplate('pink-promise');NebulaApp.setTab('finishing');});
 const initial=await p.evaluate(()=>JSON.stringify(NebulaApp.state));await p.locator('#spookyMask').check();
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(NebulaApp.state)),initial);await p.locator('#redo').click();assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.spookyMask),true);
 await p.locator('#sash').selectOption('blank_blackband');await p.locator('#sashText').fill('FOREVER MY BOO');await p.locator('#sashText').blur();
 const png=await p.evaluate(async()=>Array.from(new Uint8Array(await(await NebulaApp.exportBlob(1080,1080)).arrayBuffer())));fs.writeFileSync(path.join(out,'mask-sash.png'),Buffer.from(png));
 await p.screenshot({path:path.join(out,'phone.png')});
 const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state,{name:'Test customer',note:'Demo فقط 🌻'}));
 const fresh=await browser.newContext();const sheet=await fresh.newPage();await sheet.goto('http://127.0.0.1:8767/builder/order.html#b='+code);await sheet.waitForSelector('#orderSheet:not([hidden])');assert((await sheet.locator('#osCustomerList').innerText()).includes('Demo فقط 🌻'));
 await sheet.locator('#osOpenStudio').click();await sheet.waitForFunction(()=>window.NebulaApp?.ready);assert.equal(await sheet.evaluate(()=>NebulaApp.state.finishes.spookyMask),true);await fresh.close();
 console.log('PASS compact order link opens in a fresh browser and returns to the editable design');
 await p.evaluate(()=>{while(NebulaApp.history.undo)NebulaApp.undo();});
 assert(!errors.length,errors.join('\n'));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({report,errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
