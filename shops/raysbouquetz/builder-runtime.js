/* Ray's shop configuration around the existing Nebula engines and controls.
   No shared layout, painting, history, persistence or renderer code is replaced. */
(function(g){'use strict';
const {CAT,CONFIG}=NebulaConfig,meta=NEBULA_META,M=NebulaModel,P=RAY_BUILDER.pricing;
const modes=['dome','heart'],allowed=new Set(),notes=new Map();
// This shop currently offers English only, including links opened from an old save.
try{localStorage.setItem(NebulaShop.key('nebulaLanguageV4'),'en');}catch{}
const art=file=>{const a=RAY_ART[file];if(!a)throw Error('Missing Ray artwork: '+file);return {url:'art/'+file,width:a.width,height:a.height};};
for(const value of Object.values(CAT))value.top=false;
allowed.add('__choc');CAT.__choc.top=true;CAT.__choc.priceCents=P.chocolateCents;
const flowers=[
 ['rose_red','Red satin rose','red','rose','satin-rose-red-v1.png'],
 ['rose_pink','Pink satin rose','pink','rose','satin-rose-pink-v1.png'],
 ['rose_ivory','Ivory satin rose','ivory','rose','satin-rose-ivory-v1.png'],
 ['rose_violet','Purple satin rose','purple','rose','satin-rose-purple-v1.png'],
 ['rose_lilac','Lilac satin rose','lilac','rose','satin-rose-lilac-v1.png'],
 ['rose_blue','Blue satin rose','blue','rose','satin-rose-blue-v1.png'],
 ['rose_peach','Peach satin rose','peach','rose','satin-rose-peach-v1.png'],
 ['rose_black','Black satin rose','black','rose','satin-rose-black-v1.png'],
 ['rose_red_glitter','Glitter red satin rose','red','rose','satin-rose-red-glitter-v1.png'],
 ['foam_rose_black','Black foam rose','black','foam','foam-rose-black-v1.png'],
 ['satin_dahlia_pink','Pink ribbon dahlia','pink','dahlia','satin-dahlia-pink-v1.png'],
 ['satin_dahlia_blue','Blue ribbon dahlia','blue','dahlia','satin-dahlia-blue-v1.png'],
 ['satin_dahlia_ivory','Ivory ribbon dahlia','ivory','dahlia','satin-dahlia-ivory-v1.png'],
 ['satin_plumeria_purple','Purple ribbon plumeria','purple','plumeria','satin-plumeria-purple-v1.png'],
 ['satin_plumeria_lilac','Lilac ribbon plumeria','lilac','plumeria','satin-plumeria-lilac-v1.png'],
 ['satin_plumeria_ivory','Ivory ribbon plumeria','ivory','plumeria','satin-plumeria-ivory-v1.png'],
 ['sunflower','Satin sunflower','yellow','sunflower','satin-sunflower-yellow-v1.png']
];
for(const [id,en,color,family,file] of flowers){
 const a=art(file),rose=family==='rose';allowed.add(id);
 CAT[id]={en,es:en,family,color,kind:'flower',top:true,classic:false,classicOffered:false,classicDiameter:116,topDiameter:88,priceCents:(rose?P.ribbonRoseCents:family==='foam'?P.foamRoseCents:0)+(id==='rose_red_glitter'?P.glitterCents:0)};
 meta.flowers[id]={head:a.url,headWidth:a.width,headHeight:a.height,headRadius:.46,headView:'overhead',classicAvailable:false};
}
for(const [currency,values]of Object.entries(P.denominations))for(const denomination of values){
 const id='cash_'+currency.toLowerCase()+'_'+denomination;
 const cash=RayPricing.convertCash({currency,denomination,count:1},P);
 notes.set(id,{currency,denomination});allowed.add(id);
 CAT[id]={en:currency+' $'+denomination+' folded note',es:currency+' $'+denomination+' folded note',family:'money',kind:'flower',top:id==='cash_usd_1',classic:false,classicOffered:false,classicDiameter:100,topDiameter:90,priceCents:cash.cadCents};
 // One illustrative fold for every value. The unclean CAD candidate is withheld.
 meta.flowers[id]={head:'assets/money/folded-dollar-v1.png',headWidth:1024,headHeight:1536,headRadius:.4,classicAvailable:false};
}
CONFIG.baseCents=P.baseCents;CONFIG.laborCents={classic:0,...P.laborCents};Object.assign(CONFIG.extrasCents,P.extrasCents);
const wraps={dome:{black:'black',ivory:'ivory',blush:'pink',custom:'lilac'},heart:{black:'black',custom:'lilac'}};
function wrapArt(s){const colour=wraps[s.mode]?.[s.finishes.paper]||'black';return art('wrap-triangle-'+colour+'-'+s.mode+'-v1.png');}
meta.collars.dome=art('wrap-triangle-black-dome-v1.png');meta.collars.heart=art('wrap-triangle-black-heart-v1.png');
meta.collars.domeIvory=art('wrap-triangle-ivory-dome-v1.png');meta.collars.domeCocoa=meta.collars.dome;
meta.wrap.back=meta.collars.dome.url;meta.wrap.front=meta.collars.dome.url;meta.wraps={};
meta.brand={mark:CONFIG.logo,full:CONFIG.logo};
for(const id of Object.keys(NebulaDetails.types))delete NebulaDetails.types[id];
const detailSpecs={bow_lilac:['bow-lilac-v1.png',-.58,-.1,2.4],bow_black:[null,-.58,-.1,2.4],graduation_cap:['graduation-cap-v1.png',.5,-.65,1.6],snoopy:[null,-.6,-.82,2.5],kitty:[null,.6,-.82,2.5],snoopy_topper:[null,0,.05,1.8]};
for(const [id,[file,x,y]]of Object.entries(detailSpecs)){
 meta.finishes[id]=file?art(file):{...meta.finishes[id==='bow_black'?'black-bow-tails':id]};
 NebulaDetails.types[id]={asset:id,price:id,x,y,scale:1,rotation:0,layer:'front'};
}
// The shared editor supports every detail. Validate their original bounds while
// allowing the expanded shop range to be combined and saved together.
const validDetails=NebulaDetails.valid;
NebulaDetails.valid=list=>Array.isArray(list)&&list.length<=Object.keys(detailSpecs).length&&new Set(list.map(d=>d?.id)).size===list.length&&list.every(d=>validDetails([d]));
NebulaDetails.nodes=(s,f)=>(s.finishes.decorations||[]).map(d=>{
 const a=meta.finishes[d.id],h=f.unit*detailSpecs[d.id][3]*d.scale;
 return {uid:'detail-'+d.id,detailId:d.id,url:a.url,x:f.center.x+d.x*f.radius,y:f.center.y+d.y*f.radius,w:h*a.width/a.height,h,d:h,rot:d.rotation*Math.PI/180,bright:1,tucked:d.layer==='tucked',z:500};
});
const isNote=id=>notes.has(id),active=s=>s.items.some(i=>isNote(i.id));
// Fit the opaque satin heads and narrow folded bills to the original slot spacing.
// These sizes depend only on the item's slot/mode, never the cash share: painting
// a bill cannot shrink neighbouring flowers or move the wrapping/camera. The
// Heart's ring spacing needs more bill overlap than the Dome's even packing.
const baseNodes=NebulaGeometry.nodes;
NebulaGeometry.nodes=s=>{const sc=baseNodes(s);if(!modes.includes(s.mode))return sc;
 sc.nodes=sc.nodes.map(n=>{
  if(!isNote(n.id)){
   if(!allowed.has(n.id)||n.id==='__choc')return n;
   return {...n,w:n.w*1.18,h:n.h*1.18,d:n.d*1.18};
  }
  const dx=n.x-sc.frame.center.x,dy=n.y-sc.frame.center.y;
  const h=sc.frame.unit*1.45*(s.mode==='heart'?1.45:1.30);
  return {...n,w:h*2/3,h,d:h*.8,rot:Math.hypot(dx,dy)<sc.frame.unit*.35?0:Math.atan2(dy,dx)+Math.PI/2,bright:1};
 });
 // Cash sits behind the satin heads, so notes cannot hide their faces.
 sc.nodes.sort((a,b)=>Number(!isNote(a.id))-Number(!isNote(b.id))||a.z-b.z);
 return sc;
};
function paper(s,f){
 if(s.finishes.collar===false)return null;const a=wrapArt(s);
 const w=(f.radius+f.unit*.32)*(s.mode==='heart'?3.12:3.2);
 return {uid:'paper',url:a.url,x:f.center.x,y:f.center.y,w,h:w*a.height/a.width,d:w,rot:0,bright:1,untinted:true};
}
// Existing renderer extension points select the new photographic surround.
g.NebulaRoseArt={paper,apply(){},complete(){},assets:s=>[wrapArt(s).url],reference:()=>false};
g.NebulaCustomization={assets:s=>[wrapArt(s).url,...s.finishes.decorations.map(d=>meta.finishes[d.id].url)],extras:()=>[],complete(){},valid:o=>o&&o.v===1&&Object.keys(o).every(k=>['v','cashSupply','paymentPlan'].includes(k))&&(o.cashSupply===undefined||['shop','customer'].includes(o.cashSupply))&&(o.paymentPlan===undefined||['deposit','full'].includes(o.paymentPlan)),beforeDetail(s,id){if(id.startsWith('bow_'))s.finishes.decorations=s.finishes.decorations.filter(d=>!d.id.startsWith('bow_'));},placeDetail:(s,d)=>d,detailFrame:(s,f)=>f};
function inScope(s){
 if(!s||!modes.includes(s.mode)||!Array.isArray(s.items)||s.items.some(i=>!allowed.has(i.id)))return false;
 const f=s.finishes;if(!f||!Object.hasOwn(wraps[s.mode],f.paper)||f.ribbon!=='none'||!['none','blank_blackband'].includes(f.sash))return false;
 if(['fillerCount','greeneryCount','initial','greenRim','pumpkin','bow','spookyMask','spookyBow','ghostCount','thistleCount','chocolateBox'].some(k=>!!f[k])||f.roseArtwork||s.photographic||s.template?.layout)return false;
 if((f.decorations||[]).some(d=>!Object.hasOwn(detailSpecs,d.id)))return false;
 const t=s.template;if(t&&(t.palette.some(id=>!allowed.has(id))||['wall','fill','center'].some(k=>!allowed.has(t.zones[k]))||(t.accent.count&&!allowed.has(t.accent.id))||Object.values(t.overrides).some(id=>id!==null&&!allowed.has(id))))return false;
 return true;
}
const validate=M.validate;
M.validate=raw=>{try{if(!inScope(raw))return null;const s=validate(raw);return inScope(s)?s:null;}catch{return null;}};
const migrate=M.migrateV3;M.migrateV3=raw=>{try{const s=migrate(raw);return inScope(s)?s:null;}catch{return null;}};
const defaultMode=M.defaultMode;
M.defaultMode=mode=>{if(!modes.includes(mode))throw Error('Ray’s supports Buchón and Heart only.');const s=defaultMode(mode);s.template.accent.id='rose_pink';s.finishes.studio={v:1};return s;};
const switchMode=M.switchMode;M.switchMode=(s,mode,bank)=>modes.includes(mode)?switchMode(s,mode,bank):{ok:false,reason:'unsupported'};
function recipe(id){
 const r=RAY_BUILDER.recipes.find(r=>r.id===id),d=RAY_STORE.designs.find(d=>d.id===id);if(!r||!d)return null;
 const s=M.defaultMode('dome');M.resize(s,r.capacity);s.template.palette=[...r.palette];s.template.overrides={};s.template.accent.count=0;
 if(r.sequence)for(let i=0;i<r.capacity;i++)s.template.overrides[i]=r.sequence[Math.floor(i/2)%r.sequence.length];
 if(r.flowerGroups){const pool=r.flowerGroups.map(g=>({...g,left:g.count,index:0}));for(let slot=0;slot<r.capacity;slot++){const group=pool.filter(g=>g.left).sort((a,b)=>b.left/b.count-a.left/a.count)[0];s.template.overrides[slot]=group.ids[group.index++%group.ids.length];group.left--;}}
 for(const [slot,id]of r.accents||[])s.template.overrides[slot]=id;
 for(let i=0;i<(r.centreFlowers||0);i++)s.template.overrides[i]=r.centreFlower;
 Object.assign(s.finishes,{paper:r.paper,tint:'#b69aca',sash:r.sash,sashText:r.sashText||'',crown:!!r.crown});
 s.finishes.decorations=r.decorations.map(id=>NebulaDetails.create(id));s.title=d.name;M.syncTemplate(s);return s;
}
M.create=(id='anus-daydream')=>recipe(id)||M.defaultMode('dome');
for(const lib of [NebulaClassic,NebulaFall,NebulaSpooky])lib.recipes=[];
NebulaRomance.recipes=RAY_STORE.designs.map(d=>({id:d.id,en:d.name,es:d.name,mode:'dome'}));NebulaRomance.create=recipe;
M.portfolio=(s,bank)=>({format:'nebula-bouquet-studio',version:6,activeMode:s.mode,bouquets:Object.fromEntries(modes.filter(mode=>mode===s.mode||bank[mode]).map(mode=>[mode,M.clone(mode===s.mode?s:bank[mode])]))});
M.validatePortfolio=raw=>{if(!raw||raw.format!=='nebula-bouquet-studio'||raw.version!==6||!modes.includes(raw.activeMode)||!raw.bouquets||Object.keys(raw.bouquets).some(k=>!modes.includes(k)))return null;const bouquets={};for(const [mode,design]of Object.entries(raw.bouquets)){const s=M.validate(design);if(!s||s.mode!==mode)return null;bouquets[mode]=s;}return bouquets[raw.activeMode]?{format:raw.format,version:6,activeMode:raw.activeMode,bouquets}:null;};
M.price=s=>g.RayPayments?.price(s)||RayCommerce.preview(s,P);
M.order=(s,lang='en')=>({format:'nebula-bouquet',version:6,estimateOnly:true,draft:true,currency:'CAD',design:M.clone(s),pickList:M.price(s).lines.map(l=>({...l,name:CAT[l.id][lang]})),pricing:M.price(s),notice:'Owner preview with confirmed starting recipes. Variable prices require Ray’s final quote. No order or payment has been placed.'});
// The original export compositor is synchronous. Change only its amount label
// for quotes, restoring the shared formatter even if drawing fails.
const exportCanvas=NebulaRenderer.exportCanvas;
NebulaRenderer.exportCanvas=(s,w,h,lang)=>{const money=M.money,p=M.price(s);try{if(p.quoteRequired)M.money=()=> 'QUOTE REQUIRED';return exportCanvas(s,w,h,lang);}finally{M.money=money;}};
NebulaRenderer.blob=async(s,w,h,lang)=>{await NebulaRenderer.awaitAssets(s);const cv=NebulaRenderer.exportCanvas(s,w,h,lang);return new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(Error('PNG export failed.')),'image/png'));};
Object.assign(NebulaShop,{restricted:false,recipeAllowed:id=>RAY_STORE.designs.some(d=>d.id===id),recipe,modeAllowed:mode=>modes.includes(mode),assess:s=>({ok:inScope(s),restricted:false}),message:()=>"Choose a supported satin design for Ray’s Bouquetz."});
Object.assign(NebulaI18n.en,{
 studio:'HANDMADE SATIN & FOAM BOUQUETS',dome:'Buchón / Dome',domeShort:'A rounded satin bouquet',heart:'Heart',heartShort:'A heart made by hand',roses:'Satin roses',
 yourAtelier:'THE RAY’S BOUQUET STUDIO',pageTitle:'A little more you.',flowers:'Flowers',perStem:'per flower',demoEstimate:'PREVIEW ESTIMATE',sampleShort:'draft',
 aboutLead:'Try their colours and finishing touches before Ray’s makes your gift.',aboutPoint1:'Explore handmade satin flowers in your favourite colours.',aboutHonest:'A visual preview. Ray’s confirms the finished arrangement and final quote.',
 topCatalogueNote:'Choose a satin flower, then tap a bloom to replace it. Money artwork is illustrative.',domeNote:'Satin & foam flowers · rounded arrangement',heartNote:'Satin & foam flowers · heart arrangement',
 separateHint:'Buchón and Heart each keep their own design.',blackCollar:'Small triangle wrapping',collarDescription:'Layered triangular paper around your satin bouquet.',realPaper:'RAY’S SIGNATURE WRAPPING',tintDisclosure:'Preview artwork; paper styles and colours are subject to shop approval.',
 orderIt:'Review this bouquet',orderEyebrow:'DESIGN REVIEW',orderTitle:'Your bouquet preview',orderHint:'Review your design. Ray’s will confirm quantities, availability and the final CAD price.',orderDemo:'Owner preview with confirmed recipe counts. Variable menu items need a final quote; payments are not connected.',orderFine:'Requests and Square payments will be enabled after shop approval.',orderSend:'Ordering opens after approval',
 priceDisclaimer:'Preview estimates in CAD. Menu starting prices, variable add-ons and the dated USD rate need a final quote. Ray’s confirms the final quote before payment.',
 saveTitle:'Keep your creation.',priceBreakdown:'Your preview estimate',base:'Preparation (preview: included)',labor:'Arranging (preview: included)',bow_lilac:'Lilac satin bow',bow_black:'Black satin bow',graduation_cap:'Graduation cap',money_styling:'Money styling — wrapping & assembly included',message_bow_bundle:'Personalised message ribbon + bow',bouquet_menu:'Bouquet menu starting price',mixed_menu:'Mixed bouquet menu starting price',glitter:'Glitter finish',custom:'Lilac triangle paper',black:'Black triangle paper',ivory:'Ivory triangle paper',blush:'Pink triangle paper',
 usd_exchange_margin:'USD exchange buffer (preview)',allFlowers:'Flowers, notes & chocolates',
 moveFlowers:'Arrange',moveFinish:'Done',
 });
for(const [id,c]of Object.entries(CAT))if(allowed.has(id))NebulaI18n.en[id]=c.en;
g.RayBuilder={modes,flowers,notes,wraps,recipe,inScope,active,wrapArt,policy:P};
// Old preview links keep working after adopting the original builder routes.
const q=new URLSearchParams(location.search);if(q.has('bouquet')&&!q.has('template')&&RAY_STORE.designs.some(d=>d.id===q.get('bouquet'))){q.set('template',q.get('bouquet'));q.delete('bouquet');history.replaceState(null,'',location.pathname+'?'+q+location.hash);}
})(window);
