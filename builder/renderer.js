/* Preview, picking, alpha QA and PNG export use the same scene, assets and transforms.
   Classic uses aligned photographic layers. No synthetic paper, paid filler or flowers are inserted. */
(function(g){'use strict';
const G=NebulaGeometry,M=NebulaModel,cache=new Map(),tintCache=new Map(),alphaCache=new Map();
const makeCanvas=(w=720,h=820)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
/* The ivory photograph is the one real Classic wrap. Every other tone is a digital
   recolour of it, so only ivory is exempt from tinting. Extra photographed papers
   are resampled onto the ivory's paper box at build time, which is why adding one
   back here needs no change to classicFrame's measured constants. */
const PHOTO_PAPERS=['ivory'];
const BRAND_LOGO=NebulaConfig.CONFIG.logo||'assets/brand/logo-full.webp';
function wrapLayers(paper){const W=NEBULA_META.wraps;return (W&&W[paper])||{back:NEBULA_META.wrap.back,front:NEBULA_META.wrap.front};}
const source=path=>(g.NEBULA_EMBED&&g.NEBULA_EMBED[path])||path;
/* ---------------------------------------------------------------------------
   Lazy artwork decoding.
   Decoding all 93 embedded images before first paint costs ~29.6 megapixels and
   ~113 MB of bitmap memory, while the opening screen needs about eight of them.
   So: decode the selected design up front, request other artwork on demand, and
   let a frame skip anything still in flight - a repaint follows the moment it lands.
   Export is the exception: a PNG must never be missing a bloom, so blob()/
   awaitAssets() await every asset their design uses before drawing.
   --------------------------------------------------------------------------- */
let onAssetReady=null,repaintQueued=false;
function announce(){if(repaintQueued||!onAssetReady)return;repaintQueued=true;requestAnimationFrame(()=>{repaintQueued=false;if(onAssetReady)onAssetReady();});}
/* Synthetic keys (a personalised sash) are composed in memory, never fetched.
   Guarding here rather than at each call site keeps hit-testing and the idle
   preloader from trying to treat one as a file path. */
function load(path){if(typeof path==='string'&&(path.startsWith('sashtext ')||path.startsWith('initial ')))return Promise.resolve(null);
 if(!cache.has(path)){const im=new Image();let retried=false;const promise=new Promise((resolve,reject)=>{im.onload=()=>{resolve(im);announce();};im.onerror=()=>{if(!retried){retried=true;setTimeout(()=>{im.src=source(path);},180);return;}if(cache.get(path)?.im===im)cache.delete(path);reject(new Error('Artwork failed to load: '+path));};});cache.set(path,{im,promise});im.src=source(path);}return cache.get(path).promise;}
function decoded(path){const it=cache.get(path);return it&&it.im.complete&&it.im.naturalWidth?it.im:null;}
/* Returns null instead of throwing when the artwork has not decoded yet; every
   drawing call site treats null as "skip this element and repaint shortly". */
/* Personalised sashes are drawn once into an offscreen canvas and cached, then
   handed back through image() under a synthetic key. Every draw site already
   treats the result as an image, so nothing downstream has to know. */
const sashCache=new Map();
function drawAsset(ctx,im,url,x,y,w,h){const crop=NEBULA_META.crops?.[url];if(crop)ctx.drawImage(im,...crop,x,y,w,h);else ctx.drawImage(im,x,y,w,h);}
function sashWithText(key){
 if(sashCache.has(key))return sashCache.get(key);
 /* Only the first two segments are fixed; the rest is the message, which may
    itself contain spaces, so it is taken as one remainder. */
 const rest=key.slice(9),sp=rest.indexOf(' ');
 const band=sp<0?rest:rest.slice(0,sp),text=sp<0?'':rest.slice(sp+1);
 const m=NEBULA_META.finishes['sash_blank_'+band];
 if(!m)return null;
 const base=decoded(m.url);
 if(!base){load(m.url).catch(()=>{});return null;}
 const cv=makeCanvas(m.width,m.height),ctx=cv.getContext('2d');
 drawAsset(ctx,base,m.url,0,0,m.width,m.height);
 const words=String(text||'').slice(0,28);
 if(words){
  /* The bow sits on the left, so the writing is centred on the clear run of satin. */
  const left=m.width*(band==='cocoa'?.2:.26),right=m.width*(band==='cocoa'?.90:.97),mid=(left+right)/2;
  let size=Math.round(m.height*0.52);
  ctx.textAlign='center';ctx.textBaseline='middle';
  do{ctx.font=(band==='halloween'?'bold ':'italic ')+size+'px Georgia, "Times New Roman", serif';size-=1;}
  while(size>8&&ctx.measureText(words).width>right-left);
  ctx.fillStyle=band==='halloween'?'#fffaf0':band==='champagne'?'#8a6a2f':band==='cocoa'?'#fff6e5':'#e8c874';
  ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=2;ctx.shadowOffsetY=1;
  ctx.fillText(words,mid,m.height*0.5);
 }
 if(sashCache.size>80)sashCache.delete(sashCache.keys().next().value);
 sashCache.set(key,cv);
 return cv;
}
function image(path){
 if(typeof path==='string'&&path.startsWith('initial '))return NebulaRomance.initialCanvas(path.slice(8),g.NebulaRenderer);
 if(typeof path==='string'&&path.startsWith('sashtext '))return sashWithText(path);
 const im=decoded(path);if(im)return im;load(path).catch(()=>{});return null;
}
const thumbnailCache=new Map();
function thumbnail(path){const crop=NEBULA_META.crops?.[path];if(!crop)return source(path);if(thumbnailCache.has(path))return thumbnailCache.get(path);const im=decoded(path);if(!im)return source(path);const w=160,h=160*crop[3]/crop[2],cv=makeCanvas(w,h);drawAsset(cv.getContext('2d'),im,path,0,0,cv.width,cv.height);const url=cv.toDataURL('image/png');thumbnailCache.set(path,url);return url;}
function wrapAssets(){const u=[NEBULA_META.wrap.back,NEBULA_META.wrap.front,BRAND_LOGO];for(const v of Object.values(NEBULA_META.wraps||{})){u.push(v.back,v.front);}return u;}
/* Everything a single design can draw: wrap, its collar, finishes and its own flowers. */
function assetsFor(s){
 if(g.NebulaPhoto?.active(s))return new Set([...NebulaPhoto.assets(s),BRAND_LOGO]);
 const urls=new Set(wrapAssets());
 if(g.NebulaCustomization)for(const url of NebulaCustomization.assets(s))urls.add(url);
 if(g.NebulaGift)for(const url of NebulaGift.assets(s))urls.add(url);
 if(g.NebulaCrimson)for(const url of NebulaCrimson.assets(s))urls.add(url);
 if(g.NebulaSunflower)for(const url of NebulaSunflower.assets(s))urls.add(url);
 if(g.NebulaRoseArt)for(const url of NebulaRoseArt.assets(s))urls.add(url);
 if(g.NebulaClassic?.active(s)){
  urls.add(NebulaClassic.paper(s).url);
  if(s.finishes.greenRim)for(const key of ['eucalyptus-sparse-a','eucalyptus-sparse-b'])urls.add(NEBULA_META.finishes[key].url);
 }
 if(g.NebulaSpooky)for(const url of NebulaSpooky.assetsFor(s))urls.add(url);
 const f=s?.finishes;
 if(f){
  const keys=[f.ribbon!=='none'&&s.mode==='classic'?'ribbon_'+f.ribbon:null,f.sash!=='none'?'sash_'+f.sash:null,f.butterfly?'extra_butterfly_gold':null,f.crown?'extra_crown_gold':null,f.bow&&s.mode==='dome'?'bow_cocoa':null,f.pumpkin&&s.mode==='dome'?'plush_pumpkin':null];
  for(const key of keys)if(NEBULA_META.finishes[key])urls.add(NEBULA_META.finishes[key].url);
  if(s.mode!=='classic'){const collar=collarNode(s,s.frames[s.mode]);if(collar)urls.add(collar.url);}
 }
 if(s?.mode==='dome'){
  for(const d of f.decorations||[])urls.add(NEBULA_META.finishes[d.id].url);
  if(f.greeneryCount)for(const key of ['eucalyptus-sparse-a','eucalyptus-sparse-b'])urls.add(NEBULA_META.finishes[key].url);
  if(f.initial)urls.add(NEBULA_META.finishes['breath-airy'].url);
  if(f.fillerCount)for(const key of ['breath-airy','breath-wide'])urls.add(NEBULA_META.finishes[key].url);
 }
 urls.add(BRAND_LOGO);
 const ids=new Set((s?.items||[]).map(i=>i.id));
 if(s?.mode!=='classic'&&s?.finishes?.greenRim)ids.add('eucalyptus');
 for(const id of ids){const v=NEBULA_META.flowers[id];if(!v)continue;urls.add(v.head);for(const h of v.heads||[])urls.add(h);for(const h of [...(v.domeHeads||[]),...(v.domeEdgeHeads||[]),...(v.romanceHeads||[])])urls.add(h);if(v.classicAvailable){urls.add(v.classicBloom);for(const b of v.classicBlooms||[])urls.add(b);if(v.classicStem)urls.add(v.classicStem);}}
 return urls;
}
/* Await the selected design only; no eager background load of the whole library. */
async function ready(designs){
 await Promise.all([g.NEBULA_EMBED_READY,g.NebulaFall?.assetsReady,g.NebulaRomance?.assetsReady,g.NebulaSpooky?.assetsReady]);
 const urls=new Set();
 for(const s of [].concat(designs||[]))for(const p of assetsFor(s))urls.add(p);
 if(!urls.size)for(const p of assetsFor(null))urls.add(p);
 await Promise.all([...urls].map(load));
 // Unused artwork stays unloaded. image() requests it when an edit needs it.
 return true;
}
async function awaitAssets(s){await Promise.all([g.NEBULA_EMBED_READY,g.NebulaFall?.assetsReady,g.NebulaRomance?.assetsReady,g.NebulaSpooky?.assetsReady]);await Promise.all([...assetsFor(s)].map(load));}
function tint(path,paper,color){
 if(path===NEBULA_META.collars.domeCocoa?.url&&(!g.NebulaCustomization||['ivory','cocoa'].includes(paper)))return image(path);
 if(path===NEBULA_META.collars.domeIvory?.url&&paper==='ivory')return image(path);
 const blackSource=path.includes('wrapping/')||path==='assets/halloween/black-fan-wrap.webp';if((PHOTO_PAPERS.includes(paper)&&!blackSource)||(paper==='black'&&blackSource))return image(path);color=paper==='ivory'?'#e6deca':paper==='black'?'#292826':paper==='cocoa'?'#755247':paper==='blush'?'#dbb3b7':paper==='sage'?'#b1bba1':paper==='kraft'?'#c29a6c':paper==='linen'?'#d8c6a3':color;const key=path+color;if(tintCache.has(key))return tintCache.get(key);
 const im=image(path);if(!im)return null;const cv=makeCanvas(im.width,im.height),ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,cv.width,cv.height),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 // Lift black-paper shadows into the chosen pigment without clipping its folds to white.
 for(let i=0;i<d.data.length;i+=4){if(!d.data[i+3])continue;const light=d.data[i]*.2126+d.data[i+1]*.7152+d.data[i+2]*.0722,lum=blackSource?.42+.58*Math.sqrt(light/255):light/224;for(let j=0;j<3;j++)d.data[i+j]=Math.min(255,rgb[j]*lum);}ctx.putImageData(d,0,0);tintCache.set(key,cv);return cv;
}
function nodeDraw(ctx,n,{shadow=true,alpha=false}={}){const im=n.paperTone?tint(n.url,n.paperTone,n.paperTint):image(n.url);if(!im)return;ctx.save();if(Number.isFinite(n.clipBottom)){ctx.beginPath();ctx.rect(-2000,-2000,4000,n.clipBottom+2000);ctx.clip();}ctx.translate(n.x,n.y);if(n.grounded&&!alpha){ctx.save();ctx.translate(0,n.h*.49);ctx.scale(1,.10);const gr=ctx.createRadialGradient(0,0,0,0,0,n.w*.5);gr.addColorStop(0,'rgba(50,35,22,.16)');gr.addColorStop(1,'rgba(50,35,22,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,n.w*.5,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.rotate(n.rot);if(n.flipX)ctx.scale(-1,1);if(n.petalMask){const matrix=ctx.getTransform();ctx.scale(n.w/n.maskWidth,n.h/n.maskHeight);ctx.translate(-n.maskWidth/2,-n.maskHeight/2);ctx.clip(new Path2D(n.petalMask));ctx.setTransform(matrix);}if(!alpha){ctx.filter=n.bright!==1?'brightness('+n.bright+')':'none';if(shadow){ctx.shadowColor='rgba(42,36,24,.20)';ctx.shadowBlur=2.2;ctx.shadowOffsetY=1.5;}}drawAsset(ctx,im,n.url,-n.w/2,-n.h/2,n.w,n.h);ctx.restore();}
function collarNode(s,f){
 const referencePaper=g.NebulaRoseArt?.paper(s,f);if(referencePaper)return referencePaper;
 if(g.NebulaClassic?.active(s))return s.finishes.collar===false?null:NebulaClassic.paper(s);
 if(g.NebulaSpooky?.active(s))return NebulaSpooky.collar(s,f);
 if(s.mode==='classic'||s.finishes.collar===false)return null;
 if(s.mode==='dome'&&s.finishes.paper==='cocoa'){const m=NEBULA_META.collars.domeCocoa,w=(f.radius+f.unit*.12)/.313;return {uid:'paper',url:m.url,x:f.center.x,y:f.center.y,w,h:w,rot:0,d:w,bright:1};}
 const m=(s.mode==='dome'&&s.finishes.paper==='ivory'&&NEBULA_META.collars.domeIvory)||NEBULA_META.collars[s.mode];
 const ruffle=m===NEBULA_META.collars.domeIvory,garden=s.template?.layout==='garden',w=Math.min(684,(f.radius+f.unit*(s.mode==='heart'?.83:garden?.45:.78))*2.10*(ruffle&&!garden?1.16:1));
 return {uid:'paper',url:m.url,x:f.center.x,y:f.center.y,w,h:w*m.height/m.width,rot:0,d:w,bright:1};
}
function finishNodes(s,f,nodes){
 const list=[];function add(key,id,x,y,w,rot=0){const m=NEBULA_META.finishes[id];list.push({uid:key,url:m.url,x,y,w,h:w*m.height/m.width,rot,d:w,bright:1,z:500});}
 const a=s.finishes,classic=s.mode==='classic',extent=nodes.length?Math.max(...nodes.map(n=>n.x+n.w*.45))-Math.min(...nodes.map(n=>n.x-n.w*.45)):260;
 /* A ribbon is tied around the stems. Dome and Heart look straight down, where
    there is no stem to tie it to, so the ribbon is Classic only. */
 if(classic&&a.ribbon!=='none')add('ribbon','ribbon_'+a.ribbon,360,f.waist.y+18,110);
 if(a.sash!=='none'){
  /* The sash always spans the bouquet it sits on; there is no width control to
     get wrong. Dome and Heart measure the collar, Classic measures the blooms. */
  const pos=a.sashPlacement||'auto';
  let w=classic?G.clamp(extent*.92,200,470):G.clamp((f.radius+f.unit*.55)*1.92,200,560);
  let x=360,y=classic?f.rimY-44:f.center.y+f.radius*.38,rot=-.035;
  if(pos==='low'){y=classic?(f.rimY+f.waist.y)*.5:f.center.y+f.radius*.70;rot=0;}
  if(pos==='diagonal'){y=classic?f.rimY-52:f.center.y+f.radius*.14;rot=-.20;}
  if(g.NebulaSpooky?.active(s)){w=6.8*f.unit;if(pos==='auto')y=390+.12*f.unit;}
  y+=(a.sashOffset||0)*f.unit/100;
  if(a.sash.startsWith('blank_')){
   const band=g.NebulaSpooky?.active(s)&&a.sash==='blank_blackband'?'halloween':a.sash.slice(6),m=NEBULA_META.finishes['sash_blank_'+band];
   if(m)list.push({uid:'sash',url:'sashtext '+band+' '+(a.sashText||''),
    x,y,w,h:w*m.height/m.width,rot,d:w,bright:1,z:500});
  }else add('sash','sash_'+a.sash,x,y,w,rot);
  if(!classic&&s.mode==='dome'&&a.sash==='blank_cocoa'&&a.bow){const dx=-w*.38,dy=w*.06;add('bow','bow_cocoa',x+dx*Math.cos(rot)-dy*Math.sin(rot),y+dx*Math.sin(rot)+dy*Math.cos(rot),w*.30,rot);}
 }
 /* Butterflies are a count. A florist does not stamp them in a row: the first
    lands high on the right, the second lower on the opposite side, the third
    smaller and turned further - so each added one reads as another butterfly
    rather than a repeat. Slot 1 is byte-for-byte the old single placement, so
    every design saved when this was one on/off switch still draws unmoved.
    The spots dodge the crown (top centre) and the fan (upper left). */
 const BUTTERFLIES=[
  {cx:+.68,cy:-.48,x:468,y:-157,w:95,rot:-.17},
  {cx:-.70,cy:+.34,x:256,y:-100,w:82,rot:+.24},
  {cx:+.42,cy:+.62,x:424,y:-46, w:70,rot:-.40}
 ];
 for(let i=0;i<Math.min(a.butterfly|0,BUTTERFLIES.length);i++){
  const p=BUTTERFLIES[i];
  add('butterfly'+i,'extra_butterfly_gold',
      classic?p.x:360+f.radius*p.cx,
      classic?f.rimY+p.y:390+f.radius*p.cy,
      p.w,p.rot);
 }
 /* A crown is worn: it rides the top edge of the bouquet, centred. */
 if(s.mode==='dome'&&a.pumpkin){const side=({left:-1,center:0,right:1})[a.pumpkinPosition]||0;add('pumpkin','plush_pumpkin',f.center.x+side*f.radius*.64,f.center.y-f.radius*.78,f.unit*2.05*(a.pumpkinScale||1),side*.07);list[list.length-1].tucked=true;}
 if(a.crown)add('crown','extra_crown_gold',360,classic?f.rimY-118:f.center.y-f.radius*.86,classic?230:f.radius*1.05,0);
 if(g.NebulaSpooky)list.push(...NebulaSpooky.finishes(s,f));
 const mask=s.mode==='dome'&&a.spookyMask?list.find(n=>n.url===NEBULA_META.finishes['scream-mask'].url):null;
 const sash=list.find(n=>n.uid==='sash');
 if(mask&&sash){
  // Keep even diagonal bands clear of the whole face. Preserve the user's
  // position setting; switching the mask off returns the sash to that setting.
  const halfHeight=Math.abs(Math.sin(sash.rot))*sash.w/2+Math.abs(Math.cos(sash.rot))*sash.h/2;
  const delta=Math.max(0,mask.y+mask.h/2+8+halfHeight-sash.y);
  sash.y+=delta;const bow=list.find(n=>n.uid==='bow');if(bow)bow.y+=delta;
 }
 const initial=NebulaRomance.initialNode(s,f);return list.concat(NebulaDetails.nodes(s,f),initial?[initial]:[]);
}
function scene(s){if(g.NebulaPhoto?.active(s))return NebulaPhoto.scene(s);const sc=G.nodes(s);if(g.NebulaRoseArt)NebulaRoseArt.apply(s,sc);sc.finishes=finishNodes(s,sc.frame,sc.nodes);sc.collar=collarNode(s,sc.frame);sc.filler=g.NebulaSpooky?NebulaSpooky.filler(s,sc.frame,sc.nodes):NebulaDetails.filler(s,sc.frame,sc.nodes);sc.greenery=NebulaRomance.greenery(s,sc.frame,sc.nodes);g.NebulaRoseArt?.complete(s,sc);g.NebulaSunflower?.complete(s,sc);g.NebulaCustomization?.complete(s,sc);g.NebulaGift?.complete(s,sc);return sc;}
const stemCanvas=makeCanvas();
const sprigCanvas=makeCanvas();
const footprintCache=new Map();
function footprint(n){
 const im=decoded(n.url);if(!im)return null;
 const key=n.url+'|'+(n.petalMask||'');if(footprintCache.has(key))return footprintCache.get(key);
 const cv=makeCanvas(80,80),c=cv.getContext('2d',{willReadFrequently:true});
 nodeDraw(c,{...n,x:40,y:40,w:80,h:80,rot:0,flipX:false},{shadow:false,alpha:true});
 const data=c.getImageData(0,0,80,80).data,result={data,w:80,h:80};footprintCache.set(key,result);return result;
}
function tuckedSprig(ctx,n,flowers){
 // Infill is a complete botanical cutout above the petal canopy. A geometric
 // half-plane cannot distinguish a stem from a leaf: masking it sliced leaves
 // and blossoms in half. Placement, size and source art provide the clearance.
 if(n.infill){nodeDraw(ctx,n,{shadow:false});return;}
 const c=sprigCanvas.getContext('2d');c.clearRect(0,0,720,820);
 nodeDraw(c,n,{shadow:false});
 // A soft occlusion under the rose cups avoids both white florets across
 // the spiral centres and the hard circular cut-outs of the old overlay.
 c.save();c.globalCompositeOperation='destination-out';
 for(const flower of flowers){
  const r=flower.w*.31,gradient=c.createRadialGradient(flower.x,flower.y,r*.50,flower.x,flower.y,r);
  gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=gradient;c.fillRect(flower.x-r,flower.y-r,2*r,2*r);
 }
 c.restore();ctx.drawImage(sprigCanvas,0,0);
}
function classicStemMask(f,backPath){
 const cv=makeCanvas(),c=cv.getContext('2d'),wm=NEBULA_META.wrap,back=image(backPath||NEBULA_META.wrap.back);
 if(back)c.drawImage(back,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));
 const half=wm.width*f.scale*.445;c.fillStyle='#000';c.fillRect(360-half,55,2*half,Math.max(0,f.rimY-55));c.clearRect(0,f.waist.y+8,720,820);return cv;
}
function drawArt(ctx,s,opts={}){
 if(g.NebulaPhoto?.active(s))return NebulaPhoto.draw(ctx,s,opts.scene||scene(s),nodeDraw,opts);
 const sc=opts.scene||scene(s),f=sc.frame;ctx.save();
 if(sc.collar&&!opts.alphaOnly){const n=sc.collar,art=n.untinted?image(n.url):tint(n.url,s.finishes.paper,s.finishes.tint);if(art){ctx.save();ctx.shadowColor='rgba(27,26,22,.16)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.drawImage(art,n.x-n.w/2,n.y-n.h/2,n.w,n.h);ctx.restore();}}
 if(g.NebulaSpooky?.active(s)&&!opts.alphaOnly){
  if(s.template.halloweenRecipe!=='midnight-blooms'&&s.finishes.collar){ctx.save();ctx.fillStyle=s.finishes.paper==='black'?'#151515':s.finishes.paper==='custom'?s.finishes.tint:({ivory:'#b6ad9a',blush:'#ac888b',sage:'#87917a'}[s.finishes.paper]||'#151515');ctx.beginPath();ctx.ellipse(360,390,f.unit*2.55,f.unit*(s.template.halloweenRecipe==='scream-for-you'?3.2:2.55),0,0,Math.PI*2);ctx.fill();ctx.restore();}

 }
 if(!opts.alphaOnly)for(const n of sc.finishes.filter(n=>n.back))nodeDraw(ctx,n,{shadow:s.finishes.paper!=='black'});
 if(s.mode==='classic'&&!g.NebulaClassic?.active(s)&&!opts.alphaOnly){
  const wm=NEBULA_META.wrap,L=wrapLayers(s.finishes.paper);
  const back=tint(L.back,s.finishes.paper,s.finishes.tint),front=tint(L.front,s.finishes.paper,s.finishes.tint);
  if(back){ctx.save();ctx.shadowColor='rgba(85,70,48,.15)';ctx.shadowBlur=12;ctx.shadowOffsetY=7;ctx.drawImage(back,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));ctx.restore();}
  const st=stemCanvas.getContext('2d');st.clearRect(0,0,720,820);
  for(const n of sc.nodes){const m=n.meta;if(!m.classicStem)continue;const stem=image(m.classicStem);if(!stem)continue;const scale=n.w/m.bloomWidth,[cx,cy]=m.bloomCenter;
   // Source-aligned head and neck; no detached, independently sheared stem.
   st.save();st.beginPath();st.rect(0,0,720,f.waist.y+8);st.clip();st.translate(n.x,n.y);st.rotate(n.rot);st.scale(scale,scale);st.translate(-cx,-cy);st.drawImage(stem,0,0);st.restore();
  }
  st.globalCompositeOperation='destination-in';st.drawImage(classicStemMask(f,L.back),0,0);st.globalCompositeOperation='source-over';ctx.drawImage(stemCanvas,0,0);if(front)ctx.drawImage(front,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));
 }
 if(opts.guides&&sc.slots?.length){for(const p of sc.slots)if(!p.uid){ctx.save();ctx.strokeStyle='#557363';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(p.x,p.y,p.near*.32,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p.x-5,p.y);ctx.lineTo(p.x+5,p.y);ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x,p.y+5);ctx.stroke();ctx.restore();}}
 const garden=s.template?.layout==='garden';
 const stems=sc.layeredFlowers&&!opts.alphaOnly?sc.layeredFlowers:garden&&!opts.alphaOnly?[...sc.nodes,...(sc.greenery||[]),...(sc.filler||[]).map(n=>({...n,z:n.y+f.unit*.20}))].sort((a,b)=>a.z-b.z):sc.nodes;
 for(const n of stems){if((n.infill||n.protectCenters)&&!opts.alphaOnly)tuckedSprig(ctx,n,sc.nodes);else nodeDraw(ctx,n,{shadow:!opts.alphaOnly&&!n.softDetail,alpha:opts.alphaOnly});}
 if(!opts.alphaOnly){
  // Sprigs emerge through petal gaps. Keep flower centres clear, using the
  // same deterministic geometry in preview, gallery and exported artwork.
  if(g.NebulaSpooky?.active(s)&&!sc.layeredFlowers){for(const n of [...sc.greenery||[],...sc.filler||[]])nodeDraw(ctx,n,{shadow:false});}
  else if(!garden&&!sc.layeredFlowers){ctx.save();ctx.beginPath();ctx.rect(-2000,-2000,4000,4000);
  for(const n of sc.nodes){ctx.moveTo(n.x+n.d*.21,n.y);ctx.arc(n.x,n.y,n.d*.21,0,Math.PI*2);}
  ctx.clip('evenodd');for(const n of sc.greenery||[])nodeDraw(ctx,n,{shadow:false});for(const n of sc.filler||[])nodeDraw(ctx,n,{shadow:false});ctx.restore();}
  for(const n of sc.finishes.filter(n=>n.tucked)){nodeDraw(ctx,n);
   // Petal silhouettes tuck the bottom of the toy into the bouquet; never a rectangular cut.
   for(const flower of sc.nodes)if(flower.y-flower.h*.48>n.y+n.h*.18&&flower.y-flower.h*.48<n.y+n.h*.48&&Math.abs(flower.x-n.x)<n.w*.5)nodeDraw(ctx,flower,{shadow:false});}
  for(const n of sc.finishes.filter(n=>!n.tucked&&!n.back))nodeDraw(ctx,n);
 }
 for(const p of opts.moveTargets||[]){ctx.save();ctx.fillStyle='rgba(255,253,246,.90)';ctx.strokeStyle='#335c50';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.markerRadius||16,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-6,p.y);ctx.lineTo(p.x+6,p.y);ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x,p.y+6);ctx.stroke();ctx.restore();}
 if(opts.selected){const n=[...sc.nodes,...sc.finishes].find(n=>n.uid===opts.selected);if(n){ctx.save();ctx.translate(n.x,n.y);ctx.setLineDash([5,5]);ctx.strokeStyle='#335c50';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,n.w/2+8,n.h/2+8,n.rot,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 if(opts.ghost){const n=opts.ghost;ctx.save();ctx.globalAlpha=.55;nodeDraw(ctx,n,{shadow:false});ctx.restore();ctx.strokeStyle='#335c50';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(n.x-5,n.y);ctx.lineTo(n.x+5,n.y);ctx.moveTo(n.x,n.y-5);ctx.lineTo(n.x,n.y+5);ctx.stroke();}
 ctx.restore();return sc;
}
function view(s,camera={}){
 if(camera.lockedView)return {...camera.lockedView};
 if(g.NebulaPhoto?.active(s)){const z=camera.zoom||1,base=s.photographic.version===2?1.38:1;return {scale:base*z,x:360*(1-base*z)+(camera.x||0),y:410*(1-base*z)+(camera.y||0)};}
 let v;
 if(g.NebulaCustomization&&s.mode==='classic'&&(s.finishes.chocolateBox||s.finishes.decorations.length)){const places=Object.values(g.NebulaCustomization.giftLayout(s,s.frames.classic)),secondRow=places.some(p=>p.floor>950),scale=secondRow?.72:.84;v={scale,x:360*(1-scale),y:5};}
 else if(g.NebulaSunflower?.active(s))v={scale:.78,x:79.2,y:-60};
 else if(s.finishes?.chocolateBox||g.NebulaRoseArt?.reference(s)||g.NebulaFall?.active(s)||g.NebulaClassic?.active(s)){const b=artBounds(s,scene(s)),scale=Math.min(680/b.w,770/b.h);v={scale,x:360-(b.x+b.w/2)*scale,y:410-(b.y+b.h/2)*scale};}
 else if(s.mode==='classic'){
  v={scale:1.30,x:-108,y:-188};
  // Enlarge compact bouquets, but keep the original framing for tall or wide
  // manually arranged designs. Fit must not crop a sprig that was visible before.
  const sc=scene(s),clips=[...sc.nodes,...sc.finishes].some(n=>{
   const c=Math.abs(Math.cos(n.rot)),sn=Math.abs(Math.sin(n.rot)),hw=(n.w*c+n.h*sn)/2,hh=(n.h*c+n.w*sn)/2;
   return (n.x-hw)*v.scale+v.x<8||(n.x+hw)*v.scale+v.x>712||(n.y-hh)*v.scale+v.y<8||(n.y+hh)*v.scale+v.y>812;
  });
  if(clips)v={scale:1.08,x:-28.8,y:-92};
 }else{const f=s.frames[s.mode],collar=collarNode(s,f),extent=Math.max(2*(f.radius+f.unit*.94),collar?.w||0,collar?.h||0)+48,scale=Math.min(2.6,648/extent);v={scale,x:360-360*scale,y:416-390*scale};}
 const z=camera.zoom||1;return {scale:v.scale*z,x:360+(v.x-360)*z+(camera.x||0),y:410+(v.y-410)*z+(camera.y||0)};
}
function worldPoint(s,p,camera){const v=view(s,camera);return {x:(p.x-v.x)/v.scale,y:(p.y-v.y)/v.scale};}
function paint(cv,s,opts={}){const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.save();ctx.scale(cv.width/720,cv.height/820);const v=view(s,opts.camera);ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);const sc=drawArt(ctx,s,opts);ctx.restore();return sc;}
function alphaFor(path){if(!alphaCache.has(path)){const im=image(path),crop=NEBULA_META.crops?.[path],w=crop?.[2]||im.width,h=crop?.[3]||im.height,cv=makeCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});drawAsset(ctx,im,path,0,0,w,h);alphaCache.set(path,{w,h,data:ctx.getImageData(0,0,w,h).data});}return alphaCache.get(path);}
function hit(sc,p){if(sc.frame.mode!=='classic'&&!['fall-mixed-size-v1','garden-v1','halloween-v1'].includes(sc.frame.engine)){let best=null,dist=Infinity;for(const n of sc.nodes){if(n.decorative)continue;const d=Math.hypot(p.x-n.x,p.y-n.y),slot=sc.slots?.find(a=>a.slot===n.slot);if(d<dist&&d<(slot?.near||n.d)*.70){dist=d;best=n;}}return best;}for(const n of sc.nodes.slice().reverse()){if(n.decorative)continue;const dx=p.x-n.x,dy=p.y-n.y,x=dx*Math.cos(n.rot)+dy*Math.sin(n.rot),y=-dx*Math.sin(n.rot)+dy*Math.cos(n.rot);if(Math.abs(x)>n.w/2||Math.abs(y)>n.h/2)continue;const a=alphaFor(n.url),ix=Math.floor(((n.flipX?-x:x)/n.w+.5)*a.w),iy=Math.floor((y/n.h+.5)*a.h);if(ix>=0&&ix<a.w&&iy>=0&&iy<a.h&&a.data[(iy*a.w+ix)*4+3]>60)return n;}return null;}
function detailHit(sc,p){
 for(const n of sc.finishes.filter(n=>n.detailId).reverse()){
  const dx=p.x-n.x,dy=p.y-n.y,x=dx*Math.cos(n.rot)+dy*Math.sin(n.rot),y=-dx*Math.sin(n.rot)+dy*Math.cos(n.rot);
  if(Math.abs(x)>=n.w/2||Math.abs(y)>=n.h/2||!decoded(n.url))continue;
  const a=alphaFor(n.url),ix=Math.floor(((n.flipX?-x:x)/n.w+.5)*a.w),iy=Math.floor((y/n.h+.5)*a.h);
  if(a.data[(iy*a.w+ix)*4+3]>60)return n;
 }return null;
}
function ghost(s,id,p){const m=NEBULA_META.flowers[id],top=s.mode!=='classic';if(!m||(s.mode==='classic'&&!m.classicAvailable))return null;const d=NebulaConfig.CAT[id][top?'topDiameter':'classicDiameter'],mw=top?m.headWidth:m.bloomWidth,mh=top?m.headHeight:m.bloomHeight,f=d/(top?Math.max(mw,mh):mw);return {id,url:top?(s.mode==='dome'&&m.domeHeads?m.domeHeads[0]:m.head):m.classicBloom,x:p.x,y:p.y,w:mw*f,h:mh*f,d,rot:0,bright:1};}
function alphaCanvas(s){const cv=makeCanvas();drawArt(cv.getContext('2d'),s,{alphaOnly:true});return cv;}
function alphaReport(s){const sc=scene(s),cv=alphaCanvas(s),data=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,720,820).data,f=sc.frame;if(g.NebulaSpooky?.active(s))return {applicable:false,reason:'Reserved prop space and mixed flower pockets; a filled-disc test is not applicable.'};if(s.mode==='classic')return {applicable:false,reason:'Open front-facing bouquet: top-view gap coverage is not meaningful.'};let samples=0,open=0,translucent=0;const coreR=Math.max(12,f.radius-f.unit*.43);
 for(let y=0;y<820;y++)for(let x=0;x<720;x++){let within=s.mode==='dome'?Math.hypot(x-f.center.x,y-f.center.y)<coreR:false;if(s.mode==='heart'){const b=f.unit*.32;within=G.inside({x,y},f,0)&&G.inside({x:x-b,y},f,0)&&G.inside({x:x+b,y},f,0)&&G.inside({x,y:y-b},f,0)&&G.inside({x,y:y+b},f,0);}if(!within)continue;samples++;const a=data[(y*720+x)*4+3];if(a<32)open++;if(a<225)translucent++;}
 return {applicable:true,method:s.mode==='dome'?'Actual composited head alpha in central disc R - 0.43 * RMS head diameter.':'Actual composited head alpha in permitted heart interior, eroded on four axes by 0.32 * RMS head diameter.',threshold:32,opaqueThreshold:225,pixels:samples,openPixels:open,openPercent:samples?+(100*open/samples).toFixed(4):0,belowOpaquePercent:samples?+(100*translucent/samples).toFixed(4):0,excludes:['paper','shadows','ribbons and finishing overlays','outer boundary band'],explicitItems:s.items.length};
}
function artBounds(s,sc){if(g.NebulaPhoto?.active(s))return {...NebulaPhoto.boundsFor(s)};let xmin=720,ymin=820,xmax=0,ymax=0;const box=(x,y,w,h)=>{xmin=Math.min(xmin,x-w/2);xmax=Math.max(xmax,x+w/2);ymin=Math.min(ymin,y-h/2);ymax=Math.max(ymax,y+h/2);};for(const n of [...sc.nodes,...sc.finishes,...(sc.filler||[]),...(sc.greenery||[]),...(sc.collar?[sc.collar]:[])]){const c=Math.abs(Math.cos(n.rot)),sn=Math.abs(Math.sin(n.rot));box(n.x,n.y,n.w*c+n.h*sn,n.w*sn+n.h*c);}if(s.mode==='classic'&&!g.NebulaClassic?.active(s)){const f=sc.frame;box(f.origin.x+448*f.scale,f.origin.y+599*(f.yScale||f.scale),822*f.scale,864*(f.yScale||f.scale));}if(xmin>xmax)return {x:150,y:160,w:420,h:500};return {x:xmin-22,y:ymin-22,w:xmax-xmin+44,h:ymax-ymin+44};}
function wrapText(ctx,text,max){if(!text)return [];const out=[];let line='';for(const para of text.split('\n')){for(const word of para.split(/\s+/).filter(Boolean)){if(ctx.measureText(word).width>max){if(line){out.push(line);line='';}let part='';for(const ch of [...word]){if(ctx.measureText(part+ch).width>max&&part){out.push(part);part='';}part+=ch;}line=part;}else if(line&&ctx.measureText(line+' '+word).width>max){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line){out.push(line);line='';}}return out;}
function exportCanvas(s,w=1080,h=1080,lang='en'){
 const cv=makeCanvas(w,h),ctx=cv.getContext('2d'),sc=scene(s),b=artBounds(s,sc),base=w/1080,theme=g.NEBULA_SHOP?.theme||{};ctx.scale(base,base);const hh=h/base,story=hh>1200;ctx.fillStyle=theme.background||'#f7f3eb';ctx.fillRect(0,0,1080,hh);ctx.fillStyle=theme.ink||'#293e36';ctx.textAlign='center';
 /* The studio logo, on the light export ground it was drawn for. Falls back to
    the typed brand name whenever the artwork has not decoded yet. */
 const badge=decoded(BRAND_LOGO);
 if(badge){const bw=NebulaConfig.CONFIG.logo?180*badge.naturalWidth/badge.naturalHeight:248,bh=bw*badge.naturalHeight/badge.naturalWidth;ctx.drawImage(badge,540-bw/2,NebulaConfig.CONFIG.logo?12:20,bw,bh);}
 else{ctx.font='22px Arial';ctx.fillText(NebulaConfig.CONFIG.brand.toUpperCase(),540,66);ctx.font='14px Arial';ctx.fillStyle='#676c60';ctx.fillText(lang==='es'?'ESTUDIO DE RAMOS':'BOUQUET STUDIO',540,92);}
 ctx.font='italic 44px Georgia';const title=s.title.trim()||(lang==='es'?'Un ramo, muy tuyo':'A bouquet, all yours'),titles=wrapText(ctx,title,936);ctx.font='26px Arial';const notes=wrapText(ctx,s.note.trim(),900),noteH=notes.length?notes.length*35+24:0,p=M.price(s),titleH=titles.length*51;
 const label=g.NebulaSpooky?.active(s)?'Halloween':(lang==='es'?{classic:'Clásico',dome:'Cúpula',heart:'Corazón plano'}:{classic:'Classic',dome:'Dome',heart:'Flat heart'})[s.mode],bottom=titleH+42+noteH+94+(s.mode==='classic'?0:24),artTop=NebulaConfig.CONFIG.logo?205:story?180:126,artH=hh-artTop-bottom-26,scale=Math.min(920/b.w,artH/b.h);
 ctx.save();ctx.translate((1080-b.w*scale)/2-b.x*scale,artTop+(artH-b.h*scale)/2-b.y*scale);ctx.scale(scale,scale);drawArt(ctx,s,{scene:sc});ctx.restore();
 let y=artTop+artH+48;ctx.fillStyle=theme.ink||'#293e36';ctx.font='italic 44px Georgia';for(const line of titles){ctx.fillText(line,540,y);y+=51;}ctx.font='24px Arial';ctx.fillStyle=theme.primary||'#596253';ctx.fillText((g.NebulaPhoto?.active(s)?(s.photographic.version===2?(lang==='es'?'Estudio floral · envoltorio y precio pendientes':'Flower study · wrapping and pricing pending'):(lang==='es'?'Estudio visual · papel provisional · cantidades y precio pendientes':'Visual study · temporary paper · quantities and pricing pending')):label+'  ·  '+p.pieces+(lang==='es'?' piezas':' pieces')+'  ·  '+M.money(p.totalCents,lang)+(NebulaConfig.CONFIG.demo?(lang==='es'?' estimado de muestra':' sample estimate'):(lang==='es'?' estimado':' estimate'))),540,y+2);y+=46;
 if(notes.length){ctx.font='26px Arial';ctx.fillStyle='#3c483f';for(const line of notes){ctx.fillText(line,540,y+8);y+=35;}}
 /* Studio line. Every picture a customer shares carries it home. */
 const S=NebulaConfig.CONFIG.studio||{};
 const credit=[S.name,S.site,S.phone].filter(Boolean).join('   ·   ');
 if(credit){ctx.font='600 19px Arial';ctx.fillStyle=theme.primary||'#3f5a4c';ctx.fillText(credit,540,hh-62);}
 ctx.font='16px Arial';ctx.fillStyle='#65695f';ctx.fillText(g.NebulaPhoto?.active(s)?(lang==='es'?'Estudio visual local. Materiales y cantidades pendientes de confirmar.':'Local visual study. Materials and quantities await confirmation.'):(lang==='es'?'Solo estimación. Requiere confirmación; no es un pedido.':'Estimate only. Florist confirmation required; no order placed.'),540,hh-33);return cv;
}
/* An exported picture must be complete, so wait for this design's artwork first.
   A preview frame may skip a bloom and repaint; a saved PNG may not. */
async function blob(s,w,h,lang){await awaitAssets(s);const cv=exportCanvas(s,w,h,lang);return new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed.')),'image/png'));}
const paperPreviews=new WeakMap();
function paperPreview(path,paper,color){const im=tint(path,paper,color);if(!im?.toDataURL)return source(path);if(!paperPreviews.has(im))paperPreviews.set(im,im.toDataURL());return paperPreviews.get(im);}
g.NebulaRenderer={footprint,paperPreview,thumbnail,classicStemMask,source,load,ready,image,decoded,scene,drawArt,paint,view,worldPoint,hit,detailHit,ghost,alphaCanvas,alphaReport,artBounds,exportCanvas,blob,wrapText,makeCanvas,collarNode,awaitAssets,assetsFor,
 set onAssetReady(fn){onAssetReady=fn;},get onAssetReady(){return onAssetReady;}};
})(window);
