import { defaultSettings, ShopService } from "../shop-service.mjs";
import { encrypt, randomToken } from "../security.mjs";
export const fixedNow = Date.parse("2026-10-27T12:00:00Z");
export class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  async get(k) {
    const v = this.values.get(k);
    return v === undefined ? undefined : structuredClone(v);
  }
  async put(k, v) {
    this.values.set(k, structuredClone(v));
  }
  async delete(k) {
    return this.values.delete(k);
  }
  async list({ prefix = "", limit = 1000, startAfter, reverse = false } = {}) {
    let keys = [...this.values.keys()]
      .filter((k) => k.startsWith(prefix) && (!startAfter || k > startAfter))
      .sort();
    if (reverse) keys.reverse();
    return new Map(
      keys.slice(0, limit).map((k) => [k, structuredClone(this.values.get(k))]),
    );
  }
  async setAlarm(t) {
    this.alarm = t;
  }
}
export function design(ids = ["rose_pink"], mode = "dome") {
  return {
    version: 6,
    mode,
    seed: 11,
    nextId: ids.length + 1,
    title: "Test bouquet",
    note: "",
    template: {
      capacity: ids.length,
      palette: [ids[0]],
      formation: "patches",
      accent: { id: ids[0], count: 0, pattern: "cluster", angle: 340 },
      zones: {
        wall: ids[0],
        fill: ids[0],
        center: ids[0],
        formation: "zones",
        doubleWall: false,
      },
      overrides: Object.fromEntries(ids.map((id, i) => [i, id])),
    },
    items: ids.map((id, slot) => ({
      id,
      slot,
      uid: "b" + (slot + 1),
      anchors: { [mode]: { x: 360, y: 390, manual: true } },
    })),
    frames: {
      [mode]: {
        mode,
        center: { x: 360, y: 390 },
        radius: 100,
        unit: 88,
        top: 280,
        tip: 500,
        halfWidth: 130,
      },
    },
    finishes: {
      paper: "black",
      tint: "#b69aca",
      ribbon: "none",
      sash: "none",
      sashText: "",
      butterfly: 0,
      crown: false,
      decorations: [],
      studio: { v: 1, cashSupply: "shop", paymentPlan: "deposit" },
    },
  };
}
export function policy(now = fixedNow) {
  const p = defaultSettings("raysbouquetz").policy;
  p.approved = true;
  for (const id of p.enabledItems)
    if (p.unitCents[id] === null) p.unitCents[id] = 1000;
  for (const id of p.enabledExtras)
    if (p.extrasCents[id] === null) p.extrasCents[id] = 1500;
  p.wrappingCents = { dome: 0, heart: 0 };
  p.tax = { approved: true, mode: "none", bps: 0 };
  p.fulfillment = {
    approved: true,
    pickupEnabled: true,
    pickupInstructions: "Test pickup",
    leadDays: 2,
    deliveryZones: [
      {
        id: "winnipeg",
        label: "Winnipeg test area",
        feeCents: 1500,
        postalPrefixes: ["R3C"],
      },
    ],
  };
  p.usdToCad = {
    numerator: 14484,
    denominator: 10000,
    source: "https://ix0.apps.td.com/en/fxcal",
    asOf: new Date(now - 7200000).toISOString(),
    expiresAt: new Date(now + 86400000).toISOString(),
  };
  p.cancellationPolicy = "Test policy only.";
  return p;
}
export function mockSquare(now = fixedNow) {
  const orders = new Map(),
    payments = new Map(),
    refunds = new Map(),
    keys = new Map(),
    calls = [];
  let next = 0,
    failNextLink = false;
  async function fetchImpl(url, init = {}) {
    const path = new URL(url).pathname,
      b = init.body ? JSON.parse(init.body) : null;
    calls.push({
      path,
      method: init.method || "GET",
      body: b,
      headers: init.headers,
    });
    const response = (v) =>
      new Response(JSON.stringify(v), {
        headers: { "Content-Type": "application/json" },
      });
    if (path === "/oauth2/token")
      return response({
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        merchant_id: "test-merchant",
        expires_at: new Date(now + 30 * 86400000).toISOString(),
      });
    if (path === "/oauth2/revoke") return response({ success: true });
    if (path === "/v2/locations")
      return response({
        locations: [
          {
            id: "test-location",
            status: "ACTIVE",
            name: "Test location",
            country: "CA",
            currency: "CAD",
            capabilities: ["CREDIT_CARD_PROCESSING"],
          },
        ],
      });
    if (path === "/v2/online-checkout/payment-links") {
      if (!keys.has(b.idempotency_key)) {
        const n = ++next,
          link = {
            id: "link-" + n,
            order_id: "sq-order-" + n,
            url: "https://sandbox.square.link/u/test-" + n,
          };
        keys.set(b.idempotency_key, link);
        orders.set(link.order_id, {
          id: link.order_id,
          location_id: "test-location",
          state: "DRAFT",
          tenders: [],
          amount: b.quick_pay.price_money.amount,
          linkId: link.id,
        });
      }
      if (failNextLink) {
        failNextLink = false;
        throw Error("Mock network timeout after Square accepted the request");
      }
      return response({ payment_link: keys.get(b.idempotency_key) });
    }
    if (
      path.startsWith("/v2/online-checkout/payment-links/") &&
      init.method === "DELETE"
    ) {
      const order = [...orders.values()].find(
        (o) => o.linkId === path.split("/").at(-1),
      );
      if (order) order.cancelled = true;
      return response({});
    }
    if (path.startsWith("/v2/orders/"))
      return response({ order: orders.get(path.split("/").at(-1)) });
    if (path.startsWith("/v2/payments/"))
      return response({ payment: payments.get(path.split("/").at(-1)) });
    if (path.startsWith("/v2/refunds/"))
      return response({ refund: refunds.get(path.split("/").at(-1)) });
    throw Error("Unexpected mock endpoint " + path);
  }
  function pay(
    orderId,
    {
      id = "payment-" + payments.size,
      status = "COMPLETED",
      amount,
      currency = "CAD",
    } = {},
  ) {
    const o = orders.get(orderId);
    const p = {
      id,
      order_id: orderId,
      location_id: o.location_id,
      status,
      amount_money: { amount: amount ?? o.amount, currency },
      tip_money: { amount: 0, currency },
    };
    payments.set(id, p);
    o.tenders = [{ payment_id: id, id }];
    return p;
  }
  return {
    fetchImpl,
    orders,
    payments,
    refunds,
    calls,
    keys,
    pay,
    timeoutNextLink() {
      failNextLink = true;
    },
  };
}
export async function fixture(now = fixedNow) {
  const storage = new MemoryStorage(),
    square = mockSquare(now),
    env = {
      ENVIRONMENT: "sandbox",
      PAYMENTS_ENABLED: "true",
      SQUARE_APPLICATION_ID: "fake-app",
      SQUARE_APPLICATION_SECRET: "fake-secret",
      SQUARE_WEBHOOK_SIGNATURE_KEY: "fake-signature-key",
      TOKEN_ENCRYPTION_KEY: randomToken(),
      API_BASE_URL: "https://test-worker.example",
      SITE_ORIGIN: "https://nebulastudio.site",
      PLATFORM_ADMIN_UIDS: "platform-owner",
      FIREBASE_PROJECT_ID: "la-flora-6ed47",
    },
    clock = { now },
    registry = new Map(),
    service = new ShopService({
      storage,
      env,
      shop: "raysbouquetz",
      now: () => clock.now,
      fetchImpl: square.fetchImpl,
      registry: async (action, b) => {
        if (action === "bind") {
          if (
            registry.has(b.merchantId) &&
            registry.get(b.merchantId) !== b.shop
          )
            throw Error("already connected");
          registry.set(b.merchantId, b.shop);
        }
        return { shop: registry.get(b.merchantId) };
      },
    });
  const settings = defaultSettings("raysbouquetz");
  settings.policy = policy(now);
  settings.checkoutEnabled = true;
  settings.cashPaymentsApproved = true;
  settings.owners = ["ray-owner"];
  await storage.put("settings", settings);
  await storage.put("connection", {
    merchantId: "test-merchant",
    locationId: "test-location",
    status: "connected",
    tokens: await encrypt(
      {
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        merchant_id: "test-merchant",
        expires_at: new Date(now + 30 * 86400000).toISOString(),
      },
      env.TOKEN_ENCRYPTION_KEY,
      "sandbox:raysbouquetz",
    ),
    refreshedAt: now,
  });
  const customer = {
    name: "TEST ONLY",
    phone: "+12045550100",
    email: "test@example.test",
    date: new Date(now + 7 * 86400000).toISOString().slice(0, 10),
    method: "Pickup",
    note: "",
  };
  const request = {
    policyVersion: 1,
    requestKey: randomToken(),
    design: design(),
    customer,
  };
  const actor = {
    uid: "ray-owner",
    email: "ray@example.test",
    authTime: now / 1000,
  };
  return { service, storage, square, env, clock, request, actor };
}
