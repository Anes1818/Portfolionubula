/* Trusted static profile only. URL/imported designs never configure the shop. */
(function(g){'use strict';
 const id=g.NEBULA_SHOP?.id;
 const scoped=typeof id==='string'&&/^[a-z0-9-]{1,60}$/.test(id);
 const shop=g.NEBULA_SHOP||{},restricted=!!scoped&&shop.demo===false;
 const recipeAllowed=id=>!restricted||(Array.isArray(shop.selectedRecipeIds)&&shop.selectedRecipeIds.includes(id));
 const libraries=()=>[g.NebulaClassic,g.NebulaRomance,g.NebulaSpooky,g.NebulaFall].filter(Boolean);
 function recipe(id){return libraries().find(lib=>lib.recipes.some(r=>r.id===id))?.create(id)||null;}
 // Approval of a starting recipe does not approve every custom flower or finish.
 // Only these explicitly configured finish values may differ from that recipe.
 const optionKeys=['paper','tint','ribbon','sash','butterfly','crown','collar','fillerCount','greeneryCount'];
 function signature(design){const s=g.NebulaModel.clone(design);s.title='';s.note='';return g.NebulaLink.encode(s);}
 function assess(design){
  if(design?.photographic)return {ok:false,restricted:true,reason:'visual-study'};
  if(!restricted)return {ok:true,restricted:false};
  for(const id of shop.selectedRecipeIds||[]){
   const base=recipe(id);if(!base||base.mode!==design.mode)continue;
   const candidate=g.NebulaModel.clone(design),options=shop.recipeOptions?.[id]||{};
   for(const key of optionKeys){const values=options[key];if(Array.isArray(values)&&values.some(v=>v===candidate.finishes[key]))candidate.finishes[key]=base.finishes[key];}
   // Compare the complete encoded scene, not a user-controlled recipe label.
   if(signature(candidate)===signature(base))return {ok:true,restricted:true,recipeId:id};
  }
  return {ok:false,restricted:true,reason:'unsupported'};
 }
 function modeAllowed(mode){return !restricted||(shop.selectedRecipeIds||[]).some(id=>recipe(id)?.mode===mode);}
 const message=lang=>lang==='es'?'Este diseño no está disponible para solicitarlo a esta tienda. Puedes conservarlo o descargarlo y elegir un ramo disponible.':'This design is not available to request from this shop. You can keep or download it and choose an available bouquet.';
 g.NebulaShop={key:key=>scoped?'shop:'+id+':'+key:key,restricted,recipeAllowed,recipe,assess,modeAllowed,message};
})(window);
