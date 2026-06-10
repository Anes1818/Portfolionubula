"use strict";
/*
 * load-lib.js — load the SHARED business logic the storefront already uses.
 * ------------------------------------------------------------------------
 * The exact same money/validation/status code runs in the browser AND here on
 * the server. That is the whole point of putting it in lib/: one source of
 * truth, zero drift between what the customer sees and what we charge.
 *
 * Load order matters because the files attach themselves to globalThis:
 *   store.config.js  -> globalThis.StoreConfig
 *   checkout.js      -> reads StoreConfig, sets globalThis.Checkout
 *   orders.js        -> globalThis.Orders
 *   payments.js      -> reads Checkout, sets globalThis.Payments
 *
 * `npm run sync-lib` copies ../lib into ./lib before deploy, because Firebase
 * only uploads files inside the functions/ folder. lib/ stays the source of
 * truth; this is just a deploy-time copy.
 */
require("./lib/store.config.js");
require("./lib/checkout.js");
require("./lib/orders.js");
require("./lib/payments.js");

module.exports = {
	StoreConfig: globalThis.StoreConfig,
	Checkout: globalThis.Checkout,
	Orders: globalThis.Orders,
	Payments: globalThis.Payments,
};
