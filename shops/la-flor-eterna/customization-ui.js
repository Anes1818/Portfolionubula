(function(g){'use strict';
const $=id=>document.getElementById(id),U=g.NebulaCustomization;let built=false;
function text(en,es,lang){return lang==='es'?es:en;}
function edit(fn){const s=NebulaApp.state;fn(s);NebulaApp.setState(s);}
function studio(s){return s.finishes.studio||(s.finishes.studio={v:1});}
function el(tag,id,cls){const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;}
function section(id,title,host){const s=el('section',id,'custom-section'),h=el('h3',null,'section-title');h.textContent=title;s.append(h);host.append(s);return s;}
function build(){if(built||!$('panel-flowers'))return;built=true;document.body.classList.add('client-simple');
 const flowers=$('panel-flowers'),finish=$('panel-finishing');
 const fillers=section('flowerFillers','Finishing flowers',flowers);flowers.insertBefore(fillers,$('flowerGrid'));
 const title=el('strong','breathHeading');title.textContent='Baby’s breath';fillers.append(title,el('div','breathLevels','custom-segments'));
 for(let i=0;i<4;i++){const b=el('button');b.type='button';b.dataset.breath=i;b.onclick=()=>edit(s=>{studio(s).breath=i;s.finishes.fillerCount=0;});$('breathLevels').append(b);}
 const row=el('div',null,'toggle-row'),label=el('span','whiteSprayHeading'),step=el('span',null,'stepper');row.append(label,step);
 for(const [id,delta] of [['whiteSprayLess',-1],['whiteSprayMore',1]]){const b=el('button',id);b.type='button';b.textContent=delta<0?'−':'+';b.setAttribute('aria-label',delta<0?'Fewer white flowering accents':'More white flowering accents');b.onclick=()=>edit(s=>{const o=studio(s);o.sprays=Math.max(0,Math.min(8,(o.sprays||0)+delta));});step.append(b);if(delta<0)step.append(el('output','whiteSprayCount'));}
 fillers.append(row,el('small','fillerCost','helper'));g.NebulaFillerOptions?.buildControls(fillers);
 const migrate=el('button','convertLegacySprays','text-button');migrate.type='button';migrate.onclick=()=>edit(s=>{
  const o=studio(s),ids=s.items.filter(n=>n.id==='white_flower_spray').slice(0,8-(o.sprays||0)).map(n=>n.uid);o.sprays=(o.sprays||0)+ids.length;for(const id of ids)NebulaModel.remove(s,id);
 });fillers.append(migrate);
 const shapes=section('wrapStyles','Paper shape',$('classicWrapping'));$('classicWrapping').insertBefore(shapes,$('paperChoices').previousElementSibling);shapes.append(el('div','wrapStyleChoices','custom-segments'));
 const toys=section('simpleToys','Toys & satin bows',finish);finish.prepend(toys);
 toys.append($('detailChoices'));const hint=el('p','simpleDragHint','helper');toys.append(hint,$('detailEditor'));
 const oldPumpkin=el('button','convertLegacyPumpkin','text-button');oldPumpkin.type='button';oldPumpkin.onclick=()=>edit(s=>{const d=NebulaDetails.create('pumpkin_plush');d.x=({left:-.64,center:0,right:.64})[s.finishes.pumpkinPosition];d.y=-.78;d.scale=Math.max(.7,Math.min(1.5,s.finishes.pumpkinScale));U.beforeDetail(s,d.id);s.finishes.decorations=s.finishes.decorations.filter(n=>n.id!==d.id);s.finishes.decorations.push(d);});toys.append(oldPumpkin);
 const bowLabel=el('label',null,'field'),bowTitle=el('span','bowColorTitle'),select=el('select','satinColor');bowLabel.append(bowTitle,select);toys.insertBefore(bowLabel,$('detailEditor'));
 select.onchange=()=>edit(s=>{const previous=s.finishes.decorations.find(d=>U.bowIds.includes(d.id));s.finishes.decorations=s.finishes.decorations.filter(d=>!U.bowIds.includes(d.id));s.finishes.bow=false;s.finishes.spookyBow=false;s.finishes.ribbon='none';if(select.value){U.beforeDetail(s,select.value);s.finishes.decorations.push(previous?{...previous,id:select.value}:U.placeDetail(s,NebulaDetails.create(select.value)));}});
 const lettering=section('simpleLettering','Floral lettering',finish);lettering.append($('initialEnabled').closest('label'),$('initialSettings'));
 const small=section('smallAccents','Small details',finish);small.append(document.querySelector('.finish-toggles'));
 const edge=section('edgeFinishing','Around the bouquet',finish);edge.append($('greenRimLabel'));
 fillers.append($('greeneryCount').closest('.toggle-row'));
 const edgeLabel=el('label',null,'autumn-toggle'),check=el('input','breathWrap');check.type='checkbox';const words=el('span','breathWrapLabel');edgeLabel.append(words,check);edge.append(edgeLabel);check.onchange=()=>edit(s=>{studio(s).edge=check.checked;});
 const gift=$('chocolateBox')?.closest('label');if(gift){const sec=section('simpleGifts','Gift to accompany your bouquet',finish);sec.append(gift);}
 // Keep existing controls/handlers for old state; remove duplicate customer paths.
 for(const id of ['autumnFinishes','ribbonBlock','finishShortcuts'])$(id).classList.add('superseded-control');
 $('detailEditor').querySelector('.detail-nudges').remove();
 $('sashOffset').closest('label').hidden=true;
}
function render(s,lang,ready){build();if(!built)return;const o=s.finishes.studio||{},level=U.level(s),es=lang==='es';
 const hide=['roseArtworkControl','sunflowerArtworkControl'];for(const id of hide)if($(id))$(id).hidden=true;
 $('flowerFillers').querySelector('h3').textContent=text('Filler flowers','Flores de relleno',lang);$('breathHeading').textContent=text('Baby’s breath','Paniculata',lang);
 for(const b of $('breathLevels').children){const i=+b.dataset.breath;b.textContent=(es?['Ninguna','Ligera','Media','Abundante']:['None','Light','Medium','Full'])[i];b.setAttribute('aria-pressed',String(i===level));b.disabled=!ready;}
 $('whiteSprayHeading').textContent=text('White flowering accents','Ramas de flores blancas',lang);$('whiteSprayCount').textContent=o.sprays||0;$('whiteSprayLess').disabled=!ready||!o.sprays;$('whiteSprayMore').disabled=!ready||(o.sprays||0)>=8;
 $('whiteSprayLess').setAttribute('aria-label',text('Fewer white flowering accents','Menos ramas blancas',lang));$('whiteSprayMore').setAttribute('aria-label',text('More white flowering accents','Más ramas blancas',lang));
 $('thistleCountRow').hidden=true;
 const legacy=s.items.filter(n=>n.id==='white_flower_spray').length,convertible=Math.min(legacy,8-(o.sprays||0));$('convertLegacySprays').hidden=!legacy;$('convertLegacySprays').textContent=text('Move '+convertible+' existing white sprays out of flower slots','Convertir '+convertible+' ramas existentes en relleno',lang);
 $('convertLegacySprays').disabled=(o.sprays||0)>=8;
 const cost=U.extras(s).filter(n=>n.id!=='breathBorder').reduce((t,n)=>t+n.totalCents,0);
 $('fillerCost').textContent=text('Light: a few airy sprigs. Medium: fuller branches between flowers. Full: abundant blossom clusters. ','Ligera: unas ramitas. Media: más ramas entre las flores. Abundante: más grupos de flores. ',lang)+NebulaModel.money(cost,lang)+text(' sample total',' total de muestra',lang);
 const chosen=U.style(s);$('wrapStyleChoices').replaceChildren(...U.wraps[s.mode].map(id=>{const b=el('button');b.type='button';b.textContent=U.wrapNames[id][es?1:0];b.dataset.wrapStyle=id;b.setAttribute('aria-pressed',String(id===chosen));b.onclick=()=>edit(n=>{studio(n).wrap=id;n.finishes.collar=true;n.finishes.paper=['fan','round','heart'].includes(id)?'black':'ivory';});return b;}));
 $('wrapStyles').querySelector('h3').textContent=text('Paper shape','Forma del papel',lang);$('collarToggleLabel').hidden=false;
 const p=U.paper(s,s.frames[s.mode]);if(p){$('wrapPreview').src=NebulaRenderer.source(p.back.url);$('wrapHeading').textContent=U.wrapNames[chosen][es?1:0];}
 $('wrapCopy').textContent=text('Choose a shape, then a color. Colored versions are digital previews.','Elige la forma y después el color. Los colores son vistas digitales.',lang);$('wrapEyebrow').textContent=text(s.mode==='classic'?'UPRIGHT WRAPPING':'TOP-VIEW WRAPPING',s.mode==='classic'?'ENVOLTURA VERTICAL':'ENVOLTURA VISTA SUPERIOR',lang);
 // Expand existing tone choices without making an overhead paper an upright option.
 for(const [id,color] of [['blush','#dbb3b7'],['sage','#b1bba1'],['kraft','#c29a6c'],['linen','#d8c6a3']])if(!$('paperChoices').querySelector('[data-paper="'+id+'"]')){const b=el('button');b.type='button';b.dataset.paper=id;b.textContent=NebulaI18n[lang][id]||id;const dot=el('span',null,'swatch');dot.style.setProperty('--swatch',color);b.prepend(dot);b.setAttribute('aria-pressed',String(s.finishes.paper===id));b.onclick=()=>edit(n=>{studio(n).wrap=U.style(n);n.finishes.paper=id;});$('paperChoices').append(b);}
 const original=$('paperChoices').querySelector('[data-paper="ivory"]');if(original?.lastChild?.nodeType===3)original.lastChild.textContent=['fan','round','heart'].includes(chosen)?text('Ivory','Marfil',lang):'Original';
 for(const b of $('detailChoices').querySelectorAll('[data-detail]'))b.hidden=U.bowIds.includes(b.dataset.detail);
 $('simpleToys').querySelector('h3').textContent=text(s.mode==='classic'?'Accompanying toys & bouquet tie':'Toys & satin bows',s.mode==='classic'?'Peluches aparte y lazo del ramo':'Peluches y lazos',lang);$('simpleDragHint').textContent=s.mode==='classic'?text('Toys accompany the bouquet separately. Drag gifts in the area below; the satin bow ties the stems. Tap a toy or bow, then × to remove it.','Los peluches acompañan el ramo por separado. Arrástralos en la zona inferior; el lazo ata los tallos. Toca un peluche o lazo y después × para quitarlo.',lang):text('Add a detail, then drag it directly on the bouquet. Tap it, then × to remove it.','Añade un detalle y arrástralo sobre el ramo. Tócalo y después × para quitarlo.',lang);
 $('detailLayer').closest('label').hidden=s.mode==='classic';
 $('greeneryCount').closest('.toggle-row').hidden=false;
 g.NebulaFillerOptions?.renderControls(s,lang,ready);
 $('convertLegacyPumpkin').hidden=!s.finishes.pumpkin;$('convertLegacyPumpkin').textContent=text('Make the existing pumpkin draggable','Activar arrastre de la calabaza existente',lang);
 const bow=s.finishes.decorations.find(d=>U.bowIds.includes(d.id));$('bowColorTitle').textContent=text('Satin bow','Lazo de satén',lang);
 const legacyBow=s.finishes.spookyBow?'satin_black':s.finishes.bow?'satin_cocoa':({blush:'satin_bow',burgundy:'satin_burgundy',sage:'satin_sage'})[s.finishes.ribbon];
 $('satinColor').replaceChildren(...['',...U.bowIds].map(id=>{const opt=el('option');opt.value=id;opt.textContent=id?(NebulaI18n[lang][id]||id):text('No satin bow','Sin lazo',lang);return opt;}));$('satinColor').value=bow?.id||legacyBow||'';
 if(bow||legacyBow){let editBow=$('editSatin');if(!editBow){editBow=el('button','editSatin','text-button');editBow.type='button';$('satinColor').after(editBow);}editBow.textContent=text('Adjust bow','Ajustar lazo',lang);editBow.onclick=()=>$('detailChoices').querySelector('[data-detail="'+(bow?.id||legacyBow)+'"]').click();editBow.hidden=false;}else if($('editSatin'))$('editSatin').hidden=true;
 $('simpleLettering').hidden=s.mode==='classic';$('simpleLettering').querySelector('h3').textContent=text('Floral initial','Inicial floral',lang);
 for(const [id,en,es] of [['smallAccents','Small details','Pequeños detalles'],['edgeFinishing','Around the bouquet','Alrededor del ramo'],['simpleGifts','Gift to accompany your bouquet','Regalo para acompañar el ramo']])if($(id))$(id).querySelector('h3').textContent=text(en,es,lang);
 $('greenRimLabel').hidden=s.mode==='classic';$('breathWrap').checked=!!o.edge;$('breathWrapLabel').textContent=text('Baby’s breath wrap','Borde de paniculata',lang)+' · '+NebulaModel.money(8*NebulaConfig.CONFIG.extrasCents.filler,lang);
 $('halloweenFinishes').querySelector('[data-i18n="halloweenExtras"]').textContent=text('Theme details','Detalles temáticos',lang);$('spookyFillerRow').hidden=true;$('spookyBowRow').hidden=true;
 // Keep named selection and note at the end instead of between accessory groups.
 $('panel-finishing').append($('designName').closest('label'),$('giftNote').closest('label'));
}
g.NebulaCustomizationUI={render};
})(window);
