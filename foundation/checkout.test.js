/* checkout.test.js — proves US checkout validation + money math in Node. */
require("./store.config.js"); // populates globalThis.StoreConfig
const Checkout = require("./checkout.js");
const assert = require("assert");

let pass = 0;
function ok(label, cond) { assert.ok(cond, "FAIL: " + label); pass++; }

// 1) email
ok("good email", Checkout.isValidEmail("anes@example.com"));
ok("reject no-domain", !Checkout.isValidEmail("anes@localhost"));
ok("reject spaces", !Checkout.isValidEmail("a b@x.com"));

// 2) ZIP
ok("5-digit zip", Checkout.isValidZip("10001"));
ok("zip+4", Checkout.isValidZip("10001-2345"));
ok("reject 4-digit", !Checkout.isValidZip("1000"));

// 3) state
ok("valid state NY", Checkout.isValidState("ny"));
ok("reject DZ (Algeria leftover)", !Checkout.isValidState("DZ"));

// 4) phone normalization to E.164
ok("formats US phone", Checkout.normalizePhoneUS("(415) 555-2671") === "+14155552671");
ok("strips leading 1", Checkout.normalizePhoneUS("1 415 555 2671") === "+14155552671");
ok("reject Algerian 0550...", Checkout.normalizePhoneUS("0550123456") === null);
ok("reject area code starting 0", Checkout.normalizePhoneUS("055 555 2671") === null);

// 5) address validation gives field-level errors
const bad = Checkout.validateAddress({ fullName: "", email: "nope", phone: "123", address1: "", city: "", state: "DZ", zip: "99" });
ok("invalid address flagged", !bad.valid);
ok("per-field errors present", bad.errors.email && bad.errors.phone && bad.errors.state && bad.errors.zip);

const good = Checkout.validateAddress({ fullName: "Anes K", email: "anes@example.com", phone: "(212) 555-0142", address1: "5 Main St", city: "New York", state: "NY", zip: "10001" });
ok("valid address passes", good.valid);

// 6) normalization canonicalizes the record
const norm = Checkout.normalizeAddress({ email: "  ANES@EXAMPLE.COM ", phone: "212.555.0142", state: "ny", zip: " 10001 " });
ok("email lowercased+trimmed", norm.email === "anes@example.com");
ok("phone E.164", norm.phone === "+12125550142");
ok("state uppercased + name", norm.state === "NY" && norm.stateName === "New York");
ok("country stamped US", norm.country === "US");

// 7) order summary: subtotal -> shipping -> tax -> total
const s1 = Checkout.buildOrderSummary({ subtotal: 50, method: "standard", state: "NY" });
ok("shipping $6.99", s1.shipping === 6.99);
ok("NY tax on $50 = $4.44", s1.tax === 4.44);
ok("total = 50+6.99+4.44", s1.total === 61.43);

const s2 = Checkout.buildOrderSummary({ subtotal: 120, method: "standard", state: "OR" });
ok("free shipping over $99", s2.shipping === 0 && s2.freeShipping);
ok("OR has no sales tax", s2.tax === 0);

// 8) full checkout incl. gift recipient (recipient != buyer)
const full = Checkout.validateCheckout({
  billing: { fullName: "Anes K", email: "anes@example.com", phone: "2125550142", address1: "5 Main St", city: "NYC", state: "NY", zip: "10001" },
  shipToDifferent: true,
  shipping: { fullName: "Sam R", email: "sam@example.com", phone: "3105550199", address1: "9 Sunset Blvd", city: "LA", state: "CA", zip: "90028" },
  method: "express", subtotal: 80
});
ok("gift order valid", full.valid);
ok("tax uses RECIPIENT state (CA), not buyer (NY)", full.summary.taxRate === Checkout.buildOrderSummary({subtotal:80,method:'express',state:'CA'}).taxRate);

console.log(`checkout.test PASSED — ${pass} assertions (email, ZIP, state, E.164 phone, field errors, normalization, money math, gift orders).`);
