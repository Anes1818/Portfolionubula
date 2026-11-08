import { squareDestination } from "/checkout-client.js";
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cleanParam = (v) => (typeof v === "string" ? v.split("?")[0] : v);
const rawHash = location.hash.slice(1).split("?")[0];
const params = new URLSearchParams(rawHash),
  requestId = cleanParam(params.get("request"));
let shop = cleanParam(params.get("shop")),
  id = cleanParam(params.get("order")),
  token = cleanParam(params.get("token")),
  order,
  busy = false;
const root = document.querySelector("#receipt");
// Only a bare return page may recover the last order. A partial recovery link
// must never combine its shop/token with a different saved order.
if (!shop && !id && !requestId && !token) {
  for (const storage of ["sessionStorage", "localStorage"]) {
    try {
      const saved = JSON.parse(
        window[storage].getItem("nebula-active-order") || "null",
      );
      if (
        /^sh_[a-f0-9]{32}$/.test(saved?.shop || "") &&
        typeof saved?.id === "string" &&
        saved.id.length > 0
      ) {
        shop = saved.shop;
        id = saved.id;
        break;
      }
    } catch {}
  }
}
const save = () => {
  if (!id || !token) return false;
  for (const storage of ["localStorage", "sessionStorage"]) {
    try {
      const key = `nebula-order:${shop}:${id}`;
      window[storage].setItem(key, token);
      window[storage].setItem(
        "nebula-active-order",
        JSON.stringify({ shop, id }),
      );
      if (window[storage].getItem(key) === token) return true;
    } catch {}
  }
  return false;
};
for (const storage of ["localStorage", "sessionStorage"]) {
  try {
    token ||= window[storage].getItem(`nebula-order:${shop}:${id}`);
  } catch {}
}
// Persist a supplied token only after the server confirms it below. A mistyped
// or unrelated recovery link must not overwrite a working saved credential.
const message = document.createElement("p");
message.className = "notice";
message.setAttribute("role", "status");
async function call(action, body) {
  const response = await fetch(`/api/shops/${shop}/checkout/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Order-Token": token },
    credentials: "same-origin",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error || "Your saved order could not load. Please retry.");
  return data.order;
}
function render() {
  const money = (n) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: order.currency,
    }).format(n / 100);
  const blocked = [
      "cancelled",
      "expired",
      "review_required",
      "refunded",
      "paid",
    ].includes(order.status),
    pending = order.request || order.checkoutAttempt;
  const whatsapp =
    order.whatsappUrl &&
    /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(order.whatsappUrl)
      ? order.whatsappUrl
      : null;
  const paid = order.status === "paid",
    deposit = order.status === "deposit_paid";
  const title = paid
    ? "Your bouquet is paid for."
    : deposit
      ? "Your deposit is confirmed."
      : blocked
        ? "Your saved order."
        : "Your bouquet, ready to order.";
  const status = paid
    ? "Paid in full"
    : deposit
      ? "Deposit received"
      : order.status === "awaiting_payment"
        ? "Waiting for payment confirmation"
        : order.status.replaceAll("_", " ");
  const date = order.customer.date
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(order.customer.date + "T12:00:00Z"))
    : "Date to arrange";
  root.innerHTML = `<p class="eyebrow">${order.environment === "sandbox" ? "SANDBOX TEST · NO REAL MONEY" : "YOUR FLOWER ORDER"}</p><div class="receipt-heading"><span class="pill ${paid || deposit ? "green" : ""}">${esc(status)}</span><span class="helper">${esc(order.reference || order.id)}</span></div><h1>${title}</h1><div class="receipt-summary">${order.snapshot?.preview ? `<img class="receipt-bouquet" src="${esc(order.snapshot.preview)}" alt="Your saved bouquet preview">` : ""}<div><h2>${esc(order.snapshot?.summary || "Your personal bouquet")}</h2><p>${esc(order.customer.method)} · ${esc(date)}</p>${order.customer.address ? `<p>${esc(order.customer.address)}</p>` : ""}${order.customer.recipient ? `<p>Gift for <strong>${esc(order.customer.recipient.name)}</strong></p>${order.customer.recipient.message ? `<p style="white-space:pre-wrap">${esc(order.customer.recipient.message)}</p>` : ""}` : ""}${order.deliveryNote ? `<p class="helper" style="white-space:pre-wrap">${esc(order.deliveryNote)}</p>` : ""}${order.pickupInstructions ? `<p class="helper">${esc(order.pickupInstructions)}</p>` : ""}<p class="receipt-total">${money(order.totalCents)}</p><p class="subtle">${paid ? "Square has confirmed your full payment. Your florist has your saved order." : deposit ? "Square has confirmed your deposit. See your shop terms for when the remaining balance is due." : blocked ? "Contact your florist about this order’s status." : "Your design and price are saved. Complete payment securely on Square."}</p></div></div><dl class="request-facts receipt-amounts"><div><dt>Paid</dt><dd>${money(order.paidCents)}</dd></div><div><dt>Remaining</dt><dd>${money(order.balanceCents)}</dd></div>${order.refundedCents ? `<div><dt>Refunded</dt><dd>${money(order.refundedCents)}</dd></div>` : ""}</dl><div class="actions receipt-primary">${!blocked ? `<button class="button" id="payFull" ${pending?.choice === "deposit" ? "disabled" : ""}>${order.paidCents ? "Pay remaining balance" : "Pay in full"} · ${money(order.balanceCents)} ↗</button><button class="button secondary" id="payDeposit" ${order.paymentOptions === "full" ? "hidden" : ""} ${order.paidCents >= Math.ceil(order.totalCents / 2) || pending?.choice === "full" ? "disabled" : ""}>Pay 50% deposit · ${money(Math.max(0, Math.ceil(order.totalCents / 2) - order.paidCents))}</button><p class="helper">Secure checkout hosted by Square.</p>` : ""}${whatsapp ? `<a class="plain-button" id="whatsappFlorist" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">Contact your florist ↗</a>` : ""}</div><details class="receipt-details"><summary>Order details &amp; shop terms</summary><dl class="request-facts"><div><dt>Flowers / product</dt><dd>${money(order.pricing.subtotalCents)}</dd></div><div><dt>Delivery</dt><dd>${money(order.pricing.deliveryCents)}</dd></div><div><dt>Tax (${order.pricing.taxBps / 100}%)</dt><dd>${money(order.pricing.taxCents)}</dd></div><div><dt>Total</dt><dd>${money(order.totalCents)}</dd></div></dl><h3>Shop terms</h3><p style="white-space:pre-wrap">${esc(order.cancellationPolicy)}</p><button class="plain-button" id="downloadDesign">Download saved order details ↓</button></details><details class="receipt-details"><summary>Save this order or get help</summary><p class="helper">Keep your private order link to return on another device. Share it only with people you trust; it gives access to this order and its payment page.</p><div class="actions"><button class="button secondary" id="refreshOrder">Refresh payment status</button><button class="plain-button" id="copyReceipt">Copy private recovery link</button>${!order.paidCents && !blocked ? '<button class="plain-button" id="cancelCheckout">Cancel this order / checkout</button>' : ""}</div>${pending ? '<p class="helper">A checkout is already saved. Use the same payment choice to reopen it.</p>' : ""}</details>`;
  root.append(message);
  const run = async (action) => {
    if (busy) return;
    busy = true;
    root.querySelectorAll("button").forEach((b) => (b.disabled = true));
    message.textContent = "Checking your saved order…";
    try {
      await action();
    } catch (e) {
      message.textContent = e.message;
    } finally {
      busy = false;
      render();
    }
  };
  const pay = (choice) =>
    run(async () => {
      if (!save())
        throw Error(
          "Browser storage is blocked. Allow storage for this site before paying so your receipt can reopen after Square. Your order is saved; keep your private recovery link.",
        );
      order = await call("pay", {
        orderId: id,
        revision: order.revision,
        choice,
      });
      if (order.request?.url) {
        const destination = squareDestination(order);
        save();
        location.assign(destination);
      } else
        message.textContent =
          "The stored payment status changed. Review it before continuing.";
    });
  root
    .querySelector("#payDeposit")
    ?.addEventListener("click", () => pay("deposit"));
  root.querySelector("#payFull")?.addEventListener("click", () => pay("full"));
  root.querySelector("#refreshOrder").onclick = () =>
    run(async () => {
      order = await call("status", { orderId: id });
      message.textContent =
        "Stored payment status refreshed. Pending payments remain pending until verified.";
    });
  root.querySelector("#cancelCheckout")?.addEventListener("click", () => {
    if (
      confirm(
        "Cancel this unpaid order and its Square link? Paid orders require your florist’s review.",
      )
    )
      run(async () => {
        order = await call("cancel", { orderId: id });
        message.textContent =
          "The cancellation status is shown above. A payment racing cancellation may require florist review.";
      });
  });
  root.querySelector("#copyReceipt").onclick = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/receipt.html#shop=${shop}&order=${id}&token=${token}`,
      );
      message.textContent = "Private recovery link copied.";
    } catch {
      message.textContent =
        "Copy the address from this browser to retain the receipt.";
      history.replaceState(
        null,
        "",
        `/receipt.html#${new URLSearchParams({ shop, order: id, token })}`,
      );
    }
  };
  root.querySelector("#downloadDesign").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(order, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-order.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
async function load() {
  try {
    if (
      !/^sh_[a-f0-9]{32}$/.test(shop || "") ||
      !/^[A-Za-z0-9_-]{43}$/.test(token || "")
    )
      throw Error(
        "Open your private recovery link from the original order. No payment has been inferred from this URL.",
      );
    order = id
      ? await call("status", { orderId: id })
      : await call("quote", { requestId });
    id = order.id;
    const stored = save();
    history.replaceState(
      null,
      "",
      `/receipt.html#${new URLSearchParams({
        shop,
        order: id,
        ...(!stored ? { token } : {}),
      })}`,
    );
    message.textContent = "";
    render();
    scheduleRefresh();
  } catch (e) {
    root.innerHTML = `<p class="eyebrow">YOUR REQUEST IS KEPT</p><h1>One moment.</h1><p role="alert">${esc(e.message)}</p><button class="button secondary" id="retryReceipt">Try again</button>`;
    root.querySelector("button").onclick = load;
  }
}
let refreshCount = 0;
function scheduleRefresh() {
  // A bounded status poll survives slow webhooks; the server verifies Square.
  if (
    refreshCount >= 8 ||
    !["awaiting_payment", "quoted"].includes(order?.status)
  )
    return;
  setTimeout(
    async () => {
      if (document.hidden || busy) {
        refreshCount++;
        scheduleRefresh();
        return;
      }
      try {
        order = await call("status", { orderId: id });
        render();
      } catch {
        /* Manual recovery stays available. */
      }
      refreshCount++;
      scheduleRefresh();
    },
    5000 + refreshCount * 2000,
  );
}
// A second recovery link can target this same document with a different fragment.
window.addEventListener("hashchange", () => location.reload());
load();
