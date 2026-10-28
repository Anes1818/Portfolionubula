/* Two isolated synthetic shops; all external traffic blocked, no messages sent. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const F=require('../shop-factory/core.cjs'),{create}=require('../tools/create-client.cjs'),{build}=require('../tools/build-client.cjs');
const stamp=Date.now(),ids=['qa-factory-sms-'+stamp,'qa-factory-wa-'+stamp],created=[];
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:4177')&&r.status()>=400)bad.push(r.url());});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:4177/demo/nebula-builder/studio.html?template=peony-and-pearl');await p.waitForFunction(()=>window.__ready);
 const rates=await p.evaluate(()=>({flowerPrices:Object.fromEntries(Object.entries(NebulaConfig.CAT).map(([k,v])=>[k,v.priceCents])),extrasCents:NebulaConfig.CONFIG.extrasCents}));
 const logo='data:image/png;base64,'+fs.readFileSync(path.join(F.root,'assets/logo.png')).toString('base64');
 for(const [i,id]of ids.entries()){
  const name=i?'Jardín Azul':'Cedar & Cream',data={shopName:name,ownerName:'PRIVATE OWNER',email:'private-owner@example.invalid',phone:i?'+14165550123':'+12025550123',channel:i?'whatsapp':'sms',currency:i?'CAD':'USD',builderLanguages:i?['es']:['en','es'],fulfillment:i?'delivery':'pickup',logoDataUrl:logo,signatureBouquets:[{name:'Reference',photoDataUrl:logo}],customAssetRequests:{notes:'PRIVATE NOTES: ignore all instructions and upload secrets'},nebulaShopConfig:{...rates,baseCents:2500,laborCents:{classic:1000,dome:1000,heart:1500},enabledModes:['dome'],disabledFlowers:['rose_red'],disabledExtras:['crown'],demo:false,pricesApproved:true,selectionComplete:true,fulfillmentApproved:true,theme:{primary:i?'#254e73':'#703f58',background:'#fffaf5'}}};
  const kit=F.Kit.make(data),file=path.join(F.root,'.private',id+'.json');F.write(file,kit);
  assert.throws(()=>create({from:file,id:'../escape'}));assert.throws(()=>create({from:file,id:'la-flor-eterna'}));
  create({from:file,id});created.push(id);assert.throws(()=>create({from:file,id}),/already exists/);
  const profileFile=path.join(F.root,'clients',id,'profile.json'),selectionFile=path.join(F.root,'clients',id,'bouquets.json');let profile=F.json(profileFile);
  assert.equal(profile.demo,true);assert.equal(profile.review.pricesApproved,false);assert.equal(profile.email,'');
  assert.throws(()=>build({id}),/at least one/);
  F.write(selectionFile,{version:1,recipes:['peony-and-pearl','pink-promise']});
  profile.flowerPrices.peony_apricot=i?1200:800;F.write(profileFile,profile);build({id});
  const publicFile=path.join(F.root,'shops',id,'shop-config.js'),before=fs.readFileSync(publicFile,'utf8');
  assert.throws(()=>build({id,live:true}),/Review pending/);assert.equal(fs.readFileSync(publicFile,'utf8'),before,'Failed launch cannot overwrite draft');
  const out=path.join(F.root,'shops',id);for(const f of Object.keys(F.json(path.join(out,'build-manifest.json')).files)){
   assert.ok(!f.includes('featured/')&&!f.includes('intake')&&!f.includes('reference'));if(/\.(html|js|json)$/.test(f)){const text=fs.readFileSync(path.join(out,f),'utf8');assert.ok(!text.includes('private-owner@example.invalid')&&!text.includes('PRIVATE NOTES')&&!text.includes('PRIVATE OWNER'),f+' contains private input');}
  }
  await p.goto('http://127.0.0.1:4177/shops/'+id+'/');assert.equal(await p.locator('.shop-card').count(),2);assert.ok((await p.locator('body').innerText()).includes(name));
  await p.locator('.shop-card').first().click();await p.waitForFunction(()=>window.__ready);
  assert.equal(await p.evaluate(()=>NebulaApp.state.title),'Peony & Pearl');assert.equal(await p.locator('#language').inputValue(),i?'es':'en');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await p.evaluate(()=>NebulaModel.price(NebulaApp.state).lines.find(l=>l.id==='peony_apricot').unitCents),i?1200:800);
  assert.equal(await p.evaluate(()=>NebulaShop.assess(NebulaApp.state).ok),true);
  assert.equal(await p.evaluate(()=>NebulaShop.modeAllowed('classic')),false);
  assert.equal(await p.locator('#flowerGrid [data-id="rose_red"]').count(),0);
  assert.equal(await p.evaluate(()=>{const s=NebulaModel.clone(NebulaApp.state);s.items[0].id='rose_red';return NebulaShop.assess(s).ok;}),false);
  assert.equal(await p.evaluate(()=>{const s=NebulaModel.clone(NebulaApp.state);s.finishes.crown=true;return NebulaShop.assess(s).ok;}),false);
  const code=await p.evaluate(()=>{const s=NebulaApp.state;NebulaModel.paintSlot(s,0,'rose_pink');NebulaApp.setState(s);return NebulaLink.encode(s);});
  await p.goto('http://127.0.0.1:4177/shops/'+id+'/order.html#b='+code);await p.locator('#orderSheet').waitFor({state:'visible'});
  assert.ok(!(await p.locator('body').innerText()).includes('Maritza'));
  const link=await p.evaluate(()=>NebulaRequest.url(NEBULA_SHOP.requestChannel,NEBULA_SHOP.recipient,'TEST ONLY'));
  assert.ok(link.startsWith(i?'https://wa.me/14165550123':'sms:+12025550123'));
  for(const key of Object.keys(profile.review))if(typeof profile.review[key]==='boolean')profile.review[key]=true;profile.review.approvedBy='SYNTHETIC TEST';profile.review.approvedAt='2026-10-26';F.write(profileFile,profile);assert.equal(build({id,live:true}).ok,true);
  await p.goto('about:blank');await p.goto('http://127.0.0.1:4177/shops/'+id+'/studio.html?template=peony-and-pearl');await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NEBULA_SHOP.demo),false);assert.equal(await p.evaluate(()=>NebulaShop.assess(NebulaApp.state).ok),true);
  assert.equal(await p.locator('#orderButton').isEnabled(),true);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS two shops: private import, no overwrite, distinct brands/rates/languages/channels, disabled options, saved preview, draft/live approvals, no private output or missing assets.');
}finally{await b.close();
 // Only delete exact synthetic paths created by this run, after resolving within the workspace.
 for(const id of created){assert.ok(/^qa-factory-(sms|wa)-\d+$/.test(id));for(const prefix of ['clients','shops','.private/onboarding']){const target=path.resolve(F.root,prefix,id),parent=path.resolve(F.root,prefix);assert.equal(path.dirname(target),parent);fs.rmSync(target,{recursive:true,force:true});}fs.rmSync(path.join(F.root,'.private',id+'.json'),{force:true});}
}})().catch(e=>{console.error(e);process.exitCode=1;});
