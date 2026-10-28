require('./qa-output.cjs').prepareLaFlor();
/* Reviewable owner screenshots, captured from real browser renders. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/',out=path.resolve(__dirname,'../../.private/qa/la-flor-eterna');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const ready=()=>page.waitForFunction(()=>window.__ready);
  await page.goto(base);await page.locator('.bouquet-picture img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.locator('.bouquet-picture img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await page.screenshot({path:path.join(out,'catalog-mobile.png')});await page.screenshot({path:path.join(out,'catalog-full.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1180});await page.screenshot({path:path.join(out,'catalog-desktop.png')});
  await page.goto(base+'studio.html?template=pink-promise');await ready();await page.screenshot({path:path.join(out,'editor-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'editor-mobile.png')});
  await page.evaluate(()=>{NebulaApp.select(NebulaApp.state.items[0].uid);NebulaApp.setFocusPreview(true);});await page.screenshot({path:path.join(out,'expanded-mobile.png')});await page.evaluate(()=>NebulaApp.setFocusPreview(false));
  await page.locator('#orderButton').click();await page.locator('#ordName').fill('Ana');const date=new Date();date.setDate(date.getDate()+14);await page.locator('#ordDate').fill(date.toISOString().slice(0,10));await page.locator('#orderDialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'review-mobile.png')});await page.locator('#orderSend').click();await page.screenshot({path:path.join(out,'handoff-mobile.png')});
  const sheet=await page.locator('#smsSheet').getAttribute('href');await page.locator('#orderDialog [data-close="orderDialog"]').click();await page.evaluate(()=>NebulaApp.setLanguage('es'));await page.locator('#orderButton').click();await page.locator('#orderSend').click();await page.screenshot({path:path.join(out,'handoff-spanish.png')});
  await page.locator('#orderDialog [data-close="orderDialog"]').click();const data=await page.evaluate(async()=>{const s=NebulaApp.state;s.note='';return Array.from(new Uint8Array(await(await NebulaRenderer.blob(s,1080,1080,'en')).arrayBuffer()));});fs.writeFileSync(path.join(out,'bouquet-export.png'),Buffer.from(data));
  await page.goto(sheet);await page.waitForSelector('#orderSheet:not([hidden])');await page.screenshot({path:path.join(out,'florist-sheet.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'florist-sheet-desktop.png'),fullPage:true});
  await page.goto(base+'studio.html?template=midnight-blooms');await ready();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'midnight-lilies.png')});
  console.log('Owner preview screenshots captured in',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
