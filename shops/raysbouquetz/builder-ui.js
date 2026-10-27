/* Shop presentation only; all edits go through the existing app's history API. */
(function(g){'use strict';
const $=id=>document.getElementById(id),B=RayBuilder,M=NebulaModel;
let built=false,noteChoice='cash_usd_1',openedOrder=false;
const launchOrder=new URLSearchParams(location.search).get('action')==='order';
function edit(fn){const s=NebulaApp.state;fn(s);return NebulaApp.setState(s);}
function noteOptions(id){
 const note=B.notes.get(id)||B.notes.get('cash_usd_1');noteChoice=id;
 for(const key of B.notes.keys())NebulaConfig.CAT[key].top=key===id;
 $('rayCurrency').value=note.currency;
 $('rayDenomination').replaceChildren(...B.policy.denominations[note.currency].map(value=>{const o=document.createElement('option');o.value=String(value);o.textContent='$'+value;return o;}));
 $('rayDenomination').value=String(note.denomination);
}
function changeNotes(){
 const id='cash_'+$('rayCurrency').value.toLowerCase()+'_'+$('rayDenomination').value;
 if(!B.notes.has(id))return;noteOptions(id);
 const wasPaintingNotes=B.notes.has(NebulaApp.brush);
 const updateBrush=()=>{if(wasPaintingNotes&&NebulaApp.brush!==id)NebulaApp.chooseFlower(id);};
 const s=NebulaApp.state;if(!B.active(s)){NebulaApp.render(false);updateBrush();return;}
 s.template.palette=s.template.palette.map(value=>B.notes.has(value)?id:value);
 for(const key of ['wall','fill','center'])if(B.notes.has(s.template.zones[key]))s.template.zones[key]=id;
 if(B.notes.has(s.template.accent.id))s.template.accent.id=id;
 for(const [slot,value]of Object.entries(s.template.overrides))if(B.notes.has(value))s.template.overrides[slot]=id;
 M.syncTemplate(s);NebulaApp.setState(s);updateBrush();
}
function applyNoteCount(){
 const s=NebulaApp.state,keep=s.items.filter(i=>!B.notes.has(i.id)),field=$('rayNoteCount'),count=Number(field.value);
 if(field.value.trim()===''||!Number.isInteger(count)||count<0||count+keep.length>100){field.setCustomValidity('Choose a whole count within 100 total positions.');field.reportValidity();return;}
 field.setCustomValidity('');
 const current=s.items.filter(i=>B.notes.has(i.id));if(count===current.length)return;
 // Keep existing slots while they fit. Only grow when needed, letting the
 // original engine map the flowers to the nearest new positions first.
 const growing=count+keep.length>s.template.capacity;
 if(growing){s.template.overrides=Object.fromEntries(keep.map(i=>[i.slot,i.id]));M.resize(s,count+keep.length);}
 const mapped=growing?Object.entries(s.template.overrides).map(([slot,id])=>({slot:Number(slot),id})):keep;
 const overrides=Object.fromEntries(mapped.map(i=>[i.slot,i.id]));
 const candidates=[...current.map(i=>i.slot),...Array.from({length:s.template.capacity},(_,i)=>i)];let remaining=count;
 for(const slot of new Set(candidates))if(slot<s.template.capacity&&!Object.hasOwn(overrides,slot)){overrides[slot]=remaining>0?noteChoice:null;if(remaining>0)remaining--;}
 s.template.palette=[noteChoice];s.template.overrides=overrides;s.template.accent.count=0;
 M.syncTemplate(s);NebulaApp.setState(s);
}
function decorateCatalog(){
 for(const card of document.querySelectorAll('[data-flower]')){
  const id=card.dataset.flower,c=NebulaConfig.CAT[id],label=card.querySelector('small');if(!label||!c)continue;
  if(c.priceCents===null)label.textContent='Price varies · quote';
  else if(!B.notes.has(id)&&!['rose','foam'].includes(c.family))label.textContent='Bouquet menu · quote';
  else if(c.family==='foam')label.textContent='Menu sizes / $6 in money mixes';
  card.setAttribute('aria-label',c.en+', '+label.textContent);
 }
}
function refreshReview(){
 if(!built||!g.NebulaApp)return;const p=M.price(NebulaApp.state),money=v=>M.money(v)+' CAD';
 document.querySelector('.order-recap-total>[data-i18n]').textContent=p.quoteRequired?'Starting estimate:':'Estimate:';
 $('orderRecapPrice').textContent=money(p.totalCents);
 if(!$('saveDialog').open)return;
 const rows=[];function row(label,value){const a=document.createElement('span'),b=document.createElement('span');a.textContent=label;b.textContent=value;rows.push(a,b);}
 for(const l of p.lines)row(l.quantity+' × '+NebulaConfig.CAT[l.id].en,l.includedInBouquet?'Included in bouquet price':l.quoteRequired?'Ray’s quote':l.suppliedByCustomer?'Supplied by you':money(l.totalCents));
 for(const l of p.extraLines)row((l.quantity>1?l.quantity+' × ':'')+(NebulaI18n.en[l.id]||l.id),l.quoteRequired?'Ray’s quote':money(l.totalCents));
 row(p.quoteRequired?'Known / starting amount':'Estimate',money(p.totalCents));
 if(p.range)row('Menu range, before variable quote extras',money(p.totalCents)+' – '+money(p.maxCents));
 row((p.payment.choice==='full'?'Full payment':'50% deposit')+(p.quoteRequired?' on starting amount':'')+' · preview',money(p.payment.dueCents));row('Balance at delivery · preview',money(p.payment.balanceCents));
 $('priceBreakdown').replaceChildren(...rows);
}
function build(){
 if(built||!$('panel-flowers'))return;built=true;
 const assumptions=$('rayAssumptions');for(const text of RAY_BUILDER.assumptions){const li=document.createElement('li');li.textContent=text;assumptions.append(li);}
 // Keep arrangement tools with the preview instead of occupying a separate row.
 const toolbar=$('moveFlowers').closest('.move-toolbar');
 document.querySelector('.history-tools').prepend($('moveFlowers'));
 document.querySelector('.art-bottom').append($('moveHelp'));
 toolbar.remove();
 const family=$('family');
 for(const [value,text]of [['foam','Foam roses'],['dahlia','Ribbon dahlias'],['plumeria','Ribbon plumerias'],['sunflower','Satin sunflowers'],['money','Folded notes']]){const o=document.createElement('option');o.value=value;o.textContent=text;family.append(o);}
 const money=document.createElement('details');money.id='rayMoney';money.className='ray-money';
 money.innerHTML='<summary>Money bouquets · CAD / USD</summary><div class="ray-money-fields"><label class="field"><span>Note currency</span><select id="rayCurrency"><option value="USD">USD notes</option><option value="CAD">CAD notes</option></select></label><label class="field"><span>Value per note</span><select id="rayDenomination"></select></label></div><label class="field ray-cash-supply"><span>Who supplies the cash?</span><select id="rayCashSupply"><option value="shop">Ray supplies it — add cash value</option><option value="customer">I supply it — cash value excluded</option></select></label><div class="ray-note-count"><label class="field"><span>Number of notes</span><input id="rayNoteCount" type="number" min="0" max="100" step="1" inputmode="numeric" value="20"></label><button type="button" id="rayUpdateNotes" class="button secondary small">Update notes</button></div><p id="rayCash" class="helper" aria-live="polite"></p><button id="rayPaintNotes" type="button" class="button secondary small">Choose folded note</button><p class="helper">One pictured fold represents one note. Artwork is illustrative; its printed value and colour do not change. The final estimate is always in CAD.</p><p id="rayRate" class="ray-rate"></p>';
 $('panel-flowers').prepend(money);noteOptions(noteChoice);
 $('rayNoteCount').addEventListener('input',()=>$('rayNoteCount').setCustomValidity(''));
 for(const [id,event]of [['family','change'],['flowerSearch','input']])$(id).addEventListener(event,()=>queueMicrotask(decorateCatalog));
 $('rayCurrency').onchange=()=>{const values=B.policy.denominations[$('rayCurrency').value],old=Number($('rayDenomination').value);$('rayDenomination').replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=String(value);o.textContent='$'+value;return o;}));$('rayDenomination').value=String(values.includes(old)?old:values[0]);changeNotes();};
 $('rayDenomination').onchange=changeNotes;
 $('rayCashSupply').onchange=()=>edit(s=>{s.finishes.studio={...s.finishes.studio,v:1,cashSupply:$('rayCashSupply').value};});
 $('rayUpdateNotes').onclick=applyNoteCount;
 const sizes=document.createElement('details');sizes.className='ray-exact-size';sizes.innerHTML='<summary>Other flower counts</summary><label class="field"><span>Number of positions</span><select id="rayExactCount"></select></label><button id="rayApplyCount" class="button secondary small" type="button">Use this count</button>';$('sizePanel').append(sizes);
 for(let n=1;n<=100;n++){const o=document.createElement('option');o.value=n;o.textContent=n+' positions';$('rayExactCount').append(o);}
 $('rayApplyCount').onclick=()=>NebulaApp.resize(Number($('rayExactCount').value));
 for(const dialog of [$('saveDialog'),$('orderDialog')])new MutationObserver(refreshReview).observe(dialog,{attributes:true,attributeFilter:['open']});
 $('rayPaintNotes').onclick=()=>{NebulaApp.chooseFlower(noteChoice);};
 // Retain the original detail editor/drag handlers, placing it outside the
 // fresh-flower-only group so it works in both supported arrangements.
 const details=document.createElement('section');details.className='ray-details';details.innerHTML='<h3 class="section-title">Plush toys, bows & toppers</h3><p class="helper">Add a detail, then drag it on the bouquet. Tap it to adjust or remove it.</p>';
 details.append($('detailChoices'),$('detailEditor'));$('panel-finishing').prepend(details);
 $('sash').replaceChildren(...[['none','No message ribbon'],['blank_blackband','Personalised black ribbon']].map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));
 const pay=document.createElement('section');pay.className='ray-payment-preview';pay.innerHTML='<h3>Choose how to pay</h3><label class="field"><span>Payment amount</span><select id="rayPaymentPlan"><option value="deposit">50% deposit · balance at delivery</option><option value="full">Pay in full</option></select></label><p id="rayPaymentAmount" aria-live="polite"></p><p class="helper">Square will create a payment link for your confirmed order amount. Payments are being connected.</p>';document.querySelector('.order-recap').after(pay);
 $('rayPaymentPlan').onchange=()=>edit(s=>{s.finishes.studio={...s.finishes.studio,v:1,paymentPlan:$('rayPaymentPlan').value};});
 const form=$('orderForm');form?.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
 for(const e of form?.elements||[])e.disabled=true;
 $('ordPay')?.replaceChildren(...['Review + Square deposit link','Direct Square checkout'].map(text=>{const o=document.createElement('option');o.textContent=text;return o;}));
}
function render(s,lang,ready){
 build();if(!built)return;
 $('sash').value=s.finishes.sash;
 for(const o of $('family').options)o.hidden=!['all','rose','foam','dahlia','plumeria','sunflower','money','chocolate'].includes(o.value);
 const notes=s.items.filter(i=>B.notes.has(i.id));
 if(document.activeElement!==$('rayNoteCount'))$('rayNoteCount').value=notes.length;
 $('rayNoteCount').max=100-s.items.filter(i=>!B.notes.has(i.id)).length;
 $('rayExactCount').value=s.template.capacity;
 document.body.classList.toggle('money-design',notes.length>0);
 if(notes.length){const id=notes[0].id,changed=id!==noteChoice;noteOptions(id);if(changed)setTimeout(()=>NebulaApp.render(false),0);}
 $('rayMoney').querySelector('summary').textContent=notes.length?'Money · '+notes.length+' notes · Change':'Add money · CAD / USD';
 document.body.classList.toggle('ray-arranging',$('moveFlowers').getAttribute('aria-pressed')==='true');
 const groups=new Map();for(const it of notes)groups.set(it.id,(groups.get(it.id)||0)+1);
 const cash=[...groups].map(([id,count])=>{const n=B.notes.get(id),v=RayPricing.convertCash({...n,count},B.policy);return count+' × '+n.currency+' $'+n.denomination+' = '+(v.cadCents===null?'CAD conversion awaiting quote':M.money(v.cadCents)+' CAD');});
 const price=M.price(s);$('rayCashSupply').value=price.cashSupply;
 $('rayPaymentPlan').value=price.payment.choice;
 refreshReview();
 $('rayPaymentAmount').textContent=(price.quoteRequired?'Preview on known amounts — ':'')+'Due now: '+M.money(price.payment.dueCents)+' CAD · Balance at delivery: '+M.money(price.payment.balanceCents)+' CAD.';
 $('rayCash').textContent=cash.length?cash.join(' · ')+(price.cashSupply==='customer'?' · You supply these notes; their face value is excluded from the amount payable.':' · Cash value is included.')+' CAD $80 styling includes wrapping and assembly.':'Choose a value, then paint folded notes into the existing flower slots.';
 const rate=B.policy.usdToCad;$('rayRate').textContent='TD cash-buying rate snapshot: USD $1 = CAD $'+(rate.numerator/rate.denominator).toFixed(4)+', dated '+rate.asOf.slice(0,10)+'. No extra exchange margin. Ray’s confirms the applicable rate with your quote.';
 $('totalPrice').textContent=M.money(price.totalCents);
 document.querySelector('.summary-price>span').textContent=price.quoteRequired?'FROM · QUOTE REQUIRED · CAD':'PREVIEW ESTIMATE · CAD';
 $('saveDisclaimer').textContent=price.quoteRequired?'Known amounts / menu starting estimate only. '+price.missing.join('. ')+'. Final quote required.':'CAD estimate. Ray’s confirms availability, the cash rate and the final quote before payment.';
 decorateCatalog();
 for(const card of document.querySelectorAll('[data-detail]'))if(B.policy.extrasCents[card.dataset.detail]===null)card.querySelector('small').textContent='Price varies · quote';
 const picked=NebulaConfig.CAT[NebulaApp.brush];if(picked&&(picked.priceCents===null||['dahlia','plumeria','sunflower'].includes(picked.family)))$('pickedPrice').textContent='Quoted with your bouquet';
 if(picked?.family==='foam')$('pickedPrice').textContent='Menu sizes / CAD $6 in money mixes';
 if($('crownPrice'))$('crownPrice').textContent='Varies by size · quote';
 for(const e of $('rayMoney').querySelectorAll('select,button'))e.disabled=!ready;
 $('paperChoices').replaceChildren(...Object.entries(B.wraps[s.mode]).map(([value,colour])=>{
  const b=document.createElement('button');b.type='button';b.dataset.paper=value;b.textContent=colour[0].toUpperCase()+colour.slice(1);b.setAttribute('aria-pressed',String(value===s.finishes.paper));
  const dot=document.createElement('span');dot.className='swatch';dot.style.setProperty('--swatch',({black:'#29222a',ivory:'#f0e8d5',pink:'#e8b8c8',lilac:'#b69aca'})[colour]);b.prepend(dot);
  b.onclick=()=>edit(n=>{n.finishes.paper=value;n.finishes.tint='#b69aca';});return b;
 }));
 $('wrapPreview').src=B.wrapArt(s).url;$('wrapHeading').textContent=s.mode==='heart'?'Triangle heart wrapping':'Triangle dome wrapping';
 $('wrapCopy').textContent='Small layered triangles, inspired by Ray’s wrapping. Choose an available colour.';
 $('customTintLabel').hidden=true;
 for(const id of ['autumnFinishes','halloweenFinishes','finishShortcuts','greenRimLabel','ribbonBlock','startingPanel'])$(id).hidden=true;
 $('language').closest('label').hidden=true;
 for(const [index,b]of [...document.querySelectorAll('[data-mode]')].entries()){b.querySelector('.mode-number').textContent='0'+(index+1);}
 if(launchOrder&&!openedOrder&&ready){openedOrder=true;setTimeout(()=>{$('orderButton').click();const q=new URLSearchParams(location.search);q.delete('action');history.replaceState(null,'',location.pathname+(q.size?'?'+q:'')+location.hash);},0);}
}
g.NebulaCustomizationUI={render};
})(window);
