/* The florist's order sheet. Read-only: it renders the bouquet the customer designed,
   the recipe to make it, and who it is for. Nothing here edits or sends anything. */
(function(){
'use strict';
const $=id=>document.getElementById(id),M=NebulaModel,R=NebulaRenderer,{CAT,CONFIG}=NebulaConfig;
let lang='en',state=null,order=null;
const t=(k,v)=>NebulaI18n.text(lang,k,v),name=id=>CAT[id][lang];
try{lang=localStorage.getItem('nebulaLanguageV4')==='es'?'es':'en';}catch(e){}

function row(dl,label,value){
 if(!value)return;
 const dt=document.createElement('dt'),dd=document.createElement('dd');
 dt.textContent=label;dd.textContent=value;dl.append(dt,dd);
}
function prettyDate(iso){
 if(!iso)return '';
 const p=String(iso).split('-');if(p.length!==3)return iso;
 const d=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
 return d.toLocaleDateString(lang==='es'?'es-US':'en-US',{weekday:'long',month:'long',day:'numeric'});
}
function finishLabels(f){
 const out=[];
 if(f.paper&&f.paper!=='none')out.push([t('wrapping'),f.paper]);
 if(f.ribbon&&f.ribbon!=='none')out.push([t('ribbon'),f.ribbon]);
 if(f.sash&&f.sash!=='none')out.push([t('sash'),f.sash]);
 if(f.butterfly)out.push([t('butterfly'),'× '+(f.butterfly===true?1:f.butterfly)]);
 if(f.crown)out.push([t('crown'),'✓']);
 if(state.mode!=='classic'&&f.greenRim)out.push([t('greenRim'),'✓']);
 return out;
}
function paintSheet(){
 document.documentElement.lang=lang;
 /* The same swap the studio page makes: the logo is served from the embedded
    bundle, not from a file path. Pointed at assets/brand/ it rendered as a broken
    image wherever that folder was not deployed alongside - and this sheet is the
    first thing every florist opens. */
 const mark=NEBULA_META.brand&&NEBULA_META.brand.mark,logo=document.querySelector('.brand-chip img');
 if(mark&&logo)logo.src=NebulaRenderer.source(mark);
 $('language').value=lang;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);

 const o=order||{},p=M.price(state);
 $('osRef').textContent=o.ref||t('osNoRef');
 $('osWhen').textContent=o.date?prettyDate(o.date):'';
 $('osTitle').textContent=(state.title||'').trim();

 /* Work-order labels, not the customer-facing questions the checkout asked. */
 const dl=$('osCustomerList');dl.replaceChildren();
 row(dl,t('osName'),o.name);
 row(dl,t('osPhone'),o.phone);
 row(dl,t('osNeeded'),prettyDate(o.date));
 row(dl,t('osHandover'),o.method);
 row(dl,t('osPayBy'),o.pay);
 if(o.note)row(dl,t('osNotes'),o.note);

 const cardNote=(state.note||'').trim();
 $('osNoteCard').hidden=!cardNote;
 $('osNote').textContent=cardNote;

 const ul=$('osStems');ul.replaceChildren();
 for(const line of p.lines){
  const li=document.createElement('li');
  const q=document.createElement('strong'),n=document.createElement('span');
  q.textContent=line.quantity+' ×';n.textContent=name(line.id);
  li.append(q,n);ul.append(li);
 }
 const fin=$('osFinishes');fin.replaceChildren();
 for(const[label,value]of finishLabels(state.finishes)){
  const span=document.createElement('span');
  span.className='os-chip';span.textContent=label+': '+value;
  fin.append(span);
 }
 $('osTotal').textContent=M.money(p.totalCents,lang)+(CONFIG.demo?' · '+t('sampleShort'):'');

 const shop=window.NEBULA_SHOP||{},digits=String(shop.whatsapp||'').replace(/\D/g,'');
 const reply=$('osReply'),phone=String(o.phone||'').replace(/\D/g,'');
 if(phone.length>=10){
  reply.href='https://wa.me/'+(phone.length===10?'1'+phone:phone)+'?text='+
   encodeURIComponent(t('osReplyText',{ref:o.ref||''}));
  reply.hidden=false;
 }else reply.hidden=true;

 $('osOpenStudio').href='index.html'+location.hash;
 $('osFooter').textContent=(shop.studio&&shop.studio.name?shop.studio.name+' · ':'')+(shop.studio&&shop.studio.site||'');
}
function boot(){
 const code=NebulaLink.readHash(location.hash);
 if(!code){$('orderLoading').hidden=true;$('orderBroken').hidden=false;return;}
 const parsed=NebulaLink.decode(code);
 if(!parsed){$('orderLoading').hidden=true;$('orderBroken').hidden=false;return;}
 state=parsed.design;order=parsed.order;
 R.ready([state]).then(()=>{
  $('orderLoading').hidden=true;$('orderSheet').hidden=false;
  paintSheet();R.paint($('osCanvas'),state);
 }).catch(()=>{$('orderLoading').hidden=true;$('orderBroken').hidden=false;});
}
$('language').onchange=e=>{
 lang=e.target.value==='es'?'es':'en';
 try{localStorage.setItem('nebulaLanguageV4',lang);}catch(err){}
 if(state)paintSheet();
};
$('printBtn').onclick=()=>window.print();
boot();
})();
