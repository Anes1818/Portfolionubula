'use strict';
const {createHash,randomBytes}=require('node:crypto');
const SHOPS=new Set(['la-flor-eterna']),ID=/^[A-Za-z0-9_-]{22}$/;
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
// Same bounded z1 transport as the existing design-link codec. Never execute payloads.
function readCode(code){
 if(typeof code!=='string'||code.length>24000||!/^[-_A-Za-z0-9]+$/.test(code))fail(400,'Invalid design');
 let bytes=Buffer.from(code.startsWith('z1_')?code.slice(3):code,'base64url');
 if(code.startsWith('z1_')){
  const out=[];
  for(let i=0;i<bytes.length;){const flags=bytes[i++];if(i===bytes.length)fail(400,'Invalid design');
   for(let bit=0;bit<8&&i<bytes.length;bit++){
    if(flags&(1<<bit)){if(i+3>bytes.length)fail(400,'Invalid design');const distance=(bytes[i++]<<8)|bytes[i++],n=bytes[i++]+3;if(!distance||distance>out.length||out.length+n>64000)fail(400,'Invalid design');for(let j=0;j<n;j++)out.push(out[out.length-distance]);}
    else out.push(bytes[i++]);if(out.length>64000)fail(400,'Invalid design');
   }
  }bytes=Buffer.from(out);
 }
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail(400,'Invalid design');}
 const seven=Array.isArray(p),rest=seven?p[4]:p;
 if(!rest||typeof rest!=='object'||Array.isArray(rest))fail(400,'Invalid design');
 if(seven?(p.length!==5||p[0]!==7||![0,1,2].includes(p[1])):(p.v!==6||!['classic','dome','heart'].includes(p.m)))fail(400,'Invalid design');
 // Names, contact details and request/card notes stay in the user's messaging app.
 const allowed=seven?['p','c','f','l','h','a','g','i']:['v','m','s','f','photo','c','fin','layout','hr','a','g'];
 if(Object.keys(rest).some(k=>!allowed.includes(k)))fail(400,'Private or unsupported design fields');
 const runs=seven?p[3]:p.f;
 if(!Array.isArray(runs)||!runs.length||runs.length>100||runs.some(r=>!Array.isArray(r)||r.length!==2||!Number.isInteger(r[1])||r[1]<1)||runs.reduce((n,r)=>n+r[1],0)>100)fail(400,'Invalid flowers');
 return code;
}
function validate(body){
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['shopId','code','purpose','requestKey'].includes(k)))fail(400,'Invalid request');
 if(!SHOPS.has(body.shopId)||!['share','request'].includes(body.purpose)||!ID.test(body.requestKey||''))fail(400,'Invalid request');
 return {...body,code:readCode(body.code)};
}
function validateRequest(body){
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['shopId','designId','requestKey','customerName','requestedDate','method','reference'].includes(k)))fail(400,'Invalid request');
 if(!SHOPS.has(body.shopId)||!ID.test(body.designId||'')||!ID.test(body.requestKey||''))fail(400,'Invalid request');
 if(typeof body.customerName!=='string'||!body.customerName.trim()||body.customerName.length>120||/[\u0000-\u001f\u007f]/.test(body.customerName))fail(400,'Invalid customer name');
 if(!['Pickup','Delivery'].includes(body.method)||typeof body.requestedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.requestedDate))fail(400,'Invalid request details');
 const date=new Date(body.requestedDate+'T12:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==body.requestedDate)fail(400,'Invalid date');
 if(typeof body.reference!=='string'||!/^[-A-Z0-9]{1,50}$/.test(body.reference))fail(400,'Invalid reference');
 return {...body,customerName:body.customerName.trim()};
}
function createService(store,{now=()=>Date.now(),dailyLimit=200,visitorLimit=20}={}){
 return {
  async create(body,visitor){
   const p=validate(body),time=now(),day=new Date(time).toISOString().slice(0,10),digest=hash(p.code+'|'+p.purpose);
   return store.atomic(async tx=>{
    const requestPath='linkRequests/'+p.shopId+'_'+p.requestKey,existing=await tx.get(requestPath);
    if(existing&&existing.expiresAt>time){if(existing.digest!==digest)fail(409,'Request key already used');return {id:existing.id,expiresAt:existing.expiresAt};}
    const metricPath='linkMetrics/'+p.shopId+'_'+day,limitPath='linkLimits/'+hash(day+'|'+visitor);
    const metrics=await tx.get(metricPath)||{},limit=await tx.get(limitPath)||{};
    if((metrics.savedDesigns||0)>=dailyLimit||(limit.count||0)>=visitorLimit)fail(429,'Daily save limit reached');
    const id=randomBytes(16).toString('base64url'),expiresAt=time+90*86400000;
    tx.set('bouquetLinks/'+id,{shopId:p.shopId,code:p.code,createdAt:time,expiresAt});
    tx.set(requestPath,{id,digest,expiresAt});
    tx.set(metricPath,{...metrics,shopId:p.shopId,day,savedDesigns:(metrics.savedDesigns||0)+1,shareSnapshots:(metrics.shareSnapshots||0)+(p.purpose==='share'?1:0),requestSnapshots:(metrics.requestSnapshots||0)+(p.purpose==='request'?1:0)});
    tx.set(limitPath,{count:(limit.count||0)+1,expiresAt:time+2*86400000});
    return {id,expiresAt};
   });
  },
  async prepareRequest(body,visitor){
   const p=validateRequest(body),time=now(),day=new Date(time).toISOString().slice(0,10);
   const yesterday=new Date(time-86400000).toISOString().slice(0,10);
   if(p.requestedDate<yesterday)fail(400,'Date is in the past');
   const details={shopId:p.shopId,designId:p.designId,customerName:p.customerName,requestedDate:p.requestedDate,method:p.method,reference:p.reference},digest=hash(JSON.stringify(details));
   return store.atomic(async tx=>{
    const keyPath='requestDraftKeys/'+p.shopId+'_'+p.requestKey,existing=await tx.get(keyPath);
    if(existing&&existing.expiresAt>time){if(existing.digest!==digest)fail(409,'Request key already used');return {id:existing.id,expiresAt:existing.expiresAt};}
    const design=await tx.get('bouquetLinks/'+p.designId);
    if(!design||design.shopId!==p.shopId||design.expiresAt<=time)fail(404,'Design unavailable');
    const metricPath='linkMetrics/'+p.shopId+'_'+day,limitPath='linkLimits/request_'+hash(day+'|'+visitor);
    const metrics=await tx.get(metricPath)||{},limit=await tx.get(limitPath)||{};
    if((metrics.preparedRequests||0)>=dailyLimit||(limit.count||0)>=visitorLimit)fail(429,'Daily request limit reached');
    const id=randomBytes(16).toString('base64url'),expiresAt=Math.min(design.expiresAt,time+90*86400000);
    tx.set('requestDrafts/'+id,{...details,code:design.code,shortUrl:'https://nebulastudio.site/b/#'+p.designId,status:'prepared',createdAt:time,expiresAt});
    tx.set(keyPath,{id,digest,expiresAt});
    tx.set(metricPath,{...metrics,shopId:p.shopId,day,preparedRequests:(metrics.preparedRequests||0)+1});
    tx.set(limitPath,{count:(limit.count||0)+1,expiresAt:time+2*86400000});
    return {id,expiresAt};
   });
  },
  async read(id){
   if(!ID.test(id||''))fail(404,'Design unavailable');
   const doc=await store.get('bouquetLinks/'+id);
   if(!doc||doc.expiresAt<=now()||!SHOPS.has(doc.shopId))fail(404,'Design unavailable');
   return {shopId:doc.shopId,code:doc.code,expiresAt:doc.expiresAt};
  }
 };
}
module.exports={createService,HttpError,readCode,validate,validateRequest};
