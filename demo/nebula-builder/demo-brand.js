/* Nebula's florist-facing demo identity, loaded after client presentation. */
(()=>{
 const shop=window.NEBULA_SHOP;
 const copy={
 en:{eyebrow:'NEBULA · MADE FOR FLOWER SHOPS',headline:'Let your customers build',headlineEm:'their perfect bouquet.',intro:'Let them explore flowers, wrapping and finishing touches, then send you a clear design request. You confirm availability, substitutions and the final price.',explore:'Try the customer experience',photoNote:'Interactive bouquet demo · Sample prices',stepThree:'Receive a clear request',stepThreeCopy:'Review their design and preferences before confirming the details.',estimateNote:'Your brand. Your collection. Your prices. This demo uses sample estimates; the florist always confirms the final design and price.',studioCopy:'Explore the experience your customers could use to personalize a bouquet.',footer:'A little imagination. A clearer bouquet request.'},
 es:{eyebrow:'NEBULA · PARA FLORISTERÍAS',headline:'Deja que tus clientes creen',headlineEm:'su ramo ideal.',intro:'Exploran flores, envoltorios y detalles, y te envían una solicitud clara con su diseño. Tú confirmas disponibilidad, sustituciones y precio final.',explore:'Prueba la experiencia del cliente',photoNote:'Demo interactiva de ramos · Precios de ejemplo',stepThree:'Recibe una solicitud clara',stepThreeCopy:'Revisa el diseño y las preferencias antes de confirmar los detalles.',estimateNote:'Tu marca. Tu colección. Tus precios. Esta demo usa estimaciones de ejemplo; la floristería confirma el diseño y el precio final.',studioCopy:'Explora cómo tus clientes podrían personalizar sus ramos.',footer:'Un poco de imaginación. Una solicitud más clara.'}
 };
 for(const lang of ['en','es'])Object.assign(shop.catalogCopy[lang],copy[lang]);
 document.querySelectorAll('.site-header .brand').forEach(el=>{el.querySelector('.brand-chip')?.remove();const img=document.createElement('img');img.src='assets/brand/nebula-logo.jpg';img.alt='Nebula Sites Studio';img.className='demo-header-logo';img.width=64;img.height=64;el.prepend(img);});
 const intro=document.querySelector('.collection-intro');
 if(intro){const image=document.createElement('img');image.src='assets/brand/nebula-logo.jpg';image.alt='Nebula Sites Studio — floral watercolor logo';image.className='demo-hero-logo';image.width=640;image.height=640;intro.append(image);}
 const update=()=>{const es=document.getElementById('language')?.value==='es';document.querySelectorAll('.demo-shop-link').forEach(e=>e.textContent=es?'Quiero esto para mi tienda ↗':'Get this for your shop ↗');};
 const nav=document.querySelector('.site-header nav');if(nav){const link=document.createElement('a');link.href='index.html#get-started';link.className='demo-shop-link';nav.prepend(link);}
 update();document.getElementById('language')?.addEventListener('change',update);
})();
