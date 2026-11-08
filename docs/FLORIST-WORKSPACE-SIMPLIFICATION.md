# Florist workspace: simple setup and two flower collections

Implemented 1 November 2026 on the existing platform and bouquet engines.

## What the florist sees

- Home: shop status, the next action, a shop/preview link with Copy, plan status, online-payment status and message-request availability. Draft updates prompt publication; the existing public snapshot stays live meanwhile.
- Consistent inline SVG icons for the shop, flowers, bouquets, gifts, orders, plan, messaging and Square. No icon-font service or new paid dependency.
- On phones, a labelled page selector replaces the long horizontal navigation strip. Home has no unused Save button when there are no unsaved edits.
- Payments & requests: connect Square or select WhatsApp/SMS/both. Connection diagnostics, Sandbox instructions, optional cash-product settings and payment history are folded away. Checkout rules are closed by default without a Square connection. They remain editable without activating online checkout.
- Activation retains the audited manual workflow. Square is optional for publication. Owner-only subscription controls remain separate from the florist workspace.

## Fresh and satin in one shop

New shops can choose Fresh, Satin, or Fresh + satin. Existing shops can add the combined collection without deleting their bouquets, prices, photos, fixed products or published version. Newly introduced unpriced items are initially disabled during this upgrade. Florists explicitly enable and price what they offer, then publish.

The combined shop offers fresh bouquets and satin bouquets. Each bouquet uses its matching existing engine, assets, modes and pricing. The independent builder asks which flower collection to use. Satin still supports Dome/Heart; fresh retains Classic/Dome/Heart. A saved mixed-shop design records its flower type; old designs infer it from known catalogue IDs. A client cannot force satin IDs through the fresh engine or bypass availability/pricing rules. Mixing both materials within one individual bouquet is outside this release.

Browser and server use the same pricing policy. The shared catalogue, publication readiness, draft validation, runtime adapter and saved snapshots all support the combined shop. Six customisable cards and ten fixed products remain the limits.

## Orders without Square

The florist chooses WhatsApp, SMS, or both in Shop settings or Payments & requests, using their phone number with country code. Save and publish updates to apply these preferences to customers.

On an eligible published shop with online checkout off, a customer saves an unpaid request, then opens a prefilled WhatsApp/SMS draft. The message includes the reference, product/bouquet, estimate, fulfillment/customer details and a florist-only sign-in link to the saved design. It contains no customer payment/recovery token. A Copy order message fallback supports devices without a suitable messaging app.

Opening a draft is not proof the customer sent it. Nebula sends no automatic SMS/WhatsApp message and buys no messaging service. The request remains in the florist's orders regardless of whether they send the message. SMS requires a compatible device/app; national/carrier charges and prefill behavior vary. A physical iOS/Android check remains advisable. SMS URI syntax follows [RFC 5724](https://www.rfc-editor.org/rfc/rfc5724).

When approved Square checkout is enabled, the existing full/deposit/balance flow continues. Activation, publication, currency, final pricing, payment verification, cash eligibility and tenant permission checks remain enforced by the server.

## Validation

- 97 platform Node tests pass, including real catalogue pricing/publication for every fresh and satin recipe, safe additive upgrade, message preferences, server-selected recipient links and idempotent request replay.
- Local browser checks cover both matching engines, saved type/price, direct Order versus Customise, combined storefront, SMS/WhatsApp draft controls, desktop/mobile workspace, collapsed optional settings, saved contact preferences and admin separation. Provider responses and identity are simulated in these tests; no messages or real payments are sent.
- Existing checkout/receipt and merchant-order regression suites and engine identity/syntax build checks pass.

Production Square activation is a separate launch step. This release is intended for the existing Sandbox preview first.

## Sandbox deployment

Deployed version `1f66fc26-a3e1-452a-b402-16b0fd6606cb` to `https://sandbox.nebulastudio.site` on 1 November 2026. The live shared catalogue exposes Fresh + satin, the new workspace module returns 200, and the existing `anes` shop remains available with its original satin preset. No merchant draft or published content was automatically converted. A read-only browser smoke confirms the existing direct Order/photo review and matching Customise navigation still work. No customer request, message or payment was created by this release smoke.

The shared-policy parity suite and native workerd/SQLite persistence/isolation suite also pass. Main-app checkout remains disabled and production was not deployed. A physical iOS/Android SMS-app check remains outside the automated browser coverage.

## Phone polish

The phone workspace uses a sticky page selector and bottom save bar, with safe-area padding. Fields use 16px text and larger controls; catalogue availability labels provide a larger touch target. Catalogue search/type filters hide entire empty groups, preventing long runs of empty headings. Header, shortcut cards, catalogue columns and long labels fit narrow viewports. Builder toolbar name/slot fields are readable on phones while the existing preview and engine behavior are retained.

Order review uses the full phone viewport, follows VisualViewport size changes, keeps its close control reachable and locks background scrolling until closed. Opening it focuses Close instead of forcing keyboard entry. Fields and actions have larger targets; small landscape layouts and narrower date/fulfillment rows are covered by browser checks. The page restores background scrolling and focus when the review closes.

Automated coverage includes catalogue widths 320/360/390/430/768px, sticky navigation/save geometry, 40×46 availability labels, phone checkout at 320×640, 390×844, 430×740 and 568×360, 44px Close, readable fields, and background-scroll restoration. Physical Safari/Android keyboard behavior still requires a handset check. These changes do not activate production payments or change order/pricing rules.

Phone release deployed to Sandbox as `aa198e0b-967a-4c79-8a67-69e6b22f5127`. The mobile submit button stays in normal form flow so it cannot cover fields; Close stays fixed. The 97 server tests and local browser checkout/workspace tests passed. A read-only deployed browser check opened the existing bouquet review on a 390px phone viewport, loaded its uploaded photo and followed Customise successfully. No order/payment/message was submitted. Main-app checkout remains off.

## Main app release

On 1 November the same tested workspace and phone release was deployed to `https://app.nebulastudio.site`, Worker `nebula`, version `d94a26e3-79a2-446c-b278-021adb80afe1`. Main now selects the Production Square environment while connection and card-checkout flags remain off during credential setup. Existing main tenant storage was retained. The personal-name workers.dev route is disabled. Current setup and launch proof are tracked in [PRODUCTION-SQUARE-LAUNCH.md](PRODUCTION-SQUARE-LAUNCH.md).

Later that day, after all five required secret names were verified, Production Square connection and opted-in merchant email configuration were enabled in version `f657e706-517b-4419-875a-a6251ee9e88a`. Customer checkout remains disabled. The read-only deployed smoke and 97 server tests pass. The owner has no real merchant ready to connect, so Production OAuth, payment, refund and payment-email delivery remain unverified.
