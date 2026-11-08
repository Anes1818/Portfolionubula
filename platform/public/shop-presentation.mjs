const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function presentation(home) {
  return home.sections.includes("products") ? "shop" : "builder";
}
export function applyPresentation(draft, style) {
  if (!["builder", "shop"].includes(style)) throw Error("Choose a shop style.");
  return {
    ...draft,
    home: {
      ...draft.home,
      sections:
        style === "builder"
          ? ["builder", "custom", "about", "contact"]
          : ["custom", "builder", "products", "about", "contact"],
      heroButtonTarget: "builder",
      builderButtonLabel: "Design your bouquet",
    },
  };
}
export function presentationControls(home) {
  const current = presentation(home);
  return `<section class="shop-presentation"><p class="eyebrow">YOUR PAGE, YOUR WAY</p><h2>Put your bouquet builder first.</h2><p>Start with a beautiful builder page. Add a product shop whenever you need it.</p><div class="presentation-options">${[
    [
      "builder",
      "Bouquet builder",
      "A branded page, a Design your bouquet button and your signature bouquets.",
      "Recommended",
    ],
    [
      "shop",
      "Builder + product shop",
      "The same bouquet builder, with an extra section for ready-made products and gifts.",
      "Optional expansion",
    ],
  ]
    .map(
      ([value, title, description, label]) =>
        `<button type="button" class="presentation-option" data-action="shop-presentation" data-style="${value}" aria-pressed="${current === value}"><span class="tiny-label">${label}</span><strong>${title}</strong><span>${description}</span></button>`,
    )
    .join(
      "",
    )}</div><p class="helper">Changes update your private draft. Your recipes, product photos and prices are kept. Publish when you are ready.</p></section>`;
}

export function fulfillmentSummary(settings, currency = "USD") {
  if (!settings) return "";
  const money = (n) =>
    new Intl.NumberFormat("en", { style: "currency", currency }).format(
      n / 100,
    );
  const zones = settings.fulfillmentRules?.enforceDeliveryZones
    ? settings.fulfillmentRules.deliveryZones || []
    : [];
  const method =
    settings.pickupEnabled && settings.deliveryEnabled
      ? "Pickup & delivery"
      : settings.deliveryEnabled
        ? "Delivery"
        : settings.pickupEnabled
          ? "Pickup available"
          : "";
  if (!method) return "";
  return `<aside class="store-fulfillment" aria-label="Pickup and delivery"><div><strong>${method}</strong>${settings.deliveryEnabled ? `<p>${esc(settings.deliveryNote || (zones.length ? "Delivery is limited to the areas below. Check your postal code when ordering." : "Enter your delivery details when ordering."))}</p>` : "<p>Choose your preferred pickup date when ordering.</p>"}</div>${settings.deliveryEnabled ? `<details><summary>Delivery areas & fees</summary>${zones.length ? `<ul>${zones.map((z) => `<li><span>${esc(z.name)}</span><strong>${esc(money(z.feeCents))}</strong></li>`).join("")}</ul><p class="helper">Your postal code is checked before the order is placed.</p>` : Number.isSafeInteger(settings.deliveryCents) ? `<p>Delivery fee: ${esc(money(settings.deliveryCents))}</p>` : "<p>Your florist will confirm the delivery fee.</p>"}</details>` : ""}</aside>`;
}
