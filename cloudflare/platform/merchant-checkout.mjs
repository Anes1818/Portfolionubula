/* Multi-tenant checkout reuses the existing, tested Ray payment ledger methods.
 * Provider keys, seller tokens and customer access hashes never reach the UI. */
import { ShopService } from "../rays-payments/shop-service.mjs";
import { square } from "../rays-payments/square.mjs";
import { createHostedCheckout } from "../rays-payments/square-payment-links.mjs";
import {
  HttpError,
  requireValue,
  randomToken,
  hash,
  readJson,
} from "../rays-payments/security.mjs";
import { object, multilineText, entitled } from "./validation.mjs";
import { orderReference, merchantOrderPath } from "./order-preview.mjs";
import {
  emptyFulfillmentRules,
  normalizeFulfillmentRules,
  checkFulfillment,
} from "../../platform/public/fulfillment-rules.mjs";
import {
  recordPaymentNotifications,
  scheduleNotifications,
} from "./notifications.mjs";
import {
  storedSquareService,
  squareCheckoutConfigured,
} from "./square-storage.mjs";

const cents = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000;
const held = (q) => ["review_required", "refunded"].includes(q.status);
export const commerceDefaults = () => ({
  version: 0,
  enabled: false,
  pricesApproved: false,
  paymentOptions: "full_and_deposit",
  taxBps: null,
  deliveryCents: null,
  deliveryNote: "",
  pickupEnabled: true,
  deliveryEnabled: false,
  terms: "",
  cashProductIds: [],
  fulfillmentRules: emptyFulfillmentRules(),
});
export function commerceInput(v) {
  object(v, "Checkout settings", [
    "version",
    "enabled",
    "pricesApproved",
    "paymentOptions",
    "taxBps",
    "deliveryCents",
    "deliveryNote",
    "pickupEnabled",
    "deliveryEnabled",
    "terms",
    "cashProductIds",
    "fulfillmentRules",
  ]);
  requireValue(
    Number.isSafeInteger(v.version) && v.version >= 0,
    "A valid settings version is required.",
  );
  for (const k of [
    "enabled",
    "pricesApproved",
    "pickupEnabled",
    "deliveryEnabled",
  ])
    requireValue(
      typeof v[k] === "boolean",
      "Choose each checkout option explicitly.",
    );
  requireValue(
    v.taxBps === null ||
      (Number.isInteger(v.taxBps) && v.taxBps >= 0 && v.taxBps <= 3000),
    "Enter a tax rate from 0 to 30%, or leave checkout disabled.",
  );
  requireValue(
    v.deliveryCents === null || cents(v.deliveryCents),
    "Enter a valid delivery fee.",
  );
  requireValue(
    Array.isArray(v.cashProductIds) &&
      v.cashProductIds.length <= 10 &&
      v.cashProductIds.every(
        (x) => typeof x === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(x),
      ),
    "Choose valid cash products.",
  );
  requireValue(
    v.paymentOptions === undefined ||
      ["full", "full_and_deposit"].includes(v.paymentOptions),
    "Choose full payment only or full payment and a 50% deposit.",
  );
  const paymentOptions = v.paymentOptions ?? "full_and_deposit";
  const terms = multilineText(v.terms, "Fulfillment and refund terms", 2000);
  let fulfillmentRules;
  try {
    fulfillmentRules = normalizeFulfillmentRules(v.fulfillmentRules);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
  const deliveryCents =
    fulfillmentRules.enforceDeliveryZones && v.deliveryCents === null
      ? 0
      : v.deliveryCents;
  requireValue(
    !v.enabled ||
      !v.deliveryEnabled ||
      !fulfillmentRules.enforceDeliveryZones ||
      fulfillmentRules.deliveryZones.length > 0,
    "Add at least one delivery zone before enabling postcode-restricted checkout.",
  );
  if (v.enabled)
    requireValue(
      v.pricesApproved &&
        v.taxBps !== null &&
        (v.pickupEnabled || v.deliveryEnabled) &&
        (!v.deliveryEnabled || deliveryCents !== null) &&
        terms.length >= 20,
      "Approve exact prices, tax, fulfillment and refund terms before enabling checkout.",
    );
  const deliveryNote = multilineText(
    v.deliveryNote ?? "",
    "Delivery areas and instructions",
    600,
  );
  return {
    ...v,
    paymentOptions,
    terms,
    deliveryNote,
    deliveryCents,
    fulfillmentRules,
    cashProductIds: [...new Set(v.cashProductIds)],
  };
}

function storageFor(store) {
  const sql = store.sql;
  return {
    async get(key) {
      const row = [
        ...sql.exec("SELECT data FROM checkout_state WHERE key=?", key),
      ][0];
      return row ? JSON.parse(row.data) : undefined;
    },
    async put(key, value) {
      const data = JSON.stringify(value);
      requireValue(
        new TextEncoder().encode(data).length <= 256 * 1024,
        "Order storage limit exceeded.",
        413,
      );
      sql.exec(
        "INSERT INTO checkout_state(key,data) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data",
        key,
        data,
      );
    },
    async delete(key) {
      sql.exec("DELETE FROM checkout_state WHERE key=?", key);
    },
    async list({ prefix = "", limit = 25, startAfter = "" } = {}) {
      return new Map(
        [
          ...sql.exec(
            "SELECT key,data FROM checkout_state WHERE key>=? AND key<? AND key>? ORDER BY key LIMIT ?",
            prefix,
            prefix + "\uffff",
            startAfter,
            Math.min(limit, 500),
          ),
        ].map((r) => [r.key, JSON.parse(r.data)]),
      );
    },
    setAlarm: async (t) =>
      store.state.storage.setAlarm(
        Math.min((await store.state.storage.getAlarm()) || Infinity, t),
      ),
  };
}

class MerchantCheckout extends ShopService {
  constructor(store) {
    const environment = store.env.SQUARE_ENVIRONMENT || "sandbox";
    super({
      storage: storageFor(store),
      env: {
        ENVIRONMENT: environment,
        SITE_ORIGIN:
          store.env.CANONICAL_ORIGIN ||
          store.env.PUBLIC_ORIGIN ||
          "https://app.nebulastudio.site",
      },
      shop: store.shop().id,
    });
    this.store = store;
  }
  async settings() {
    const shop = this.store.shop(),
      p = shop.commerce || commerceDefaults();
    return {
      name: shop.draft.name,
      checkoutEnabled: p.enabled,
      cashPaymentsApproved: false,
      owners: [shop.ownerUid],
      policy: { version: `${shop.published?.version || 0}:${p.version}` },
    };
  }
  async enabled() {
    const s = this.store.shop();
    return (
      squareCheckoutConfigured(this.store.env) &&
      entitled(s) &&
      this.store.env.PUBLISHING_ENABLED === "true" &&
      !!s.published &&
      s.commerce?.enabled === true
    );
  }
  async connection() {
    return storedSquareService(this.store).status({
      uid: this.store.shop().ownerUid,
    });
  }
  async token() {
    const c = await storedSquareService(this.store).serverCredentials({
      maintenance: true,
    });
    return { accessToken: c.accessToken, connection: c };
  }
  async authorize(actor) {
    requireValue(
      actor?.uid === this.store.shop().ownerUid,
      "Shop not found.",
      404,
    );
    return "merchant";
  }
  async saveOrder(q) {
    const previous = await this.storage.get("order:" + q.id);
    const serialized = JSON.stringify(q);
    requireValue(
      new TextEncoder().encode(serialized).length <= 256 * 1024,
      "Order storage limit exceeded.",
      413,
    );
    this.store.state.storage.transactionSync(() => {
      this.store.sql.exec(
        "INSERT INTO checkout_state(key,data) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data",
        "order:" + q.id,
        serialized,
      );
      recordPaymentNotifications(this.store, q, previous);
      if (q.sourceRequestId) {
        const row = [
          ...this.store.sql.exec(
            "SELECT data FROM customer_requests WHERE id=?",
            q.sourceRequestId,
          ),
        ][0];
        if (row) {
          const request = JSON.parse(row.data);
          const checkout = {
            orderId: q.id,
            totalCents: q.totalCents,
            paidCents: q.paidCents,
            refundedCents: q.refundedCents,
            balanceCents: Math.max(0, q.totalCents - q.paidCents),
            status: q.status,
          };
          // Status polling re-verifies completed payments. It must not manufacture
          // merchant edit conflicts when no customer-visible payment facts changed.
          if (
            JSON.stringify(request.checkout) === JSON.stringify(checkout) &&
            request.paymentStatus === q.status &&
            request.reference === orderReference(q)
          )
            return;
          request.checkout = checkout;
          request.paymentStatus = q.status;
          request.reference = orderReference(q);
          request.version = (request.version || 1) + 1;
          request.updatedAt = this.now();
          this.store.sql.exec(
            "UPDATE customer_requests SET data=? WHERE id=?",
            JSON.stringify(request),
            request.id,
          );
        }
      }
    });
    await scheduleNotifications(this.store);
  }
  async checkout(id, token, input) {
    const q = await this.customerOrder(id, token);
    const row = [
      ...this.store.sql.exec(
        "SELECT data FROM customer_requests WHERE id=?",
        q.sourceRequestId,
      ),
    ][0];
    requireValue(
      row && JSON.parse(row.data).status !== "cancelled",
      "This request has been cancelled by the florist. Contact the shop.",
      409,
    );
    requireValue(
      input?.choice !== "deposit" || q.paymentOptions !== "full",
      "This florist accepts full payment only.",
      409,
    );
    return super.checkout(id, token, input);
  }
  async quote(requestId, token) {
    requireValue(
      /^[A-Za-z0-9_-]{43}$/.test(token || ""),
      "This order link is not authorised.",
      403,
    );
    const row = [
      ...this.store.sql.exec(
        "SELECT data FROM customer_requests WHERE id=?",
        requestId,
      ),
    ][0];
    requireValue(row, "Request not found.", 404);
    const r = JSON.parse(row.data);
    requireValue(
      r.accessHash === (await hash(this.shop + ":" + token)),
      "This order link is not authorised.",
      403,
    );
    const previous = await this.storage.get("requestQuote:" + requestId);
    if (previous) return this.publicOrder(await this.getOrder(previous));
    requireValue(
      await this.enabled(),
      "Online checkout is paused. Your request is saved.",
      409,
    );
    const shop = this.store.shop(),
      { approvedBy, approvedAt, ...settings } = shop.commerce,
      p = commerceInput(settings);
    requireValue(
      r.publishedVersion === shop.published.version,
      "The shop prices changed. Start a new reviewed request.",
      409,
    );
    requireValue(r.status !== "cancelled", "This request was cancelled.", 409);
    requireValue(
      r.fulfillment === "pickup" ? p.pickupEnabled : p.deliveryEnabled,
      "This fulfillment method is unavailable.",
      409,
    );
    requireValue(
      r.fulfillment !== "delivery" ||
        (typeof r.customer.address === "string" &&
          r.customer.address.trim().length >= 3),
      "Enter a delivery address before starting payment.",
      409,
    );
    requireValue(
      !p.cashProductIds.includes(r.product?.id) &&
        !/\b(money|cash|banknote)\b/i.test(r.product?.title || "") &&
        !(r.design?.items || []).some((i) =>
          /cash_|money_|banknote/i.test(i.id),
        ) &&
        !JSON.stringify(r.design?.finishes || {}).match(/money_fan|cash_fan/),
      "Cash-containing bouquets require provider eligibility review and cannot be paid online.",
      409,
    );
    const eligibility = checkFulfillment({
      rules: p.fulfillmentRules,
      method: r.fulfillment,
      customer: r.customer,
      timeZone: shop.published.draft.timeZone,
      country: shop.published.draft.country,
      deliveryCents: p.deliveryCents,
    });
    requireValue(eligibility.ok, eligibility.error, 409);
    const subtotalCents = r.totalCents,
      deliveryCents = eligibility.deliveryCents;
    requireValue(
      cents(subtotalCents) && cents(deliveryCents),
      "This request has no final payable price.",
      409,
    );
    const taxCents = Math.floor(
        ((subtotalCents + deliveryCents) * p.taxBps + 5000) / 10000,
      ),
      totalCents = subtotalCents + deliveryCents + taxCents;
    requireValue(
      cents(totalCents) && totalCents > 0,
      "The final payable amount is invalid.",
      409,
    );
    const conn = await storedSquareService(this.store).serverCredentials();
    requireValue(
      conn.currency === r.currency,
      "The Square location currency does not match.",
      409,
    );
    requireValue(
      [
        ...this.store.sql.exec(
          "SELECT count(*) n FROM checkout_state WHERE key LIKE 'order:%'",
        ),
      ][0].n < 1000,
      "The shop order storage limit needs attention.",
      503,
    );
    const q = {
      id: randomToken().slice(0, 24),
      shop: this.shop,
      revision: 1,
      status: "quoted",
      createdAt: this.now(),
      expiresAt: this.now() + 30 * 60000,
      policyVersion: `${shop.published.version}:${p.version}`,
      accessHash: r.accessHash,
      sourceRequestId: r.id,
      totalCents,
      paymentOptions: p.paymentOptions || "full_and_deposit",
      paidCents: 0,
      refundedCents: 0,
      currency: r.currency,
      pricing: {
        subtotalCents,
        deliveryCents,
        taxCents,
        taxBps: p.taxBps,
        totalCents,
        includesCashValue: false,
      },
      customer: {
        ...r.customer,
        method: r.fulfillment === "pickup" ? "Pickup" : "Delivery",
      },
      snapshot: {
        preview: r.preview || null,
        design: r.design || null,
        product: r.product || null,
        summary: r.summary,
        publishedVersion: r.publishedVersion,
      },
      cancellationPolicy: p.terms,
      pickupInstructions: r.fulfillment === "pickup" ? shop.draft.city : "",
      deliveryNote: r.fulfillment === "delivery" ? p.deliveryNote : "",
      requests: [],
      payments: {},
      refunds: {},
    };
    // Persist the retry association atomically with the order before any provider call.
    this.store.state.storage.transactionSync(() => {
      this.store.sql.exec(
        "INSERT INTO checkout_state(key,data) VALUES(?,?)",
        "order:" + q.id,
        JSON.stringify(q),
      );
      this.store.sql.exec(
        "INSERT INTO checkout_state(key,data) VALUES(?,?)",
        "requestQuote:" + requestId,
        JSON.stringify(q.id),
      );
      this.store.sql.exec(
        "INSERT INTO checkout_state(key,data) VALUES(?,?)",
        "index:" + String(9999999999999 - q.createdAt) + ":" + q.id,
        JSON.stringify(q.id),
      );
    });
    await this.saveOrder(q);
    await this.schedule();
    return this.publicOrder(q);
  }
  publicOrder(q) {
    const base = super.publicOrder(q);
    const shop = this.store.shop();
    const draft = shop?.published?.draft || shop?.draft;
    const phone = (draft?.phone || "").replace(/\D/g, "");
    const money = (amount) =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: q.currency || "USD",
      }).format((amount || 0) / 100);
    const statusLabel =
      q.status === "paid"
        ? `Paid in full via Square (${money(q.paidCents)})`
        : q.status === "deposit_paid"
          ? `50% deposit paid via Square (${money(q.paidCents)}; remaining balance ${money(Math.max(0, q.totalCents - q.paidCents))})`
          : `Order saved · Total ${money(q.totalCents)} (${q.status.replaceAll("_", " ")})`;
    const whatsappUrl = /^\d{8,15}$/.test(phone)
      ? `https://wa.me/${phone}?text=${encodeURIComponent(
          `Order ${q.id} (${q.sourceRequestId || "request"}): ${q.snapshot?.summary || "Flower order"}. ${q.customer.name}${q.customer.phone ? ", " + q.customer.phone : ""}. ${q.customer.method}${q.customer.address ? " to " + q.customer.address : ""}${q.customer.date ? " on " + q.customer.date : ""}. ${statusLabel}.`,
        )}`
      : null;
    return {
      ...base,
      paymentOptions: q.paymentOptions || "full_and_deposit",
      reference: orderReference(q),
      deliveryNote: q.deliveryNote || "",
      checkoutAttempt:
        !held(q) && ["creating", "pending"].includes(q.requests.at(-1)?.status)
          ? {
              status: q.requests.at(-1).status,
              choice: q.requests.at(-1).choice,
              dueCents: q.requests.at(-1).dueCents,
            }
          : null,
      customer: {
        ...base.customer,
        ...(q.customer.address ? { address: q.customer.address } : {}),
        ...(q.customer.recipient ? { recipient: q.customer.recipient } : {}),
        ...(q.customer.postalCode
          ? {
              postalCode: q.customer.postalCode,
              country: q.customer.country || "",
            }
          : {}),
      },
      snapshot: q.snapshot,
      environment: this.env.ENVIRONMENT,
      sourceRequestId: q.sourceRequestId,
      whatsappUrl,
    };
  }
  async rate(visitor, kind) {
    const key = "bounded-rate:" + kind + ":" + visitor,
      old = await this.storage.get(key),
      window = Math.floor(this.now() / 60000),
      count = old?.window === window ? old.count : 0;
    requireValue(
      count < (kind === "quote" ? 8 : 30),
      "Too many payment requests. Please wait a minute.",
      429,
    );
    await this.storage.put(key, { window, count: count + 1 });
  }
  async event(event) {
    const conn = await this.connection();
    requireValue(
      conn.merchantId === event.merchant_id,
      "Square merchant mismatch.",
      403,
    );
    if (event.type === "oauth.authorization.revoked") {
      await storedSquareService(this.store).recordRevocation(event);
      return { received: true };
    }
    return super.event(event);
  }
  async createLink(q, r) {
    const paymentLabel =
      r.choice === "deposit"
        ? "50% deposit"
        : q.paidCents
          ? "Balance payment"
          : "Full payment";
    const { accessToken, connection } = await this.token();
    requireValue(
      connection.locationId,
      "The shop must select its Square location.",
      409,
    );
    if (!r.createPayload) {
      r.createPayload = {
        idempotency_key: r.key,
        quick_pay: {
          name:
            (await this.settings()).name +
            " · " +
            orderReference(q) +
            " · " +
            paymentLabel,
          price_money: { amount: r.dueCents, currency: q.currency },
          location_id: connection.locationId,
        },
        checkout_options: {
          allow_tipping: false,
          enable_coupon: false,
          enable_loyalty: false,
          redirect_url:
            this.env.SITE_ORIGIN +
            "/receipt.html#shop=" +
            this.shop +
            "&order=" +
            q.id,
        },
        ...(q.customer.email
          ? {
              pre_populated_data: {
                buyer_email: q.customer.email,
              },
            }
          : {}),
        payment_note:
          "Nebula order " +
          orderReference(q) +
          ". " +
          paymentLabel +
          ". View saved bouquet: " +
          this.env.SITE_ORIGIN +
          merchantOrderPath(q) +
          " (florist sign-in required).",
      };
      r.createMerchantId = connection.merchantId;
      await this.saveOrder(q);
    }
    requireValue(
      r.createPayload.quick_pay.location_id === connection.locationId &&
        r.createMerchantId === connection.merchantId,
      "The shop’s Square location changed. Contact the florist about this saved checkout.",
      409,
    );
    let link;
    try {
      link = await createHostedCheckout({
        env: this.env,
        token: accessToken,
        fetchImpl: this.fetchImpl,
        body: r.createPayload,
      });
    } catch (error) {
      // Older saved attempts may contain an optional phone Square rejects.
      // Only an explicit validation rejection proves this attempt made no link.
      // Ambiguous transport failures must retain their original key and payload.
      if (
        error.squareStatus === 400 &&
        r.createPayload.pre_populated_data?.buyer_phone_number &&
        error.squareErrors?.length &&
        error.squareErrors.every(
          (item) =>
            item.code === "INVALID_PHONE_NUMBER" &&
            item.field === "pre_populated_data.buyer_phone_number",
        )
      ) {
        r.status = "rejected";
        r.failureCode = "INVALID_PHONE_NUMBER";
        await this.saveOrder(q);
        await this.audit("checkout_rejected", "customer", {
          orderId: q.id,
          attempt: r.number,
          code: r.failureCode,
        });
        throw new HttpError(
          503,
          "Square rejected the optional contact prefill. Your order is saved; retry checkout.",
        );
      }
      throw error;
    }
    Object.assign(r, {
      status: "pending",
      squareLinkId: link.id,
      squareOrderId: link.order_id,
      url: link.url,
      locationId: connection.locationId,
      merchantId: connection.merchantId,
    });
    if (!held(q)) q.status = "awaiting_payment";
    await this.storage.put("squareOrder:" + r.squareOrderId, q.id);
    await this.saveOrder(q);
    await this.audit("checkout_created", "customer", {
      orderId: q.id,
      attempt: r.number,
      dueCents: r.dueCents,
    });
    await this.schedule();
  }

  async payment(paymentId, known, { suppressRetire = false } = {}) {
    requireValue(
      typeof paymentId === "string" && paymentId.length < 200,
      "Invalid Square payment.",
      400,
    );
    const { accessToken } = await this.token(),
      data = await square(
        this.env,
        "/v2/payments/" + encodeURIComponent(paymentId),
        { token: accessToken, fetchImpl: this.fetchImpl },
      ),
      p = data.payment;
    requireValue(p?.id === paymentId, "Payment verification failed.", 503);
    const id = await this.storage.get("squareOrder:" + p.order_id);
    if (!id) return;
    const q = known?.id === id ? known : await this.getOrder(id),
      r = q.requests.find((r) => r.squareOrderId === p.order_id);
    if (!r) return;
    if (
      p.location_id !== r.locationId ||
      p.amount_money?.currency !== q.currency ||
      p.amount_money.amount !== r.dueCents ||
      (p.tip_money?.amount || 0) !== 0 ||
      (p.refunded_money &&
        (!cents(p.refunded_money.amount) ||
          p.refunded_money.amount > r.dueCents ||
          p.refunded_money.currency !== q.currency))
    ) {
      q.status = "review_required";
      await this.saveOrder(q);
      await this.audit("payment_mismatch", "square", { orderId: q.id });
      if (!suppressRetire) await this.retireHeld(q);
      return;
    }
    const previous = q.payments[p.id];
    if (previous?.status === "COMPLETED" && p.status !== "COMPLETED") return;
    q.payments[p.id] = {
      id: p.id,
      status: p.status,
      amountCents: p.amount_money.amount,
      reportedRefundCents: p.refunded_money?.amount || 0,
      request: r.number,
      verifiedAt: this.now(),
    };
    if (p.status === "COMPLETED") {
      r.status = "paid";
      if (["cancelled", "expired"].includes(q.status))
        q.status = "review_required";
    }
    this.recount(q);
    await this.saveOrder(q);
    await this.audit("payment_verified", "square", {
      orderId: q.id,
      paymentId: p.id,
      status: p.status,
    });
    if (!suppressRetire) await this.retireHeld(q);
  }

  async refund(id) {
    const { accessToken } = await this.token(),
      data = await square(this.env, "/v2/refunds/" + encodeURIComponent(id), {
        token: accessToken,
        fetchImpl: this.fetchImpl,
      }),
      r = data.refund;
    requireValue(
      r?.id === id && r.payment_id,
      "Refund verification failed.",
      503,
    );
    await this.payment(r.payment_id);
    const pd = await square(
        this.env,
        "/v2/payments/" + encodeURIComponent(r.payment_id),
        { token: accessToken, fetchImpl: this.fetchImpl },
      ),
      qid = await this.storage.get("squareOrder:" + pd.payment?.order_id);
    if (!qid) return;
    const q = await this.getOrder(qid);
    if (
      r.amount_money?.currency !== q.currency ||
      !cents(r.amount_money.amount)
    ) {
      q.status = "review_required";
    } else {
      const old = q.refunds[r.id];
      if (old?.status === "COMPLETED" && r.status !== "COMPLETED") return;
      q.refunds[r.id] = {
        id: r.id,
        status: r.status,
        amountCents: r.amount_money.amount,
        paymentId: r.payment_id,
      };
      this.recount(q);
    }
    await this.saveOrder(q);
    await this.audit("refund_verified", "square", {
      orderId: q.id,
      refundId: id,
    });
    await this.retireHeld(q);
  }
  async maintain() {
    let cursor = await this.storage.get("maintenance-cursor");
    const page = await this.storage.list({
      prefix: "index:",
      limit: 10,
      ...(cursor ? { startAfter: cursor } : {}),
    });
    let pending = !!(cursor && (await this.storage.get("maintenance-pending")));
    for (const id of page.values()) {
      try {
        const q = await this.getOrder(id),
          r = q.requests.at(-1);
        if (r?.status === "creating") await this.createLink(q, r);
        if (r?.status === "pending") await this.reconcileOrder(q, r);
        await this.refreshCompletedPayments(q, { limit: 2 });
        await this.retireHeld(q);
        if (
          !q.paidCents &&
          (q.expiresAt < this.now() ||
            q.policyVersion !== (await this.settings()).policy.version) &&
          !["cancelled", "expired", "refunded", "review_required"].includes(
            q.status,
          )
        )
          await this.cancel(
            q,
            q.expiresAt < this.now() ? "expired" : "settings_changed",
          );
        pending ||=
          q.requests.some((r) => ["creating", "pending"].includes(r.status)) ||
          (!q.paidCents &&
            !["cancelled", "expired", "refunded", "review_required"].includes(
              q.status,
            ));
      } catch {
        /* Keep unresolved outcomes for the next retry; never infer payment. */
      }
    }
    await this.storage.put(
      "maintenance-cursor",
      page.size === 10 ? [...page.keys()].at(-1) : null,
    );
    await this.storage.put("maintenance-pending", pending);
    if (page.size)
      await this.store.state.storage.setAlarm(
        this.now() + (pending || page.size === 10 ? 60000 : 3600000),
      );
  }
}

export function checkoutService(store) {
  return new MerchantCheckout(store);
}
export function checkoutLocked(store, operation) {
  const run = (store.checkoutQueue || Promise.resolve()).then(() =>
    operation(checkoutService(store)),
  );
  store.checkoutQueue = run.catch(() => {});
  return run;
}
export async function checkoutRoutes(store, request) {
  const path = new URL(request.url).pathname,
    shop = store.shop();
  if (path === "/commerce") {
    store.owner(request, shop);
    if (request.method === "GET")
      return Response.json({
        settings: { ...commerceDefaults(), ...shop.commerce },
      });
    requireValue(request.method === "PUT", "Not found.", 404);
    const body = commerceInput(await readJson(request, 8192));
    return checkoutLocked(store, async () => {
      const current = store.shop();
      requireValue(
        body.version === (current.commerce?.version || 0),
        "Checkout settings changed. Reload before saving.",
        409,
      );
      requireValue(
        body.cashProductIds.every((id) =>
          current.draft.products.some((p) => p.id === id),
        ),
        "Choose existing products.",
      );
      const next = {
        ...current,
        commerce: {
          ...body,
          version: body.version + 1,
          approvedBy: shop.ownerUid,
          approvedAt: Date.now(),
        },
      };
      store.sql.exec(
        "UPDATE shop SET data=? WHERE singleton=1",
        JSON.stringify(next),
      );
      return Response.json({ settings: next.commerce });
    });
  }
  if (!path.startsWith("/checkout/")) return null;
  const body = await readJson(request, 8192),
    token = body.token;
  return checkoutLocked(store, async (service) => {
    if (path === "/checkout/event")
      return Response.json(await service.event(body.event));
    if (path === "/checkout/merchant") {
      store.owner(request, shop);
      return Response.json(
        await service.listOrders({ uid: shop.ownerUid }, body.cursor),
      );
    }
    await service.rate(
      body.ipBucket || "unknown",
      path === "/checkout/quote" ? "quote" : "status",
    );
    if (path === "/checkout/quote")
      return Response.json({
        order: await service.quote(body.requestId, token),
      });
    requireValue(
      /^[A-Za-z0-9_-]{24}$/.test(body.orderId || ""),
      "Invalid order reference.",
    );
    let order;
    if (path === "/checkout/status")
      order = await service.status(body.orderId, token);
    else if (path === "/checkout/pay")
      order = await service.checkout(body.orderId, token, {
        revision: body.revision,
        choice: body.choice,
      });
    else if (path === "/checkout/cancel")
      order = await service.cancel(
        await service.customerOrder(body.orderId, token),
      );
    else throw new HttpError(404, "Not found.");
    return Response.json({ order });
  });
}
