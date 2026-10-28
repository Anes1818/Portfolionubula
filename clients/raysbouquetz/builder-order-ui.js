/* Shop-only presentation of the original read-only work order. */
(function(){'use strict';
 const sheet=document.getElementById('orderSheet');if(!sheet)return;
 function update(){
  if(sheet.hidden)return;
  const code=NebulaLink.readHash(location.hash),parsed=code&&NebulaLink.decode(code);if(!parsed)return;
  const p=NebulaModel.price(parsed.design),money=v=>NebulaModel.money(v)+' CAD';
  const customer=document.getElementById('osCustomerList');customer.closest('.os-card').hidden=!customer.children.length;
  const when=document.getElementById('osWhen');when.hidden=!when.textContent.trim();
  if(!parsed.order?.ref)document.getElementById('osRef').textContent='Design preview';
  document.getElementById('osTotal').textContent=(p.quoteRequired?'Known / starting amount: ':'Estimate: ')+money(p.totalCents)+(p.quoteRequired?' · final quote required':'');
  let note=document.getElementById('rayOrderTerms');if(!note){note=document.createElement('p');note.id='rayOrderTerms';note.className='notice-block';sheet.append(note);}
  const hasCash=parsed.design.items.some(i=>RayBuilder.notes.has(i.id));
  note.textContent=(hasCash?(p.cashSupply==='customer'?'Customer supplies the notes; their face value is excluded. ':'Ray supplies the notes; cash value is included. '):'')+(p.payment.choice==='full'?'Full payment preview':'50% deposit preview')+(p.quoteRequired?' on the known / starting amount':'')+': '+money(p.payment.dueCents)+'. Balance at delivery: '+money(p.payment.balanceCents)+'. '+(p.quoteRequired?p.missing.join('. ')+'. ':'')+'No payment has been requested or collected.';
 }
 document.getElementById('language').closest('label').hidden=true;
 new MutationObserver(update).observe(sheet,{attributes:true,attributeFilter:['hidden']});update();
})();
