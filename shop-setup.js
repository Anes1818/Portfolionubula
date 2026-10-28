/* =========================================================================
   NEBULA SITES STUDIO — FLORIST ONBOARDING & SHOP SETUP ENGINE
   Generates valid window.NEBULA_SHOP (shop-config.js), saves to Firebase
   Realtime Database, and sends full email summary via Formspree.
   ========================================================================= */
(function () {
  "use strict";

  var FORMSPREE_ENDPOINT = "https://formspree.io/f/xaenyaqa";
  var FIREBASE_DB_URL =
    (window.NEBULA_LINK_SERVICE &&
      window.NEBULA_LINK_SERVICE.firebase &&
      window.NEBULA_LINK_SERVICE.firebase.databaseURL) ||
    "https://la-flora-6ed47-default-rtdb.firebaseio.com";

  var currentLang = "en";
  var selectedPlan = "subdomain"; // Standard $29 hosting; custom_domain requests a separate quote
  var selectedTheme = {
    id: "plum",
    primary: "#432d3f",
    soft: "#efe5e3",
    background: "#f7f5ef",
    surface: "#ffffff",
    ink: "#342631",
    border: "#dfdbd2"
  };
  var logoDataUrl = "";

  /* -----------------------------------------------------------------------
     1. CATALOG DEFINITIONS (Covers all 38 flowerPrices & 15 extrasCents keys)
     ----------------------------------------------------------------------- */
  var FLOWER_FAMILIES = [
    {
      id: "roses",
      title: { en: "Standard & Garden Roses", es: "Rosas Clásicas y de Jardín" },
      desc: {
        en: "Covers Red, Pink, White, Cream, Ivory, Caramel, Yellow, Orange, Violet & Black roses.",
        es: "Incluye rosas Rojas, Rosadas, Blancas, Crema, Marfil, Caramelo, Amarillas, Naranjas, Violetas y Negras."
      },
      thumb: "builder/assets/heads/rose_red.webp",
      defaultCents: 400,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "rose_red", name: { en: "Red Rose", es: "Rosa Roja" }, img: "builder/assets/heads/rose_red.webp", cents: 400 },
        { key: "rose_pink", name: { en: "Pink / Blush Rose", es: "Rosa Rosada" }, img: "builder/assets/heads/rose_pink.webp", cents: 400 },
        { key: "rose_white", name: { en: "White Rose", es: "Rosa Blanca" }, img: "builder/assets/heads/rose_white.webp", cents: 400 },
        { key: "rose_cream", name: { en: "Cream Rose", es: "Rosa Crema" }, img: "builder/assets/heads/rose_cream.webp", cents: 400 },
        { key: "rose_ivory", name: { en: "Ivory Rose", es: "Rosa Marfil" }, img: "builder/assets/fall/rose-ivory-a.webp", cents: 400 },
        { key: "rose_caramel", name: { en: "Caramel / Toffee Rose", es: "Rosa Caramelo / Toffee" }, img: "builder/assets/fall/rose-caramel.webp", cents: 400 },
        { key: "rose_yellow", name: { en: "Yellow Rose", es: "Rosa Amarilla" }, img: "builder/assets/heads/rose_yellow.webp", cents: 400 },
        { key: "rose_orange", name: { en: "Orange Rose", es: "Rosa Naranja" }, img: "builder/assets/heads/rose_orange.webp", cents: 400 },
        { key: "rose_violet", name: { en: "Lavender / Violet Rose", es: "Rosa Lavanda / Violeta" }, img: "builder/assets/heads/rose_violet.webp", cents: 400 },
        { key: "rose_black", name: { en: "Black / Tinted Rose", es: "Rosa Negra (Teñida)" }, img: "builder/assets/halloween/rose-black-a.webp", cents: 400 }
      ]
    },
    {
      id: "spray_roses",
      title: { en: "Spray Roses (Mini Roses)", es: "Mini Rosas (Spray Roses)" },
      desc: {
        en: "Multi-bloom sweetheart spray rose stems used for texture and romance.",
        es: "Tallos de mini rosas con múltiples botones para textura y volumen."
      },
      thumb: "builder/assets/heads/spray_rose.webp",
      defaultCents: 450,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "spray_rose", name: { en: "Spray Rose Stem", es: "Tallo de Mini Rosa" }, img: "builder/assets/heads/spray_rose.webp", cents: 450 }
      ]
    },
    {
      id: "lilies",
      title: { en: "Oriental & Stargazer Lilies", es: "Lirios Orientales (Lilies)" },
      desc: {
        en: "Showstopping fragrant lilies (Pink Celebration, White & Magenta lilies).",
        es: "Lirios grandes y aromáticos para ramos elegantes y combinados."
      },
      thumb: "builder/assets/heads/lily.webp",
      defaultCents: 500,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "lily", name: { en: "Oriental Lily Stem", es: "Tallo de Lirio Oriental" }, img: "builder/assets/heads/lily.webp", cents: 500 }
      ]
    },
    {
      id: "sunflowers_daisies",
      title: { en: "Sunflowers & Gerbera Daisies", es: "Girasoles y Gerberas" },
      desc: {
        en: "Bright statement blooms: Sunflowers, Gerbera Daisies & Pink Daisies.",
        es: "Flores alegres y llamativas: Girasoles, Gerberas y Margaritas Rosadas."
      },
      thumb: "builder/assets/heads/sunflower.webp",
      defaultCents: 400,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "sunflower", name: { en: "Sunflower", es: "Girasol" }, img: "builder/assets/heads/sunflower.webp", cents: 400 },
        { key: "gerbera_daisy", name: { en: "Gerbera Daisy", es: "Gerbera" }, img: "builder/assets/heads/gerbera_daisy.webp", cents: 400 },
        { key: "pink_daisy", name: { en: "Pink Dark-Center Daisy", es: "Margarita Rosada" }, img: "builder/assets/halloween/pink-dark-daisy.webp", cents: 400 }
      ]
    },
    {
      id: "hydrangea_ranunculus",
      title: { en: "Hydrangeas & Ranunculus", es: "Hortensias y Ranúnculos" },
      desc: {
        en: "Lush cloud hydrangeas and layered ranunculus blooms.",
        es: "Hortensias voluminosas y ranúnculos de pétalos suaves."
      },
      thumb: "builder/assets/heads/hydrangea.webp",
      defaultCents: 650,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "hydrangea", name: { en: "Hydrangea Head", es: "Hortensia" }, img: "builder/assets/heads/hydrangea.webp", cents: 650 },
        { key: "ranunculus", name: { en: "Ranunculus", es: "Ranúnculo" }, img: "builder/assets/heads/ranunculus.webp", cents: 500 }
      ]
    },
    {
      id: "tulips_carnations",
      title: { en: "Tulips & Carnations", es: "Tulipanes y Claveles" },
      desc: {
        en: "Spring tulips ($3.00 default) and ruffled carnations ($2.50 default) across 6 colors.",
        es: "Tulipanes ($3.00 por defecto) y claveles ($2.50 por defecto) en 6 colores."
      },
      thumb: "builder/assets/heads/tulip_pink.webp",
      defaultCents: 300,
      unit: { en: "/ stem", es: "/ tallo" },
      items: [
        { key: "tulip_red", name: { en: "Red Tulip", es: "Tulipán Rojo" }, img: "builder/assets/heads/tulip_red.webp", cents: 300 },
        { key: "tulip_pink", name: { en: "Pink Tulip", es: "Tulipán Rosado" }, img: "builder/assets/heads/tulip_pink.webp", cents: 300 },
        { key: "tulip_white", name: { en: "White Tulip", es: "Tulipán Blanco" }, img: "builder/assets/heads/tulip_white.webp", cents: 300 },
        { key: "tulip_yellow", name: { en: "Yellow Tulip", es: "Tulipán Amarillo" }, img: "builder/assets/heads/tulip_yellow.webp", cents: 300 },
        { key: "tulip_orange", name: { en: "Orange Tulip", es: "Tulipán Naranja" }, img: "builder/assets/heads/tulip_orange.webp", cents: 300 },
        { key: "tulip_violet", name: { en: "Violet Tulip", es: "Tulipán Violeta" }, img: "builder/assets/heads/tulip_violet.webp", cents: 300 },
        { key: "carnation_red", name: { en: "Red Carnation", es: "Clavel Rojo" }, img: "builder/assets/heads/carnation_red.webp", cents: 250 },
        { key: "carnation_pink", name: { en: "Pink Carnation", es: "Clavel Rosado" }, img: "builder/assets/heads/carnation_pink.webp", cents: 250 },
        { key: "carnation_white", name: { en: "White Carnation", es: "Clavel Blanco" }, img: "builder/assets/heads/carnation_white.webp", cents: 250 },
        { key: "carnation_yellow", name: { en: "Yellow Carnation", es: "Clavel Amarillo" }, img: "builder/assets/heads/carnation_yellow.webp", cents: 250 },
        { key: "carnation_orange", name: { en: "Orange Carnation", es: "Clavel Naranja" }, img: "builder/assets/heads/carnation_orange.webp", cents: 250 },
        { key: "carnation_violet", name: { en: "Violet Carnation", es: "Clavel Violeta" }, img: "builder/assets/heads/carnation_violet.webp", cents: 250 }
      ]
    },
    {
      id: "greenery_fillers",
      title: { en: "Baby's Breath, Eucalyptus & Fillers", es: "Gypsophila (Nube), Eucalipto y Follaje" },
      desc: {
        en: "Essential bouquet fillers: Baby's Breath, Eucalyptus, Alstroemeria, Statice, Stock & Rosemary.",
        es: "Complementos esenciales: Gypsophila/Nube, Eucalipto, Astromelia, Statice, Stock y Romero."
      },
      thumb: "builder/assets/heads/babys_breath.webp",
      defaultCents: 200,
      unit: { en: "/ sprig", es: "/ rama" },
      items: [
        { key: "babys_breath", name: { en: "Baby's Breath Sprig", es: "Gypsophila / Nube" }, img: "builder/assets/heads/babys_breath.webp", cents: 200 },
        { key: "eucalyptus", name: { en: "Silver Eucalyptus", es: "Eucalipto" }, img: "builder/assets/heads/eucalyptus.webp", cents: 200 },
        { key: "alstroemeria", name: { en: "Alstroemeria", es: "Astromelia" }, img: "builder/assets/heads/alstroemeria.webp", cents: 300 },
        { key: "statice_purple", name: { en: "Purple Statice / Limonium", es: "Statice / Limonium" }, img: "builder/assets/heads/statice_purple.webp", cents: 200 },
        { key: "stock_yellow", name: { en: "Stock Blossom", es: "Flor de Stock / Alelí" }, img: "builder/assets/heads/stock_yellow.webp", cents: 350 },
        { key: "rosemary", name: { en: "Fresh Rosemary Sprig", es: "Rama de Romero" }, img: "builder/assets/classic/rosemary-1.webp", cents: 200 }
      ]
    },
    {
      id: "mums_sweets",
      title: { en: "Autumn Mums, Strawberries & Chocolates", es: "Crisantemos, Fresas con Chocolate y Bombones" },
      desc: {
        en: "Mums plus gourmet Chocolate-Covered Strawberries & Ferrero/Chocolate stems. Turn off if not offered!",
        es: "Crisantemos de temporada, Fresas con Chocolate y Bombones en tallo. ¡Desactívalos si no los vendes!"
      },
      thumb: "builder/assets/heads/strawberry-dome-v2-1.webp",
      defaultCents: 350,
      unit: { en: "/ each", es: "/ unidad" },
      items: [
        { key: "__berry", name: { en: "Chocolate-Covered Strawberry", es: "Fresa con Chocolate" }, img: "builder/assets/heads/strawberry-dome-v2-1.webp", cents: 300 },
        { key: "__choc", name: { en: "Ferrero / Gourmet Chocolate Stem", es: "Bombón Ferrero / Chocolate" }, img: "builder/assets/finishes/extra_chocolate_gold.webp", cents: 500 },
        { key: "chrysanthemum_yellow", name: { en: "Golden Chrysanthemum", es: "Crisantemo Dorado" }, img: "builder/assets/heads/chrysanthemum_yellow.webp", cents: 400 },
        { key: "mum_rust", name: { en: "Autumn Rust Mum", es: "Crisantemo Terracota" }, img: "builder/assets/fall/orange-flower.webp", cents: 350 },
        { key: "mum_burgundy", name: { en: "Burgundy Cushion Mum", es: "Crisantemo Vino / Borgoña" }, img: "builder/assets/fall/mum-burgundy.webp", cents: 350 }
      ]
    }
  ];

  var EXTRAS_LIST = [
    {
      key: "butterfly",
      title: { en: "Gold 3D Butterflies", es: "Mariposas Doradas 3D" },
      desc: { en: "Set of shimmering metallic butterflies clipped onto the blooms.", es: "Mariposas metálicas doradas sobre las flores." },
      img: "builder/assets/finishes/extra_butterfly_gold.webp",
      defaultCents: 300
    },
    {
      key: "crown",
      title: { en: "Gold Queen Crown", es: "Corona Dorada de Reina" },
      desc: { en: "Crystal-accented gold tiara resting at the center of the bouquet.", es: "Corona dorada con cristales en el centro del ramo." },
      img: "builder/assets/finishes/extra_crown_gold.webp",
      defaultCents: 1500
    },
    {
      key: "bow",
      title: { en: "Statement Satin Bow", es: "Moño Grande de Satín" },
      desc: { en: "Large double-loop satin bow at the collar of the bouquet.", es: "Moño grande de listón satinado al frente del ramo." },
      img: "builder/assets/fall/brown-bow.webp",
      defaultCents: 400
    },
    {
      key: "ribbon",
      title: { en: "Classic Satin Tie Ribbon", es: "Listón Clásico de Amarre" },
      desc: { en: "Usually $0.00 (included with wrapping) or set an upgrade fee.", es: "Usualmente $0.00 (incluido) o define un costo extra." },
      img: "builder/assets/finishes/ribbon_blush.webp",
      defaultCents: 0
    },
    {
      key: "sash",
      title: { en: "Printed Dedication Sash", es: "Cinta Impresa con Dedicatoria" },
      desc: { en: "Happy Birthday, Te Amo, or custom message ribbon across the wrap.", es: "Listón impreso (Feliz Cumpleaños, Te Amo, etc.)." },
      img: "builder/assets/finishes/sash_love.webp",
      defaultCents: 0
    },
    {
      key: "floralInitial",
      title: { en: "Floral Initial Letter (A–Z)", es: "Inicial Formada con Flores (A–Z)" },
      desc: { en: "Custom letter sculpted from contrasting white florets inside the dome.", es: "Letra personalizada hecha con flores en el centro del ramo." },
      img: "builder/assets/heads/rose_white.webp",
      defaultCents: 1200
    },
    {
      key: "filler",
      title: { en: "Extra Baby's Breath Cloud", es: "Nube Extra de Gypsophila" },
      desc: { en: "Per cluster of baby's breath added around dome or heart arrangements.", es: "Por toque extra de nube blanca alrededor del ramo." },
      img: "builder/assets/fall/breath-airy.webp",
      defaultCents: 200
    },
    {
      key: "snoopy",
      title: { en: "Snoopy Plush Toy", es: "Peluche de Snoopy" },
      desc: { en: "Adorable Snoopy plush nestled into the bouquet.", es: "Peluche de Snoopy integrado en el ramo." },
      img: "builder/assets/fall/plush-snoopy.webp",
      defaultCents: 2200
    },
    {
      key: "kitty",
      title: { en: "Hello Kitty Plush Toy", es: "Peluche de Hello Kitty" },
      desc: { en: "Sweet Hello Kitty plush nestled into the blooms.", es: "Peluche de Hello Kitty integrado en el ramo." },
      img: "builder/assets/fall/plush-kitty.webp",
      defaultCents: 2200
    },
    {
      key: "snoopy_topper",
      title: { en: "Mini Snoopy Topper", es: "Mini Snoopy Decorativo" },
      desc: { en: "Small Snoopy character pick accent.", es: "Mini figura decorativa de Snoopy." },
      img: "builder/assets/fall/topper-snoopy.webp",
      defaultCents: 600
    },
    {
      key: "pumpkin",
      title: { en: "Velvet Autumn Pumpkin", es: "Calabaza Decorativa de Otoño" },
      desc: { en: "Seasonal autumn pumpkin accent tucked into fall bouquets.", es: "Calabaza decorativa para ramos de otoño." },
      img: "builder/assets/fall/pumpkin.webp",
      defaultCents: 1800
    },
    {
      key: "spookyMask",
      title: { en: "Scream / Spooky Mask (Halloween)", es: "Máscara Scream (Halloween)" },
      desc: { en: "Centerpiece mask for Forever My Boo / Halloween bouquets.", es: "Máscara central para ramos temáticos de Halloween." },
      img: "builder/assets/halloween/scream-mask.webp",
      defaultCents: 2000
    },
    {
      key: "spookyBow",
      title: { en: "Black Gothic Bow (Halloween)", es: "Moño Negro Gótico (Halloween)" },
      desc: { en: "Long-tail black satin bow for dark/spooky editions.", es: "Moño negro de listón largo para ediciones oscuras." },
      img: "builder/assets/halloween/black-bow-tails.webp",
      defaultCents: 400
    },
    {
      key: "ghostCount",
      title: { en: "Mini Ghost Pick (Halloween)", es: "Mini Fantasma Decorativo" },
      desc: { en: "Price per cute mini ghost decal/pick in spooky bouquets.", es: "Precio por mini fantasma decorativo en ramos de Halloween." },
      img: "builder/assets/halloween/ghost-decal.svg",
      defaultCents: 100
    },
    {
      key: "thistleCount",
      title: { en: "Blue Thistle Accent Stem", es: "Cardo Azul (Blue Thistle)" },
      desc: { en: "Textural blue eryngium thistle accent per stem.", es: "Tallo de cardo azul texturizado." },
      img: "builder/assets/halloween/blue-thistle.webp",
      defaultCents: 250
    }
  ];

  var DEFAULT_SIGNATURE_BOUQUETS = [
    {
      slot: 1,
      defaultName: "Pink Promise (Blush & Ivory)",
      defaultPrice: "85",
      placeholderImg: "builder/assets/catalog/thumbs/pink-promise.webp",
      customPhotoDataUrl: ""
    },
    {
      slot: 2,
      defaultName: "Always You (Red Rose Romance)",
      defaultPrice: "95",
      placeholderImg: "builder/assets/catalog/thumbs/always-you.webp",
      customPhotoDataUrl: ""
    },
    {
      slot: 3,
      defaultName: "Harvest Sunshine (Sunflowers & Roses)",
      defaultPrice: "80",
      placeholderImg: "builder/assets/catalog/thumbs/harvest-sunshine.webp",
      customPhotoDataUrl: ""
    },
    {
      slot: 4,
      defaultName: "Written in Roses (24-Rose Buchón)",
      defaultPrice: "135",
      placeholderImg: "builder/assets/catalog/thumbs/written-in-roses.webp",
      customPhotoDataUrl: ""
    }
  ];

  /* -----------------------------------------------------------------------
     2. BILINGUAL TRANSLATIONS (EN / ES)
     ----------------------------------------------------------------------- */
  var I18N = {
    en: {
      domainQuoteLabel: "Separate quote",
      headerSub: "Florist Studio Setup",
      navStep1: "1. Shop & Logo",
      navStep2: "2. Flower Prices",
      navStep3: "3. Toys & New Assets",
      navStep4: "4. Collection & Scope",
      heroEyebrow: "Your flower shop, ready for setup",
      heroTitle: "Your flowers.<br>Your prices.<br><em>Your own studio.</em>",
      heroLead:
        "Start with the example prices below, then enter your actual prices and available products. We confirm your collection and setup scope before building your shop’s version.",
      badgePreFilled: "Pre-filled smart prices",
      badgeFreeBouquets: "Your branding and prices",
      badgePayAfter: "Pay $0 today — only after your studio is live",
      promiseTag: "Included with your setup",
      promiseTitle: "Fair, simple & built for florists",
      promise1: "<b>Your branding & prices:</b> Your logo, shop name, WhatsApp/SMS number, and exact stem & wrapping prices.",
      promise2: "<b>Your collection:</b> Choose existing designs or share bouquet photos for review. Custom recreations and seasonal changes are quoted before work starts.",
      promise3: "<b>Want new toys or flowers?</b> Tell us in Step 4 if you want custom plush toys, flowers, or wraps added.",
      promise4: "<b>$29 USD/month:</b> One Nebula-hosted studio. Custom domain connection and renewal are quoted separately.",
      step1Kicker: "Shop Identity & Branding",
      step1Title: "Tell us about your flower shop",
      step1Sub: "Your logo, shop name, and phone number appear on your studio and receive customer bouquet requests.",
      lblShopName: "Flower Shop Name *",
      lblYourLink: "Your studio link preview:",
      lblOwnerName: "Your Name / Florist Byline *",
      lblOwnerHint: "e.g. By Maritza Gomez",
      hintOwner: "Shown as a warm signature under your shop title and for our setup communication.",
      lblChannel: "How do you want to receive bouquet orders? *",
      optWhatsapp: "WhatsApp Message (Recommended)",
      optSms: "SMS Text Message (iMessage / Android Text)",
      lblPhone: "WhatsApp / Order Phone Number *",
      lblPhoneHint: "With country/area code",
      lblEmail: "Your Email Address *",
      lblInsta: "Instagram Handle",
      lblOptional: "(optional)",
      lblCity: "City *",
      lblCurrency: "Shop Currency *",
      lblCountry: "Country *",
      hintCountry: "We set your currency and phone format automatically.",
      lblLanguages: "Builder language(s) for your customers *",
      lblFulfillment: "Pickup & Delivery Options *",
      optFulfillBoth: "Both In-Store Pickup & Local Delivery",
      optFulfillDelivery: "Local Delivery Only",
      optFulfillPickup: "In-Store / Home Pickup Only",
      lblCustomerPayment: "How do your customers pay you? *",
      optPayConfirm: "Confirm order on WhatsApp/SMS first (Zelle, Cash App, Bank Transfer, Cash)",
      optPayOnline: "Online Checkout Link (Square, Stripe, PayPal)",
      optPayBoth: "Both options (Customer chooses)",
      previewKicker: "Instant Builder Preview",
      previewTitle: "See what your customers will use — right here",
      previewSub: "Customers personalize a bouquet, review an estimate and prepare a request for your shop. You confirm availability and the final price.",
      modeCard1Title: "1. Classic Wrap",
      modeCard1Sub: "Layered paper, ribbons & stems",
      modeCard2Title: "2. Round Dome",
      modeCard2Sub: "Full 360° buchón arrangement",
      modeCard3Title: "3. Heart & Extras",
      modeCard3Sub: "Crowns, plushies, letters & chocolates",
      previewPoint1: "<b>Customers design it themselves</b> on their phone, no app needed",
      previewPoint2: "<b>Live price</b> with every stem and add-on, using your prices",
      previewPoint3: "<b>The finished order arrives on your WhatsApp</b> with the picture, the recipe and the total",
      previewTryInline: "▶ Try Interactive Builder Here",
      previewOpen: "Open full screen ↗",
      previewTap: "Tap to test live on this screen",
      lblLogoUpload: "Shop Logo (PNG, JPG or WebP)",
      lblLogoClick: "Click to upload your shop logo",
      lblLogoSub: "Appears in your studio header & order sheet. Don’t have it handy? You can send it later on WhatsApp.",
      lblTheme: "Studio Color Atmosphere",
      lblThemeSub: "Pick the color mood that best matches your flower shop:",
      step2Kicker: "Base Wrapping & Arrangement Labor",
      step2Title: "Wrapping & bouquet style fees",
      step2Sub: "Every non-empty bouquet starts with your Base Wrapping fee plus the labor fee for the bouquet shape the customer chooses.",
      baseTitle: "Base Preparation & Wrapping",
      baseDesc: "Added once to every bouquet (includes wrapping paper, water tube/hydration, care card & tissue).",
      perBouquet: "/ bouquet",
      laborClassicTitle: "Classic Hand-Tied",
      laborClassicDesc: "Layered front-facing hand-tied wrap (Ivory, Kraft, Cocoa or Black paper).",
      laborDomeTitle: "Round Dome / Buchón",
      laborDomeDesc: "Overhead sculpted round dome bouquet with ruffled paper collar.",
      laborHeartTitle: "Heart Silhouette",
      laborHeartDesc: "Romantic sculpted heart-shaped rose & floral arrangement.",
      offered: "Offered",
      notOffered: "Not offered",
      laborFee: "labor",
      step3Kicker: "Visual Flower & Stem Pricing",
      step3Title: "Your price per stem (grouped for speed)",
      step3Sub: "Set one price per flower family, or click “+ Customize individual colors” if a specific color (like Black Roses or Strawberries) costs more. Toggle off any flower you don’t carry.",
      btnResetDefaults: "↺ Reset to Standard Defaults",
      btnAdjustMinus: "−10% All Stems",
      btnAdjustPlus: "+10% All Stems",
      step4Kicker: "Plush Toys, Ribbons, Crowns & New Assets",
      step4Title: "Finishing touches & plush toys",
      step4Sub: "Toggle off any accessory you don’t keep in stock. Set $0.00 if an item (like a ribbon or dedication sash) is included free with the bouquet.",
      customAssetBadge: "Custom Studio Additions",
      customAssetTitle: "Do you want to add some new assets? (Like new plush toys, new flowers, custom wraps, etc.)",
      customAssetDesc: "Does your flower shop sell special plush toys (Teddy bears, Stitch, Graduation bears), unique flowers (Orchids, Peonies, Blue Roses), or your own branded wrapping paper & boxes? Select what you’d like to add and list them below!",
      catChipToys: "+ New Plush Toys",
      catChipFlowers: "+ New Flowers / Colors",
      catChipWraps: "+ Custom Wrapping Paper",
      catChipToppers: "+ Ribbons / Crowns / Toppers",
      catChipGifts: "+ Chocolates / Gift Boxes",
      btnAddCustomItem: "Add a New Toy, Flower or Custom Asset",
      customItemHint: "You can attach a photo of your toy, flower, or paper right on each row.",
      lblCustomNotes: "Describe any new toys, flowers, or special ideas you want in your studio",
      step5Kicker: "Your collection and setup scope",
      step5Title: "Choose your starting collection",
      step5Sub: "Use designs from the existing library, or upload references for a custom-work quote. Photos are optional and do not authorize paid work.",
      freeBouquetsBannerTitle: "Your bouquet references · optional",
      freeBouquetsBannerSub: "Share up to 4 references below. We confirm which existing designs fit and quote any new artwork or custom bouquet work separately.",
      extraBouquetsTitle: "Planning a larger collection?",
      extraBouquetsSub: "Tell us how many additional custom designs you have in mind. We will confirm the artwork, scope and quote before starting.",
      lblExtraBouquets: "Extra Custom Bouquets",
      optExtra0: "No additional custom designs",
      optExtra1: "1 additional custom design(s) — quote requested",
      optExtra2: "2 additional custom design(s) — quote requested",
      optExtra3: "3 additional custom design(s) — quote requested",
      optExtra4: "4 additional custom design(s) — quote requested",
      choosePlanHeading: "Your hosting and domain preference",
      planPopularBadge: "Standard plan",
      plan29Title: "Nebula Studio Link",
      plan35Title: "Request a custom-domain quote",
      perMonth: "/ month",
      plan29Bullet1: "Your custom-configured Bouquet Builder (Classic, Dome & Heart)",
      plan29Bullet2: "One monthly batch of up to 10 price, text or contact edits",
      plan29Bullet3: "One setup review round + up to 20 minutes of monthly asynchronous support",
      plan29Bullet4: "Pay $0 today — subscription starts only after your shop is live",
      plan35Bullet1: "The $29 USD/month studio, plus separately quoted domain work",
      plan35Bullet2: "Registration, connection and renewal costs confirmed in writing",
      plan35Bullet3: "Existing website compatibility reviewed before we commit",
      plan35Bullet4: "Pay $0 today — subscription starts only after your shop is live",
      lblDesiredDomain: "Preferred domain · optional, subject to availability",
      submitCardTitle: "Ready to build your flower shop’s studio?",
      submitCardDesc: "Send your setup details for review. We confirm scope, any separate quotes and the launch date with you. No payment or subscription is started by this form.",
      btnSubmitSetup: "Submit My Shop Setup",
      submitFinePrint: "Saves your setup and photos to Firebase and emails a summary to Nebula.",
      calcTitle: "Live Estimate With Your Prices:",
      sample1Label: "12-Rose Classic:",
      sample2Label: "24-Rose Dome + Bow:",
      sample3Label: "Lily & Rose Mix:",
      samplePlanLabel: "Plan:",
      calcFinishBtn: "Finish & Submit ↓"
    },
    es: {
      domainQuoteLabel: "Presupuesto aparte",
      headerSub: "Configuración de Florería",
      navStep1: "1. Tu Florería",
      navStep2: "2. Precios de Flores",
      navStep3: "3. Peluches y Nuevos",
      navStep4: "4. Colección y alcance",
      heroEyebrow: "Tu floristería, lista para configurar",
      heroTitle: "Tus flores.<br>Tus precios.<br><em>Tu propio estudio.</em>",
      heroLead:
        "Empieza con los precios de ejemplo y añade tus precios reales y productos disponibles. Confirmamos tu colección y el alcance antes de crear tu estudio.",
      badgePreFilled: "Precios pre-llenados fáciles de editar",
      badgeFreeBouquets: "Tu marca y tus precios",
      badgePayAfter: "Pagas $0 hoy — solo cuando tu estudio esté listo",
      promiseTag: "Incluido con tu configuración",
      promiseTitle: "Justo, claro y pensado para florerías",
      promise1: "<b>Tu marca y tus precios:</b> Tu logo, nombre de florería, WhatsApp/SMS y precios exactos por tallo y envoltura.",
      promise2: "<b>Tu colección:</b> Elige diseños existentes o comparte fotos para revisión. Las recreaciones y cambios de temporada se cotizan antes de empezar.",
      promise3: "<b>¿Quieres nuevos peluches o flores?</b> Dinos en el Paso 4 si deseas agregar peluches, flores o papeles nuevos.",
      promise4: "<b>$29 USD/mes:</b> Un estudio alojado en Nebula. La conexión y renovación de dominio se cotizan aparte.",
      step1Kicker: "Identidad y Marca de tu Florería",
      step1Title: "Cuéntanos sobre tu florería",
      step1Sub: "Tu logo, nombre y número de WhatsApp/teléfono aparecerán en tu estudio para recibir los pedidos de tus clientes.",
      lblShopName: "Nombre de la Florería *",
      lblYourLink: "Vista previa de tu enlace:",
      lblOwnerName: "Tu Nombre / Firma de Florista *",
      lblOwnerHint: "ej. Por Maritza Gómez",
      hintOwner: "Aparece como firma debajo del nombre de tu florería y para comunicarnos contigo.",
      lblChannel: "¿Cómo prefieres recibir los pedidos de ramos? *",
      optWhatsapp: "Mensaje de WhatsApp (Recomendado)",
      optSms: "Mensaje de Texto SMS (iMessage / Android)",
      lblPhone: "Número de WhatsApp / Teléfono de Pedidos *",
      lblPhoneHint: "Con código de país / área",
      lblEmail: "Tu Correo Electrónico *",
      lblInsta: "Usuario de Instagram",
      lblOptional: "(opcional)",
      lblCity: "Ciudad *",
      lblCurrency: "Moneda de tu Florería *",
      lblCountry: "País *",
      hintCountry: "Ajustamos tu moneda y formato de teléfono automáticamente.",
      lblLanguages: "Idioma(s) del constructor para tus clientes *",
      lblFulfillment: "Opciones de Entrega y Recogida *",
      optFulfillBoth: "Ambos: Recogida en Tienda y Entrega a Domicilio",
      optFulfillDelivery: "Solo Entrega a Domicilio",
      optFulfillPickup: "Solo Recogida (Pickup)",
      lblCustomerPayment: "¿Cómo te pagan tus clientes? *",
      optPayConfirm: "Confirmar por WhatsApp/SMS primero (Zelle, Transferencia, Efectivo)",
      optPayOnline: "Enlace de Pago en Línea (Square, Stripe, PayPal)",
      optPayBoth: "Ambas opciones (El cliente elige)",
      previewKicker: "Vista previa instantánea",
      previewTitle: "Mira lo que usarán tus clientes — aquí mismo",
      previewSub: "Tus clientes personalizan un ramo, revisan una estimación y preparan una solicitud. Tú confirmas disponibilidad y precio final.",
      modeCard1Title: "1. Ramo Clásico",
      modeCard1Sub: "Papel coreano en capas y listón",
      modeCard2Title: "2. Domo Redondo",
      modeCard2Sub: "Arreglo buchón completo 360°",
      modeCard3Title: "3. Corazón y Extras",
      modeCard3Sub: "Coronas, peluches, letras y chocolates",
      previewPoint1: "<b>Tus clientes lo diseñan solos</b> desde su teléfono, sin descargar nada",
      previewPoint2: "<b>Precio en vivo</b> con cada tallo y extra, usando tus precios",
      previewPoint3: "<b>El pedido final te llega por WhatsApp</b> con la imagen, la receta y el total",
      previewTryInline: "▶ Probar Constructor Interactivo Aquí",
      previewOpen: "Abrir en pantalla completa ↗",
      previewTap: "Toca para probar en vivo aquí",
      lblLogoUpload: "Logo de tu Florería (PNG, JPG o WebP)",
      lblLogoClick: "Haz clic para subir el logo de tu florería",
      lblLogoSub: "Aparece en el encabezado y hoja de pedido. ¿No lo tienes a la mano? Puedes enviarlo luego por WhatsApp.",
      lblTheme: "Atmósfera de Color del Estudio",
      lblThemeSub: "Elige el estilo de color que mejor combine con tu florería:",
      step2Kicker: "Preparación Base y Mano de Obra",
      step2Title: "Costos de envoltura y estilo de ramo",
      step2Sub: "Cada ramo comienza con tu costo de Preparación Base más la mano de obra según la forma que elija el cliente.",
      baseTitle: "Preparación y Envoltura Base",
      baseDesc: "Se suma una vez por ramo (incluye papel coreano/envoltura, hidratación, tarjeta y preparación).",
      perBouquet: "/ ramo",
      laborClassicTitle: "Ramo Clásico de Mano",
      laborClassicDesc: "Envoltura frontal en capas (papel Marfil, Kraft, Cocoa o Negro).",
      laborDomeTitle: "Domo Redondo / Ramo Buchón",
      laborDomeDesc: "Vista superior redonda estilo buchón con cuello de papel plisado.",
      laborHeartTitle: "Silueta de Corazón",
      laborHeartDesc: "Arreglo romántico esculpido en forma de corazón.",
      offered: "Disponible",
      notOffered: "No disponible",
      laborFee: "mano de obra",
      step3Kicker: "Catálogo Visual de Flores y Precios por Tallo",
      step3Title: "Tu precio por tallo (agrupado por familia)",
      step3Sub: "Define un precio por familia de flor, o abre “+ Personalizar colores individuales” si algún color (como Rosas Negras o Fresas) cuesta distinto. Desactiva lo que no vendas.",
      btnResetDefaults: "↺ Restaurar Precios Estándar",
      btnAdjustMinus: "−10% Todos los Tallos",
      btnAdjustPlus: "+10% Todos los Tallos",
      step4Kicker: "Peluches, Moños, Coronas y Nuevos Activos",
      step4Title: "Toques finales, accesorios y peluches",
      step4Sub: "Desactiva cualquier accesorio que no manejes. Pon $0.00 si un detalle (como el listón o cinta) va incluido gratis.",
      customAssetBadge: "Nuevos Elementos Personalizados",
      customAssetTitle: "¿Quieres agregar nuevos elementos? (Nuevos peluches, flores especiales, papeles, etc.)",
      customAssetDesc: "¿Tu florería vende peluches especiales (Osos gigantes, Stitch, Osos de graduación), flores únicas (Orquídeas, Peonías, Rosas Azules) o tu propio papel y cajas? ¡Selecciona qué te gustaría agregar y anótalos aquí!",
      catChipToys: "+ Nuevos Peluches",
      catChipFlowers: "+ Nuevas Flores / Colores",
      catChipWraps: "+ Papel de Envoltura Propio",
      catChipToppers: "+ Cintas / Coronas / Toppers",
      catChipGifts: "+ Chocolates / Cajas",
      btnAddCustomItem: "Agregar Nuevo Peluche, Flor o Accesorio",
      customItemHint: "Puedes adjuntar una foto de tu peluche, flor o papel en cada fila.",
      lblCustomNotes: "Describe cualquier nuevo peluche, flor o idea especial que quieras en tu estudio",
      step5Kicker: "Tu colección y alcance",
      step5Title: "Elige tu colección inicial",
      step5Sub: "Usa diseños de la biblioteca o sube referencias para cotizar un trabajo personalizado. Las fotos son opcionales y no autorizan trabajos de pago.",
      freeBouquetsBannerTitle: "Referencias de tus ramos · opcionales",
      freeBouquetsBannerSub: "Comparte hasta 4 referencias. Confirmamos qué diseños existentes encajan y cotizamos aparte las imágenes nuevas y los ramos personalizados.",
      extraBouquetsTitle: "¿Quieres una colección más amplia?",
      extraBouquetsSub: "Indica cuántos diseños personalizados adicionales necesitas. Confirmaremos imágenes, alcance y presupuesto antes de empezar.",
      lblExtraBouquets: "Ramos Personalizados Adicionales",
      optExtra0: "Sin diseños personalizados adicionales",
      optExtra1: "1 diseño(s) adicional(es) — solicitar presupuesto",
      optExtra2: "2 diseño(s) adicional(es) — solicitar presupuesto",
      optExtra3: "3 diseño(s) adicional(es) — solicitar presupuesto",
      optExtra4: "4 diseño(s) adicional(es) — solicitar presupuesto",
      choosePlanHeading: "Tu alojamiento y dominio",
      planPopularBadge: "Plan estándar",
      plan29Title: "Enlace en Nebula Studio",
      plan35Title: "Solicitar presupuesto de dominio",
      perMonth: "/ mes",
      plan29Bullet1: "Tu creador de ramos configurado (Clásico, Domo y Corazón)",
      plan29Bullet2: "Un lote mensual de hasta 10 cambios de precios, textos o contacto",
      plan29Bullet3: "Una ronda de revisión inicial y hasta 20 minutos de soporte asíncrono al mes",
      plan29Bullet4: "Pagas $0 hoy — la mensualidad inicia solo cuando tu estudio esté en vivo",
      plan35Bullet1: "El estudio de $29 USD/mes, más el dominio cotizado aparte",
      plan35Bullet2: "Registro, conexión y renovación confirmados por escrito",
      plan35Bullet3: "Revisamos la compatibilidad de tu sitio antes de comprometernos",
      plan35Bullet4: "Pagas $0 hoy — la mensualidad inicia solo cuando tu estudio esté en vivo",
      lblDesiredDomain: "Dominio deseado · opcional, sujeto a disponibilidad",
      submitCardTitle: "¿Listo para que creemos el estudio de tu florería?",
      submitCardDesc: "Envía tus datos para revisión. Confirmamos alcance, presupuestos adicionales y fecha de lanzamiento. Este formulario no inicia pagos ni suscripciones.",
      btnSubmitSetup: "Enviar Configuración de Mi Florería",
      submitFinePrint: "Guarda tus datos y fotos en Firebase y envía un resumen a Nebula por correo.",
      calcTitle: "Cálculo en Vivo con tus Precios:",
      sample1Label: "Clásico 12 Rosas:",
      sample2Label: "Domo 24 Rosas + Moño:",
      sample3Label: "Mix Lirios y Rosas:",
      samplePlanLabel: "Plan:",
      calcFinishBtn: "Finalizar y Enviar ↓"
    },
    tr: {
      domainQuoteLabel: "Ayrı teklif",
      headerSub: "Çiçekçi Stüdyo Kurulumu",
      navStep1: "1. Mağaza ve Logo",
      navStep2: "2. Çiçek Fiyatları",
      navStep3: "3. Oyuncaklar ve Ekstralar",
      navStep4: "4. Koleksiyon ve kapsam",
      heroEyebrow: "Çiçekçiniz için stüdyo kurulumu",
      heroTitle: "Sizin çiçekleriniz.<br>Sizin fiyatlarınız.<br><em>Kendi tasarım stüdyonuz.</em>",
      heroLead: "Aşağıdaki örnek fiyatları gerçek fiyatlarınız ve mevcut ürünlerinizle değiştirin. Stüdyonuzu hazırlamadan önce koleksiyon ve kapsamı birlikte onaylarız.",
      badgePreFilled: "Hazır doldurulmuş akıllı fiyatlar",
      badgeFreeBouquets: "Markanız ve fiyatlarınız",
      badgePayAfter: "Bugün 0$ ödeyin — sadece stüdyonuz yayına girince başlayın",
      promiseTag: "Kurulumunuza dahil olanlar",
      promiseTitle: "Çiçekçiler için hızlı, şeffaf ve kolay",
      promise1: "<b>Kendi markanız ve fiyatlarınız:</b> Logonuz, mağaza adınız, WhatsApp numaranız, TL (₺) para biriminiz ve dal/ambalaj fiyatlarınız.",
      promise2: "<b>Koleksiyonunuz:</b> Hazır tasarımları seçin veya inceleme için buket fotoğrafları gönderin. Özel tasarımlar ve sezon değişiklikleri için işe başlamadan önce teklif sunarız.",
      promise3: "<b>Özel peluş veya çiçek mi istiyorsunuz?</b> 4. Adımda mağazanıza özel peluş oyuncak, kutu veya çiçekleri ekleyebilirsiniz.",
      promise4: "<b>Aylık 29 USD:</b> Nebula üzerinde bir stüdyo. Özel alan adı bağlantısı ve yenileme ayrıca fiyatlandırılır.",
      step1Kicker: "Mağaza Kimliği ve Marka",
      step1Title: "Çiçekçi mağazanızın bilgileri",
      step1Sub: "Logonuz, mağaza adınız ve WhatsApp/telefon numaranız stüdyonuzda görünür ve müşteri siparişlerini alır.",
      lblShopName: "Çiçekçi / Mağaza Adı *",
      lblYourLink: "Stüdyo linki önizlemeniz:",
      lblOwnerName: "Adınız / Çiçekçi İmzası *",
      lblOwnerHint: "örn. Ahmet Yılmaz",
      hintOwner: "Mağaza adınızın altında imza olarak görünür ve iletişim için kullanılır.",
      lblChannel: "Buket siparişlerini nasıl almak istersiniz? *",
      optWhatsapp: "WhatsApp Mesajı (Önerilen)",
      optSms: "SMS Kısa Mesaj",
      lblPhone: "WhatsApp / Sipariş Telefon Numarası *",
      lblPhoneHint: "Ülke kodu ile (+90...)",
      lblEmail: "E-posta Adresiniz *",
      lblInsta: "Instagram Kullanıcı Adı",
      lblOptional: "(isteğe bağlı)",
      lblCity: "Şehir *",
      lblCurrency: "Mağaza Para Birimi *",
      lblCountry: "Ülke *",
      hintCountry: "Para biriminizi ve telefon formatınızı otomatik ayarlarız.",
      lblLanguages: "Müşterileriniz için stüdyo dili *",
      lblFulfillment: "Teslimat ve Gel-Al Seçenekleri *",
      optFulfillBoth: "Hem Mağazadan Teslim (Gel-Al) Hem Adrese Teslimat",
      optFulfillDelivery: "Sadece Adrese Kurye Teslimatı",
      optFulfillPickup: "Sadece Mağazadan Teslim (Gel-Al)",
      lblCustomerPayment: "Müşterileriniz ödemeyi nasıl yapıyor? *",
      optPayConfirm: "Önce WhatsApp üzerinden onay (IBAN / Havale / Ödeme Linki)",
      optPayOnline: "Online Ödeme Linki (Shopify, Iyzico, PayTR, Stripe)",
      optPayBoth: "Her iki seçenek (Müşteri seçer)",
      previewKicker: "Buket Stüdyosu Önizlemesi",
      previewTitle: "Müşterilerinizin kullanacağı ekranı görün",
      previewSub: "Müşteriler buketi kişiselleştirir, tahmini fiyatı görür ve mağazanıza talep hazırlar. Stok ve son fiyatı siz onaylarsınız.",
      modeCard1Title: "1. Klasik Buket",
      modeCard1Sub: "Katmanlı kağıt, kurdele ve saplar",
      modeCard2Title: "2. Yuvarlak Kubbe (Dome)",
      modeCard2Sub: "360° dolgun yuvarlak buket",
      modeCard3Title: "3. Kalp & Ekstralar",
      modeCard3Sub: "Taçlar, peluşlar, harfler ve çikolatalar",
      previewPoint1: "<b>Müşteriler telefondan kendileri tasarlar</b>, uygulama indirmeye gerek yoktur",
      previewPoint2: "<b>Canlı fiyat hesaplama</b>: Her çiçek ve ekstra sizin belirlediğiniz fiyatla toplanır",
      previewPoint3: "<b>Hazır sipariş WhatsApp'ınıza gelir</b>: Buket görseli, çiçek listesi ve toplam tutar",
      lblLogoUpload: "Mağaza Logosu (PNG, JPG veya WebP)",
      lblLogoClick: "Mağaza logonuzu yüklemek için tıklayın",
      lblLogoSub: "Stüdyo üst kısmında ve sipariş fişinde görünür. Şu an yoksa daha sonra WhatsApp'tan gönderebilirsiniz.",
      lblTheme: "Stüdyo Renk Teması",
      lblThemeSub: "Mağazanıza en çok yakışan renk atmosferini seçin:",
      step2Kicker: "Baz Ambalaj ve Buket İşçilik Ücreti",
      step2Title: "Ambalaj ve buket stili ücretleri",
      step2Sub: "Her buket, belirlediğiniz Baz Ambalaj ücreti artı müşterinin seçtiği buket şeklinin işçilik ücreti ile başlar.",
      baseTitle: "Baz Hazırlık ve Ambalaj",
      baseDesc: "Her bukete bir kez eklenir (buket kağıdı, besin/su tüpü, not kartı ve hazırlık dahildir).",
      perBouquet: "/ buket",
      laborClassicTitle: "Klasik El Buketi",
      laborClassicDesc: "Katmanlı ön görünümlü buket sarımı (Krem, Kraft, Kakao veya Siyah kağıt).",
      laborDomeTitle: "Yuvarlak Kubbe (Dome)",
      laborDomeDesc: "Üstten görünümlü dolgun yuvarlak buket tasarımı.",
      laborHeartTitle: "Kalp Buket",
      laborHeartDesc: "Kalp formunda özel tasarım gül ve çiçek aranjmanı.",
      offered: "Aktif",
      notOffered: "Kapalı",
      laborFee: "işçilik",
      step3Kicker: "Görsel Çiçek ve Dal Fiyatları",
      step3Title: "Dal başına çiçek fiyatlarınız (hızlı kurulum için gruplandırıldı)",
      step3Sub: "Her çiçek ailesi için tek bir fiyat belirleyin veya belirli bir renk (Siyah Gül, Çikolatalı Çilek vb.) farklı fiyattaysa “Renkleri ayrı fiyatlandır” seçeneğini açın. Satmadığınız çiçekleri kapatın.",
      btnResetDefaults: "↺ Standart Fiyatlara Sıfırla",
      btnAdjustMinus: "−%10 Tüm Çiçekler",
      btnAdjustPlus: "+%10 Tüm Çiçekler",
      step4Kicker: "Peluş Oyuncaklar, Kurdeleler, Taçlar ve Yeni Ürünler",
      step4Title: "Aksesuarlar, süslemeler ve peluş oyuncaklar",
      step4Sub: "Stokta olmayan aksesuarları kapatın. Kurdele veya kuşak ücretsiz dahilse fiyatını 0.00 yapın.",
      customAssetBadge: "Mağazanıza Özel Eklemeler",
      customAssetTitle: "Kendi özel ürünlerinizi eklemek ister misiniz? (Yeni peluşlar, çiçekler, özel kağıtlar vb.)",
      customAssetDesc: "Mağazanızda özel peluş oyuncaklar (Ayıcık, Stitch vb.), farklı çiçekler (Orkide, Şakayık, Mavi Gül) veya kendi özel ambalaj kağıtlarınız ve kutularınız var mı? Eklemek istediklerinizi aşağıya yazın!",
      catChipToys: "+ Yeni Peluş Oyuncaklar",
      catChipFlowers: "+ Yeni Çiçekler / Renkler",
      catChipWraps: "+ Özel Ambalaj Kağıdı",
      catChipToppers: "+ Kurdele / Taç / Süs",
      catChipGifts: "+ Çikolata / Hediye Kutusu",
      btnAddCustomItem: "Yeni Oyuncak, Çiçek veya Özel Ürün Ekle",
      customItemHint: "Her satırda ürününüzün fotoğrafını da ekleyebilirsiniz.",
      lblCustomNotes: "Stüdyonuzda görmek istediğiniz özel çiçek, peluş veya fikirleri yazın",
      step5Kicker: "Koleksiyonunuz ve kurulum kapsamı",
      step5Title: "Başlangıç koleksiyonunuzu seçin",
      step5Sub: "Hazır tasarımları kullanın veya özel çalışma teklifi için referans yükleyin. Fotoğraflar isteğe bağlıdır ve ücretli çalışma onayı sayılmaz.",
      freeBouquetsBannerTitle: "Buket referanslarınız · isteğe bağlı",
      freeBouquetsBannerSub: "En fazla 4 referans paylaşın. Uygun hazır tasarımları belirler, yeni görseller ve özel buket çalışmaları için ayrıca teklif veririz.",
      extraBouquetsTitle: "Daha geniş bir koleksiyon mu istiyorsunuz?",
      extraBouquetsSub: "Kaç ek özel tasarım istediğinizi belirtin. Başlamadan önce görselleri, kapsamı ve fiyat teklifini onaylarız.",
      lblExtraBouquets: "Ekstra Özel Buket Sayısı",
      optExtra0: "Ek özel tasarım yok",
      optExtra1: "1 ek özel tasarım — teklif istiyorum",
      optExtra2: "2 ek özel tasarım — teklif istiyorum",
      optExtra3: "3 ek özel tasarım — teklif istiyorum",
      optExtra4: "4 ek özel tasarım — teklif istiyorum",
      choosePlanHeading: "Barındırma ve alan adı tercihiniz",
      planPopularBadge: "Standart plan",
      plan29Title: "Nebula Stüdyo Linki",
      plan35Title: "Özel alan adı teklifi isteyin",
      perMonth: "/ ay",
      plan29Bullet1: "Mağazanıza özel 3D Buket Tasarlayıcı (Klasik, Kubbe ve Kalp)",
      plan29Bullet2: "Ayda tek seferde en fazla 10 fiyat, metin veya iletişim bilgisi değişikliği",
      plan29Bullet3: "Bir kurulum incelemesi ve ayda en fazla 20 dakika mesaj üzerinden destek",
      plan29Bullet4: "Bugün 0$ ödeyin — abonelik sadece stüdyonuz yayına girince başlar",
      plan35Bullet1: "Aylık 29 USD stüdyo ve ayrıca fiyatlandırılan alan adı çalışması",
      plan35Bullet2: "Kayıt, bağlantı ve yenileme ücretleri yazılı olarak onaylanır",
      plan35Bullet3: "Mevcut sitenizle uyumluluğu taahhüt vermeden önce inceleriz",
      plan35Bullet4: "Bugün 0$ ödeyin — abonelik sadece stüdyonuz yayına girince başlar",
      lblDesiredDomain: "Tercih edilen alan adı · isteğe ve uygunluğa bağlı",
      submitCardTitle: "Çiçekçi stüdyonuzu kurmaya hazır mısınız?",
      submitCardDesc: "Kurulum bilgilerinizi inceleme için gönderin. Kapsamı, ek teklifleri ve yayın tarihini birlikte onaylarız. Bu form ödeme veya abonelik başlatmaz.",
      btnSubmitSetup: "Mağaza Kurulumumu Gönder",
      submitFinePrint: "Bilgilerinizi ve fotoğraflarınızı Firebase’e kaydeder, Nebula’ya e-posta ile özet gönderir.",
      calcTitle: "Fiyatlarınızla Canlı Örnek Hesaplama:",
      sample1Label: "12 Güllü Klasik Buket:",
      sample2Label: "24 Güllü Kubbe + Kurdele:",
      sample3Label: "Zambak ve Gül Karışımı:",
      samplePlanLabel: "Plan:",
      calcFinishBtn: "Tamamla ve Gönder ↓"
    }
  };

  /* -----------------------------------------------------------------------
     3. STATE & IMAGE COMPRESSION HELPERS
     ----------------------------------------------------------------------- */
  var flowerState = {}; // key -> { cents: number, enabled: boolean }
  var familyEnabledState = {}; // familyId -> boolean
  var extrasState = {}; // key -> { cents: number, enabled: boolean }
  var customAssetsRows = []; // [{ id, name, category, priceDollars, photoDataUrl, fileName }]

  function initCatalogState() {
    FLOWER_FAMILIES.forEach(function (fam) {
      familyEnabledState[fam.id] = true;
      fam.items.forEach(function (item) {
        flowerState[item.key] = {
          cents: item.cents,
          enabled: true
        };
      });
    });
    EXTRAS_LIST.forEach(function (ex) {
      extrasState[ex.key] = {
        cents: ex.defaultCents,
        enabled: true
      };
    });
  }

  function compressImageFile(file, maxDim, quality) {
    maxDim = maxDim || 280;
    quality = quality || 0.72;
    return new Promise(function (resolve) {
      if (!file || !file.type.startsWith("image/")) {
        resolve("");
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          var out = canvas.toDataURL("image/webp", quality);
          if (out.indexOf("data:image/webp") !== 0) {
            out = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(out);
        };
        img.onerror = function () {
          resolve("");
        };
        img.src = e.target.result;
      };
      reader.onerror = function () {
        resolve("");
      };
      reader.readAsDataURL(file);
    });
  }

  function shopCurrencyCode() {
    var el = document.getElementById("shopCurrency");
    return (el && el.value) || "USD";
  }

  function formatShopMoney(cents) {
    try {
      return new Intl.NumberFormat(currentLang === "es" ? "es" : "en", {
        style: "currency",
        currency: shopCurrencyCode()
      }).format((Number(cents) || 0) / 100);
    } catch (_) {
      return "$" + centsToDollarsStr(cents);
    }
  }

  function currencySymbol() {
    try {
      var parts = new Intl.NumberFormat("en", { style: "currency", currency: shopCurrencyCode(), currencyDisplay: "narrowSymbol" }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === "currency") return parts[i].value;
    } catch (_) {}
    return "$";
  }

  function refreshCurrencyPrefixes() {
    var sym = currencySymbol();
    document.querySelectorAll(".currency-prefix").forEach(function (el) {
      el.textContent = sym;
    });
  }

  function centsToDollarsStr(cents) {
    return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
  }

  function dollarsToCents(val) {
    var num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num * 100);
  }

  function slugify(str) {
    return (
      String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 42) || "your-flower-shop"
    );
  }

  /* -----------------------------------------------------------------------
     4. RENDER FLOWER FAMILIES, EXTRAS, CUSTOM ASSETS & 4 BOUQUET SLOTS
     ----------------------------------------------------------------------- */
  var TR_FAMILIES = {
    roses: { title: "Klasik ve Bahçe Gülleri", desc: "Kırmızı, Pembe, Beyaz, Krem, Fildişi, Karamel, Sarı, Turuncu, Mor ve Siyah güller.", unit: "/ dal" },
    spray_roses: { title: "Çardak Güller (Mini Gül)", desc: "Bukete hacim ve romantizm katan çok tomurcuklu çardak gül dalları.", unit: "/ dal" },
    lilies: { title: "Oryantal Zambak (Lilyum)", desc: "Gösterişli ve kokulu pembe/beyaz lilyum dalları.", unit: "/ dal" },
    sunflowers_daisies: { title: "Ayçiçeği ve Gerbera Papatyalar", desc: "Canlı çiçekler: Ayçiçeği, Gerbera ve Pembe Papatyalar.", unit: "/ dal" },
    hydrangea_ranunculus: { title: "Ortanca ve Şakayık / Ranunculus", desc: "Dolgun ortanca başları ve katmanlı ranunculus çiçekleri.", unit: "/ dal" },
    tulips_carnations: { title: "Laleler ve Karanfiller", desc: "6 farklı renkte bahar laleleri ve karanfiller.", unit: "/ dal" },
    greenery_fillers: { title: "Cipso (Bebek Nefesi), Okaliptüs ve Yeşillik", desc: "Temel buket tamamlayıcıları: Cipso, Okaliptüs, Alstroemeria, Statice, Şebboy ve Biberiye.", unit: "/ dal" },
    mums_sweets: { title: "Krizantem, Çikolatalı Çilek ve Çikolata", desc: "Krizantemler, Çikolatalı Çilek ve Ferrero/Çikolata dalları. Satmıyorsanız kapatabilirsiniz!", unit: "/ adet" }
  };
  var TR_EXTRAS = {
    butterfly: { title: "Altın 3D Kelebekler", desc: "Çiçeklerin üzerine yerleştirilen parlak altın kelebek seti." },
    crown: { title: "Altın Kraliçe Tacı", desc: "Buketin merkezine yerleştirilen taşlı altın taç." },
    bow: { title: "Büyük Saten Kurdele Fiyonk", desc: "Buket yakasında büyük çift halkalı saten fiyonk." },
    ribbon: { title: "Klasik Saten Bağlama Kurdelesi", desc: "Genellikle 0.00 (ambalaja dahil) veya ekstra ücret belirleyin." },
    sash: { title: "Yazılı Kuşak Kurdele", desc: "İyi ki Doğdun, Seni Seviyorum veya özel mesajlı kuşak." },
    floralInitial: { title: "Çiçeklerden Baş Harf (A–Z)", desc: "Kubbe buketin ortasında beyaz çiçeklerle yazılan özel harf." },
    filler: { title: "Ekstra Cipso (Bebek Nefesi) Bulutu", desc: "Yuvarlak veya kalp buketlerin etrafına eklenen ekstra cipso." },
    snoopy: { title: "Snoopy Peluş Oyuncak", desc: "Buketin içine yerleştirilen sevimli Snoopy peluş." },
    kitty: { title: "Hello Kitty Peluş Oyuncak", desc: "Çiçeklerin arasına yerleştirilen Hello Kitty peluş." },
    snoopy_topper: { title: "Mini Snoopy Süsü", desc: "Küçük dekoratif Snoopy figürü." },
    pumpkin: { title: "Kadife Sonbahar Balkabağı", desc: "Sonbahar buketleri için dekoratif kadife balkabağı." },
    spookyMask: { title: "Scream / Cadılar Bayramı Maskesi", desc: "Konsept buketler için orta maske aksesuarı." },
    spookyBow: { title: "Siyah Gotik Fiyonk", desc: "Siyah konsept buketler için uzun kuyruklu saten fiyonk." },
    ghostCount: { title: "Mini Hayalet Süsü", desc: "Cadılar Bayramı buketleri için mini hayalet figürü." },
    thistleCount: { title: "Mavi Boğa Dikeni (Eryngium)", desc: "Dokulu mavi eryngium dalı." }
  };
  function renderFlowerFamilies() {
    var container = document.getElementById("flowerFamiliesContainer");
    container.innerHTML = "";

    FLOWER_FAMILIES.forEach(function (fam) {
      var isFamOn = familyEnabledState[fam.id] !== false;
      var firstCents = flowerState[fam.items[0].key].cents;

      var card = document.createElement("article");
      card.className = "family-card" + (isFamOn ? "" : " is-disabled");
      card.dataset.familyId = fam.id;

      var subItemsHtml = fam.items
        .map(function (item) {
          var st = flowerState[item.key];
          return (
            '<div class="subflower-item ' +
            (st.enabled ? "" : "is-off") +
            '" data-subkey="' +
            item.key +
            '">' +
            '<div class="subflower-head">' +
            '<span class="subflower-name"><img src="' +
            item.img +
            '" alt="" loading="lazy"><span>' +
            (item.name[currentLang] || item.name.en) +
            "</span></span>" +
            '<input type="checkbox" class="subflower-toggle" data-key="' +
            item.key +
            '" ' +
            (st.enabled ? "checked" : "") +
            ' title="Toggle availability">' +
            "</div>" +
            '<div class="price-control">' +
            '<span class="currency-prefix">$</span>' +
            '<input type="number" class="price-input subflower-price-input" data-key="' +
            item.key +
            '" value="' +
            centsToDollarsStr(st.cents) +
            '" min="0" step="0.25">' +
            '<span class="unit-suffix">' +
            ((currentLang === "tr" && TR_FAMILIES[fam.id] && TR_FAMILIES[fam.id].unit) || fam.unit[currentLang] || fam.unit.en) +
            "</span>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      card.innerHTML =
        '<div class="family-main">' +
        '<div class="family-thumb"><img src="' +
        fam.thumb +
        '" alt="' +
        ((currentLang === "tr" && TR_FAMILIES[fam.id] && TR_FAMILIES[fam.id].title) || fam.title[currentLang] || fam.title.en) +
        '" loading="lazy"></div>' +
        "<div>" +
        '<div class="family-info-top">' +
        "<h3>" +
        ((currentLang === "tr" && TR_FAMILIES[fam.id] && TR_FAMILIES[fam.id].title) || fam.title[currentLang] || fam.title.en) +
        "</h3>" +
        '<label class="toggle-pill">' +
        '<input type="checkbox" class="family-toggle" data-family="' +
        fam.id +
        '" ' +
        (isFamOn ? "checked" : "") +
        ">" +
        '<span class="toggle-track"></span>' +
        '<span class="toggle-state-text">' +
        (isFamOn ? I18N[currentLang].offered : I18N[currentLang].notOffered) +
        "</span>" +
        "</label>" +
        "</div>" +
        '<p class="family-desc">' +
        ((currentLang === "tr" && TR_FAMILIES[fam.id] && TR_FAMILIES[fam.id].desc) || fam.desc[currentLang] || fam.desc.en) +
        "</p>" +
        '<div class="family-price-row">' +
        '<div class="price-control">' +
        '<button type="button" class="step-btn fam-step-btn" data-family="' +
        fam.id +
        '" data-delta="-50">−</button>' +
        '<span class="currency-prefix">$</span>' +
        '<input type="number" class="price-input family-price-input" data-family="' +
        fam.id +
        '" value="' +
        centsToDollarsStr(firstCents) +
        '" min="0" step="0.25">' +
        '<span class="unit-suffix">' +
        ((currentLang === "tr" && TR_FAMILIES[fam.id] && TR_FAMILIES[fam.id].unit) || fam.unit[currentLang] || fam.unit.en) +
        "</span>" +
        '<button type="button" class="step-btn fam-step-btn" data-family="' +
        fam.id +
        '" data-delta="50">+</button>' +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        (fam.items.length > 1
          ? '<details class="color-overrides"><summary><span>' +
            fam.items.length +
            (currentLang === "es" ? " variedades incluidas" : currentLang === "tr" ? " çeşit dahil" : " varieties included") +
            '</span></summary><div class="subflower-grid">' +
            subItemsHtml +
            "</div></details>"
          : "");

      container.appendChild(card);
    });

    bindFlowerFamilyEvents();
  }

  function bindFlowerFamilyEvents() {
    var container = document.getElementById("flowerFamiliesContainer");

    // Family master price input updates all items in that family
    container.querySelectorAll(".family-price-input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var famId = inp.dataset.family;
        var cents = dollarsToCents(inp.value);
        var fam = FLOWER_FAMILIES.find(function (f) {
          return f.id === famId;
        });
        if (!fam) return;
        fam.items.forEach(function (item) {
          flowerState[item.key].cents = cents;
          var subInp = container.querySelector('.subflower-price-input[data-key="' + item.key + '"]');
          if (subInp) subInp.value = centsToDollarsStr(cents);
        });
        updateLiveSampleCalculator();
      });
    });

    // Family +/- buttons
    container.querySelectorAll(".fam-step-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var famId = btn.dataset.family;
        var delta = parseInt(btn.dataset.delta, 10) || 0;
        var inp = container.querySelector('.family-price-input[data-family="' + famId + '"]');
        if (!inp) return;
        var nextCents = Math.max(0, dollarsToCents(inp.value) + delta);
        inp.value = centsToDollarsStr(nextCents);
        inp.dispatchEvent(new Event("input"));
      });
    });

    // Family on/off toggle
    container.querySelectorAll(".family-toggle").forEach(function (chk) {
      chk.addEventListener("change", function () {
        var famId = chk.dataset.family;
        var on = chk.checked;
        familyEnabledState[famId] = on;
        var card = chk.closest(".family-card");
        if (card) card.classList.toggle("is-disabled", !on);
        var txt = chk.parentElement.querySelector(".toggle-state-text");
        if (txt) txt.textContent = on ? I18N[currentLang].offered : I18N[currentLang].notOffered;

        var fam = FLOWER_FAMILIES.find(function (f) {
          return f.id === famId;
        });
        if (fam) {
          fam.items.forEach(function (item) {
            flowerState[item.key].enabled = on;
            var subChk = container.querySelector('.subflower-toggle[data-key="' + item.key + '"]');
            if (subChk) {
              subChk.checked = on;
              var subBox = subChk.closest(".subflower-item");
              if (subBox) subBox.classList.toggle("is-off", !on);
            }
          });
        }
      });
    });

    // Individual color/variety price override
    container.querySelectorAll(".subflower-price-input").forEach(function (subInp) {
      subInp.addEventListener("input", function () {
        var key = subInp.dataset.key;
        flowerState[key].cents = dollarsToCents(subInp.value);
        updateLiveSampleCalculator();
      });
    });

    // Individual color/variety toggle
    container.querySelectorAll(".subflower-toggle").forEach(function (subChk) {
      subChk.addEventListener("change", function () {
        var key = subChk.dataset.key;
        flowerState[key].enabled = subChk.checked;
        var subBox = subChk.closest(".subflower-item");
        if (subBox) subBox.classList.toggle("is-off", !subChk.checked);
      });
    });
  }

  function renderExtrasGrid() {
    var container = document.getElementById("extrasContainer");
    container.innerHTML = "";

    EXTRAS_LIST.forEach(function (ex) {
      var st = extrasState[ex.key];
      var card = document.createElement("div");
      card.className = "extra-card" + (st.enabled ? "" : " is-disabled");
      card.innerHTML =
        '<div class="extra-top">' +
        '<div class="extra-thumb"><img src="' +
        ex.img +
        '" alt="' +
        ((currentLang === "tr" && TR_EXTRAS[ex.key] && TR_EXTRAS[ex.key].title) || ex.title[currentLang] || ex.title.en) +
        '" loading="lazy"></div>' +
        '<div class="extra-meta">' +
        "<h4>" +
        ((currentLang === "tr" && TR_EXTRAS[ex.key] && TR_EXTRAS[ex.key].title) || ex.title[currentLang] || ex.title.en) +
        "</h4>" +
        "<p>" +
        ((currentLang === "tr" && TR_EXTRAS[ex.key] && TR_EXTRAS[ex.key].desc) || ex.desc[currentLang] || ex.desc.en) +
        "</p>" +
        "</div>" +
        "</div>" +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<label class="toggle-pill">' +
        '<input type="checkbox" class="extra-toggle" data-key="' +
        ex.key +
        '" ' +
        (st.enabled ? "checked" : "") +
        ">" +
        '<span class="toggle-track"></span>' +
        '<span class="toggle-state-text">' +
        (st.enabled ? I18N[currentLang].offered : I18N[currentLang].notOffered) +
        "</span>" +
        "</label>" +
        '<div class="price-control" style="max-width:145px">' +
        '<button type="button" class="step-btn extra-step-btn" data-key="' +
        ex.key +
        '" data-delta="-100">−</button>' +
        '<span class="currency-prefix">$</span>' +
        '<input type="number" class="price-input extra-price-input" data-key="' +
        ex.key +
        '" value="' +
        centsToDollarsStr(st.cents) +
        '" min="0" step="0.50">' +
        '<button type="button" class="step-btn extra-step-btn" data-key="' +
        ex.key +
        '" data-delta="100">+</button>' +
        "</div>" +
        "</div>";

      container.appendChild(card);
    });

    container.querySelectorAll(".extra-price-input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var key = inp.dataset.key;
        extrasState[key].cents = dollarsToCents(inp.value);
        updateLiveSampleCalculator();
      });
    });

    container.querySelectorAll(".extra-step-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.dataset.key;
        var delta = parseInt(btn.dataset.delta, 10) || 0;
        var inp = container.querySelector('.extra-price-input[data-key="' + key + '"]');
        if (!inp) return;
        var next = Math.max(0, dollarsToCents(inp.value) + delta);
        inp.value = centsToDollarsStr(next);
        inp.dispatchEvent(new Event("input"));
      });
    });

    container.querySelectorAll(".extra-toggle").forEach(function (chk) {
      chk.addEventListener("change", function () {
        var key = chk.dataset.key;
        var on = chk.checked;
        extrasState[key].enabled = on;
        var card = chk.closest(".extra-card");
        if (card) card.classList.toggle("is-disabled", !on);
        var txt = chk.parentElement.querySelector(".toggle-state-text");
        if (txt) txt.textContent = on ? I18N[currentLang].offered : I18N[currentLang].notOffered;
      });
    });
  }

  /* -----------------------------------------------------------------------
     5. CUSTOM ASSET REQUEST ROWS ("Add new toys, flowers, wraps...")
     ----------------------------------------------------------------------- */
  function addCustomAssetRow(defaultCategory, defaultName, defaultPrice) {
    var rowId = "ca_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    var itemObj = {
      id: rowId,
      category: defaultCategory || "New Plush Toys",
      name: defaultName || "",
      priceDollars: defaultPrice || "20.00",
      photoDataUrl: "",
      fileName: ""
    };
    customAssetsRows.push(itemObj);
    renderCustomAssetRows();
  }

  function renderCustomAssetRows() {
    var list = document.getElementById("customItemsList");
    list.innerHTML = "";

    customAssetsRows.forEach(function (row) {
      var div = document.createElement("div");
      div.className = "custom-item-row";
      div.innerHTML =
        '<input type="text" class="text-input ca-name" placeholder="' +
        (currentLang === "es"
          ? "Nombre (ej. Oso de Graduación, Orquídea, Papel Coreano Rosa)"
          : "Item Name (e.g. Graduation Teddy Bear, Blue Orchid, Pink Wrap)") +
        '" value="' +
        row.name.replace(/"/g, "&quot;") +
        '">' +
        '<select class="select-input ca-cat">' +
        '<option value="New Plush Toys"' +
        (row.category === "New Plush Toys" ? " selected" : "") +
        ">🧸 " +
        (currentLang === "es" ? "Nuevo Peluche / Juguete" : "New Plush Toy") +
        "</option>" +
        '<option value="New Flowers / Colors"' +
        (row.category === "New Flowers / Colors" ? " selected" : "") +
        ">🌸 " +
        (currentLang === "es" ? "Nueva Flor / Color" : "New Flower / Color") +
        "</option>" +
        '<option value="Custom Wrapping Paper"' +
        (row.category === "Custom Wrapping Paper" ? " selected" : "") +
        ">🎁 " +
        (currentLang === "es" ? "Papel de Envoltura" : "Wrapping Paper") +
        "</option>" +
        '<option value="Custom Ribbons / Toppers"' +
        (row.category === "Custom Ribbons / Toppers" ? " selected" : "") +
        ">🎀 " +
        (currentLang === "es" ? "Cinta / Corona / Topper" : "Ribbon / Topper") +
        "</option>" +
        '<option value="Chocolates / Gift Boxes"' +
        (row.category === "Chocolates / Gift Boxes" ? " selected" : "") +
        ">🍫 " +
        (currentLang === "es" ? "Chocolate / Caja Regalo" : "Chocolate / Gift Box") +
        "</option>" +
        "</select>" +
        '<div class="price-control">' +
        '<span class="currency-prefix">$</span>' +
        '<input type="number" class="price-input ca-price" value="' +
        row.priceDollars +
        '" min="0" step="0.50">' +
        "</div>" +
        '<label class="custom-photo-label">' +
        (row.photoDataUrl
          ? '<img src="' + row.photoDataUrl + '" alt=""> <span>' + (row.fileName || "Photo ✓") + "</span>"
          : "📷 <span>" + (currentLang === "es" ? "Subir foto" : "Add photo") + "</span>") +
        '<input type="file" accept="image/*" class="ca-file" hidden>' +
        "</label>" +
        '<button type="button" class="remove-row-btn" title="Remove">✕</button>';

      div.querySelector(".ca-name").addEventListener("input", function (e) {
        row.name = e.target.value;
      });
      div.querySelector(".ca-cat").addEventListener("change", function (e) {
        row.category = e.target.value;
      });
      div.querySelector(".ca-price").addEventListener("input", function (e) {
        row.priceDollars = e.target.value;
      });
      div.querySelector(".ca-file").addEventListener("change", async function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        row.fileName = f.name.slice(0, 14);
        row.photoDataUrl = await compressImageFile(f, 600, 0.8);
        renderCustomAssetRows();
      });
      div.querySelector(".remove-row-btn").addEventListener("click", function () {
        customAssetsRows = customAssetsRows.filter(function (r) {
          return r.id !== row.id;
        });
        renderCustomAssetRows();
      });

      list.appendChild(div);
    });
  }

  /* -----------------------------------------------------------------------
     6. OPTIONAL BOUQUET REFERENCE SLOTS
     ----------------------------------------------------------------------- */
  function renderBouquetSlots() {
    var container = document.getElementById("bouquetSlotsContainer");
    container.innerHTML = "";

    DEFAULT_SIGNATURE_BOUQUETS.forEach(function (b, idx) {
      var slotEl = document.createElement("div");
      slotEl.className = "bouquet-slot";
      var imgSrc = b.customPhotoDataUrl || b.placeholderImg;
      slotEl.innerHTML =
        '<div class="slot-header">' +
        "<span>" +
        (currentLang === "es" ? "Referencia #" : currentLang === "tr" ? "Referans #" : "Reference #") +
        b.slot +
        "</span>" +
        "<span>✓ " +
        (currentLang === "es" ? "Incluido" : "Included") +
        "</span>" +
        "</div>" +
        '<label class="slot-photo-box">' +
        '<img src="' +
        imgSrc +
        '" alt="Bouquet slot ' +
        b.slot +
        '">' +
        '<span class="slot-photo-overlay">📷 ' +
        (b.customPhotoDataUrl
          ? currentLang === "es"
            ? "Foto subida ✓ (Cambiar)"
            : "Custom photo ✓ (Change)"
          : currentLang === "es"
          ? "Subir foto de tu ramo #" + b.slot
          : "Upload your bouquet #" + b.slot) +
        "</span>" +
        '<input type="file" accept="image/*" class="slot-file-input" data-idx="' +
        idx +
        '" hidden>' +
        "</label>" +
        '<input type="text" class="text-input slot-name-input" data-idx="' +
        idx +
        '" value="' +
        b.defaultName.replace(/"/g, "&quot;") +
        '" placeholder="' +
        (currentLang === "es" ? "Nombre del ramo" : "Bouquet name") +
        '" style="padding:8px 10px;font-size:13.5px">' +
        '<div class="price-control">' +
        '<span class="currency-prefix">$</span>' +
        '<input type="number" class="price-input slot-price-input" data-idx="' +
        idx +
        '" value="' +
        b.defaultPrice +
        '" min="0" step="1">' +
        '<span class="unit-suffix">' +
        (currentLang === "es" ? "precio aprox." : "target price") +
        "</span>" +
        "</div>";

      slotEl.querySelector(".slot-name-input").addEventListener("input", function (e) {
        b.defaultName = e.target.value;
      });
      slotEl.querySelector(".slot-price-input").addEventListener("input", function (e) {
        b.defaultPrice = e.target.value;
      });
      slotEl.querySelector(".slot-file-input").addEventListener("change", async function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        b.customPhotoDataUrl = await compressImageFile(f, 600, 0.8);
        renderBouquetSlots();
      });

      container.appendChild(slotEl);
    });
  }

  /* -----------------------------------------------------------------------
     7. LIVE SAMPLE BOUQUET CALCULATOR & SLUG PREVIEW
     ----------------------------------------------------------------------- */
  function updateLiveSampleCalculator() {
    var baseCents = dollarsToCents(document.getElementById("basePrice").value);
    var classicCents = dollarsToCents(document.getElementById("laborClassic").value);
    var domeCents = dollarsToCents(document.getElementById("laborDome").value);

    var roseRed = flowerState.rose_red ? flowerState.rose_red.cents : 400;
    var rosePink = flowerState.rose_pink ? flowerState.rose_pink.cents : 400;
    var breath = flowerState.babys_breath ? flowerState.babys_breath.cents : 200;
    var lily = flowerState.lily ? flowerState.lily.cents : 500;
    var euc = flowerState.eucalyptus ? flowerState.eucalyptus.cents : 200;
    var bow = extrasState.bow ? extrasState.bow.cents : 400;
    var bfly = extrasState.butterfly ? extrasState.butterfly.cents : 300;

    // Sample 1: 12 Red Roses Classic + 3 Baby's Breath
    var s1 = baseCents + classicCents + 12 * roseRed + 3 * breath;
    // Sample 2: 24 Pink Roses Dome + Bow + 2 Butterflies
    var s2 = baseCents + domeCents + 24 * rosePink + bow + 2 * bfly;
    // Sample 3: 3 Lilies + 12 Pink Roses + 3 Eucalyptus
    var s3 = baseCents + domeCents + 3 * lily + 12 * rosePink + 3 * euc;

    document.getElementById("samplePrice1").textContent = formatShopMoney(s1);
    document.getElementById("samplePrice2").textContent = formatShopMoney(s2);
    document.getElementById("samplePrice3").textContent = formatShopMoney(s3);
    refreshCurrencyPrefixes();

    var extraCount = parseInt(document.getElementById("extraBouquetsSelect").value, 10) || 0;


    var monthlyPrice = 29;
    document.getElementById("samplePlanPrice").textContent =
      "$" + monthlyPrice + " USD / " + (currentLang === "tr" ? "ay" : currentLang === "es" ? "mes" : "month") + (selectedPlan === "custom_domain" || extraCount > 0 ? (currentLang === "es" ? " + presupuesto aparte" : currentLang === "tr" ? " + ayrı teklif" : " + separate quote") : "");
  }

  function updateSlugPreview() {
    var rawName = document.getElementById("shopName").value.trim();
    var slug = slugify(rawName);
    var domainVal = document.getElementById("desiredDomain").value.trim();
    var subdomainUrl = "nebulastudio.site/" + slug;
    var customUrl = domainVal || "www." + slug.replace(/-/g, "") + ".com";

    document.getElementById("plan29UrlExample").textContent = subdomainUrl;
    document.getElementById("plan35UrlExample").textContent = customUrl;
    document.getElementById("liveSlugPreview").textContent =
      selectedPlan === "custom_domain" ? customUrl : subdomainUrl;
  }

  /* -----------------------------------------------------------------------
     8. BUILD VALID window.NEBULA_SHOP (shop-config.js) & PAYLOAD
     ----------------------------------------------------------------------- */
  function buildOnboardingPayload() {
    var shopName = document.getElementById("shopName").value.trim() || "My Flower Shop";
    var ownerName = document.getElementById("ownerName").value.trim() || shopName;
    var channel = document.getElementById("orderChannel").value;
    var rawPhone = document.getElementById("shopPhone").value.trim();
    var digitsOnly = rawPhone.replace(/\D+/g, "");
    // Submission requires an explicit international number; never substitute Nebula’s number.

    var email = document.getElementById("shopEmail").value.trim();
    var instagram = document.getElementById("shopInstagram").value.trim();
    var city = document.getElementById("shopCity").value.trim();
    var country = document.getElementById("shopCountry").value || "";
    var currency = document.getElementById("shopCurrency").value || "USD";
    var builderLanguages = selectedBuilderLanguages();
    var fulfillment = (document.getElementById("shopFulfillment") && document.getElementById("shopFulfillment").value) || "both";
    var customerPayment = (document.getElementById("shopCustomerPayment") && document.getElementById("shopCustomerPayment").value) || "confirm_first";
    var slug = slugify(shopName);
    var desiredDomain = document.getElementById("desiredDomain").value.trim();
    var siteUrl =
      selectedPlan === "custom_domain"
        ? desiredDomain || "www." + slug.replace(/-/g, "") + ".com"
        : "nebulastudio.site/" + slug;

    var baseCents = dollarsToCents(document.getElementById("basePrice").value);
    var laborCents = {
      classic: dollarsToCents(document.getElementById("laborClassic").value),
      dome: dollarsToCents(document.getElementById("laborDome").value),
      heart: dollarsToCents(document.getElementById("laborHeart").value)
    };

    var flowerPrices = {};
    var disabledFlowers = [];
    Object.keys(flowerState).forEach(function (k) {
      flowerPrices[k] = flowerState[k].cents;
      if (!flowerState[k].enabled) disabledFlowers.push(k);
    });

    var extrasCents = {};
    var disabledExtras = [];
    Object.keys(extrasState).forEach(function (k) {
      extrasCents[k] = extrasState[k].cents;
      if (!extrasState[k].enabled) disabledExtras.push(k);
    });

    var enabledModes = ["classic", "dome", "heart"].filter(function (m) {
      var el = document.getElementById("modeToggle-" + m);
      return !el || el.checked;
    });

    var selectedAssetCategories = [];
    document.querySelectorAll('.cat-chip[aria-pressed="true"]').forEach(function (chip) {
      selectedAssetCategories.push(chip.dataset.cat);
    });

    var customAssetsNotes = document.getElementById("customAssetsNotes").value.trim();
    var extraBouquetsCount = parseInt(document.getElementById("extraBouquetsSelect").value, 10) || 0;


    // Construct 100% check-shop.cjs compatible window.NEBULA_SHOP object
    var nebulaShopConfig = {
      name: shopName,
      id: slug,
      byline: ownerName.toLowerCase().startsWith("by ") ? ownerName : "By " + ownerName,
      studio: {
        name: shopName,
        site: siteUrl,
        phone: rawPhone || "+" + digitsOnly,
        instagram: instagram ? (instagram.startsWith("@") ? instagram : "@" + instagram) : "",
        place: [city, country && country !== "Other" ? country : ""].filter(Boolean).join(", "),
        year: "2026"
      },
      currency: currency,
      demo: true,
      requestChannel: channel,
      recipient: "+" + digitsOnly,
      whatsapp: channel === "whatsapp" ? digitsOnly : "",
      email: email,
      pricesApproved: false,
      selectionComplete: false,
      fulfillmentApproved: false,
      baseCents: baseCents,
      laborCents: laborCents,
      extrasCents: extrasCents,
      flowerPrices: flowerPrices,
      enabledModes: enabledModes,
      disabledFlowers: disabledFlowers,
      disabledExtras: disabledExtras,
      theme: {
        background: selectedTheme.background,
        surface: selectedTheme.surface,
        soft: selectedTheme.soft,
        ink: selectedTheme.ink,
        primary: selectedTheme.primary,
        border: selectedTheme.border
      }
    };

    var shopConfigJsText =
      "/* Auto-generated by Nebula Florist Studio Setup for " +
      shopName.replace(/\*\//g, "") +
      " */\nwindow.NEBULA_SHOP = " +
      JSON.stringify(nebulaShopConfig, null, 2) +
      ";\n";

    return {
      submittedAt: new Date().toISOString(),
      slug: slug,
      shopName: shopName,
      ownerName: ownerName,
      channel: channel,
      phone: rawPhone,
      email: email,
      instagram: instagram,
      city: city,
      country: country,
      currency: currency,
      builderLanguages: builderLanguages,
      fulfillment: fulfillment,
      customerPayment: customerPayment,
      plan: {
        type: selectedPlan,
        monthlyUsd: 29,
        offerVersion: "2026-10-24-bounded",
        customDomainQuoteRequested: selectedPlan === "custom_domain",
        monthlyEditLimit: 10,
        monthlyAsyncSupportMinutes: 20,
        setupReviewRounds: 1,
        siteUrl: siteUrl,
        desiredDomain: desiredDomain,
        includedFreeBouquets: 0,
        customWorkRequiresQuote: true,
        extraCustomBouquets: extraBouquetsCount,
        oneTimeExtraBouquetsUsd: null
      },
      customAssetRequests: {
        wantsNewAssets: selectedAssetCategories.length > 0 || customAssetsRows.length > 0 || Boolean(customAssetsNotes),
        categories: selectedAssetCategories,
        items: customAssetsRows,
        notes: customAssetsNotes
      },
      signatureBouquets: DEFAULT_SIGNATURE_BOUQUETS.map(function (b) {
        return {
          slot: b.slot,
          name: b.defaultName,
          targetPrice: b.defaultPrice,
          photoDataUrl: b.customPhotoDataUrl || ""
        };
      }),
      logoDataUrl: logoDataUrl,
      nebulaShopConfig: nebulaShopConfig,
      shopConfigJsText: shopConfigJsText
    };
  }

  /* -----------------------------------------------------------------------
     9. FIREBASE REALTIME DATABASE + FORMSPREE SUBMISSION
     ----------------------------------------------------------------------- */
  function randomId22() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    var out = "";
    var bytes = new Uint8Array(22);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      for (var i = 0; i < 22; i++) out += chars[bytes[i] % 64];
    } else {
      for (var j = 0; j < 22; j++) out += chars[Math.floor(Math.random() * 64)];
    }
    return out;
  }

  function toBase64Url(str) {
    var utf8Bytes = new TextEncoder().encode(str);
    var binary = "";
    for (var i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(b64u) {
    var b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // Personal setup data never belongs in public bouquet-preview records.
  async function saveToFirebaseRealtime(payload) {
    var id = randomId22(), now = Date.now();
    var photoNames = [];
    if (payload.logoDataUrl) photoNames.push("Shop logo");
    payload.signatureBouquets.forEach(function (b, i) { if (b.photoDataUrl) photoNames.push("Bouquet #" + (i + 1)); });
    payload.customAssetRequests.items.forEach(function (item, i) { if (item.photoDataUrl) photoNames.push("Custom item #" + (i + 1)); });
    var code = toBase64Url(JSON.stringify(payload));
    var ok = false;
    if (code.length <= 1500000) {
      var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 15000);
      try {
        var response = await fetch(FIREBASE_DB_URL + "/nebula/setups/" + id + ".json?print=silent", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id, code: code, createdAt: now, expiresAt: now + 7776000000 }),
          signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer"
        });
        ok = response.ok;
      } catch (_) {} finally { clearTimeout(timer); }
    }
    return { ok: ok, designId: ok ? id : "", inspectUrl: ok ? "https://nebulastudio.site/admin.html?setup=" + id : "", photosAttempted: photoNames.length, photoFailures: ok ? [] : photoNames };
  }

  async function sendToFormspreeEmail(payload, fbResult) {
    var fd = new FormData();
    var planLabel =
      payload.plan.type === "custom_domain"
        ? "$29 USD/month + separate custom-domain quote (" + payload.plan.siteUrl + ")"
        : "$29 USD/month — Nebula-hosted studio (" + payload.plan.siteUrl + ")";

    fd.append("_subject", "🌸 New Florist Studio Setup: " + payload.shopName + " (" + planLabel + ")");
    fd.append("shop_name", payload.shopName);
    fd.append("owner_name", payload.ownerName);
    fd.append("order_channel", payload.channel.toUpperCase() + ": " + payload.phone);
    fd.append("email", payload.email);
    fd.append("instagram", payload.instagram || "Not provided");
    fd.append("city", payload.city);
    fd.append("country", payload.country || "");
    fd.append("builder_languages", (payload.builderLanguages || []).join(", "));
    fd.append("currency", payload.currency);
    fd.append("selected_plan", planLabel);
    fd.append("offer_scope", "One setup review round; one monthly batch of up to 10 price/text/contact edits; up to 20 minutes asynchronous support monthly. No rollover. New artwork, custom bouquets, seasonal work and domains quoted separately. No payment authorized by this form.");
    fd.append(
      "extra_custom_bouquets",
      payload.plan.extraCustomBouquets +
        " additional designs requested; custom work and seasonal changes require a separate agreed quote"
    );

    if (fbResult && fbResult.designId) {
      fd.append("firebase_record_id", fbResult.designId);
      fd.append("inspect_submission_link", fbResult.inspectUrl);
    }

    // Custom assets summary
    var ca = payload.customAssetRequests;
    var caLines = [];
    if (ca.categories.length) caLines.push("Categories: " + ca.categories.join(", "));
    if (ca.items.length) {
      ca.items.forEach(function (it, i) {
        caLines.push(
          i + 1 + ". [" + it.category + "] " + (it.name || "Unnamed") + " — $" + it.priceDollars
        );
      });
    }
    if (ca.notes) caLines.push("Notes: " + ca.notes);
    fd.append(
      "new_custom_assets_requested",
      caLines.length ? caLines.join("\n") : "None requested (using standard library)"
    );

    // 4 Signature Bouquets summary
    var sigLines = payload.signatureBouquets.map(function (b) {
      return (
        "Bouquet #" +
        b.slot +
        ": " +
        b.name +
        " ($" +
        b.targetPrice +
        ")" +
        (b.photoDataUrl ? " [Custom Photo Uploaded]" : " [Standard Template]")
      );
    });
    fd.append("bouquet_references_for_review", sigLines.join("\n"));

    // Disabled items summary
    fd.append(
      "disabled_flowers",
      payload.nebulaShopConfig.disabledFlowers.join(", ") || "None (all enabled)"
    );
    fd.append(
      "disabled_extras",
      payload.nebulaShopConfig.disabledExtras.join(", ") || "None (all enabled)"
    );

    // Ready-to-use shop-config.js
    fd.append("shop_config_js", payload.shopConfigJsText);

    var mailController = new AbortController(), mailTimer = setTimeout(function () { mailController.abort(); }, 15000);
    try {
      var res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: fd,
        signal: mailController.signal,
        headers: { Accept: "application/json" }
      });
      var json = await res.json().catch(function () {
        return {};
      });
      var ok =
        res.ok &&
        (json.ok === true || json.success === true || json.success === "true") &&
        !json.error &&
        !(Array.isArray(json.errors) && json.errors.length);
      return { ok: ok };
    } catch (_) {
      return { ok: false };
    } finally { clearTimeout(mailTimer); }
  }

  /* -----------------------------------------------------------------------
     10. LEGACY OWNER LINKS (?inspect=<designId>)
     Old owner links used to open the client form. Submissions are now reviewed
     in the private Admin dashboard (photos, prices, downloads), so redirect there.
     ----------------------------------------------------------------------- */
  function checkOwnerInspectMode() {
    var params = new URLSearchParams(window.location.search);

    var inspectId = params.get("inspect");
    if (inspectId && /^[A-Za-z0-9_-]{22}$/.test(inspectId)) {
      window.location.replace("admin.html?setup=" + encodeURIComponent(inspectId));
    }
  }
  function downloadFile(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 300);
  }

  /* -----------------------------------------------------------------------
     11. LANGUAGE SWITCHING & UI WIRING
     ----------------------------------------------------------------------- */
  function setLanguage(lang) {
    currentLang = lang === "es" ? "es" : lang === "tr" ? "tr" : "en";
    document.documentElement.lang = currentLang;

    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.lang === currentLang);
    });

    var dict = I18N[currentLang] || I18N.en || {};
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.dataset.i18nHtml;
      if (dict[key]) el.innerHTML = dict[key];
    });

    renderFlowerFamilies();
    renderExtrasGrid();
    renderCustomAssetRows();
    renderBouquetSlots();
    updateLiveSampleCalculator();
  }

  function selectPlanCard(planKey) {
    selectedPlan = planKey === "custom_domain" ? "custom_domain" : "subdomain";
    document.querySelectorAll(".plan-choice-card").forEach(function (card) {
      var isSel = card.dataset.planChoice === selectedPlan;
      card.classList.toggle("selected", isSel);
      card.setAttribute("aria-checked", isSel ? "true" : "false");
    });
    updateSlugPreview();
    updateLiveSampleCalculator();
  }

  function initEvents() {
    // Language buttons
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLanguage(btn.dataset.lang);
      });
    });

    // Shop name & domain live URL preview
    document.getElementById("shopName").addEventListener("input", updateSlugPreview);
    document.getElementById("desiredDomain").addEventListener("input", updateSlugPreview);

    // Logo upload
    document.getElementById("logoInput").addEventListener("change", async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      document.getElementById("logoFileName").textContent = file.name;
      logoDataUrl = await compressImageFile(file, 520, 0.85);
      if (logoDataUrl) {
        document.getElementById("logoPreviewBox").innerHTML = '<img src="' + logoDataUrl + '" alt="Shop Logo">';
      }
    });

    // Theme picker
    document.querySelectorAll(".theme-swatch-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".theme-swatch-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        selectedTheme.id = btn.dataset.theme;
        selectedTheme.primary = btn.dataset.primary;
        selectedTheme.soft = btn.dataset.soft;
      });
    });

    // Step 2 Base & Labor steppers and toggles
    document.querySelectorAll("#step-labor .step-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.dataset.target;
        var delta = parseFloat(btn.dataset.step) || 0;
        var inp = document.getElementById(targetId);
        if (!inp) return;
        var next = Math.max(0, (parseFloat(inp.value) || 0) + delta);
        inp.value = next.toFixed(2);
        updateLiveSampleCalculator();
      });
    });

    ["basePrice", "laborClassic", "laborDome", "laborHeart"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", updateLiveSampleCalculator);
    });

    ["classic", "dome", "heart"].forEach(function (mode) {
      var chk = document.getElementById("modeToggle-" + mode);
      var card = document.getElementById("modeCard-" + mode);
      chk.addEventListener("change", function () {
        card.classList.toggle("is-disabled", !chk.checked);
      });
    });

    // Step 3 bulk stem price buttons
    document.getElementById("btnResetDefaults").addEventListener("click", function () {
      initCatalogState();
      renderFlowerFamilies();
      updateLiveSampleCalculator();
    });

    function scaleAllFlowers(factor) {
      Object.keys(flowerState).forEach(function (k) {
        var next = Math.max(0, Math.round((flowerState[k].cents * factor) / 25) * 25);
        flowerState[k].cents = next;
      });
      renderFlowerFamilies();
      updateLiveSampleCalculator();
    }

    document.getElementById("btnAdjustMinus").addEventListener("click", function () {
      scaleAllFlowers(0.9);
    });
    document.getElementById("btnAdjustPlus").addEventListener("click", function () {
      scaleAllFlowers(1.1);
    });

    // Step 4 Custom Asset Category Chips
    document.querySelectorAll(".cat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", pressed ? "false" : "true");
        if (!pressed) {
          var cat = chip.dataset.cat;
          var hasCat = customAssetsRows.some(function (r) {
            return r.category === cat;
          });
          if (!hasCat) addCustomAssetRow(cat, "", "15.00");
        }
      });
    });

    document.getElementById("addCustomItemBtn").addEventListener("click", function () {
      addCustomAssetRow("New Plush Toys", "", "20.00");
    });

    // Step 5 Extra Bouquets & Plan Cards
    document.getElementById("extraBouquetsSelect").addEventListener("change", updateLiveSampleCalculator);

    document.querySelectorAll(".plan-choice-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.tagName === "INPUT") return;
        selectPlanCard(card.dataset.planChoice);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectPlanCard(card.dataset.planChoice);
        }
      });
    });

    // Form Submission
    var form = document.getElementById("onboardingForm");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var errBox = document.getElementById("submitErrorBox");
      errBox.style.display = "none";

      var shopName = document.getElementById("shopName").value.trim();
      var ownerName = document.getElementById("ownerName").value.trim();
      var shopPhone = document.getElementById("shopPhone").value.trim();
      var shopEmail = document.getElementById("shopEmail").value.trim();
      var shopCity = document.getElementById("shopCity").value.trim();

      if (!shopName || !ownerName || !shopPhone || !shopEmail || !shopCity) {
        errBox.textContent =
          currentLang === "es"
            ? "Por favor completa el nombre de tu florería, tu nombre, WhatsApp/teléfono, correo y ciudad en el Paso 1."
            : "Please fill in your Shop Name, Your Name, WhatsApp/Phone, Email, and City in Step 1.";
        errBox.style.display = "block";
        document.getElementById("step-identity").scrollIntoView({ behavior: "smooth" });
        return;
      }

      var normalizedPhone = shopPhone.replace(/[\s().-]/g, "");
      if (!/^\+[1-9][0-9]{7,14}$/.test(normalizedPhone)) {
        errBox.textContent = currentLang === "es" ? "Incluye + y el código de país en tu teléfono (ej. +56…)." : currentLang === "tr" ? "Telefon numaranıza + ve ülke kodunu ekleyin (ör. +90…)." : "Include + and your country code in the phone number (for example, +1…).";
        errBox.style.display = "block";
        document.getElementById("shopPhone").focus();
        return;
      }
      if (!form.reportValidity()) return;
      var submitBtn = document.getElementById("submitSetupBtn");
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        "<span>" +
        (currentLang === "es" ? "Guardando y enviando configuración…" : "Saving & sending your studio setup…") +
        "</span>";

      var payload = buildOnboardingPayload();

      var results = await Promise.all([
        saveToFirebaseRealtime(payload),
        (async function () {
          return null;
        })()
      ]);
      var fbRes = results[0];
      var emailRes = await sendToFormspreeEmail(payload, fbRes);

      var fbOk = !!(fbRes && fbRes.ok);
      var mailOk = !!(emailRes && emailRes.ok);
      var isEs = currentLang === "es";

      // Nothing reached us at all: do NOT pretend it worked.
      if (!fbOk && !mailOk) {
        errBox.textContent = isEs
          ? "No pudimos enviar tu configuración (revisa tu conexión). No se perdió nada: inténtalo de nuevo en unos segundos."
          : "We couldn't send your setup (please check your connection). Nothing is lost: try again in a few seconds.";
        errBox.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.innerHTML = "<span>" + (isEs ? "Enviar mi configuración" : "Submit My Shop Setup") + "</span> <span>→</span>";
        return;
      }

      var successPanel = document.getElementById("successPanel");
      successPanel.hidden = false;

      var ref = fbRes && fbRes.designId ? fbRes.designId : "";
      document.getElementById("successHeading").textContent = isEs
        ? "¡Recibimos la configuración de tu florería!"
        : "Your shop setup has been received!";
      document.getElementById("successSub").textContent = isEs
        ? "Recibimos tus datos. Revisaremos la colección y confirmaremos el alcance contigo."
        : "We received your setup details. We will review the collection and confirm the scope with you.";

      var steps = isEs
        ? [
            "<b>Construimos tu estudio</b> tras confirmar tu colección, alcance y fecha de entrega.",
            "<b>Te enviamos un enlace de vista previa</b> por WhatsApp o correo para que lo pruebes como si fueras tu cliente.",
            "<b>Revisa tu configuración</b> en la ronda incluida. Las imágenes y trabajos adicionales se cotizan antes de empezar.",
            "<b>Publicamos tu estudio</b> y tus clientas empiezan a diseñar y pedir ramos."
          ]
        : [
            "<b>We build your studio</b> after confirming your collection, scope and delivery date.",
            "<b>We send you a preview link</b> on WhatsApp or email so you can try it like one of your customers.",
            "<b>Review your setup</b> in the included review round. Extra artwork or work is quoted before it starts.",
            "<b>We publish your studio</b> and your customers start designing and ordering bouquets."
          ];
      document.getElementById("nextSteps").innerHTML = steps
        .map(function (s) {
          return "<li><span>" + s + "</span></li>";
        })
        .join("");

      var warnEl = document.getElementById("photoWarnBox");
      var failedPhotos = (fbRes && fbRes.photoFailures) || [];
      if (failedPhotos.length) {
        warnEl.hidden = false;
        warnEl.textContent = isEs
          ? "No pudimos guardar estas fotos: " + failedPhotos.join(", ") + ". Por favor envíalas por WhatsApp o correo y las agregamos."
          : "These photos could not be saved: " + failedPhotos.join(", ") + ". Please send them to us on WhatsApp or email and we will add them.";
      } else {
        warnEl.hidden = true;
      }

      var badgesEl = document.getElementById("deliveryBadges");
      badgesEl.innerHTML = "";
      if (ref) {
        badgesEl.innerHTML +=
          '<span class="hero-badge"><b>#</b> ' + (isEs ? "Tu referencia" : "Your reference") + ": <code>" + ref + "</code></span>";
      }
      if (mailOk) {
        badgesEl.innerHTML +=
          '<span class="hero-badge"><b>✓</b> ' + (isEs ? "Copia enviada al equipo Nebula" : "Copy sent to the Nebula team") + "</span>";
      }

      var waSummary =
        "Hi Nebula Studio! 🌸 I just submitted my flower shop setup:\n" +
        "• Shop: " + payload.shopName + " (" + payload.ownerName + ")\n" +
        "• Plan: $" + payload.plan.monthlyUsd + "/mo (" + payload.plan.siteUrl + ")\n" +
        "• Location: " + payload.city + ", " + payload.country + " (" + payload.currency + ")\n" +
        "• Order Phone: " + payload.phone + "\n" +
        (ref ? "• Reference: " + ref : "");

      document.getElementById("btnWhatsappBackup").href =
        "https://wa.me/15713367129?text=" + encodeURIComponent(waSummary);
      document.getElementById("btnEmailBackup").href =
        "mailto:nebulastudiosite@gmail.com?subject=" +
        encodeURIComponent("Shop Setup — " + payload.shopName) +
        "&body=" +
        encodeURIComponent(waSummary);

      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>✓ " + (isEs ? "Configuración Enviada" : "Shop Setup Submitted") + "</span>";

      successPanel.scrollIntoView({ behavior: "smooth" });
    });
  }

  function checkClientPrefill() {
    var params = new URLSearchParams(window.location.search);

    var langParam = (params.get("lang") || "").toLowerCase();
    if (langParam === "tr") {
      applyCountry("Turkey", true);
      setLanguage("tr");
    } else if (langParam === "es") {
      setLanguage("es");
    }
    var client = (params.get("client") || params.get("shop") || "").toLowerCase();
    if (client === "la-flor-eterna" || client === "lafloreterna") {
      document.getElementById("shopName").value = "La Flor Eterna";
      document.getElementById("ownerName").value = "Maritza Gomez";
      document.getElementById("orderChannel").value = "sms";
      document.getElementById("shopPhone").value = "+1 310 872 9856";
      document.getElementById("shopInstagram").value = "@laflor_eterna";
      document.getElementById("shopCity").value = "Los Angeles, CA";
      applyCountry("United States", true);
      var roseThemeBtn = document.querySelector('.theme-swatch-btn[data-theme="rose"]');
      if (roseThemeBtn) roseThemeBtn.click();
      updateSlugPreview();
      updateLiveSampleCalculator();
    } else if (client === "raysbouquetz" || client === "rays") {
      document.getElementById("shopName").value = "Ray's Bouquetz";
      document.getElementById("shopInstagram").value = "@raysbouquetz";
      applyCountry("Canada", true);
      document.getElementById("shopCity").value = "";
      var roseBtn = document.querySelector('.theme-swatch-btn[data-theme="rose"]');
      if (roseBtn) roseBtn.click();
      customAssetsRows = [
        { id: "ca_ray_1", category: "New Flowers / Colors", name: "Ribbon Rose (per stem)", priceDollars: "4.00", photoDataUrl: "", fileName: "" },
        { id: "ca_ray_2", category: "New Flowers / Colors", name: "Foam Rose (per stem)", priceDollars: "3.50", photoDataUrl: "", fileName: "" },
        { id: "ca_ray_3", category: "Custom Wrapping Paper", name: "Money Bouquet Fold / Styling Fee", priceDollars: "35.00", photoDataUrl: "", fileName: "" },
        { id: "ca_ray_4", category: "Chocolates / Gift Boxes", name: "Custom Shirt Add-on / Order", priceDollars: "25.00", photoDataUrl: "", fileName: "" }
      ];
      document.getElementById("customAssetsNotes").value =
        "Square Payments (CAD): Include both Option #1 (Review + Square Deposit Link) and Option #2 (Direct Square Checkout).";
      renderCustomAssetRows();
      updateSlugPreview();
      updateLiveSampleCalculator();
    } else if (client === "floresboutique" || client === "floresboutique-cl" || client === "floresboutique.cl") {
      document.getElementById("shopName").value = "Flores Boutique";
      document.getElementById("shopInstagram").value = "@floresboutique.cl";
      document.getElementById("shopCity").value = "Santiago";
      applyCountry("Chile", true);
      setLanguage("es");
      var roseBtn2 = document.querySelector('.theme-swatch-btn[data-theme="rose"]');
      if (roseBtn2) roseBtn2.click();
      customAssetsRows = [
        { id: "ca_fb_1", category: "New Flowers / Colors", name: "Rosas de Limpiapipas", priceDollars: "2.50", photoDataUrl: "", fileName: "" },
        { id: "ca_fb_2", category: "New Flowers / Colors", name: "Tulipanes de Limpiapipas", priceDollars: "2.50", photoDataUrl: "", fileName: "" },
        { id: "ca_fb_3", category: "New Flowers / Colors", name: "Girasol de Limpiapipas", priceDollars: "3.50", photoDataUrl: "", fileName: "" }
      ];
      document.getElementById("customAssetsNotes").value =
        "Ramos eternos confeccionados en limpiapipas. Pago directo a Cuenta RUT / Transferencia Bancaria y despacho en Chile.";
      renderCustomAssetRows();
      updateSlugPreview();
      updateLiveSampleCalculator();
    }
  }

  /* -----------------------------------------------------------------------
     11b. COUNTRY, CURRENCY, LANGUAGES & LIVE BUILDER PREVIEW
     Only currencies with exactly 2 decimals are offered, because the builder
     prices everything in cents (check-shop.cjs rejects 0- or 3-decimal ones).
     ----------------------------------------------------------------------- */
  var CURRENCIES = [
    ["USD", "US Dollar ($)"], ["CAD", "Canadian Dollar ($)"], ["EUR", "Euro (€)"], ["GBP", "British Pound (£)"],
    ["AUD", "Australian Dollar ($)"], ["NZD", "New Zealand Dollar ($)"], ["CHF", "Swiss Franc"],
    ["SEK", "Swedish Krona"], ["NOK", "Norwegian Krone"], ["DKK", "Danish Krone"], ["PLN", "Polish Złoty"],
    ["CZK", "Czech Koruna"], ["HUF", "Hungarian Forint"], ["RON", "Romanian Leu"], ["TRY", "Turkish Lira (₺)"],
    ["MAD", "Moroccan Dirham (DH)"], ["DZD", "Algerian Dinar (DA)"], ["EGP", "Egyptian Pound (E£)"],
    ["AED", "UAE Dirham"], ["SAR", "Saudi Riyal"], ["QAR", "Qatari Riyal"], ["ILS", "Israeli Shekel (₪)"],
    ["ZAR", "South African Rand (R)"], ["NGN", "Nigerian Naira (₦)"], ["KES", "Kenyan Shilling"], ["GHS", "Ghanaian Cedi"],
    ["INR", "Indian Rupee (₹)"], ["PKR", "Pakistani Rupee"], ["BDT", "Bangladeshi Taka"], ["LKR", "Sri Lankan Rupee"],
    ["MYR", "Malaysian Ringgit"], ["SGD", "Singapore Dollar ($)"], ["PHP", "Philippine Peso (₱)"], ["THB", "Thai Baht (฿)"],
    ["IDR", "Indonesian Rupiah"], ["HKD", "Hong Kong Dollar ($)"], ["CNY", "Chinese Yuan (¥)"], ["TWD", "Taiwan Dollar"],
    ["MXN", "Mexican Peso ($)"], ["COP", "Colombian Peso ($)"], ["BRL", "Brazilian Real (R$)"], ["ARS", "Argentine Peso ($)"],
    ["PEN", "Peruvian Sol (S/)"], ["DOP", "Dominican Peso ($)"], ["CRC", "Costa Rican Colón (₡)"], ["GTQ", "Guatemalan Quetzal (Q)"],
    ["UYU", "Uruguayan Peso ($)"]
  ];

  // [country name, default currency, phone dial code, default languages]
  var COUNTRIES = [
    ["United States", "USD", "+1", ["en", "es"]], ["Canada", "CAD", "+1", ["en", "fr"]], ["Mexico", "MXN", "+52", ["es"]],
    ["United Kingdom", "GBP", "+44", ["en"]], ["Ireland", "EUR", "+353", ["en"]], ["France", "EUR", "+33", ["fr"]],
    ["Belgium", "EUR", "+32", ["fr", "en"]], ["Spain", "EUR", "+34", ["es"]], ["Portugal", "EUR", "+351", ["pt"]],
    ["Italy", "EUR", "+39", ["en"]], ["Germany", "EUR", "+49", ["en"]], ["Netherlands", "EUR", "+31", ["en"]],
    ["Switzerland", "CHF", "+41", ["fr", "en"]], ["Sweden", "SEK", "+46", ["en"]], ["Norway", "NOK", "+47", ["en"]],
    ["Denmark", "DKK", "+45", ["en"]], ["Poland", "PLN", "+48", ["en"]], ["Romania", "RON", "+40", ["en"]],
    ["Turkey", "TRY", "+90", ["tr", "en"]], ["Morocco", "MAD", "+212", ["fr", "ar"]], ["Algeria", "DZD", "+213", ["fr", "ar"]],
    ["Egypt", "EGP", "+20", ["ar", "en"]], ["United Arab Emirates", "AED", "+971", ["en", "ar"]],
    ["Saudi Arabia", "SAR", "+966", ["ar", "en"]], ["Qatar", "QAR", "+974", ["ar", "en"]],
    ["South Africa", "ZAR", "+27", ["en"]], ["Nigeria", "NGN", "+234", ["en"]], ["Kenya", "KES", "+254", ["en"]],
    ["Ghana", "GHS", "+233", ["en"]], ["India", "INR", "+91", ["en"]], ["Pakistan", "PKR", "+92", ["en"]],
    ["Malaysia", "MYR", "+60", ["en"]], ["Singapore", "SGD", "+65", ["en"]], ["Philippines", "PHP", "+63", ["en"]],
    ["Australia", "AUD", "+61", ["en"]], ["New Zealand", "NZD", "+64", ["en"]], ["Chile", "USD", "+56", ["es"]], ["Colombia", "COP", "+57", ["es"]],
    ["Brazil", "BRL", "+55", ["pt"]], ["Argentina", "ARS", "+54", ["es"]], ["Peru", "PEN", "+51", ["es"]],
    ["Dominican Republic", "DOP", "+1", ["es"]], ["Puerto Rico", "USD", "+1", ["es", "en"]],
    ["Costa Rica", "CRC", "+506", ["es"]], ["Guatemala", "GTQ", "+502", ["es"]], ["Other", "USD", "+", ["en"]]
  ];

  function findCountry(name) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i][0] === name) return COUNTRIES[i];
    return null;
  }

  function initCountryAndCurrency() {
    var cSel = document.getElementById("shopCountry");
    var curSel = document.getElementById("shopCurrency");
    if (!cSel || !curSel) return;

    cSel.innerHTML = COUNTRIES.map(function (c) {
      return '<option value="' + c[0] + '">' + c[0] + "</option>";
    }).join("");
    curSel.innerHTML = CURRENCIES.map(function (c) {
      return '<option value="' + c[0] + '">' + c[0] + " — " + c[1] + "</option>";
    }).join("");

    cSel.addEventListener("change", function () {
      applyCountry(cSel.value, true);
    });
    curSel.addEventListener("change", updateLiveSampleCalculator);
    applyCountry("United States", false);
  }

  function applyCountry(name, setLanguages) {
    var c = findCountry(name);
    if (!c) return;
    document.getElementById("shopCountry").value = c[0];
    document.getElementById("shopCurrency").value = c[1];
    var phone = document.getElementById("shopPhone");
    if (phone) phone.placeholder = c[2] === "+" ? "e.g. +00 000 000 000" : "e.g. " + c[2] + " …";
    if (setLanguages) {
      document.querySelectorAll("#builderLangs input").forEach(function (inp) {
        inp.checked = c[3].indexOf(inp.value) !== -1;
      });
    }
    updateLiveSampleCalculator();
  }

  function selectedBuilderLanguages() {
    var out = [];
    document.querySelectorAll("#builderLangs input:checked").forEach(function (inp) {
      out.push(inp.value);
    });
    return out.length ? out : ["en"];
  }

  function initBuilderPreview() {
    var btn = document.getElementById("builderPreviewStart");
    var btnLeft = document.getElementById("builderPreviewBtnLeft");
    var frame = document.getElementById("builderPreviewFrame");
    if (!btn || !frame) return;
    function activatePreview() {
      if (!frame.src) frame.src = frame.dataset.src;
      frame.closest(".phone-frame").classList.add("is-live");
      frame.focus();
    }
    btn.addEventListener("click", activatePreview);
    if (btnLeft) btnLeft.addEventListener("click", activatePreview);
  }

  /* -----------------------------------------------------------------------
     12. INITIALIZE
     ----------------------------------------------------------------------- */
  initCatalogState();
  renderFlowerFamilies();
  renderExtrasGrid();
  renderCustomAssetRows();
  renderBouquetSlots();
  updateSlugPreview();
  initCountryAndCurrency();
  initBuilderPreview();
  updateLiveSampleCalculator();
  initEvents();
  checkClientPrefill();
  // Continue a requested demo setup without asking for the same identity again.
  if (new URLSearchParams(location.search).get('from') === 'demo') {
    try {
      var enquiry = JSON.parse(sessionStorage.getItem('nebula-demo-enquiry') || 'null');
      if (enquiry && Date.now() - enquiry.at < 86400000) {
        if (!document.getElementById('shopName').value) document.getElementById('shopName').value = String(enquiry.shop || '');
        if (!document.getElementById('shopEmail').value) document.getElementById('shopEmail').value = String(enquiry.email || '');
        var currencySelect = document.getElementById('shopCurrency');
        if (Array.from(currencySelect.options).some(function(o) { return o.value === enquiry.currency; })) currencySelect.value = enquiry.currency;
        updateSlugPreview(); updateLiveSampleCalculator();
      }
    } catch (_) {}
  }
  checkOwnerInspectMode();
})();
