/* Optional, separately priced fillers; stored offsets never occupy flower slots. */
(function(g){'use strict';
const allowed=/^(greenery-(?:[0-9]|1[01])|spray-accent-[0-7]|air-(?:[0-9]|1[0-9]|2[0-3]))$/;
let selected=null;
function validPositions(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length<=44&&Object.entries(p).every(([id,a])=>allowed.test(id)&&Array.isArray(a)&&a.length===2&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<=220));}
function validPlacements(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length<=44&&Object.entries(p).every(([id,a])=>allowed.test(id)&&Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)&&Math.abs(a[0])<=2000&&Math.abs(a[1])<=2000&&Math.abs(a[2])<=Math.PI*2);}
function transform(n,x,y,rotation,flowers){
 const turn=rotation-(n.rot||0),cs=Math.cos(turn),sn=Math.sin(turn);
 const point=p=>p?{x:x+(p.x-n.x)*cs-(p.y-n.y)*sn,y:y+(p.x-n.x)*sn+(p.y-n.y)*cs}:undefined;
 const base=point(n.base),crown=point(n.crown);
 const occlude=base?flowers.filter(f=>NebulaInfill.alphaAt({...NebulaInfill.shape(f),mask:NebulaRenderer.footprint(f)},base)>.4).map(f=>f.uid):[];
 return {...n,x,y,rot:rotation,base,crown,occlude};
}
function compose(s,sc,all){
 const o=s.finishes.studio||{},positions=o.positions||{},placements=o.placements||{},out=all.map(n=>{
 const parent=n.parentFiller?all.find(p=>p.uid===n.parentFiller):null,a=placements[n.uid]||placements[n.parentFiller];
 if(a){if(parent){const t=a[2]-parent.rot,c=Math.cos(t),sn=Math.sin(t);return transform(n,a[0]+(n.x-parent.x)*c-(n.y-parent.y)*sn,a[1]+(n.x-parent.x)*sn+(n.y-parent.y)*c,n.rot+t,sc.nodes);}return transform(n,a[0],a[1],a[2],sc.nodes);}
 const offset=positions[n.uid];return offset?transform(n,n.x+offset[0],n.y+offset[1],n.rot,sc.nodes):{...n};
 });
 if(o.buds&&sc.nodes.length){
  const {points,flowers}=NebulaInfill.pockets(sc),chosen=[],unit=sc.frame.unit;
  // Anchor the stem in a gap, then let the closed head rise above it.
  // Unlike airy filler, a bud must retain one continuous, readable silhouette.
  const masked=flowers.map(f=>({...f,mask:NebulaRenderer.footprint(f)}));
  const lilies=flowers.filter(n=>n.id==='lily');
  const candidates=points.map(p=>{
   const lily=[...lilies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   const fan=Math.max(-.65,Math.min(.65,(p.x-sc.frame.center.x)/unit*.18));
   const angle=fan+Math.sin(p.x*.07+p.y*.03)*.08;
   const h=Math.min(unit*1.20,p.local*1.02),w=h*2/3;
   const x=p.x+Math.sin(angle)*h*.38,y=p.y-Math.cos(angle)*h*.38;
   const crown={x:x+Math.sin(angle)*h*.12,y:y-Math.cos(angle)*h*.12};
   const occluders=masked.filter(f=>NebulaInfill.alphaAt(f,p)>.4);
   const sample=[];for(const v of [-.32,-.18,0,.15])for(const u of [-.12,0,.12])sample.push({x:x+u*w*Math.cos(angle)-v*h*Math.sin(angle),y:y+u*w*Math.sin(angle)+v*h*Math.cos(angle)});
   const hidden=sample.filter(q=>occluders.some(f=>NebulaInfill.alphaAt(f,q)>.5)).length/sample.length;
   const core=sample.reduce((sum,q)=>sum+flowers.reduce((v,f)=>v+Math.max(0,-NebulaInfill.clearance(q,f)/unit),0),0)/sample.length;
   const crowd=out.filter(n=>n.infillKind==='spray'||n.infillKind==='greenery').reduce((v,n)=>v+Math.max(0,1-Math.hypot(n.x-x,n.y-y)/(unit*.5)),0);
   const nearLily=lily?Math.hypot(lily.x-x,lily.y-y):unit*4;
   return {x,y,h,w,angle,crown,base:{x:p.x,y:p.y},occlude:occluders.map(f=>f.uid),hidden,score:p.quality-core*4-hidden*12-crowd*.25+Math.max(0,1-nearLily/(unit*2))*.6};
  }).sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
  for(const spacing of [.65,.42,0]){for(const p of candidates){if(chosen.includes(p))continue;if(chosen.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>unit*spacing))chosen.push(p);if(chosen.length>=o.buds)break;}if(chosen.length>=o.buds)break;}
  chosen.forEach((p,i)=>{
   out.push({uid:'bud-option-'+i,url:'assets/client/celebration/lily-bud.png',x:p.x,y:p.y,w:p.w,h:p.h,d:p.w,rot:p.angle,bright:1,z:Math.max(...sc.nodes.map(n=>n.z??n.y))+5,softDetail:true,infill:true,infillKind:'bud',base:p.base,crown:p.crown,occlude:p.occlude});
  });
 }
 return out;
}
const alpha=new Map();
function hit(sc,p){
 for(const n of [...(sc.layeredFlowers||[])].reverse()){
  if(!allowed.test(n.uid)&&!allowed.test(n.parentFiller||''))continue;
  const dx=p.x-n.x,dy=p.y-n.y,c=Math.cos(n.rot||0),sn=Math.sin(n.rot||0),x=(dx*c+dy*sn)/n.w+.5,y=(-dx*sn+dy*c)/n.h+.5;
  if(x<0||x>1||y<0||y>1)continue;
  let sample=alpha.get(n.url);if(!sample){const im=NebulaRenderer.decoded(n.url);if(!im)continue;const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,128,128);sample=ctx.getImageData(0,0,128,128).data;alpha.set(n.url,sample);}
  if((n.occlude||[]).some(id=>{const f=sc.nodes.find(f=>f.uid===id);return f&&NebulaInfill.alphaAt({...NebulaInfill.shape(f),mask:NebulaRenderer.footprint(f)},p)>.5;}))continue;
  if(sample[(Math.min(127,Math.floor(y*128))*128+Math.min(127,Math.floor(x*128)))*4+3]>80)return n.parentFiller?sc.layeredFlowers.find(p=>p.uid===n.parentFiller):n;
 }return null;
}
function move(s,id,before,dx,dy){
 if(!allowed.test(id))return;const previous=JSON.parse(before),sc=NebulaRenderer.scene(previous),n=sc.layeredFlowers.find(n=>n.uid===id);if(!n)return;
 const o=s.finishes.studio||(s.finishes.studio={v:1}),xs=sc.nodes.map(f=>f.x),ys=sc.nodes.map(f=>f.y),margin=sc.frame.unit*.55;
 const x=Math.max(Math.min(...xs)-margin,Math.min(Math.max(...xs)+margin,n.x+dx)),y=Math.max(Math.min(...ys)-margin,Math.min(Math.max(...ys)+margin,n.y+dy));
 o.placements={...o.placements,[id]:[x,y,n.rot]};
 // Retain legacy offsets so existing readers and undo remain compatible.
 const old=previous.finishes.studio?.positions?.[id]||[0,0];o.positions={...o.positions,[id]:[Math.max(-220,Math.min(220,Math.round(old[0]+dx))),Math.max(-220,Math.min(220,Math.round(old[1]+dy)))]};
}
function settle(s,id){const sc=NebulaRenderer.scene(s),n=sc.layeredFlowers.find(n=>n.uid===id);if(!n?.crown)return;
 const p=[...NebulaInfill.pockets(sc).points].sort((a,b)=>Math.hypot(a.x-n.crown.x,a.y-n.crown.y)-Math.hypot(b.x-n.crown.x,b.y-n.crown.y))[0];
 if(p&&Math.hypot(p.x-n.crown.x,p.y-n.crown.y)<sc.frame.unit*.3){const a=s.finishes.studio.placements[id];a[0]+=p.x-n.crown.x;a[1]+=p.y-n.crown.y;}
}
function select(id){selected=id;const box=document.getElementById('fillerSelection');if(box)box.hidden=!id;}
function editSelected(action){const s=NebulaApp.state,sc=NebulaRenderer.scene(s),n=sc.layeredFlowers.find(n=>n.uid===selected);if(!n)return;const o=s.finishes.studio||(s.finishes.studio={v:1});
 if(action==='reset'){delete o.placements?.[selected];delete o.positions?.[selected];}
 else if(action==='remove'){
  const prefix=selected.startsWith('greenery-')?'greenery-':selected.startsWith('spray-accent-')?'spray-accent-':'air-';
  const siblings=sc.layeredFlowers.filter(a=>a.uid.startsWith(prefix)&&a.uid!==selected);
  const placements={...o.placements};for(const key of Object.keys(placements))if(key.startsWith(prefix))delete placements[key];
  for(const key of Object.keys(o.positions||{}))if(key.startsWith(prefix))delete o.positions[key];
  siblings.forEach((a,i)=>placements[prefix+i]=[a.x,a.y,a.rot]);o.placements=placements;
  if(prefix==='greenery-')s.finishes.greeneryCount=Math.max(0,s.finishes.greeneryCount-1);else if(prefix==='spray-accent-')o.sprays=Math.max(0,(o.sprays||0)-1);else{o.breathStems=siblings.length;if(!siblings.length)o.breath=0;}
  select(null);
 }else{o.placements={...o.placements,[selected]:[n.x,n.y,Math.atan2(Math.sin(n.rot+action),Math.cos(n.rot+action))]};}
 NebulaApp.setState(s);
}

const densities={greenery:[0,3,7,12]};
function densityControls(host,key){
 const group=document.createElement('div');group.id=key+'Density';group.className='custom-segments';
 group.setAttribute('role','group');
 densities[key].forEach((count,i)=>{const button=document.createElement('button');button.type='button';button.dataset.level=i;
 button.onclick=()=>{const s=NebulaApp.state;if(key==='greenery')s.finishes.greeneryCount=count;else(s.finishes.studio||(s.finishes.studio={v:1})).buds=count;NebulaApp.setState(s);};group.append(button);});host.append(group);
}
function buildControls(host){
 const row=document.createElement('div');row.className='toggle-row';row.innerHTML='<span id="budOptionLabel"></span><span class="stepper"><button type="button" id="budLess">−</button><output id="budOptionCount"></output><button type="button" id="budMore">+</button></span>';host.append(row);
 for(const [id,delta]of [['budLess',-1],['budMore',1]])document.getElementById(id).onclick=()=>{const s=NebulaApp.state,o=s.finishes.studio||(s.finishes.studio={v:1});o.buds=Math.max(0,Math.min(10,(o.buds||0)+delta));NebulaApp.setState(s);};
 const reset=document.createElement('button');reset.id='resetFillerPositions';reset.type='button';reset.className='text-button';reset.onclick=()=>{const s=NebulaApp.state;if(s.finishes.studio){delete s.finishes.studio.positions;delete s.finishes.studio.placements;}select(null);NebulaApp.setState(s);};host.append(reset);
 const box=document.createElement('div');box.id='fillerSelection';box.className='custom-segments';box.hidden=true;
 for(const [action,en,es] of [[-.26,'Rotate left','Girar izquierda'],[.26,'Rotate right','Girar derecha'],['remove','Remove sprig','Quitar rama'],['reset','Auto position','Posición automática']]){const b=document.createElement('button');b.type='button';b.dataset.en=en;b.dataset.es=es;b.textContent=en;b.onclick=()=>editSelected(action);box.append(b);}host.append(box);
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
 $('budLess').setAttribute('aria-label',es?'Menos capullos':'Fewer lily buds');$('budMore').setAttribute('aria-label',es?'Más capullos':'More lily buds');
 if(selected&&!NebulaRenderer.scene(s).layeredFlowers.some(n=>n.uid===selected))selected=null;
 $('fillerSelection').hidden=!selected;for(const b of $('fillerSelection').children)b.textContent=es?b.dataset.es:b.dataset.en;
 $('fillerDragHint').textContent=es?'Arrastra el eucalipto y las ramas blancas entre las flores. Los capullos se colocan automáticamente.':'Drag a leafy or flowering sprig to adjust it. Tap to rotate or remove it. Lily buds arrange automatically.';
 $('resetFillerPositions').textContent=es?'Restablecer posiciones del relleno':'Reset filler positions';$('resetFillerPositions').disabled=!ready||!Object.keys(s.finishes.studio?.positions||{}).length&&!Object.keys(s.finishes.studio?.placements||{}).length;
}
document.addEventListener('DOMContentLoaded',()=>{NebulaI18n.en.lily_bud='Closed lily buds';NebulaI18n.es.lily_bud='Capullos de lirio';});
g.NebulaFillerOptions={validPositions,validPlacements,compose,hit,move,settle,select,editSelected,buildControls,renderControls};
})(window);
