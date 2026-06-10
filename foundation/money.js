/*
 * money.js — the store's money "brain" (FOUNDATION MODULE)
 * --------------------------------------------------------
 * WHY THIS EXISTS:
 *   Your old site "translated" currency by doing a text swap: د.ج -> DA.
 *   That changes the *label* but not the *value* — a $ shopper still saw
 *   an Algerian number. Real stores never do that. They:
 *     1) store ONE base price (here: USD),
 *     2) convert it to the viewer's currency using exchange rates,
 *     3) FORMAT it with the browser's built-in Intl.NumberFormat, which
 *        knows symbol placement, decimals, and thousands separators per locale.
 *
 * This module is framework-free and works in the browser AND in Node
 * (so we can unit-test it without a browser).
 */
(function (global) {
  'use strict';

  // The currency your catalog prices are authored in.
  var BASE = 'USD';

  // DEMO exchange rates: "1 USD = X target". In production these come from a
  // live FX API (e.g. exchangerate.host) refreshed on a schedule. Hardcoding
  // them is fine for a portfolio demo — just label them clearly as demo data.
  var FX = { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52, DZD: 135 };

  // A sensible default locale per currency, so formatting looks native.
  var LOCALE = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
    CAD: 'en-CA', AUD: 'en-AU', DZD: 'ar-DZ'
  };

  // Convert an amount from BASE currency into `to`.
  function convert(amount, to) {
    to = to || BASE;
    var rate = (FX[to] != null) ? FX[to] : 1;
    return amount * rate;
  }

  // Format a number that is ALREADY in `currency`.
  function format(amount, currency, locale) {
    currency = currency || BASE;
    locale = locale || LOCALE[currency] || 'en-US';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (e) {
      // Fallback if the runtime lacks full Intl support.
      return amount.toFixed(2) + ' ' + currency;
    }
  }

  // The convenient one: take a BASE-currency price and show it in `currency`.
  // Example: price(49.99, 'EUR') -> "45,99 \u20ac"
  function price(baseAmount, currency, locale) {
    return format(convert(baseAmount, currency), currency, locale);
  }

  global.Money = {
    BASE: BASE,
    FX: FX,
    LOCALE: LOCALE,
    convert: convert,
    format: format,
    price: price
  };
})(typeof window !== 'undefined' ? window : globalThis);
