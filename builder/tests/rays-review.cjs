/* Regression cases found in the Ray's shop review. Uses the isolated QA page. */
const assert=require('node:assert/strict');
module.exports=async function review({page,base,ready,qa}){
 await page.goto(base);
 assert.equal(await page.locator('#custom-shirts').count(),0,'Removed shirt section must not return');
 await ready(base+'studio.html?template=anus-daydream');
 assert.equal(await page.evaluate(()=>NebulaApp.state.title),'Anu’s Daydream');
 const coverage=await page.evaluate(async()=>{
  const results=[];
  for(const mode of ['dome','heart'])for(const id of ['pretty-and-paid','money-moves','anus-daydream']){
   const s=NebulaModel.create(id);
   if(mode==='heart'){s.template.overrides=Object.fromEntries(s.items.map(i=>[i.slot,i.id]));s.mode=mode;NebulaModel.syncTemplate(s);}
   const before=JSON.stringify(s),counts=NebulaModel.counts(s),price=NebulaModel.price(s).totalCents;
   await NebulaRenderer.awaitAssets(s);
   const sc=NebulaRenderer.scene(s),report=NebulaRenderer.alphaReport(s);
   results.push({mode,id,open:report.openPercent,thin:report.belowOpaquePercent,count:s.items.length,nodes:sc.nodes.length,stable:JSON.stringify(s)===before&&JSON.stringify(NebulaModel.counts(s))===JSON.stringify(counts)&&NebulaModel.price(s).totalCents===price,positions:sc.nodes.every(n=>{const p=sc.slots.find(p=>p.slot===n.slot);return p&&n.x===p.x&&n.y===p.y;})});
  }
  return results;
 });
 for(const r of coverage){assert.ok(r.open<1.1,`${r.mode} ${r.id}: open interior ${r.open}%`);assert.ok(r.thin<1.5,`${r.mode} ${r.id}: thin interior ${r.thin}%`);assert.equal(r.count,r.nodes,'Every flower/bill remains one explicit item');assert.ok(r.stable&&r.positions,'Visual fitting must retain design, slots, counts and prices');}
 const pricing=await page.evaluate(()=>{
  const M=NebulaModel;
  const design=ids=>{const s=M.defaultMode('dome');M.resize(s,ids.length);s.template.palette=[ids[0]];s.template.overrides=Object.fromEntries(ids.map((id,i)=>[i,id]));M.syncTemplate(s);return s;};
  const pair=['satin_dahlia_pink','rose_pink','rose_pink'];
  const a=M.price(design(pair)),b=M.price(design([...pair].reverse()));
  const mixed=M.price(design(['rose_red_glitter','satin_dahlia_pink','satin_plumeria_lilac','rose_pink','rose_pink','rose_pink','rose_pink']));
  const candy=design(['__choc','rose_pink']);const candyPrice=M.price(candy);
  const money=M.create('money-moves'),rate=RAY_BUILDER.pricing.usdToCad;
  let missingRate,ownCash;
  try{RAY_BUILDER.pricing.usdToCad=null;missingRate=M.price(money);money.finishes.studio.cashSupply='customer';ownCash=M.price(money);}finally{RAY_BUILDER.pricing.usdToCad=rate;}
  return {a,b,mixed,candyPrice,missingRate,ownCash};
 });
 assert.equal(pricing.a.totalCents,pricing.b.totalCents,'Moving flowers must not change the price');
 assert.equal(pricing.a.range,false,'Two types must not use the menu for three or more types');
 assert.equal(pricing.b.range,false);assert.equal(pricing.a.quoteRequired,true);
 assert.equal(pricing.mixed.totalCents,7100,'Glitter remains an add-on to the mixed menu');
 assert.ok(pricing.mixed.lines.every(l=>l.includedInBouquet&&l.totalCents===0));
 assert.ok(pricing.mixed.extraLines.every(l=>l.totalCents>=0),'No negative menu adjustment disguised as a discount');
 assert.equal(pricing.candyPrice.lines.find(l=>l.id==='__choc').quoteRequired,true);
 assert.equal(pricing.missingRate.quoteRequired,true);assert.equal(pricing.missingRate.cashCents,0);
 assert.ok(pricing.missingRate.missing.some(x=>x.includes('USD-to-CAD')));
 assert.equal(pricing.ownCash.cashCents,0);assert.equal(pricing.ownCash.missing.some(x=>x.includes('USD-to-CAD')),false);
 await page.selectOption('#family','dahlia');
 assert.match(await page.locator('[data-flower="satin_dahlia_pink"] small').textContent(),/quote/);
 await page.selectOption('#family','all');await page.locator('#flowerSearch').fill('chocolate');
 assert.match(await page.locator('[data-flower="__choc"] small').textContent(),/quote/);
 await page.locator('#flowerSearch').fill('');
 await page.evaluate(()=>NebulaApp.showSave());
 assert.match(await page.locator('#priceBreakdown').textContent(),/Included in bouquet price/);
 assert.doesNotMatch(await page.locator('#priceBreakdown').textContent(),/-CA\$/);
 await page.locator('[data-close="saveDialog"]').click();
 const exported=await page.evaluate(()=>{
  const text=[],original=CanvasRenderingContext2D.prototype.fillText,money=NebulaModel.money;
  CanvasRenderingContext2D.prototype.fillText=function(value,...args){text.push(String(value));return original.call(this,value,...args);};
  try{NebulaApp.exportCanvas(1080,1080);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
  return {text,formatterRestored:NebulaModel.money===money};
 });
 assert.ok(exported.text.some(t=>t.includes('QUOTE REQUIRED')),'PNG must carry the quote status');
 assert.equal(exported.formatterRestored,true);
 for(const mode of ['dome','heart']){
  await ready(base+'studio.html?template=pretty-and-paid');
  if(mode==='heart')await page.evaluate(()=>{const s=NebulaApp.state;s.template.overrides=Object.fromEntries(s.items.map(i=>[i.slot,i.id]));s.mode='heart';NebulaModel.syncTemplate(s);NebulaApp.setState(s);});
  await page.locator('#rayMoney>summary').click();
  const initial=await page.evaluate(()=>NebulaApp.state);
  assert.equal(initial.items.filter(i=>i.id.startsWith('cash_')).length,80);
  await page.locator('#rayUpdateNotes').click();
  assert.deepEqual(await page.evaluate(()=>NebulaApp.state),initial,'Unchanged count must not rearrange '+mode);
  await page.locator('#rayNoteCount').fill('70');await page.locator('#rayUpdateNotes').click();
  assert.deepEqual(await page.evaluate(()=>NebulaApp.state.items.filter(i=>!RayBuilder.notes.has(i.id))),initial.items.filter(i=>!i.id.startsWith('cash_')),'Reducing notes preserves every flower slot in '+mode);
  await page.locator('#rayNoteCount').fill('');await page.locator('#rayUpdateNotes').click();
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>RayBuilder.notes.has(i.id)).length),70,'Blank input must not remove all notes');
  await page.locator('#rayNoteCount').fill('0');await page.locator('#rayUpdateNotes').click();
  assert.equal(await page.locator('#rayNoteCount').inputValue(),'0');
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.length),6);
  await page.locator('#rayNoteCount').fill('94');await page.locator('#rayUpdateNotes').click();
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.length),100);
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.filter(i=>!RayBuilder.notes.has(i.id)).length),6,'Growing keeps all six flowers');
  await page.locator('#rayNoteCount').fill('95');await page.locator('#rayUpdateNotes').click();
  assert.equal(await page.evaluate(()=>NebulaApp.state.items.length),100,'Never silently discard flowers above the limit');
 }
 await ready(base+'studio.html?template=anus-daydream');
 const code=await page.evaluate(()=>NebulaLink.encode(NebulaApp.state));
 await page.goto(base+'order.html#b='+code);await page.locator('#orderSheet').waitFor({state:'visible'});
 assert.match(await page.locator('#osTotal').textContent(),/final quote required/);
 assert.match(await page.locator('#osFinishes').textContent(),/Lilac triangle paper/);
 assert.doesNotMatch(await page.locator('#rayOrderTerms').textContent(),/supplies the notes/);
 assert.equal(await page.locator('#language').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:require('node:path').join(qa,'review-order-mobile.png'),fullPage:true});
};
