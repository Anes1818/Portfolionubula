const assert=require('node:assert/strict');
const {loadShop,audit}=require('../tools/check-shop.cjs');
const base=loadShop(),settings=JSON.parse(JSON.stringify(base.NEBULA_SHOP));
function fixture(edit){const shop=structuredClone(settings);edit(shop);return loadShop('window.NEBULA_SHOP='+JSON.stringify(shop)+';');}
function check(name,fn){fn();console.log('PASS '+name);}
check('Every runtime flower and extra has an explicit valid price',()=>{
 const report=audit(base);assert.deepEqual(report.errors,[]);assert.equal(report.bouquets.length,10);
});
check('Live check distinguishes demo configuration from an approved shop',()=>{
 assert.ok(audit(base,{live:true}).errors.some(e=>e.startsWith('demo:')));
 assert.equal(audit(fixture(s=>{s.demo=false;s.name='Test Florist';s.studio.name='Test Florist';s.whatsapp='12025550123';}),{live:true}).ok,true);
});
check('Missing seasonal and toy prices cannot silently pass the setup check',()=>{
 const report=audit(fixture(s=>{delete s.flowerPrices.rose_black;delete s.flowerPrices.mum_burgundy;delete s.extrasCents.kitty;delete s.extrasCents.spookyMask;}));
 for(const key of ['rose_black','mum_burgundy','kitty','spookyMask'])assert.ok(report.errors.some(e=>e.includes(key)));
});
check('Invalid amounts and misspelled keys are reported',()=>{
 const report=audit(fixture(s=>{s.flowerPrices.rose_red='400';s.extrasCents.sash=-1;s.baseCents=1.5;s.flowerPrices.rose_blak=400;}));
 for(const key of ['rose_red','sash','baseCents','rose_blak'])assert.ok(report.errors.some(e=>e.includes(key)));
});
check('All configured prices, including seasonal overrides, reach the runtime',()=>{
 const context=fixture(s=>{
  Object.keys(s.flowerPrices).forEach((k,i)=>s.flowerPrices[k]=101+i);
  Object.keys(s.extrasCents).forEach((k,i)=>s.extrasCents[k]=201+i);
 });
 assert.equal(audit(context).ok,true);
 for(const [k,v] of Object.entries(context.NEBULA_SHOP.flowerPrices))assert.equal(context.NebulaConfig.CAT[k].priceCents,v,k);
 for(const [k,v] of Object.entries(context.NEBULA_SHOP.extrasCents))assert.equal(context.NebulaConfig.CONFIG.extrasCents[k],v,k);
});
check('Zero-priced items remain valid and are not replaced by defaults',()=>{
 const context=fixture(s=>{for(const section of ['flowerPrices','extrasCents','laborCents'])for(const key of Object.keys(s[section]))s[section][key]=0;s.baseCents=0;});
 const report=audit(context);assert.equal(report.ok,true);assert.ok(report.bouquets.every(b=>b.totalCents===0));
});
check('Wrong contact format and unsupported decimal currencies are reported',()=>{
 const report=audit(fixture(s=>{s.whatsapp='+1 (202) 555 0123';s.currency='JPY';s.studio.site='';}));
 for(const key of ['whatsapp:','currency:','studio.site:'])assert.ok(report.errors.some(e=>e.startsWith(key)));
});
