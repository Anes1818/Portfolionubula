import { normalizeFulfillmentRules } from "/fulfillment-rules.mjs";
import { icon } from "/icons.js";
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function mountCommerce({ shop, api, square = null, config = {} }) {
  const layout =
    document.querySelector(".dashboard-main") ||
    document.querySelector(".dashboard-content") ||
    document.querySelector("#main .workspace") ||
    document.querySelector("#main");
  if (!layout) return;
  const panel = document.createElement("section");
  panel.className = "surface commerce-panel";
  panel.dataset.shopId = shop.id;
  panel.style.marginTop = "24px";
  const next = layout.querySelector(".setup-next");
  if (next) next.before(panel);
  else layout.append(panel);
  panel.innerHTML =
    '<p class="eyebrow">ONLINE ORDER SETTINGS</p><p class="helper">Loading saved checkout rules…</p>';
  const renderReadiness = (p) => {
    const planActive =
      shop.subscription?.status === "active" &&
      Number(shop.subscription?.paidUntil) > Date.now();
    const squareReady = Boolean(square?.connected && square?.locationId);
    const rulesComplete = Boolean(
      p.enabled &&
        p.pricesApproved &&
        p.taxBps !== null &&
        (p.pickupEnabled || (p.deliveryEnabled && p.deliveryCents !== null)) &&
        typeof p.terms === "string" &&
        p.terms.trim().length >= 20,
    );
    const publishedMatch = Boolean(
      shop.published && shop.published.draft?.currency === shop.draft.currency,
    );
    const serviceEnabled = config.checkoutEnabled !== false;
    const allReady =
      planActive &&
      squareReady &&
      rulesComplete &&
      publishedMatch &&
      serviceEnabled;
    const items = [
      [planActive, "Active shop plan"],
      [
        squareReady,
        square?.connected
          ? square?.locationId
            ? "Square connected & location selected"
            : "Choose a Square location above"
          : "Connect Square above",
      ],
      [rulesComplete, "Online order rules completed, approved & enabled below"],
      [
        publishedMatch,
        shop.published
          ? "Published storefront currency matches (" +
            esc(shop.draft.currency) +
            ")"
          : "Publish your storefront in Plan & Publish",
      ],
    ];
    return `<div class="notice" id="checkoutReadinessBox" style="margin-bottom:18px"><strong>${allReady ? (config.squareEnvironment === "sandbox" ? "✓ Sandbox payments are ready" : "✓ Online Square checkout is live for your customers") : "Online Square checkout checklist"}</strong><details class="setup-details" ${!allReady && square?.connected ? "open" : ""}><summary>${allReady ? "View setup checklist" : "What is missing?"}</summary><ul style="margin:8px 0 0 18px;padding:0">${items.map(([ok, text]) => `<li>${ok ? "✓" : "○"} ${text}</li>`).join("")}</ul></details>${!serviceEnabled ? '<p class="helper" style="margin-top:6px">Online payments are not open on this environment yet. Message requests still work after publishing.</p>' : ""}</div>`;
  };
  try {
    const { settings: p } = await api(`/api/shops/${shop.id}/commerce`);
    if (!panel.isConnected) return;
    let savedSettings = p;
    panel.updateSquare = (connection) => {
      square = connection;
      const slot = panel.querySelector("#checkoutReadinessSlot");
      if (slot) slot.innerHTML = renderReadiness(savedSettings);
    };
    const checked = (v) => (v ? "checked" : "");
    const rules = normalizeFulfillmentRules(p.fulfillmentRules);
    const zoneRow = (
      zone = {
        id: "zone_" + crypto.randomUUID().slice(0, 12),
        name: "",
        postcodes: [],
        feeCents: null,
      },
    ) =>
      `<div class="delivery-zone" data-zone-id="${esc(zone.id)}"><label class="field">Area name<input data-zone-name maxlength="60" value="${esc(zone.name)}" placeholder="Central Toronto"></label><label class="field">Postal codes<input data-zone-codes maxlength="1000" value="${esc(zone.postcodes.join(", "))}" placeholder="M5V*, M5H*"></label><label class="field">Fee · ${esc(shop.draft.currency)}<input data-zone-fee type="number" min="0" max="100000" step="0.01" inputmode="decimal" value="${zone.feeCents === null ? "" : (zone.feeCents / 100).toFixed(2)}"></label><button type="button" class="plain-button danger" data-remove-zone aria-label="Remove delivery area ${esc(zone.name)}">Remove area</button></div>`;
    panel.innerHTML = `<p class="eyebrow">${icon("settings")} ORDER SETTINGS</p><h2>Pickup, delivery &amp; payment.</h2><p class="subtle">Set your charges and terms once. Amounts use ${esc(shop.draft.currency)}.</p><div id="checkoutReadinessSlot">${renderReadiness(p)}</div><details class="setup-details checkout-settings" open><summary>Choose pickup, delivery &amp; payment</summary><form id="commerceSettings"><div class="form-grid"><label class="field">Delivery fee · ${esc(shop.draft.currency)}<input name="delivery" type="number" min="0" max="100000" step="0.01" value="${p.deliveryCents === null ? "" : p.deliveryCents / 100}"></label></div><label class="toggle-line"><input name="pickupEnabled" type="checkbox" ${checked(p.pickupEnabled)}> Offer pickup</label><label class="toggle-line"><input name="deliveryEnabled" type="checkbox" ${checked(p.deliveryEnabled)}> Offer delivery</label><label class="field">Delivery areas &amp; instructions<textarea name="deliveryNote" maxlength="600" rows="3" placeholder="For example: Delivery within Toronto and North York. Include any area restrictions.">${esc(p.deliveryNote || "")}</textarea><span class="helper">Shown on your shop and when customers order delivery. Use area fees below if different neighbourhoods have different charges.</span></label><details class="setup-details fulfillment-options"><summary>Delivery zones &amp; preparation calendar</summary><p class="helper">Shop time zone: ${esc(shop.draft.timeZone || "UTC")} · <a href="/dashboard/shop" data-nav>Change shop country/time zone</a>. These rules are checked before a customer submits an order.</p><label class="toggle-line"><input name="enforceDeliveryZones" type="checkbox" ${checked(rules.enforceDeliveryZones)}> Limit delivery to these postal codes and use zone fees</label><div data-delivery-zones>${rules.deliveryZones.map(zoneRow).join("")}</div><button type="button" class="button secondary small" data-add-zone>Add delivery area +</button><p class="helper">Separate postal codes with commas. Use * at the end for a prefix, for example M5V*. Up to 10 areas. The most specific postal code wins. Customers outside these areas can choose pickup.</p><label class="toggle-line"><input name="calendarEnabled" type="checkbox" ${checked(rules.calendarEnabled)}> Require an available date and preparation time</label><label class="field">Preparation time · hours<input type="number" name="leadHours" min="0" max="720" step="1" value="${rules.leadHours}"><span class="helper">The earliest order date allows this preparation time. This does not promise an exact delivery time.</span></label><label class="field">Same-day order cutoff · shop local time<input type="time" name="sameDayCutoff" value="${esc(rules.sameDayCutoff)}"></label><fieldset><legend>Days closed for pickup and delivery</legend><div class="mode-options">${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => `<label class="toggle-line"><input name="closedWeekday" type="checkbox" value="${index}" ${checked(rules.closedWeekdays.includes(index))}>${day}</label>`).join("")}</div></fieldset><label class="field">Extra closure dates<textarea name="closedDates" rows="2" placeholder="2026-12-25, 2027-01-01">${esc(rules.closedDates.join(", "))}</textarea><span class="helper">YYYY-MM-DD dates separated by commas. Up to 90 dates.</span></label></details><details class="setup-details payment-options" ${square?.connected ? "open" : ""}><summary>Online payment rules · Square</summary><label class="field">Customer payment choices<select name="paymentOptions"><option value="full" ${p.paymentOptions === "full" ? "selected" : ""}>Full payment only</option><option value="full_and_deposit" ${p.paymentOptions !== "full" ? "selected" : ""}>Full payment or 50% deposit</option></select><span class="helper">Square securely collects the amount due. Explain when the remaining balance is due in your terms.</span></label><label class="field">Tax rate · % (enter 0 only if correct)<input name="tax" type="number" min="0" max="30" step="0.01" value="${p.taxBps === null ? "" : p.taxBps / 100}"></label><label class="field">Fulfillment, cancellation and refund terms<textarea name="terms" maxlength="2000" rows="5" placeholder="State when orders are ready, delivery conditions, cancellation/refund terms and when any remaining balance is due.">${esc(p.terms)}</textarea></label><details class="setup-details"><summary>Cash / banknote products</summary><fieldset><legend>Products containing cash / banknotes</legend><p class="helper">These remain available for enquiries, but online card checkout is blocked pending eligibility review. Mark every relevant product.</p>${shop.draft.products.map((item) => `<label class="toggle-line"><input name="cashProduct" value="${esc(item.id)}" type="checkbox" ${checked(p.cashProductIds.includes(item.id))}> ${esc(item.title)}</label>`).join("") || '<p class="helper">No fixed products yet.</p>'}</fieldset></details><label class="toggle-line"><input name="pricesApproved" type="checkbox" ${checked(p.pricesApproved)}> I approve the exact catalogue/product prices and the tax and delivery rules above.</label><label class="toggle-line"><input name="enabled" type="checkbox" ${checked(p.enabled)}> Allow online checkout when Square and the platform are ready</label><p class="helper">Your payment choice controls what customers can pay. A 50% deposit is rounded up to the cent; the rest stays on the saved order. Tax applies to items plus delivery.</p></details><button class="button secondary" type="submit">Save order settings</button><p id="commerceResult" class="helper" role="status"></p></form></details><details style="margin-top:24px"><summary>Saved payment orders</summary><div id="paymentOrders"><button type="button" class="plain-button" id="loadPaymentOrders">Load payment history ↻</button></div></details>`;
    const settingsForm = panel.querySelector("#commerceSettings");
    // Ask the fulfillment question before showing charges or geographic rules.
    const fulfillment = document.createElement("fieldset");
    fulfillment.className = "fulfillment-method";
    fulfillment.innerHTML =
      '<legend>How do customers receive their bouquet?</legend><p class="helper">Offer pickup, delivery, or both.</p>';
    for (const name of ["pickupEnabled", "deliveryEnabled"])
      fulfillment.append(settingsForm.elements[name].closest("label"));
    settingsForm.prepend(fulfillment);
    const deliveryBox = document.createElement("div");
    deliveryBox.dataset.deliverySettings = "";
    const deliveryField = settingsForm.elements.delivery.closest(".form-grid"),
      noteField = settingsForm.elements.deliveryNote.closest("label"),
      advanced = settingsForm.querySelector(".fulfillment-options");
    fulfillment.after(deliveryBox);
    deliveryBox.append(deliveryField, noteField);
    // Split postal areas from the preparation calendar so pickup shops can use dates too.
    const areaBox = document.createElement("details");
    areaBox.className = "setup-details";
    areaBox.innerHTML =
      "<summary>Limit delivery areas & set area fees</summary>";
    const zoneToggle =
        settingsForm.elements.enforceDeliveryZones.closest("label"),
      zones = advanced.querySelector("[data-delivery-zones]"),
      add = advanced.querySelector("[data-add-zone]");
    areaBox.append(zoneToggle, zones, add, add.nextElementSibling);
    deliveryBox.append(areaBox);
    advanced.querySelector("summary").textContent =
      "Preparation time & days closed";
    const syncDelivery = () => {
      deliveryBox.hidden = !settingsForm.elements.deliveryEnabled.checked;
    };
    settingsForm.elements.deliveryEnabled.addEventListener(
      "change",
      syncDelivery,
    );
    syncDelivery();
    const zoneList = panel.querySelector("[data-delivery-zones]");
    const addZone = panel.querySelector("[data-add-zone]");
    const updateZoneLimit = () => {
      addZone.disabled = zoneList.children.length >= 10;
    };
    addZone.onclick = () => {
      if (zoneList.children.length >= 10) return;
      zoneList.insertAdjacentHTML("beforeend", zoneRow());
      updateZoneLimit();
      zoneList.lastElementChild.querySelector("input").focus();
    };
    zoneList.onclick = (event) => {
      const remove = event.target.closest("[data-remove-zone]");
      if (!remove) return;
      remove.closest("[data-zone-id]").remove();
      updateZoneLimit();
      addZone.focus();
    };
    updateZoneLimit();
    let version = p.version;
    if (
      config.sandboxTestAccess === true &&
      config.squareEnvironment === "sandbox"
    ) {
      const shortcut = document.createElement("div");
      shortcut.className = "notice";
      shortcut.innerHTML =
        '<strong>Test instant payments</strong><p>Enable direct Sandbox checkout in one step. Keep entered rates and fees; empty amounts use 0 for this test, with pickup if no fulfillment option is selected. Sample test terms fill incomplete terms. Square connection and publication are still required.</p><button type="button" class="button secondary small" id="enableSandboxCheckout">Enable Sandbox test checkout</button>';
      panel.querySelector("#checkoutReadinessSlot").after(shortcut);
      shortcut.querySelector("button").onclick = () => {
        if (
          !confirm(
            "Approve the current test catalogue and enable instant Sandbox payments? Empty tax/delivery amounts become 0 for this test. Existing rates, fees and fulfillment choices are kept. Incomplete terms receive a Sandbox test notice. No real money is charged.",
          )
        )
          return;
        const form = panel.querySelector("#commerceSettings");
        for (const name of ["tax", "delivery"])
          if (!form.elements[name].value.trim())
            form.elements[name].value = "0";
        if (
          !form.elements.pickupEnabled.checked &&
          !form.elements.deliveryEnabled.checked
        )
          form.elements.pickupEnabled.checked = true;
        if (form.elements.terms.value.trim().length < 20)
          form.elements.terms.value +=
            "\nSandbox testing only. Simulated orders and payments; no fulfillment.";
        form.elements.pricesApproved.checked = true;
        form.elements.enabled.checked = true;
        form.closest("details").open = true;
        form.requestSubmit(form.querySelector('button[type="submit"]'));
      };
    }
    const form = panel.querySelector("form");
    let unsaved = false,
      inFlight = null,
      editVersion = 0;
    const markUnsaved = () => {
      editVersion++;
      unsaved = true;
      panel.querySelector("#commerceResult").textContent =
        "Unsaved order settings · Save below or choose Save & continue.";
    };
    form.addEventListener("input", markUnsaved);
    form.addEventListener("change", markUnsaved);
    zoneList.addEventListener("click", (event) => {
      if (event.target.closest("[data-remove-zone]")) markUnsaved();
    });
    addZone.addEventListener("click", markUnsaved);
    const submitSettings = async (e) => {
      e.preventDefault();
      const submittedVersion = editVersion;
      const b = e.submitter;
      b.disabled = true;
      const quick = panel.querySelector("#enableSandboxCheckout");
      if (quick) quick.disabled = true;
      const f = new FormData(e.target);
      const amount = (name) =>
        String(f.get(name)).trim() === ""
          ? null
          : Math.round(Number(f.get(name)) * 100);
      try {
        const result = await api(`/api/shops/${shop.id}/commerce`, {
          method: "PUT",
          body: {
            version,
            enabled: f.get("enabled") === "on",
            pricesApproved: f.get("pricesApproved") === "on",
            paymentOptions: String(
              f.get("paymentOptions") || "full_and_deposit",
            ),
            taxBps: amount("tax"),
            deliveryCents: amount("delivery"),
            deliveryNote: String(f.get("deliveryNote") || ""),
            pickupEnabled: f.get("pickupEnabled") === "on",
            deliveryEnabled: f.get("deliveryEnabled") === "on",
            terms: String(f.get("terms")),
            cashProductIds: f.getAll("cashProduct"),
            fulfillmentRules: {
              calendarEnabled: f.get("calendarEnabled") === "on",
              closedWeekdays: f.getAll("closedWeekday").map(Number),
              closedDates: String(f.get("closedDates") || "")
                .split(/[,\s]+/)
                .filter(Boolean),
              leadHours: Number(f.get("leadHours")),
              sameDayCutoff: String(f.get("sameDayCutoff") || ""),
              enforceDeliveryZones: f.get("enforceDeliveryZones") === "on",
              deliveryZones: [
                ...zoneList.querySelectorAll("[data-zone-id]"),
              ].map((row) => {
                const name = row.querySelector("[data-zone-name]").value.trim(),
                  codes = row.querySelector("[data-zone-codes]").value,
                  fee = row.querySelector("[data-zone-fee]").value.trim();
                if (!name || !codes.trim() || !/^\d+(?:\.\d{1,2})?$/.test(fee))
                  throw Error(
                    "Enter a name, postal codes and a fee for each delivery area, or remove the unused area.",
                  );
                return {
                  id: row.dataset.zoneId,
                  name,
                  postcodes: codes
                    .split(",")
                    .map((code) => code.trim())
                    .filter(Boolean),
                  feeCents: Math.round(Number(fee) * 100),
                };
              }),
            },
          },
        });
        version = result.settings.version;
        savedSettings = result.settings;
        unsaved = editVersion !== submittedVersion;
        panel.querySelector(".checkout-settings > summary").textContent = result
          .settings.enabled
          ? "Choose pickup, delivery & payment"
          : "Choose pickup, delivery & payment";
        const slot = panel.querySelector("#checkoutReadinessSlot");
        if (slot) slot.innerHTML = renderReadiness(result.settings);
        panel.querySelector("#commerceResult").textContent = unsaved
          ? "Earlier changes saved. Save your latest edits before leaving."
          : "Checkout rules saved. Existing paid orders keep their agreed totals.";
        return true;
      } catch (error) {
        panel.querySelector("#commerceResult").textContent = error.message;
        return false;
      } finally {
        b.disabled = false;
        if (quick) quick.disabled = false;
      }
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!inFlight)
        inFlight = submitSettings(event).finally(() => {
          inFlight = null;
        });
      return inFlight;
    };
    panel.saveIfNeeded = async () => {
      if (inFlight && !(await inFlight)) return false;
      if (!unsaved) return true;
      if (!form.reportValidity()) return false;
      const ok = await form.onsubmit({
        preventDefault() {},
        target: form,
        submitter: form.querySelector('button[type="submit"]'),
      });
      return ok && (unsaved ? panel.saveIfNeeded() : true);
    };
    panel.hasUnsaved = () => unsaved || !!inFlight;
    let cursor,
      loaded = false;
    panel.querySelector("#loadPaymentOrders").onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        const data = await api(
          `/api/shops/${shop.id}/checkout/merchant${cursor ? "?cursor=" + encodeURIComponent(cursor) : ""}`,
        );
        const money = (n) =>
          new Intl.NumberFormat("en", {
            style: "currency",
            currency: shop.draft.currency,
          }).format(n / 100);
        for (const q of data.orders) {
          const row = document.createElement("p");
          row.className = "helper";
          row.textContent = `${q.customer.name} · ${q.id} · ${q.status} · Total ${money(q.totalCents)} · Paid ${money(q.paidCents)} · Balance ${money(q.balanceCents)}`;
          b.before(row);
        }
        cursor = data.cursor;
        b.textContent = cursor
          ? "Load more orders"
          : "All saved payment orders loaded";
        loaded = true;
      } catch (error) {
        b.textContent = error.message;
      } finally {
        b.disabled = loaded && !cursor;
      }
    };
  } catch (error) {
    if (panel.isConnected) panel.textContent = error.message;
  }
}
