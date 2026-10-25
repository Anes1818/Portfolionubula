/* Read-only production smoke test. Never submit forms or contact leads. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const c=await b.newContext({viewport:{width:390,height:844}});
 await c.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const base='https://nebulastudio.site/demo/nebula-builder/';await p.goto(base+'?vip=nebula');
 const links=await p.locator('.featured-card .featured-photo,.collection-card>a').evaluateAll(nodes=>nodes.map(n=>({href:n.href,name:(n.closest('article').querySelector('h3,strong')?.textContent||n.closest('article').innerText).split('\n')[0]})));
 assert.equal(links.length,15);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const link of links){await p.goto(link.href);await p.waitForFunction(()=>window.__ready,{},{timeout:45000});assert.ok(await p.evaluate(()=>NebulaApp.state.items.length>0),link.name);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,link.name+' phone overflow');console.log('PASS live bouquet '+link.name);}
 await p.goto('https://nebulastudio.site/shop-setup.html?from=demo');assert.equal(await p.locator('form').count()>0,true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.goto('https://nebulastudio.site/admin.html');await p.locator('#adminSignIn').waitFor({state:'visible'});assert.equal(await p.locator('#adminContent').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS live 15-bouquet mobile route, setup entry and anonymous admin lock. No writes or messages sent.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
