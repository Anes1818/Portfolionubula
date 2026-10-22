'use strict';
// Opt-in: writes one named sample request to the real database; never sends a message.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 if(process.env.NEBULA_LIVE_TEST!=='1')throw Error('Set NEBULA_LIVE_TEST=1 to create a real sample request.');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.request().method()==='PUT'&&r.url().includes('firebaseio.com'))writes.push({url:r.url(),status:r.status(),body:r.request().postDataJSON()});});
  await page.goto('https://nebulastudio.site/shops/la-flor-eterna/studio.html?template=pink-promise');await page.waitForFunction(()=>window.__ready);
  await page.locator('#orderButton').click();await page.locator('#ordName').fill('TEST - Nebula short link');await page.locator('#ordPhone').fill('12345678');await page.locator('#ordDate').fill(new Date(Date.now()+7*86400000).toISOString().slice(0,10));await page.locator('#orderSend').click();await page.waitForFunction(()=>!smsPrepared.hidden,{},{timeout:30000});
  const message=await page.locator('#smsMessage').inputValue(),match=message.match(/https:\/\/nebulastudio\.site\/b\/#([\w-]{22})/);if(!match)console.log(JSON.stringify({writes:writes.map(w=>({url:w.url,status:w.status})),errors,config:await page.evaluate(()=>window.NEBULA_LINK_SERVICE),transport:await page.evaluate(()=>typeof window.NebulaDatabase),status:await page.locator('#smsStatus').innerText()}));assert.ok(match,'Expected a saved short link, got fallback');
  assert.match(await page.locator('#smsStatus').innerText(),/Details saved/);assert.equal(writes.length,2);assert.ok(writes.every(w=>w.status===204));
  const saved=writes.find(w=>w.url.includes('/requests/'));assert.equal(saved.body.customerName,'TEST - Nebula short link');assert.equal(saved.body.shortUrl,match[0]);assert.ok(!('phone'in saved.body));
  await page.locator('#orderSend').click();await page.waitForFunction(()=>!smsPrepared.hidden);assert.equal(writes.length,2,'Repeat preparation should use cache');
  const publicUrl=writes.find(w=>w.url.includes('/designs/')).url.split('?')[0];
  const design=await (await context.request.get(publicUrl)).json();assert.ok(!JSON.stringify(design).includes('TEST - Nebula'));assert.equal(design.code,saved.body.code);
  for(const url of [saved.url.split('?')[0],publicUrl.replace(/\/[^/]+\.json$/,'')+'.json'])assert.ok([401,403].includes((await context.request.get(url)).status()),'Private read/list must be denied');
  assert.ok([401,403].includes((await context.request.put(publicUrl,{data:{...design,purpose:'share'}})).status()),'Existing design must not be modified');
  const fresh=await browser.newContext(),sheet=await fresh.newPage();await sheet.goto(match[0]);await sheet.waitForURL('**/order.html?d=*',{timeout:30000});await sheet.waitForFunction(()=>!orderSheet.hidden,{},{timeout:30000});assert.ok(!(await sheet.locator('body').innerText()).includes('TEST - Nebula'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS live Firebase save, private name, short-link reconstruction, retry cache and access rules',shortUrl:match[0],privateRecord:saved.url.split('/nebula/')[1].split('.json')[0],name:saved.body.customerName},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
