/* Preview, picking, alpha QA and PNG export use the same scene, assets and transforms.
   Classic uses aligned photographic layers. No synthetic paper, paid filler or flowers are inserted. */
(function(g){'use strict';
const G=NebulaGeometry,M=NebulaModel,cache=new Map(),tintCache=new Map(),alphaCache=new Map();
const makeCanvas=(w=720,h=820)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const source=path=>(g.NEBULA_EMBED&&g.NEBULA_EMBED[path])||path;
/* ---------------------------------------------------------------------------
   Lazy artwork decoding.
   Decoding all 93 embedded images before first paint costs ~29.6 megapixels and
   ~113 MB of bitmap memory, while the opening screen needs about eight of them.
   So: decode the small critical set up front, hand the rest to an idle queue, and
   let a frame skip anything still in flight - a repaint follows the moment it lands.
   Export is the exception: a PNG must never be missing a bloom, so blob()/
   exportCanvas() await every asset their design uses before drawing.
   --------------------------------------------------------------------------- */
let onAssetReady=null,repaintQueued=false;
function announce(){if(repaintQueued||!onAssetReady)return;repaintQueued=true;requestAnimationFrame(()=>{repaintQueued=false;if(onAssetReady)onAssetReady();});}
function load(path){if(!cache.has(path)){const im=new Image(),promise=new Promise((resolve,reject)=>{im.onload=()=>{resolve(im);announce();};im.onerror=()=>reject(new Error('Artwork failed to load: '+path));});cache.set(path,{im,promise});im.src=source(path);}return cache.get(path).promise;}
function decoded(path){const it=cache.get(path);return it&&it.im.complete&&it.im.naturalWidth?it.im:null;}
/* Returns null instead of throwing when the artwork has not decoded yet; every
   drawing call site treats null as "skip this element and repaint shortly". */
function image(path){const im=decoded(path);if(im)return im;load(path);return null;}
function allAssets(){const urls=new Set([NEBULA_META.wrap.back,NEBULA_META.wrap.front]);for(const v of Object.values(NEBULA_META.flowers)){urls.add(v.head);if(v.classicAvailable){urls.add(v.classicBloom);if(v.classicStem)urls.add(v.classicStem);}}for(const v of Object.values(NEBULA_META.finishes))urls.add(v.url);for(const v of Object.values(NEBULA_META.collars))urls.add(v.url);return urls;}
/* Everything a single design can draw: wrap, its collar, finishes and its own flowers. */
function assetsFor(s){
 const urls=new Set([NEBULA_META.wrap.back,NEBULA_META.wrap.front]);
 for(const v of Object.values(NEBULA_META.finishes))urls.add(v.url);
 for(const v of Object.values(NEBULA_META.collars))urls.add(v.url);
 const ids=new Set((s?.items||[]).map(i=>i.id));
 if(s?.mode==='dome'&&s.finishes?.greenRim)ids.add('eucalyptus');
 for(const id of ids){const v=NEBULA_META.flowers[id];if(!v)continue;urls.add(v.head);if(v.classicAvailable){urls.add(v.classicBloom);if(v.classicStem)urls.add(v.classicStem);}}
 return urls;
}
function warmRest(){
 const rest=[...allAssets()].filter(p=>!cache.has(p));let i=0;
 const idle=g.requestIdleCallback||(fn=>setTimeout(()=>fn({timeRemaining:()=>8}),80));
 (function step(deadline){
  while(i<rest.length&&(!deadline||deadline.timeRemaining()>3))load(rest[i++]);
  if(i<rest.length)idle(step);
 })(null);
}
/* Awaits only the critical set, then fills the cache in the background. */
async function ready(designs){
 const urls=new Set();
 for(const s of [].concat(designs||[]))for(const p of assetsFor(s))urls.add(p);
 if(!urls.size)for(const p of assetsFor(null))urls.add(p);
 await Promise.all([...urls].map(load));
 warmRest();
 return true;
}
async function awaitAssets(s){await Promise.all([...assetsFor(s)].map(load));}
function tint(path,paper,color){
 const blackSource=path.includes('wrapping/');if((paper==='ivory'&&!blackSource)||(paper==='black'&&blackSource))return image(path);color=paper==='ivory'?'#e6deca':paper==='black'?'#292826':paper==='blush'?'#dbb3b7':paper==='sage'?'#b1bba1':color;const key=path+color;if(tintCache.has(key))return tintCache.get(key);
 const im=image(path);if(!im)return null;const cv=makeCanvas(im.width,im.height),ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,cv.width,cv.height),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(let i=0;i<d.data.length;i+=4){if(!d.data[i+3])continue;const lum=(d.data[i]*.2126+d.data[i+1]*.7152+d.data[i+2]*.0722)/(blackSource?58:224);for(let j=0;j<3;j++)d.data[i+j]=Math.min(255,rgb[j]*lum);}ctx.putImageData(d,0,0);tintCache.set(key,cv);return cv;
}
function nodeDraw(ctx,n,{shadow=true,alpha=false}={}){const im=image(n.url);if(!im)return;ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.rot);if(!alpha){ctx.filter=n.bright!==1?'brightness('+n.bright+')':'none';if(shadow){ctx.shadowColor='rgba(42,36,24,.20)';ctx.shadowBlur=2.2;ctx.shadowOffsetY=1.5;}}ctx.drawImage(im,-n.w/2,-n.h/2,n.w,n.h);ctx.restore();}
function collarNode(s,f){
 if(s.mode==='classic'||s.finishes.collar===false)return null;
 const m=NEBULA_META.collars[s.mode],w=Math.min(684,(f.radius+f.unit*(s.mode==='heart'?.83:.78))*2.10);
 return {uid:'paper',url:m.url,x:f.center.x,y:f.center.y,w,h:w*m.height/m.width,rot:0,d:w,bright:1};
}
function finishNodes(s,f,nodes){
 const list=[];function add(key,id,x,y,w,rot=0){const m=NEBULA_META.finishes[id];list.push({uid:key,url:m.url,x,y,w,h:w*m.height/m.width,rot,d:w,bright:1,z:500});}
 const a=s.finishes,classic=s.mode==='classic',extent=nodes.length?Math.max(...nodes.map(n=>n.x+n.w*.45))-Math.min(...nodes.map(n=>n.x-n.w*.45)):260;
 if(a.ribbon!=='none')add('ribbon','ribbon_'+a.ribbon,360,classic?f.waist.y+18:f.center.y+f.radius+f.unit*.40,classic?110:G.clamp(f.unit*1.06,80,115));
 if(a.sash!=='none'){
  const pos=a.sashPlacement||'auto';let w=G.clamp(extent*.82,190,460),x=360,y=classic?f.rimY-44:f.center.y+f.radius*.38,rot=-.035;
  if(pos==='low'){y=classic?(f.rimY+f.waist.y)*.5:f.center.y+f.radius*.70;w*=.78;rot=0;}
  if(pos==='diagonal'){y=classic?f.rimY-52:f.center.y+f.radius*.14;rot=-.20;}
  y+=(a.sashOffset||0)*f.unit/100;w*=a.sashScale||1;
  add('sash','sash_'+a.sash,x,y,w,rot);
 }
 if(a.butterfly)add('butterfly','extra_butterfly_gold',classic?468:360+f.radius*.68,classic?f.rimY-157:390-f.radius*.48,95,-.17);
 return list;
}
function scene(s){const sc=G.nodes(s);sc.finishes=finishNodes(s,sc.frame,sc.nodes);sc.collar=collarNode(s,sc.frame);return sc;}
const stemCanvas=makeCanvas();
function classicStemMask(f){
 const cv=makeCanvas(),c=cv.getContext('2d'),wm=NEBULA_META.wrap,back=image(wm.back);
 if(back)c.drawImage(back,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));
 const half=wm.width*f.scale*.445;c.fillStyle='#000';c.fillRect(360-half,55,2*half,Math.max(0,f.rimY-55));c.clearRect(0,f.waist.y+8,720,820);return cv;
}
function drawArt(ctx,s,opts={}){
 const sc=opts.scene||scene(s),f=sc.frame;ctx.save();
 if(sc.collar&&!opts.alphaOnly){const n=sc.collar,art=tint(n.url,s.finishes.paper,s.finishes.tint);if(art){ctx.save();ctx.shadowColor='rgba(27,26,22,.16)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.drawImage(art,n.x-n.w/2,n.y-n.h/2,n.w,n.h);ctx.restore();}}
 if(s.mode==='classic'&&!opts.alphaOnly){
  const wm=NEBULA_META.wrap,back=tint(wm.back,s.finishes.paper,s.finishes.tint),front=tint(wm.front,s.finishes.paper,s.finishes.tint);
  if(back){ctx.save();ctx.shadowColor='rgba(85,70,48,.15)';ctx.shadowBlur=12;ctx.shadowOffsetY=7;ctx.drawImage(back,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));ctx.restore();}
  const st=stemCanvas.getContext('2d');st.clearRect(0,0,720,820);
  for(const n of sc.nodes){const m=n.meta;if(!m.classicStem)continue;const stem=image(m.classicStem);if(!stem)continue;const scale=n.w/m.bloomWidth,[cx,cy]=m.bloomCenter;
   // Source-aligned head and neck; no detached, independently sheared stem.
   st.save();st.beginPath();st.rect(0,0,720,f.waist.y+8);st.clip();st.translate(n.x,n.y);st.rotate(n.rot);st.scale(scale,scale);st.translate(-cx,-cy);st.drawImage(stem,0,0);st.restore();
  }
  st.globalCompositeOperation='destination-in';st.drawImage(classicStemMask(f),0,0);st.globalCompositeOperation='source-over';ctx.drawImage(stemCanvas,0,0);if(front)ctx.drawImage(front,f.origin.x,f.origin.y,wm.width*f.scale,wm.height*(f.yScale||f.scale));
 }
 if(opts.guides&&sc.slots?.length){for(const p of sc.slots)if(!p.uid){ctx.save();ctx.strokeStyle='#557363';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(p.x,p.y,p.near*.32,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p.x-5,p.y);ctx.lineTo(p.x+5,p.y);ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x,p.y+5);ctx.stroke();ctx.restore();}}
 for(const n of sc.nodes)nodeDraw(ctx,n,{shadow:!opts.alphaOnly,alpha:opts.alphaOnly});
 if(!opts.alphaOnly)for(const n of sc.finishes)nodeDraw(ctx,n);
 if(opts.selected){const n=sc.nodes.find(n=>n.uid===opts.selected);if(n){ctx.save();ctx.translate(n.x,n.y);ctx.setLineDash([5,5]);ctx.strokeStyle='#335c50';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,n.w/2+8,n.h/2+8,n.rot,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 if(opts.ghost){const n=opts.ghost;ctx.save();ctx.globalAlpha=.55;nodeDraw(ctx,n,{shadow:false});ctx.restore();ctx.strokeStyle='#335c50';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(n.x-5,n.y);ctx.lineTo(n.x+5,n.y);ctx.moveTo(n.x,n.y-5);ctx.lineTo(n.x,n.y+5);ctx.stroke();}
 ctx.restore();return sc;
}
function view(s,camera={}){let v;if(s.mode==='classic')v={scale:1.08,x:-28.8,y:-92};else{const f=s.frames[s.mode],extent=2*(f.radius+f.unit*.94)+48,scale=Math.min(2.6,648/extent);v={scale,x:360-360*scale,y:416-390*scale};}const z=camera.zoom||1;return {scale:v.scale*z,x:360+(v.x-360)*z+(camera.x||0),y:410+(v.y-410)*z+(camera.y||0)};}
function worldPoint(s,p,camera){const v=view(s,camera);return {x:(p.x-v.x)/v.scale,y:(p.y-v.y)/v.scale};}
function paint(cv,s,opts={}){const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.save();ctx.scale(cv.width/720,cv.height/820);const v=view(s,opts.camera);ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);const sc=drawArt(ctx,s,opts);ctx.restore();return sc;}
function alphaFor(path){if(!alphaCache.has(path)){const im=image(path),cv=makeCanvas(im.width,im.height),ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);alphaCache.set(path,{w:im.width,h:im.height,data:ctx.getImageData(0,0,im.width,im.height).data});}return alphaCache.get(path);}
function hit(sc,p){if(sc.frame.mode!=='classic'){let best=null,dist=Infinity;for(const n of sc.nodes){if(n.decorative)continue;const d=Math.hypot(p.x-n.x,p.y-n.y),slot=sc.slots?.find(a=>a.slot===n.slot);if(d<dist&&d<(slot?.near||n.d)*.70){dist=d;best=n;}}return best;}for(const n of sc.nodes.slice().reverse()){if(n.decorative)continue;const dx=p.x-n.x,dy=p.y-n.y,x=dx*Math.cos(n.rot)+dy*Math.sin(n.rot),y=-dx*Math.sin(n.rot)+dy*Math.cos(n.rot);if(Math.abs(x)>n.w/2||Math.abs(y)>n.h/2)continue;const a=alphaFor(n.url),ix=Math.floor((x/n.w+.5)*a.w),iy=Math.floor((y/n.h+.5)*a.h);if(ix>=0&&ix<a.w&&iy>=0&&iy<a.h&&a.data[(iy*a.w+ix)*4+3]>60)return n;}return null;}
function ghost(s,id,p){const m=NEBULA_META.flowers[id],top=s.mode!=='classic';if(!m||(s.mode==='classic'&&!m.classicAvailable))return null;const d=NebulaConfig.CAT[id][top?'topDiameter':'classicDiameter'],mw=top?m.headWidth:m.bloomWidth,mh=top?m.headHeight:m.bloomHeight,f=d/(top?Math.max(mw,mh):mw);return {id,url:top?m.head:m.classicBloom,x:p.x,y:p.y,w:mw*f,h:mh*f,d,rot:0,bright:1};}
function alphaCanvas(s){const cv=makeCanvas();drawArt(cv.getContext('2d'),s,{alphaOnly:true});return cv;}
function alphaReport(s){const sc=scene(s),cv=alphaCanvas(s),data=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,720,820).data,f=sc.frame;if(s.mode==='classic')return {applicable:false,reason:'Open front-facing bouquet: top-view gap coverage is not meaningful.'};let samples=0,open=0,translucent=0;const coreR=Math.max(12,f.radius-f.unit*.43);
 for(let y=0;y<820;y++)for(let x=0;x<720;x++){let within=s.mode==='dome'?Math.hypot(x-f.center.x,y-f.center.y)<coreR:false;if(s.mode==='heart'){const b=f.unit*.32;within=G.inside({x,y},f,0)&&G.inside({x:x-b,y},f,0)&&G.inside({x:x+b,y},f,0)&&G.inside({x,y:y-b},f,0)&&G.inside({x,y:y+b},f,0);}if(!within)continue;samples++;const a=data[(y*720+x)*4+3];if(a<32)open++;if(a<225)translucent++;}
 return {applicable:true,method:s.mode==='dome'?'Actual composited head alpha in central disc R - 0.43 * RMS head diameter.':'Actual composited head alpha in permitted heart interior, eroded on four axes by 0.32 * RMS head diameter.',threshold:32,opaqueThreshold:225,pixels:samples,openPixels:open,openPercent:samples?+(100*open/samples).toFixed(4):0,belowOpaquePercent:samples?+(100*translucent/samples).toFixed(4):0,excludes:['paper','shadows','ribbons and finishing overlays','outer boundary band'],explicitItems:s.items.length};
}
function artBounds(s,sc){let xmin=720,ymin=820,xmax=0,ymax=0;const box=(x,y,w,h)=>{xmin=Math.min(xmin,x-w/2);xmax=Math.max(xmax,x+w/2);ymin=Math.min(ymin,y-h/2);ymax=Math.max(ymax,y+h/2);};for(const n of [...sc.nodes,...sc.finishes,...(sc.collar?[sc.collar]:[])]){const c=Math.abs(Math.cos(n.rot)),sn=Math.abs(Math.sin(n.rot));box(n.x,n.y,n.w*c+n.h*sn,n.w*sn+n.h*c);}if(s.mode==='classic'){const f=sc.frame;box(f.origin.x+448*f.scale,f.origin.y+599*(f.yScale||f.scale),822*f.scale,864*(f.yScale||f.scale));}if(xmin>xmax)return {x:150,y:160,w:420,h:500};return {x:xmin-22,y:ymin-22,w:xmax-xmin+44,h:ymax-ymin+44};}
function wrapText(ctx,text,max){if(!text)return [];const out=[];let line='';for(const para of text.split('\n')){for(const word of para.split(/\s+/).filter(Boolean)){if(ctx.measureText(word).width>max){if(line){out.push(line);line='';}let part='';for(const ch of [...word]){if(ctx.measureText(part+ch).width>max&&part){out.push(part);part='';}part+=ch;}line=part;}else if(line&&ctx.measureText(line+' '+word).width>max){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line){out.push(line);line='';}}return out;}
function exportCanvas(s,w=1080,h=1080,lang='en'){
 const cv=makeCanvas(w,h),ctx=cv.getContext('2d'),sc=scene(s),b=artBounds(s,sc),base=w/1080;ctx.scale(base,base);const hh=h/base,story=hh>1200;ctx.fillStyle='#f7f3eb';ctx.fillRect(0,0,1080,hh);ctx.fillStyle='#293e36';ctx.textAlign='center';ctx.font='22px Arial';ctx.fillText(NebulaConfig.CONFIG.brand.toUpperCase(),540,66);ctx.font='14px Arial';ctx.fillStyle='#676c60';ctx.fillText(lang==='es'?'ESTUDIO DE RAMOS':'BOUQUET STUDIO',540,92);
 ctx.font='italic 44px Georgia';const title=s.title.trim()||(lang==='es'?'Un ramo, muy tuyo':'A bouquet, all yours'),titles=wrapText(ctx,title,936);ctx.font='26px Arial';const notes=wrapText(ctx,s.note.trim(),900),noteH=notes.length?notes.length*35+24:0,p=M.price(s),titleH=titles.length*51;
 const label=(lang==='es'?{classic:'Clásico',dome:'Cúpula',heart:'Corazón plano'}:{classic:'Classic',dome:'Dome',heart:'Flat heart'})[s.mode],bottom=titleH+42+noteH+94+(s.mode==='classic'?0:24),artTop=story?180:126,artH=hh-artTop-bottom-26,scale=Math.min(920/b.w,artH/b.h);
 ctx.save();ctx.translate((1080-b.w*scale)/2-b.x*scale,artTop+(artH-b.h*scale)/2-b.y*scale);ctx.scale(scale,scale);drawArt(ctx,s,{scene:sc});ctx.restore();
 let y=artTop+artH+48;ctx.fillStyle='#293e36';ctx.font='italic 44px Georgia';for(const line of titles){ctx.fillText(line,540,y);y+=51;}ctx.font='24px Arial';ctx.fillStyle='#596253';ctx.fillText(label+'  ·  '+p.pieces+(lang==='es'?' piezas':' pieces')+'  ·  '+M.money(p.totalCents,lang)+(NebulaConfig.CONFIG.demo?(lang==='es'?' estimado de muestra':' sample estimate'):(lang==='es'?' estimado':' estimate')),540,y+2);y+=46;
 if(notes.length){ctx.font='26px Arial';ctx.fillStyle='#3c483f';for(const line of notes){ctx.fillText(line,540,y+8);y+=35;}}ctx.font='16px Arial';ctx.fillStyle='#65695f';ctx.fillText(lang==='es'?'Solo estimación. Requiere confirmación; no es un pedido.':'Estimate only. Florist confirmation required; no order placed.',540,hh-33);return cv;
}
/* An exported picture must be complete, so wait for this design's artwork first.
   A preview frame may skip a bloom and repaint; a saved PNG may not. */
async function blob(s,w,h,lang){await awaitAssets(s);const cv=exportCanvas(s,w,h,lang);return new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed.')),'image/png'));}
g.NebulaRenderer={classicStemMask,source,load,ready,image,decoded,scene,drawArt,paint,view,worldPoint,hit,ghost,alphaCanvas,alphaReport,artBounds,exportCanvas,blob,wrapText,makeCanvas,collarNode,awaitAssets,assetsFor,
 set onAssetReady(fn){onAssetReady=fn;},get onAssetReady(){return onAssetReady;}};
})(window);
