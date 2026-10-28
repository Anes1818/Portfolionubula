/* Progressive enhancement: a missing service never changes or loses a design. */
(function (g) {
  "use strict";
  const $ = (id) => document.getElementById(id),
    money = (c) => RayPricing.format(c),
    settings = g.NEBULA_PAYMENTS;
  let config = null,
    busy = false,
    built = false,
    pending = null,
    checking = false;
  const api = async (path, { body, method = "GET", key } = {}) => {
    const r = await fetch(
      settings.endpoint + "/v1/shops/" + settings.shopId + "/" + path,
      {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(key ? { "X-Order-Key": key } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      },
    );
    const data = await r.json();
    if (!r.ok) {
      const e = Error(
        data.error || "Checkout is unavailable. Your bouquet is saved.",
      );
      e.status = r.status;
      throw e;
    }
    return data;
  };
  const random = () =>
    btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  function fulfillment() {
    return {
      method: $("ordMethod")?.value || "Pickup",
      zoneId: $("payZone")?.value || "",
      postalCode: $("payPostal")?.value || "",
    };
  }
  function calculated(s) {
    if (!config?.available) return null;
    try {
      return RayCommerce.calculate(s, config.policy, fulfillment());
    } catch {
      return null;
    }
  }
  function price(s) {
    const calc = calculated(s);
    if (!calc) return null;
    const preview = RayCommerce.preview(s, RayBuilder.policy),
      known = (id) => !!NebulaConfig.CAT[id];
    const lines = calc.lines.filter((l) => known(l.id)),
      extraLines = calc.lines.filter((l) => !known(l.id));
    if (calc.lines.some((l) => l.id === "foam_package"))
      for (const [id, quantity] of Object.entries(RayCommerce.counts(s)))
        lines.push({
          id,
          quantity,
          unitCents: null,
          totalCents: 0,
          includedInBouquet: true,
        });
    if (calc.taxMode === "added")
      extraLines.push({
        id: "tax",
        label: "Tax",
        quantity: 1,
        totalCents: calc.taxCents,
      });
    return {
      ...preview,
      ...calc,
      demo: false,
      estimateOnly: false,
      draft: false,
      quoteRequired: false,
      missing: [],
      range: false,
      lines,
      extraLines,
      flowersCents: lines.reduce((n, l) => n + l.totalCents, 0),
      extrasCents: extraLines.reduce((n, l) => n + l.totalCents, 0),
      payment: calc.payment,
    };
  }
  function build() {
    if (built || !$("orderForm")) return;
    built = true;
    const form = $("orderForm");
    const fields = document.createElement("section");
    fields.className = "full pay-fields";
    fields.innerHTML =
      '<label class="field">Email for your order<input id="payEmail" type="email" autocomplete="email" maxlength="254" required></label><label class="field" id="payZoneField">Delivery area<select id="payZone"></select></label><label class="field" id="payAddressField">Delivery address<textarea id="payAddress" maxlength="500" autocomplete="street-address"></textarea></label><label class="field" id="payPostalField">Postal code<input id="payPostal" autocomplete="postal-code" maxlength="7"></label><p id="payLead" class="helper"></p><p id="payPolicy" class="helper"></p><div id="payFinal" class="pay-final" aria-live="polite"></div><button id="payCancel" type="button" class="button secondary" hidden>Cancel this checkout to change the order</button><a id="payResume" class="button secondary" hidden>View saved payment status</a>';
    form.querySelector("details").before(fields);
    $("ordPay").closest("label").hidden = true;
    for (const id of [
      "ordName",
      "ordPhone",
      "ordDate",
      "ordMethod",
      "ordNote",
      "payEmail",
      "payZone",
      "payAddress",
      "payPostal",
    ])
      $(id).addEventListener("input", () => {
        if (!busy) {
          if (id === "payPostal") NebulaApp.render(false);
          else decorate();
        }
      });
    $("ordMethod").addEventListener("change", () => {
      NebulaApp.render(false);
      decorate();
    });
    $("payZone").addEventListener("change", () => {
      NebulaApp.render(false);
      decorate();
    });
    $("payCancel").onclick = async () => {
      if (!pending?.id || busy) return;
      busy = true;
      decorate();
      try {
        await api("orders/" + pending.id + "/cancel", {
          method: "POST",
          body: {},
          key: pending.requestKey,
        });
        sessionStorage.removeItem("nebula-checkout:" + settings.shopId);
        pending = null;
        $("orderError").hidden = true;
        $("payCancel").hidden = true;
      } catch (e) {
        error(e.message);
      } finally {
        busy = false;
        decorate();
      }
    };
    try {
      pending = JSON.parse(
        sessionStorage.getItem("nebula-checkout:" + settings.shopId) || "null",
      );
    } catch {}
  }
  function error(message) {
    $("orderError").textContent = message;
    $("orderError").hidden = false;
  }
  function decorate() {
    if (!config?.available || !g.NebulaApp || !$("orderForm")) return;
    build();
    for (const e of $("orderForm").elements) e.disabled = busy;
    if ($("rayPaymentPlan")) $("rayPaymentPlan").disabled = busy;
    const method = $("ordMethod"),
      current = method.value,
      options = [];
    if (config.policy.fulfillment.pickupEnabled)
      options.push(["Pickup", "Pickup"]);
    if (config.policy.fulfillment.deliveryZones.length)
      options.push(["Delivery", "Delivery"]);
    if (
      method.options.length !== options.length ||
      [...method.options].some((o, i) => o.value !== options[i]?.[0])
    ) {
      method.replaceChildren(
        ...options.map(([value, label]) => {
          const o = document.createElement("option");
          o.value = value;
          o.textContent = label;
          return o;
        }),
      );
      if (options.some((o) => o[0] === current)) method.value = current;
    }
    if (!$("payZone").options.length)
      for (const z of config.policy.fulfillment.deliveryZones) {
        const o = document.createElement("option");
        o.value = z.id;
        o.textContent = z.label + " · " + money(z.feeCents);
        $("payZone").append(o);
      }
    const delivery = method.value === "Delivery";
    $("payZoneField").hidden = !delivery;
    $("payAddressField").hidden = !delivery;
    $("payAddress").required = delivery;
    $("payPostalField").hidden = !delivery;
    $("payPostal").required = delivery;
    $("payLead").textContent =
      "Please allow " +
      config.policy.fulfillment.leadDays +
      " days. " +
      (!delivery ? config.policy.fulfillment.pickupInstructions : "");
    $("payPolicy").textContent = config.policy.cancellationPolicy;
    const p = calculated(NebulaApp.state),
      eligible = p && (!p.includesCashValue || config.cashPaymentsApproved);
    $("orderSend").disabled = busy || !eligible;
    $("orderSend").textContent = busy
      ? "Preparing your secure checkout…"
      : "Review total & continue to Square";
    $("orderDemo").hidden = true;
    const banner = document.querySelector(".ray-preview>p");
    if (banner)
      banner.textContent =
        config.environment === "sandbox"
          ? "TEST CHECKOUT · no real charge"
          : config.name + " · Secure checkout with Square";
    const assumptions = document.querySelector(".ray-preview>details");
    if (assumptions) assumptions.hidden = true;
    const title = document.querySelector('[data-i18n="orderTitle"]');
    if (title) title.textContent = "Review your order.";
    const eyebrow = document.querySelector('[data-i18n="orderEyebrow"]');
    if (eyebrow) eyebrow.textContent = "SECURE CHECKOUT";
    const hint = document.querySelector('[data-i18n="orderHint"]');
    if (hint)
      hint.textContent =
        "Review your order total, then pay on Square. Your bouquet is saved if checkout is interrupted.";
    document
      .querySelectorAll('[data-i18n="orderFine"],[data-i18n="orderPrivacy"]')
      .forEach(
        (e) =>
          (e.textContent =
            "Payment details are entered on Square. The shop receives the order details needed to make and deliver your bouquet."),
      );
    const helper = document.querySelector(".ray-payment-preview>.helper");
    if (helper)
      helper.textContent =
        "Choose a 50% deposit or full payment. The balance is due at delivery.";
    const live = p ? price(NebulaApp.state) : null;
    if (p) {
      $("saveDisclaimer").textContent =
        "Current CAD total from the shop’s approved price rules. The server confirms the total before payment.";
      const rate = config.policy.usdToCad;
      $("rayRate").textContent = rate
        ? "USD $1 = CAD $" +
          (rate.numerator / rate.denominator).toFixed(4) +
          " · TD cash rate observed " +
          rate.asOf.slice(0, 10) +
          ". Valid until " +
          new Date(rate.expiresAt).toLocaleString() +
          "."
        : "USD conversion is not configured.";
    }
    if (live) {
      $("payFinal").textContent =
        "Order total " +
        money(p.totalCents) +
        " · " +
        (p.taxMode === "included"
          ? "Tax included"
          : p.taxMode === "added"
            ? "Includes " + money(p.taxCents) + " tax"
            : "No tax charged") +
        " · Due now " +
        money(p.payment.dueCents) +
        " · Remaining " +
        money(p.payment.balanceCents);
      $("rayPaymentAmount").textContent =
        "Due now: " +
        money(p.payment.dueCents) +
        " · Balance at delivery: " +
        money(p.payment.balanceCents);
      document.querySelector(".summary-price>span").textContent =
        "ORDER TOTAL · CAD";
      document.querySelector(".order-recap-total>[data-i18n]").textContent =
        "Order total:";
      $("orderRecapPrice").textContent = money(p.totalCents);
    } else
      $("payFinal").textContent =
        "This design includes an unavailable or unpriced option. Your design is safe; the shop must finish its price setup before it can be purchased.";
    if (p && !eligible)
      $("payFinal").textContent =
        "Checkout for shop-supplied cash is not currently enabled. Your design is saved.";
    if (config.environment === "sandbox") {
      $("payFinal").textContent =
        "TEST CHECKOUT — no real charge. " + $("payFinal").textContent;
    }
    $("payCancel").hidden = !pending?.id;
    $("payResume").hidden = !pending?.id;
    if (pending?.id)
      $("payResume").href = "payment-status.html#order=" + pending.id;
    for (const card of document.querySelectorAll("[data-flower]")) {
      const id = card.dataset.flower;
      const cash = RayCommerce.note(id);
      if (cash) {
        const value = RayPricing.convertCash(
          { ...cash, count: 1 },
          {
            denominations: RayCommerce.denominations,
            usdToCad: config.policy.usdToCad,
          },
        );
        const amount = card.querySelector("small");
        if (amount)
          amount.textContent =
            value.cadCents === null
              ? "Conversion unavailable"
              : money(value.cadCents);
        continue;
      }
      const label = card.querySelector("small");
      if (label)
        label.textContent = config.policy.enabledItems.includes(id)
          ? money(config.policy.unitCents[id])
          : "Preview only · unavailable for checkout";
    }
    for (const card of document.querySelectorAll("[data-detail]")) {
      const label = card.querySelector("small"),
        id = card.dataset.detail;
      if (label)
        label.textContent = config.policy.enabledExtras.includes(id)
          ? money(config.policy.extrasCents[id])
          : "Preview only · unavailable for checkout";
    }
  }
  function customer() {
    return {
      name: $("ordName").value,
      phone: $("ordPhone").value,
      email: $("payEmail").value,
      date: $("ordDate").value,
      ...fulfillment(),
      address: $("payAddress").value,
      note: $("ordNote").value,
    };
  }
  function persist() {
    try {
      sessionStorage.setItem(
        "nebula-checkout:" + settings.shopId,
        JSON.stringify(pending),
      );
      if (pending.id)
        localStorage.setItem(
          "nebula-order:" + settings.shopId + ":" + pending.id,
          pending.requestKey,
        );
    } catch {
      throw Error(
        "Allow browser storage to preserve this payment request before continuing.",
      );
    }
  }
  async function submit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy || !config?.available) return;
    build();
    if (!$("orderForm").reportValidity()) return;
    busy = true;
    error("");
    $("orderError").hidden = true;
    try {
      const design = NebulaModel.clone(NebulaApp.state),
        data = customer(),
        comparison = NebulaModel.clone(design);
      if (comparison.finishes.studio)
        delete comparison.finishes.studio.paymentPlan;
      const fingerprint = JSON.stringify({
        design: comparison,
        customer: data,
        policyVersion: config.policy.version,
      });
      if (pending && pending.fingerprint !== fingerprint) {
        if (pending.id)
          throw Error(
            "Cancel the saved checkout before changing its design, details or price.",
          );
        pending = null;
      }
      if (!pending) {
        pending = {
          requestKey: random(),
          fingerprint,
          body: {
            design,
            customer: data,
            policyVersion: config.policy.version,
          },
        };
        pending.body.requestKey = pending.requestKey;
        persist();
      }
      decorate();
      if (!pending.id) {
        const order = await api("quotes", {
          method: "POST",
          body: pending.body,
        });
        pending.id = order.id;
        pending.revision = order.revision;
        persist();
      }
      const order = await api("orders/" + pending.id + "/checkout", {
        method: "POST",
        key: pending.requestKey,
        body: {
          revision: pending.revision,
          choice: design.finishes.studio?.paymentPlan || "deposit",
        },
      });
      if (!order.request?.url)
        throw Error(
          "No payment link is available. Open the saved order status.",
        );
      const url = new URL(order.request.url),
        hosts =
          config.environment === "production"
            ? ["square.link", "checkout.square.site"]
            : ["sandbox.square.link"];
      if (url.protocol !== "https:" || !hosts.includes(url.hostname))
        throw Error(
          "The checkout response needs attention. No payment was confirmed.",
        );
      location.assign(url.href);
    } catch (e) {
      error(
        e.message || "Connection interrupted. Your order is saved. Try again.",
      );
    } finally {
      busy = false;
      decorate();
    }
  }
  async function load() {
    if (!settings?.endpoint) return;
    try {
      const url = new URL(settings.endpoint);
      if (
        url.protocol !== "https:" &&
        !(
          settings.environment === "sandbox" &&
          ["127.0.0.1", "localhost"].includes(url.hostname)
        )
      )
        return;
      settings.endpoint = url.href.replace(/\/$/, "");
      checking = true;
      const result = await api("config");
      if (
        result.environment !== settings.environment ||
        result.shopId !== settings.shopId
      )
        throw Error("Payment environment mismatch.");
      config = result;
      if (config.available) {
        await new Promise((resolve) => {
          if (g.__ready) return resolve();
          const timer = setInterval(() => {
            if (g.__ready) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(timer);
            resolve();
          }, 20000);
        });
        if (g.NebulaApp) {
          build();
          if (pending?.id) {
            try {
              const prior = await api("orders/" + pending.id, {
                key: pending.requestKey,
              });
              if (
                ["paid", "cancelled", "expired", "refunded"].includes(
                  prior.status,
                )
              ) {
                pending = null;
                sessionStorage.removeItem("nebula-checkout:" + settings.shopId);
              }
            } catch {}
          }
          NebulaApp.render(false);
          decorate();
        }
      }
    } catch {
      /* Preserve the original preview and disabled checkout. */
    } finally {
      checking = false;
    }
  }
  g.RayPayments = {
    get available() {
      return config?.available === true;
    },
    get config() {
      return config;
    },
    price,
    decorate,
    submit,
    api,
  };
  load();
})(window);
