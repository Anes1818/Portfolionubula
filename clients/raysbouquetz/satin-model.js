/* Ray's uses the existing exact-count Dome/Heart geometry, with a satin-only catalogue. */
(function(g){'use strict';
 const store=g.RAY_STORE,CAT=g.NebulaConfig.CAT,meta={flowers:{},wraps:{},finishes:{}};
 for(const id of Object.keys(CAT))delete CAT[id];
 const register=(id,label,material,colour,asset)=>{CAT[id]={en:label,es:label,family:'satin',kind:'flower',material,colour,priceCents:store.pricing.unitCents[material]??0,classic:false,classicOffered:false,top:true,classicDiameter:116,topDiameter:88};meta.flowers[id]={head:asset?.url||'',headWidth:asset?.width||1024,headHeight:asset?.height||1024,headRadius:asset?.headRadius||.46,headView:'overhead',classicAvailable:false};};
 for(const material of ['ribbon_rose','foam_rose'])for(const colour of store.colours){const id=material+'_'+colour.id,asset=store.assets.flowers.find(a=>a.id===id);register(id,colour.name+' '+(material==='ribbon_rose'?'ribbon rose':'foam rose'),material,colour.id,asset);}
 for(const asset of store.assets.flowers)if(!CAT[asset.id])register(asset.id,asset.label,asset.material,asset.colour,asset);
 for(const [currency,values]of Object.entries(store.pricing.denominations))for(const value of values){const id='note_'+currency.toLowerCase()+'_'+value;register(id,currency+' $'+value+' note','cash',null,store.assets.flowers.find(a=>a.id===id));CAT[id].kind='money';}
 g.NEBULA_META=meta;g.NebulaDetails={valid:items=>Array.isArray(items)&&items.length===0};
 const C=g.NebulaConfig.CONFIG;C.brand=store.name;C.currency='CAD';C.demo=true;C.baseCents=0;C.laborCents={classic:0,dome:0,heart:0};C.limits.topItems=100;
})(window);
