import { icon } from "/icons.js";
const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function mountWorkspaceHome({ shop, config, api }) {
  const slot = document.getElementById("workspaceStatus");
  if (!slot) return;
  slot.innerHTML = '<p class="helper" role="status">Checking your shop…</p>';
  try {
    const liveCandidate = !!shop.published && config.checkoutEnabled === true;
    const [payment, commerce, readiness] = await Promise.all([
      liveCandidate
        ? api(`/api/shops/${shop.id}/square/status`)
        : Promise.resolve({ connected: false }),
      api(`/api/shops/${shop.id}/commerce`),
      api(`/api/shops/${shop.id}/readiness`),
    ]);
    if (!slot.isConnected) return;
    const current = shop,
      rules = commerce.settings;
    const active =
      current.subscription?.status === "active" &&
      Number(
        current.subscription.paidUntil ??
          current.subscription.paidThrough ??
          current.subscription.expiresAt ??
          current.subscription.currentPeriodEnd,
      ) > Date.now();
    const live =
      active && !!current.published && config.publishingEnabled !== false;
    const online =
      live &&
      config.checkoutEnabled === true &&
      payment.connected &&
      !!payment.locationId &&
      rules.enabled &&
      rules.pricesApproved &&
      current.published.draft.currency === current.draft.currency &&
      rules.taxBps !== null &&
      (rules.pickupEnabled ||
        (rules.deliveryEnabled && rules.deliveryCents !== null)) &&
      rules.terms?.trim().length >= 20;
    const issues =
      readiness.checks?.filter(
        (item) => item.area === "content" && item.severity !== "warning",
      ) || [];
    const contentReady = readiness.contentReady === true;
    const hasOffer =
      current.draft.collection.some((item) => item.available) ||
      (current.draft.home.sections.includes("products") &&
        current.draft.products.some((item) => item.available));
    const activationPending = current.activationRequest?.status === "pending";
    const next =
      !live && !hasOffer
        ? [
            "Add your first bouquet",
            "See your storefront, then build a bouquet and add your photo.",
            "/s/" + encodeURIComponent(current.slug) + "?welcome=1",
          ]
        : !live && !contentReady
          ? [
              "Finish your first bouquet",
              issues[0]?.message || "Review the items you chose to offer.",
              "/s/" + encodeURIComponent(current.slug),
            ]
          : !active
            ? [
                activationPending
                  ? "Your activation request is saved"
                  : "Activate your shop",
                activationPending
                  ? "Message Nebula for your invoice and check your activation status."
                  : "Review activation and request access when you’re ready to publish.",
                "/dashboard/billing",
              ]
            : !live
              ? [
                  contentReady ? "Publish your shop" : "Finish your shop setup",
                  contentReady
                    ? "Your saved shop is ready. Publish it to start receiving requests."
                    : issues[0]?.message ||
                      "Review your products, flower prices and contact details.",
                  "/s/" + encodeURIComponent(current.slug),
                ]
              : current.version !==
                  (current.published.sourceVersion ?? current.published.version)
                ? [
                    "Publish your changes",
                    "Your saved edits are private. Publish them when you want customers to see the update.",
                    "/s/" + encodeURIComponent(current.slug),
                  ]
                : [
                    "Your shop is open",
                    online
                      ? "Customers can pay on Square."
                      : "Customers can send unpaid requests. Square is optional.",
                    "/dashboard/orders",
                  ];
    const delivery = rules.deliveryEnabled
      ? rules.pickupEnabled
        ? "Pickup + delivery"
        : "Delivery"
      : rules.pickupEnabled
        ? "Pickup only"
        : "Choose pickup or delivery";
    const deliveryDetail = rules.deliveryEnabled
      ? rules.deliveryNote ||
        rules.fulfillmentRules?.deliveryZones?.map((z) => z.name).join(", ") ||
        "Review your delivery areas and fees"
      : "No delivery address needed";
    const href = `${location.origin}/s/${encodeURIComponent(current.slug)}${live ? "?view=live" : ""}`;
    slot.innerHTML = `<div class="shop-health"><div class="health-heading"><div><span class="pill ${live ? "green" : ""}">${live ? "SHOP OPEN" : active ? "READY TO FINISH" : "PRIVATE PREVIEW"}</span><h2>${esc(next[0])}</h2><p class="subtle">${esc(next[1])}</p></div>${icon(live ? "shop" : "flower", "health-art")}</div><div class="actions"><a class="button" href="${next[2]}" data-nav>${next[2] === "/dashboard/orders" ? "View orders" : next[2] === "/dashboard/billing" ? (activationPending ? "Continue activation" : "Activate my shop") : "Open my shop preview"} ↗</a><a class="button secondary" href="/dashboard/editor" data-nav>Edit storefront</a></div><div class="shop-link-bar"><div>${icon("link")}<span>${esc(href.replace("https://", ""))}</span></div><a href="${href}" target="_blank" rel="noopener">${live ? "Open shop" : "Preview"} ↗</a><button class="plain-button" id="copyShopLink">Copy link</button><span id="copyShopLinkStatus" role="status"></span></div></div><div class="workspace-status-grid"><a class="status-tile" href="/dashboard/billing" data-nav>${icon("plan")}<div><strong>${active ? "Plan active" : activationPending ? "Activation requested" : "Activation needed"}</strong><span>${active ? "Your access is active" : activationPending ? "Contact Nebula for your invoice" : "Request activation when ready"}</span></div></a><a class="status-tile" href="/dashboard/payments" data-nav>${icon("square")}<div><strong>${online ? (config.squareEnvironment === "sandbox" ? "Test payments ready" : "Online payments ready") : "Online payments off"}</strong><span>${online ? (rules.paymentOptions === "full" ? "Full payment on Square" : "50% deposit or full payment") : config.checkoutEnabled !== true ? "Platform checkout is being prepared" : !active ? "Optional after activation" : !liveCandidate ? "Optional after publishing" : payment.connected ? "Finish checkout settings" : "Connect Square when ready"}</span></div></a><a class="status-tile" href="/dashboard/payments" data-nav>${icon("message")}<div><strong>${live ? "Requests open" : "Requests open after publishing"}</strong><span>${esc(current.draft.requestChannel === "sms" ? "SMS" : current.draft.requestChannel === "both" ? "WhatsApp + SMS" : "WhatsApp")} · saved in your orders</span></div></a><a class="status-tile" href="/dashboard/payments" data-nav>${icon("shop")}<div><strong>${esc(delivery)}</strong><span>${esc(deliveryDetail)}</span></div></a></div>${!live ? `<details class="setup-details"><summary>Your setup checklist</summary><ol><li>${current.draft.name && current.draft.phone ? "✓" : "○"} Shop name & contact · <a href="/dashboard/shop?setup=1" data-nav>Edit details</a></li><li>${contentReady ? "✓" : "○"} Your first bouquet & prices · <a href="/dashboard/collection?setup=1" data-nav>Continue setup</a></li><li>${active ? "✓" : "○"} Activate your plan · <a href="/dashboard/billing" data-nav>Plan</a></li><li>${live ? "✓" : "○"} Publish & share your shop</li></ol></details>` : ""}`;
    slot.querySelector("#copyShopLink").onclick = async () => {
      try {
        await navigator.clipboard.writeText(href);
        slot.querySelector("#copyShopLinkStatus").textContent = "Link copied";
      } catch {
        slot.querySelector("#copyShopLinkStatus").textContent =
          "Select and copy the shop address above.";
      }
    };
  } catch {
    if (slot.isConnected)
      slot.innerHTML =
        '<p class="notice" role="status">Shop status could not load. Your saved work is safe.</p><button class="button secondary" id="retryWorkspaceStatus">Try again</button>';
    slot
      .querySelector("#retryWorkspaceStatus")
      ?.addEventListener("click", () =>
        mountWorkspaceHome({ shop, config, api }),
      );
  }
}
