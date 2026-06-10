/*
 * orders.js — order status state machine for ROBUSTE Appliances
 * -------------------------------------------------------------
 * THE BUG THIS FIXES
 * Today an order's status is the Arabic STRING 'جديد' baked into Firestore.
 * That means your DATA is in one language: an English/French admin can't filter
 * it, analytics can't group it, and adding a market breaks reporting.
 *
 * THE RULE: store a stable, language-neutral KEY ('pending', 'shipped', …).
 * The UI translates the key at display time. Data = keys; labels = presentation.
 *
 * It also enforces a STATE MACHINE: you can't ship an order that was never paid.
 * Illegal jumps are a real source of support tickets and fraud; the machine
 * makes them impossible. Framework-free; runs in browser + Node (for tests).
 */
(function (root) {
	"use strict";

	// The only valid status keys. NEVER store anything else.
	var STATUS = {
		PENDING: "pending",
		PAID: "paid",
		PROCESSING: "processing",
		SHIPPED: "shipped",
		DELIVERED: "delivered",
		CANCELLED: "cancelled",
		REFUNDED: "refunded"
	};

	// The state machine: from -> [allowed next]. Terminal states have [].
	var TRANSITIONS = {
		pending: ["paid", "cancelled"],
		paid: ["processing", "refunded", "cancelled"],
		processing: ["shipped", "cancelled"],
		shipped: ["delivered"],
		delivered: ["refunded"],
		cancelled: [],
		refunded: []
	};

	// Presentation only: labels per locale + a UI color. Add a market by adding
	// a column here — the data and logic never change.
	var META = {
		pending:    { color: "amber",  labels: { en: "Pending",    fr: "En attente",     ar: "قيد الانتظار" } },
		paid:       { color: "blue",   labels: { en: "Paid",       fr: "Payé",            ar: "مدفوع" } },
		processing: { color: "purple", labels: { en: "Processing", fr: "En préparation",   ar: "قيد التجهيز" } },
		shipped:    { color: "teal",   labels: { en: "Shipped",    fr: "Expédié",          ar: "تم الشحن" } },
		delivered:  { color: "green",  labels: { en: "Delivered",  fr: "Livré",            ar: "تم التوصيل" } },
		cancelled:  { color: "red",    labels: { en: "Cancelled",  fr: "Annulé",           ar: "ملغى" } },
		refunded:   { color: "orange", labels: { en: "Refunded",   fr: "Remboursé",        ar: "مسترجع" } }
	};

	// Which transitions the CUSTOMER should hear about, + message templates.
	// (Today only the OWNER is notified; international buyers expect updates too.)
	var CUSTOMER_NOTIFY = {
		paid:      function (o) { return { subject: "Order " + o.id + " confirmed", body: "Thanks! We’ve received your payment and your order is confirmed." }; },
		shipped:   function (o) { return { subject: "Order " + o.id + " shipped", body: "Your order is on its way" + (o.tracking ? " — tracking " + o.tracking : "") + "." }; },
		delivered: function (o) { return { subject: "Order " + o.id + " delivered", body: "Your order was delivered. Enjoy!" }; },
		cancelled: function (o) { return { subject: "Order " + o.id + " cancelled", body: "Your order has been cancelled. Any charge will be reversed." }; },
		refunded:  function (o) { return { subject: "Order " + o.id + " refunded", body: "Your refund has been processed and should appear in 5–10 days." }; }
	};

	// Map legacy/Arabic statuses (or anything unknown) to a neutral key.
	// This is the migration that un-breaks your existing Firestore orders.
	var LEGACY = {
		"جديد": "pending", "new": "pending",
		"مدفوع": "paid", "paid": "paid",
		"قيد التجهيز": "processing", "قيد المعالجة": "processing",
		"تم الشحن": "shipped",
		"تم التوصيل": "delivered", "تم التسليم": "delivered",
		"ملغى": "cancelled", "ملغي": "cancelled",
		"مسترجع": "refunded", "تم الاسترجاع": "refunded"
	};
	function normalizeLegacyStatus(s) {
		var key = String(s || "").trim();
		if (TRANSITIONS.hasOwnProperty(key)) return key;        // already neutral
		if (LEGACY.hasOwnProperty(key)) return LEGACY[key];     // known legacy
		return "pending";                                       // safe default
	}

	function isValidStatus(s) { return TRANSITIONS.hasOwnProperty(s); }
	function nextStatuses(s) { return (TRANSITIONS[s] || []).slice(); }
	function isTerminal(s) { return isValidStatus(s) && TRANSITIONS[s].length === 0; }
	function canTransition(from, to) { return (TRANSITIONS[from] || []).indexOf(to) !== -1; }
	function label(s, locale) { var m = META[s]; return m ? (m.labels[locale] || m.labels.en) : s; }
	function color(s) { return META[s] ? META[s].color : "gray"; }

	// Apply a transition: validates, stamps history, emits a customer
	// notification when relevant. Returns { ok, order, notification, error }.
	// Pure-ish: mutates+returns the passed order (append history); inject `at`
	// for deterministic tests and `deps.notifier` to actually send.
	function transition(order, to, opts) {
		opts = opts || {};
		var from = order.status;
		if (!isValidStatus(to)) return { ok: false, order: order, error: "Unknown status: " + to };
		if (!canTransition(from, to)) {
			return { ok: false, order: order, error: "Illegal transition " + from + " → " + to + ". Allowed: " + (nextStatuses(from).join(", ") || "(none)") };
		}
		var at = opts.at || new Date().toISOString();
		order.status = to;
		order.history = order.history || [];
		order.history.push({ status: to, at: at, by: opts.by || "system" });

		var notification = null;
		if (CUSTOMER_NOTIFY[to]) {
			notification = CUSTOMER_NOTIFY[to](order);
			notification.to = order.email || null;
			if (opts.deps && typeof opts.deps.notifier === "function") opts.deps.notifier(notification);
		}
		return { ok: true, order: order, notification: notification };
	}

	var Orders = {
		STATUS: STATUS,
		TRANSITIONS: TRANSITIONS,
		META: META,
		isValidStatus: isValidStatus,
		nextStatuses: nextStatuses,
		isTerminal: isTerminal,
		canTransition: canTransition,
		label: label,
		color: color,
		normalizeLegacyStatus: normalizeLegacyStatus,
		transition: transition
	};

	root.Orders = Orders;
	if (typeof module !== "undefined" && module.exports) module.exports = Orders;
})(typeof window !== "undefined" ? window : globalThis);
