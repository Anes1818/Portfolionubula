/* =============================================================
   Petal Press — builder.js   ★ ULTIMATE BOUQUET STUDIO ★
   -------------------------------------------------------------
   Photorealistic floral layering engine & Buchón generator:
   • 3 Bouquet Styles: Classic Hand-Tied, Round Buchón, Heart Buchón
   • 26 Stems & Flower Heads with WebP + PNG fallbacks
   • 3D Interactive Parallax & Mouse/Gyroscope Tilt Physics
   • Dynamic Layer Lighting & Ambient Occlusion Depth Shading
   • Florist Balance & Harmony Advisor ("Romantic Blush", etc.)
   • "✨ Florist Remix" Organic Composition Generator
   • 4-Ring Florist Slot Engine with 3-Pass De-occlusion
   • Drag-to-Rearrange, Tidy Up, and Double-Click Removal
   • Dual-Layer Wraps with Measured Polygon Silhouette Clipping
   • Twinkling Diamond Pins, Luxury Sashes, Greenery Collars
   • 3-Theme Postcard Exporter (Artisanal, Velvet, Polaroid)
   • Bilingual Language Switcher (English / Español)
   • Mobile-First Sticky Stage & Split Layout
   ============================================================= */

(function () {
  "use strict";

  var BRAND_CONF = window.BRAND || {};
  var SHOP = {
    name: BRAND_CONF.name || "Petal Press",
    whatsapp: BRAND_CONF.whatsapp || "15713367129",
    site: "petalpress.co",
    tagline: BRAND_CONF.tagline || "Artisanal floral artistry & stationery"
  };

  var IMG_BASE = "assets/build/";
  function assetUrl(file) {
    if (!file) return "";
    return IMG_BASE + encodeURIComponent(file);
  }

  /* ===== 1. STEM CATALOG (26 Real Stems) ==================== */

  var CATALOG = [
    { id: 'alstroemeria',      label: 'Alstroemeria',     group: 'Other',      file: 'alstroemeria.png',      price: 3,   h: 287, bx: 0.5, hue: 'pink' },
    { id: 'babys_breath',      label: "Baby's Breath",    group: 'Other',      file: 'babys_breath.png',      price: 2,   h: 321, bx: 0.51, hue: 'white' },
    { id: 'sunflower',         label: 'Sunflower',        group: 'Other',      file: 'sunflower.png',         price: 4,   h: 260, bx: .56, hue: 'yellow' },
    { id: 'eucalyptus',        label: 'Eucalyptus',       group: 'Other',      file: 'eucalyptus.png',        price: 2,   h: 320, bx: 0.5, hue: 'green' },
    { id: 'lily',              label: 'Oriental Lily',    group: 'Other',      file: 'lily.png',              price: 5,   h: 282, bx: 0.5, hue: 'white' },
    { id: 'ranunculus',        label: 'Ranunculus',       group: 'Other',      file: 'ranunculus.png',        price: 5,   h: 282, bx: 0.5, hue: 'pink' },
    { id: 'gerbera_daisy',     label: 'Gerbera Daisy',    group: 'Other',      file: 'gerbera_daisy.png',     price: 4,   h: 282, bx: 0.5, hue: 'orange' },
    { id: 'limonium',          label: 'Limonium',         group: 'Other',      file: 'limonium.png',          price: 2,   h: 285, bx: 0.5, hue: 'violet' },
    { id: 'rose_pink',         label: 'Pink Rose',        group: 'Roses',      file: 'rose_pink.png',         price: 4,   h: 289, bx: 0.5, hue: 'pink' },
    { id: 'rose_red',          label: 'Red Rose',         group: 'Roses',      file: 'rose_red.png',          price: 4,   h: 289, bx: 0.49, hue: 'red' },
    { id: 'rose_orange',       label: 'Orange Rose',      group: 'Roses',      file: 'rose_orange.png',       price: 4,   h: 285, bx: .54, hue: 'orange' },
    { id: 'rose_violet',       label: 'Violet Rose',      group: 'Roses',      file: 'rose_violet.png',       price: 4,   h: 322, bx: 0.54, hue: 'violet' },
    { id: 'rose_yellow',       label: 'Yellow Rose',      group: 'Roses',      file: 'rose_yellow.png',       price: 4,   h: 289, bx: 0.5, hue: 'yellow' },
    { id: 'rose_white',        label: 'White Rose',       group: 'Roses',      file: 'rose_white.png',        price: 4,   h: 289, bx: 0.5, hue: 'white' },
    { id: 'tulip_pink',        label: 'Pink Tulip',       group: 'Tulips',     file: 'tulip_pink.png',        price: 3,   h: 322, bx: 0.39, hue: 'pink' },
    { id: 'tulip_red',         label: 'Red Tulip',        group: 'Tulips',     file: 'tulip_red.png',         price: 3,   h: 322, bx: 0.39, hue: 'red' },
    { id: 'tulip_orange',      label: 'Orange Tulip',     group: 'Tulips',     file: 'tulip_orange.png',      price: 3,   h: 240, bx: .58, hue: 'orange' },
    { id: 'tulip_violet',      label: 'Violet Tulip',     group: 'Tulips',     file: 'tulip_violet.png',      price: 3,   h: 322, bx: 0.39, hue: 'violet' },
    { id: 'tulip_yellow',      label: 'Yellow Tulip',     group: 'Tulips',     file: 'tulip_yellow.png',      price: 3,   h: 322, bx: 0.39, hue: 'yellow' },
    { id: 'tulip_white',       label: 'White Tulip',      group: 'Tulips',     file: 'tulip_white.png',       price: 3,   h: 322, bx: 0.39, hue: 'white' },
    { id: 'carnation_pink',    label: 'Pink Carnation',   group: 'Carnations', file: 'carnation_pink.png',    price: 2.5, h: 322, bx: 0.54, hue: 'pink' },
    { id: 'carnation_red',     label: 'Red Carnation',    group: 'Carnations', file: 'carnation_red.png',     price: 2.5, h: 322, bx: 0.54, hue: 'red' },
    { id: 'carnation_orange',  label: 'Orange Carnation', group: 'Carnations', file: 'carnation_orange.png',  price: 2.5, h: 295, bx: .53, hue: 'orange' },
    { id: 'carnation_violet',  label: 'Violet Carnation', group: 'Carnations', file: 'carnation_violet.png',  price: 2.5, h: 321, bx: 0.54, hue: 'violet' },
    { id: 'carnation_yellow',  label: 'Yellow Carnation', group: 'Carnations', file: 'carnation_yellow.png',  price: 2.5, h: 322, bx: 0.54, hue: 'yellow' },
    { id: 'carnation_white',   label: 'White Carnation',  group: 'Carnations', file: 'carnation_white.png',   price: 2.5, h: 322, bx: 0.54, hue: 'white' }
  ];

  var GROUP_ORDER = ['Roses', 'Tulips', 'Carnations', 'Other'];
  var BYID = {};
  CATALOG.forEach(function (c) { BYID[c.id] = c; });

  var SIZES = {
    Petite:  { scale: .86, mult: 1 },
    Classic: { scale: 1.0, mult: 1.5 },
    Lavish:  { scale: 1.12, mult: 2 }
  };

  var PRESETS = {
    romantic: ['rose_pink', 'rose_pink', 'rose_pink', 'rose_pink', 'eucalyptus', 'babys_breath'],
    bright:   ['tulip_orange', 'tulip_yellow', 'sunflower', 'gerbera_daisy', 'rose_red', 'eucalyptus'],
    white:    ['rose_white', 'rose_white', 'tulip_white', 'tulip_white', 'limonium', 'babys_breath']
  };

  var STAGE = { W: 460, H: 640 };
  var PIVOT = { x: 230, y: 432 };
  var BASE = 12;
  var NOTE_PRICE = 5;

  var ROLE_BY_TYPE = {
    eucalyptus: 'filler', babys_breath: 'filler', limonium: 'filler',
    alstroemeria: 'line', lily: 'line',
    tulip_pink: 'line', tulip_red: 'line', tulip_orange: 'line', tulip_violet: 'line', tulip_yellow: 'line', tulip_white: 'line',
    sunflower: 'focal', ranunculus: 'focal', gerbera_daisy: 'focal',
    rose_pink: 'focal', rose_red: 'focal', rose_orange: 'focal', rose_violet: 'focal', rose_yellow: 'focal', rose_white: 'focal',
    carnation_pink: 'focal', carnation_red: 'focal', carnation_orange: 'focal', carnation_violet: 'focal', carnation_yellow: 'focal', carnation_white: 'focal'
  };

  var RING_DEFS = [
    { key: 'back',   count: 9, angleMin: -60, angleMax: 60, len: 1.16, lenVar: .05, scaleMul: .80, depth: 1 },
    { key: 'mid',    count: 9, angleMin: -46, angleMax: 46, len: 1.02, lenVar: .05, scaleMul: .92, depth: .62 },
    { key: 'front',  count: 7, angleMin: -30, angleMax: 30, len: .88,  lenVar: .05, scaleMul: 1.04, depth: .30 },
    { key: 'center', count: 4, angleMin: -14, angleMax: 14, len: .74,  lenVar: .04, scaleMul: 1.14, depth: 0 }
  ];

  var ROLE_PREFERENCE = {
    filler: ['back', 'mid'],
    line:   ['mid', 'back', 'front'],
    focal:  ['front', 'center', 'mid']
  };

  function buildSlots() {
    var slots = [];
    RING_DEFS.forEach(function (ring) {
      var ringSlots = [];
      for (var i = 0; i < ring.count; i++) {
        var t = ring.count > 1 ? i / (ring.count - 1) : .5;
        var angle = ring.angleMin + (ring.angleMax - ring.angleMin) * t + Math.sin((i + 1) * 12.9898 + ring.angleMin) * 3;
        var len = ring.len + Math.sin((i + 2) * 7.233) * ring.lenVar;
        ringSlots.push({ ring: ring.key, angle: angle, len: len, scale: ring.scaleMul, depth: ring.depth, occupied: null });
      }
      ringSlots.sort(function (a, b) { return Math.abs(a.angle) - Math.abs(b.angle); });
      slots.push.apply(slots, ringSlots);
    });
    return slots;
  }

  var SLOTS = buildSlots();

  function freeSlot(role) {
    var prefs = ROLE_PREFERENCE[role] || ['front', 'mid', 'back', 'center'];
    for (var p = 0; p < prefs.length; p++) {
      var key = prefs[p];
      for (var i = 0; i < SLOTS.length; i++) {
        if (SLOTS[i].ring === key && !SLOTS[i].occupied) return SLOTS[i];
      }
    }
    for (var j = 0; j < SLOTS.length; j++) {
      if (!SLOTS[j].occupied) return SLOTS[j];
    }
    var idx = SLOTS.length;
    var slot = { ring: 'center', angle: Math.sin(idx * 5.37) * 16, len: .68 + Math.sin(idx * 3.14) * .06, scale: 1.12, depth: 0, occupied: null };
    SLOTS.push(slot);
    return slot;
  }

  function resetSlots() {
    SLOTS.forEach(function (s) { s.occupied = null; });
  }

  /* ===== 2. WRAP TEMPLATES & MEASURED SILHOUETTES ====== */

  var WRAP_STYLES = [
    { id: 'kraft',   label: 'Kraft Paper', back: 'wrap_kraft_back.png',   front: 'wrap_kraft_front.png',   top: 4, h: 82.5, w: 60, lift: 1.18, gather: .55, maxA: 26, tie: .72, rim: .36 },
    { id: 'burlap',  label: 'Burlap',      back: 'wrap_burlap_back.png',  front: 'wrap_burlap_front.png',  top: 4, h: 82.5, w: 60, lift: 1.36, gather: .52, maxA: 22, tie: .7,  rim: .36 },
    { id: 'journal', label: 'Journal',     back: 'wrap_journal_back.png', front: 'wrap_journal_front.png', top: 4, h: 82.5, w: 60, lift: 1.26, gather: .50, maxA: 24, tie: .7,  rim: .358 }
  ];

  var WRAP_SIL = {
    kraft:   [[.36,.088,.912],[.42,.122,.878],[.48,.16,.842],[.54,.199,.806],[.6,.243,.771],[.66,.304,.703],[.72,.396,.626],[.78,.362,.636],[.84,.365,.636],[.9,.376,.628],[.96,.45,.55]],
    burlap:  [[.36,.082,.915],[.42,.104,.885],[.48,.147,.847],[.54,.188,.811],[.6,.231,.774],[.66,.299,.706],[.72,.388,.603],[.78,.356,.638],[.84,.358,.642],[.9,.375,.629],[.96,.375,.629]],
    journal: [[.36,.086,.918],[.42,.108,.888],[.48,.149,.847],[.54,.19,.817],[.6,.236,.782],[.66,.296,.708],[.72,.389,.601],[.78,.365,.636],[.84,.36,.644],[.9,.375,.629],[.96,.375,.629]]
  };

  var RIBBONS = [
    { id: 'none',     label: 'None',     file: null,                  c: null,      d: null },
    { id: 'blush',    label: 'Blush',    file: 'ribbon_blush.png',    c: '#e58bb0', d: '#c9679a' },
    { id: 'burgundy', label: 'Burgundy', file: 'ribbon_burgundy.png', c: '#8e2f48', d: '#6e2138' },
    { id: 'sage',     label: 'Sage',     file: 'ribbon_sage.png',     c: '#93a884', d: '#758a67' }
  ];

  /* ===== 3. BILINGUAL DICTIONARY (EN / ES) ================= */

  var I18N = {
    en: {
      steps: [
        { title: 'Create your bouquet', sub: 'Every stem is priced on the card — build it exactly how you feel.', bar: '🌸 Drag any bloom to arrange it · double-tap a bloom to remove it', next: 'Wrap it →' },
        { title: 'Choose the wrap',     sub: 'Your bouquet is gathered — pick the paper that matches the mood.', bar: '🧻 Blooms are locked while wrapped — press Back to rearrange', next: 'Add ribbon →' },
        { title: 'Tie the ribbon',      sub: 'The finishing touch. Pick a color that says it for you.',          bar: '🎀 Almost there — one bow to go', next: 'Gift note →' },
        { title: 'Add a gift note',     sub: 'Say it with words too. We print it on a little card.',             bar: '💌 Ready! Order it — or save the picture and share it', next: '' }
      ],
      buSteps: {
        1: 'Pick the shape, the size, and who owns each ring.',
        2: 'Here is the paper on its own — your ramo is hand-wrapped in it at pickup.',
        3: 'Pick the bow color — shown tied on the paper.'
      },
      wrapTipClassic: '🧻 The paper gathers your stems and trims the long ones neatly — your blooms stay untouched. Want to rearrange? Press Back.',
      wrapTipBu: '🧻 Giant ramos are hand-wrapped at pickup — at the last step you will see your ramo, the paper and the bow side by side.',
      lblStyle: 'Bouquet style',
      lblQuick: 'Quick start',
      lblSize: 'Size',
      lblStems: 'Pick your stems',
      lblPaper: 'Choose your paper',
      lblRibbon: 'Tie the ribbon',
      lblNote: 'Gift note',
      lblHintNote: 'No online payment needed — confirm bouquet & delivery on WhatsApp. Pay on delivery or by card.'
    },
    es: {
      steps: [
        { title: 'Diseña tu ramo',      sub: 'Cada flor tiene su precio — crea tu arreglo exactamente como lo imaginas.', bar: '🌸 Arrastra cualquier flor para acomodarla · doble toque para quitarla', next: 'Envolver →' },
        { title: 'Elige el papel',      sub: 'Tu ramo está listo — escoge el papel que combine con la ocasión.',            bar: '🧻 Las flores quedan fijas envueltas — pulsa Atrás para moverlas', next: 'Poner lazo →' },
        { title: 'Ata el lazo',         sub: 'El toque final. Elige el color del lazo de satén o terciopelo.',             bar: '🎀 Casi listo — solo falta el lazo', next: 'Dedicatoria →' },
        { title: 'Dedicatoria y envío', sub: 'Añade una tarjeta impresa con tu mensaje personalizado.',                     bar: '💌 ¡Listo! Pídelo por WhatsApp o guarda la foto', next: '' }
      ],
      buSteps: {
        1: 'Elige la forma, el tamaño y los colores de cada anillo.',
        2: 'Aquí está el papel artesanal — tu ramo buchón se entrega envuelto a mano.',
        3: 'Elige el color del lazo de satén.'
      },
      wrapTipClassic: '🧻 El papel reúne tus flores y recorta los tallos limpiamente — tus flores quedan intactas.',
      wrapTipBu: '🧻 Los ramos gigantes se envuelven a mano en nuestro taller floral.',
      lblStyle: 'Estilo de ramo',
      lblQuick: 'Comienzo rápido',
      lblSize: 'Tamaño',
      lblStems: 'Elige tus flores',
      lblPaper: 'Elige tu papel',
      lblRibbon: 'Ata el lazo',
      lblNote: 'Tarjeta de regalo',
      lblHintNote: 'Sin pagos online — confirma tu ramo y entrega por WhatsApp. Pago contra entrega o tarjeta.'
    }
  };

  var curLang = 'en';

  window.setLanguage = function (lang) {
    curLang = lang === 'es' ? 'es' : 'en';
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('on', b.dataset.lang === curLang);
    });

    var dict = I18N[curLang];
    var meta = dict.steps[window.step - 1];

    if (window.state.template !== 'classic') {
      document.getElementById('stepTitle').textContent = window.step === 1 ? (curLang === 'es' ? 'Diseña tu ramo buchón' : 'Design your ramo') : meta.title;
      document.getElementById('stepSub').textContent = dict.buSteps[window.step] || meta.sub;
    } else {
      document.getElementById('stepTitle').textContent = meta.title;
      document.getElementById('stepSub').textContent = meta.sub;
    }

    document.getElementById('stagebar').textContent = meta.bar;
    document.getElementById('nextBtn').textContent = meta.next;

    var wt = document.getElementById('wrapTip');
    if (wt) wt.textContent = window.state.template === 'classic' ? dict.wrapTipClassic : dict.wrapTipBu;

    render();
  };

  /* ===== 4. STATE ========================================== */

  window.state = {
    stems: [],
    size: 'Classic',
    wrapStyle: 'kraft',
    ribbon: 'blush',
    note: '',
    noteOn: false,
    template: 'classic',
    shareTheme: 'artisanal',
    bu: {
      rings: 3,
      wall: 'rose_red',
      fill: 'rose_white',
      center: 'sunflower',
      pattern: 'zones',
      wall2: false,
      greens: false,
      jewel: false,
      choc: false,
      sash: ''
    }
  };

  window.step = 1;
  var uid = 0;
  var missingFiles = new Set();
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pct(n, total) { return (n / total * 100) + '%'; }
  function countOf(id) { return window.state.stems.filter(function (s) { return s.id === id; }).length; }
  function curWrap() { return WRAP_STYLES.find(function (w) { return w.id === window.state.wrapStyle; }) || WRAP_STYLES[0]; }
  function curRibbon() { return RIBBONS.find(function (r) { return r.id === window.state.ribbon; }) || RIBBONS[0]; }

  function total() {
    if (window.state.template !== 'classic') {
      return buPrice() + (window.state.noteOn ? NOTE_PRICE : 0);
    }
    var s = 0;
    window.state.stems.forEach(function (st) {
      if (BYID[st.id]) s += BYID[st.id].price;
    });
    return Math.round(BASE + s * SIZES[window.state.size].mult) + (window.state.noteOn ? NOTE_PRICE : 0);
  }

  function makeStem(id) {
    var role = ROLE_BY_TYPE[id] || 'focal';
    var slot = freeSlot(role);
    var flip = countOf(id) % 2 === 1;
    var stem = {
      id: id,
      uid: ++uid,
      manual: false,
      fresh: true,
      slot: slot,
      angle: slot.angle,
      len: slot.len,
      flip: flip,
      jA: Math.random() * 5 - 2.5,
      jL: Math.random() * .06 - .03
    };
    slot.occupied = stem;
    return stem;
  }

  /* ===== 5. HARMONY & FULLNESS ADVISOR ====================== */

  function updateHarmonyAdvisor() {
    var barText = document.getElementById('harmonyText');
    var barAdv = document.getElementById('harmonyAdvice');
    if (!barText || !barAdv) return;

    if (window.state.template !== 'classic') {
      var buCount = buCountFor(window.state.template === 'heart' ? 'heart' : 'round', window.state.bu.rings);
      barText.textContent = '👑 ' + buCount + ' Luxury Roses · ' + (window.state.template === 'heart' ? 'Heart Ramo' : 'Dome Ramo');
      barAdv.textContent = window.state.bu.jewel ? '💎 Diamond Shine' : '✨ Grand Statement';
      return;
    }

    var n = window.state.stems.length;
    var hues = {};
    window.state.stems.forEach(function (s) {
      var c = BYID[s.id];
      if (c && c.hue) hues[c.hue] = (hues[c.hue] || 0) + 1;
    });

    var paletteName = "Wildflower Meadow";
    if (hues.pink && hues.white && Object.keys(hues).length <= 3) paletteName = "Romantic Blush Palette";
    else if ((hues.yellow || hues.orange) && hues.red) paletteName = "Sunset Warmth Palette";
    else if (hues.white && Object.keys(hues).length <= 2) paletteName = "Monochrome Elegance";
    else if (hues.violet && hues.pink) paletteName = "Lavender Twilight Palette";

    var fullnessDesc = n === 0 ? "Empty Vase" : n < 6 ? "Delicate & Light" : n < 14 ? "Florist Classic" : "Deluxe Armful";
    barText.textContent = '🌸 ' + n + ' Stems · ' + fullnessDesc;
    barAdv.textContent = '🎨 ' + paletteName;
  }

  window.showFloristTip = function () {
    var n = window.state.stems.length;
    if (n < 5) {
      toast('Florist Tip: Add 2 fillers like Eucalyptus to create natural airy volume 🌿');
    } else if (n >= 5 && n < 12) {
      toast('Florist Tip: Perfect balance! Try adding a ribbon in Step 3 🎀');
    } else {
      toast('Florist Tip: Luxurious full armful — guaranteed to take their breath away! 💐');
    }
  };

  /* ===== 6. CLASSIC BOUQUET RENDER ENGINE ================== */

  function renderClassic() {
    var stage = document.getElementById('stage');
    var layer = document.getElementById('flowerLayer');
    var sz = SIZES[window.state.size];
    var wrapped = window.step >= 2;
    var ws = wrapped ? curWrap() : null;

    stage.classList.toggle('wrapped', wrapped);
    stage.classList.toggle('locked', window.step > 1);

    var tE = 0, hE = 0, wEg = 0;
    if (wrapped) {
      var n = window.state.stems.length;
      var avgH = n ? window.state.stems.reduce(function (a, s) { return a + (BYID[s.id] ? BYID[s.id].h : 300); }, 0) / n : 300;
      var sizeF = Math.max(.85, Math.min(1.12, avgH / 300));
      var wsc = sz.scale * Math.min(1.08, .72 + n * .03) * sizeF;
      wsc = Math.max(.7, Math.min(wsc, (ws.top + ws.h - 0.5) / ws.h));
      var wideF = Math.min(1.32, 1 + Math.max(0, n - 6) * .045);
      hE = ws.h * wsc;
      var wE = Math.min(88, ws.w * wsc * wideF);
      tE = (ws.top + ws.h) - hE;
      wEg = wE;

      [document.getElementById('wrapBack'), document.getElementById('wrapFront')].forEach(function (el) {
        if (el) {
          el.style.top = tE + '%';
          el.style.height = hE + '%';
          el.style.width = wE + '%';
        }
      });

      var yR = (tE + hE * ws.rim).toFixed(1);
      var x0 = 50 - wE / 2;
      var inset = .022;
      var sil = (WRAP_SIL[ws.id] || WRAP_SIL.kraft).filter(function (p) { return p[0] >= ws.rim - .001; });
      var pts = '-3% -3%,103% -3%,103% ' + yR + '%';
      sil.forEach(function (p) {
        pts += ',' + (x0 + (p[2] - inset) * wE).toFixed(1) + '% ' + (tE + p[0] * hE).toFixed(1) + '%';
      });
      for (var i = sil.length - 1; i >= 0; i--) {
        var p = sil[i];
        pts += ',' + (x0 + (p[1] + inset) * wE).toFixed(1) + '% ' + (tE + p[0] * hE).toFixed(1) + '%';
      }
      pts += ',-3% ' + yR + '%';
      layer.style.clipPath = 'polygon(' + pts + ')';
    } else {
      layer.style.clipPath = 'none';
    }

    layer.querySelectorAll('.flower,.bh,.buadd').forEach(function (e) { e.remove(); });
    var hint = document.getElementById('hint');
    if (hint) hint.style.display = (window.state.stems.length || window.step > 1) ? 'none' : 'block';

    var z = 100;

    // 3-Pass De-occlusion pass
    if (!ws) {
      var R = Math.PI / 180, items = [];
      SLOTS.forEach(function (slot) {
        var st = slot.occupied;
        if (!st) return;
        st.deA = 0; st.deL = 0;
        var c = BYID[st.id];
        if (!c) return;
        var angle = st.manual ? st.angle : (slot.angle + (st.jA || 0));
        var len = st.manual ? st.len : (slot.len + (st.jL || 0));
        var depth = st.manual ? Math.min(1, Math.abs(angle) / 60) : slot.depth;
        var hpx = c.h * sz.scale * slot.scale * len * (1 - 0.08 * depth);
        items.push({ st: st, angle: angle, len: len, hpx: hpx, depth: depth, r: hpx * 0.155, d: hpx * 0.87, fixed: !!st.manual });
      });
      items.sort(function (a, b) { return a.depth - b.depth; });
      for (var pass = 0; pass < 3; pass++) {
        for (var i = 1; i < items.length; i++) {
          var b = items[i];
          if (b.fixed) continue;
          for (var j = 0; j < i; j++) {
            var a = items[j];
            var aa = (a.angle + a.st.deA) * R, ab = (b.angle + b.st.deA) * R;
            var ax = Math.sin(aa) * a.d, ay = -Math.cos(aa) * a.d;
            var bd = b.d * (1 + b.st.deL / Math.max(.3, b.len));
            var dx = Math.sin(ab) * bd - ax, dy = -Math.cos(ab) * bd - ay;
            var dist = Math.hypot(dx, dy), need = (a.r + b.r) * 0.62;
            if (dist < need) {
              var push = need - dist;
              var sgn = dx > 2 ? 1 : dx < -2 ? -1 : (b.angle >= a.angle ? 1 : -1);
              b.st.deA += sgn * (push * 0.8 / b.d) * 57.3;
              b.st.deL += push * 0.35 / (b.hpx / b.len);
            }
          }
          b.st.deA = Math.max(-18, Math.min(18, b.st.deA));
          b.st.deL = Math.max(0, Math.min(.14, b.st.deL));
        }
      }
    }

    var drawOrder = SLOTS.slice().sort(function (a, b) {
      return (b.depth - a.depth) || (Math.abs(b.angle) - Math.abs(a.angle));
    });

    drawOrder.forEach(function (slot) {
      var st = slot.occupied;
      if (!st) return;
      var c = BYID[st.id];
      if (!c) return;

      var angle, len;
      if (st.manual) {
        angle = ws ? st.angle * Math.min(1, ws.gather + .45) : st.angle;
        len = st.len;
      } else {
        angle = (slot.angle + (st.jA || 0)) * (ws ? ws.gather : 1) + (ws ? 0 : (st.deA || 0));
        len = (slot.len + (st.jL || 0)) * (ws ? ws.lift * (ROLE_BY_TYPE[st.id] === 'line' ? 0.94 : 1) : 1) + (ws ? 0 : (st.deL || 0));
      }

      angle = Math.max(-64, Math.min(64, angle));
      len = Math.max(.55, Math.min(ws ? 1.45 : 1.3, len));
      if (ws) {
        angle = Math.max(-ws.maxA, Math.min(ws.maxA, angle));
        len = Math.min(1.42, len);
        var hpx = c.h * sz.scale * slot.scale * len * (1 - 0.08 * slot.depth);
        var allow = wEg / 100 * STAGE.W * 0.40;
        var mG = Math.asin(Math.min(1, allow / Math.max(1, hpx * 0.88))) * 180 / Math.PI;
        angle = Math.max(-mG, Math.min(mG, angle));
      }

      var depth = st.manual ? Math.min(1, Math.abs(angle) / 60) : slot.depth;

      var img = document.createElement('img');
      img.className = 'flower' + (st.fresh ? ' pop' : '');
      img.src = assetUrl(c.file);
      img.alt = c.label;
      img.dataset.idx = window.state.stems.indexOf(st);
      img.dataset.depth = depth;
      st.fresh = false;
      img.title = window.step === 1 ? c.label + ' — drag to arrange · double-click to remove' : c.label;

      img.addEventListener('dblclick', function () {
        if (window.step === 1) removeStem(st);
      });

      img.onerror = function () { this.classList.add('missing'); };
      img.style.height = pct(c.h * sz.scale * slot.scale * len * (1 - 0.08 * depth), STAGE.H);
      img.style.left = '50%';
      img.style.top = pct(PIVOT.y, STAGE.H);

      var bxe = (st.flip ? 1 - (c.bx != null ? c.bx : .5) : (c.bx != null ? c.bx : .5)) * 100;
      img.style.transformOrigin = bxe + '% 100%';
      img.style.transform = 'translate(' + (-bxe).toFixed(1) + '%,-100%) rotate(' + angle.toFixed(1) + 'deg)' + (st.flip ? ' scaleX(-1)' : '');
      img.style.zIndex = z++;

      // Realistic Ambient Occlusion & Dynamic Layer Lighting
      var dropY = 4 + (1 - depth) * 7;
      var dropBlur = 6 + (1 - depth) * 6;
      var dropAlpha = 0.14 + (1 - depth) * 0.12;
      var bright = 0.90 + (1 - depth) * 0.10;
      var sat = 0.92 + (1 - depth) * 0.08;

      img.style.filter = 'drop-shadow(0 ' + dropY.toFixed(1) + 'px ' + dropBlur.toFixed(1) + 'px rgba(45,20,35,' + dropAlpha.toFixed(2) + ')) brightness(' + bright.toFixed(2) + ') saturate(' + sat.toFixed(2) + ')';

      img.addEventListener('pointerdown', startDrag);
      layer.appendChild(img);
    });

    // Ribbon bow
    var rb = document.getElementById('ribbon');
    var rib = curRibbon();
    if (window.step >= 3 && rib.c && window.state.stems.length && ws) {
      rb.style.display = 'block';
      rb.style.top = (tE + hE * ws.tie) + '%';
      rb.style.width = (34 * Math.max(.8, hE / ws.h)) + '%';
      rb.src = assetUrl(rib.file);
      rb.alt = rib.label + ' ribbon bow';
    } else {
      rb.style.display = 'none';
    }

    // Gift note card on stage
    var nc = document.getElementById('noteCard');
    if (window.step === 4 && window.state.noteOn && window.state.note.trim()) {
      nc.style.display = 'block';
      document.getElementById('noteCardTxt').textContent = window.state.note.trim();
    } else {
      nc.style.display = 'none';
    }

    document.getElementById('amt').textContent = '$' + total();
    document.querySelectorAll('[data-ct]').forEach(function (e) {
      var n = countOf(e.dataset.ct);
      e.textContent = n;
      var row = e.closest('.row');
      if (row) {
        row.classList.toggle('picked', n > 0);
        var minus = row.querySelector('.step button');
        if (minus) {
          minus.disabled = n === 0;
          minus.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
        }
      }
    });

    updateGroupCounts();
    updateHarmonyAdvisor();
    if (window.step === 4) renderSummary();
  }

  /* ===== 7. RAMO BUCHÓN ENGINE (ROUND & HEART) ============= */

  var ROSES = ['rose_red', 'rose_pink', 'rose_white', 'rose_yellow', 'rose_violet', 'rose_orange'];
  var CENTERS = ['sunflower', 'gerbera_daisy', 'ranunculus', 'lily', 'rose_white', 'rose_red', 'rose_yellow', 'rose_pink', 'rose_violet', 'rose_orange'];
  var HEADF = { sunflower: .155, lily: .15, gerbera_daisy: .14, ranunculus: .135, alstroemeria: .14 };
  var SHAPES = { round: { label: 'Round', labor: 10 }, heart: { label: 'Heart', labor: 15 } };
  var HEAD_IMG = {
    rose_red: 'head_rose_red.png',
    rose_orange: 'head_rose_orange.png',
    rose_yellow: 'head_rose_yellow.png',
    rose_violet: 'head_rose_violet.png',
    rose_white: 'head_rose_white.png',
    sunflower: 'head_sunflower.png',
    gerbera_daisy: 'head_gerbera_daisy.png'
  };
  var WALLS = ROSES.concat(['sunflower']);
  var SASH_TXT = { bday: 'Happy B-Day', wed: 'Happy Wedding', love: 'I Love You' };
  var SASH_IMG = { bday: 'sash_bday.png', wed: 'sash_wed.png', love: 'sash_love.png' };
  var SASH_AR = { bday: 6.24, wed: 6.45, love: 6.09 };
  var DIAMOND_IMG = 'diamond_pin.png';

  function idFor(p, K) {
    var b = window.state.bu;
    if (p.ring === 0) return b.center;
    if (b.pattern === 'rings') return ((K - p.ring) % 2 === 0) ? b.wall : b.fill;
    if (b.pattern === 'mix') return (p.i % 2 === 0) ? b.wall : b.fill;
    if (b.wall2 && K >= 3 && p.ring >= K - 1) return b.wall;
    return p.ring === K ? b.wall : b.fill;
  }

  function roundLayout(K) {
    var pts = [{ x: 0, y: 0, ring: 0 }];
    for (var k = 1; k <= K; k++) {
      var m = Math.round(2 * Math.PI * k);
      for (var j = 0; j < m; j++) {
        var a = j / m * 2 * Math.PI + k * .5;
        pts.push({ x: Math.cos(a) * k, y: Math.sin(a) * k, ring: k });
      }
    }
    return { pts: pts, unitR: K + .5 };
  }

  function heartLayout(K) {
    var pts = [{ x: 0, y: .05, ring: 0 }];
    for (var k = 1; k <= K; k++) {
      var s = k / K, M = 720, xs = [], ys = [], cum = [0];
      for (var i = 0; i <= M; i++) {
        var t = i / M * 2 * Math.PI;
        xs.push(16 * Math.pow(Math.sin(t), 3) / 17 * s);
        ys.push(-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * s);
        if (i > 0) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
      }
      var P = cum[M], m = Math.max(6, Math.round(P / (0.92 / K)));
      for (var j = 0; j < m; j++) {
        var tgt = j / m * P, lo = 0;
        while (lo < M && cum[lo] < tgt) lo++;
        pts.push({ x: xs[lo], y: ys[lo], ring: k });
      }
    }
    var yMin = 1e9, yMax = -1e9;
    pts.forEach(function (p) { yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y); });
    var dy = (yMin + yMax) / 2;
    pts.forEach(function (p) { p.y -= dy; });
    return { pts: pts, unitR: 1.0 };
  }

  function buLayout() {
    var L = window.state.template === 'heart' ? heartLayout(window.state.bu.rings) : roundLayout(window.state.bu.rings);
    var cnt = {};
    L.pts.forEach(function (p) { p.i = (cnt[p.ring] = (cnt[p.ring] || 0) + 1) - 1; });
    return L;
  }

  function buCountFor(shape, K) {
    return (shape === 'heart' ? heartLayout(K) : roundLayout(K)).pts.length;
  }

  function buPrice() {
    var layout = buLayout();
    var K = window.state.bu.rings;
    var s = 0;
    layout.pts.forEach(function (p) {
      var id = idFor(p, K);
      if (BYID[id]) s += BYID[id].price * (p.ring === 0 ? 2 : 0.9);
    });
    var b = window.state.bu;
    var extras = (b.greens ? 8 : 0) + (b.jewel ? 35 : 0) + (b.choc ? 25 : 0) + (b.sash ? 10 : 0);
    return Math.round(25 + s + (SHAPES[window.state.template] ? SHAPES[window.state.template].labor : 10) + extras);
  }

  function buBar() {
    var dict = I18N[curLang];
    if (window.step === 1) return '💐 ' + buLayout().pts.length + ' ' + (curLang === 'es' ? 'flores acomodadas estilo buchón' : 'blooms auto-arranged like a pro ramo');
    if (window.step === 2) return '🧻 ' + curWrap().label + (curLang === 'es' ? ' — papel artesanal' : ' — hand-wrapped at pickup');
    if (window.step === 3) return '🎀 ' + (curLang === 'es' ? 'El lazo de satén' : 'The bow is tied right on the paper');
    return dict.steps[window.step - 1].bar;
  }

  function renderBu() {
    var stage = document.getElementById('stage');
    var layer = document.getElementById('flowerLayer');
    var showWrap = window.step >= 2, showBlooms = window.step === 1 || window.step === 4;
    var ws = curWrap();

    stage.classList.toggle('wrapped', showWrap);
    stage.classList.toggle('locked', window.step > 1);
    layer.querySelectorAll('.flower,.bh,.buadd').forEach(function (e) { e.remove(); });
    document.getElementById('hint').style.display = 'none';
    layer.style.clipPath = 'none';

    var cx = STAGE.W / 2, cy = 300, targetR = 200;
    var wT = ws.top, wH = ws.h, wW = ws.w;
    if (showWrap) {
      if (window.step === 4) { wT = 52; wH = 42; wW = 34; cy = 170; targetR = 115; }
      [document.getElementById('wrapBack'), document.getElementById('wrapFront')].forEach(function (el) {
        if (el) {
          el.style.top = wT + '%';
          el.style.height = wH + '%';
          el.style.width = wW + '%';
        }
      });
    }

    var layout = buLayout();
    var pts = layout.pts, unitR = layout.unitR;
    var K = window.state.bu.rings;
    var scale = targetR / unitR;
    var S = window.state.template === 'heart' ? scale * 1.12 / K : scale * 1.25;
    var order = showBlooms ? pts.slice().sort(function (a, b) { return (b.ring - a.ring) || (a.y - b.y); }) : [];

    order.forEach(function (p, i) {
      var id = idFor(p, K);
      var c = BYID[id] || CATALOG[0];
      var sz = S * (p.ring === 0 ? 1.35 : 1) * (1 + Math.sin(i * 5.13) * .03);
      var jx = Math.sin(i * 3.71) * S * .045, jy = Math.cos(i * 2.93) * S * .045, jr = Math.sin(i * 7.37) * 9;
      var x = cx + p.x * scale + jx, y = cy + p.y * scale + jy;

      var d = document.createElement('div');
      d.className = 'bh';
      d.style.width = pct(sz, STAGE.W);
      d.style.height = pct(sz, STAGE.H);
      d.style.left = pct(x - sz / 2, STAGE.W);
      d.style.top = pct(y - sz / 2, STAGE.H);
      d.style.zIndex = 100 + (K - p.ring) * 60 + Math.round(y * .1);
      d.style.transform = 'rotate(' + jr.toFixed(1) + 'deg)';
      d.style.filter = 'drop-shadow(0 3px 5px rgba(60,20,40,.24)) brightness(' + (p.ring === K ? .95 : 1) + ')';

      var img = document.createElement('img');
      img.alt = c.label;
      img.draggable = false;

      if (HEAD_IMG[id]) {
        img.src = assetUrl(HEAD_IMG[id]);
        img.style.width = '107%';
        img.style.height = '107%';
        img.style.left = '50%';
        img.style.top = '50%';
        img.style.transform = 'translate(-50%,-50%)';
        img.style.objectFit = 'contain';
        d.style.overflow = 'visible';
        d.style.borderRadius = '0';
      } else {
        img.src = assetUrl(c.file);
        var hf = HEADF[id] != null ? HEADF[id] : .13;
        img.style.height = '305%';
        img.style.top = ((0.52 - hf * 3.05) * 100).toFixed(1) + '%';
        var bx = c.bx != null ? c.bx : .5;
        img.style.transform = 'translateX(-' + (bx * 100).toFixed(1) + '%)';
      }
      d.appendChild(img);

      if (window.state.bu.jewel && id.indexOf('rose_') === 0) {
        var dm = document.createElement('img');
        dm.src = assetUrl(DIAMOND_IMG);
        dm.alt = 'diamond';
        dm.draggable = false;
        dm.className = 'dmtw';
        dm.style.cssText = 'position:absolute;left:50%;top:50%;width:24%;height:24%;transform:translate(-50%,-50%);object-fit:contain;z-index:6;filter:drop-shadow(0 1px 2px rgba(20,20,40,.45));animation:dtw ' + (3.2 + Math.random() * 2.6).toFixed(2) + 's linear infinite;animation-delay:-' + (Math.random() * 4).toFixed(2) + 's';
        d.appendChild(dm);
      }
      layer.appendChild(d);
    });

    if (showBlooms && window.state.bu.greens) {
      pts.filter(function (p) { return p.ring === K; }).forEach(function (p, i) {
        var len = Math.hypot(p.x, p.y) || 1;
        var sz = S * 1.15;
        var x = cx + p.x * scale + (p.x / len) * S * .52, y = cy + p.y * scale + (p.y / len) * S * .52;
        var g = document.createElement('div');
        g.className = 'bh';
        g.style.width = pct(sz, STAGE.W);
        g.style.height = pct(sz, STAGE.H);
        g.style.left = pct(x - sz / 2, STAGE.W);
        g.style.top = pct(y - sz / 2, STAGE.H);
        g.style.zIndex = 40 + Math.round(y * .05);
        g.style.transform = 'rotate(' + (Math.atan2(p.y, p.x) * 180 / Math.PI + 90 + Math.sin(i * 5.1) * 14).toFixed(1) + 'deg)';
        g.style.filter = 'drop-shadow(0 2px 4px rgba(30,50,20,.25))';
        var im = document.createElement('img');
        im.src = assetUrl('eucalyptus.png');
        im.alt = 'greenery';
        im.draggable = false;
        im.style.height = '250%';
        im.style.top = '6%';
        im.style.transform = 'translateX(-50%)';
        g.appendChild(im);
        layer.appendChild(g);
      });
    }

    if (showBlooms && window.state.bu.sash) {
      var sw = targetR * 2.25, sh = sw / SASH_AR[window.state.bu.sash];
      var sp = document.createElement('div');
      sp.className = 'buadd busashwrap';
      sp.style.width = pct(sw, STAGE.W);
      sp.style.height = pct(sh, STAGE.H);
      sp.style.left = pct(cx, STAGE.W);
      sp.style.top = pct(cy - targetR * .18, STAGE.H);
      sp.innerHTML = '<img src="' + assetUrl(SASH_IMG[window.state.bu.sash]) + '" alt="' + SASH_TXT[window.state.bu.sash] + '" draggable="false"><i class="shine"></i>';
      layer.appendChild(sp);
    }

    var rb = document.getElementById('ribbon');
    var rib = curRibbon();
    if (window.step >= 3 && rib.c) {
      rb.style.display = 'block';
      rb.style.top = (wT + wH * ws.tie) + '%';
      rb.style.width = Math.max(19, wW * .56) + '%';
      rb.src = assetUrl(rib.file);
      rb.alt = rib.label + ' ribbon bow';
    } else {
      rb.style.display = 'none';
    }

    var nc = document.getElementById('noteCard');
    if (window.step === 4 && window.state.noteOn && window.state.note.trim()) {
      nc.style.display = 'block';
      document.getElementById('noteCardTxt').textContent = window.state.note.trim();
    } else {
      nc.style.display = 'none';
    }

    document.getElementById('amt').textContent = '$' + total();
    updateHarmonyAdvisor();
    if (window.step === 4) renderSummary();
  }

  /* ===== 8. RENDER SUMMARY & ORDER CTAs ===================== */

  function renderSummary() {
    var sumEl = document.getElementById('summary');
    if (!sumEl) return;

    if (window.state.template !== 'classic') {
      var layout = buLayout();
      var pts = layout.pts, K = window.state.bu.rings;
      var tally = {};
      pts.forEach(function (p) {
        if (p.ring === 0) return;
        var id = idFor(p, K);
        tally[id] = (tally[id] || 0) + 1;
      });
      var rib = curRibbon();
      var shapeName = SHAPES[window.state.template] ? SHAPES[window.state.template].label : 'Round';
      var PATN = { zones: 'Zones', rings: 'Alternating rings', mix: 'Checker · one by one' };
      var rows = [
        ['💐 Ramo Buchón · ' + shapeName + ' · ' + pts.length + ' blooms', '$' + buPrice()],
        ['🌀 Formation · ' + PATN[window.state.bu.pattern] + (window.state.bu.wall2 && window.state.bu.pattern === 'zones' ? ' · double wall' : ''), '']
      ];
      Object.keys(tally).forEach(function (id) {
        rows.push(['🌹 ' + tally[id] + '× ' + (BYID[id] ? BYID[id].label : id), '']);
      });
      rows.push(['⭐ Center · 1× ' + (BYID[window.state.bu.center] ? BYID[window.state.bu.center].label : 'Center'), '']);
      if (window.state.bu.greens) rows.push(['🌿 Greenery collar', '+$8']);
      rows.push(['🧻 ' + curWrap().label + ' wrap', 'Included']);
      rows.push(['🎀 ' + (rib.c ? rib.label + ' ribbon' : 'No ribbon'), rib.c ? 'Included' : '—']);
      if (window.state.bu.jewel) rows.push(['💎 Diamond pins in every rose', '+$35']);
      if (window.state.bu.choc) rows.push(['🍫 Chocolate box', '+$25']);
      if (window.state.bu.sash) rows.push(['🎀 Message sash · “' + SASH_TXT[window.state.bu.sash] + '”', '+$10']);
      rows.push(['💌 Printed gift card', window.state.noteOn ? '+$' + NOTE_PRICE : '—']);

      var mck = '<div class="minickt">' +
        '<div class="mtile"><img src="' + assetUrl(curWrap().front) + '" alt="paper"><span>' + curWrap().label + '</span></div>' +
        '<div class="mtile"><i class="mrib' + (rib.c ? '' : ' none') + '"' + (rib.c ? ' style="--rc:' + rib.c + '"' : '') + '></i><span>' + (rib.c ? rib.label + ' bow' : 'No bow') + '</span></div>' +
        '<div class="mtile"><span class="mshape">' + (window.state.template === 'heart' ? '❤️' : '⭕') + '</span><span>' + shapeName + ' · ' + pts.length + '</span></div>' +
        (window.state.bu.jewel ? '<div class="mtile"><span class="mshape">💎</span><span>Diamonds</span></div>' : '') +
        (window.state.bu.choc ? '<div class="mtile"><span class="mshape">🍫</span><span>Chocolates</span></div>' : '') +
        (window.state.noteOn ? '<div class="mtile"><span class="mshape">💌</span><span>Gift card</span></div>' : '') +
        '</div>';

      sumEl.innerHTML = mck + rows.map(function (r) {
        return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
      }).join('') + '<div class="sumtotal"><span>Total</span><b>$' + total() + '</b></div>';

      var ord = document.getElementById('order');
      ord.classList.remove('disabled');
      var msg = 'Hi ' + SHOP.name + '! My Ramo Buchón: ' + shapeName + ' shape, ' + pts.length + ' blooms (' + PATN[window.state.bu.pattern] + (window.state.bu.wall2 && window.state.bu.pattern === 'zones' ? ', double wall' : '') + ') — ' + Object.keys(tally).map(function (id) { return tally[id] + '× ' + (BYID[id] ? BYID[id].label : id); }).join(', ') + ', center: ' + (BYID[window.state.bu.center] ? BYID[window.state.bu.center].label : 'Center') + '. Wrap: ' + curWrap().label + '.';
      if (window.state.bu.greens) msg += ' With greenery collar.';
      if (rib.c) msg += ' Ribbon: ' + rib.label + '.';
      if (window.state.bu.jewel) msg += ' Diamond pins in the roses (+$35).';
      if (window.state.bu.choc) msg += ' Chocolate box (+$25).';
      if (window.state.bu.sash) msg += ' Printed message sash: "' + SASH_TXT[window.state.bu.sash] + '" (+$10).';
      if (window.state.noteOn) msg += ' Printed gift card (+$' + NOTE_PRICE + ')' + (window.state.note.trim() ? ': "' + window.state.note.trim() + '"' : '') + '.';
      msg += ' Total ~$' + total() + '. Is it available for delivery?';
      ord.href = 'https://wa.me/' + SHOP.whatsapp + '?text=' + encodeURIComponent(msg);
      return;
    }

    var lines = CATALOG.filter(function (c) { return countOf(c.id) > 0; }).map(function (c) { return countOf(c.id) + '× ' + c.label; });
    var rib = curRibbon();
    var rows = [
      ['💐 ' + window.state.stems.length + ' stems · ' + window.state.size, '$' + (total() - (window.state.noteOn ? NOTE_PRICE : 0))],
      ['🧻 ' + curWrap().label + ' wrap', 'Included'],
      ['🎀 ' + (rib.c ? rib.label + ' ribbon' : 'No ribbon'), rib.c ? 'Included' : '—'],
      ['💌 Printed gift card', window.state.noteOn ? '+$' + NOTE_PRICE : '—']
    ];

    sumEl.innerHTML = rows.map(function (r) {
      return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('') + '<div class="sumtotal"><span>Total</span><b>$' + total() + '</b></div>';

    var ord = document.getElementById('order');
    if (window.state.stems.length) {
      ord.classList.remove('disabled');
      var msg = "Hi " + SHOP.name + "! My custom " + window.state.size + " bouquet: " + lines.join(', ') + '. Wrap: ' + curWrap().label + '.';
      if (rib.c) msg += ' Ribbon: ' + rib.label + '.';
      if (window.state.noteOn) msg += ' Printed gift card (+$' + NOTE_PRICE + ')' + (window.state.note.trim() ? ': "' + window.state.note.trim() + '"' : '') + '.';
      msg += ' Total ~$' + total() + '. Is it available for delivery?';
      ord.href = 'https://wa.me/' + SHOP.whatsapp + '?text=' + encodeURIComponent(msg);
    } else {
      ord.classList.add('disabled');
      ord.removeAttribute('href');
    }
  }

  function render() {
    if (window.state.template === 'classic') {
      document.getElementById('flowerLayer').querySelectorAll('.bh').forEach(function (e) { e.remove(); });
      renderClassic();
    } else {
      renderBu();
    }
  }
  window.render = render;

  /* ===== 9. FLORIST REMIX / SHUFFLE ======================== */

  window.remixFlowers = function () {
    if (!window.state.stems.length) {
      preset('romantic');
      return;
    }
    // Organic reshuffling pass
    window.state.stems.forEach(function (st) {
      st.manual = false;
      st.flip = Math.random() > 0.5;
      st.jA = Math.random() * 8 - 4;
      st.jL = Math.random() * 0.08 - 0.04;
    });
    render();
    toast('Remixed with fresh florist rhythm ✨');
  };

  /* ===== 10. STEP CONTROLS & INTERACTION =================== */

  function resetFinishEffects() {
    window.state.wrapStyle = 'kraft';
    window.state.ribbon = 'none';
    window.state.noteOn = false;
    window.state.note = '';
    window.state.bu.wall2 = false;
    window.state.bu.greens = false;
    window.state.bu.jewel = false;
    window.state.bu.choc = false;
    window.state.bu.sash = '';

    var ws = WRAP_STYLES[0];
    document.getElementById('wrapBack').style.backgroundImage = 'url(' + assetUrl(ws.back) + ')';
    document.getElementById('wrapFront').style.backgroundImage = 'url(' + assetUrl(ws.front) + ')';
    document.querySelectorAll('#wrapstyles button').forEach(function (b) { b.classList.toggle('on', b.dataset.w === 'kraft'); });
    document.querySelectorAll('#ribbons button').forEach(function (b) { b.classList.toggle('on', b.dataset.r === 'none'); });
    document.querySelectorAll('#buX button,#buSash button').forEach(function (b) { b.classList.remove('on'); });

    var card = document.getElementById('cardMsg');
    if (card) card.value = '';
    var ct = document.getElementById('charCt');
    if (ct) ct.textContent = '0';
    var nw = document.getElementById('noteWrap');
    if (nw) nw.style.display = 'none';
    var off = document.getElementById('noteOff');
    if (off) off.classList.add('on');
    var on = document.getElementById('noteOnBtn');
    if (on) on.classList.remove('on');

    document.getElementById('ribbon').style.display = 'none';
    document.getElementById('noteCard').style.display = 'none';
  }

  window.setStep = function (n) {
    n = Math.max(1, Math.min(4, n));
    if (n === 1) resetFinishEffects();
    window.step = n;
    document.body.className = 'step-' + n;
    var dict = I18N[curLang];
    var m = dict.steps[n - 1];

    if (window.state.template !== 'classic') {
      document.getElementById('stepTitle').textContent = n === 1 ? (curLang === 'es' ? 'Diseña tu ramo' : 'Design your ramo') : m.title;
      document.getElementById('stepSub').textContent = dict.buSteps[n] || m.sub;
      document.getElementById('stagebar').textContent = buBar();
    } else {
      document.getElementById('stepTitle').textContent = m.title;
      document.getElementById('stepSub').textContent = m.sub;
      document.getElementById('stagebar').textContent = m.bar;
    }

    document.getElementById('nextBtn').textContent = m.next;
    document.querySelectorAll('#stepper li').forEach(function (li) {
      var ln = +li.dataset.n;
      li.classList.toggle('on', ln === n);
      li.classList.toggle('done', ln < n);
    });

    render();
    if (window.innerWidth <= 760) {
      requestAnimationFrame(function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
  };

  window.setSize = function (s) {
    window.state.size = s;
    document.querySelectorAll('#sizes button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === s); });
    render();
  };

  window.setWrapStyle = function (id) {
    window.state.wrapStyle = id;
    var ws = curWrap();
    document.getElementById('wrapBack').style.backgroundImage = 'url(' + assetUrl(ws.back) + ')';
    document.getElementById('wrapFront').style.backgroundImage = 'url(' + assetUrl(ws.front) + ')';
    document.querySelectorAll('#wrapstyles button').forEach(function (b) { b.classList.toggle('on', b.dataset.w === id); });
    render();
  };

  window.setRibbon = function (id) {
    window.state.ribbon = id;
    document.querySelectorAll('#ribbons button').forEach(function (b) { b.classList.toggle('on', b.dataset.r === id); });
    render();
  };

  window.onNote = function () {
    var v = document.getElementById('cardMsg').value;
    window.state.note = v;
    document.getElementById('charCt').textContent = v.length;
    render();
  };

  window.setNoteOn = function (v) {
    window.state.noteOn = v;
    document.getElementById('noteWrap').style.display = v ? 'block' : 'none';
    document.getElementById('noteOff').classList.toggle('on', !v);
    document.getElementById('noteOnBtn').classList.toggle('on', v);
    if (!v) {
      window.state.note = '';
      document.getElementById('cardMsg').value = '';
      document.getElementById('charCt').textContent = '0';
    }
    if (v && window.step === 4) document.getElementById('cardMsg').focus();
    render();
  };

  window.chg = function (id, d) {
    if (d > 0) {
      if (window.state.stems.length >= 24) {
        toast('Full bouquet arm — 24 stems max');
        return;
      }
      window.state.stems.push(makeStem(id));
      // Bounce animation on count badge
      var ctEl = document.querySelector('[data-ct="' + id + '"]');
      if (ctEl) {
        ctEl.classList.remove('bounce');
        void ctEl.offsetWidth;
        ctEl.classList.add('bounce');
      }
    } else {
      for (var i = window.state.stems.length - 1; i >= 0; i--) {
        if (window.state.stems[i].id === id) {
          removeStem(window.state.stems[i]);
          break;
        }
      }
    }
    render();
  };

  function removeStem(st) {
    if (st.slot) st.slot.occupied = null;
    var idx = window.state.stems.indexOf(st);
    if (idx > -1) window.state.stems.splice(idx, 1);
    render();
  }

  window.tidyUp = function () {
    window.state.stems.forEach(function (st) {
      st.manual = false;
      st.angle = st.slot.angle;
      st.len = st.slot.len;
    });
    render();
    toast('Tidied up ✨');
  };

  window.clearAll = function () {
    resetSlots();
    window.state.stems = [];
    render();
    toast('Started over');
  };

  window.preset = function (name) {
    resetSlots();
    window.state.stems = [];
    (PRESETS[name] || PRESETS.romantic).forEach(function (id) {
      window.state.stems.push(makeStem(id));
    });
    render();
    toast('Preset applied 🌸');
  };

  /* ===== 11. BUCHON UI METHODS ============================== */

  var SIZE_NAMES = { 1: 'Mini', 2: 'S', 3: 'M', 4: 'L', 5: 'XL' };

  function swatchHtml(zone, ids, cur) {
    return ids.map(function (id) {
      return '<button type="button" data-f="' + id + '" title="' + BYID[id].label + '"' +
        ' style="background-image:url(' + assetUrl(HEAD_IMG[id] || BYID[id].file) + ');background-size:' + (HEAD_IMG[id] ? 'cover' : '290%') + ';background-position:50% ' + (HEAD_IMG[id] ? '50%' : '6%') + '"' + (id === cur ? ' class="on"' : '') +
        ' onclick="setBuZone(\'' + zone + '\',\'' + id + '\')"></button>';
    }).join('');
  }

  function refreshSizeLabels() {
    var shape = window.state.template === 'heart' ? 'heart' : 'round';
    [1, 2, 3, 4, 5].forEach(function (k) {
      var el = document.getElementById('buc' + k);
      if (el) el.textContent = buCountFor(shape, k) + ' blooms';
    });
  }

  window.setTemplate = function (t) {
    if (t === 'classic') resetFinishEffects();
    window.state.template = t;
    var dict = I18N[curLang];
    var wt = document.getElementById('wrapTip');
    if (wt) wt.textContent = (t === 'classic') ? dict.wrapTipClassic : dict.wrapTipBu;

    document.querySelector('.panel').classList.toggle('bu-on', t !== 'classic');
    document.querySelectorAll('#tpls button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    refreshSizeLabels();
    document.getElementById('stagebar').textContent = (t === 'classic') ? dict.steps[window.step - 1].bar : buBar();
    render();
  };

  window.setBuRings = function (k) {
    window.state.bu.rings = k;
    document.querySelectorAll('#buSizes button').forEach(function (b) { b.classList.toggle('on', +b.dataset.k === k); });
    document.getElementById('stagebar').textContent = buBar();
    render();
  };

  window.setBuZone = function (zone, id) {
    window.state.bu[zone] = id;
    document.querySelectorAll('.swatches[data-zone="' + zone + '"] button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === id); });
    render();
  };

  window.setBuPattern = function (p) {
    window.state.bu.pattern = p;
    document.querySelectorAll('#buPat button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === p); });
    render();
  };

  window.toggleBuOpt = function (k) {
    window.state.bu[k] = !window.state.bu[k];
    var b = document.querySelector('#buX button[data-p="' + k + '"]');
    if (b) b.classList.toggle('on', window.state.bu[k]);
    render();
  };

  window.setBuSash = function (k) {
    window.state.bu.sash = window.state.bu.sash === k ? '' : k;
    document.querySelectorAll('#buSash button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === window.state.bu.sash); });
    render();
  };

  /* ===== 12. DRAG ENGINE & 3D PARALLAX ===================== */

  var dragIdx = null, dragEl = null;

  function startDrag(e) {
    if (window.step !== 1 || window.state.template !== 'classic') return;
    dragIdx = parseInt(e.currentTarget.dataset.idx, 10);
    dragEl = e.currentTarget;
    dragEl.classList.add('drag');
    dragEl.style.zIndex = 500;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function moveDrag(e) {
    if (dragIdx === null) return;
    var stage = document.getElementById('stage');
    var r = stage.getBoundingClientRect();
    var pxv = r.left + (PIVOT.x / STAGE.W) * r.width;
    var pyv = r.top + (PIVOT.y / STAGE.H) * r.height;
    var dx = e.clientX - pxv;
    var dy = pyv - e.clientY;
    var ang = Math.atan2(dx, Math.max(dy, 1)) * 180 / Math.PI;
    ang = Math.max(-64, Math.min(64, ang));
    var st = window.state.stems[dragIdx];
    var c = BYID[st.id];
    var baseHpx = (c.h * SIZES[window.state.size].scale * st.slot.scale / STAGE.H) * r.height;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var len = dist / baseHpx;
    len = Math.max(.6, Math.min(1.3, len));

    st.angle = ang;
    st.len = len;
    st.manual = true;

    dragEl.style.height = pct(c.h * SIZES[window.state.size].scale * st.slot.scale * len, STAGE.H);
    var bxe = (st.flip ? 1 - (c.bx != null ? c.bx : .5) : (c.bx != null ? c.bx : .5)) * 100;
    dragEl.style.transform = 'translate(' + (-bxe).toFixed(1) + '%,-100%) rotate(' + ang.toFixed(1) + 'deg)' + (st.flip ? ' scaleX(-1)' : '');
  }

  function endDrag() {
    if (dragIdx === null) return;
    if (dragEl) dragEl.classList.remove('drag');
    dragIdx = null;
    dragEl = null;
    render();
  }

  window.addEventListener('pointermove', moveDrag, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // 3D Mouse Parallax on Stage
  (function () {
    var stage = document.getElementById('stage');
    if (!stage) return;
    stage.addEventListener('pointermove', function (e) {
      if (dragIdx !== null) return;
      var rect = stage.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      stage.style.transform = 'rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg)';
    });
    stage.addEventListener('pointerleave', function () {
      stage.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  })();

  /* ===== 13. ACCORDION & CATEGORY TABS ===================== */

  function openFlowerGroup(group, button) {
    var oldTop = button.getBoundingClientRect().top;
    var collapse = button.classList.contains('on');
    document.querySelectorAll('#rows .flowergroup').forEach(function (box) {
      box.hidden = collapse ? true : box.dataset.group !== group;
    });
    document.querySelectorAll('#rows .grouphead').forEach(function (btn) {
      var on = !collapse && btn.dataset.group === group;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    requestAnimationFrame(function () {
      if (window.innerWidth <= 760) {
        var shift = button.getBoundingClientRect().top - oldTop;
        if (Math.abs(shift) > 1) window.scrollBy(0, shift);
      }
    });
  }

  function updateGroupCounts() {
    document.querySelectorAll('#rows>.grouphead').forEach(function (head) {
      var g = head.dataset.group;
      var n = 0;
      CATALOG.forEach(function (c) { if (c.group === g) n += countOf(c.id); });
      var pill = head.querySelector('.ghct');
      if (!pill) {
        pill = document.createElement('b');
        pill.className = 'ghct';
        head.insertBefore(pill, head.querySelector('i'));
      }
      pill.textContent = n;
      pill.hidden = (n === 0);
      head.classList.toggle('haspicks', n > 0);
    });
  }

  /* ===== 14. 3-THEME BRANDED POSTCARD GENERATOR ============ */

  function shareInfo() {
    var rib = curRibbon();
    if (window.state.template && window.state.template !== 'classic') {
      var shape = window.state.template === 'heart' ? 'Heart' : 'Round';
      return {
        title: shape + ' Ramo Buchón',
        lines: [
          'Wall ' + (BYID[window.state.bu.wall] ? BYID[window.state.bu.wall].label : 'Roses') + ' · Fill ' + (BYID[window.state.bu.fill] ? BYID[window.state.bu.fill].label : 'Roses'),
          'Center ' + (BYID[window.state.bu.center] ? BYID[window.state.bu.center].label : 'Center') + ' · ' + curWrap().label + ' wrap' + (rib.c ? ' · ' + rib.label + ' bow' : '')
        ],
        total: total()
      };
    }
    var parts = CATALOG.filter(function (c) { return countOf(c.id) > 0; }).map(function (c) { return countOf(c.id) + '× ' + c.label; });
    return {
      title: window.state.size + ' hand-tied bouquet',
      lines: [
        parts.join(' · ') || 'A bouquet made with love',
        curWrap().label + ' wrap' + (rib.c ? ' · ' + rib.label + ' ribbon' : '')
      ],
      total: total()
    };
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(x, str, max) {
    if (x.measureText(str).width <= max) return str;
    while (str.length > 4 && x.measureText(str + '…').width > max) str = str.slice(0, -1);
    return str + '…';
  }

  function buildShareCard(stageCv, theme) {
    theme = theme || window.state.shareTheme || 'artisanal';
    var W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');

    if (theme === 'velvet') {
      // Dark Luxury Velvet Aesthetic
      var bg1 = x.createLinearGradient(0, 0, 0, H);
      bg1.addColorStop(0, '#231c26');
      bg1.addColorStop(1, '#130e15');
      x.fillStyle = bg1;
      x.fillRect(0, 0, W, H);

      x.textAlign = 'center';
      x.fillStyle = '#e8c987';
      x.font = '600 32px Georgia,serif';
      x.fillText('❦', W / 2, 92);
      x.fillStyle = '#ffffff';
      x.font = '700 62px Georgia,serif';
      x.fillText(SHOP.name, W / 2, 150);
      x.fillStyle = '#d4b374';
      x.font = '700 22px -apple-system,Segoe UI,sans-serif';
      x.fillText((SHOP.tagline || 'Artisanal Floral Studio').toUpperCase(), W / 2, 192);

    } else if (theme === 'polaroid') {
      // Clean Polaroid Aesthetic
      x.fillStyle = '#f8f6f0';
      x.fillRect(0, 0, W, H);
      x.textAlign = 'center';
      x.fillStyle = '#222';
      x.font = '700 48px Courier,monospace';
      x.fillText(SHOP.name.toUpperCase(), W / 2, 120);

    } else {
      // Warm Artisanal Paper Aesthetic
      var bg2 = x.createLinearGradient(0, 0, 0, H);
      bg2.addColorStop(0, '#fff8f9');
      bg2.addColorStop(1, '#f7e6ec');
      x.fillStyle = bg2;
      x.fillRect(0, 0, W, H);

      x.textAlign = 'center';
      x.fillStyle = '#c9557f';
      x.font = '600 30px Georgia,serif';
      x.fillText('✿', W / 2, 92);
      x.fillStyle = '#29222c';
      x.font = '700 62px Georgia,serif';
      x.fillText(SHOP.name, W / 2, 150);
      x.fillStyle = '#8b7f89';
      x.font = '700 22px -apple-system,Segoe UI,sans-serif';
      x.fillText((SHOP.tagline || 'Handcrafted floral artistry').toUpperCase(), W / 2, 192);
    }

    var cardX = 90, cardY = 240, cardW = W - 180, cardH = 750;
    x.save();
    x.shadowColor = theme === 'velvet' ? 'rgba(0,0,0,.6)' : 'rgba(120,40,70,.22)';
    x.shadowBlur = 40;
    x.shadowOffsetY = 18;
    x.fillStyle = '#ffffff';
    rr(x, cardX, cardY, cardW, cardH, 30);
    x.fill();
    x.restore();

    var pad = 24, availW = cardW - pad * 2, availH = cardH - pad * 2;
    var sc = Math.min(availW / stageCv.width, availH / stageCv.height);
    var iw = stageCv.width * sc, ih = stageCv.height * sc;
    var ix = cardX + (cardW - iw) / 2, iy = cardY + (cardH - ih) / 2;

    x.save();
    rr(x, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 22);
    x.clip();
    x.drawImage(stageCv, ix, iy, iw, ih);
    x.restore();

    var tag = SHOP.site || 'petalpress.com';
    var info = shareInfo();
    x.textAlign = 'center';

    if (theme === 'velvet') {
      x.fillStyle = '#ffffff';
      x.font = '600 44px Georgia,serif';
      x.fillText(fitText(x, info.title, W - 160), W / 2, 1074);
      x.fillStyle = '#baa8bc';
      x.font = '400 25px -apple-system,Segoe UI,sans-serif';
      var ly1 = 1120;
      info.lines.forEach(function (ln) { x.fillText(fitText(x, ln, W - 200), W / 2, ly1); ly1 += 38; });

      var pl1 = 'Total  $' + info.total;
      x.font = '800 40px -apple-system,Segoe UI,sans-serif';
      var pw1 = x.measureText(pl1).width + 80;
      x.fillStyle = '#d4af37';
      rr(x, W / 2 - pw1 / 2, ly1 + 6, pw1, 66, 33);
      x.fill();
      x.fillStyle = '#1c1420';
      x.fillText(pl1, W / 2, ly1 + 50);

      x.fillStyle = '#d4b374';
      x.font = '700 24px -apple-system,Segoe UI,sans-serif';
      x.fillText('Build your own at ' + tag + '  ·  Northern Virginia', W / 2, H - 44);

    } else {
      x.fillStyle = '#29222c';
      x.font = '600 44px Georgia,serif';
      x.fillText(fitText(x, info.title, W - 160), W / 2, 1074);
      x.fillStyle = '#8b7f89';
      x.font = '400 25px -apple-system,Segoe UI,sans-serif';
      var ly2 = 1120;
      info.lines.forEach(function (ln) { x.fillText(fitText(x, ln, W - 200), W / 2, ly2); ly2 += 38; });

      var pl2 = 'Total  $' + info.total;
      x.font = '800 40px -apple-system,Segoe UI,sans-serif';
      var pw2 = x.measureText(pl2).width + 80;
      x.fillStyle = '#d6336c';
      rr(x, W / 2 - pw2 / 2, ly2 + 6, pw2, 66, 33);
      x.fill();
      x.fillStyle = '#fff';
      x.fillText(pl2, W / 2, ly2 + 50);

      x.fillStyle = '#a92a58';
      x.font = '700 24px -apple-system,Segoe UI,sans-serif';
      x.fillText('Build your own at ' + tag + '  ·  Northern Virginia', W / 2, H - 44);
    }

    return cv;
  }

  window.saveImg = function (theme) {
    if (typeof html2canvas === 'undefined') {
      alert('Connecting to image exporter... Please try again in a second.');
      return;
    }
    toast('Creating your bouquet picture… 📸');
    html2canvas(document.getElementById('stage'), {
      backgroundColor: '#fff6f8',
      scale: 2,
      logging: false,
      useCORS: true
    }).then(function (cv) {
      window.__stageCanvas = cv;
      var card = buildShareCard(cv, theme || window.state.shareTheme);
      card.toBlob(function (blob) {
        if (!blob) { alert('Could not create the image.'); return; }
        if (window.__shareUrl) URL.revokeObjectURL(window.__shareUrl);
        window.__shareBlob = blob;
        window.__shareUrl = URL.createObjectURL(blob);
        openShare(window.__shareUrl);
      }, 'image/png');
    }).catch(function (err) {
      console.error(err);
      alert('Could not create image right now.');
    });
  };

  window.switchCardTheme = function (theme) {
    window.state.shareTheme = theme;
    document.querySelectorAll('.card-theme-btn').forEach(function (b) {
      b.classList.toggle('on', b.dataset.theme === theme);
    });
    if (window.__stageCanvas) {
      var card = buildShareCard(window.__stageCanvas, theme);
      card.toBlob(function (blob) {
        if (!blob) return;
        if (window.__shareUrl) URL.revokeObjectURL(window.__shareUrl);
        window.__shareBlob = blob;
        window.__shareUrl = URL.createObjectURL(blob);
        document.getElementById('shareImg').src = window.__shareUrl;
      }, 'image/png');
    }
  };

  // Share modal DOM
  (function () {
    var m = document.createElement('div');
    m.id = 'shareModal';
    m.className = 'sharemodal';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = '<div class="sharebox" role="dialog" aria-modal="true">' +
      '<button class="shareclose" type="button" aria-label="Close" onclick="closeShare()">✕</button>' +
      '<h3>Your bouquet 💐</h3>' +
      '<p class="sharesub">Save the picture or share it with your friends.</p>' +
      '<div class="card-themes">' +
      '<button type="button" class="card-theme-btn on" data-theme="artisanal" onclick="switchCardTheme(\'artisanal\')">📜 Artisanal</button>' +
      '<button type="button" class="card-theme-btn" data-theme="velvet" onclick="switchCardTheme(\'velvet\')">✨ Midnight Velvet</button>' +
      '<button type="button" class="card-theme-btn" data-theme="polaroid" onclick="switchCardTheme(\'polaroid\')">📷 Polaroid</button>' +
      '</div>' +
      '<div class="shareprev"><img id="shareImg" alt="Your bouquet picture"></div>' +
      '<div class="sharebtns">' +
      '<button class="btn btn-accent" type="button" onclick="downloadShare()">⬇ Download</button>' +
      '<button class="btn btn-whatsapp" type="button" onclick="shareShare()">📤 Share</button>' +
      '</div>' +
      '<p class="sharehint" id="shareHint"></p>' +
      '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) closeShare(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeShare(); });
  })();

  window.openShare = function (url) {
    var m = document.getElementById('shareModal');
    document.getElementById('shareImg').src = url;
    document.getElementById('shareHint').textContent = navigator.share ? '' : 'Tip: download it, then attach it to any message, post or email.';
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
  };

  window.closeShare = function () {
    var m = document.getElementById('shareModal');
    if (m) {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    }
  };

  window.downloadShare = function () {
    if (!window.__shareUrl) return;
    var a = document.createElement('a');
    a.download = SHOP.name.replace(/\s+/g, '-').toLowerCase() + '-bouquet.png';
    a.href = window.__shareUrl;
    a.click();
    toast('Saved to your device 📥');
  };

  window.shareShare = async function () {
    if (!window.__shareBlob) return;
    var info = shareInfo();
    var text = 'My ' + info.title + ' from ' + SHOP.name + ' — ' + (SHOP.site || '') + ' 🌸';
    try {
      var file = new File([window.__shareBlob], 'my-bouquet.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: SHOP.name + ' bouquet', text: text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: SHOP.name + ' bouquet', text: text });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    window.downloadShare();
    var h = document.getElementById('shareHint');
    if (h) h.textContent = 'Downloaded instead so you can send it anywhere.';
  };

  /* ===== 15. PETALS & TOAST ================================ */

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  window.toast = toast;

  /* ===== 16. INITIALIZATION ================================ */

  function checkAsset(c, rowEl) {
    var img = new Image();
    img.onerror = function () {
      missingFiles.add(c.file);
      rowEl.classList.add('missing');
    };
    img.src = assetUrl(c.file);
  }

  function init() {
    var rows = document.getElementById('rows');
    GROUP_ORDER.forEach(function (group, groupIndex) {
      var items = CATALOG.filter(function (c) { return c.group === group; });
      if (!items.length) return;

      var h = document.createElement('button');
      h.type = 'button';
      h.className = 'grouphead' + (groupIndex === 0 ? ' on' : '');
      h.dataset.group = group;
      h.setAttribute('aria-expanded', groupIndex === 0 ? 'true' : 'false');
      h.innerHTML = '<span>' + group + '</span><small>' + items.length + ' to choose</small><i aria-hidden="true">⌄</i>';
      h.onclick = function () { openFlowerGroup(group, h); };
      rows.appendChild(h);

      var box = document.createElement('div');
      box.className = 'flowergroup';
      box.dataset.group = group;
      box.hidden = (groupIndex !== 0);
      rows.appendChild(box);

      items.forEach(function (c) {
        var r = document.createElement('div');
        r.className = 'row';
        r.innerHTML = '<div class="thumb" style="background-image:url(' + assetUrl(c.file) + ')"></div>' +
          '<div class="fmeta"><div class="fname">' + c.label + '</div><div class="fprice">$' + c.price + ' / stem</div></div>' +
          '<div class="step"><button type="button" aria-label="Remove one" onclick="chg(\'' + c.id + '\',-1)">−</button>' +
          '<span class="ct" data-ct="' + c.id + '">0</span>' +
          '<button type="button" aria-label="Add one" onclick="chg(\'' + c.id + '\',1)">+</button></div>';
        box.appendChild(r);
        checkAsset(c, r);
      });
    });

    var buSizes = document.getElementById('buSizes');
    if (buSizes) {
      buSizes.innerHTML = [1, 2, 3, 4, 5].map(function (k) {
        return '<button type="button" data-k="' + k + '"' + (k === 3 ? ' class="on"' : '') + ' onclick="setBuRings(' + k + ')">' +
          SIZE_NAMES[k] + '<small id="buc' + k + '"></small></button>';
      }).join('');
    }

    var buWall = document.querySelector('.swatches[data-zone="wall"]');
    if (buWall) buWall.innerHTML = swatchHtml('wall', WALLS, window.state.bu.wall);

    var buFill = document.querySelector('.swatches[data-zone="fill"]');
    if (buFill) buFill.innerHTML = swatchHtml('fill', WALLS, window.state.bu.fill);

    var buCenter = document.querySelector('.swatches[data-zone="center"]');
    if (buCenter) buCenter.innerHTML = swatchHtml('center', CENTERS, window.state.bu.center);

    var buPat = document.getElementById('buPat');
    if (buPat) {
      buPat.innerHTML = [
        ['zones', 'Zones', 'wall + fill'],
        ['rings', 'Rings', 'ring by ring'],
        ['mix', 'Checker', 'one by one']
      ].map(function (a) {
        return '<button type="button" data-p="' + a[0] + '"' + (a[0] === 'zones' ? ' class="on"' : '') + ' onclick="setBuPattern(\'' + a[0] + '\')">' +
          a[1] + '<small>' + a[2] + '</small></button>';
      }).join('');
    }

    var buX = document.getElementById('buX');
    if (buX) {
      buX.innerHTML = [
        ['wall2', 'Double wall', '2 wall rings'],
        ['greens', '🌿 Greenery', '+$8'],
        ['jewel', '💎 Diamonds', '+$35'],
        ['choc', '🍫 Chocolates', '+$25']
      ].map(function (a) {
        return '<button type="button" data-p="' + a[0] + '" onclick="toggleBuOpt(\'' + a[0] + '\')">' +
          a[1] + '<small>' + a[2] + '</small></button>';
      }).join('');
    }

    var buSash = document.getElementById('buSash');
    if (buSash) {
      buSash.innerHTML = [
        ['bday', '🎂 Happy B-Day'],
        ['wed', '🤍 Happy Wedding'],
        ['love', '❤️ I Love You']
      ].map(function (a) {
        return '<button type="button" data-s="' + a[0] + '" onclick="setBuSash(\'' + a[0] + '\')">' +
          a[1] + '<small>tap to add / remove</small></button>';
      }).join('');
    }

    var wsr = document.getElementById('wrapstyles');
    if (wsr) {
      WRAP_STYLES.forEach(function (w) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.w = w.id;
        b.title = w.label;
        b.style.backgroundImage = 'url(' + assetUrl(w.back) + ')';
        b.onclick = function () { setWrapStyle(w.id); };
        var s = document.createElement('span');
        s.textContent = w.label;
        b.appendChild(s);
        wsr.appendChild(b);
      });
    }

    var rbr = document.getElementById('ribbons');
    if (rbr) {
      RIBBONS.forEach(function (rb) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.r = rb.id;
        b.title = rb.label;
        if (rb.file) {
          b.classList.add('realbow');
          b.style.setProperty('--bow', 'url(' + assetUrl(rb.file) + ')');
        } else {
          b.classList.add('nodot');
        }
        b.onclick = function () { setRibbon(rb.id); };
        var s = document.createElement('span');
        s.textContent = rb.label;
        b.appendChild(s);
        rbr.appendChild(b);
      });
    }

    var sizes = document.getElementById('sizes');
    if (sizes) {
      Object.keys(SIZES).forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.s = s;
        b.textContent = s;
        b.onclick = function () { setSize(s); };
        if (s === window.state.size) b.classList.add('on');
        sizes.appendChild(b);
      });
    }

    setWrapStyle(window.state.wrapStyle);
    setRibbon(window.state.ribbon);
    setNoteOn(window.state.noteOn);
    refreshSizeLabels();
    updateGroupCounts();
    updateHarmonyAdvisor();

    document.getElementById('stepper').addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li) return;
      var n = +li.dataset.n;
      if (n < window.step) setStep(n);
    });

    var q = new URLSearchParams(location.search);
    var hq = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    var _t = hq.get('tpl') || q.get('tpl');
    if (_t === 'round' || _t === 'heart') {
      setTemplate(_t);
      var bs = parseInt(hq.get('bstep') || q.get('bstep') || '0', 10);
      if (bs >= 1 && bs <= 4) setStep(bs);
    } else {
      var _p = hq.get('preset') || q.get('preset');
      preset(_p && PRESETS[_p] ? _p : 'romantic');
      var s = parseInt(hq.get('step') || q.get('step') || '1', 10);
      setStep(s >= 1 && s <= 4 ? s : 1);
    }
  }

  init();
  window.addEventListener('resize', function () { render(); });

  function syncStick() {
    var h = document.querySelector('.bheader');
    if (h) document.documentElement.style.setProperty('--stickTop', Math.max(0, h.offsetHeight - 1) + 'px');
  }
  syncStick();
  window.addEventListener('resize', syncStick);
  window.addEventListener('load', syncStick);

})();
