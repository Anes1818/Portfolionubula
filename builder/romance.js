/* Year-round recipes and counted romantic details. Reuses the existing 2D renderer. */
(function(g){'use strict';
const root='assets/romance/',meta=g.NEBULA_META;
const artwork={'eucalyptus-sparse-a':[1081,587],'eucalyptus-sparse-b':[1099,571],'rose-red-cup-a':[598,599],'rose-red-cup-b':[669,601]};
for(const [name,[w,h]] of Object.entries(artwork)){
 const url=root+name+'.webp';meta.crops[url]=[0,0,w,h];
 if(name.startsWith('eucalyptus'))meta.finishes[name]={url,width:w,height:h};
}
meta.flowers.rose_red.romanceHeads=['rose-red-cup-a','rose-red-cup-b'].map(n=>root+n+'.webp');
const recipes=[
 {id:'pink-promise',en:'Pink Promise',es:'Promesa rosa',description:'Blush roses and a cloud of baby’s breath.',descriptionEs:'Rosas rosa suave y una nube de paniculata.',count:44},
 {id:'written-in-roses',en:'Written in Roses',es:'Escrito en rosas',description:'Red roses, dark paper and their initial in flowers.',descriptionEs:'Rosas rojas, papel oscuro y su inicial en flores.',count:44},
 {id:'always-you',en:'Always You',es:'Siempre tú',description:'Sixteen roses, loosely gathered with eucalyptus and baby’s breath.',descriptionEs:'Dieciséis rosas con eucalipto y paniculata en un ramo suelto.',count:16}
];
function create(id){
 const r=recipes.find(r=>r.id===id)||recipes[0],M=g.NebulaModel,s=M.defaultMode('dome');M.resize(s,r.count);
 s.template.layout=r.id==='always-you'?'garden':'organic';s.template.palette=[r.id==='pink-promise'?'rose_pink':'rose_red'];s.template.accent.count=0;s.template.overrides={};
 Object.assign(s.finishes,{paper:r.id==='written-in-roses'?'black':'ivory',sash:'none',fillerCount:r.id==='pink-promise'?12:r.id==='always-you'?6:0,
  greeneryCount:r.id==='always-you'?5:0,initial:r.id==='written-in-roses'?'A':''});
 s.title=r.en;M.syncTemplate(s);return s;
}
function greenery(s,f,flowers){
 if(s.mode!=='dome'||!s.finishes.greeneryCount)return [];
 if(s.template.layout==='garden'){
  // The lower part of each branch is covered by the next row of petals.
  // Distributed shoulder and interior placements, never a stripe across faces.
  const spots=[[-.57,-.72,-.42],[.73,-.56,.52],[-.94,.12,-.82],[.81,.45,.75],[.06,.19,-.26],[.08,-.82,.12],[-.44,.58,-.65],[.85,-.04,.92],[-.27,-.23,-.35],[.32,.04,.28],[-.7,-.28,-.65],[.35,.66,.54]];
  return spots.slice(0,s.finishes.greeneryCount).map(([x,y,turn],i)=>{
   const m=meta.finishes['eucalyptus-sparse-'+(i%2?'b':'a')],w=f.unit*1.65,h=w*m.height/m.width;
   // Source branches point upper-right. Aim tips outwards; real petal alpha
   // hides the inward stem end when the following flower layer is drawn.
   const rot=i===4?-1.2:Math.atan2(y,x)+.45+turn*.12;
   const cy=f.center.y+y*f.radius,baseY=cy-w*.45*Math.sin(rot)+h*.40*Math.cos(rot);
   return {uid:'greenery-'+i,url:m.url,x:f.center.x+x*f.radius,y:cy,w,h,d:w,rot,bright:1,z:Math.min(cy,baseY)-f.unit*.10};
  });
 }
 const points=NebulaDetails.filler({...s,finishes:{...s.finishes,fillerCount:12,fillerPattern:'scatter'}},f,flowers);
 return points.slice(0,s.finishes.greeneryCount).map((_,i)=>{
  const p=points[(i*5+2)%points.length],m=meta.finishes['eucalyptus-sparse-'+(i%2?'b':'a')],w=f.unit*1.45,h=w*m.height/m.width;
  return {...p,uid:'greenery-'+i,url:m.url,w,h,d:w,rot:Math.atan2(p.y-f.center.y,p.x-f.center.x)+.45};
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
const assetsReady=location.protocol==='file:'?new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='romance-embedded.js';script.onload=resolve;script.onerror=()=>reject(new Error('Romantic artwork bundle unavailable'));document.head.append(script);}):Promise.resolve();
g.NebulaRomance={recipes,create,greenery,initialCanvas,initialNode,assetsReady};
})(window);
