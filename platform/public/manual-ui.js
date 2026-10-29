const escape = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (v) => (v ? new Date(v).toLocaleString() : "Not activated");

export function mountManualPlan({ shop, config, api, onChange }) {
  if (!config.manualActivationEnabled) return;
  const target = document.querySelector(".plan-surface");
  if (!target) return;
  const pending = shop.activationRequest?.status === "pending";
  if (config.sandboxTestAccess) {
    target.innerHTML =
      '<p class="eyebrow">ISOLATED SQUARE SANDBOX</p><h2>Test your shop.</h2><p>This environment does not collect subscription payments. A platform administrator can grant seven days of test access. Never send a real PayPal payment for this sandbox.</p>';
    return;
  }
  target.innerHTML = `<p class="eyebrow">PREVIEW FIRST. OPEN WHEN READY.</p><h2>Your shop,<br>on your terms.</h2><div class="plan-price"><strong>$29</strong><span>USD / 30 days</span></div><p>Payment and activation are reviewed by Nebula. There is no automatic charge or renewal.</p><ul class="feature-list"><li>Your branded storefront and bouquet builder</li><li>Six customisable bouquets and ten fixed products</li><li>Optional Square connection, after setup and testing</li></ul><p>Current access ends: <strong>${escape(date(shop.subscription?.paidUntil))}</strong></p><button class="button light" id="requestActivation">${pending ? "Activation requested · resend details" : "Request activation / renewal ↗"}</button><p id="manualPlanMessage" class="helper" role="status">${pending ? "Your request is saved in Nebula’s admin dashboard. Contact us below to arrange your commercial PayPal invoice." : "Save your activation request, then contact Nebula with your shop reference. Payment alone does not publish your draft."}</p><p><a style="color:inherit" href="https://www.instagram.com/nebulaa_studio" target="_blank" rel="noopener noreferrer">Message Nebula on Instagram ↗</a></p><p class="helper">Shop reference: ${escape(shop.id)}<br>Only pay an invoice you recognise. Your shop activates after the payment is verified and access is granted.</p>`;
  target.querySelector("#requestActivation").onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const data = await api(
        `/api/shops/${shop.id}/billing/activation-request`,
        { method: "POST", body: {} },
      );
      target.querySelector("#manualPlanMessage").textContent =
        "Request saved. Message @nebulaa_studio with your shop reference to arrange your invoice.";
      onChange(data.shop);
    } catch (error) {
      target.querySelector("#manualPlanMessage").textContent = error.message;
    } finally {
      b.disabled = false;
    }
  };
}

export async function mountActivationAdmin({ shop, config, api, onChange }) {
  if (!shop || !config.manualActivationEnabled) return;
  const target = document.querySelector(".admin-detail");
  if (!target) return;
  const panel = document.createElement("section");
  panel.className = "manual-admin-panel";
  target.append(panel);
  const render = async () => {
    try {
      const data = await api(`/api/admin/shops/${shop.id}/activation`);
      if (!panel.isConnected) return;
      let operationId = crypto.randomUUID(),
        busy = false;
      panel.innerHTML = `<hr><p class="eyebrow">MANUAL ACCESS · PAYPAL</p><h3>Activate or extend 30 days</h3><p class="helper">Status: ${escape(data.subscription.status)} · ends ${escape(date(data.subscription.paidUntil))}<br>${data.request?.status === "pending" ? "Activation request is waiting." : "No pending activation request."}</p><form id="manualActivationForm"><label class="field">PayPal transaction reference<input name="reference" maxlength="80" pattern="[A-Z0-9-]{8,80}" placeholder="Transaction ID from your PayPal activity" required></label><label class="toggle-line"><input name="confirmed" type="checkbox" required> I checked the USD 29 commercial payment in PayPal. The amount, currency and reference match this shop.</label><button class="button small" type="submit">Record payment & activate 30 days</button></form><button class="button secondary small" id="suspendAccess" type="button" style="margin-top:12px">Suspend access</button><p id="activationResult" class="helper" role="status">Changes require a recent administrator sign-in. Extending keeps remaining paid days.</p><details><summary>Activation audit (${data.history.length} most recent)</summary>${data.history.map((r) => `<p class="helper">${escape(date(r.at))} · ${escape(r.action)}${r.paymentReference ? " · " + escape(r.paymentReference) : ""}<br>Administrator: ${escape(r.actor)}</p>`).join("") || '<p class="helper">No manual access changes recorded.</p>'}</details>`;
      const submit = async (action, button) => {
        if (busy) return;
        busy = true;
        button.disabled = true;
        const form = panel.querySelector("form"),
          fields = new FormData(form);
        const body = {
          operationId,
          revision: data.subscription.revision || 0,
          action,
          ...(action === "extend"
            ? {
                paymentReference: String(fields.get("reference")).trim(),
                amountCents: 2900,
                currency: "USD",
                confirmed: fields.get("confirmed") === "on",
              }
            : {}),
        };
        try {
          const result = await api(`/api/admin/shops/${shop.id}/activation`, {
            method: "POST",
            body,
          });
          onChange(result.shop);
          await render();
        } catch (error) {
          panel.querySelector("#activationResult").textContent =
            error.message +
            " Keep the same reference when retrying; do not record a second payment.";
        } finally {
          busy = false;
          button.disabled = false;
        }
      };
      if (config.sandboxTestAccess) {
        const form = panel.querySelector("form");
        form.hidden = true;
        const test = document.createElement("button");
        test.className = "button small";
        test.textContent = "Grant 7-day sandbox access · no payment";
        form.before(test);
        test.onclick = () => submit("test", test);
      }
      panel.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        submit("extend", e.submitter);
      };
      panel.querySelector("#suspendAccess").onclick = (e) => {
        if (
          !confirm(
            "Suspend this shop’s public access? Designs and order records will be kept. This does not refund PayPal.",
          )
        )
          return;
        operationId = crypto.randomUUID();
        submit("suspend", e.currentTarget);
      };
    } catch (error) {
      if (panel.isConnected) panel.textContent = error.message;
    }
  };
  await render();
}
