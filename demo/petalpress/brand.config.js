/* =============================================================
   Petal Press — brand.config.js
   -------------------------------------------------------------
   THE most important file in this template.
   Every brand-specific string, number and toggle lives here.
   Reskinning for a new client = edit this file. Nothing else.

   Template #2 · Nebula Sites Studio
   ============================================================= */

window.BRAND = {

  /* ---------- identity -------------------------------------- */
  name:       "Petal Press",
  legalName:  "Petal Press LLC",
  tagline: {
    en: "Bouquets drawn by hand. Made by hand.",
    es: "Ramos dibujados a mano. Hechos a mano."
  },
  logo:     "assets/logo/logo-stamp.svg",      // full lockup, header
  logoMark: "assets/logo/logo-mark.svg",       // square only, favicon / stamp
  mascot:   "assets/mascot/pip.svg",

  /* ---------- market ---------------------------------------- */
  city:  "Northern Virginia & Washington D.C.",
  areas: ["Alexandria", "Arlington", "Fairfax", "Tysons", "Reston", "Washington D.C."],
  region: "DMV",
  languages:   ["en", "es"],
  defaultLang: "en",
  currency:       "USD",
  currencySymbol: "$",

  /* ---------- contact — REPLACE BEFORE LAUNCH --------------- */
  whatsapp:  "15713367129",        // digits only, country code first
  phone:     "(571) 336-7129",
  instagram: "petalpress.co",      // handle without the @
  email:     "hello@petalpress.co",
  domain:    "petalpress.co",

  /* ---------- operations ------------------------------------ */
  cutoffHour: 14,                  // 24h clock — same-day order cutoff
  cutoffLabel: {
    en: "Order by 2pm for same-day delivery",
    es: "Pide antes de las 2pm para entrega hoy"
  },
  deliveryFee: 12,
  freeDeliveryOver: 150,

  /* ---------- feature flags --------------------------------- */
  /* Flip a flag, the whole site adapts. showcase mode hides money. */
  features: {
    builder:        true,
    seasons:        true,
    mascot:         true,
    shareableLinks: true,   // builder state encoded in the URL
    stickerExport:  true,   // "save as sticker card" html2canvas export
    languageToggle: true,
    showPrices:     true,   // false = studio showcase / portfolio mode
    liveInkFilter:  true    // hover-only SVG wobble. false = static only
  },

  /* ---------- mascot zoning --------------------------------- */
  /* Pip brings delight where people play, and stays out of the
     rooms where people spend $400. This map is the whole rule. */
  mascotZones: {
    index:    true,
    builder:  true,   // Pip's main stage
    thanks:   true,
    care:     true,
    faq:      true,
    notfound: true,
    weddings: false,  // never
    bouquet:  false,  // never — pricing page
    checkout: false   // never
  },

  /* ---------- ink layer ------------------------------------- */
  ink: {
    jitterMax:   2.6,   // px of random offset per drawn sticker
    tiltMax:     3.2,   // deg of random rotation per drawn sticker
    filterScale: 3.2,   // feDisplacementMap scale on hover
    numOctaves:  3      // hard cap. The reference button used 8. Never again.
  }
};

/* Convenience getters used across the template ---------------- */
window.BRAND.waLink = function (text) {
  var t = encodeURIComponent(text || "");
  return "https://wa.me/" + window.BRAND.whatsapp + (t ? "?text=" + t : "");
};

window.BRAND.igLink = function () {
  return "https://instagram.com/" + window.BRAND.instagram;
};

window.BRAND.money = function (n) {
  return window.BRAND.currencySymbol + Number(n).toLocaleString("en-US");
};

window.BRAND.showsMascot = function (page) {
  return !!(window.BRAND.features.mascot && window.BRAND.mascotZones[page]);
};
