/* Integer-cent estimates. Shared by the draft UI and future server checkout.
   Null means unresolved; it must never silently become zero or a live quote. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RayPricing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const integer=(n,max=100000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 function safeAdd(a,b){const n=a+b;if(!Number.isSafeInteger(n)||n>100000000)throw Error('Estimate exceeds the supported amount.');return n;}
 function convertCash({currency,denomination,count},policy){
  if(!['CAD','USD'].includes(currency)||!integer(count,100)||!integer(denomination,100)||!policy.denominations[currency]?.includes(denomination))throw Error('Choose a supported note currency, denomination and whole note count.');
  const faceCents=denomination*100*count;
  if(currency==='CAD'||!count)return {faceCents,cadCents:faceCents,currency};
  const rate=policy.usdToCad;
  if(!rate||!integer(rate.numerator,1000000)||rate.numerator===0||!integer(rate.denominator,1000000)||rate.denominator===0)return {faceCents,cadCents:null,currency,reason:'The shop must confirm its USD-to-CAD pricing rate.'};
  const product=faceCents*rate.numerator;if(!Number.isSafeInteger(product))throw Error('Cash conversion exceeds the supported amount.');
  const cadCents=Math.floor((product+rate.denominator/2)/rate.denominator);
  if(!integer(cadCents))throw Error('Cash conversion exceeds the supported amount.');
  return {faceCents,cadCents,currency,rate:{numerator:rate.numerator,denominator:rate.denominator}};
 }
 function exchangeMargin(cadCents,policy){
  const bps=policy.usdExchangeMarginBps??0;
  if(!integer(bps,10000)||!integer(cadCents))throw Error('Invalid USD exchange buffer.');
  return Math.floor((cadCents*bps+5000)/10000);
 }
 function paymentSchedule(totalCents,choice='deposit',policy={depositBps:5000}){
  if(!integer(totalCents)||!['deposit','full'].includes(choice)||!integer(policy.depositBps,10000)||policy.depositBps<5000)throw Error('Invalid payment policy or amount.');
  const dueCents=choice==='full'?totalCents:Math.ceil(totalCents*policy.depositBps/10000);
  return {currency:'CAD',choice,totalCents,dueCents,balanceCents:totalCents-dueCents,balanceDue:'At delivery'};
 }
 function foamTier(count,policy){
  if(!integer(count,100)||!count)throw Error('Invalid foam rose count.');
  const rows=policy.menu.foamTiers,exact=rows.find(r=>r[0]===count);
  if(exact)return {minCents:exact[1],maxCents:exact[1],exact:true};
  const lower=rows.filter(r=>r[0]<count).at(-1)||rows[0],upper=rows.find(r=>r[0]>count)||rows.at(-1);
  return {minCents:lower[1],maxCents:upper[1],exact:false};
 }
 function mixedRange(count,policy){
  if(!integer(count,100)||!count)throw Error('Invalid mixed flower count.');
  const rows=policy.menu.mixedRanges,exact=rows.find(r=>count>=r[0]&&count<=r[1]);
  if(exact)return {minCents:exact[2],maxCents:exact[3],exact:true};
  const lower=rows.filter(r=>r[1]<count).at(-1)||rows[0],upper=rows.find(r=>r[0]>count)||rows.at(-1);
  return {minCents:lower[2],maxCents:upper[3],exact:false};
 }
 function estimate(input,policy){
  if(!input||!['dome','heart'].includes(input.mode))throw Error('Only Buchón and Heart are supported.');
  const missing=[],lines=[];let subtotalCents=0;
  function line(id,label,quantity,unitCents){if(!integer(quantity,100))throw Error('Invalid quantity for '+id);if(!quantity)return;if(!integer(unitCents)){missing.push(label+' price');return;}const totalCents=quantity*unitCents;subtotalCents=safeAdd(subtotalCents,totalCents);lines.push({id,label,quantity,unitCents,totalCents});}
  let flowers=0;for(const [id,count]of Object.entries(input.flowers||{})){if(!Object.hasOwn(policy.unitCents,id))throw Error('Unsupported flower material: '+id);line(id,id==='ribbon_rose'?'Ribbon roses':'Foam roses',count,policy.unitCents[id]);flowers+=count;}
  if(flowers>100)throw Error('At most 100 flowers are supported.');
  const glitter=input.glitterCount||0;if(!integer(glitter,100)||glitter>flowers)throw Error('Glitter count must not exceed the flower count.');line('glitter','Glitter finish',glitter,policy.glitterPerFlowerCents);
  for(const [id,count]of Object.entries(input.extras||{})){if(!Object.hasOwn(policy.extrasCents,id))throw Error('Unsupported finishing detail: '+id);line(id,id.replaceAll('_',' '),count,policy.extrasCents[id]);}
  const cash=convertCash(input.cash||{currency:'CAD',denomination:5,count:0},policy);
  if(cash.cadCents===null)missing.push(cash.reason);else if(cash.cadCents){subtotalCents=safeAdd(subtotalCents,cash.cadCents);lines.push({id:'cash',label:'Cash gift ('+cash.currency+')',quantity:1,unitCents:cash.cadCents,totalCents:cash.cadCents});}
  if(cash.currency==='USD'&&cash.cadCents!==null)line('usd_exchange_margin','USD exchange buffer',1,exchangeMargin(cash.cadCents,policy));
  if(flowers||input.cash?.count){
   if(input.cash?.count&&policy.moneyFeePolicy==='replaces-base-and-labor')line('money_styling','Money bouquet styling',1,policy.moneyStylingCents);
   else{line('base','Preparation and wrapping',1,policy.baseCents);line('labor','Arranging',1,policy.laborCents?.[input.mode]);if(input.cash?.count){if(policy.moneyFeePolicy==='additional')line('money_styling','Money bouquet styling',1,policy.moneyStylingCents);else missing.push('How the money styling fee combines with preparation and arranging');}}
  }
  return {currency:'CAD',lines,cash,subtotalCents,totalCents:missing.length?null:subtotalCents,missing,approved:policy.approved===true,estimateOnly:true};
 }
 const format=cents=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
 return {convertCash,exchangeMargin,paymentSchedule,foamTier,mixedRange,estimate,format};
});
