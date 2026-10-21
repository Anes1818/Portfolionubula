/* Direct Realtime Database transport. No server credentials belong here. */
(function(g){'use strict';
 const ids=/^[A-Za-z0-9_-]{22}$/,pending=new Map();
 function base(){const url=g.NEBULA_LINK_SERVICE?.firebase?.databaseURL;if(url!=='https://la-flora-6ed47-default-rtdb.firebaseio.com')throw Error('Unknown database');return url+'/nebula/la-flor-eterna/';}
 async function send(path,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  try{const response=await fetch(base()+path+'.json'+(body?'?print=silent':''),{method:body?'PUT':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error('Database access unavailable');return body?null:response.json();
  }finally{clearTimeout(timer);}
 }
 async function read(id){if(!ids.test(id||''))throw Error('Invalid ID');const value=await send('designs/'+id);if(!value||value.shopId!=='la-flor-eterna'||typeof value.code!=='string'||value.code.length>24000||!Number.isFinite(value.expiresAt)||value.expiresAt<=Date.now())throw Error('Design unavailable');return value;}
 async function request(path,options={}){
  if(!options.method||options.method==='GET')return read(path.split('/').pop());
  const p=JSON.parse(options.body);if(p.shopId!=='la-flor-eterna'||!ids.test(p.requestKey||''))throw Error('Invalid save');
  const key=path+'/'+p.requestKey;let item=pending.get(key);
  if(!item){const createdAt=Date.now();item={createdAt};pending.set(key,item);if(pending.size>50)pending.delete(pending.keys().next().value);}
  if(path==='/designs'){
   const record={shopId:p.shopId,code:p.code,purpose:p.purpose,createdAt:item.createdAt,expiresAt:item.createdAt+90*86400000};
   await send('designs/'+p.requestKey,record);return {id:p.requestKey,expiresAt:record.expiresAt};
  }
  if(path==='/requests'){
   const design=await read(p.designId);
   const record={shopId:p.shopId,designId:p.designId,customerName:p.customerName.trim(),requestedDate:p.requestedDate,method:p.method,reference:p.reference,code:design.code,shortUrl:'https://nebulastudio.site/b/#'+p.designId,status:'prepared',createdAt:item.createdAt,expiresAt:design.expiresAt};
   await send('requests/'+p.requestKey,record);return {id:p.requestKey,expiresAt:record.expiresAt};
  }
  throw Error('Unknown operation');
 }
 g.NebulaDatabase={request,read};
})(window);
