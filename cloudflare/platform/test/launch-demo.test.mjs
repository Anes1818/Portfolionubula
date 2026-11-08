import test from "node:test";
import assert from "node:assert/strict";
import {
  readTrial,
  keepTrial,
  clearTrial,
  demoShop,
} from "../../../platform/public/launch-demo.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
test("trial design survives the login handoff without merchant prices or account details", () => {
  const storage = memory(),
    design = { mode: "dome", items: [{ id: "rose_red" }] };
  keepTrial(design, "fresh", storage);
  const result = readTrial(storage);
  assert.deepEqual(result.design, design);
  assert.equal(result.preset, "fresh");
  assert.equal(result.flowerPrices, undefined);
  assert.equal(result.shopId, undefined);
  clearTrial(storage);
  assert.equal(readTrial(storage), null);
});
test("expired, future, malformed, oversized and blocked trial storage is harmless", () => {
  const storage = memory(),
    key = "nebula:trial-bouquet:v1",
    now = Date.now();
  for (const raw of [
    "{broken",
    "x".repeat(150001),
    JSON.stringify({
      version: 1,
      savedAt: now - 86400001,
      preset: "fresh",
      design: { items: [{}] },
    }),
    JSON.stringify({
      version: 1,
      savedAt: now + 10000,
      preset: "fresh",
      design: { items: [{}] },
    }),
    JSON.stringify({
      version: 1,
      savedAt: now,
      preset: "other",
      design: { items: [{}] },
    }),
  ]) {
    storage.setItem(key, raw);
    assert.equal(readTrial(storage, now), null);
  }
  assert.equal(
    readTrial({
      getItem() {
        throw Error("Storage blocked");
      },
    }),
    null,
  );
});
test("sample shop is isolated from catalog input and always has ordering disabled", () => {
  const catalog = {
      flowers: [{ id: "rose", priceCents: 400 }],
      extras: [{ id: "bow", priceCents: 300 }],
    },
    original = structuredClone(catalog);
  const sample = demoShop(catalog, "fresh");
  assert.equal(sample.features.requestsEnabled, false);
  assert.equal(sample.features.checkoutEnabled, false);
  sample.draft.flowerPrices.rose = 999;
  assert.deepEqual(catalog, original);
  assert.deepEqual(demoShop(catalog, "satin").draft.enabledModes, [
    "dome",
    "heart",
  ]);
});
