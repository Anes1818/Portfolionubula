/* Ashley's Floral Boutique — EN/ES language toggle. English lives in the HTML;
   this file provides the Spanish overrides and swaps innerHTML on [data-i18n]
   nodes. Runs after pixel.js so window.SHOP_PHONE and the initial DOM text are
   ready.

   Default is EN. The storage key is namespaced per shop on purpose: every demo
   under /demo/* shares one origin, so a bare 'lang' key would leak the choice
   between client demos. */
(function(){
  var KEY='ashleysLang';
  var nodes=[].slice.call(document.querySelectorAll('[data-i18n]'));
  var EN={};
  nodes.forEach(function(n){EN[n.getAttribute('data-i18n')]=n.innerHTML;});

  var ES={
    annc:'PEDIDOS POR DM O MENSAJE · <b>DEPÓSITO DEL 50%</b> · OKLAHOMA CITY',
    tagline:'FLORAL BOUTIQUE · OKC',
    nav_bouquets:'Ramos', nav_anatomy:'Anatomía', nav_studio:'El Estudio', nav_wed:'Bodas', nav_care:'Cuidado', nav_faq:'Preguntas',
    nav_shop:'💐 Ver ramos',
    hero_kicker:'♥ Floristería artesanal de Oklahoma City ♥',
    hero_h1:'Hecho a mano,<br><em>con todo el corazón.</em>',
    hero_sub:'Cada ramo empieza con una pregunta — <b>¿para quién es?</b> Cuéntanos el momento por DM o mensaje y lo diseñamos a mano en nuestro estudio en casa aquí en Oklahoma City.',
    trust1:'⭐ Amada en el sur de OKC', trust2:'💬 Pedidos por DM o mensaje', trust3:'🌱 armados a mano, uno por uno',
    dep:'Un depósito del 50% no reembolsable asegura tu pedido.',
    occ_q:'▼ ¿CUÁL ES LA OCASIÓN? ▼',
    occ_birthday:'Cumpleaños', occ_love:'Amor', occ_baby:'Bebé', occ_sympathy:'Condolencias', occ_getwell:'Pronta Mejora', occ_just:'Porque Sí',
    fog_k:'✿ FRESCAS DE NUESTRO ESTUDIO ✿', fog_h:'Tu ramo, a tu manera.',
    fog_build:'🌸 Arma el tuyo', fog_shop:'💐 Ver los listos',
    cat_kicker:'El menú de ramos', cat_h:'Elige el momento. Nosotras elegimos las flores.',
    cat_p:'Nuestros ramos buchón insignia, arreglos frescos y rosas preservadas — cada precio en la tarjeta. Cada foto aquí es un ramo real de Ashley’s Floral Boutique. 🌸',
    gal_kicker:'Directo de nuestro estudio', gal_h:'Más ramos reales de Ashley’s.',
    gal_p:'Un vistazo a pedidos recientes — corazones, girasoles, tulipanes, lirios y bandas personalizadas. ¿Quieres algo así? Envíanos la foto por DM. 📸',
    gcap1:'Mixto y vivo', gcap2:'Rosas blancas', gcap3:'Rosas lavanda', gcap4:'Rosas amarillas en jarrón', gcap5:'Ramo de lirios', gcap6:'Corazón · rosas rojas', gcap7:'Corazón · rosas', gcap8:'Rosas y nube',
    f_all:'TODOS', f_roses:'ROSAS', f_arr:'ARREGLOS', f_pres:'PRESERVADAS', f_love:'AMOR',
    bd_best:'MÁS VENDIDO', bd_sig:'INSIGNIA', bd_gift:'MÁS REGALADO', bd_new:'NUEVO',
    rec1:'<b>Contiene:</b> una cúpula radiante de girasoles frescos, atada estilo buchón con envoltura premium — nuestra firma para el Día de la Madre.',
    rec2:'<b>Contiene:</b> setenta y cinco rosas premium contadas y armadas a mano en una cúpula imponente — la pieza por la que nos conocen.',
    rec3:'<b>Contiene:</b> un anillo dorado de girasoles enmarcando una cúpula de rosas rojas — coronado con tu inicial en perlas.',
    rec4:'<b>Contiene:</b> un arreglo primaveral exuberante lleno de color y textura — rosas, tulipanes y flores de temporada.',
    rec5:'<b>Contiene:</b> un encanto rosado suave — rosas rubor y flores delicadas en empaque premium.',
    rec6:'<b>Contiene:</b> rosas preservadas que duran años — un amor que nunca se marchita, en caja de recuerdo.',
    rec7:'<b>Contiene:</b> un corazón de rosas rojas esculpido a mano, enmarcado por girasoles dorados, en envoltura negra de corte estrella — con banda de listón personalizada.',
    order_dm:'💬 DM', order_txt:'📱 Mensaje', makeown:'Arma el tuyo',
    addon_plush:'🧸 Agrega un peluche',
    m1:'ARMADOS A MANO, UNO POR UNO', m2:'PEDIDOS POR DM O MENSAJE', m3:'ESTUDIO EN CASA · 100% LOCAL', m4:'CADA PRECIO EN LA TARJETA',
    ana_kicker:'Escuela de floristas, 60 segundos', ana_h:'La anatomía de un<br>ramo perfecto.',
    ana1b:'Flores focales', ana1s:'las estrellas — rosas, lirios, girasoles. 3–5 tallos que marcan el tono.',
    ana2b:'Flores de relleno', ana2s:'nube de novia, limonium, solidago — las nubes suaves entre las estrellas.',
    ana3b:'Verdes', ana3s:'eucalipto y helechos — el marco calmado que hace cantar los colores.',
    ana4b:'La envoltura y el listón', ana4s:'papel negro premium o rubor, atado a mano. El abrazo que lo envuelve todo.',
    stu_kicker:'El Estudio de Ramos', stu_h:'O… arma el tuyo,<br>tallo por tallo.',
    stu_p:'Nuestro Estudio de Ramos te deja diseñar el tuyo, paso a paso: elige entre 26 tallos con precio, escoge la envoltura y el listón, agrega una tarjeta escrita a mano — y ve tu ramo cobrar vida antes de pedirlo.',
    stu_cta:'Abrir el Estudio →',
    care_kicker:'Manténlas vivas +7 días', care_h:'Cuidado floral, a lo simple.',
    care1b:'Corta en ángulo', care1p:'Recorta 2cm de cada tallo a 45° bajo agua corriente. Repítelo cada dos días — los tallos beben desde el corte.',
    care2b:'Agua fresca y limpia', care2p:'Cambia el agua cada 1–2 días y quita toda hoja que la toque. La bacteria es el verdadero enemigo del ramo.',
    care3b:'Lugar fresco, sin fruta', care3p:'Manténlas lejos del sol directo, calefactores y fruteros — la fruta madura libera gas que envejece las flores rápido.',
    wed_kicker:'Bodas y eventos', wed_h:'Tu gran día, en flor.',
    wed_p:'Ramos de novia, centros de mesa, arcos — diseñamos toda la historia contigo, boho o clásica. Agenda una consulta gratis por DM o mensaje.',
    wed_cta:'Planea con nosotras',
    sub_kicker:'Peluches y extras', sub_h:'Agrega un peluche 🧸',
    sub_p:'Cada ramo puede llevar un peluche suave — el detalle que hace que los cumpleaños y los "pronta mejora" se sientan completos. Pregúntanos por los peluches disponibles.',
    sub_cta:'Peluches desde $15',
    jour_kicker:'✿ DE NUESTRA MESA A TUS MANOS ✿', jour_h:'El viaje de una rosa.',
    jour_p:'Cada ramo que sale de nuestra mesa vivió toda una pequeña vida primero. Desliza su historia.',
    j1b:'El mercado de flores', j1p:'Elegimos cada tallo a mano — solo los de cabezas firmes y orgullosas se van a casa con nosotras.',
    j2b:'El acondicionado', j2p:'Un largo trago frío, un corte fresco a 45° y horas tranquilas de acondicionamiento. La paciencia hace durar los pétalos.',
    j3b:'La mesa de trabajo', j3p:'Atadas a mano, con tallo en espiral, envueltas — y si lo pediste, un peluche a su lado.',
    j4b:'Tus manos', j4p:'Lo recoges o lo llevamos cerca. ¿El suspiro? Esa parte es tuya.',
    jour_cta:'🌹 Empieza su próximo viaje',
    rev_kicker:'Oklahoma City opina', rev_h:'Amadas en todo OKC.',
    rev1:'“Pedí un ramo de cumpleaños para mi mamá — hizo tres preguntas y lo logró mejor de lo que yo hubiera podido.”',
    rev2:'“Por fin una floristería que muestra precios. Sin ‘llame para cotizar’, sin juegos. Le escribí, dejé el depósito y quedó perfecto.”',
    rev3:'“La web es adorable y el ramo buchón estuvo irreal. Obsesionada.”',
    rev4:'“Le escribí por DM un martes y el jueves tenía el ramo más lindo con su peluche.”',
    faq_kicker:'Buenas preguntas', faq_h:'Antes de preguntar 🌷',
    faq1q:'¿Cómo hago un pedido?', faq1a:'Por DM en Instagram o TikTok, o por mensaje de texto al <b>(405) 862-6632</b>. Cuéntanos el ramo, la fecha y para quién es — te confirmamos disponibilidad y el total el mismo día.',
    faq2q:'¿Cómo funciona el depósito?', faq2a:'Un depósito del 50% no reembolsable asegura tu pedido y tu fecha. El resto se paga al recoger o al entregar. El depósito no se devuelve porque las flores se compran especialmente para tu pedido.',
    faq3q:'No sé nada de flores. ¿Ayuda?', faq3a:'Justo por eso el menú se organiza por ocasión. Elige el momento y cada ramo bajo él está diseñado para exactamente eso. O escríbenos — personas reales, felices de aconsejarte.',
    faq4q:'¿Y si quiero cambiar un ramo?', faq4a:'Cada ramo tiene un botón “Arma el tuyo” que abre nuestro Estudio de Ramos — cambia tallos, envolturas y listones y ve el precio actualizarse en vivo.',
    faq5q:'¿Venden peluches?', faq5a:'¡Sí! Puedes agregar un peluche suave a cualquier ramo desde $15. Pregúntanos por los que tenemos disponibles cuando escribas.',
    g1b:'Armadas a mano', g1s:'un ramo a la vez, en nuestro estudio',
    g2b:'Depósito del 50%', g2s:'asegura tu pedido y tu fecha',
    g3b:'Precios honestos', g3s:'cada ramo con precio por adelantado',
    g4b:'Estudio en casa', g4s:'negocio local del sur de OKC',
    story_kicker:'Nuestra historia', story_h:'Flores hechas a mano, con el corazón.',
    story_p1:'Ashley’s Floral Boutique es un estudio floral en casa en Oklahoma City con una idea terca: comprar flores debería sentirse tan cálido como recibirlas. Por eso organizamos todo alrededor de <b>tus momentos</b>, pusimos cada precio en la tarjeta y contestamos cada DM nosotras mismas — porque las flores deberían hacerte sonreír antes de llegar.',
    story_p2:'<b>Encuéntranos:</b> Oklahoma City, OK 73159 · <a href="#" data-dm>Escríbenos por DM</a> o manda un mensaje al (405) 862-6632',
    foot_tag:'Estudio floral artesanal en casa en Oklahoma City. Ramos buchón, arreglos, rosas preservadas y peluches.',
    foot_shop:'TIENDA', foot_menu:'Menú de ramos', foot_studio:'Estudio de Ramos', foot_faq:'Pedidos y Preguntas',
    foot_serv:'SERVICIOS', foot_wed:'Bodas y eventos', foot_subs:'Peluches y extras', foot_care:'Cuidado floral',
    foot_visit:'CONTACTO', foot_hours:'Pedidos por DM o mensaje',
    mbar_shop:'💐 Ramos', mbar_order:'📱 DM o Mensaje'
  };

  /* Rebuild the order links for the active language. [data-msg] is the SMS
     button (it carries the pre-filled bouquet details); [data-dm] opens the
     Instagram inbox and is language-independent. */
  function rewire(lang){
    var phone=(typeof window!=='undefined'&&window.SHOP_PHONE)?window.SHOP_PHONE:'14058626632';
    var ig=(typeof window!=='undefined'&&window.SHOP_IG)?window.SHOP_IG:'ashleys.floral.boutique';
    document.querySelectorAll('[data-msg]').forEach(function(a){
      var es=a.getAttribute('data-msg-es');
      var msg=(lang==='es'&&es)?es:a.getAttribute('data-msg');
      a.href='sms:+'+phone+'?&body='+encodeURIComponent(msg);
    });
    document.querySelectorAll('[data-dm]').forEach(function(a){
      a.href='https://ig.me/m/'+ig; a.target='_blank'; a.rel='noopener';
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
