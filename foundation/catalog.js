/*
 * catalog.js — variant-aware product model for ROBUSTE Appliances
 * --------------------------------------------------------------
 * WHY THIS EXISTS
 * The original products.json is FLAT: one product = one price = one `stock`
 * number = one shared images[] array. Real appliance stores cannot work that
 * way. A "Stand Mixer" is one PRODUCT, but the thing a customer actually buys,
 * that you stock in a warehouse, and that you ship, is a specific VARIANT:
 *   Stand Mixer · Color = Black · Power = 1200W  -> its own SKU, stock, image.
 *
 * THE GOLDEN RULE OF CATALOGS:  Product = marketing.  Variant (SKU) = inventory.
 * You market the product; you sell, count, and ship the variant.
 *
 * This module is framework-free and runs in the browser AND in Node (for tests).
 */
(function (root) {
	"use strict";

	var LOW_STOCK_THRESHOLD = 5;

	// ---- stock state -------------------------------------------------------
	// Real stores never show a raw number alone; they map quantity to a STATE,
	// because "3 left" drives urgency while "0" must block checkout.
	function stockState(qty, lowThreshold) {
		var low = typeof lowThreshold === "number" ? lowThreshold : LOW_STOCK_THRESHOLD;
		var n = Number(qty) || 0;
		if (n <= 0) return "out_of_stock";
		if (n <= low) return "low_stock";
		return "in_stock";
	}
	function isAvailable(variant) {
		return !!variant && (Number(variant.stock) || 0) > 0;
	}

	// ---- variant identity --------------------------------------------------
	// A variant is uniquely identified by its chosen option VALUES. We build a
	// stable key (order-independent) so selecting {Color:Black, Power:1200W} and
	// {Power:1200W, Color:Black} resolve to the same SKU.
	function variantKey(optionsObj) {
		return Object.keys(optionsObj || {})
			.sort()
			.map(function (k) { return k + "=" + optionsObj[k]; })
			.join("|");
	}

	function findVariant(product, selected) {
		if (!product || !Array.isArray(product.variants)) return null;
		var wantKey = variantKey(selected);
		for (var i = 0; i < product.variants.length; i++) {
			if (variantKey(product.variants[i].options) === wantKey) {
				return product.variants[i];
			}
		}
		return null;
	}

	// ---- price & image resolution -----------------------------------------
	// Price lives on the product as a base, and each variant carries a DELTA
	// (e.g. the high-power motor costs more). This avoids repeating the full
	// price on every SKU and makes a global price change a one-line edit.
	function priceFor(product, variant) {
		var base = Number(product && product.basePrice) || 0;
		var delta = Number(variant && variant.priceDelta) || 0;
		return base + delta;
	}
	// A variant may have its own image (the Black unit vs the White unit);
	// otherwise fall back to the product's first gallery image.
	function imageFor(product, variant) {
		if (variant && variant.image) return variant.image;
		return (product && product.images && product.images[0]) || "";
	}

	// ---- default selection -------------------------------------------------
	// Pick the first IN-STOCK variant so the product page never opens on a
	// sold-out combination. Falls back to the first variant if all are out.
	function defaultSelection(product) {
		if (!product || !Array.isArray(product.variants) || !product.variants.length) return {};
		for (var i = 0; i < product.variants.length; i++) {
			if (isAvailable(product.variants[i])) return clone(product.variants[i].options);
		}
		return clone(product.variants[0].options);
	}

	// ---- build-time helper: generate the variant matrix --------------------
	// Given option types, produce every combination (Cartesian product). This is
	// how an admin tool would scaffold SKUs, which you then enrich with stock/img.
	function generateVariants(options, defaults) {
		options = options || [];
		var combos = [{}];
		options.forEach(function (opt) {
			var next = [];
			combos.forEach(function (combo) {
				(opt.values || []).forEach(function (val) {
					var merged = clone(combo);
					merged[opt.name] = val;
					next.push(merged);
				});
			});
			combos = next;
		});
		return combos.map(function (optionsObj, idx) {
			return {
				sku: (defaults && defaults.skuPrefix ? defaults.skuPrefix : "SKU") + "-" + (idx + 1),
				options: optionsObj,
				priceDelta: 0,
				stock: defaults && typeof defaults.stock === "number" ? defaults.stock : 0,
				image: ""
			};
		});
	}

	// ---- back-compat: upgrade a legacy flat product ------------------------
	// CRITICAL for migration: we must not break the existing 32 products. Any
	// old { id, title, price, stock, images[] } becomes a valid variant-aware
	// product with exactly ONE default variant. New + old can coexist.
	function normalizeLegacy(p) {
		if (!p) return null;
		if (Array.isArray(p.variants) && p.variants.length) return p; // already new model
		return {
			id: p.id,
			title: p.title,
			category: p.category || "",
			basePrice: Number(p.price) || 0,
			oldPrice: Number(p.old_price) || null,
			images: Array.isArray(p.images) ? p.images.slice() : [],
			description_short: p.description_short || "",
			description_long: p.description_long || "",
			features: Array.isArray(p.features) ? p.features.slice() : [],
			badge: p.badge || "",
			options: [],
			variants: [{
				sku: "LEGACY-" + p.id,
				options: {},
				priceDelta: 0,
				stock: Number(p.stock) || 0,
				image: (p.images && p.images[0]) || ""
			}]
		};
	}

	function clone(o) { return JSON.parse(JSON.stringify(o)); }

	var Catalog = {
		LOW_STOCK_THRESHOLD: LOW_STOCK_THRESHOLD,
		stockState: stockState,
		isAvailable: isAvailable,
		variantKey: variantKey,
		findVariant: findVariant,
		priceFor: priceFor,
		imageFor: imageFor,
		defaultSelection: defaultSelection,
		generateVariants: generateVariants,
		normalizeLegacy: normalizeLegacy
	};

	root.Catalog = Catalog;
	if (typeof module !== "undefined" && module.exports) module.exports = Catalog;
})(typeof window !== "undefined" ? window : globalThis);
