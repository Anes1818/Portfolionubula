import Commerce from "../../clients/raysbouquetz/commerce-core.js";
import {
  HttpError,
  requireValue,
  randomToken,
  hash,
  encrypt,
  decrypt,
} from "./security.mjs";
import {
  square,
  locations,
  scopes,
  host,
  checkoutUrl,
  validTokens,
} from "./square.mjs";
import { createHostedCheckout } from "./square-payment-links.mjs";

const copy = (v) => JSON.parse(JSON.stringify(v));
const held = (q) => ["review_required", "refunded"].includes(q.status);
export function defaultSettings(shop) {
  return {
    shop,
    name: shop === "raysbouquetz" ? "Ray’s Bouquetz" : shop,
    checkoutEnabled: false,
    cashPaymentsApproved: false,
    owners: [],
    policy: {
      version: 1,
      currency: "CAD",
      approved: false,
      pricingModel: "per-item-with-foam-packages",
      enabledItems: Commerce.flowerRows.map((r) => r[0]),
      unitCents: Object.fromEntries(
        Commerce.flowerRows.map(([id, , family]) => [
          id,
          family === "rose"
            ? id === "rose_red_glitter"
              ? 900
              : 800
            : family === "foam"
              ? 600
              : null,
        ]),
      ),
      enabledExtras: [...Commerce.extras],
      extrasCents: {
        butterfly: 300,
        crown: null,
        bow_lilac: 300,
        bow_black: 300,
        graduation_cap: 1200,
        snoopy: null,
        kitty: null,
        snoopy_topper: null,
        sash: 1000,
        message_bow_bundle: 1500,
      },
      wrappingCents: { dome: null, heart: null },
      foamTiers: {
        1: 1000,
        7: 4000,
        15: 8500,
        18: 9500,
        20: 10500,
        21: 11500,
        24: 12500,
        25: 13000,
        30: 15000,
        36: 17500,
        40: 19500,
        50: 26000,
        55: 29000,
        60: 31500,
        75: 39000,
        100: 48000,
      },
      moneyEnabled: true,
      moneyStylingCents: 8000,
      depositBps: 5000,
      usdToCad: null,
      tax: { approved: false, mode: "none", bps: 0 },
      fulfillment: {
        approved: false,
        pickupEnabled: true,
        pickupInstructions: "",
        leadDays: 2,
        deliveryZones: [],
      },
      cancellationPolicy: "",
    },
  };
}
export class ShopService {
  constructor({
    storage,
    env,
    shop,
    registry,
    fetchImpl = fetch,
    now = () => Date.now(),
  }) {
    Object.assign(this, { storage, env, shop, registry, now });
    this.fetchImpl = async (url, options) => {
      const r = await fetchImpl(url, options);
      if (r.status === 401 && new URL(url).pathname.startsWith("/v2/")) {
        const c = await this.connection();
        if (c?.status === "connected")
          await storage.put("connection", {
            ...c,
            status: "reconnect_required",
          });
      }
      return r;
    };
  }
  async settings() {
    return (await this.storage.get("settings")) || defaultSettings(this.shop);
  }
  async audit(action, actor = "system", detail = {}) {
    await this.storage.put(
      "audit:" + this.now() + ":" + randomToken().slice(0, 12),
      { at: this.now(), action, actor, ...detail },
    );
  }
  admin(actor) {
    return (
      !!actor &&
      (this.env.PLATFORM_ADMIN_UIDS || "")
        .split(",")
        .filter(Boolean)
        .includes(actor.uid)
    );
  }
  async role(actor) {
    requireValue(actor, "Sign in is required.", 401);
    return this.admin(actor)
      ? "platform-admin"
      : (await this.settings()).owners.includes(actor.uid)
        ? "merchant"
        : "unassigned";
  }
  async authorize(actor, { recent = false } = {}) {
    const role = await this.role(actor);
    requireValue(
      role !== "unassigned",
      "This account is not assigned to this shop.",
      403,
    );
    if (recent)
      requireValue(
        this.now() / 1000 - actor.authTime < 600,
        "Sign in again before changing the payment connection.",
        401,
      );
    return role;
  }
  configured() {
    return (
      !!this.env.SQUARE_APPLICATION_ID &&
      !!this.env.SQUARE_APPLICATION_SECRET &&
      /^[A-Za-z0-9_-]{43}$/.test(this.env.TOKEN_ENCRYPTION_KEY || "") &&
      !!this.env.SQUARE_WEBHOOK_SIGNATURE_KEY &&
      !!this.env.API_BASE_URL
    );
  }
  async connection() {
    return await this.storage.get("connection");
  }
  async token({ refresh = false } = {}) {
    const c = await this.connection();
    requireValue(
      c && c.status === "connected",
      "Square needs connecting.",
      409,
    );
    let tokens;
    try {
      tokens = await decrypt(
        c.tokens,
        this.env.TOKEN_ENCRYPTION_KEY,
        this.env.ENVIRONMENT + ":" + this.shop,
      );
    } catch {
      throw new HttpError(503, "The payment connection needs attention.");
    }
    if (
      refresh ||
      Date.parse(tokens.expires_at) < this.now() + 86400000 ||
      c.refreshedAt < this.now() - 6 * 86400000
    ) {
      try {
        const data = validTokens(
          await square(this.env, "/oauth2/token", {
            method: "POST",
            body: {
              client_id: this.env.SQUARE_APPLICATION_ID,
              client_secret: this.env.SQUARE_APPLICATION_SECRET,
              grant_type: "refresh_token",
              refresh_token: tokens.refresh_token,
            },
            fetchImpl: this.fetchImpl,
          }),
        );
        requireValue(
          data.merchant_id === c.merchantId,
          "Square returned a different merchant.",
          409,
        );
        c.tokens = await encrypt(
          data,
          this.env.TOKEN_ENCRYPTION_KEY,
          this.env.ENVIRONMENT + ":" + this.shop,
        );
        c.refreshedAt = this.now();
        await this.storage.put("connection", c);
        tokens = data;
      } catch (e) {
        if (e.status === 409) {
          c.status = "reconnect_required";
          await this.storage.put("connection", c);
        }
        throw e;
      }
    }
    return { accessToken: tokens.access_token, connection: c };
  }
  async enabled() {
    const s = await this.settings(),
      c = await this.connection();
    return (
      this.env.PAYMENTS_ENABLED === "true" &&
      s.checkoutEnabled === true &&
      this.configured() &&
      c?.status === "connected" &&
      typeof c.locationId === "string" &&
      c.locationId.trim().length > 0 &&
      (this.env.ENVIRONMENT !== "production" ||
        this.env.LIVE_CHECKOUT_APPROVED === "true") &&
      Commerce.policyProblems(s.policy).length === 0
    );
  }
  async publicConfig() {
    const s = await this.settings();
    return {
      shopId: this.shop,
      name: s.name,
      environment: this.env.ENVIRONMENT,
      available: await this.enabled(),
      policy: s.policy,
      cashPaymentsApproved: s.cashPaymentsApproved,
    };
  }
  async account(actor) {
    const role = await this.role(actor),
      s = await this.settings();
    if (role === "unassigned")
      return {
        uid: actor.uid,
        email: actor.email,
        role,
        configured: this.configured(),
      };
    const c = await this.connection();
    let connection = {
      status: c?.status || "not_connected",
      locations: [],
      locationId: c?.locationId || null,
    };
    if (c?.status === "connected")
      try {
        const { accessToken } = await this.token();
        connection.locations = await locations(
          this.env,
          accessToken,
          this.fetchImpl,
        );
      } catch (e) {
        connection.status =
          e.status === 409 ? "reconnect_required" : "temporarily_unavailable";
      }
    return {
      uid: actor.uid,
      email: actor.email,
      role,
      configured: this.configured(),
      settings: s,
      connection,
      missing: Commerce.policyProblems(s.policy),
      enabled: await this.enabled(),
    };
  }
  async invite(actor, email) {
    requireValue(
      this.admin(actor),
      "Only the platform owner can invite a shop owner.",
      403,
    );
    requireValue(
      typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        email.length <= 254,
      "Enter the owner’s email.",
    );
    const token = randomToken();
    await this.storage.put("invite:" + (await hash(token)), {
      email: email.toLowerCase(),
      expiresAt: this.now() + 7 * 86400000,
    });
    await this.audit("owner_invited", actor.uid);
    return { invite: token, expiresAt: this.now() + 7 * 86400000 };
  }
  async claim(actor, token) {
    requireValue(actor, "Sign in and verify your email.", 401);
    requireValue(
      typeof token === "string" && token.length === 43,
      "An owner invitation is required.",
    );
    const key = "invite:" + (await hash(token)),
      i = await this.storage.get(key);
    requireValue(
      i && i.email === actor.email && i.expiresAt > this.now(),
      "The invitation is invalid, expired or belongs to another email.",
      403,
    );
    const s = await this.settings();
    if (!s.owners.includes(actor.uid)) s.owners.push(actor.uid);
    await this.storage.put("settings", s);
    await this.storage.delete(key);
    await this.audit("owner_claimed", actor.uid);
    return this.account(actor);
  }
  async saveSettings(actor, input) {
    await this.authorize(actor);
    if (Object.hasOwn(input || {}, "cashPaymentsApproved"))
      requireValue(
        this.admin(actor) && typeof input.cashPaymentsApproved === "boolean",
        "Only the platform owner can record cash-payment eligibility.",
        403,
      );
    const old = await this.settings();
    requireValue(
      input?.version === old.policy.version,
      "Settings changed. Reload before saving.",
      409,
    );
    const next = copy(input.policy);
    requireValue(
      next &&
        next.currency === "CAD" &&
        typeof input.checkoutEnabled === "boolean" &&
        JSON.stringify(next).length < 25000,
      "Invalid shop settings.",
    );
    next.version = old.policy.version + 1;
    requireValue(
      Commerce.validPolicyShape(next),
      "Invalid price policy format.",
    );
    const missing = Commerce.policyProblems(next);
    requireValue(!input.checkoutEnabled || !missing.length, missing.join(" "));
    // A price change cannot leave a previous, unpaid Square URL chargeable.
    for (const q of await this.allOrders())
      if (
        q.paidCents === 0 &&
        !["cancelled", "expired", "refunded", "review_required"].includes(
          q.status,
        )
      )
        await this.cancel(q, "settings_changed");
    old.policy = next;
    old.checkoutEnabled = input.checkoutEnabled;
    if (Object.hasOwn(input, "cashPaymentsApproved")) {
      requireValue(
        this.admin(actor),
        "Only the platform owner can record cash-payment eligibility.",
        403,
      );
      old.cashPaymentsApproved = input.cashPaymentsApproved === true;
    }
    await this.storage.put("settings", old);
    await this.audit("settings_changed", actor.uid, {
      version: next.version,
      checkoutEnabled: old.checkoutEnabled,
    });
    return this.account(actor);
  }
  async oauthStart(actor) {
    await this.authorize(actor, { recent: true });
    requireValue(
      this.configured(),
      "The platform payment setup is not configured yet.",
      503,
    );
    const state = randomToken(),
      nonce = randomToken();
    await this.storage.put("oauth:" + (await hash(state)), {
      uid: actor.uid,
      nonceHash: await hash(nonce),
      expiresAt: this.now() + 600000,
    });
    const url = new URL(host(this.env) + "/oauth2/authorize");
    for (const [key, value] of Object.entries({
      client_id: this.env.SQUARE_APPLICATION_ID,
      scope: scopes.join(" "),
      session: "false",
      state: this.shop + "." + state,
      redirect_uri: this.env.API_BASE_URL + "/oauth/callback",
    }))
      url.searchParams.set(key, value);
    return { url: url.href, browserNonce: nonce };
  }
  async oauthCallback({ state, code, nonce, denied }) {
    requireValue(
      typeof state === "string" &&
        state.length === 43 &&
        typeof nonce === "string",
      "The Square connection session is invalid.",
      403,
    );
    const key = "oauth:" + (await hash(state)),
      pending = await this.storage.get(key);
    requireValue(
      pending &&
        pending.expiresAt > this.now() &&
        pending.nonceHash === (await hash(nonce)),
      "The Square connection session expired. Start again.",
      403,
    );
    await this.storage.delete(key);
    requireValue(
      (await this.role({ uid: pending.uid })) !== "unassigned",
      "This shop access was removed.",
      403,
    );
    requireValue(
      !denied && typeof code === "string" && code.length < 2000,
      "Square connection was declined.",
    );
    const old = await this.connection();
    requireValue(
      !old || old.status !== "connected",
      "Disconnect the existing account before replacing it.",
      409,
    );
    const data = validTokens(
      await square(this.env, "/oauth2/token", {
        method: "POST",
        body: {
          client_id: this.env.SQUARE_APPLICATION_ID,
          client_secret: this.env.SQUARE_APPLICATION_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: this.env.API_BASE_URL + "/oauth/callback",
        },
        fetchImpl: this.fetchImpl,
      }),
    );
    requireValue(
      !(await this.allOrders()).some((q) =>
        q.requests.some(
          (r) => r.merchantId && r.merchantId !== data.merchant_id,
        ),
      ),
      "This shop has payment history with a different Square account. Contact Nebula before changing merchants.",
      409,
    );
    const allowed = await locations(
      this.env,
      data.access_token,
      this.fetchImpl,
    );
    requireValue(
      allowed.length,
      "Square needs an active Canadian CAD location with card payments enabled.",
      409,
    );
    await this.registry("bind", {
      merchantId: data.merchant_id,
      shop: this.shop,
    });
    await this.storage.put("connection", {
      merchantId: data.merchant_id,
      status: "connected",
      locationId: allowed.length === 1 ? allowed[0].id : null,
      tokens: await encrypt(
        data,
        this.env.TOKEN_ENCRYPTION_KEY,
        this.env.ENVIRONMENT + ":" + this.shop,
      ),
      refreshedAt: this.now(),
      connectedAt: this.now(),
      connectedBy: pending.uid,
    });
    await this.audit("square_connected", pending.uid);
    await this.schedule();
    return { connected: true };
  }
  async chooseLocation(actor, id) {
    await this.authorize(actor, { recent: true });
    const { accessToken, connection } = await this.token();
    const available = await locations(this.env, accessToken, this.fetchImpl);
    requireValue(
      available.some((l) => l.id === id),
      "Choose an active Canadian CAD Square location.",
    );
    if (connection.locationId !== id)
      requireValue(
        !(await this.allOrders()).some((q) =>
          q.requests?.some((r) => ["pending", "creating"].includes(r.status)),
        ),
        "Finish or cancel pending checkout links before changing location.",
        409,
      );
    connection.locationId = id;
    await this.storage.put("connection", connection);
    await this.audit("location_selected", actor.uid);
    return this.account(actor);
  }
  async disconnect(actor) {
    await this.authorize(actor, { recent: true });
    for (const q of await this.allOrders())
      if (q.requests?.some((r) => ["pending", "creating"].includes(r.status)))
        await this.cancel(q, "disconnected");
    const c = await this.connection();
    if (c?.tokens && c.status !== "revoked") {
      const tokens = await decrypt(
        c.tokens,
        this.env.TOKEN_ENCRYPTION_KEY,
        this.env.ENVIRONMENT + ":" + this.shop,
      );
      await square(this.env, "/oauth2/revoke", {
        method: "POST",
        token: null,
        body: {
          client_id: this.env.SQUARE_APPLICATION_ID,
          access_token: tokens.access_token,
        },
        fetchImpl: (url, opts) =>
          this.fetchImpl(url, {
            ...opts,
            headers: {
              ...opts.headers,
              Authorization: "Client " + this.env.SQUARE_APPLICATION_SECRET,
            },
          }),
      });
    }
    await this.storage.delete("connection");
    const s = await this.settings();
    s.checkoutEnabled = false;
    await this.storage.put("settings", s);
    await this.audit("square_disconnected", actor.uid);
    return { disconnected: true };
  }
  validateCustomer(input, p) {
    const good = (v, max) =>
        typeof v === "string" &&
        v.trim().length > 0 &&
        v.length <= max &&
        !/[\x00-\x1f<>]/.test(v),
      c = input || {};
    requireValue(
      good(c.name, 120) &&
        good(c.phone, 40) &&
        /^[+0-9 ()-]{7,40}$/.test(c.phone) &&
        /^\d{7,15}$/.test(c.phone.replace(/\D/g, "")) &&
        good(c.email, 254) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email),
      "Enter your name, phone and email.",
    );
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Winnipeg",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(this.now())),
      d = Date.parse(c.date + "T12:00:00Z"),
      min =
        Date.parse(today + "T12:00:00Z") + p.fulfillment.leadDays * 86400000;
    requireValue(
      /^\d{4}-\d{2}-\d{2}$/.test(c.date) &&
        Number.isFinite(d) &&
        new Date(d).toISOString().slice(0, 10) === c.date &&
        d >= min &&
        d < min + 366 * 86400000,
      "Choose an available date allowing the shop’s lead time.",
    );
    requireValue(
      ["Pickup", "Delivery"].includes(c.method),
      "Choose pickup or delivery.",
    );
    if (c.method === "Delivery")
      requireValue(
        good(c.address, 500) && c.address.trim().length >= 10,
        "Enter the delivery address.",
      );
    requireValue(
      c.note === undefined ||
        (typeof c.note === "string" &&
          c.note.length <= 600 &&
          !/[\x00-\x08<>]/.test(c.note)),
      "The order note is too long.",
    );
    return {
      name: c.name.trim(),
      phone: c.phone.trim(),
      email: c.email.trim(),
      date: c.date,
      method: c.method,
      zoneId: typeof c.zoneId === "string" ? c.zoneId.slice(0, 40) : "",
      postalCode:
        typeof c.postalCode === "string"
          ? c.postalCode.toUpperCase().replace(/\s/g, "").slice(0, 6)
          : "",
      address: c.method === "Delivery" ? c.address.trim() : "",
      note: (c.note || "").trim(),
    };
  }
  async quote(input) {
    requireValue(
      await this.enabled(),
      "Online checkout is not active yet. Your bouquet is still saved.",
      409,
    );
    const settings = await this.settings();
    requireValue(
      input?.policyVersion === settings.policy.version,
      "Prices changed. Refresh and review your total.",
      409,
    );
    requireValue(
      typeof input.requestKey === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(input.requestKey),
      "A secure checkout request key is required.",
    );
    const key = await hash(this.shop + ":" + input.requestKey),
      requestHash = await hash(
        JSON.stringify({
          design: input.design,
          customer: input.customer,
          version: input.policyVersion,
        }),
      ),
      prior = await this.storage.get("retry:" + key);
    if (prior) {
      requireValue(
        prior.requestHash === requestHash,
        "This request key already belongs to a different order.",
        409,
      );
      const q = await this.getOrder(prior.orderId);
      return this.publicOrder(q);
    }
    let design;
    try {
      design = Commerce.validateDesign(input.design);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    const customer = this.validateCustomer(input.customer, settings.policy);
    let pricing;
    try {
      pricing = Commerce.calculate(
        design,
        settings.policy,
        customer,
        this.now(),
      );
    } catch (e) {
      throw new HttpError(409, e.message);
    }
    requireValue(
      !pricing.includesCashValue || settings.cashPaymentsApproved === true,
      "Checkout for shop-supplied cash is not enabled.",
      409,
    );
    const q = {
      id: randomToken().slice(0, 24),
      shop: this.shop,
      revision: 1,
      policyVersion: settings.policy.version,
      design,
      customer,
      pricing,
      totalCents: pricing.totalCents,
      currency: "CAD",
      paidCents: 0,
      refundedCents: 0,
      expiresAt: Math.min(
        this.now() + 900000,
        pricing.fx ? Date.parse(pricing.fx.expiresAt) : Infinity,
      ),
      createdAt: this.now(),
      accessHash: key,
      status: "quoted",
      requests: [],
      payments: {},
      refunds: {},
      cancellationPolicy: settings.policy.cancellationPolicy,
      pickupInstructions: settings.policy.fulfillment.pickupInstructions,
    };
    await this.saveOrder(q);
    await this.storage.put("retry:" + key, { orderId: q.id, requestHash });
    await this.storage.put(
      "index:" + String(9999999999999 - q.createdAt) + ":" + q.id,
      q.id,
    );
    await this.audit("order_created", "customer", {
      orderId: q.id,
      version: q.policyVersion,
    });
    await this.schedule();
    return this.publicOrder(q);
  }
  async getOrder(id) {
    requireValue(
      typeof id === "string" && /^[A-Za-z0-9_-]{24}$/.test(id),
      "Invalid order reference.",
    );
    const q = await this.storage.get("order:" + id);
    requireValue(q, "Order not found.", 404);
    return q;
  }
  async saveOrder(q) {
    await this.storage.put("order:" + q.id, q);
  }
  async customerOrder(id, token) {
    const q = await this.getOrder(id);
    requireValue(
      typeof token === "string" &&
        (await hash(this.shop + ":" + token)) === q.accessHash,
      "This order link is not authorised.",
      403,
    );
    return q;
  }
  publicOrder(q) {
    const pending =
      !held(q) && !["cancelled", "expired"].includes(q.status)
        ? q.requests
            .filter((r) => r.status === "pending" && !r.retirementPending)
            .at(-1)
        : null;
    return {
      id: q.id,
      shop: q.shop,
      revision: q.revision,
      status: q.status,
      createdAt: q.createdAt,
      expiresAt: q.expiresAt,
      pricing: q.pricing,
      totalCents: q.totalCents,
      paidCents: q.paidCents,
      balanceCents: Math.max(0, q.totalCents - q.paidCents),
      refundedCents: q.refundedCents,
      currency: q.currency,
      customer: {
        name: q.customer.name,
        date: q.customer.date,
        method: q.customer.method,
      },
      pickupInstructions:
        q.customer.method === "Pickup" ? q.pickupInstructions : "",
      cancellationPolicy: q.cancellationPolicy,
      request: pending
        ? {
            choice: pending.choice,
            dueCents: pending.dueCents,
            url: pending.url,
          }
        : null,
    };
  }
  async checkout(id, token, input) {
    const q = await this.customerOrder(id, token);
    requireValue(
      await this.enabled(),
      "Checkout is temporarily paused. Your order is saved.",
      409,
    );
    requireValue(
      input?.revision === q.revision &&
        ["deposit", "full"].includes(input.choice),
      "Choose deposit or full payment for the current order.",
    );
    requireValue(
      !["cancelled", "expired", "review_required", "refunded"].includes(
        q.status,
      ),
      "This order needs attention before another payment.",
      409,
    );
    const s = await this.settings();
    requireValue(
      !q.pricing.includesCashValue || s.cashPaymentsApproved,
      "Shop-supplied cash checkout is disabled.",
      409,
    );
    // A refund webhook can be lost. Verify the deposit again before offering
    // another charge, even if a completed payment was checked moments ago.
    if (q.paidCents)
      await this.refreshCompletedPayments(q, { force: true, limit: Infinity });
    requireValue(
      !held(q),
      "This order needs attention before another payment.",
      409,
    );
    // Once money is paid, the original agreed price remains locked for the balance.
    if (!q.paidCents)
      requireValue(
        q.expiresAt > this.now() && q.policyVersion === s.policy.version,
        "The checkout quote expired. Review a fresh total.",
        409,
      );
    let r = q.requests.at(-1);
    if (r?.status === "pending") {
      await this.reconcileOrder(q, r);
      if (r.status === "pending") {
        requireValue(
          r.choice === input.choice,
          "Cancel the current checkout before changing payment amount.",
          409,
        );
        return this.publicOrder(q);
      }
    }
    requireValue(
      !["cancelled", "expired", "review_required", "refunded"].includes(
        q.status,
      ),
      "This order needs attention before another payment.",
      409,
    );
    const due =
      input.choice === "full"
        ? q.totalCents - q.paidCents
        : Math.max(0, Math.ceil(q.totalCents / 2) - q.paidCents);
    requireValue(due > 0, "There is no payment due for that option.", 409);
    if (r?.status === "creating")
      requireValue(
        r.choice === input.choice && r.dueCents === due,
        "Retry the current payment request before changing it.",
        409,
      );
    else {
      r = {
        number: q.requests.length + 1,
        choice: input.choice,
        dueCents: due,
        paidCents: q.paidCents,
        status: "creating",
        key: await hash(
          this.env.ENVIRONMENT +
            ":" +
            this.shop +
            ":" +
            q.id +
            ":" +
            (q.requests.length + 1),
        ),
        createdAt: this.now(),
      };
      q.requests.push(r);
      await this.saveOrder(q);
    }
    await this.createLink(q, r);
    return this.publicOrder(q);
  }
  async createLink(q, r) {
    const { accessToken, connection } = await this.token();
    requireValue(
      connection.locationId,
      "The shop must select its Square location.",
      409,
    );
    const link = await createHostedCheckout({
      env: this.env,
      token: accessToken,
      fetchImpl: this.fetchImpl,
      body: {
        idempotency_key: r.key,
        quick_pay: {
          name:
            (await this.settings()).name +
            " · " +
            q.id +
            " · " +
            (r.choice === "deposit" ? "50% deposit" : "Balance payment"),
          price_money: { amount: r.dueCents, currency: "CAD" },
          location_id: connection.locationId,
        },
        checkout_options: {
          allow_tipping: false,
          enable_coupon: false,
          enable_loyalty: false,
          redirect_url:
            this.env.SITE_ORIGIN +
            "/shops/" +
            this.shop +
            "/payment-status.html#order=" +
            q.id,
        },
        pre_populated_data: { buyer_email: q.customer.email },
        payment_note:
          "Nebula order " +
          q.id +
          ". " +
          (r.choice === "deposit" ? "50% deposit." : "Balance payment.") +
          " Balance due at delivery.",
      },
    });
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
  async reconcileOrder(q, r, { suppressRetire = false } = {}) {
    const { accessToken } = await this.token();
    const data = await square(
      this.env,
      "/v2/orders/" + encodeURIComponent(r.squareOrderId),
      { token: accessToken, fetchImpl: this.fetchImpl },
    );
    const order = data.order;
    requireValue(
      order?.id === r.squareOrderId && order.location_id === r.locationId,
      "Square order verification failed.",
      503,
    );
    for (const t of order.tenders || [])
      if (t.payment_id || t.id)
        await this.payment(t.payment_id || t.id, q, { suppressRetire });
    if (order.state === "CANCELED" && r.status !== "paid") {
      r.status = "cancelled";
      if (!q.paidCents && !held(q)) q.status = "cancelled";
      await this.saveOrder(q);
    }
    if (!suppressRetire) await this.retireHeld(q);
  }
  async retireHeld(q) {
    if (!held(q)) return;
    for (const r of q.requests) {
      if (!["creating", "pending"].includes(r.status)) continue;
      // The hold is persisted and the public URL is hidden before any network
      // request. A failed deletion is retryable and never implies cancellation.
      r.retirementPending = true;
      await this.saveOrder(q);
      try {
        // A timed-out create may already have succeeded at Square. Recover its
        // exact persisted idempotency key so that URL can also be retired.
        if (r.status === "creating") await this.createLink(q, r);
        await this.reconcileOrder(q, r, { suppressRetire: true });
        if (r.status === "pending") {
          const { accessToken } = await this.token();
          await square(
            this.env,
            "/v2/online-checkout/payment-links/" +
              encodeURIComponent(r.squareLinkId),
            { method: "DELETE", token: accessToken, fetchImpl: this.fetchImpl },
          );
          // A buyer can complete checkout while deletion is in flight.
          await this.reconcileOrder(q, r, { suppressRetire: true });
          if (r.status === "pending") r.status = "cancelled";
        }
        delete r.retirementPending;
        delete r.url;
        await this.saveOrder(q);
      } catch {
        await this.saveOrder(q);
        await this.schedule();
      }
    }
  }
  async cancel(q, reason = "customer_cancelled") {
    requireValue(
      !["paid", "refunded", "review_required"].includes(q.status),
      "This order needs shop review.",
      409,
    );
    const r = q.requests.at(-1);
    if (r?.status === "creating") await this.createLink(q, r);
    if (r?.status === "pending") {
      await this.reconcileOrder(q, r);
      requireValue(
        !q.paidCents || reason === "disconnected",
        "A payment was received. Keep the original order and its balance.",
        409,
      );
      if (r.status === "pending") {
        const { accessToken } = await this.token();
        await square(
          this.env,
          "/v2/online-checkout/payment-links/" +
            encodeURIComponent(r.squareLinkId),
          { method: "DELETE", token: accessToken, fetchImpl: this.fetchImpl },
        );
        // Re-read after deletion to catch a completion racing the cancellation.
        await this.reconcileOrder(q, r);
        if (r.status === "pending") r.status = "cancelled";
      }
    }
    if (!q.paidCents && !held(q))
      q.status = reason === "expired" ? "expired" : "cancelled";
    await this.saveOrder(q);
    await this.audit("checkout_cancelled", "system", { orderId: q.id, reason });
    return this.publicOrder(q);
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
      p.amount_money?.currency !== "CAD" ||
      p.amount_money.amount !== r.dueCents ||
      (p.tip_money?.amount || 0) !== 0
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
  async refreshCompletedPayments(
    q,
    { force = false, limit = 10, budget } = {},
  ) {
    const payments = Object.values(q.payments)
      .filter((p) => p.status === "COMPLETED")
      .sort(
        (a, b) =>
          Math.max(a.verifiedAt || 0, a.refreshAttemptAt || 0) -
          Math.max(b.verifiedAt || 0, b.refreshAttemptAt || 0),
      );
    let refreshed = 0;
    for (const p of payments) {
      if (refreshed >= limit || budget?.remaining === 0) break;
      const last = Math.max(p.verifiedAt || 0, p.refreshAttemptAt || 0);
      if (!force && last > this.now() - 60000) continue;
      p.refreshAttemptAt = this.now();
      await this.saveOrder(q);
      refreshed++;
      if (budget) budget.remaining--;
      await this.payment(p.id, q);
    }
    return refreshed;
  }
  recount(q) {
    const completed = Object.values(q.payments).filter(
        (p) => p.status === "COMPLETED",
      ),
      gross = completed.reduce((a, p) => a + p.amountCents, 0),
      refunds = completed.reduce(
        (sum, p) =>
          sum +
          Math.max(
            p.reportedRefundCents || 0,
            Object.values(q.refunds)
              .filter((r) => r.status === "COMPLETED" && r.paymentId === p.id)
              .reduce((a, r) => a + r.amountCents, 0),
          ),
        0,
      );
    q.paidCents = Math.max(0, gross - refunds);
    q.refundedCents = refunds;
    const duplicate = completed.some((p, i) =>
      completed.slice(0, i).some((v) => v.request === p.request),
    );
    if (
      refunds ||
      duplicate ||
      gross > q.totalCents ||
      q.status === "review_required"
    )
      q.status =
        refunds === gross && gross > 0 ? "refunded" : "review_required";
    else if (gross) q.status = gross >= q.totalCents ? "paid" : "deposit_paid";
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
      r.amount_money?.currency !== "CAD" ||
      !Commerce.cents(r.amount_money.amount)
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
  async event(event) {
    const c = await this.connection();
    requireValue(
      c?.merchantId === event.merchant_id,
      "The Square merchant does not match this shop.",
      403,
    );
    if (await this.storage.get("event:" + event.event_id))
      return { received: true };
    if (event.type === "oauth.authorization.revoked") {
      let revokedAt = Date.parse(event.data?.object?.revocation?.revoked_at);
      if (!Number.isFinite(revokedAt)) revokedAt = Date.parse(event.created_at);
      if (
        Number.isFinite(c.connectedAt) &&
        Number.isFinite(revokedAt) &&
        revokedAt < c.connectedAt
      ) {
        await this.audit("stale_square_revocation_ignored");
        await this.storage.put("event:" + event.event_id, { at: this.now() });
        return { received: true };
      }
      // Missing/equal timestamps cannot distinguish a new grant from an old
      // revocation, so fail closed instead of keeping unverified credentials.
      const s = await this.settings();
      s.checkoutEnabled = false;
      await this.storage.put("settings", s);
      await this.storage.put("connection", {
        ...c,
        status: "revoked",
        tokens: null,
      });
      await this.audit("square_revoked");
    } else if (["payment.created", "payment.updated"].includes(event.type))
      await this.payment(event.data?.object?.payment?.id || event.data?.id);
    else if (["refund.created", "refund.updated"].includes(event.type))
      await this.refund(event.data?.object?.refund?.id || event.data?.id);
    await this.storage.put("event:" + event.event_id, { at: this.now() });
    return { received: true };
  }
  async status(id, token) {
    const q = await this.customerOrder(id, token);
    if ((await this.connection())?.status === "connected")
      try {
        if (q.requests.at(-1)?.status === "pending")
          await this.reconcileOrder(q, q.requests.at(-1));
        await this.refreshCompletedPayments(q);
        await this.retireHeld(q);
      } catch {
        /* Stored status remains pending until verified; never infer success. */
      }
    return this.publicOrder(q);
  }
  async allOrders() {
    const rows = [];
    let startAfter;
    while (true) {
      const batch = await this.storage.list({
        prefix: "order:",
        limit: 100,
        ...(startAfter ? { startAfter } : {}),
      });
      for (const q of batch.values()) rows.push(q);
      if (batch.size < 100) break;
      startAfter = [...batch.keys()].at(-1);
    }
    return rows;
  }
  async listOrders(actor, cursor) {
    await this.authorize(actor);
    requireValue(
      !cursor || /^index:\d+:[A-Za-z0-9_-]{24}$/.test(cursor),
      "Invalid page cursor.",
    );
    const index = await this.storage.list({
        prefix: "index:",
        limit: 25,
        ...(cursor ? { startAfter: cursor } : {}),
      }),
      orders = [];
    for (const id of index.values()) {
      const q = await this.getOrder(id);
      orders.push({ ...this.publicOrder(q), customer: q.customer });
    }
    return {
      orders,
      cursor: index.size === 25 ? [...index.keys()].at(-1) : null,
    };
  }
  async orderDetail(actor, id) {
    await this.authorize(actor);
    const q = await this.getOrder(id);
    const { accessHash, ...publicData } = q;
    return publicData;
  }
  async rate(visitor, kind) {
    const time = Math.floor(this.now() / 3600000),
      key = "rate:" + time + ":" + kind + ":" + visitor,
      n = (await this.storage.get(key)) || 0,
      limit = kind === "quote" ? 20 : kind === "checkout" ? 60 : 180;
    requireValue(n < limit, "Too many requests. Please try again later.", 429);
    await this.storage.put(key, n + 1);
  }
  async schedule() {
    if (this.storage.setAlarm) await this.storage.setAlarm(this.now() + 60000);
  }
  async maintain() {
    const conn = await this.connection();
    const refreshBudget = { remaining: 25 };
    if (conn?.status === "connected") {
      try {
        await this.token();
      } catch {
        /* Reconnection state is visible in account; try transient failures later. */
      }
      for (const q of await this.allOrders()) {
        try {
          const r = q.requests.at(-1);
          if (r?.status === "pending") await this.reconcileOrder(q, r);
          await this.refreshCompletedPayments(q, { budget: refreshBudget });
          await this.retireHeld(q);
          if (
            q.expiresAt < this.now() &&
            !q.paidCents &&
            !["expired", "cancelled", "review_required", "refunded"].includes(
              q.status,
            )
          )
            await this.cancel(q, "expired");
        } catch {
          /* Preserve retryable records. */
        }
      }
    }
    // Keep temporary security records bounded; order/audit retention is explicit.
    for (const prefix of ["event:", "rate:", "oauth:", "invite:"]) {
      const values = await this.storage.list({ prefix, limit: 500 });
      for (const [key, value] of values) {
        const stale =
          prefix === "rate:"
            ? Number(key.split(":")[1]) < Math.floor(this.now() / 3600000) - 24
            : prefix === "event:"
              ? value.at < this.now() - 30 * 86400000
              : value.expiresAt < this.now();
        if (stale) await this.storage.delete(key);
      }
    }
    const pending = (await this.allOrders()).some(
      (q) =>
        q.requests?.some((r) => ["pending", "creating"].includes(r.status)) ||
        (!q.paidCents &&
          !["expired", "cancelled", "review_required", "refunded"].includes(
            q.status,
          )),
    );
    if (this.storage.setAlarm)
      await this.storage.setAlarm(this.now() + (pending ? 60000 : 3600000));
  }
}
