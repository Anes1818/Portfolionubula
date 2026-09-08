/* Direct manipulation, complete history, safe local persistence. No network services or checkout. */
(function(){'use strict';
const $=id=>document.getElementById(id),M=NebulaModel,G=NebulaGeometry,R=NebulaRenderer,{CAT,CONFIG,PRESETS,MISSING,SIZES}=NebulaConfig;
let banks={},histories={},picks={},focusPreview=false,brush=null,editTool='auto',selectedSlot=null,camera={zoom:1,x:0,y:0},panMode=false;
let lang='en',st=M.create(),undoStack=[],redoStack=[],selected=null,picked='rose_pink',tab='flowers',sc=null,gesture=null,hover=null,raf=0,isReady=false,storageOK=true,legacyRaw=null,editFocus=null,exporting=false;
window.__errors=[];addEventListener('error',e=>window.__errors.push(String(e.message)));addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
const t=(key,vars)=>NebulaI18n.text(lang,key,vars),name=id=>CAT[id][lang],snap=()=>JSON.stringify(st);
try{
 lang=localStorage.getItem('nebulaLanguageV4')==='es'?'es':'en';
 const raw=localStorage.getItem(CONFIG.storageKey);
 if(raw){const parsed=M.validatePortfolio(JSON.parse(raw));if(parsed){banks=parsed.bouquets;st=M.clone(banks[parsed.activeMode]);}else{localStorage.setItem(CONFIG.storageKey+'.invalid-backup',raw);setTimeout(()=>toast(t('recovered')),1100);}}
 else{const old=localStorage.getItem(CONFIG.previousKey)||localStorage.getItem(CONFIG.olderKey);if(old){const parsed=JSON.parse(old),studio=M.validatePortfolio(parsed),copied=studio?null:M.validate(parsed);if(studio){banks=studio.bouquets;st=M.clone(banks[studio.activeMode]);}else if(copied){st=copied;banks[st.mode]=M.clone(st);}}}
}catch(e){storageOK=false;}
for(const mode of ['classic','dome','heart'])if(!banks[mode])banks[mode]=mode===st.mode?M.clone(st):M.defaultMode(mode);
try{legacyRaw=JSON.parse(localStorage.getItem(CONFIG.legacyKey)||'null');}catch(e){}
function toast(str){$('toast').textContent=str;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function persist(){try{localStorage.setItem(CONFIG.storageKey,JSON.stringify(M.portfolio(st,banks)));storageOK=true;}catch(e){if(storageOK)toast(t('storageWarning'));storageOK=false;}$('saveStatus').textContent=t(storageOK?'localSave':'sessionOnly');}
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
function switchBouquet(mode){
 if(editFocus)commitTextEdit();if(gesture)endPointer({pointerId:gesture.pointerId},true);
 if(mode===st.mode)return {ok:true};
 histories[st.mode]={undo:undoStack,redo:redoStack};picks[st.mode]=picked;
 const result=M.switchMode(st,mode,banks);if(!result.ok)return result;
 const h=histories[mode]||{undo:[],redo:[]};undoStack=h.undo;redoStack=h.redo;picked=picks[mode]||Object.entries(M.counts(st)).filter(([id])=>CAT[id].kind==='flower').sort((a,b)=>b[1]-a[1])[0]?.[0]||'rose_pink';
 selected=null;selectedSlot=null;brush=null;editTool='auto';camera={zoom:1,x:0,y:0};panMode=false;hover=null;render();toast(t('modeRestored',{mode:t(mode)}));return result;
}
function resizeBouquet(n){
 if(st.mode==='classic'||n===st.template.capacity)return;
 const choice=Object.hasOwn(CAT,picked)?picked:'rose_red',trial=M.clone(st),r=M.resize(trial,n,choice);if(!r.ok)return;
 confirm(t('sizeTitle'),t('sizeText',{old:st.template.capacity,n,flower:name(choice),price:M.money(M.price(trial).totalCents,lang)}),t('sizeConfirm'),()=>change(()=>{const result=M.resize(st,n,choice);selected=null;selectedSlot=null;camera={zoom:1,x:0,y:0};return result;}));
}
function setTool(key){editTool=key;selected=null;selectedSlot=null;brush=key==='paint'?picked:null;panMode=false;render(false);}
function stopBrush(){brush=null;selected=null;selectedSlot=null;panMode=false;render(false);toast(t('brushStopped'));}
function positionDelete(){
 const b=$('inlineDelete'),n=sc?.nodes.find(n=>n.uid===selected);b.hidden=!n||!!gesture||!!brush;
 if(!n||brush)return;const r=$('bouquet').getBoundingClientRect(),a=$('artSurface').getBoundingClientRect(),v=R.view(st,camera),unit=r.width/720;
 const x=r.left-a.left+(v.x+(n.x+n.w*.27)*v.scale)*unit,y=r.top-a.top+(v.y+(n.y-n.h*.32)*v.scale)*unit;
 if(x<0||x>a.width||y<0||y>a.height){b.hidden=true;return;}
 b.style.left=Math.max(22,Math.min(a.width-22,x))+'px';b.style.top=Math.max(52,Math.min(a.height-50,y))+'px';b.setAttribute('aria-label',t('removeItem')+': '+name(n.id));b.title=t('removeItem')+': '+name(n.id);
}
function setZoom(z){camera.zoom=G.clamp(z,1,3);const lim=(camera.zoom-1)*300;camera.x=G.clamp(camera.x,-lim,lim);camera.y=G.clamp(camera.y,-lim,lim);if(camera.zoom===1){camera.x=camera.y=0;panMode=false;}render(false);}
function setFocusPreview(on){focusPreview=!!on;document.body.classList.toggle('preview-focus',focusPreview);$('focusPreview').setAttribute('aria-pressed',String(focusPreview));$('focusPreview').setAttribute('aria-label',t(focusPreview?'closeFocus':'expandPreview'));fitPhoneCanvas();scheduleCanvas();}
function setLanguage(value){if(editFocus)commitTextEdit();lang=value==='es'?'es':'en';try{localStorage.setItem('nebulaLanguageV4',lang);}catch(e){}render(false);}
function localize(){
 document.documentElement.lang=lang;document.title=CONFIG.brand+' — '+t('pageTitle');$('brandName').textContent=CONFIG.brand;document.querySelector('.brand').setAttribute('aria-label',CONFIG.brand+' '+t('studioFooter'));document.querySelector('.site-footer>span').firstChild.textContent=CONFIG.brand+' ';$('language').value=lang;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 for(const el of document.querySelectorAll('[data-label]'))el.setAttribute('aria-label',t(el.dataset.label));
 for(const el of document.querySelectorAll('[data-placeholder]'))el.placeholder=t(el.dataset.placeholder);
 for(const el of document.querySelectorAll('[data-alt]'))el.alt=t(el.dataset.alt);
}
function scheduleCanvas(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(isReady){sc=R.paint($('bouquet'),st,{selected,ghost:hover,guides:true,camera});positionDelete();}});}
function fillChoices(el,current,{empty=false,classic=false}={}){
 const ids=Object.keys(CAT).filter(id=>!classic||CAT[id].classic),sig=lang+':'+classic+':'+empty;
 if(el.dataset.choiceSignature!==sig){el.replaceChildren();if(empty){const o=document.createElement('option');o.value='';o.textContent=t('emptySlot');el.append(o);}for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=name(id)+' · '+M.money(CAT[id].priceCents,lang);el.append(o);}el.dataset.choiceSignature=sig;}
 el.value=current||'';
}
function render(save=true){
 localize();if(!isReady)return;
 const top=st.mode!=='classic',p=M.price(st),cap=G.capacity(st.items,st.mode),auto=editTool==='auto',zones=top&&st.mode==='heart'&&auto;
 document.body.dataset.bouquetMode=st.mode;document.body.classList.toggle('is-painting',!!brush);document.body.classList.toggle('is-panning',panMode);
 sc=R.paint($('bouquet'),st,{selected,ghost:hover,guides:true,camera});
 $('loading').hidden=true;$('emptyHint').hidden=top||st.items.length>0;
 $('countLabel').textContent=top?t('slotsCount',{n:p.pieces,cap:st.template.capacity}):p.flowers+' '+t('mainFlowers')+(p.texture?' + '+p.texture+' '+t('sprigs'):'');
 $('capacityLabel').textContent=top?t('slotLimit',{cap:st.template.capacity}):t('areaUsed',{a:(cap.area||0).toFixed(1).replace('.0','')});
 $('totalPrice').textContent=M.money(p.totalCents,lang);document.querySelector('.summary-price>span').textContent=t(CONFIG.demo?'demoEstimate':'requestPrice')+' · '+CONFIG.currency;
 $('compositionLabel').textContent=t(st.mode==='classic'?'classicNote':st.mode==='dome'?'domeNote':'heartNote');$('bouquet').setAttribute('aria-label',t('stageLabel',{mode:t(st.mode),n:p.pieces}));
 $('gapCheck').hidden=true;$('collarNotice').hidden=true;
 $('gestureHint').textContent=panMode?t('panView'):brush?t(top?'paintHint':'classicBrushHint'):t(top?'topSelectHint':'classicSelectHint');
 $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;document.querySelectorAll('[data-mode]').forEach(el=>{pressed(el,el.dataset.mode===st.mode);el.disabled=false;});
 $('saveTop').disabled=false;$('reviewButton').disabled=st.items.length===0;$('arrangeButton').disabled=false;
 if(!st.items.some(i=>i.uid===selected))selected=null;
 $('pickedFlower').hidden=top&&auto;$('pickedName').textContent=name(picked);$('pickedPrice').textContent=M.money(CAT[picked].priceCents,lang)+' '+t('perStem');$('pickedImage').src=R.source(NEBULA_META.flowers[picked].head);
 $('pickedCaption').textContent=t(brush?'brushActive':'selectMode');$('stopBrush').hidden=!brush;$('addOne').hidden=top;$('addOne').disabled=!CAT[picked].classic;
 $('catalogueFilters').hidden=zones;$('flowerGrid').hidden=zones;$('catalogueNote').hidden=zones;$('catalogueNote').textContent=t(st.mode==='classic'?'classicCatalogueNote':'topCatalogueNote');
 $('templateTools').hidden=!top;$('heartZones').hidden=!zones;$('autoTool').textContent=t(st.mode==='heart'?'zoneStyle':'autoBlend');pressed($('autoTool'),auto);pressed($('paintTool'),!auto);
 $('toolHint').textContent=t(zones?'zonesHint':auto?'paletteHint':'paintHint');
 if(top){
  for(const [field,key] of [['zoneWall','wall'],['zoneFill','fill'],['zoneCenter','center']])fillChoices($(field),st.template.zones[key]);
  $('heartFormation').value=st.template.zones.formation;$('doubleWall').checked=st.template.zones.doubleWall;
  $('blendPattern').value=st.template.formation;fillChoices($('accentFlower'),st.template.accent.id);$('accentCount').max=st.template.capacity;$('accentCount').value=st.template.accent.count;$('accentPattern').value=st.template.accent.pattern;$('accentAngle').value=st.template.accent.angle;
  const n=Object.keys(st.template.overrides).length;$('handEdits').hidden=!n;$('handEditCount').textContent=t('handEdits',{n});
 }else $('handEdits').hidden=true;
 $('domePatternPanel').hidden=st.mode!=='dome'||!auto;$('startingDetails').hidden=top;$('arrangeRow').hidden=top;
 $('classicWrapping').hidden=false;$('missingWrapping').hidden=true;$('collarToggleLabel').hidden=!top;$('showCollar').checked=st.finishes.collar!==false;
 $('wrapHeading').textContent=t(top?'blackCollar':'ivoryPaper');$('wrapCopy').textContent=t(top?'collarDescription':'wrapDescription');$('wrapEyebrow').textContent=t(top?'realPaper':'oneOriginal');
 $('wrapPreview').src=R.source(top?NEBULA_META.collars[st.mode].url:NEBULA_META.wrap.back);$('wrapPreview').alt=t(top?'blackCollar':'wrapAlt');$('customTintLabel').hidden=st.finishes.paper!=='custom';$('customTint').value=st.finishes.tint;
 $('sash').value=st.finishes.sash;$('sashSettings').hidden=st.finishes.sash==='none';$('sashPosition').value=st.finishes.sashPlacement||'auto';$('sashOffset').value=st.finishes.sashOffset||0;$('sashScale').value=Math.round((st.finishes.sashScale||1)*100);
 for(const key of ['butterfly','diamond']){$(key).checked=st.finishes[key];$(key+'Price').textContent=M.money(CONFIG.extrasCents[key],lang)+(CONFIG.demo?' · '+(lang==='es'?'muestra':'sample'):'');}
 if(document.activeElement!==$('designName'))$('designName').value=st.title;if(document.activeElement!==$('giftNote'))$('giftNote').value=st.note;$('noteCounter').textContent=st.note.length+'/180';
 $('legacyBanner').hidden=!legacyRaw;$('stemListCount').textContent=top?st.template.capacity:st.items.length;$('separateHint').textContent=t('separateHint');$('sizePanel').hidden=!top;
 $('sizeChoices').replaceChildren(...(SIZES[st.mode]||[]).map(([label,n])=>{const b=button('','size-chip',()=>resizeBouquet(n)),l=document.createElement('strong'),c=document.createElement('small');l.textContent=label;c.textContent=n+' '+(lang==='es'?'pos.':'slots');b.append(l,c);b.dataset.size=label;pressed(b,st.template?.capacity===n);return b;}));
 $('zoomOut').disabled=camera.zoom<=1;$('zoomIn').disabled=camera.zoom>=3;$('panView').disabled=camera.zoom<=1;pressed($('panView'),panMode);$('artSurface').classList.toggle('zoomed',camera.zoom>1);
 renderCatalog();renderSelectionList();renderPaper();renderRibbons();renderStarting();positionDelete();
 $('saveStatus').textContent=t(storageOK?'localSave':'sessionOnly');if(save)persist();
}
function renderCatalog(){
 const query=$('flowerSearch').value.toLocaleLowerCase(lang).trim(),family=$('family').value;
 const ids=Object.keys(CAT).filter(id=>(family==='all'||CAT[id].family===family)&&(name(id).toLocaleLowerCase(lang).includes(query)||id.includes(query)));
 $('flowerGrid').replaceChildren(...ids.map(id=>flowerCard(id,()=>chooseFlower(id),st.mode==='dome'&&editTool==='auto'?st.template.palette.includes(id):brush===id)));
 if(!ids.length)$('flowerGrid').append(paragraph(t('noMatches'),'no-results'));
}
function flowerCard(id,fn,isPicked){
 const cat=CAT[id],available=st.mode!=='classic'||cat.classic,el=button('','flower-card',fn),im=document.createElement('img'),label=document.createElement('strong'),price=document.createElement('small');
 im.src=R.source(NEBULA_META.flowers[id].head);im.alt='';im.width=90;im.height=90;im.draggable=false;label.textContent=name(id);price.textContent=available?M.money(cat.priceCents,lang):t(id==='__choc'?'chocNotClassic':'notInClassic');
 if(!available)price.className='not-ready';el.append(im,label,price);el.dataset.flower=id;el.disabled=!available||!isReady;
 el.setAttribute('aria-label',name(id)+', '+price.textContent);if(isPicked!==undefined)pressed(el,isPicked);return el;
}
function chooseFlower(id){
 if(!Object.hasOwn(CAT,id))return;
 picked=id;selected=null;selectedSlot=null;hover=null;panMode=false;
 if(st.mode==='dome'&&editTool==='auto'){
  const pal=st.template.palette.slice(),at=pal.indexOf(id);
  if(at>=0){if(pal.length===1)return;pal.splice(at,1);}else{if(pal.length===3){toast(t('paletteLimit'));return;}pal.push(id);}
  change(()=>M.updateTemplate(st,{palette:pal}));return;
 }
 editTool='paint';brush=brush===id?null:id;render(false);
}
function addItem(id=picked,point=null){
 const result=change(()=>M.add(st,id,point));
 if(result.ok){selected=result.uid;selectedSlot=result.slot??null;hover=null;render();toast(t(result.snapped?'snapped':'added'));}return result;
}
function paintSlot(slot,id=brush){if(!id)return {ok:false};const result=change(()=>M.paintSlot(st,slot,id));if(result.ok){selected=result.uid;selectedSlot=slot;render();}return result;}
function removeItem(uid=selected){if(!uid)return;const result=change(()=>M.remove(st,uid));selected=null;selectedSlot=null;render();if(result.ok)toast(t('removed'));return result;}
function selectItem(uid){brush=null;selected=uid;selectedSlot=st.items.find(i=>i.uid===uid)?.slot??null;hover=null;render(false);}
function renderSelectionList(){
 if(!$('stemDetails').open){$('stemList').replaceChildren();return;}
 const top=st.mode!=='classic',list=top?Array.from({length:st.template.capacity},(_,slot)=>({slot,it:st.items.find(i=>i.slot===slot)})):st.items.map((it,slot)=>({it,slot}));
 $('stemList').replaceChildren(...list.map(({it,slot})=>{
  const row=document.createElement('div');row.className='stem-row';const num=document.createElement('span');num.className='stem-number';num.textContent=String(slot+1).padStart(2,'0');const im=document.createElement('img');im.alt='';if(it)im.src=R.source(NEBULA_META.flowers[it.id].head);else im.hidden=true;
  const select=document.createElement('select');select.className='slot-choice';select.setAttribute('aria-label',t('positionLabel',{n:slot+1}));fillChoices(select,it?.id,{empty:top,classic:!top});
  select.onchange=()=>{if(top)change(()=>M.paintSlot(st,slot,select.value||null));else change(()=>M.replace(st,it.uid,select.value));};
  const pick=button('↗','text-button',()=>{selectItem(it?.uid||null);selectedSlot=slot;setFocusPreview(true);$('bouquet').focus({preventScroll:true});});pick.disabled=!it;pick.setAttribute('aria-label',t('selectItem')+' '+(slot+1));
  const del=button('×','text-button danger-text',()=>removeItem(it.uid));del.disabled=!it;del.setAttribute('aria-label',t('removeItem')+' '+(slot+1)+(it?' '+name(it.id):''));row.append(num,im,select,pick,del);return row;
 }));
}
function renderPaper(){
 $('paperChoices').replaceChildren(...(st.mode==='classic'?[['ivory','#e6deca'],['blush','#dbb3b7'],['sage','#b1bba1'],['custom',st.finishes.tint]]:[['black','#292826'],['ivory','#e6deca'],['blush','#dbb3b7'],['custom',st.finishes.tint]]).map(([id,col])=>{
  const b=button('','',()=>change(()=>{st.finishes.paper=id;})),dot=document.createElement('span'),label=document.createElement('span');dot.className='swatch';dot.style.setProperty('--swatch',col);label.textContent=t(id);b.append(dot,label);pressed(b,st.finishes.paper===id);b.dataset.paper=id;return b;
 }));
}
function renderRibbons(){
 $('ribbonChoices').replaceChildren(...['none','blush','burgundy','sage'].map(id=>{
  const b=button('','',()=>change(()=>{st.finishes.ribbon=id;}));if(id!=='none'){const im=document.createElement('img');im.src=R.source(NEBULA_META.finishes['ribbon_'+id].url);im.alt='';b.append(im);}else{const n=document.createElement('span');n.className='no-ribbon';n.textContent='—';b.append(n);}const label=document.createElement('span');label.textContent=t(id);b.append(label);pressed(b,st.finishes.ribbon===id);b.dataset.ribbon=id;b.setAttribute('aria-label',t('ribbon')+': '+t(id));return b;
 }));
}
function useRecipe(ids){
 const trial=M.clone(st);trial.items=ids.map(id=>M.newItem(trial,id));const cap=G.capacity(trial.items,trial.mode);if(!cap.ok){showFailure(cap);return;}
 confirm(t('recipeTitle'),t('recipeText',{n:ids.length}),t('recipeConfirm'),()=>{change(()=>{st.items=ids.map(id=>M.newItem(st,id));st.frames={};M.arrange(st,st.mode,{fresh:true});selected=null;hover=null;});});
}
function renderStarting(){
 const nums=st.mode==='classic'?[6,12,20]:[18,30,62];
 const opts=nums.map(n=>button(n+' '+t('mainFlowers'),'button secondary small',()=>useRecipe(Array(n).fill(picked))));
 if(st.mode==='classic')opts.push(button(lang==='es'?'Mezcla suave':'Soft mix','button secondary small',()=>useRecipe(PRESETS.blush.items)));
 $('startingRecipes').replaceChildren(...opts);
}
function setTab(key){
 tab=key;for(const el of document.querySelectorAll('[data-tab]')){const on=el.dataset.tab===key;el.setAttribute('aria-selected',String(on));el.tabIndex=on?0:-1;}
 for(const key of ['flowers','wrapping','finishing'])$('panel-'+key).hidden=key!==tab;
}
function showMissing(){openMessage(t('missingTitle'),[paragraph(t('allArtworkReady')),paragraph(t('artworkCaveat'),'helper')]);}
function showHelp(){const ol=document.createElement('ol');ol.className='inventory-list';for(let i=1;i<=5;i++){const li=document.createElement('li');li.textContent=t('help'+i);ol.append(li);}openMessage(t('helpTitle'),[ol]);}
function showGap(){const report=R.alphaReport(st);if(!report.applicable)return;const p=paragraph(t('gapResult',{p:report.openPercent.toFixed(2)}),'notice-block');openMessage(t('gapTitle'),[paragraph(t('gapIntro')),p,paragraph(t(report.openPercent<.6?'gapOK':'gapOpen')),paragraph(t('gapFoot'),'helper')]);}
function priceRows(target='priceBreakdown'){const p=M.price(st),nodes=[];function row(label,amount,strong=false){const a=document.createElement(strong?'strong':'span'),b=document.createElement(strong?'strong':'span');a.textContent=label;b.textContent=M.money(amount,lang);nodes.push(a,b);}for(const line of p.lines)row(line.quantity+' × '+name(line.id),line.totalCents);row(t('base'),p.baseCents);row(t('labor'),p.laborCents);for(const line of p.extraLines)row(t(line.id),line.totalCents);row(t('total'),p.totalCents,true);$(target).replaceChildren(...nodes);}
function showSave(){if(editFocus)commitTextEdit();R.paint($('savePreview'),st);$('exportStatus').textContent='';priceRows();$('saveDialog').showModal();}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportPNG(story){
 if(exporting)return;exporting=true;const saved=M.clone(st),savedLang=lang;
 $('saveSquare').disabled=true;$('saveStory').disabled=true;$('saveJSON').disabled=true;$('exportStatus').textContent=t('exporting');
 try{const b=await R.blob(saved,1080,story?1920:1080,savedLang);download(b,'nebula-'+saved.mode+'-'+(story?'story':'square')+'.png');$('exportStatus').textContent=t('savedPNG');}
 catch(e){window.__errors.push(String(e));$('exportStatus').textContent=t('exportError');}
 finally{exporting=false;for(const id of ['saveSquare','saveStory','saveJSON'])$(id).disabled=false;}
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
 if(!gesture||!brush)return;const top=st.mode!=='classic',slot=top?NebulaTemplates.nearest(st.mode,st.template.capacity,p):null,node=top?null:R.hit(sc,p),key=top?slot:node?.uid;
 if(key==null||gesture.touched.has(key))return;gesture.touched.add(key);
 const r=top?M.paintSlot(st,slot,brush):M.replace(st,node.uid,brush);
 if(r.ok){selected=r.uid||node?.uid;selectedSlot=slot;gesture.changed=true;scheduleCanvas();}else gesture.lastFailure=r;
}
function beginPointer(e){
 if(!isReady||e.button!==0||gesture)return;const p=point(e),node=R.hit(sc,p);hover=null;
 gesture={pointerId:e.pointerId,start:p,screenStart:canvasPoint(e),cameraBefore:{...camera},before:snap(),uid:node?.uid||null,moved:false,changed:false,touched:new Set(),pan:panMode,offset:node?{x:p.x-node.x,y:p.y-node.y}:{x:0,y:0},painting:!!brush};
 if(!panMode){if(brush)paintAt(p);else{selected=node?.uid||null;selectedSlot=node?.slot??null;}}
 $('bouquet').setPointerCapture(e.pointerId);$('bouquet').focus({preventScroll:true});e.preventDefault();scheduleCanvas();
}
function movePointer(e){
 if(!isReady||!gesture||e.pointerId!==gesture.pointerId)return;const p=point(e);
 if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5)gesture.moved=true;
 if(gesture.pan){const q=canvasPoint(e),lim=(camera.zoom-1)*300;camera.x=G.clamp(gesture.cameraBefore.x+q.x-gesture.screenStart.x,-lim,lim);camera.y=G.clamp(gesture.cameraBefore.y+q.y-gesture.screenStart.y,-lim,lim);scheduleCanvas();return;}
 if(gesture.painting){paintAt(p);return;}
 if(gesture.moved&&gesture.uid&&st.mode==='classic'){
  const r=M.move(st,gesture.uid,{x:p.x-gesture.offset.x,y:p.y-gesture.offset.y});gesture.invalid=!r.ok;gesture.changed||=r.ok;scheduleCanvas();
 }
}
function endPointer(e,canceled=false){
 if(!gesture||e.pointerId!==gesture.pointerId)return;const g=gesture;gesture=null;hover=null;try{$('bouquet').releasePointerCapture(e.pointerId);}catch(err){}
 if(canceled){st=JSON.parse(g.before);camera=g.cameraBefore;selected=null;render(false);return;}
 if(g.pan){render(false);return;}
 if(g.painting&&!g.changed&&!g.moved&&st.mode==='classic'&&!g.uid){addItem(brush,point(e));return;}
 if(!g.painting&&g.moved&&g.uid&&st.mode!=='classic'){
  const r=M.move(st,g.uid,point(e));if(r.ok){selected=r.uid;selectedSlot=r.slot;}else toast(t('placement'));
 }
 storeHistory(g.before);render();if(g.lastFailure){if(g.changed)toast(t('partialPaint'));else showFailure(g.lastFailure);}else if(g.invalid)toast(t('placement'));
}
// Wiring remains stable; render never attaches duplicate handlers.
$('language').onchange=e=>setLanguage(e.target.value);
$('family').onchange=()=>{renderCatalog();$('catalogueNote').textContent=t($('family').value==='texture'?'textureNote':st.mode==='classic'?'classicCatalogueNote':'topCatalogueNote');};$('flowerSearch').oninput=renderCatalog;
$('addOne').onclick=()=>addItem();$('undo').onclick=()=>history('undo');$('redo').onclick=()=>history('redo');
let deleteArmed=false;
$('inlineDelete').onpointerdown=()=>{deleteArmed=true;};$('inlineDelete').onpointercancel=()=>{deleteArmed=false;};$('inlineDelete').onclick=e=>{const allowed=deleteArmed||e.detail===0;deleteArmed=false;if(allowed)removeItem();};$('stopBrush').onclick=stopBrush;$('stemDetails').ontoggle=renderSelectionList;
$('autoTool').onclick=()=>setTool('auto');$('paintTool').onclick=()=>setTool('paint');
$('zoomIn').onclick=()=>setZoom(camera.zoom+.5);$('zoomOut').onclick=()=>setZoom(camera.zoom-.5);$('resetView').onclick=()=>setZoom(1);$('panView').onclick=()=>{panMode=!panMode;render(false);};
for(const el of document.querySelectorAll('[data-tab]')){el.onclick=()=>setTab(el.dataset.tab);el.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=['flowers','wrapping','finishing'];const i=e.key==='Home'?0:e.key==='End'?2:(keys.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3;setTab(keys[i]);$('tab-'+keys[i]).focus();};}
for(const el of document.querySelectorAll('[data-mode]'))el.onclick=()=>switchBouquet(el.dataset.mode);
$('arrangeButton').onclick=()=>confirm(t('arrangeTitle'),t('arrangeText'),t('arrangeConfirm'),()=>{change(()=>{st.seed=st.seed%99999990+1;M.arrange(st,st.mode,{fresh:true});selected=null;hover=null;});toast(t('arranged'));});
$('startBlank').onclick=()=>confirm(t('blankTitle'),t('blankText'),t('blankConfirm'),()=>change(()=>{if(st.mode==='classic'){st.items=[];st.frames={};M.arrange(st,st.mode,{fresh:true});}else{st.template.overrides=Object.fromEntries(Array.from({length:st.template.capacity},(_,i)=>[i,null]));M.syncTemplate(st);editTool='paint';brush=picked;}selected=null;}));
$('useCount').onclick=()=>{if(st.mode!=='classic')return;const n=Number($('startingCount').value);if(!Number.isInteger(n)||n<0||n>100){toast(t('invalidCount'));return;}useRecipe(Array(n).fill(picked));};
$('customTint').oninput=()=>{st.finishes.tint=$('customTint').value;scheduleCanvas();};$('customTint').onfocus=()=>{editFocus={before:snap(),key:'tint'};};$('customTint').onchange=()=>{commitTextEdit();render();};$('customTint').onblur=commitTextEdit;
$('sash').onchange=()=>change(()=>{st.finishes.sash=$('sash').value;});
$('sashPosition').onchange=()=>change(()=>{st.finishes.sashPlacement=$('sashPosition').value;});
for(const [id,key,factor] of [['sashOffset','sashOffset',1],['sashScale','sashScale',.01]]){
 const input=$(id);let before=null;
 input.onpointerdown=()=>{before=snap();};input.onfocus=()=>{if(before===null)before=snap();};
 input.oninput=()=>{st.finishes[key]=Number(input.value)*factor;scheduleCanvas();};
 input.onchange=()=>{if(before!==null)storeHistory(before);before=null;render();};
 input.onblur=()=>{if(before!==null){storeHistory(before);before=null;persist();}};
}
$('resetSash').onclick=()=>change(()=>{st.finishes.sashPlacement='auto';st.finishes.sashOffset=0;st.finishes.sashScale=1;});
$('showCollar').onchange=()=>change(()=>{st.finishes.collar=$('showCollar').checked;});
$('focusPreview').onclick=()=>setFocusPreview(!focusPreview);
$('loadFromSave').onclick=()=>{$('saveDialog').close();$('loadDesign').click();};
for(const key of ['butterfly','diamond'])$(key).onchange=()=>change(()=>{st.finishes[key]=$(key).checked;});
syncText($('designName'),'title');syncText($('giftNote'),'note');
for(const id of ['missingInline','missingWrapButton','assetStatus'])$(id).onclick=showMissing;$('helpButton').onclick=showHelp;$('gapCheck').onclick=showGap;
$('saveTop').onclick=showSave;$('reviewButton').onclick=showQuote;$('saveSquare').onclick=()=>exportPNG(false);$('saveStory').onclick=()=>exportPNG(true);$('saveJSON').onclick=()=>{download(new Blob([JSON.stringify({...M.portfolio(st,banks),activeEstimate:M.order(st,lang)},null,2)],{type:'application/json'}),'nebula-three-bouquets.json');$('exportStatus').textContent=t('savedJSON');};
$('loadDesign').onclick=()=>$('importFile').click();$('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;try{if(file.size>1_000_000)throw new Error('oversize');importDesign(JSON.parse(await file.text()));}catch(e){toast(t('invalid'));}finally{$('importFile').value='';}};
$('importLegacy').onclick=()=>{const migrated=M.migrateV3(legacyRaw);if(!migrated){toast(t('legacyInvalid'));return;}confirm(t('legacyTitle'),t('legacyText'),t('legacyConfirm'),()=>{if(st.mode!==migrated.mode)switchBouquet(migrated.mode);change(()=>{st=migrated;selected=null;hover=null;});toast(t('legacyLoaded'));});};
for(const el of document.querySelectorAll('[data-close]'))el.onclick=()=>$(el.dataset.close).close();
$('confirmCancel').onclick=()=>{$('confirmDialog').close();confirmFn=null;};$('confirmYes').onclick=()=>{const fn=confirmFn;confirmFn=null;$('confirmDialog').close();if(fn)fn();};
$('bouquet').onpointerdown=beginPointer;$('bouquet').onpointermove=movePointer;$('bouquet').onpointerup=e=>endPointer(e);$('bouquet').onpointercancel=e=>endPointer(e,true);$('bouquet').onpointerleave=()=>{if(!gesture){hover=null;scheduleCanvas();}};
$('bouquet').onkeydown=e=>{
 if(e.key==='Escape'){if(focusPreview)setFocusPreview(false);brush=null;panMode=false;selected=null;hover=null;render(false);return;}
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
for(const [field,key] of [['zoneWall','wall'],['zoneFill','fill'],['zoneCenter','center']])$(field).onchange=()=>change(()=>M.updateTemplate(st,{zones:{...st.template.zones,[key]:$(field).value}}));
$('heartFormation').onchange=()=>change(()=>M.updateTemplate(st,{zones:{...st.template.zones,formation:$('heartFormation').value}}));$('doubleWall').onchange=()=>change(()=>M.updateTemplate(st,{zones:{...st.template.zones,doubleWall:$('doubleWall').checked}}));
$('blendPattern').onchange=()=>change(()=>M.updateTemplate(st,{formation:$('blendPattern').value}));
$('applyAccent').onclick=()=>{
 const count=Number($('accentCount').value);if(!Number.isInteger(count)||count<0||count>st.template.capacity){toast(t('invalidAccent'));return;}
 change(()=>M.updateTemplate(st,{accent:{id:$('accentFlower').value,count,pattern:$('accentPattern').value,angle:Number($('accentAngle').value)}}));toast(t('accentApplied'));
};
$('resetHandEdits').onclick=()=>confirm(t('resetHandsTitle'),t('resetHandsText'),t('resetHandEdits'),()=>change(()=>M.updateTemplate(st,{overrides:{}})));
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
function makeQuote(){
 const p=M.price(st),reference='NB-'+G.hash(JSON.stringify(canonical([st,p,$('quoteDate').value,$('quoteMethod').value]))).toString(36).toUpperCase(),f=st.finishes;
 const lines=[t('requestHeading'),CONFIG.brand+' · '+t('requestRef')+': '+reference,t(st.mode)+(st.template?' · '+st.template.capacity+' '+(lang==='es'?'posiciones':'positions'):''),p.pieces+' '+t('pieces'),'',t('requestedDate')+': '+($('quoteDate').value||t('dateUnconfirmed')),t('fulfilment')+': '+t($('quoteMethod').value),'',t('requestItems')+':'];
 for(const l of p.lines)lines.push(l.quantity+' × '+name(l.id)+' — '+M.money(l.unitCents,lang)+' '+t('perStem')+' = '+M.money(l.totalCents,lang));
 if(st.template&&st.template.capacity>p.pieces)lines.push(t('quoteEmpty',{n:st.template.capacity-p.pieces}));
 lines.push('',t('requestFinish')+':',t('paperTone')+': '+t(f.paper)+(f.paper==='custom'?' '+f.tint:''),t('ribbon')+': '+t(f.ribbon),t('sash')+': '+(f.sash==='none'?t('none'):t({bday:'sashBday',wed:'sashWedding',love:'sashLove'}[f.sash])+' / '+t(f.sashPlacement==='low'?'sashLow':f.sashPlacement==='diagonal'?'sashDiagonal':'sashAuto')+' / '+Math.round(f.sashScale*100)+'%'));
 if(st.mode!=='classic')lines.push(t('showCollar')+': '+(f.collar?(lang==='es'?'Sí':'Yes'):(lang==='es'?'No':'No')));
 for(const k of ['butterfly','diamond'])if(f[k])lines.push(t(k));
 if(st.title)lines.push('',t('designName')+': '+st.title);if(st.note)lines.push(t('giftNote')+': '+st.note);
 lines.push('',t('base')+': '+M.money(p.baseCents,lang),t('labor')+': '+M.money(p.laborCents,lang));for(const l of p.extraLines)lines.push(t(l.id)+': '+M.money(l.totalCents,lang));
 lines.push(t('requestPrice')+': '+M.money(p.totalCents,lang),t(CONFIG.demo?'sampleNotice':'estimateNotice'),t('requestFinal'));
 return {reference,text:lines.join('\n'),pricing:p,design:M.order(st,lang)};
}
function updateQuote(){
 const q=makeQuote(),p=q.pricing,valid=!$('quoteDate').value||($('quoteDate').value>=today()&&$('quoteDate').checkValidity());
 $('quoteText').value=q.text;$('quoteTotal').textContent=M.money(p.totalCents,lang);$('quoteCounts').textContent=st.template?t('slotsCount',{n:p.pieces,cap:st.template.capacity}):p.pieces+' '+t('pieces');
 $('quoteEmpty').textContent=st.template?t(st.template.capacity>p.pieces?'quoteEmpty':'quoteComplete',{n:st.template.capacity-p.pieces}):'';
 $('quoteNotice').textContent=t(CONFIG.demo?'sampleNotice':'estimateNotice');$('quoteContactNote').textContent=t(CONFIG.whatsapp||CONFIG.email?'contactReady':'noContact');
 for(const id of ['copyQuote','downloadQuote','shareQuote','quoteImage'])$(id).disabled=!valid;
 $('quoteWhatsApp').hidden=!CONFIG.whatsapp;$('quoteEmail').hidden=!CONFIG.email;
 if(valid){if(CONFIG.whatsapp)$('quoteWhatsApp').href='https://wa.me/'+CONFIG.whatsapp+'?text='+encodeURIComponent(q.text);if(CONFIG.email)$('quoteEmail').href='mailto:'+CONFIG.email+'?subject='+encodeURIComponent(t('quoteTitle')+' '+q.reference)+'&body='+encodeURIComponent(q.text);}
 else{for(const id of ['quoteWhatsApp','quoteEmail'])$(id).removeAttribute('href');}
 $('quoteStatus').textContent=valid?'':t('datePast');return q;
}
function showQuote(){if(editFocus)commitTextEdit();R.paint($('quotePreview'),st);$('quoteDate').min=today();priceRows('quoteBreakdown');$('shareQuote').hidden=typeof navigator.share!=='function';updateQuote();$('quoteDialog').showModal();}
$('quoteDate').onchange=updateQuote;$('quoteMethod').onchange=updateQuote;
$('copyQuote').onclick=async()=>{const q=updateQuote();try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(q.text);$('quoteStatus').textContent=t('copyOK');}catch(e){$('quoteText').focus();$('quoteText').select();$('quoteStatus').textContent=t('copyFallback');}};
$('downloadQuote').onclick=()=>{const q=updateQuote();download(new Blob([q.text],{type:'text/plain;charset=utf-8'}),'nebula-florist-request-'+q.reference+'.txt');$('quoteStatus').textContent=t('quoteDownloaded');};
$('shareQuote').onclick=async()=>{const q=updateQuote();try{await navigator.share({title:CONFIG.brand+' · '+q.reference,text:q.text});$('quoteStatus').textContent=lang==='es'?'Solicitud entregada a la aplicación elegida. No es un pedido confirmado.':'Request passed to your chosen app. This is not a confirmed order.';}catch(e){$('quoteStatus').textContent=t(e.name==='AbortError'?'shareCanceled':'copyFallback');}};
$('quoteImage').onclick=async()=>{const b=$('quoteImage');b.disabled=true;try{download(await R.blob(M.clone(st),1080,1080,lang),'nebula-'+st.mode+'-florist-preview.png');$('quoteStatus').textContent=t('savedPNG');}catch(e){$('quoteStatus').textContent=t('exportError');}finally{b.disabled=false;}};
localize();
R.ready().then(()=>{isReady=true;render();window.__ready=true;}).catch(e=>{window.__errors.push(String(e));$('loading').textContent=t('missingRuntime');$('loading').className='broken-notice';window.__ready=false;});
// Small, documented diagnostic surface for reproducible local tests (no persistence bypass in the UI).
window.NebulaApp={chooseFlower,setTool,stopBrush,paintSlot,showQuote,makeQuote,setZoom,get camera(){return {...camera};},get brush(){return brush;},get editTool(){return editTool;},get state(){return M.clone(st);},get lang(){return lang;},get ready(){return isReady;},get selected(){return selected;},get history(){return {undo:undoStack.length,redo:redoStack.length};},setState(raw){const valid=M.validate(raw);if(!valid)throw new Error('Invalid test design');return change(()=>{st=valid;selected=null;hover=null;});},createScenario(mode,ids,seed=11){const s=M.empty();s.mode=mode;s.seed=seed;s.items=ids.map(id=>M.newItem(s,id));if(!G.capacity(s.items,mode).ok)throw new Error('Scenario exceeds capacity');M.arrange(s,mode,{fresh:true});return s;},add:addItem,remove:removeItem,select:selectItem,replace:(uid,id)=>change(()=>M.replace(st,uid,id)),move:(uid,p)=>change(()=>M.move(st,uid,p)),switchMode:switchBouquet,resize:resizeBouquet,get portfolio(){return M.portfolio(st,banks);},setFocusPreview,undo:()=>history('undo'),redo:()=>history('redo'),setLanguage,setTab,importDesign,showSave,showMissing,showGap,render,scene:()=>sc,alphaReport:()=>R.alphaReport(st),exportCanvas:(w,h)=>R.exportCanvas(st,w,h,lang),exportBlob:(w,h)=>R.blob(st,w,h,lang)};
})();
