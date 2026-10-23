const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4176/demo/nebula-builder/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await p.goto(base+'studio.html?template=pink-celebration');await p.waitForFunction(()=>window.__ready);await p.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 const result=await p.evaluate(()=>{const M=NebulaModel,R=NebulaRenderer,s=M.clone(NebulaApp.state),code=NebulaLink.encode(s),decoded=NebulaLink.decode(code),bud=s.items.find(n=>n.id==='lily_bud'),others=JSON.stringify(s.items.filter(n=>n.uid!==bud.uid));
 const replaced=M.replace(s,bud.uid,'rose_red');const stable=others===JSON.stringify(s.items.filter(n=>n.uid!==bud.uid));
 const original=NebulaApp.state,cv=document.createElement('canvas');cv.width=720;cv.height=820;R.paint(cv,original);
 return {title:original.title,count:original.items.length,buds:original.items.filter(n=>n.id==='lily_bud').length,code,roundtrip:decoded?.design.items.every((n,i)=>n.uid===original.items[i].uid&&n.id===original.items[i].id&&n.anchors.classic.x===original.items[i].anchors.classic.x&&n.anchors.classic.y===original.items[i].anchors.classic.y),replaced:replaced.ok,stable,missing:[...R.assetsFor(original)].filter(u=>!R.decoded(u)),image:cv.toDataURL()};});
 fs.writeFileSync('clients/la-flor-eterna/qa/celebration/code.txt',result.code);
 assert.equal(result.title,'Pink Celebration');assert.equal(result.count,39);assert.equal(result.buds,7);assert.ok(result.roundtrip);assert.ok(result.replaced);assert.ok(result.stable);assert.deepEqual(result.missing,[]);
 fs.mkdirSync('clients/la-flor-eterna/qa/celebration',{recursive:true});fs.writeFileSync('clients/la-flor-eterna/qa/celebration/preview.png',Buffer.from(result.image.split(',')[1],'base64'));await p.screenshot({path:'clients/la-flor-eterna/qa/celebration/mobile.png'});
 await p.goto(base+'studio.html#b='+result.code);await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaApp.state.title),'Pink Celebration');assert.deepEqual(errors,[]);
 console.log('PASS Pink Celebration: 39 editable stems, 7 buds, isolated replacement, exact saved anchors, reopen and loaded artwork on mobile.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
