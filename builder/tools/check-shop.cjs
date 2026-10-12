/* Read-only merchant setup check. No browser, network, messages or dependencies. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const runtime=['config.js','asset-meta.js','dome-engine-v2.js','template-engine.js',
 'geometry.js','fall.js','fall-details.js','romance.js','halloween-layout.js',
 'halloween.js','model.js'];

function loadShop(source=fs.readFileSync(path.join(root,'shop-config.js'),'utf8')){
 const context=vm.createContext({console,location:{protocol:'https:'}});
 context.window=context;
 vm.runInContext(source,context,{filename:'shop-config.js',timeout:2000});
 for(const file of runtime)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:2000});
 return context;
}

function audit(context,{live=false}={}){
 const shop=context.NEBULA_SHOP||{}, {CAT,CONFIG}=context.NebulaConfig;
 const errors=[],warnings=[];
 const amount=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
 const text=v=>typeof v==='string'&&v.trim().length>0;
 const checkAmount=(object,key,label)=>{
  if(!Object.hasOwn(object||{},key))errors.push(`${label}: missing explicit price (would use a sample default).`);
  else if(!amount(object[key]))errors.push(`${label}: use integer cents from 0 to 100000000.`);
 };
 checkAmount(shop,'baseCents','baseCents');
 for(const key of Object.keys(CONFIG.laborCents))checkAmount(shop.laborCents,key,`laborCents.${key}`);
 for(const key of Object.keys(CONFIG.extrasCents))checkAmount(shop.extrasCents,key,`extrasCents.${key}`);
 for(const key of Object.keys(CAT))checkAmount(shop.flowerPrices,key,`flowerPrices.${key}`);
 for(const [section,allowed] of [['flowerPrices',CAT],['extrasCents',CONFIG.extrasCents],['laborCents',CONFIG.laborCents]]){
  for(const key of Object.keys(shop[section]||{}))if(!Object.hasOwn(allowed,key))errors.push(`${section}.${key}: unknown key; this price is ignored by the builder.`);
 }
 if(!text(shop.name))errors.push('name: enter the shop name.');
 for(const key of ['name','site','phone'])if(!text(shop.studio?.[key]))errors.push(`studio.${key}: enter the identity shown on shared pictures.`);
 if(typeof shop.whatsapp!=='string'||!/^[1-9]\d{7,14}$/.test(shop.whatsapp))errors.push('whatsapp: use 8–15 international digits, without +, spaces or punctuation.');
 try{
  if(typeof shop.currency!=='string'||!/^[A-Z]{3}$/.test(shop.currency))throw Error();
  const format=new Intl.NumberFormat('en',{style:'currency',currency:shop.currency}).resolvedOptions();
  if(format.minimumFractionDigits!==2||format.maximumFractionDigits!==2)errors.push('currency: this price model requires a currency with two decimal places.');
 }catch{errors.push('currency: use a three-letter uppercase currency code.');}
 if(typeof shop.demo!=='boolean')errors.push('demo: use the boolean true or false.');
 if(live&&shop.demo!==false)errors.push('demo: still true; review shop identity and all prices before enabling a live shop.');
 if(shop.demo===true)warnings.push('Demo mode: all listed amounts remain samples, not approved florist prices.');
 else if(shop.name==='Nebula'&&shop.whatsapp==='15713367129')warnings.push('Nebula demo identity is still configured. Verify it is the intended shop recipient.');
 const bouquets=[];
 for(const collection of [context.NebulaRomance,context.NebulaSpooky,context.NebulaFall]){
  for(const recipe of collection.recipes){
   const design=collection.create(recipe.id),price=context.NebulaModel.price(design);
   if(!Number.isSafeInteger(price.totalCents)||price.totalCents<0)errors.push(`${recipe.id}: invalid calculated total.`);
   bouquets.push({id:recipe.id,pieces:price.pieces,totalCents:price.totalCents});
  }
 }
 return {ok:errors.length===0,mode:shop.demo===false?'shop':'demo',currency:CONFIG.currency,
  coverage:{flowers:Object.keys(CAT).length,extras:Object.keys(CONFIG.extrasCents).length},
  errors,warnings,bouquets};
}

if(require.main===module){
 try{
  const flags=new Set(process.argv.slice(2));
  if([...flags].some(flag=>!['--live','--json'].includes(flag)))throw Error('Usage: node builder/tools/check-shop.cjs [--live] [--json]');
  const report=audit(loadShop(),{live:flags.has('--live')});
  if(flags.has('--json'))console.log(JSON.stringify(report,null,2));
  else{
   console.log(`${report.ok?'PASS':'FIX'}: shop configuration (${report.mode}, ${report.currency})`);
   console.log(`${report.coverage.flowers} flowers/materials and ${report.coverage.extras} extras checked.`);
   for(const message of report.errors)console.log('FIX: '+message);
   for(const message of report.warnings)console.log('NOTE: '+message);
   const money=new Intl.NumberFormat('en',{style:'currency',currency:report.currency});
   for(const b of report.bouquets)console.log(`${b.id}: ${b.pieces} pieces, ${money.format(b.totalCents/100)}`);
   console.log('This checks configuration only. Confirm approved prices and test the deployed handoff on real phones.');
  }
  process.exitCode=report.ok?0:1;
 }catch(error){console.error('FIX: '+error.message);process.exitCode=1;}
}
module.exports={loadShop,audit};
