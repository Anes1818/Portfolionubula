/* Deterministic packing between blooms. All coordinates are in bouquet space.
   This module never changes the purchased flowers, their anchors or quantities. */
(function(g){'use strict';
const cache=new Map(),layoutCache=new Map(),sampleCache=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function shape(n){
 // Lilies have deep spaces between petals; a rose cup is much more solid.
 const k=n.id==='lily'?.29:n.id==='sunflower'?.36:.38;
 return {...n,rx:n.w*k,ry:n.h*k,cs:Math.cos(n.rot||0),sn:Math.sin(n.rot||0)};
}
function clearance(p,n){
 const dx=p.x-n.x,dy=p.y-n.y,x=dx*n.cs+dy*n.sn,y=-dx*n.sn+dy*n.cs;
 const q=Math.hypot(x/n.rx,y/n.ry);
 return (q-1)*Math.min(n.rx,n.ry);
}
function pockets(sc){
 const flowers=sc.nodes.filter(n=>!n.decorative&&n.id!=='eucalyptus'&&n.id!=='white_flower_spray').map(shape).sort((a,b)=>a.uid.localeCompare(b.uid));
 const unit=sc.frame.unit,key=JSON.stringify([unit,flowers.map(n=>[n.uid,n.id,n.url,n.x,n.y,n.w,n.h,n.rot,n.flipX,n.z,n.flowerCup])]);
 if(cache.has(key))return cache.get(key);
 if(!flowers.length)return {flowers,points:[]};
 const candidates=[],seen=new Set();
 const measure=p=>{
  const near=flowers.map(n=>({n,d:clearance(p,n)})).sort((a,b)=>a.d-b.d),a=near[0],b=near[1];
  // Do not fill the empty canvas or bridge flowers deliberately dragged apart.
  if(a.d>unit*.31||a.d<-unit*.16||b&&b.d>unit*.78)return null;
  return {clear:a.d,near:near.slice(0,4),local:near.slice(0,3).reduce((v,a)=>v+Math.min(a.n.w,a.n.h),0)/Math.min(3,near.length)};
 };
 const add=(x,y,edge=false)=>{
  let p={x,y},m=measure(p);if(!m)return;
  // Ascend the distance field inside a small neighbourhood of this junction.
  // Maximising the minimum clearance approximates a weighted Voronoi vertex.
  if(!edge)for(const step of [unit*.10,unit*.05,unit*.025]){
   let best=p,bm=m;
   for(let k=0;k<8;k++){const a=k*Math.PI/4,q={x:p.x+Math.cos(a)*step,y:p.y+Math.sin(a)*step},qm=measure(q);if(qm&&qm.clear>bm.clear&&distance(q,{x,y})<unit*.22){best=q;bm=qm;}}
   p=best;m=bm;
  }
  const k=Math.round(p.x/3)+','+Math.round(p.y/3);if(seen.has(k))return;seen.add(k);
  const nearest=m.near[0].n;
  // A foreground flower is the insertion point. Its petals cover the basal stem.
  const front=m.near.filter(a=>a.d<unit*.62).sort((a,b)=>(b.n.z??b.n.y)-(a.n.z??a.n.y))[0]?.n||nearest;
  const a=Math.atan2(p.y-front.y,p.x-front.x);
  candidates.push({...p,clear:m.clear,local:m.local,edge,angle:a,front:front.uid,z:(front.z??front.y)-.5,
   // Real neighbouring silhouettes, not circles, provide the final occlusion.
   neighbours:m.near.map(a=>a.n.uid),quality:m.clear/unit+(edge?-.18:.25)});
 };
 for(let i=0;i<flowers.length;i++){
  const a=flowers[i],near=flowers.filter(b=>b!==a).sort((b,c)=>distance(a,b)-distance(a,c)).slice(0,5);
  for(const b of near){
   const d=distance(a,b),r=Math.min(a.rx,a.ry)+Math.min(b.rx,b.ry);if(d>r+unit*.8||d<unit*.22)continue;
   const t=clamp((d+Math.min(a.rx,a.ry)-Math.min(b.rx,b.ry))/(2*d),.25,.75);
   add(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
  }
  for(let j=0;j<near.length;j++)for(let k=j+1;k<near.length;k++){
   const b=near[j],c=near[k],ab=distance(a,b),ac=distance(a,c),bc=distance(b,c);
   if(Math.max(ab,ac,bc)>unit*2.1)continue;
   // Triangle incenter seeds an interior gap; ascent accounts for unequal heads.
   const den=ab+ac+bc;add((a.x*bc+b.x*ac+c.x*ab)/den,(a.y*bc+b.y*ac+c.y*ab)/den);
  }
  // Real outer petal valleys also support a few short tips. No circular halo.
  const tips=flowers.length<4?32:12;
  for(let j=0;j<tips;j++){const ang=j*Math.PI*2/tips+.13,dx=Math.cos(ang)*a.rx*1.10,dy=Math.sin(ang)*a.ry*1.10;add(a.x+dx*a.cs-dy*a.sn,a.y+dx*a.sn+dy*a.cs,true);}
 }
 candidates.sort((a,b)=>b.quality-a.quality||a.y-b.y||a.x-b.x);
 const result={flowers,points:candidates};cache.set(key,result);if(cache.size>30)cache.delete(cache.keys().next().value);return result;
}
function alphaAt(n,p){
 const dx=p.x-n.x,dy=p.y-n.y,x=(dx*n.cs+dy*n.sn)/n.w+.5,y=(-dx*n.sn+dy*n.cs)/n.h+.5;
 if(x<0||x>=1||y<0||y>=1)return 0;
 if(!n.mask)return clearance(p,n)<0?1:0;
 const ix=Math.floor((n.flipX?1-x:x)*n.mask.w),iy=Math.floor(y*n.mask.h);
 return (n.mask.data[(iy*n.mask.w+ix)*4+3]||0)/255;
}
function cupDistance(n,p){
 const cup=n.flowerCup||[.5,.5],ox=(cup[0]-.5)*n.w,oy=(cup[1]-.5)*n.h;
 const x=n.x+ox*n.cs-oy*n.sn,y=n.y+ox*n.sn+oy*n.cs;
 return Math.hypot((p.x-x)/(n.w*.5),(p.y-y)/(n.h*.5));
}
function samples(m){
 if(sampleCache.has(m.url))return sampleCache.get(m.url);
 const mask=g.NebulaRenderer?.footprint({url:m.url}),out=[];
 for(let y=0;y<22;y++)for(let x=0;x<22;x++){const u=(x+.5)/22,v=(y+.5)/22;if(!mask||mask.data[(Math.floor(v*80)*80+Math.floor(u*80))*4+3]>90)out.push([u-.5,v-.5]);}
 if(mask)sampleCache.set(m.url,out);return out;
}
function fit(p,kind,index,flowers,art){
 const m=kind==='thistles'?art.thistle:kind==='sprays'?art.spray:kind==='greenery'?art.greens[index%art.greens.length]:index%2?art.wide:art.airy;
 const crown=m.crown||(kind==='greenery'?[.64,.36]:kind==='sprays'?[.48,.40]:[.51,.38]),base=m.base||(kind==='greenery'?[.03,.96]:[.48,.98]);
 const pixels=samples(m);let best=null;
 for(const turn of [0,-.55,.55,-1.1,1.1]){
  const pose=anchored(p,m,p.w,crown,base,turn),cs=Math.cos(pose.rot),sn=Math.sin(pose.rot);
  let visible=0,core=0;
  const near=flowers.filter(n=>distance(n,pose)<Math.max(n.w,n.h)+pose.w);
  for(const [u,v] of pixels){const q={x:pose.x+u*pose.w*cs-v*pose.h*sn,y:pose.y+u*pose.w*sn+v*pose.h*cs};
   visible++;
   if(near.some(n=>cupDistance(n,q)<.42&&alphaAt(n,q)>.5))core++;
  }
  const ratio=visible/Math.max(1,pixels.length),intrusion=core/Math.max(1,pixels.length),baseHidden=near.some(n=>alphaAt(n,pose.base)>.5);
  // Score the entire visible cutout, exactly as rendered. Never assume its
  // lower leaves can be erased to make an otherwise oversized branch fit.
  const quality=-intrusion*14+(baseHidden?.4:-.7);
  if(!best||quality>best.quality)best={pose,url:m.url,quality,visible:ratio,core:intrusion};
 }
 return best;
}
function plan(sc,counts,art){
 const source=pockets(sc),flowers=source.flowers.map(n=>({...n,mask:g.NebulaRenderer?.footprint(n)})),points=source.points,unit=sc.frame.unit,used=[],out={sprays:[],greenery:[],thistles:[],breath:[]};
 // A selected stem has multiple branching tips. Find separate nearby seams
 // for those tips instead of stacking a compact white stamp on its crown.
 const tips=(counts.breath||0)*(counts.level>=2?2:1)+(counts.level===3?Math.ceil((counts.breath||0)/2):0);
 for(const kind of ['sprays','greenery','thistles','breath'])for(let i=0;i<(kind==='breath'?tips:counts[kind]||0);i++){
  let chosen=null,best=-Infinity;const ranked=[];
  for(const p of points){
   if(used.some(q=>q.p===p))continue;
   const spacing=used.length?Math.min(...used.map(q=>distance(p,q.p)/(q.radius+unit*(kind==='breath'?.15:.23)))):3;
   const core=Math.min(...flowers.map(n=>cupDistance(n,p)));
   if(core<.42)continue;
   const parent=kind==='breath'&&i>=counts.breath?out.breath[i%counts.breath]:null;
   const reach=parent?distance(p,parent)/unit:0;
   const spread=kind==='thistles'&&out.thistles.length?Math.min(3,Math.min(...out.thistles.map(q=>distance(p,q)/unit)))*.9:0;
   const score=p.quality+Math.min(spacing,2)*.7-(spacing<.80?(1-spacing)*4:0)+(kind==='greenery'&&p.edge?.12:0)-(parent?Math.abs(reach-.85)*1.1:0)+spread;
   ranked.push({p,spacing,score});
  }
  ranked.sort((a,b)=>b.score-a.score);
  for(const {p,spacing,score} of ranked.slice(0,art?14:1)){
   const local=clamp(p.local,unit*.90,unit*1.3),fitSize=clamp((p.clear/unit+.28)*1.25,.90,1.10);
   const density=kind==='breath'?[1,.90,1.05,1.22][counts.level||1]*(i>=counts.breath?.78:1):1;
   const w=Math.min(local*(kind==='thistles'?.62:kind==='sprays'?.94:kind==='greenery'?1.02:1.24)*fitSize,unit*(kind==='thistles'?.72:kind==='greenery'?1.15:kind==='sprays'?1.05:1.44))*density;
   const fitted=art?fit({...p,w},kind,i,flowers,art):null,total=score+(fitted?.quality||0);
   if(total>best){chosen={...p,spacing,w,fitted,source:p};best=total;}
  }
  if(!chosen)break;
  out[kind].push({...chosen,index:i});
  used.push({p:chosen.source,radius:unit*(kind==='breath'?.15:.23)});
 }
 return out;
}
function anchored(p,m,w,crown,base,extra=0){
 const h=w*m.height/m.width,dx=(crown[0]-base[0])*w,dy=(crown[1]-base[1])*h,rot=p.angle-Math.atan2(dy,dx)+extra;
 const ox=(crown[0]-.5)*w,oy=(crown[1]-.5)*h;
 const x=p.x-ox*Math.cos(rot)+oy*Math.sin(rot),y=p.y-ox*Math.sin(rot)-oy*Math.cos(rot),bx=(base[0]-.5)*w,by=(base[1]-.5)*h;
 return {x,y,w,h,d:w,rot,crown:{x:p.x,y:p.y},base:{x:x+bx*Math.cos(rot)-by*Math.sin(rot),y:y+bx*Math.sin(rot)+by*Math.cos(rot)}};
}
function nodes(sc,counts,art){
 const key=JSON.stringify([sc.frame.unit,counts,sc.nodes.map(n=>[n.uid,n.url,n.x,n.y,n.w,n.h,n.rot,n.flipX,n.z,n.flowerCup,!!g.NebulaRenderer?.decoded(n.url)]),Object.values(art).flat().map(m=>[m.url,m.width,m.height,m.crown,m.base,!!g.NebulaRenderer?.decoded(m.url)])]);
 if(layoutCache.has(key))return layoutCache.get(key);
 const layout=plan(sc,counts,art),all=[],greenery=[],canopy=Math.max(0,...sc.nodes.map(n=>n.z??n.y))+20;
 const common=(p,kind)=>({z:canopy+(kind==='greenery'?0:kind==='spray'?1:2),bright:1,softDetail:true,infill:true,infillKind:kind,pocket:{x:p.x,y:p.y,clear:p.clear},occlude:p.neighbours,front:p.front,visibleRatio:p.fitted?.visible,coreOverlap:p.fitted?.core});
 layout.sprays.forEach((p,i)=>{const a=p.fitted.pose;all.push({...common(p,'spray'),...a,uid:'spray-accent-'+i,url:art.spray.url});});
 layout.thistles.forEach((p,i)=>all.push({...common(p,'thistle'),...p.fitted.pose,uid:'thistle-accent-'+i,url:art.thistle.url}));
 layout.greenery.forEach((p,i)=>{
  const m=art.greens[i%art.greens.length],a=p.fitted.pose;
  const n={...common(p,'greenery'),...a,uid:'greenery-'+i,url:m.url};all.push(n);greenery.push(n);
 });
 layout.breath.forEach((p,i)=>{
  const m=i%2?art.wide:art.airy,a=p.fitted.pose;
  const primary=i<counts.breath,second=i<counts.breath*2;
  const uid=primary?'air-'+i:second?'tuft-'+(i-counts.breath):'breath-tip-'+(i-counts.breath*2);
  all.push({...common(p,'breath'),...a,uid,url:m.url,parentFiller:primary?undefined:'air-'+(i%counts.breath)});
 });
 const result={all,greenery,layout};layoutCache.set(key,result);if(layoutCache.size>30)layoutCache.delete(layoutCache.keys().next().value);return result;
}
g.NebulaInfill={pockets,plan,nodes,clearance};
})(window);
