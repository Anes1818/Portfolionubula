const testOrigin=process.env.TEST_ORIGIN||'http://127.0.0.1:4175';
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await ctx.newPage(),errors=[],bad=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});page.on('request',r=>{if(/firebaseio|firestore|cloudfunctions/.test(r.url()))remote.push(r.url());});
 await page.goto(testOrigin+'/builder/');await page.waitForURL('**/demo/nebula-builder/index.html');await page.waitForFunction(()=>window.NEBULA_SHOP?.id==='nebula-demo');
 assert.ok(!(await page.locator('body').innerText()).includes('Maritza'));assert.equal(await page.locator('.featured-card').count(),4);
 const cards=page.locator('.featured-card');const boxes=await cards.evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left})));assert.equal(boxes[0].top,boxes[1].top);assert.ok(boxes[2].top>boxes[0].top);
 const links=await page.locator('.featured-photo').evaluateAll(es=>es.map(e=>e.href));
 for(const link of links){await page.goto(link);await page.waitForFunction(()=>window.__ready);await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));assert.equal(await page.evaluate(()=>NEBULA_SHOP.id),'nebula-demo');assert.ok(await page.evaluate(()=>NebulaApp.state.items.length>0));assert.ok(await page.evaluate(()=>!!window.NebulaMidnightArt));assert.ok(!(await page.locator('body').innerText()).includes('Maritza'));}
 await page.goto(testOrigin+'/builder/studio.html?template=midnight-blooms');await page.waitForURL(u=>u.pathname==='/demo/nebula-builder/studio.html');await page.waitForFunction(()=>window.__ready);
 await page.locator('#orderButton').click();await page.locator('#ordName').fill('Demo Test');await page.locator('#ordDate').fill('2099-11-20');await page.locator('#orderSend').click();await page.waitForFunction(()=>!smsPrepared.hidden);
 const text=await page.locator('#smsMessage').inputValue();assert.ok(text.includes('DEMO-'));assert.ok(!/Maritza|13108729856/.test(text));assert.match(await page.locator('#smsOpen').getAttribute('href'),/^sms:\+15713367129/);
 assert.ok(text.includes('/demo/nebula-builder/order.html#b='));const link=await page.locator('#smsSheet').getAttribute('href');await page.goto(link.replace('https://nebulastudio.site',testOrigin));await page.waitForFunction(()=>!orderSheet.hidden);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'visible');
 await page.goto(testOrigin+'/shops/la-flor-eterna/studio.html?template=pink-promise');await page.waitForFunction(()=>window.__ready);assert.equal(await page.evaluate(()=>NEBULA_SHOP.id),'la-flor-eterna');assert.equal(await page.evaluate(()=>NEBULA_SHOP.recipient),'+13108729856');
 assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS demo redirect, 2-column phone catalog, four imported bouquets, modern assets, isolated identity/SMS/storage, preview scrolling and unchanged client shop; no missing assets or Firebase calls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

