# `raysbouquetz` Pre-Provisioning & Platform Migration Guide

## 1. Overview

`clients/raysbouquetz` (`nebulastudio.site/shops/raysbouquetz/`) was originally built as a bespoke client storefront before the self-service Nebula platform (`app.nebulastudio.site`) existed.

To let Ray sign in on `app.nebulastudio.site/login` with her email (`raysbouquetz@gmail.com`) and immediately land in her populated self-service workspace—without recreating her shop from zero or losing her live bespoke link while she finishes her pre-Valentine’s Day price readjustment—the platform supports **admin-seeded email reservations**:

1. **Legacy bespoke storefront stays live**: `shops/raysbouquetz/` (`nebulastudio.site/shops/raysbouquetz/`) remains untouched until Ray explicitly publishes her new shop on the platform, at which point the legacy URL can redirect to `app.nebulastudio.site/s/raysbouquetz`.
2. **Pre-provisioned shop seeded under a non-forgeable placeholder UID**: A verified administrator reserves `raysbouquetz@gmail.com` and slug `raysbouquetz` via `POST /api/admin/reservations`, creating a shop owned by `pending:<32 hex>` (which cannot collide with any Firebase UID because `verifyFirebase` enforces `/^[A-Za-z0-9_-]{1,128}$/`).
3. **Automatic atomic claim on first verified sign-in**: When Ray signs in at `app.nebulastudio.site/login` (via Google or verified email/password) with `raysbouquetz@gmail.com`, `ShopRegistry` (`POST /session`) and `ShopStore` (`POST /ensure`) atomically transfer ownership from `pending:<32 hex>` to her real Firebase UID (`user.uid`) and record an audited `claim_reservation` entry in `activation_history`.

---

## 2. Client Feedback Applied

Both the legacy storefront (`clients/raysbouquetz/` → `shops/raysbouquetz/`) and the platform reservation seed bundle include Ray’s requested updates:

- **Exact lowercase brand name**: `raysbouquetz` everywhere (no spaces or apostrophe; `"need a quote from raysbouquetz"`).
- **Updated “Our touch” / story section**:
  - Highlighted scripture: **1 Corinthians 16:14 — “Let all that you do be done in love.”**
  - **01 · Rooted in faith, made in love**: Christian-based small business in Winnipeg.
  - **02 · Everything is handmade**: Hand-cut, hand-folded satin ribbon petals, layered wrapping, bows, crowns, butterflies, and custom sashes.
  - **03 · Eternal flowers, made to stay**: Keepsake bouquets meant to last long after Valentine’s Day, graduation season, birthdays, or anniversaries.
- **4 Signature Bouquets + 5 WebP Assets**:
  - `logo.webp` (`logoMediaId`)
  - `anus-daydream` (*Anu’s Daydream*, 35 stems)
  - `pretty-and-paid` (*Pretty & Paid*, 25 stems, money bouquet)
  - `ruby-royale` (*Ruby Royale*, 75 stems, hero photo + signature card)
  - `money-moves` (*Money Moves*, 40 stems, money bouquet)
- **Ankara pieces & seasonal flexibility**:
  - Fixed products section is titled *“Ankara pieces & ready-made keepsakes”* (*“Handmade Ankara plumeria and bow hair clips, plus seasonal keepsakes”*) so she can add her plumeria and bow hair clips directly in **Dashboard → Products** (`/dashboard/products`).
  - Signature bouquets can be swapped, hidden, or renamed anytime for Valentine’s Day or graduation season in **Dashboard → Collection** (`/dashboard/collection`) or **Storefront Editor** (`/dashboard/editor`).

---

## 3. Generating & Seeding the Reservation

### Step 1: Generate the deterministic seed bundle

From the repository root:

```powershell
node builder/tools/import-raysbouquetz-to-platform.cjs
```

This validates all 5 WebP images (`readImage`), converts all 4 signature bouquet recipes to canonical platform catalog IDs (`satin_*`), validates the full draft against `platform/public/catalog.json` (`validateDraft` + `validateDesign`), and writes:

- `.private/onboarding/raysbouquetz/platform-reservation-seed.json` (gitignored under `.private/`)

### Step 2: Pre-provision via the Operator Console (`/admin`)

1. Sign in as a platform administrator at `https://app.nebulastudio.site/admin/login`.
2. Open **Pre-provisioned email reservations** at the bottom of `/admin`.
3. Choose `.private/onboarding/raysbouquetz/platform-reservation-seed.json` in **Import seed bundle (.json)** and click **Reserve & pre-provision shop**.
4. You can immediately inspect her pre-provisioned storefront via **Manage access ↗ → Preview private draft ↗**.

### Step 3: Ray signs in

1. Ray visits `https://app.nebulastudio.site/login` and signs in with `raysbouquetz@gmail.com` (Google Sign-In or verified email/password).
2. Her session automatically claims the `raysbouquetz` shop (`sh_<32 hex>`) and opens her dashboard with all 4 signature bouquets, photos, satin catalogue, and “Our touch” story ready to edit.

---

## 4. Security & Tenancy Guarantees

- **Admin-only creation/cancellation with fresh re-authentication**: `POST /api/admin/reservations` and `POST /api/admin/reservations/cancel` require both `user.isAdmin === true` (verified via Firebase `/adminUids/:uid`) and a recent sign-in (`auth_time` within 10 minutes).
- **Verified email required to claim**: `authenticate()` requires `user.emailVerified !== false` and `!user.uid.startsWith("pending:")`. Email matching is case-insensitive and trimmed (`normalizeEmail`).
- **Single-use atomic claim**: `ShopRegistry` transitions `email_reservations.status` from `'pending'` to `'claimed'` inside `transactionSync`. Subsequent sign-ins with the same email on a different UID cannot re-claim or hijack the shop.
- **No silent shop merging on conflict**: If a Firebase UID that *already* owns a shop signs in with a reserved email, `ShopRegistry` preserves both shops untouched and records `conflict_uid` on the reservation for operator review.
- **Slug reservation**: While a reservation is `pending` or `claimed`, its slug (`raysbouquetz`) is stored in `registry` (`UNIQUE(slug)`) so no other account can claim `/s/raysbouquetz`. Cancelling a `pending` reservation releases the slug and email; `claimed` reservations cannot be cancelled (`409`).

---

## 5. Unmapped Legacy Features & Follow-Ups

Because the bespoke storefront (`clients/raysbouquetz/commerce-core.js`) had custom pricing formulas that differ from the generic v4 platform model, the importer preserves safety by never inventing prices (`null` remains quote-only):

1. **Bundle tier stem pricing**: Legacy calculated tiered stem bundles (12/$25, 25/$50, 50/$95, 75/$150, 100/$195). Platform v4 prices custom bouquets per stem (`flowerPrices`) and per extra (`extrasCents`). Ray is currently finalizing her pre-Valentine’s price readjustment and can update per-stem prices in `/dashboard/prices`.
2. **Money bouquets (`pretty-and-paid`, `money-moves`)**: Imported using the platform’s generic folded-note extras (`satin_cash_20`, `satin_cash_100`) with `null` unit price so they remain request-only / quote-first until Ray sets her per-note price in CAD. Automatic USD→CAD conversion and customer-supplied cash toggles remain documented follow-ups.
3. **Rush (<7 days: +$15) & emergency (<2 days: +$25) fees**: Included in her storefront **Order & booking notes** (`home.contactDetails`); lead-time rules and delivery fees are configurable in `/dashboard/payments`.
