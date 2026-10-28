/* Server/browser policy parity uses the renderer's existing semantic model. */
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
const clone = (value) => JSON.parse(JSON.stringify(value));
(async () => {
  const { normalizePolicy, validateDesign, priceDesign, mapDesignIds } =
    await import("../../platform/shared/policy.mjs");
  const { createRuntime } = await import("../../platform/shared/runtime.mjs");
  const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "platform/public/catalog.json")),
  );
  assert.equal(catalog.version, 2);
  assert.equal(
    catalog.flowers.filter((row) => row.preset === "fresh").length,
    44,
  );
  assert.equal(
    catalog.extras.filter((row) => row.preset === "fresh").length,
    22,
  );
  assert.equal(
    catalog.recipes.filter((row) => row.preset === "fresh").length,
    15,
  );
  assert.equal(
    catalog.recipes.filter((row) => row.preset === "satin").length,
    6,
  );
  for (const recipe of catalog.recipes) {
    const draft = { preset: recipe.preset, currency: "USD" };
    const checked = validateDesign(recipe.design, draft, catalog, {
      allowUnpriced: true,
    });
    assert.equal(
      checked.ok,
      true,
      recipe.id + ": " + JSON.stringify(checked.issues),
    );
    const normalized = normalizePolicy(draft, catalog).policy;
    for (const key of ["flowerPrices", "extrasCents"])
      for (const id of Object.keys(normalized[key]))
        normalized[key][id] ??= 317;
    const priced = priceDesign(recipe.design, normalized, catalog);
    assert.equal(priced.ok, true, recipe.id);
    const runtime = createRuntime(recipe.preset),
      raw = mapDesignIds(recipe.design, catalog, recipe.preset);
    runtime.CONFIG.currency = "USD";
    runtime.CONFIG.baseCents = 0;
    runtime.CONFIG.laborCents = { classic: 0, dome: 0, heart: 0 };
    for (const row of catalog.flowers.filter(
      (row) => row.preset === recipe.preset,
    ))
      runtime.CAT[row.runtimeId || row.id].priceCents =
        normalized.flowerPrices[row.id];
    for (const row of catalog.extras.filter(
      (row) => row.preset === recipe.preset,
    ))
      runtime.CONFIG.extrasCents[row.runtimeId || row.id] =
        normalized.extrasCents[row.id];
    assert.equal(
      priced.totalCents,
      runtime.Model.price(raw).totalCents,
      recipe.id + " price parity",
    );
    assert.equal(
      priced.totalCents,
      priced.lines.reduce((sum, row) => sum + row.totalCents, 0) +
        priced.extraLines.reduce((sum, row) => sum + row.totalCents, 0),
    );
    assert.deepEqual(
      mapDesignIds(raw, catalog, recipe.preset, "catalog"),
      recipe.design,
    );
  }
  const recipe = catalog.recipes.find((row) => row.id === "pink-promise"),
    draft = { preset: "fresh", currency: "USD" };
  const explicit = normalizePolicy(draft, catalog).policy;
  for (const row of catalog.flowers.filter((row) => row.preset === "fresh"))
    explicit.flowerPrices[row.id] = row.priceCents;
  for (const row of catalog.extras.filter((row) => row.preset === "fresh"))
    explicit.extrasCents[row.id] = row.priceCents;
  assert.equal(
    normalizePolicy(draft, catalog).policy.flowerPrices.rose_pink,
    null,
    "Missing merchant prices stay unapproved",
  );
  assert.equal(
    priceDesign(recipe.design, draft, catalog).ok,
    false,
    "Catalogue samples never silently become merchant prices",
  );
  const reject = (design, policy, code) => {
    const result = validateDesign(design, policy, catalog);
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((row) => row.code === code),
      JSON.stringify(result.issues),
    );
  };
  let design = clone(recipe.design);
  design.items[0].id = "unknown";
  reject(design, draft, "unknown_flower");
  reject(
    recipe.design,
    { ...explicit, disabledFlowers: ["rose_pink"] },
    "disabled_flower",
  );
  reject(recipe.design, { ...draft, enabledModes: ["heart"] }, "disabled_mode");
  reject(
    recipe.design,
    {
      ...explicit,
      flowerPrices: { ...explicit.flowerPrices, rose_pink: null },
    },
    "unpriced_flower",
  );
  assert.equal(
    validateDesign(
      recipe.design,
      { ...draft, flowerPrices: { rose_pink: null } },
      catalog,
      { allowUnpriced: true },
    ).ok,
    true,
  );
  reject(
    recipe.design,
    { ...explicit, disabledExtras: ["satin_bow"] },
    "disabled_extra",
  );
  reject(
    recipe.design,
    { ...explicit, extrasCents: { ...explicit.extrasCents, filler: null } },
    "unpriced_extra",
  );
  design = clone(recipe.design);
  design.finishes.studio.placements = { "air-0": [0, 0, 999] };
  reject(design, explicit, "invalid_design");
  design = clone(recipe.design);
  design.finishes.decorations[0].scale = 999;
  reject(design, explicit, "invalid_design");
  design = clone(recipe.design);
  design.template.capacity = 101;
  reject(design, explicit, "invalid_design");
  design = clone(recipe.design);
  design.items[0].id = "satin_rose_red";
  reject(design, draft, "incompatible_preset");
  assert.equal(
    normalizePolicy({ ...draft, flowerPrices: { rose_red: -1 } }, catalog).ok,
    false,
  );
  assert.equal(
    normalizePolicy({ ...draft, extrasCents: { bogus: 0 } }, catalog).ok,
    false,
  );
  assert.equal(
    normalizePolicy({ preset: "satin", enabledModes: ["classic"] }, catalog).ok,
    false,
  );
  const zero = priceDesign(
    recipe.design,
    {
      ...draft,
      flowerPrices: { rose_pink: 0 },
      extrasCents: { filler: 0, satin_bow: 0 },
    },
    catalog,
  );
  assert.equal(zero.totalCents, 0);
  // The cached geometry runtime must never retain a different merchant's
  // prices or currency, including after switching catalogue presets.
  const merchantA = { ...explicit, currency: "CAD" },
    merchantB = {
      ...explicit,
      currency: "USD",
      flowerPrices: { ...explicit.flowerPrices, rose_pink: 719 },
    };
  const amountA = priceDesign(recipe.design, merchantA, catalog).totalCents;
  const amountB = priceDesign(recipe.design, merchantB, catalog).totalCents;
  assert.notEqual(amountA, amountB);
  priceDesign(
    catalog.recipes.find((row) => row.preset === "satin").design,
    { preset: "satin", currency: "USD" },
    catalog,
  );
  assert.equal(
    priceDesign(recipe.design, merchantA, catalog).totalCents,
    amountA,
  );
  assert.equal(
    priceDesign(recipe.design, merchantB, catalog).totalCents,
    amountB,
  );
  const satin = catalog.recipes.find((row) => row.preset === "satin");
  reject(
    satin.design,
    { preset: "fresh", currency: "USD" },
    "incompatible_preset",
  );
  for (const file of [
    "renderer.js",
    "model.js",
    "geometry.js",
    "dome-engine-v2.js",
    "template-engine.js",
    "design-link.js",
  ])
    assert.deepEqual(
      fs.readFileSync(path.join(root, "platform/public/studio", file)),
      fs.readFileSync(path.join(root, "demo/nebula-builder", file)),
      file + " identity",
    );
  assert.deepEqual(
    fs.readFileSync(
      path.join(root, "platform/public/studio/satin/builder-runtime.js"),
    ),
    fs.readFileSync(path.join(root, "clients/raysbouquetz/builder-runtime.js")),
    "Original satin integration identity",
  );
  console.log(
    "Shared policy: 21 recipe validation/pricing parity cases, availability, integer cents, nested finish bounds, mode/preset checks and renderer identity passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
