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

   Reviewed on a phone: 1.00 read as blooms crowding the paper, 0.70 as blooms
   lost inside it, with bare stems showing between the rows. 0.85 sits between,
   and the row offsets above now scale with this number so the rows stay packed
   at any size. Pricing and the 20-unit capacity use the raw catalogue numbers,
   so only the picture changes. */
let CLASSIC_BLOOM=0.85;
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
/* Each photographed wrap carries its own mouth width, so the bloom envelope reads
   it per paper rather than using one constant. Only ivory ships now, measured at
   rimCenter.y-170 as 0.4526 (which reproduces the shipped 0.455). The lookup stays
   because a narrower cone really does matter: a withdrawn kraft measured 0.3672,
   18.9% narrower, and blooms placed at the ivory limit sat 78.7px outside it. */
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
 /* These offsets were tuned when a bloom was drawn at full catalogue size, so they
    must follow CLASSIC_BLOOM. Left absolute, a smaller bloom keeps the old row gap
    and the bare stems between rows show through as a green hedge - which is exactly
    what shrinking the blooms first produced. The rim gap stays fixed so the lowest
    row keeps meeting the paper. */
 const rowGap=r=>(n<=6?[180,107,39]:[194,121,48])[r];
 const dy=[0,1,2].map(r=>rowGap(2)+(rowGap(r)-rowGap(2))*CLASSIC_BLOOM);
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
 /* Greenery goes around the blooms, not among them: a florist tucks sprigs in at
    the shoulders and lets them break the outline. The old placement was two fixed
    pairs, which is why the limit was four - a fifth sprig landed exactly on the
    first. Alternating sides while walking up and out along the shoulder spreads
    any number of them, so the limit is now a real capacity rather than a bug. */
 const shoulder=Math.max(100,rowWidth(rows[0],seed)*.44)+8,pairs=Math.max(1,Math.ceil(tex.length/2));
 tex.forEach((it,i)=>{
  const side=i%2?-1:1,step=Math.floor(i/2),t=pairs>1?step/(pairs-1):0;
  positions[it.uid]={x:360+side*(shoulder+t*30),y:frame.rimY-152-t*74+(rand()-.5)*11,manual:false};
 });
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
/* Optional greenery wrap for the Dome and the Heart. Positions come straight from
   the supplied v2 greenery() recipe, whose off/swing pair is measured and coupled —
   see the engine notes, and note that the rotation there is deliberately NOT radial.
   Sprigs are decorative geometry, not slots: they never occupy or displace a position.
   Every sprig is listed in the estimate; nothing is added silently. */
const GREEN_SPRIG=0.55;   /* sprig size as a fraction of unit — the engine's own constant */
/* A fixed eight read as eight separate tufts pinned around the edge, not as a wrap.
   To close into one continuous collar the sprigs have to overlap, so the count is
   taken from the silhouette rather than fixed: perimeter divided by a little over
   half a sprig width. A Mini dome and an XL heart need very different numbers to
   look equally wrapped — measured, that is 10 sprigs at the small end and about 50
   at the large one. */
function greenRimCount(shape,unit){
 if(!shape||!unit)return 0;
 return Math.max(10,Math.min(72,Math.round(shape.perimeter/(unit*GREEN_SPRIG*0.60))));
}
/* The Heart's layout carries the ROUND shape the Dome path built. That is right for
   placing blooms, but a wrap has to trace the silhouette the customer actually sees,
   so the heart outline is rebuilt here at the frame's own radius and stretched by
   the same 1.08 the heart's bloom points are stretched by. */
function rimGeometry(s,L){
 if(s.mode!=='heart')return {shape:L.shape,yScale:1};
 return {shape:heartShape(L.frame.radius),yScale:1.08};
}
/* What is DRAWN and what is BOUGHT are not the same number, and pricing must use
   the second one. Closing the wrap takes 24-72 sprig images, but a sprig image is
   one cut tip, not a stem: a real eucalyptus stem carries several and a florist
   gets roughly four usable tips off each. Charging per image billed a large dome
   at $118 of greenery, which is not what the florist spends. Four tips to a stem,
   never fewer than six stems, is what a florist actually pulls from the bucket. */
const GREEN_TIPS_PER_STEM=4;
/* Greenery woven BETWEEN berries, the way a berry bouquet is actually finished - in
   the reference bouquet 30% of everything visible is sprigs tucked among the fruit,
   against 12% when the only green is each berry's own calyx.
   It goes only beside berries. Roses interlock at 0.65 of a diameter, so a sprig
   behind them would never show - and every sprig is charged, so hiding one would
   bill the customer for greenery she cannot see. Berries leave real gaps; there it
   shows. Each sprig sits at the midpoint to the berry's nearest neighbour, behind
   the fruit, so it reads as tucked in rather than laid on top. */
const WEAVE_SHARE=0.5;
function berryWeave(s,L){
 if(!s||s.mode==='classic'||!s.finishes?.greenRim||!L)return [];
 const pts=L.points,out=[];
 const r=rng(hash('weave'+s.seed+L.frame.capacity));
 for(const it of s.items){
  if(!Number.isInteger(it.slot)||!DomeEngine.spec(it.id).radial)continue;
  if(r()>WEAVE_SHARE)continue;
  const p=pts[it.slot];let q=null,best=Infinity;
  for(const o of pts){if(o===p)continue;const d=(o.x-p.x)**2+(o.y-p.y)**2;if(d<best){best=d;q=o;}}
  if(!q)continue;
  const mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
  out.push({x:mx,y:my,size:L.frame.unit*(.46+r()*.16),rot:Math.atan2(my,mx)+(r()-.5)*1.2});
 }
 return out;
}
function greenRimStems(s){
 if(!s||s.mode==='classic'||!s.finishes?.greenRim)return 0;
 const L=NebulaTemplates.layout(s.mode,s.template?.capacity||Math.max(s.items.length,1));
 const {shape}=rimGeometry(s,L);
 const tips=greenRimCount(shape,L.frame.unit)+berryWeave(s,L).length;
 return Math.max(6,Math.round(tips/GREEN_TIPS_PER_STEM));
}
function greenRim(s,L){
 if(s.mode==='classic'||!s.finishes?.greenRim||!L)return [];
 const {shape,yScale}=rimGeometry(s,L);
 const n=greenRimCount(shape,L.frame.unit);
 const meta=NEBULA_META.flowers.eucalyptus,r=rng(hash('greenRim'+s.seed+L.frame.capacity));
 const node=(uid,x,y,size,rot,bright,z,index)=>{const factor=size/Math.max(meta.headWidth,meta.headHeight);
  return {uid,id:'eucalyptus',slot:null,decorative:true,x,y,w:meta.headWidth*factor,h:meta.headHeight*factor,d:size,rot,
   bright,depth:1,core:0,radiusCap:size,meta,url:meta.head,z,manual:false,index};};
 const rim=DomeEngine.greenery(shape,L.frame.unit,r,{count:n}).filter(g=>g.rim)
  .map((g,i)=>node('green'+i,360+g.x,390+g.y*yScale,g.size,g.rot*Math.PI/180,g.bright,-9999,-1-i));
 const weave=berryWeave(s,L).map((g,i)=>node('weave'+i,360+g.x,390+g.y,g.size,g.rot,.96,-9998,-1000-i));
 return rim.concat(weave);
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
 /* A berry's size depends on what it sits beside. In an all-berry bouquet there is
    nothing to measure it against, so it fills its slot and the fruit packs shoulder
    to shoulder. Beside roses the rose becomes the scale: at full size a berry ran
    1.29x a rose head and sat on top of its neighbours, where a real strawberry is
    the smaller of the two. So the size is interpolated on the berry share of the
    bouquet - full at 100%, down to 0.62 of it when a few berries accent roses. */
 const fruitShare=top&&s.items.length?s.items.filter(it=>DomeEngine.spec(it.id).radial).length/s.items.length:0;
 const fruitScale=.62+.38*fruitShare;
 const ns=s.items.map((it,i)=>{
  const anchor=top?{x:360+L.points[it.slot??i].x,y:390+L.points[it.slot??i].y}:it.anchors.classic;if(!anchor)return null;
  const meta=NEBULA_META.flowers[it.id];let d=diameter(it,s.mode,s.seed),bright=1,depth=0,slot=null,core=0,cap=0,rot=0;
  if(top){slot=it.slot??i;const p=L.points[slot];core=p.core;cap=p.radiusCap;depth=clamp(p.r/frame.radius,0,1);const dep=s.mode==='dome'?DomeEngine.depthOf(depth):{scale:1,bright:1},natural=(s.mode==='dome'?DomeEngine.spec(it.id).base:CAT[it.id].topDiameter/88)*(DomeEngine.spec(it.id).radial?fruitScale:1);
   d=frame.unit*natural*(s.mode==='dome'?.92+dep.scale*.10:1)*(.965+rng(hash('slot'+slot)+73)()*.07);
   /* The Heart is FLAT, so it has no depth ramp to justify size variation. Capping
      every bloom to its own neighbour gap made the crowded interior shrink: measured
      centre/rim 0.82 at 21 slots, a 1.56x spread that reads as a mistake rather than
      perspective. One shared size, taken at the median cap, holds the worst overlap
      at ~32% - which is the engine's own measured overlap constant of 0.33.
      The Dome keeps per-slot capping: there the centre really is nearer the camera. */
   if(s.mode==='heart')d=Math.min(d,heartUnit(L,it.id));
   else d=Math.min(d,p.radiusCap/(meta.headRadius||.58));
   bright=dep.bright;
   const sp=DomeEngine.spec(it.id),jitter=rng(hash('slot'+slot)+89)()-.5;
   /* A rose has no up, so it turns freely. A berry has a tip, and a florist sets
      every one pointing the same way relative to the bouquet. Tested against free
      rotation on the same 30 slots: turned at random the calyxes scatter and it
      reads as fruit tipped onto a plate; turned so each tip faces the centre, the
      calyxes close into a green ring at the rim and it reads as an arrangement.
      Tips-outward was tried too and piles the calyxes into a green blot in the
      middle. The art is normalised calyx-up/tip-down, i.e. the tip starts at +90
      degrees, hence the -PI/2. A berry sitting on the centre has no "inward", so it
      simply stands upright. */
   if(sp.radial){
    const dx=frame.center.x-anchor.x,dy=frame.center.y-anchor.y;
    const inward=Math.hypot(dx,dy)<frame.unit*.35?Math.PI/2:Math.atan2(dy,dx);
    rot=inward-Math.PI/2+jitter*2*sp.spin*Math.PI/180;
   }else rot=jitter*(s.mode==='heart'?.22:2*sp.spin*Math.PI/180);
  }else{const b=meta.stemBase,c=meta.bloomCenter;rot=meta.classicStem?clamp(Math.atan2(frame.waist.y-anchor.y,frame.waist.x-anchor.x)-Math.atan2(b[1]-c[1],b[0]-c[0]),-.42,.42):0;}
  const mw=top?meta.headWidth:meta.bloomWidth,mh=top?meta.headHeight:meta.bloomHeight,factor=top?d/Math.max(mw,mh):d/mw;
  /* Several photographs of one item: each slot keeps its own, chosen from the slot
     number so painting one berry never reshuffles its neighbours. One image
     repeated thirty times is what made the berries read as manufactured. */
  const variants=top&&meta.heads&&meta.heads.length>1?meta.heads:null;
  const url=!top?meta.classicBloom:variants?variants[Math.floor(rng(hash('variant'+slot)+17)()*variants.length)]:meta.head;
  return {uid:it.uid,id:it.id,slot,x:anchor.x,y:anchor.y,w:mw*factor,h:mh*factor,d,rot,bright,depth,core,radiusCap:cap,meta,url,z:top?-Math.hypot(anchor.x-frame.center.x,anchor.y-frame.center.y):anchor.y,manual:anchor.manual||false,index:i};
 }).filter(Boolean).sort((a,b)=>a.z-b.z||a.index-b.index);
 return {frame,nodes:greenRim(s,L).concat(ns),slots:L?L.points.map(p=>({...p,x:360+p.x,y:390+p.y,uid:s.items.find(it=>it.slot===p.slot)?.uid||null})):[]};
}
/* Blooms are painted after the front paper panel, so anything reaching past the paper
   mouth lands ON the paper instead of behind it. The old h*.24 let a tall bloom's lower
   half cross the mouth by up to 41px. h*.5 keeps the whole bloom above it. */
/* How far a bloom's own centre may travel and still keep the whole bloom on the
   paper. The margin it has to reserve is half of its ROTATED bounding box, taken
   per axis - and for a stemmed item the rotation is the same +/-0.42 rad the
   renderer clamps the stem lean to.

   This used to reserve one scalar margin, Math.hypot(width,height)*0.51, on BOTH
   axes. For a round bloom the diagonal is close enough to the width that nobody
   noticed. For a tall sprig it is not: eucalyptus is 2.91x taller than it is wide,
   so its height dominated the diagonal and that whole number was then subtracted
   from the HORIZONTAL range too. Measured in a 12-rose bouquet, that left the
   sprig 158x49px to move in, against 346x160px for a rose - vertically it was
   effectively pinned. Per-axis extents give it 300x105px on the same bouquet,
   without any part of it crossing the paper, because the reserve is now the real
   geometry rather than a worst case applied twice.

   Sizes are the DRAWN ones. The old code measured the raw catalogue diameter while
   the renderer draws at CLASSIC_BLOOM, so it also reserved for a bloom 18% larger
   than the one on screen. */
const LEAN=0.42;
function classicEnvelope(frame,id){
 const m=NEBULA_META.flowers[id];
 const w=CAT[id].classicDiameter*CLASSIC_BLOOM,h=w*m.bloomHeight/m.bloomWidth;
 const lean=m.classicStem?LEAN:0,c=Math.cos(lean),s=Math.sin(lean);
 const halfW=(w*c+h*s)/2,halfH=(h*c+w*s)/2;
 const half=896*frame.scale*(frame.mouthHalf||MOUTH_FALLBACK);
 /* Exactly the half-extent, so the outermost bloom's edge meets the paper edge and
    never crosses it. Shaving even 4% off let every species hang 2-4px over, which
    a safety sweep caught; the cap keeps a very large bloom from reserving so much
    that it has nowhere left to move. */
 const xm=Math.min(halfW,half*.62);
 /* Blooms stay inside the three-row band the Classic layout is built around.
    Greenery is the exception, and deliberately so: a florist sets sprigs to rise
    ABOVE the flowers and break the outline, which is the whole reason for adding
    them. Holding them to the bloom band left eucalyptus 65px of vertical travel
    with 62px of usable canvas sitting unused above it. Only the canvas guard -
    which keeps the tip of the sprig below the header - limits them now. */
 const guard=95+halfH*1.04;
 const ymin=CAT[id].kind==='texture'?guard:Math.max(guard,frame.rimY-210);
 return {xmin:360-half+xm,xmax:360+half-xm,ymin,
         ymax:frame.rimY-Math.max(24,halfH)-4};
}
function constrainClassic(p,frame,id){const e=classicEnvelope(frame,id),q={x:clamp(p.x,e.xmin,e.xmax),y:clamp(p.y,e.ymin,e.ymax),manual:!!p.manual};if(!NEBULA_META.flowers[id].classicStem){q.x=clamp(q.x,360-105*frame.scale,360+105*frame.scale);q.y=clamp(q.y,frame.rimY-65,frame.rimY-28);}return q;}
function inside(p,frame,d,id){
 if(p.x-d/2<20||p.x+d/2>700||p.y-d/2<55||p.y+d/2>740)return false;
 if(frame.mode==='classic'){
  /* Greenery is allowed above the bloom band - see classicEnvelope. This test has
     to agree, or the envelope opens room the placement search then refuses, which
     is what pinned every sprig where it first landed. Above the band the silhouette
     keeps the width it has at the top of the cone. */
  const tex=id&&CAT[id]&&CAT[id].kind==='texture';
  const ymin=frame.rimY-210,ymax=frame.rimY+3;
  const half=interp((p.y-ymin)/(ymax-ymin),[274,290,256,182]);
  if(tex&&p.y<ymin)return p.y>=frame.rimY-320&&Math.abs(p.x-360)<=274;
  return p.y>=ymin&&p.y<=ymax&&Math.abs(p.x-360)<=half;
 }
 if(frame.mode==='dome')return Math.hypot(p.x-frame.center.x,p.y-frame.center.y)<=Math.max(frame.radius+frame.unit*.40,frame.unit*.75);
 const dx=p.x-frame.center.x,dy=(p.y-frame.center.y)/1.08;
 return heartShape(frame.radius).dist(dx,dy)>=-frame.unit*.16;
}
/* How close two Classic items may sit. It must not be stricter than the automatic
   layout, or an item cannot be dragged to a spot the engine itself would have
   chosen - and it was: measured, the layout packs neighbours 41px apart while this
   test demanded 45px, so with a full bouquet only 4 of 4416 candidate positions
   were reachable and a drag simply did nothing.
   Two things were wrong. The gap was computed from the RAW catalogue diameter
   while every node carries its DRAWN one, mixing units by 1/CLASSIC_BLOOM; and
   0.42 of a diameter is more separation than Classic rows ever use, since the
   rows deliberately overlap. 0.36 of the drawn size clears the layout's own
   spacing with a little room to spare. */
const CLASSIC_GAP=0.36;
function findPlace(s,id,p,ignoreUid=null){
 const {frame,nodes:ns}=nodes(s);
 const classic=s.mode==='classic';
 const d=classic?CAT[id].classicDiameter*CLASSIC_BLOOM:CAT[id].topDiameter;
 const near=ns.filter(n=>n.uid!==ignoreUid);
 const gap=classic?CLASSIC_GAP:.42;
 const valid=q=>{const safe=classic?constrainClassic(q,frame,id):q;return Math.hypot(safe.x-q.x,safe.y-q.y)<.01&&inside(q,frame,d,id)&&near.every(n=>Math.hypot(q.x-n.x,q.y-n.y)>Math.min(d,n.d)*gap);};
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
g.NebulaGeometry={classicEnvelope,mouthHalf,stampPaper,setClassicBloom,get classicBloom(){return CLASSIC_BLOOM;},constrainClassic,W,H,GOLDEN,rng,hash,clamp,variation,diameter,capacity,classicFrame,arrange,nodes,inside,findPlace,heartRings,greenRimStems};
})(typeof window!=='undefined'?window:globalThis);
