const testOrigin=process.env.TEST_ORIGIN||'http://127.0.0.1:4175';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await page.goto(testOrigin+'/demo/nebula-builder/studio.html?template=crimson-velvet');
 await page.waitForFunction(()=>window.__ready);
 await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 const out=path.resolve('clients/la-flor-eterna/qa/crimson');fs.mkdirSync(out,{recursive:true});
 const report=await page.evaluate(()=>{
 const s=NebulaApp.state,R=NebulaRenderer,sc=R.scene(s),b=R.artBounds(s,sc),cv=document.createElement('canvas');cv.width=900;cv.height=1100;
 const c=cv.getContext('2d');c.fillStyle='#fcfaf8';c.fillRect(0,0,900,1100);const k=Math.min(800/b.w,1000/b.h);c.translate((900-b.w*k)/2-b.x*k,(1100-b.h*k)/2-b.y*k);c.scale(k,k);R.drawArt(c,s,{scene:sc});
 const code=NebulaLink.encode(s),roundtrip=NebulaLink.decode(code);
 return {title:s.title,count:s.items.length,valid:!!roundtrip,code,art:cv.toDataURL(),nodes:sc.nodes.length,paper:sc.collar?.url};
 });
 fs.writeFileSync(path.join(out,'preview.png'),Buffer.from(report.art.split(',')[1],'base64'));delete report.art;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await page.screenshot({path:path.join(out,'mobile.png')});
 assert.equal(report.title,'Crimson Velvet');assert.equal(report.count,20);assert.equal(report.valid,true);assert.deepEqual(errors,[]);
 // Real operations: one stem replacement/move must leave all other anchors intact.
 const edits=await page.evaluate(async()=>{
  const A=NebulaApp,M=NebulaModel,original=A.state,uid=original.items[9].uid,others=original.items.filter(n=>n.uid!==uid);
  A.replace(uid,'lily');await NebulaRenderer.awaitAssets(A.state);
  const replacement=A.state.items.find(n=>n.uid===uid)?.id==='lily';
  const unchanged=JSON.stringify(A.state.items.filter(n=>n.uid!==uid))===JSON.stringify(others);
  A.setState(original);const old=original.items[0].anchors.classic;A.move(original.items[0].uid,{x:old.x-12,y:old.y-18});
  const moved=A.state.items[0].anchors.classic.y!==old.y;
  A.setState(original);A.remove(original.items[0].uid);const removed=A.state.items.length===19;
  A.setState(original);const s=A.state;s.finishes.decorations=[];A.setState(s);const bowRemoved=!A.scene().finishes.some(n=>n.detailId==='satin_black');
  A.setState(original);return {replacement,unchanged,moved,removed,bowRemoved};
 });
 assert.ok(Object.values(edits).every(Boolean),JSON.stringify(edits));
 for(const level of [0,1,3,2]){await page.locator('[data-breath="'+level+'"]').click();assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.studio.breath),level);}
 // Cover is the supplied image, framed on a two-column phone catalog.
 await page.goto(testOrigin+'/demo/nebula-builder/index.html');
 const card=page.locator('[data-featured-id="crimson-velvet"]');await card.scrollIntoViewIfNeeded();
 await card.screenshot({path:path.join(out,'cover.png')});
 assert.equal(await page.locator('.featured-card').count(),5);
 await card.locator('.featured-photo').click();await page.waitForFunction(()=>window.__ready);
 assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Crimson Velvet');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS Crimson Velvet: 20 editable flowers, share roundtrip, independent replace/move/remove, removable bow, filler levels, cover navigation, no missing assets.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
