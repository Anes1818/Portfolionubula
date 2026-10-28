# Ray’s Bouquetz

The preview uses the existing Nebula builder, with Ray’s satin catalogue, six triangular wrapping surrounds, her logo and shop identity. Only Buchón/Dome and Heart are available. The original layout engines, geometry, model, renderer, saved-design and sharing files are copied unchanged. The app itself changes only its initial list of mode banks; shop-specific registration, pricing and presentation live here.

## Confirmed owner update (26 October)

The current recipes have the confirmed 43 / 86 / 18 / 57 positions and exactly 80 / 50 USD $1 notes. Money Moves uses seven foam roses; a new transparent black foam asset is included. Money styling includes wrapping and assembly. Customers can supply the cash; the excluded face value, currency, denomination, note count and payment choice survive sharing and saving.

Menus provide foam count tiers and mixed ranges, plus CAD $10 message ribbon / $15 ribbon-and-bow bundle / $12 graduation cap. Premium adjustments apply once to a single-family bouquet. Variable-price extras and mixed arrangements require a quote; their unknown components are not displayed as free in price breakdowns. TD cash buying snapshot: 1.4484 CAD per USD on 26 October, zero extra margin. This is a dated snapshot, not a live feed.

Deposit/full amount preview is available. The automatic payment service, merchant account page, encrypted OAuth connection and payment/refund ledger are implemented locally. They are not deployed or connected to Square yet. Local browser/service tests simulate Square; the storage test uses real workerd/SQLite. Real Square Sandbox and production checks remain pending. See [payment setup](../../cloudflare/rays-payments/README.md) and [the Arabic setup guide](../../cloudflare/rays-payments/SETUP.ar.md).

## Build and preview

- Build: `node builder/tools/build-raysbouquetz.cjs`
- Serve: `node builder/tools/preview-raysbouquetz.cjs`
- Open: `http://127.0.0.1:4188/shops/raysbouquetz/`
- Browser checks: `node builder/tests/rays-builder.cjs` (bundled Playwright NODE_PATH and Edge)
- Independent price arithmetic checks: `node builder/tests/rays-pricing.cjs`

Do not edit generated `shops/raysbouquetz/` files directly or use the generic library-only build-client command for this shop. The demo and La Flora source are unchanged.

## Current sources

- `index.html`, `shop.css`: homepage, supplied photographs, separate Order and Customise links on every card.
- `store.json`: public identity and original photo reference prices.
- `builder-preview.json`: the four confirmed starting recipes, menu prices and dated CAD/FX preview policy. Both card actions open the same recipe in the original builder; Order also opens its review dialog.
- `builder-runtime.js`: shop catalogue/artwork, scoped mode/import restrictions, prices and a money artwork adapter that preserves the original slot positions, flower sizes and wrapping.
- `builder-ui.js`, `builder-theme.css`: branding, wrapping colours, CAD/USD note choices and inactive order review.
- `pricing.js`: reusable integer-cent cash conversion and stricter future approved-price calculation.
- `commerce-core.js`: shared browser/server design validation, unchanged draft preview pricing and separately approved automatic CAD pricing.
- `payments-client.js`, `payments-home.js`, `payments-config.json`: progressive checkout integration; the empty endpoint keeps the public preview inactive.
- `account.html`, `account.js`: Firebase login, shop-bound merchant access, Square connection, prices and orders.
- `payment-status.html`, `payment-status.js`: private customer receipt, verified payment state and balance checkout.
- `public/art/`: original generated PNG candidates. Only selected flowers/wraps/bow/cap are copied into the preview. The glowing card and CAD-note images are withheld; notes use the existing illustrative fold for every currency/value.
- `ASK-RAY-AFTER-PREVIEW.md`: questions and assumptions to confirm after she sees the preview.

The retired lightweight editor (`studio.html`, `studio.css`, `studio.js`) was archived during repository cleanup. The active studio is generated from `builder/studio.html`. `satin-model.js` and `money-layout.js` remain because the independent price/layout regression tests use them. `assets.json` retains artwork-registration metadata. Draft assumptions do not mark production pricing or artwork as approved.

## Restored library gifts

Snoopy and Hello Kitty plush toys, Snoopy topper and gold chocolates reuse the existing Nebula artwork and controls in both modes. Availability still needs review. The menu lists variable plush/candy pricing, so the previous placeholder prices have been removed. Multiple gifts can be saved together with bows and a graduation cap.

## Boundaries

Starting recipe quantities are confirmed; artwork placement and variable custom quotes still need approval. USD conversions use the dated TD snapshot above, with no extra margin. The form defaults for fresh flowers are not used. Original catalogue prices remain photo references; they are not guaranteed totals for modified designs.

No customer messages, real Square checkout, deposit requests, subscriptions or notifications have been sent. No custom domain or shirt editor is created. Private intake stays in `.private/`. The owner preview is published at https://nebulastudio.site/shops/raysbouquetz/ with payments disabled; payment additions currently exist locally only.

## Review fixes (27 October)

- Two-flower-type mixes no longer accidentally receive the three-type mixed-menu price based on slot order. Those designs require an individual quote.
- Menu-priced flowers are shown as included in a bouquet price, avoiding negative adjustment lines. Glitter remains a separate add-on when a mixed-menu price is used.
- Unknown prices remain quote labels after search/filter changes. An unavailable USD rate cannot silently become free cash.
- Note-count edits preserve flower slots while there is room, ignore unchanged counts, and reject empty or oversized input. Extra space uses the original engine’s nearest-position mapping.
- Quote status is retained in exported PNGs and read-only summaries. The shared renderer and geometry source files remain unchanged.
- Square adapter retries reuse only pending requests; cancelled links and incomplete cash-value declarations are rejected. These remain mock-tested server preparations, not live payments.

Regression coverage for these cases is in `builder/tests/rays-review.cjs`, called by the main browser suite. Payment adapter checks are in `builder/tests/rays-square.cjs`.

## Bouquet density and homepage update

The custom-shirt placeholder was removed at the owner's request. Satin/foam heads now use 18% closer visual overlap; folded bills overlap more in Dome and Heart to account for their narrow silhouette. Slot centres, item quantities and price calculations are retained. Sizes do not depend on the percentage of cash in a bouquet, so replacing a flower with a note cannot shrink its neighbours.

The existing browser suite now measures actual flower/bill alpha in both signature money bouquets and the satin mix, in both modes, excluding paper and finishing overlays. All six cases have less than 1.1% open interior area. Save/reload, painting, moving, count edits, exports and mobile checks pass with the original shared engines unchanged.
