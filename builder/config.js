/* All amounts are DEMO integer cents in USD. No checkout/contact destination is configured.
   Edit this file for approved prices; changing currency DOES NOT convert amounts. */
(function(g){'use strict';
const CONFIG={brand:'Nebula',currency:'USD',demo:true,baseCents:2500,laborCents:{classic:1000,dome:1000,heart:1500},extrasCents:{butterfly:300,ribbon:0,sash:0},limits:{classicMain:20,classicArea:20,classicTexture:4,topItems:100,topTexture:8},storageKey:'nebulaBouquetV6',previousKey:'nebulaBouquetV5',olderKey:'nebulaBouquetV4',legacyKey:'nebulaBuilderV3'};
const CAT={};
const colors={red:['Red','roja'],pink:['Pink','rosa'],white:['White','blanca'],violet:['Violet','violeta'],yellow:['Yellow','amarilla'],orange:['Orange','naranja']};
for(const [family,en,es,price,diam,top] of [['rose','rose','Rosa',400,116,88],['tulip','tulip','Tulipán',300,86,76],['carnation','carnation','Clavel',250,106,82]]){
 for(const [color,labels] of Object.entries(colors)){
  const esColor=family==='rose'?labels[1]:({roja:'rojo',blanca:'blanco',amarilla:'amarillo'}[labels[1]]||labels[1]);
  CAT[family+'_'+color]={en:labels[0]+' '+en,es:es+' '+esColor,family,color,priceCents:price,classicDiameter:diam,topDiameter:top,kind:'flower',classic:true};
 }
}
for(const [id,en,es,price,diam,top,kind,classic] of [
 /* A real lily head is roughly 1.6x a rose across; 168 read as 1.45x and looked small. */
 ['lily','Pink lily','Lirio rosa',500,190,122,'flower',true],
 ['gerbera_daisy','White gerbera','Gerbera blanca',400,143,98,'flower',true],
 ['sunflower','Sunflower','Girasol',400,150,114,'flower',true],
 ['ranunculus','Cream ranunculus','Ranúnculo crema',500,105,80,'flower',true],
 ['alstroemeria','Alstroemeria','Alstroemeria',300,116,90,'flower',true],
 ['eucalyptus','Eucalyptus sprig','Rama de eucalipto',200,108,88,'texture',true],
 ['limonium','Limonium sprig','Rama de limonium',200,112,88,'texture',true],
 ['babys_breath','Airy baby’s breath','Paniculata ligera',200,118,76,'texture',true],
 ['hydrangea','White hydrangea','Hortensia blanca',650,174,126,'flower',true],
 ['__choc','Gold chocolate','Chocolate dorado',500,70,65,'chocolate',false]
])CAT[id]={en,es,family:kind==='flower'?'accents':kind,color:null,priceCents:price,classicDiameter:diam,topDiameter:top,kind,classic};
/* Baby's breath is a side-view sprig. Seen straight down in Dome/Heart it reads as a
   grey smudge, so it is offered in Classic only. The compact and medium stemless
   clusters were withdrawn for the same reason; RETIRED maps old saves onto the survivor. */
CAT.babys_breath.top=false;
const RETIRED={babys_compact:'babys_breath',babys_medium:'babys_breath'};
// Hydrangea $6.50 and filler $2 are illustrative demo amounts, not confirmed florist pricing.
const MISSING=[];
const SIZES={dome:[['Mini',15],['S',30],['M',44],['L',62],['XL',84]],heart:[['Mini',8],['S',21],['M',41],['L',67],['XL',100]]};
/* Three Classic starting points. Each stays inside the ~20 rose-sized unit limit. */
const PRESETS={
 romantic:{en:'Romantic',es:'Romántico',cover:'rose_red',items:['rose_red','rose_pink','rose_red','rose_pink','rose_red','babys_breath','rose_pink','rose_red','rose_pink','rose_red','babys_breath','rose_pink']},
 pureWhite:{en:'Pure white',es:'Blanco puro',cover:'rose_white',items:['rose_white','gerbera_daisy','rose_white','carnation_white','rose_white','gerbera_daisy','carnation_white','rose_white','babys_breath','rose_white','carnation_white','gerbera_daisy']},
 brightMix:{en:'Bright mix',es:'Mezcla alegre',cover:'sunflower',items:['sunflower','tulip_yellow','rose_pink','tulip_orange','sunflower','rose_pink','tulip_yellow','tulip_orange','rose_pink','tulip_yellow']}
};
const shop=g.NEBULA_SHOP||{};
if(typeof shop.name==='string'&&shop.name.trim())CONFIG.brand=shop.name.trim().slice(0,60);
if(typeof shop.currency==='string'&&/^[A-Z]{3}$/.test(shop.currency)){try{new Intl.NumberFormat('en',{style:'currency',currency:shop.currency});CONFIG.currency=shop.currency;}catch(e){}}
CONFIG.demo=shop.demo!==false;const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
if(cents(shop.baseCents))CONFIG.baseCents=shop.baseCents;
for(const k of ['classic','dome','heart'])if(cents(shop.laborCents?.[k]))CONFIG.laborCents[k]=shop.laborCents[k];
for(const k of ['butterfly','ribbon','sash'])if(cents(shop.extrasCents?.[k]))CONFIG.extrasCents[k]=shop.extrasCents[k];
for(const id of Object.keys(CAT))if(cents(shop.flowerPrices?.[id]))CAT[id].priceCents=shop.flowerPrices[id];
CONFIG.whatsapp=typeof shop.whatsapp==='string'&&/^[1-9]\d{7,14}$/.test(shop.whatsapp)?shop.whatsapp:'';
CONFIG.email=typeof shop.email==='string'&&/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(shop.email)?shop.email:'';
g.NebulaConfig={CONFIG,CAT,MISSING,PRESETS,SIZES,RETIRED};
})(typeof window!=='undefined'?window:globalThis);
