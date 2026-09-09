/* Versioned, explicit state. UI language is stored separately; history snapshots are complete designs. */
(function(g){'use strict';
const {CAT,CONFIG,PRESETS,RETIRED}=NebulaConfig,G=NebulaGeometry,clone=x=>JSON.parse(JSON.stringify(x));
/* A withdrawn catalogue id must not invalidate a saved design; swap it for its survivor. */
const live=id=>RETIRED[id]||id;
function empty(){return {version:6,mode:'classic',seed:11,nextId:1,items:[],frames:{},finishes:{paper:'ivory',tint:'#dcc8b7',ribbon:'none',sash:'none',sashPlacement:'auto',sashOffset:0,sashScale:1,collar:true,butterfly:false,greenRim:false},title:'',note:''};}
function newItem(s,id){return {uid:'b'+s.nextId++,id,anchors:{}};}
function arrange(s,mode=s.mode,{fresh=false,seed=s.seed}={}){
 if(mode!=='classic'){if(!s.template)migrateTemplate(s);return syncTemplate(s);}
 const geo=G.arrange(s.items,mode,seed,s.finishes&&s.finishes.paper);s.frames[mode]=geo.frame;
 for(const it of s.items){if(fresh||!it.anchors[mode])it.anchors[mode]=geo.positions[it.uid];}
 return s;
}
function create(preset='romantic',mode='classic'){
 const s=empty();s.mode=mode;s.items=(PRESETS[preset]||PRESETS.romantic).items.map(id=>newItem(s,id));arrange(s,mode,{fresh:true});return s;
}
/* A narrower paper must not leave blooms hanging outside it. Re-clamp on change. */
function refitPaper(s){
 if(s.mode!=='classic'||!s.frames.classic)return s;
 const f=G.stampPaper(s.frames.classic,s);
 for(const it of s.items)if(it.anchors.classic)it.anchors.classic=G.constrainClassic(it.anchors.classic,f,it.id);
 return s;}
function counts(s){const result={};for(const it of s.items)result[it.id]=(result[it.id]||0)+1;return result;}
function price(s){
 const lines=Object.entries(counts(s)).map(([id,quantity])=>({id,quantity,unitCents:CAT[id].priceCents,totalCents:quantity*CAT[id].priceCents}));
 const flowersCents=lines.reduce((n,line)=>n+line.totalCents,0),baseCents=s.items.length?CONFIG.baseCents:0,laborCents=s.items.length?CONFIG.laborCents[s.mode]:0;
 const extraLines=[];for(const name of ['butterfly'])if(s.finishes[name])extraLines.push({id:name,quantity:1,totalCents:CONFIG.extrasCents[name]});
 /* The eucalyptus collar is 8 real sprigs a florist must supply, so it is priced as
    8 catalogue units rather than hidden as free decoration. */
 if(s.mode==='dome'&&s.finishes.greenRim)extraLines.push({id:'greenRim',quantity:G.GREEN_RIM,totalCents:G.GREEN_RIM*CAT.eucalyptus.priceCents});
 for(const name of ['ribbon','sash'])if(s.finishes[name]!=='none')extraLines.push({id:name,quantity:1,totalCents:CONFIG.extrasCents[name]});
 const extrasCents=extraLines.reduce((n,x)=>n+x.totalCents,0);
 return {currency:CONFIG.currency,demo:CONFIG.demo,estimateOnly:true,lines,extraLines,flowersCents,baseCents,laborCents,extrasCents,totalCents:flowersCents+baseCents+laborCents+extrasCents,flowers:s.items.filter(i=>CAT[i.id].kind==='flower').length,texture:s.items.filter(i=>CAT[i.id].kind==='texture').length,chocolates:s.items.filter(i=>CAT[i.id].kind==='chocolate').length,pieces:s.items.length};
}
function money(cents,lang='en'){return new Intl.NumberFormat(lang==='es'?'es-US':'en-US',{style:'currency',currency:CONFIG.currency}).format(cents/100);}
function defaultMode(mode){if(mode==='classic')return create();const s=empty();s.mode=mode;s.finishes.paper='black';s.template=NebulaTemplates.defaults(mode,mode==='dome'?30:41);return syncTemplate(s);}
function migrateTemplate(s){
 const ids=s.items.map(i=>i.id),n=Math.max(1,ids.length||(s.mode==='heart'?41:15));s.template=NebulaTemplates.defaults(s.mode,n);
 if(s.mode==='dome'){const pal=[...new Set(ids)];if(pal.length&&pal.length<=3)s.template.palette=pal;}
 const base=NebulaTemplates.recipe(s.mode,s.template,s.seed);for(let i=0;i<n;i++)if((ids[i]||null)!==base[i])s.template.overrides[i]=ids[i]||null;return syncTemplate(s);
}
function syncTemplate(s){
 if(s.mode==='classic')return s;const T=NebulaTemplates,L=T.layout(s.mode,s.template.capacity),ids=T.recipe(s.mode,s.template,s.seed);s.items=[];s.frames={[s.mode]:clone(L.frame)};
 for(let slot=0;slot<ids.length;slot++){const id=Object.hasOwn(s.template.overrides,slot)?s.template.overrides[slot]:ids[slot];if(id===null)continue;const p=L.points[slot];s.items.push({uid:'b'+(slot+1),id,slot,anchors:{[s.mode]:{x:L.frame.center.x+p.x,y:L.frame.center.y+p.y,manual:Object.hasOwn(s.template.overrides,slot)}}});}
 s.nextId=Math.max(s.template.capacity+1,s.nextId);return s;
}
function paintSlot(s,slot,id){if(s.mode==='classic'||!Number.isInteger(slot)||slot<0||slot>=s.template.capacity||(id!==null&&!Object.hasOwn(CAT,id)))return {ok:false,reason:'invalid'};s.template.overrides[slot]=id;syncTemplate(s);return {ok:true,uid:id===null?null:'b'+(slot+1),slot};}
function resize(s,n,id='rose_red'){
 if(s.mode==='classic'||!Number.isInteger(n)||n<1||n>100||!Object.hasOwn(CAT,id))return {ok:false,reason:'invalid'};
 const old=s.template,from=NebulaTemplates.layout(s.mode,old.capacity),to=NebulaTemplates.layout(s.mode,n),t=clone(old),used=new Set();t.capacity=n;t.accent.count=Math.min(t.accent.count,n);t.overrides={};
 // Reapply automatic recipes. Preserve only intentional edits by normalized position.
 for(const [key,value] of Object.entries(old.overrides)){
  const p=from.points[+key];let slot=null,dist=Infinity;
  for(const q of to.points){if(used.has(q.slot))continue;const d=(p.x/from.frame.radius-q.x/to.frame.radius)**2+(p.y/from.frame.radius-q.y/to.frame.radius)**2;if(d<dist){dist=d;slot=q.slot;}}
  if(slot!==null){t.overrides[slot]=value;used.add(slot);}
 }
 s.template=t;syncTemplate(s);return {ok:true};
}
function updateTemplate(s,update){if(s.mode==='classic')return {ok:false,reason:'invalid'};const t=clone(s.template);Object.assign(t,update);if(!validTemplate(t))return {ok:false,reason:'invalid'};s.template=t;syncTemplate(s);return {ok:true};}
function validTemplate(t){
 if(!t||!Number.isInteger(t.capacity)||t.capacity<1||t.capacity>100||!Array.isArray(t.palette)||!t.palette.length||t.palette.length>3||t.palette.some(id=>!Object.hasOwn(CAT,id))||new Set(t.palette).size!==t.palette.length||!['patches','half','border','rings'].includes(t.formation))return false;
 const a=t.accent,z=t.zones;if(!a||!Object.hasOwn(CAT,a.id)||!Number.isInteger(a.count)||a.count<0||a.count>t.capacity||!['cluster','border','half','scatter','ring'].includes(a.pattern)||!Number.isFinite(a.angle)||a.angle<0||a.angle>360)return false;
 if(!z||['wall','fill','center'].some(k=>!Object.hasOwn(CAT,z[k]))||!['zones','rings','checker'].includes(z.formation)||typeof z.doubleWall!=='boolean')return false;
 if(!t.overrides||typeof t.overrides!=='object'||Array.isArray(t.overrides)||Object.entries(t.overrides).some(([k,v])=>!/^\d{1,2}$/.test(k)||String(+k)!==k||+k>=t.capacity||(v!==null&&!Object.hasOwn(CAT,v))))return false;return true;
}
function switchMode(s,mode,bank){
 if(!['classic','dome','heart'].includes(mode)||!bank)return {ok:false,reason:'invalid'};
 if(s.mode===mode)return {ok:true};
 bank[s.mode]=clone(s);const next=bank[mode]?clone(bank[mode]):defaultMode(mode);
 Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,next);return {ok:true};
}
function portfolio(s,bank){return {format:'nebula-bouquet-studio',version:6,activeMode:s.mode,bouquets:{...clone(bank),[s.mode]:clone(s)}};}
function validatePortfolio(raw){
 if(!raw||![5,6].includes(raw.version)||raw.format!=='nebula-bouquet-studio'||!['classic','dome','heart'].includes(raw.activeMode)||!raw.bouquets)return null;
 const bouquets={};for(const mode of ['classic','dome','heart'])if(Object.hasOwn(raw.bouquets,mode)){
  const item=validate(raw.bouquets[mode]);if(!item||item.mode!==mode)return null;bouquets[mode]=item;
 }
 if(!bouquets[raw.activeMode])return null;return {format:'nebula-bouquet-studio',version:6,activeMode:raw.activeMode,bouquets};
}
function add(s,id,p){
 if(!Object.hasOwn(CAT,id))return {ok:false,reason:'invalid'};
 if(s.mode!=='classic'){const used=new Set(s.items.map(i=>i.slot)),slot=p?NebulaTemplates.nearest(s.mode,s.template.capacity,p):Array.from({length:s.template.capacity},(_,i)=>i).find(i=>!used.has(i));if(slot==null||used.has(slot))return {ok:false,reason:'templateFull'};return paintSlot(s,slot,id);}
 const it=newItem(s,id),cap=G.capacity(s.items.concat(it),s.mode);
 if(!cap.ok){s.nextId--;return cap;}
 if(s.items.length===0){s.items.push(it);arrange(s,s.mode,{fresh:true});return {ok:true,uid:it.uid};}
 // Adding does NOT rearrange or rescale existing flowers. The wrapper only grows when space is needed.
 if(s.mode==='classic'){const fitting=G.classicFrame(s.items.concat(it),s.finishes&&s.finishes.paper);if(fitting.scale>s.frames.classic.scale)s.frames.classic=fitting;}
 let pos=G.findPlace(s,id,p);
 if(!pos&&s.mode==='dome'){
  const oldFrame=clone(s.frames.dome);s.frames.dome.radius=Math.min(270,s.frames.dome.radius+CAT[id].topDiameter*.32);
  pos=G.findPlace(s,id,p);if(!pos)s.frames.dome=oldFrame;
 }
 if(!pos){s.nextId--;return {ok:false,reason:'placement'};}
 it.anchors[s.mode]={x:pos.x,y:pos.y,manual:true};s.items.push(it);return {ok:true,uid:it.uid,snapped:pos.snapped};
}
function replace(s,uid,id){
 const it=s.items.find(i=>i.uid===uid);if(!it||!CAT[id])return {ok:false,reason:'invalid'};
 if(s.mode!=='classic')return paintSlot(s,it.slot,id);
 const prev=it.id;it.id=id;const cap=G.capacity(s.items,s.mode);
 if(!cap.ok){it.id=prev;return cap;}
 // Keep the item identity. A much larger bloom gets a nearby valid anchor, not a changed recipe.
 const pos=G.findPlace(s,id,it.anchors[s.mode],uid);
 if(!pos){it.id=prev;return {ok:false,reason:'placement'};}
 it.anchors[s.mode]={x:pos.x,y:pos.y,manual:true};return {ok:true,snapped:pos.snapped};
}
function remove(s,uid){if(s.mode!=='classic'){const it=s.items.find(i=>i.uid===uid);return it?paintSlot(s,it.slot,null):{ok:false,reason:'invalid'};}const before=s.items.length;s.items=s.items.filter(it=>it.uid!==uid);return {ok:s.items.length!==before};}
function move(s,uid,p){const it=s.items.find(i=>i.uid===uid);if(!it)return {ok:false,reason:'invalid'};if(s.mode!=='classic'){const slot=NebulaTemplates.nearest(s.mode,s.template.capacity,p);if(slot===null)return {ok:false,reason:'placement'};const other=s.items.find(i=>i.slot===slot);s.template.overrides[it.slot]=other?.id||null;s.template.overrides[slot]=it.id;syncTemplate(s);return {ok:true,uid:'b'+(slot+1),slot};}const pos=G.findPlace(s,it.id,p,uid);if(!pos)return {ok:false,reason:'placement'};it.anchors[s.mode]={x:pos.x,y:pos.y,manual:true};return {ok:true,snapped:pos.snapped};}
function validateV4(raw){
 if(!raw||raw.version!==4||!['classic','dome','heart'].includes(raw.mode)||!Array.isArray(raw.items)||raw.items.length>100)return null;
 if(!Number.isInteger(raw.seed)||raw.seed<1||raw.seed>99999999||!Number.isInteger(raw.nextId)||raw.nextId<1||raw.nextId>1e8)return null;
 const f=raw.finishes;if(f&&f.paper==='kraft')f.paper='ivory';   /* withdrawn wrap */
 if(!f||!['ivory','blush','sage','custom','black'].includes(f.paper)||!/^#[0-9a-f]{6}$/i.test(f.tint)||!['none','blush','burgundy','sage'].includes(f.ribbon)||!['none','love','bday','wed'].includes(f.sash)||typeof f.butterfly!=='boolean')return null;
 if(f.greenRim!==undefined&&typeof f.greenRim!=='boolean')return null;
 if(typeof raw.title!=='string'||raw.title.length>70||typeof raw.note!=='string'||raw.note.length>180)return null;
 if(f.sashPlacement!==undefined&&!['auto','low','diagonal'].includes(f.sashPlacement))return null;
 if(f.sashOffset!==undefined&&(!Number.isFinite(f.sashOffset)||Math.abs(f.sashOffset)>60))return null;
 if(f.sashScale!==undefined&&(!Number.isFinite(f.sashScale)||f.sashScale<.65||f.sashScale>1.25))return null;
 if(f.collar!==undefined&&typeof f.collar!=='boolean')return null;
 const s=empty();Object.assign(s,{mode:raw.mode,seed:raw.seed,nextId:raw.nextId,finishes:{...s.finishes,...clone(f)},title:raw.title,note:raw.note});
 const used=new Set();
 for(const it of raw.items){
  if(it&&typeof it.id==='string')it.id=live(it.id);
  if(!it||typeof it.uid!=='string'||!/^b\d{1,8}$/.test(it.uid)||used.has(it.uid)||!Object.hasOwn(CAT,it.id)||!it.anchors||typeof it.anchors!=='object')return null;
  if(+it.uid.slice(1)>=raw.nextId)return null;used.add(it.uid);
  const anchors={};for(const mode of ['classic','dome','heart'])if(it.anchors[mode]){
   const a=it.anchors[mode];if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>720||a.y<0||a.y>820||typeof a.manual!=='boolean')return null;
   anchors[mode]={x:a.x,y:a.y,manual:a.manual};
  }
  s.items.push({uid:it.uid,id:it.id,anchors});
 }
 for(const mode of ['classic','dome','heart'])if(raw.frames&&raw.frames[mode]){
  const a=raw.frames[mode];if(a.mode!==mode||!a.center||!Number.isFinite(a.center.x)||!Number.isFinite(a.center.y)||!Number.isFinite(a.radius)||a.radius<=0||a.radius>600||!Number.isFinite(a.unit)||a.unit<1||a.unit>300)return null;
  // Whitelist geometry fields; no arbitrary imported object becomes rendering instructions.
  if(mode==='classic'){
   const ys=Number.isFinite(a.yScale)?a.yScale:a.scale,eq=(x,y)=>Number.isFinite(x)&&Math.abs(x-y)<.02;
   if(!a.origin||!a.waist||!eq(a.waist.x,360)||!eq(a.waist.y,666)||!eq(a.origin.x,360-448*a.scale)||!eq(a.origin.y,666-850*ys)||!eq(a.rimY,666-250*ys)||!eq(a.center.x,360)||!eq(a.center.y,a.rimY-108)||!eq(a.radius,230)||!eq(a.unit,116))return null;
   if(!Number.isFinite(a.scale)||a.scale<.3||a.scale>1||(a.yScale!==undefined&&(!Number.isFinite(a.yScale)||a.yScale<.3||a.yScale>1))||!a.origin||!a.waist||![a.origin.x,a.origin.y,a.waist.x,a.waist.y,a.rimY].every(Number.isFinite))return null;
   s.frames[mode]={mode,center:{x:a.center.x,y:a.center.y},radius:a.radius,unit:a.unit,scale:a.scale,yScale:Number.isFinite(a.yScale)?a.yScale:a.scale,origin:{x:a.origin.x,y:a.origin.y},waist:{x:a.waist.x,y:a.waist.y},rimY:a.rimY};
  }else{
   s.frames[mode]={mode,center:{x:a.center.x,y:a.center.y},radius:a.radius,unit:a.unit,scale:1,engine:mode==='dome'?'v2':'v1-rings'};
   if(mode==='heart'){
    if(![a.top,a.tip,a.halfWidth].every(Number.isFinite)||a.tip<a.top||a.halfWidth<=0||a.halfWidth>600)return null;
    Object.assign(s.frames[mode],{top:a.top,tip:a.tip,halfWidth:a.halfWidth});if(Number.isInteger(a.rings)&&a.rings>=0&&a.rings<=12)s.frames[mode].rings=a.rings;
   }
  }
 }
 if(!G.capacity(s.items,s.mode).ok)return null;
 if(!s.frames[s.mode]||s.items.some(i=>!i.anchors[s.mode]))return null;
 return s;
}
function validate(raw){
 if(!raw||![4,6].includes(raw.version))return null;const out=validateV4({...raw,version:4});if(!out)return null;
 if(out.mode==='classic'){out.items.forEach(it=>{it.anchors.classic=G.constrainClassic(it.anchors.classic,out.frames.classic,it.id);});return out;}
 if(raw.version===4)return migrateTemplate(out);if(!validTemplate(raw.template))return null;out.template=clone(raw.template);syncTemplate(out);
 if(out.items.length!==raw.items.length||out.items.some(it=>!raw.items.some(i=>i.uid===it.uid&&i.id===it.id&&i.slot===it.slot)))return null;return out;
}
function migrateV3(raw){
 if(!raw||raw.version!==3||!Array.isArray(raw.items)||raw.items.length>100||raw.items.some(id=>!Object.hasOwn(CAT,id)))return null;
 const s=empty();s.mode=raw.shape==='heart'?'heart':(raw.mode==='flat'?'classic':'dome');s.seed=Number.isInteger(raw.seed)&&raw.seed>0&&raw.seed<1e8?raw.seed:11;
 s.items=raw.items.map(id=>newItem(s,id));
 if(!G.capacity(s.items,s.mode).ok)s.mode='dome';
 for(const k of ['ribbon','sash']){const allowed=k==='ribbon'?['none','blush','burgundy','sage']:['none','love','bday','wed'];if(allowed.includes(raw[k]))s.finishes[k]=raw[k];}
 for(const k of ['butterfly'])s.finishes[k]=raw[k]===true;
 s.title=String(raw.title||'').slice(0,70);s.note=String(raw.note||'').slice(0,180);arrange(s,s.mode,{fresh:true});return validate(s);
}
function order(s,lang='en'){return {format:'nebula-bouquet',version:6,estimateOnly:true,currency:CONFIG.currency,design:clone(s),pickList:price(s).lines.map(l=>({...l,name:CAT[l.id][lang]})),pricing:price(s),artworkLimitations:[],templateCapacity:s.template?.capacity||null,emptySlots:s.template?s.template.capacity-s.items.length:0,notice:(CONFIG.demo?'Sample prices. ':'')+'Estimate only; florist must confirm price, stock, feasibility and delivery. No order has been placed or sent.'};}
g.NebulaModel={refitPaper,syncTemplate,paintSlot,resize,updateTemplate,validTemplate,clone,empty,newItem,arrange,create,counts,price,money,switchMode,defaultMode,portfolio,validatePortfolio,add,replace,remove,move,validate,migrateV3,order};
})(typeof window!=='undefined'?window:globalThis);
