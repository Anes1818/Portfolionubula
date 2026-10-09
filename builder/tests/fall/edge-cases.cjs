const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),checks=[];
function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
(async()=>{
 for(const file of JSON.parse(fs.readFileSync(path.join(root,'assets/fall/manifest.json'),'utf8'))){
  const a=await sharp(path.join(root,'assets/fall',file.name+'.png')).ensureAlpha().raw().toBuffer(),b=await sharp(path.join(root,'assets/fall',file.name+'.webp')).ensureAlpha().raw().toBuffer();let same=a.length===b.length;
  for(let i=0;same&&i<a.length;i+=4){if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))same=false;}
  check('Lossless pixels and alpha: '+file.name,same);
 }
 const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>NebulaApp?.ready);
  await page.waitForFunction(()=>document.querySelector('[data-template]')&&!document.querySelector('[data-template]').disabled);
  await page.locator('[data-template="october-cream"]').click();
  check('Offline export uses transparent assets without taint',await page.evaluate(async()=>{const b=await NebulaApp.exportBlob(1080,1080);return b.type==='image/png'&&b.size>20000;}));
  const stress=await page.evaluate(()=>{
   const result=[];
   for(const count of [1,15,30,44,62,84,100])for(const species of ['rose_ivory','sunflower','lily']){
    const s=NebulaFall.create('october-cream');NebulaModel.resize(s,count);s.template.palette=[species];s.template.accent.count=0;s.template.overrides={};NebulaModel.syncTemplate(s);
    result.push({count,species,valid:!!NebulaModel.validate(s),link:!!NebulaLink.decode(NebulaLink.encode(s)),finite:NebulaRenderer.scene(s).nodes.every(n=>[n.x,n.y,n.w,n.h].every(Number.isFinite))});
   }return result;
  });check('All 21 dense / sparse size cases validate and share',stress.every(r=>r.valid&&r.link&&r.finite));
  check('Deletion leaves an editable empty position; undo restores it',await page.evaluate(()=>{const before=JSON.stringify(NebulaApp.state);NebulaApp.remove(NebulaApp.state.items[8].uid);const smaller=NebulaApp.state.items.length===43&&NebulaApp.scene().slots.some(p=>!p.uid)&&NebulaLink.decode(NebulaLink.encode(NebulaApp.state));NebulaApp.undo();return !!smaller&&JSON.stringify(NebulaApp.state)===before;}));
  await page.locator('#tab-finishing').click();await page.locator('#pumpkinScale').focus();
  await page.locator('#pumpkinScale').press('ArrowRight');await page.locator('#pumpkinScale').press('ArrowRight');
  check('Successive keyboard size changes each undo',await page.evaluate(()=>{const n=NebulaApp.state.finishes.pumpkinScale;NebulaApp.undo();const n1=NebulaApp.state.finishes.pumpkinScale;NebulaApp.undo();const n2=NebulaApp.state.finishes.pumpkinScale;return n>n1&&n1>n2;}));
  check('Classic rejects unsupported overhead-only assets',await page.evaluate(()=>{const s=NebulaModel.defaultMode('classic');s.items[0].id='rose_ivory';return !NebulaModel.validate(s);}));
  check('No file-mode runtime errors',!errors.length);
  fs.writeFileSync(path.join(__dirname,'edge-results.json'),JSON.stringify({checks,stress,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
