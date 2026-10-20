/* The florist's order sheet. Read-only: it renders the bouquet the customer designed,
   the recipe to make it, and who it is for. Nothing here edits or sends anything. */
(function(){
'use strict';
const $=id=>document.getElementById(id),M=NebulaModel,R=NebulaRenderer,{CAT,CONFIG}=NebulaConfig;
let lang='en',state=null,order=null;
const t=(k,v)=>NebulaI18n.text(lang,k,v),name=id=>CAT[id][lang];
try{lang=localStorage.getItem(NebulaShop.key('nebulaLanguageV4'))==='es'?'es':'en';}catch(e){}
function localizePage(){document.documentElement.lang=lang;$('language').value=lang;$('brandName').textContent=CONFIG.brand;document.title=CONFIG.brand+' — '+(lang==='es'?'Ficha del ramo':'Bouquet sheet');document.querySelector('.brand').href='index.html';for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);}

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
 if(f.paper&&f.paper!=='none'&&(state.mode==='classic'||f.collar!==false))out.push([t('wrapping'),t(f.paper)]);
 if(f.ribbon&&f.ribbon!=='none')out.push([t('ribbon'),t(f.ribbon)]);
 const sashKeys={love:'sashLove',bday:'sashBday',wed:'sashWedding',blank_blackband:'sashBlackband',blank_champagne:'sashChampagne',blank_emerald:'sashEmerald',blank_cocoa:'sashCocoa'};
 if(f.sash&&f.sash!=='none')out.push([t('sash'),t(sashKeys[f.sash]||f.sash)+(f.sashText?' — '+f.sashText:'')]);
 if(f.butterfly)out.push([t('butterfly'),'× '+(f.butterfly===true?1:f.butterfly)]);
 if(f.crown)out.push([t('crown'),'✓']);
 if(f.chocolateBox)out.push([t('chocolateBox'),'× 1']);
 if(window.NebulaCustomization){for(const e of NebulaCustomization.extras(state))out.push([t(e.id),'× '+e.quantity]);if(state.mode!=='dome'){for(const d of f.decorations||[])out.push([t(d.id),'× 1']);if(f.initial)out.push([t('floralInitial'),f.initial]);}}
 if(state.mode==='dome'){
  if(f.fillerCount&&f.studio?.breath===undefined)out.push([t('filler'),'× '+f.fillerCount+' · '+t(f.fillerPattern)]);
  if(f.greeneryCount)out.push([t('interiorGreenery'),'× '+f.greeneryCount]);
  if(f.initial)out.push([t('floralInitial'),f.initial+' · '+Math.round(f.initialScale*100)+'%']);
  for(const d of f.decorations||[])out.push([t(d.id),'× 1 · '+Math.round(d.scale*100)+'% · '+d.rotation+'° · '+t(d.layer)]);
 }
 if(state.mode==='dome'&&f.pumpkin)out.push([t('pumpkin'),t('position'+f.pumpkinPosition[0].toUpperCase()+f.pumpkinPosition.slice(1))+' · '+Math.round(f.pumpkinScale*100)+'%']);
 if(state.mode==='dome'&&f.bow&&f.sash==='blank_cocoa')out.push([t('bow'),'✓']);
 if(state.mode!=='classic'&&f.greenRim)out.push([t('greenRim'),NebulaGeometry.greenRimStems(state)+' × '+name('eucalyptus')]);
 for(const line of NebulaSpooky.extras(state))out.push([t(line.id),'× '+line.quantity]);
 return out;
}
function gPhoto(){return window.NebulaPhoto?.active(state);}
function paintSheet(){
 document.documentElement.lang=lang;
 /* The same swap the studio page makes: the logo is served from the embedded
    bundle, not from a file path. Pointed at assets/brand/ it rendered as a broken
    image wherever that folder was not deployed alongside - and this sheet is the
    first thing every florist opens. */
 const mark=CONFIG.logo||(NEBULA_META.brand&&NEBULA_META.brand.mark),logo=document.querySelector('.brand-chip img');
 if(mark&&logo)logo.src=NebulaRenderer.source(mark);
 $('brandName').textContent=CONFIG.brand;document.title=CONFIG.brand+' — '+(lang==='es'?'Ficha del ramo':'Bouquet sheet');document.querySelector('.brand').href='index.html';
 $('language').value=lang;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);

 const o=order||{},p=M.price(state);
 $('osRef').textContent=o.ref||t('osNoRef');
 $('osWhen').textContent=o.date?prettyDate(o.date):'';
 $('osTitle').textContent=(state.title||'').trim();

 /* Work-order labels, not the customer-facing questions the checkout asked. */
 const dl=$('osCustomerList');dl.replaceChildren();
 if(CONFIG.requestChannel==='sms')dl.closest('.os-card').hidden=!Object.values(o).some(Boolean);
 row(dl,t('osName'),o.name);
 row(dl,t('osPhone'),o.phone);
 row(dl,t('osNeeded'),prettyDate(o.date));
 row(dl,t('osHandover'),o.method);
 if(CONFIG.requestChannel!=='sms')row(dl,t('osPayBy'),o.pay);
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
 if(NebulaRequest.recipient('+'+(phone.length===10?'1'+phone:phone))){
  reply.href=NebulaRequest.url(CONFIG.requestChannel,'+'+(phone.length===10?'1'+phone:phone),t('osReplyText',{ref:o.ref||''}));
  reply.hidden=false;
 }else reply.hidden=true;

 $('osOpenStudio').href=(gPhoto()?'pink-proof.html':'studio.html')+location.hash;
 if(gPhoto()){ $('osTotal').textContent=lang==='es'?'Pendiente de confirmar':'Pricing pending'; $('osFinishes').textContent=lang==='es'?'Estudio visual: papel provisional; lazo pendiente. Cantidades sin confirmar.':'Visual study: temporary paper; bow pending. Quantities unconfirmed.'; if(state.photographic.version===2)$('osFinishes').textContent=lang==='es'?'Estudio floral sin envoltorio. Papel, lazo y cantidades pendientes.':'Unwrapped flower study. Paper, bow and quantities pending.'; const photo=state.photographic; const detail=document.createElement('p');detail.textContent=(lang==='es'?'Papel: ':'Paper: ')+({gingham:lang==='es'?'cuadros melocotón':'peach gingham',ivory:lang==='es'?'marfil':'ivory',none:lang==='es'?'sin papel':'none'}[photo.paper])+' · '+(lang==='es'?'Paniculata: ':'Baby’s breath: ')+(photo.filler?(lang==='es'?'incluida, cantidad pendiente':'included, quantity pending'):(lang==='es'?'sin incluir':'off'));$('osFinishes').append(detail); }
 if(!NebulaShop.assess(state).ok){
  let notice=$('shopCapabilityNotice');if(!notice){notice=document.createElement('p');notice.id='shopCapabilityNotice';notice.className='notice-block';$('orderSheet').prepend(notice);}notice.textContent=NebulaShop.message(lang);
 }
 $('osFooter').textContent=(shop.studio&&shop.studio.name?shop.studio.name+' · ':'')+(shop.studio&&shop.studio.site||'');
}
function boot(){
 localizePage();
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
 try{localStorage.setItem(NebulaShop.key('nebulaLanguageV4'),lang);}catch(err){}
 localizePage();
 if(state)paintSheet();
};
$('printBtn').onclick=()=>window.print();
boot();
})();
