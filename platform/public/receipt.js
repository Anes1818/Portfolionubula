const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const params = new URLSearchParams(location.hash.slice(1)),
  shop = params.get("shop"),
  requestId = params.get("request");
let id = params.get("order"),
  token = params.get("token"),
  order,
  busy = false;
const root = document.querySelector("#receipt");
const save = () => {
  if (!id || !token) return false;
  for (const storage of ["localStorage", "sessionStorage"]) {
    try {
      const key = `nebula-order:${shop}:${id}`;
      window[storage].setItem(key, token);
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
save();
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
    pending = order.request;
  root.innerHTML = `<p class="eyebrow">${order.environment === "sandbox" ? "SANDBOX TEST · NO REAL MONEY" : "YOUR FLOWER ORDER"}</p><h1>${esc(order.snapshot?.summary || "A lovely little occasion.")}</h1><p class="pill">${esc(order.status.replaceAll("_", " "))}</p><p class="helper">Order ${esc(order.id)} · ${esc(order.customer.method)} · ${esc(order.customer.date || "Date to be confirmed")}</p><dl class="request-facts"><div><dt>Flowers / product</dt><dd>${money(order.pricing.subtotalCents)}</dd></div><div><dt>Delivery</dt><dd>${money(order.pricing.deliveryCents)}</dd></div><div><dt>Tax (${order.pricing.taxBps / 100}%)</dt><dd>${money(order.pricing.taxCents)}</dd></div><div><dt>Final total</dt><dd>${money(order.totalCents)}</dd></div><div><dt>Payment confirmed</dt><dd>${money(order.paidCents)}</dd></div><div><dt>Remaining</dt><dd>${money(order.balanceCents)}</dd></div>${order.refundedCents ? `<div><dt>Refunded</dt><dd>${money(order.refundedCents)}</dd></div>` : ""}</dl><p class="subtle">${order.status === "paid" ? "Square has confirmed the full payment. Your florist will arrange fulfillment." : order.status === "deposit_paid" ? "Square has confirmed your deposit. The remaining balance is shown above." : "Opening checkout or returning here does not confirm a payment. Only verified Square payment information updates this order."}</p><details><summary>Your saved bouquet</summary><p>${esc(order.snapshot?.summary)}</p><p>${order.snapshot?.design?.items?.length || 1} item(s) in the saved design/product.</p><button class="plain-button" id="downloadDesign">Download saved order details ↓</button></details><h3>Shop terms</h3><p style="white-space:pre-wrap">${esc(order.cancellationPolicy)}</p><div class="actions">${!blocked ? `<button class="button" id="payDeposit" ${order.paidCents >= Math.ceil(order.totalCents / 2) ? "disabled" : ""}>Pay 50% deposit · ${money(Math.max(0, Math.ceil(order.totalCents / 2) - order.paidCents))}</button><button class="button secondary" id="payFull">${order.paidCents ? "Pay remaining balance" : "Pay in full"} · ${money(order.balanceCents)}</button>` : ""}<button class="button secondary" id="refreshOrder">Refresh payment status</button>${!order.paidCents && !blocked ? '<button class="plain-button" id="cancelCheckout">Cancel this order / checkout</button>' : ""}<button class="plain-button" id="copyReceipt">Copy private recovery link</button></div>${pending ? '<p class="helper">An existing checkout is saved. Retry the same choice to reopen it, or cancel it before changing the amount.</p>' : ""}<p class="helper">Keep your private recovery link. Anyone with it can see this order and open its payment page. Your florist handles fulfillment and refunds.</p>`;
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
        const url = new URL(order.request.url);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.port ||
          !(
            order.environment === "sandbox"
              ? ["sandbox.square.link"]
              : order.environment === "production"
                ? ["square.link", "checkout.square.site"]
                : []
          ).includes(url.hostname)
        )
          throw Error("Unexpected checkout destination.");
        save();
        location.assign(url.href);
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
    message.textContent =
      "Your order is saved. Review the final price and terms before paying.";
    render();
  } catch (e) {
    root.innerHTML = `<p class="eyebrow">YOUR REQUEST IS KEPT</p><h1>One moment.</h1><p role="alert">${esc(e.message)}</p><button class="button secondary" id="retryReceipt">Try again</button>`;
    root.querySelector("button").onclick = load;
  }
}
// A second recovery link can target this same document with a different fragment.
window.addEventListener("hashchange", () => location.reload());
load();
