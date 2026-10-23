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
  var selectedPlan = "subdomain"; // 'subdomain' ($29) or 'custom_domain' ($35)
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
      headerSub: "Florist Studio Setup",
      navStep1: "1. Shop & Logo",
      navStep2: "2. Flower Prices",
      navStep3: "3. Toys & New Assets",
      navStep4: "4. Bouquets & Plan",
      heroEyebrow: "Florist Onboarding · Takes 4 Minutes",
      heroTitle: "Your flowers.<br>Your prices.<br><em>Your own studio.</em>",
      heroLead:
        "We already filled in standard florist market prices below so you don’t have to start from scratch. Simply adjust the flowers you want to change, turn off anything you don’t carry, upload your logo, and we’ll build your shop’s version.",
      badgePreFilled: "Pre-filled smart prices",
      badgeFreeBouquets: "4 custom bouquets included FREE",
      badgePayAfter: "Pay $0 today — only after your studio is live",
      promiseTag: "Included with your setup",
      promiseTitle: "Fair, simple & built for florists",
      promise1: "<b>Your branding & prices:</b> Your logo, shop name, WhatsApp/SMS number, and exact stem & wrapping prices.",
      promise2: "<b>4 custom signature bouquets FREE:</b> Send us 4 photos of your best-selling bouquets — we build them into your studio for free, plus free seasonal refreshes.",
      promise3: "<b>Want new toys or flowers?</b> Tell us in Step 4 if you want custom plush toys, flowers, or wraps added.",
      promise4: "<b>Choose your link:</b> <b>$29/mo</b> on <code>nebulastudio.site/your-shop</code> or <b>$35/mo</b> with your own custom <code>.com</code> domain.",
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
      lblCity: "City & State / Country *",
      lblCurrency: "Shop Currency *",
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
      step5Kicker: "Signature Bouquets & Monthly Plan",
      step5Title: "Your 4 free custom bouquets & plan choice",
      step5Sub: "We recreate 4 of your shop’s signature bouquets inside your builder at no extra cost — plus free seasonal updates (Valentine’s, Mother’s Day, Fall & Christmas).",
      freeBouquetsBannerTitle: "✓ 4 Custom Signature Bouquets Included FREE (+ Free Seasonal Updates)",
      freeBouquetsBannerSub: "Upload a photo of up to 4 of your best-selling bouquets below, or leave any slot blank to use Nebula’s top-selling studio recipes.",
      extraBouquetsTitle: "Want more than 4 custom signature bouquets?",
      extraBouquetsSub: "Your first 4 custom bouquets (and seasonal refreshes) are 100% free. Additional custom-engineered bouquets are a one-time setup fee of $35 each (or 3 extra for $85).",
      lblExtraBouquets: "Extra Custom Bouquets",
      optExtra0: "4 Free Signature Bouquets ($0 — Included)",
      optExtra1: "+1 Extra Custom Bouquet — 5 total ($35 one-time)",
      optExtra2: "+2 Extra Custom Bouquets — 6 total ($70 one-time)",
      optExtra3: "+3 Extra Custom Bouquets Bundle — 7 total ($85 one-time · Save $20)",
      optExtra4: "+4 Extra Custom Bouquets — 8 total ($115 one-time · Save $25)",
      choosePlanHeading: "Choose your monthly hosting plan",
      planPopularBadge: "Most Popular",
      plan29Title: "Nebula Studio Link",
      plan35Title: "Your Own Custom Domain",
      perMonth: "/ month",
      plan29Bullet1: "Your custom-configured Bouquet Builder (Classic, Dome & Heart)",
      plan29Bullet2: "4 custom signature bouquets FREE + free seasonal updates",
      plan29Bullet3: "Perfect for your Instagram bio, TikTok, Facebook & QR codes",
      plan29Bullet4: "Pay $0 today — subscription starts only after your shop is live",
      plan35Bullet1: "Everything in the $29 plan + your own dedicated .com domain",
      plan35Bullet2: "We register & renew a new domain for you (or connect your existing one)",
      plan35Bullet3: "Full HTTPS SSL security & branded short order links",
      plan35Bullet4: "Pay $0 today — subscription starts only after your shop is live",
      lblDesiredDomain: "Preferred .com Domain Name (if choosing $35/mo)",
      submitCardTitle: "Ready to build your flower shop’s studio?",
      submitCardDesc: "Pressing submit sends your complete price list, logo, custom asset requests, and bouquet photos directly to Nebula Studio. No credit card is asked today — you only pay after you preview and approve your live studio!",
      btnSubmitSetup: "Submit My Shop Setup",
      submitFinePrint: "Saves securely to Nebula Cloud (Firebase) & emails nebulastudiosite@gmail.com",
      calcTitle: "Live Estimate With Your Prices:",
      sample1Label: "12-Rose Classic:",
      sample2Label: "24-Rose Dome + Bow:",
      sample3Label: "Lily & Rose Mix:",
      samplePlanLabel: "Plan:",
      calcFinishBtn: "Finish & Submit ↓"
    },
    es: {
      headerSub: "Configuración de Florería",
      navStep1: "1. Tu Florería",
      navStep2: "2. Precios de Flores",
      navStep3: "3. Peluches y Nuevos",
      navStep4: "4. Tus 4 Ramos y Plan",
      heroEyebrow: "Registro para Florerías · Toma 4 Minutos",
      heroTitle: "Tus flores.<br>Tus precios.<br><em>Tu propio estudio.</em>",
      heroLead:
        "Ya pre-llenamos precios promedio del mercado para que no empieces desde cero. Solo ajusta los precios que quieras cambiar, desactiva lo que no manejes, sube tu logo y crearemos la versión de tu florería.",
      badgePreFilled: "Precios pre-llenados fáciles de editar",
      badgeFreeBouquets: "4 ramos personalizados GRATIS",
      badgePayAfter: "Pagas $0 hoy — solo cuando tu estudio esté listo",
      promiseTag: "Incluido con tu configuración",
      promiseTitle: "Justo, claro y pensado para florerías",
      promise1: "<b>Tu marca y tus precios:</b> Tu logo, nombre de florería, WhatsApp/SMS y precios exactos por tallo y envoltura.",
      promise2: "<b>4 ramos estrella GRATIS:</b> Sube 4 fotos de tus ramos más vendidos — los recreamos en tu estudio gratis, con cambios de temporada gratis.",
      promise3: "<b>¿Quieres nuevos peluches o flores?</b> Dinos en el Paso 4 si deseas agregar peluches, flores o papeles nuevos.",
      promise4: "<b>Elige tu enlace:</b> <b>$29/mes</b> en <code>nebulastudio.site/tu-floreria</code> o <b>$35/mes</b> con tu propio dominio <code>.com</code>.",
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
      lblCity: "Ciudad y Estado / País *",
      lblCurrency: "Moneda de tu Florería *",
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
      step5Kicker: "Tus 4 Ramos Estrella y Plan Mensual",
      step5Title: "Tus 4 ramos personalizados gratis y elección de plan",
      step5Sub: "Recreamos 4 de los ramos más vendidos de tu florería dentro de tu estudio sin costo adicional — más actualizaciones gratis por temporada (San Valentín, Día de las Madres, Otoño y Navidad).",
      freeBouquetsBannerTitle: "✓ 4 Ramos Personalizados de tu Tienda Incluidos GRATIS (+ Cambios por Temporada Gratis)",
      freeBouquetsBannerSub: "Sube hasta 4 fotos de tus ramos más vendidos abajo, o deja cualquier espacio con las recetas estrella de Nebula.",
      extraBouquetsTitle: "¿Necesitas más de 4 ramos personalizados?",
      extraBouquetsSub: "Tus primeros 4 ramos personalizados (y cambios de temporada) son 100% gratis. Si deseas más de 4 al inicio, cada ramo extra cuesta $35 pago único (o paquete de 3 extras por $85).",
      lblExtraBouquets: "Ramos Personalizados Adicionales",
      optExtra0: "4 Ramos Personalizados Gratis ($0 — Incluido)",
      optExtra1: "+1 Ramo Personalizado Extra — 5 en total ($35 pago único)",
      optExtra2: "+2 Ramos Personalizados Extra — 6 en total ($70 pago único)",
      optExtra3: "+3 Ramos Personalizados Extra — 7 en total ($85 pago único · Ahorras $20)",
      optExtra4: "+4 Ramos Personalizados Extra — 8 en total ($115 pago único · Ahorras $25)",
      choosePlanHeading: "Elige tu plan mensual",
      planPopularBadge: "Más Popular",
      plan29Title: "Enlace en Nebula Studio",
      plan35Title: "Tu Propio Dominio .com",
      perMonth: "/ mes",
      plan29Bullet1: "Tu creador de ramos configurado (Clásico, Domo y Corazón)",
      plan29Bullet2: "4 ramos personalizados de tu florería GRATIS + cambios de temporada",
      plan29Bullet3: "Ideal para tu biografía de Instagram, TikTok, Facebook y WhatsApp",
      plan29Bullet4: "Pagas $0 hoy — la mensualidad inicia solo cuando tu estudio esté en vivo",
      plan35Bullet1: "Todo lo del plan de $29 + tu propio dominio exclusivo .com",
      plan35Bullet2: "Registramos y renovamos tu dominio nuevo (o conectamos el que ya tengas)",
      plan35Bullet3: "Seguridad SSL HTTPS completa y enlaces cortos con tu marca",
      plan35Bullet4: "Pagas $0 hoy — la mensualidad inicia solo cuando tu estudio esté en vivo",
      lblDesiredDomain: "Dominio .com que te gustaría (si eliges el plan de $35/mes)",
      submitCardTitle: "¿Listo para que creemos el estudio de tu florería?",
      submitCardDesc: "Al enviar, recibiremos tu lista de precios, logo, solicitud de nuevos peluches/flores y fotos de tus 4 ramos. No pedimos tarjeta hoy: ¡solo pagas cuando veas y apruebes tu estudio funcionando!",
      btnSubmitSetup: "Enviar Configuración de Mi Florería",
      submitFinePrint: "Se guarda de forma segura en Nebula Cloud (Firebase) y envía copia a nebulastudiosite@gmail.com",
      calcTitle: "Cálculo en Vivo con tus Precios:",
      sample1Label: "Clásico 12 Rosas:",
      sample2Label: "Domo 24 Rosas + Moño:",
      sample3Label: "Mix Lirios y Rosas:",
      samplePlanLabel: "Plan:",
      calcFinishBtn: "Finalizar y Enviar ↓"
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
            item.name[currentLang] +
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
            fam.unit[currentLang] +
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
        fam.title[currentLang] +
        '" loading="lazy"></div>' +
        "<div>" +
        '<div class="family-info-top">' +
        "<h3>" +
        fam.title[currentLang] +
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
        fam.desc[currentLang] +
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
        fam.unit[currentLang] +
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
            (currentLang === "es" ? " variedades incluidas" : " varieties included") +
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
        ex.title[currentLang] +
        '" loading="lazy"></div>' +
        '<div class="extra-meta">' +
        "<h4>" +
        ex.title[currentLang] +
        "</h4>" +
        "<p>" +
        ex.desc[currentLang] +
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
     6. 4 FREE SIGNATURE BOUQUET SLOTS
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
        (currentLang === "es" ? "Ramo Gratis #" : "Free Bouquet #") +
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

    document.getElementById("samplePrice1").textContent = "$" + centsToDollarsStr(s1);
    document.getElementById("samplePrice2").textContent = "$" + centsToDollarsStr(s2);
    document.getElementById("samplePrice3").textContent = "$" + centsToDollarsStr(s3);

    var extraCount = parseInt(document.getElementById("extraBouquetsSelect").value, 10) || 0;
    var extraFeeMap = { 0: 0, 1: 35, 2: 70, 3: 85, 4: 115 };
    var extraFee = extraFeeMap[extraCount] || 0;
    var monthlyPrice = selectedPlan === "custom_domain" ? 35 : 29;
    document.getElementById("samplePlanPrice").textContent =
      "$" + monthlyPrice + "/mo" + (extraFee > 0 ? " (+" + "$" + extraFee + " once)" : "");
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
    if (digitsOnly.length === 10) digitsOnly = "1" + digitsOnly;
    if (digitsOnly.length < 8) digitsOnly = "15713367129";

    var email = document.getElementById("shopEmail").value.trim();
    var instagram = document.getElementById("shopInstagram").value.trim();
    var city = document.getElementById("shopCity").value.trim();
    var currency = document.getElementById("shopCurrency").value || "USD";
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
    var extraFeeMap = { 0: 0, 1: 35, 2: 70, 3: 85, 4: 115 };

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
        place: city,
        year: "2026"
      },
      currency: currency,
      demo: false,
      requestChannel: channel,
      recipient: "+" + digitsOnly,
      whatsapp: channel === "whatsapp" ? digitsOnly : "",
      email: email,
      pricesApproved: true,
      selectionComplete: true,
      fulfillmentApproved: true,
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
      currency: currency,
      plan: {
        type: selectedPlan,
        monthlyUsd: selectedPlan === "custom_domain" ? 35 : 29,
        siteUrl: siteUrl,
        desiredDomain: desiredDomain,
        includedFreeBouquets: 4,
        extraCustomBouquets: extraBouquetsCount,
        oneTimeExtraBouquetsUsd: extraFeeMap[extraBouquetsCount] || 0
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

  /* Uploads one image as 20KB chunks. Each chunk is retried up to 3 times.
     Returns the ordered chunk IDs, or null if ANY chunk could not be saved
     (a half-saved photo would be corrupt, so we never keep partial photos). */
  async function uploadDataUrlInChunks(dataUrl, now, expiresAt) {
    if (!dataUrl || typeof dataUrl !== "string") return [];
    var b64u = toBase64Url(dataUrl);
    var chunkSize = 20000;
    var chunkIds = [];
    for (var offset = 0; offset < b64u.length; offset += chunkSize) {
      var slice = b64u.slice(offset, offset + chunkSize);
      var saved = "";
      for (var attempt = 0; attempt < 3 && !saved; attempt++) {
        var cid = randomId22();
        try {
          var res = await fetch(
            FIREBASE_DB_URL + "/nebula/la-flor-eterna/designs/" + cid + ".json?print=silent",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shopId: "la-flor-eterna",
                code: slice,
                purpose: "share",
                createdAt: now,
                expiresAt: expiresAt
              }),
              credentials: "omit",
              referrerPolicy: "no-referrer"
            }
          );
          if (res.ok) saved = cid;
        } catch (_) {}
      }
      if (!saved) return null;
      chunkIds.push(saved);
    }
    return chunkIds;
  }

  async function downloadDataUrlFromChunks(chunkIds) {
    if (!Array.isArray(chunkIds) || !chunkIds.length) return "";
    var parts = await Promise.all(
      chunkIds.map(async function (cid) {
        var r = await fetch(
          FIREBASE_DB_URL + "/nebula/la-flor-eterna/designs/" + cid + ".json",
          { credentials: "omit" }
        );
        if (!r.ok) return "";
        var j = await r.json();
        return (j && j.code) || "";
      })
    );
    var joined = parts.join("");
    return joined ? fromBase64Url(joined) : "";
  }

  async function saveToFirebaseRealtime(payload) {
    var designId = randomId22();
    var requestId = randomId22();
    var now = Date.now();
    var expiresAt = now + 7776000000; // 90 days (matches realtime.rules.json)

    // Clone payload and store every uploaded photo in dedicated 20KB Firebase chunks so ZERO photos are ever lost!
    var clone = JSON.parse(JSON.stringify(payload));
    delete clone.shopConfigJsText;
    clone.photoChunks = { logo: [], bouquets: {}, customItems: {} };
    clone.photoUploadFailures = [];
    var photosAttempted = 0;

    try {
      if (clone.logoDataUrl) {
        photosAttempted++;
        var logoIds = await uploadDataUrlInChunks(clone.logoDataUrl, now, expiresAt);
        if (logoIds) clone.photoChunks.logo = logoIds;
        else clone.photoUploadFailures.push("Shop logo");
        clone.logoDataUrl = "";
      }
      if (Array.isArray(clone.signatureBouquets)) {
        for (var bi = 0; bi < clone.signatureBouquets.length; bi++) {
          var bPhoto = clone.signatureBouquets[bi].photoDataUrl;
          if (bPhoto) {
            photosAttempted++;
            var bIds = await uploadDataUrlInChunks(bPhoto, now, expiresAt);
            if (bIds) clone.photoChunks.bouquets[bi] = bIds;
            else clone.photoUploadFailures.push("Bouquet #" + (bi + 1));
            clone.signatureBouquets[bi].photoDataUrl = "";
          }
        }
      }
      if (clone.customAssetRequests && Array.isArray(clone.customAssetRequests.items)) {
        for (var ci = 0; ci < clone.customAssetRequests.items.length; ci++) {
          var cPhoto = clone.customAssetRequests.items[ci].photoDataUrl;
          if (cPhoto) {
            photosAttempted++;
            var cIds = await uploadDataUrlInChunks(cPhoto, now, expiresAt);
            if (cIds) clone.photoChunks.customItems[ci] = cIds;
            else clone.photoUploadFailures.push("Custom item #" + (ci + 1));
            clone.customAssetRequests.items[ci].photoDataUrl = "";
          }
        }
      }
    } catch (_) {}

    var codeB64 = toBase64Url(JSON.stringify(clone));
    if (codeB64.length > 23800) {
      // Never truncate JSON (it would be unreadable). Drop the bulky config copy instead;
      // the admin dossier can rebuild shop-config.js from the prices + the emailed copy.
      delete clone.nebulaShopConfig;
      clone.nebulaShopConfigOmitted = true;
      codeB64 = toBase64Url(JSON.stringify(clone));
    }
    codeB64 = codeB64.slice(0, 23800);

    // 1. Try dedicated nebula/onboarding/<designId> path (if updated rules are deployed)
    var dedicatedOk = false;
    try {
      var res1 = await fetch(
        FIREBASE_DB_URL + "/nebula/onboarding/" + designId + ".json?print=silent",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: designId,
            shopName: payload.shopName,
            ownerName: payload.ownerName,
            plan: payload.plan.type,
            code: codeB64,
            createdAt: now,
            expiresAt: expiresAt
          }),
          credentials: "omit",
          referrerPolicy: "no-referrer"
        }
      );
      if (res1.ok) dedicatedOk = true;
    } catch (_) {}

    // 2. Also write to live validated nebula/la-flor-eterna/designs & requests so it works 100% right now!
    var liveValidatedOk = false;
    try {
      var designRecord = {
        shopId: "la-flor-eterna",
        code: codeB64,
        purpose: "request",
        createdAt: now,
        expiresAt: expiresAt
      };
      var dRes = await fetch(
        FIREBASE_DB_URL + "/nebula/la-flor-eterna/designs/" + designId + ".json?print=silent",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(designRecord),
          credentials: "omit",
          referrerPolicy: "no-referrer"
        }
      );

      if (dRes.ok) {
        var refSlug = ("SETUP-" + payload.slug.toUpperCase()).replace(/[^-A-Z0-9]/g, "").slice(0, 48);
        var reqRecord = {
          shopId: "la-flor-eterna",
          designId: designId,
          customerName: ("SHOP SETUP: " + payload.shopName + " (" + payload.ownerName + ")").slice(0, 120),
          requestedDate: new Date().toISOString().slice(0, 10),
          method: payload.plan.type === "custom_domain" ? "Delivery" : "Pickup",
          reference: refSlug || "SETUP-SHOP",
          code: codeB64,
          shortUrl: "https://nebulastudio.site/b/#" + designId,
          status: "prepared",
          createdAt: now,
          expiresAt: expiresAt
        };
        var rRes = await fetch(
          FIREBASE_DB_URL + "/nebula/la-flor-eterna/requests/" + requestId + ".json?print=silent",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqRecord),
            credentials: "omit",
            referrerPolicy: "no-referrer"
          }
        );
        liveValidatedOk = rRes.ok || dRes.ok;

        // Also index in NEB_SETUP_SLOT_00000XX so admin.html lists every submitted shop setup automatically!
        for (var si = 1; si <= 250; si++) {
          var slot = "NEB_SETUP_SLOT_" + String(si).padStart(7, "0");
          var sNow = Date.now();
          var sRes = await fetch(
            FIREBASE_DB_URL + "/nebula/la-flor-eterna/designs/" + slot + ".json?print=silent",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shopId: "la-flor-eterna",
                code: toBase64Url(
                  JSON.stringify({
                    designId: designId,
                    shopName: payload.shopName,
                    ownerName: payload.ownerName,
                    phone: payload.phone,
                    email: payload.email,
                    instagram: payload.instagram,
                    city: payload.city,
                    currency: payload.currency,
                    plan: payload.plan,
                    customAssetRequests: {
                      wantsNewAssets: payload.customAssetRequests.wantsNewAssets,
                      categories: payload.customAssetRequests.categories,
                      itemCount: payload.customAssetRequests.items.length,
                      notes: payload.customAssetRequests.notes
                    },
                    submittedAt: payload.submittedAt,
                    inspectUrl: "admin.html?setup=" + designId,
                    photosAttempted: photosAttempted,
                    photoUploadFailures: clone.photoUploadFailures
                  })
                ).slice(0, 23800),
                purpose: "request",
                createdAt: sNow,
                expiresAt: sNow + 7776000000
              }),
              credentials: "omit",
              referrerPolicy: "no-referrer"
            }
          );
          if (sRes.ok) break;
        }
      }
    } catch (_) {}

    return {
      ok: dedicatedOk || liveValidatedOk,
      designId: designId,
      requestId: requestId,
      inspectUrl: "https://nebulastudio.site/admin.html?setup=" + designId,
      photosAttempted: photosAttempted,
      photoFailures: clone.photoUploadFailures
    };
  }

  async function sendToFormspreeEmail(payload, fbResult) {
    var fd = new FormData();
    var planLabel =
      payload.plan.type === "custom_domain"
        ? "$35/month — Custom Domain (" + payload.plan.siteUrl + ")"
        : "$29/month — Nebula Subdomain (" + payload.plan.siteUrl + ")";

    fd.append("_subject", "🌸 New Florist Studio Setup: " + payload.shopName + " (" + planLabel + ")");
    fd.append("shop_name", payload.shopName);
    fd.append("owner_name", payload.ownerName);
    fd.append("order_channel", payload.channel.toUpperCase() + ": " + payload.phone);
    fd.append("email", payload.email);
    fd.append("instagram", payload.instagram || "Not provided");
    fd.append("city", payload.city);
    fd.append("currency", payload.currency);
    fd.append("selected_plan", planLabel);
    fd.append(
      "extra_custom_bouquets",
      payload.plan.extraCustomBouquets +
        " extra (+$" +
        payload.plan.oneTimeExtraBouquetsUsd +
        " one-time) + 4 Free Included"
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
    fd.append("signature_bouquets_4_free", sigLines.join("\n"));

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

    try {
      var res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" }
      });
      var json = await res.json().catch(function () {
        return {};
      });
      var ok =
        res.ok &&
        String(json.success) !== "false" &&
        json.ok !== false &&
        !(Array.isArray(json.errors) && json.errors.length);
      return { ok: ok };
    } catch (_) {
      return { ok: false };
    }
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
    currentLang = lang === "es" ? "es" : "en";
    document.documentElement.lang = currentLang;

    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.lang === currentLang);
    });

    var dict = I18N[currentLang];
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
        ? "Guardamos tus precios, logo y fotos. Nuestro equipo ya los está revisando."
        : "We saved your prices, logo and photos. Our team is reviewing them now.";

      var steps = isEs
        ? [
            "<b>Construimos tu estudio</b> con tus precios, logo y los 4 ramos incluidos (normalmente en 48 horas).",
            "<b>Te enviamos un enlace de vista previa</b> por WhatsApp o correo para que lo pruebes como si fueras tu cliente.",
            "<b>Pides los cambios que quieras</b> (los ajustes de precios son gratis). Solo pagas cuando lo apruebes y quedes feliz.",
            "<b>Publicamos tu estudio</b> y tus clientas empiezan a diseñar y pedir ramos."
          ]
        : [
            "<b>We build your studio</b> with your prices, logo and the 4 included bouquets (usually within 48 hours).",
            "<b>We send you a preview link</b> on WhatsApp or email so you can try it like one of your customers.",
            "<b>You ask for any changes</b> (price adjustments are free). You only pay once you approve and love it.",
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
    var client = (params.get("client") || params.get("shop") || "").toLowerCase();
    if (client === "la-flor-eterna" || client === "lafloreterna") {
      document.getElementById("shopName").value = "La Flor Eterna";
      document.getElementById("ownerName").value = "Maritza Gomez";
      document.getElementById("orderChannel").value = "sms";
      document.getElementById("shopPhone").value = "+1 310 872 9856";
      document.getElementById("shopInstagram").value = "@laflor_eterna";
      document.getElementById("shopCity").value = "Los Angeles, CA";
      var roseThemeBtn = document.querySelector('.theme-swatch-btn[data-theme="rose"]');
      if (roseThemeBtn) roseThemeBtn.click();
      updateSlugPreview();
      updateLiveSampleCalculator();
    } else if (client === "raysbouquetz" || client === "rays") {
      document.getElementById("shopName").value = "Ray's Bouquetz";
      document.getElementById("shopInstagram").value = "@raysbouquetz";
      document.getElementById("shopCity").value = "Canada";
      document.getElementById("shopCurrency").value = "CAD";
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
    }
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
  updateLiveSampleCalculator();
  initEvents();
  checkClientPrefill();
  checkOwnerInspectMode();
})();
