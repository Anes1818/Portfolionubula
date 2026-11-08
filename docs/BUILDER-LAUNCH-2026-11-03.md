# Builder launch entry — 3 November 2026

Nebula now has a public builder-first entry at `https://app.nebulastudio.site/` and a public choice of fresh or satin samples at `/demo`. These pages do not initialize Firebase or require a session. The existing authenticated workspace and operator administration remain at their established routes.

## Visitor to first bouquet

1. Try the fresh or satin engine with clearly labelled USD sample prices, without registering.
2. Preview the current image, contents and sample total. This is an example of a florist request; there are no customer fields, submission or payment in the demo.
3. Choose Use this for my shop. Keep only the semantic design and material in sessionStorage in the same tab, for up to 24 hours. No merchant prices, identity or order records are stored by this step.
4. Create/sign into the account through the existing protected authentication flow. New shops default to the material tried. Give the shop a name and see its private storefront.
5. Continue the trial recipe, then add a real bouquet photo and the florist's own prices. The imported design is validated against the current catalog and allowed shop modes. Sample prices never migrate into the real shop. Saving still uses the authenticated versioned draft API.
6. Start with one bouquet, choose messaging/fulfillment, and activate and publish when ready. The other five bouquet slots can be filled later.

For existing accounts, the collection offers an explicit Continue my demo bouquet action if there is a compatible empty slot. Existing recipes are not overwritten and ordinary blank-bouquet links remain blank. An invalid/expired/missing trial falls back to the normal owner flow. A guest cannot combine demo mode with a real tenant ID or slug to access its data.

The demo uses the existing engines, geometry, validation and renderer. It does not create a special public merchant in the database or expose a private tenant. The landing explains optional messaging and Square, the manual $29/30-day activation path, and linking from an existing website. It does not promise a native Shopify app, stock synchronization or measured sales results. Package-price menus require matching with the florist; the per-item setup includes a focused help link rather than inventing those rules.

## Scope and launch limits

No merchant settings, subscription status, saved catalog prices or payment flags change as part of this deployment. Main remains `CHECKOUT_ENABLED=false`. Real Square merchant/payment/email/refund acceptance remains necessary before opening live checkout. Public trials do not send emails or messages. No outreach to prospects was performed.

The new entry is on the branded app domain. Existing GitHub marketing pages, old demo links and individually configured legacy shops are not rewritten by this release. Use `/demo` as the new share link.

## Validation

- 110 local server/policy tests pass, including temporary trial storage and sample isolation.
- New local browser journey covers anonymous landing, both real builder engines, sample request preview, no guest writes, signup continuation with the exact recipe, no sample-price migration, saved owner recipe and tenant isolation.
- Existing owner journey passes, including building all six bouquets, first-bouquet publication, photo/pricing completion, direct Order, exact-recipe Customise and guest isolation.
- Mobile screenshots inspected at 390px for entry/request and 320px for satin demo. Original runtime engine identity checks pass.
- Provider calls use local fixtures for these journeys. Actual deployed public smoke and deployment versions are recorded after publication below.

## Published

- Main: `75bdaba7-4e86-4f04-ae57-8e90bbf37c58` on `app.nebulastudio.site`.
- Sandbox: `2938e0bc-17e3-4c48-8520-33befcb0664c` on `sandbox.nebulastudio.site`.
- Main read-only live browser smoke passed: public landing and fresh demo/request preview, Firebase login SDK boot, admin/deep routes, mobile layout, anonymous denials and private-source exclusions. No authentication, account creation, email, order submission or charge occurred.
- Deployment output confirms main checkout remains disabled and Sandbox remains the separate test environment. No Git commit or GitHub push was performed; the existing Cloudflare Workers were deployed from this checkout.
