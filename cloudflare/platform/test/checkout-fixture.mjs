import assert from "node:assert/strict";
import { fixture, origin } from "./fixtures.mjs";
import { encrypt } from "../../rays-payments/security.mjs";
export { origin };
const parse = async (r, status = 200) => {
  assert.equal(r.status, status, await r.clone().text());
  return r.json();
};
export const token = "B".repeat(43);
export const settings = {
  version: 0,
  enabled: true,
  pricesApproved: true,
  taxBps: 1300,
  deliveryCents: 501,
  pickupEnabled: true,
  deliveryEnabled: true,
  terms:
    "Pickup by arrangement. Remaining balance is due before delivery. Contact us for cancellation and refund review.",
  cashProductIds: [],
};
export async function setup(currency = "USD") {
  const f = fixture({
    env: {
      PUBLISHING_ENABLED: "true",
      CHECKOUT_ENABLED: "true",
      SQUARE_ENVIRONMENT: "sandbox",
      SQUARE_SANDBOX_CONNECT_ENABLED: "true",
      SQUARE_SANDBOX_APPLICATION_ID: "fixture-app",
      SQUARE_SANDBOX_APPLICATION_SECRET: "fixture-secret",
      SQUARE_TOKEN_ENCRYPTION_KEY: "A".repeat(43),
      SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY: "fixture-webhook",
    },
  });
  const { shop } = await f.create();
  const object = f.env.SHOPS.objects.get(shop.id),
    sql = object.state.storage.sql;
  const draft = {
    ...shop.draft,
    currency,
    phone: "15551234567",
    city: "Town",
    flowerPrices: { rose_red: 1001 },
    disabledFlowers: [],
    disabledExtras: [],
    home: { ...shop.draft.home, sections: ["products", "builder", "contact"] },
    extrasCents: { card: 0 },
    products: [
      {
        id: "gift",
        title: "A satin gift",
        description: "As photographed",
        priceCents: 1001,
        available: true,
        cover: null,
        category: "Gifts",
      },
    ],
  };
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...shop,
      draft,
      published: { version: 1, draft },
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  const merchant = "merchant-fixture",
    location = "location-fixture";
  await f.env.REGISTRY.get("platform-registry-v1").fetch(
    new Request("https://internal/square-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: shop.id,
        ownerUid: shop.ownerUid,
        environment: "sandbox",
        merchantId: merchant,
      }),
    }),
  );
  const encryptedTokens = await encrypt(
    {
      access_token: "fixture-access",
      refresh_token: "fixture-refresh",
      merchant_id: merchant,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    f.env.SQUARE_TOKEN_ENCRYPTION_KEY,
    `nebula-square-v1:sandbox:${shop.id}`,
  );
  sql.exec(
    "INSERT INTO square_state(key,data) VALUES(?,?)",
    `square:sandbox:${shop.id}:connection`,
    JSON.stringify({
      shopId: shop.id,
      ownerUid: shop.ownerUid,
      environment: "sandbox",
      applicationId: "fixture-app",
      merchantId: merchant,
      locationId: location,
      status: "connected",
      encryptedTokens,
      connectedAt: Date.now(),
      refreshedAt: Date.now(),
      expiresAt: Date.now() + 30 * 86400000,
    }),
  );
  const network = {
    calls: [],
    payments: new Map(),
    orders: new Map(),
    refunds: new Map(),
    links: new Map(),
    failCreate: false,
    badAmount: false,
  };
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    assert.equal(new URL(url).origin, "https://connect.squareupsandbox.com");
    const path = new URL(url).pathname,
      body = opts.body ? JSON.parse(opts.body) : null;
    network.calls.push({ path, method: opts.method, body });
    if (path === "/v2/locations")
      return Response.json({
        locations: [
          {
            id: location,
            merchant_id: merchant,
            name: "Shop",
            country:
              { CAD: "CA", GBP: "GB", AUD: "AU", EUR: "IE" }[currency] || "US",
            currency,
            status: "ACTIVE",
            capabilities: ["CREDIT_CARD_PROCESSING"],
          },
        ],
      });
    if (
      path === "/v2/online-checkout/payment-links" &&
      opts.method === "POST"
    ) {
      if (network.rejectPhone && body.pre_populated_data?.buyer_phone_number)
        return Response.json(
          {
            errors: [
              {
                code: "INVALID_PHONE_NUMBER",
                field: "pre_populated_data.buyer_phone_number",
              },
            ],
          },
          { status: 400 },
        );
      let link = network.links.get(body.idempotency_key);
      if (!link) {
        const n = network.links.size + 1;
        link = {
          id: "link-" + n,
          order_id: "square-order-" + n,
          url: "https://sandbox.square.link/u/test-" + n,
        };
        network.links.set(body.idempotency_key, link);
        network.orders.set(link.order_id, {
          id: link.order_id,
          location_id: location,
          state: "OPEN",
          tenders: [],
        });
      }
      if (network.failCreate) {
        network.failCreate = false;
        throw Error("Simulated response loss after Square created the link");
      }
      return Response.json({ payment_link: link });
    }
    if (path.startsWith("/v2/orders/"))
      return Response.json({
        order: network.orders.get(decodeURIComponent(path.split("/").at(-1))),
      });
    if (path.startsWith("/v2/payments/"))
      return Response.json({
        payment: network.payments.get(
          decodeURIComponent(path.split("/").at(-1)),
        ),
      });
    if (path.startsWith("/v2/refunds/"))
      return Response.json({
        refund: network.refunds.get(decodeURIComponent(path.split("/").at(-1))),
      });
    if (
      path.startsWith("/v2/online-checkout/payment-links/") &&
      opts.method === "DELETE"
    ) {
      const id = path.split("/").at(-1);
      const link = [...network.links.values()].find((l) => l.id === id);
      if (link) network.orders.get(link.order_id).state = "CANCELED";
      return Response.json({});
    }
    throw Error("Unexpected mock route " + path);
  };
  await parse(
    await f.call(`/api/shops/${shop.id}/commerce`, {
      method: "PUT",
      body: settings,
    }),
  );
  const requestBody = {
    requestKey: crypto.randomUUID(),
    kind: "product",
    productId: "gift",
    publishedVersion: 1,
    accessToken: token,
    customer: {
      name: "Customer <script>",
      address: "123 Blossom Lane, Test Town",
      phone: "15551230000",
      note: "Birthday",
      date: null,
    },
    fulfillment: "delivery",
  };
  const req = await parse(
    await f.call(`/api/shops/${shop.id}/requests`, {
      method: "POST",
      token: null,
      body: requestBody,
    }),
    201,
  );
  const call = (action, body, access = token) =>
    f.call(`/api/shops/${shop.id}/checkout/${action}`, {
      method: "POST",
      token: null,
      headers: { "X-Order-Token": access },
      body,
    });
  const complete = (n, amount, status = "COMPLETED") => {
    const link = [...network.links.values()][n - 1],
      id = "payment-" + n;
    network.payments.set(id, {
      id,
      order_id: link.order_id,
      location_id: location,
      status,
      amount_money: { amount, currency },
      tip_money: { amount: 0, currency },
      refunded_money: { amount: 0, currency },
    });
    network.orders.get(link.order_id).tenders = [{ payment_id: id }];
    return id;
  };
  const webhook = async (event, valid = true) => {
    const raw = JSON.stringify(event),
      url = origin + "/api/square/webhook";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(f.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(url + raw),
          ),
        ),
      ),
    );
    return f.handler(
      new Request(url, {
        method: "POST",
        headers: {
          "x-square-hmacsha256-signature": valid ? sig : "bad",
          "Content-Type": "application/json",
        },
        body: raw,
      }),
      f.env,
    );
  };
  return {
    ...f,
    shop,
    object,
    sql,
    network,
    requestBody,
    requestId: req.request.id,
    checkout: call,
    complete,
    webhook,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
