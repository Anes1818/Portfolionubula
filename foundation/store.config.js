/*
 * store.config.js — SINGLE SOURCE OF TRUTH for store-wide settings
 * ----------------------------------------------------------------
 * WHY THIS EXISTS:
 *   Your old code hardcoded "Algeria" in many places (the wilaya list, the
 *   phone regex, the د.ج currency). When rules live in many files, changing
 *   markets means hunting through thousands of lines. The professional pattern
 *   is to put every market rule in ONE config object that the rest of the app
 *   reads from. Want to support Canada tomorrow? You edit one file.
 *
 *   This config keeps your store as a HOME-APPLIANCE shop, tuned US-first
 *   (your portfolio + learning target). International shipping is intentionally
 *   OFF — it's "explained only" in the case study, not implemented.
 */
(function (global) {
  'use strict';

  var StoreConfig = {
    name: 'ROBUSTE Appliances',
    market: 'US',
    baseCurrency: 'USD',
    defaultLocale: 'en-US',

    // Capability demo: we CAN switch language/currency, but default to US.
    supportedLocales: ['en-US', 'fr-FR', 'ar-DZ'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],

    // US DOMESTIC shipping only. International stays out of scope (explained
    // in the case study). Real stores compute rates by weight/zone/carrier;
    // this flat-method model is the honest "portfolio simulation".
    fulfillment: {
      domesticShipping: true,
      internationalShipping: false,
      freeShippingOver: 99,           // free standard shipping over $99
      methods: [
        { id: 'standard', label: 'Standard (3\u20135 business days)', fee: 6.99,  etaDays: '3\u20135' },
        { id: 'express',  label: 'Express (1\u20132 business days)',  fee: 19.99, etaDays: '1\u20132' }
      ]
    },

    // US sales tax is DESTINATION-based and added at checkout (tax-exclusive
    // display). Simplified demo rates by state.
    salesTax: {
      mode: 'exclusive',
      ratesByState: {
        CA: 0.0725, NY: 0.08875, TX: 0.0625,
        FL: 0.06, WA: 0.065, IL: 0.0625
      },
      default: 0.0
    },

    // Appliance VARIANT axes. The combinations of these option values are the
    // "variants" — and stock/SKU/price live on each variant (see Phase 5).
    variantOptions: [
      { name: 'Color', values: ['Black', 'White', 'Magenta'] },
      { name: 'Power', values: ['1800W', '2000W'] }
    ]
  };

  // US sales-tax rate for a state code (e.g. 'NY'); falls back to default.
  function taxRateForState(state) {
    var r = StoreConfig.salesTax.ratesByState[String(state || '').toUpperCase()];
    return (r != null) ? r : StoreConfig.salesTax.default;
  }

  // Shipping fee for a chosen method + order subtotal (free over threshold).
  function shippingFee(methodId, subtotal) {
    if (subtotal >= StoreConfig.fulfillment.freeShippingOver) return 0;
    var m = StoreConfig.fulfillment.methods.filter(function (x) { return x.id === methodId; })[0];
    return m ? m.fee : 0;
  }

  StoreConfig.taxRateForState = taxRateForState;
  StoreConfig.shippingFee = shippingFee;

  global.StoreConfig = StoreConfig;
})(typeof window !== 'undefined' ? window : globalThis);
