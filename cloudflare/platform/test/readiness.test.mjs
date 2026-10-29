import test from "node:test";
import assert from "node:assert/strict";
import { publicationReport } from "../publish-readiness.mjs";
import { initialDraft } from "../validation.mjs";
import { catalog } from "./fixtures.mjs";
import { createRuntime } from "../../../platform/shared/runtime.mjs";
import { validatePublication } from "../validation.mjs";

const product = {
  id: "gift-1",
  title: "A little gift",
  description: "",
  priceCents: 2500,
  cover: null,
  available: true,
  category: "",
};
const base = () => ({
  version: 1,
  draft: initialDraft({ name: "Flowers", currency: "CAD", preset: "fresh" }),
  subscription: { status: "inactive" },
});
test("readiness distinguishes content from closed activation and never grants a plan", () => {
  const shop = base();
  shop.draft.products = [product];
  shop.draft.home.sections = ["products"];
  const before = JSON.stringify(shop),
    r = publicationReport(shop, catalog);
  assert.equal(r.contentReady, true);
  assert.equal(r.canPublish, false);
  assert.equal(r.stats.products, 1);
  assert.ok(r.checks.some((item) => item.code === "subscription_inactive"));
  assert.ok(
    r.checks.some(
      (item) =>
        item.code === "product_photo_missing" && item.severity === "warning",
    ),
  );
  assert.equal(JSON.stringify(shop), before);
});
test("readiness reports every unpriced offered item and available product, with no sample fallback", () => {
  const shop = base();
  shop.draft.products = [{ ...product, priceCents: null }];
  const r = publicationReport(shop, catalog);
  assert.equal(r.contentReady, false);
  for (const code of ["unpriced_flower", "unpriced_extra", "unpriced_product"])
    assert.ok(
      r.checks.some((item) => item.code === code),
      code,
    );
  assert.ok(r.checks.every((item) => item.href.startsWith("/dashboard/")));
});
test("hidden products do not block publication; pricing zero is explicit; Square is optional", () => {
  const shop = base();
  shop.draft.products = [
    { ...product, priceCents: 0 },
    { ...product, id: "hidden", priceCents: null, available: false },
  ];
  shop.draft.home.sections = ["products"];
  shop.subscription = {
    status: "active",
    paidUntil: Date.now() + 86400000,
    testEnvironment: false,
  };
  shop.square = { status: "not_connected" };
  const r = publicationReport(shop, catalog, { PUBLISHING_ENABLED: "true" });
  assert.equal(r.contentReady, true);
  assert.equal(r.canPublish, true);
  assert.equal(r.stats.products, 1);
  assert.ok(!r.checks.some((item) => item.code.startsWith("square")));
});
test("a saved available bouquet reports disabled flowers and missing prices", () => {
  const shop = base();
  shop.draft.home.sections = ["custom"];
  shop.draft.collection = [
    {
      id: "card-1",
      title: "My roses",
      recipeId: "fresh-classic",
      design: null,
      cover: null,
      available: true,
      category: "",
    },
  ];
  let r = publicationReport(shop, catalog);
  assert.equal(r.contentReady, false);
  assert.ok(
    r.checks.some(
      (item) =>
        item.path.startsWith("collection.card-1") &&
        item.code === "unpriced_flower",
    ),
  );
  shop.draft.disabledFlowers = ["rose_red"];
  r = publicationReport(shop, catalog);
  assert.ok(r.checks.some((item) => item.code === "disabled_flower"));
});
test("test subscriptions cannot open production, while a proper local test report may pass", () => {
  const shop = base();
  shop.draft.products = [product];
  shop.draft.home.sections = ["products"];
  shop.subscription = {
    status: "active",
    paidUntil: Date.now() + 86400000,
    testEnvironment: true,
  };
  assert.equal(
    publicationReport(shop, catalog, {
      PUBLISHING_ENABLED: "true",
      LEMON_TEST_MODE: "true",
      ENVIRONMENT: "private-beta",
    }).canPublish,
    false,
  );
  assert.equal(
    publicationReport(shop, catalog, {
      PUBLISHING_ENABLED: "true",
      LEMON_TEST_MODE: "true",
      ENVIRONMENT: "local",
    }).canPublish,
    true,
  );
});
test("an empty saved bouquet remains editable but cannot be offered as a public bouquet", () => {
  const shop = base();
  const model = createRuntime("fresh").Model,
    empty = model.empty();
  model.arrange(empty, "classic", { fresh: true });
  shop.draft.home.sections = ["custom"];
  shop.draft.collection = [
    {
      id: "empty",
      title: "Unfinished design",
      recipeId: null,
      design: empty,
      cover: null,
      available: true,
      category: "",
    },
  ];
  const report = publicationReport(shop, catalog);
  assert.equal(report.contentReady, false);
  assert.ok(report.checks.some((item) => item.code === "empty_bouquet"));
  assert.throws(
    () => validatePublication(shop.draft, catalog),
    /at least one flower/,
  );
});
