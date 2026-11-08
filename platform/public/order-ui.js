import { countryOptions } from "/shop-flow.js";
import { checkFulfillment, localDateTime } from "/fulfillment-rules.mjs";
const escape = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

let cataloguePromise;
async function reviewDetails(shop, kind, productId, design, preview, cardId) {
  if (kind === "product") {
    const product = shop.draft?.products?.find((row) => row.id === productId);
    if (
      !product ||
      product.available === false ||
      !Number.isSafeInteger(product.priceCents)
    )
      throw new Error("This product is unavailable. Please reload the shop.");
    return {
      totalCents: product.priceCents,
      lines: [
        { label: product.title, quantity: 1, totalCents: product.priceCents },
      ],
    };
  }
  cataloguePromise ||= fetch("/api/catalog", {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  })
    .then((response) => {
      if (!response.ok)
        throw new Error("The flower catalogue could not load. Please retry.");
      return response.json();
    })
    .catch((error) => {
      cataloguePromise = null;
      throw error;
    });
  const [catalog, { priceDesign }] = await Promise.all([
    cataloguePromise,
    import("/policy.mjs"),
  ]);
  const pricing = priceDesign(design, shop.draft, catalog);
  if (!pricing.ok && !preview)
    throw new Error(
      pricing.issues[0]?.message || "Review your bouquet before requesting.",
    );
  const labels = new Map(
    [...catalog.flowers, ...catalog.extras].map((row) => [
      row.id,
      row.en || row.label || row.id,
    ]),
  );
  const counts = new Map();
  for (const item of design.items || [])
    counts.set(item.id, (counts.get(item.id) || 0) + 1);
  return {
    cover:
      catalog.recipes.find(
        (row) =>
          row.id ===
          shop.draft?.collection?.find((card) => card.id === cardId)?.recipeId,
      )?.cover || null,
    totalCents: pricing.ok ? pricing.totalCents : null,
    lines: pricing.ok
      ? [...pricing.lines, ...pricing.extraLines].map((row) => ({
          ...row,
          label: labels.get(row.id) || row.id,
        }))
      : [...counts].map(([id, quantity]) => ({
          label: labels.get(id) || id,
          quantity,
          totalCents: null,
        })),
  };
}

/** Preview sends nothing. Public requests persist before optional WhatsApp. */
export async function openOrderRequest({
  shop,
  kind,
  productId,
  design,
  cardId,
  preview = false,
  previewImage = null,
  asListed = false,
}) {
  if (!shop?.id || !["product", "design"].includes(kind))
    return Promise.reject(new Error("This shop request is unavailable."));
  const review = await reviewDetails(
    shop,
    kind,
    productId,
    design,
    preview,
    cardId,
  );
  document.getElementById("nebula-order-modal")?.remove();
  if (!document.getElementById("nebula-order-styles")) {
    const style = document.createElement("style");
    style.id = "nebula-order-styles";
    style.textContent = `.nb-order-overlay{position:fixed;inset:0;z-index:100000;background:#30282b73;display:grid;place-items:center;padding:20px;font:14px/1.6 Arial,sans-serif;color:#30282b;overflow:auto}.nb-order-dialog{position:relative;width:min(100%,480px);max-height:calc(100dvh - 40px);overflow:auto;background:#fffefa;border:1px solid #e7dfd8;border-radius:18px;padding:32px;box-shadow:0 24px 100px #30282b30}.nb-order-dialog h2{font:500 36px/1.1 Georgia,serif;margin:10px 24px 16px 0}.nb-order-dialog p{margin:12px 0}.nb-order-kicker{font-size:10px;letter-spacing:.16em;color:#672a3f;font-weight:700}.nb-order-dialog .nb-order-muted{font-size:12px;color:#817575}.nb-order-close{position:absolute;right:18px;top:14px;border:0;background:transparent;color:#672a3f;font:28px Arial;cursor:pointer}.nb-order-form{display:grid;gap:15px;margin-top:20px}.nb-order-form label{display:grid;gap:6px;font-size:11px;font-weight:600}.nb-order-form input,.nb-order-form select,.nb-order-form textarea{box-sizing:border-box;width:100%;padding:12px;border:1px solid #ded5ce;background:#fffefa;border-radius:7px;font:13px Arial;color:#30282b;min-width:0}.nb-order-form textarea{min-height:80px;resize:vertical}.nb-order-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nb-order-button{display:inline-flex;align-items:center;justify-content:center;padding:13px 18px;border:1px solid #672a3f;border-radius:7px;background:#672a3f;color:white;font:600 12px Arial;text-decoration:none;cursor:pointer}.nb-order-button:disabled{opacity:.5;cursor:wait}.nb-order-button.secondary{background:transparent;color:#672a3f}.nb-order-notice{padding:13px 15px;border-radius:7px;background:#edf2e9;border:1px solid #cfddc5;font-size:12px}.nb-order-notice.error{background:#fbeeee;border-color:#e8caca;color:#8c283a}.nb-order-price{font:30px Georgia,serif}.nb-order-dialog :focus-visible{outline:3px solid #b78b5b;outline-offset:3px}@media(max-width:440px){.nb-order-dialog{padding:24px}.nb-order-row{grid-template-columns:1fr}}`;
    style.textContent += `@media(max-width:600px){.nb-order-overlay{padding:0;place-items:stretch;top:var(--nb-viewport-top,0px);bottom:auto;height:var(--nb-viewport-height,100dvh);overflow:hidden;overscroll-behavior:contain}.nb-order-dialog{box-sizing:border-box;width:100%;height:100%;max-height:100%;border:0;border-radius:0;padding:calc(24px + env(safe-area-inset-top,0px)) 20px calc(24px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain;scroll-padding-block:72px}.nb-order-dialog h2{font-size:30px;margin-right:44px;overflow-wrap:anywhere}.nb-order-close{position:fixed;z-index:3;right:12px;top:calc(var(--nb-viewport-top,0px) + env(safe-area-inset-top,0px) + 8px);width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:#fffefa;border:1px solid #e7dfd8}.nb-order-form input,.nb-order-form select,.nb-order-form textarea{font-size:16px;min-height:48px;padding:13px;scroll-margin-block:80px}.nb-order-form label{font-size:13px}.nb-order-dialog .nb-order-muted{font-size:13px}.nb-order-form{gap:18px}.nb-order-button{min-height:48px;box-sizing:border-box;font-size:14px}.nb-order-form>[type=submit]{margin-top:8px}.nb-order-review img{max-height:170px!important}.nb-order-row{grid-template-columns:1fr 1fr;gap:10px}}@media(max-width:350px){.nb-order-row{grid-template-columns:1fr}.nb-order-dialog{padding-inline:16px}}`;
    style.textContent += `.nb-order-form .nb-gift-toggle{display:flex;align-items:center;gap:10px;min-height:44px}.nb-order-form .nb-gift-toggle input{width:20px;min-height:20px;height:20px;flex:0 0 20px}.nb-recipient{border:1px solid #ded5ce;border-radius:10px;padding:16px;display:grid;gap:14px;min-width:0}.nb-recipient[hidden],[data-delivery-postcode][hidden]{display:none}.nb-recipient legend{font-size:13px;font-weight:bold;padding:0 5px}`;
    document.head.append(style);
  }
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.createElement("div");
    root.id = "nebula-order-modal";
    root.className = "nb-order-overlay";
    const requestKey = crypto.randomUUID();
    const accessToken = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
    )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    const online = !preview && shop.features?.checkoutEnabled === true;
    const direct =
      online &&
      Number.isSafeInteger(shop.checkoutSettings?.taxBps) &&
      (!shop.checkoutSettings?.deliveryEnabled ||
        Number.isSafeInteger(shop.checkoutSettings?.deliveryCents));
    const item =
      kind === "product"
        ? shop.draft?.products?.find((row) => row.id === productId)
        : shop.draft?.collection?.find((row) => row.id === cardId);
    const title =
      kind === "product" || asListed
        ? item?.title || "Your flower request"
        : "Your personal bouquet";
    const currency = shop.draft?.currency || "USD";
    const money = (cents) =>
      new Intl.NumberFormat("en", { style: "currency", currency }).format(
        cents / 100,
      );
    let receipt = null,
      submitting = false,
      submittedFields = null;
    const syncViewport = () => {
      if (!window.visualViewport) return;
      root.style.setProperty(
        "--nb-viewport-height",
        `${visualViewport.height}px`,
      );
      root.style.setProperty(
        "--nb-viewport-top",
        `${visualViewport.offsetTop}px`,
      );
    };
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    syncViewport();
    const close = () => {
      if (submitting) return;
      root.remove();
      document.removeEventListener("keydown", keyboard);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      document.body.style.overflow = previousOverflow;
      resolve(receipt);
      queueMicrotask(() => previousFocus?.focus());
    };
    const keyboard = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const nodes = [
          ...root.querySelectorAll(
            "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
          ),
        ].filter((node) => node.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    root.innerHTML = `<section class="nb-order-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-order-title"><button class="nb-order-close" aria-label="Close request">×</button><p class="nb-order-kicker">A LITTLE SOMETHING LOVELY</p><h2 id="nb-order-title">${escape(title)}</h2><p class="nb-order-muted">${kind === "product" && item?.priceCents != null ? escape(money(item.priceCents)) + " · " : ""}Your florist will confirm availability and fulfillment. No payment is taken here.</p><form class="nb-order-form"><div class="nb-order-notice error" role="alert" hidden></div><label>Your name<input name="name" autocomplete="name" maxlength="80" required></label><label>Phone or WhatsApp<input name="phone" type="tel" autocomplete="tel" maxlength="40" required></label><label class="nb-gift-toggle"><input type="checkbox" name="isGift"> This is a gift for someone else</label><fieldset class="nb-recipient" data-recipient hidden><legend>Recipient &amp; gift card</legend><label>Recipient’s name<input name="recipientName" maxlength="80" autocomplete="off"></label><label>Recipient’s phone · optional<input name="recipientPhone" type="tel" maxlength="40" autocomplete="off"></label><label>Gift card message · optional<textarea name="giftMessage" maxlength="500"></textarea></label></fieldset><div class="nb-order-row"><label>Preferred date<input name="date" type="date" ${shop.checkoutSettings?.fulfillmentRules?.calendarEnabled ? "required" : ""} min="${localDateTime(Date.now(), shop.draft.timeZone || "UTC").date}"></label><label>Fulfillment<select name="fulfillment"><option value="pickup">Pickup</option><option value="delivery">Delivery · confirm with florist</option></select></label></div><label data-delivery-address hidden>Delivery address<input name="address" autocomplete="street-address" maxlength="200" placeholder="Street address, apartment/unit, city and postal code"></label><div data-delivery-postcode hidden><div class="nb-order-row"><label>Recipient’s postal code<input name="postalCode" autocomplete="postal-code" maxlength="20"></label><label>Delivery country<select name="country" autocomplete="country">${countryOptions(shop.draft.country || "")}</select></label></div><p class="nb-order-muted">Delivery eligibility and fee are checked from the recipient’s postal code. Choose the delivery country.</p></div><label>A little note<textarea name="note" maxlength="1000" placeholder="The occasion, your message or delivery details…"></textarea></label><button class="nb-order-button" type="submit">Send unpaid request ↗</button><p class="nb-order-muted">A request is not a confirmed order or a payment. Your request and price are saved by the shop before any optional WhatsApp draft opens.</p></form></section>`;
    const heading = root.querySelector("#nb-order-title");
    const section = document.createElement("section");
    section.className = "nb-order-review";
    section.setAttribute("aria-label", "Bouquet contents and estimate");
    section.innerHTML = `<p class="nb-order-kicker">${preview ? "OWNER PREVIEW" : "REVIEW YOUR REQUEST"}</p><p class="nb-order-price">${review.totalCents === null ? "Prices needed" : escape(money(review.totalCents))}</p><ul>${review.lines.map((row) => `<li><span>${escape(row.quantity)} × ${escape(row.label)}</span>${row.totalCents === null ? "" : `<strong>${escape(money(row.totalCents))}</strong>`}</li>`).join("")}</ul><p class="nb-order-muted">Design estimate. Your florist confirms delivery, applicable tax and availability.${preview ? " This preview cannot submit a request or take a payment." : ""}</p>`;
    section.style.cssText =
      "background:#f5f1eb;border-radius:9px;padding:16px;margin:16px 0";
    for (const row of section.querySelectorAll("li"))
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:16px;margin:6px 0";
    section.querySelector("ul").style.cssText =
      "list-style:none;padding:0;margin:12px 0;font-size:12px";
    heading.after(section);
    const reviewImage =
      previewImage ||
      (item?.cover
        ? `/api/shops/${shop.id}/media/${item.cover}`
        : review.cover || null);
    if (reviewImage) {
      const image = document.createElement("img");
      image.src = reviewImage;
      image.alt = asListed
        ? "Florist’s bouquet photo"
        : "Your bouquet as designed";
      image.style.cssText =
        "display:block;width:100%;max-height:220px;object-fit:contain;border-radius:10px";
      section.prepend(image);
    }
    if (preview) {
      const submit = root.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Preview only · requests are closed";
      root
        .querySelectorAll("input,select,textarea")
        .forEach((field) => (field.disabled = true));
      const explanation = document.createElement("div");
      explanation.className = "nb-order-notice";
      explanation.innerHTML = shop.published
        ? `<strong>This is your private draft.</strong><p>Open the published customer shop to place a test order. Payments open on Square after the final price review.</p><a class="nb-order-button secondary" href="/s/${encodeURIComponent(shop.slug)}?view=live">Open customer shop ↗</a>`
        : '<strong>This is your private draft.</strong><p>Publish your shop before customers can place orders.</p><a class="nb-order-button secondary" href="/dashboard/billing">Go to publishing ↗</a>';
      section.after(explanation);
    }
    if (
      shop.checkoutSettings &&
      (shop.checkoutSettings.pickupEnabled ||
        shop.checkoutSettings.deliveryEnabled)
    ) {
      const fulfillment = root.querySelector('[name="fulfillment"]');
      for (const option of [...fulfillment.options])
        if (!shop.checkoutSettings[option.value + "Enabled"]) option.remove();
    }
    if (online) {
      section.querySelector(".nb-order-muted").textContent =
        "Review the final tax, delivery and total next, then pay on Square. No separate florist approval is needed before payment.";
      const deliveryOption = root.querySelector(
        '[name="fulfillment"] option[value="delivery"]',
      );
      if (deliveryOption) deliveryOption.textContent = "Delivery";
      root.querySelector('button[type="submit"]').textContent =
        "Review final price & payment options";
      const notes = root.querySelectorAll(
        ".nb-order-dialog > p.nb-order-muted,.nb-order-form > p.nb-order-muted",
      );
      notes.forEach(
        (n) =>
          (n.textContent =
            "First save your request. Then review the florist’s final tax, delivery and terms before choosing a 50% deposit or full payment on Square."),
      );
    }
    if (!online && !preview) {
      const channel = shop.draft.requestChannel || "whatsapp";
      const channelName =
        channel === "sms"
          ? "SMS"
          : channel === "both"
            ? "WhatsApp or SMS"
            : "WhatsApp";
      const guidance = document.createElement("p");
      guidance.className = "nb-order-muted";
      guidance.dataset.messageSteps = "";
      guidance.textContent = `Save your request, then open ${channelName} and tap Send to contact your florist. Your bouquet and details are also saved in the shop’s orders. Payment is arranged with the florist.`;
      root.querySelector(".nb-order-form").before(guidance);
    }
    const fulfillmentSelect = root.querySelector('[name="fulfillment"]'),
      addressWrap = root.querySelector("[data-delivery-address]"),
      addressInput = addressWrap.querySelector('input[name="address"]');
    const checkFields = (fields) =>
      checkFulfillment({
        rules: shop.checkoutSettings?.fulfillmentRules,
        method: fields.get("fulfillment"),
        customer: {
          date: fields.get("date") || null,
          postalCode: fields.get("postalCode"),
          country: String(fields.get("country") || "").toUpperCase(),
        },
        timeZone: shop.draft.timeZone || "UTC",
        country: shop.draft.country,
        deliveryCents: shop.checkoutSettings?.deliveryCents || 0,
      });
    const giftToggle = root.querySelector('[name="isGift"]');
    giftToggle.onchange = () => {
      root.querySelector("[data-recipient]").hidden = !giftToggle.checked;
      root.querySelector('[name="recipientName"]').required =
        giftToggle.checked;
    };
    const syncFulfillment = () => {
      const isDelivery = fulfillmentSelect.value === "delivery";
      addressWrap.hidden = !isDelivery;
      addressInput.required = isDelivery;
      const postcodes =
        isDelivery &&
        shop.checkoutSettings?.fulfillmentRules?.enforceDeliveryZones;
      root.querySelector("[data-delivery-postcode]").hidden = !postcodes;
      root.querySelector('[name="postalCode"]').required = !!postcodes;
      root.querySelector('[name="country"]').required =
        !!postcodes && !!shop.draft.country;
      if (!direct && isDelivery) {
        const eligibility = checkFields(
          new FormData(root.querySelector("form")),
        );
        section.querySelector(".nb-order-muted").textContent = !eligibility.ok
          ? eligibility.error
          : Number.isSafeInteger(shop.checkoutSettings?.deliveryCents) ||
              shop.checkoutSettings?.fulfillmentRules?.enforceDeliveryZones
            ? `Delivery fee: ${money(eligibility.deliveryCents || 0)}. Your florist confirms the final total and payment.`
            : "Your florist confirms the delivery fee and final total.";
      } else if (!direct)
        section.querySelector(".nb-order-muted").textContent =
          "Your florist confirms availability and the final total. Payment is arranged with the florist.";
      if (direct) {
        const eligibility = checkFields(
          new FormData(root.querySelector("form")),
        );
        const delivery = isDelivery ? (eligibility.deliveryCents ?? 0) : 0;
        const tax = Math.floor(
          ((review.totalCents + delivery) * shop.checkoutSettings.taxBps +
            5000) /
            10000,
        );
        section.querySelector(".nb-order-price").textContent =
          isDelivery && !eligibility.ok
            ? "Check delivery details"
            : money(review.totalCents + delivery + tax);
        section.querySelector(".nb-order-muted").textContent = !eligibility.ok
          ? eligibility.error
          : `Includes ${money(tax)} tax${isDelivery ? " and " + money(delivery) + " delivery" : ""}. Pay securely on Square.`;
      }
    };
    const deliveryNote = document.createElement("p");
    deliveryNote.className = "nb-order-muted nb-delivery-note";
    deliveryNote.style.whiteSpace = "pre-wrap";
    deliveryNote.textContent = shop.checkoutSettings?.deliveryNote || "";
    addressWrap.before(deliveryNote);
    fulfillmentSelect.addEventListener("change", () => {
      syncFulfillment();
      deliveryNote.hidden =
        fulfillmentSelect.value !== "delivery" || !deliveryNote.textContent;
    });
    for (const name of ["postalCode", "country", "date"])
      root
        .querySelector(`[name="${name}"]`)
        .addEventListener("input", syncFulfillment);
    syncFulfillment();
    deliveryNote.hidden =
      fulfillmentSelect.value !== "delivery" || !deliveryNote.textContent;
    if (direct) {
      const form = root.querySelector("form"),
        submit = form.querySelector('[type="submit"]');
      const choice = document.createElement("label");
      choice.innerHTML =
        'Payment<select name="paymentChoice"><option value="full">Pay in full</option><option value="deposit">Pay 50% deposit · balance per shop terms</option></select>';
      if (shop.checkoutSettings.paymentOptions === "full")
        choice.querySelector('option[value="deposit"]').remove();
      const due = document.createElement("p");
      due.className = "nb-order-notice";
      due.setAttribute("role", "status");
      const updateDue = () => {
        const f = new FormData(root.querySelector("form")),
          eligibility = checkFields(f);
        if (!eligibility.ok) {
          due.textContent = eligibility.error;
          return;
        }
        const delivery =
          f.get("fulfillment") === "delivery"
            ? eligibility.deliveryCents || 0
            : 0;
        const total =
          review.totalCents +
          delivery +
          Math.floor(
            ((review.totalCents + delivery) * shop.checkoutSettings.taxBps +
              5000) /
              10000,
          );
        const deposit = choice.querySelector("select").value === "deposit",
          now = deposit ? Math.ceil(total / 2) : total;
        due.textContent = `Due now: ${money(now)}${deposit ? ` · Remaining: ${money(total - now)}` : " · Full payment"}`;
      };
      root.querySelector("form").addEventListener("input", updateDue);
      root.querySelector("form").addEventListener("change", updateDue);
      submit.before(choice, due);
      updateDue();
      const terms = document.createElement("details");
      terms.innerHTML = `<summary>Pickup, delivery &amp; refund terms</summary><p style="white-space:pre-wrap">${escape(shop.checkoutSettings.terms)}</p>`;
      submit.before(terms);
      submit.textContent = "Continue to Square ↗";
      root
        .querySelectorAll(
          ".nb-order-dialog > p.nb-order-muted,.nb-order-form > p.nb-order-muted:not(.nb-delivery-note)",
        )
        .forEach(
          (n) =>
            (n.textContent =
              "Your bouquet and details are saved before you continue to Square’s secure payment page."),
        );
      root.querySelector(".nb-order-dialog > p.nb-order-muted").hidden = true;
      section.querySelector(".nb-order-kicker").textContent =
        "REVIEW YOUR ORDER";
    }
    const phoneField = root.querySelector('[name="phone"]');
    phoneField.placeholder =
      {
        CAD: "+1 416 555 0123",
        USD: "+1 212 555 0123",
        GBP: "+44 7700 900123",
        AUD: "+61 400 000 000",
        EUR: "+33 6 12 34 56 78",
      }[currency] || "+ country code and number";
    document.body.append(root);
    root.querySelector(".nb-order-close").onclick = close;
    root.addEventListener("click", (event) => {
      if (event.target === root) close();
    });
    document.addEventListener("keydown", keyboard);
    (matchMedia("(max-width:600px)").matches
      ? root.querySelector(".nb-order-close")
      : root.querySelector("input")
    )?.focus();
    root.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      if (preview) return;
      if (submitting) return;
      submitting = true;
      const button =
          event.submitter || event.target.querySelector('[type="submit"]'),
        error = root.querySelector("[role=alert]");
      button.disabled = true;
      button.textContent = online
        ? "Saving your order…"
        : "Saving your request…";
      error.hidden = true;
      const fields = submittedFields || new FormData(event.target);
      try {
        const fulfillmentPrice = checkFields(fields);
        if (!fulfillmentPrice.ok) throw Error(fulfillmentPrice.error);
        const body = {
          requestKey,
          accessToken,
          ...(previewImage ? { preview: previewImage } : {}),
          kind,
          publishedVersion: shop.published?.version ?? shop.version,
          ...(kind === "product"
            ? { productId }
            : {
                ...(asListed ? { asListed: true } : { design }),
                ...(cardId ? { cardId } : {}),
              }),
          customer: {
            name: String(fields.get("name")).trim(),
            phone: String(fields.get("phone")).trim(),
            note: String(fields.get("note")).trim(),
            date: fields.get("date") || null,
            ...(fields.get("isGift") === "on"
              ? {
                  recipient: {
                    name: String(fields.get("recipientName") || "").trim(),
                    phone: String(fields.get("recipientPhone") || "").trim(),
                    message: String(fields.get("giftMessage") || "").trim(),
                  },
                }
              : {}),
            ...(fields.get("fulfillment") === "delivery"
              ? {
                  postalCode: String(fields.get("postalCode") || "").trim(),
                  country: String(fields.get("country") || "")
                    .trim()
                    .toUpperCase(),
                }
              : {}),
            ...(fields.get("fulfillment") === "delivery" &&
            String(fields.get("address") || "").trim()
              ? { address: String(fields.get("address")).trim() }
              : {}),
          },
          fulfillment: fields.get("fulfillment"),
        };
        let data = receipt;
        if (!data) {
          const response = await fetch(
            `/api/shops/${encodeURIComponent(shop.id)}/requests`,
            {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(25000),
            },
          );
          data = await response.json();
          if (!response.ok)
            throw new Error(
              data.error ||
                "Your request could not be saved. Please try again.",
            );
          if (
            !data.request?.id ||
            !Number.isSafeInteger(data.request.totalCents)
          )
            throw new Error(
              "The saved request receipt was incomplete. Please try again using this same form.",
            );
        }
        receipt = data;
        if (online) {
          submittedFields = fields;
          root
            .querySelectorAll("input,select,textarea")
            .forEach((field) => (field.disabled = true));
          const fragment = new URLSearchParams({
            shop: shop.id,
            request: data.request.id,
            token: accessToken,
          });
          try {
            localStorage.setItem(
              `nebula-request:${shop.id}:${data.request.id}`,
              accessToken,
            );
          } catch {}
          if (direct) {
            const { startSquarePayment } = await import("/checkout-client.js");
            const delivery = fulfillmentPrice.deliveryCents;
            const tax = Math.floor(
              ((review.totalCents + delivery) * shop.checkoutSettings.taxBps +
                5000) /
                10000,
            );
            const recovery =
              root.querySelector(".nb-order-recovery") ||
              document.createElement("a");
            recovery.href = "/receipt.html#" + fragment;
            recovery.className = "nb-order-button secondary nb-order-recovery";
            recovery.textContent = "Reopen saved order";
            if (!recovery.isConnected) error.after(recovery);
            await startSquarePayment({
              shop: shop.id,
              requestId: data.request.id,
              token: accessToken,
              choice: fields.get("paymentChoice"),
              expectedTotal: review.totalCents + delivery + tax,
            });
            return;
          }
          location.assign("/receipt.html#" + fragment);
          return;
        }
        const request = data.request;
        const summary =
          typeof request.summary === "string"
            ? request.summary
            : request.summary?.text ||
              "Your enquiry was saved. No payment was taken.";
        const whatsapp =
          data.whatsappUrl &&
          /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(data.whatsappUrl)
            ? data.whatsappUrl
            : null;
        const sms =
          typeof data.smsUrl === "string" &&
          /^sms:\+\d{8,15}\?body=/.test(data.smsUrl)
            ? data.smsUrl
            : null;
        const smsLink =
          sms && /iPad|iPhone|iPod/.test(navigator.userAgent)
            ? sms.replace("?body=", "&body=")
            : sms;
        root.querySelector(".nb-order-dialog").innerHTML =
          `<button class="nb-order-close" aria-label="Close request">×</button><p class="nb-order-kicker">YOUR ENQUIRY IS SAVED</p><h2 id="nb-order-title">Your enquiry is saved.</h2><div class="nb-order-notice">Request ${escape(request.id)} saved. No payment was taken. Online checkout was not enabled for this shop when you submitted this enquiry.</div><p class="nb-order-price">${escape(new Intl.NumberFormat("en", { style: "currency", currency: request.currency || currency }).format(request.totalCents / 100))}</p><p class="nb-order-muted">${escape(summary)}</p>${whatsapp ? `<a class="nb-order-button" href="${escape(whatsapp)}" target="_blank" rel="noopener">Open WhatsApp draft ↗</a><p class="nb-order-muted">Review the draft in WhatsApp and send it when you are ready.</p>` : ""}${smsLink ? `<a class="nb-order-button secondary" href="${escape(smsLink)}">Open SMS draft ↗</a><p class="nb-order-muted">Your messaging app opens with the order details. Review and send it; your carrier may charge for SMS.</p>` : ""}${whatsapp || sms ? '<button class="nb-order-button secondary" type="button" data-copy-message>Copy order message</button><p class="nb-order-muted" data-copy-result role="status"></p>' : ""}<p><button class="nb-order-button secondary" data-close>Back to the flowers</button></p>`;
        root.querySelector(".nb-order-close").onclick = close;
        root.querySelector("[data-close]").onclick = close;
        root
          .querySelector("[data-copy-message]")
          ?.addEventListener("click", async () => {
            const text =
              new URL(whatsapp || sms).searchParams.get(
                whatsapp ? "text" : "body",
              ) || "";
            try {
              await navigator.clipboard.writeText(text);
              root.querySelector("[data-copy-result]").textContent =
                "Message copied. Paste it into your messaging app.";
            } catch {
              const field = document.createElement("textarea");
              field.readOnly = true;
              field.value = text;
              field.setAttribute("aria-label", "Order message to copy");
              root.querySelector("[data-copy-result]").replaceChildren(field);
              field.focus();
              field.select();
            }
          });
        root.querySelector(".nb-order-notice").textContent =
          `Request ${request.id} saved in the shop’s orders. To contact your florist, open ${whatsapp && sms ? "WhatsApp or SMS" : whatsapp ? "WhatsApp" : "SMS"} below and tap Send. No payment has been taken.`;
        root.querySelector("#nb-order-title").textContent =
          "Send your request to the florist.";
        (
          root.querySelector(
            'a[href^="https://wa.me/"],a[href^="https://api.whatsapp.com/"],a[href^="sms:"]',
          ) || root.querySelector("[data-close]")
        ).focus();
      } catch (cause) {
        error.textContent =
          cause.message || "Your request could not be saved. Please try again.";
        error.hidden = false;
      } finally {
        submitting = false;
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = direct
            ? receipt
              ? "Resume secure checkout ↗"
              : "Continue to Square ↗"
            : online
              ? "Review final price & payment options"
              : "Send unpaid request ↗";
        }
      }
    };
  });
}
