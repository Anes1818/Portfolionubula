(function(){'use strict';
 const status=document.getElementById('status'),retry=document.getElementById('retry');
 async function open(){
  retry.hidden=true;status.textContent='Opening your saved design…';const c=window.NEBULA_LINK_SERVICE,id=location.hash.slice(1);
  if(!/^[A-Za-z0-9_-]{22}$/.test(id)){status.textContent='This bouquet link is incomplete. Please ask the sender for the full link.';return;}
  if(!c?.enabled){status.textContent='Saved bouquet links are not available yet. Please ask the sender for their original design link.';return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{let data;if(c.provider==='realtime'){data=await window.NebulaDatabase.read(id);}else{const res=await fetch(c.endpoint+'/designs/'+id,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(res.status===404){status.textContent='This bouquet link has expired or is unavailable. Please ask for a new link.';return;}if(!res.ok)throw Error();data=await res.json();}
   if(data.shopId!=='la-flor-eterna'||typeof data.code!=='string'||data.code.length>24000||data.expiresAt<=Date.now())throw Error();
   location.replace('/shops/'+data.shopId+'/order.html?d='+id);
  }catch{status.textContent='We could not load your bouquet. Check your connection and try again.';retry.hidden=false;}finally{clearTimeout(timer);}
 }
 retry.onclick=open;open();
})();
