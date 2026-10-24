/* A short enquiry uses the existing email service; no database writes or payment. */
(()=>{'use strict';
 const language=document.getElementById('language'),form=document.getElementById('interestForm'),status=document.getElementById('interestStatus'),submit=document.getElementById('interestSubmit'),success=document.getElementById('interestSuccess');
 const languageKey=window.NebulaShop?.key('nebulaLanguageV4')||'shop:nebula-demo:nebulaLanguageV4';
 let lang='en',busy=false,submitted=false;
 try{lang=(localStorage.getItem(languageKey)||localStorage.getItem('nebula-demo:landing-language'))==='es'?'es':'en';localStorage.setItem(languageKey,lang);}catch{}
 function translate(){document.documentElement.lang=lang;language.value=lang;for(const el of document.querySelectorAll('[data-en][data-es]'))el.textContent=el.dataset[lang];if(busy)submit.textContent=lang==='es'?'Enviando…':'Sending…';}
 language.addEventListener('change',()=>{lang=language.value==='es'?'es':'en';try{localStorage.setItem(languageKey,lang);localStorage.setItem('nebula-demo:landing-language',lang);}catch{}translate();});translate();
 // Keep the mobile action available without obscuring the form or its keyboard.
 const mobile=document.querySelector('.mobile-cta'),start=document.getElementById('get-started');
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>mobile.classList.toggle('is-hidden',entries[0].isIntersecting),{threshold:0}).observe(start);
 document.querySelectorAll('a[href="#get-started"]').forEach(a=>a.addEventListener('click',()=>{start.focus({preventScroll:true});}));
 window.addEventListener('pageshow',()=>{try{lang=localStorage.getItem(languageKey)==='es'?'es':'en';}catch{}translate();});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||submitted||!form.reportValidity())return;
  const data=new FormData(form);if(data.get('_gotcha'))return;
  data.set('business',String(data.get('business')).trim());data.set('email',String(data.get('email')).trim());
  if(!data.get('business')){document.getElementById('interestShop').focus();return;}
  data.set('source','Nebula bouquet demo');data.set('_subject','Bouquet studio enquiry — '+data.get('business'));
  data.set('message','Please contact me about a bouquet studio for my shop. Displayed starting price: $29 USD/month. Shop currency: '+data.get('currency')+'. Scope and artwork to be confirmed. No subscription or payment authorized.');
  busy=true;submit.disabled=true;form.setAttribute('aria-busy','true');status.textContent='';translate();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const res=await fetch(form.action,{method:'POST',body:data,headers:{Accept:'application/json'},signal:controller.signal});
   const result=await res.json();if(!res.ok||result.errors||result.error||!(result.ok===true||result.success===true||result.success==='true'))throw Error('Unconfirmed submission');
   submitted=true;form.hidden=true;success.hidden=false;success.focus({preventScroll:true});
   // Local, one-time handoff only. Never put contact details in a URL.
   try{sessionStorage.setItem('nebula-demo-enquiry',JSON.stringify({shop:String(data.get('business')),email:String(data.get('email')),currency:String(data.get('currency')),at:Date.now()}));}catch{}
  }catch{status.textContent=lang==='es'?'No se pudo confirmar el envío. Tus datos siguen aquí; vuelve a intentarlo o escríbenos a nebulastudiosite@gmail.com.':'We couldn’t confirm delivery. Your details are still here—try again or email nebulastudiosite@gmail.com.';}
  finally{clearTimeout(timer);busy=false;submit.disabled=false;form.removeAttribute('aria-busy');translate();}
 });
})();
