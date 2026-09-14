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
  name:       "Ramos by Julia",
  legalName:  "Ramos by Julia",
  tagline: {
    en: "Luxury Ramos Buchones & Floral Artistry",
    es: "Ramos Buchones y Arreglos Florales Hechos a Mano"
  },
  logo:     "assets/logo/julia-full-badge.png",      // full lockup, header / footer
  logoMark: "assets/logo/butterfly-circle.png",       // square only, favicon / stamp
  mascot:   "",

  /* ---------- market ---------------------------------------- */
  city:  "Gresham & Rockwood, Oregon",
  areas: ["Gresham", "Rockwood", "Portland", "Troutdale"],
  region: "Oregon",
  languages:   ["en", "es"],
  defaultLang: "en",
  currency:       "USD",
  currencySymbol: "$",

  /* ---------- contact — REPLACE BEFORE LAUNCH --------------- */
  whatsapp:  "15035550100",        // digits only, country code first
  phone:     "(503) 555-0100",
  instagram: "ramos_by_juliaaa",      // handle without the @
  email:     "ramosbyjulia@gmail.com",
  domain:    "ramosbyjulia.com",

  /* ---------- operations ------------------------------------ */
  pickupOnly: true,
  pickupLocation: "Gresham / Rockwood, Oregon",
  noticeRose: "3-4 days in advance",
  noticeEternal: "2 weeks in advance",
  cutoffLabel: {
    en: "Pick up in Gresham/Rockwood · Fresh: 3-4 days notice · Eternal: 2 weeks notice",
    es: "Retiro en Gresham/Rockwood · Rosas frescas: 3-4 días · Rosas eternas: 2 semanas"
  },
  payments: ["Zelle", "Cash App"],
  deliveryFee: 0,
  freeDeliveryOver: 0,

  /* ---------- feature flags --------------------------------- */
  /* Flip a flag, the whole site adapts. showcase mode hides money. */
  features: {
    builder:        true,
    seasons:        true,
    mascot:         false,  // clean luxury focus
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
