/* ===== Flowers Pavon — Seasonal Events Engine v2 (ROBUSTE module) =====
   One-line install on any page: <script src="events.js" defer></script>

   - Always-on TOP RIBBON above the announcement bar: gift icon + next event
     + live countdown. During an event it recolors and shows a CTA.
   - Auto engine: computes US floral holidays (fixed + floating dates) for any
     year. In production (DEMO=false) the theme activates 7 days before the
     event and ends after the event day — zero maintenance.
   - DEMO mode (DEMO=true): site starts on its NORMAL look; the ribbon shows a
     "CHANGE EVENT" dropdown — pick any event to preview the full transform,
     pick Normal day to go back. URL preview also works: ?event=valentine
*/
(function(){
"use strict";

var DEMO = true;          // <- set to false in production
var WINDOW_DAYS = 7;      // theme activates this many days before the event

function nth(y,mon,dow,n){ var d=new Date(y,mon,1); var off=(dow-d.getDay()+7)%7; return new Date(y,mon,1+off+(n-1)*7); }

var EVENTS=[
 {id:'valentine', icon:'💘', filter:'love', date:function(y){return new Date(y,1,14);},
  name:{en:"Valentine's Day",es:"San Valentín"},
  kicker:{en:"THE VALENTINE COLLECTION",es:"COLECCIÓN SAN VALENTÍN"},
  h:{en:"Say it with roses. Loudly. ❤️",es:"Dilo con rosas. Bien fuerte. ❤️"},
  p:{en:"Hand-sculpted ramos buchón for the biggest declarations — Valentine slots sell out every year, order early.",es:"Ramos buchón esculpidos a mano para las grandes declaraciones — los cupos de San Valentín vuelan cada año, pide temprano."},
  cta:{en:"💘 Shop Valentine bouquets →",es:"💘 Ver ramos de San Valentín →"},
  live:{en:"It's Valentine's Day! Order by 1PM for same-day delivery.",es:"¡Es San Valentín! Pide antes de la 1PM para entrega hoy."},
  theme:{'--rose':'#c11f45','--terra':'#a5173a','--blush':'#f2b8c6','--blush2':'#e895a8','--sand':'#f9e7e9'}, annc:'#4a0e1d', ribbon:'#8e1230'},

 {id:'womensday', icon:'💜', filter:'arreglos', date:function(y){return new Date(y,2,8);},
  name:{en:"Women's Day",es:"Día de la Mujer"},
  kicker:{en:"THE WOMEN'S DAY COLLECTION",es:"COLECCIÓN DÍA DE LA MUJER"},
  h:{en:"For the women who light every room. 💜",es:"Para las mujeres que lo iluminan todo. 💜"},
  p:{en:"Bright, elegant arrangements for March 8 — delivered same-day across Northern Virginia.",es:"Arreglos brillantes y elegantes para el 8 de marzo — entrega el mismo día en el norte de Virginia."},
  cta:{en:"💜 Shop the collection →",es:"💜 Ver la colección →"},
  live:{en:"Happy Women's Day! Order by 1PM for same-day delivery.",es:"¡Feliz Día de la Mujer! Pide antes de la 1PM."},
  theme:{'--rose':'#8e4d9e','--terra':'#7a3f8a','--blush':'#e3c6ec','--blush2':'#cfa3dd','--sand':'#f3ecf7'}, annc:'#3a2144', ribbon:'#5e3070'},

 {id:'mothersday', icon:'🌷', filter:'madre', date:function(y){return nth(y,4,0,2);},
  name:{en:"Mother's Day",es:"Día de la Madre"},
  kicker:{en:"THE MOTHER'S DAY COLLECTION",es:"COLECCIÓN DÍA DE LA MADRE"},
  h:{en:"Mamá deserves the whole garden. 🌷",es:"Mamá se merece el jardín entero. 🌷"},
  p:{en:"Our Mother's Day signatures — sunflower buchones and blooming domes she will never forget.",es:"Nuestras firmas del Día de la Madre — buchones de girasol y domos en flor que nunca olvidará."},
  cta:{en:"🌷 Shop Mother's Day →",es:"🌷 Ver Día de la Madre →"},
  live:{en:"It's Mother's Day! Order by 1PM for same-day delivery.",es:"¡Es el Día de la Madre! Pide antes de la 1PM."},
  theme:{'--rose':'#d4527b','--terra':'#b13a60','--blush':'#f6c6d4','--blush2':'#eda4b8','--sand':'#fbeaee'}, annc:'#5a1f33', ribbon:'#a03356'},

 {id:'fathersday', icon:'🌻', filter:'buchon', date:function(y){return nth(y,5,0,3);},
  name:{en:"Father's Day",es:"Día del Padre"},
  kicker:{en:"THE FATHER'S DAY COLLECTION",es:"COLECCIÓN DÍA DEL PADRE"},
  h:{en:"Bold ramos for the man of the house. 🌻",es:"Ramos con carácter para papá. 🌻"},
  p:{en:"Sunflowers, structure and statement wraps — nothing shy about these buchones.",es:"Girasoles, estructura y envolturas imponentes — buchones sin timidez."},
  cta:{en:"🌻 Shop Father's Day →",es:"🌻 Ver Día del Padre →"},
  live:{en:"It's Father's Day! Order by 1PM for same-day delivery.",es:"¡Es el Día del Padre! Pide antes de la 1PM."},
  theme:{'--rose':'#2e5d8a','--terra':'#1f4668','--blush':'#c5d5e4','--blush2':'#a8c0d6','--sand':'#e9eef2'}, annc:'#16324a', ribbon:'#24486b'},

 {id:'thanksgiving', icon:'🍂', filter:'arreglos', date:function(y){return nth(y,10,4,4);},
  name:{en:"Thanksgiving",es:"Acción de Gracias"},
  kicker:{en:"THE THANKSGIVING COLLECTION",es:"COLECCIÓN ACCIÓN DE GRACIAS"},
  h:{en:"A table that says thank you. 🍂",es:"Una mesa que dice gracias. 🍂"},
  p:{en:"Warm autumn arrangements for the gathering season — centerpieces that host the table with you.",es:"Arreglos otoñales cálidos para la temporada de reuniones — centros de mesa que reciben contigo."},
  cta:{en:"🍂 Shop Thanksgiving →",es:"🍂 Ver Acción de Gracias →"},
  live:{en:"Happy Thanksgiving! Order by 1PM for same-day delivery.",es:"¡Feliz Acción de Gracias! Pide antes de la 1PM."},
  theme:{'--rose':'#b96a2f','--terra':'#9a4f1e','--blush':'#eed3b8','--blush2':'#dfb98f','--sand':'#f6e8d6'}, annc:'#4a2a10', ribbon:'#7d4418'},

 {id:'christmas', icon:'🎄', filter:'eternas', date:function(y){return new Date(y,11,25);},
  name:{en:"Christmas",es:"Navidad"},
  kicker:{en:"THE CHRISTMAS COLLECTION",es:"COLECCIÓN NAVIDEÑA"},
  h:{en:"Roses that outlast the season. 🎄",es:"Rosas que duran más que diciembre. 🎄"},
  p:{en:"Preserved eternal roses and festive arrangements — gifts that keep blooming into the new year.",es:"Rosas eternas preservadas y arreglos festivos — regalos que siguen floreciendo en el año nuevo."},
  cta:{en:"🎄 Shop Christmas gifts →",es:"🎄 Ver regalos de Navidad →"},
  live:{en:"Merry Christmas! Order by 1PM for same-day delivery.",es:"¡Feliz Navidad! Pide antes de la 1PM."},
  theme:{'--rose':'#b3223f','--terra':'#1e5b38','--blush':'#cfe3d2','--blush2':'#a8cdb0','--sand':'#e9f0e6'}, annc:'#12331f', ribbon:'#1e5b38'}
];

var T={
 next:{en:'NEXT EVENT:',es:'PRÓXIMO EVENTO:'},
 change:{en:'⚙ CHANGE EVENT',es:'⚙ CAMBIAR EVENTO'},
 optNormal:{en:'🌿 Normal day',es:'🌿 Día normal'},
 optAuto:{en:'⏱ Auto (real calendar)',es:'⏱ Auto (calendario real)'}
};

function lang(){ try{ return (localStorage.getItem('pavonLang')||'en')==='es'?'es':'en'; }catch(e){ return 'en'; } }
function q(s){ return document.querySelector(s); }

/* ---- date engine ---- */
var DAY=86400000;
function startOf(e){ var now=new Date(), y=now.getFullYear(); var d=e.date(y); var end=new Date(d.getTime()+DAY); if(now>=end){ d=e.date(y+1); } return d; }
function nextEvent(){ var best=null,bd=null; EVENTS.forEach(function(e){ var d=startOf(e); if(!bd||d<bd){bd=d;best=e;} }); return best; }

/* ---- mode resolution ----
   modes: 'off' = normal look, 'auto' = real calendar, '<eventId>' = forced.
   DEMO default: 'off' (site starts normal). Production default: 'auto'. */
var mode;
try{
  var qs=new URLSearchParams(location.search).get('event');
  var ls=localStorage.getItem('pavonEventDemo')||'';
  mode=qs!==null&&qs!==''?qs:(ls||(DEMO?'off':'auto'));
}catch(e){ mode=DEMO?'off':'auto'; }
if(mode!=='off'&&mode!=='auto'&&!EVENTS.some(function(e){return e.id===mode;})) mode=DEMO?'off':'auto';

var nextEv=nextEvent();
var activeEv=null;
if(mode==='auto'){ var st0=startOf(nextEv); if(new Date().getTime()>=st0.getTime()-WINDOW_DAYS*DAY) activeEv=nextEv; }
else if(mode!=='off'){ EVENTS.forEach(function(e){ if(e.id===mode) activeEv=e; }); }

/* ---- styles ---- */
var css=''+
'#evRibbon{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 16px;background:#2b261c;color:#f5eeda;padding:9px 14px;font-family:var(--px,monospace);font-size:9px;letter-spacing:.06em;line-height:1.6;position:relative;z-index:98}'+
'#evRibbon .ico{font-size:14px;line-height:1;animation:evPulse 3.2s ease-in-out infinite;display:inline-block}'+
'@keyframes evPulse{0%,100%{transform:scale(1)}6%{transform:scale(1.25)}12%{transform:scale(1)}}'+
'#evRibbon b{font-weight:400;color:#fff}'+
'#evRibbon .cd{color:#ffd9a8;white-space:nowrap}'+
'#evRibbon a.cta{color:#fff;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}'+
'#evRibbon .pick{display:inline-flex;align-items:center;gap:6px}'+
'#evRibbon select{background:rgba(0,0,0,.25);color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:7px;font-family:var(--px,monospace);font-size:8px;padding:4px 5px;cursor:pointer;max-width:180px}'+
'#evRibbon select option{background:#2b261c;color:#fff}'+
'.fbtn.ev-glow{outline:3px solid var(--rose);outline-offset:2px}'+
'@media(max-width:720px){#evRibbon{font-size:8px;padding:8px 10px;gap:4px 10px}}'+
'#evBow{position:fixed;top:0;left:0;width:200px;height:auto;z-index:120;cursor:pointer;filter:drop-shadow(4px 6px 10px rgba(0,0,0,.3));transform:translate(-25%,-24%)}'+
'@media(max-width:720px){#evBow{width:128px}#evRibbon{padding-left:104px}#annc{padding-left:104px}}'+
'@media(min-width:721px){#nav .bar{padding-left:158px}#evRibbon{padding-left:158px}#annc{padding-left:158px}}';
var st_=document.createElement('style'); st_.textContent=css; document.head.appendChild(st_);

/* ---- inject always-on top ribbon ---- */
var bar=document.createElement('div'); bar.id='evRibbon';
bar.innerHTML='<span class="ico" id="evIco">🎁</span><span id="evTxt"></span><span class="cd" id="evCd"></span>'+
'<a class="cta" id="evCta" href="#catalog" style="display:none"></a>'+
(DEMO?'<span class="pick"><span id="evPickLbl"></span><select id="evSel" aria-label="Change event"></select></span>':'');
document.body.insertBefore(bar, document.body.firstChild);

/* ---- corner bow: gift-wrap ribbon hugging the top-left page corner ----
   Swaps per event (assets/bow-<id>.png), bow-normal.png on regular days. */
var bow=document.createElement('img'); bow.id='evBow'; bow.alt='';
bow.src='assets/bow-'+(activeEv?activeEv.id:'normal')+'.png';
bow.addEventListener('click',function(){ var c=q('#catalog'); if(c)c.scrollIntoView({behavior:'smooth'}); });
document.body.appendChild(bow);

/* ---- demo dropdown: pick an event directly ---- */
if(DEMO){
  var sel=q('#evSel');
  sel.addEventListener('change',function(){
    try{ localStorage.setItem('pavonEventDemo',sel.value); }catch(e){}
    location.href=location.pathname+location.hash; // reload without ?event= param
  });
}
function fillSelect(){
  if(!DEMO) return;
  var l=lang(), sel=q('#evSel'), html='';
  html+='<option value="off">'+T.optNormal[l]+'</option>';
  EVENTS.forEach(function(e){ html+='<option value="'+e.id+'">'+e.icon+' '+e.name[l]+'</option>'; });
  html+='<option value="auto">'+T.optAuto[l]+'</option>';
  sel.innerHTML=html; sel.value=mode;
  q('#evPickLbl').textContent=T.change[l];
}

/* ---- theme + catalog transform ---- */
function applyTheme(e){
  document.body.setAttribute('data-event',e.id);
  var root=document.documentElement.style;
  Object.keys(e.theme).forEach(function(k){ root.setProperty(k,e.theme[k]); });
  var a=q('#annc'); if(a){ a.style.background=e.annc; }
  bar.style.background=e.ribbon;
}
function transformCatalog(e){
  var k=q('#catalog .sec-head .kicker'), h=q('#catalog .sec-head h2'), p=q('#catalog .sec-head p');
  var l=lang();
  if(k){ k.removeAttribute('data-i18n'); k.textContent='✦ '+e.kicker[l]; }
  if(h){ h.removeAttribute('data-i18n'); h.textContent=e.h[l]; }
  if(p){ p.removeAttribute('data-i18n'); p.textContent=e.p[l]; }
  var fb=document.querySelector('.fbtn[data-f="'+e.filter+'"]');
  if(fb){ fb.click(); document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('ev-glow');}); fb.classList.add('ev-glow'); }
}
if(activeEv){ applyTheme(activeEv); }

/* ---- render loop (countdown + language sync) ---- */
var lastLang=null;
function pad(n){ return (n<10?'0':'')+n; }
function render(){
  var l=lang();
  var ev=activeEv||nextEv;
  var start=startOf(ev), now=new Date(), end=new Date(start.getTime()+DAY);
  var isLive=now>=start&&now<end;
  if(isLive){
    q('#evCd').textContent='';
  }else{
    var ms=start-now;
    var d=Math.floor(ms/DAY), hh=Math.floor(ms%DAY/3600000), mm=Math.floor(ms%3600000/60000), ss=Math.floor(ms%60000/1000);
    q('#evCd').textContent=(d>0?d+'d ':'')+pad(hh)+':'+pad(mm)+':'+pad(ss);
  }
  if(l!==lastLang){
    lastLang=l;
    q('#evIco').textContent=activeEv?ev.icon:'🎁';
    q('#evTxt').textContent=isLive?ev.live[l]:(activeEv?ev.icon+' '+ev.name[l].toUpperCase()+' — ':T.next[l]+' '+ev.name[l]+' — ');
    if(isLive)q('#evTxt').textContent=ev.live[l];
    var cta=q('#evCta');
    if(activeEv){ cta.style.display='inline'; cta.textContent=ev.cta[l]; } else { cta.style.display='none'; }
    fillSelect();
    if(activeEv){ transformCatalog(activeEv); }
  }
}
render();
setInterval(render,1000);
})();
