const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NEBULA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();page.on('pageerror',e=>console.error(e));
 await page.goto('http://127.0.0.1:8765/builder/');await page.waitForFunction(()=>window.NebulaApp?.ready);await page.waitForTimeout(800);
 const prefix=process.argv[2]||'before';
 await page.screenshot({path:path.join(__dirname,prefix+'-phone.png')});
 if(prefix!=='before'){
  await page.click('#startingPanel summary');await page.click('[data-recipe=strawberry]');await page.click('#confirmYes');
  await page.waitForTimeout(800);await page.screenshot({path:path.join(__dirname,'classic-strawberry-phone.png')});
  await page.click('#focusPreview');await page.screenshot({path:path.join(__dirname,'classic-strawberry-expanded.png')});await page.click('#focusPreview');
 }
 await page.selectOption('#family','strawberry');await page.screenshot({path:path.join(__dirname,prefix+'-catalog.png')});
 await page.click('#orderButton');await page.screenshot({path:path.join(__dirname,prefix+'-order.png')});
 console.log(await page.evaluate(()=>({title:document.title,body:document.body.scrollHeight,viewport:innerHeight})));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
