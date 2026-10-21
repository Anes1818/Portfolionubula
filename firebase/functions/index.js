'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAppCheck}=require('firebase-admin/app-check');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {createService,HttpError}=require('./core');
initializeApp();
const db=getFirestore(),appId=defineString('BOUQUET_WEB_APP_ID');
const plain=snap=>{if(!snap.exists)return null;const d=snap.data();for(const k of ['createdAt','expiresAt'])if(d[k]?.toMillis)d[k]=d[k].toMillis();return d;};
const timestamp=data=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,['createdAt','expiresAt'].includes(k)?Timestamp.fromMillis(v):v]));
const service=createService({get:async path=>plain(await db.doc(path).get()),atomic:fn=>db.runTransaction(tx=>fn({get:async path=>plain(await tx.get(db.doc(path))),set:(path,data)=>tx.set(db.doc(path),timestamp(data))}))});
exports.bouquetLinks=onRequest({region:'us-central1',memory:'256MiB',timeoutSeconds:15,minInstances:0,maxInstances:2,concurrency:20,cors:['https://nebulastudio.site','https://www.nebulastudio.site']},async(req,res)=>{
 res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
 try{
  if(req.method==='POST'&&['/designs','/requests'].includes(req.path)){
   if(!['https://nebulastudio.site','https://www.nebulastudio.site'].includes(req.get('origin')))throw new HttpError(403,'Origin not allowed');
   if(!req.is('application/json')||req.rawBody?.length>28000)throw new HttpError(400,'Invalid request');
   let token;try{token=await getAppCheck().verifyToken(req.get('X-Firebase-AppCheck')||'');}catch{throw new HttpError(401,'App verification required');}
   if(token.appId!==appId.value())throw new HttpError(403,'App not allowed');
   return res.status(201).json(await (req.path==='/designs'?service.create(req.body,req.ip||'unknown'):service.prepareRequest(req.body,req.ip||'unknown')));
  }
  if(req.method==='GET'&&/^\/designs\/[A-Za-z0-9_-]{22}$/.test(req.path))return res.json(await service.read(req.path.split('/').pop()));
  throw new HttpError(404,'Not found');
 }catch(e){if(!(e instanceof HttpError))console.error('bouquet-links operation failed');res.status(e instanceof HttpError?e.status:503).json({error:e instanceof HttpError?e.message:'Service unavailable'});}
});
