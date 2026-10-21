import core from '../../firebase/functions/core.js';
import {createFirestore} from './firestore.mjs';
const origins=new Set(['https://nebulastudio.site','https://www.nebulastudio.site']);
export function makeHandler(storeFactory=createFirestore){return async function(request,env){
 const origin=request.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 const path=new URL(request.url).pathname;
 if(request.method==='OPTIONS')return new Response(null,{status:origins.has(origin)?204:403,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 try{
  if(path==='/health'&&request.method==='GET')return reply({configured:!!env.FIREBASE_SERVICE_ACCOUNT});
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
  if(request.method==='POST'&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
  if(request.method==='POST'&&!['/designs','/requests'].includes(path))return reply({error:'Not found'},404);
  if(request.method==='GET'&&!/^\/designs\/[A-Za-z0-9_-]{22}$/.test(path))return reply({error:'Not found'},404);
  let body;
  if(request.method==='POST'){
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required'},400);
   // Stream cap also covers chunked requests without Content-Length.
   const reader=request.body?.getReader();if(!reader)return reply({error:'Body required'},400);
   const chunks=[];let size=0;
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>28000){await reader.cancel();return reply({error:'Request too large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
   try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'Invalid JSON'},400);}
  }
  const service=core.createService(storeFactory(env));
  if(request.method==='GET')return reply(await service.read(path.split('/').pop()));
  const visitor=request.headers.get('CF-Connecting-IP')||'unknown';
  return reply(await (path==='/designs'?service.create(body,visitor):service.prepareRequest(body,visitor)),201);
 }catch(e){return reply({error:e instanceof core.HttpError?e.message:'Save service unavailable'},e instanceof core.HttpError?e.status:503);}
};}
export default {fetch:makeHandler()};
