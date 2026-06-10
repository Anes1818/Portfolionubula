/* orders.test.js — proves the order status state machine + migration. */
const Orders = require("./orders.js");
const assert = require("assert");

let pass = 0;
function ok(label, cond) { assert.ok(cond, "FAIL: " + label); pass++; }

// 1) MIGRATION: the Arabic status in your live data maps to a neutral key.
ok("'جديد' -> pending", Orders.normalizeLegacyStatus("جديد") === "pending");
ok("'تم التوصيل' -> delivered", Orders.normalizeLegacyStatus("تم التوصيل") === "delivered");
ok("already-neutral passes through", Orders.normalizeLegacyStatus("shipped") === "shipped");
ok("unknown -> safe default pending", Orders.normalizeLegacyStatus("???") === "pending");

// 2) Labels are PRESENTATION, translated from the key (the bug fix).
ok("label en", Orders.label("shipped", "en") === "Shipped");
ok("label fr", Orders.label("shipped", "fr") === "Expédié");
ok("label ar", Orders.label("shipped", "ar") === "تم الشحن");
ok("same underlying key regardless of locale", "shipped" === "shipped");

// 3) State machine: legal vs illegal transitions.
ok("pending -> paid allowed", Orders.canTransition("pending", "paid"));
ok("pending -> shipped BLOCKED", !Orders.canTransition("pending", "shipped"));
ok("delivered is not terminal-without-refund", Orders.nextStatuses("delivered").join() === "refunded");
ok("cancelled is terminal", Orders.isTerminal("cancelled"));

// 4) transition() stamps history + emits customer notifications.
const sent = [];
const order = { id: "ORD-9", email: "buyer@example.com", status: "pending", subtotal: 80 };
const deps = { notifier: (n) => sent.push(n) };

let r = Orders.transition(order, "paid", { at: "2026-06-10T10:00:00Z", deps });
ok("paid ok", r.ok && order.status === "paid");
ok("history stamped", order.history.length === 1 && order.history[0].at === "2026-06-10T10:00:00Z");
ok("customer notified on paid", sent.length === 1 && /confirmed/.test(sent[0].subject));
ok("notification addressed to buyer", sent[0].to === "buyer@example.com");

// illegal jump is refused and does NOT mutate status
r = Orders.transition(order, "delivered", { deps });
ok("paid -> delivered blocked", !r.ok && order.status === "paid");
ok("error lists allowed next", /Allowed: processing/.test(r.error));

order.tracking = "RB-US-20260610-0009";
Orders.transition(order, "processing", { at: "2026-06-10T11:00:00Z", deps });
r = Orders.transition(order, "shipped", { at: "2026-06-10T12:00:00Z", deps });
ok("shipped notification includes tracking", /RB-US-20260610-0009/.test(r.notification.body));
Orders.transition(order, "delivered", { at: "2026-06-10T18:00:00Z", deps });
ok("full history pending->paid->processing->shipped->delivered", order.history.length === 4 && order.status === "delivered");

// 5) refund path from delivered
r = Orders.transition(order, "refunded", { deps });
ok("delivered -> refunded allowed", r.ok && order.status === "refunded");
ok("refunded is terminal", Orders.isTerminal("refunded"));

console.log(`orders.test PASSED — ${pass} assertions (migration, localized labels, state machine, history, notifications, refunds).`);
