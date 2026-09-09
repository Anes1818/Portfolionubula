/* Geometry in a stable 720 × 820 world. No paid items are created here.
   Classic is a measured three-row/photo-wrap model, not a full-stem radial fan.
   Dome retains v2's golden angle, deterministic exact count and sqrt(N) scaling.
   Flat heart has its own planar row packing; it never calls dome depth code. */
(function(g){'use strict';
const {CAT,CONFIG}=NebulaConfig,W=720,H=820,GOLDEN=137.507*Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed|0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function variation(it,seed){return .965+rng(hash(it.uid)+seed)()*.07;}
/* Drawn size of a Classic bloom relative to its catalogue diameter.
   Untuned, blooms rendered at 24-30% of the paper mouth width; a real 6cm rose
   in a 45cm wrap is about 13%. But shrinking to that alone empties the wrap,
   because a preset only holds 10-12 stems. Measured across four factors:

     factor  bloom/mouth  cluster spread  mouth filled
      1.00      24%          81-89%          58-62%
      0.82      20%          67-74%          44-51%
      0.70      17%          57-64%          35-42%   <- chosen
      0.60      14%          49-61%          27-34%

   A real hand-tie spans about 60% of the mouth with the paper flaring past it.
   0.70 is the only factor that lands both: near-realistic bloom size AND a
   cluster that still reads as full. Pricing and the 20-unit capacity use the
   raw catalogue numbers, so only the picture changes. */
let CLASSIC_BLOOM=0.70;
function setClassicBloom(v){CLASSIC_BLOOM=Math.max(.3,Math.min(1.4,+v||1));}
function diameter(it,mode,seed=11){const d=CAT[it.id][mode==='classic'?'classicDiameter':'topDiameter']*variation(it,seed);return mode==='classic'?d*CLASSIC_BLOOM:d;}
function capacity(items,mode){
 const unavailable=items.filter(it=>mode==='classic'&&!CAT[it.id].classic);
 if(unavailable.length)return {ok:false,reason:'art',ids:[...new Set(unavailable.map(x=>x.id))]};
 const main=items.filter(x=>CAT[x.id].kind==='flower'),texture=items.filter(x=>CAT[x.id].kind==='texture');
 const area=main.reduce((sum,it)=>sum+(CAT[it.id].classicDiameter/116)**2,0);
 if(mode==='classic'&&(main.length>CONFIG.limits.classicMain||area>CONFIG.limits.classicArea+.001))return {ok:false,reason:'classicCapacity',main:main.length,area:+area.toFixed(2),limit:20};
 if(mode==='classic'&&texture.length>CONFIG.limits.classicTexture)return {ok:false,reason:'textureCapacity',limit:mode==='classic'?4:8};
 if(items.length>CONFIG.limits.topItems)return {ok:false,reason:'topCapacity',limit:100};
 return {ok:true,main:main.length,texture:texture.length,area};
}
/* Each photographed wrap has its own mouth width, so the bloom envelope cannot
   use one constant. Measured at rimCenter.y-170: ivory 0.4526 (which reproduces
   the shipped 0.455) and kraft 0.3672 - the kraft cone is 18.9% narrower, and
   blooms placed at the ivory limit sat 78.7px outside its paper on each side. */
const MOUTH_FALLBACK=.455;
function mouthHalf(paper){const w=NEBULA_META.wraps&&NEBULA_META.wraps[paper];return (w&&w.mouthHalf)||MOUTH_FALLBACK;}
function classicFrame(items,paper){
 const c=capacity(items,'classic'),units=c.area||items.filter(i=>CAT[i.id].kind==='flower').length;
 const scale=clamp(.49+Math.max(0,units-4)*.0153,.49,.735);
 const yScale=Math.min(scale,.62);
 const waist={x:360,y:666},origin={x:360-448*scale,y:waist.y-850*yScale};
 const rimY=origin.y+600*yScale;
 return {mode:'classic',scale,yScale,origin,waist,rimY,center:{x:360,y:rimY-108},radius:230,unit:116,
         paper:paper||'ivory',mouthHalf:mouthHalf(paper)};
}
function rowWidth(row,seed){if(!row.length)return 0;const ds=row.map(it=>diameter(it,'classic',seed));return ds[0]/2+ds.at(-1)/2+ds.slice(1).reduce((s,d,i)=>s+(d+ds[i])*.29,0);}
function classic(items,seed,paper){
 const frame=classicFrame(items,paper),rand=rng(seed),main=items.filter(x=>CAT[x.id].kind!=='texture'),tex=items.filter(x=>CAT[x.id].kind==='texture'),n=main.length;
 const rows=[[],[],[]],weights=[.40,.35,.25];
 let quota=n<=3?[Math.ceil(n/2),Math.floor(n/2),0]:n<=6?[Math.ceil(n*.5),Math.ceil(n*.3),0]:weights.map(w=>Math.floor(n*w));
 if(n<=6)quota[2]=n-quota[0]-quota[1];
 else{let remaining=n-quota.reduce((a,b)=>a+b,0);const ranks=[0,1,2].sort((a,b)=>(n*weights[b]-quota[b])-(n*weights[a]-quota[a]));for(let j=0;j<remaining;j++)quota[ranks[j%3]]++;}
 // Species are never assigned to locked template roles. Balance occupied photographic widths.
 let idx=0;for(let r=0;r<3;r++)for(let j=0;j<quota[r];j++)rows[r].push(main[idx++]);
 for(let k=0;k<7;k++){
  let big=rows.findIndex((row,r)=>rowWidth(row,seed)>[598,532,414][r]);
  if(big<0)break;
  const target=[0,1,2].filter(r=>r!==big).sort((a,b)=>rowWidth(rows[a],seed)/[598,532,414][a]-rowWidth(rows[b],seed)/[598,532,414][b])[0];
  if(rows[big].length>1)rows[target].push(rows[big].pop());else break;
 }
 const positions={};
 // Back/middle/front centers overlap by photographic bloom height; no fourth/taller row is appended.
 const dy=n<=6?[180,107,39]:[194,121,48];
 rows.forEach((row,r)=>{
  if(!row.length)return;
  let x=-rowWidth(row,seed)/2;
  row.forEach((it,j)=>{
   const d=diameter(it,'classic',seed);
   if(j===0)x+=d/2;else x+=(diameter(row[j-1],'classic',seed)+d)*.29;
   const lift=(Math.abs(x)/290)**1.6*25;
   const stagger=Math.sin((j+1)*2.47+r*1.32)*11;
   positions[it.uid]={x:360+x+(rand()-.5)*9+(r===1?9:-3),y:frame.rimY-dy[r]+lift+stagger+(rand()-.5)*13,manual:false};
  });
 });
 tex.forEach((it,i)=>{const side=i%2?-1:1;positions[it.uid]={x:360+side*(Math.max(100,rowWidth(rows[0],seed)*.44)+8),y:frame.rimY-152+(i>1?63:0),manual:false};});
 for(const it of items)positions[it.uid]=constrainClassic(positions[it.uid],frame,it.id);
 return {frame,positions};
}
function dome(items,seed){
 const n=items.length,positions={};
 const spec=id=>DomeEngine.spec(id);
 const baseR=228*Math.sqrt(Math.max(n,1)/84),rms=n?Math.sqrt(items.reduce((v,it)=>v+spec(it.id).base**2,0)/n):1;
 let mean=0;for(let i=0;i<24;i++)mean+=DomeEngine.depthOf(Math.sqrt((i+.5)/24)).scale;mean/=24;
 const unit=DomeEngine.unitFor(Math.max(n,1),baseR,.35,.47,mean),R=Math.max(30,baseR*rms);
 if(n<3){items.forEach((it,i)=>positions[it.uid]={x:360+(i-(n-1)/2)*unit*.55,y:390,manual:false});}
 else{
  const out=DomeEngine.build({shape:'round',R,N:n,seed,items:items.map(i=>i.id),unit,overlap:.35,greens:false,fillers:false});
  out.heads.forEach((p,i)=>positions[items[i].uid]={x:360+p.x,y:390+p.y,manual:false});
 }
 return {frame:{mode:'dome',engine:'v2',center:{x:360,y:390},radius:R,unit,scale:1},positions};
}
function interp(t,arr){const f=clamp(t,0,1)*(arr.length-1),i=Math.floor(f);return arr[i]+(arr[Math.min(i+1,arr.length-1)]-arr[i])*(f-i);}
// v1's equal-arc-length parametric heart rings, adapted to any exact count.
// Flat geometry: no dome depth ramp, no perspective-sized central rose.
const heartCache=new Map();
function heartRings(n){
 if(heartCache.has(n))return heartCache.get(n);
 if(n<=1)return {pts:n?[{x:0,y:0,ring:0}]:[],rings:0};
 const K=Math.max(1,Math.round((Math.sqrt(1+1.2*(n-1))-1)/2)),M=720,curve=[],cum=[0];
 let ymin=1e9,ymax=-1e9;
 for(let i=0;i<=M;i++){const t=i/M*Math.PI*2,x=16*Math.sin(t)**3/17,y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17;
  curve.push({x,y});ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);if(i)cum.push(cum.at(-1)+Math.hypot(x-curve[i-1].x,y-curve[i-1].y));}
 const cy=(ymin+ymax)/2,weights=K*(K+1)/2,quotas=Array.from({length:K},(_,i)=>Math.floor((n-1)*(i+1)/weights));
 let left=n-1-quotas.reduce((a,b)=>a+b,0);const rank=quotas.map((q,i)=>({i,f:(n-1)*(i+1)/weights-q})).sort((a,b)=>b.f-a.f);for(let i=0;i<left;i++)quotas[rank[i%K].i]++;
 const pts=[{x:0,y:(.05-cy)*1.08,ring:0}];
 for(let k=1;k<=K;k++){
  const count=quotas[k-1];for(let j=0;j<count;j++){
   const d=j/count*cum.at(-1);let lo=0,hi=M;while(lo<hi){let mid=(lo+hi)>>1;if(cum[mid]<d)lo=mid+1;else hi=mid;}
   const p=curve[lo];pts.push({x:p.x*k/K,y:(p.y-cy)*k/K*1.08,ring:k});
  }
 }
 const out={pts,rings:K};heartCache.set(n,out);if(heartCache.size>110)heartCache.delete(heartCache.keys().next().value);return out;
}
function heart(items,seed){
 const n=items.length,layout=heartRings(n),positions={},unit=n?Math.sqrt(items.reduce((s,it)=>s+CAT[it.id].topDiameter**2,0)/n):88;
 const R=Math.max(48,unit*Math.sqrt(Math.max(n,1))*.285),rand=rng(seed);
 items.forEach((it,i)=>{const p=layout.pts[i];positions[it.uid]={x:360+p.x*R+(i?(rand()-.5)*unit*.027:0),y:390+p.y*R+(i?(rand()-.5)*unit*.027:0),manual:false};});
 return {frame:{mode:'heart',engine:'v1-rings',center:{x:360,y:390},radius:R,unit,scale:1,top:390-R*.98,tip:390+R*.98,halfWidth:R*.95+unit*.50,rings:layout.rings},positions};
}
const heartShapes=new Map();
function heartShape(R){if(!heartShapes.has(R)){heartShapes.set(R,DomeEngine.buildShape('heart',R,120));if(heartShapes.size>64)heartShapes.delete(heartShapes.keys().next().value);}return heartShapes.get(R);}
function arrange(items,mode,seed,paper){return mode==='classic'?classic(items,seed,paper):(mode==='dome'?dome:heart)(items,seed);}
/* Optional eucalyptus collar for the Dome. Positions come straight from the supplied v2
   greenery() recipe, whose off/swing pair is measured and coupled — see the engine notes.
   Sprigs are decorative geometry, not slots: they never occupy or displace a position.
   Listed as GREEN_RIM real stems in the estimate; nothing is added silently. */
const GREEN_RIM=8;
function greenRim(s,L){
 if(s.mode!=='dome'||!s.finishes?.greenRim||!L)return [];
 const meta=NEBULA_META.flowers.eucalyptus,r=rng(hash('greenRim'+s.seed+L.frame.capacity));
 return DomeEngine.greenery(L.shape,L.frame.unit,r,{count:GREEN_RIM}).filter(g=>g.rim).map((g,i)=>{
  const factor=g.size/Math.max(meta.headWidth,meta.headHeight);
  return {uid:'green'+i,id:'eucalyptus',slot:null,decorative:true,x:360+g.x,y:390+g.y,
   w:meta.headWidth*factor,h:meta.headHeight*factor,d:g.size,rot:g.rot*Math.PI/180,
   bright:g.bright,depth:1,core:0,radiusCap:g.size,meta,url:meta.head,z:-9999,manual:false,index:-1-i};
 });
}
/* One shared bloom size for a Heart template: the median neighbour cap, cached
   per layout+flower. See the note at its call site for why the median. */
const heartUnits=new Map();
function heartUnit(L,id){
 const meta=NEBULA_META.flowers[id],hr=meta?.headRadius||.58,key=L.frame.capacity+':'+id;
 if(!heartUnits.has(key)){
  const caps=L.points.map(p=>p.radiusCap/hr).sort((a,b)=>a-b);
  heartUnits.set(key,caps[Math.floor(caps.length*0.5)]);
  if(heartUnits.size>256)heartUnits.delete(heartUnits.keys().next().value);
 }
 return heartUnits.get(key);
}
/* A frame saved before this paper was chosen still carries the old mouth. */
function stampPaper(frame,s){const p=s.finishes&&s.finishes.paper;
 if(frame&&p&&frame.paper!==p){frame.paper=p;frame.mouthHalf=mouthHalf(p);}
 return frame;}
function nodes(s){
 const top=s.mode!=='classic',L=top?NebulaTemplates.layout(s.mode,s.template?.capacity||Math.max(s.items.length,1)):null,frame=top?L.frame:stampPaper(s.frames.classic||classicFrame(s.items,s.finishes&&s.finishes.paper),s);
 const ns=s.items.map((it,i)=>{
  const anchor=top?{x:360+L.points[it.slot??i].x,y:390+L.points[it.slot??i].y}:it.anchors.classic;if(!anchor)return null;
  const meta=NEBULA_META.flowers[it.id];let d=diameter(it,s.mode,s.seed),bright=1,depth=0,slot=null,core=0,cap=0,rot=0;
  if(top){slot=it.slot??i;const p=L.points[slot];core=p.core;cap=p.radiusCap;depth=clamp(p.r/frame.radius,0,1);const dep=s.mode==='dome'?DomeEngine.depthOf(depth):{scale:1,bright:1},natural=s.mode==='dome'?DomeEngine.spec(it.id).base:CAT[it.id].topDiameter/88;
   d=frame.unit*natural*(s.mode==='dome'?.92+dep.scale*.10:1)*(.965+rng(hash('slot'+slot)+73)()*.07);
   /* The Heart is FLAT, so it has no depth ramp to justify size variation. Capping
      every bloom to its own neighbour gap made the crowded interior shrink: measured
      centre/rim 0.82 at 21 slots, a 1.56x spread that reads as a mistake rather than
      perspective. One shared size, taken at the median cap, holds the worst overlap
      at ~32% - which is the engine's own measured overlap constant of 0.33.
      The Dome keeps per-slot capping: there the centre really is nearer the camera. */
   if(s.mode==='heart')d=Math.min(d,heartUnit(L,it.id));
   else d=Math.min(d,p.radiusCap/(meta.headRadius||.58));
   bright=dep.bright;rot=(rng(hash('slot'+slot)+89)()-.5)*(s.mode==='heart'?.22:2*DomeEngine.spec(it.id).spin*Math.PI/180);
  }else{const b=meta.stemBase,c=meta.bloomCenter;rot=meta.classicStem?clamp(Math.atan2(frame.waist.y-anchor.y,frame.waist.x-anchor.x)-Math.atan2(b[1]-c[1],b[0]-c[0]),-.42,.42):0;}
  const mw=top?meta.headWidth:meta.bloomWidth,mh=top?meta.headHeight:meta.bloomHeight,factor=top?d/Math.max(mw,mh):d/mw;
  return {uid:it.uid,id:it.id,slot,x:anchor.x,y:anchor.y,w:mw*factor,h:mh*factor,d,rot,bright,depth,core,radiusCap:cap,meta,url:top?meta.head:meta.classicBloom,z:top?-Math.hypot(anchor.x-frame.center.x,anchor.y-frame.center.y):anchor.y,manual:anchor.manual||false,index:i};
 }).filter(Boolean).sort((a,b)=>a.z-b.z||a.index-b.index);
 return {frame,nodes:greenRim(s,L).concat(ns),slots:L?L.points.map(p=>({...p,x:360+p.x,y:390+p.y,uid:s.items.find(it=>it.slot===p.slot)?.uid||null})):[]};
}
/* Blooms are painted after the front paper panel, so anything reaching past the paper
   mouth lands ON the paper instead of behind it. The old h*.24 let a tall bloom's lower
   half cross the mouth by up to 41px. h*.5 keeps the whole bloom above it. */
function classicEnvelope(frame,id){const d=CAT[id].classicDiameter,m=NEBULA_META.flowers[id],h=d*m.bloomHeight/m.bloomWidth,half=896*frame.scale*(frame.mouthHalf||MOUTH_FALLBACK),margin=Math.hypot(d,h)*.51;return {xmin:360-half+margin,xmax:360+half-margin,ymin:Math.max(95+h*.52,frame.rimY-210),ymax:frame.rimY-Math.max(24,h*.5)-4};}
function constrainClassic(p,frame,id){const e=classicEnvelope(frame,id),q={x:clamp(p.x,e.xmin,e.xmax),y:clamp(p.y,e.ymin,e.ymax),manual:!!p.manual};if(!NEBULA_META.flowers[id].classicStem){q.x=clamp(q.x,360-105*frame.scale,360+105*frame.scale);q.y=clamp(q.y,frame.rimY-65,frame.rimY-28);}return q;}
function inside(p,frame,d){
 if(p.x-d/2<20||p.x+d/2>700||p.y-d/2<55||p.y+d/2>740)return false;
 if(frame.mode==='classic'){
  const ymin=frame.rimY-210,ymax=frame.rimY+3;
  const half=interp((p.y-ymin)/(ymax-ymin),[274,290,256,182]);
  return p.y>=ymin&&p.y<=ymax&&Math.abs(p.x-360)<=half;
 }
 if(frame.mode==='dome')return Math.hypot(p.x-frame.center.x,p.y-frame.center.y)<=Math.max(frame.radius+frame.unit*.40,frame.unit*.75);
 const dx=p.x-frame.center.x,dy=(p.y-frame.center.y)/1.08;
 return heartShape(frame.radius).dist(dx,dy)>=-frame.unit*.16;
}
function findPlace(s,id,p,ignoreUid=null){
 const {frame,nodes:ns}=nodes(s),d=CAT[id][s.mode==='classic'?'classicDiameter':'topDiameter'];
 const near=ns.filter(n=>n.uid!==ignoreUid);
 const valid=q=>{const safe=s.mode==='classic'?constrainClassic(q,frame,id):q;return Math.hypot(safe.x-q.x,safe.y-q.y)<.01&&inside(q,frame,d)&&near.every(n=>Math.hypot(q.x-n.x,q.y-n.y)>Math.min(d,n.d)*.42);};
 if(p&&valid(p))return {...p,manual:true,snapped:false};
 const target=p||{x:frame.center.x,y:frame.center.y};let best=null,score=Infinity;
 for(let y=65;y<=745;y+=10)for(let x=45;x<=680;x+=10){
  const q={x,y};if(!valid(q))continue;
  const closest=near.length?Math.min(...near.map(n=>Math.hypot(x-n.x,y-n.y))):0;
  const centerDist=Math.hypot(x-frame.center.x,y-frame.center.y);
  const ds=p?Math.hypot(x-target.x,y-target.y):Math.abs(closest-d*.65)+centerDist*.08;
  if(ds<score){score=ds;best={x,y,manual:true,snapped:!!p};}
 }
 // A far click is not a mysterious jump across the bouquet.
 if(p&&score>95)return null;
 return best;
}
g.NebulaGeometry={classicEnvelope,mouthHalf,stampPaper,setClassicBloom,get classicBloom(){return CLASSIC_BLOOM;},constrainClassic,W,H,GOLDEN,rng,hash,clamp,variation,diameter,capacity,classicFrame,arrange,nodes,inside,findPlace,heartRings,GREEN_RIM};
})(typeof window!=='undefined'?window:globalThis);
