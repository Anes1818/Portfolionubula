/* Catalog/editor boundary regressions. No messages, uploads, or real orders.
   NODE_PATH must resolve Playwright. BUILDER_URL, BROWSER_PATH and QA_OUTPUT are optional. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4173/builder/';
const out=process.env.QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'nebula-catalog-'));
fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>window.__ready===true,null,{timeout:45000});
  await page.goto(base,{waitUntil:'networkidle'});
  const catalog=await page.evaluate(()=>({bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0),scripts:[...document.scripts].map(s=>s.src),canvas:document.querySelectorAll('canvas').length}));
  check('Catalog has ten real, immediately usable bouquet links',await page.locator('.bouquet-card').count()===10&&await page.locator('.customize-link[href*="template="]').count()===10);
  check('Catalog has zero canvases or editor dependencies',catalog.canvas===0&&!catalog.scripts.some(src=>/renderer|model|assets-bundle|app\.js|geometry/.test(src)));
  check('Initial catalog resources stay below 1 MB',catalog.bytes<1000000);
  await page.screenshot({path:path.join(out,'catalog-desktop.png')});
  await page.locator('[data-filter="love"]').click();check('Love filter shows three bouquets',await page.locator('.bouquet-card:visible').count()===3);
  await page.locator('#bouquetSearch').fill('pink');check('Search combines with collection filter',await page.locator('.bouquet-card:visible').count()===1);
  await page.locator('#bouquetSearch').fill('nothing-matches');check('No results has a recovery action',await page.locator('#emptyState').isVisible());
  await page.locator('#resetFilters').click();check('Reset restores the complete collection',await page.locator('.bouquet-card:visible').count()===10);
  await page.locator('#language').selectOption('es');check('Spanish changes interface and bouquet names',(await page.locator('h1').innerText()).includes('Encuentra')&&(await page.locator('[data-id="pink-promise"] h2').innerText()).includes('Promesa'));
  await page.locator('#bouquetSearch').fill('jardin');check('Search ignores accents',await page.locator('.bouquet-card:visible').count()===1);
  await page.locator('#clearSearch').click();await page.locator('#language').selectOption('en');
  for(const width of [1440,1024,768,390,320]){
   await page.setViewportSize({width,height:900});check('Catalog fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'catalog-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-filter="love"]').click();await page.locator('#bouquetSearch').fill('pink');
  await page.locator('[data-id="pink-promise"] .customize-link').click();await ready();
  check('Choice opens a separate editor route',new URL(page.url()).pathname.endsWith('/studio.html'));
  check('Editor opens the exact selected recipe',await page.evaluate(()=>NebulaApp.state.title==='Pink Promise'&&NebulaApp.state.items.length===44&&NebulaApp.state.mode==='dome'));
  check('Editor contains no hidden catalog UI',await page.locator('#templateGallery').count()===0&&await page.locator('.bouquet-card').count()===0);
  check('Web editor does not download embedded or catalog image bundles',await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/assets-bundle|embedded\.js|assets\/catalog\//.test(r.name))));
  await page.goBack();check('Browser Back restores catalog filter and search',await page.locator('.bouquet-card:visible').count()===1&&await page.locator('#bouquetSearch').inputValue()==='pink');
  await page.goForward();await ready();
  await page.evaluate(()=>{const state=NebulaApp.state;state.title='A bouquet worth keeping';NebulaApp.setState(state);});
  const edited=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));await page.reload();await ready();
  check('Refresh keeps edits instead of reapplying the entry template',await page.evaluate(()=>NebulaLink.encode(NebulaApp.state))===edited);
  await page.locator('#saveTop').click();await page.locator('#savedBouquetName').fill('My saved pink bouquet');await page.locator('#saveShelf').click();
  check('Saving a named copy still works',await page.evaluate(()=>NebulaSaved.read().length===1));
  const downloadPromise=page.waitForEvent('download');await page.locator('#saveSquare').click();const download=await downloadPromise;await download.saveAs(path.join(out,'export.png'));
  check('PNG export succeeds using individual web artwork',fs.statSync(path.join(out,'export.png')).size>10000);
  await page.locator('[data-close="saveDialog"]').click();await page.locator('#browseTemplates').click();await page.waitForURL('**/index.html');await page.locator('#savedGrid a').waitFor({state:'visible'});
  check('Catalog returns with resume link and saved copy',await page.locator('#resumeDesign').isVisible()&&(await page.locator('#savedGrid').innerText()).includes('My saved pink bouquet'));
  await page.locator('#savedGrid a').click();await ready();check('Saved copy opens by its ID',await page.evaluate(()=>NebulaApp.state.title==='My saved pink bouquet'));
  const current=await page.evaluate(()=>localStorage.getItem('nebulaBouquetV6'));
  await page.goto(base+'studio.html?template=not-a-real-recipe');await ready();check('Invalid selection preserves the current draft',await page.evaluate(()=>localStorage.getItem('nebulaBouquetV6'))===current);
  const code=await page.evaluate(()=>NebulaLink.encode(NebulaRomance.create('written-in-roses')));
  await page.goto(base+'#b='+code);await ready();
  check('Legacy catalog share link redirects to editor with its design',page.url().includes('studio.html#b=')&&await page.evaluate(()=>NebulaApp.state.title==='Written in Roses'));
  check('Viewing a shared bouquet does not overwrite the local draft',await page.evaluate(()=>localStorage.getItem('nebulaBouquetV6'))===current);
  await page.evaluate(()=>{const design=NebulaApp.state;design.title='My edited shared bouquet';NebulaApp.setState(design);});
  check('Editing a shared bouquet clears its original launch hash',new URL(page.url()).hash==='');
  await page.reload();await ready();check('Edited shared bouquet survives refresh',await page.evaluate(()=>NebulaApp.state.title==='My edited shared bouquet'));
  await page.goto(base+'order.html#b='+code);await page.locator('#orderSheet').waitFor({state:'visible'});
  check('Order sheet points to the standalone editor',(await page.locator('#osOpenStudio').getAttribute('href')).startsWith('studio.html#b='));
  await page.locator('#osOpenStudio').click();await ready();check('Order sheet edit link restores the shared design',await page.evaluate(()=>NebulaApp.state.title==='Written in Roses'));
  const recipes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../catalog-data.js'),'utf8').split('window.NEBULA_COLLECTIONS = ')[1].replace(/;\s*$/,''));
  for(const recipe of recipes){
   await page.goto(base+'studio.html?template='+recipe.id);await ready();
   check('Template loads with complete critical artwork: '+recipe.id,await page.evaluate(expected=>NebulaApp.state.title===expected.en&&NebulaApp.state.items.length===expected.count&&[...NebulaRenderer.assetsFor(NebulaApp.state)].every(p=>NebulaRenderer.decoded(p)),recipe));
  }
  await page.goto(base+'studio.html');await ready();await page.evaluate(()=>NebulaApp.switchMode('classic'));await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
  check('Classic works after on-demand mode switching',await page.evaluate(()=>NebulaApp.state.mode==='classic'&&[...NebulaRenderer.assetsFor(NebulaApp.state)].every(p=>NebulaRenderer.decoded(p))));
  await page.evaluate(()=>NebulaApp.switchMode('heart'));await page.evaluate(()=>NebulaRenderer.awaitAssets(NebulaApp.state));
  check('Heart works after on-demand mode switching',await page.evaluate(()=>NebulaApp.state.mode==='heart'&&NebulaApp.state.items.length>0));
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});check('Editor fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'studio-mobile.png')});
  await page.goto(base);await page.locator('.remove-link').click();await page.locator('#removeDialog [value="cancel"]').click();check('Cancel keeps the saved copy',await page.locator('.saved-card').count()===1);
  await page.locator('.remove-link').click();await page.locator('#removeDialog [value="remove"]').click();check('Confirmed removal affects only the saved copy',await page.locator('.saved-card').count()===0&&await page.evaluate(()=>!!localStorage.getItem('nebulaBouquetV6')));
  await page.evaluate(()=>localStorage.setItem('nebulaSavedBouquetsV1','broken-json'));await page.reload();check('Corrupt shelf data is preserved and explained',(await page.locator('#savedStatus').innerText()).includes('unavailable')&&await page.evaluate(()=>localStorage.getItem('nebulaSavedBouquetsV1'))==='broken-json');
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),np=await noJS.newPage();await np.goto(base);
  check('Catalog works without JavaScript',await np.locator('.bouquet-card').count()===10&&await np.locator('[href="studio.html?template=pink-promise"]').count()===3);
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});const bp=await blocked.newPage();await bp.goto(base);check('Unavailable storage does not prevent browsing',await bp.locator('.bouquet-card').count()===10&&(await bp.locator('#savedStatus').innerText()).includes('unavailable'));
  const retry=await browser.newContext();let fail=true;await retry.route('**/breath-airy.webp',r=>fail?r.abort():r.continue());const rp=await retry.newPage();await rp.goto(base+'studio.html?template=pink-promise');await rp.locator('#startupError').waitFor({state:'visible'});fail=false;await rp.locator('#retryStartup').click();await rp.waitForFunction(()=>window.__ready===true);check('Critical artwork failure can retry the selected bouquet',await rp.evaluate(()=>NebulaApp.state.title==='Pink Promise'));
  check('No unexpected runtime errors',errors.length===0);
  const offline=await browser.newContext(),op=await offline.newPage();
  await op.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../studio.html')).href+'?template=pink-promise');
  await op.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
  check('Local-file editor retains embedded artwork fallback',await op.evaluate(()=>!!window.NEBULA_EMBED&&NebulaApp.state.title==='Pink Promise'));
  check('Local-file PNG export still works',await op.evaluate(async()=>(await NebulaApp.exportBlob(360,360)).size>10000));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:checks.length,checks,catalog,errors},null,2));console.log('COMPLETE',checks.length,'checks; artifacts:',out);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
