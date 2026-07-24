/* Flowers Pavon — EN/ES language toggle. English lives in the HTML; this file
   provides the Spanish overrides and swaps innerHTML on [data-i18n] nodes.
   Runs after pixel.js so window.WA and initial DOM text are ready. */
(function(){
  var KEY='pavonLang';
  var nodes=[].slice.call(document.querySelectorAll('[data-i18n]'));
  var EN={};
  nodes.forEach(function(n){EN[n.getAttribute('data-i18n')]=n.innerHTML;});

  var ES={
    annc:'ORDENA ANTES DE LA <b>1PM</b> Y RECIBE EL MISMO DÍA · NORTHERN VIRGINIA',
    tagline:'ARTE FLORAL HECHO A MANO',
    nav_bouquets:'Ramos', nav_anatomy:'Anatomía', nav_studio:'El Estudio', nav_care:'Cuidado', nav_faq:'Preguntas',
    nav_shop:'💐 Ver ramos',
    hero_kicker:'♥ Floristería artesanal de Northern Virginia ♥',
    hero_h1:'Cultivadas con amor,<br><em>atadas a mano.</em>',
    hero_sub:'Cada ramo empieza con una pregunta — <b>¿para quién es?</b> Cuéntanos el momento y te entregamos las flores perfectas, envueltas y a domicilio hoy en todo Northern Virginia.',
    hero_hint:'Fresco · atado a mano · entregado en todo Northern Virginia',
    trust1:'⭐ 4.9 · 300+ reseñas locales', trust2:'🚚 mismo día antes de la 1PM', trust3:'🌱 atadas frescas cada mañana',
    occ_q:'▼ ¿CUÁL ES LA OCASIÓN? ▼',
    occ_birthday:'Cumpleaños', occ_love:'Amor', occ_baby:'Bebé', occ_sympathy:'Condolencias', occ_getwell:'Pronta Mejora', occ_just:'Porque Sí',
    fog_k:'✿ FRESCAS DE NUESTRO ESTUDIO ✿', fog_h:'Tu ramo, a tu manera.',
    fog_build:'🌸 Arma el tuyo', fog_shop:'💐 Ver los listos',
    cat_kicker:'El menú de ramos', cat_h:'Elige el momento. Nosotros elegimos las flores.',
    cat_p:'Nuestros ramos buchón insignia, arreglos frescos y flores preservadas — cada precio en la tarjeta. Cada foto aquí es un ramo real de Flowers Pavon. 🌸',
    gal_kicker:'Directo de nuestro estudio', gal_h:'Más ramos reales de Flowers Pavon.',
    gal_p:'Un vistazo a pedidos recientes — corazones, girasoles, tulipanes, lirios y bandas personalizadas. ¿Quieres algo así? Envíanos la foto por WhatsApp. 📸',
    gcap1:'Mixto y vivo', gcap2:'Rosas blancas', gcap3:'Rosas lavanda', gcap4:'Rosas amarillas en jarrón', gcap5:'Ramo de lirios', gcap6:'Corazón · rosas rojas', gcap7:'Corazón · rosas', gcap8:'Rosas y nube',
    f_all:'TODOS', f_love:'AMOR',
    bd_best:'MÁS VENDIDO', bd_lux:'LUJO', bd_gift:'MÁS REGALADO', bd_new:'NUEVO',
    rec1:'<b>Contiene:</b> una cúpula radiante de girasoles frescos, atada estilo buchón con envoltura premium — nuestra firma para el Día de la Madre.',
    rec2:'<b>Contiene:</b> nuestro buchón más grande — una cúpula imponente de rosas rojas premium para las declaraciones de amor más grandes.',
    rec3:'<b>Contiene:</b> un anillo dorado de girasoles enmarcando una cúpula de rosas rojas — coronado con tu inicial en perlas.',
    rec4:'<b>Contiene:</b> un arreglo primaveral exuberante lleno de color y textura — rosas, tulipanes y flores de temporada.',
    rec5:'<b>Contiene:</b> un encanto rosado suave — rosas rubor y flores delicadas en empaque premium.',
    rec6:'<b>Contiene:</b> rosas rojas preservadas que duran años — un amor que nunca se marchita, en caja de recuerdo.',
    rec7:'<b>Contiene:</b> un corazón de rosas rojas esculpido a mano, enmarcado por girasoles dorados, en envoltura negra de corte estrella — con banda de listón personalizada.',
    order:'Pedir', makeown:'Arma el tuyo',
    m1:'ATADAS FRESCAS CADA MAÑANA', m2:'MISMO DÍA ANTES DE LA 1PM', m3:'100% LOCAL · SIN INTERMEDIARIOS', m4:'CADA PRECIO EN LA TARJETA',
    ana_kicker:'Escuela de floristas, 60 segundos', ana_h:'La anatomía de un<br>ramo perfecto.',
    ana1b:'Flores focales', ana1s:'las estrellas — rosas, lirios, girasoles. 3–5 tallos que marcan el tono.',
    ana2b:'Flores de relleno', ana2s:'nube de novia, limonium, solidago — las nubes suaves entre las estrellas.',
    ana3b:'Verdes', ana3s:'eucalipto y helechos — el marco calmado que hace cantar los colores.',
    ana4b:'La envoltura y el listón', ana4s:'papel kraft, yute o journal, atado a mano. El abrazo que lo envuelve todo.',
    stu_kicker:'El Estudio de Ramos', stu_h:'O… arma el tuyo,<br>tallo por tallo.',
    stu_p:'Nuestro Estudio de Ramos te deja diseñar el tuyo, paso a paso: elige entre 26 tallos con precio, escoge la envoltura y el listón, agrega una tarjeta escrita a mano — y ve tu ramo cobrar vida antes de pedirlo.',
    stu_cta:'Abrir el Estudio →',
    care_kicker:'Manténlas vivas +7 días', care_h:'Cuidado floral, a lo simple.',
    care1b:'Corta en ángulo', care1p:'Recorta 2cm de cada tallo a 45° bajo agua corriente. Repítelo cada dos días — los tallos beben desde el corte.',
    care2b:'Agua fresca y limpia', care2p:'Cambia el agua cada 1–2 días y quita toda hoja que la toque. La bacteria es el verdadero enemigo del ramo.',
    care3b:'Lugar fresco, sin fruta', care3p:'Manténlas lejos del sol directo, radiadores y fruteros — la fruta madura libera gas que envejece las flores rápido.',
    wed_kicker:'Bodas y eventos', wed_h:'Tu gran día, en flor.',
    wed_p:'Ramos de novia, centros de mesa, arcos — diseñamos toda la historia contigo, boho o clásica. Agenda una consulta gratis por WhatsApp.',
    wed_cta:'Planea con nosotros',
    sub_kicker:'Suscripción de flores', sub_h:'Flores frescas, cada semana.',
    sub_p:'Un ramo sorpresa hecho a mano en tu puerta, semanal o quincenal. Pausa cuando quieras. Casas, cafeterías y oficinas en todo Northern Virginia.',
    sub_cta:'Desde $35/semana',
    jour_kicker:'✿ DE LA TIERRA A TU PUERTA ✿', jour_h:'El viaje de una rosa.',
    jour_p:'Cada ramo que sale de nuestra mesa vivió toda una pequeña vida primero. Desliza su historia.',
    j1b:'5:00 AM · el mercado de flores', j1p:'Elegimos cada tallo a mano mientras la ciudad duerme — solo los de cabezas firmes y orgullosas suben a la van.',
    j2b:'7:30 AM · la nevera', j2p:'Un largo trago frío, un corte fresco a 45° y dos horas tranquilas de acondicionamiento. La paciencia hace durar los pétalos.',
    j3b:'10:00 AM · la mesa', j3p:'Atadas a mano, con tallo en espiral, envueltas en kraft — y si lo pediste, un diamante en cada rosa.',
    j4b:'1:00 PM · tu puerta', j4p:'Timbramos dos veces y las entregamos con una sonrisa. ¿El suspiro? Esa parte es tuya.',
    jour_cta:'🌹 Empieza su próximo viaje',
    rev_kicker:'Northern Virginia opina', rev_h:'Amados en todo el DMV.',
    rev1:'“Pedí un ramo de cumpleaños para mi mamá — hicieron tres preguntas y lo lograron mejor de lo que yo hubiera podido.”',
    rev2:'“Por fin una floristería que muestra precios. Sin ‘llame para cotizar’, sin juegos. Elegí, pagué y llegó a las 6.”',
    rev3:'“La web es adorable y el ramo buchón estuvo irreal. Obsesionada.”',
    rev4:'“Ordené a las 11am para una entrega en el hospital — ahí estaba a las 3pm con la tarjeta más linda.”',
    faq_kicker:'Buenas preguntas', faq_h:'Antes de preguntar 🌷',
    faq1q:'¿De verdad hay entrega el mismo día?', faq1a:'Sí — ordena antes de la 1:00 PM de lunes a sábado y entregamos el mismo día en todo Northern Virginia. Después de la 1PM, tu ramo llega a la mañana siguiente.',
    faq2q:'No sé nada de flores. ¿Ayuda?', faq2a:'Justo por eso el menú se organiza por ocasión. Elige el momento y cada ramo bajo él está diseñado por floristas para exactamente eso. O escríbenos por WhatsApp — personas reales, felices de aconsejarte.',
    faq3q:'¿Y si quiero cambiar un ramo?', faq3a:'Cada ramo tiene un botón “Arma el tuyo” que abre nuestro Estudio de Ramos — cambia tallos, envolturas y listones y ve el precio actualizarse en vivo.',
    faq4q:'¿Cómo pago?', faq4a:'Toca Pedir — abre WhatsApp con tu ramo ya escrito. Confirma la dirección, paga con enlace de tarjeta o en efectivo al entregar. Listo en menos de un minuto.',
    faq5q:'¿Hacen bodas o flores semanales de oficina?', faq5a:'¡Ambas! Las consultas de boda y eventos son gratis, y las suscripciones empiezan en $35/semana con pausa cuando quieras.',
    g1b:'Atadas frescas a diario', g1s:'tallos elegidos cada mañana',
    g2b:'Mismo día antes de la 1PM', g2s:'en todo Northern Virginia, o va por nuestra cuenta',
    g3b:'Precios honestos', g3s:'cada ramo con precio por adelantado',
    g4b:'100% local', g4s:'sin intermediarios, sin comisiones',
    story_kicker:'Nuestra historia', story_h:'Flores hechas a mano, con el corazón.',
    story_p1:'Flowers Pavon es una floristería familiar con una idea terca: comprar flores debería sentirse tan cálido como recibirlas. Por eso organizamos todo alrededor de <b>tus momentos</b>, pusimos cada precio en la tarjeta y mantuvimos la entrega 100% local — porque las flores deberían hacerte sonreír antes de llegar. <em>Donde cada pétalo tiene su propósito.</em>',
    story_p2:'<b>Encúéntranos:</b> Northern Virginia · Lun–Sáb 9–6 · <a href="#" data-wa="Hi Flowers Pavon! I have a question." data-wa-es="¡Hola Flowers Pavon! Tengo una pregunta.">Escríbenos por WhatsApp</a>',
    foot_tag:'La floristería artesanal de Northern Virginia. Ramos buchón, arreglos y rosas preservadas, entregadas hoy.',
    foot_shop:'TIENDA', foot_menu:'Menú de ramos', foot_studio:'Estudio de Ramos', foot_faq:'Entrega y Preguntas',
    foot_serv:'SERVICIOS', foot_wed:'Bodas y eventos', foot_subs:'Suscripciones', foot_care:'Cuidado floral',
    foot_visit:'VISITA', foot_hours:'Lun–Sáb · 9am–6pm',
    mbar_shop:'💐 Ramos', mbar_order:'Pedir por WhatsApp'
  };

  function rewire(lang){
    var WA=(typeof window!=='undefined'&&window.WA)?window.WA:'17039534542';
    document.querySelectorAll('[data-wa]').forEach(function(a){
      var es=a.getAttribute('data-wa-es');
      var msg=(lang==='es'&&es)?es:a.getAttribute('data-wa');
      a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(msg);
    });
  }

  function apply(lang){
    nodes.forEach(function(n){
      var k=n.getAttribute('data-i18n');
      var v=lang==='es'?(ES[k]!=null?ES[k]:EN[k]):EN[k];
      if(v!=null&&n.innerHTML!==v) n.innerHTML=v;
    });
    rewire(lang);
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-lang-btn]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-lang-btn')===lang);});
    try{localStorage.setItem(KEY,lang);}catch(e){}
  }

  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('[data-lang-btn]'):null;
    if(b){e.preventDefault();apply(b.getAttribute('data-lang-btn'));}
  });

  var saved='en';
  try{saved=localStorage.getItem(KEY)||'en';}catch(e){}
  apply(saved);
})();
