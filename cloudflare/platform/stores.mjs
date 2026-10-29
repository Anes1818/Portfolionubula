import {
  HttpError,
  requireValue,
  readJson,
} from "../rays-payments/security.mjs";
import {
  createInput,
  initialDraft,
  readiness,
  hydrateShop,
  mediaReferences,
  REQUEST_LIMIT,
  entitled,
  validateDraft,
  validatePublication,
  boundedDesign,
  REQUEST_STATUSES,
  requestUpdate,
  requestPage,
  requestCursor,
  hydrateRequest,
} from "./validation.mjs";
import { canonicalCatalog } from "./catalogue.mjs";
import { publicationReport } from "./publish-readiness.mjs";
import {
  storedSquareService,
  squareSandboxConfigured,
} from "./square-storage.mjs";
import {
  normalizePolicy,
  validateDesign,
} from "../../platform/shared/policy.mjs";
import { handleBillingInternal, reconcileBillingForAlarm } from "./billing.mjs";
import { activationRoutes } from "./manual-activation.mjs";
import {
  checkoutRoutes,
  checkoutService,
  checkoutLocked,
} from "./merchant-checkout.mjs";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const rows = (cursor) => [...cursor];
const first = (cursor) => rows(cursor)[0] ?? null;
const parseShop = (row) => (row ? hydrateShop(JSON.parse(row.data)) : null);
const decorated = (shop) => ({ ...shop, readiness: readiness(shop) });
const canonical = (value) =>
  JSON.stringify(value, function (_, item) {
    return item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item;
  });
const internalError = (error) =>
  json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Shop storage is temporarily unavailable.",
    },
    error instanceof HttpError ? error.status : 500,
  );

function limit(sql, bucket, max, now = Date.now()) {
  const window = Math.floor(now / 60000),
    found = first(
      sql.exec(
        "SELECT window, count FROM rate_limits WHERE bucket = ?",
        bucket,
      ),
    );
  const count = found?.window === window ? found.count : 0;
  requireValue(
    count < max,
    "Too many changes. Please wait a minute and try again.",
    429,
  );
  sql.exec(
    "INSERT INTO rate_limits (bucket, window, count) VALUES (?, ?, ?) ON CONFLICT(bucket) DO UPDATE SET window=excluded.window, count=excluded.count",
    bucket,
    window,
    count + 1,
  );
}

/** A single SQLite object atomically owns both unique UID and unique slug claims. */
export class ShopRegistry {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS registry (owner_uid TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, seed TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, shop_id TEXT, slug TEXT, name TEXT, preset TEXT, status TEXT NOT NULL DEFAULT 'no_shop', subscription_status TEXT NOT NULL DEFAULT 'inactive', published_version INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 0, summary_revision INTEGER NOT NULL DEFAULT 0)",
    );
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS users_status_uid ON users(status,uid)",
    );
    this.sql.exec("CREATE INDEX IF NOT EXISTS users_shop_id ON users(shop_id)");
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS billing_resources (resource_key TEXT PRIMARY KEY, shop_id TEXT NOT NULL, owner_uid TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS manual_payment_claims(reference TEXT PRIMARY KEY, shop_id TEXT NOT NULL, operation_id TEXT NOT NULL, fingerprint TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS square_merchants (environment TEXT NOT NULL, merchant_id TEXT NOT NULL, shop_id TEXT NOT NULL, owner_uid TEXT NOT NULL, PRIMARY KEY(environment,merchant_id), UNIQUE(environment,shop_id))",
    );
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (
        request.method === "POST" &&
        url.pathname === "/manual-payment-claim"
      ) {
        const v = await readJson(request, 4096);
        this.state.storage.transactionSync(() => {
          const owner = first(
            this.sql.exec(
              "SELECT owner_uid FROM registry WHERE id=?",
              v.shopId,
            ),
          );
          requireValue(owner?.owner_uid === v.ownerUid, "Shop not found.", 404);
          requireValue(
            /^[A-Z0-9-]{8,80}$/.test(v.reference || ""),
            "Invalid payment reference.",
          );
          const old = first(
            this.sql.exec(
              "SELECT * FROM manual_payment_claims WHERE reference=?",
              v.reference,
            ),
          );
          requireValue(
            !old ||
              (old.shop_id === v.shopId &&
                old.operation_id === v.operationId &&
                old.fingerprint === v.fingerprint),
            "This PayPal payment has already been assigned to an activation.",
            409,
          );
          this.sql.exec(
            "INSERT OR IGNORE INTO manual_payment_claims(reference,shop_id,operation_id,fingerprint) VALUES(?,?,?,?)",
            v.reference,
            v.shopId,
            v.operationId,
            v.fingerprint,
          );
        });
        return json({ ok: true });
      }
      if (request.method === "GET" && url.pathname === "/square-owner") {
        const row = first(
          this.sql.exec(
            "SELECT registry.seed FROM square_merchants JOIN registry ON registry.id=square_merchants.shop_id WHERE environment=? AND merchant_id=?",
            url.searchParams.get("environment"),
            url.searchParams.get("merchantId"),
          ),
        );
        return json({ entry: row ? JSON.parse(row.seed) : null });
      }
      if (request.method === "POST" && url.pathname === "/square-claim") {
        const value = await readJson(request, 4096);
        requireValue(
          ["sandbox", "production"].includes(value.environment) &&
            /^[A-Za-z0-9_-]{1,191}$/.test(value.merchantId || ""),
          "Invalid Square merchant.",
        );
        this.state.storage.transactionSync(() => {
          const entry = first(
            this.sql.exec(
              "SELECT owner_uid FROM registry WHERE id=?",
              value.shopId,
            ),
          );
          requireValue(
            entry?.owner_uid === value.ownerUid,
            "Shop not found.",
            404,
          );
          const collision = first(
            this.sql.exec(
              "SELECT * FROM square_merchants WHERE environment=? AND (merchant_id=? OR shop_id=?)",
              value.environment,
              value.merchantId,
              value.shopId,
            ),
          );
          requireValue(
            !collision ||
              (collision.shop_id === value.shopId &&
                collision.owner_uid === value.ownerUid &&
                collision.merchant_id === value.merchantId),
            "This Square merchant is already bound to another shop.",
            409,
          );
          this.sql.exec(
            "INSERT OR IGNORE INTO square_merchants(environment,merchant_id,shop_id,owner_uid) VALUES(?,?,?,?)",
            value.environment,
            value.merchantId,
            value.shopId,
            value.ownerUid,
          );
        });
        return json({ ok: true });
      }
      if (url.pathname === "/billing-resource") {
        if (request.method === "GET") {
          const key = url.searchParams.get("value") || "";
          requireValue(
            /^(test|live):(subscription|order):[a-zA-Z0-9_-]{1,100}$/.test(key),
            "Invalid billing resource.",
          );
          const found = first(
            this.sql.exec(
              "SELECT registry.seed FROM billing_resources JOIN registry ON registry.id=billing_resources.shop_id AND registry.owner_uid=billing_resources.owner_uid WHERE billing_resources.resource_key=?",
              key,
            ),
          );
          return json({ entry: found ? JSON.parse(found.seed) : null });
        }
        if (request.method === "POST") {
          const { resourceKey, shopId, ownerUid } = await readJson(
            request,
            4096,
          );
          requireValue(
            /^(test|live):(subscription|order):[a-zA-Z0-9_-]{1,100}$/.test(
              resourceKey || "",
            ),
            "Invalid billing resource.",
          );
          this.state.storage.transactionSync(() => {
            const shop = first(
              this.sql.exec(
                "SELECT owner_uid FROM registry WHERE id=?",
                shopId,
              ),
            );
            requireValue(shop?.owner_uid === ownerUid, "Shop not found.", 404);
            const existing = first(
              this.sql.exec(
                "SELECT shop_id,owner_uid FROM billing_resources WHERE resource_key=?",
                resourceKey,
              ),
            );
            requireValue(
              !existing ||
                (existing.shop_id === shopId &&
                  existing.owner_uid === ownerUid),
              "This billing resource belongs to another account.",
              409,
            );
            this.sql.exec(
              "INSERT INTO billing_resources(resource_key,shop_id,owner_uid) VALUES(?,?,?) ON CONFLICT(resource_key) DO NOTHING",
              resourceKey,
              shopId,
              ownerUid,
            );
          });
          return json({ ok: true });
        }
      }
      if (request.method === "POST" && url.pathname === "/session") {
        const body = await readJson(request, 4096);
        requireValue(
          typeof body.uid === "string" &&
            body.uid.length > 0 &&
            body.uid.length <= 128 &&
            typeof body.email === "string" &&
            body.email.length <= 320,
          "Invalid account.",
        );
        const now = Date.now();
        this.sql.exec(
          "INSERT INTO users(uid,email,created_at,last_seen_at) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET email=excluded.email,last_seen_at=excluded.last_seen_at",
          body.uid,
          body.email,
          now,
          now,
        );
        return json({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/summary") {
        const { summary } = await readJson(request, 8192);
        requireValue(
          summary &&
            typeof summary.uid === "string" &&
            Number.isSafeInteger(summary.revision) &&
            summary.revision >= 0,
          "Invalid shop summary.",
        );
        const entry = first(
          this.sql.exec(
            "SELECT owner_uid FROM registry WHERE id = ?",
            summary.shopId,
          ),
        );
        requireValue(entry?.owner_uid === summary.uid, "Shop not found.", 404);
        // A delayed retry cannot overwrite a more recent indexed snapshot.
        this.sql.exec(
          "UPDATE users SET shop_id=?,slug=?,name=?,preset=?,status=?,subscription_status=?,published_version=?,version=?,summary_revision=? WHERE uid=? AND summary_revision<=?",
          summary.shopId,
          summary.slug,
          summary.name,
          summary.preset,
          summary.status,
          summary.subscriptionStatus,
          summary.publishedVersion,
          summary.version,
          summary.revision,
          summary.uid,
          summary.revision,
        );
        return json({ ok: true });
      }
      if (request.method === "GET" && url.pathname === "/users") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const cursor = url.searchParams.get("cursor") || "";
        const status = url.searchParams.get("status") || "";
        requireValue(
          q.length <= 120 &&
            cursor.length <= 128 &&
            [
              "",
              "all",
              "no_shop",
              "draft",
              "published",
              "active",
              "inactive",
              "activation_requested",
              "suspended",
              "expired",
              "cancelled",
              "past_due",
              "paused",
            ].includes(status),
          "Invalid account filters.",
        );
        const pageSize = Math.max(
          1,
          Math.min(50, Number(url.searchParams.get("limit")) || 25),
        );
        requireValue(Number.isSafeInteger(pageSize), "Invalid page size.");
        // Literal substring search avoids SQLite's small LIKE-pattern byte limit
        // and treats percent/underscore characters as text.
        const found = rows(
          this.sql.exec(
            "SELECT * FROM users WHERE uid > ? AND (?='' OR instr(lower(email),?)>0 OR instr(lower(COALESCE(name,'')),?)>0 OR instr(lower(COALESCE(slug,'')),?)>0) AND (? IN ('','all') OR status=? OR subscription_status=?) ORDER BY uid LIMIT ?",
            cursor,
            q,
            q,
            q,
            q,
            status,
            status,
            status,
            pageSize + 1,
          ),
        );
        const users = found.slice(0, pageSize).map(userRecord);
        return json({
          users,
          nextCursor: found.length > pageSize ? users.at(-1).uid : null,
        });
      }
      if (request.method === "GET" && url.pathname === "/user") {
        return json({
          user: userRecord(
            first(
              this.sql.exec(
                "SELECT * FROM users WHERE uid = ?",
                url.searchParams.get("uid") || "",
              ),
            ),
          ),
        });
      }
      if (request.method === "GET") {
        const field =
          url.pathname === "/owner"
            ? "owner_uid"
            : url.pathname === "/id"
              ? "id"
              : url.pathname === "/slug"
                ? "slug"
                : null;
        requireValue(field, "Not found.", 404);
        const value = url.searchParams.get("value");
        requireValue(
          typeof value === "string" && value.length > 0 && value.length <= 128,
          "Invalid shop lookup.",
        );
        const row = first(
          this.sql.exec(`SELECT seed FROM registry WHERE ${field} = ?`, value),
        );
        return json({ entry: row ? JSON.parse(row.seed) : null });
      }
      if (request.method === "POST" && url.pathname === "/create") {
        const body = await readJson(request, 4096),
          input = createInput(body.input);
        requireValue(
          typeof body.ownerUid === "string" &&
            body.ownerUid.length > 0 &&
            body.ownerUid.length <= 128,
          "Invalid owner.",
        );
        const entry = this.state.storage.transactionSync(() => {
          limit(this.sql, "create:" + body.ownerUid, 10);
          requireValue(
            !first(
              this.sql.exec(
                "SELECT id FROM registry WHERE owner_uid = ?",
                body.ownerUid,
              ),
            ),
            "This account already has a shop.",
            409,
          );
          requireValue(
            !first(
              this.sql.exec(
                "SELECT id FROM registry WHERE slug = ?",
                input.slug,
              ),
            ),
            "This shop address is already taken.",
            409,
          );
          const entry = {
            id: "sh_" + crypto.randomUUID().replaceAll("-", ""),
            ownerUid: body.ownerUid,
            slug: input.slug,
            input,
            createdAt: Date.now(),
          };
          this.sql.exec(
            "INSERT INTO registry (owner_uid, id, slug, seed) VALUES (?, ?, ?, ?)",
            entry.ownerUid,
            entry.id,
            entry.slug,
            JSON.stringify(entry),
          );
          return entry;
        });
        return json({ entry }, 201);
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      return internalError(error);
    }
  }
}

function userRecord(row) {
  return row
    ? {
        uid: row.uid,
        email: row.email,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        shopId: row.shop_id,
        slug: row.slug,
        name: row.name,
        preset: row.preset,
        status: row.status,
        subscriptionStatus: row.subscription_status,
        publishedVersion: row.published_version,
        version: row.version,
      }
    : null;
}

function checkMediaReferences(sql, draft) {
  for (const id of mediaReferences(draft)) {
    const row = first(sql.exec("SELECT byte_length FROM media WHERE id=?", id));
    requireValue(
      row,
      "An attached image is missing. Upload it again before saving.",
    );
    const cover = [...draft.collection, ...draft.products].some(
      (item) => item.cover === id,
    );
    const cap = id === draft.logoMediaId ? 80 : cover ? 150 : 250;
    requireValue(
      row.byte_length <= cap * 1024,
      `An attached image exceeds its ${cap} KiB image limit.`,
    );
  }
}

/** Each shop's draft, bounded image slots, and mutation counters use its own SQLite DO. */
export class ShopStore {
  constructor(state, env = {}) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS checkout_state(key TEXT PRIMARY KEY,data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS activation_history(id TEXT PRIMARY KEY,at INTEGER NOT NULL,data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS square_state (key TEXT PRIMARY KEY, data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS shop (singleton INTEGER PRIMARY KEY CHECK(singleton=1), data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, kind TEXT NOT NULL, mime TEXT NOT NULL, body BLOB NOT NULL, byte_length INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS customer_requests (id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL, created_at INTEGER NOT NULL, data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS requests_created_id ON customer_requests(created_at,id)",
    );
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS requests_status_created_id ON customer_requests(json_extract(data,'$.status'),created_at DESC,id DESC)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS request_status_counts(status TEXT PRIMARY KEY,count INTEGER NOT NULL CHECK(count>=0))",
    );
    if (
      !first(this.sql.exec("SELECT status FROM request_status_counts LIMIT 1"))
    ) {
      this.state.storage.transactionSync(() => {
        for (const status of REQUEST_STATUSES)
          this.sql.exec(
            "INSERT OR IGNORE INTO request_status_counts(status,count) VALUES(?,0)",
            status,
          );
        for (const row of rows(
          this.sql.exec(
            "SELECT json_extract(data,'$.status') status,COUNT(*) count FROM customer_requests GROUP BY json_extract(data,'$.status')",
          ),
        ))
          if (REQUEST_STATUSES.includes(row.status))
            this.sql.exec(
              "UPDATE request_status_counts SET count=? WHERE status=?",
              row.count,
              row.status,
            );
      });
    }
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS request_media (media_id TEXT PRIMARY KEY)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)",
    );
  }

  shop() {
    return parseShop(
      first(this.sql.exec("SELECT data FROM shop WHERE singleton=1")),
    );
  }

  owner(request, shop) {
    requireValue(shop, "Shop not found.", 404);
    requireValue(
      request.headers.get("X-Owner-Uid") === shop.ownerUid,
      "Shop not found.",
      404,
    );
  }

  async alarm() {
    const shop = this.shop();
    if (shop)
      await reconcileBillingForAlarm({
        shop,
        state: this.state,
        env: this.env,
        sql: this.sql,
      });
    if (shop) {
      try {
        await checkoutLocked(this, (s) => s.maintain());
      } catch {
        await this.state.storage.setAlarm(Date.now() + 3600000);
      }
    }
    if (shop && squareSandboxConfigured(this.env, { requireEnabled: false })) {
      try {
        const result = await storedSquareService(this).refreshConnection();
        if (result.status === "connected")
          await this.state.storage.setAlarm(
            Math.min(
              (await this.state.storage.getAlarm()) || Infinity,
              Date.now() + 6 * 86400000,
            ),
          );
      } catch {
        await this.state.storage.setAlarm(
          Math.min(
            (await this.state.storage.getAlarm()) || Infinity,
            Date.now() + 3600000,
          ),
        );
      }
    }
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/ensure") {
        const { entry } = await readJson(request, 4096);
        requireValue(
          entry?.ownerUid && entry?.id && entry?.slug,
          "Invalid shop record.",
        );
        const shop = this.state.storage.transactionSync(() => {
          let current = this.shop();
          if (!current) {
            current = {
              id: entry.id,
              ownerUid: entry.ownerUid,
              slug: entry.slug,
              version: 1,
              draft: initialDraft(entry.input),
              subscription: { status: "inactive" },
              square: { status: "not_connected" },
              published: null,
            };
            this.sql.exec(
              "INSERT INTO shop (singleton, data) VALUES (1, ?)",
              JSON.stringify(current),
            );
          }
          requireValue(
            current.ownerUid === entry.ownerUid &&
              current.id === entry.id &&
              current.slug === entry.slug,
            "Shop record mismatch.",
            409,
          );
          return current;
        });
        return json({ shop: decorated(shop) });
      }
      const shop = this.shop();
      requireValue(shop, "Shop not found.", 404);
      if (request.method === "GET" && url.pathname === "/snapshot") {
        const key = `square:${this.env.SQUARE_ENVIRONMENT || "sandbox"}:${shop.id}:connection`;
        const row = first(
          this.sql.exec("SELECT data FROM square_state WHERE key=?", key),
        );
        const conn = row ? JSON.parse(row.data) : null;
        return json({
          shop: {
            ...decorated(shop),
            checkoutConnectionAvailable:
              conn?.status === "connected" && !!conn.locationId,
          },
        });
      }
      if (
        url.pathname.startsWith("/activation") ||
        url.pathname === "/billing/activation-request"
      ) {
        const result = await activationRoutes(this, request);
        if (result) return result;
      }
      if (
        url.pathname === "/commerce" ||
        url.pathname.startsWith("/checkout/")
      ) {
        this.owner(request, shop);
        const result = await checkoutRoutes(this, request);
        if (result) return result;
      }
      if (url.pathname.startsWith("/billing/")) {
        const result = await handleBillingInternal(request, {
          shop,
          state: this.state,
          env: this.env,
          sql: this.sql,
        });
        if (result) return result;
      }
      this.owner(request, shop);
      if (url.pathname.startsWith("/square/")) {
        const service = storedSquareService(this),
          path = url.pathname;
        if (path === "/square/status" && request.method === "GET")
          return json(await service.status({ uid: shop.ownerUid }));
        requireValue(request.method === "POST", "Not found.", 404);
        const body = await readJson(request, 4096),
          actor = body.actor;
        requireValue(actor?.uid === shop.ownerUid, "Shop not found.", 404);
        // Invalid public callbacks must not consume the owner's change budget.
        if (path !== "/square/callback") limit(this.sql, "square-changes", 5);
        if (path === "/square/connect") {
          const { authorizationUrl, setCookie, expiresAt } =
            await service.start(actor);
          const response = json({ authorizationUrl, expiresAt });
          response.headers.set("Set-Cookie", setCookie);
          return response;
        }
        if (path === "/square/callback") {
          const result = await service.callback(body.callback);
          if (result.connected)
            await this.state.storage.setAlarm(
              Math.min(
                (await this.state.storage.getAlarm()) || Infinity,
                Date.now() + 6 * 86400000,
              ),
            );
          const { clearCookie, ...status } = result,
            response = json(status);
          response.headers.set("Set-Cookie", clearCookie);
          return response;
        }
        if (path === "/square/verify")
          return json(await service.status(actor, { verify: true }));
        if (["/square/location", "/square/disconnect"].includes(path)) {
          const existing = [
            ...this.sql.exec(
              "SELECT data FROM checkout_state WHERE key LIKE 'order:%'",
            ),
          ].map((r) => JSON.parse(r.data));
          requireValue(
            !existing.some((q) =>
              q.requests?.some((r) =>
                ["pending", "creating"].includes(r.status),
              ),
            ),
            "Cancel all pending checkout links before changing or disconnecting Square.",
            409,
          );
          if (path === "/square/location")
            requireValue(
              !existing.some((q) => q.requests?.length),
              "This location has order history. Contact Nebula before changing it.",
              409,
            );
        }
        if (path === "/square/location")
          return json(await service.chooseLocation(actor, body.locationId));
        if (path === "/square/disconnect")
          return json(await service.disconnect(actor));
        throw new HttpError(404, "Not found.");
      }
      if (url.pathname === "/readiness" && request.method === "GET")
        return json(
          publicationReport(
            this.shop(),
            await canonicalCatalog(this.env),
            this.env,
          ),
        );
      if (url.pathname === "/requests" && request.method === "POST") {
        const {
          requestKey,
          fingerprint,
          ipBucket,
          kind,
          productId,
          cardId,
          publishedVersion,
          customer,
          fulfillment,
          design: rawDesign,
          accessHash,
        } = await readJson(request, 32 * 1024);
        let design = rawDesign,
          pricing = null;
        requireValue(
          typeof requestKey === "string" &&
            /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(requestKey),
          "A valid request key is required.",
        );
        requireValue(
          typeof fingerprint === "string" &&
            /^[a-f0-9]{64}$/.test(fingerprint) &&
            typeof ipBucket === "string" &&
            /^[a-f0-9]{3}$/.test(ipBucket),
          "Invalid customer request.",
        );
        const existing = first(
          this.sql.exec(
            "SELECT fingerprint,data FROM customer_requests WHERE request_key=?",
            requestKey,
          ),
        );
        if (existing) {
          requireValue(
            existing.fingerprint === fingerprint,
            "This request key was already used for different details.",
            409,
          );
          return json({ request: JSON.parse(existing.data) }, 201);
        }
        requireValue(
          shop.published?.version === publishedVersion,
          "The shop changed. Reload the current prices before requesting.",
          409,
        );
        if (kind === "design") {
          const checked = validateDesign(
            design,
            shop.published?.draft,
            await canonicalCatalog(this.env),
          );
          requireValue(
            checked.ok,
            checked.issues[0]?.message || "This bouquet cannot be requested.",
          );
          design = boundedDesign(checked.design);
          pricing = checked.pricing;
        }
        const record = this.state.storage.transactionSync(() => {
          const duplicate = first(
            this.sql.exec(
              "SELECT fingerprint,data FROM customer_requests WHERE request_key=?",
              requestKey,
            ),
          );
          if (duplicate) {
            requireValue(
              duplicate.fingerprint === fingerprint,
              "This request key was already used for different details.",
              409,
            );
            return JSON.parse(duplicate.data);
          }
          const current = this.shop();
          requireValue(
            current.published && entitled(current),
            "Shop not found.",
            404,
          );
          let product, totalCents, summary;
          requireValue(
            current.published.version === publishedVersion,
            "The shop changed. Reload the current prices before requesting.",
            409,
          );
          requireValue(
            ["product", "design"].includes(kind),
            "Invalid customer request.",
          );
          if (kind === "product") {
            product = current.published.draft.products.find(
              (item) =>
                item.id === productId &&
                item.available &&
                Number.isSafeInteger(item.priceCents),
            );
            requireValue(product, "This product is unavailable.", 409);
            totalCents = product.priceCents;
            summary = product.title;
          } else {
            requireValue(
              design &&
                Number.isSafeInteger(pricing?.totalCents) &&
                pricing.totalCents >= 0,
              "Invalid bouquet pricing.",
            );
            const card = cardId
              ? current.published.draft.collection.find(
                  (item) => item.id === cardId && item.available,
                )
              : null;
            requireValue(!cardId || card, "This bouquet is unavailable.", 409);
            totalCents = pricing.totalCents;
            summary = card?.title || "Custom bouquet";
          }
          limit(this.sql, "request:" + ipBucket, 10);
          const entry = {
            id: "rq_" + crypto.randomUUID().replaceAll("-", ""),
            status: "requested",
            version: 1,
            merchantNote: "",
            paymentStatus: "unpaid",
            ...(accessHash ? { accessHash } : {}),
            kind,
            totalCents,
            currency: current.published.draft.currency,
            summary,
            ...(product
              ? { product: structuredClone(product) }
              : {
                  design: structuredClone(design),
                  pricing: structuredClone(pricing),
                  cardId: cardId || null,
                }),
            customer,
            fulfillment,
            publishedVersion: current.published.version,
            createdAt: Date.now(),
          };
          entry.updatedAt = entry.createdAt;
          this.sql.exec(
            "INSERT INTO customer_requests(id,request_key,fingerprint,created_at,data) VALUES(?,?,?,?,?)",
            entry.id,
            requestKey,
            fingerprint,
            entry.createdAt,
            JSON.stringify(entry),
          );
          this.sql.exec(
            "UPDATE request_status_counts SET count=count+1 WHERE status='requested'",
          );
          if (product?.cover)
            this.sql.exec(
              "INSERT OR IGNORE INTO request_media(media_id) VALUES(?)",
              product.cover,
            );
          return entry;
        });
        return json({ request: record }, 201);
      }
      if (url.pathname === "/requests" && request.method === "GET") {
        const {
          status,
          cursor,
          limit: pageSize,
        } = requestPage(url.searchParams);
        const clauses = [],
          parameters = [];
        if (status !== "all") {
          clauses.push("json_extract(data,'$.status')=?");
          parameters.push(status);
        }
        if (cursor) {
          clauses.push("(created_at,id)<(?,?)");
          parameters.push(cursor.at, cursor.id);
        }
        const page = rows(
          this.sql.exec(
            "SELECT id,created_at,data FROM customer_requests" +
              (clauses.length ? " WHERE " + clauses.join(" AND ") : "") +
              " ORDER BY created_at DESC,id DESC LIMIT ?",
            ...parameters,
            pageSize + 1,
          ),
        );
        const requests = page
          .slice(0, pageSize)
          .map((row) => hydrateRequest(JSON.parse(row.data)));
        const counts = {
          all: 0,
          ...Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])),
        };
        for (const row of rows(
          this.sql.exec("SELECT status,count FROM request_status_counts"),
        )) {
          counts.all += row.count;
          if (REQUEST_STATUSES.includes(row.status))
            counts[row.status] = row.count;
        }
        return json({
          requests,
          nextCursor:
            page.length > pageSize
              ? requestCursor(requests.at(-1), status)
              : null,
          counts,
        });
      }
      const requestMatch = url.pathname.match(
        /^\/requests\/(rq_[a-f0-9]{32})$/,
      );
      if (requestMatch && request.method === "GET") {
        const row = first(
          this.sql.exec(
            "SELECT data FROM customer_requests WHERE id=?",
            requestMatch[1],
          ),
        );
        requireValue(row, "Request not found.", 404);
        return json({ request: hydrateRequest(JSON.parse(row.data)) });
      }
      if (requestMatch && request.method === "PATCH") {
        const update = requestUpdate(await readJson(request, 8192));
        if (update.status === "cancelled")
          await checkoutLocked(this, async (service) => {
            const beforeRow = first(
              this.sql.exec(
                "SELECT data FROM customer_requests WHERE id=?",
                requestMatch[1],
              ),
            );
            requireValue(beforeRow, "Request not found.", 404);
            const before = hydrateRequest(JSON.parse(beforeRow.data));
            requireValue(
              before.version === update.version,
              "This request changed. Reload before cancelling.",
              409,
            );
            const id = await service.storage.get(
              "requestQuote:" + requestMatch[1],
            );
            if (id) {
              const q = await service.getOrder(id);
              requireValue(
                !q.paidCents || q.status === "refunded",
                "A payment exists. Review/refund it in Square before cancelling fulfillment.",
                409,
              );
              if (
                ![
                  "cancelled",
                  "expired",
                  "refunded",
                  "review_required",
                ].includes(q.status)
              )
                await service.cancel(q, "merchant_cancelled");
            }
            const after = hydrateRequest(
              JSON.parse(
                first(
                  this.sql.exec(
                    "SELECT data FROM customer_requests WHERE id=?",
                    requestMatch[1],
                  ),
                ).data,
              ),
            );
            requireValue(
              before.status === after.status &&
                before.merchantNote === after.merchantNote,
              "This request changed while checkout was cancelled. Reload its current details.",
              409,
            );
            update.version = after.version;
          });
        const record = this.state.storage.transactionSync(() => {
          const row = first(
            this.sql.exec(
              "SELECT data FROM customer_requests WHERE id=?",
              requestMatch[1],
            ),
          );
          requireValue(row, "Request not found.", 404);
          const current = {
            ...JSON.parse(row.data),
            ...hydrateRequest(JSON.parse(row.data)),
          };
          requireValue(
            update.version === current.version,
            "This request changed in another tab. Reload its latest details before saving.",
            409,
          );
          const nextStatus = update.status ?? current.status;
          const allowed = {
            requested: ["accepted", "cancelled"],
            accepted: ["fulfilled", "cancelled"],
            fulfilled: [],
            cancelled: [],
          };
          requireValue(
            nextStatus === current.status ||
              allowed[current.status]?.includes(nextStatus),
            "This request status change is not allowed.",
            409,
          );
          limit(this.sql, "request_updates", 60);
          const next = {
            ...current,
            status: nextStatus,
            merchantNote: update.merchantNote ?? current.merchantNote,
            version: current.version + 1,
            updatedAt: Date.now(),
          };
          this.sql.exec(
            "UPDATE customer_requests SET data=? WHERE id=?",
            JSON.stringify(next),
            next.id,
          );
          if (nextStatus !== current.status) {
            this.sql.exec(
              "UPDATE request_status_counts SET count=count-1 WHERE status=?",
              current.status,
            );
            this.sql.exec(
              "UPDATE request_status_counts SET count=count+1 WHERE status=?",
              nextStatus,
            );
          }
          return next;
        });
        return json({ request: hydrateRequest(record) });
      }
      if (request.method === "PUT" && url.pathname === "/draft") {
        const { version, draft: rawDraft } = await readJson(
          request,
          REQUEST_LIMIT,
        );
        const draft = validateDraft(rawDraft, await canonicalCatalog(this.env));
        const updated = this.state.storage.transactionSync(() => {
          const current = this.shop();
          requireValue(
            Number.isSafeInteger(version) && current.version === version,
            "Your shop changed in another tab. Reload the current version before saving.",
            409,
          );
          limit(this.sql, "draft", 60);
          requireValue(
            !current.published || draft.preset === current.draft.preset,
            "The preset cannot be changed after publication.",
            409,
          );
          const refs = mediaReferences(draft);
          requireValue(
            refs.length <= 18,
            "A shop can reference up to eighteen active photos.",
          );
          checkMediaReferences(this.sql, draft);
          const next = {
            ...current,
            draft,
            version: current.version + 1,
            summaryRevision: (current.summaryRevision || current.version) + 1,
          };
          this.sql.exec(
            "UPDATE shop SET data = ? WHERE singleton=1",
            JSON.stringify(next),
          );
          return next;
        });
        return json({ shop: decorated(updated) });
      }
      if (request.method === "POST" && url.pathname === "/publish") {
        const { version } = await readJson(request, REQUEST_LIMIT * 2);
        const catalog = await canonicalCatalog(this.env);
        const draft = validatePublication(shop.draft, catalog);
        const policy = normalizePolicy(draft, catalog).policy;
        const publishedDraft = {
          ...draft,
          flowerPrices: policy.flowerPrices,
          extrasCents: policy.extrasCents,
          collection: draft.collection.map((item) => ({
            ...item,
            design:
              item.design ||
              validateDesign(
                catalog.recipes.find((row) => row.id === item.recipeId)?.design,
                {
                  ...draft,
                  disabledFlowers: [],
                  disabledExtras: [],
                  enabledModes:
                    draft.preset === "satin"
                      ? ["dome", "heart"]
                      : ["classic", "dome", "heart"],
                },
                catalog,
                { allowUnpriced: true },
              ).design,
          })),
        };
        const catalogVersion = catalog.version || 1;
        const updated = this.state.storage.transactionSync(() => {
          const current = this.shop();
          requireValue(
            entitled(current),
            "Publishing is unavailable until a verified active subscription is available.",
            409,
          );
          requireValue(
            current.subscription.testEnvironment ===
              (this.env.BILLING_TEST_MODE === "true" ||
                this.env.LEMON_TEST_MODE === "true"),
            "Publishing is unavailable for this billing environment.",
            409,
          );
          requireValue(
            current.version === version,
            "Your shop changed in another tab. Reload before publishing.",
            409,
          );
          requireValue(
            canonical(current.draft) === canonical(draft),
            "The draft changed before publishing. Reload and try again.",
            409,
          );
          limit(this.sql, "publish", 10);
          checkMediaReferences(this.sql, publishedDraft);
          const next = {
            ...current,
            previousPublished: current.published || null,
            published: {
              version: (current.published?.version || 0) + 1,
              sourceVersion: current.version,
              catalogVersion,
              publishedAt: Date.now(),
              draft: structuredClone(publishedDraft),
            },
            summaryRevision: (current.summaryRevision || current.version) + 1,
          };
          this.sql.exec(
            "UPDATE shop SET data=? WHERE singleton=1",
            JSON.stringify(next),
          );
          return next;
        });
        return json({ shop: decorated(updated) });
      }
      if (url.pathname.startsWith("/media/")) {
        const id = url.pathname.slice("/media/".length);
        requireValue(
          /^slot-[1-5]$/.test(id) || /^img_[a-f0-9]{64}$/.test(id),
          "Invalid media ID.",
        );
        if (request.method === "PUT") {
          requireValue(
            /^img_[a-f0-9]{64}$/.test(id),
            "Legacy media is read-only. Upload a new immutable image.",
            409,
          );
          const kind = request.headers.get("X-Media-Kind"),
            mime = request.headers.get("Content-Type");
          requireValue(
            ["logo", "cover", "hero"].includes(kind),
            "Invalid image kind.",
          );
          requireValue(
            ["image/png", "image/jpeg", "image/webp"].includes(mime),
            "Invalid image type.",
          );
          const body = await request.arrayBuffer();
          requireValue(
            body.byteLength > 0 &&
              body.byteLength <=
                (kind === "logo" ? 80 : kind === "hero" ? 250 : 150) * 1024,
            "Image is too large.",
            413,
          );
          const digest = [
            ...new Uint8Array(await crypto.subtle.digest("SHA-256", body)),
          ]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("");
          requireValue(
            id === "img_" + digest,
            "Image content does not match its immutable ID.",
          );
          this.state.storage.transactionSync(() => {
            limit(this.sql, "media", 10);
            const existing = first(
              this.sql.exec("SELECT id FROM media WHERE id=?", id),
            );
            if (existing) return;
            // Keep a grace window for uploads which the owner has not saved yet.
            const current = this.shop();
            const keep = new Set([
              ...mediaReferences(current.draft),
              ...mediaReferences(current.published?.draft),
              ...mediaReferences(current.previousPublished?.draft),
            ]);
            // Historical request photos are part of the saved product snapshot.
            // They count toward the same bounded shop storage, never an
            // unmetered archive which silently evicts order evidence.
            for (const row of rows(
              this.sql.exec("SELECT media_id FROM request_media"),
            ))
              keep.add(row.media_id);
            for (const row of rows(
              this.sql.exec("SELECT id,updated_at FROM media"),
            ))
              if (!keep.has(row.id) && row.updated_at < Date.now() - 86400000)
                this.sql.exec("DELETE FROM media WHERE id=?", row.id);
            const total = first(
              this.sql.exec(
                "SELECT COALESCE(SUM(byte_length),0) total FROM media",
              ),
            ).total;
            requireValue(
              total + body.byteLength <= 12 * 1024 * 1024,
              "Shop image storage is full. Remove unused photos and try again later.",
              413,
            );
            this.sql.exec(
              "INSERT INTO media (id, kind, mime, body, byte_length, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
              id,
              kind,
              mime,
              body,
              body.byteLength,
              Date.now(),
            );
          });
          return json({ id }, 201);
        }
        if (request.method === "GET") {
          const media = first(
            this.sql.exec("SELECT mime, body FROM media WHERE id = ?", id),
          );
          requireValue(media, "Image not found.", 404);
          return new Response(media.body, {
            headers: {
              "Content-Type": media.mime,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
              "Content-Disposition": "inline",
            },
          });
        }
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      return internalError(error);
    }
  }
}
