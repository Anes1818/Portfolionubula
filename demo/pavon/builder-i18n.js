/* Flowers Pavon — Builder EN/ES translation layer.
   Translates the builder UI in place (static + dynamic) without touching the
   geometry/render logic. English is the source; this file provides Spanish. */
(function(){
'use strict';
var KEY='pavonLang';
function stored(){try{return localStorage.getItem(KEY)||'en';}catch(e){return 'en';}}
var LANG=stored();

/* Exact whole-string translations (trimmed match) */
var EXACT={
  // header / chrome
  'BUILD YOUR OWN BOUQUET':'ARMA TU PROPIO RAMO',
  'Flowers':'Flores','Wrap':'Papel','Ribbon':'Listón','Note':'Nota','Total':'Total',
  // step 1 statics
  'Quick start':'Inicio rápido','Size':'Tamaño','Pick your stems':'Elige tus tallos',
  '❤️ Romantic':'❤️ Romántico','☀️ Bright Mix':'☀️ Mezcla Viva','🤍 Pure White':'🤍 Blanco Puro',
  '✨ Tidy up':'✨ Ordenar','Clear all':'Borrar todo',
  'Bouquet style':'Estilo del ramo',
  '🌿 Classic':'🌿 Clásico','hand-tied':'atado a mano',
  '💐 Round Buchón':'💐 Buchón Redondo','rose dome':'cúpula de rosas',
  '❤️ Heart Buchón':'❤️ Buchón Corazón','shaped':'con forma',
  'Outer wall · the ring everyone sees':'Muralla exterior · el anillo que todos ven',
  'Inside fill':'Relleno interior','Center bloom · the star':'Flor central · la estrella',
  'Formation':'Formación','Extras':'Extras',
  'Message sash · printed ribbon across the ramo · +$10':'Banda con mensaje · listón impreso sobre el ramo · +$10',
  'wall + fill':'muralla + relleno','ring by ring':'anillo por anillo','one by one':'uno por uno',
  'Zones':'Zonas','Rings':'Anillos','Checker':'Damero',
  'Double wall':'Muralla doble','2 wall rings':'2 anillos de muralla',
  '🌿 Greenery':'🌿 Verde','💎 Diamonds':'💎 Diamantes','🍫 Chocolates':'🍫 Chocolates',
  '🎂 Happy B-Day':'🎂 Feliz Cumpleaños','🤍 Happy Wedding':'🤍 Feliz Boda','❤️ I Love You':'❤️ Te Amo',
  'tap to add · tap again to remove':'toca para añadir · toca de nuevo para quitar',
  // step 2/3/4 statics
  'Choose your paper':'Elige tu papel',
  '🎀 Included with every bouquet. One little bow changes everything.':'🎀 Incluido en cada ramo. Un pequeño moño lo cambia todo.',
  'Gift note':'Tarjeta de regalo','printed card · optional':'tarjeta impresa · opcional',
  'No card':'Sin tarjeta','free':'gratis','💌 Printed card':'💌 Tarjeta impresa',
  'Order on WhatsApp 💬':'Pedir por WhatsApp 💬',
  '📸 Save & share my bouquet':'📸 Guarda y comparte tu ramo',
  'No online payment needed — confirm bouquet & delivery on WhatsApp. Pay on delivery or by card.':'No necesitas pagar en línea — confirma el ramo y la entrega por WhatsApp. Paga al entregar o con tarjeta.',
  '← Back':'← Atrás',
  'Flowers Pavon · Northern Virginia · Drop real stem photos into assets/build/':'Flowers Pavon · Northern Virginia · Coloca fotos reales de tallos en assets/build/',
  'Pick a preset or tap + to add flowers — then drag each bloom into place':'Elige un preset o toca + para añadir flores — luego arrastra cada flor a su lugar',
  // groups
  'Roses':'Rosas','Tulips':'Tulipanes','Carnations':'Claveles','Other':'Otras',
  // sizes
  'Petite':'Pequeño','Classic':'Clásico','Lavish':'Lujoso',
  // wraps / ribbons
  'Kraft Paper':'Papel Kraft','Burlap':'Yute','Journal':'Periódico',
  'None':'Ninguno','Blush':'Rosa','Burgundy':'Vino','Sage':'Salvia','Gold':'Dorado','Ivory':'Marfil',
  // dynamic: step titles / subs / bars / next
  'Create your bouquet':'Crea tu ramo','Choose the wrap':'Elige el papel','Tie the ribbon':'Ata el listón','Add a gift note':'Añade una tarjeta','Design your ramo':'Diseña tu ramo',
  'Every stem is priced on the card — build it exactly how you feel.':'Cada tallo tiene su precio en la tarjeta — ármalo justo como lo sientes.',
  'Your bouquet is gathered — pick the paper that matches the mood.':'Tu ramo está reunido — elige el papel que combine con el momento.',
  'The finishing touch. Pick a color that says it for you.':'El toque final. Elige un color que hable por ti.',
  'Say it with words too. We print it on a little card.':'Dílo también con palabras. Lo imprimimos en una tarjetita.',
  'Pick the shape, the size, and who owns each ring.':'Elige la forma, el tamaño y quién manda en cada anillo.',
  'Here is the paper on its own — your ramo is hand-wrapped in it at pickup.':'Aquí está el papel a solas — tu ramo se envuelve a mano al recoger.',
  'Pick the bow color — shown tied on the paper.':'Elige el color del moño — se muestra atado en el papel.',
  '🌸 Drag any bloom to arrange it · double-tap a bloom to remove it':'🌸 Arrastra cualquier flor para acomodarla · doble toque para quitarla',
  '🧻 Blooms are locked while wrapped — press Back to rearrange':'🧻 Las flores se bloquean al envolver — pulsa Atrás para reacomodar',
  '🎀 The bow is tied right on the paper — pick your color':'🎀 El moño se ata sobre el papel — elige tu color',
  '💌 Ready! Order it — or save the picture and share it':'💌 ¡Listo! Pídelo — o guarda la foto y compártela',
  'Wrap it →':'Envolver →','Add ribbon →':'Añadir listón →','Gift note →':'Tarjeta →',
  'Add at least one flower first 🌸':'Añade al menos una flor primero 🌸',
  '🧻 The paper gathers your stems and trims the long ones neatly — your blooms stay untouched. Want to rearrange? Press Back.':'🧻 El papel reúne tus tallos y recorta los largos con cuidado — tus flores quedan intactas. ¿Quieres reacomodar? Pulsa Atrás.',
  '🧻 Giant ramos are hand-wrapped at pickup — at the last step you will see your ramo, the paper and the bow side by side.':'🧻 Los ramos gigantes se envuelven a mano al recoger — en el último paso verás tu ramo, el papel y el moño lado a lado.',
  // summary compound labels
  'No ribbon':'Sin listón','Included':'Incluido',
  'Blush ribbon':'Listón Rosa','Burgundy ribbon':'Listón Vino','Sage ribbon':'Listón Salvia','Gold ribbon':'Listón Dorado','Ivory ribbon':'Listón Marfil',
  'No bow':'Sin moño','Blush bow':'Moño Rosa','Burgundy bow':'Moño Vino','Sage bow':'Moño Salvia','Gold bow':'Moño Dorado','Ivory bow':'Moño Marfil',
  'Diamonds':'Diamantes','Chocolates':'Chocolates','Gift card':'Tarjeta',
  'Printed gift card':'Tarjeta de regalo impresa',
  '🌿 Greenery collar':'🌿 Collar de verde',
  '💎 Diamond pins in every rose':'💎 Cristales en cada rosa',
  '🍫 Chocolate box':'🍫 Caja de chocolates',
  '🧻 Kraft Paper wrap':'🧻 Papel Kraft','🧻 Burlap wrap':'🧻 Yute','🧻 Journal wrap':'🧻 Periódico',
  // placeholder
  'Write your message… e.g. “Happy birthday! You deserve every one of these.”':'Escribe tu mensaje… p.ej. “¡Feliz cumpleaños! Te mereces cada una de estas.”'
};

/* Ordered fragment replacements for interpolated strings (summaries, order msg, buBar). */
var FRAG=[
  // order message openers
  ['Hi Flowers Pavon! My custom ','¡Hola Flowers Pavon! Mi ramo personalizado '],
  ['Hi Flowers Pavon! My Ramo Buchón: ','¡Hola Flowers Pavon! Mi Ramo Buchón: '],
  [' bouquet: ',': '],
  ['Round shape','forma Redonda'],['Heart shape','forma Corazón'],
  [' blooms (',' flores ('],
  [', center: ',', centro: '],
  ['With greenery collar.','Con collar de verde.'],
  ['Diamond pins in the roses (+$35).','Cristales en las rosas (+$35).'],
  ['Chocolate box (+$25).','Caja de chocolates (+$25).'],
  ['Printed message sash: ','Banda impresa: '],
  ['Printed gift card (+$','Tarjeta de regalo impresa (+$'],
  ['Is it available for delivery?','¿Está disponible para entrega?'],
  ['Wrap: ','Envoltura: '],['Ribbon: ','Listón: '],
  // buBar phrases
  ['blooms auto-arranged like a pro ramo · style the zones on the right','flores organizadas como un ramo pro · dale estilo a las zonas a la derecha'],
  ['shown on its own — your giant ramo is hand-wrapped in it at pickup','a solas — tu ramo gigante se envuelve a mano al recoger'],
  ['Almost there — one bow to go','Casi listo — falta el moño'],
  // summary compounds (with emoji prefixes, so handled as fragments)
  ['Blush ribbon','Listón Rosa'],['Burgundy ribbon','Listón Vino'],['Sage ribbon','Listón Salvia'],['Gold ribbon','Listón Dorado'],['Ivory ribbon','Listón Marfil'],['No ribbon','Sin listón'],
  ['Blush bow','Moño Rosa'],['Burgundy bow','Moño Vino'],['Sage bow','Moño Salvia'],['Gold bow','Moño Dorado'],['Ivory bow','Moño Marfil'],['No bow','Sin moño'],
  ['Printed gift card','Tarjeta de regalo impresa'],
  // summary fragments
  ['Ramo Buchón · ','Ramo Buchón · '],
  ['Formation · ','Formación · '],
  ['Alternating rings','Anillos alternos'],
  ['Checker · one by one','Damero · uno por uno'],
  ['Center · ','Centro · '],
  ['Message sash · ','Banda con mensaje · '],
  ['double wall','muralla doble'],
  [' stems · ',' tallos · '],
  // sash text inside quotes
  ['Happy B-Day','Feliz Cumpleaños'],['Happy Wedding','Feliz Boda'],['I Love You','Te Amo'],
  // flower full labels (before single words)
  ["Baby's Breath",'Nube de Novia'],['Oriental Lily','Lirio Oriental'],['Gerbera Daisy','Gerbera'],
  ['Pink Rose','Rosa Rosada'],['Red Rose','Rosa Roja'],['Orange Rose','Rosa Naranja'],['Violet Rose','Rosa Violeta'],['Yellow Rose','Rosa Amarilla'],['White Rose','Rosa Blanca'],
  ['Pink Tulip','Tulipán Rosado'],['Red Tulip','Tulipán Rojo'],['Orange Tulip','Tulipán Naranja'],['Violet Tulip','Tulipán Violeta'],['Yellow Tulip','Tulipán Amarillo'],['White Tulip','Tulipán Blanco'],
  ['Pink Carnation','Clavel Rosado'],['Red Carnation','Clavel Rojo'],['Orange Carnation','Clavel Naranja'],['Violet Carnation','Clavel Violeta'],['Yellow Carnation','Clavel Amarillo'],['White Carnation','Clavel Blanco'],
  ['Sunflower','Girasol'],['Eucalyptus','Eucalipto'],['Ranunculus','Ranúnculo'],['Alstroemeria','Alstroemeria'],['Limonium','Limonium'],
  // wraps (single occurrences inside minickt / order)
  ['Kraft Paper','Papel Kraft'],['Burlap','Yute'],['Journal','Periódico'],
  // shapes / patterns single words
  ['Round','Redondo'],['Heart','Corazón'],['Zones','Zonas'],
  // ribbon color words (order msg)
  ['Blush','Rosa'],['Burgundy','Vino'],['Sage','Salvia'],['Gold','Dorado'],['Ivory','Marfil'],
  // sizes
  ['Classic','Clásico'],['Petite','Pequeño'],['Lavish','Lujoso'],
  // units
  ['/ stem','/ tallo'],[' stems',' tallos'],[' blooms',' flores']
];

function frag(s){for(var i=0;i<FRAG.length;i++){if(s.indexOf(FRAG[i][0])>=0)s=s.split(FRAG[i][0]).join(FRAG[i][1]);}return s;}
function tText(s){
  if(!s)return s;
  var lead=(s.match(/^\s*/)||[''])[0];
  var trail=(s.match(/\s*$/)||[''])[0];
  var core=s.slice(lead.length, s.length-trail.length);
  if(!core)return s;
  var out=Object.prototype.hasOwnProperty.call(EXACT,core)?EXACT[core]:frag(core);
  return lead+out+trail;
}
window.__pavonT=tText;
window.__pavonWA=function(m){return LANG==='es'?tText(m):m;};

/* ---- text-node translation ---- */
var DYN='#stepTitle,#stepSub,#stagebar,#nextBtn,#summary,#toast,#noteCardTxt,#amt,#wrapTip,#charCt,[id^="buc"]';
function isDyn(node){var el=node.parentElement;return !!(el&&el.closest&&el.closest(DYN));}
function walkText(root,cb){
  if(root.nodeType===3){if(root.nodeValue&&root.nodeValue.trim())cb(root);return;}
  if(root.nodeType!==1)return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  var n;while(n=w.nextNode()){if(n.nodeValue&&n.nodeValue.trim())cb(n);}
}
var esSet=new WeakMap();
function toES(n){
  var cur=n.nodeValue;
  if(esSet.get(n)===cur)return;
  var es=tText(cur);
  if(es!==cur)n.nodeValue=es;
  esSet.set(n,es);
}
function treeES(root){walkText(root,toES);}

/* static originals for restore */
var origMap=[];
function captureStatic(){walkText(document.body,function(n){if(!isDyn(n))origMap.push([n,n.nodeValue]);});}

var ta=document.getElementById('cardMsg');
var taEN=ta?ta.placeholder:'';

function refreshDyn(){
  try{ if(typeof window.setTemplate==='function'&&typeof state!=='undefined')window.setTemplate(state.template); }catch(e){}
  try{ if(typeof window.setStep==='function'&&typeof step!=='undefined')window.setStep(step); }catch(e){}
}

var tgl;
function setLang(l){
  LANG=l;
  try{localStorage.setItem(KEY,l);}catch(e){}
  document.documentElement.lang=l;
  if(tgl)tgl.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-l')===l);});
  if(l==='es'){
    origMap.forEach(function(o){toES(o[0]);});
    if(ta)ta.placeholder=tText(taEN);
    refreshDyn();
    treeES(document.body);
  } else {
    origMap.forEach(function(o){if(o[0].nodeValue!==o[1])o[0].nodeValue=o[1];});
    if(ta)ta.placeholder=taEN;
    refreshDyn();
  }
}

function makeToggle(){
  tgl=document.createElement('div');
  tgl.className='langtog';
  tgl.setAttribute('role','group');
  tgl.innerHTML='<button type="button" data-l="en">EN</button><button type="button" data-l="es">ES</button>';
  tgl.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('button'):null;
    if(b)setLang(b.getAttribute('data-l'));
  });
  var hd=document.querySelector('.bheader');
  var pill=hd?hd.querySelector('.pricepill'):null;
  if(hd){ if(pill)hd.insertBefore(tgl,pill); else hd.appendChild(tgl); }
}

function start(){
  captureStatic();
  makeToggle();
  if(tgl)tgl.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-l')===LANG);});
  if(LANG==='es')setLang('es');
  var mo=new MutationObserver(function(muts){
    if(LANG!=='es')return;
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==='characterData'){ if(m.target&&m.target.nodeValue&&m.target.nodeValue.trim())toES(m.target); }
      else if(m.type==='childList'){ for(var j=0;j<m.addedNodes.length;j++)treeES(m.addedNodes[j]); }
    }
  });
  mo.observe(document.body,{subtree:true,childList:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
})();
