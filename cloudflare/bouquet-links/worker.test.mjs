import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeHandler} from './worker.mjs';
import {createFirestore} from './firestore.mjs';
import {generateKeyPairSync} from 'node:crypto';
const origin='https://nebulastudio.site';
test('Worker saves consolidated private request, public link excludes name, retry and errors',async()=>{
 const docs=new Map();let chain=Promise.resolve();const store={get:async p=>docs.get(p),atomic:fn=>{const result=chain.then(async()=>{const pending=[];const v=await fn({get:async p=>docs.get(p),set:(p,d)=>pending.push([p,d])});for(const [p,d]of pending)docs.set(p,d);return v;});chain=result.catch(()=>{});return result;}};
 const handler=makeHandler(()=>store),call=(path,body,from=origin)=>handler(new Request('https://worker.example'+path,{method:body===undefined?'GET':'POST',headers:{Origin:from,'Content-Type':'application/json','CF-Connecting-IP':'test'},...(body===undefined?{}:{body:JSON.stringify(body)})}),{});
 const code=Buffer.from(JSON.stringify([7,1,11,[['rose_pink',12]],{c:12}])).toString('base64url');
 const payload={shopId:'la-flor-eterna',purpose:'request',code,requestKey:'abcdefghijklmnopqrstuv'};
 const first=await call('/designs',payload);assert.equal(first.status,201);const design=await first.json();
 assert.equal((await (await call('/designs',payload)).json()).id,design.id);
 const request={shopId:payload.shopId,designId:design.id,requestKey:'ABCDEFGHIJKLMNOPQRSTUV',customerName:'Test Customer',requestedDate:'2099-11-20',method:'Pickup',reference:'LFE-TEST'};
 const saved=await(await call('/requests',request)).json(),record=docs.get('requestDrafts/'+saved.id);assert.equal(record.customerName,'Test Customer');assert.equal(record.code,code);assert.equal(record.shortUrl,origin+'/b/#'+design.id);
 assert.ok(!JSON.stringify(await(await call('/designs/'+design.id)).json()).includes('Test Customer'));
 assert.equal((await call('/requests/'+saved.id)).status,404);assert.equal((await call('/designs')).status,404);
 assert.equal((await call('/designs',payload,'https://other.example')).status,403);
 assert.equal((await call('/designs',{...payload,code:'x'.repeat(30000)})).status,413);
 assert.equal((await call('/requests',{...request,phone:'1234'})).status,400);
});
test('Firestore adapter authenticates server-side, isolates paths, retries aborted transactions',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const env={FIREBASE_PROJECT_ID:'la-flora-6ed47',FIREBASE_SERVICE_ACCOUNT:JSON.stringify({project_id:'la-flora-6ed47',client_email:'test@example.com',private_key:privateKey})};
 let commits=0,tokens=0,rollbacks=0;const calls=[];
 const fake=async(url,options)=>{calls.push(url);const respond=(v,status=200)=>new Response(JSON.stringify(v),{status});
  if(url.includes('oauth2.googleapis.com')){tokens++;assert.match(options.body.get('assertion'),/^[\w-]+\.[\w-]+\.[\w-]+$/);return respond({access_token:'test-token',expires_in:3600});}
  assert.equal(options.headers.Authorization,'Bearer test-token');
  if(url.endsWith(':beginTransaction'))return respond({transaction:'a+/='});
  if(url.endsWith(':rollback')){rollbacks++;return respond({});}
  if(url.endsWith(':commit')){commits++;const body=JSON.parse(options.body);assert.equal(body.transaction,'a+/=');assert.match(body.writes[0].update.name,/nebulaShops\/la-flor-eterna\/requestDrafts\/example$/);assert.equal(body.writes[0].update.fields.customerName.stringValue,'Test');return commits===1?respond({error:{status:'ABORTED'}},409):respond({});}
  assert.ok(url.includes('/nebulaShops/la-flor-eterna/'));return respond({fields:{count:{integerValue:'2'},createdAt:{integerValue:'123'}}});
 };
 const db=createFirestore(env,fake);assert.equal((await db.get('linkMetrics/example')).count,2);
 const value=await db.atomic(async tx=>{assert.equal((await tx.get('linkMetrics/example')).createdAt,123);tx.set('requestDrafts/example',{customerName:'Test'});return 'saved';});
 assert.equal(value,'saved');assert.equal(commits,2);assert.equal(rollbacks,1);assert.equal(tokens,1);assert.ok(calls.some(u=>u.includes('transaction=a%2B%2F%3D')));
});
