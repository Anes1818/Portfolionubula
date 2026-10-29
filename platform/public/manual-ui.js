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
      '<p class="eyebrow">ISOLATED SQUARE SANDBOX</p><h2>Test your shop.</h2><p>This environment does not collect subscription payments. Ask the Nebula administrator to grant seven days of test access in the separate administration console. Never send a real PayPal payment for this sandbox.</p>';
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

// Keep an uncertain action intact if the directory rerenders or selection changes.
// These are operation details, never credentials; nothing is automatically retried.
const activationPanels = new Map();
export function clearActivationPanels() {
  for (const state of activationPanels.values()) state.listeners.clear();
  activationPanels.clear();
}

export async function mountActivationAdmin({
  shop,
  config,
  api,
  onChange,
  reauthenticate,
  reauthMethod = "google",
}) {
  if (!shop || !config.manualActivationEnabled) return;
  const target = document.querySelector(".admin-detail");
  if (!target) return;
  const sandbox = config.sandboxTestAccess === true;
  const key = `${sandbox ? "sandbox" : "live"}:${shop.id}`;
  if (!activationPanels.has(key))
    activationPanels.set(key, {
      data: null,
      pending: null,
      unknown: false,
      busy: false,
      loading: false,
      reauthBusy: false,
      needsReauth: false,
      notice: "",
      error: false,
      fields: { reference: "", confirmed: false },
      listeners: new Set(),
    });
  const state = activationPanels.get(key);
  target.querySelector(".manual-admin-panel")?.remove();
  const panel = document.createElement("section");
  panel.className = "manual-admin-panel";
  panel.dataset.shopId = shop.id;
  const email = target.querySelector("h2")?.nextElementSibling;
  if (email) email.after(panel);
  else target.prepend(panel);
  const notify = () => {
    for (const listener of state.listeners) {
      if (!listener()) state.listeners.delete(listener);
    }
  };
  const setNotice = (text, error = false) => {
    state.notice = text;
    state.error = error;
  };
  const draw = () => {
    if (!panel.isConnected) return false;
    const data = state.data;
    const locked = state.busy || state.reauthBusy || state.loading;
    panel.setAttribute("aria-busy", String(locked));
    const pending = state.pending;
    const history = data?.history || [];
    panel.innerHTML = `<hr><p class="eyebrow">${sandbox ? "SANDBOX · NO REAL PAYMENT" : "LIVE · MANUAL PAYPAL VERIFICATION"}</p><h3>Access & subscription</h3><p class="helper">${escape(shop.draft?.name || shop.slug || shop.id)}</p>${data ? `<p>Status: <strong>${escape(data.subscription.status)}</strong><br>Access ends: <strong>${escape(date(data.subscription.paidUntil))}</strong></p><p class="helper">${data.request?.status === "pending" ? "Activation request is waiting." : "No pending activation request."}</p>` : ""}<p id="activationResult" class="notice ${state.error ? "error" : state.notice ? "success" : ""}" role="status" aria-live="polite">${escape(state.notice || (state.loading ? "Loading subscription details…" : ""))}</p>${
      data
        ? `${sandbox ? `<button class="button small" id="grantSandboxAccess" type="button" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "test" ? "Activating test access…" : pending?.action === "test" ? "Test activation awaiting confirmation" : "Grant 7-day sandbox access · no payment"}</button>` : `<form id="manualActivationForm"><label class="field">PayPal transaction reference<input name="reference" maxlength="80" pattern="[A-Z0-9-]{8,80}" value="${escape(state.fields.reference)}" placeholder="Transaction ID from your PayPal activity" required ${locked || pending ? "disabled" : ""}></label><label class="toggle-line"><input name="confirmed" type="checkbox" required ${state.fields.confirmed ? "checked" : ""} ${locked || pending ? "disabled" : ""}> I verified the USD 29 commercial payment in PayPal for this shop.</label><button class="button small" type="submit" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "extend" ? "Recording verified payment…" : pending?.action === "extend" ? "Activation awaiting confirmation" : "Record payment & activate 30 days"}</button></form>`}<button class="button secondary small" id="suspendAccess" type="button" style="margin-top:12px" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "suspend" ? "Suspending…" : pending?.action === "suspend" ? "Suspension awaiting confirmation" : "Suspend access"}</button>${pending ? `<button class="button small" id="retryActivation" type="button" ${locked || state.needsReauth ? "disabled" : ""}>${pending.action === "extend" ? "Retry saved activation" : pending.action === "test" ? "Retry saved test activation" : "Retry saved suspension"}</button><p class="helper">This action is saved for a safe retry. Its operation ID and details will stay the same until the server confirms the result.</p>` : '<p class="helper">Extending preserves remaining paid days. Activation does not publish the draft.</p>'}`
        : ""
    }${state.needsReauth ? `<section class="activation-reauth"><p class="helper">Verify your administrator identity, then retry the saved action. Verification alone does not activate this shop.</p>${reauthMethod === "password" ? `<label class="field">Administrator password<input id="activationPassword" type="password" autocomplete="current-password" ${locked ? "disabled" : ""}></label>` : ""}<button class="button secondary small" id="verifyAdminSession" type="button" ${locked || typeof reauthenticate !== "function" ? "disabled" : ""}>${state.reauthBusy ? "Verifying administrator…" : "Verify administrator session"}</button></section>` : ""}<button class="plain-button" id="retryActivationLoad" type="button" ${locked ? "disabled" : ""}>${state.loading ? "Loading…" : data ? "Refresh subscription details" : "Retry loading subscription"}</button><details><summary>Activation audit (${history.length} most recent)</summary>${history.map((r) => `<p class="helper">${escape(date(r.at))} · ${escape(r.action)}${r.paymentReference ? " · " + escape(r.paymentReference) : ""}<br>Administrator: ${escape(r.actor)}</p>`).join("") || '<p class="helper">No access changes recorded.</p>'}</details>`;
    const form = panel.querySelector("#manualActivationForm");
    if (form) {
      // Always reach our visible validation message rather than a silent native block.
      form.noValidate = true;
      form.querySelector('[name="reference"]').oninput = (e) => {
        state.fields.reference = e.target.value;
      };
      form.querySelector('[name="confirmed"]').onchange = (e) => {
        state.fields.confirmed = e.target.checked;
      };
      form.onsubmit = (e) => {
        e.preventDefault();
        submit("extend");
      };
    }
    panel
      .querySelector("#grantSandboxAccess")
      ?.addEventListener("click", () => submit("test"));
    panel.querySelector("#suspendAccess")?.addEventListener("click", () => {
      if (
        !pending &&
        !confirm(
          "Suspend this shop’s public access? Designs and order records remain saved. This does not refund PayPal.",
        )
      )
        return;
      submit("suspend");
    });
    panel.querySelector("#retryActivationLoad").onclick = load;
    panel
      .querySelector("#retryActivation")
      ?.addEventListener("click", () => submit(state.pending.action));
    panel
      .querySelector("#verifyAdminSession")
      ?.addEventListener("click", verify);
    return true;
  };
  state.listeners.add(draw);
  async function load() {
    if (state.loading || state.busy || state.reauthBusy) return;
    state.loading = true;
    notify();
    try {
      state.data = await api(`/api/admin/shops/${shop.id}/activation`);
      if (!state.pending && (state.error || !state.notice))
        setNotice("Subscription details loaded.");
    } catch (error) {
      if (error.status === 401) state.needsReauth = true;
      setNotice(
        error.message || "Subscription details could not load. Retry below.",
        true,
      );
    } finally {
      state.loading = false;
      notify();
    }
  }
  async function submit(action) {
    if (state.busy || state.loading || state.reauthBusy || !state.data) return;
    if (state.pending && state.pending.action !== action) return;
    if (!state.pending) {
      const reference = state.fields.reference.trim();
      if (
        action === "extend" &&
        (!/^[A-Z0-9-]{8,80}$/.test(reference) || !state.fields.confirmed)
      ) {
        setNotice(
          "Enter the PayPal reference and confirm the verified USD 29 payment.",
          true,
        );
        notify();
        return;
      }
      state.pending = Object.freeze({
        operationId: crypto.randomUUID(),
        revision: state.data.subscription.revision || 0,
        action,
        ...(action === "extend"
          ? {
              paymentReference: reference,
              amountCents: 2900,
              currency: "USD",
              confirmed: true,
            }
          : {}),
      });
      state.unknown = false;
    }
    const body = state.pending;
    state.busy = true;
    setNotice(
      action === "test"
        ? "Activating seven days of test access…"
        : action === "suspend"
          ? "Suspending this shop’s access…"
          : "Recording the verified payment and activating access…",
    );
    notify();
    let result;
    try {
      result = await api(`/api/admin/shops/${shop.id}/activation`, {
        method: "POST",
        body,
      });
    } catch (error) {
      const status = error.status || error.statusCode || 0;
      if (status === 401) state.needsReauth = true;
      // Network/server failures can occur after a commit. Never make a new ID then.
      if (!status || status >= 500) state.unknown = true;
      else if (status !== 401 && !state.unknown) state.pending = null;
      setNotice(
        `${error.message || "The result is not confirmed."} ${state.pending ? "Retry this same saved action; do not record a second payment." : "Review the details and refresh before trying again."}`,
        true,
      );
    }
    if (result) {
      state.pending = null;
      state.unknown = false;
      state.needsReauth = false;
      if (action === "extend")
        state.fields = { reference: "", confirmed: false };
      if (state.data) state.data.subscription = result.shop.subscription;
      const message =
        action === "test"
          ? "Test access activated for seven days. The florist can now publish a complete draft."
          : action === "suspend"
            ? "Shop access suspended. Saved designs and order records are retained."
            : "Verified payment recorded. Shop access is active for 30 days, preserving remaining paid days.";
      setNotice(message);
      try {
        await onChange(result.shop, message);
      } catch {
        setNotice(message + " Refresh the customer list to update its status.");
      }
    }
    state.busy = false;
    notify();
    // A remounted selected panel still needs fresh audit data; notify only draws
    // connected panels, so this cannot write into the detached original panel.
    if (result && state.listeners.size) await load();
  }
  async function verify() {
    if (
      state.busy ||
      state.reauthBusy ||
      state.loading ||
      typeof reauthenticate !== "function"
    )
      return;
    const input = panel.querySelector("#activationPassword");
    const password = input?.value || "";
    if (reauthMethod === "password" && !password) {
      setNotice(
        "Enter your administrator password to verify the session.",
        true,
      );
      notify();
      return;
    }
    if (input) input.value = "";
    state.reauthBusy = true;
    setNotice("Verifying administrator identity…");
    notify();
    try {
      await reauthenticate(password);
      state.needsReauth = false;
      setNotice(
        state.pending
          ? "Administrator verified. Retry the saved action when ready; no activation was submitted by verification."
          : "Administrator verified. Refresh the subscription details before choosing an action.",
      );
    } catch (error) {
      setNotice(
        error.message || "Administrator verification did not complete.",
        true,
      );
    } finally {
      state.reauthBusy = false;
      notify();
    }
  }
  draw();
  await load();
}
