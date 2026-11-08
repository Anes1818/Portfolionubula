import { requireValue, readJson, hash } from "../rays-payments/security.mjs";
import { object } from "./validation.mjs";
import { merchantOrderPath, orderReference } from "./order-preview.mjs";

const one = (result) => [...result][0];
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const email = (v) =>
  typeof v === "string" &&
  v.length <= 254 &&
  /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v);
export function initNotifications(store) {
  store.sql.exec(
    "CREATE TABLE IF NOT EXISTS merchant_notifications (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, unread INTEGER NOT NULL DEFAULT 1, due_at INTEGER, email_status TEXT NOT NULL, data TEXT NOT NULL)",
  );
  store.sql.exec(
    "CREATE INDEX IF NOT EXISTS notifications_due ON merchant_notifications(due_at) WHERE due_at IS NOT NULL",
  );
  store.sql.exec(
    "CREATE TABLE IF NOT EXISTS notification_settings (singleton INTEGER PRIMARY KEY CHECK(singleton=1), data TEXT NOT NULL)",
  );
}
const settings = (store) => {
  const row = one(
    store.sql.exec("SELECT data FROM notification_settings WHERE singleton=1"),
  );
  return row ? JSON.parse(row.data) : { enabled: false, email: null };
};
export const emailConfigured = (env) =>
  env.MERCHANT_EMAIL_ENABLED === "true" &&
  !!env.RESEND_API_KEY &&
  email(env.RESEND_FROM) &&
  (env.ENVIRONMENT !== "test" || email(env.NOTIFICATIONS_TEST_RECIPIENT));

// Called in the SAME SQLite transaction as the verified ledger write. Browser returns
// and link creation never call this. A completed provider payment creates one event.
export function recordPaymentNotifications(store, q, previous) {
  const prefs = settings(store),
    now = Date.now();
  for (const p of Object.values(q.payments || {})) {
    if (
      p.status !== "COMPLETED" ||
      previous?.payments?.[p.id]?.status === "COMPLETED"
    )
      continue;
    const id = q.id + ":" + p.id;
    const data = {
      id,
      orderId: q.id,
      requestId: q.sourceRequestId,
      reference: orderReference(q),
      amountCents: p.amountCents,
      paidCents: q.paidCents,
      balanceCents: Math.max(0, q.totalCents - q.paidCents),
      currency: q.currency,
      title: q.snapshot?.summary || "Flower order",
      status: q.status,
      merchantPath: merchantOrderPath(q),
      createdAt: now,
      attempts: 0,
      recipient: prefs.enabled ? prefs.email : null,
    };
    const queued = prefs.enabled && email(prefs.email);
    store.sql.exec(
      "INSERT OR IGNORE INTO merchant_notifications(id,created_at,unread,due_at,email_status,data) VALUES(?,?,1,?,?,?)",
      id,
      now,
      queued ? now : null,
      queued ? "pending" : "off",
      JSON.stringify(data),
    );
  }
}
export async function scheduleNotifications(store) {
  const row = one(
    store.sql.exec(
      "SELECT MIN(due_at) due FROM merchant_notifications WHERE due_at IS NOT NULL",
    ),
  );
  if (row?.due != null && emailConfigured(store.env))
    await store.state.storage.setAlarm(
      Math.min(
        (await store.state.storage.getAlarm()) || Infinity,
        Math.max(Date.now() + 1000, row.due),
      ),
    );
}
export async function deliverNotifications(
  store,
  { fetchImpl = fetch, now = Date.now() } = {},
) {
  if (!emailConfigured(store.env)) return;
  const rows = [
    ...store.sql.exec(
      "SELECT * FROM merchant_notifications WHERE due_at<=? ORDER BY due_at LIMIT 5",
      now,
    ),
  ];
  for (const row of rows) {
    const event = JSON.parse(row.data),
      prefs = settings(store);
    let status = "failed",
      due = null;
    // Stop ambiguous retries before Resend's 24-hour idempotency retention ends.
    if (now - row.created_at >= 23 * 3600000) status = "expired";
    else if (!prefs.enabled || prefs.email !== event.recipient) status = "off";
    else {
      event.attempts++;
      try {
        if (event.kind === "connection_test") {
          const origin = store.env.CANONICAL_ORIGIN || store.env.PUBLIC_ORIGIN;
          event.payload ||= {
            from: store.env.RESEND_FROM,
            to: [store.env.NOTIFICATIONS_TEST_RECIPIENT],
            ...(email(store.env.RESEND_REPLY_TO)
              ? { reply_to: store.env.RESEND_REPLY_TO }
              : {}),
            subject: "[TEST] Nebula email notifications are connected",
            text: `This is your requested Nebula Sandbox email test. No order was created and no payment was taken.
New verified Square payment notifications will include the saved bouquet and order link.
Open your florist workspace: ${origin}/dashboard/orders`,
            html: `<h2>Your Nebula email test</h2><p>Your sending domain and notification service are connected.</p><p>This is a Sandbox test. No order was created and no payment was taken.</p><p>New verified Square payment notifications will include the saved bouquet and order link.</p><p><a href="${esc(origin)}/dashboard/orders">Open your florist workspace</a></p>`,
          };
        } else {
          const saved = one(
            store.sql.exec(
              "SELECT data FROM checkout_state WHERE key=?",
              "order:" + event.orderId,
            ),
          );
          requireValue(saved, "Saved order unavailable.");
          const q = JSON.parse(saved.data),
            origin = store.env.CANONICAL_ORIGIN || store.env.PUBLIC_ORIGIN;
          const money = (n) =>
            new Intl.NumberFormat("en", {
              style: "currency",
              currency: event.currency,
            }).format(n / 100);
          const test = store.env.ENVIRONMENT === "test";
          // Use an inline CID, never a publicly accessible customer-order image URL.
          const image = q.snapshot?.preview?.match(
            /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/,
          );
          const label =
            event.status === "review_required"
              ? "Payment needs review"
              : event.balanceCents
                ? "Deposit received"
                : "Payment received";
          // Freeze payload on FIRST attempt, including destination and sender: retries
          // with the same idempotency key must contain exactly the same request body.
          event.payload ||= {
            from: store.env.RESEND_FROM,
            ...(email(store.env.RESEND_REPLY_TO)
              ? { reply_to: store.env.RESEND_REPLY_TO }
              : {}),
            to: [
              test ? store.env.NOTIFICATIONS_TEST_RECIPIENT : event.recipient,
            ],
            subject: `${test ? "[TEST] " : ""}${label} · ${event.reference}`,
            text: `${label}: ${event.reference}\n${event.title}\nReceived ${money(event.amountCents)} · Balance ${money(event.balanceCents)}\n${q.customer.method} · ${q.customer.date || "Date to arrange"}\nView saved bouquet and customer details: ${origin}${event.merchantPath}\nSign in with your florist account.`,
            html: `<h2>${esc(label)} · ${esc(event.reference)}</h2><p>${esc(event.title)}</p>${image ? '<img src="cid:bouquet" width="320" alt="Customer’s saved bouquet preview">' : ""}<p>Received <strong>${esc(money(event.amountCents))}</strong> · Balance ${esc(money(event.balanceCents))}</p><p>${esc(q.customer.method)} · ${esc(q.customer.date || "Date to arrange")}</p><p><a href="${esc(origin + event.merchantPath)}">View bouquet &amp; order</a></p><p>Sign in with your florist account to view customer details.</p>`,
            ...(image
              ? {
                  attachments: [
                    {
                      filename: "bouquet." + image[1].split("/")[1],
                      content: image[2],
                      content_id: "bouquet",
                    },
                  ],
                }
              : {}),
          };
        }
        // Persist before HTTP, so response loss/restarts retain the exact payload.
        store.sql.exec(
          "UPDATE merchant_notifications SET data=? WHERE id=?",
          JSON.stringify(event),
          row.id,
        );
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: "Bearer " + store.env.RESEND_API_KEY,
            "Content-Type": "application/json",
            "Idempotency-Key":
              "nebula-" + (await hash(store.shop().id + ":" + row.id)),
          },
          body: JSON.stringify(event.payload),
        });
        if (response.ok) {
          const body = await response.json();
          requireValue(
            typeof body.id === "string" && body.id.length < 200,
            "Email acknowledgement unavailable.",
          );
          event.providerId = body.id;
          status = "accepted"; // Accepted by provider, NOT a claim of inbox delivery.
        } else {
          // Don't store the provider body (may contain emails or secrets).
          event.lastError =
            response.status === 429 ? "rate_limited" : "provider_rejected";
          if (response.status >= 500 || response.status === 429)
            throw Error("retry");
        }
      } catch {
        status = "retry";
        due = now + Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 6));
      }
    }
    store.sql.exec(
      "UPDATE merchant_notifications SET email_status=?,due_at=?,data=? WHERE id=?",
      status,
      due,
      JSON.stringify(event),
      row.id,
    );
  }
  await scheduleNotifications(store);
}

export async function notificationRoutes(store, request) {
  store.owner(request, store.shop());
  if (request.method === "GET") {
    const rows = [
      ...store.sql.exec(
        "SELECT * FROM merchant_notifications ORDER BY created_at DESC,id DESC LIMIT 30",
      ),
    ];
    return Response.json({
      settings: settings(store),
      configured: emailConfigured(store.env),
      testMode: store.env.ENVIRONMENT === "test",
      testAvailable:
        store.env.ENVIRONMENT === "test" &&
        store.env.SANDBOX_TEST_ACCESS === "true",
      unread: one(
        store.sql.exec(
          "SELECT COUNT(*) count FROM merchant_notifications WHERE unread=1",
        ),
      ).count,
      notifications: rows.map((row) => {
        const { recipient, payload, ...safe } = JSON.parse(row.data);
        return { ...safe, unread: !!row.unread, emailStatus: row.email_status };
      }),
    });
  }
  const body = await readJson(request, 4096);
  if (request.method === "POST") {
    object(body, "Test email", ["action"]);
    requireValue(body.action === "test", "Choose a valid notification action.");
    requireValue(
      store.env.ENVIRONMENT === "test" &&
        store.env.SANDBOX_TEST_ACCESS === "true",
      "Email testing is only available in Sandbox.",
      404,
    );
    requireValue(
      emailConfigured(store.env),
      "Complete the Sandbox Resend sender and test inbox setup first.",
      409,
    );
    const prefs = settings(store);
    requireValue(
      prefs.enabled && email(prefs.email),
      "Enable notifications for your verified sign-in email first.",
      409,
    );
    const now = Date.now(),
      id = "test:" + Math.floor(now / 60000);
    const event = {
      id,
      kind: "connection_test",
      reference: "TEST",
      title: "Email connection test",
      status: "test_email",
      createdAt: now,
      attempts: 0,
      recipient: prefs.email,
    };
    // At most one test per shop per minute; repeat clicks reuse the same outbox row.
    store.sql.exec(
      "INSERT OR IGNORE INTO merchant_notifications(id,created_at,unread,due_at,email_status,data) VALUES(?,?,1,?,'pending',?)",
      id,
      now,
      now,
      JSON.stringify(event),
    );
    await scheduleNotifications(store);
    return Response.json({ queued: true, id });
  }
  if (request.method === "PUT") {
    object(body, "Notification settings", ["enabled", "actorEmail"]);
    requireValue(
      typeof body.enabled === "boolean" && email(body.actorEmail),
      "A verified sign-in email is required.",
    );
    const prefs = {
      enabled: body.enabled,
      email: body.actorEmail,
      updatedAt: Date.now(),
    };
    store.sql.exec(
      "INSERT INTO notification_settings(singleton,data) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET data=excluded.data",
      JSON.stringify(prefs),
    );
    await scheduleNotifications(store);
    return Response.json({ settings: prefs });
  }
  requireValue(request.method === "PATCH", "Not found.", 404);
  object(body, "Read notification", ["id"]);
  requireValue(
    typeof body.id === "string" && body.id.length <= 240,
    "Invalid notification.",
  );
  store.sql.exec(
    "UPDATE merchant_notifications SET unread=0 WHERE id=?",
    body.id,
  );
  return Response.json({ read: true });
}
