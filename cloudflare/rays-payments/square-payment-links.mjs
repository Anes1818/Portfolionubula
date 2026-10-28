/* Hosted link adapter shared by the durable checkout service and legacy tests.
   An approved server quote and a merchant-specific connection are required. */
import { square, checkoutUrl } from "./square.mjs";
import { requireValue } from "./security.mjs";
export async function createHostedCheckout({
  env,
  token,
  body,
  fetchImpl = fetch,
}) {
  const data = await square(env, "/v2/online-checkout/payment-links", {
      method: "POST",
      token,
      body,
      fetchImpl,
    }),
    link = data.payment_link;
  requireValue(
    link?.id && link.order_id && checkoutUrl(link.url, env),
    "Square returned an unexpected checkout response. Retry this saved order.",
    503,
  );
  return link;
}
export function createSquarePaymentLinks({
  repository,
  fetchImpl = fetch,
  env,
  shop = "raysbouquetz",
  getConnection = async () => ({
    accessToken: env.SQUARE_ACCESS_TOKEN,
    locationId: env.SQUARE_LOCATION_ID,
  }),
  now = () => Date.now(),
}) {
  if (!repository?.withLock || !repository?.get || !repository?.save)
    throw Error("A durable quote repository and lock are required.");
  const cents = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
  return async function requestLink({ quoteId, revision, choice }) {
    const connection = await getConnection(shop);
    if (
      env.PAYMENTS_ENABLED !== true ||
      !connection?.accessToken ||
      !connection?.locationId
    )
      throw Error("Square is not connected.");
    if (
      typeof quoteId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(quoteId) ||
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      !["deposit", "full"].includes(choice)
    )
      throw Error("Invalid payment request.");
    return repository.withLock(quoteId, async () => {
      const q = await repository.get(quoteId);
      if (
        !q ||
        q.shop !== shop ||
        q.status !== "approved" ||
        q.revision !== revision ||
        q.currency !== "CAD" ||
        !cents(q.totalCents) ||
        !cents(q.paidCents) ||
        q.paidCents > q.totalCents ||
        typeof q.includesCashValue !== "boolean" ||
        !Number.isFinite(q.expiresAt) ||
        q.expiresAt <= now()
      )
        throw Error("A current approved CAD quote is required.");
      if (q.includesCashValue && env.MONEY_PAYMENTS_APPROVED !== true)
        throw Error("Money bouquet payment eligibility needs confirmation.");
      const dueCents =
        choice === "full"
          ? q.totalCents - q.paidCents
          : Math.max(0, Math.ceil(q.totalCents / 2) - q.paidCents);
      if (!dueCents) throw Error("No payment is due for this choice.");
      if (q.paymentRequest) {
        const r = q.paymentRequest;
        if (
          r.status === "pending" &&
          r.revision === revision &&
          r.choice === choice &&
          r.dueCents === dueCents &&
          r.paidCents === q.paidCents
        )
          return r;
        throw Error(
          "Cancel the previous payment link before replacing its amount or quote.",
        );
      }
      const material = `${shop}:${quoteId}:${revision}:${choice}:${q.paidCents}:${dueCents}`;
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(material),
      );
      const key = [...new Uint8Array(digest)]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      const link = await createHostedCheckout({
        env: {
          ...env,
          ENVIRONMENT: env.SQUARE_SANDBOX === true ? "sandbox" : "production",
        },
        token: connection.accessToken,
        fetchImpl,
        body: {
          idempotency_key: key,
          quick_pay: {
            name: `${shop} · ${quoteId} · ${choice === "deposit" ? "50% deposit" : "Full balance"}`,
            price_money: { amount: dueCents, currency: "CAD" },
            location_id: connection.locationId,
          },
          payment_note: `Quote ${quoteId} revision ${revision}. Balance at delivery.`,
        },
      });
      const paymentRequest = {
        quoteId,
        revision,
        choice,
        dueCents,
        paidCents: q.paidCents,
        balanceCents: q.totalCents - q.paidCents - dueCents,
        currency: "CAD",
        squareLinkId: link.id,
        squareOrderId: link.order_id,
        url: link.url,
        status: "pending",
      };
      await repository.save(quoteId, { ...q, paymentRequest });
      return paymentRequest;
    });
  };
}
