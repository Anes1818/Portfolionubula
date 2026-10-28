import {
  HttpError,
  requireValue,
  readJson,
} from "../rays-payments/security.mjs";
import { createInput, initialDraft, readiness } from "./validation.mjs";

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
const parseShop = (row) => (row ? JSON.parse(row.data) : null);
const decorated = (shop) => ({ ...shop, readiness: readiness(shop) });
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
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
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

/** Each shop's draft, bounded image slots, and mutation counters use its own SQLite DO. */
export class ShopStore {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS shop (singleton INTEGER PRIMARY KEY CHECK(singleton=1), data TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, kind TEXT NOT NULL, mime TEXT NOT NULL, body BLOB NOT NULL, byte_length INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
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
      if (request.method === "GET" && url.pathname === "/snapshot")
        return json({ shop: decorated(shop) });
      this.owner(request, shop);
      if (request.method === "PUT" && url.pathname === "/draft") {
        const { version, draft } = await readJson(request, 80 * 1024);
        const updated = this.state.storage.transactionSync(() => {
          const current = this.shop();
          requireValue(
            Number.isSafeInteger(version) && current.version === version,
            "Your shop changed in another tab. Reload the current version before saving.",
            409,
          );
          limit(this.sql, "draft", 60);
          const refs = [
            draft.logoMediaId,
            ...draft.collection.map((item) => item.cover),
          ].filter(Boolean);
          for (const id of refs)
            requireValue(
              first(this.sql.exec("SELECT id FROM media WHERE id = ?", id)),
              "An attached image is missing. Upload it again before saving.",
            );
          const next = { ...current, draft, version: current.version + 1 };
          this.sql.exec(
            "UPDATE shop SET data = ? WHERE singleton=1",
            JSON.stringify(next),
          );
          return next;
        });
        return json({ shop: decorated(updated) });
      }
      if (url.pathname.startsWith("/media/")) {
        const id = url.pathname.slice("/media/".length);
        requireValue(/^slot-[1-5]$/.test(id), "Invalid media slot.");
        if (request.method === "PUT") {
          const kind = id === "slot-1" ? "logo" : "cover",
            mime = request.headers.get("Content-Type");
          requireValue(
            ["image/png", "image/jpeg", "image/webp"].includes(mime),
            "Invalid image type.",
          );
          const body = await request.arrayBuffer();
          requireValue(
            body.byteLength > 0 &&
              body.byteLength <= (kind === "logo" ? 80 : 150) * 1024,
            "Image is too large.",
            413,
          );
          this.state.storage.transactionSync(() => {
            limit(this.sql, "media", 10);
            this.sql.exec(
              "INSERT INTO media (id, kind, mime, body, byte_length, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, mime=excluded.mime, body=excluded.body, byte_length=excluded.byte_length, updated_at=excluded.updated_at",
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
          limit(this.sql, "media-read", 120);
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
