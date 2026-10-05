/* Fixed-view autumn details. Positions are relative to the bouquet, not the screen. */
(function(g){'use strict';
const root='assets/fall/',meta=g.NEBULA_META;
const spec={
 'breath-airy':[372,59,665,649], 'breath-wide':[227,59,944,650],
 'plush-snoopy':[0,0,407,595], 'topper-snoopy':[0,0,348,495],
 'mum-burgundy':[0,0,921,953], 'rose-caramel':[0,0,905,849], 'plush-kitty':[0,0,371,593]
};
for(const [name,box] of Object.entries(spec))meta.crops[root+name+'.webp']=box;
for(const [id,name] of [['rose_caramel','rose-caramel'],['mum_burgundy','mum-burgundy']]){
 const box=spec[name];meta.flowers[id]={head:root+name+'.webp',headWidth:box[2],headHeight:box[3],headRadius:.5,headView:'overhead',classicAvailable:false};
}
const types={
 snoopy:{asset:'plush-snoopy',price:'snoopy',x:-.6,y:-.82,scale:1,rotation:-8,layer:'tucked'},
 kitty:{asset:'plush-kitty',price:'kitty',x:.6,y:-.82,scale:1,rotation:8,layer:'tucked'},
 snoopy_topper:{asset:'topper-snoopy',price:'snoopy_topper',x:0,y:.05,scale:1,rotation:0,layer:'front'}
};
for(const [id,v] of Object.entries(types)){const box=spec[v.asset];meta.finishes[id]={url:root+v.asset+'.webp',width:box[2],height:box[3]};}
for(const name of ['breath-airy','breath-wide'])meta.finishes[name]={url:root+name+'.webp',width:spec[name][2],height:spec[name][3]};
function create(id){const v=types[id];return v?{id,x:v.x,y:v.y,scale:v.scale,rotation:v.rotation,layer:v.layer}:null;}
function valid(list){return Array.isArray(list)&&list.length<=3&&new Set(list.map(d=>d?.id)).size===list.length&&list.every(d=>d&&Object.hasOwn(types,d.id)&&Number.isFinite(d.x)&&Math.abs(d.x)<=1&&Number.isFinite(d.y)&&d.y>=-1.15&&d.y<=1&&Number.isFinite(d.scale)&&d.scale>=.7&&d.scale<=1.5&&Number.isFinite(d.rotation)&&Math.abs(d.rotation)<=45&&['tucked','front'].includes(d.layer));}
function nodes(s,f){if(s.mode!=='dome')return [];return (s.finishes.decorations||[]).map(d=>{const m=meta.finishes[d.id],height=f.unit*(d.id==='snoopy_topper'?1.8:2.5)*d.scale;return {uid:'detail-'+d.id,detailId:d.id,url:m.url,x:f.center.x+d.x*f.radius,y:f.center.y+d.y*f.radius,w:height*m.width/m.height,h:height,d:height,rot:d.rotation*Math.PI/180,bright:1,tucked:d.layer==='tucked',z:500};});}
const fillerCache=new Map();
function filler(s,f,flowers){
 const count=s.mode==='dome'?s.finishes.fillerCount||0:0;if(!count)return [];
 if(s.finishes.fillerPattern==='border'){
  // An explicit count distributed around the circumference, with no added stems.
  return Array.from({length:count},(_,i)=>{
   const angle=-Math.PI/2+i*Math.PI*2/count,m=meta.finishes[i%2?'breath-wide':'breath-airy'];
   const w=Math.min(f.unit*1.25,Math.PI*2*f.radius/Math.max(6,count)*1.35);
   return {uid:'filler-'+i,url:m.url,x:f.center.x+Math.cos(angle)*(f.radius+f.unit*.18),y:f.center.y+Math.sin(angle)*(f.radius+f.unit*.18),w,h:w*m.height/m.width,d:w,rot:angle,bright:1,decorative:true};
  });
 }
 // A fixed candidate field + greedy spacing gives a stable prefix: adding a
 // sprig never shuffles existing ones. Text, toys and ribbon are not inputs.
 const key=JSON.stringify([s.seed,f.radius,f.unit,flowers.map(n=>[n.x,n.y,n.d])]);
 if(!fillerCache.has(key)){
  const candidates=[];
  for(let i=0;i<500;i++){
   const angle=i*2.3999632297+s.seed*.13,r=f.radius*Math.sqrt((i+.5)/500)*.99;
   const x=f.center.x+Math.cos(angle)*r,y=f.center.y+Math.sin(angle)*r;
   const clearance=Math.min(...flowers.map(n=>Math.hypot(x-n.x,y-n.y)/n.d));
   if(clearance>.29)candidates.push({x,y,clearance});
  }
  const placed=[];
  for(let i=0;i<12&&candidates.length;i++){
   let best=0,score=-Infinity;
   candidates.forEach((p,j)=>{const spacing=placed.length?Math.min(...placed.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))/f.unit:1;
    const value=Math.min(p.clearance,.62)+Math.min(spacing,2)*.55;
    if(value>score){score=value;best=j;}});
   const p=candidates.splice(best,1)[0],m=meta.finishes[i%2?'breath-wide':'breath-airy'],w=f.unit*(i%2?.98:.72);
   placed.push({...p,uid:'filler-'+i,url:m.url,w,h:w*m.height/m.width,d:w,rot:Math.sin(i*2.4+s.seed)*1.2,bright:1,decorative:true});
  }
  fillerCache.set(key,placed);if(fillerCache.size>80)fillerCache.delete(fillerCache.keys().next().value);
 }
 return fillerCache.get(key).slice(0,count);
}
g.NebulaDetails={types,create,valid,nodes,filler};
})(window);
