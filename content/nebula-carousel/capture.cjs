const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
 const recipes=JSON.parse(fs.readFileSync(path.resolve('clients/la-flor-eterna/top-sellers.json'),'utf8'));
 for(let i=0;i<3;i++){
 const page=await browser.newPage({viewport:{width:480,height:1000},deviceScaleFactor:2});
 await page.goto('https://nebulastudio.site/demo/nebula-builder/'+recipes[i].href);
 await page.waitForFunction(()=>window.__ready);
 await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
 await page.waitForTimeout(800);
 const png=await page.locator('#bouquet').evaluate(c=>c.toDataURL('image/png'));
 fs.writeFileSync(path.join(__dirname,`bouquet-${i+1}.png`),Buffer.from(png.split(',')[1],'base64'));
 if(i===0) await page.screenshot({path:path.join(__dirname,'builder-phone.png')});
 await page.close();
 }
 fs.copyFileSync('builder/demo-brand/logo.jpg',path.join(__dirname,'logo.jpg'));
 console.log('Captured three real bouquets and mobile builder.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
