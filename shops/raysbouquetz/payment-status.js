(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    cfg = window.NEBULA_PAYMENTS,
    params = new URLSearchParams(location.hash.slice(1)),
    id = params.get("order");
  let key = params.get("key"),
    order,
    busy = false,
    polls = 0;
  const money = (c) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(c / 100);
  const say = (s, error = false) => {
    $("statusMessage").textContent = s;
    $("statusMessage").classList.toggle("error", error);
  };
  try {
    key = key || localStorage.getItem("nebula-order:" + cfg.shopId + ":" + id);
    if (key) localStorage.setItem("nebula-order:" + cfg.shopId + ":" + id, key);
  } catch {}
  history.replaceState(null, "", location.pathname + "#order=" + (id || ""));
  async function api(operation = "", body) {
    const r = await fetch(
      cfg.endpoint +
        "/v1/shops/" +
        cfg.shopId +
        "/orders/" +
        encodeURIComponent(id) +
        operation,
      {
        method: body ? "POST" : "GET",
        headers: {
          "X-Order-Key": key,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(20000),
      },
    );
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Could not verify the payment.");
    return data;
  }
  function show() {
    const status = order.status,
      labels = {
        paid: [
          "Payment confirmed.",
          "Your full payment has been verified with Square.",
        ],
        deposit_paid: [
          "Deposit received.",
          "Your payment has been verified. The remaining balance is due at delivery.",
        ],
        awaiting_payment: [
          "Waiting for payment confirmation.",
          "We have not yet verified a completed payment. You can check again or continue the saved checkout.",
        ],
        quoted: [
          "Your order is saved.",
          "Choose deposit or full payment to continue to Square.",
        ],
        cancelled: [
          "Checkout cancelled.",
          "No new payment can be requested for this cancelled checkout.",
        ],
        expired: [
          "Your checkout quote expired.",
          "Return to the builder and review a fresh total.",
        ],
        review_required: [
          "The shop is reviewing this order.",
          "A payment or refund needs attention. Do not make another payment for this order yet.",
        ],
        refunded: [
          "Payment refunded.",
          "The verified refund is recorded. Contact the shop about the next steps.",
        ],
      },
      label = labels[status] || [
        "Checking your order.",
        "Your last stored payment status is shown.",
      ];
    $("heading").textContent = label[0];
    say(label[1]);
    $("orderSummary").hidden = false;
    $("orderReference").textContent = "Order " + order.id;
    const rows = [];
    for (const [name, value] of [
      ["Order total", order.totalCents],
      ["Verified paid", order.paidCents],
      ["Refunded", order.refundedCents],
      ["Remaining", order.balanceCents],
    ]) {
      const a = document.createElement("span"),
        b = document.createElement("strong");
      a.textContent = name;
      b.textContent = money(value);
      rows.push(a, b);
    }
    $("summary").replaceChildren(...rows);
    $("fulfillment").textContent =
      order.customer.date +
      " · " +
      order.customer.method +
      ". " +
      order.pickupInstructions;
    $("terms").textContent = order.cancellationPolicy;
    const payable =
      !["cancelled", "expired", "review_required", "refunded", "paid"].includes(
        status,
      ) && order.balanceCents > 0;
    $("payFull").hidden = !payable;
    $("payDeposit").hidden =
      !payable || order.paidCents >= Math.ceil(order.totalCents / 2);
    $("payFull").disabled = busy;
    $("payDeposit").disabled = busy;
    $("refresh").disabled = busy;
    if (payable && order.request) {
      const active = order.request.choice;
      $("payFull").hidden = active !== "full";
      $("payDeposit").hidden = active !== "deposit";
    }
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    $("refresh").disabled = true;
    let failure;
    try {
      order = await api();
      if (order.status === "awaiting_payment" && polls++ < 12)
        setTimeout(refresh, 5000);
    } catch (e) {
      failure = e;
    } finally {
      busy = false;
      if (order) show();
      if (failure)
        say(
          failure.message +
            " No payment has been marked successful without verification.",
          true,
        );
      $("refresh").disabled = false;
    }
  }
  async function pay(choice) {
    if (busy) return;
    busy = true;
    show();
    let failure;
    try {
      order = await api("/checkout", { revision: order.revision, choice });
      if (!order.request?.url)
        throw Error("No payment is due. Check the status.");
      const url = new URL(order.request.url),
        allowed =
          cfg.environment === "production"
            ? ["square.link", "checkout.square.site"]
            : ["sandbox.square.link"];
      if (url.protocol !== "https:" || !allowed.includes(url.hostname))
        throw Error("The checkout response needs attention.");
      location.assign(url.href);
    } catch (e) {
      failure = e;
    } finally {
      busy = false;
      show();
      if (failure) say(failure.message, true);
    }
  }
  $("refresh").onclick = refresh;
  $("payFull").onclick = () => pay("full");
  $("payDeposit").onclick = () => pay("deposit");
  $("copyLink").onclick = async () => {
    try {
      await navigator.clipboard.writeText(
        location.origin + location.pathname + "#order=" + id + "&key=" + key,
      );
      say("Private order link copied. Share it only with someone you trust.");
    } catch {
      say(
        "Could not copy the private link. Keep this browser available to reopen your order.",
      );
    }
  };
  $("environment").hidden = cfg?.environment !== "sandbox";
  $("environment").textContent = "TEST ENVIRONMENT — no real charge.";
  if (!cfg?.endpoint) {
    $("heading").textContent = "Checkout is being connected.";
    say("No payment was requested. Online checkout is not active yet.");
    return;
  }
  if (
    !id ||
    !/^[A-Za-z0-9_-]{24}$/.test(id) ||
    !key ||
    !/^[A-Za-z0-9_-]{43}$/.test(key)
  ) {
    say(
      "Open your private order link or use the browser where you started checkout.",
      true,
    );
    return;
  }
  $("refresh").hidden = false;
  refresh();
})();
