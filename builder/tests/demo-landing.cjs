/* Isolated HTTP/email test: no real lead, Firebase write, or message is sent. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webm')?'video/webm':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],bad=[];let posts=0,fail=true,emailOk=false;
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
  await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===base)return route.continue();
   if(url.hostname==='la-flora-6ed47-default-rtdb.firebaseio.com'){assert.equal(req.method(),'PUT');assert.match(url.pathname,/^\/nebula\/leads\//);const lead=JSON.parse(req.postData());assert.equal(lead.shop,'Review Test Shop');assert.equal(lead.email,'test@example.invalid');return route.fulfill({status:fail?403:200,contentType:'application/json',body:fail?'{}':'null'});}
   if(url.hostname==='formspree.io'){posts++;assert.equal(req.method(),'POST');assert.ok(req.postData().includes('Review Test Shop'));return route.fulfill({status:emailOk?200:500,contentType:'application/json',body:JSON.stringify(emailOk?{ok:true}:{error:'Test notification failure'})});}
   return route.fulfill({status:200,contentType:'text/plain',body:''});
  });
  await page.goto(base+'/demo/nebula-builder/');await page.locator('#heroTry').waitFor();
  await page.waitForFunction(()=>document.getElementById('heroDemo').currentTime>0);
  await page.locator('#demoVideoToggle').click();assert.equal(await page.locator('#heroDemo').evaluate(v=>v.paused),true,'Video can be paused');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('#heroDemo source').getAttribute('src'),null,'Reduced motion avoids automatic video loading');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await page.locator('.featured-card').count(),5);assert.equal(await page.locator('.featured-card:visible').count(),5);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await page.locator('.mobile-cta').isVisible());
  assert.ok(await page.evaluate(()=>document.getElementById('how-it-works').getBoundingClientRect().top < document.getElementById('top-sellers').getBoundingClientRect().top));
  await page.locator('.mobile-cta a').click();assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'INPUT');
  const boxes=await page.locator('.featured-card:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.equal(boxes[0],boxes[1]);assert.ok(boxes[2]>boxes[0]);
  assert.equal(await page.locator('.demo-journey a').count(),3);
  assert.ok(await page.evaluate(()=>document.getElementById('get-started').getBoundingClientRect().top < document.getElementById('top-sellers').getBoundingClientRect().top),'Setup path precedes the long collection');
  await page.locator('#setupPrimary').click();await page.waitForURL('**/shop-setup.html?from=demo');await page.goBack();
  const hero=await page.locator('#heroTry').getAttribute('href'),sheet=await page.locator('#samplePreview').getAttribute('href');
  await page.locator('#language').selectOption('es');assert.match(await page.locator('h1').innerText(),/Empieza con tus ramos/);assert.equal(await page.locator('html').getAttribute('lang'),'es');
  await page.locator('#heroTry').click();await page.waitForFunction(()=>window.__ready);assert.equal(await page.locator('#language').inputValue(),'es');await page.goBack();await page.locator('#heroTry').waitFor();
  await page.locator('#language').selectOption('en');assert.equal(await page.locator('.collection-card:visible').count(),9);assert.equal(await page.locator('#collection details').count(),0);
  await page.locator('.enquiry-option summary').click();
  await page.locator('#interestShop').fill('Review Test Shop');await page.locator('#interestEmail').fill('test@example.invalid');await page.locator('#interestCurrency').selectOption('CAD');
  await page.locator('#interestSubmit').click();await page.waitForFunction(()=>document.getElementById('interestStatus').textContent.includes('confirm delivery'));
  assert.equal(await page.locator('#interestShop').inputValue(),'Review Test Shop');assert.ok(!(await page.locator('#interestSuccess').isVisible()));
  fail=false;await page.locator('#interestSubmit').click();await page.locator('#interestSuccess').waitFor({state:'visible'});assert.equal(posts,2);
  await page.locator('#interestSuccess a').click();assert.equal(await page.locator('#shopName').inputValue(),'Review Test Shop');assert.equal(await page.locator('#shopEmail').inputValue(),'test@example.invalid');assert.equal(await page.locator('#shopCurrency').inputValue(),'CAD');
  fail=true;emailOk=true;
  await page.goto(base+'/demo/nebula-builder/');
  await page.locator('.enquiry-option summary').click();
  await page.locator('#interestShop').fill('Review Test Shop');await page.locator('#interestEmail').fill('test@example.invalid');
  await page.locator('#interestSubmit').click();await page.locator('#interestSuccess').waitFor({state:'visible'});
  assert.equal(posts,3,'Email-only fallback confirms accepted enquiry when database is unavailable');
  await page.evaluate(()=>document.getElementById('interestForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(posts,3,'Successful submission cannot be sent again in the same page');
  await page.goto(base+'/demo/nebula-builder/'+hero);await page.waitForFunction(()=>window.__ready);assert.equal(await page.evaluate(()=>NebulaApp.state.items.length),32);assert.equal(await page.evaluate(()=>NebulaApp.state.finishes.roseArtwork),'reference-v3');assert.equal(await page.locator('#browseTemplates').getAttribute('href'),'../../shop-setup.html?from=demo');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Studio header fits phone');
  await page.goto(base+'/demo/nebula-builder/'+sheet);await page.locator('#orderSheet').waitFor({state:'visible'});assert.ok(!(await page.locator('#orderBroken').isVisible()));assert.equal(await page.locator('.demo-next-link').getAttribute('href'),'../../shop-setup.html?from=demo');
  await page.goto(base+'/demo/nebula-builder/');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
  await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
  const qa=path.join(root,'builder/tests/demo-landing-qa');fs.mkdirSync(qa,{recursive:true});
  await page.screenshot({path:path.join(qa,'desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(qa,'phone-opening.png')});await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});
  await page.goto(base+'/demo/nebula-builder/collection.html#saved');assert.equal(await page.locator('#saved').count(),1);
  await page.goto(base+'/demo/nebula-builder/?test_gate=1');await page.waitForURL('**/shop-setup.html');
  await page.goto(base+'/demo/nebula-builder/?test_gate=1&vip=nebula');await page.locator('#heroTry').waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('nebula_vip')),'1');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS mobile/desktop layout, EN/ES, all bouquets, current Pink Promise, request sheet, failed/successful enquiry, and private local setup handoff. All external calls mocked.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
