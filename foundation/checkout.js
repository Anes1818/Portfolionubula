/*
 * checkout.js — US checkout validation + order summary for ROBUSTE Appliances
 * --------------------------------------------------------------------------
 * WHY THIS EXISTS
 * The original checkout assumed Algeria: an Algerian phone regex
 * (/^0[5-7][0-9]{8}$/), a hardcoded list of 58 wilayas, no email, no postal
 * code, no shipping method, no tax. None of that works for a US shopper.
 *
 * This module replaces those local assumptions with a US address model and
 * computes the real money math (subtotal -> shipping -> tax -> total) by
 * reusing the single source of truth in store.config.js. It is framework-free
 * and runs in the browser AND in Node (for tests).
 *
 * TEACHING THEME: validation is about giving SPECIFIC, FIELD-LEVEL feedback,
 * and normalization is about storing data in ONE canonical shape (E.164 phone,
 * uppercased state, trimmed ZIP) no matter how the user typed it.
 */
(function (root) {
	"use strict";

	// 50 states + DC. The address dropdown is driven by DATA, not hardcoded
	// like the old wilayas[] array — swapping markets becomes a config change.
	var US_STATES = {
		AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
		CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",
		HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",
		LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
		MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
		NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
		OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
		SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",
		WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
	};

	function cfg() { return root.StoreConfig || (typeof globalThis !== "undefined" && globalThis.StoreConfig) || null; }

	// ---- field validators --------------------------------------------------

	// Pragmatic email check: exactly one @, a dot in the domain, no spaces.
	// (Real deliverability is confirmed by sending mail, not by regex.)
	function isValidEmail(s) {
		if (typeof s !== "string") return false;
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
	}

	function isValidState(code) {
		return !!US_STATES[String(code || "").toUpperCase()];
	}

	// US ZIP: 5 digits, optionally ZIP+4 (12345 or 12345-6789).
	function isValidZip(s) {
		return /^\d{5}(-\d{4})?$/.test(String(s || "").trim());
	}

	// Normalize a US phone to E.164 (+1XXXXXXXXXX), the canonical storage format.
	// Accepts "(415) 555-2671", "415-555-2671", "+1 415 555 2671", "14155552671".
	// Returns null if it cannot be a valid US number.
	function normalizePhoneUS(s) {
		var digits = String(s || "").replace(/[^\d]/g, "");
		if (digits.length === 11 && digits[0] === "1") digits = digits.slice(1);
		if (digits.length !== 10) return null;
		// US area codes & exchange codes never start with 0 or 1.
		if (/[01]/.test(digits[0]) || /[01]/.test(digits[3])) return null;
		return "+1" + digits;
	}

	function nonEmpty(s) { return typeof s === "string" && s.trim().length > 0; }

	// ---- address validation ------------------------------------------------
	// Returns { valid, errors } where errors is a per-field map. Field-level
	// errors are what let a UI highlight the exact input that needs fixing.
	function validateAddress(a) {
		a = a || {};
		var errors = {};
		if (!nonEmpty(a.fullName)) errors.fullName = "Full name is required.";
		if (!isValidEmail(a.email)) errors.email = "Enter a valid email address.";
		if (!normalizePhoneUS(a.phone)) errors.phone = "Enter a valid US phone number.";
		if (!nonEmpty(a.address1)) errors.address1 = "Street address is required.";
		if (!nonEmpty(a.city)) errors.city = "City is required.";
		if (!isValidState(a.state)) errors.state = "Choose a valid US state.";
		if (!isValidZip(a.zip)) errors.zip = "Enter a valid ZIP (e.g. 10001 or 10001-2345).";
		return { valid: Object.keys(errors).length === 0, errors: errors };
	}

	// Canonical record: store data in ONE shape regardless of input formatting.
	function normalizeAddress(a) {
		a = a || {};
		return {
			fullName: String(a.fullName || "").trim(),
			email: String(a.email || "").trim().toLowerCase(),
			phone: normalizePhoneUS(a.phone),
			address1: String(a.address1 || "").trim(),
			address2: String(a.address2 || "").trim(),
			city: String(a.city || "").trim(),
			state: String(a.state || "").toUpperCase(),
			stateName: US_STATES[String(a.state || "").toUpperCase()] || "",
			zip: String(a.zip || "").trim(),
			country: "US"
		};
	}

	// ---- order summary (the money math) ------------------------------------
	// subtotal -> shipping (by method, free over threshold) -> tax (by state,
	// exclusive/added at checkout, the US convention) -> total. All numbers come
	// from store.config.js so there is exactly one place rates ever change.
	function buildOrderSummary(opts) {
		opts = opts || {};
		var c = cfg();
		var subtotal = Number(opts.subtotal) || 0;
		var method = opts.method || (c && c.fulfillment && c.fulfillment.methods[0] && c.fulfillment.methods[0].id);
		var state = String(opts.state || "").toUpperCase();
		var shipping = c ? c.shippingFee(method, subtotal) : 0;
		var taxRate = c ? c.taxRateForState(state) : 0;
		var taxableBase = subtotal + shipping; // many US states tax shipping too; configurable later
		var tax = Math.round(taxRate * subtotal * 100) / 100; // tax on goods (common default)
		var total = Math.round((subtotal + shipping + tax) * 100) / 100;
		return {
			currency: (c && c.baseCurrency) || "USD",
			subtotal: subtotal,
			method: method,
			shipping: shipping,
			freeShipping: shipping === 0 && subtotal > 0,
			taxRate: taxRate,
			tax: tax,
			taxableBase: taxableBase,
			total: total
		};
	}

	// ---- full checkout validation -----------------------------------------
	// Validates the buyer address, an optional separate shipping recipient
	// (gift orders: recipient ≠ buyer), and the chosen shipping method; then
	// returns the order summary so the UI can show the final total.
	function validateCheckout(form) {
		form = form || {};
		var billing = validateAddress(form.billing);
		var result = { valid: billing.valid, errors: { billing: billing.errors } };

		if (form.shipToDifferent) {
			var shipping = validateAddress(form.shipping);
			result.errors.shipping = shipping.errors;
			if (!shipping.valid) result.valid = false;
		}

		var c = cfg();
		var methodIds = c ? c.fulfillment.methods.map(function (m) { return m.id; }) : [];
		if (methodIds.length && methodIds.indexOf(form.method) === -1) {
			result.errors.method = "Choose a shipping method.";
			result.valid = false;
		}

		var destState = form.shipToDifferent ? (form.shipping && form.shipping.state) : (form.billing && form.billing.state);
		result.summary = buildOrderSummary({ subtotal: form.subtotal, method: form.method, state: destState });
		return result;
	}

	var Checkout = {
		US_STATES: US_STATES,
		isValidEmail: isValidEmail,
		isValidState: isValidState,
		isValidZip: isValidZip,
		normalizePhoneUS: normalizePhoneUS,
		validateAddress: validateAddress,
		normalizeAddress: normalizeAddress,
		buildOrderSummary: buildOrderSummary,
		validateCheckout: validateCheckout
	};

	root.Checkout = Checkout;
	if (typeof module !== "undefined" && module.exports) module.exports = Checkout;
})(typeof window !== "undefined" ? window : globalThis);
