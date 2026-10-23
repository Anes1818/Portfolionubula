/* Optional, separately priced fillers; stored offsets never occupy flower slots. */
(function(g){'use strict';
const allowed=/^(greenery-\d|greenery-1[01]|spray-accent-[0-7])$/;
function validPositions(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length<=20&&Object.entries(p).every(([id,a])=>allowed.test(id)&&Array.isArray(a)&&a.length===2&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<=220));}
function compose(s,sc,all){
 const o=s.finishes.studio||{},positions=o.positions||{},out=all.map(n=>{const a=positions[n.uid];return a?{...n,x:n.x+a[0],y:n.y+a[1],pocket:n.pocket?{...n.pocket,x:n.pocket.x+a[0],y:n.pocket.y+a[1]}:undefined}:{...n};});
 if(o.buds&&sc.nodes.length){
  const {points}=NebulaInfill.pockets(sc),chosen=[];
  for(const p of [...points].sort((a,b)=>b.quality-a.quality)){if(chosen.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>sc.frame.unit*.58))chosen.push(p);if(chosen.length>=o.buds)break;}
  chosen.forEach((p,i)=>{const near=sc.nodes.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b),h=sc.frame.unit*(1.22+(i%3)*.08),w=h*2/3,angle=Math.atan2(p.y-sc.frame.center.y,p.x-sc.frame.center.x)+Math.PI/2;
   out.push({uid:'bud-option-'+i,url:'assets/client/celebration/lily-bud.png',x:p.x+Math.sin(angle)*h*.16,y:p.y-Math.cos(angle)*h*.16,w,h,d:w,rot:angle,bright:1,z:Math.max(...sc.nodes.map(n=>n.z??n.y))+5,softDetail:true});
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
function buildControls(host){
 const row=document.createElement('div');row.className='toggle-row';row.innerHTML='<span id="budOptionLabel"></span><span class="stepper"><button type="button" id="budLess">−</button><output id="budOptionCount"></output><button type="button" id="budMore">+</button></span>';host.append(row);
 for(const [id,delta]of [['budLess',-1],['budMore',1]])document.getElementById(id).onclick=()=>{const s=NebulaApp.state,o=s.finishes.studio||(s.finishes.studio={v:1});o.buds=Math.max(0,Math.min(10,(o.buds||0)+delta));NebulaApp.setState(s);};
 const reset=document.createElement('button');reset.id='resetFillerPositions';reset.type='button';reset.className='text-button';reset.onclick=()=>{const s=NebulaApp.state;if(s.finishes.studio)delete s.finishes.studio.positions;NebulaApp.setState(s);};host.append(reset);
 const hint=document.createElement('p');hint.id='fillerDragHint';hint.className='helper';host.append(hint);
}
function renderControls(s,lang,ready){const es=lang==='es',$=id=>document.getElementById(id),n=s.finishes.studio?.buds||0;
 $('budOptionLabel').textContent=es?'Capullos de lirio':'Closed lily buds';$('budOptionCount').textContent=n;
 $('budLess').disabled=!ready||!n;$('budMore').disabled=!ready||n>=10;
 $('budLess').setAttribute('aria-label',es?'Menos capullos':'Fewer lily buds');$('budMore').setAttribute('aria-label',es?'Más capullos':'More lily buds');
 $('fillerDragHint').textContent=es?'Arrastra el eucalipto y las ramas blancas entre las flores. Los capullos se colocan automáticamente.':'Drag eucalyptus and white accents between the flowers. Closed lily buds are placed automatically.';
 $('resetFillerPositions').textContent=es?'Restablecer posiciones del relleno':'Reset filler positions';$('resetFillerPositions').disabled=!ready||!Object.keys(s.finishes.studio?.positions||{}).length;
}
document.addEventListener('DOMContentLoaded',()=>{NebulaI18n.en.lily_bud='Closed lily buds';NebulaI18n.es.lily_bud='Capullos de lirio';});
g.NebulaFillerOptions={validPositions,compose,hit,move,buildControls,renderControls};
})(window);
