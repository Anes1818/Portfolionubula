/* Optional, separately priced fillers; stored offsets never occupy flower slots. */
(function(g){'use strict';
const allowed=/^(greenery-\d|greenery-1[01]|spray-accent-[0-7])$/;
function validPositions(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length<=20&&Object.entries(p).every(([id,a])=>allowed.test(id)&&Array.isArray(a)&&a.length===2&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<=220));}
function compose(s,sc,all){
 const o=s.finishes.studio||{},positions=o.positions||{},out=all.map(n=>{const a=positions[n.uid];return a?{...n,x:n.x+a[0],y:n.y+a[1],pocket:n.pocket?{...n.pocket,x:n.pocket.x+a[0],y:n.pocket.y+a[1]}:undefined}:{...n};});
 if(o.buds&&sc.nodes.length){
  const {points,flowers}=NebulaInfill.pockets(sc),chosen=[],unit=sc.frame.unit;
  // A bud's crown belongs in a petal valley. Its short basal stem points back
  // into the bouquet; upright bouquets never become a radial ring of spikes.
  const candidates=points.map(p=>{
   const angle=s.mode==='classic'?Math.max(-1.12,Math.min(1.12,(p.x-sc.frame.center.x)/unit*.42)):Math.atan2(p.y-sc.frame.center.y,p.x-sc.frame.center.x)+Math.PI/2;
   const h=Math.min(unit*1.10,p.local*.96),w=h*2/3;
   const nearLily=flowers.filter(n=>n.id==='lily').reduce((d,n)=>Math.min(d,Math.hypot(n.x-p.x,n.y-p.y)),unit*4);
   const crowd=out.filter(n=>n.infillKind==='spray'||n.infillKind==='greenery').reduce((v,n)=>v+Math.max(0,1-Math.hypot(n.x-p.x,n.y-p.y)/(unit*.55)),0);
   const core=flowers.reduce((v,n)=>v+Math.max(0,-NebulaInfill.clearance(p,n)/unit),0);
   return {...p,h,w,angle,score:p.quality-core*3-crowd*.12+Math.max(0,1-nearLily/(unit*2))*.20};
  }).sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
  for(const p of candidates){if(chosen.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>unit*.58))chosen.push(p);if(chosen.length>=o.buds)break;}
  chosen.forEach((p,i)=>{
   // The crown is above the image centre; solve the centre from the gap anchor.
   out.push({uid:'bud-option-'+i,url:'assets/client/celebration/lily-bud.png',x:p.x-Math.sin(p.angle)*p.h*.14,y:p.y+Math.cos(p.angle)*p.h*.14,w:p.w,h:p.h,d:p.w,rot:p.angle,bright:1,z:Math.max(...sc.nodes.map(n=>n.z??n.y))+5,softDetail:true});
  });
 }
 return out;
}
const alpha=new Map();
function hit(sc,p){
 for(const n of [...(sc.layeredFlowers||[])].reverse()){
  if(!allowed.test(n.uid))continue;
  const dx=p.x-n.x,dy=p.y-n.y,c=Math.cos(n.rot||0),sn=Math.sin(n.rot||0),x=(dx*c+dy*sn)/n.w+.5,y=(-dx*sn+dy*c)/n.h+.5;
  if(x<0||x>1||y<0||y>1)continue;
  let sample=alpha.get(n.url);if(!sample){const im=NebulaRenderer.decoded(n.url);if(!im)continue;const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,128,128);sample=ctx.getImageData(0,0,128,128).data;alpha.set(n.url,sample);}
  if(sample[(Math.min(127,Math.floor(y*128))*128+Math.min(127,Math.floor(x*128)))*4+3]>80)return n;
 }return null;
}
function move(s,id,before,dx,dy){if(!allowed.test(id))return;const old=JSON.parse(before).finishes.studio?.positions?.[id]||[0,0],o=s.finishes.studio||(s.finishes.studio={v:1});o.positions={...o.positions,[id]:[Math.max(-220,Math.min(220,Math.round(old[0]+dx))),Math.max(-220,Math.min(220,Math.round(old[1]+dy)))]};}
const densities={greenery:[0,3,7,12]};
function densityControls(host,key){
 const group=document.createElement('div');group.id=key+'Density';group.className='custom-segments';
 group.setAttribute('role','group');
 densities[key].forEach((count,i)=>{const button=document.createElement('button');button.type='button';button.dataset.level=i;
 button.onclick=()=>{const s=NebulaApp.state;if(key==='greenery')s.finishes.greeneryCount=count;else(s.finishes.studio||(s.finishes.studio={v:1})).buds=count;NebulaApp.setState(s);};group.append(button);});host.append(group);
}
function buildControls(host){
 const row=document.createElement('div');row.className='toggle-row';row.innerHTML='<span id="budOptionLabel"></span><span class="stepper"><button type="button" id="budLess">âˆ’</button><output id="budOptionCount"></output><button type="button" id="budMore">+</button></span>';host.append(row);
 for(const [id,delta]of [['budLess',-1],['budMore',1]])document.getElementById(id).onclick=()=>{const s=NebulaApp.state,o=s.finishes.studio||(s.finishes.studio={v:1});o.buds=Math.max(0,Math.min(10,(o.buds||0)+delta));NebulaApp.setState(s);};
 const reset=document.createElement('button');reset.id='resetFillerPositions';reset.type='button';reset.className='text-button';reset.onclick=()=>{const s=NebulaApp.state;if(s.finishes.studio)delete s.finishes.studio.positions;NebulaApp.setState(s);};host.append(reset);
 const hint=document.createElement('p');hint.id='fillerDragHint';hint.className='helper';host.append(hint);
}
function renderControls(s,lang,ready){const es=lang==='es',$=id=>document.getElementById(id),n=s.finishes.studio?.buds||0;
 if(!$('greeneryDensity'))densityControls($('greeneryCount').closest('.toggle-row').parentElement,'greenery');
 for(const key of ['greenery']){const count=key==='buds'?n:s.finishes.greeneryCount||0,levels=densities[key],active=count===0?0:count<=3?1:count<=7?2:3;
 const group=$(key+'Density');group.setAttribute('aria-label',key==='buds'?(es?'Cantidad de capullos':'Lily bud density'):(es?'Cantidad de eucalipto':'Eucalyptus density'));
 for(const button of group.children){const i=+button.dataset.level;button.textContent=(es?['Ninguno','Ligero','Medio','Abundante']:['None','Light','Medium','Full'])[i];button.setAttribute('aria-pressed',String(i===active));button.disabled=!ready;}
 }
 $('budOptionLabel').textContent=es?'Capullos de lirio':'Closed lily buds';$('budOptionCount').textContent=n;
 $('budLess').disabled=!ready||!n;$('budMore').disabled=!ready||n>=10;
 $('budLess').setAttribute('aria-label',es?'Menos capullos':'Fewer lily buds');$('budMore').setAttribute('aria-label',es?'MÃ¡s capullos':'More lily buds');
 $('fillerDragHint').textContent=es?'Arrastra el eucalipto y las ramas blancas entre las flores. Los capullos se colocan automÃ¡ticamente.':'Drag eucalyptus and white accents between the flowers. Closed lily buds are placed automatically.';
 $('resetFillerPositions').textContent=es?'Restablecer posiciones del relleno':'Reset filler positions';$('resetFillerPositions').disabled=!ready||!Object.keys(s.finishes.studio?.positions||{}).length;
}
document.addEventListener('DOMContentLoaded',()=>{NebulaI18n.en.lily_bud='Closed lily buds';NebulaI18n.es.lily_bud='Capullos de lirio';});
g.NebulaFillerOptions={validPositions,compose,hit,move,buildControls,renderControls};
})(window);
