/* All amounts are DEMO integer cents in USD. No checkout/contact destination is configured.
   Edit this file for approved prices; changing currency DOES NOT convert amounts. */
(function(g){'use strict';
const CONFIG={brand:'Nebula',currency:'USD',demo:true,baseCents:2500,laborCents:{classic:1000,dome:1000,heart:1500},extrasCents:{butterfly:300,diamond:200,ribbon:0,sash:0},limits:{classicMain:20,classicArea:20,classicTexture:4,topItems:100,topTexture:8},storageKey:'nebulaBouquetV6',previousKey:'nebulaBouquetV5',olderKey:'nebulaBouquetV4',legacyKey:'nebulaBuilderV3'};
const CAT={};
const colors={red:['Red','roja'],pink:['Pink','rosa'],white:['White','blanca'],violet:['Violet','violeta'],yellow:['Yellow','amarilla'],orange:['Orange','naranja']};
for(const [family,en,es,price,diam,top] of [['rose','rose','Rosa',400,116,88],['tulip','tulip','Tulipán',300,86,76],['carnation','carnation','Clavel',250,106,82]]){
 for(const [color,labels] of Object.entries(colors)){
  const esColor=family==='rose'?labels[1]:({roja:'rojo',blanca:'blanco',amarilla:'amarillo'}[labels[1]]||labels[1]);
  CAT[family+'_'+color]={en:labels[0]+' '+en,es:es+' '+esColor,family,color,priceCents:price,classicDiameter:diam,topDiameter:top,kind:'flower',classic:true};
 }
}
for(const [id,en,es,price,diam,top,kind,classic] of [
 ['lily','Pink lily','Lirio rosa',500,168,122,'flower',true],
 ['gerbera_daisy','White gerbera','Gerbera blanca',400,143,98,'flower',true],
 ['sunflower','Sunflower','Girasol',400,150,114,'flower',true],
 ['ranunculus','Cream ranunculus','Ranúnculo crema',500,105,80,'flower',true],
 ['alstroemeria','Alstroemeria','Alstroemeria',300,116,90,'flower',true],
 ['eucalyptus','Eucalyptus sprig','Rama de eucalipto',200,108,88,'texture',true],
 ['limonium','Limonium sprig','Rama de limonium',200,112,88,'texture',true],
 ['babys_breath','Airy baby’s breath','Paniculata ligera',200,118,76,'texture',true],
 ['hydrangea','White hydrangea','Hortensia blanca',650,174,126,'flower',true],
 ['babys_compact','Compact baby’s breath','Paniculata compacta',200,68,55,'texture',true],
 ['babys_medium','Medium baby’s breath','Paniculata media',200,84,70,'texture',true],
 ['__choc','Gold chocolate','Chocolate dorado',500,70,65,'chocolate',false]
])CAT[id]={en,es,family:kind==='flower'?'accents':kind,color:null,priceCents:price,classicDiameter:diam,topDiameter:top,kind,classic};
// Hydrangea $6.50 and filler $2 are illustrative demo amounts, not confirmed florist pricing.
const MISSING=[];
const SIZES={dome:[['Mini',15],['S',30],['M',44],['L',62],['XL',84]],heart:[['Mini',8],['S',21],['M',41],['L',67],['XL',100]]};
const PRESETS={
 blush:{en:'Softly, yours',es:'Suavemente tuyo',items:['rose_pink','rose_white','rose_pink','carnation_white','rose_pink','gerbera_daisy','rose_white','rose_pink','carnation_white','gerbera_daisy','lily','rose_white']},
 rose6:{en:'Six little reasons',es:'Seis pequeñas razones',items:Array(6).fill('rose_pink')},
 rose12:{en:'A dozen, with love',es:'Una docena, con amor',items:Array(12).fill('rose_red')},
 rose20:{en:'The generous gesture',es:'Un gran gesto',items:Array(20).fill('rose_pink')},
 blank:{en:'Your own creation',es:'Tu propia creación',items:[]}
};
const shop=g.NEBULA_SHOP||{};
if(typeof shop.name==='string'&&shop.name.trim())CONFIG.brand=shop.name.trim().slice(0,60);
if(typeof shop.currency==='string'&&/^[A-Z]{3}$/.test(shop.currency)){try{new Intl.NumberFormat('en',{style:'currency',currency:shop.currency});CONFIG.currency=shop.currency;}catch(e){}}
CONFIG.demo=shop.demo!==false;const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
if(cents(shop.baseCents))CONFIG.baseCents=shop.baseCents;
for(const k of ['classic','dome','heart'])if(cents(shop.laborCents?.[k]))CONFIG.laborCents[k]=shop.laborCents[k];
for(const k of ['butterfly','diamond','ribbon','sash'])if(cents(shop.extrasCents?.[k]))CONFIG.extrasCents[k]=shop.extrasCents[k];
for(const id of Object.keys(CAT))if(cents(shop.flowerPrices?.[id]))CAT[id].priceCents=shop.flowerPrices[id];
CONFIG.whatsapp=typeof shop.whatsapp==='string'&&/^[1-9]\d{7,14}$/.test(shop.whatsapp)?shop.whatsapp:'';
CONFIG.email=typeof shop.email==='string'&&/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(shop.email)?shop.email:'';
g.NebulaConfig={CONFIG,CAT,MISSING,PRESETS,SIZES};
})(typeof window!=='undefined'?window:globalThis);
