'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createService,readCode}=require('../core');
const encode=p=>Buffer.from(JSON.stringify(p)).toString('base64url');
const code=encode([7,1,11,[['rose_pink',12]],{c:12,f:{p:'ivory'}}]);
const body={shopId:'la-flor-eterna',code,purpose:'request',requestKey:'abcdefghijklmnopqrstuv'};
function fixture(options={}){const docs=new Map();let pending=Promise.resolve();const store={get:async k=>docs.get(k),atomic:fn=>{const work=pending.then(async()=>{const writes=[];const value=await fn({get:async k=>docs.get(k),set:(k,v)=>writes.push([k,v])});for(const [k,v] of writes)docs.set(k,v);return value;});pending=work.catch(()=>{});return work;}};return {service:createService(store,options),docs};}
test('immutable snapshot, unguessable ID and exactly-once count for retries',async()=>{
 const {service,docs}=fixture(),results=await Promise.all(Array.from({length:8},()=>service.create(body,'visitor')));
 assert.equal(new Set(results.map(r=>r.id)).size,1);assert.match(results[0].id,/^[\w-]{22}$/);
 assert.equal((await service.read(results[0].id)).code,code);
 assert.equal([...docs].find(([k])=>k.startsWith('linkMetrics/'))[1].savedDesigns,1);
 await assert.rejects(service.create({...body,purpose:'share'},'visitor'),e=>e.status===409);
});
test('separate purpose counts never claim sales',async()=>{
 const {service,docs}=fixture();await service.create(body,'visitor');await service.create({...body,purpose:'share',requestKey:'ABCDEFGHIJKLMNOPQRSTUV'},'visitor');
 const metric=[...docs].find(([k])=>k.startsWith('linkMetrics/'))[1];assert.equal(metric.requestSnapshots,1);assert.equal(metric.shareSnapshots,1);assert.equal(metric.savedDesigns,2);assert.equal(metric.sales,undefined);
});
test('limits are atomic, retries do not consume quota',async()=>{
 const {service}=fixture({dailyLimit:1});await service.create(body,'visitor');await service.create(body,'visitor');await assert.rejects(service.create({...body,requestKey:'ABCDEFGHIJKLMNOPQRSTUV'},'other'),e=>e.status===429);
 const limited=fixture({visitorLimit:1}).service;await limited.create(body,'visitor');await assert.rejects(limited.create({...body,requestKey:'ABCDEFGHIJKLMNOPQRSTUV'},'visitor'),e=>e.status===429);
});
test('reject unknown tenants, oversized and malformed codes, customer fields',async()=>{
 const {service}=fixture();for(const extra of [{shopId:'other-shop'},{purpose:'sale'},{requestKey:'short'},{code:'a'.repeat(24001)},{code:encode([7,1,11,[['rose_pink',12]],{c:12,n:'private message'}])},{code:encode({v:6,m:'classic',s:11,f:[['rose_pink',1]],o:{name:'private'}})},{name:'private'}])await assert.rejects(service.create({...body,...extra},'visitor'),e=>e.status===400);
 for(const invalid of ['z1_','z1_AQAAAA','notjson'])assert.throws(()=>readCode(invalid));
});
test('expired or invalid links cannot be read even before TTL cleanup',async()=>{
 let time=Date.now();const {service}=fixture({now:()=>time});const result=await service.create(body,'visitor');time=result.expiresAt;await assert.rejects(service.read(result.id),e=>e.status===404);await assert.rejects(service.read('../linkMetrics'),e=>e.status===404);
});
test('request identity is private, bounded, idempotent and separate from public designs',async()=>{
 const {service,docs}=fixture(),design=await service.create(body,'visitor');
 const request={shopId:body.shopId,designId:design.id,requestKey:'ABCDEFGHIJKLMNOPQRSTUV',customerName:'María Example',requestedDate:'2099-11-20',method:'Pickup',reference:'LFE-EXAMPLE'};
 const results=await Promise.all(Array.from({length:4},()=>service.prepareRequest(request,'visitor')));assert.equal(new Set(results.map(r=>r.id)).size,1);
 const saved=docs.get('requestDrafts/'+results[0].id);assert.equal(saved.customerName,request.customerName);assert.equal(saved.status,'prepared');assert.ok(!('phone'in saved));assert.ok(!('note'in saved));
 assert.ok(!JSON.stringify(await service.read(design.id)).includes('María'));await assert.rejects(service.read(results[0].id),e=>e.status===404);
 const before=[...docs].find(([k])=>k.startsWith('linkMetrics/'))[1];assert.equal(before.preparedRequests,1);
 await service.create({...body,requestKey:'zyxwvutsrqponmlkjihgfe'},'visitor');assert.equal([...docs].find(([k])=>k.startsWith('linkMetrics/'))[1].preparedRequests,1);
 for(const extra of [{phone:'1234'},{requestedDate:'2099-02-30'},{requestedDate:'2000-01-01'},{customerName:' '},{customerName:'a'.repeat(121)},{method:'Unknown'},{shopId:'other'}])await assert.rejects(service.prepareRequest({...request,...extra},'visitor'),e=>e.status===400);
 await assert.rejects(service.prepareRequest({...request,customerName:'Different'},'visitor'),e=>e.status===409);
 const foreign='AAAAAAAAAAAAAAAAAAAAAA';docs.set('bouquetLinks/'+foreign,{shopId:'another-shop',expiresAt:Date.now()+10000});await assert.rejects(service.prepareRequest({...request,requestKey:'abcdefghijklmnopqrstuw',designId:foreign},'visitor'),e=>e.status===404);
});
