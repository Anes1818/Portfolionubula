/* Classic recipes reuse supplied flower photographs. Head-only flowers are
   tucked into the wrap; no invented stem artwork is added. */
(function(g){'use strict';
const {CAT}=g.NebulaConfig,meta=g.NEBULA_META;
const thistle=meta.finishes['blue-thistle'];
CAT.blue_thistle={en:'Blue thistle',es:'Cardo azul',family:'texture',kind:'texture',priceCents:g.NebulaConfig.CONFIG.extrasCents.thistleCount,classicDiameter:72,topDiameter:64,classic:true};
meta.flowers.blue_thistle={head:thistle.url,headWidth:thistle.width,headHeight:thistle.height,headRadius:.5};
for(const id of ['rose_black','pink_daisy','mum_burgundy','blue_thistle']){
 const m=meta.flowers[id];
 Object.assign(CAT[id],{classic:true,classicOffered:true});
 Object.assign(m,{classicAvailable:true,classicBloom:m.head,classicBlooms:m.heads||[m.head],classicStem:null,bloomWidth:m.headWidth,bloomHeight:m.headHeight,bloomCenter:[m.headWidth/2,m.headHeight/2],stemBase:[m.headWidth/2,m.headHeight]});
}
const recipes=[
 {id:'midnight-blooms',en:'Midnight Blooms',es:'Flores de medianoche',description:'The original lush mix: five pink lilies, black roses, dusky daisies and blue thistles in a black fan wrap.',descriptionEs:'Cinco lirios rosas, rosas negras, gerberas oscuras y cardos azules en una envoltura negra.',count:23,preview:true}
];
const engines=['classic-gathered'];
const shapes=new Map();
function shapeFor(kind,radius){const key=kind+radius;if(!shapes.has(key))shapes.set(key,g.DomeEngine.buildShape(kind,radius,120));return shapes.get(key);}
const active=s=>s?.mode==='classic'&&engines.includes(s.frames?.classic?.engine);
function frame(engine='classic-gathered'){
 return {mode:'classic',engine,center:{x:360,y:390},radius:230,unit:68,scale:1,origin:{x:54,y:0},waist:{x:360,y:730},rimY:560};
}
function diameter(id,engine){
 return 68*1.6*(id==='blue_thistle'?.6:CAT[id].kind==='texture'?1.05:g.NebulaHalloween.diameters[id]||CAT[id].topDiameter/88);
}
function constrain(p,f,id){
 const margin=diameter(id,f.engine)*.48;
 let x=Math.max(52+margin,Math.min(668-margin,p.x)),y=Math.max(88+margin,Math.min(610,p.y));
 return {x,y,manual:!!p.manual};
}
function arrange(items,seed,paper,engine='classic-gathered'){
 const f=frame(engine),positions={},main=items.filter(i=>CAT[i.id].kind!=='texture'),tex=items.filter(i=>CAT[i.id].kind==='texture');
 {
  const placed=[],rand=g.NebulaGeometry.rng(seed),radius=Math.min(232,Math.max(30,Math.sqrt(main.reduce((sum,it)=>sum+diameter(it.id,engine)**2,0))*.32)),candidates=[];
  for(let i=0;i<1400;i++){const a=i*2.39996323+(seed-11)*.371,r=Math.sqrt((i+.5)/1400);candidates.push({x:360+Math.cos(a)*radius*r,y:375+Math.sin(a)*radius*.94*r});}
  const ordered=main.slice().sort((a,b)=>diameter(b.id,engine)-diameter(a.id,engine));
  ordered.forEach((it,i)=>{
   const d=diameter(it.id,engine);let best=null,score=-Infinity;
   for(const p of candidates){const near=placed.length?Math.min(...placed.map(q=>Math.hypot(p.x-q.x,p.y-q.y)/((d+q.d)/2))):1;
    const target=i===0?(main.length<16?{x:360,y:375}:{x:320,y:335}):i===1?{x:440,y:400}:{x:360,y:380};
    const value=near-Math.hypot(p.x-target.x,p.y-target.y)/(i<2?180:2400);if(value>score){score=value;best=p;}}
   const p=constrain({...best,manual:false},f,it.id);positions[it.uid]=p;placed.push({...p,d});candidates.splice(candidates.indexOf(best),1);
  });
  tex.forEach((it,i)=>{const a=-Math.PI+(i+.5)/Math.max(tex.length,1)*Math.PI;positions[it.uid]=constrain({x:360+Math.cos(a)*(radius+8),y:380+Math.sin(a)*(radius+5)+(rand()-.5)*16,manual:false},f,it.id);});
 }
 tex.forEach((it,i)=>{if(!positions[it.uid]){const a=i/Math.max(1,tex.length)*Math.PI*2;positions[it.uid]=constrain({x:360+Math.cos(a)*230,y:340+Math.sin(a)*210,manual:false},f,it.id);}});
 return {frame:f,positions};
}
function paper(s){
 const m=meta.finishes['black-fan-wrap'],flowers=nodes(s).nodes.filter(n=>!n.decorative&&CAT[n.id].kind!=='texture');
 const span=flowers.length?Math.max(...flowers.map(n=>n.x+n.w*.5))-Math.min(...flowers.map(n=>n.x-n.w*.5)):220;
 const w=Math.min(612,Math.max(330,span+80));
 // The neck stays at the same height while the fan fits smaller bouquets.
 return {uid:'paper',url:m.url,x:360,y:730-(730-417)*w/612,w,h:w*m.height/m.width,d:w,rot:0,bright:1};
}
function rim(s){
 if(!s.finishes.greenRim)return [];
 const shape=shapeFor('round',260),n=28;
 return Array.from({length:n},(_,i)=>{const p=shape.outlineAt((i+.5)/n*shape.perimeter),m=meta.finishes['eucalyptus-sparse-'+(i%2?'b':'a')],w=100;
  return {uid:'green'+i,id:'eucalyptus',decorative:true,meta:meta.flowers.eucalyptus,url:m.url,x:360+p.x,y:380+p.y,w,h:w*m.height/m.width,d:w,rot:Math.atan2(p.ny,p.nx)+.45,bright:1,z:-1000};});
}
function nodes(s){
 const f=s.frames.classic,ns=s.items.map(it=>{
  const a=it.anchors.classic,m=meta.flowers[it.id],angled=it.id==='lily',urls=m.heads||[m.head],url=angled?m.classicBloom:urls[(Number(it.uid.slice(1))-1)%urls.length],crop=meta.crops[url],w0=crop?.[2]||(angled?m.bloomWidth:m.headWidth),h0=crop?.[3]||(angled?m.bloomHeight:m.headHeight),d=diameter(it.id,f.engine),k=d/Math.max(w0,h0);
  return {uid:it.uid,id:it.id,x:a.x,y:a.y,w:w0*k,h:h0*k,d,rot:angled?(a.x-360)/420:Math.sin(Number(it.uid.slice(1))*2.399)*.14,bright:1,url,meta:m,z:it.id==='blue_thistle'?620:CAT[it.id].kind==='texture'?a.y-100:a.y+(angled?95:0),manual:a.manual};
 }).sort((a,b)=>a.z-b.z);
 return {frame:f,nodes:[...rim(s),...ns],slots:[]};
}
function findPlace(s,id,p,ignoreUid){
 const f=s.frames.classic,ns=nodes(s).nodes.filter(n=>!n.decorative&&n.uid!==ignoreUid),d=diameter(id,f.engine);
 const valid=q=>{const safe=constrain(q,f,id);return Math.hypot(safe.x-q.x,safe.y-q.y)<.01&&ns.every(n=>Math.hypot(q.x-n.x,q.y-n.y)>Math.min(d,n.d)*.40);};
 if(p&&valid(p))return {...p,manual:true,snapped:false};
 let best=null,score=Infinity;for(let y=125;y<600;y+=8)for(let x=100;x<630;x+=8){const q={x,y};if(!valid(q))continue;const near=ns.length?Math.min(...ns.map(n=>Math.hypot(x-n.x,y-n.y))):0,v=p?Math.hypot(x-p.x,y-p.y):Math.abs(near-d*.65)+Math.hypot(x-360,y-f.center.y)*.12;if(v<score){score=v;best={...q,manual:true,snapped:!!p};}}
 return p&&score>95?null:best;
}
function create(id){
 const r=recipes.find(r=>r.id===id);if(!r)throw Error('Unknown Classic recipe');
 const M=g.NebulaModel,s=M.empty();s.title=r.en;
 s.finishes.paper='black';s.frames.classic=frame();
 const plan=g.NebulaHalloween.build('midnight-blooms');
 s.items=[...plan.flowers,...plan.filler].map(n=>{const it=M.newItem(s,n.id);it.anchors.classic={x:360+n.x*68,y:390+n.y*68,manual:false};return it;});return s;
}
g.NebulaClassic={recipes,create,active,engines,frame,arrange,nodes,constrain,findPlace,paper,rim};
})(window);
