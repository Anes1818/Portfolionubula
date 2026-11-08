import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initialDraft,
  validateDraft,
  validatePublication,
} from "../validation.mjs";
import { validateDesign } from "../../../platform/shared/policy.mjs";
import {
  bouquetRequirements,
  finishBouquetDraft,
  explorationDraft,
} from "../../../platform/public/bouquet-setup.mjs";
const catalog = JSON.parse(
  fs.readFileSync(
    new URL("../../../platform/public/catalog.json", import.meta.url),
  ),
);

for (const preset of ["fresh", "satin"])
  test(`${preset} owner can explore and finish one bouquet without enabling or pricing the whole catalogue`, () => {
    const draft = initialDraft(
      { name: "My flower shop", currency: "CAD", preset },
      { catalog },
    );
    const recipe = catalog.recipes.find((row) => row.preset === preset);
    draft.collection = [
      {
        id: "first",
        title: "First bouquet",
        category: "",
        recipeId: recipe.id,
        design: null,
        cover: null,
        available: true,
      },
    ];
    const before = structuredClone(draft);
    assert.equal(
      validateDesign(recipe.design, draft, catalog, { allowUnpriced: true }).ok,
      false,
      "Customer availability stays closed",
    );
    assert.equal(
      validateDesign(recipe.design, explorationDraft(draft), catalog, {
        allowUnpriced: true,
      }).ok,
      true,
    );
    const needed = bouquetRequirements(draft, draft.collection[0], catalog);
    assert.ok(
      needed.fields.length > 0 && needed.fields.length < catalog.flowers.length,
    );
    assert.throws(
      () =>
        finishBouquetDraft(draft, "first", catalog, {
          title: "My bouquet",
          prices: {},
          cover: null,
        }),
      /Enter your price/,
    );
    const prices = Object.fromEntries(
      needed.fields.map((field) => [
        field.bucket + ":" + field.id,
        field.bucket === "flowerPrices" ? 800 : 0,
      ]),
    );
    const next = finishBouquetDraft(draft, "first", catalog, {
      title: "My bouquet",
      prices,
      cover: "img_" + "a".repeat(64),
    });
    validateDraft(next, catalog);
    validatePublication(
      {
        ...next,
        home: {
          ...next.home,
          sections: [...new Set([...next.home.sections, "builder"])],
        },
      },
      catalog,
    );
    assert.equal(
      validateDesign(recipe.design, next, catalog).ok,
      true,
      "Only the selected design is now genuinely priced",
    );
    assert.deepEqual(
      draft,
      before,
      "The original draft is untouched until an authenticated save",
    );
    const usedFlowers = new Set(
      needed.fields
        .filter((field) => field.bucket === "flowerPrices")
        .map((field) => field.id),
    );
    assert.equal(
      catalog.flowers.filter(
        (row) =>
          row.preset === preset &&
          !usedFlowers.has(row.id) &&
          !next.disabledFlowers.includes(row.id),
      ).length,
      0,
    );
    assert.equal(next.collection[0].cover, "img_" + "a".repeat(64));
    assert.deepEqual(
      next.collection[0].design,
      draft.collection[0].design,
      "Photo and pricing do not rewrite the saved recipe",
    );
    const disabled = structuredClone(next);
    disabled.disabledFlowers.push([...usedFlowers][0]);
    assert.equal(
      validateDesign(recipe.design, disabled, catalog).ok,
      false,
      "The owner exploration option never weakens customer validation",
    );
  });
