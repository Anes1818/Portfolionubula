# Current implementation: original builder with inactive payment integration

The current architecture is documented in `README.md` and the automatic payment implementation in `cloudflare/rays-payments/README.md`. The original Nebula builder serves this shop; its engines remain unchanged. The payment service/account/receipt code is local, with an empty public endpoint and payment flags off. Real Square Sandbox, merchant connection, deployment and production acceptance are still pending. The first-preview assumptions in `builder-preview.json` are not approved production prices. Confirm `ASK-RAY-AFTER-PREVIEW.md` before launch.

The earlier implementation notes below are historical. In particular, the lightweight custom editor and its incomplete-price gates no longer describe the current preview.

---

# Ray’s Bouquetz — implementation map

## Scope now

One Nebula-hosted satin gift studio; $29 monthly subscription currency to be
explicit when confirming. No custom domain. Landing page with the supplied logo,
four supplied bouquet photos and a reserved Custom Shirts button. No shirt editor,
payment collection, subscription activation or customer notification is implied.

Custom source is here; generated files are in `shops/raysbouquetz/`. Build using
`node builder/tools/build-raysbouquetz.cjs`. Do not run the generic library-only
`build-client.cjs` on these custom recipes. Do not edit generated output directly.
The La Flora source and sales demo are not changed by this command.

## Files

| Source | Purpose |
|---|---|
| `store.json` | Public brand, collection, provisional prices and payment flags |
| `public/photos/` | Four original photographs used as collection covers |
| `public/logo.webp` | Supplied shop identity |
| `index.html`, `shop.css` | Responsive gift-shop landing page |
| `studio.html`, `studio.css`, `studio.js` | Satin studio controls, draft save/open, accessible individual flower editing |
| `satin-model.js` | Removes the fresh catalogue; registers only satin/foam/note identities against the shared geometry/model |
| `pricing.js` | Reusable integer-cent calculation; CAD cash or explicit fixed-ratio USD conversion |
| `money-layout.js` | Exact-count folded-note layout for Dome/Heart |
| `assets.json`, `ASSET-CHECKLIST.md` | Approved artwork registration and file requests |

Private original intake remains in `.private/onboarding/raysbouquetz/` and is never
copied into the shop. Raw reference photos are published only when deliberately
selected as covers. Internal analysis is in `.private/research/`.

## Price rules

Submitted CAD prices are ribbon rose 800 cents, foam rose 600, glitter 100 per
flower pending confirmation, and money styling 8000. The old fresh-rose/default
base/labour prices are excluded from live calculations. Submitted add-ons retained
provisionally: butterfly 300, crown 1500, bow 300, sash 0. Card/topper/cap and money
fan prices are null until confirmed. Dahlia/plumeria/sunflower prices must be set
individually; a custom shape must not inherit the rose price without agreement.

USD conversion is `round(faceValueCents × numerator / denominator)`. The numerator
is deliberately null. No current exchange rate is fetched, no 1:1 fallback is
used, and no rate is invented. The approved rate/price tariff comes from Ray’s.
The image of each bill is illustrative, while currency, value and quantity are
stored separately. CAD and USD cannot be silently swapped on reopen.

Money fee policy must be `replaces-base-and-labor` or `additional` after approval.
Until then the result contains unresolved components and no complete total. This
prevents double charging the 80-dollar fee plus form-default assembly charges.

Collection targets (260/305/145/182 CAD) are displayed as reference prices, never
used to invent stem counts or reverse-engineer a fictitious itemised recipe.

## What is deliberately still pending

1. Transparent satin artwork, wrap alignment and final accessory placement.
2. Exact flower/material counts and inclusions for each of the four starting designs.
3. Extra prices, preparation/labour treatment, glitter basis and USD pricing rule.
4. French only if explicitly requested; English is the current preview language.
5. Per-shop short-preview persistence: use scoped, access-checked records. Do not
   reuse La Flora’s database path for a new shop or store contact details in a public design.
6. Owner-reviewed request handoff and Square integration. Buttons remain disabled
   until the applicable route has been built and tested.

## Square paths

Review flow: save design/reference → Ray’s confirms quote/date → Ray’s issues a
Square invoice requesting the deposit. This can start with her manual process.

Direct flow: browser sends material IDs, quantities and reference → server loads
approved shop prices and conversion rules → validates the design/availability →
creates an idempotent Square payment link for a CAD order → customer uses Square
checkout → backend verifies the payment/order before marking paid. Never trust
a browser-supplied total or a successful-return URL. Secrets belong in a Worker,
not `store.json`, saved links or client JavaScript.

Canadian Square terms restrict cash disbursements/foreign-currency sales and do
not specifically classify these decorative bouquets. Merchant confirmation with
Square is needed for the actual note face-value funding model before enabling
automatic money-bouquet checkout. Do not represent a styling-only charge as an
automatically approved workaround.

Verified source references (26 October 2026):
- https://developer.squareup.com/reference/square/checkout-api/create-payment-link
- https://squareup.com/help/ca/en/article/6581-request-deposits-with-square-invoices
- https://squareup.com/ca/en/legal/general/payment

## Next approval checkpoint

First inspect one red satin rose and black triangular dome wrap in Ruby Royale.
Confirm that the visual style fits and that the florist intends to activate the
agreed plan once the agreed collection is ready. Finish the four recipes and
verified prices next. Shirts, a broad gift catalogue and additional shapes remain
separately bounded follow-up work. No automatic billing begins from this build.
