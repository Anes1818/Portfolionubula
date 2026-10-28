import test from "node:test";
import assert from "node:assert/strict";
import Commerce from "../../../clients/raysbouquetz/commerce-core.js";
import { design, policy, fixedNow } from "./fixtures.mjs";

test("approved prices cover every offered flower, note and count in both modes", () => {
  const p = policy();
  for (const mode of ["dome", "heart"])
    for (const [id] of Commerce.flowerRows)
      for (let n = 1; n <= 100; n++) {
        const result = Commerce.calculate(
          design(Array(n).fill(id), mode),
          p,
          undefined,
          fixedNow,
        );
        const tier = id === "foam_rose_black" ? p.foamTiers[n] : undefined;
        assert.equal(result.totalCents, tier ?? p.unitCents[id] * n);
        assert.equal(
          result.payment.dueCents + result.payment.balanceCents,
          result.totalCents,
        );
      }
  for (const [currency, values] of Object.entries(Commerce.denominations))
    for (const denomination of values) {
      const id = `cash_${currency.toLowerCase()}_${denomination}`;
      const s = design(Array(100).fill(id));
      const result = Commerce.calculate(s, p, undefined, fixedNow);
      const face = denomination * 100 * 100;
      const cash =
        currency === "CAD"
          ? face
          : Math.floor(
              (face * p.usdToCad.numerator + p.usdToCad.denominator / 2) /
                p.usdToCad.denominator,
            );
      assert.equal(result.totalCents, cash + 8000);
      s.finishes.studio.cashSupply = "customer";
      assert.equal(
        Commerce.calculate(s, p, undefined, fixedNow).totalCents,
        8000,
      );
    }
});

test("message/bow bundles and foam inclusions charge each approved extra exactly once", () => {
  const p = policy(),
    s = design(Array(7).fill("foam_rose_black"));
  s.finishes.decorations.push({
    id: "bow_black",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    layer: "front",
  });
  assert.equal(Commerce.calculate(s, p, undefined, fixedNow).totalCents, 4000);
  s.finishes.sash = "blank_blackband";
  const result = Commerce.calculate(s, p, undefined, fixedNow);
  assert.equal(result.totalCents, 5500);
  assert.equal(
    result.lines.filter((l) => l.id === "message_bow_bundle").length,
    1,
  );
  assert.ok(!result.lines.some((l) => ["bow_black", "sash"].includes(l.id)));
  p.enabledExtras = p.enabledExtras.filter((id) => id !== "bow_black");
  assert.throws(
    () => Commerce.calculate(s, p, undefined, fixedNow),
    /unavailable|not available/,
  );
});

test("malformed paused policies are rejected without throwing during public validation", () => {
  for (const malformed of [
    null,
    [],
    {},
    { ...policy(), enabledItems: null },
    { ...policy(), fulfillment: { approved: false, deliveryZones: [null] } },
    { ...policy(), tax: null },
    { ...policy(), usdToCad: { ...policy().usdToCad, source: "" } },
    { ...policy(), usdToCad: { ...policy().usdToCad, asOf: 42 } },
  ]) {
    assert.equal(Commerce.validPolicyShape(malformed), false);
    assert.deepEqual(Commerce.policyProblems(malformed), [
      "The price policy format is invalid.",
    ]);
  }
});
