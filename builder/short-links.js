/* Optional immutable snapshots. Offline/failed saves retain self-contained links. */
(function(g){'use strict';
 const ids=/^[A-Za-z0-9_-]{22}$/,cache=new Map(),requestCache=new Map();let attestation;
 const config=()=>g.NEBULA_LINK_SERVICE||{};
 const enabled=()=>config().enabled===true;
 async function token(){
  if(!attestation)attestation=(async()=>{
   const c=config();if(!c.firebase?.appId||!c.recaptchaSiteKey)throw Error('App Check not configured');
   const [app,check]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js')]);
   const instance=app.initializeApp(c.firebase,'bouquet-links');
   return {check,instance:check.initializeAppCheck(instance,{provider:new check.ReCaptchaEnterpriseProvider(c.recaptchaSiteKey),isTokenAutoRefreshEnabled:true})};
  })();
  const a=await attestation;return (await a.check.getToken(a.instance)).token;
 }
 async function request(path,options={}){
  if(config().provider==='realtime')return g.NebulaDatabase.request(path,options);
  const controller=new AbortController();let timer;
  try{return await Promise.race([(async()=>{
   const headers={'Content-Type':'application/json'};
   if(options.method==='POST'&&config().provider!=='cloudflare')headers['X-Firebase-AppCheck']=await token();
   const response=await fetch(config().endpoint+path,{...options,headers,signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error('Link service unavailable');return response.json();
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Link service timed out'));},8000);})]);}finally{clearTimeout(timer);}
 }
 async function create(design,purpose,fallback){
  if(!enabled()||!g.NEBULA_SHOP?.id)return {url:fallback,saved:false};
  const s=g.NebulaModel.clone(design);s.title='';s.note='';
  const code=g.NebulaLink.encode(s),key=g.NEBULA_SHOP.id+'|'+purpose+'|'+code;
  let item=cache.get(key);
  if(!item){const bytes=crypto.getRandomValues(new Uint8Array(16));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);item={requestKey:btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};cache.set(key,item);if(cache.size>20)cache.delete(cache.keys().next().value);}
  if(item.result&&item.result.expiresAt>Date.now())return item.result;
  if(item.pending)return item.pending;
  item.pending=(async()=>{try{
   const value=await request('/designs',{method:'POST',body:JSON.stringify({shopId:g.NEBULA_SHOP.id,code,purpose,requestKey:item.requestKey})});
   if(!ids.test(value.id)||!Number.isFinite(value.expiresAt)||value.expiresAt<=Date.now())throw Error('Invalid short link');
   return item.result={url:location.origin+'/b/#'+value.id,id:value.id,saved:true,expiresAt:value.expiresAt};
  }catch{return {url:fallback,saved:false,fallback:true};}finally{item.pending=null;}})();return item.pending;
 }
 async function saveRequest(designId,data,reference){
  if(!enabled()||!ids.test(designId||''))return {saved:false};
  const details={shopId:g.NEBULA_SHOP.id,designId,customerName:data.name,requestedDate:data.date,method:data.method,reference};
  const key=JSON.stringify(details);let item=requestCache.get(key);
  if(!item){let binary='';for(const b of crypto.getRandomValues(new Uint8Array(16)))binary+=String.fromCharCode(b);item={requestKey:btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};requestCache.set(key,item);if(requestCache.size>20)requestCache.delete(requestCache.keys().next().value);}
  if(item.result?.expiresAt>Date.now())return item.result;
  if(item.pending)return item.pending;
  item.pending=(async()=>{try{
   const value=await request('/requests',{method:'POST',body:JSON.stringify({...details,requestKey:item.requestKey})});
   if(!ids.test(value.id)||!Number.isFinite(value.expiresAt)||value.expiresAt<=Date.now())throw Error('Invalid request record');
   return item.result={saved:true,id:value.id,expiresAt:value.expiresAt};
  }catch{return {saved:false};}finally{item.pending=null;}})();return item.pending;
 }
 async function resolve(id){
  if(!enabled()||!ids.test(id||''))throw Error('Design unavailable');
  const value=await request('/designs/'+id);
  if(value.shopId!==g.NEBULA_SHOP?.id||!g.NebulaLink.decode(value.code)||value.expiresAt<=Date.now())throw Error('Design unavailable');
  return value.code;
 }
 g.NebulaShortLinks={create,saveRequest,resolve,enabled};
 addEventListener('DOMContentLoaded',()=>{
  if(!enabled())return;
  const notes=[];
  for(const selector of ['#saveDialog .save-actions','#orderForm']){const parent=document.querySelector(selector);if(!parent)continue;const note=document.createElement('p');note.className='helper';parent.append(note);notes.push({note,order:selector==='#orderForm'});}
  const update=()=>{const es=document.getElementById('language')?.value==='es';for(const {note,order}of notes)note.textContent=order?(es?'Al preparar la solicitud, guardamos tu nombre, fecha solicitada y recogida/entrega para la tienda. Estos datos son privados; el enlace solo muestra el diseño. Debes enviar el mensaje para contactar a la tienda.':'Preparing a request saves your name, requested date and pickup/delivery choice privately for the shop. The shared link shows only the design. You still need to send the message to contact the shop.'):(es?'Al compartir, guardamos el diseño durante 90 días. Quien tenga el enlace puede verlo. Tu nombre, contacto y notas no aparecen en ese enlace.':'Sharing saves the design for 90 days. Anyone with the link can view it. Your name, contact details and notes are not included in that link.');};
  update();document.getElementById('language')?.addEventListener('change',update);
 });
})(window);
