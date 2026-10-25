/* Shared client customization: additive, versioned finishes; legacy links stay readable. */
(function(g){'use strict';
const meta=NEBULA_META,C=NebulaConfig.CONFIG,cat=NebulaConfig.CAT;
const airy={url:'assets/client/refinements-oct19/breath-branch-v2.png',width:1430,height:1100,crown:[.51,.48],base:[.51,.85]},wide=airy;
const tuft={url:'assets/client/pink-family/breath-compact-reference-v1.png',width:618,height:588};
const spray={url:'assets/client/refinements-oct19/white-stock-tip.webp',width:535,height:541};
const salmon={url:'assets/client/refinements-oct19/rose-salmon-oblique.webp',width:631,height:510};
const silverTip={url:'assets/client/refinements-oct19/eucalyptus-silver-tip-v2.png',width:1100,height:1430,crown:[.51,.43],base:[.51,.92]};
const pinkBow={url:'assets/client/refinements-oct19/bow-pink-reference-v2.png',width:1091,height:1442};
const pinkReference=s=>s.mode==='dome'&&s.finishes.roseArtwork==='reference-v3';
const detailArt=(s,id)=>id==='satin_bow'&&pinkReference(s)?pinkBow:meta.finishes[id];
const wraps={
 classic:['blush-layered','fan','ivory-upright','kraft-upright','yellow-upright','smoke-upright'],
 dome:['round','ruffle','cocoa','gingham','peach'],heart:['heart']
};
const wrapNames={'blush-layered':['Layered blush paper','Papel rosa en capas'],'smoke-upright':['Smoke-black cellophane','CelofÃ¡n negro humo'],'fan':['Fan folds','Pliegues en abanico'],'ivory-upright':['Ivory folded paper','Papel marfil'],'kraft-upright':['Kraft folded paper','Papel kraft'],'yellow-upright':['Yellow gathered paper','Papel amarillo'],round:['Round folds','Pliegues redondos'],ruffle:['Ivory ruffles','Volantes marfil'],cocoa:['Cocoa folds','Pliegues cacao'],gingham:['Peach gingham','Cuadros durazno'],peach:['Peach & blush folds','Durazno y rosa'],heart:['Heart-shaped wrap','Envoltura de corazÃ³n']};
const bowIds=['satin_bow','satin_black','satin_cocoa','satin_burgundy','satin_sage'];
for(const [id,art,label,es] of [['pumpkin_plush','plush_pumpkin','Pumpkin plush','Peluche de calabaza'],['satin_black','black-bow-tails','Black satin bow','Lazo negro'],['satin_cocoa','bow_cocoa','Cocoa satin bow','Lazo cacao'],['satin_burgundy','ribbon_burgundy','Burgundy satin bow','Lazo burdeos'],['satin_sage','ribbon_sage','Sage satin bow','Lazo verde salvia']]){
 meta.finishes[id]={...meta.finishes[art]};
 C.extrasCents[id]=id==='pumpkin_plush'?C.extrasCents.pumpkin:C.extrasCents.bow;
 NebulaDetails.types[id]={asset:art,price:id,x:id==='pumpkin_plush'?.58:-.3,y:id==='pumpkin_plush'?-.65:.15,scale:1,rotation:0,layer:id==='pumpkin_plush'?'tucked':'front',label,es};
}
const labels={whiteSprays:['White flowering accents','Ramas blancas'],breathBorder:['Babyâ€™s breath wrap','Borde de paniculata'],filler:['Babyâ€™s breath','Paniculata']};
document.addEventListener('DOMContentLoaded',()=>{for(const [id,v] of Object.entries(NebulaDetails.types))if(v.label){NebulaI18n.en[id]=v.label;NebulaI18n.es[id]=v.es;}for(const [k,[en,es]] of Object.entries(labels)){NebulaI18n.en[k]=en;NebulaI18n.es[k]=es;}},{once:true});
const detailValid=NebulaDetails.valid;
NebulaDetails.valid=list=>Array.isArray(list)&&list.length<=10&&new Set(list.map(d=>d?.id)).size===list.length&&list.every(d=>detailValid([d]));
function detailHeight(s,f,d){const bowFit=s.mode==='classic'&&bowIds.includes(d.id)&&g.NebulaClassicWrapping?Math.max(.72,Math.min(1.3,NebulaClassicWrapping.layout(s,f).width/600)):1;return (s.mode==='classic'?(bowIds.includes(d.id)?185*bowFit:145):f.unit*(bowIds.includes(d.id)?(pinkReference(s)&&d.id==='satin_bow'?3.3:1.9):d.id==='pumpkin_plush'?1.45:1.75))*d.scale;}
function neckY(s){if(s.mode==='classic'&&g.NebulaClassicWrapping)return NebulaClassicWrapping.layout(s,s.frames.classic).neckY;if(style(s)==='smoke-upright')return 612;return style(s)==='fan'?638:['ivory-upright','kraft-upright'].includes(style(s))?662:618;}
function giftLayout(s,f){
 const gifts=['snoopy','kitty','pumpkin_plush','snoopy_topper'].filter(id=>s.finishes.decorations.some(d=>d.id===id)).map(id=>{const m=meta.finishes[id];return {id,w:145*m.width/m.height,h:145};});
 if(s.finishes.chocolateBox)gifts.push({id:'chocolate-box',w:220,h:220*NebulaGift.art.height/NebulaGift.art.width});
 const p=paper(s,f),base=p?(p.baseY??p.back.y+p.back.h/2):810,rows=[[]];let width=0;
 for(const a of gifts){if(width&&width+20+a.w>555){rows.push([]);width=0;}rows.at(-1).push(a);width+=a.w+(width?20:0);}
 const out={};let floor=base+24;
 for(const row of rows){const total=row.reduce((v,a)=>v+a.w,0)+Math.max(0,row.length-1)*20;let x=f.center.x-total/2;
  if(gifts.length===1)x=f.center.x+(row[0].id==='chocolate-box'?105:-105)-total/2;
  for(const a of row){out[a.id]={x:x+a.w/2,y:floor-a.h/2,w:a.w,h:a.h,floor};x+=a.w+20;}
  floor+=Math.max(145,...gifts.map(a=>a.h))+24;
 }
 return out;
}
function detailFrame(s,f,d){
 if(s.mode!=='classic')return f;
 if(g.NebulaCelebration?.active(s)&&d.id==='satin_bow')return {center:{x:350,y:440},radius:160};
 const defaults=NebulaDetails.types[d.id],bow=bowIds.includes(d.id),h=detailHeight(s,f,d);
 const gift=bow?null:giftLayout(s,f)[d.id];
 // Gifts form a centered presentation at the paper base. User adjustments
 // remain normalized offsets from that arrangement, not arbitrary corners.
 const p=bow?[f.center.x,neckY(s)+h*(d.id==='satin_bow'?.30:d.id==='satin_black'?.25:.08)]:[gift.x,gift.floor-h/2],radius=bow?35:48;
 return {center:{x:p[0]-defaults.x*radius,y:p[1]-defaults.y*radius},radius};
}
NebulaDetails.nodes=(s,f)=>(s.finishes.decorations||[]).map(d=>{
 const m=detailArt(s,d.id),h=detailHeight(s,f,d),a=detailFrame(s,f,d);
 return {uid:'detail-'+d.id,detailId:d.id,url:m.url,x:a.center.x+d.x*a.radius,y:a.center.y+d.y*a.radius,w:h*m.width/m.height,h,d:h,rot:d.rotation*Math.PI/180,bright:1,tucked:s.mode!=='classic'&&d.layer==='tucked',grounded:s.mode==='classic'&&!bowIds.includes(d.id),z:500};
});
function valid(o,mode){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>['v','breath','sprays','edge','wrap','thistles','buds','positions','placements','breathStems'].includes(k))&&o.v===1&&(o.placements===undefined||g.NebulaFillerOptions.validPlacements(o.placements))&&(o.breathStems===undefined||Number.isInteger(o.breathStems)&&o.breathStems>=0&&o.breathStems<=24)&&(o.buds===undefined||Number.isInteger(o.buds)&&o.buds>=0&&o.buds<=10)&&(o.positions===undefined||g.NebulaFillerOptions.validPositions(o.positions))&&(o.thistles===undefined||typeof o.thistles==='boolean')&&(o.breath===undefined||Number.isInteger(o.breath)&&o.breath>=0&&o.breath<=3)&&(o.sprays===undefined||Number.isInteger(o.sprays)&&o.sprays>=0&&o.sprays<=8)&&(o.edge===undefined||typeof o.edge==='boolean')&&(o.wrap===undefined||wraps[mode].includes(o.wrap));}
function level(s){const o=s.finishes.studio;if(o?.breath!==undefined)return o.breath;return s.finishes.fillerCount?Math.min(3,Math.ceil(s.finishes.fillerCount/4)):0;}
function breathCount(s){if(s.finishes.studio?.breathStems!==undefined)return s.finishes.studio.breathStems;const n=s.items.filter(i=>cat[i.id]?.kind!=='greenery').length;return Math.min(8,Math.ceil(Math.sqrt(n)*.75))*(s.finishes.studio?.breath||0);}
function extras(s){const o=s.finishes.studio||{},out=[],count=breathCount(s);if(count)out.push({id:'filler',quantity:count,totalCents:count*C.extrasCents.filler});if(o.buds)out.push({id:'lily_bud',quantity:o.buds,totalCents:o.buds*cat.lily_bud.priceCents});if(s.mode!=='dome'&&s.finishes.greeneryCount)out.push({id:'interiorGreenery',quantity:s.finishes.greeneryCount,totalCents:s.finishes.greeneryCount*cat.eucalyptus.priceCents});if(o.sprays)out.push({id:'whiteSprays',quantity:o.sprays,totalCents:o.sprays*cat.white_flower_spray.priceCents});if(o.edge)out.push({id:'breathBorder',quantity:8,totalCents:8*C.extrasCents.filler});return out;}
function style(s){return s.finishes.studio?.wrap||(s.mode==='classic'?(g.NebulaSunflower?.active(s)?'yellow-upright':'fan'):s.mode==='heart'?'heart':s.finishes.roseArtwork==='lily-mixed-v1'?'peach':g.NebulaRoseArt?.reference(s)?'gingham':s.finishes.paper==='cocoa'?'cocoa':s.finishes.paper==='ivory'?'ruffle':'round');}
function paper(s,f){
 if(!s.finishes.collar)return null;if(s.mode==='classic'&&g.NebulaClassicWrapping)return NebulaClassicWrapping.layout(s,f);const k=style(s),classic=s.mode==='classic';let m,w,h,x=f.center.x,y=f.center.y,front=null;
 if(classic){
  if(k==='fan'){m=meta.finishes['black-fan-wrap'];w=520;h=w*m.height/m.width;y=810-h/2;front={uid:'paper-front',url:m.url,x,y,w,h,d:w,rot:0,bright:1,paperTone:s.finishes.paper,paperTint:s.finishes.tint,petalMask:'M 0 440 Q 360 610 754 430 L 754 1042 L 0 1042 Z',maskWidth:754,maskHeight:1042};}
  else if(k==='yellow-upright'){m={url:'assets/client/refinements-oct19/wrap-butter-yellow.webp',width:700,height:893};w=560;h=w*893/700;y=840-h/2;front={uid:'paper-front',url:m.url,x,y,w,h,d:w,rot:0,bright:1,petalMask:'M 78 292 Q 350 375 620 291 L 700 893 L 0 893 Z',maskWidth:700,maskHeight:893};}
  else{const base=k==='kraft-upright'?'kraft':'ivory';m={url:'assets/classic/wrap-'+base+'-back.webp',width:896,height:1200};w=650;h=w*1200/896;y=430;front={uid:'paper-front',url:'assets/classic/wrap-'+base+'-front.webp',x,y,w,h,d:w,rot:0,bright:1};}
 }else{
  m=k==='gingham'?{url:'assets/client/pink-family/wrap-gingham-ivory-reference-v1.png',width:899,height:899}:k==='peach'?{url:'assets/client/lily-family/wrap-peach-blush.webp',width:855,height:786}:k==='ruffle'?meta.collars.domeIvory:k==='cocoa'?meta.collars.domeCocoa:meta.collars[s.mode];
  w=k==='peach'||k==='gingham'?(f.radius+f.unit*.46)*2.65:Math.min(684,(f.radius+f.unit*.78)*2.1);h=w*m.height/m.width;
 }
 if(front&&s.finishes.paper!=='ivory'){front.paperTone=s.finishes.paper;front.paperTint=s.finishes.tint;}
 return {back:{uid:'paper',url:m.url,x,y,w,h,d:w,rot:0,bright:1,untinted:['gingham','peach','yellow-upright','kraft-upright'].includes(k)&&s.finishes.paper==='ivory'},front};
}
function assets(s){const o=s.finishes.studio,urls=[];if(NebulaMidnightArt.active(s)&&s.items.some(n=>n.id==='lily'))urls.push(NebulaMidnightArt.lily.url);if(NebulaMidnightArt.thistleCount(s))urls.push(NebulaMidnightArt.thistle.url);if(s.finishes.greeneryCount)urls.push(silverTip.url);if(o?.buds)urls.push('assets/client/celebration/lily-bud.png');if(o?.breath||o?.edge||s.finishes.fillerCount)urls.push(airy.url,wide.url,tuft.url);if(o?.sprays)urls.push(spray.url);if(s.mode==='classic'&&s.items.some(i=>i.id==='rose_pink'))urls.push(salmon.url);if(s.finishes.initial)urls.push('assets/client/lettering-oct20/white-florets.png');for(const d of s.finishes.decorations||[])urls.push(detailArt(s,d.id).url);if(o?.wrap||s.mode==='classic'){const p=paper(s,s.frames[s.mode]);if(p){urls.push(p.back.url);if(p.front)urls.push(p.front.url);}}return urls;}
function borderScatter(s,sc,count){
 const f=sc.frame,flowers=sc.nodes.filter(n=>!n.decorative),out=[];
 if(!flowers.length)return out;
  // Follow the actual silhouette along each ray, including the heart notch.
  // A support-point/extreme-flower approach repeats the same few outer heads.
  for(let i=0;i<count;i++){const a=-Math.PI/2+i/count*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);let far=0;
   for(const n of flowers){const rx=n.w*.43,ry=n.h*.43,ox=f.center.x-n.x,oy=f.center.y-n.y,A=dx*dx/(rx*rx)+dy*dy/(ry*ry),B=2*(ox*dx/(rx*rx)+oy*dy/(ry*ry)),D=B*B-4*A*(ox*ox/(rx*rx)+oy*oy/(ry*ry)-1);if(D>=0)far=Math.max(far,(-B+Math.sqrt(D))/(2*A));}
   if(far>0){const x=f.center.x+dx*(far+f.unit*.035),y=f.center.y+dy*(far+f.unit*.035);out.push({x,y,z:y-f.unit*.15,rot:a});}
  }return out;
}
function classicFlowers(s,nodes){
 const f=s.frames.classic,sc={nodes};
 sc.nodes=sc.nodes.map(n=>{const m=meta.flowers[n.id];if(n.id==='sunflower')return NebulaSunflower.flower(n,f.center.x);if(n.id==='lily')return NebulaMidnightArt.flower(s,n);if(n.decorative||!m?.classicAvailable)return n;if(m.heads?.length>1&&NebulaClassic.active(s))return n;const w=n.d;return {...n,url:n.id==='rose_pink'?salmon.url:m.classicBloom,w,h:w*(n.id==='rose_pink'?salmon.height/salmon.width:m.bloomHeight/m.bloomWidth),rot:(n.x-f.center.x)/1600,z:n.y};});
 g.NebulaCrimson?.flowers(s,sc);g.NebulaCelebration?.flowers(s,sc);return sc.nodes;
}
function complete(s,sc){
 const f=sc.frame,o=s.finishes.studio||{};
 sc.classicPaper=s.mode==='classic';
 if(s.mode==='classic')sc.nodes=classicFlowers(s,sc.nodes);
 // Fillers fit around the authored flowers without changing their size.
 let paperFront=null;
 if(o.wrap||s.mode==='classic'){const p=paper(s,f);sc.collar=p?.back||null;sc.finishes=sc.finishes.filter(n=>!['sunflower-front-paper','paper-front'].includes(n.uid));if(p?.front)paperFront={...p.front,z:10000};}
 if(s.mode==='classic'){const ribbon=sc.finishes.find(n=>n.uid==='ribbon');if(ribbon)ribbon.y=neckY(s)+ribbon.h*(s.finishes.ribbon==='blush'?.3:.08);}
 const fillerCount=o.breath!==undefined?breathCount(s):(s.finishes.fillerCount||0),greenCount=s.finishes.greeneryCount||0;
 const packed=NebulaInfill.nodes(sc,{mode:s.mode,breath:fillerCount,level:level(s),sprays:o.sprays||0,greenery:greenCount,thistles:NebulaMidnightArt.thistleCount(s)},{airy,wide,tuft,spray,greens:[silverTip],thistle:NebulaMidnightArt.thistle});
 const added=g.NebulaFillerOptions?NebulaFillerOptions.compose(s,sc,packed.all):[...packed.all];
 sc.filler=(sc.filler||[]).filter(n=>!n.uid.startsWith('filler-')&&n.url!==NebulaMidnightArt.thistle.url);
 if(s.mode==='dome')sc.greenery=packed.greenery;
 if(o.edge)borderScatter(s,sc,16).forEach((p,i)=>{const m=i%2?airy:wide,w=f.unit*.62;added.push({...p,uid:'breath-edge-'+i,url:m.url,w,h:w*m.height/m.width,d:w,bright:1,softDetail:true,infill:true,infillKind:'breath-border'});});
 if(o.buds||o.breath!==undefined||fillerCount||greenCount||o.sprays||o.edge||NebulaMidnightArt.thistleCount(s)||s.mode==='classic'){
  const old=(sc.layeredFlowers||[]).filter(n=>!sc.nodes.some(f=>f.uid===n.uid)&&!n.parentFiller&&!n.uid.startsWith('filler-')&&n.url!==NebulaMidnightArt.thistle.url&&!(s.mode==='dome'&&n.uid.startsWith('greenery-'))).map(n=>paperFront&&n.parentFlower?{...n,z:-1000,clipBottom:Math.max(...sc.nodes.map(f=>f.y+f.h*.38))}:n);
  sc.layeredFlowers=[...sc.nodes,...old,...(!sc.layeredFlowers?[...(s.mode==='dome'?[]:sc.greenery||[]),...(sc.filler||[])]:[]),...(paperFront?[paperFront]:[]),...added].sort((a,b)=>(a.z??a.y)-(b.z??b.y));
 }
 // Reconstruct from stored drag coordinates after legacy automatic face-clearance rules.
 const details=NebulaDetails.nodes(s,f);sc.finishes=sc.finishes.filter(n=>!n.detailId).concat(details);
}
function beforeDetail(s,id){if(id==='pumpkin_plush')s.finishes.pumpkin=false;if(bowIds.includes(id)){s.finishes.bow=false;s.finishes.spookyBow=false;s.finishes.ribbon='none';s.finishes.decorations=s.finishes.decorations.filter(d=>!bowIds.includes(d.id));}}
function placeDetail(s,d){if(s.mode!=='classic'&&bowIds.includes(d.id)){d.x=pinkReference(s)?-.38:-.52;d.y=pinkReference(s)?0:.68;d.scale=pinkReference(s)?1.15:1;d.rotation=-10;}else if(s.mode!=='classic'){const others=s.finishes.decorations.filter(n=>n.id!==d.id&&!bowIds.includes(n.id));if(others.some(n=>Math.hypot(n.x-d.x,n.y-d.y)<.75)){const p=[[-.65,-.65],[.65,-.65],[0,-1],[0,.15]].find(([x,y])=>others.every(n=>Math.hypot(n.x-x,n.y-y)>=.75));if(p)[d.x,d.y]=p;}}return d;}
g.NebulaCustomization={classicFlowers,valid,extras,assets,complete,beforeDetail,placeDetail,detailFrame,giftLayout,neckY,wraps,wrapNames,style,paper,level,breathCount,bowIds};
})(window);
