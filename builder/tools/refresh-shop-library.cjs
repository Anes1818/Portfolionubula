/* Render reusable covers from editable designs, never from client photographs. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'builder/shop-factory');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await browser.newPage(),base=process.env.DEMO_URL||'http://127.0.0.1:4177/demo/nebula-builder/';
 await p.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 const ctx={window:{}};ctx.NEBULA_COLLECTIONS=[];vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'demo/nebula-builder/catalog-data.js'),'utf8').replaceAll('NEBULA_COLLECTIONS.push','window.NEBULA_COLLECTIONS.push').replaceAll('NEBULA_COLLECTIONS.unshift','window.NEBULA_COLLECTIONS.unshift'),ctx);
 const featured=JSON.parse(fs.readFileSync(path.join(root,'clients/la-flor-eterna/top-sellers.json'),'utf8'));
 const entries=[...featured,...ctx.window.NEBULA_COLLECTIONS.filter(r=>!featured.some(f=>f.id===r.id))],library=[];
 fs.mkdirSync(path.join(out,'covers'),{recursive:true});
 for(const entry of entries){
  await p.goto('about:blank');
  await p.goto(base+(entry.href||'studio.html?template='+entry.id));await p.waitForFunction(()=>window.__ready,{},{timeout:45000});
  const result=await p.evaluate(async()=>{const s=NebulaApp.state;await NebulaRenderer.awaitAssets(s);const c=document.createElement('canvas');c.width=720;c.height=820;NebulaRenderer.paint(c,s);return {code:NebulaLink.encode(s),mode:s.mode,counts:NebulaModel.counts(s),extras:NebulaModel.price(s).extraLines.map(e=>e.id),cover:c.toDataURL('image/webp',.9)};});
  fs.writeFileSync(path.join(out,'covers',entry.id+'.webp'),Buffer.from(result.cover.split(',')[1],'base64'));
  if(entry.expected && (result.mode!==entry.expected.mode || Object.values(result.counts).reduce((a,b)=>a+b,0)!==entry.expected.count))throw Error('Recipe mismatch: '+entry.id);
  const {cover,...design}=result;library.push({id:entry.id,en:entry.en,es:entry.es||entry.en,description:entry.description||'',descriptionEs:entry.descriptionEs||'',...design});
 }
 fs.writeFileSync(path.join(out,'library.json'),JSON.stringify({version:1,recipes:library},null,2)+'\n');console.log('Rendered '+library.length+' editable library recipes and covers.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
