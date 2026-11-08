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
  const active =
    shop.subscription?.status === "active" &&
    Number(shop.subscription?.paidUntil) > Date.now();
  if (config.sandboxTestAccess) {
    target.innerHTML =
      '<p class="eyebrow">ISOLATED SQUARE SANDBOX</p><h2>Test your shop.</h2><p>This environment does not collect subscription payments. Ask the Nebula administrator to grant seven days of test access in the separate administration console. Never send a real PayPal payment for this sandbox.</p>';
    return;
  }
  const preview = "/s/" + encodeURIComponent(shop.slug);
  const instagram = "https://www.instagram.com/nebulaa_studio/";
  const ownDomain =
    pending && shop.activationRequest.customDomainInterest === true;
  const domainTerms =
    "Own-domain option: $35 USD total for 30 days, subject to availability. Domain registration and renewal are separate.";
  const domainChoice = `<div class="activation-domain">
      <label><input type="checkbox" id="activationCustomDomain" aria-describedby="activationDomainTerms"> I’d like to use my own domain</label>
      <p class="helper" id="activationDomainTerms">${domainTerms}</p>
    </div>`;
  const requestMessage =
    `Hi Nebula! I requested ${active ? "renewal" : "activation"} for ${shop.draft.name} (shop: ${shop.slug}). ` +
    (ownDomain
      ? "I'm interested in the $35 USD own-domain option for 30 days. Could you confirm availability and the separate domain costs before I pay?"
      : "Could you send me the $29 USD PayPal invoice for 30 days of shop access?");
  const heading = pending
    ? active
      ? "Renewal requested"
      : "Activation requested"
    : active
      ? "Your plan is active"
      : "Activate your shop";
  const steps = pending
    ? `<div class="activation-next"><p><strong>${ownDomain ? "Next, confirm your domain option with Nebula." : "Next, message Nebula for your invoice."}</strong></p>
        <p>${ownDomain ? domainTerms : "After Nebula verifies payment, you can check your access here."} Copy the message and send it to @nebulaa_studio.</p>
        <div class="actions">
          <a class="button light" id="messageNebulaActivation" href="${instagram}" target="_blank" rel="noopener noreferrer">Message Nebula on Instagram ↗</a>
          <button type="button" class="plain-button activation-copy" id="copyActivationMessage">Copy message</button>
        </div>
        <details class="setup-details" id="activationMessageDetails">
          <summary>View message</summary>
          <label class="field" for="activationMessage">Message to copy</label>
          <textarea id="activationMessage" rows="5" readonly>${escape(requestMessage)}</textarea>
        </details>
        <button type="button" class="plain-button activation-copy" data-action="refresh-readiness">Check activation status ↻</button></div>
        ${ownDomain ? "" : `<details class="setup-details"><summary>Want your own domain?</summary><p class="helper">${domainTerms}</p><button type="button" class="button light" id="addActivationDomain">Add domain interest to my request</button></details>`}`
    : active
      ? `<p>Access ends <strong>${escape(date(shop.subscription.paidUntil))}</strong>.</p>
        <p>${shop.published ? "You can publish updates to your shop when they are ready." : "When your draft is ready, select Publish my shop to open your public link."}</p>
        ${domainChoice}
        <button type="button" class="button light" id="requestActivation">Request renewal</button>`
      : `<p>Your preview is free. Activation gives you 30 days of shop access and lets you publish when your draft is ready.</p>
        <ol class="activation-path">
          <li>Send an activation request here.</li>
          <li>Message Nebula on Instagram to confirm your plan and arrange payment.</li>
          <li>After Nebula verifies payment, return here and publish your shop.</li>
        </ol>
        ${domainChoice}
        <button type="button" class="button light" id="requestActivation">Request shop activation →</button>
        <p class="helper">Submitting the request is free. There is no automatic renewal.</p>`;
  target.innerHTML = `<p class="eyebrow">SHOP ACCESS</p>
    <h2>${heading}</h2>
    <div class="plan-price"><strong>${ownDomain ? "$35" : "$29"}</strong><span>${ownDomain ? "Own-domain option" : "Hosted shop"} · USD / 30 days</span></div>
    ${steps}
    <p id="manualPlanMessage" class="helper" role="status"></p>
    <a class="plain-button activation-copy" href="${preview}" data-nav>Back to my shop preview ↗</a>
    <details class="setup-details activation-includes"><summary>What’s included</summary>
      <ul><li>Your branded page and bouquet builder</li><li>Up to 6 customisable bouquets</li>
        <li>Saved requests with bouquet previews and customer details</li>
        <li>WhatsApp or SMS requests</li><li>Optional Square connection for eligible shops</li>
        <li>Up to 10 optional products and gifts</li></ul>
    </details>`;
  const status = target.querySelector("#manualPlanMessage");
  target
    .querySelector("#copyActivationMessage")
    ?.addEventListener("click", async () => {
      const message = target.querySelector("#activationMessage");
      try {
        await navigator.clipboard.writeText(message.value);
        status.textContent = "Message copied. Paste it into your Instagram DM.";
      } catch {
        target.querySelector("#activationMessageDetails").open = true;
        message.focus();
        message.select();
        status.textContent =
          "Copy the selected message, then paste it into your Instagram DM.";
      }
    });
  target
    .querySelector("#requestActivation, #addActivationDomain")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const customDomainInterest =
        button.id === "addActivationDomain" ||
        target.querySelector("#activationCustomDomain")?.checked === true;
      button.disabled = true;
      status.textContent = "Saving your request…";
      try {
        const data = await api(
          `/api/shops/${shop.id}/billing/activation-request`,
          { method: "POST", body: { customDomainInterest } },
        );
        onChange(data.shop);
        document.getElementById("messageNebulaActivation")?.focus();
      } catch (error) {
        status.textContent =
          error.message || "Your request could not be saved. Try again.";
      } finally {
        button.disabled = false;
      }
    });
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
      fields: { reference: "", confirmed: false, reason: "" },
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
    state.grantOpen =
      panel.querySelector(".complimentary-access")?.open ??
      state.grantOpen ??
      false;
    panel.innerHTML = `<hr><p class="eyebrow">${sandbox ? "SANDBOX · NO REAL PAYMENT" : "LIVE · MANUAL PAYPAL VERIFICATION"}</p><h3>Access & subscription</h3><p class="helper">${escape(shop.draft?.name || shop.slug || shop.id)}</p>${data ? `<p>Status: <strong>${escape(data.subscription.status)}</strong><br>Access ends: <strong>${escape(date(data.subscription.paidUntil))}</strong></p><p class="helper">${data.request?.status === "pending" ? "Activation request is waiting." : "No pending activation request."}</p>${data.request?.customDomainInterest ? '<div class="notice"><strong>Interested in their own domain · $35 USD / 30 days</strong><p>Confirm availability and separate domain costs with this florist before invoicing. The $29 payment form below is for hosted access.</p></div>' : ""}` : ""}<p id="activationResult" class="notice ${state.error ? "error" : state.notice ? "success" : ""}" role="status" aria-live="polite">${escape(state.notice || (state.loading ? "Loading subscription details…" : ""))}</p>${
      data
        ? `${sandbox ? `<button class="button small" id="grantSandboxAccess" type="button" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "test" ? "Activating test access…" : pending?.action === "test" ? "Test activation awaiting confirmation" : "Grant 7-day sandbox access · no payment"}</button>` : `<form id="manualActivationForm"><label class="field">PayPal transaction reference<input name="reference" maxlength="80" pattern="[A-Z0-9-]{8,80}" value="${escape(state.fields.reference)}" placeholder="Transaction ID from your PayPal activity" required ${locked || pending ? "disabled" : ""}></label><label class="toggle-line"><input name="confirmed" type="checkbox" required ${state.fields.confirmed ? "checked" : ""} ${locked || pending ? "disabled" : ""}> I verified the USD 29 commercial payment in PayPal for this shop.</label><button class="button small" type="submit" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "extend" ? "Recording verified payment…" : pending?.action === "extend" ? "Activation awaiting confirmation" : "Record payment & activate 30 days"}</button></form><details class="complimentary-access" ${state.grantOpen ? "open" : ""}><summary>Activate without payment · trials / own shop</summary><p class="helper">Grant 30 days of complimentary access. No PayPal payment is recorded. The reason is saved in the administrator audit.</p><form id="complimentaryAccessForm"><label class="field">Reason<input name="reason" minlength="5" maxlength="200" value="${escape(state.fields.reason || "")}" placeholder="Own shop test / customer trial" required ${locked || pending ? "disabled" : ""}></label><button class="button secondary small" type="submit" ${locked || pending ? "disabled" : ""}>Grant 30 days · no payment</button></form></details>`}<button class="button secondary small" id="suspendAccess" type="button" style="margin-top:12px" ${locked || pending ? "disabled" : ""}>${state.busy && pending?.action === "suspend" ? "Suspending…" : pending?.action === "suspend" ? "Suspension awaiting confirmation" : "Suspend access"}</button>${pending ? `<button class="button small" id="retryActivation" type="button" ${locked || state.needsReauth ? "disabled" : ""}>${pending.action === "extend" ? "Retry saved activation" : pending.action === "test" ? "Retry saved test activation" : pending.action === "grant" ? "Retry saved complimentary activation" : "Retry saved suspension"}</button><p class="helper">This action is saved for a safe retry. Its operation ID and details will stay the same until the server confirms the result.</p>` : '<p class="helper">Extending preserves remaining paid days. Activation does not publish the draft.</p>'}`
        : ""
    }${state.needsReauth ? `<section class="activation-reauth"><p class="helper">Verify your administrator identity, then retry the saved action. Verification alone does not activate this shop.</p>${reauthMethod === "password" ? `<label class="field">Administrator password<input id="activationPassword" type="password" autocomplete="current-password" ${locked ? "disabled" : ""}></label>` : ""}<button class="button secondary small" id="verifyAdminSession" type="button" ${locked || typeof reauthenticate !== "function" ? "disabled" : ""}>${state.reauthBusy ? "Verifying administrator…" : "Verify administrator session"}</button></section>` : ""}<button class="plain-button" id="retryActivationLoad" type="button" ${locked ? "disabled" : ""}>${state.loading ? "Loading…" : data ? "Refresh subscription details" : "Retry loading subscription"}</button><details><summary>Activation audit (${history.length} most recent)</summary>${history.map((r) => `<p class="helper">${escape(date(r.at))} · ${escape(r.action)}${r.paymentReference ? " · " + escape(r.paymentReference) : r.reason ? " · " + escape(r.reason) : ""}<br>Administrator: ${escape(r.actor)}</p>`).join("") || '<p class="helper">No access changes recorded.</p>'}</details>`;
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
    const grantForm = panel.querySelector("#complimentaryAccessForm");
    if (grantForm) {
      grantForm.noValidate = true;
      grantForm.querySelector('[name="reason"]').oninput = (e) => {
        state.fields.reason = e.target.value;
      };
      grantForm.onsubmit = (e) => {
        e.preventDefault();
        submit("grant");
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
      if (action === "extend" && !/^[A-Z0-9-]{8,80}$/.test(reference)) {
        setNotice(
          "PayPal reference must contain 8–80 uppercase letters, digits or hyphens. Copy the actual transaction ID. For trials, use Activate without payment below.",
          true,
        );
        notify();
        return;
      }
      if (action === "extend" && !state.fields.confirmed) {
        setNotice(
          "Confirm that you verified the USD 29 commercial payment in PayPal for this shop.",
          true,
        );
        notify();
        return;
      }
      const reason = (state.fields.reason || "").trim();
      if (action === "grant" && reason.length < 5) {
        setNotice("Enter an access reason of at least 5 characters.", true);
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
          : action === "grant"
            ? { reason }
            : {}),
      });
      state.unknown = false;
    }
    const body = state.pending;
    state.busy = true;
    setNotice(
      action === "test"
        ? "Activating seven days of test access…"
        : action === "grant"
          ? "Activating complimentary access without recording a payment…"
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
      if (action === "extend" || action === "grant")
        state.fields = { reference: "", confirmed: false, reason: "" };
      if (state.data) state.data.subscription = result.shop.subscription;
      const message =
        action === "test"
          ? "Test access activated for seven days. The florist can now publish a complete draft."
          : action === "grant"
            ? "Complimentary access activated for 30 days. No payment was recorded. The florist can publish a complete draft."
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
