const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8765/builder/tests/release-2026-09-29/preview-dome-berries.html');
 await page.waitForFunction(()=>window.NebulaApp?.ready);
 await page.evaluate(async()=>{await NebulaRenderer.ready([NebulaApp.state]);NebulaApp.render();});
 await page.waitForTimeout(600);
 await page.screenshot({path:path.join(__dirname,'overhead-phone.png')});
 await page.click('#focusPreview');
 await page.screenshot({path:path.join(__dirname,'overhead-expanded.png')});
 console.log(await page.evaluate(()=>({alpha:NebulaApp.alphaReport(),price:NebulaModel.price(NebulaApp.state).totalCents,frame:NebulaApp.scene().frame,dimensions:NebulaApp.scene().nodes.slice(0,3).map(n=>({d:n.d,rot:n.rot}))})));
 for(const green of [false,true]){
  const data=await page.evaluate(async green=>{const s=NebulaApp.state;s.finishes.greenRim=green;NebulaApp.setState(s);await NebulaRenderer.awaitAssets(s);return NebulaApp.exportCanvas(1080,1080).toDataURL();},green);
  fs.writeFileSync(path.join(__dirname,green?'overhead-green-export.png':'overhead-export.png'),Buffer.from(data.split(',')[1],'base64'));
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
