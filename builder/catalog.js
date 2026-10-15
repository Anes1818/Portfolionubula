/* Browsing only: no canvas, artwork bundle, model, or editor boot on this page. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const recipes = window.NEBULA_COLLECTIONS || [];
  const cards = [...document.querySelectorAll('.bouquet-card')];
  const english = Object.fromEntries([...document.querySelectorAll('[data-copy]')].map(el => [el.dataset.copy, el.textContent]));
  const spanish = {
    skip:'Ir a los ramos',about:'Para floristerías',saved:'Ramos guardados',language:'Idioma',eyebrow:'Un poco de inspiración, solo para ti',headline:'Encuentra un ramo.',headlineEm:'Hazlo tuyo.',intro:'Empieza con algo que te encante. Después juega con las flores, los colores y cada pequeño detalle en tu propio estudio de ramos.',resume:'Continuar mi ramo →',aside:'Una primera cita. Un gran día. O un bonito detalle porque sí.',asideLabel:'Hay un ramo para eso.',all:'Todos los ramos',love:'Para el amor',halloween:'Un poco de misterio',fall:'Calidez de otoño',search:'Encuentra tu ramo',photoNote:'Imágenes de inspiración · El diseño editable se abre en el estudio',emptyTitle:'¿Otra clase de flor?',emptyCopy:'Prueba otra flor o explora toda la colección.',reset:'Ver todos los ramos',yourWay:'¿Tienes tu propia idea?',studioTitle:'Hay espacio para crear.',studioCopy:'Explora los arreglos Clásico, Domo y Corazón. Tu diseño actual te acompaña.',openStudio:'Abrir el estudio de ramos',savedEyebrow:'Pequeñas ideas que vale la pena guardar',savedHint:'Guardados en este navegador y dispositivo. Abre un diseño para seguir creando.',stepOne:'Elige un punto de partida',stepOneCopy:'Encuentra un estilo que te recuerde a esa persona.',stepTwo:'Hazlo personal',stepTwoCopy:'Personalízalo y revisa la estimación detallada.',stepThree:'Inicia la conversación',stepThreeCopy:'Prepara una solicitud por WhatsApp para tu florista.',estimateNote:'El estudio usa precios de muestra. Tu florista confirma la disponibilidad, el ramo final y el precio. Aquí no se confirma ningún pedido.',footer:'Arreglado con cuidado. Completamente tuyo.',removeTitle:'¿Eliminar este ramo guardado?',removeNote:'Tu diseño actual en el estudio no cambiará.',keep:'Conservar',remove:'Eliminar'
  };
  let lang = 'en', filter = 'all', pendingRemoval = null;
  const shelfKey = 'nebulaSavedBouquetsV1';
  const t = key => lang === 'es' ? spanish[key] || english[key] || key : english[key] || key;
  const choose = (en, es) => lang === 'es' ? es : en;
  const normalized = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const params = new URLSearchParams(location.search);
  if (['all','love','halloween','fall'].includes(params.get('collection'))) filter = params.get('collection');
  $('bouquetSearch').value = (params.get('q') || '').slice(0,120);
  $('collectionTools').hidden = false;

  function filterCards(saveURL = true) {
    const query = normalized($('bouquetSearch').value.trim());
    let count = 0;
    cards.forEach(card => {
      const recipe = recipes.find(item => item.id === card.dataset.id);
      if (!recipe) return;
      const haystack = normalized([recipe.en,recipe.es,recipe.description,recipe.descriptionEs,t(recipe.collection)].join(' '));
      card.hidden = (filter !== 'all' && recipe.collection !== filter) || !query.split(/\s+/).every(word => haystack.includes(word));
      if (!card.hidden) count++;
    });
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    $('resultCount').textContent = choose(`${count} ${count === 1 ? 'bouquet' : 'bouquets'} to make your own`, `${count} ${count === 1 ? 'ramo para hacer tuyo' : 'ramos para hacer tuyos'}`);
    $('emptyState').hidden = count !== 0;
    $('clearSearch').hidden = !$('bouquetSearch').value;
    if (saveURL) {
      const next = new URLSearchParams(location.search);
      filter === 'all' ? next.delete('collection') : next.set('collection',filter);
      query ? next.set('q',$('bouquetSearch').value.trim()) : next.delete('q');
      try { history.replaceState(null,'',location.pathname+(next.size?'?'+next:'')+location.hash); } catch {}
    }
  }

  // Inspect shelf metadata without loading the design engines. The editor fully
  // validates the chosen recipe before opening it; untouched entries stay intact.
  function readShelf() {
    const raw = localStorage.getItem(shelfKey);
    if (!raw) return [];
    if (raw.length > 2000000) throw Error('invalid');
    const entries = JSON.parse(raw), ids = new Set();
    if (!Array.isArray(entries) || entries.length > 20) throw Error('invalid');
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 80 || ids.has(entry.id) || !Number.isFinite(entry.savedAt) || !entry.design || !['classic','dome','heart'].includes(entry.design.mode) || !Array.isArray(entry.design.items)) throw Error('invalid');
      ids.add(entry.id);
    }
    return entries;
  }
  function renderSaved() {
    $('savedGrid').replaceChildren();
    try {
      $('resumeDesign').hidden = !['nebulaBouquetV6','nebulaBouquetV5','nebulaBouquetV4'].some(key => localStorage.getItem(key));
      const entries = readShelf();
      $('savedStatus').textContent = entries.length
        ? choose(`${entries.length} of 20 saved spaces used.`,`${entries.length} de 20 espacios guardados.`)
        : choose('Your next favorite starts here. Save a copy from the studio and find it here when you return.','Tu próximo favorito empieza aquí. Guarda una copia en el estudio y encuéntrala aquí cuando vuelvas.');
      entries.forEach(entry => {
        const card = document.createElement('article');card.className = 'saved-card';
        const title = document.createElement('h3');title.textContent = typeof entry.design.title === 'string' && entry.design.title.trim() ? entry.design.title.slice(0,70) : choose('Untitled bouquet','Ramo sin título');
        const meta = document.createElement('p');
        const modes = {classic:choose('Classic','Clásico'),dome:choose('Dome','Domo'),heart:choose('Heart','Corazón')};
        meta.textContent = `${modes[entry.design.mode]} · ${entry.design.items.length} ${choose('pieces','piezas')}`;
        const actions = document.createElement('div');actions.className = 'saved-actions';
        const open = document.createElement('a');open.className = 'customize-link';open.href = 'studio.html?saved='+encodeURIComponent(entry.id);open.textContent = choose('Continue creating ↗','Seguir creando ↗');open.setAttribute('aria-label',choose('Open ','Abrir ')+title.textContent);
        const remove = document.createElement('button');remove.type = 'button';remove.className = 'remove-link';remove.textContent = t('remove');remove.setAttribute('aria-label',t('remove')+' '+title.textContent);
        remove.addEventListener('click',() => {pendingRemoval=entry.id;$('removeDescription').textContent=title.textContent;$('removeDialog').returnValue='cancel';$('removeDialog').showModal();});
        actions.append(open,remove);card.append(title,meta,actions);$('savedGrid').append(card);
      });
    } catch {
      $('savedStatus').textContent = choose('Saved bouquets are unavailable in this browser. Your existing data has not been changed.','Los ramos guardados no están disponibles en este navegador. Tus datos no se han modificado.');
    }
  }
  function localize() {
    document.documentElement.lang = lang;$('language').value = lang;
    document.querySelectorAll('[data-copy]').forEach(el => {el.textContent=t(el.dataset.copy);});
    const brand = typeof window.NEBULA_SHOP?.name === 'string' ? window.NEBULA_SHOP.name.trim().slice(0,60) : 'Nebula';
    $('brandName').textContent = brand;$('footerBrand').textContent = brand;
    document.title = brand+' — '+choose('The bouquet collection','La colección de ramos');
    document.querySelector('.brand').setAttribute('aria-label',document.title);
    $('language').setAttribute('aria-label',t('language'));
    $('bouquetSearch').placeholder = choose('Roses, sunshine, a little love…','Rosas, girasoles, un poco de amor…');
    $('bouquetSearch').setAttribute('aria-label',t('search'));
    $('clearSearch').setAttribute('aria-label',choose('Clear search','Borrar búsqueda'));
    document.querySelector('.filters').setAttribute('aria-label',choose('Filter collections','Filtrar colecciones'));
    if (window.NEBULA_SHOP?.demo === false) $('estimateNote').textContent = choose('Your florist confirms availability, the finished bouquet and the final price. No order is confirmed here.','Tu florista confirma la disponibilidad, el ramo final y el precio. Aquí no se confirma ningún pedido.');
    cards.forEach(card => {
      const recipe = recipes.find(item => item.id === card.dataset.id);if(!recipe)return;
      const title = recipe[lang];
      card.querySelector('h2 a').textContent=title;
      card.querySelector('.card-copy>p').textContent=lang==='es'?recipe.descriptionEs:recipe.description;
      card.querySelector('.collection-tag').textContent=t(recipe.collection);
      card.querySelector('.customize-link span').textContent=choose('Make it yours','Hazlo tuyo');
      card.querySelector('.bouquet-picture').setAttribute('aria-label',choose('Customize ','Personalizar ')+title);
      card.querySelector('img').alt=title+' — '+(recipe.id==='pumpkin-patch'?choose('editable design preview','vista del diseño editable'):choose('inspiration image','imagen de inspiración'));
    });
    filterCards(false);renderSaved();
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',()=>{filter=button.dataset.filter;filterCards();}));
  $('bouquetSearch').addEventListener('input',()=>filterCards());
  $('clearSearch').addEventListener('click',()=>{$('bouquetSearch').value='';filterCards();$('bouquetSearch').focus();});
  $('resetFilters').addEventListener('click',()=>{filter='all';$('bouquetSearch').value='';filterCards();document.querySelector('[data-filter="all"]').focus();});
  $('language').addEventListener('change',()=>{lang=$('language').value==='es'?'es':'en';try{localStorage.setItem('nebulaLanguageV4',lang);}catch{}localize();});
  $('removeDialog').addEventListener('close',()=>{
    if($('removeDialog').returnValue==='remove'&&pendingRemoval){
      try{localStorage.setItem(shelfKey,JSON.stringify(readShelf().filter(entry=>entry.id!==pendingRemoval)));renderSaved();$('savedTitle').tabIndex=-1;$('savedTitle').focus();}
      catch{$('savedStatus').textContent=choose('The saved bouquet could not be removed. Please try again.','No se pudo eliminar el ramo. Inténtalo de nuevo.');}
    }
    pendingRemoval=null;
  });
  document.querySelectorAll('.bouquet-picture img').forEach(image=>image.addEventListener('error',()=>{image.hidden=true;image.closest('a').classList.add('image-unavailable');}));
  function refresh(){try{lang=localStorage.getItem('nebulaLanguageV4')==='es'?'es':'en';}catch{}localize();}
  addEventListener('pageshow',refresh);addEventListener('storage',refresh);refresh();
})();
