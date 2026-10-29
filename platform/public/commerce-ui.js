const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function mountCommerce({ shop, api }) {
  const layout =
    document.querySelector(".dashboard-main") ||
    document.querySelector(".dashboard-content") ||
    document.querySelector("#main .workspace") ||
    document.querySelector("#main");
  if (!layout) return;
  const panel = document.createElement("section");
  panel.className = "surface commerce-panel";
  panel.style.marginTop = "24px";
  layout.append(panel);
  panel.innerHTML =
    '<p class="eyebrow">ONLINE ORDER SETTINGS</p><p class="helper">Loading saved checkout rules…</p>';
  try {
    const { settings: p } = await api(`/api/shops/${shop.id}/commerce`);
    if (!panel.isConnected) return;
    const checked = (v) => (v ? "checked" : "");
    panel.innerHTML = `<p class="eyebrow">EXACT PRICES. CLEAR EXPECTATIONS.</p><h2>Your online order rules.</h2><p class="subtle">These settings do not activate Square by themselves. Checkout also needs a connected account and Nebula’s tested payment service. Amounts use ${esc(shop.draft.currency)}.</p><form id="commerceSettings"><div class="form-grid"><label class="field">Tax rate · % (enter 0 only if correct)<input name="tax" type="number" min="0" max="30" step="0.01" value="${p.taxBps === null ? "" : p.taxBps / 100}"></label><label class="field">Delivery fee · ${esc(shop.draft.currency)}<input name="delivery" type="number" min="0" max="100000" step="0.01" value="${p.deliveryCents === null ? "" : p.deliveryCents / 100}"></label></div><label class="toggle-line"><input name="pickupEnabled" type="checkbox" ${checked(p.pickupEnabled)}> Offer pickup</label><label class="toggle-line"><input name="deliveryEnabled" type="checkbox" ${checked(p.deliveryEnabled)}> Offer delivery at the fee above</label><label class="field">Fulfillment, cancellation and refund terms<textarea name="terms" maxlength="2000" rows="5" placeholder="State when orders are ready, delivery conditions, cancellation/refund terms and when any remaining balance is due.">${esc(p.terms)}</textarea></label><fieldset><legend>Products containing cash / banknotes</legend><p class="helper">These remain available for enquiries, but online card checkout is blocked pending eligibility review. Mark every relevant product.</p>${shop.draft.products.map((item) => `<label class="toggle-line"><input name="cashProduct" value="${esc(item.id)}" type="checkbox" ${checked(p.cashProductIds.includes(item.id))}> ${esc(item.title)}</label>`).join("") || '<p class="helper">No fixed products yet.</p>'}</fieldset><label class="toggle-line"><input name="pricesApproved" type="checkbox" ${checked(p.pricesApproved)}> I approve the exact catalogue/product prices and the tax and delivery rules above.</label><label class="toggle-line"><input name="enabled" type="checkbox" ${checked(p.enabled)}> Allow online checkout when Square and the platform are ready</label><p class="helper">Customers may choose a 50% deposit (rounded up to the cent) or full payment. Tax applies to items plus delivery. Confirm that these rules fit your business before enabling.</p><button class="button secondary" type="submit">Save checkout rules</button><p id="commerceResult" class="helper" role="status"></p></form><details style="margin-top:24px"><summary>Saved payment orders</summary><div id="paymentOrders"><button type="button" class="plain-button" id="loadPaymentOrders">Load payment history ↻</button></div></details>`;
    let version = p.version;
    panel.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.submitter;
      b.disabled = true;
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
            taxBps: amount("tax"),
            deliveryCents: amount("delivery"),
            pickupEnabled: f.get("pickupEnabled") === "on",
            deliveryEnabled: f.get("deliveryEnabled") === "on",
            terms: String(f.get("terms")),
            cashProductIds: f.getAll("cashProduct"),
          },
        });
        version = result.settings.version;
        panel.querySelector("#commerceResult").textContent =
          "Checkout rules saved. Existing paid orders keep their agreed totals.";
      } catch (error) {
        panel.querySelector("#commerceResult").textContent = error.message;
      } finally {
        b.disabled = false;
      }
    };
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
