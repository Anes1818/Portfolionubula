/* Client-only, static photo cards. The homepage does not load editor engines. */
const fs=require('node:fs'),path=require('node:path');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function section(client,allowed=()=>true){
 const entries=JSON.parse(fs.readFileSync(path.join(client,'top-sellers.json'),'utf8')).filter(e=>allowed(e.id));
 if(!entries.length)return '';
 const copy=(key,en,es)=>`data-copy="${esc(key)}" data-featured-en="${esc(en)}" data-featured-es="${esc(es)}"`;
 return `<section class="top-sellers shell" id="top-sellers" aria-labelledby="topSellersTitle">
 <div class="top-sellers-heading"><div><p class="eyebrow" ${copy('featuredEyebrow','FROM LA FLOR ETERNA','DE LA FLOR ETERNA')}>FROM LA FLOR ETERNA</p><h2 id="topSellersTitle" ${copy('featuredTitle','Top Sellers','Los más vendidos')}>Top Sellers</h2></div><a class="featured-all" href="#collection" ${copy('featuredAll','Explore all bouquets ↗','Ver todos los ramos ↗')}>Explore all bouquets ↗</a></div>
 <p class="featured-intro" ${copy('featuredIntro','A little inspiration from Maritza’s own creations. Choose a favorite and make it yours.','Inspírate en las creaciones de Maritza. Elige tu favorito y hazlo tuyo.')}>A little inspiration from Maritza’s own creations. Choose a favorite and make it yours.</p>
 <div class="featured-grid">${entries.map(e=>{
  if(!/^studio\.html#b=[A-Za-z0-9_-]+$/.test(e.href))throw Error('Invalid featured bouquet link');
  return `<article class="featured-card" data-featured-id="${esc(e.id)}"><a class="featured-photo" href="${esc(e.href)}"><img src="${esc(e.image)}" alt="${esc(e.en)} — La Flor Eterna florist photograph" width="960" height="1280" loading="lazy" decoding="async"><span class="picture-arrow" aria-hidden="true">↗</span></a><div class="featured-copy"><h3><a href="${esc(e.href)}" ${copy(e.id+'Title',e.en,e.es)}>${esc(e.en)}</a></h3><p ${copy(e.id+'Description',e.description,e.descriptionEs)}>${esc(e.description)}</p><a class="customize-link" href="${esc(e.href)}"><span ${copy('featuredCustomize','Customize this bouquet','Personaliza este ramo')}>Customize this bouquet</span><span aria-hidden="true">↗</span></a></div></article>`;
 }).join('\n')}</div>
 <p class="featured-note" ${copy('featuredNote','Original florist photographs. The studio opens an editable interpretation; flowers and finishing details may vary.','Fotografías originales de la florista. El estudio abre una interpretación editable; las flores y los acabados pueden variar.')}>Original florist photographs. The studio opens an editable interpretation; flowers and finishing details may vary.</p>
 </section>`;
}
module.exports={section};
