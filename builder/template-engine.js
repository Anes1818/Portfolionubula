/* v2 fixed skeleton, palette patches and accent recipes; exact supplied v1 heart rings.
   Counts and centers remain fixed across painting, deletion and price changes. */
(function(g){'use strict';const cache=new Map(),TAU=Math.PI*2;
function heartLayout(K){
  const pts=[{x:0,y:.05,ring:0}];
  for(let k=1;k<=K;k++){
    const s=k/K,M=720,xs=[],ys=[],cum=[0];
    for(let i=0;i<=M;i++){
      const t=i/M*2*Math.PI;
      xs.push(16*Math.pow(Math.sin(t),3)/17*s);
      ys.push(-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17*s);
      if(i>0)cum.push(cum[i-1]+Math.hypot(xs[i]-xs[i-1],ys[i]-ys[i-1]));
    }
    const P=cum[M],m=Math.max(6,Math.round(P/(0.92/K)));
    for(let j=0;j<m;j++){
      const tgt=j/m*P;let lo=0;
      while(lo<M&&cum[lo]<tgt)lo++;
      pts.push({x:xs[lo],y:ys[lo],ring:k});
    }
  }
  let yMin=1e9,yMax=-1e9;pts.forEach(p=>{yMin=Math.min(yMin,p.y);yMax=Math.max(yMax,p.y);});
  const dy=(yMin+yMax)/2;pts.forEach(p=>p.y-=dy);
  const cnt={};pts.forEach(p=>{p.i=(cnt[p.ring]=(cnt[p.ring]||0)+1)-1;});return {pts,rings:K};
}

const hearts=[1,2,3,4,5].map(heartLayout);
function roundShape(R){return {kind:'round',R,frac:1,inradius:R,perimeter:TAU*R,inside:(x,y)=>Math.hypot(x,y)<=R,dist:(x,y)=>R-Math.hypot(x,y),nearestS:(x,y)=>(Math.atan2(y,x)+TAU)%TAU*R,outlineAt:s=>({x:Math.cos(s/R)*R,y:Math.sin(s/R)*R,nx:Math.cos(s/R),ny:Math.sin(s/R)})};}
function migratedHeart(n){
 const exact=hearts.find(h=>h.pts.length===n);if(exact)return structuredClone(exact);
 if(n===1)return {pts:[{x:0,y:0,ring:0,i:0}],rings:0};
 const K=Math.max(1,Math.round((Math.sqrt(1+1.2*(n-1))-1)/2)),outer=hearts[4].pts.filter(p=>p.ring===5),sum=K*(K+1)/2,qs=Array.from({length:K},(_,i)=>Math.floor((n-1)*(i+1)/sum)),pts=[{x:0,y:0,ring:0,i:0}];
 for(let j=0;qs.reduce((a,b)=>a+b,0)<n-1;j++)qs[K-1-j%K]++;
 for(let k=1;k<=K;k++)for(let j=0;j<qs[k-1];j++){const p=outer[Math.floor(j/qs[k-1]*outer.length)];pts.push({x:p.x*k/K,y:p.y*k/K,ring:k,i:j});}return {pts,rings:K};
}
function layout(mode,n){
 if(!['dome','heart'].includes(mode)||!Number.isInteger(n)||n<1||n>100)throw new Error('Invalid fixed template');
 const key=mode+':'+n;if(cache.has(key))return cache.get(key);const R=Math.max(44,228*Math.sqrt(n/84));let points,rings=0;
 if(mode==='dome'){
  points=n<3?Array.from({length:n},(_,i)=>({x:(i-(n-1)/2)*R,y:0,ring:0,i})):DomeEngine.build({R,N:n,shape:roundShape(R),seed:11,palette:['rose_red'],jitter:.4,overlap:.25,greens:false,fillers:false}).heads.map((p,i)=>({x:p.x,y:p.y,ring:Math.round(Math.hypot(p.x,p.y)/R*3),i}));
  const home=points.map(p=>({...p})),gap=1.55*R/Math.sqrt(n);
  for(let pass=0;pass<100;pass++){for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<gap){const push=(gap-d)*.22;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}}
   points.forEach((p,i)=>{p.x+=(home[i].x-p.x)*.012;p.y+=(home[i].y-p.y)*.012;const r=Math.hypot(p.x,p.y);if(r>R*.985){p.x*=R*.985/r;p.y*=R*.985/r;}});
  }
 }else{const h=migratedHeart(n);rings=h.rings;points=h.pts.map(p=>({...p,x:p.x*R,y:p.y*R*1.08}));}
 // Equal-area refinement of the supplied skeleton: close large seams without adding blooms.
 // Keep v1 zone membership and center; relax interior and crowded edge sites.
 if(n>=3){
  const wall=points.filter(p=>p.ring===rings),wallNear=wall.map(p=>Math.min(...wall.filter(q=>q!==p).map(q=>Math.hypot(p.x-q.x,p.y-q.y)))),typicalWall=wallNear.slice().sort((a,b)=>a-b)[Math.floor(wall.length/2)]||1;
  const crowdedWall=new Set(wall.filter((p,i)=>wallNear[i]<typicalWall*.72));
  const fixed=points.map(p=>mode==='heart'&&(p.ring===0||(n>21&&p.ring===rings&&!crowdedWall.has(p))));
  if(mode==='heart')points.forEach((p,i)=>{if(!fixed[i]){p.x+=Math.sin(i*2.399)*R*.014;p.y+=Math.cos(i*2.399)*R*.009;}});
  const poly=mode==='heart'?hearts[4].pts.filter(p=>p.ring===5).map(p=>({x:p.x*R,y:p.y*R*1.08})):null;
  const inside=(x,y)=>{if(mode==='dome')return Math.hypot(x,y)<=R*1.10;let on=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)on=!on;}return on;};
  const samples=[],step=R/24;for(let y=-R*1.15;y<=R*1.15;y+=step)for(let x=-R*1.12;x<=R*1.12;x+=step)if(inside(x,y))samples.push({x,y});
  for(let pass=0;pass<36;pass++){
   const sums=points.map(()=>({x:0,y:0,n:0}));
   for(const q of samples){let best=0,dist=Infinity;for(let i=0;i<n;i++){const d=(q.x-points[i].x)**2+(q.y-points[i].y)**2;if(d<dist){dist=d;best=i;}}sums[best].x+=q.x;sums[best].y+=q.y;sums[best].n++;}
   points.forEach((p,i)=>{if(fixed[i]||!sums[i].n)return;const q=sums[i],x=p.x+(q.x/q.n-p.x)*.72,y=p.y+(q.y/q.n-p.y)*.72;if(inside(x,y)){p.x=x;p.y=y;}if(mode==='dome'){const r=Math.hypot(p.x,p.y);if(r>R*.985){p.x*=R*.985/r;p.y*=R*.985/r;}}});
  }
 }
 points.forEach((p,i)=>{p.slot=i;p.near=n===1?R*1.5:Math.min(...points.filter((_,j)=>i!==j).map(q=>Math.hypot(q.x-p.x,q.y-p.y)));p.core=p.near*.20;p.r=Math.hypot(p.x,p.y);});
 points.forEach((p,i)=>{p.radiusCap=n===1?R:Math.min(...points.filter((_,j)=>i!==j).map(q=>Math.hypot(q.x-p.x,q.y-p.y)-q.core));});
 const median=points.map(p=>p.near).sort((a,b)=>a-b)[Math.floor(n/2)],unit=median*1.65,frame={mode,engine:mode==='dome'?'v2-fixed-slots':'v1-fixed-rings',center:{x:360,y:390},radius:R,unit,scale:1,capacity:n,rings,top:390+Math.min(...points.map(p=>p.y))-unit*.4,tip:390+Math.max(...points.map(p=>p.y))+unit*.4,halfWidth:Math.max(...points.map(p=>Math.abs(p.x)))+unit*.5};
 const out={points,frame,rings,shape:roundShape(R)};cache.set(key,out);return out;
}
function nearest(mode,n,p){const L=layout(mode,n);let best=null,d=Infinity;for(const a of L.points){const v=Math.hypot(p.x-360-a.x,p.y-390-a.y);if(v<d&&v<=a.near*.70){best=a.slot;d=v;}}return best;}
function defaults(mode,capacity){return {capacity,palette:['rose_red'],formation:'patches',accent:{id:'lily',count:0,pattern:'cluster',angle:340},zones:{wall:'rose_red',fill:'rose_white',center:'sunflower',formation:'zones',doubleWall:false},overrides:{}};}
function recipe(mode,t,seed=11){
 const L=layout(mode,t.capacity),pts=L.points.map(p=>({...p,dEdge:L.frame.radius-p.r}));
 if(mode==='heart'){const z=t.zones;return pts.map(p=>p.ring===0?z.center:z.formation==='rings'?((L.rings-p.ring)%2===0?z.wall:z.fill):z.formation==='checker'?(p.i%2===0?z.wall:z.fill):p.ring>=(z.doubleWall&&L.rings>=3?L.rings-1:L.rings)?z.wall:z.fill);}
 const pal=t.palette;
 if(t.formation==='patches')DomeEngine.patchAssign(pts,pal,Math.max(pal.length,Math.round(Math.sqrt(pts.length)*.9)),DomeEngine.rng(seed+977),L.shape,L.frame.radius);
 else pts.forEach(p=>{p.id=t.formation==='half'?pal[Math.min(pal.length-1,Math.floor((Math.atan2(p.y,p.x)+Math.PI)/TAU*pal.length))]:t.formation==='border'?(p.r>L.frame.radius*.72?pal.at(-1):pal[0]):pal[Math.floor(p.r/L.frame.radius*3)%pal.length];});
 const a=t.accent;if(a.count)DomeEngine.placeAccent(pts,a.id,Math.min(a.count,pts.length),a.pattern,a.angle*Math.PI/180,L.shape,L.frame.radius,DomeEngine.rng(seed+301));return pts.map(p=>p.id);
}
g.NebulaTemplates={layout,nearest,recipe,defaults,heartLayout,roundShape};
})(typeof window!=='undefined'?window:globalThis);
