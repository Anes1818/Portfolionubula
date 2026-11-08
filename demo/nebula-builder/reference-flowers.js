/* Cutout blooms for shaped bouquets and the gathered Classic wrap. */
(function (g) {
  'use strict';
  const { CAT, CONFIG } = g.NebulaConfig;
  const asset = id => `assets/reference-flowers/${id}.webp`;
  const whiteBud = { url: asset('lily_bud_white'), label: 'Barely open white lily bud', es: 'Capullo blanco de lirio entreabierto' };
  // Match the size of a single stem in a mixed bouquet. Button mums and stock
  // can sit toward the paper; the airy stems work best in interior pockets.
  const fillers = {
    chamomile_spray: { scale: .66, crown: [.49, .43], base: [.52, .90] },
    hypericum_green: { scale: .56, crown: [.49, .43], base: [.51, .80] },
    bupleurum_lime: { scale: .62, crown: [.50, .43], base: [.50, .88] },
    stock_purple: { scale: .69, crown: [.50, .44], base: [.50, .77], edge: true },
    mum_button_gold: { scale: .72, crown: [.50, .49], base: [.50, .70], edge: true },
  };
  const maxFillers = 12;
  const flowers = [
    ['gerbera_blush', 'Blush pink gerbera', 'Gerbera rosa pálido', 'pink', 400, 1.48, 'gerbera'],
    ['gerbera_peach', 'Peach bicolor gerbera', 'Gerbera bicolor durazno', 'orange', 400, 1.38, 'gerbera'],
    ['calla_peach', 'Peach calla lily', 'Cala durazno', 'orange', 550, 1.23, 'calla'],
    ['calla_black', 'Black calla lily', 'Cala negra', 'black', 550, 1.23, 'calla'],
    ['mum_white', 'White chrysanthemum', 'Crisantemo blanco', 'white', 400, 1.15, 'mum'],
    ['chamomile_spray', 'Chamomile daisy spray', 'Rama de margaritas de manzanilla', 'white', 350, 0.83, 'smallSpray'],
    ['ranunculus_coral', 'Coral ranunculus', 'Ranúnculo coral', 'orange', 500, 1.03, 'ranunculus'],
    ['hydrangea_lime', 'Lime hydrangea', 'Hortensia verde lima', 'green', 650, 1.64, 'hydrangea'],
    ['mum_button_lime', 'Lime button mum', 'Crisantemo botón verde lima', 'green', 350, 0.78, 'buttonMum'],
    ['mum_button_gold', 'Golden button mum spray', 'Rama de crisantemos botón dorados', 'yellow', 350, 0.91, 'smallSpray'],
    ['mum_magenta', 'Magenta chrysanthemum', 'Crisantemo magenta', 'pink', 400, 1.12, 'mum'],
    ['carnation_picotee', 'Burgundy picotee carnation', 'Clavel burdeos con borde claro', 'red', 350, 0.98, 'carnation'],
    ['hypericum_green', 'Green hypericum berries', 'Bayas verdes de hipérico', 'green', 350, 0.86, 'smallSpray'],
    ['rose_white_cupped', 'Cupped white rose', 'Rosa blanca en copa', 'white', 500, 1.02, 'rose'],
    ['mum_red_daisy', 'Red daisy mum', 'Crisantemo margarita rojo', 'red', 400, 1.29, 'mum'],
    ['alstroemeria_fuchsia', 'Fuchsia alstroemeria', 'Alstroemeria fucsia', 'pink', 350, 1.02, 'alstro'],
    ['spray_rose_yellow', 'Golden spray rose', 'Rosa de racimo dorada', 'yellow', 450, 1.00, 'rose'],
    ['stock_purple', 'Purple stock', 'Alhelí morado', 'violet', 350, 0.91, 'smallSpray'],
    ['rose_fuchsia', 'Hot pink rose', 'Rosa fucsia', 'pink', 400, 1.00, 'rose'],
    ['bupleurum_lime', 'Lime bupleurum', 'Bupleuro verde lima', 'green', 350, 0.88, 'smallSpray'],
  ];

  for (const [id, en, es, color, priceCents, layoutRatio, domeSpec] of flowers) {
    const configured = g.NEBULA_SHOP?.flowerPrices?.[id];
    const referenceFiller = Object.hasOwn(fillers, id);
    const calla = domeSpec === 'calla';
    CAT[id] = {
      en, es, color, family: id.startsWith('rose_') ? 'rose' : id.startsWith('carnation_') ? 'carnation' : 'accents',
      priceCents: Number.isSafeInteger(configured) && configured >= 0 && configured <= 100000000 ? configured : priceCents,
      topDiameter: Math.round(88 * layoutRatio), domeSpec, kind: 'flower',
      classic: !referenceFiller, classicOffered: !referenceFiller,
      classicDiameter: Math.round(100 * layoutRatio), headOnly: referenceFiller, optional: true,
      ...(referenceFiller ? { referenceFiller: true } : {}),
    };
    g.NEBULA_META.flowers[id] = {
      head: asset(calla ? id + '_upright' : id), headWidth: 512, headHeight: 512, headRadius: 0.48,
      headView: calla ? 'angled' : 'overhead', layoutRatio, classicAvailable: false,
      focal: ['gerbera', 'hydrangea'].includes(domeSpec) || id === 'mum_red_daisy',
      ...(calla ? { tuckedCalla: true } : {}),
    };
  }

  // The paper hides the stems. Reuse the isolated bloom, like Classic's black
  // roses and dark daisies, and give it a full movable anchor above the wrap.
  const classicIds = flowers.map(([id]) => id).filter(id => !Object.hasOwn(fillers, id));
  for (const id of [...classicIds, 'rose_ivory', 'mum_rust', 'rose_caramel']) {
    const artwork = g.NEBULA_META.flowers[id];
    Object.assign(CAT[id], { classic: true, classicOffered: true, headOnly: false });
    Object.assign(artwork, {
      classicAvailable: true, classicBloom: artwork.head, classicBlooms: [artwork.head],
      classicStem: null, bloomWidth: artwork.headWidth, bloomHeight: artwork.headHeight,
      bloomCenter: [artwork.headWidth / 2, artwork.headHeight / 2],
      stemBase: [artwork.headWidth / 2, artwork.headHeight],
    });
  }

  const configuredBud = g.NEBULA_SHOP?.extrasCents?.whiteLilyBud;
  CONFIG.extrasCents.whiteLilyBud = Number.isSafeInteger(configuredBud) && configuredBud >= 0 && configuredBud <= 100000000 ? configuredBud : 500;
  const fillerCount = counts => Object.values(counts || {}).reduce((sum, quantity) => sum + quantity, 0);
  function validFillers(counts) {
    return counts && typeof counts === 'object' && !Array.isArray(counts) &&
      Object.entries(counts).every(([id, quantity]) => Object.hasOwn(fillers, id) && Number.isInteger(quantity) && quantity > 0 && quantity <= maxFillers) &&
      fillerCount(counts) <= maxFillers;
  }
  function fillerArt(counts) {
    return Object.entries(fillers).flatMap(([id, spec]) => counts?.[id]
      ? [{ id, count: counts[id], url: asset(id), width: 512, height: 512, ...spec }]
      : []);
  }
  g.NebulaReferenceFlowers = { whiteBud, fillers, maxFillers, fillerCount, validFillers, fillerArt };
  document.addEventListener('DOMContentLoaded', () => {
    g.NebulaI18n.en.whiteLilyBud = whiteBud.label;
    g.NebulaI18n.es.whiteLilyBud = whiteBud.es;
    for (const id of Object.keys(fillers)) {
      g.NebulaI18n.en[id] = CAT[id].en;
      g.NebulaI18n.es[id] = CAT[id].es;
    }
  });
})(window);
