import test from "node:test";
import assert from "node:assert/strict";
import {
  bouquetSlots,
  nextBouquetSlot,
} from "../../../platform/public/bouquet-slots.mjs";
test("six builder slots preserve stored card identities, holes and legacy recipes", () => {
  const legacy = { id: "a-real-previous-card", design: { items: [] } };
  const third = { id: "bouquet-slot-3", title: "Third bouquet" };
  const original = [third, legacy];
  const before = structuredClone(original);
  const slots = bouquetSlots(original);
  assert.equal(slots.length, 6);
  assert.equal(slots[0], legacy);
  assert.equal(slots[2], third);
  assert.equal(nextBouquetSlot(original), 2);
  assert.deepEqual(original, before);
  assert.equal(
    bouquetSlots([third])[2],
    third,
    "removing another card never moves a numbered recipe",
  );
  assert.equal(
    nextBouquetSlot(
      Array.from({ length: 6 }, (_, i) => ({ id: `bouquet-slot-${i + 1}` })),
    ),
    0,
  );
});
