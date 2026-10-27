/* Deterministic Halloween layouts; live artwork adapter: halloween.js. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NebulaHalloween=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
 const TAU=Math.PI*2,petalEnvelope=1.35;
 const recipes=[
  {id:'scream-for-you',name:'Scream for You',shape:'oval-annulus',flowers:{rose_red:30},details:{babys_breath:6,scream_mask:1,black_bow_tails:1,black_round_collar:1},assets:['scream-mask','black-bow-tails','black-round-collar']},
  {id:'forever-my-boo',name:'Forever My Boo',shape:'round-mixed',flowers:{rose_red:22,rose_black:22},details:{ghost_decal:6,black_sash:1,black_round_collar:1},assets:['rose-black-a','rose-black-b','black-round-collar']},
  {id:'midnight-blooms',name:'Midnight Blooms',shape:'tall-mixed',flowers:{lily:5,pink_daisy:3,rose_black:8,mum_burgundy:4},details:{blue_thistle:3,black_fan_wrap:1},assets:['rose-black-a','rose-black-b','pink-dark-daisy','blue-thistle','black-fan-wrap']}
 ];
 const assets={
  'rose-black-a':{file:'rose-black-a.png',role:'flower',recipe:['forever-my-boo','midnight-blooms']},
  'rose-black-b':{file:'rose-black-b.png',role:'flower',recipe:['forever-my-boo','midnight-blooms']},
  'scream-mask':{file:'scream-mask.png',role:'central prop',recipe:['scream-for-you']},
  'black-bow-tails':{file:'black-bow-tails.png',role:'ribbon',recipe:['scream-for-you']},
  'black-round-collar':{file:'../wrapping/dome-black.webp',role:'existing paper',recipe:['scream-for-you','forever-my-boo']},
  'pink-dark-daisy':{file:'pink-dark-daisy.png',role:'flower',recipe:['midnight-blooms']},
  'blue-thistle':{file:'blue-thistle.png',role:'filler',recipe:['midnight-blooms']},
  'black-fan-wrap':{file:'black-fan-wrap.png',role:'paper',recipe:['midnight-blooms']}
 };
 const diameters={rose_red:1,rose_black:1,lily:1.8,pink_daisy:1.45,mum_burgundy:1.05};
 const clone=x=>JSON.parse(JSON.stringify(x));
 function random(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
 function flower(id,x,y,index){return {uid:'flower-'+index,id,x,y,d:diameters[id],rotation:Math.sin(index*2.399)*.12,layer:30};}
 // Equal arc length avoids crowding the pointed ends of an ellipse.
 function ellipseRing(n,a,b,phase=0){
  const pts=[],arc=[0],samples=2048;
  for(let i=0;i<=samples;i++){const t=phase+i/samples*TAU,p={x:a*Math.cos(t),y:b*Math.sin(t)};pts.push(p);if(i)arc.push(arc[i-1]+Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y));}
  return Array.from({length:n},(_,i)=>{const target=i/n*arc[samples];let lo=0,hi=samples;while(lo<hi){const m=(lo+hi)>>1;if(arc[m]<target)lo=m+1;else hi=m;}return {...pts[lo]};});
 }
 function maskClearance(p,mask){
  const x=p.x-mask.x,y=p.y-mask.y;
  if((x/mask.rx)**2+(y/mask.ry)**2<=1)return -1;
  let best=Infinity;for(let k=0;k<720;k++){const a=k/720*TAU;best=Math.min(best,Math.hypot(x-mask.rx*Math.cos(a),y-mask.ry*Math.sin(a)));}return best;
 }
 function scream(seed){
  const mask={x:0,y:0,rx:1.05,ry:1.65},flowers=[];
  for(const [count,a,b,phase] of [[12,1.80,2.40,-Math.PI/2],[18,2.68,3.34,-Math.PI/2+.08]]){
   for(const p of ellipseRing(count,a,b,phase))flowers.push(flower('rose_red',p.x,p.y,flowers.length));
  }
  const filler=ellipseRing(6,2.83,3.47,-1.4).map((p,i)=>({uid:'filler-'+i,id:'babys_breath',...p,d:.90,layer:35}));
  return {flowers,filler,exclusions:[{kind:'ellipse',...mask}],props:[
   // Cover the opening with the natural portrait silhouette, overlapping inner petals.
   {id:'scream_mask',x:0,y:.10,w:4.75*520/1104,h:4.75,layer:40},
   {id:'black_bow_tails',x:-2.28,y:-.80,w:1.10,h:2.8,layer:50,text:'You make me scream',textAxis:'vertical'}
  ],paper:{id:'black_round_collar',x:0,y:0,w:9,h:10.03,layer:0}};
 }
 function round(seed){
  const flowers=[],rings=[[1,0],[7,1.00],[14,1.98],[22,2.99]];
  for(const [n,r] of rings)for(const p of ellipseRing(n,r,r,r===0?0:-Math.PI/2+r*.12))flowers.push(flower('rose_red',p.x,p.y,flowers.length));
  // Balance the total exactly AND each spatial sector, rather than alternating
  // an array whose consecutive indices do not represent adjacent flowers.
  const sectors=Array.from({length:8},()=>[]);
  for(const f of flowers)sectors[Math.floor((Math.atan2(f.y,f.x)+Math.PI)/TAU*8)%8].push(f);
  const rand=random(seed),quotas=sectors.map(g=>Math.floor(g.length/2));
  let remainder=22-quotas.reduce((a,b)=>a+b,0);
  const odd=sectors.map((g,i)=>({i,odd:g.length%2,rank:rand()})).filter(g=>g.odd).sort((a,b)=>a.rank-b.rank);
  for(const g of odd)if(remainder>0){quotas[g.i]++;remainder--;}
  sectors.forEach((group,k)=>{group.sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));const parity=rand()<.5?0:1,order=group.filter((_,i)=>i%2===parity).concat(group.filter((_,i)=>i%2!==parity));for(const f of order.slice(0,quotas[k]))f.id='rose_black';});
  const decals=ellipseRing(6,3.96,3.96,-Math.PI/2).map((p,i)=>({id:'ghost_decal',uid:'ghost-'+i,...p,w:.64,h:.70,rotation:(i%2?1:-1)*.18,layer:10}));
  return {flowers,filler:[],exclusions:[],props:[...decals,{id:'black_sash',x:0,y:.12,w:6.8,h:.85,layer:50,text:'FOREVER MY BOO'}],paper:{id:'black_round_collar',x:0,y:0,w:9,h:9.12,layer:0}};
 }
 function midnight(seed){
  const flowers=[],add=(id,x,y,rotation,layer=25)=>{const n=flower(id,x,y,flowers.length);if(rotation!==undefined)n.rotation=rotation;n.layer=layer;flowers.push(n);};
  // An asymmetric gathered canopy: side blooms turn outwards; the two low
  // focal flowers cross the rim. Depth belongs to each slot, not its species.
  for(const [x,y,rot,z] of [[-2.15,-1.1,-.38,28],[.05,-.2,.20,34],[2.05,-.75,.43,27],[-1.55,1.3,-.58,36],[.9,1.85,.30,38]])add('lily',x,y,rot,z);
  for(const [x,y,rot,z] of [[-.8,-2.55,-.24,24],[-2.35,2.55,.15,39],[2.45,1.5,-.40,32]])add('pink_daisy',x,y,rot,z);
  // Fill real gaps around the larger focal flowers without reducing lily size.
  const rand=random(seed),candidates=[];
  for(let i=0;i<2400;i++){
   const a=i*2.39996323+rand()*.02,r=Math.sqrt((i+.5)/2400);
   const x=Math.cos(a)*3.0*r,y=.15+Math.sin(a)*2.65*r;
   candidates.push({x,y});
  }
  const choose=(id,occupied,accept=()=>true)=>{
   const d=diameters[id]||.60;let best=null,score=-Infinity;
   for(const p of candidates){if(!accept(p))continue;const clearance=Math.min(...occupied.map(f=>Math.hypot(p.x-f.x,p.y-f.y)/((d+f.d)/2)));
    if(clearance>score){score=clearance;best=p;}}
   if(!best||score<.70)throw new Error('Insufficient space: '+id);
   candidates.splice(candidates.indexOf(best),1);return best;
  };
  for(const id of [...Array(8).fill('rose_black'),...Array(4).fill('mum_burgundy')]){const p=choose(id,flowers);add(id,p.x,p.y);}
  const filler=[];
  for(let i=0;i<3;i++){const p=choose('blue_thistle',[...flowers,...filler],p=>filler.every(f=>Math.hypot(p.x-f.x,p.y-f.y)>=1.4));filler.push({uid:'filler-'+i,id:'blue_thistle',...p,d:.60,layer:35});}
  for(const n of [...flowers,...filler])n.y-=.25;
  return {flowers,filler,exclusions:[],props:[],petalEnvelope:1.60,
   paper:{id:'black_fan_wrap',x:0,y:.4,w:9,h:9*1042/754,layer:0}};
 }
 function billOfMaterials(plan){
  const counts={};for(const n of [...plan.flowers,...plan.filler,...plan.props,plan.paper])counts[n.id]=(counts[n.id]||0)+1;
  return Object.entries(counts).map(([id,quantity])=>({id,quantity,unitPriceCents:null}));
 }
 function build(id,{seed=11,mask=true}={}){
  if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw new Error('Invalid seed');
  const recipe=recipes.find(r=>r.id===id);if(!recipe)throw new Error('Unknown Halloween recipe');
  const layout=({'scream-for-you':scream,'forever-my-boo':round,'midnight-blooms':midnight})[id](seed);
  if(id==='scream-for-you'&&!mask){
   // Reuse all 30 slot identities and stems; the center is no longer reserved.
   layout.flowers=layout.flowers.map((n,i)=>{const r=i===0?0:3*Math.sqrt(i/29),a=i*2.39996323;return {...n,x:.94*r*Math.cos(a),y:1.10*r*Math.sin(a)};});
   layout.exclusions=[];layout.petalEnvelope=1.60;layout.props=layout.props.filter(n=>n.id!=='scream_mask');
  }
  const plan={id,seed,units:'one rose-head diameter',recipe:clone(recipe),...layout};plan.bill=billOfMaterials(plan);return plan;
 }
 function readiness(id,available=[]){const recipe=recipes.find(r=>r.id===id);if(!recipe)throw new Error('Unknown Halloween recipe');const have=new Set(available);const missing=recipe.assets.filter(id=>!have.has(id));return {ready:missing.length===0,missing};}
 return {recipes,assets,diameters,petalEnvelope,build,billOfMaterials,readiness,ellipseRing,maskClearance};
});
