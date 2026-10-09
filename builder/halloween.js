/* Halloween catalogue adapter. Geometry is measured in rose-head diameters. */
(function(g){'use strict';
const H=g.NebulaHalloween,meta=g.NEBULA_META,{CAT,CONFIG}=g.NebulaConfig,root='assets/halloween/';
const artwork={'rose-black-a':[661,613],'rose-black-b':[670,601],'black-bow-tails':[422,1019],'pink-dark-daisy':[638,647],'blue-thistle':[531,550],'black-fan-wrap':[754,1042],'scream-mask':[520,1104]};
for(const [name,[width,height]] of Object.entries(artwork)){const url=root+name+'.webp';meta.crops[url]=[0,0,width,height];meta.finishes[name]={url,width,height};}
meta.finishes.ghost_decal={url:root+'ghost-decal.svg',width:100,height:110};
meta.finishes.sash_blank_halloween=meta.finishes.sash_blank_blackband;
for(const [id,en,es,art,price,family] of [['rose_black','Black rose','Rosa negra','rose-black-a',400,'rose'],['pink_daisy','Dusky pink gerbera','Gerbera rosa oscuro','pink-dark-daisy',400,'accents']]){
 const m=meta.finishes[art];CAT[id]={en,es,family,kind:'flower',priceCents:price,classic:false,classicOffered:false,top:true,classicDiameter:100,topDiameter:100};
 const custom=g.NEBULA_SHOP?.flowerPrices?.[id];if(Number.isInteger(custom)&&custom>=0&&custom<=1e8)CAT[id].priceCents=custom;
 meta.flowers[id]={head:m.url,heads:id==='rose_black'?[root+'rose-black-a.webp',root+'rose-black-b.webp']:[m.url],headWidth:m.width,headHeight:m.height,headRadius:.5,headView:'overhead',classicAvailable:false};
}
const extraKeys={spookyMask:2000,spookyBow:400,ghostCount:100,thistleCount:250};
for(const [key,value] of Object.entries(extraKeys)){const custom=g.NEBULA_SHOP?.extrasCents?.[key];CONFIG.extrasCents[key]=Number.isInteger(custom)&&custom>=0&&custom<=1e8?custom:value;}
const recipes=[
 {id:'scream-for-you',en:'Scream for You',es:'Un grito por ti',description:'Thirty red roses frame a ghostly face, with white filler and black satin.',descriptionEs:'Treinta rosas rojas rodean una máscara, con paniculata y satén negro.',count:30},
 {id:'forever-my-boo',en:'Forever My Boo',es:'Mi fantasma para siempre',description:'Twenty-two red roses, twenty-two black roses, and a message of your own.',descriptionEs:'Veintidós rosas rojas, veintidós negras y tu propio mensaje.',count:44},
 {id:'midnight-blooms',en:'Midnight Blooms',es:'Flores de medianoche',description:'Pink lilies and dusky daisies among black roses, burgundy mums and blue thistles.',descriptionEs:'Lirios y gerberas rosas entre rosas negras, crisantemos burdeos y cardos azules.',count:20}
];
const active=s=>s?.mode==='dome'&&s.template?.layout==='halloween';
const cache=new Map();
function plan(s){const key=s.template.halloweenRecipe+':'+s.seed+':'+(s.finishes?.spookyMask!==false);if(!cache.has(key)){cache.set(key,H.build(s.template.halloweenRecipe,{seed:s.seed,mask:s.finishes?.spookyMask!==false}));if(cache.size>80)cache.delete(cache.keys().next().value);}return cache.get(key);}
function diameter(id){return H.diameters[id]||g.NebulaFall.ratio(id);}
const catalogue=Object.keys(CAT).filter(id=>CAT[id].kind==='flower'&&CAT[id].top!==false&&meta.flowers[id]?.head);
const papers=['black','ivory','blush','sage','custom','cocoa'];
function allowed(s,slot,id){if(id===null)return true;const p=plan(s).flowers[slot];return !!p&&catalogue.includes(id)&&diameter(id)<=p.d+.001;}
function recolorRoses(s,id){
 if(!active(s)||!catalogue.includes(id)||CAT[id].family!=='rose')return {ok:false,reason:'invalid'};
 const roses=s.items.filter(it=>CAT[it.id].family==='rose');
 for(const it of roses)s.template.overrides[it.slot]=id;
 g.NebulaModel.syncTemplate(s);return {ok:true,count:roses.length};
}
function validTemplate(t){const r=recipes.find(r=>r.id===t.halloweenRecipe);if(!r||r.count!==t.capacity)return false;const s={seed:11,template:t};return Array.from({length:t.capacity},(_,i)=>Object.hasOwn(t.overrides||{},i)&&allowed(s,i,t.overrides[i])).every(Boolean);}
function layout(s){const p=plan(s),unit=68,points=p.flowers.map((n,slot)=>({...n,slot,x:n.x*unit,y:n.y*unit,d:diameter(s.items.find(i=>i.slot===slot)?.id||n.id)*unit*(p.petalEnvelope||H.petalEnvelope),near:unit*.85,r:Math.hypot(n.x,n.y)*unit}));return {frame:{mode:'dome',center:{x:360,y:390},radius:3.35*unit,unit,engine:'halloween-v1'},points};}
function nodes(s){
 const L=layout(s),f=L.frame,midnight=s.template.halloweenRecipe==='midnight-blooms';
 const nodes=s.items.map(it=>{
  const p=L.points[it.slot],m=meta.flowers[it.id],urls=m.romanceHeads||m.heads||[m.head];
  // Reuse the existing three-quarter photograph, preserving its source ratio.
  // Rotation varies the arrangement; it does not synthesize a new camera angle.
  const angled=midnight&&it.id==='lily';
  const url=angled?m.classicBloom:urls[it.slot%urls.length],crop=meta.crops[url];
  const mw=crop?.[2]||(angled?m.bloomWidth:m.headWidth),mh=crop?.[3]||(angled?m.bloomHeight:m.headHeight),k=p.d/Math.max(mw,mh);
  return {uid:it.uid,id:it.id,slot:it.slot,x:360+p.x,y:390+p.y,w:mw*k,h:mh*k,d:p.d,rot:p.rotation,bright:1,url,meta:m,z:midnight?p.layer:p.d};
 }).sort((a,b)=>a.z-b.z||a.y-b.y);
 return {frame:f,nodes,slots:L.points.map(p=>({...p,x:360+p.x,y:390+p.y,uid:s.items.find(i=>i.slot===p.slot)?.uid||null}))};
}
function artNode(id,n,f){const m=meta.finishes[id],k=Math.min(n.w*f.unit/m.width,n.h*f.unit/m.height);return {uid:n.uid||id,url:m.url,x:360+n.x*f.unit,y:390+n.y*f.unit,w:m.width*k,h:m.height*k,d:Math.max(m.width,m.height)*k,rot:n.rotation||0,bright:1,z:n.layer||35,back:n.layer===10};}
function collar(s,f){if(!s.finishes.collar)return null;if(s.finishes.paper==='cocoa'){const m=meta.collars.domeCocoa,w=9*f.unit;return {uid:'paper',url:m.url,x:360,y:390,w,h:w,rot:0,d:w,bright:1};}if(s.template.halloweenRecipe==='midnight-blooms')return artNode('black-fan-wrap',plan(s).paper,f);const m=meta.collars.dome,w=9*f.unit;return {uid:'paper',url:m.url,x:360,y:390,w,h:w*m.height/m.width*(s.template.halloweenRecipe==='scream-for-you'?1.1:1),d:w,rot:0,bright:1};}
function finishes(s,f){
 if(s.mode!=='dome')return [];
 const out=[],p=active(s)?plan(s):null,unit=active(s)?f.unit:f.radius/3.35,frame={...f,unit};
 const prop=(id,fallback)=>p?.props.find(n=>n.id===id)||fallback;
 if(s.finishes.spookyMask)out.push(artNode('scream-mask',prop('scream_mask',{x:0,y:.10,w:4.75*520/1104,h:4.75,layer:40}),frame));
 if(s.finishes.spookyBow)out.push(artNode('black-bow-tails',prop('black_bow_tails',{x:-2.28,y:-.80,w:1.1,h:2.8,layer:50}),frame));
 const decals=p?.props.filter(n=>n.id==='ghost_decal');
 const spots=decals?.length?decals:H.ellipseRing(6,3.96,3.96,-Math.PI/2).map((n,i)=>({...n,uid:'ghost-'+i,w:.64,h:.70,rotation:(i%2?1:-1)*.18,layer:10}));
 for(const n of spots.slice(0,s.finishes.ghostCount))out.push(artNode('ghost_decal',n,frame));
 return out;
}
function filler(s,f,flowers){
 if(s.mode!=='dome')return [];
 const scream=active(s)&&s.template.halloweenRecipe==='scream-for-you';
 const out=scream?H.ellipseRing(s.finishes.fillerCount,2.83,3.47,-1.4).map((n,i)=>artNode(i%2?'breath-wide':'breath-airy',{...n,uid:'filler-'+i,w:.9,h:.9,rotation:i*1.2},f)):g.NebulaDetails.filler(s,f,flowers);
 const midnight=active(s)&&s.template.halloweenRecipe==='midnight-blooms';
 const points=midnight?plan(s).filler:[[-1.85,-1.3],[1.9,.35],[-.5,2.05]].map(([x,y],i)=>({uid:'thistle-'+i,x,y,d:.6}));
 const frame=active(s)?f:{...f,unit:f.radius/3.35};
 return out.concat(points.slice(0,s.finishes.thistleCount).map(n=>artNode('blue-thistle',{...n,w:n.d,h:n.d},frame)));
}
function extras(s){if(s.mode!=='dome')return [];return Object.keys(extraKeys).filter(k=>s.finishes[k]).map(id=>({id,quantity:Number(s.finishes[id]),totalCents:Number(s.finishes[id])*CONFIG.extrasCents[id]}));}
function validFinishes(s){const f=s.finishes;if(s.mode!=='dome')return !Object.keys(extraKeys).some(k=>f[k]);return (!active(s)||papers.includes(f.paper))&&(!f.ghostCount||f.collar);}
function create(id){const recipe=recipes.find(r=>r.id===id);if(!recipe)throw Error('Unknown Halloween recipe');const M=g.NebulaModel,s=M.defaultMode('dome'),p=H.build(id);M.resize(s,recipe.count);Object.assign(s.template,{layout:'halloween',halloweenRecipe:id,palette:['rose_red'],overrides:Object.fromEntries(p.flowers.map((n,i)=>[i,n.id]))});s.template.accent.count=0;
 Object.assign(s.finishes,{paper:'black',sash:id==='forever-my-boo'?'blank_blackband':'none',sashText:id==='forever-my-boo'?'FOREVER MY BOO':'',spookyMask:id==='scream-for-you',spookyBow:id==='scream-for-you',ghostCount:id==='forever-my-boo'?6:0,thistleCount:id==='midnight-blooms'?3:0,fillerCount:id==='scream-for-you'?6:0});s.title=recipe.en;M.syncTemplate(s);return s;}
const assets=Object.keys(artwork).map(n=>root+n+'.webp').concat(root+'ghost-decal.svg');
function assetsFor(s){const f=s.finishes,urls=[];for(const [key,art] of [['spookyMask','scream-mask'],['spookyBow','black-bow-tails'],['ghostCount','ghost_decal'],['thistleCount','blue-thistle']])if(f[key])urls.push(meta.finishes[art].url);return urls;}
const assetsReady=location.protocol==='file:'?new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='halloween-embedded.js';el.onload=resolve;el.onerror=reject;document.head.append(el);}):Promise.resolve();
g.NebulaSpooky={active,recipes,create,plan,layout,nodes,collar,finishes,filler,extras,allowed,catalogue,papers,recolorRoses,validTemplate,validFinishes,assets,assetsFor,assetsReady};
})(window);
