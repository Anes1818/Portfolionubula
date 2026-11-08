import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareTestCatalog } from "../../../platform/public/test-catalog.mjs";
import { initialDraft, validatePublication } from "../validation.mjs";
import { publicationReport } from "../publish-readiness.mjs";

const catalog = JSON.parse(
  readFileSync(
    new URL("../../../platform/public/catalog.json", import.meta.url),
  ),
);
for (const preset of ["fresh", "satin"])
  test(`Sandbox preparation produces a valid ${preset} catalogue without inventing unknown prices or activating a shop`, () => {
    const original = initialDraft({
      name: "Test flowers",
      preset,
      currency: "CAD",
    });
    const flowers = catalog.flowers.filter(
      (r) => !r.preset || r.preset === preset,
    );
    const known = flowers.find((r) => Number.isSafeInteger(r.priceCents));
    original.flowerPrices[known.id] = 1234;
    const disabled = flowers.find(
      (r) => r.id !== known.id && Number.isSafeInteger(r.priceCents),
    );
    original.disabledFlowers.push(disabled.id);
    original.collection = catalog.recipes
      .filter((r) => r.preset === preset)
      .slice(0, 6)
      .map((r, i) => ({
        id: `card-${i}`,
        title: r.name,
        recipeId: r.id,
        design: r.design,
        cover: null,
        available: true,
        category: "",
      }));
    original.products = [
      {
        id: "unfinished",
        title: "Saved gift",
        description: "",
        priceCents: null,
        available: true,
        cover: null,
        category: "",
      },
    ];
    const before = structuredClone(original);
    const result = prepareTestCatalog(original, catalog);
    assert.deepEqual(original, before);
    assert.equal(result.draft.flowerPrices[known.id], 1234);
    assert.ok(result.draft.disabledFlowers.includes(disabled.id));
    for (const row of flowers.filter(
      (r) => !Number.isSafeInteger(r.priceCents),
    )) {
      assert.ok(result.draft.disabledFlowers.includes(row.id));
      assert.equal(result.draft.flowerPrices[row.id], undefined);
    }
    assert.equal(result.draft.products[0].available, false);
    assert.equal(result.draft.products[0].priceCents, null);
    assert.deepEqual(
      result.draft.collection.map((c) => c.design),
      original.collection.map((c) => c.design),
    );
    assert.doesNotThrow(() => validatePublication(result.draft, catalog));
    const report = publicationReport(
      { draft: result.draft, version: 1, subscription: { status: "inactive" } },
      catalog,
      { PUBLISHING_ENABLED: "true" },
    );
    assert.equal(report.contentReady, true);
    assert.equal(report.canPublish, false);
    assert.ok(!("commerce" in result.draft));
  });
