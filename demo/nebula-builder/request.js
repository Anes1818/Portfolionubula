/* Request preparation only: no transport, delivery status, or customer storage. */
(function(g){'use strict';
 const recipient=value=>typeof value==='string'&&/^\+[1-9]\d{7,14}$/.test(value)?value:'';
 function url(channel,to,text,apple=false){
  if(!recipient(to))throw Error('Invalid international recipient');
  if(channel==='sms')return 'sms:'+to+(apple?'&':'?')+'body='+encodeURIComponent(text);
  if(channel==='whatsapp')return 'https://wa.me/'+to.slice(1)+'?text='+encodeURIComponent(text);
  throw Error('Unsupported request channel');
 }
 function validate(data,today){
  if(!data.name?.trim()||data.name.length>120)return 'name';
  const date=data.date||'',d=new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date||date<today)return 'date';
  if(!['Pickup','Delivery'].includes(data.method))return 'method';
  if((data.note||'').length>120)return 'note';
  return null;
 }
 function compose({ref,shop,data,summary,link,lang='en',sample=true}){
  const es=lang==='es';
  return [shop+' — '+(es?'Solicitud':'Request')+' '+ref,
   data.name.trim()+(data.phone?.trim()?' · '+data.phone.trim():''),
   data.date+' · '+(data.method==='Delivery'?(es?'Entrega (por confirmar)':'Delivery (to confirm)'):(es?'Recogida (por confirmar)':'Pickup (to confirm)')),
   summary.style||'',summary.stems.join(', '),summary.extras.join(' · '),
   (sample?(es?'Estimación de muestra':'Sample estimate'):(es?'Estimación actual':'Current estimate'))+': '+summary.total,
   data.note?.trim()?(es?'Nota: ':'Note: ')+data.note.trim():'',
   data.cardNote?.trim()?(es?'Tarjeta: ':'Card: ')+data.cardNote.trim():'',
   es?'Solicitud de prueba para Nebula. No se realiza ningún pedido ni pago.':'Demo request for Nebula. No flower order or payment is placed.',
   link?(es?'Diseño: ':'Design: ')+link:''].filter(Boolean).join('\n');
 }
 async function copy(text,textarea){
  try{if(!g.navigator.clipboard?.writeText)throw Error();await g.navigator.clipboard.writeText(text);return true;}
  catch{if(textarea){textarea.focus();textarea.select();textarea.setSelectionRange(0,textarea.value.length);textarea.scrollTop=0;}return false;}
 }
 g.NebulaRequest={recipient,url,validate,compose,copy};
})(window);
