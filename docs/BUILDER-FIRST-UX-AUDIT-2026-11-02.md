# Nebula builder-first experience — review before implementation

Date: 2026-11-02. Original status: review before implementation. The founder subsequently approved implementation; see the implementation record below.

## Product contract from the founder

Nebula's central product is the customer-facing visual bouquet builder. A florist creates up to six signature bouquet recipes using that builder, names each bouquet, uploads a photo of the physical bouquet, and supplies prices. These become cards on the shop homepage. Each card has Order and Customise: Order reviews that saved offer directly; Customise opens its exact recipe for editing. The shop also has a prominent entry to start a new design in its builder. Ten fixed products are an additional offering, not a substitute for this experience.

Six is the number of florist-authored starting bouquets, not the number of designs customers can make. The plan is to show six slots in the owner's panel, permit starting with one completed bouquet, and leave the other slots for later. Empty slots do not appear on the customer storefront. There is no separate subscription activation or payment for each card.

This direction supersedes the product-first entry recommendation in FLORIST-ONBOARDING-RESEARCH-2026-11-02.md. The existing code and old context documents do not overrule the founder's current instruction.

## Verified drift

1. `cloudflare/platform/validation.mjs`, initialDraft: new shops omit `builder` from home.sections when a catalogue exists. The storefront's independent builder section, header entry, and hero builder action all depend on that flag. This can make the core product disappear from the storefront even though its engine is present.
2. `platform/public/shop-flow.js`: the main Bouquets & gifts link opens /dashboard/products; Ready-made bouquets precede Customisable bouquets in the subnavigation. The primary entry encourages photo/name/fixed-price product entry.
3. `platform/public/app.js`, renderCollection: the builder is a secondary Open blank Builder link. Existing-card fields and a library recipe dropdown dominate; the six-slot limit is only a counter, not six understandable positions.
4. `platform/public/owner-onboarding.js`, mountOwnerJourney: a ready-made product can bypass the first-builder invitation. It selects the first available collection card and then prioritises contact, activation and publishing; it does not provide a persistent second/third/sixth-bouquet path.
5. `platform/builder-adapter.js`: only the onboarding entry consistently provides the integrated photo/prices continuation. The ordinary blank-builder route uses separate naming/slot/save controls. The first and subsequent bouquets have different completion experiences.
6. `platform/public/workspace-home.js`: a fixed product counts as the first offer. The home is led by status and publishing, with the builder collection as a shortcut. This reinforces shop administration before the differentiating creative task.
7. `marketing/product-marketing.md` and `.agents/product-marketing.md` contain historical service descriptions and limits. They must not be used as current capability or pricing evidence.

Read-only checks also confirmed that the published shop-flow.js and owner-onboarding.js contain the navigation and first-card behavior above. No real merchant data or payment state was changed.

## Proposed owner journey

1. Enter shop name and flower collection. Immediately see a branded private shop preview and a plain explanation: customers will be able to customise the florist's bouquets.
2. One invitation: Build your first bouquet. It opens bouquet slot 1 in the real builder. Starting blank is primary; using an existing recipe is optional inspiration within this task.
3. Build and save the exact recipe. Preserve the slot identity across save, retry, cancellation and later editing. Fresh/satin selection is explicit for mixed shops.
4. A short completion screen asks for the bouquet's name and real photo, then prices for newly used items. Existing shop prices are reused; nothing unpriced is silently sold for zero. Saving a draft is always possible. A generated builder image must be labelled a design preview rather than a physical product photograph.
5. Show the completed card in the actual shop preview. Offer Try it as a customer and Build another bouquet (1/6), with the latter opening the next empty slot using the same completion flow.
6. Add request contact details and pickup/delivery choices when preparing to open. WhatsApp, SMS or both are sufficient for the request path; Square remains optional.
7. Activate the shop plan and publish only when the owner chooses. An already-active plan goes directly to the remaining publishing step. More bouquet slots can be filled before or after publication; private changes require an explicit publish action.

## Proposed florist panel hierarchy

- Home: real shop preview, one useful next action, and concise publication/request status.
- Bouquet builder: the main creative workspace, with six persistent card positions and a visible X/6 count. Completed cards show photo/name, Edit recipe, Photo & prices and Show in shop. Empty cards say Build bouquet 2, etc. One Build next bouquet action remains visible until the limit is reached.
- Orders: saved designs, customer contact and verified payment status.
- Shop appearance: branding and storefront content.
- Settings: catalogue/prices, messaging, delivery, optional Square and plan.

Ready-made products belong in a secondary Gifts & fixed products area. They retain their existing ten-product limit and checkout behavior but do not replace the builder in navigation or first-use guidance.

## Proposed shopper experience

- The homepage prominently offers Design your bouquet, alongside the florist's signature bouquet cards.
- Order on a card opens its review with the uploaded photo and saved recipe price. It does not send the shopper into editing.
- Customise opens the same saved recipe. Customer changes affect only that customer's order.
- Start from scratch opens the same shop builder with only the florist's enabled, priced items. Recipe cards are starting points, not a six-design limit.
- Owners may explore unpriced artwork in their private builder. Publishing the independent customer builder needs at least one offered, priced choice and complete prices for every enabled option. Handle this through a focused availability/pricing step; do not hide the builder without explaining its setup state.
- A completed request is saved. If Square is unavailable, the customer opens the chosen WhatsApp/SMS draft and sends it. If live checkout is eligible and enabled, the customer follows the reviewed payment flow.

## Value and copy

Core promise: Turn your bouquets into designs your customers can customise.

Under the main action: Build up to six signature bouquets. Add your photos and prices. Customers can order one as shown or make it their own.

Use action labels such as Build bouquet 1, Save recipe & continue, Add photo & prices, Try customer customisation, Build another bouquet, and Publish my changes. Avoid internal schema terms, technical payment prerequisites during the creative task, and vague page headings that conceal the action.

The intended motivation is seeing one's own shop and bouquet become usable. No invented sales results, urgency, or promise that every library design is physically feasible. Conversion improvement remains a hypothesis until observed with florists.

## Implementation order if requested

1. Restore builder prominence and consistent six-slot entry points without rewriting the rendering engines.
2. Unify the recipe/name/photo/price flow for all six slots, including resume/edit and incomplete drafts.
3. Keep the owner storefront preview and customer Order/Customise behavior consistent with the saved recipe and photo.
4. Place fixed products and commercial settings behind the core creative experience.
5. Validate a fresh florist account from name through first and second bouquet, all six slots, hide/re-enable, customer customisation, direct ordering, messaging and optional payment. Cover mobile and partial saves; never make six filled slots a publishing requirement.

No application code, shop data, navigation, payment flags or deployments were changed during this audit.

## Approved implementation record

The approved follow-up makes Bouquet builder the primary creative navigation item. It presents six visible slots, a mobile jump row and the same recipe → name/photo/prices → actual shop-preview flow for each bouquet. New slot identities survive edits and gaps; older card IDs are retained. Existing photos, recipes and merchant data are not reset.

The homepage of the florist workspace leads with building the next bouquet. The owner storefront retains Build another bouquet, Manage my six bouquets and customer customisation preview after the first completion. Private customer previews hide merchant save controls. Fixed products remain a secondary area; a florist who explicitly disables the independent builder can still publish a fixed-product-only shop.

New shops include the independent builder section by default. Customer publication still requires offered, priced choices. Finishing a recipe enables its used items and keeps unknown prices out of customer sales; private exploration remains available. Existing storefront hero destinations selected explicitly by a merchant remain respected; automatic/default heroes prioritise the builder.

Validation: 107 server/policy tests, including slot identity and explicit fixed-product-only publication; full local owner journey building all six satin bouquets, completing photos/prices and editing without duplicate cards; existing fresh/satin editor and storefront regressions; optional product/messaging/fulfillment regression at phone sizes. One bouquet was successfully published before adding the other five as private edits. Production merchant acceptance remains a separate launch check; no real payments, emails or subscription activations were performed by these tests.

Deployed: Sandbox `00862e48-65e1-44b6-b6e3-f1ee7d3ce510`; main `15c7a7d8-0386-4434-bf92-7128ca7b0dc0`. Sandbox static-module checks and main read-only live browser smoke passed. Main production checkout remains off; deployment did not activate a florist subscription or modify existing shop records.
