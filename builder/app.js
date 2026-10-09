/* Direct manipulation, complete history, safe local persistence. No network services or checkout. */
(function(){'use strict';
const $=id=>document.getElementById(id),M=NebulaModel,G=NebulaGeometry,R=NebulaRenderer,{CAT,CONFIG,PRESETS,MISSING,SIZES}=NebulaConfig;
let selectedDetail=null,moveMode=false,moveOpenedFocus=false;
const catalogPhotos={"harvest-sunshine":"assets/catalog/harvest-sunshine.jpg","october-cream":"assets/catalog/october-cream.jpg","autumn-latte":"assets/catalog/autumn-latte.jpg","midnight-blooms":"assets/catalog/midnight-blooms.jpg","forever-my-boo":"assets/catalog/forever-my-boo.jpg","scream-for-you":"assets/catalog/scream-for-you.jpg","always-you":"assets/catalog/always-you.jpg","written-in-roses":"assets/catalog/written-in-roses.jpg","pink-promise":"assets/catalog/pink-promise.jpg"};
let galleryBuilt=false,galleryRevision=0,galleryFilter='all';
let banks={},histories={},picks={},focusPreview=false,brush=null,selectedSlot=null,camera={zoom:1,x:0,y:0},panMode=false;
let lang='en',st=M.create(),undoStack=[],redoStack=[],selected=null,picked='rose_pink',tab='flowers',sc=null,gesture=null,hover=null,raf=0,isReady=false,storageOK=true,editFocus=null,exporting=false;
window.__errors=[];addEventListener('error',e=>window.__errors.push(String(e.message)));addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
const t=(key,vars)=>NebulaI18n.text(lang,key,vars),name=id=>CAT[id][lang],snap=()=>JSON.stringify(st);
try{
 lang=localStorage.getItem('nebulaLanguageV4')==='es'?'es':'en';
 const raw=localStorage.getItem(CONFIG.storageKey);
 if(raw){const parsed=M.validatePortfolio(JSON.parse(raw));if(parsed){banks=parsed.bouquets;st=M.clone(banks[parsed.activeMode]);}else{localStorage.setItem(CONFIG.storageKey+'.invalid-backup',raw);setTimeout(()=>toast(t('recovered')),1100);}}
 else{const old=localStorage.getItem(CONFIG.previousKey)||localStorage.getItem(CONFIG.olderKey);if(old){const parsed=JSON.parse(old),studio=M.validatePortfolio(parsed),copied=studio?null:M.validate(parsed);if(studio){banks=studio.bouquets;st=M.clone(banks[studio.activeMode]);}else if(copied){st=copied;banks[st.mode]=M.clone(st);}}}
}catch(e){storageOK=false;}
for(const mode of ['classic','dome','heart'])if(!banks[mode])banks[mode]=mode===st.mode?M.clone(st):M.defaultMode(mode);
function toast(str){$('toast').textContent=str;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function persist(){try{localStorage.setItem(CONFIG.storageKey,JSON.stringify(M.portfolio(st,banks)));storageOK=true;}catch(e){if(storageOK)toast(t('storageWarning'));storageOK=false;}}
function storeHistory(before){if(before===snap())return false;undoStack.push(before);if(undoStack.length>100)undoStack.shift();redoStack=[];return true;}
function change(fn){const before=snap();const result=fn()||{ok:true};if(result.ok===false){st=JSON.parse(before);render(false);showFailure(result);return result;}storeHistory(before);render();return result;}
function history(kind){if(editFocus)commitTextEdit();const from=kind==='undo'?undoStack:redoStack,to=kind==='undo'?redoStack:undoStack;if(!from.length)return;to.push(snap());st=JSON.parse(from.pop());selected=null;hover=null;render();toast(t(kind==='undo'?'undoDone':'redoDone'));}
function button(text,cls,fn){const el=document.createElement('button');el.type='button';el.className=cls||'';el.textContent=text;if(fn)el.addEventListener('click',fn);return el;}
function pressed(el,on){el.setAttribute('aria-pressed',String(on));}
function paragraph(text,cls){const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;return p;}
function openMessage(title,children){$('messageTitle').textContent=title;$('messageContent').replaceChildren(...children);$('messageDialog').showModal();}
let confirmFn=null;
function confirm(title,body,label,fn){$('confirmTitle').textContent=title;$('confirmText').textContent=body;$('confirmYes').textContent=label;confirmFn=fn;$('confirmDialog').showModal();$('confirmCancel').focus();}
function showFailure(result){
 if(['classicCapacity','textureCapacity','topCapacity','topFit','art'].includes(result.reason)){
  const text=result.reason==='art'?t('art')+(result.ids||[]).map(name).join(', '):t(result.reason);
  openMessage(t('capacityTitle'),[paragraph(text),paragraph(t('capacityFooter'),'helper')]);
 }else toast(t(result.reason)||t('placement'));
}
function switchBouquet(mode){moveMode=false;
 if(editFocus)commitTextEdit();if(gesture)endPointer({pointerId:gesture.pointerId},true);
 if(mode===st.mode)return {ok:true};
 histories[st.mode]={undo:undoStack,redo:redoStack};picks[st.mode]=picked;
 const result=M.switchMode(st,mode,banks);if(!result.ok)return result;
 const h=histories[mode]||{undo:[],redo:[]};undoStack=h.undo;redoStack=h.redo;picked=picks[mode]||Object.entries(M.counts(st)).filter(([id])=>CAT[id].kind==='flower').sort((a,b)=>b[1]-a[1])[0]?.[0]||'rose_pink';
 selected=null;selectedSlot=null;brush=null;camera={zoom:1,x:0,y:0};panMode=false;hover=null;render();toast(t('modeRestored',{mode:t(mode)}));return result;
}
function resizeBouquet(n){
 if(st.mode==='classic'||n===st.template.capacity)return;
 const choice=Object.hasOwn(CAT,picked)?picked:'rose_red',trial=M.clone(st),r=M.resize(trial,n,choice);if(!r.ok)return;
 confirm(t('sizeTitle'),t('sizeText',{old:st.template.capacity,n,flower:name(choice),price:M.money(M.price(trial).totalCents,lang)}),t('sizeConfirm'),()=>change(()=>{const result=M.resize(st,n,choice);selected=null;selectedSlot=null;camera={zoom:1,x:0,y:0};return result;}));
}
function stopBrush(){moveMode=false;brush=null;selected=null;selectedSlot=null;panMode=false;render(false);toast(t('brushStopped'));}
function positionDelete(){
 const b=$('inlineDelete'),n=sc?.nodes.find(n=>n.uid===selected);b.hidden=!n||!!gesture||!!brush||moveMode;
 if(!n||brush||moveMode)return;const r=$('bouquet').getBoundingClientRect(),a=$('artSurface').getBoundingClientRect(),v=R.view(st,camera),unit=r.width/720;
 /* On a phone the 44px target is wider than the bloom itself, so offsetting by a
    fraction of the bloom still buried its face. Clear the bloom box in SCREEN pixels
    instead: the button hangs off the top-right corner and leaves the bloom draggable. */
 const size=b.offsetWidth||44,bw=n.w*v.scale*unit,bh=n.h*v.scale*unit;
 const cx=r.left-a.left+(v.x+n.x*v.scale)*unit,cy=r.top-a.top+(v.y+n.y*v.scale)*unit;
 const x=cx+bw/2+size*.34,y=cy-bh/2-size*.34;
 if(x<0||x>a.width||y<0||y>a.height){b.hidden=true;return;}
 b.style.left=Math.max(22,Math.min(a.width-22,x))+'px';b.style.top=Math.max(52,Math.min(a.height-50,y))+'px';b.setAttribute('aria-label',t('removeItem')+': '+name(n.id));b.title=t('removeItem')+': '+name(n.id);
}
function setZoom(z){camera.zoom=G.clamp(z,1,3);const lim=(camera.zoom-1)*300;camera.x=G.clamp(camera.x,-lim,lim);camera.y=G.clamp(camera.y,-lim,lim);if(camera.zoom===1){camera.x=camera.y=0;panMode=false;}render(false);}
function setFocusPreview(on){focusPreview=!!on;document.body.classList.toggle('preview-focus',focusPreview);$('focusPreview').setAttribute('aria-pressed',String(focusPreview));$('focusPreview').setAttribute('aria-label',t(focusPreview?'closeFocus':'expandPreview'));$('focusLabel').textContent=t(focusPreview?'closeShort':'expandShort');fitPhoneCanvas();scheduleCanvas();}
function setLanguage(value){if(editFocus)commitTextEdit();lang=value==='es'?'es':'en';try{localStorage.setItem('nebulaLanguageV4',lang);}catch(e){}render(false);}
function localize(){
 document.documentElement.lang=lang;document.title=CONFIG.brand+' — '+t('pageTitle');$('brandName').textContent=CONFIG.brand;document.querySelector('.brand').setAttribute('aria-label',CONFIG.brand+' '+t('studioFooter'));document.querySelector('.site-footer>span').firstChild.textContent=CONFIG.brand+' ';$('language').value=lang;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 for(const el of document.querySelectorAll('[data-label]'))el.setAttribute('aria-label',t(el.dataset.label));
 for(const el of document.querySelectorAll('[data-placeholder]'))el.placeholder=t(el.dataset.placeholder);
 for(const el of document.querySelectorAll('[data-alt]'))el.alt=t(el.dataset.alt);
 $('focusLabel').textContent=t(focusPreview?'closeShort':'expandShort');
 $('focusPreview').setAttribute('aria-label',t(focusPreview?'closeFocus':'expandPreview'));
 if(matchMedia('(max-width:420px)').matches){$('saveTop').textContent=t('shareShort');$('saveTop').setAttribute('aria-label',t('shareBouquet'));}
}
/* Studio credit: rendered once, from validated config, never from page input. */
function renderStudio(){
 /* Point the header mark at the embedded copy, so it also shows from file://
    where a relative path would resolve but a tainted canvas would not. */
 const mark=NEBULA_META.brand?.mark;if(mark&&$('brandLogo'))$('brandLogo').src=R.source(mark);
 const S=CONFIG.studio||{},on=!!(S.name||S.site||S.phone);
 $('studioCredit').hidden=!on;if(!on)return;
 $('studioName').textContent=S.name;$('studioPlace').textContent=S.place;
 $('copyLine').textContent='© '+(S.year||'2026')+' '+(S.name||CONFIG.brand)+' · '+t('rightsReserved');
 const site=$('studioSite');site.textContent=S.site;site.hidden=!S.site;
 if(S.site)site.href='https://'+S.site.replace(/^https?:\/\//,'');
 const tel=$('studioPhone');tel.textContent=S.phone;tel.hidden=!S.phone;
 if(S.phone)tel.href='tel:'+S.phone.replace(/[^\d+]/g,'');
 $('studioSocial').textContent=S.instagram;
}
function scheduleCanvas(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(isReady){sc=R.paint($('bouquet'),st,{selected:selectedDetail?"detail-"+selectedDetail:selected,ghost:hover,guides:true,camera,moveTargets:moveTargets()});positionDelete();}});}
/* Some catalogue entries only read correctly from one camera angle. */
function offered(id){if(NebulaSpooky.active(st))return Array.from({length:st.template.capacity},(_,i)=>NebulaSpooky.allowed(st,i,id)).some(Boolean);return st.mode==='classic'?CAT[id].classic!==false&&CAT[id].classicOffered!==false:CAT[id].top!==false;}
function fillChoices(el,current,{empty=false,classic=false}={}){
 const ids=Object.keys(CAT).filter(id=>offered(id)&&(!classic||CAT[id].classic)),sig=lang+':'+classic+':'+empty+':'+st.mode;
 if(el.dataset.choiceSignature!==sig){el.replaceChildren();if(empty){const o=document.createElement('option');o.value='';o.textContent=t('emptySlot');el.append(o);}for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=name(id)+' · '+M.money(CAT[id].priceCents,lang);el.append(o);}el.dataset.choiceSignature=sig;}
 el.value=current||'';
}
function showGallery(on){
 if(editFocus)commitTextEdit();if(on&&focusPreview)setFocusPreview(false);
 document.body.classList.toggle('gallery-open',on);document.documentElement.classList.toggle('gallery-open',on);$('templateGallery').hidden=!on;$('main').hidden=on;
 $('resumeBuilder').hidden=!isReady;$('browseTemplates').hidden=on;
 if(on){renderGallery();renderSavedBouquets();}else{fitPhoneCanvas();scheduleCanvas();}
}
function renderSavedBouquets(){
 $('floristGuide').hidden=!CONFIG.demo;$('saveCurrentBouquet').disabled=!isReady;
 let entries;try{entries=NebulaSaved.read();}catch{$('savedBouquetList').replaceChildren();$('savedBouquetsStatus').textContent=t('shelfUnavailable');return;}
 $('savedBouquetsStatus').textContent=entries.length?t('shelfCount',{n:entries.length,max:NebulaSaved.limit}):t('shelfEmpty');
 $('savedBouquetList').replaceChildren(...entries.map(entry=>{
  const card=document.createElement('article'),title=document.createElement('h3'),actions=document.createElement('div');card.className='saved-bouquet-card';
  const label=entry.design.title||t('untitledBouquet');title.textContent=label;
  const details=paragraph(entry.design.items.length+' '+t('pieces')+' · '+M.money(M.price(entry.design).totalCents,lang)+(CONFIG.demo?' · '+t('sampleShort'):''),'helper');
  const open=button(t('openSaved'),'button secondary small',async()=>{
   open.disabled=true;
   try{await R.awaitAssets(entry.design);confirm(t('openSaved'),t('openSavedHint'),t('openSaved'),()=>{
    if(st.mode!==entry.design.mode)switchBouquet(entry.design.mode);
    change(()=>{st=M.clone(entry.design);selected=null;selectedSlot=null;brush=null;hover=null;camera={zoom:1,x:0,y:0};$('family').value='all';});
    showGallery(false);setTab('flowers');$('bouquet').focus({preventScroll:true});
   });}catch{toast(t('previewUnavailable'));}finally{open.disabled=false;}
  });open.setAttribute('aria-label',t('openSaved')+' — '+label);open.dataset.savedId=entry.id;
  const remove=button(t('removeSaved'),'text-button',()=>confirm(t('removeSaved'),t('removeSavedHint',{name:label}),t('removeSaved'),()=>{
   try{NebulaSaved.remove(entry.id);renderSavedBouquets();}catch{toast(t('shelfUnavailable'));}
  }));remove.setAttribute('aria-label',t('removeSaved')+' — '+label);remove.dataset.removeSaved=entry.id;
  actions.className='saved-bouquet-actions';actions.append(open,remove);card.append(title,details,actions);return card;
 }));
}
function saveToShelf(){
 if(editFocus)commitTextEdit();
 try{const design=M.clone(st);design.title=$('savedBouquetName').value.trim().slice(0,70)||st.title||t('untitledBouquet');NebulaSaved.save(design);$('exportStatus').textContent=t('shelfSaved');toast(t('shelfSaved'));renderSavedBouquets();}
 catch(e){$('exportStatus').textContent=t(e.message==='full'?'shelfFull':'shelfUnavailable');}
}
function filterCollections(key=galleryFilter){
 galleryFilter=key;
 for(const el of document.querySelectorAll('[data-collection]'))el.hidden=key!=='all'&&el.dataset.collection!==key;
 for(const el of document.querySelectorAll('[data-collection-filter]'))pressed(el,el.dataset.collectionFilter===key);
 $('collectionResult').textContent=t('collectionResult',{n:key==='all'?10:key==='fall'?4:3});
}
function drawCollectionPreview(cv,design){
 const ctx=cv.getContext('2d'),sc=R.scene(design),b=R.artBounds(design,sc),pad=54,scale=Math.min((cv.width-2*pad)/b.w,(cv.height-2*pad)/b.h);
 ctx.clearRect(0,0,cv.width,cv.height);ctx.save();ctx.translate(cv.width/2-(b.x+b.w/2)*scale,cv.height/2-(b.y+b.h/2)*scale);ctx.scale(scale,scale);R.drawArt(ctx,design,{scene:sc});ctx.restore();
}
function showCollectionPreview(recipe,design,picture,photo){
 $('collectionPreviewTitle').textContent=recipe[lang];$('collectionPreviewCopy').textContent=lang==='es'?recipe.descriptionEs:recipe.description;
 // Reuse the selected card's full-resolution raster; no second render can drift.
 $('collectionPreviewImage').alt=recipe[lang];
 const usePhoto=()=>{ $('collectionPreviewImage').src=photo.src;$('collectionPreviewLabel').textContent=t('catalogStyle');pressed($('collectionPreviewPhoto'),true);pressed($('collectionPreviewDesign'),false);};
 const useDesign=()=>{ $('collectionPreviewImage').src=picture.toDataURL('image/png');$('collectionPreviewLabel').textContent=t('designPreviewLabel');pressed($('collectionPreviewPhoto'),false);pressed($('collectionPreviewDesign'),true);};
 $('collectionPreviewPhoto').hidden=!photo;$('collectionPreviewPhoto').onclick=usePhoto;$('collectionPreviewDesign').onclick=useDesign;
 if(photo)usePhoto();else useDesign();
 const price=M.price(design);$('collectionPreviewPrice').textContent=M.money(price.totalCents,lang)+' · '+t(CONFIG.demo?'sampleShort':'requestPrice');
 $('collectionPreviewItems').replaceChildren(...price.lines.map(line=>{const li=document.createElement('li');li.textContent=line.quantity+' × '+name(line.id);return li;}),...price.extraLines.map(line=>{const li=document.createElement('li');li.textContent=line.quantity+' × '+t(line.id);return li;}));
 $('collectionPreviewCustomize').onclick=()=>{$('collectionPreviewDialog').close();applyFallTemplate(recipe.id);};
 $('collectionPreviewDialog').showModal();
}
async function renderGallery(){
 filterCollections();
 if(galleryBuilt&&$('fallTemplateCards').dataset.lang===lang)return;const revision=++galleryRevision;
 galleryBuilt=true;$('fallTemplateCards').dataset.lang=lang;const jobs=[];
 for(const [container,collection] of [['loveTemplateCards',NebulaRomance],['fallTemplateCards',NebulaFall],['halloweenTemplateCards',NebulaSpooky]]){
  $(container).replaceChildren(...collection.recipes.map(recipe=>{
   const design=collection.create(recipe.id),el=document.createElement('article'),cv=document.createElement('canvas'),info=document.createElement('div'),h=document.createElement('h3');
   el.className='fall-template-card';cv.width=1080;cv.height=1240;cv.setAttribute('role','img');cv.setAttribute('aria-label',recipe[lang]);info.className='fall-card-info';h.textContent=recipe[lang];
   const picture=button('','collection-picture'),view=document.createElement('span');picture.dataset.preview=recipe.id;picture.setAttribute('aria-label',t('viewBouquet')+' — '+recipe[lang]);view.className='collection-view-label';view.textContent=t('viewBouquet');picture.append(cv,view);picture.disabled=true;
   let photo=null;
   if(catalogPhotos[recipe.id]){photo=document.createElement('img');photo.className='catalog-photo';photo.alt=recipe[lang]+' — '+t('catalogStyle');photo.loading='lazy';photo.decoding='async';photo.width=928;photo.height=1152;photo.src=catalogPhotos[recipe.id];cv.hidden=true;picture.insertBefore(photo,view);
    const label=document.createElement('span');label.className='catalog-style-label';label.textContent=t('catalogStyle');picture.append(label);
    photo.onerror=()=>{photo.remove();photo=null;cv.hidden=false;label.remove();};
   }
   const details=paragraph(lang==='es'?recipe.descriptionEs:recipe.description,'fall-description'),cost=paragraph(M.money(M.price(design).totalCents,lang)+' · '+t(CONFIG.demo?'sampleShort':'requestPrice'),'fall-price');
   const action=button('','button primary'),status=paragraph('','helper');action.dataset.template=recipe.id;status.setAttribute('role','status');status.hidden=true;
   const count=paragraph(t('previewItems',{n:design.items.length}),'collection-piece-count');info.append(count,h,details,cost,status,action);el.append(picture,info);
   async function preview(){
    el.setAttribute('aria-busy','true');action.disabled=true;picture.disabled=true;action.textContent=t('loadingPreview');status.hidden=true;delete action.dataset.retry;
    try{await R.awaitAssets(design);if(revision!==galleryRevision)return;drawCollectionPreview(cv,design);picture.disabled=false;picture.onclick=()=>showCollectionPreview(recipe,design,cv,photo);action.textContent=t('customizeTemplate');action.setAttribute('aria-label',t('customizeTemplate')+' — '+recipe[lang]);action.onclick=()=>applyFallTemplate(recipe.id);}
    catch{if(revision!==galleryRevision)return;status.textContent=t('previewUnavailable');status.hidden=false;action.textContent=t('retryPreview');action.setAttribute('aria-label',t('retryPreview')+' — '+recipe[lang]);action.dataset.retry='true';action.onclick=preview;}
    finally{if(revision===galleryRevision){el.setAttribute('aria-busy','false');action.disabled=false;}}
   }jobs.push(preview());
   return el;
  }));
 }await Promise.all(jobs);
}
function applyFallTemplate(id){moveMode=false;
 if(editFocus)commitTextEdit();if(st.mode!=='dome')switchBouquet('dome');
 const spooky=NebulaSpooky.recipes.some(r=>r.id===id);const romantic=NebulaRomance.recipes.some(r=>r.id===id);
 change(()=>{st=(spooky?NebulaSpooky:romantic?NebulaRomance:NebulaFall).create(id);picked=st.template.palette[0];selected=null;selectedSlot=null;brush=null;hover=null;camera={zoom:1,x:0,y:0};$('family').value=spooky?'halloween':romantic?'romance':'fall';});
 showGallery(false);setTab('flowers');$('bouquet').focus({preventScroll:true});
}
function render(save=true){
 localize();if(!isReady)return;
 if(st.mode!=='dome'||!st.finishes.decorations.some(d=>d.id===selectedDetail))selectedDetail=null;
 if(!$('templateGallery').hidden){renderGallery();renderSavedBouquets();}
 if(!offered(picked)){picked='rose_pink';brush=null;}
 const berryFamily=$('family').querySelector('[value="strawberry"]');
 berryFamily.hidden=berryFamily.disabled=st.mode==='classic';
 if(st.mode==='classic'&&['strawberry','fall','romance','halloween'].includes($('family').value))$('family').value='rose';
 const top=st.mode!=='classic',p=M.price(st),cap=G.capacity(st.items,st.mode);
 document.body.dataset.organic=String(NebulaFall.active(st));
 document.body.dataset.bouquetMode=st.mode;document.body.classList.toggle('is-painting',!!brush);document.body.classList.toggle('is-panning',panMode);
 sc=R.paint($('bouquet'),st,{selected:selectedDetail?"detail-"+selectedDetail:selected,ghost:hover,guides:true,camera,moveTargets:moveTargets()});
 $('loading').hidden=true;$('emptyHint').hidden=top||st.items.length>0;
 const berries=st.items.filter(i=>i.id==='__berry').length;
 document.body.dataset.berryDome=String(st.mode==='dome'&&berries>=st.items.length*.6&&berries>0);
 $('countLabel').textContent=top?t('slotsCount',{n:p.pieces,cap:st.template.capacity}):[p.flowers?p.flowers+' '+t('mainFlowers'):'',berries?berries+' '+t('berriesCount'):'',p.texture?p.texture+' '+t('sprigs'):''].filter(Boolean).join(' + ')||'0 '+t('pieces');
 $('capacityLabel').textContent=top?t('slotLimit',{cap:st.template.capacity}):t('areaUsed',{a:(cap.area||0).toFixed(1).replace('.0','')});
 $('totalPrice').textContent=M.money(p.totalCents,lang);document.querySelector('.summary-price>span').textContent=t(CONFIG.demo?'demoEstimate':'requestPrice')+' · '+CONFIG.currency;
 $('compositionLabel').textContent=t(st.mode==='classic'?'classicNote':st.mode==='dome'?'domeNote':'heartNote');$('bouquet').setAttribute('aria-label',t('stageLabel',{mode:t(st.mode),n:p.pieces}));
 $('gapCheck').hidden=true;$('collarNotice').hidden=true;
 $('moveFlowers').textContent=t(moveMode?'moveFinish':'moveFlowers');pressed($('moveFlowers'),moveMode);$('moveHelp').textContent=moveMode?t(selected?(top?'movePickTarget':'movePickAnywhere'):'movePickFlower'):'';
 $('gestureHint').hidden=moveMode;
 $('gestureHint').textContent=panMode?t('panView'):brush?t(top?'paintHint':'classicBrushHint'):t(top?'topSelectHint':'classicSelectHint');
 $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;document.querySelectorAll('[data-mode]').forEach(el=>{pressed(el,el.dataset.mode===st.mode);el.disabled=false;});
 $('saveTop').disabled=false;$('shareButton').disabled=st.items.length===0;$('orderButton').disabled=st.items.length===0;$('arrangeButton').disabled=false;
 if(!st.items.some(i=>i.uid===selected))selected=null;
 $('pickedFlower').hidden=!brush;$('pickedName').textContent=name(picked);$('pickedPrice').textContent=M.money(CAT[picked].priceCents,lang)+' '+t('perStem');$('pickedImage').src=R.source(NEBULA_META.flowers[picked].head);
 $('pickedCaption').textContent=t(brush?'brushActive':'selectMode');$('stopBrush').hidden=!brush;$('addOne').hidden=top;$('addOne').disabled=!CAT[picked].classic;
 $('pickedImage').src=R.thumbnail(catalogImage(picked));
 $('family').querySelector('[value=fall]').hidden=st.mode==='classic';$('family').querySelector('[value=romance]').hidden=st.mode==='classic';
 $('catalogueFilters').hidden=false;$('flowerGrid').hidden=false;$('catalogueNote').hidden=false;$('catalogueNote').textContent=t(st.mode==='classic'?'classicCatalogueNote':'topCatalogueNote');
 $('templateTools').hidden=!top;$('toolHint').textContent=t('paintHint');
 $('arrangeRow').hidden=top;
 $('classicWrapping').hidden=false;$('missingWrapping').hidden=true;$('collarToggleLabel').hidden=!top;$('showCollar').checked=st.finishes.collar!==false;
 $('wrapHeading').textContent=t(top?'blackCollar':'ivoryPaper');$('wrapCopy').textContent=t(top?'collarDescription':'wrapDescription');$('wrapEyebrow').textContent=t(top?'realPaper':'oneOriginal');
 $('wrapPreview').src=R.source(top?NEBULA_META.collars[st.mode].url:(NEBULA_META.wraps?.[st.finishes.paper]||NEBULA_META.wrap).back);$('wrapPreview').alt=t(top?'blackCollar':'wrapAlt');$('customTintLabel').hidden=st.finishes.paper!=='custom';$('customTint').value=st.finishes.tint;
 $('sash').value=st.finishes.sash;$('sashSettings').hidden=st.finishes.sash==='none';$('sashTextRow').hidden=!String(st.finishes.sash||'').startsWith('blank_');if(document.activeElement!==$('sashText'))$('sashText').value=st.finishes.sashText||'';$('sashPosition').value=st.finishes.sashPlacement||'auto';$('sashOffset').value=st.finishes.sashOffset||0;
 $('ribbonBlock').hidden=st.mode!=='classic';
 $('autumnFinishes').hidden=st.mode!=='dome';$('pumpkin').checked=!!st.finishes.pumpkin;$('pumpkinSettings').hidden=!st.finishes.pumpkin;$('pumpkinPosition').value=st.finishes.pumpkinPosition;$('pumpkinScale').value=st.finishes.pumpkinScale;
 renderDetails();
 $('cocoaBowLabel').hidden=st.finishes.sash!=='blank_cocoa';$('cocoaBow').checked=!!st.finishes.bow;
 for(const key of ['pumpkin','bow'])$(key+'Price').textContent=M.money(CONFIG.extrasCents[key],lang)+(CONFIG.demo?' · '+t('sampleShort'):'');
 if(st.finishes.paper==='cocoa'){$('wrapPreview').src=R.source(NEBULA_META.collars.domeCocoa.url);$('wrapHeading').textContent=t('cocoa');$('wrapPreview').alt=t('cocoa');}
 if(NebulaFall.active(st)){$('countLabel').textContent=p.pieces+' '+t('pieces');$('capacityLabel').textContent=t('fallCountHint');$('compositionLabel').textContent=t('fallPreview');$('toolHint').textContent=t('fallPaintHint');$('catalogueNote').textContent=t('fallPaintHint');}
 $('greenRimLabel').hidden=st.mode==='classic';$('greenRim').checked=!!st.finishes.greenRim;
 const sprigs=G.greenRimStems({...st,finishes:{...st.finishes,greenRim:true}});
 $('greenRimPrice').textContent=M.money(sprigs*CAT.eucalyptus.priceCents,lang)+' · '+sprigs+(CONFIG.demo?' · '+(lang==='es'?'muestra':'sample'):'');
 $('crown').checked=!!st.finishes.crown;$('crownPrice').textContent=M.money(CONFIG.extrasCents.crown,lang)+(CONFIG.demo?' · '+(lang==='es'?'muestra':'sample'):'');
  /* Butterflies are a count now, so the price reads "each" and the stepper ends
     disable at the limits instead of silently refusing a press. */
  const bf=st.finishes.butterfly|0,maxBf=CONFIG.limits.butterflies;
  $('butterflyCount').textContent=bf;
  $('butterflyLess').disabled=bf<=0;$('butterflyMore').disabled=bf>=maxBf;
  $('butterflyPrice').textContent=M.money(CONFIG.extrasCents.butterfly,lang)+' '+(lang==='es'?'cada una':'each')+(CONFIG.demo?' · '+(lang==='es'?'muestra':'sample'):'');
 if(document.activeElement!==$('designName'))$('designName').value=st.title;if(document.activeElement!==$('giftNote'))$('giftNote').value=st.note;$('noteCounter').textContent=st.note.length+'/180';
 $('separateHint').textContent=t('separateHint');$('sizePanel').hidden=!top;
 $('sizeChoices').replaceChildren(...(SIZES[st.mode]||[]).map(([label,n])=>{const b=button('','size-chip',()=>resizeBouquet(n)),l=document.createElement('strong'),c=document.createElement('small');l.textContent=label;c.textContent=n+' '+(NebulaFall.active(st)?t('pieces'):(lang==='es'?'pos.':'slots'));b.append(l,c);b.dataset.size=label;pressed(b,st.template?.capacity===n);return b;}));
 if(NebulaFall.active(st))$('sizePanel').querySelector('.size-label').textContent=t('bouquetSize');
 $('zoomOut').disabled=camera.zoom<=1;$('zoomIn').disabled=camera.zoom>=3;$('panView').disabled=camera.zoom<=1;pressed($('panView'),panMode);$('artSurface').classList.toggle('zoomed',camera.zoom>1);
 renderCatalog();renderStarting();renderPaper();renderRibbons();renderSpooky();positionDelete();
 if(save)persist();
}
function renderSpooky(){
 const on=NebulaSpooky.active(st),id=st.template?.halloweenRecipe;
 $('finishShortcuts').hidden=st.mode!=='dome';$('halloweenFinishes').hidden=st.mode!=='dome';$('family').querySelector('[value=halloween]').hidden=st.mode==='classic';
 $('spookyCustomize').hidden=!on;
 document.querySelector('[data-i18n=tintDisclosure]').textContent=t(on?'spookyTint':'tintDisclosure');
 $('showCollar').disabled=st.finishes.ghostCount>0;
 document.querySelector('.finish-toggles').hidden=false;
 $('sash').closest('label').hidden=false;
 if(on){
  $('autumnFinishes').hidden=false;$('sizePanel').hidden=true;$('capacityLabel').textContent=t('slotLimit',{cap:st.template.capacity});$('catalogueNote').textContent=t('spookyFixed');$('compositionLabel').textContent=t('halloweenCollection');
  const path=NebulaSpooky.collar({...st,finishes:{...st.finishes,collar:true}},st.frames.dome).url;
  $('wrapPreview').src=R.paperPreview(path,st.finishes.paper,st.finishes.tint);$('wrapPreview').alt=t('paperTone')+': '+t(st.finishes.paper);
  $('wrapHeading').textContent=t(st.finishes.paper);$('wrapCopy').textContent=t(st.finishes.ghostCount?'spookyGhostWrap':'spookyWrapHint');
  const count=brush?Array.from({length:st.template.capacity},(_,i)=>NebulaSpooky.allowed(st,i,brush)).filter(Boolean).length:0;
  $('spookyFitCount').textContent=brush?t('spookyFits',{name:name(brush),n:count,cap:st.template.capacity}):t('chooseBrush');
  const roses=st.items.filter(it=>CAT[it.id].family==='rose'),canRecolor=brush&&CAT[brush].family==='rose';
  $('recolorRoses').disabled=!isReady||!canRecolor||!roses.some(it=>it.id!==brush);
  $('recolorRoses').textContent=canRecolor?t('spookyRecolor',{n:roses.length,name:name(brush)}):t('spookyChooseRose');
 }
 for(const key of ['spookyMask','spookyBow']){$(key+'Row').hidden=false;$(key).checked=!!st.finishes[key];}
 for(const key of ['ghostCount','thistleCount']){$(key+'Row').hidden=false;$(key).value=st.finishes[key];}
 for(const key of ['spookyMask','spookyBow','ghostCount','thistleCount','spookyFiller'])$(key+'Price').textContent=M.money(CONFIG.extrasCents[key==='spookyFiller'?'filler':key],lang)+' · '+(lang==='es'?'cada uno':'each')+(CONFIG.demo?' · '+t('sampleShort'):'');
 $('spookyFillerRow').hidden=true;$('spookyFiller').value=st.finishes.fillerCount;
}
function renderCatalog(){
 const query=$('flowerSearch').value.toLocaleLowerCase(lang).trim(),family=$('family').value;
 const ids=Object.keys(CAT).filter(id=>offered(id)&&(family==='all'||CAT[id].family===family||(family==='halloween'&&NebulaSpooky.catalogue.includes(id))||(family==='romance'&&['rose_pink','rose_red','rose_white','rose_ivory','rose_cream','lily','carnation_white'].includes(id))||(family==='fall'&&['rose_ivory','rose_caramel','mum_rust','mum_burgundy','sunflower','gerbera_daisy','rose_cream','carnation_white','chrysanthemum_yellow'].includes(id)))&&(name(id).toLocaleLowerCase(lang).includes(query)||id.includes(query)));
 $('flowerGrid').replaceChildren(...ids.map(id=>flowerCard(id,()=>chooseFlower(id),brush===id)));
 if(!ids.length)$('flowerGrid').append(paragraph(t('noMatches'),'no-results'));
}
function flowerCard(id,fn,isPicked){
 const cat=CAT[id],available=st.mode!=='classic'||cat.classic,el=button('','flower-card',fn),im=document.createElement('img'),label=document.createElement('strong'),price=document.createElement('small');
 im.src=R.thumbnail(catalogImage(id));im.alt='';im.width=90;im.height=90;im.draggable=false;label.textContent=name(id);price.textContent=available?M.money(cat.priceCents,lang):t(id==='__choc'?'chocNotClassic':'notInClassic');
 if(!available)price.className='not-ready';el.append(im,label,price);el.dataset.flower=id;el.disabled=!available||!isReady;
 el.setAttribute('aria-label',name(id)+', '+price.textContent);if(isPicked!==undefined)pressed(el,isPicked);return el;
}
function catalogImage(id){const m=NEBULA_META.flowers[id];return st.mode==='classic'&&m.classicBlooms?m.classicBloom:st.mode==='dome'&&m.domeHeads?m.domeHeads[0]:m.head;}
function chooseFlower(id){moveMode=false;
 if(!Object.hasOwn(CAT,id)||!offered(id))return;
 selectedDetail=null;picked=id;selected=null;selectedSlot=null;hover=null;panMode=false;
 brush=brush===id?null:id;render(false);
}
function addItem(id=picked,point=null){
 const result=change(()=>M.add(st,id,point));
 if(result.ok){selected=result.uid;selectedSlot=result.slot??null;hover=null;render();toast(t(result.snapped?'snapped':'added'));}return result;
}
function paintSlot(slot,id=brush){if(!id)return {ok:false};const result=change(()=>M.paintSlot(st,slot,id));if(result.ok){selected=result.uid;selectedSlot=slot;render();}return result;}
function removeItem(uid=selected){if(!uid)return;const result=change(()=>M.remove(st,uid));selected=null;selectedSlot=null;render();if(result.ok)toast(t('removed'));return result;}
function selectItem(uid){brush=null;selected=uid;selectedSlot=st.items.find(i=>i.uid===uid)?.slot??null;hover=null;render(false);}
/* Three Classic starting points, shown as pictures instead of a buried list. */
function renderStarting(){
 const panel=$('startingPanel');panel.hidden=st.mode!=='classic';if(panel.hidden)return;
 $('startingRecipes').replaceChildren(...Object.entries(PRESETS).filter(([,preset])=>preset.featured!==false).map(([key,preset])=>{
  const el=button('','recipe-card',()=>useRecipe(preset.items,preset.paper)),im=document.createElement('img'),label=document.createElement('strong'),count=document.createElement('small');
  im.src=R.source(catalogImage(preset.cover));im.alt='';im.width=64;im.height=64;im.draggable=false;
  label.textContent=preset[lang];count.textContent=M.money(M.price(M.create(key)).totalCents,lang);
  el.append(im,label,count);el.dataset.recipe=key;el.disabled=!isReady;
  el.setAttribute('aria-label',preset[lang]+', '+count.textContent);return el;
 }));
}
function renderPaper(){
 $('paperChoices').replaceChildren(...(NebulaSpooky.active(st)?[['cocoa','#694532'],['black','#292826'],['ivory','#e6deca'],['blush','#dbb3b7'],['sage','#b1bba1'],['custom',st.finishes.tint]]:st.mode==='classic'?[['ivory','#e6deca'],['sage','#b1bba1'],['custom',st.finishes.tint]]:[...(st.mode==='dome'?[['cocoa','#694532']]:[]),['black','#292826'],['ivory','#e6deca'],['custom',st.finishes.tint]]).map(([id,col])=>{
  const b=button('','',()=>change(()=>{st.finishes.paper=id;M.refitPaper(st);})),dot=document.createElement('span'),label=document.createElement('span');dot.className='swatch';dot.style.setProperty('--swatch',col);label.textContent=t(id);b.append(dot,label);pressed(b,st.finishes.paper===id);b.dataset.paper=id;return b;
 }));
}
function renderRibbons(){
 if(st.mode!=='classic'){$('ribbonChoices').replaceChildren();return;}
 $('ribbonChoices').replaceChildren(...['none','blush','burgundy','sage'].map(id=>{
  const b=button('','',()=>change(()=>{st.finishes.ribbon=id;}));if(id!=='none'){const im=document.createElement('img');im.src=R.source(NEBULA_META.finishes['ribbon_'+id].url);im.alt='';b.append(im);}else{const n=document.createElement('span');n.className='no-ribbon';n.textContent='—';b.append(n);}const label=document.createElement('span');label.textContent=t(id);b.append(label);pressed(b,st.finishes.ribbon===id);b.dataset.ribbon=id;b.setAttribute('aria-label',t('ribbon')+': '+t(id));return b;
 }));
}
function useRecipe(ids,paper){
 const trial=M.clone(st);trial.items=ids.map(id=>M.newItem(trial,id));const cap=G.capacity(trial.items,trial.mode);if(!cap.ok){showFailure(cap);return;}
 confirm(t('recipeTitle'),t('recipeText',{n:ids.length}),t('recipeConfirm'),()=>{change(()=>{st.items=ids.map(id=>M.newItem(st,id));picked=ids[0];brush=null;$('family').value=CAT[picked].family;if(paper)st.finishes.paper=paper;st.frames={};M.arrange(st,st.mode,{fresh:true});selected=null;hover=null;});$('startingPanel').open=false;toast(t('recipeApplied'));});
}
function setTab(key){
 if(key!=='finishing')selectedDetail=null;
 if(key==='finishing'){brush=null;selected=null;selectedSlot=null;hover=null;}
 tab=key;for(const el of document.querySelectorAll('[data-tab]')){const on=el.dataset.tab===key;el.setAttribute('aria-selected',String(on));el.tabIndex=on?0:-1;}
 for(const key of ['flowers','wrapping','finishing'])$('panel-'+key).hidden=key!==tab;
 if(isReady)render(false);
}
function showMissing(){openMessage(t('missingTitle'),[paragraph(t('allArtworkReady')),paragraph(t('artworkCaveat'),'helper')]);}
function showHelp(){const ol=document.createElement('ol');ol.className='inventory-list';for(let i=1;i<=5;i++){const li=document.createElement('li');li.textContent=t('help'+i);ol.append(li);}openMessage(t('helpTitle'),[ol]);}
function showGap(){const report=R.alphaReport(st);if(!report.applicable)return;const p=paragraph(t('gapResult',{p:report.openPercent.toFixed(2)}),'notice-block');openMessage(t('gapTitle'),[paragraph(t('gapIntro')),p,paragraph(t(report.openPercent<.6?'gapOK':'gapOpen')),paragraph(t('gapFoot'),'helper')]);}
function priceRows(target='priceBreakdown'){const p=M.price(st),nodes=[];function row(label,amount,strong=false){const a=document.createElement(strong?'strong':'span'),b=document.createElement(strong?'strong':'span');a.textContent=label;b.textContent=M.money(amount,lang);nodes.push(a,b);}for(const line of p.lines)row(line.quantity+' × '+name(line.id),line.totalCents);row(t('base'),p.baseCents);row(t('labor'),p.laborCents);for(const line of p.extraLines)row(line.quantity+' × '+t(line.id),line.totalCents);row(t('total'),p.totalCents,true);$(target).replaceChildren(...nodes);}
function showSave(){if(editFocus)commitTextEdit();R.paint($('savePreview'),st);$('savedBouquetName').value=st.title;$('exportStatus').textContent='';priceRows();$('saveDialog').showModal();}
/* ── Order flow ───────────────────────────────────────────────
   Opens WhatsApp with the design written out. Nothing is charged here and no
   order record is created - the florist confirms availability and final price.
   wa.me carries text only, so the bouquet travels as words, not an attachment. */
/* Links are built by design-link.js so the studio and the florist's order sheet
   always read and write the same format. */
function siteBase(){return location.origin+location.pathname.replace(/[^/]*$/,'');}
function designLink(order,design=st){return siteBase()+(order?'order.html':'index.html')+'#b='+NebulaLink.encode(design,order);}
function shopDigits(){const s=window.NEBULA_SHOP||{};return String(s.whatsapp||(s.studio&&s.studio.phone)||'').replace(/\D/g,'');}
function orderRef(){return 'NB-'+Date.now().toString(36).slice(-5).toUpperCase();}
function orderSummary(){
 const p=M.price(st),stems=p.lines.map(l=>l.quantity+' × '+name(l.id)),f=st.finishes,extras=[];
 /* The wrapping buttons already carry translated labels - reuse them rather than
    duplicating every paper colour in the dictionary. */
 const chip=document.querySelector('[data-paper="'+f.paper+'"]');
 if(f.paper&&f.paper!=='none'&&(st.mode==='classic'||f.collar!==false))extras.push(t('wrapping')+': '+((chip&&chip.textContent.trim())||f.paper));
 if(f.ribbon&&f.ribbon!=='none')extras.push(t('ribbon')+': '+t(f.ribbon));
 if(f.sash&&f.sash!=='none')extras.push(t('sash')+': '+$('sash').selectedOptions[0].textContent+(f.sashText?' — '+f.sashText:''));
 if(f.butterfly)extras.push(t('butterfly')+(f.butterfly>1?' ×'+f.butterfly:''));
 if(f.crown)extras.push(t('crown'));
 if(st.mode==='dome'){
  if(f.greeneryCount)extras.push(f.greeneryCount+' × '+t('interiorGreenery'));
  if(f.initial)extras.push(t('floralInitial')+': '+f.initial);
  if(f.fillerCount)extras.push(f.fillerCount+' × '+t('filler')+' · '+t(f.fillerPattern));
  for(const d of f.decorations)extras.push('1 × '+t(d.id));
 }
 if(st.mode==='dome'&&f.pumpkin)extras.push(t('pumpkin')+' · '+t('position'+f.pumpkinPosition[0].toUpperCase()+f.pumpkinPosition.slice(1)));
 if(st.mode==='dome'&&f.bow&&f.sash==='blank_cocoa')extras.push(t('bow'));
 if(st.mode!=='classic'&&f.greenRim)extras.push(t('greenRim')+': '+G.greenRimStems(st)+' × '+name('eucalyptus'));
 for(const line of NebulaSpooky.extras(st))extras.push(line.quantity+' × '+t(line.id));
 return {stems,extras,total:M.money(p.totalCents,lang),pieces:st.items.length};
}
function showOrder(){
 if(editFocus)commitTextEdit();
 if(!st.items.length)return;
 const s=orderSummary();
 R.paint($('orderPreview'),st);
 $('orderRecapTitle').textContent=(st.title||'').trim()||t(st.mode);
 $('orderRecapDetail').textContent=[t(st.mode),s.pieces+' '+t('pieces')].concat(s.extras).join(' · ');
 $('orderRecapPrice').textContent=s.total;
 $('orderContents').textContent=s.stems.join(' · ');
 $('orderDemo').hidden=!CONFIG.demo;
 const d=new Date();$('ordDate').min=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 $('orderError').hidden=true;
 for(const id of ['ordName','ordPhone','ordDate'])$(id).removeAttribute('aria-invalid');
 $('orderDialog').showModal();
 setTimeout(()=>$('ordName').focus(),40);
}
function orderText(ref){
 const s=orderSummary(),v=id=>$(id).value.trim(),L=[];
 L.push('🌹 '+t('orderMsgNew')+' '+ref);
 L.push(v('ordName')+' · '+v('ordPhone'));
 L.push('');
 const title=(st.title||'').trim(),head=t(st.mode)+', '+s.pieces+' '+t('pieces');
 L.push(title?title+' — '+head:head);
 for(const line of s.stems)L.push('• '+line);
 if(s.extras.length)L.push('• '+s.extras.join(' · '));
 L.push('');
 const label=id=>{const el=$(id);return (el.selectedOptions[0]||{}).textContent||el.value;};
 L.push(t('orderMsgWhen')+': '+label('ordMethod')+' — '+v('ordDate'));
 L.push(t('orderMsgPay')+': '+label('ordPay'));
 if(v('ordNote'))L.push(t('orderMsgNote')+': '+v('ordNote'));
 L.push('');
 L.push(t('orderMsgEstimate')+': '+s.total);
 L.push(t(CONFIG.demo?'orderDemo':'orderPending'));
 if(st.note.trim())L.push(t('giftNote')+': '+st.note.trim());
 L.push('');
 /* The florist's link is the order sheet, not the editor: picture, recipe and who
    it is for, all on one page she can work from or print. */
 L.push('👉 '+t('orderMsgSeeIt')+': '+designLink({
  ref, name:v('ordName'), phone:v('ordPhone'), date:v('ordDate'),
  method:label('ordMethod'), pay:label('ordPay'), note:v('ordNote')
 }));
 return L.join('\n');
}
function sendOrder(e){
 e.preventDefault();
 const missing=['ordName','ordPhone','ordDate'].filter(id=>!$(id).value.trim()||!$(id).checkValidity());
 for(const id of ['ordName','ordPhone','ordDate']){if(missing.includes(id))$(id).setAttribute('aria-invalid','true');else $(id).removeAttribute('aria-invalid');}
 if(missing.length){$('orderError').textContent=t('orderMissing');$('orderError').hidden=false;$(missing[0]).focus();return;}
 const digits=shopDigits();
 if(!digits){$('orderError').textContent=t('orderNoShop');$('orderError').hidden=false;return;}
 $('orderError').hidden=true;
 const url='https://wa.me/'+digits+'?text='+encodeURIComponent(orderText(orderRef()));
 // A noopener popup may return null even on success. Same-tab navigation avoids
 // opening the same draft twice and works with mobile app handoff.
 location.assign(url);
 $('orderDialog').close();
 toast(t('orderOpened'));
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
for(const id of ['ordName','ordPhone','ordDate'])$(id).addEventListener('input',()=>{
 if($(id).value.trim()&&$(id).checkValidity())$(id).removeAttribute('aria-invalid');
 if(['ordName','ordPhone','ordDate'].every(k=>$(k).value.trim()&&$(k).checkValidity()))$('orderError').hidden=true;
});
async function exportPNG(story){
 if(exporting)return;exporting=true;const saved=M.clone(st),savedLang=lang;
 $('saveSquare').disabled=true;$('saveStory').disabled=true;$('saveJSON').disabled=true;$('exportStatus').textContent=t('exporting');
 try{const b=await R.blob(saved,1080,story?1920:1080,savedLang);download(b,'nebula-'+saved.mode+'-'+(story?'story':'square')+'.png');$('exportStatus').textContent=t('savedPNG');}
 catch(e){window.__errors.push(String(e));$('exportStatus').textContent=t('exportError');}
 finally{exporting=false;for(const id of ['saveSquare','saveStory','saveJSON'])$(id).disabled=false;}
}
/* Share the bouquet as a real picture. Native sheet when the device supports files,
   otherwise a plain download. Nothing leaves the device until the person picks a target. */
async function shareBouquet(){
 if(exporting)return;exporting=true;const saved=M.clone(st),savedLang=lang,savedLink=designLink(null,saved),btn=$('shareButton');
 btn.disabled=true;$('shareStatus').textContent=t('sharePreparing');
 try{
  const blob=await R.blob(saved,1080,1080,savedLang);
  const file=new File([blob],'nebula-'+saved.mode+'.png',{type:'image/png'});
  /* The link rides along with the picture: whoever receives it can open the exact
     bouquet and change it, instead of only looking at a flat image. */
  const payload={files:[file],title:saved.title||NebulaI18n.text(savedLang,'shareTitle'),text:savedLink};
  if(navigator.canShare?.(payload)&&typeof navigator.share==='function'){
   $('shareStatus').textContent=t('shareOpened');
   try{await navigator.share(payload);$('shareStatus').textContent=t('shareDone');}
   catch(e){$('shareStatus').textContent=t(e.name==='AbortError'?'shareStopped':'shareSaved');
            if(e.name!=='AbortError')download(blob,file.name);}
  }else{download(blob,file.name);$('shareStatus').textContent=t('shareSaved');}
 }catch(e){window.__errors.push(String(e));$('shareStatus').textContent=t('shareFailed');}
 finally{exporting=false;btn.disabled=false;}
}
function reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function importDesign(raw){
 const studio=M.validatePortfolio(raw),validated=studio?null:M.validate(raw?.format==='nebula-bouquet'?raw.design:raw);
 if(!studio&&!validated){toast(t('invalid'));return false;}
 confirm(t('importTitle'),t(studio?'importStudioText':'importText'),t('importConfirm'),()=>{
  if(studio){const backup=M.portfolio(st,banks);try{localStorage.setItem(CONFIG.storageKey+'.before-import',JSON.stringify(backup));}catch(e){}banks=M.clone(studio.bouquets);st=M.clone(banks[studio.activeMode]);histories={};undoStack=[];redoStack=[];}
  else{if(st.mode!==validated.mode)switchBouquet(validated.mode);change(()=>{st=validated;});}
  selected=null;hover=null;render();toast(t('imported'));
 });return true;
}
function commitTextEdit(){if(!editFocus)return;storeHistory(editFocus.before);editFocus=null;$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;persist();}
function syncText(input,key){
 input.onfocus=()=>{if(editFocus)commitTextEdit();editFocus={before:snap(),key};};
 input.oninput=()=>{st[key]=input.value.slice(0,key==='title'?70:180);if(key==='note')$('noteCounter').textContent=st.note.length+'/180';persist();};
 input.onblur=commitTextEdit;
}
function canvasPoint(e){const rect=$('bouquet').getBoundingClientRect();return {x:(e.clientX-rect.left)*720/rect.width,y:(e.clientY-rect.top)*820/rect.height};}
function point(e){return R.worldPoint(st,canvasPoint(e),camera);}
function paintAt(p){
 if(!gesture||!brush)return;const top=st.mode!=='classic',slot=top?(NebulaFall.active(st)?(R.hit(sc,p)?.slot??NebulaFall.nearest(st,p)):NebulaTemplates.nearest(st.mode,st.template.capacity,p)):null,node=top?null:R.hit(sc,p),key=top?slot:node?.uid;
 if(key==null||gesture.touched.has(key))return;gesture.touched.add(key);
 const r=top?M.paintSlot(st,slot,brush):M.replace(st,node.uid,brush);
 if(r.ok){selected=r.uid||node?.uid;selectedSlot=slot;gesture.changed=true;scheduleCanvas();}else gesture.lastFailure=r;
}
function currentDetail(){return st.finishes.decorations.find(d=>d.id===selectedDetail);}
function renderDetails(){
 const count=st.finishes.fillerCount;$('fillerCount').textContent=count;
 $('fillerPattern').value=st.finishes.fillerPattern;$('fillerPatternRow').hidden=!count;
 const green=st.finishes.greeneryCount;$('greeneryCount').textContent=green;$('greeneryLess').disabled=green<=0;$('greeneryMore').disabled=green>=12;
 $('greeneryPrice').textContent=M.money(CAT.eucalyptus.priceCents,lang)+' '+t('perSprig');
 $('initialEnabled').checked=!!st.finishes.initial;$('initialSettings').hidden=!st.finishes.initial;
 $('initialPrice').textContent=M.money(CONFIG.extrasCents.floralInitial,lang)+(CONFIG.demo?' · '+t('sampleShort'):'');
 if(document.activeElement!==$('initialLetter'))$('initialLetter').value=st.finishes.initial;
 $('initialScale').value=st.finishes.initialScale;$('initialOffset').value=st.finishes.initialOffset;
 $('fillerLess').disabled=count<=0;$('fillerMore').disabled=count>=12;
 $('fillerPrice').textContent=M.money(CONFIG.extrasCents.filler,lang)+' '+t('perSprig')+(CONFIG.demo?' · '+t('sampleShort'):'');
 const signature=JSON.stringify([lang,selectedDetail,st.finishes.decorations.map(d=>d.id)]);
 if($('detailChoices').dataset.signature!==signature){
  $('detailChoices').dataset.signature=signature;
  $('detailChoices').replaceChildren(...Object.keys(NebulaDetails.types).map(id=>{
   const present=st.finishes.decorations.some(d=>d.id===id),b=button('','',()=>{
    selectedDetail=id;selected=null;brush=null;hover=null;
    if(!st.finishes.decorations.some(d=>d.id===id))change(()=>{st.finishes.decorations.push(NebulaDetails.create(id));});else render(false);
   }),im=document.createElement('img'),label=document.createElement('strong'),cost=document.createElement('small'),status=document.createElement('small');
   im.src=R.thumbnail(NEBULA_META.finishes[id].url);im.alt='';im.draggable=false;
   label.textContent=t(id);cost.textContent=M.money(CONFIG.extrasCents[id],lang);status.textContent=t(present?'editDetail':'addDetail');
   b.dataset.detail=id;pressed(b,selectedDetail===id);b.append(im,label,cost,status);return b;
  }));
 }
 const d=currentDetail();$('detailEditor').hidden=!d;
 if(d){$('detailName').textContent=t(d.id);$('detailScale').value=d.scale;$('detailRotation').value=d.rotation;$('detailLayer').value=d.layer;
  $('detailScaleValue').textContent=Math.round(d.scale*100)+'%';$('detailRotationValue').textContent=d.rotation+'°';}
 if(selectedDetail)$('gestureHint').textContent=t('detailDragHint');
}
function nudgeDetail(dx,dy){const d=currentDetail();if(d)change(()=>{d.x=G.clamp(+(d.x+dx).toFixed(3),-1,1);d.y=G.clamp(+(d.y+dy).toFixed(3),-1.15,1);});}
function deleteDetail(){if(!currentDetail())return;change(()=>{st.finishes.decorations=st.finishes.decorations.filter(d=>d.id!==selectedDetail);selectedDetail=null;});}
function moveTargets(){
 if(!moveMode||st.mode==='classic'||!selected)return [];
 const it=st.items.find(i=>i.uid===selected);if(!it)return [];
 const scale=$('bouquet').getBoundingClientRect().width/720*R.view(st,camera).scale;
 return R.scene(st).slots.filter(p=>p.slot!==it.slot&&(!NebulaSpooky.active(st)||(NebulaSpooky.allowed(st,p.slot,it.id)&&NebulaSpooky.allowed(st,it.slot,st.items.find(i=>i.slot===p.slot)?.id||null)))).map(p=>({...p,markerRadius:12/Math.max(.1,scale)}));
}
function setMoveMode(on){
 moveMode=on;brush=null;panMode=false;selectedDetail=null;hover=null;
 if(on&&matchMedia('(max-width:820px)').matches&&!focusPreview){moveOpenedFocus=true;setFocusPreview(true);}
 if(!on&&moveOpenedFocus){moveOpenedFocus=false;setFocusPreview(false);}
 render(false);
}
function tapMove(p){
 if(st.mode!=='classic'){
  const v=R.view(st,camera),scale=$('bouquet').getBoundingClientRect().width/720*v.scale;
  const target=moveTargets().map(n=>({...n,dist:Math.hypot(n.x-p.x,n.y-p.y)})).sort((a,b)=>a.dist-b.dist)[0];
  if(!target||target.dist*scale>28){if(R.hit(sc,p)?.uid===selected){selected=null;selectedSlot=null;render(false);}else toast(t('movePickTarget'));return;}
  p={x:target.x,y:target.y};
 }
 const result=change(()=>{const r=M.move(st,selected,p);if(r.ok){selected=r.uid||selected;selectedSlot=r.slot??selectedSlot;}return r;});
 if(result.ok){selected=null;selectedSlot=null;render(false);toast(t('moveDone'));}
}
function beginPointer(e){
 if(!isReady||e.button!==0||gesture)return;const p=point(e),detail=!panMode&&!brush&&tab==='finishing'?R.detailHit(sc,p):null,node=detail?null:R.hit(sc,p);hover=null;
 if(detail){selectedDetail=detail.detailId;selected=null;renderDetails();}else selectedDetail=null;
 /* A finger is coarser than a mouse: give touch more slack before a tap counts as a drag.
    Measured in real CSS pixels, not canvas units, so it does not change with preview size. */
 const slop=e.pointerType==='touch'?12:4;
 /* Classic: a bloom under the finger may be dragged, so hold the paint until we know
    whether this gesture is a tap or a drag. Dome/Heart keep instant brush strokes. */
 const holdPaint=!!brush&&st.mode==='classic'&&!!node;
 gesture={detailId:detail?.detailId,pointerId:e.pointerId,start:p,screenStart:canvasPoint(e),cameraBefore:{...camera},before:snap(),uid:node?.uid||null,moved:false,changed:false,touched:new Set(),pan:panMode,offset:detail?{x:p.x-detail.x,y:p.y-detail.y}:node?{x:p.x-node.x,y:p.y-node.y}:{x:0,y:0},painting:!!brush&&!holdPaint,pendingPaint:holdPaint,slop,rawStart:{x:e.clientX,y:e.clientY}};
 gesture.moveSelection=moveMode?selected:null;
 if(!panMode){if(gesture.painting)paintAt(p);else if(!brush&&!(moveMode&&selected)){selected=node?.uid||null;selectedSlot=node?.slot??null;}}
 $('bouquet').setPointerCapture(e.pointerId);$('bouquet').focus({preventScroll:true});e.preventDefault();scheduleCanvas();
}
function movePointer(e){
 if(!isReady||!gesture||e.pointerId!==gesture.pointerId)return;const p=point(e);
 if(Math.hypot(e.clientX-gesture.rawStart.x,e.clientY-gesture.rawStart.y)>gesture.slop)gesture.moved=true;
 if(gesture.pan){const q=canvasPoint(e),lim=(camera.zoom-1)*300;camera.x=G.clamp(gesture.cameraBefore.x+q.x-gesture.screenStart.x,-lim,lim);camera.y=G.clamp(gesture.cameraBefore.y+q.y-gesture.screenStart.y,-lim,lim);scheduleCanvas();return;}
 if(gesture.detailId){
  if(gesture.moved){const d=currentDetail(),f=sc.frame;
   d.x=G.clamp(+((p.x-gesture.offset.x-f.center.x)/f.radius).toFixed(4),-1,1);
   d.y=G.clamp(+((p.y-gesture.offset.y-f.center.y)/f.radius).toFixed(4),-1.15,1);
   gesture.changed=true;scheduleCanvas();}return;
 }
 /* Past the slop it is a drag, not a tap: drop the pending paint and move the bloom. */
 if(gesture.pendingPaint&&gesture.moved)gesture.pendingPaint=false;
 if(gesture.painting){paintAt(p);return;}
 if(gesture.moved&&gesture.uid&&st.mode!=='classic'){selected=gesture.uid;const n=sc.nodes.find(n=>n.uid===gesture.uid);if(n)hover={...n,x:p.x-gesture.offset.x,y:p.y-gesture.offset.y};scheduleCanvas();}
 if(gesture.moved&&gesture.uid&&st.mode==='classic'){
  const r=M.move(st,gesture.uid,{x:p.x-gesture.offset.x,y:p.y-gesture.offset.y});gesture.invalid=!r.ok;gesture.changed||=r.ok;scheduleCanvas();
 }
}
function endPointer(e,canceled=false){
 if(!gesture||e.pointerId!==gesture.pointerId)return;const g=gesture;gesture=null;hover=null;try{$('bouquet').releasePointerCapture(e.pointerId);}catch(err){}
 if(canceled){st=JSON.parse(g.before);camera=g.cameraBefore;selected=null;render(false);return;}
 if(g.pan){render(false);return;}
 if(g.detailId){storeHistory(g.before);render();return;}
 if(moveMode&&!g.moved&&g.moveSelection&&!g.pan){selected=g.moveSelection;tapMove(point(e));return;}
 /* A held paint that never became a drag was a tap after all: paint it now. */
 if(g.pendingPaint&&!g.moved&&brush&&g.uid){
  const r=change(()=>M.replace(st,g.uid,brush));if(r.ok){selected=g.uid;render();}else showFailure(r);return;
 }
 if(g.painting&&!g.changed&&!g.moved&&st.mode==='classic'&&!g.uid){addItem(brush,point(e));return;}
 if(!g.painting&&g.moved&&g.uid&&st.mode!=='classic'){
  const r=M.move(st,g.uid,point(e));if(r.ok){selected=r.uid;selectedSlot=r.slot;}else showFailure(r);
 }
 storeHistory(g.before);render();if(g.lastFailure){if(g.changed)toast(t('partialPaint'));else showFailure(g.lastFailure);}else if(g.invalid)toast(t('placement'));
}
for(const [id,step] of [['fillerLess',-1],['fillerMore',1]])$(id).onclick=()=>change(()=>{st.finishes.fillerCount=G.clamp(st.finishes.fillerCount+step,0,12);});
for(const b of document.querySelectorAll('[data-nudge]'))b.onclick=()=>{const [x,y]=({left:[-.04,0],right:[.04,0],up:[0,-.04],down:[0,.04]})[b.dataset.nudge];nudgeDetail(x,y);};
for(const [id,key] of [['detailScale','scale'],['detailRotation','rotation']]){
 const input=$(id);input.onfocus=()=>{if(editFocus)commitTextEdit();editFocus={before:snap(),key:id};};
 input.oninput=()=>{if(!currentDetail())return;if(!editFocus)editFocus={before:snap(),key:id};currentDetail()[key]=Number(input.value);$(id+'Value').textContent=key==='scale'?Math.round(input.value*100)+'%':input.value+'°';scheduleCanvas();};
 input.onchange=()=>{commitTextEdit();render();};input.onblur=commitTextEdit;
}
$('detailLayer').onchange=()=>change(()=>{if(currentDetail())currentDetail().layer=$('detailLayer').value;});
$('detailReset').onclick=()=>change(()=>{if(currentDetail())Object.assign(currentDetail(),NebulaDetails.create(selectedDetail));});
$('detailRemove').onclick=deleteDetail;
for(const key of ['spookyMask','spookyBow'])$(key).onchange=()=>change(()=>{st.finishes[key]=$(key).checked;M.syncTemplate(st);});
 for(const [key,field,max] of [['ghostCount','ghostCount',6],['thistleCount','thistleCount',3],['spookyFiller','fillerCount',12]])$(key).onchange=()=>{const n=Number($(key).value);if(!Number.isInteger(n)||n<0||n>max){toast(t('invalidCount'));render(false);return;}change(()=>{st.finishes[field]=n;if(field==='ghostCount'&&n)st.finishes.collar=true;});};
 $('fillerPattern').onchange=()=>change(()=>{st.finishes.fillerPattern=$('fillerPattern').value;});
 for(const [id,step] of [['greeneryLess',-1],['greeneryMore',1]])$(id).onclick=()=>change(()=>{st.finishes.greeneryCount=G.clamp(st.finishes.greeneryCount+step,0,12);});
 $('initialEnabled').onchange=()=>change(()=>{st.finishes.initial=$('initialEnabled').checked?'A':'';});
 $('initialLetter').oninput=()=>{const letter=$('initialLetter').value.toUpperCase().replace(/[^A-Z]/g,'').slice(-1);if(letter)change(()=>{st.finishes.initial=letter;});$('initialLetter').value=st.finishes.initial;};
 for(const key of ['initialScale','initialOffset']){
  const input=$(key);input.onfocus=()=>{if(editFocus)commitTextEdit();editFocus={before:snap(),key};};
  input.oninput=()=>{if(!editFocus)editFocus={before:snap(),key};st.finishes[key]=Number(input.value);scheduleCanvas();};
  input.onchange=()=>{commitTextEdit();render();};input.onblur=commitTextEdit;
 }
 // Wiring remains stable; render never attaches duplicate handlers.
for(const b of document.querySelectorAll('[data-finish-jump]'))b.onclick=()=>{const el=$(b.dataset.finishJump);el.scrollIntoView({block:'start',behavior:'instant'});el.setAttribute('tabindex','-1');el.focus({preventScroll:true});};
$('language').onchange=e=>setLanguage(e.target.value);
$('recolorRoses').onclick=()=>{if(!NebulaSpooky.active(st)||!brush)return;change(()=>NebulaSpooky.recolorRoses(st,brush));};
$('spookyWrap').onclick=()=>{setTab('wrapping');$('tab-wrapping').focus();};
$('spookyDetails').onclick=()=>{setTab('finishing');$('tab-finishing').focus();};
$('family').onchange=()=>{renderCatalog();$('catalogueNote').textContent=t(NebulaSpooky.active(st)?'spookyFixed':$('family').value==='texture'?'textureNote':st.mode==='classic'?'classicCatalogueNote':'topCatalogueNote');};$('flowerSearch').oninput=renderCatalog;
$('addOne').onclick=()=>addItem();$('undo').onclick=()=>history('undo');$('redo').onclick=()=>history('redo');
let deleteArmed=false;
$('inlineDelete').onpointerdown=()=>{deleteArmed=true;};$('inlineDelete').onpointercancel=()=>{deleteArmed=false;};$('inlineDelete').onclick=e=>{const allowed=deleteArmed||e.detail===0;deleteArmed=false;if(allowed)removeItem();};$('stopBrush').onclick=stopBrush;$('moveFlowers').onclick=()=>setMoveMode(!moveMode);
$('zoomIn').onclick=()=>setZoom(camera.zoom+.5);$('zoomOut').onclick=()=>setZoom(camera.zoom-.5);$('resetView').onclick=()=>setZoom(1);$('panView').onclick=()=>{moveMode=false;panMode=!panMode;render(false);};
for(const el of document.querySelectorAll('[data-tab]')){el.onclick=()=>setTab(el.dataset.tab);el.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=['flowers','wrapping','finishing'];const i=e.key==='Home'?0:e.key==='End'?2:(keys.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3;setTab(keys[i]);$('tab-'+keys[i]).focus();};}
for(const el of document.querySelectorAll('[data-mode]'))el.onclick=()=>switchBouquet(el.dataset.mode);
$('arrangeButton').onclick=()=>confirm(t('arrangeTitle'),t('arrangeText'),t('arrangeConfirm'),()=>{change(()=>{st.seed=st.seed%99999990+1;M.arrange(st,st.mode,{fresh:true});selected=null;hover=null;});toast(t('arranged'));});
$('customTint').oninput=()=>{st.finishes.tint=$('customTint').value;scheduleCanvas();};$('customTint').onfocus=()=>{editFocus={before:snap(),key:'tint'};};$('customTint').onchange=()=>{commitTextEdit();render();};$('customTint').onblur=commitTextEdit;
$('sash').onchange=()=>change(()=>{st.finishes.sash=$('sash').value;});
$('sashText').onfocus=()=>{if(editFocus)commitTextEdit();editFocus={before:snap(),key:'sashText'};};
 $('sashText').onblur=commitTextEdit;
 $('sashText').oninput=()=>{st.finishes.sashText=$('sashText').value.slice(0,28);render(false);};
$('sashText').onchange=()=>{commitTextEdit();render();};
$('sashPosition').onchange=()=>change(()=>{st.finishes.sashPlacement=$('sashPosition').value;});
for(const [id,key,factor] of [['sashOffset','sashOffset',1]]){
 const input=$(id);let before=null;
 input.onpointerdown=()=>{before=snap();};input.onfocus=()=>{if(before===null)before=snap();};
 input.oninput=()=>{st.finishes[key]=Number(input.value)*factor;scheduleCanvas();};
 input.onchange=()=>{if(before!==null)storeHistory(before);before=null;render();};
 input.onblur=()=>{if(before!==null){storeHistory(before);before=null;persist();}};
}
$('browseTemplates').onclick=()=>showGallery(true);
 $('resumeBuilder').onclick=()=>showGallery(false);$('openClassicBuilder').onclick=()=>showGallery(false);
 $('pumpkin').onchange=()=>change(()=>{st.finishes.pumpkin=$('pumpkin').checked;});
 $('cocoaBow').onchange=()=>change(()=>{st.finishes.bow=$('cocoaBow').checked;});
 $('pumpkinPosition').onchange=()=>change(()=>{st.finishes.pumpkinPosition=$('pumpkinPosition').value;});
 $('pumpkinScale').onfocus=()=>{if(editFocus)commitTextEdit();editFocus={before:snap(),key:'pumpkinScale'};};
 $('pumpkinScale').oninput=()=>{if(!editFocus)editFocus={before:snap(),key:'pumpkinScale'};st.finishes.pumpkinScale=Number($('pumpkinScale').value);scheduleCanvas();};
 $('pumpkinScale').onchange=()=>{commitTextEdit();render();};$('pumpkinScale').onblur=commitTextEdit;
 $('resetSash').onclick=()=>change(()=>{st.finishes.sashPlacement='auto';st.finishes.sashOffset=0;});
$('showCollar').onchange=()=>change(()=>{st.finishes.collar=$('showCollar').checked;});
$('focusPreview').onclick=()=>setFocusPreview(!focusPreview);
$('loadFromSave').onclick=()=>{$('saveDialog').close();$('importFile').click();};
for(const key of ['crown','greenRim'])$(key).onchange=()=>change(()=>{st.finishes[key]=$(key).checked;});
for(const [id,step] of [['butterflyLess',-1],['butterflyMore',1]])$(id).onclick=()=>change(()=>{
 st.finishes.butterfly=Math.max(0,Math.min(CONFIG.limits.butterflies,(st.finishes.butterfly|0)+step));});
syncText($('designName'),'title');syncText($('giftNote'),'note');
for(const id of ['missingInline','missingWrapButton'])$(id).onclick=showMissing;$('helpButton').onclick=showHelp;$('gapCheck').onclick=showGap;
for(const el of document.querySelectorAll('[data-collection-filter]'))el.onclick=()=>filterCollections(el.dataset.collectionFilter);
$('browseSaved').onclick=()=>{$('savedBouquets').scrollIntoView({behavior:'auto',block:'start'});$('savedBouquetsTitle').focus({preventScroll:true});};
$('saveCurrentBouquet').onclick=showSave;$('saveShelf').onclick=saveToShelf;
$('saveTop').onclick=showSave;$('shareButton').onclick=shareBouquet;$('orderButton').onclick=showOrder;$('orderForm').onsubmit=sendOrder;$('saveSquare').onclick=()=>exportPNG(false);$('saveStory').onclick=()=>exportPNG(true);$('saveJSON').onclick=()=>{download(new Blob([JSON.stringify({...M.portfolio(st,banks),activeEstimate:M.order(st,lang)},null,2)],{type:'application/json'}),'nebula-three-bouquets.json');$('exportStatus').textContent=t('savedJSON');};
$('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;try{if(file.size>1_000_000)throw new Error('oversize');importDesign(JSON.parse(await file.text()));}catch(e){toast(t('invalid'));}finally{$('importFile').value='';}};
for(const el of document.querySelectorAll('[data-close]'))el.onclick=()=>$(el.dataset.close).close();
$('confirmCancel').onclick=()=>{$('confirmDialog').close();confirmFn=null;};$('confirmYes').onclick=()=>{const fn=confirmFn;confirmFn=null;$('confirmDialog').close();if(fn)fn();};
$('bouquet').onpointerdown=beginPointer;$('bouquet').onpointermove=movePointer;$('bouquet').onpointerup=e=>endPointer(e);$('bouquet').onpointercancel=e=>endPointer(e,true);$('bouquet').onpointerleave=()=>{if(!gesture){hover=null;scheduleCanvas();}};
$('bouquet').onkeydown=e=>{
 if(e.key==='Escape'){moveMode=false;moveOpenedFocus=false;selectedDetail=null;if(focusPreview)setFocusPreview(false);brush=null;panMode=false;selected=null;hover=null;render(false);return;}
 if(currentDetail()){
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteDetail();return;}
  const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(dir){e.preventDefault();const step=e.shiftKey?.1:.025;nudgeDetail(dir[0]*step,dir[1]*step);return;}
 }
 if(e.key==='Enter'||e.key===' '){e.preventDefault();if(st.mode==='classic'){if(brush&&selected)change(()=>M.replace(st,selected,brush));else if(brush)addItem();else selectItem(st.items[0]?.uid||null);}else{if(brush)paintSlot(selectedSlot??0,brush);else selectItem(st.items.find(i=>i.slot===(selectedSlot??0))?.uid||null);}return;}
 if(st.mode!=='classic'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;selectedSlot=((selectedSlot??-1)+step+st.template.capacity)%st.template.capacity;selected=st.items.find(i=>i.slot===selectedSlot)?.uid||null;render(false);return;}
 if(!selected)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeItem();return;}
 const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();const a=st.items.find(i=>i.uid===selected).anchors[st.mode],d=e.shiftKey?12:4;change(()=>M.move(st,selected,{x:a.x+dirs[e.key][0]*d,y:a.y+dirs[e.key][1]*d}));}
};
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?'redo':'undo');}else if(e.key.toLowerCase()==='y'){e.preventDefault();history('redo');}}});
addEventListener('blur',()=>{if(gesture)endPointer({pointerId:gesture.pointerId},true);});
function fitPhoneCanvas(){
 const c=$('bouquet');if(innerWidth>820){c.style.width='';c.style.height='';if(isReady)positionDelete();return;}
 const b=$('artSurface').getBoundingClientRect(),scale=Math.min((b.width-2)/720,(b.height-2)/820);
 c.style.width=720*scale+'px';c.style.height=820*scale+'px';if(isReady)positionDelete();
}
addEventListener('scroll',positionDelete,{passive:true});
new ResizeObserver(fitPhoneCanvas).observe($('artSurface'));addEventListener('resize',fitPhoneCanvas);fitPhoneCanvas();
localize();renderStudio();
/* Wait only for the artwork the three saved bouquets actually use; the rest of the
   catalogue decodes in the background and each arrival triggers a repaint. */
R.onAssetReady=()=>{if(isReady)scheduleCanvas();};
/* A shared link wins over saved local work, but never overwrites it: the visitor's
   own bouquets stay in their bank and localStorage is left untouched until they edit. */
function openSharedDesign(){
 const code=NebulaLink.readHash(location.hash);
 if(!code)return false;
 const parsed=NebulaLink.decode(code);
 if(!parsed){toast(t('linkInvalid'));return false;}
 banks[st.mode]=M.clone(st);st=parsed.design;banks[st.mode]=M.clone(st);
 undoStack=[];redoStack=[];selected=null;hover=null;
 $('sharedBanner').hidden=false;
 return true;
}
const sharedOnBoot=openSharedDesign();
function loadStudio(){
 $('retryStartup').disabled=true;
 R.ready([st]).then(()=>{isReady=true;$('startupError').hidden=true;render();showGallery(!sharedOnBoot);window.__ready=true;}).catch(e=>{window.__errors.push(String(e));$('startupError').hidden=false;$('retryStartup').disabled=false;window.__ready=false;});
}
$('retryStartup').onclick=loadStudio;loadStudio();
// Small, documented diagnostic surface for reproducible local tests (no persistence bypass in the UI).
window.NebulaApp={showGallery,applyFallTemplate,chooseFlower,stopBrush,paintSlot,setZoom,get camera(){return {...camera};},get brush(){return brush;},get state(){return M.clone(st);},get lang(){return lang;},get ready(){return isReady;},get selected(){return selected;},get history(){return {undo:undoStack.length,redo:redoStack.length};},setState(raw){const valid=M.validate(raw);if(!valid)throw new Error('Invalid test design');return change(()=>{st=valid;selected=null;hover=null;});},createScenario(mode,ids,seed=11){const s=M.empty();s.mode=mode;s.seed=seed;s.items=ids.map(id=>M.newItem(s,id));if(!G.capacity(s.items,mode).ok)throw new Error('Scenario exceeds capacity');M.arrange(s,mode,{fresh:true});return s;},add:addItem,remove:removeItem,select:selectItem,replace:(uid,id)=>change(()=>M.replace(st,uid,id)),move:(uid,p)=>change(()=>M.move(st,uid,p)),switchMode:switchBouquet,resize:resizeBouquet,get portfolio(){return M.portfolio(st,banks);},setFocusPreview,undo:()=>history('undo'),redo:()=>history('redo'),setLanguage,setTab,importDesign,showSave,showMissing,showGap,render,scene:()=>sc,alphaReport:()=>R.alphaReport(st),exportCanvas:(w,h)=>R.exportCanvas(st,w,h,lang),exportBlob:(w,h)=>R.blob(st,w,h,lang)};
})();
