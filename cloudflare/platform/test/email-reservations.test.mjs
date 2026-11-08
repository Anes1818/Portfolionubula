import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { fixture } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realCatalog = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../platform/public/catalog.json"),
    "utf8",
  ),
);
const { buildRaysReservationSeed } = require(
  "../../../builder/tools/import-raysbouquetz-to-platform.cjs",
);

test("reservation creation requires verified administrator and recent authentication", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const f = fixture({
    verifyIdentity: async (token) => {
      if (token === "stale-admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 1200,
        };
      }
      if (token === "fresh-admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 30,
        };
      }
      return {
        uid: "owner-1",
        email: "owner@example.test",
        emailVerified: true,
        authTime: nowSec - 10,
      };
    },
    verifyAdmin: async (user) => user.uid === "admin-1",
  });

  const payload = {
    operationId: "11111111-2222-4333-8444-555555555555",
    email: "raysbouquetz@gmail.com",
    input: {
      name: "raysbouquetz",
      slug: "raysbouquetz",
      preset: "satin",
      currency: "CAD",
      country: "CA",
      timeZone: "America/Winnipeg",
    },
  };

  // Non-admin is rejected with 403
  const nonAdminRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "regular-owner",
    body: payload,
  });
  assert.equal(nonAdminRes.status, 403);

  // Stale admin session (>600s) is rejected with 401
  const staleRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "stale-admin",
    body: payload,
  });
  assert.equal(staleRes.status, 401);

  // Fresh admin succeeds with 201 and is idempotent on replay (200)
  const createdRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "fresh-admin",
    body: payload,
  });
  assert.equal(createdRes.status, 201);
  const created = await createdRes.json();
  assert.equal(created.reservation.email, "raysbouquetz@gmail.com");
  assert.equal(created.reservation.slug, "raysbouquetz");
  assert.equal(created.reservation.status, "pending");
  assert.ok(created.shop.ownerUid.startsWith("pending:"));

  const replayRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "fresh-admin",
    body: payload,
  });
  assert.equal(replayRes.status, 200);
  const replayed = await replayRes.json();
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.shop.id, created.shop.id);
});

test("first verified sign-in with matching email atomically claims the pre-provisioned shop (case-insensitive) and blocks unverified or non-matching accounts", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const f = fixture({
    env: {
      PUBLIC_SIGNUPS: "false",
      BETA_ACCESS_EMAILS: "admin@example.test",
    },
    verifyIdentity: async (token) => {
      if (token === "admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      if (token === "ray-unverified") {
        return {
          uid: "ray-uid-1",
          email: "raysbouquetz@gmail.com",
          emailVerified: false,
          authTime: nowSec - 10,
        };
      }
      if (token === "ray-mixed-case") {
        return {
          uid: "ray-uid-1",
          email: "  RaysBouquetz@Gmail.com ",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      if (token === "other-user") {
        return {
          uid: "other-uid-2",
          email: "someoneelse@gmail.com",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      if (token === "second-ray-uid") {
        return {
          uid: "ray-uid-2",
          email: "raysbouquetz@gmail.com",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      throw new Error("Unexpected token");
    },
    verifyAdmin: async (user) => user.uid === "admin-1",
  });

  const reserveRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    body: {
      operationId: "22222222-3333-4444-8555-666666666666",
      email: "raysbouquetz@gmail.com",
      input: {
        name: "raysbouquetz",
        slug: "raysbouquetz",
        preset: "satin",
        currency: "CAD",
        country: "CA",
        timeZone: "America/Winnipeg",
      },
    },
  });
  assert.equal(reserveRes.status, 201);
  const { shop: reservedShop } = await reserveRes.json();

  // Unverified email cannot claim
  const unverifiedRes = await f.call("/api/session", {
    token: "ray-unverified",
  });
  assert.equal(unverifiedRes.status, 401);

  // Non-invited, non-reserved email is blocked by private beta
  const otherRes = await f.call("/api/session", {
    token: "other-user",
  });
  assert.equal(otherRes.status, 403);

  // Verified sign-in with mixed-case email claims the pre-provisioned shop, even when PUBLIC_SIGNUPS=false
  const claimRes = await f.call("/api/session", {
    token: "ray-mixed-case",
  });
  assert.equal(claimRes.status, 200);
  const session = await claimRes.json();
  assert.ok(session.shop);
  assert.equal(session.shop.id, reservedShop.id);
  assert.equal(session.shop.ownerUid, "ray-uid-1");
  assert.equal(session.shop.slug, "raysbouquetz");
  assert.equal(session.shop.draft.name, "raysbouquetz");

  // Single-use claim: another UID later presenting the same email cannot steal the claimed shop
  const secondClaimRes = await f.call("/api/session", {
    token: "second-ray-uid",
  });
  assert.equal(secondClaimRes.status, 403);

  // Reservation status in admin list is now "claimed" with claimedByUid="ray-uid-1"
  const listRes = await f.call("/api/admin/reservations", {
    token: "admin",
  });
  assert.equal(listRes.status, 200);
  const { reservations } = await listRes.json();
  assert.equal(reservations.length, 1);
  assert.equal(reservations[0].status, "claimed");
  assert.equal(reservations[0].claimedByUid, "ray-uid-1");
});

test("existing shop owner signing in with a reserved email does not merge or overwrite either shop", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  let ownerEmail = "old-address@example.test";
  const f = fixture({
    env: { PUBLIC_SIGNUPS: "true" },
    verifyIdentity: async (token) => {
      if (token === "admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      return {
        uid: "existing-owner-uid",
        email: ownerEmail,
        emailVerified: true,
        authTime: nowSec - 10,
      };
    },
    verifyAdmin: async (user) => user.uid === "admin-1",
  });

  // First, existing-owner-uid creates their own shop under old-address@example.test
  const firstShopRes = await f.call("/api/shops", {
    method: "POST",
    token: "existing-owner",
    body: {
      name: "Existing Florist",
      slug: "existing-florist",
      preset: "fresh",
      currency: "CAD",
      country: "CA",
      timeZone: "America/Winnipeg",
    },
  });
  assert.equal(firstShopRes.status, 201);
  const { shop: existingShop } = await firstShopRes.json();

  // Attempting to reserve an email that already owns a shop is rejected with 409
  const duplicateEmailRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    body: {
      operationId: "30000000-4444-4555-8666-777777777777",
      email: "old-address@example.test",
      input: {
        name: "Another Shop",
        slug: "another-shop",
        preset: "satin",
        currency: "CAD",
        country: "CA",
        timeZone: "America/Winnipeg",
      },
    },
  });
  assert.equal(duplicateEmailRes.status, 409);

  // Admin creates a reservation for raysbouquetz@gmail.com
  const reserveRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    body: {
      operationId: "33333333-4444-4555-8666-777777777777",
      email: "raysbouquetz@gmail.com",
      input: {
        name: "raysbouquetz",
        slug: "raysbouquetz",
        preset: "satin",
        currency: "CAD",
        country: "CA",
        timeZone: "America/Winnipeg",
      },
    },
  });
  assert.equal(reserveRes.status, 201);
  const { shop: reservedShop } = await reserveRes.json();

  // Existing owner changes their Firebase email to raysbouquetz@gmail.com and signs in:
  // keeps their existing shop, reservation stays pending with conflictUid recorded
  ownerEmail = "raysbouquetz@gmail.com";
  const sessionRes = await f.call("/api/session", {
    token: "existing-owner",
  });
  assert.equal(sessionRes.status, 200);
  const session = await sessionRes.json();
  assert.equal(session.shop.id, existingShop.id);
  assert.notEqual(session.shop.id, reservedShop.id);

  const listRes = await f.call("/api/admin/reservations", {
    token: "admin",
  });
  const { reservations } = await listRes.json();
  assert.equal(reservations[0].status, "pending");
  assert.equal(reservations[0].conflictUid, "existing-owner-uid");
});

test("reserved slug cannot be taken by another user; cancelling a pending reservation frees the slug and email, while claimed reservations cannot be cancelled", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const f = fixture({
    env: { PUBLIC_SIGNUPS: "true" },
    verifyIdentity: async (token) => {
      if (token === "admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      if (token === "stranger") {
        return {
          uid: "stranger-uid",
          email: "stranger@example.test",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      return {
        uid: "ray-uid",
        email: "raysbouquetz@gmail.com",
        emailVerified: true,
        authTime: nowSec - 10,
      };
    },
    verifyAdmin: async (user) => user.uid === "admin-1",
  });

  const reservePayload = {
    operationId: "44444444-5555-4666-8777-888888888888",
    email: "raysbouquetz@gmail.com",
    input: {
      name: "raysbouquetz",
      slug: "raysbouquetz",
      preset: "satin",
      currency: "CAD",
      country: "CA",
      timeZone: "America/Winnipeg",
    },
  };

  assert.equal(
    (
      await f.call("/api/admin/reservations", {
        method: "POST",
        token: "admin",
        body: reservePayload,
      })
    ).status,
    201,
  );

  // Stranger cannot squat on the reserved slug "raysbouquetz"
  const squatRes = await f.call("/api/shops", {
    method: "POST",
    token: "stranger",
    body: {
      name: "Copycat",
      slug: "raysbouquetz",
      preset: "satin",
      currency: "CAD",
      country: "CA",
      timeZone: "America/Winnipeg",
    },
  });
  assert.equal(squatRes.status, 409);

  // Admin cancels pending reservation -> succeeds
  const cancelRes = await f.call("/api/admin/reservations/cancel", {
    method: "POST",
    token: "admin",
    body: { email: "raysbouquetz@gmail.com" },
  });
  assert.equal(cancelRes.status, 200);

  // Re-reserve with a new operationId, claim it as Ray, then verify cancel is rejected with 409
  const reserveAgainRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    body: {
      ...reservePayload,
      operationId: "55555555-6666-4777-8888-999999999999",
    },
  });
  assert.equal(reserveAgainRes.status, 201);

  assert.equal((await f.call("/api/session", { token: "ray" })).status, 200);

  const cancelClaimedRes = await f.call("/api/admin/reservations/cancel", {
    method: "POST",
    token: "admin",
    body: { email: "raysbouquetz@gmail.com" },
  });
  assert.equal(cancelClaimedRes.status, 409);
});

test("importer output for raysbouquetz seeds draft, 4 signature bouquets, 5 WebP photos, and Christian/handmade/eternal story, then claims cleanly on sign-in", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const f = fixture({
    env: {
      PUBLIC_SIGNUPS: "true",
      ASSETS: {
        async fetch(request) {
          const urlPath = new URL(request.url).pathname;
          if (urlPath === "/catalog.json") return Response.json(realCatalog);
          return new Response("Not found", { status: 404 });
        },
      },
    },
    verifyIdentity: async (token) => {
      if (token === "admin") {
        return {
          uid: "admin-1",
          email: "admin@example.test",
          emailVerified: true,
          authTime: nowSec - 10,
        };
      }
      return {
        uid: "ray-real-firebase-uid",
        email: "raysbouquetz@gmail.com",
        emailVerified: true,
        authTime: nowSec - 10,
      };
    },
    verifyAdmin: async (user) => user.uid === "admin-1",
  });

  const { payload, unmappedFeatures } = await buildRaysReservationSeed();
  assert.equal(payload.email, "raysbouquetz@gmail.com");
  assert.equal(payload.input.slug, "raysbouquetz");
  assert.equal(payload.draft.name, "raysbouquetz");
  assert.equal(payload.draft.collection.length, 4);
  assert.equal(payload.media.length, 5);
  assert.ok(unmappedFeatures.length >= 3);

  const seedRes = await f.call("/api/admin/reservations", {
    method: "POST",
    token: "admin",
    body: payload,
  });
  assert.equal(seedRes.status, 201);
  const seeded = await seedRes.json();
  assert.equal(seeded.shop.slug, "raysbouquetz");
  assert.equal(seeded.shop.draft.name, "raysbouquetz");
  assert.equal(seeded.shop.draft.collection.length, 4);
  assert.match(seeded.shop.draft.home.about, /1 Corinthians 16:14/);
  assert.match(seeded.shop.draft.home.about, /Christian-based small business/);
  assert.match(seeded.shop.draft.home.about, /Everything is handmade/);
  assert.match(seeded.shop.draft.home.about, /Eternal flowers, made to stay/);

  // Ray signs in with her Google/Firebase account (raysbouquetz@gmail.com)
  const sessionRes = await f.call("/api/session", {
    token: "ray",
  });
  assert.equal(sessionRes.status, 200);
  const session = await sessionRes.json();
  assert.ok(session.shop);
  assert.equal(session.shop.id, seeded.shop.id);
  assert.equal(session.shop.ownerUid, "ray-real-firebase-uid");
  assert.equal(session.shop.draft.name, "raysbouquetz");
  assert.equal(session.shop.draft.collection.length, 4);
  assert.deepEqual(
    session.shop.draft.collection.map((c) => c.id),
    ["anus-daydream", "pretty-and-paid", "ruby-royale", "money-moves"],
  );

  // Verify Ray can fetch her uploaded logo and bouquet cover photos as the claimed owner
  const logoRes = await f.call(
    `/api/shops/${session.shop.id}/media/${session.shop.draft.logoMediaId}`,
    {
      token: "ray",
    },
  );
  assert.equal(logoRes.status, 200);
  assert.equal(logoRes.headers.get("Content-Type"), "image/webp");

  // Verify Ray can save an edit to her claimed draft
  const nextDraft = structuredClone(session.shop.draft);
  nextDraft.tagline = "Updated by Ray after signing in!";
  const updateRes = await f.call(`/api/shops/${session.shop.id}/draft`, {
    method: "PUT",
    token: "ray",
    body: {
      version: session.shop.version,
      draft: nextDraft,
    },
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.shop.draft.tagline, "Updated by Ray after signing in!");
});
