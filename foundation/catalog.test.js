/* catalog.test.js — proves the variant model in plain Node (no browser). */
const Catalog = require("./catalog.js");
const assert = require("assert");
const product = require("./catalog.sample.json");

let pass = 0;
function ok(label, cond) { assert.ok(cond, "FAIL: " + label); pass++; }

// 1) stock states map quantity -> meaning
ok("0 -> out_of_stock", Catalog.stockState(0) === "out_of_stock");
ok("3 -> low_stock", Catalog.stockState(3) === "low_stock");
ok("12 -> in_stock", Catalog.stockState(12) === "in_stock");

// 2) variant lookup is order-independent
const v1 = Catalog.findVariant(product, { Color: "Black", Power: "1000W" });
const v2 = Catalog.findVariant(product, { Power: "1000W", Color: "Black" });
ok("variant found", v1 && v1.sku === "MIX-BLK-1000");
ok("option order does not matter", v1 === v2);

// 3) price = base + variant delta
ok("base price", Catalog.priceFor(product, Catalog.findVariant(product, { Color: "Black", Power: "600W" })) === 199);
ok("delta applied", Catalog.priceFor(product, v1) === 239);

// 4) image resolves to the variant's own image
ok("variant image", Catalog.imageFor(product, Catalog.findVariant(product, { Color: "White", Power: "600W" })) === "images/mixer-white.jpg");

// 5) availability + default selection skips sold-out combos
ok("white/600 sold out", !Catalog.isAvailable(Catalog.findVariant(product, { Color: "White", Power: "600W" })));
const def = Catalog.defaultSelection(product);
ok("default lands on in-stock variant", Catalog.isAvailable(Catalog.findVariant(product, def)));

// 6) build-time matrix generation (Cartesian product)
const matrix = Catalog.generateVariants(product.options, { skuPrefix: "MIX", stock: 0 });
ok("3 colors x 2 powers = 6 variants", matrix.length === 6);

// 7) MIGRATION: every legacy product upgrades to a valid 1-variant product
const legacy = require("../products.json");
let migrated = 0, totalStock = 0;
legacy.forEach((p) => {
  const np = Catalog.normalizeLegacy(p);
  assert.ok(np.variants.length === 1, "legacy must yield exactly 1 variant: " + p.id);
  assert.ok(np.basePrice === Number(p.price), "price preserved: " + p.id);
  assert.ok(np.variants[0].stock === Number(p.stock), "stock preserved: " + p.id);
  migrated++; totalStock += np.variants[0].stock;
});
ok("all 32 legacy products migrate cleanly", migrated === 32);

console.log(`catalog.test PASSED — ${pass} assertions; migrated ${migrated}/32 legacy products (combined stock ${totalStock} units).`);
