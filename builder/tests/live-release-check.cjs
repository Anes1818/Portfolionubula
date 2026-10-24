const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>['POST','PUT','PATCH','DELETE'].includes(route.request().method())?route.abort():route.continue());
 await page.goto('https://nebulastudio.site/demo/nebula-builder/?vip=nebula&v=bd4eb37',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.featured-card').count()+await page.locator('.collection-card').count(),14);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width)}
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'builder/tests/demo-landing-qa/live-phone.png'});
 const sample=await page.locator('#samplePreview').getAttribute('href');
 await page.locator('#language').selectOption('es');await page.locator('#heroTry').click();
 await page.waitForFunction(()=>window.__ready);assert.equal(await page.locator('#language').inputValue(),'es');
 await page.goto(new URL(sample,'https://nebulastudio.site/demo/nebula-builder/').href);
 await page.locator('#orderSheet').waitFor({state:'visible'});assert.equal(await page.locator('#orderBroken').isVisible(),false);
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));assert.ok(await page.evaluate(()=>scrollY)>0,'Preview scrolls');
 await page.goto('https://nebulastudio.site/b/#OBOXn3hvems5W__2IN3tJA');
 await page.locator('#orderSheet').waitFor({state:'visible'});assert.equal(await page.locator('#orderBroken').isVisible(),false,'Existing saved short link reconstructs');
 await page.goto('https://nebulastudio.site/admin.html');await page.locator('#adminSignIn').waitFor();
 assert.equal(await page.locator('#adminContent').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS live: 14 bouquets, four viewport widths, language handoff, preview rendering/scrolling, anonymous admin locked; no writes or messages.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
