/* Autumn artwork and deterministic mixed-size layout. Source PNGs stay untouched.
   Crop rectangles remove transparent padding only at draw time. */
(function(g){'use strict';
const root='assets/fall/',meta=g.NEBULA_META;
const crops={
 'rose-ivory-a.webp':[183,56,1076,993], 'rose-ivory-b.webp':[135,57,1106,1036],
 'orange-flower.webp':[374,51,660,664], 'brown-bow.webp':[62,64,1289,616],
 'brown-ribbon.webp':[0,258,1408,258], 'pumpkin.webp':[387,96,634,576]
};
meta.crops=Object.fromEntries(Object.entries(crops).map(([k,v])=>[root+k,v]));
meta.flowers.rose_ivory={head:root+'rose-ivory-a.webp',heads:[root+'rose-ivory-a.webp',root+'rose-ivory-b.webp'],headWidth:1076,headHeight:993,headRadius:.5,headView:'overhead',classicAvailable:false};
meta.flowers.mum_rust={head:root+'orange-flower.webp',headWidth:660,headHeight:664,headRadius:.5,headView:'overhead',classicAvailable:false};
meta.collars.domeCocoa={url:root+'wrap-cocoa.webp',width:1254,height:1254};
meta.finishes.sash_blank_cocoa={url:root+'brown-ribbon.webp',width:1408,height:258};
meta.finishes.bow_cocoa={url:root+'brown-bow.webp',width:1289,height:616};
meta.finishes.plush_pumpkin={url:root+'pumpkin.webp',width:634,height:576};
const cache=new Map();
const active=s=>s.mode==='dome'&&s.template?.layout==='organic';
function ratio(id){return ({sunflower:1.85,gerbera_daisy:1.5,lily:1.8,hydrangea:1.65,mum_burgundy:1.1,mum_rust:1.1,chrysanthemum_yellow:1.05})[id]||1;}
function layout(s){
 const n=s.template.capacity,ids=NebulaTemplates.recipe('dome',s.template,s.seed).map((id,i)=>Object.hasOwn(s.template.overrides,i)?s.template.overrides[i]:id);
 const key=JSON.stringify([s.seed,n,ids]);if(cache.has(key))return cache.get(key);
 const base=NebulaTemplates.layout('dome',n),sizes=ids.map(id=>ratio(id)),area=sizes.reduce((a,r)=>a+r*r,0)/n;
 // Normalize the whole composition into the persisted world bounds, preserving
 // every species ratio. This is a uniform view scale, not per-flower capping.
 const normalization=Math.min(1,300/(base.frame.radius*Math.sqrt(area)));
 const R=base.frame.radius*Math.sqrt(area)*normalization,diameter=base.frame.unit*1.06*normalization;
 const points=base.points.map((p,i)=>({...p,x:p.x*Math.sqrt(area)*normalization,y:p.y*Math.sqrt(area)*normalization,d:diameter*sizes[i]}));
 const home=points.map(p=>({x:p.x,y:p.y}));
 // Repel solid centres, allowing the outer petals to overlap. Never delete a stem
 // or shrink a sunflower to make it fit. Bigger mixes grow the arrangement.
 for(let pass=0;pass<100;pass++){
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
   const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;
   const gap=Math.max((a.d+b.d)*.285,Math.max(a.d,b.d)*.48+Math.min(a.d,b.d)*.12);
   if(d<gap){const force=(gap-d)*.3;a.x-=dx/d*force;a.y-=dy/d*force;b.x+=dx/d*force;b.y+=dy/d*force;}
  }
  for(let i=0;i<n;i++){const p=points[i];p.x+=(home[i].x-p.x)*.015;p.y+=(home[i].y-p.y)*.015;const dist=Math.hypot(p.x,p.y),limit=R-(p.d-diameter)*.24;if(dist>limit){p.x*=limit/dist;p.y*=limit/dist;}}
 }
 for(const p of points){p.near=n>1?Math.min(...points.filter(q=>q!==p).map(q=>Math.hypot(q.x-p.x,q.y-p.y))):p.d;p.r=Math.hypot(p.x,p.y);}
 const frame={...base.frame,radius:R,unit:diameter,engine:'fall-mixed-size-v1'};
 const result={frame,points};cache.set(key,result);if(cache.size>120)cache.delete(cache.keys().next().value);return result;
}
function nodes(s){
 const L=layout(s),f=L.frame;
 const ns=s.items.map((it,i)=>{const p=L.points[it.slot],m=meta.flowers[it.id],urls=m.heads||[m.head],url=urls[it.slot%urls.length],crop=meta.crops[url];
  const mw=crop?.[2]||m.headWidth,mh=crop?.[3]||m.headHeight,scale=p.d/Math.max(mw,mh);
  return {uid:it.uid,id:it.id,slot:it.slot,x:360+p.x,y:390+p.y,w:mw*scale,h:mh*scale,d:p.d,rot:Math.sin(it.slot*2.399+s.seed)*.14,bright:1,meta:m,url,z:p.d,index:i};
 }).sort((a,b)=>a.z-b.z||b.y-a.y);
 return {frame:f,nodes:ns,slots:L.points.map(p=>({...p,x:360+p.x,y:390+p.y,uid:s.items.find(it=>it.slot===p.slot)?.uid||null}))};
}
function nearest(s,p){const L=layout(s);let best=null,dist=Infinity;for(const q of L.points){const d=Math.hypot(p.x-360-q.x,p.y-390-q.y);if(d<dist&&d<q.d*.65){dist=d;best=q.slot;}}return best;}
const recipes=[
 {id:'autumn-latte',en:'Autumn Latte',es:'Latte de otoño',description:'Caramel roses, burgundy petals and a little Snoopy.',descriptionEs:'Rosas caramelo, pétalos burdeos y un pequeño Snoopy.',count:30},
 {id:'october-cream',en:'October Cream',es:'Crema de octubre',description:'Ivory roses, an autumn border, a little pumpkin.',descriptionEs:'Rosas marfil, un borde otoñal y una calabaza.',count:44},
 {id:'pumpkin-patch',en:'Pumpkin Patch',es:'Jardín de calabazas',description:'Rust petals and cream roses, gathered together.',descriptionEs:'Pétalos cobrizos y rosas crema, juntos.',count:30},
 {id:'harvest-sunshine',en:'Harvest Sunshine',es:'Sol de otoño',description:'Four generous sunflowers with warm autumn blooms.',descriptionEs:'Cuatro girasoles grandes con flores de otoño.',count:30}
];
function create(id){
 const r=recipes.find(r=>r.id===id)||recipes[0],M=g.NebulaModel,s=M.defaultMode('dome');M.resize(s,r.count);
 s.template.layout='organic';s.template.palette=['rose_ivory'];s.template.accent={id:'mum_rust',count:r.id==='october-cream'?20:14,pattern:r.id==='october-cream'?'border':'scatter',angle:0};s.template.overrides={};
 if(r.id==='october-cream'){
  s.template.accent.count=0;
  for(const p of NebulaTemplates.layout('dome',r.count).points.slice().sort((a,b)=>b.r-a.r).slice(0,20))s.template.overrides[p.slot]='mum_rust';
 }
 if(r.id==='harvest-sunshine'){
  const L=NebulaTemplates.layout('dome',r.count),used=new Set();
  for(const [x,y] of [[-.55,-.5],[.55,-.5],[-.55,.5],[.55,.5]]){const p=L.points.filter(p=>!used.has(p.slot)).sort((a,b)=>(a.x/L.frame.radius-x)**2+(a.y/L.frame.radius-y)**2-((b.x/L.frame.radius-x)**2+(b.y/L.frame.radius-y)**2))[0];used.add(p.slot);s.template.overrides[p.slot]='sunflower';}
 }
 Object.assign(s.finishes,{paper:'cocoa',sash:'blank_cocoa',sashText:'Still falling for you',bow:true,pumpkin:r.id!=='harvest-sunshine',pumpkinPosition:'right',pumpkinScale:1,sashPlacement:'auto'});
 if(r.id==='autumn-latte'){
  s.template.palette=['rose_ivory','rose_caramel'];s.template.accent={id:'mum_burgundy',count:8,pattern:'scatter',angle:0};
  Object.assign(s.finishes,{pumpkin:false,fillerCount:6,decorations:[NebulaDetails.create('snoopy')],sashText:'I love you a latte'});
 }
 s.title=r.en;M.syncTemplate(s);return s;
}
// File URLs taint canvas image reads in some browsers. Only local-file sessions
// load the embedded fallback; HTTP visitors download individual WebP assets.
const assetsReady=location.protocol==='file:'?new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='fall-embedded.js';script.onload=resolve;script.onerror=()=>reject(new Error('Autumn artwork bundle unavailable'));document.head.append(script);}):Promise.resolve();
g.NebulaFall={active,layout,nodes,nearest,ratio,recipes,create,assetsReady};
})(window);
