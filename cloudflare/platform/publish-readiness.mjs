import { entitled, validateDraft, validatePublication } from "./validation.mjs";
import {
  normalizePolicy,
  validateDesign,
} from "../../platform/shared/policy.mjs";

/** Read-only report. The publish transaction independently validates everything. */
export function publicationReport(shop, catalog, env = {}) {
  const checks = [];
  const add = (
    code,
    path,
    message,
    href,
    severity = "error",
    area = "content",
  ) => {
    if (!checks.some((item) => item.code === code && item.path === path))
      checks.push({ code, path, message, href, severity, area });
  };
  const stats = {
    bouquets: 0,
    products: 0,
    offeredFlowers: 0,
    pricedFlowers: 0,
    offeredExtras: 0,
    pricedExtras: 0,
  };
  let draft;
  try {
    draft = validateDraft(shop.draft, catalog);
  } catch (error) {
    add(
      "invalid_draft",
      "draft",
      error.status ? error.message : "Review your saved shop details.",
      "/dashboard/shop",
    );
  }
  if (draft) {
    const preset = catalog.presets?.find((item) => item.id === draft.preset);
    if (preset?.available === false)
      add(
        "preset_unavailable",
        "preset",
        "This flower library is not available for publication.",
        "/dashboard/shop",
      );
    const normalized = normalizePolicy(draft, catalog);
    if (!normalized.ok) {
      for (const item of normalized.issues)
        add(item.code, item.path, item.message, "/dashboard/prices");
    } else {
      const policy = normalized.policy;
      const flowers = (catalog.flowers || []).filter(
        (item) =>
          (!item.preset || item.preset === draft.preset) &&
          !policy.disabledFlowers.includes(item.id),
      );
      const extras = (catalog.extras || []).filter(
        (item) =>
          (!item.preset || item.preset === draft.preset) &&
          !policy.disabledExtras.includes(item.id),
      );
      stats.offeredFlowers = flowers.length;
      stats.offeredExtras = extras.length;
      stats.pricedFlowers = flowers.filter((item) =>
        Number.isSafeInteger(policy.flowerPrices[item.id]),
      ).length;
      stats.pricedExtras = extras.filter((item) =>
        Number.isSafeInteger(policy.extrasCents[item.id]),
      ).length;
      if (draft.home.sections.includes("builder")) {
        if (!flowers.length)
          add(
            "no_offered_flowers",
            "disabledFlowers",
            "Offer at least one flower, or hide the independent Builder section.",
            "/dashboard/prices",
          );
        for (const item of flowers)
          if (!Number.isSafeInteger(policy.flowerPrices[item.id]))
            add(
              "unpriced_flower",
              "flowerPrices." + item.id,
              "Set a price for " +
                (item.en || item.label || item.id) +
                ", or turn it off.",
              "/dashboard/prices",
            );
        for (const item of extras)
          if (!Number.isSafeInteger(policy.extrasCents[item.id]))
            add(
              "unpriced_extra",
              "extrasCents." + item.id,
              "Set a price for " +
                (item.label || item.en || item.id) +
                ", or turn it off.",
              "/dashboard/prices",
            );
      }
      for (const card of draft.collection.filter((item) => item.available)) {
        stats.bouquets++;
        const design =
          card.design ||
          catalog.recipes.find((item) => item.id === card.recipeId)?.design;
        const result = validateDesign(design, draft, catalog);
        if (result.ok && !result.design.items.length)
          add(
            "empty_bouquet",
            "collection." + card.id + ".design",
            card.title + ": add at least one flower before publishing.",
            "/dashboard/collection",
          );
        for (const item of result.issues)
          add(
            item.code,
            "collection." + card.id + "." + item.path,
            card.title + ": " + item.message,
            item.code.startsWith("unpriced_") ||
              (item.code.startsWith("disabled_") &&
                item.code !== "disabled_mode")
              ? "/dashboard/prices"
              : "/dashboard/collection",
          );
      }
      for (const product of draft.products.filter((item) => item.available)) {
        stats.products++;
        if (!Number.isSafeInteger(product.priceCents))
          add(
            "unpriced_product",
            "products." + product.id + ".priceCents",
            "Set the fixed price for " +
              product.title +
              ", or hide this product.",
            "/dashboard/products",
          );
        if (!product.cover)
          add(
            "product_photo_missing",
            "products." + product.id + ".cover",
            "Add a photo of " +
              product.title +
              " so customers can see what they are requesting.",
            "/dashboard/products",
            "warning",
          );
      }
      if (
        !draft.home.sections.includes("builder") &&
        !stats.bouquets &&
        !stats.products
      )
        add(
          "empty_shop",
          "home.sections",
          "Add an available bouquet or product, or enable the independent Builder.",
          "/dashboard/editor",
        );
    }
    if (!draft.city)
      add(
        "city_missing",
        "city",
        "Add your city or service area for customers.",
        "/dashboard/shop",
        "warning",
      );
    if (!draft.phone && !draft.instagram)
      add(
        "contact_missing",
        "phone",
        "Add a shop phone number or Instagram contact.",
        "/dashboard/shop",
        "warning",
      );
    // Keep this report aligned with the authoritative publish validator even if
    // a future schema introduces a requirement not yet given a dedicated row.
    if (
      !checks.some(
        (item) => item.area === "content" && item.severity === "error",
      )
    ) {
      try {
        validatePublication(draft, catalog);
      } catch (error) {
        add(
          "publication_invalid",
          "draft",
          error.status ? error.message : "Review your shop before publishing.",
          "/dashboard/editor",
        );
      }
    }
  }
  const contentReady = !checks.some(
    (item) => item.area === "content" && item.severity === "error",
  );
  if (!entitled(shop))
    add(
      "subscription_inactive",
      "subscription",
      "Your private preview is saved. A verified active plan is required to open the shop.",
      "/dashboard/billing",
      "error",
      "activation",
    );
  if (env.PUBLISHING_ENABLED !== "true")
    add(
      "publication_setup_pending",
      "publication",
      "Public shop activation is not open in this beta. You can keep editing and previewing.",
      "/dashboard/billing",
      "error",
      "activation",
    );
  const testMode =
    env.BILLING_TEST_MODE === "true" || env.LEMON_TEST_MODE === "true";
  if (
    entitled(shop) &&
    (shop.subscription.testEnvironment !== testMode ||
      (testMode && !["local", "test"].includes(env.ENVIRONMENT)))
  )
    add(
      "billing_environment_mismatch",
      "subscription",
      "This plan cannot activate a shop in the current billing environment.",
      "/dashboard/billing",
      "error",
      "activation",
    );
  return {
    draftVersion: shop.version,
    catalogVersion: catalog.version || 1,
    contentReady,
    canPublish: !checks.some((item) => item.severity === "error"),
    checks,
    stats,
  };
}
