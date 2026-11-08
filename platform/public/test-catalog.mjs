import { validateDesign } from "./policy.mjs";

// Explicit Sandbox shortcut. Prices already entered by the owner, disabled
// choices, artwork and product records are retained. Nothing is published here.
export function prepareTestCatalog(original, catalog) {
  const draft = structuredClone(original);
  let samplePrices = 0,
    hidden = 0;
  for (const [rows, prices, disabled] of [
    [catalog.flowers, draft.flowerPrices, draft.disabledFlowers],
    [catalog.extras, draft.extrasCents, draft.disabledExtras],
  ]) {
    for (const row of rows || []) {
      if (draft.preset !== "mixed" && row.preset && row.preset !== draft.preset)
        continue;
      if (prices[row.id] == null && Number.isSafeInteger(row.priceCents)) {
        prices[row.id] = row.priceCents;
        samplePrices++;
      }
      if (!Number.isSafeInteger(prices[row.id]) && !disabled.includes(row.id)) {
        disabled.push(row.id);
        hidden++;
      }
    }
  }
  for (const card of draft.collection) {
    if (!card.available) continue;
    const design =
      card.design ||
      catalog.recipes.find((r) => r.id === card.recipeId)?.design;
    const result = validateDesign(design, draft, catalog);
    if (!result.ok || !result.design?.items?.length) {
      card.available = false;
      hidden++;
    }
  }
  for (const product of draft.products) {
    if (product.available && !Number.isSafeInteger(product.priceCents)) {
      product.available = false;
      hidden++;
    }
  }
  return { draft, samplePrices, hidden };
}
