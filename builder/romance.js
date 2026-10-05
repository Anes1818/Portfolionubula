/* Year-round recipes and counted romantic details. Reuses the existing 2D renderer. */
(function(g){'use strict';
const recipes=[
 {id:'pink-promise',en:'Pink Promise',es:'Promesa rosa',description:'Blush roses and a cloud of baby’s breath.',descriptionEs:'Rosas rosa suave y una nube de paniculata.',count:44},
 {id:'written-in-roses',en:'Written in Roses',es:'Escrito en rosas',description:'Red roses, dark paper and their initial in flowers.',descriptionEs:'Rosas rojas, papel oscuro y su inicial en flores.',count:44},
 {id:'always-you',en:'Always You',es:'Siempre tú',description:'Red roses with little pockets of eucalyptus.',descriptionEs:'Rosas rojas con toques de eucalipto.',count:30}
];
function create(id){
 const r=recipes.find(r=>r.id===id)||recipes[0],M=g.NebulaModel,s=M.defaultMode('dome');M.resize(s,r.count);
 s.template.layout='organic';s.template.palette=[r.id==='pink-promise'?'rose_pink':'rose_red'];s.template.accent.count=0;s.template.overrides={};
 Object.assign(s.finishes,{paper:r.id==='written-in-roses'?'black':'ivory',sash:'none',fillerCount:r.id==='pink-promise'?12:r.id==='always-you'?6:0,
  greeneryCount:r.id==='always-you'?6:0,initial:r.id==='written-in-roses'?'A':''});
 s.title=r.en;M.syncTemplate(s);return s;
}
function greenery(s,f,flowers){
 if(s.mode!=='dome'||!s.finishes.greeneryCount)return [];
 const points=NebulaDetails.filler({...s,finishes:{...s.finishes,fillerCount:12,fillerPattern:'scatter'}},f,flowers);
 const m=NEBULA_META.flowers.eucalyptus;
 return points.slice(0,s.finishes.greeneryCount).map((_,i)=>{
  const p=points[(i*5+2)%points.length],h=f.unit*1.65,w=h*m.bloomWidth/m.bloomHeight;
  return {...p,uid:'greenery-'+i,url:m.classicBloom,w,h,d:h,rot:Math.atan2(p.y-f.center.y,p.x-f.center.x)+Math.PI/2};
 });
}
// Text geometry is cached independently of position, scale and ribbon edits.
// Existing branching sprigs provide a working texture until a dense tuft is supplied.
const initialCache=new Map();
function initialCanvas(letter,R){
 if(initialCache.has(letter))return initialCache.get(letter);
 const src=NEBULA_META.finishes['breath-airy'],im=R.image(src.url);if(!im)return null;
 const cv=document.createElement('canvas');cv.width=320;cv.height=360;const ctx=cv.getContext('2d');
 const mask=document.createElement('canvas');mask.width=320;mask.height=360;const mc=mask.getContext('2d');
 mc.font='bold 290px Georgia, serif';mc.textAlign='center';mc.textBaseline='alphabetic';
 const metrics=mc.measureText(letter),fit=Math.min(1,280/(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)),cx=160+(metrics.actualBoundingBoxLeft-metrics.actualBoundingBoxRight)*fit/2;
 mc.save();mc.translate(cx,0);mc.scale(fit,1);mc.fillText(letter,0,282);mc.restore();
 const pixels=mc.getImageData(0,0,320,360).data,crop=NEBULA_META.crops[src.url];
 for(let y=12;y<340;y+=6)for(let x=12;x<308;x+=6){
  if(pixels[(y*320+x)*4+3]<128)continue;
  ctx.save();ctx.translate(x+Math.sin(x+y)*2,y+Math.cos(x-y)*2);ctx.rotate(Math.sin(x*.7+y)*Math.PI);ctx.drawImage(im,...crop,-12,-12,24,24);ctx.restore();
 }
 // Keep each sprig's natural silhouette at the edges instead of cutting a flat
 // font outline. The mask chooses anchors only; flower alpha draws the letter.
 initialCache.set(letter,cv);return cv;
}
function initialNode(s,f){
 const a=s.finishes;if(s.mode!=='dome'||!a.initial)return null;
 const h=f.radius*1.65*a.initialScale;
 return {uid:'floral-initial',url:'initial '+a.initial,x:f.center.x,y:f.center.y+a.initialOffset*f.radius,w:h*320/360,h,d:h,rot:0,bright:1,z:600};
}
g.NebulaRomance={recipes,create,greenery,initialCanvas,initialNode};
})(window);
