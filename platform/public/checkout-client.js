export function squareDestination(order) {
  const url = new URL(order.request.url);
  const hosts =
    order.environment === "sandbox"
      ? ["sandbox.square.link"]
      : order.environment === "production"
        ? ["square.link", "checkout.square.site"]
        : [];
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.includes(url.hostname)
  )
    throw Error("Unexpected checkout destination.");
  return url.href;
}
export function retainOrder(shop, id, token) {
  for (const type of ["localStorage", "sessionStorage"]) {
    try {
      const key = `nebula-order:${shop}:${id}`;
      window[type].setItem(key, token);
      window[type].setItem("nebula-active-order", JSON.stringify({ shop, id }));
      if (window[type].getItem(key) === token) return true;
    } catch {}
  }
  return false;
}
export async function startSquarePayment({
  shop,
  requestId,
  token,
  choice,
  expectedTotal,
}) {
  const call = async (action, body) => {
    const response = await fetch(`/api/shops/${shop}/checkout/${action}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", "X-Order-Token": token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = Error(
        data.error ||
          "Checkout is temporarily unavailable. Your order is saved.",
      );
      error.status = response.status;
      throw error;
    }
    return data.order;
  };
  const order = await call("quote", { requestId });
  const recovery =
    "/receipt.html#" + new URLSearchParams({ shop, order: order.id, token });
  // Retain access before leaving for Square. Changed totals always receive a new review.
  if (
    !retainOrder(shop, order.id, token) ||
    order.totalCents !== expectedTotal
  ) {
    location.assign(recovery);
    return;
  }
  // A saved attempt owns its amount and choice until Square confirms cancellation.
  // Never turn a failed deposit attempt into a separate full charge on retry.
  if (order.checkoutAttempt && order.checkoutAttempt.choice !== choice) {
    location.assign(recovery);
    return;
  }
  let payment;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      payment = await call("pay", {
        orderId: order.id,
        revision: order.revision,
        choice,
      });
      break;
    } catch (error) {
      if (attempt === 1 || error.status < 500) {
        location.assign(recovery);
        return;
      }
    }
  }
  location.assign(payment.request?.url ? squareDestination(payment) : recovery);
}
