/* Trusted static profile only. URL/imported designs never configure the shop. */
(function(g){'use strict';
 const id=g.NEBULA_SHOP?.id;
 const scoped=typeof id==='string'&&/^[a-z0-9-]{1,60}$/.test(id);
 const shop=g.NEBULA_SHOP||{},restricted=!!scoped&&shop.demo===false;
 const loc=g.location||{},host=(loc.hostname||'').toLowerCase(),proto=loc.protocol||'';
 const localHost=host==='localhost'||host==='127.0.0.1'||host==='[::1]'||host.endsWith('.localhost');
 const customSite=String(shop.studio?.site||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,'');
 const hostClean=host.replace(/^www\./,'');
 const hostAllowed=proto!=='file:'&&(!loc.hostname||(/^https?:$/.test(proto)&&(
  localHost||
  hostClean==='nebulastudio.site'||
  host.endsWith('.nebulastudio.site')||
  (customSite&&(hostClean===customSite||host.endsWith('.'+customSite)))
 )));
 if(!hostAllowed){
  try{if(g.document?.documentElement)g.document.documentElement.innerHTML='';}catch{}
  try{if(typeof loc.replace==='function')loc.replace('https://nebulastudio.site/shop-setup.html');}catch{}
  g.NebulaShop={hostAllowed:false,restricted:true,key:k=>k,recipeAllowed:()=>false,recipe:()=>null,assess:()=>({ok:false,restricted:true,reason:'unauthorized-host'}),modeAllowed:()=>false,message:()=>''};
  return;
 }
 if(!restricted&&typeof loc.pathname==='string'&&/^\/(?:builder|demo\/nebula-builder)(?:\/|$)/.test(loc.pathname)){
  const q=new URLSearchParams(loc.search||'');
  let vip=q.get('vip')==='nebula'||q.get('vip')==='1'||q.get('access')==='nebula';
  if(vip){try{g.sessionStorage?.setItem('nebula_vip','1');g.localStorage?.setItem('nebula_vip','1');}catch{}}
  else{try{vip=g.sessionStorage?.getItem('nebula_vip')==='1'||g.localStorage?.getItem('nebula_vip')==='1';}catch{}}
  if((!localHost||q.get('test_gate')==='1')&&!vip){
   try{if(typeof loc.replace==='function')loc.replace('/shop-setup.html');}catch{}
   g.NebulaShop={hostAllowed:false,restricted:true,key:k=>k,recipeAllowed:()=>false,recipe:()=>null,assess:()=>({ok:false,restricted:true,reason:'invite-only'}),modeAllowed:()=>false,message:()=>''};
   return;
  }
 }
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
 g.NebulaShop={hostAllowed:true,key:key=>scoped?'shop:'+id+':'+key:key,restricted,recipeAllowed,recipe,assess,modeAllowed,message};
})(window);
